import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StatusBar, TextInput, View } from 'react-native';
import Pressable from '../components/Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, ChevronDown, ChevronUp, Crown, IndianRupee, Lock, ShieldCheck } from 'lucide-react-native';
import T from '../components/T';
import { BackButton, BottomBar, Button, DemoNote, Field, KeyboardSafe, useFocusAfterTransition } from '../components/ui';
import { KeyIcon, Logo, SteeringIcon, Wordmark } from '../components/brand';
import { colors, font, shadow } from '../theme';
import { fees, languages, plans, PRICE_LABEL } from '../data/catalog';
import { RazorpayOrder, RazorpayResult, RazorpaySheet } from '../components/razorpay';
import { api } from '../api/client';
import { rupees } from '../utils/format';
import { Role, useStore } from '../store/AppStore';
import { getApiUrl, ping, setApiUrl } from '../api/client';
import { phoneFmt } from '../utils/format';
import { nextRoute, routeForMe } from '../navigation/routes';

export { nextRoute };

/* ------------------------------------------------------------------ Splash */

export function SplashScreen({ navigation }: any) {
  const store = useStore();
  const storeRef = useRef(store);
  storeRef.current = store;
  useEffect(() => {
    if (!store.ready) return;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      navigation.reset({ index: 0, routes: [{ name: nextRoute(storeRef.current) }] });
    };
    // Signed-in users: a quick server check first (KYC may have been approved), but never wait more than 1.5s.
    const min = new Promise<void>((r) => setTimeout(r, 600));
    Promise.race([Promise.all([store.me ? store.refresh().catch(() => {}) : null, min]), new Promise<void>((r) => setTimeout(r, 1500))]).then(() => setTimeout(go, 0));
  }, [store.ready]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ flex: 1, backgroundColor: colors.yellow50, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
      <StatusBar barStyle="dark-content" />
      <Logo size={168} style={shadow.raised} />
      <Wordmark size={30} />
      <T w="semibold" size={14} color={colors.ink2}>
        Drivers and vehicle owners, connected
      </T>
    </View>
  );
}

/* ---------------------------------------------------------------- Language */

export function LanguageScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { lang, setLang } = useStore();
  const fromSettings = route.params?.fromSettings;
  const [picked, setPicked] = useState(lang ?? 'hi');
  // First launch: show Hindi straight away (the default), so the screen matches the selection.
  useEffect(() => {
    if (!lang) setLang('hi');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (id: string) => {
    setPicked(id);
    // Switching language re-renders every screen; let the tap highlight paint first.
    setTimeout(() => setLang(id), 50);
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48 }}>
          {fromSettings ? <BackButton light onPress={() => navigation.goBack()} /> : <Logo size={40} />}
          {fromSettings ? null : <Wordmark size={17} />}
        </View>
        <T w="extrabold" size={26} style={{ marginTop: 18 }}>
          {t('lang.title')}
        </T>
        <T w="semibold" size={15} color={colors.ink2} style={{ marginTop: 4 }}>
          अपनी भाषा चुनें · Choose your language
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
          {languages.map((l) => {
            const on = picked === l.id;
            return (
              <Pressable
                key={l.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={l.en}
                onPress={() => pick(l.id)}
                android_ripple={{ color: 'rgba(17,17,17,0.10)' }}
                style={({ pressed }) => ({
                  width: '48%',
                  height: 76,
                  borderRadius: 16,
                  backgroundColor: on ? colors.yellow50 : colors.white,
                  borderWidth: on ? 2 : 1,
                  borderColor: on ? colors.ink : colors.line,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  gap: 12,
                  opacity: pressed ? 0.85 : 1,
                })}>
                <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: l.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <T w="bold" size={22} color={l.fg}>
                    {l.letter}
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T w="bold" size={17}>
                    {l.native}
                  </T>
                  <T size={12} color={colors.muted}>
                    {l.en}
                  </T>
                </View>
                {on ? (
                  <View style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={12} color={colors.yellow} strokeWidth={3.4} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <T size={13} color={colors.muted} center style={{ marginTop: 16 }} lh={19}>
          {t('lang.more')}
        </T>
      </ScrollView>
      <BottomBar>
        <Button
          title={fromSettings ? t('common.done') : t('common.continue')}
          iconRight={<ArrowRight size={18} color={colors.ink} strokeWidth={2.6} />}
          onPress={() => (fromSettings ? navigation.goBack() : navigation.navigate('Phone'))}
        />
      </BottomBar>
    </View>
  );
}

/* ------------------------------------------------------------------- Phone */

export function PhoneScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { requestOtp, loadMeta } = useStore();
  const [phone, setPhone] = useState('');
  useEffect(() => {
    loadMeta().catch(() => {});
  }, [loadMeta]);
  const [busy, setBusy] = useState(false);
  const [server, setServer] = useState(false);
  const valid = /^[6-9]\d{9}$/.test(phone);
  const send = async () => {
    setBusy(true);
    try {
      const r = await requestOtp(phone);
      navigation.navigate('Otp', { phone, devOtp: r.devOtp, resendIn: r.resendIn });
    } catch (e: any) {
      Alert.alert(t('phone.title'), e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardSafe style={{ backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 18, flex: 1 }}>
        <BackButton light onPress={() => navigation.goBack()} />
        <Pressable onLongPress={() => setServer(true)} delayLongPress={1200} accessibilityLabel="Driver Finder" style={{ alignItems: 'center', marginTop: 4, alignSelf: 'center' }}>
          <Logo size={76} style={shadow.card} />
        </Pressable>
        <T w="extrabold" size={25} style={{ marginTop: 14 }}>
          {t('phone.title')}
        </T>
        <T size={15} color={colors.ink2} style={{ marginTop: 4, marginBottom: 16 }}>
          {t('phone.sub')}
        </T>
        <Field label={t('phone.label')} value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" prefix="+91" placeholder="98765 43210" autoFocus />
        <T size={12} color={colors.muted} style={{ marginTop: 14 }} lh={18}>
          {t('phone.terms')}
        </T>
        <ChargesSummary />
      </View>
      <BottomBar>
        <Button title={t('phone.getOtp')} disabled={!valid} loading={busy} onPress={send} />
      </BottomBar>
      <ServerSheet visible={server} onClose={() => setServer(false)} />
    </KeyboardSafe>
  );
}

/* --------------------------------------------------------------------- OTP */

export function OtpScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const store = useStore();
  const phone: string = route.params?.phone ?? '';
  const [devOtp, setDevOtp] = useState<string | undefined>(route.params?.devOtp);
  // OTP_ENABLED=false on the server: no SMS is sent, the code arrives with the response and is filled in.
  const [code, setCode] = useState<string>(route.params?.devOtp ?? '');
  const [left, setLeft] = useState<number>(route.params?.resendIn ?? 30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  useFocusAfterTransition(input);

  useEffect(() => {
    const iv = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(iv);
  }, []);

  const verify = async (c = code) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const me = await store.verifyOtp(phone, c);
      navigation.reset({ index: 0, routes: [{ name: routeForMe(me, store.lang) }] });
    } catch (e: any) {
      setError(e.message);
      setCode('');
      setBusy(false);
    }
  };
  const resend = async () => {
    try {
      const r = await store.requestOtp(phone);
      setLeft(r.resendIn ?? 30);
      setDevOtp(r.devOtp);
      setCode(r.devOtp ?? '');
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <KeyboardSafe style={{ backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 18, flex: 1 }}>
        <BackButton light onPress={() => navigation.goBack()} />
        <T w="extrabold" size={26} style={{ marginTop: 22 }}>
          {t('otp.title')}
        </T>
        <T size={15} color={colors.ink2} style={{ marginTop: 4 }}>
          {t('otp.sub', { phone: phoneFmt(phone) })}
        </T>
        <Pressable onPress={() => input.current?.focus()} accessibilityLabel="Enter code" style={{ flexDirection: 'row', gap: 8, marginTop: 26 }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const active = i === code.length;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 60,
                  borderRadius: 14,
                  backgroundColor: colors.white,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? colors.ink : code[i] ? colors.lineStrong : colors.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <T w="extrabold" size={24}>
                  {code[i] ?? ''}
                </T>
              </View>
            );
          })}
        </Pressable>
        <TextInput
          ref={input}
          value={code}
          onChangeText={(v) => {
            const c = v.replace(/\D/g, '').slice(0, 6);
            setCode(c);
            setError('');
            if (c.length === 6) verify(c);
          }}
          keyboardType="number-pad"
          maxLength={6}
          style={{ position: 'absolute', opacity: 0, height: 1, width: 1, fontFamily: font.regular }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <T w="bold" size={14}>
              {t('otp.change')}
            </T>
          </Pressable>
          <Pressable disabled={left > 0} onPress={resend} hitSlop={8}>
            <T w="bold" size={14} color={left > 0 ? colors.muted : colors.ink}>
              {left > 0 ? t('otp.resendIn', { s: left }) : t('otp.resend')}
            </T>
          </Pressable>
        </View>
        {error ? (
          <T w="semibold" size={14} color={colors.redText} style={{ marginTop: 16 }}>
            {error}
          </T>
        ) : null}
        {devOtp ? (
          <View style={{ marginTop: 24 }}>
            <DemoNote text={`Test mode: SMS is off, so the code was filled in for you (${devOtp}).`} />
          </View>
        ) : null}
      </View>
      <BottomBar>
        <Button title={t('otp.verify')} disabled={code.length !== 6} loading={busy} onPress={() => verify()} />
      </BottomBar>
    </KeyboardSafe>
  );
}

/* -------------------------------------------------------------------- Role */

function RoleCard({ on, onPress, icon, title, bullets }: { on: boolean; onPress: () => void; icon: React.ReactNode; title: string; bullets: string[] }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={title}
      onPress={onPress}
      android_ripple={{ color: 'rgba(17,17,17,0.10)' }}
      style={({ pressed }) => ({
        padding: 18,
        borderRadius: 20,
        backgroundColor: on ? colors.yellow50 : colors.white,
        borderWidth: on ? 2 : 1,
        borderColor: on ? colors.ink : colors.line,
        gap: 14,
        opacity: pressed ? 0.92 : 1,
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: on ? colors.yellow : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
        <T w="extrabold" size={21} style={{ flex: 1 }}>
          {title}
        </T>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: on ? 0 : 2,
            borderColor: colors.lineStrong,
            backgroundColor: on ? colors.ink : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {on ? <Check size={14} color={colors.yellow} strokeWidth={3.6} /> : null}
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: colors.neutralSoft }} />
      <View style={{ gap: 9 }}>
        {bullets.map((b) => (
          <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Check size={18} color={colors.green} strokeWidth={2.8} />
            <T w="semibold" size={14} color={colors.neutralText}>
              {b}
            </T>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export function RoleScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { phone, chooseRole, logout } = useStore();
  const changeNumber = () => {
    logout();
    navigation.reset({ index: 0, routes: [{ name: 'Phone' }] });
  };
  const [role, setRole] = useState<Role>('driver');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const me = await chooseRole(role);
      navigation.reset({ index: 0, routes: [{ name: routeForMe(me, 'hi') }] });
    } catch (e: any) {
      Alert.alert(t('role.title'), e.message);
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={changeNumber} hitSlop={8} accessibilityRole="button" style={{ height: 32, justifyContent: 'center' }}>
            <T w="bold" size={13} color={colors.ink2}>
              Change number
            </T>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.greenSoft }}>
            <Check size={14} color={colors.greenText} strokeWidth={3} />
            <T w="bold" size={12} color={colors.greenText}>
              +91 {phoneFmt(phone)}
            </T>
          </View>
        </View>
        <T w="extrabold" size={28} style={{ marginTop: 16 }}>
          {t('role.title')}
        </T>
        <T w="semibold" size={16} color={colors.ink2} style={{ marginTop: 4 }}>
          {t('role.sub')}
        </T>
        <View style={{ gap: 14, marginTop: 22 }}>
          <RoleCard
            on={role === 'driver'}
            onPress={() => setRole('driver')}
            icon={<SteeringIcon size={34} />}
            title={t('role.driver')}
            bullets={[t('role.driverB1'), t('role.driverB2'), t('role.driverB3')]}
          />
          <RoleCard
            on={role === 'owner'}
            onPress={() => setRole('owner')}
            icon={<KeyIcon size={34} />}
            title={t('role.owner')}
            bullets={[t('role.ownerB1'), t('role.ownerB2'), t('role.ownerB3')]}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, paddingHorizontal: 4 }}>
          <ShieldCheck size={18} color={colors.ink2} />
          <T size={13} color={colors.ink2} style={{ flex: 1 }} lh={19}>
            {t('role.note')}
          </T>
        </View>
      </ScrollView>
      <BottomBar>
        <Button title={role === 'driver' ? t('role.asDriver') : t('role.asOwner')} loading={busy} iconRight={<ArrowRight size={18} color={colors.ink} strokeWidth={2.6} />} onPress={go} />
      </BottomBar>
    </View>
  );
}

/* ------------------------------------------------------- Server address */

/**
 * Hidden setting (long-press the logo on the phone screen): during development
 * the backend runs on a PC whose Wi-Fi IP can change.
 */
function ServerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [url, setUrl] = useState(getApiUrl());
  const [state, setState] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle');
  useEffect(() => {
    if (visible) {
      setUrl(getApiUrl());
      setState('idle');
    }
  }, [visible]);
  const save = async () => {
    setState('checking');
    const ok = await ping(url);
    setState(ok ? 'ok' : 'fail');
    if (ok) {
      await setApiUrl(url);
      setTimeout(onClose, 600);
    }
  };
  // Never mount a hidden <Modal>: on Android (Fabric) an unopened Modal left the
  // screen's native views out of sync, so later steps drew stale content.
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.white, borderRadius: 20, padding: 20, gap: 14 }}>
          <T w="extrabold" size={18}>
            Server address
          </T>
          <T size={13} color={colors.ink2}>
            For testing. The phone and the server must be on the same Wi-Fi.
          </T>
          <TextInput
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{ height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: 12, fontFamily: font.medium, fontSize: 15, color: colors.ink }}
          />
          {state === 'checking' ? <ActivityIndicator color={colors.ink} /> : null}
          {state === 'ok' ? (
            <T w="bold" color={colors.greenText}>
              Connected
            </T>
          ) : null}
          {state === 'fail' ? (
            <T w="bold" color={colors.redText}>
              Cannot reach this address
            </T>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Cancel" variant="ghost" size="md" onPress={onClose} style={{ flex: 1 }} />
            <Button title="Save" size="md" onPress={save} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ----------------------------------------------------- Charges summary */

const fromPrice = (role: 'driver' | 'owner') => {
  const priced = plans.filter((p) => p.role === role && p.price > 0);
  if (!priced.length) return PRICE_LABEL;
  return `from ${rupees(Math.min(...priced.map((p) => Math.round(p.price / p.months))))}/month`;
};

/** What Driver Finder costs, shown before the user signs in. */
export function ChargesSummary({ open: startOpen = false }: { open?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const rows = [
    { label: 'Registration (one time)', value: rupees(fees.registration) },
    { label: 'Browse jobs and drivers', value: 'Free' },
    { label: 'Driver plan', value: fromPrice('driver') },
    { label: 'Owner plan', value: fromPrice('owner') },
  ];
  return (
    <View style={{ marginTop: 16, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.yellow100, alignItems: 'center', justifyContent: 'center' }}>
          <IndianRupee size={17} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <T w="bold" size={14}>
            Charges
          </T>
          <T size={12} color={colors.ink2}>
            {rupees(fees.registration)} to register · browsing is free
          </T>
        </View>
        {open ? <ChevronUp size={18} color={colors.ink} /> : <ChevronDown size={18} color={colors.ink} />}
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.surface2 }}>
          {rows.map((r) => (
            <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
              <T size={13} color={colors.ink2}>
                {r.label}
              </T>
              <T w="bold" size={13}>
                {r.value}
              </T>
            </View>
          ))}
          <T size={12} color={colors.muted} style={{ marginTop: 8 }} lh={17}>
            A plan unlocks applying, hiring, chat and phone numbers. No commission on salary.
          </T>
        </View>
      ) : null}
    </View>
  );
}

/* ---------------------------------------------------------- Registration */

/** One-time registration fee (₹1 by default), paid right after choosing Driver or Owner. */
export function RegisterScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const store = useStore();
  const [order, setOrder] = useState<RazorpayOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const next = (me = store.me) => me && navigation.reset({ index: 0, routes: [{ name: routeForMe(me, store.lang) }] });

  const pay = async () => {
    setBusy(true);
    setError('');
    try {
      const o = await api<RazorpayOrder & { alreadyPaid?: boolean }>('/payments/registration', { method: 'POST' });
      if (o.alreadyPaid) {
        await store.refresh();
        return next({ ...store.me!, registration: { paid: true, paidAt: null } });
      }
      setOrder(o);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onResult = async (r: RazorpayResult) => {
    if (r.type === 'success') {
      setOrder(null);
      setBusy(true);
      try {
        await api('/payments/verify', { method: 'POST', body: { orderId: r.orderId, paymentId: r.paymentId, signature: r.signature } });
        await store.refresh();
        next({ ...store.me!, registration: { paid: true, paidAt: null } });
      } catch (e: any) {
        setError(e.message);
        setBusy(false);
      }
    } else if (r.type === 'failed') {
      setError(r.reason);
    } else if (r.type === 'dismiss') {
      setError((e) => e || 'Payment was cancelled. You were not charged.');
    } else {
      setError(r.reason);
      setOrder(null);
    }
  };

  const isDriver = store.role !== 'owner';
  const perks = isDriver
    ? ['Create your driver profile', 'Get verified by our team', 'Browse every job for free']
    : ['Create your business profile', 'Get verified by our team', 'Browse verified drivers for free'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 24 }}>
        <BackButton light onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Role' }] })} />
        <View style={{ alignItems: 'center', marginTop: 8, gap: 10 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' }}>
            <T w="extrabold" size={30}>
              {rupees(fees.registration)}
            </T>
          </View>
          <T w="extrabold" size={24} center>
            One-time registration
          </T>
          <T size={15} color={colors.ink2} center lh={22}>
            Pay {rupees(fees.registration)} once to register as a {isDriver ? 'driver' : 'vehicle owner'}. It keeps fake accounts away.
          </T>
        </View>
        <View style={{ marginTop: 20, padding: 16, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, gap: 12 }}>
          {perks.map((p) => (
            <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Check size={13} color={colors.green} strokeWidth={3.2} />
              </View>
              <T w="semibold" size={15} style={{ flex: 1 }}>
                {p}
              </T>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.yellow100, alignItems: 'center', justifyContent: 'center' }}>
              <Crown size={13} color={colors.ink} />
            </View>
            <T size={14} color={colors.ink2} style={{ flex: 1 }}>
              Applying, hiring and chat need a plan later ({fromPrice(isDriver ? 'driver' : 'owner')}).
            </T>
          </View>
        </View>
        <ChargesSummary />
        {error ? (
          <T w="semibold" size={14} color={colors.redText} center style={{ marginTop: 16 }}>
            {error}
          </T>
        ) : null}
      </ScrollView>
      <BottomBar style={{ gap: 8 }}>
        <Button title={`Pay ${rupees(fees.registration)} and continue`} loading={busy} onPress={pay} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Lock size={13} color={colors.muted} />
          <T size={12} color={colors.muted}>
            Secure payment by Razorpay · UPI, cards, net banking
          </T>
        </View>
      </BottomBar>
      <RazorpaySheet order={order} description="One-time registration" onResult={onResult} onClose={() => setOrder(null)} />
    </View>
  );
}
