import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, ScrollView, StatusBar, TextInput, useWindowDimensions, View } from 'react-native';
import { Alert } from '../i18n/Alert';
import Pressable from '../components/Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight, BadgeCheck, Bell, Briefcase, Camera, Check, ImagePlus, Pencil, ChevronRight, Clock, Crown, FileText, Handshake, Languages, LogOut, CircleQuestionMark,
  Fuel, Gift, Hourglass, MapPin, MessageSquare, Phone, Plus, Search, Settings, Truck, UserSearch, Users, X,
} from 'lucide-react-native';
import T from '../components/T';
import { AppBar, BackButton, BottomBar, Button, Card, Chip, EmptyState, Field, FieldError, IconButton, ListRow, Section, SectionHeader, StatusTag, Steps, Tag, Toggle, KeyboardSafe } from '../components/ui';
import { CategoryPick, CategoryRow, JobRow, Logo, PersonPhoto } from '../components/brand';
import { callNumber, ContactRow } from '../components/sheets';
import { ErrorBlock, GateSheets, LoadingBlock, useGate } from './driver';
import { CategoryKey, colors } from '../theme';
import { ANYWHERE, cat, catLabel, categories, Driver, DriverLink, isTruck, Job, licenceTypes, PayType } from '../data/catalog';
import { CityField, CityPicker } from '../components/CityPicker';
import { OwnerProfile, useStore, Vehicle } from '../store/AppStore';
import { usePagedQuery, useQuery } from '../hooks/useQuery';
import { DetailSkeleton, RowSkeleton } from '../components/Skeleton';
import { api, fileSource, upload } from '../api/client';
import { daysLeft, firstName, rupees, shortDate } from '../utils/format';
import { choosePhoto, choosePhotos, formFile, imageProblem, Picked, takePhoto } from '../utils/media';
import { Coords, distanceText, useMyLocation } from '../utils/location';
import { useTx } from '../i18n/auto';

const phoneText = (p: string) => `+91 ${p.replace(/(\d{5})(\d{5})/, '$1 $2')}`;

const vehicleImage = (v: Pick<Vehicle, 'category' | 'photo'>) => fileSource(v.photo) ?? cat(v.category).photo;
/** Every image of a vehicle (older vehicles have only the cover `photo`). */
const vehiclePhotos = (v: Pick<Vehicle, 'photo' | 'photos'>) => (v.photos?.length ? v.photos : v.photo ? [v.photo] : []);

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 8;

/* ------------------------------------------------------------- Owner setup */

export function OwnerSetupScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { owner, me, saveOwner } = useStore();
  const [p, setP] = useState<OwnerProfile>(owner ?? { name: me?.name ?? '', company: '', type: 'fleet', city: me?.city ?? '' });
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const set = (x: Partial<OwnerProfile>) => setP((o) => ({ ...o, ...x }));
  const ok = p.name.trim().length > 1 && !!p.city && (p.type === 'individual' || p.company.trim().length > 1);
  const next = async () => {
    setBusy(true);
    try {
      await saveOwner({ ...p, name: p.name.trim(), company: p.type === 'individual' ? p.name.trim() : p.company.trim() });
      navigation.reset({ index: 0, routes: [{ name: !me || me.kyc.status === 'none' ? 'OwnerKyc' : 'OwnerMain' }] });
    } catch (e: any) {
      Alert.alert('Your details', e.message);
      setBusy(false);
    }
  };
  return (
    <KeyboardSafe style={{ backgroundColor: colors.white }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BackButton onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.reset({ index: 0, routes: [{ name: 'Role' }] }))} />
          <T w="bold" size={15} style={{ flex: 1 }}>
            Step 1 of 2 · Your details
          </T>
          <Logo size={36} />
        </View>
        <Steps total={2} current={0} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }} keyboardShouldPersistTaps="handled">
        <T w="extrabold" size={24}>
          Tell us about your business
        </T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['individual', 'fleet'] as const).map((k) => {
            const on = p.type === k;
            return (
              <Pressable
                key={k}
                onPress={() => set({ type: k })}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={{ flex: 1, padding: 14, borderRadius: 16, borderWidth: on ? 2 : 1, borderColor: on ? colors.ink : colors.line, backgroundColor: on ? colors.yellow50 : colors.white, gap: 8 }}>
                {k === 'individual' ? <Users size={24} color={colors.ink} /> : <Truck size={24} color={colors.ink} />}
                <T w="extrabold" size={15}>
                  {k === 'individual' ? 'Individual' : 'Fleet / company'}
                </T>
                <T size={12} color={colors.ink2}>
                  {k === 'individual' ? '1–2 vehicles' : '3 or more vehicles'}
                </T>
              </Pressable>
            );
          })}
        </View>
        <Field label="Your name" value={p.name} onChangeText={(v) => set({ name: v })} placeholder="Full name" />
        {p.type === 'fleet' ? <Field label="Company name" value={p.company} onChangeText={(v) => set({ company: v })} placeholder="e.g. Sharma Roadlines" /> : null}
        <View style={{ gap: 8 }}>
          <T w="bold" size={14}>
            City
          </T>
          <CityField value={p.city} placeholder="Search your city" onPress={() => setPicker(true)} />
        </View>
      </ScrollView>
      <BottomBar>
        <Button title="Next: business documents" disabled={!ok} loading={busy} iconRight={<ArrowRight size={18} color={ok ? colors.ink : colors.muted} strokeWidth={2.6} />} onPress={next} />
      </BottomBar>
      <CityPicker visible={picker} title="Your city" value={p.city ? [p.city] : []} onClose={() => setPicker(false)} onChange={([c]) => set({ city: c })} />
    </KeyboardSafe>
  );
}

/* -------------------------------------------------------------- Owner home */

type Applicant = { id: string; status: string; at: number; driver: Driver };

/**
 * Owner home = available drivers, the way a driver's home is the job feed.
 * Posting a job and "my jobs" are small shortcuts in the header; the list of
 * KYC-verified drivers (search + vehicle filter, infinite scroll) is the page.
 */
export function OwnerHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { owner, me, notices, plan, hasPlan, postedJobs, kyc, links, lang } = store;
  const tr = useTx();
  const unread = notices.filter((n) => !n.read).length;
  const applicants = postedJobs.reduce((s, j) => s + j.applicants, 0);
  const [k, setK] = useState<CategoryKey | null>(null);
  const [q, setQ] = useState('');
  const query = useDebounced(q.trim());
  // The owner's location (when allowed) shows how far each driver is; "Nearest first" sorts by it.
  const loc = useMyLocation();
  const [nearest, setNearest] = useState(false);
  const here = loc.coords ? { lat: +loc.coords.lat.toFixed(3), lng: +loc.coords.lng.toFixed(3) } : null;
  const res = usePagedQuery<Driver>('/drivers', { category: k, q: query, lat: here?.lat, lng: here?.lng, near: nearest && here ? 1 : undefined }, 'drivers', { persist: true, pageSize: 15 });
  const toggleNearest = () => {
    if (nearest) return setNearest(false);
    loc
      .enable()
      .then(() => setNearest(true))
      .catch((e) => Alert.alert('Nearest drivers', e.message));
  };
  const [pulling, setPulling] = useState(false);
  const pull = async () => {
    setPulling(true);
    await Promise.all([res.reload(), store.refresh().catch(() => {})]);
    setPulling(false);
  };

  const header = (
    <>
      <View style={{ backgroundColor: colors.yellow50, paddingTop: insets.top + 10, paddingBottom: 6 }}>
        <View style={{ paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, height: 52 }}>
          <Pressable onPress={() => navigation.navigate('Profile')} accessibilityLabel="Profile">
            <PersonPhoto path={me?.photo} name={owner?.company || owner?.name} size={46} radius={23} style={{ borderWidth: 2, borderColor: colors.white }} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <T w="extrabold" size={18} numberOfLines={1} style={{ flexShrink: 1 }}>
                {owner?.company || owner?.name || 'My business'}
              </T>
              {kyc.status === 'approved' ? <BadgeCheck size={17} color={colors.white} fill={colors.green} /> : null}
            </View>
            <T w="semibold" size={13} color={colors.ink2} numberOfLines={1}>
              {owner?.city}
              {hasPlan && plan ? ` · Plan: ${daysLeft(plan.expiresAt)} days left` : ''}
            </T>
          </View>
          <IconButton label={`Notifications, ${unread} unread`} onPress={() => navigation.navigate('Notifications')} style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }}>
            <Bell size={20} color={colors.ink} />
            {unread ? <View style={{ position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.white }} /> : null}
          </IconButton>
        </View>

        {/* Small shortcuts, not the focus of the page. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingTop: 10 }}>
          <Chip label="Post a job" icon={<Plus size={14} color={colors.ink} strokeWidth={3} />} onPress={() => navigation.navigate('PostJob')} />
          <Chip label={applicants ? `My jobs · ${applicants} applicants` : `My jobs · ${postedJobs.length}`} icon={<Briefcase size={14} color={colors.ink} />} onPress={() => navigation.navigate('Jobs')} />
          <Chip label="Nearest first" selected={nearest} icon={<MapPin size={14} color={colors.ink} />} onPress={toggleNearest} />
          {!hasPlan ? <Chip label="Get Owner plan" icon={<Crown size={14} color={colors.ink} />} onPress={() => navigation.navigate('Plans')} /> : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 18, marginTop: 12 }}>
          <View style={{ height: 52, borderRadius: 14, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, borderWidth: 1, borderColor: colors.line }}>
            <Search size={20} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder={tr('Search drivers by name or city')} placeholderTextColor={colors.faint} style={{ flex: 1, fontFamily: 'NotoSans-Medium', fontSize: 15, color: colors.ink, paddingVertical: 0 }} returnKeyType="search" />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Clear search">
                <X size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>
        <CategoryRow value={k} onChange={setK} style={{ marginTop: 14, marginBottom: 8 }} />
      </View>

      <View style={{ paddingHorizontal: 18 }}>
        {kyc.status !== 'approved' ? (
          <Pressable onPress={() => navigation.navigate('KycStatus')} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: kyc.status === 'rejected' ? colors.redSoft : colors.neutralSoft }}>
            <Clock size={20} color={colors.ink} />
            <T w="semibold" size={13} color={kyc.status === 'rejected' ? colors.redText : colors.neutralText} style={{ flex: 1 }}>
              {kyc.status === 'rejected' ? 'Documents need attention. Tap to fix.' : 'Business verification pending. You can post and hire once approved.'}
            </T>
            <ChevronRight size={18} color={colors.ink} />
          </Pressable>
        ) : null}
        <YourDrivers navigation={navigation} />
        <SectionHeader title={nearest ? (k ? `${catLabel(k, lang)} drivers near you` : 'Drivers near you') : k ? `${catLabel(k, lang)} drivers` : 'Available drivers'} count={res.total} />
        {!res.ready ? res.error ? <ErrorBlock error={res.error} onRetry={res.reload} /> : <RowSkeleton count={5} /> : null}
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={res.ready ? res.items : []}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        windowSize={9}
        removeClippedSubviews
        onEndReachedThreshold={0.6}
        onEndReached={res.loadMore}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={pull} colors={[colors.ink]} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          res.ready ? (
            nearest ? (
              <EmptyState icon={<MapPin size={30} color={colors.ink} />} title="No nearby drivers yet" text="Drivers appear here once they share their location. Turn off Nearest first to see everyone." action={<Button title="Show all drivers" variant="outline" onPress={() => setNearest(false)} />} />
            ) : (
              <EmptyState icon={<UserSearch size={30} color={colors.ink} />} title="No drivers match" text="Try another vehicle type or search." />
            )
          ) : undefined
        }
        ListFooterComponent={res.loadingMore ? <ActivityIndicator color={colors.ink} style={{ marginVertical: 14 }} /> : undefined}
        renderItem={({ item: d }) => (
          <View style={{ paddingHorizontal: 18, paddingBottom: 10 }}>
            <DriverCard d={d} link={links[d.id] ?? d.link} lang={lang} onPress={() => navigation.navigate('DriverView', { id: d.id, driver: d })} />
          </View>
        )}
      />
    </View>
  );
}

/**
 * Drivers the owner is connected with or has hired. With an active plan the
 * owner can call them straight from here; otherwise the number stays hidden.
 */
function YourDrivers({ navigation }: { navigation: any }) {
  const { connections, hasPlan } = useStore();
  const list = connections.filter((c) => c.status !== 'closed');
  if (!list.length) return null;
  return (
    <View>
      <SectionHeader title="Your drivers" count={list.length} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 18 }}>
        {list.map((c) => {
          const d = c.other;
          const chat = () => navigation.navigate('ChatThread', { id: c.id, name: d.name });
          return (
            <Card key={c.id} style={{ width: 280, padding: 12, gap: 12 }}>
              <Pressable onPress={() => navigation.navigate('DriverView', { id: c.otherId })} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <PersonPhoto path={d.photo} name={d.name} size={46} radius={14} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T w="bold" size={15} numberOfLines={1}>
                    {d.name}
                  </T>
                  <T w="semibold" size={13} color={d.phone ? colors.ink : colors.muted} numberOfLines={1}>
                    {d.phone ? phoneText(d.phone) : hasPlan ? 'Number not available' : 'Renew plan to see number'}
                  </T>
                  <Tag label={c.status === 'hired' ? 'Hired' : 'Connected'} tone="green" check style={{ marginTop: 2 }} />
                </View>
              </Pressable>
              {d.phone ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button title="Call" size="sm" icon={<Phone size={15} color={colors.ink} fill={colors.ink} />} onPress={() => callNumber(d.phone!)} style={{ flex: 1 }} />
                  <Button title="Chat" size="sm" variant="outline" icon={<MessageSquare size={15} color={colors.ink} />} onPress={chat} style={{ flex: 1 }} />
                </View>
              ) : hasPlan ? (
                <Button title="Chat" size="sm" variant="outline" icon={<MessageSquare size={15} color={colors.ink} />} onPress={chat} />
              ) : (
                <Button title="Renew plan to call" size="sm" icon={<Crown size={15} color={colors.ink} />} onPress={() => navigation.navigate('Plans')} />
              )}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** A driver in the owner's list: photo, experience, vehicles, pay, where they want to work. */
function DriverCard({ d, link, onPress, lang }: { d: Driver; link?: DriverLink | null; onPress: () => void; lang?: string | null }) {
  const where = (d.preferredLocations ?? []).length ? d.preferredLocations!.join(', ') : d.city;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${d.name}, ${d.experience} years`}
      android_ripple={{ color: 'rgba(17,17,17,0.08)' }}
      style={({ pressed }) => ({ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.94 : 1 })}>
      <PersonPhoto path={d.photo} name={d.name} size={64} radius={18} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T w="extrabold" size={16} numberOfLines={1} style={{ flexShrink: 1 }}>
            {d.name}
          </T>
          {d.verified ? <BadgeCheck size={16} color={colors.white} fill={colors.green} /> : null}
          <View style={{ flex: 1 }} />
          {link ? <StatusTag status={link} /> : null}
        </View>
        <T w="semibold" size={13} color={colors.ink2} numberOfLines={1}>
          {d.experience} yrs · {d.licence.join(', ') || 'Licence'} · {d.city}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {d.categories.slice(0, 3).map((c) => (
            <Tag key={c} label={catLabel(c, lang)} tone={c} />
          ))}
          {d.payPref ? <Tag label={d.payPref} tone="neutral" /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MapPin size={13} color={colors.muted} />
          <T size={12} color={colors.muted} numberOfLines={1} style={{ flex: 1 }}>
            Wants to drive: {where}
          </T>
          {distanceText(d.distanceKm) ? (
            <T w="bold" size={12} color={colors.ink}>
              {distanceText(d.distanceKm)}
            </T>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function DriverListRow({ d, link, onPress, last, sub, onCall }: { d: Driver; link?: DriverLink | null; onPress: () => void; last?: boolean; sub?: string; onCall?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: pressed ? colors.surface2 : colors.white, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.surface2 })}>
      <PersonPhoto path={d.photo} name={d.name} size={52} radius={15} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <T w="bold" size={15} numberOfLines={1} style={{ flexShrink: 1 }}>
            {d.name}
          </T>
          {d.verified ? <BadgeCheck size={15} color={colors.white} fill={colors.green} /> : null}
        </View>
        <T size={12} color={colors.ink2} numberOfLines={1}>
          {sub ?? `${d.experience} yrs · ${d.drives || d.categories.map((k) => cat(k).label).join(', ')} · ${d.city}`}
        </T>
      </View>
      {onCall ? (
        <Pressable onPress={onCall} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Call ${d.name}`} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' }}>
          <Phone size={16} color={colors.ink} fill={colors.ink} />
        </Pressable>
      ) : null}
      {link ? <StatusTag status={link} /> : <ChevronRight size={18} color={colors.muted} />}
    </Pressable>
  );
}

/* ---------------------------------------------------------------- Vehicles */

export function VehiclesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { vehicles } = useStore();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center' }}>
        <T w="extrabold" size={24} numberOfLines={1} style={{ flex: 1, marginRight: 10 }}>
          My vehicles
        </T>
        <Button title="Add" size="sm" icon={<Plus size={16} color={colors.ink} strokeWidth={3} />} onPress={() => navigation.navigate('AddVehicle')} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
        {vehicles.length ? (
          vehicles.map((v) => (
            <Pressable key={v.id} onPress={() => navigation.navigate('VehicleDetail', { id: v.id })} accessibilityRole="button" accessibilityLabel={`${v.model}, ${v.number}`} style={{ flexDirection: 'row', gap: 12, padding: 10, alignItems: 'center', borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }}>
              <View style={{ width: 110, height: 76, borderRadius: 12, borderWidth: 1, borderColor: colors.surface2, overflow: 'hidden' }}>
                <Image source={vehicleImage(v)} style={{ width: '100%', height: '100%' }} resizeMode={v.photo ? 'cover' : 'contain'} />
                {vehiclePhotos(v).length > 1 ? (
                  <View style={{ position: 'absolute', right: 5, bottom: 5, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: 'rgba(17,17,17,0.72)' }}>
                    <Camera size={11} color={colors.white} />
                    <T w="bold" size={11} color={colors.white}>
                      {vehiclePhotos(v).length}
                    </T>
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Tag label={cat(v.category).label} tone={v.category} />
                <T w="bold" size={15} numberOfLines={1}>
                  {v.model}
                  {v.year ? ` · ${v.year}` : ''}
                </T>
                <T size={12} color={colors.muted}>
                  {v.number}
                </T>
                <View style={{ flexDirection: 'row', marginTop: 2 }}>
                  {v.driver ? <Tag label="Hired" tone="green" check /> : <Button title="Find driver" size="sm" variant="ghost" onPress={() => navigation.navigate('PostJob', { vehicleId: v.id })} style={{ flexShrink: 1 }} />}
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState icon={<Truck size={30} color={colors.ink} />} title="No vehicles yet" text="Add your vehicles once, then post jobs for them." action={<Button title="Add vehicle" onPress={() => navigation.navigate('AddVehicle')} />} />
        )}
      </ScrollView>
    </View>
  );
}

/** An image in the vehicle form: already saved (`url`) or just picked on the phone (`file`). */
type FormPhoto = { key: string; url?: string; file?: Picked };
let photoSeq = 0;
const newPhoto = (file: Picked): FormPhoto => ({ key: `n${++photoSeq}`, file });

/** Add a vehicle, or edit one (route param `id`). At least two images are required. */
export function AddVehicleScreen({ navigation, route }: any) {
  const store = useStore();
  const { width } = useWindowDimensions();
  const editing: Vehicle | undefined = route.params?.id ? store.vehicles.find((x) => x.id === route.params.id) : undefined;
  const [k, setK] = useState<CategoryKey | null>(editing?.category ?? null);
  /** Sub-type inside the category (e.g. Big Truck (HCV) -> Bulker truck); required when the category has any. */
  const [type, setType] = useState<string | null>(() => (editing ? (cat(editing.category).types ?? []).find((ty) => editing.model.toLowerCase().startsWith(ty.toLowerCase())) ?? null : null));
  const [model, setModel] = useState(editing?.model ?? '');
  const [num, setNum] = useState(editing?.number ?? '');
  const [year, setYear] = useState(editing?.year ?? '');
  const original = editing ? vehiclePhotos(editing) : [];
  const [photos, setPhotos] = useState<FormPhoto[]>(() => original.map((url) => ({ key: url, url })));
  const [busy, setBusy] = useState(false);
  /** Field messages show only after the first Save tap, then update as the user types. */
  const [tried, setTried] = useState(false);
  const types = k ? cat(k).types ?? [] : [];
  const needsType = types.length > 0;
  const typeChosen = !!k && (!needsType || (!!type && types.includes(type)));
  const thisYear = new Date().getFullYear();
  const errors = {
    category: !k ? 'Please select vehicle type.' : null,
    type: k && !typeChosen ? `Please select ${catLabel(k).toLowerCase()} type.` : null,
    model: !model.trim() ? 'Please enter vehicle model.' : model.trim().length < 2 ? 'Please enter a valid vehicle model.' : null,
    number: !num.trim() ? 'Please enter registration number.' : num.replace(/\s/g, '').length < 6 ? 'Please enter a valid registration number.' : null,
    year: year && (!/^\d{4}$/.test(year) || +year < 1970 || +year > thisYear + 1) ? 'Please enter a valid year.' : null,
    photos: photos.length < MIN_PHOTOS ? 'Please upload at least 2 vehicle images.' : null,
  };
  const show = (e: string | null) => (tried ? e : null);
  const pickCategory = (key: CategoryKey) => {
    setK(key);
    // A sub-type from another category no longer applies; clear it (and the model it filled in).
    if (type && !(cat(key).types ?? []).includes(type)) {
      if (model === type) setModel('');
      setType(null);
    }
  };
  const pickType = (ty: string) => {
    setType(ty);
    // Fill the model with the sub-type unless the user has typed their own.
    if (!model.trim() || types.includes(model)) setModel(ty);
  };

  /* Images: add (camera or several from the gallery), replace or remove. */
  const accept = (files: Picked[]) => {
    const bad = files.map(imageProblem).find(Boolean);
    if (bad) Alert.alert('Vehicle images', bad);
    return files.filter((f) => !imageProblem(f));
  };
  const room = MAX_PHOTOS - photos.length;
  const addPhotos = () =>
    Alert.alert('Add vehicle images', 'Front, side and back views help drivers know the vehicle.', [
      { text: 'Take photo', onPress: () => takePhoto().then((x) => x && accept([x]).length && setPhotos((p) => [...p, newPhoto(x)].slice(0, MAX_PHOTOS))) },
      { text: 'Choose from gallery', onPress: () => choosePhotos(room).then((xs) => setPhotos((p) => [...p, ...accept(xs).map(newPhoto)].slice(0, MAX_PHOTOS))) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  const removePhoto = (key: string) => setPhotos((p) => p.filter((x) => x.key !== key));
  const replacePhoto = (key: string) => {
    const put = (x: Picked | null) => x && accept([x]).length && setPhotos((p) => p.map((y) => (y.key === key ? newPhoto(x) : y)));
    Alert.alert('Replace image', undefined, [
      { text: 'Take photo', onPress: () => takePhoto().then(put) },
      { text: 'Choose from gallery', onPress: () => choosePhoto().then(put) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const photoActions = (key: string) =>
    Alert.alert('Vehicle image', undefined, [
      { text: 'Replace', onPress: () => replacePhoto(key) },
      { text: 'Remove', style: 'destructive', onPress: () => removePhoto(key) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  const tile = Math.floor((width - 36 - 20) / 3);

  const save = async () => {
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    // Keep the chosen sub-type in the saved model, e.g. "Bulker truck, 30 ton".
    const m = model.trim();
    const fullModel = type && !m.toLowerCase().includes(type.toLowerCase()) ? `${type}, ${m}` : m;
    const fields = { category: k!, model: fullModel, number: num.trim(), year };
    const fresh = photos.filter((p) => p.file);
    setBusy(true);
    try {
      if (editing) {
        await api(`/vehicles/${editing.id}`, { method: 'PATCH', body: fields });
        const kept = photos.filter((p) => p.url).map((p) => p.url!);
        if (fresh.length || kept.join('|') !== original.join('|')) {
          const fd = new FormData();
          fd.append('keep', JSON.stringify(kept));
          fresh.forEach((p, i) => fd.append('files', formFile(p.file!, `vehicle-${i + 1}.jpg`)));
          await api(`/vehicles/${editing.id}/photos`, { method: 'PUT', body: fd, timeout: 180000 });
        }
      } else {
        // Details and images in one request, so a vehicle is never saved without its images.
        const fd = new FormData();
        Object.entries(fields).forEach(([key, val]) => fd.append(key, val));
        fresh.forEach((p, i) => fd.append('files', formFile(p.file!, `vehicle-${i + 1}.jpg`)));
        await api('/vehicles', { method: 'POST', body: fd, timeout: 180000 });
      }
      await store.refresh().catch(() => {});
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(editing ? 'Edit vehicle' : 'Add vehicle', e.message);
      setBusy(false);
    }
  };
  return (
    <KeyboardSafe style={{ backgroundColor: colors.bg }}>
      <AppBar title={editing ? 'Edit vehicle' : 'Add vehicle'} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 10 }}>
          <T w="bold" size={14}>
            Vehicle type
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {categories.map((c) => (
              <CategoryPick key={c.key} k={c.key} on={k === c.key} onPress={() => pickCategory(c.key)} />
            ))}
          </View>
        </View>
        {k && needsType ? (
          <View style={{ gap: 8 }}>
            <T w="bold" size={14}>
              Type
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {types.map((ty) => (
                <Chip key={ty} label={ty} selected={type === ty} onPress={() => pickType(ty)} />
              ))}
            </View>
          </View>
        ) : null}
        <Field label="Model" value={model} onChangeText={setModel} error={show(errors.model)} placeholder={k === 'bigtruck' ? 'e.g. Bulker truck, 30 ton' : 'e.g. Open body 19 ft, Sedan'} />
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ flex: 1.4 }}>
            <Field label="Registration number" value={num} onChangeText={(v) => setNum(v.toUpperCase())} error={show(errors.number)} placeholder="MH 04 AB 1234" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Year" value={year} onChangeText={(v) => setYear(v.replace(/\D/g, '').slice(0, 4))} error={show(errors.year)} keyboardType="number-pad" placeholder="2022" />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <T w="bold" size={14}>
              Vehicle images
            </T>
            <T w="semibold" size={12} color={photos.length >= MIN_PHOTOS ? colors.greenText : colors.muted}>
              {photos.length}/{MAX_PHOTOS} · at least {MIN_PHOTOS}
            </T>
          </View>
          <T size={12} color={colors.muted}>
            Add front, side and back views. Tap an image to replace or remove it. JPG, PNG or WebP, up to 8 MB each.
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {photos.map((p, i) => (
              <Pressable key={p.key} onPress={() => photoActions(p.key)} accessibilityRole="button" accessibilityLabel={`Vehicle image ${i + 1}`} style={{ width: tile, height: tile, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }}>
                <Image source={p.file ? { uri: p.file.uri } : fileSource(p.url) ?? cat(k ?? 'truck').photo} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                {i === 0 ? (
                  <View style={{ position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 7, height: 20, borderRadius: 10, justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.72)' }}>
                    <T w="bold" size={10} color={colors.white}>
                      Cover
                    </T>
                  </View>
                ) : null}
                <Pressable onPress={() => removePhoto(p.key)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove image ${i + 1}`} style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }}>
                  <X size={14} color={colors.ink} strokeWidth={2.6} />
                </Pressable>
              </Pressable>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <Pressable onPress={addPhotos} accessibilityRole="button" accessibilityLabel="Add vehicle images" style={{ width: tile, height: tile, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: show(errors.photos) ? colors.red : colors.lineStrong, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ImagePlus size={24} color={colors.ink} />
                <T w="bold" size={12}>
                  {photos.length ? 'Add more' : 'Add images'}
                </T>
              </Pressable>
            ) : null}
          </View>
          {show(errors.photos) ? <FieldError text={errors.photos!} /> : null}
        </View>
      </ScrollView>
      <BottomBar>
        {typeChosen ? (
          <Button title={editing ? 'Save changes' : 'Save vehicle'} loading={busy} onPress={save} />
        ) : (
          <View style={{ minHeight: 56, alignItems: 'center', justifyContent: 'center' }}>
            <T w="semibold" size={14} color={colors.muted} center>
              {k ? errors.type : errors.category}
            </T>
          </View>
        )}
      </BottomBar>
    </KeyboardSafe>
  );
}

/** Owner's view of one vehicle: its images, details, edit and find a driver. */
export function VehicleDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const { width } = useWindowDimensions();
  const v = store.vehicles.find((x) => x.id === route.params.id);
  const [index, setIndex] = useState(0);
  const pager = React.useRef<React.ComponentRef<typeof ScrollView>>(null);
  if (!v) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppBar title="Vehicle" />
        <EmptyState icon={<Truck size={30} color={colors.ink} />} title="Vehicle not found" text="It may have been removed." />
      </View>
    );
  }
  const list = vehiclePhotos(v);
  const go = (i: number) => {
    setIndex(i);
    pager.current?.scrollTo({ x: i * width, animated: true });
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ height: 260, backgroundColor: colors.surface2 }}>
          {list.length ? (
            <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
              {list.map((url) => (
                <Image key={url} source={fileSource(url) ?? cat(v.category).photo} style={{ width, height: 260 }} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <Image source={cat(v.category).photo} style={{ width, height: 260 }} resizeMode="contain" />
          )}
          <View style={{ position: 'absolute', top: insets.top + 10, left: 14 }}>
            <BackButton light onPress={() => navigation.goBack()} />
          </View>
          {list.length > 1 ? (
            <View style={{ position: 'absolute', right: 14, bottom: 12, paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.72)' }}>
              <T w="bold" size={12} color={colors.white}>
                {index + 1} / {list.length}
              </T>
            </View>
          ) : null}
        </View>

        {list.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, paddingTop: 12 }}>
            {list.map((url, i) => (
              <Pressable key={url} onPress={() => go(i)} accessibilityRole="button" accessibilityLabel={`Image ${i + 1}`} style={{ width: 64, height: 48, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: i === index ? colors.ink : 'transparent' }}>
                <Image source={fileSource(url) ?? cat(v.category).photo} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={{ padding: 18, gap: 6 }}>
          <Tag label={catLabel(v.category, store.lang)} tone={v.category} />
          <T w="extrabold" size={22}>
            {v.model}
          </T>
          <T w="semibold" size={14} color={colors.ink2}>
            {v.number}
            {v.year ? ` · ${v.year}` : ''}
          </T>
        </View>

        {list.length < MIN_PHOTOS ? (
          <Pressable onPress={() => navigation.navigate('AddVehicle', { id: v.id })} style={{ marginHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.neutralSoft }}>
            <ImagePlus size={20} color={colors.ink} />
            <T w="semibold" size={13} style={{ flex: 1 }}>
              Add at least {MIN_PHOTOS} images so drivers can see this vehicle.
            </T>
            <ChevronRight size={18} color={colors.ink} />
          </Pressable>
        ) : null}

        <Section title="Details" style={{ marginTop: 12 }}>
          {(
            [
              ['Vehicle type', catLabel(v.category, store.lang)],
              ['Model', v.model],
              ['Registration number', v.number],
              ['Year', v.year || '—'],
              ['Driver', v.driver || 'Not hired yet'],
            ] as const
          ).map(([a, b]) => (
            <View key={a} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
              <T size={13} color={colors.muted}>
                {a}
              </T>
              <T w="bold" size={13} style={{ flexShrink: 1, textAlign: 'right' }}>
                {b}
              </T>
            </View>
          ))}
        </Section>
      </ScrollView>
      <BottomBar style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Edit vehicle" variant="outline" icon={<Pencil size={16} color={colors.ink} />} onPress={() => navigation.navigate('AddVehicle', { id: v.id })} style={{ flex: 1 }} />
        {!v.driver ? <Button title="Find driver" onPress={() => navigation.navigate('PostJob', { vehicleId: v.id })} style={{ flex: 1 }} /> : null}
      </BottomBar>
    </View>
  );
}

/* ---------------------------------------------------------------- Post job */

export function PostJobScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const gate = useGate();
  const [step, setStep] = useState(0);
  const [vehicleId, setVehicleId] = useState<string | null>(route.params?.vehicleId ?? store.vehicles[0]?.id ?? null);
  /** "both" = a monthly salary plus pay for each trip. */
  const [payType, setPayType] = useState<PayType | 'both'>('monthly');
  const [pay, setPay] = useState('');
  const [tripPay, setTripPay] = useState('');
  const tripWork = payType !== 'monthly';
  const [from, setFrom] = useState(store.owner?.city ?? '');
  /** Per-trip jobs: optional pickup point (the owner's current location) to rank applicants by distance. */
  const [pickup, setPickup] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const loc = useMyLocation();
  const setPickupHere = () => {
    setLocating(true);
    loc
      .enable()
      .then(setPickup)
      .catch((e) => Alert.alert('Pickup point', e.message))
      .finally(() => setLocating(false));
  };
  const [to, setTo] = useState('');
  const [lic, setLic] = useState<string[]>([]);
  const [exp, setExp] = useState(2);
  const [perks, setPerks] = useState({ food: false, stay: false });
  // What the owner offers on top of the pay: daily bhatta, diesel mileage, bonus; trucks also an idle allowance.
  const [bhatta, setBhatta] = useState('');
  const [mileage, setMileage] = useState('');
  const [bonus, setBonus] = useState({ amount: '', details: '' });
  const [idle, setIdle] = useState({ amount: '200', afterHours: '48' });
  const v = store.vehicles.find((x) => x.id === vehicleId);
  const truck = isTruck(v?.category);
  useEffect(() => {
    if (!vehicleId && store.vehicles[0]) setVehicleId(store.vehicles[0].id);
  }, [store.vehicles, vehicleId]);
  const payErrors = {
    pay: !(Number(pay) > 0) ? (payType === 'trip' ? 'Please enter the pay per trip.' : 'Please enter the monthly salary.') : null,
    tripPay: payType === 'both' && !(Number(tripPay) > 0) ? 'Please enter the pay per trip.' : null,
    from: from.trim().length < 2 ? 'Please enter the work area.' : null,
    mileage: mileage && (!/^\d{1,2}(\.\d{1,2})?$/.test(mileage) || Number(mileage) <= 0 || Number(mileage) > 50) ? 'Enter mileage like 3 or 2.75 (km per litre).' : null,
  };
  const [triedPay, setTriedPay] = useState(false);
  const ok = [!!v, !Object.values(payErrors).some(Boolean), true][step];
  const next = () => {
    if (step === 1 && !ok) return setTriedPay(true);
    setStep(step + 1);
  };
  const place = (s: string) => s.split(',')[0].trim();

  const publish = () =>
    gate.run(
      () =>
        store.postJob({
          vehicleId: v!.id,
          category: v!.category,
          vehicle: v!.model,
          vehicleNo: v!.number,
          year: v!.year,
          title: `${cat(v!.category).label} driver, ${to.trim() ? `${place(from)} ⇄ ${place(to)}` : place(from)}`,
          payType: payType === 'trip' ? 'trip' : 'monthly',
          pay: Number(pay),
          ...(payType === 'both' ? { tripPay: Number(tripPay) } : {}),
          area: place(from),
          route: to.trim() ? `${from.trim()} → ${to.trim()}` : 'Local',
          duty: payType === 'monthly' ? 'Full-time' : payType === 'trip' ? 'Per trip' : 'Monthly + per trip',
          licence: lic.join(' + ') || 'LMV',
          experience: `${exp}+ years`,
          stay: [perks.food && 'Food', perks.stay && 'stay'].filter(Boolean).join(' + ') || 'Not provided',
          start: 'Immediately',
          allowance: Number(bhatta) > 0 ? `+ ${rupees(Number(bhatta))}/day bhatta` : '',
          ...(Number(bhatta) > 0 ? { dailyBhatta: Number(bhatta) } : {}),
          ...(Number(mileage) > 0 ? { mileage: Number(mileage) } : {}),
          ...(Number(bonus.amount) > 0 || bonus.details.trim() ? { bonus: { amount: Number(bonus.amount) || 0, details: bonus.details.trim() } } : {}),
          ...(tripWork && pickup ? { pickup } : {}),
          ...(truck && Number(idle.amount) > 0 ? { idleAllowance: { amount: Number(idle.amount), afterHours: Number(idle.afterHours) || 0 } } : {}),
        }),
      () => {
        Alert.alert('Job posted', 'Drivers can see your job now. We will notify you when they apply.');
        navigation.goBack();
      },
      false,
    );

  return (
    <KeyboardSafe style={{ backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 14, paddingBottom: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <BackButton onPress={() => (step ? setStep(step - 1) : navigation.goBack())} />
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={17}>
              Post a job
            </T>
            <T size={12} color={colors.muted}>
              Step {step + 1} of 3 · {['Vehicle', 'Pay and duty', 'Review'][step]}
            </T>
          </View>
        </View>
        <Steps total={3} current={step} />
      </View>
      <ScrollView key={`step-${step}`} contentContainerStyle={{ padding: 18, gap: 18 }} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <T w="extrabold" size={20}>
              Which vehicle needs a driver?
            </T>
            {store.vehicles.length === 0 ? (
              <T size={14} color={colors.ink2}>
                Add a vehicle first. It takes less than a minute.
              </T>
            ) : null}
            {store.vehicles.map((x) => {
              const on = vehicleId === x.id;
              return (
                <Pressable key={x.id} onPress={() => setVehicleId(x.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, borderWidth: on ? 2 : 1, borderColor: on ? colors.ink : colors.line, backgroundColor: on ? colors.yellow50 : colors.white }}>
                  <View style={{ width: 92, height: 62, borderRadius: 10, backgroundColor: colors.white, overflow: 'hidden' }}>
                    <Image source={vehicleImage(x)} style={{ width: '100%', height: '100%' }} resizeMode={x.photo ? 'cover' : 'contain'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T w="bold" size={15}>
                      {x.model}
                      {x.year ? ` · ${x.year}` : ''}
                    </T>
                    <T size={12} color={colors.muted}>
                      {x.number}
                    </T>
                  </View>
                  {on ? <Check size={20} color={colors.ink} strokeWidth={3} /> : null}
                </Pressable>
              );
            })}
            <Button title={store.vehicles.length ? 'Add another vehicle' : 'Add vehicle'} variant="ghost" icon={<Plus size={17} color={colors.ink} />} onPress={() => navigation.navigate('AddVehicle')} />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <T w="bold" size={14}>
              How will you pay?
            </T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['monthly', 'trip', 'both'] as const).map((k) => {
                const on = payType === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setPayType(k)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={{ flex: 1, minHeight: 96, padding: 10, borderRadius: 16, borderWidth: on ? 2 : 1, borderColor: on ? colors.ink : colors.line, backgroundColor: on ? colors.yellow50 : colors.white, justifyContent: 'flex-end', gap: 2 }}>
                    <T w="extrabold" size={14}>
                      {k === 'monthly' ? 'Monthly salary' : k === 'trip' ? 'Per trip' : 'Both'}
                    </T>
                    <T size={11} color={colors.ink2}>
                      {k === 'monthly' ? 'Fixed pay each month' : k === 'trip' ? 'Pay for each trip' : 'Salary plus pay per trip'}
                    </T>
                  </Pressable>
                );
              })}
            </View>
            <Field label={payType === 'trip' ? 'Pay per trip' : 'Monthly salary'} value={pay} onChangeText={(x) => setPay(x.replace(/\D/g, '').slice(0, 6))} error={triedPay ? payErrors.pay : null} keyboardType="number-pad" prefix="₹" placeholder={payType === 'trip' ? '2000' : '15000'} suffix={payType === 'trip' ? '/trip' : '/month'} />
            {payType === 'both' ? (
              <Field label="Pay per trip" value={tripPay} onChangeText={(x) => setTripPay(x.replace(/\D/g, '').slice(0, 6))} error={triedPay ? payErrors.tripPay : null} keyboardType="number-pad" prefix="₹" placeholder="1500" suffix="/trip" />
            ) : null}

            <Card style={{ padding: 14, gap: 12 }}>
              <View style={{ gap: 2 }}>
                <T w="extrabold" size={15}>
                  What you offer the driver
                </T>
                <T size={12} color={colors.muted}>
                  Optional. Drivers see all of this before they apply.
                </T>
              </View>
              <Field label="Daily bhatta" value={bhatta} onChangeText={(x) => setBhatta(x.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" prefix="₹" placeholder="300" suffix="/day" />
              <Field label="Mileage offered (diesel)" value={mileage} onChangeText={(x) => setMileage(x.replace(/[^\d.]/g, '').slice(0, 5))} error={triedPay ? payErrors.mileage : null} keyboardType="decimal-pad" placeholder="3" suffix="km/litre" />
              <Field label="Bonus / other benefits (amount)" value={bonus.amount} onChangeText={(x) => setBonus({ ...bonus, amount: x.replace(/\D/g, '').slice(0, 6) })} keyboardType="number-pad" prefix="₹" placeholder="2000" />
              <Field label="Bonus / other benefits (details)" value={bonus.details} onChangeText={(x) => setBonus({ ...bonus, details: x.slice(0, 200) })} placeholder="e.g. Monthly bonus for on-time delivery" />
            </Card>

            <Field label="From / work area" value={from} onChangeText={setFrom} error={triedPay ? payErrors.from : null} placeholder="e.g. Bhiwandi, Thane" />
            <Field label="To (leave empty for local work)" value={to} onChangeText={setTo} placeholder="e.g. Ahmedabad" />
            {tripWork ? (
              <Pressable onPress={setPickupHere} disabled={locating} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: pickup ? 'solid' : 'dashed', borderColor: pickup ? colors.green : colors.lineStrong, backgroundColor: colors.white }}>
                {locating ? <ActivityIndicator color={colors.ink} /> : <MapPin size={22} color={colors.ink} />}
                <View style={{ flex: 1 }}>
                  <T w="bold" size={15}>
                    {pickup ? 'Pickup point set' : 'Use my current location as pickup'}
                  </T>
                  <T size={12} color={colors.muted}>
                    {pickup ? 'Applicants nearest to it are shown first. Tap to update.' : 'Optional. See how far each driver is from the pickup.'}
                  </T>
                </View>
                {pickup ? <Check size={20} color={colors.green} strokeWidth={3} /> : null}
              </Pressable>
            ) : null}
            <View style={{ gap: 8 }}>
              <T w="bold" size={14}>
                Licence needed
              </T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {licenceTypes.map((l) => (
                  <Chip key={l} label={l} selected={lic.includes(l)} onPress={() => setLic(lic.includes(l) ? lic.filter((x) => x !== l) : [...lic, l])} />
                ))}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <T w="bold" size={14}>
                Minimum experience
              </T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[1, 2, 3, 5].map((y) => (
                  <Chip key={y} label={`${y}+ yrs`} selected={exp === y} onPress={() => setExp(y)} />
                ))}
              </View>
            </View>
            {truck ? (
              <Card style={{ padding: 14, gap: 12 }}>
                <T w="extrabold" size={15}>
                  Truck idle allowance
                </T>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field label="Paid while waiting" value={idle.amount} onChangeText={(x) => setIdle({ ...idle, amount: x.replace(/\D/g, '').slice(0, 5) })} keyboardType="number-pad" prefix="₹" suffix="/day" />
                  </View>
                  <View style={{ flex: 0.8 }}>
                    <Field label="After (hours idle)" value={idle.afterHours} onChangeText={(x) => setIdle({ ...idle, afterHours: x.replace(/\D/g, '').slice(0, 3) })} keyboardType="number-pad" suffix="hrs" />
                  </View>
                </View>
              </Card>
            ) : null}
            <Card style={{ paddingHorizontal: 14 }}>
              {(
                [
                  ['food', 'Food'],
                  ['stay', 'Stay / rest room'],
                ] as const
              ).map(([key, label], i) => (
                <ListRow key={key} title={label} right={<Toggle label={label} value={perks[key]} onChange={(x) => setPerks({ ...perks, [key]: x })} />} last={i === 1} />
              ))}
            </Card>
          </>
        ) : null}

        {step === 2 && v ? (
          <>
            <T w="extrabold" size={20}>
              Check your job post
            </T>
            <Card style={{ overflow: 'hidden' }}>
              <Image source={vehicleImage(v)} style={{ width: '100%', height: 150 }} resizeMode={v.photo ? 'cover' : 'contain'} />
              <View style={{ padding: 14, gap: 6, borderTopWidth: 1, borderTopColor: colors.surface2 }}>
                <T w="extrabold" size={21}>
                  {rupees(Number(pay))}
                  <T w="semibold" size={13} color={colors.muted}>
                    {payType === 'trip' ? ' /trip' : ' /month'}
                  </T>
                  {payType === 'both' ? (
                    <T w="bold" size={15} color={colors.ink2}>
                      {` + ${rupees(Number(tripPay))}`}
                      <T w="semibold" size={13} color={colors.muted}>
                        {' /trip'}
                      </T>
                    </T>
                  ) : null}
                </T>
                <T w="bold" size={15}>
                  {cat(v.category).label} driver · {v.model}
                </T>
                <T size={13} color={colors.ink2}>
                  {from}
                  {to ? ` → ${to}` : ''}
                </T>
                <T size={13} color={colors.ink2}>
                  {lic.join(' + ') || 'LMV'} · {exp}+ yrs · {[perks.food && 'Food', perks.stay && 'Stay'].filter(Boolean).join(', ') || 'No food or stay'}
                </T>
                {[
                  Number(bhatta) > 0 && `Bhatta ${rupees(Number(bhatta))}/day`,
                  Number(mileage) > 0 && `Mileage ${mileage} km/litre`,
                  (Number(bonus.amount) > 0 || bonus.details.trim()) && `Bonus ${Number(bonus.amount) > 0 ? rupees(Number(bonus.amount)) : ''}${bonus.details.trim() ? ` (${bonus.details.trim()})` : ''}`.replace('Bonus  (', 'Bonus ('),
                  truck && Number(idle.amount) > 0 && `Idle ${rupees(Number(idle.amount))}/day after ${idle.afterHours || 0} hrs`,
                ]
                  .filter(Boolean)
                  .map((line) => (
                    <T key={line as string} size={13} color={colors.ink2}>
                      {line}
                    </T>
                  ))}
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>
      <BottomBar>
        {step < 2 ? (
          <Button title={step === 0 ? 'Next: pay and duty' : 'Next: review'} disabled={step === 0 && !ok} onPress={next} />
        ) : (
          <Button title="Publish job" loading={gate.busy} onPress={publish} />
        )}
      </BottomBar>
      <GateSheets gate={gate} navigation={navigation} />
    </KeyboardSafe>
  );
}

/* --------------------------------------------------- Owner jobs + applicants */

function JobApplicants({ job, navigation }: { job: Job; navigation: any }) {
  const q = useQuery<{ applicants: Applicant[]; pickup?: 'pickup' | 'owner' | null }>(job.applicants > 0 ? `/jobs/${job.id}/applicants` : null, undefined, { live: ['jobs', 'links'] });
  const trip = job.payType === 'trip' || !!job.tripPay;
  // Reports the owner's location (when allowed): the fallback pickup point for per-trip jobs.
  const loc = useMyLocation();
  const shareLocation = () =>
    loc
      .enable()
      .then(() => q.reload())
      .catch((e) => Alert.alert('Location', e.message));
  if (job.applicants === 0) {
    return (
      <T size={13} color={colors.muted}>
        No applicants yet. We will notify you.
      </T>
    );
  }
  if (!q.data) return q.error ? <ErrorBlock error={q.error} onRetry={q.reload} /> : <RowSkeleton count={Math.min(3, job.applicants)} />;
  const list = q.data.applicants;
  const pickup = q.data.pickup;
  return (
    <View style={{ gap: 8 }}>
      {trip ? (
        pickup ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MapPin size={13} color={colors.muted} />
            <T size={12} color={colors.muted} style={{ flex: 1 }}>
              {pickup === 'pickup' ? 'Nearest to your pickup point first' : 'Nearest to your location first'}
            </T>
          </View>
        ) : (
          <Pressable onPress={shareLocation} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MapPin size={13} color={colors.ink} />
            <T w="semibold" size={12} style={{ flex: 1, textDecorationLine: 'underline' }}>
              Share your location to see how far each driver is
            </T>
          </Pressable>
        )
      ) : null}
      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.surface2, overflow: 'hidden' }}>
        {list.map((a, i) => (
          <DriverListRow
            key={a.id}
            d={a.driver}
            link={a.status as DriverLink}
            sub={trip ? [distanceText(a.driver.distanceKm) ?? 'Distance unknown', `${a.driver.experience} yrs`, a.driver.city].join(' · ') : undefined}
            onCall={a.driver.phone ? () => callNumber(a.driver.phone!) : undefined}
            onPress={() => navigation.navigate('DriverView', { id: a.driver.id, applicationId: a.id, jobId: job.id, driver: a.driver })}
            last={i === list.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

const JOB_STATUS: Record<string, { label: string; tone: 'green' | 'neutral' | 'red' | 'yellow' }> = {
  active: { label: 'Live', tone: 'green' },
  paused: { label: 'Paused', tone: 'yellow' },
  closed: { label: 'Closed', tone: 'neutral' },
  hidden: { label: 'Hidden by admin', tone: 'red' },
};

export function OwnerJobsScreen({ navigation, route }: any) {
  const store = useStore();
  const asTab = route.name === 'Jobs';
  const [open, setOpen] = useState<string | null>(store.postedJobs[0]?.id ?? null);
  const setStatus = (j: Job, status: 'active' | 'paused' | 'closed') =>
    api(`/jobs/${j.id}`, { method: 'PATCH', body: { status } })
      .then(() => store.refresh())
      .catch((e) => Alert.alert('Job post', e.message));
  const manage = (j: Job) =>
    Alert.alert(j.title, undefined, [
      ...(j.status === 'active'
        ? [
            { text: 'Pause (hide for now)', onPress: () => setStatus(j, 'paused') },
            { text: 'Close (position filled)', onPress: () => setStatus(j, 'closed') },
          ]
        : j.status === 'hidden'
          ? []
          : [{ text: 'Make it live again', onPress: () => setStatus(j, 'active') }]),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar title="My job posts" back={!asTab} right={<Button title="New" size="sm" icon={<Plus size={15} color={colors.ink} strokeWidth={3} />} onPress={() => navigation.navigate('PostJob')} style={{ marginRight: 6 }} />} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
        {store.postedJobs.length ? (
          store.postedJobs.map((j) => {
            const st = JOB_STATUS[j.status ?? 'active'];
            return (
              <Card key={j.id} style={{ padding: 12, gap: 12 }}>
                <JobRow job={j} onPress={() => setOpen(open === j.id ? null : j.id)} right={<Tag label={st.label} tone={st.tone} />} sub={`${j.area} · ${j.applicants} applicants`} />
                {open === j.id ? <JobApplicants job={j} navigation={navigation} /> : null}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button title={open === j.id ? 'Hide applicants' : `Applicants (${j.applicants})`} size="sm" variant="ghost" onPress={() => setOpen(open === j.id ? null : j.id)} style={{ flex: 1 }} />
                  {j.status !== 'hidden' ? <Button title="Manage" size="sm" variant="ghost" onPress={() => manage(j)} style={{ flex: 1 }} /> : null}
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState icon={<Briefcase size={30} color={colors.ink} />} title="No job posts yet" text="Post a job to start getting applications from verified drivers." action={<Button title="Post a job" onPress={() => navigation.navigate('PostJob')} />} />
        )}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------ Find drivers */

function useDebounced<V>(value: V, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const tm = setTimeout(() => setV(value), ms);
    return () => clearTimeout(tm);
  }, [value, ms]);
  return v;
}

/* ------------------------------------------- Driver profile (owner's view) */

export function DriverViewScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const gate = useGate();
  const id: string = route.params.id;
  const applicationId: string | undefined = route.params.applicationId;
  const res = useQuery<{ driver: Driver; connectionId: string | null }>(`/drivers/${id}`, undefined, {
    initial: route.params.driver ? { driver: route.params.driver, connectionId: null } : null,
    live: ['links', 'connections'],
  });
  const d = res.data?.driver;

  if (!d) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
        <BackButton light onPress={() => navigation.goBack()} />
        {res.error ? <ErrorBlock error={res.error} onRetry={res.reload} /> : <DetailSkeleton />}
      </View>
    );
  }

  const link = d.link;
  const connected = link === 'Connected' || link === 'Hired';
  const connId = res.data?.connectionId;
  // The list that opened this screen knows the distance (from the owner or the job's pickup).
  const away = distanceText(d.distanceKm ?? route.params.driver?.distanceKm);
  const after = () => {
    res.reload();
    store.refresh().catch(() => {});
  };

  const act = (fn: () => Promise<unknown>, needPlan = true) => gate.run(fn, after, needPlan);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ backgroundColor: colors.yellow50, paddingTop: insets.top + 10, paddingHorizontal: 18, paddingBottom: 18, alignItems: 'center' }}>
          <View style={{ alignSelf: 'stretch' }}>
            <BackButton light onPress={() => navigation.goBack()} />
          </View>
          <View>
            <PersonPhoto path={d.photo} name={d.name} size={100} radius={28} style={{ borderWidth: 3, borderColor: colors.white }} />
            {d.verified ? (
              <View style={{ position: 'absolute', right: -6, bottom: -6, backgroundColor: colors.white, borderRadius: 15, padding: 2 }}>
                <BadgeCheck size={24} color={colors.white} fill={colors.green} />
              </View>
            ) : null}
          </View>
          <T w="extrabold" size={22} style={{ marginTop: 12 }}>
            {d.name}
          </T>
          <T size={14} color={colors.ink2}>
            {d.categories[0] ? `${catLabel(d.categories[0], store.lang)} driver · ` : ''}
            {d.city}
          </T>
          {away ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: colors.white }}>
              <MapPin size={13} color={colors.ink} />
              <T w="bold" size={12}>
                {away}
              </T>
            </View>
          ) : null}
          <View style={{ alignSelf: 'stretch', flexDirection: 'row', marginTop: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }}>
            {[
              [`${d.experience} yrs`, 'Experience'],
              [d.licence[0] ?? '—', d.licence[1] ?? 'Licence'],
              [d.age ? `${d.age}` : '—', 'Age'],
            ].map(([a, b], i) => (
              <View key={`${b}${i}`} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRightWidth: i < 2 ? 1 : 0, borderRightColor: colors.surface2 }}>
                <T w="extrabold" size={17}>
                  {a}
                </T>
                <T size={11} color={colors.muted}>
                  {b}
                </T>
              </View>
            ))}
          </View>
        </View>

        {connected ? (
          <View style={{ margin: 18, marginBottom: 0, padding: 14, borderRadius: 16, backgroundColor: colors.greenSoft, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}>
                <Handshake size={18} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <T w="extrabold" size={15} color={colors.greenText}>
                  {link === 'Hired' ? 'Hired' : 'Connected'}
                </T>
                <T w="semibold" size={13} color={colors.greenText}>
                  {d.phone ? phoneText(d.phone) : store.hasPlan ? 'Number not available. Message them on chat.' : 'Renew your plan to see the number'}
                </T>
              </View>
            </View>
            {d.phone && connId ? (
              <ContactRow phone={d.phone} onChat={() => navigation.navigate('ChatThread', { id: connId, name: d.name })} />
            ) : !store.hasPlan ? (
              <Button title="See plans" size="sm" icon={<Crown size={15} color={colors.ink} />} onPress={() => navigation.navigate('Plans')} />
            ) : connId ? (
              <Button title="Chat" size="sm" variant="outline" icon={<MessageSquare size={15} color={colors.ink} />} onPress={() => navigation.navigate('ChatThread', { id: connId, name: d.name })} />
            ) : null}
          </View>
        ) : link === 'Request sent' ? (
          <View style={{ margin: 18, marginBottom: 0, padding: 14, borderRadius: 16, backgroundColor: colors.neutralSoft, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Clock size={20} color={colors.ink} />
            <T w="semibold" size={14} style={{ flex: 1 }}>
              Hiring request sent. We will notify you when {firstName(d.name)} accepts.
            </T>
          </View>
        ) : null}

        <Section title="Can drive" style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {d.categories.map((k) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingLeft: 4, paddingRight: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line }}>
                <Image source={cat(k).tile} style={{ width: 54, height: 36 }} resizeMode="contain" />
                <T w="bold" size={13}>
                  {catLabel(k, store.lang)}
                </T>
              </View>
            ))}
          </View>
          {d.types?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {d.types.map((ty) => (
                <Tag key={ty} label={ty} tone="yellow" />
              ))}
            </View>
          ) : null}
          {d.drives ? (
            <T size={13} color={colors.ink2} style={{ marginTop: 10 }}>
              {d.drives}
            </T>
          ) : null}
        </Section>

        <Section title="Wants to drive in" style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(d.preferredLocations?.length ? d.preferredLocations : [d.city]).map((x) => (
              <View key={x} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: x === ANYWHERE ? colors.yellow100 : colors.bg }}>
                <MapPin size={14} color={colors.ink} />
                <T w="bold" size={13}>
                  {x}
                </T>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Checked by Driver Finder" style={{ marginTop: 8 }}>
          {(
            [
              ['Driving licence', d.docs.licence, d.licence.join(', ')],
              ['Aadhaar', d.docs.aadhaar, d.docs.aadhaar ? 'Verified' : 'Not checked'],
              ['Police verification', d.docs.police, d.docs.police ? 'Verified' : 'Not added'],
            ] as const
          ).map(([label, ok, sub]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 42 }}>
              {ok ? <BadgeCheck size={20} color={colors.white} fill={colors.green} /> : <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.lineStrong }} />}
              <T w="semibold" size={14} color={ok ? colors.ink : colors.muted} style={{ flex: 1 }}>
                {label}
              </T>
              <T size={12} color={colors.muted}>
                {sub}
              </T>
            </View>
          ))}
        </Section>

        <Section title="Looking for" style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              ['Pay', d.payPref || '—'],
              ['Work', d.work],
              ['Speaks', d.languages || '—'],
              ['City', d.city],
            ].map(([a, b]) => (
              <View key={a} style={{ width: '48%', padding: 10, borderRadius: 12, backgroundColor: colors.bg }}>
                <T size={11} color={colors.muted}>
                  {a}
                </T>
                <T w="bold" size={13}>
                  {b}
                </T>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>

      <BottomBar style={{ flexDirection: 'row', gap: 10 }}>
        {link === 'Hired' ? (
          <View style={{ flex: 1, height: 56, borderRadius: 14, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <Check size={18} color={colors.greenText} strokeWidth={3} />
            <T w="extrabold" size={16} color={colors.greenText}>
              Hired
            </T>
          </View>
        ) : connected ? (
          <Button title="Mark as hired" icon={<Check size={18} color={colors.ink} strokeWidth={3} />} loading={gate.busy} onPress={() => connId && act(() => store.markHired(connId), false)} style={{ flex: 1 }} />
        ) : link === 'Request sent' ? (
          <Button title="Request sent" disabled onPress={() => {}} style={{ flex: 1 }} />
        ) : link === 'Not selected' && applicationId ? (
          <Button title="Not selected" disabled onPress={() => {}} style={{ flex: 1 }} />
        ) : (
          <>
            {applicationId ? (
              link === 'Shortlisted' ? (
                <Button title="Not a fit" variant="ghost" onPress={() => act(() => store.setApplication(applicationId, 'Not selected'), false)} style={{ flex: 1 }} />
              ) : (
                <Button title="Shortlist" variant="outline" onPress={() => act(() => store.setApplication(applicationId, 'Shortlisted'), false)} style={{ flex: 1 }} />
              )
            ) : link !== 'Shortlisted' ? (
              <Button title="Shortlist" variant="outline" onPress={() => store.toggleShortlist(d.id).then(after).catch((e) => Alert.alert('Shortlist', e.message))} style={{ flex: 1 }} />
            ) : null}
            <Button
              title={applicationId ? 'Connect' : 'Send hiring request'}
              loading={gate.busy}
              onPress={() => act(() => (applicationId ? store.setApplication(applicationId, 'Connected') : store.sendRequest(d.id, route.params.jobId)))}
              style={{ flex: 1.4 }}
            />
          </>
        )}
      </BottomBar>
      <GateSheets gate={gate} navigation={navigation} />
    </View>
  );
}

/* ---------------------------------------------------------- Owner profile */

export function OwnerProfileTab({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const o = store.owner;
  const changePhoto = () =>
    Alert.alert('Profile photo', undefined, [
      { text: 'Take photo', onPress: () => takePhoto(true).then((x) => x && store.uploadPhoto(x.uri, x.type).catch((e) => Alert.alert('Photo', e.message))) },
      { text: 'Choose from gallery', onPress: () => choosePhoto().then((x) => x && store.uploadPhoto(x.uri, x.type).catch((e) => Alert.alert('Photo', e.message))) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  const confirmLogout = () =>
    Alert.alert('Log out', 'Log out of Driver Finder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          store.logout();
          navigation.reset({ index: 0, routes: [{ name: 'Language' }] });
        },
      },
    ]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ backgroundColor: colors.yellow50, paddingTop: insets.top + 18, paddingBottom: 20, alignItems: 'center', gap: 6 }}>
          <Pressable onPress={changePhoto} accessibilityLabel="Change photo">
            <PersonPhoto path={store.me?.photo} name={o?.company || o?.name} size={96} radius={28} style={{ borderWidth: 3, borderColor: colors.white }} />
            <View style={{ position: 'absolute', right: -6, bottom: -6, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white }}>
              <Camera size={15} color={colors.yellow} />
            </View>
          </Pressable>
          <T w="extrabold" size={22} style={{ marginTop: 6 }}>
            {o?.company || o?.name}
          </T>
          <T size={14} color={colors.ink2}>
            {o?.name} · +91 {store.phone?.replace(/(\d{5})(\d{5})/, '$1 $2')}
          </T>
          <StatusTag status={store.kyc.status === 'approved' ? 'Verified' : store.kyc.status === 'rejected' ? 'Rejected' : 'Pending'} style={{ alignSelf: 'center', maxWidth: '90%' }} />
        </View>
        <Section style={{ paddingVertical: 4 }}>
          <ListRow icon={<Crown size={19} color={colors.ink} />} title="My plan" subtitle={store.hasPlan && store.plan ? `Active until ${shortDate(store.plan.expiresAt)}` : 'No active plan'} onPress={() => navigation.navigate(store.hasPlan ? 'MyPlan' : 'Plans')} />
          <ListRow icon={<Briefcase size={19} color={colors.ink} />} title="My job posts" subtitle={`${store.postedJobs.filter((j) => j.status === 'active').length} live`} onPress={() => navigation.navigate('OwnerJobs')} />
          <ListRow icon={<Truck size={19} color={colors.ink} />} title="My vehicles" subtitle={`${store.vehicles.length} vehicles`} onPress={() => navigation.navigate('Vehicles')} />
          <ListRow icon={<FileText size={19} color={colors.ink} />} title="Business documents" subtitle={store.kyc.status === 'approved' ? 'Verified' : store.kyc.status === 'rejected' ? 'Needs attention' : 'Under review'} onPress={() => navigation.navigate('Documents')} />
          <ListRow icon={<Users size={19} color={colors.ink} />} title="Business details" subtitle={o?.city} onPress={() => navigation.navigate('OwnerSetup')} />
          <ListRow icon={<Languages size={19} color={colors.ink} />} title="Language" onPress={() => navigation.navigate('Language', { fromSettings: true })} />
          <ListRow icon={<Settings size={19} color={colors.ink} />} title="Notifications" onPress={() => navigation.navigate('Settings')} />
          <ListRow icon={<CircleQuestionMark size={19} color={colors.ink} />} title="Help and support" onPress={() => navigation.navigate('Help')} />
          <ListRow icon={<FileText size={19} color={colors.ink} />} title="Terms and privacy" onPress={() => navigation.navigate('Legal')} />
          <ListRow icon={<LogOut size={19} color={colors.redText} />} title="Log out" danger onPress={confirmLogout} last />
        </Section>
        <T raw size={12} color={colors.muted} center style={{ marginTop: 16 }}>
          Driver Finder 1.4.0
        </T>
      </ScrollView>
    </View>
  );
}
