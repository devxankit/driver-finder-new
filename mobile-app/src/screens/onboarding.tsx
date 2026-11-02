import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StatusBar, View } from 'react-native';
import Pressable from '../components/Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Camera, Check, CircleAlert, Clock, Globe, Images, MapPin, Phone, Plus, RefreshCw, ScanLine, ShieldCheck, Sun, X } from 'lucide-react-native';
import T from '../components/T';
import { BackButton, BottomBar, Button, Chip, Field, Steps, KeyboardSafe } from '../components/ui';
import { CategoryPick, DocMock, Logo } from '../components/brand';
import { CategoryKey, colors, shadow } from '../theme';
import { ANYWHERE, cat, categories, licenceTypes } from '../data/catalog';
import { CityField, CityPicker } from '../components/CityPicker';
import { fileSource } from '../api/client';
import { choosePhoto, Picked, takePhoto } from '../utils/media';
import { rupees } from '../utils/format';
import { DriverProfile, useStore } from '../store/AppStore';

/* ------------------------------------------------------------ Driver setup */

export function DriverSetupScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { driver, me, saveDriver, uploadPhoto, loadMeta } = useStore();
  const [picker, setPicker] = useState<'city' | 'prefer' | null>(null);
  useEffect(() => {
    // Fresh city / category lists from the admin before the user picks.
    loadMeta().catch(() => {});
  }, [loadMeta]);
  const [step, setStep] = useState(0);
  const [p, setP] = useState<DriverProfile>(
    driver ?? { name: me?.name ?? '', city: me?.city ?? '', categories: [], licence: [], experience: 0, payPref: 'monthly', expectedPay: '', fullTime: true, types: [], preferredLocations: [] },
  );
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const photoSrc = photo ? { uri: photo.uri } : fileSource(me?.photo);
  const snap = async () => {
    const x = await takePhoto(true);
    if (x) setPhoto(x);
  };
  const set = (patch: Partial<DriverProfile>) => setP((x) => ({ ...x, ...patch }));
  const toggle = (key: 'categories' | 'licence' | 'types', v: string) => {
    const cur = (p[key] ?? []) as string[];
    set({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<DriverProfile>);
  };
  /** Categories that have sub-types to choose (e.g. Big Truck: Bag, Bulker, Container). */
  const withTypes = p.categories.map((k) => cat(k)).filter((c) => c.types?.length && (c.key === 'bigtruck' || c.types.length <= 6));
  const typesOk = !p.categories.includes('bigtruck') || (p.types ?? []).some((x) => cat('bigtruck').types?.includes(x));
  const prefer = p.preferredLocations ?? [];
  // Back on the first step returns to the role choice (setup is reached by a reset, so there is no history).
  const back = () => (step > 0 ? setStep(step - 1) : navigation.canGoBack() ? navigation.goBack() : navigation.reset({ index: 0, routes: [{ name: 'Role' }] }));

  const TOTAL = 5;
  const canNext = [p.name.trim().length > 1, !!p.city, p.categories.length > 0 && typesOk, p.licence.length > 0 && p.experience > 0, prefer.length > 0][step];

  const next = async () => {
    if (step < TOTAL - 1) return setStep(step + 1);
    setBusy(true);
    try {
      // The pay is typed as digits; owners read it formatted ("₹25,000").
      const pay = p.expectedPay.replace(/\D/g, '');
      // Only keep sub-types of categories the driver still has selected.
      const allowed = p.categories.flatMap((k) => cat(k).types ?? []);
      await saveDriver({ ...p, name: p.name.trim(), expectedPay: pay ? rupees(Number(pay)) : '', types: (p.types ?? []).filter((x) => allowed.includes(x)) });
      if (photo) await uploadPhoto(photo.uri, photo.type).catch(() => {});
      navigation.reset({ index: 0, routes: [{ name: me?.kyc.status === 'none' || !me ? 'Kyc' : 'DriverMain' }] });
    } catch (e: any) {
      Alert.alert(t('setup.toDocs'), e.message);
      setBusy(false);
    }
  };

  return (
    <KeyboardSafe style={{ backgroundColor: colors.white }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 18, gap: 12, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BackButton onPress={back} />
          <T w="bold" size={15} style={{ flex: 1 }}>
            {t('setup.step', { n: step + 1, total: TOTAL })}
          </T>
        </View>
        <Steps total={TOTAL} current={step} />
      </View>
      {/* A fresh ScrollView per step: on Android (Fabric) the content view of a reused one
          could lose its native state, leaving the previous step on screen. */}
      <ScrollView key={`step-${step}`} contentContainerStyle={{ padding: 18, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <View style={{ gap: 18 }}>
            {/* Photo first: with the keyboard open it stays on screen above the name field. */}
            <View style={{ alignItems: 'center', gap: 10, padding: 16, borderRadius: 18, backgroundColor: colors.bg }}>
              <Pressable onPress={snap} accessibilityRole="button" accessibilityLabel={t('setup.takePhoto')}>
                {photoSrc ? (
                  <Image source={photoSrc} style={{ width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: colors.white }} />
                ) : (
                  <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: colors.white, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={34} color={colors.ink2} />
                  </View>
                )}
                <View style={{ position: 'absolute', right: -2, bottom: 2, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg }}>
                  <Camera size={16} color={colors.yellow} />
                </View>
              </Pressable>
              <T w="bold" size={15}>
                {t('setup.photo')}
              </T>
              <T size={13} color={colors.ink2} center lh={18}>
                {t('setup.photoHint')}
              </T>
              <Button size="md" variant={photoSrc ? 'ghost' : 'dark'} title={photoSrc ? t('common.retake') : t('setup.takePhoto')} icon={<Camera size={17} color={photoSrc ? colors.ink : colors.white} />} onPress={snap} />
            </View>
            <T w="extrabold" size={22}>
              {t('setup.nameTitle')}
            </T>
            <Field value={p.name} onChangeText={(v) => set({ name: v })} placeholder={t('setup.namePh')} />
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: 16 }}>
            <T w="extrabold" size={24}>
              {t('setup.cityTitle')}
            </T>
            <CityField value={p.city} placeholder="Search your city" onPress={() => setPicker('city')} />
            <T size={13} color={colors.muted} lh={18}>
              Tap to search all cities. Not in the list? Choose “Other” and type it.
            </T>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: 6 }}>
            <T w="extrabold" size={24}>
              {t('setup.catTitle')}
            </T>
            <T size={14} color={colors.ink2}>
              {t('setup.catHint')}
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {categories.map((c) => (
                <CategoryPick key={c.key} k={c.key} on={p.categories.includes(c.key)} onPress={() => toggle('categories', c.key as CategoryKey)} />
              ))}
            </View>
            {withTypes
              .filter((c) => c.key === 'bigtruck')
              .map((c) => (
                <View key={c.key} style={{ marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: colors.yellow50, borderWidth: 1, borderColor: colors.yellow200, gap: 10 }}>
                  <T w="extrabold" size={16}>
                    Which {c.label.toLowerCase()} can you drive?
                  </T>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(c.types ?? []).map((ty) => (
                      <Chip key={ty} label={ty} selected={(p.types ?? []).includes(ty)} onPress={() => toggle('types', ty)} />
                    ))}
                  </View>
                </View>
              ))}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ gap: 14 }}>
            <T w="extrabold" size={24}>
              {t('setup.licTitle')}
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {licenceTypes.map((l) => (
                <Chip key={l} label={l} selected={p.licence.includes(l)} onPress={() => toggle('licence', l)} />
              ))}
            </View>
            <T w="extrabold" size={20} style={{ marginTop: 14 }}>
              {t('setup.expTitle')}
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[1, 2, 3, 5, 8, 10].map((y) => (
                <Chip key={y} label={t('setup.years', { n: y })} selected={p.experience === y} onPress={() => set({ experience: y })} />
              ))}
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={{ gap: 14 }}>
            <T w="extrabold" size={24}>
              {t('setup.prefTitle')}
            </T>
            <View style={{ gap: 10 }}>
              {(['monthly', 'trip', 'both'] as const).map((k) => {
                const on = p.payPref === k;
                return (
                  <Pressable
                    key={k}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => set({ payPref: k })}
                    style={{ height: 60, borderRadius: 16, borderWidth: on ? 2 : 1, borderColor: on ? colors.ink : colors.line, backgroundColor: on ? colors.yellow50 : colors.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: on ? 7 : 2, borderColor: on ? colors.ink : colors.lineStrong }} />
                    <T w={on ? 'extrabold' : 'semibold'} size={16}>
                      {k === 'monthly' ? t('setup.monthlyPay') : k === 'trip' ? t('setup.tripPay') : t('setup.both')}
                    </T>
                  </Pressable>
                );
              })}
            </View>
            <Field label={t('setup.expected')} value={p.expectedPay} onChangeText={(v) => set({ expectedPay: v.replace(/[^\d]/g, '').slice(0, 6) })} keyboardType="number-pad" prefix="₹" placeholder="25000" suffix={p.payPref === 'trip' ? t('common.perTrip') : t('common.perMonth')} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Chip label={t('setup.fullTime')} selected={p.fullTime} onPress={() => set({ fullTime: true })} />
              <Chip label={t('setup.partTime')} selected={!p.fullTime} onPress={() => set({ fullTime: false })} />
            </View>

            <T w="extrabold" size={20} style={{ marginTop: 10 }}>
              Where do you want to drive?
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip label={ANYWHERE} icon={<Globe size={14} color={colors.ink} />} selected={prefer.includes(ANYWHERE)} onPress={() => set({ preferredLocations: prefer.includes(ANYWHERE) ? [] : [ANYWHERE] })} />
              {p.city && !prefer.includes(p.city) && !prefer.includes(ANYWHERE) ? (
                <Chip label={p.city} icon={<MapPin size={14} color={colors.ink} />} selected={false} onPress={() => set({ preferredLocations: [...prefer, p.city] })} />
              ) : null}
              {prefer
                .filter((x) => x !== ANYWHERE)
                .map((x) => (
                  <Chip key={x} label={x} selected icon={<X size={14} color={colors.ink} />} onPress={() => set({ preferredLocations: prefer.filter((y) => y !== x) })} />
                ))}
              <Chip label="Add city" icon={<Plus size={14} color={colors.ink} />} selected={false} onPress={() => setPicker('prefer')} />
            </View>
          </View>
        ) : null}
      </ScrollView>
      <BottomBar>
        <Button title={step === TOTAL - 1 ? t('setup.toDocs') : t('common.next')} disabled={!canNext} loading={busy} iconRight={<ArrowRight size={18} color={canNext ? colors.ink : colors.muted} strokeWidth={2.6} />} onPress={next} />
      </BottomBar>
      <CityPicker visible={picker === 'city'} title={t('setup.cityTitle')} value={p.city ? [p.city] : []} onClose={() => setPicker(null)} onChange={([c]) => set({ city: c })} />
      <CityPicker
        visible={picker === 'prefer'}
        title="Where do you want to drive?"
        multiple
        extra={[ANYWHERE]}
        value={prefer}
        onClose={() => setPicker(null)}
        onChange={(v) => set({ preferredLocations: v })}
      />
    </KeyboardSafe>
  );
}

/* --------------------------------------------------------------------- KYC */

const DRIVER_DOCS = ['licenceFront', 'licenceBack', 'aadhaarFront', 'aadhaarBack'];
const OWNER_DOCS = ['aadhaarFront', 'aadhaarBack', 'panCard'];

function docTitle(k: string, t: (k: string) => string) {
  if (k === 'panCard') return 'PAN card or GST certificate';
  return t(`kyc.${k}`);
}

/**
 * One document per screen: the camera opens, the user checks the photo, it
 * uploads, next. Ends on a review, then submits for the admin team.
 * `route.params.only` limits the wizard to documents the admin asked to retake.
 */
export function KycScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const store = useStore();
  const owner = store.role === 'owner';
  const only: string[] | undefined = route.params?.only;
  const docs = only?.length ? only : owner ? OWNER_DOCS : DRIVER_DOCS;
  const [i, setI] = useState(0);
  const [shot, setShot] = useState<Picked | null>(null);
  const [taken, setTaken] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const reviewing = i >= docs.length;
  const key = docs[Math.min(i, docs.length - 1)];

  const take = async () => {
    const x = await takePhoto(false);
    if (x) setShot(x);
  };
  const gallery = async () => {
    const x = await choosePhoto();
    if (x) setShot(x);
  };
  const use = async () => {
    if (!shot) return;
    setBusy(true);
    try {
      await store.uploadDoc(key, shot);
      setTaken((m) => ({ ...m, [key]: shot.uri }));
      setShot(null);
      setI(i + 1);
    } catch (e: any) {
      Alert.alert(docTitle(key, t), e.message);
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    setBusy(true);
    try {
      await store.submitKyc();
      navigation.reset({ index: 0, routes: [{ name: 'KycStatus' }] });
    } catch (e: any) {
      Alert.alert(t('kyc.submit'), e.message);
      setBusy(false);
    }
  };

  if (reviewing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 18, gap: 12, backgroundColor: colors.white, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BackButton onPress={() => setI(docs.length - 1)} />
            <T w="extrabold" size={18}>
              {t('kyc.reviewTitle')}
            </T>
          </View>
          <Steps total={docs.length + 1} current={docs.length} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
          <T size={14} color={colors.ink2}>
            {t('kyc.reviewSub')}
          </T>
          {docs.map((d, idx) => (
            <Pressable
              key={d}
              onPress={() => setI(idx)}
              accessibilityRole="button"
              accessibilityLabel={docTitle(d, t)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.85 : 1 })}>
              <View style={{ width: 92, height: 58, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
                {taken[d] ? (
                  <Image source={{ uri: taken[d] }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View style={{ transform: [{ scale: 0.34 }] }}>
                    <DocMock kind={d} width={260} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <T w="bold" size={15}>
                  {docTitle(d, t)}
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {store.kyc.docs[d] || taken[d] ? <Check size={14} color={colors.green} strokeWidth={3} /> : <CircleAlert size={14} color={colors.redText} />}
                  <T w="semibold" size={12} color={store.kyc.docs[d] || taken[d] ? colors.greenText : colors.redText}>
                    {store.kyc.docs[d] || taken[d] ? t('kyc.captured') : 'Photo needed'}
                  </T>
                </View>
              </View>
              <T w="bold" size={13}>
                {t('common.retake')}
              </T>
            </Pressable>
          ))}
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginTop: 6 }}>
            <ShieldCheck size={20} color={colors.green} />
            <T size={13} color={colors.ink2} style={{ flex: 1 }} lh={19}>
              {t('role.note')}
            </T>
          </View>
        </ScrollView>
        <BottomBar>
          <Button title={t('kyc.submit')} onPress={submit} loading={busy} disabled={docs.some((d) => !store.kyc.docs[d] && !taken[d])} />
        </BottomBar>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BackButton onPress={() => (shot ? setShot(null) : i > 0 ? setI(i - 1) : navigation.canGoBack() ? navigation.goBack() : navigation.reset({ index: 0, routes: [{ name: owner ? 'OwnerSetup' : 'DriverSetup' }] }))} />
          <T w="bold" size={15} style={{ flex: 1 }}>
            {t('kyc.step', { n: i + 1, total: docs.length + 1 })}
          </T>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Help')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.greenSoft }}>
            <Phone size={15} color={colors.greenText} fill={colors.greenText} />
            <T w="bold" size={13} color={colors.greenText}>
              {t('common.help')}
            </T>
          </Pressable>
        </View>
        <Steps total={docs.length + 1} current={i} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.yellow100, alignItems: 'center', justifyContent: 'center' }}>
            <ScanLine size={28} color={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={21} lh={27}>
              {docTitle(key, t)}
            </T>
            <T size={14} color={colors.ink2}>
              {t('kyc.sub')}
            </T>
          </View>
        </View>
      </View>

      {/* Before: how to hold the card. After: the real photo to check. */}
      <View style={{ marginHorizontal: 18, marginTop: 16, height: 300, borderRadius: 20, overflow: 'hidden', backgroundColor: shot ? colors.bg : '#1C1C1C', alignItems: 'center', justifyContent: 'center' }}>
        {shot ? (
          <View style={{ alignItems: 'center', gap: 12, alignSelf: 'stretch', flex: 1, padding: 12 }}>
            <Image source={{ uri: shot.uri }} style={{ flex: 1, alignSelf: 'stretch', borderRadius: 12 }} resizeMode="contain" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Check size={16} color={colors.green} strokeWidth={3} />
              <T w="bold" size={14} color={colors.greenText}>
                {t('kyc.captured')}
              </T>
            </View>
          </View>
        ) : (
          <>
            <View style={{ transform: [{ rotate: '-2deg' }], ...shadow.raised }}>
              <DocMock kind={key} width={250} />
            </View>
            <View style={{ position: 'absolute', left: 30, right: 30, top: 54, bottom: 54, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.55)' }} />
            {[
              { left: 26, top: 50, borderLeftWidth: 5, borderTopWidth: 5, borderTopLeftRadius: 16 },
              { right: 26, top: 50, borderRightWidth: 5, borderTopWidth: 5, borderTopRightRadius: 16 },
              { left: 26, bottom: 50, borderLeftWidth: 5, borderBottomWidth: 5, borderBottomLeftRadius: 16 },
              { right: 26, bottom: 50, borderRightWidth: 5, borderBottomWidth: 5, borderBottomRightRadius: 16 },
            ].map((s, k) => (
              <View key={k} style={{ position: 'absolute', width: 30, height: 30, borderColor: '#34D399', ...s }} />
            ))}
            <View style={{ position: 'absolute', top: 14, flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: 'rgba(22,128,60,0.92)' }}>
              <Check size={13} color={colors.white} strokeWidth={3.2} />
              <T w="bold" size={12} color={colors.white}>
                {t('kyc.ok')}
              </T>
            </View>
            <T w="semibold" size={13} color="rgba(255,255,255,0.85)" style={{ position: 'absolute', bottom: 16 }}>
              {t('kyc.hold')}
            </T>
          </>
        )}
      </View>

      {shot ? (
        <View style={{ paddingHorizontal: 18, marginTop: 16 }}>
          <T size={14} color={colors.ink2} center>
            {t('kyc.check')}
          </T>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginTop: 14 }}>
          {[
            { Icon: ScanLine, text: t('kyc.tip1') },
            { Icon: Sun, text: t('kyc.tip2') },
            { Icon: Camera, text: t('kyc.tip3') },
          ].map(({ Icon, text }) => (
            <View key={text} style={{ flex: 1, padding: 10, borderRadius: 14, backgroundColor: colors.bg, alignItems: 'center', gap: 6 }}>
              <Icon size={24} color={colors.ink} />
              <T w="semibold" size={12} center lh={16}>
                {text}
              </T>
            </View>
          ))}
        </View>
      )}

      <View style={{ flex: 1 }} />
      {shot ? (
        <BottomBar style={{ gap: 10, flexDirection: 'row' }}>
          <Button title={t('common.retake')} variant="ghost" onPress={() => setShot(null)} style={{ flex: 1 }} disabled={busy} />
          <Button title={t('kyc.useThis')} onPress={use} loading={busy} style={{ flex: 1.4 }} />
        </BottomBar>
      ) : (
        <View style={{ paddingBottom: Math.max(insets.bottom, 12) + 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={gallery} accessibilityRole="button" accessibilityLabel={t('kyc.gallery')} style={{ width: 92, alignItems: 'center', gap: 4 }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Images size={24} color={colors.ink} />
            </View>
            <T w="bold" size={12} color={colors.ink2}>
              {t('kyc.gallery')}
            </T>
          </Pressable>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Pressable
              onPress={take}
              accessibilityRole="button"
              accessibilityLabel={t('kyc.capture')}
              style={({ pressed }) => ({ width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: colors.yellow100, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
              <Camera size={32} color={colors.yellow} />
            </Pressable>
            <T w="extrabold" size={14}>
              {t('kyc.capture')}
            </T>
          </View>
          <Pressable onPress={() => navigation.navigate('Help')} accessibilityRole="button" accessibilityLabel={t('common.help')} style={{ width: 92, alignItems: 'center', gap: 4 }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={22} color={colors.ink} />
            </View>
            <T w="bold" size={12} color={colors.ink2}>
              {t('common.help')}
            </T>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/* -------------------------------------------------------------- KYC status */

export function KycStatusScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const store = useStore();
  const { kyc, role } = store;
  const main = role === 'owner' ? 'OwnerMain' : 'DriverMain';
  const go = () => navigation.reset({ index: 0, routes: [{ name: main }] });
  const [checking, setChecking] = useState(false);
  const check = async () => {
    setChecking(true);
    await store.refresh().catch(() => {});
    setChecking(false);
  };
  // The admin's decision arrives live over the socket; check every 10 s only while it is down.
  useEffect(() => {
    if (kyc.status !== 'pending' || store.live) return;
    const iv = setInterval(() => store.refresh().catch(() => {}), 10000);
    return () => clearInterval(iv);
  }, [kyc.status, store.live]); // eslint-disable-line react-hooks/exhaustive-deps
  const retake = kyc.rejectedDocs.map((d) => d.key);

  if (kyc.status === 'approved') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.yellow50, paddingTop: insets.top }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 }}>
          <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', ...shadow.raised }}>
            <Check size={64} color={colors.white} strokeWidth={3} />
          </View>
          <T w="extrabold" size={26} center style={{ marginTop: 10 }}>
            {t('status.approvedTitle')}
          </T>
          <T size={16} color={colors.ink2} center lh={23}>
            {role === 'owner' ? 'Your business is verified. Drivers can now see your jobs.' : t('status.approvedText')}
          </T>
        </View>
        <BottomBar>
          <Button title={role === 'owner' ? 'Go to home' : t('status.start')} onPress={go} />
        </BottomBar>
      </View>
    );
  }

  const rejected = kyc.status === 'rejected';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 30, paddingHorizontal: 22, paddingBottom: 24, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 14 }}>
          {rejected ? (
            <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' }}>
              <CircleAlert size={52} color={colors.red} />
            </View>
          ) : (
            <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: colors.yellow100, alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={52} color={colors.ink} />
            </View>
          )}
          <T w="extrabold" size={24} center>
            {rejected ? t('status.rejectedTitle') : t('status.pendingTitle')}
          </T>
          <T size={15} color={colors.ink2} center lh={22}>
            {rejected ? kyc.reason : t('status.pendingText')}
          </T>
        </View>

        {!rejected ? (
          <View style={{ backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 4 }}>
            {[t('status.s1'), t('status.s2'), t('status.s3')].map((s, i) => (
              <View key={s} style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: i === 0 ? colors.green : i === 1 ? colors.yellow : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                    {i === 0 ? <Check size={15} color={colors.white} strokeWidth={3} /> : <T w="extrabold" size={13}>{i + 1}</T>}
                  </View>
                  {i < 2 ? <View style={{ width: 2, height: 22, backgroundColor: colors.line }} /> : null}
                </View>
                <T w={i === 1 ? 'extrabold' : 'semibold'} size={15} color={i === 2 ? colors.muted : colors.ink} style={{ marginTop: 4 }}>
                  {s}
                </T>
              </View>
            ))}
          </View>
        ) : null}

        {rejected && kyc.rejectedDocs.length ? (
          <View style={{ backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 8 }}>
            <T w="bold" size={14}>
              Take these photos again
            </T>
            {kyc.rejectedDocs.map((d) => (
              <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CircleAlert size={16} color={colors.redText} />
                <T w="semibold" size={14} style={{ flex: 1 }}>
                  {docTitle(d.key, t)}
                </T>
              </View>
            ))}
          </View>
        ) : null}
        {!rejected ? (
          <Pressable onPress={check} accessibilityRole="button" style={{ flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }}>
            {checking ? <ActivityIndicator size="small" color={colors.ink} /> : <RefreshCw size={16} color={colors.ink} />}
            <T w="bold" size={14}>
              Check status
            </T>
          </Pressable>
        ) : null}
        <View style={{ alignItems: 'center' }}>
          <Logo size={44} />
        </View>
      </ScrollView>
      <BottomBar>
        {rejected ? (
          <Button title={t('status.fix')} icon={<Camera size={18} color={colors.ink} />} onPress={() => navigation.navigate(role === 'owner' ? 'OwnerKyc' : 'Kyc', retake.length ? { only: retake } : undefined)} />
        ) : (
          <Button title={role === 'owner' ? 'Explore the app meanwhile' : t('status.browse')} variant="dark" onPress={go} />
        )}
      </BottomBar>
    </View>
  );
}
