import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, ScrollView, Share, StatusBar, TextInput, View } from 'react-native';
import Pressable from '../components/Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck, Bell, Bookmark, BookmarkCheck, Briefcase, CalendarDays, Check, ChevronRight, Clock, Crown, FileText, Flag, Fuel, Gauge, Gift, Hourglass, House, IdCard,
  Languages, Lock, LogOut, MapPin, MessageSquare, CircleQuestionMark, Route, Search, Settings, Share2, X,
} from 'lucide-react-native';
import T from '../components/T';
import { BackButton, BottomBar, Button, Card, Chip, EmptyState, IconButton, InfoTile, ListRow, Section, SectionHeader, StatusTag, Tag } from '../components/ui';
import { CategoryRow, JobCard, JobRow, PersonPhoto } from '../components/brand';
import { ContactRow, KycSheet, PaywallSheet } from '../components/sheets';
import { CategoryKey, colors } from '../theme';
import { cat, catLabel, hoursAgo, isTruck, Job } from '../data/catalog';
import { useStore } from '../store/AppStore';
import { usePagedQuery, useQuery } from '../hooks/useQuery';
import { DetailSkeleton, JobCardSkeleton } from '../components/Skeleton';
import { api, ApiError, fileSource } from '../api/client';
import { daysLeft, firstName, rupees, shortDate, timeAgo } from '../utils/format';

function useJobLabels() {
  const { t } = useTranslation();
  return (j: Job) => ({
    monthly: t('common.monthly'),
    trip: t('common.trip'),
    perMonth: t('common.perMonth'),
    perTrip: t('common.perTrip'),
    posted: t('home.posted', { h: hoursAgo(j.postedAt) }),
  });
}

/**
 * Apply / connect gate shared by drivers and owners: KYC first, then plan.
 * `guard` checks what the app knows; `run` also turns the server's
 * KYC_REQUIRED / PLAN_REQUIRED answers into the same sheets.
 */
export function useGate() {
  const { kyc, hasPlan } = useStore();
  const [sheet, setSheet] = useState<'kyc' | 'plan' | null>(null);
  const [busy, setBusy] = useState(false);
  const guard = (fn: () => void, needPlan = true) => {
    if (kyc.status !== 'approved') return setSheet('kyc');
    if (needPlan && !hasPlan) return setSheet('plan');
    fn();
  };
  const run = (fn: () => Promise<unknown>, onDone?: () => void, needPlan = true) =>
    guard(async () => {
      setBusy(true);
      try {
        await fn();
        onDone?.();
      } catch (e) {
        const code = (e as ApiError).code;
        if (code === 'KYC_REQUIRED') setSheet('kyc');
        else if (code === 'PLAN_REQUIRED') setSheet('plan');
        else Alert.alert('Driver Finder', (e as Error).message);
      } finally {
        setBusy(false);
      }
    }, needPlan);
  return { sheet, setSheet, guard, run, busy };
}

export function GateSheets({ gate, navigation }: { gate: ReturnType<typeof useGate>; navigation: any }) {
  const { role } = useStore();
  return (
    <>
      <PaywallSheet
        visible={gate.sheet === 'plan'}
        role={role ?? 'driver'}
        onClose={() => gate.setSheet(null)}
        onPlans={() => {
          gate.setSheet(null);
          navigation.navigate('Plans');
        }}
      />
      <KycSheet
        visible={gate.sheet === 'kyc'}
        onClose={() => gate.setSheet(null)}
        onStatus={() => {
          gate.setSheet(null);
          navigation.navigate('KycStatus');
        }}
      />
    </>
  );
}

/** Waits until typing pauses before searching the server. */
function useDebounced<V>(value: V, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const tm = setTimeout(() => setV(value), ms);
    return () => clearTimeout(tm);
  }, [value, ms]);
  return v;
}

export function LoadingBlock() {
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

export function ErrorBlock({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.redSoft, gap: 10, marginTop: 12 }}>
      <T w="semibold" size={14} color={colors.redText}>
        {error.message}
      </T>
      <Button title="Try again" size="sm" variant="ghost" onPress={onRetry} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
}

/* -------------------------------------------------------------------- Home */

export function DriverHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const labels = useJobLabels();
  const { driver, me, lang, notices, kyc, plan, hasPlan, saved, toggleSave } = useStore();
  const [catKey, setCat] = useState<CategoryKey | null>(null);
  const [pay, setPay] = useState<'monthly' | 'trip' | null>(null);
  const [near, setNear] = useState(false);
  const [q, setQ] = useState('');
  const query = useDebounced(q.trim());
  const unread = notices.filter((n) => !n.read).length;
  // First page is cached on the phone, so the feed shows instantly on every launch.
  const feed = usePagedQuery<Job>('/jobs', { category: catKey, payType: pay, city: near ? driver?.city : undefined, q: query }, 'jobs', { persist: true });
  const list = feed.items;
  const [pulling, setPulling] = useState(false);
  const pull = async () => {
    setPulling(true);
    await feed.reload();
    setPulling(false);
  };
  const open = (j: Job) => navigation.navigate('JobDetail', { id: j.id, job: j });
  const heading = catKey ? t('home.jobsFor', { cat: catLabel(catKey, lang) }) : t('home.allJobs');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={feed.ready ? list : []}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
        onEndReachedThreshold={0.6}
        onEndReached={feed.loadMore}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={pull} colors={[colors.ink]} />}
        renderItem={({ item: j }) => (
          <View style={{ paddingHorizontal: 18, paddingBottom: 12 }}>
            <JobCard
              job={j}
              labels={labels(j)}
              saved={saved.includes(j.id)}
              onSave={() => toggleSave(j.id)}
              onPress={() => open(j)}
              status={j.application ? <StatusTag status={t(`my.${j.application.status}`)} /> : undefined}
            />
          </View>
        )}
        ListFooterComponent={feed.loadingMore ? <ActivityIndicator color={colors.ink} style={{ marginVertical: 16 }} /> : undefined}
        ListHeaderComponent={
        <>
        <View style={{ backgroundColor: colors.yellow50, paddingTop: insets.top + 10, paddingBottom: 6 }}>
          <View style={{ paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, height: 52 }}>
            <Pressable onPress={() => navigation.navigate('Profile')} accessibilityLabel="Profile">
              <PersonPhoto path={me?.photo} name={me?.name} size={46} radius={23} style={{ borderWidth: 2, borderColor: colors.white }} />
              {kyc.status === 'approved' ? (
                <View style={{ position: 'absolute', right: -3, bottom: -3 }}>
                  <BadgeCheck size={19} color={colors.white} fill={colors.green} />
                </View>
              ) : null}
            </Pressable>
            <View style={{ flex: 1 }}>
              <T w="extrabold" size={18} numberOfLines={1}>
                {t('home.hello', { name: firstName(driver?.name) || 'Driver' })}
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <MapPin size={14} color={colors.yellowDark} />
                <T w="semibold" size={13} color={colors.ink2}>
                  {driver?.city ?? ''}
                </T>
              </View>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Language', { fromSettings: true })}
              accessibilityLabel="Change language"
              style={{ height: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }}>
              <T w="bold" size={14}>
                अ / A
              </T>
            </Pressable>
            <IconButton label={`Notifications, ${unread} unread`} onPress={() => navigation.navigate('Notifications')} style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }}>
              <Bell size={20} color={colors.ink} />
              {unread ? <View style={{ position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.white }} /> : null}
            </IconButton>
          </View>

          <View style={{ paddingHorizontal: 18, marginTop: 12 }}>
            <View style={{ height: 52, borderRadius: 14, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, borderWidth: 1, borderColor: colors.line }}>
              <Search size={20} color={colors.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder={t('home.search')}
                placeholderTextColor={colors.faint}
                style={{ flex: 1, fontFamily: 'NotoSans-Medium', fontSize: 15, color: colors.ink, paddingVertical: 0 }}
                returnKeyType="search"
              />
              {q ? (
                <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Clear search">
                  <X size={18} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <CategoryRow value={catKey} onChange={setCat} style={{ marginTop: 14, marginBottom: 8 }} />
        </View>

        <View style={{ paddingHorizontal: 18 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
            <Chip label={t('setup.monthlyPay')} selected={pay === 'monthly'} onPress={() => setPay(pay === 'monthly' ? null : 'monthly')} />
            <Chip label={t('common.trip')} selected={pay === 'trip'} onPress={() => setPay(pay === 'trip' ? null : 'trip')} />
            <Chip label={t('home.nearMe')} selected={near} onPress={() => setNear(!near)} icon={<MapPin size={14} color={colors.ink} />} />
          </ScrollView>

          {kyc.status === 'pending' || kyc.status === 'rejected' ? (
            <Pressable onPress={() => navigation.navigate('KycStatus')} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: kyc.status === 'rejected' ? colors.redSoft : colors.neutralSoft }}>
              <Clock size={20} color={kyc.status === 'rejected' ? colors.redText : colors.ink} />
              <T w="semibold" size={13} color={kyc.status === 'rejected' ? colors.redText : colors.neutralText} style={{ flex: 1 }}>
                {kyc.status === 'rejected' ? t('status.rejectedTitle') : t('home.kycBanner')}
              </T>
              <ChevronRight size={18} color={colors.ink} />
            </Pressable>
          ) : null}

          {hasPlan && plan ? (
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.ink }}>
              <Crown size={20} color={colors.yellow} fill={colors.yellow} />
              <T w="bold" size={14} color={colors.white} style={{ flex: 1 }}>
                {t('home.planActive')}
              </T>
              <T w="semibold" size={12} color={colors.yellow200}>
                {t('home.daysLeft', { n: daysLeft(plan.expiresAt) })}
              </T>
            </View>
          ) : (
            <Pressable onPress={() => navigation.navigate('Plans')} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.yellow50, borderWidth: 1, borderColor: colors.yellow200 }}>
              <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Crown size={20} color={colors.yellow} fill={colors.yellow} />
              </View>
              <View style={{ flex: 1 }}>
                <T w="extrabold" size={14}>
                  {t('home.planTitle')}
                </T>
                <T size={12} color={colors.yellowText}>
                  {t('home.planText')}
                </T>
              </View>
              <ChevronRight size={18} color={colors.ink} />
            </Pressable>
          )}

          <SectionHeader title={heading} count={feed.total} />
          {feed.error && !feed.ready ? (
            <ErrorBlock error={feed.error} onRetry={feed.reload} />
          ) : !feed.ready ? (
            <View style={{ gap: 12 }}>
              <JobCardSkeleton />
              <JobCardSkeleton />
            </View>
          ) : list.length === 0 ? (
            <EmptyState
              icon={<Search size={30} color={colors.ink} />}
              title={t('home.noJobs')}
              text=" "
              action={
                <Button
                  title={t('home.clear')}
                  variant="ghost"
                  onPress={() => {
                    setCat(null);
                    setPay(null);
                    setNear(false);
                    setQ('');
                  }}
                />
              }
            />
          ) : null}
        </View>
        </>
        }
      />
    </View>
  );
}

/* -------------------------------------------------------------- Job detail */

const REPORT_REASONS = ['Fake job', 'Asked me to pay money', 'Wrong salary or details', 'Rude or abusive', 'Other'];

export function JobDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const store = useStore();
  const gate = useGate();
  const id: string = route.params.id;
  const q = useQuery<{ job: Job }>(`/jobs/${id}`, undefined, { initial: route.params.job ? { job: route.params.job } : null, live: ['applications', 'connections'] });
  const j = q.data?.job;

  if (!j) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
        <BackButton light onPress={() => navigation.goBack()} />
        {q.error ? <ErrorBlock error={q.error} onRetry={q.reload} /> : <DetailSkeleton />}
      </View>
    );
  }

  const o = j.owner;
  const c = cat(j.category);
  const app = j.application;
  const conn = store.connectionWith(j.ownerId);
  const connected = app?.status === 'Connected' || !!conn;
  const saved = store.saved.includes(j.id);
  const openChat = () => conn && navigation.navigate('ChatThread', { id: conn.id, name: o?.name ?? '' });

  const apply = () =>
    gate.run(
      () => store.apply(j.id),
      () => {
        q.reload();
        Alert.alert(t('job.sent'), t('job.sentText'));
      },
    );

  const report = () =>
    Alert.alert(
      t('job.report'),
      undefined,
      [
        ...REPORT_REASONS.map((reason) => ({
          text: reason,
          onPress: () =>
            api('/reports', { method: 'POST', body: { targetType: 'job', targetId: j.id, reason } })
              .then(() => Alert.alert(t('job.report'), t('job.reported')))
              .catch((e) => Alert.alert(t('job.report'), e.message)),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
      { cancelable: true },
    );

  const facts = [
    { Icon: Route, label: t('job.route'), value: j.route },
    { Icon: CalendarDays, label: t('job.duty'), value: j.duty },
    { Icon: IdCard, label: t('job.licence'), value: j.licence },
    { Icon: Gauge, label: t('job.experience'), value: j.experience },
    { Icon: House, label: t('job.stay'), value: j.stay },
    { Icon: Clock, label: t('job.start'), value: j.start },
  ].filter((f) => f.value);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 270 + insets.top, backgroundColor: colors.white, paddingTop: insets.top }}>
          <Image source={c.photo} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          <View style={{ position: 'absolute', top: insets.top + 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
            <BackButton light onPress={() => navigation.goBack()} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <IconButton
                label="Share"
                onPress={() => Share.share({ message: `${j.title} · ${rupees(j.pay)} ${j.payType === 'monthly' ? '/month' : '/trip'} · ${j.area}\nDriver Finder app` }).catch(() => {})}
                style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }}>
                <Share2 size={19} color={colors.ink} />
              </IconButton>
              <IconButton label={saved ? 'Remove from saved' : 'Save job'} onPress={() => store.toggleSave(j.id)} style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }}>
                {saved ? <BookmarkCheck size={19} color={colors.ink} fill={colors.yellow} /> : <Bookmark size={19} color={colors.ink} />}
              </IconButton>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: colors.white, paddingHorizontal: 18, paddingBottom: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Tag label={`${catLabel(j.category, store.lang)} · ${j.vehicle}`} tone={j.category} />
            <Tag label={j.payType === 'monthly' ? t('setup.monthlyPay') : t('common.trip')} tone={j.payType === 'monthly' ? 'monthly' : 'trip'} />
          </View>
          <T w="extrabold" size={22} lh={28}>
            {j.title}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', padding: 14, borderRadius: 14, backgroundColor: colors.yellow50 }}>
            <View>
              <T w="semibold" size={12} color={colors.ink2}>
                {j.payType === 'monthly' ? t('job.salary') : t('job.payPerTrip')}
              </T>
              <T w="extrabold" size={26}>
                {rupees(j.pay)}
                <T w="semibold" size={14} color={colors.ink2}>
                  {j.payType === 'monthly' ? ` ${t('common.perMonth')}` : ` ${t('common.perTrip')}`}
                </T>
              </T>
            </View>
            {j.allowance ? (
              <T w="bold" size={12} color={colors.yellowText} style={{ maxWidth: 130, textAlign: 'right' }}>
                {j.allowance}
              </T>
            ) : null}
          </View>
          <T size={12} color={colors.muted}>
            {t('job.postedBy', { h: hoursAgo(j.postedAt) })} · {t('home.applied', { n: j.applicants })}
          </T>
        </View>

        {app ? (
          <Section title={t('job.status')} style={{ marginTop: 8 }}>
            {app.status === 'Not selected' ? (
              <StatusTag status={t('my.Not selected')} />
            ) : (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['Applied', 'Shortlisted', 'Connected'] as const).map((s, i) => {
                  const reached = ['Applied', 'Shortlisted', 'Connected'].indexOf(app.status) >= i;
                  return (
                    <View key={s} style={{ flex: 1, gap: 6 }}>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: reached ? colors.green : colors.line }} />
                      <T w={reached ? 'bold' : 'semibold'} size={12} color={reached ? colors.ink : colors.muted}>
                        {t(`my.${s}`)}
                      </T>
                    </View>
                  );
                })}
              </View>
            )}
          </Section>
        ) : null}

        <View style={{ marginTop: 8, backgroundColor: colors.white, padding: 18, flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
          {facts.map(({ Icon, label, value }) => (
            <InfoTile key={label} label={label} value={value} icon={<Icon size={19} color={colors.ink} />} style={{ width: '50%', paddingRight: 8 }} />
          ))}
        </View>

        {isTruck(j.category) && (j.idleAllowance || j.mileage || j.bonus) ? (
          <Section title="Truck details" style={{ marginTop: 8 }}>
            <View style={{ gap: 10 }}>
              {j.idleAllowance ? (
                <TruckFact icon={<Hourglass size={20} color={colors.ink} />} label="Idle allowance (bhatta)" value={`${rupees(j.idleAllowance.amount)} per day`} note={j.idleAllowance.afterHours ? `Paid after ${j.idleAllowance.afterHours} hours of waiting` : undefined} />
              ) : null}
              {j.mileage ? <TruckFact icon={<Fuel size={20} color={colors.ink} />} label="Diesel mileage" value={`${j.mileage} km per litre`} note="Expected average for this truck" /> : null}
              {j.bonus && (j.bonus.amount || j.bonus.details) ? (
                <TruckFact icon={<Gift size={20} color={colors.ink} />} label="Bonus" value={j.bonus.amount ? rupees(j.bonus.amount) : 'Yes'} note={j.bonus.details || undefined} />
              ) : null}
            </View>
          </Section>
        ) : null}

        <Section title={t('job.vehicle')} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              [t('job.model'), j.vehicle],
              [t('job.year'), j.year || '—'],
              [t('job.number'), j.vehicleNo ? `${j.vehicleNo.slice(0, 5)} ••${j.vehicleNo.slice(-2)}` : '—'],
            ].map(([k, v]) => (
              <View key={k} style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.bg }}>
                <T size={11} color={colors.muted}>
                  {k}
                </T>
                <T w="bold" size={13} numberOfLines={1}>
                  {v}
                </T>
              </View>
            ))}
          </View>
        </Section>

        {o ? (
          <Section title={t('job.owner')} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {o.photo ? (
                <Image source={fileSource(o.photo)} style={{ width: 54, height: 54, borderRadius: 15 }} />
              ) : (
                <View style={{ width: 54, height: 54, borderRadius: 15, backgroundColor: colors.yellow100, alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={24} color={colors.ink} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T w="bold" size={15}>
                    {o.name}
                  </T>
                  {o.verified ? <BadgeCheck size={16} color={colors.white} fill={colors.green} /> : null}
                </View>
                <T size={13} color={colors.ink2}>
                  {o.company} · {t('job.vehicles', { n: o.vehicles })} · {o.city}
                </T>
              </View>
            </View>
            <View style={{ marginTop: 14 }}>
              {connected && conn?.other.phone ? (
                <ContactRow phone={conn.other.phone} onChat={openChat} />
              ) : connected ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.yellow50 }}>
                  <Crown size={18} color={colors.ink} />
                  <T size={13} color={colors.ink2} style={{ flex: 1 }} lh={18}>
                    {t('home.planText')}
                  </T>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.surface2 }}>
                  <Lock size={18} color={colors.ink2} />
                  <T size={13} color={colors.ink2} style={{ flex: 1 }} lh={18}>
                    {t('job.locked')}
                  </T>
                </View>
              )}
            </View>
            <Pressable onPress={report} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, alignSelf: 'flex-start' }} hitSlop={8}>
              <Flag size={15} color={colors.redText} />
              <T w="bold" size={13} color={colors.redText}>
                {t('job.report')}
              </T>
            </Pressable>
          </Section>
        ) : null}
      </ScrollView>
      <BottomBar style={{ flexDirection: 'row', gap: 10 }}>
        {app || connected ? (
          connected && conn ? (
            <Button title={t('common.chat')} variant="dark" icon={<MessageSquare size={18} color={colors.white} />} onPress={openChat} style={{ flex: 1 }} />
          ) : (
            <View style={{ flex: 1, height: 56, borderRadius: 14, backgroundColor: app?.status === 'Not selected' ? colors.redSoft : colors.greenSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {app?.status === 'Not selected' ? null : <Check size={18} color={colors.greenText} strokeWidth={3} />}
              <T w="extrabold" size={16} color={app?.status === 'Not selected' ? colors.redText : colors.greenText}>
                {t(`my.${app?.status ?? 'Applied'}`)}
              </T>
            </View>
          )
        ) : (
          <Button title={t('job.applyNow')} onPress={apply} loading={gate.busy} style={{ flex: 1 }} />
        )}
      </BottomBar>
      <GateSheets gate={gate} navigation={navigation} />
    </View>
  );
}

/** One truck-job detail (idle allowance, mileage, bonus) with a short explanation. */
function TruckFact({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.yellow50 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1, gap: 1 }}>
        <T size={12} color={colors.ink2}>
          {label}
        </T>
        <T w="extrabold" size={16}>
          {value}
        </T>
        {note ? (
          <T size={12} color={colors.ink2} lh={17}>
            {note}
          </T>
        ) : null}
      </View>
    </View>
  );
}

/* ----------------------------------------------------------------- My jobs */

export function MyJobsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const store = useStore();
  const [tab, setTab] = useState<'applied' | 'requests' | 'connected'>('applied');
  const [refreshing, setRefreshing] = useState(false);
  const gate = useGate();

  const applied = store.applications;
  const pending = store.requests.filter((r) => r.status === 'Pending');
  const connected = store.connections;

  const tabs = [
    { key: 'applied' as const, label: t('my.applied'), n: applied.length },
    { key: 'requests' as const, label: t('my.requests'), n: pending.length },
    { key: 'connected' as const, label: t('my.connected'), n: connected.length },
  ];
  const pull = async () => {
    setRefreshing(true);
    await store.refresh().catch(() => {});
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 18, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <T w="extrabold" size={24}>
          {t('my.title')}
        </T>
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          {tabs.map((x) => {
            const on = tab === x.key;
            return (
              <Pressable key={x.key} onPress={() => setTab(x.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: on ? colors.yellow : 'transparent' }}>
                <T w={on ? 'extrabold' : 'semibold'} size={14} color={on ? colors.ink : colors.muted}>
                  {x.label}
                  {x.n ? ` · ${x.n}` : ''}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pull} colors={[colors.ink]} />}>
        {tab === 'applied' ? (
          applied.length ? (
            applied.map((a) => (
              <JobRow key={a.id} job={a.job} onPress={() => navigation.navigate('JobDetail', { id: a.job.id, job: a.job })} right={<StatusTag status={t(`my.${a.status}`)} />} sub={`${a.job.owner?.company ?? ''} · ${timeAgo(a.at)}`} />
            ))
          ) : (
            <EmptyState icon={<Briefcase size={30} color={colors.ink} />} title={t('my.emptyApplied')} text={t('my.emptyAppliedText')} action={<Button title={t('my.findJobs')} onPress={() => navigation.navigate('Jobs')} />} />
          )
        ) : null}

        {tab === 'requests' ? (
          pending.length ? (
            pending.map((r) => (
              <Card key={r.id} style={{ padding: 14, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <PersonPhoto path={r.owner?.photo} name={r.owner?.company} size={48} radius={14} />
                  <View style={{ flex: 1 }}>
                    <T w="extrabold" size={15}>
                      {r.owner?.company}
                    </T>
                    <T size={13} color={colors.ink2}>
                      {t('my.wants')} · {timeAgo(r.at)}
                    </T>
                  </View>
                </View>
                {r.message ? (
                  <T size={14} color={colors.ink2}>
                    “{r.message}”
                  </T>
                ) : null}
                {r.job ? <JobRow job={r.job} onPress={() => navigation.navigate('JobDetail', { id: r.job!.id, job: r.job })} /> : null}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button title={t('my.decline')} variant="ghost" size="md" onPress={() => store.answerRequest(r.id, false).catch((e) => Alert.alert('Driver Finder', e.message))} style={{ flex: 1 }} />
                  <Button title={t('my.accept')} size="md" loading={gate.busy} onPress={() => gate.run(() => store.answerRequest(r.id, true), () => setTab('connected'))} style={{ flex: 1.4 }} />
                </View>
              </Card>
            ))
          ) : (
            <EmptyState icon={<Bell size={30} color={colors.ink} />} title={t('my.emptyReq')} text={t('my.emptyReqText')} />
          )
        ) : null}

        {tab === 'connected' ? (
          connected.length ? (
            connected.map((c) => (
              <Card key={c.id} style={{ padding: 14, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <PersonPhoto path={c.other.photo} name={c.other.name} size={48} radius={14} />
                  <View style={{ flex: 1 }}>
                    <T w="extrabold" size={15}>
                      {c.other.name}
                    </T>
                    <T size={13} color={colors.ink2} numberOfLines={1}>
                      {(c.other as any).company}
                      {c.jobTitle ? ` · ${c.jobTitle}` : ''}
                    </T>
                  </View>
                  <StatusTag status={c.status === 'hired' ? 'Hired' : t('my.Connected')} />
                </View>
                {c.other.phone ? (
                  <ContactRow phone={c.other.phone} onChat={() => navigation.navigate('ChatThread', { id: c.id, name: c.other.name })} />
                ) : (
                  <Button title={t('common.chat')} variant="dark" size="md" onPress={() => navigation.navigate('ChatThread', { id: c.id, name: c.other.name })} />
                )}
              </Card>
            ))
          ) : (
            <EmptyState icon={<MessageSquare size={30} color={colors.ink} />} title={t('my.emptyConn')} text={t('my.emptyConnText')} />
          )
        ) : null}
      </ScrollView>
      <GateSheets gate={gate} navigation={navigation} />
    </View>
  );
}

/* ----------------------------------------------------------------- Profile */

export function DriverProfileTab({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const store = useStore();
  const d = store.driver;
  const pct = Math.min(100, 30 + (store.me?.photo ? 10 : 0) + (d?.categories.length ? 15 : 0) + (d?.licence.length ? 15 : 0) + (store.kyc.status === 'approved' ? 30 : store.kyc.status === 'pending' ? 15 : 0));
  const confirmLogout = () =>
    Alert.alert(t('profile.logout'), t('profile.logoutQ'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
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
          <Pressable onPress={() => navigation.navigate('DriverSetup')} accessibilityLabel="Edit profile">
            <PersonPhoto path={store.me?.photo} name={d?.name} size={96} radius={28} style={{ borderWidth: 3, borderColor: colors.white }} />
            {store.kyc.status === 'approved' ? (
              <View style={{ position: 'absolute', right: -6, bottom: -6, backgroundColor: colors.white, borderRadius: 15, padding: 2 }}>
                <BadgeCheck size={24} color={colors.white} fill={colors.green} />
              </View>
            ) : null}
          </Pressable>
          <T w="extrabold" size={22} style={{ marginTop: 6 }}>
            {d?.name || 'Driver'}
          </T>
          <T size={14} color={colors.ink2}>
            +91 {store.phone?.replace(/(\d{5})(\d{5})/, '$1 $2')} · {d?.city}
          </T>
          <StatusTag status={store.kyc.status === 'approved' ? 'Verified' : store.kyc.status === 'rejected' ? 'Rejected' : 'Pending'} />
          <View style={{ alignSelf: 'stretch', marginHorizontal: 18, marginTop: 10, gap: 6 }}>
            <T w="semibold" size={12} color={colors.ink2}>
              {t('profile.complete', { p: pct })}
            </T>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.yellow100 }}>
              <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: colors.ink }} />
            </View>
          </View>
        </View>

        <Section title={t('profile.canDrive')}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(d?.categories ?? []).map((k) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingRight: 12, paddingLeft: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.line }}>
                <Image source={cat(k).tile} style={{ width: 54, height: 36 }} resizeMode="contain" />
                <T w="bold" size={13}>
                  {catLabel(k, store.lang)}
                </T>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {[
              [t('job.licence'), d?.licence.join(', ') || '—'],
              [t('job.experience'), d?.experience ? t('setup.years', { n: d.experience }) : '—'],
              [t('profile.lookingFor'), d?.payPref === 'trip' ? t('common.trip') : d?.payPref === 'both' ? t('setup.both') : t('setup.monthlyPay')],
            ].map(([k, v]) => (
              <View key={k} style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.bg }}>
                <T size={11} color={colors.muted}>
                  {k}
                </T>
                <T w="bold" size={13} numberOfLines={2}>
                  {v}
                </T>
              </View>
            ))}
          </View>
          <Button title="Edit profile" size="sm" variant="ghost" onPress={() => navigation.navigate('DriverSetup')} style={{ alignSelf: 'flex-start', marginTop: 12 }} />
        </Section>

        <Section style={{ marginTop: 8, paddingVertical: 4 }}>
          <ListRow icon={<Crown size={19} color={colors.ink} />} title={t('profile.plan')} subtitle={store.hasPlan && store.plan ? t('plans.active', { date: shortDate(store.plan.expiresAt) }) : t('profile.noPlan')} onPress={() => navigation.navigate(store.hasPlan ? 'MyPlan' : 'Plans')} />
          <ListRow icon={<FileText size={19} color={colors.ink} />} title={t('profile.documents')} subtitle={store.kyc.status === 'approved' ? t('common.verified') : t('status.pendingTitle')} onPress={() => navigation.navigate('Documents')} />
          <ListRow icon={<Bookmark size={19} color={colors.ink} />} title={t('profile.saved')} subtitle={`${store.saved.length}`} onPress={() => navigation.navigate('SavedJobs')} />
          <ListRow icon={<Languages size={19} color={colors.ink} />} title={t('profile.language')} onPress={() => navigation.navigate('Language', { fromSettings: true })} />
          <ListRow icon={<Settings size={19} color={colors.ink} />} title={t('profile.notifications')} onPress={() => navigation.navigate('Settings')} />
          <ListRow icon={<CircleQuestionMark size={19} color={colors.ink} />} title={t('profile.help')} onPress={() => navigation.navigate('Help')} />
          <ListRow icon={<FileText size={19} color={colors.ink} />} title={t('profile.terms')} onPress={() => navigation.navigate('Legal')} />
          <ListRow icon={<LogOut size={19} color={colors.redText} />} title={t('profile.logout')} danger onPress={confirmLogout} last />
        </Section>
        <T size={12} color={colors.muted} center style={{ marginTop: 16 }}>
          Driver Finder 1.2.0
        </T>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------ Saved jobs */

export function SavedJobsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const q = useQuery<{ jobs: Job[] }>('/jobs/saved');
  const list = q.data?.jobs ?? [];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBarLite title={t('profile.saved')} navigation={navigation} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
        {!q.data ? (
          q.error ? <ErrorBlock error={q.error} onRetry={q.reload} /> : <JobCardSkeleton />
        ) : list.length ? (
          list.map((j) => <JobRow key={j.id} job={j} onPress={() => navigation.navigate('JobDetail', { id: j.id, job: j })} />)
        ) : (
          <EmptyState icon={<Bookmark size={30} color={colors.ink} />} title="No saved jobs" text="Tap the bookmark on a job to keep it here." />
        )}
      </ScrollView>
    </View>
  );
}

function AppBarLite({ title, navigation }: { title: string; navigation: any }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <View style={{ height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 6 }}>
        <BackButton onPress={() => navigation.goBack()} />
        <T w="extrabold" size={17}>
          {title}
        </T>
      </View>
    </View>
  );
}
