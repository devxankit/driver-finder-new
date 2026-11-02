import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Modal, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { RazorpayResult, RazorpaySheet } from '../components/razorpay';
import Pressable from '../components/Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Bell, Camera, Check, CircleAlert, Clock, Crown, FileText, Headphones, Lock, Mail, MessageSquare, Phone, Send, ShieldCheck, X } from 'lucide-react-native';
import T from '../components/T';
import { AppBar, BottomBar, Button, Card, EmptyState, ListRow, RadioDot, Section, Toggle } from '../components/ui';
import { PersonPhoto } from '../components/brand';
import { callNumber, openWhatsApp } from '../components/sheets';
import { colors, font } from '../theme';
import { Plan, plans as allPlans, PRICE_LABEL, quickReplies, support } from '../data/catalog';
import { useStore } from '../store/AppStore';
import { useQuery } from '../hooks/useQuery';
import { api } from '../api/client';
import { ErrorBlock, LoadingBlock } from './driver';
import { clock, daysLeft, rupees, shortDate, timeAgo } from '../utils/format';

const priceText = (p: Plan) => (p.price > 0 ? rupees(p.price) : PRICE_LABEL);
const perText = (p: Plan) => (p.months === 1 ? 'per month' : `for ${p.months} months`);

/* ------------------------------------------------------------------ Plans */

export function PlansScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { role, loadMeta } = useStore();
  const driver = role !== 'owner';
  const plans = allPlans.filter((p) => p.role === (role ?? 'driver'));
  const [planId, setPlanId] = useState<string | null>(plans.find((p) => p.tag)?.id ?? plans[0]?.id ?? null);
  useEffect(() => {
    loadMeta().catch(() => {});
  }, [loadMeta]);
  useEffect(() => {
    if (!planId && plans[0]) setPlanId(plans.find((p) => p.tag)?.id ?? plans[0].id);
  }, [plans, planId]);
  const chosen = plans.find((p) => p.id === planId);
  const perks = chosen?.benefits.length ? chosen.benefits : driver ? [t('plans.d1'), t('plans.d2'), t('plans.d3'), t('plans.d4')] : [t('plans.o1'), t('plans.o2'), t('plans.o3'), t('plans.o4')];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar title={t('plans.title')} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 54, height: 54, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Crown size={26} color={colors.yellow} fill={colors.yellow} />
          </View>
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={22}>
              {driver ? t('plans.driverPlan') : t('plans.ownerPlan')}
            </T>
            <T size={13} color={colors.ink2}>
              {t('plans.sub')}
            </T>
          </View>
        </View>
        {plans.length === 0 ? <LoadingBlock /> : null}
        <View style={{ gap: 10 }}>
          {plans.map((p) => {
            const on = p.id === planId;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPlanId(p.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={{ minHeight: 78, padding: 14, borderRadius: 16, backgroundColor: on ? colors.yellow50 : colors.white, borderWidth: on ? 2 : 1, borderColor: on ? colors.ink : colors.line, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <RadioDot on={on} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <T w="extrabold" size={17}>
                      {p.name}
                    </T>
                    {p.tag ? (
                      <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.ink, justifyContent: 'center' }}>
                        <T w="bold" size={11} color={colors.yellow}>
                          {p.tag}
                        </T>
                      </View>
                    ) : null}
                  </View>
                  <T size={13} color={colors.ink2}>
                    {p.note}
                  </T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T w="extrabold" size={p.price ? 18 : 14}>
                    {priceText(p)}
                  </T>
                  <T size={12} color={colors.muted}>
                    {perText(p)}
                  </T>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Card style={{ padding: 16, gap: 11 }}>
          <T w="extrabold" size={15}>
            {t('plans.get')}
          </T>
          {perks.map((p) => (
            <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Check size={13} color={colors.green} strokeWidth={3.2} />
              </View>
              <T w="semibold" size={14} style={{ flex: 1 }}>
                {p}
              </T>
            </View>
          ))}
        </Card>
      </ScrollView>
      <BottomBar style={{ gap: 8 }}>
        <Button title={chosen ? `${t('plans.pay')} · ${chosen.name}` : t('plans.pay')} disabled={!chosen || !chosen.price} onPress={() => chosen && navigation.navigate('Checkout', { planId: chosen.id })} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Lock size={13} color={colors.muted} />
          <T size={12} color={colors.muted}>
            {t('plans.secure')}
          </T>
        </View>
      </BottomBar>
    </View>
  );
}

/* --------------------------------------------------------------- Checkout */

type Order = { order: { id: string; amount: number; currency: string; receipt: string }; keyId: string; plan: Plan; prefill: { contact: string; name: string } };

export function CheckoutScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const plan = allPlans.find((p) => p.id === route.params.planId);
  const [stage, setStage] = useState<'form' | 'starting' | 'paying' | 'verifying' | 'done'>('form');
  const [order, setOrder] = useState<Order | null>(null);
  const [until, setUntil] = useState<number | null>(null);
  const [error, setError] = useState('');
  const title = `${store.role === 'owner' ? t('plans.ownerPlan') : t('plans.driverPlan')} · ${plan?.name ?? ''}`;

  const start = async () => {
    if (!plan) return;
    setError('');
    setStage('starting');
    try {
      const o = await api<Order>('/payments/order', { method: 'POST', body: { planId: plan.id } });
      setOrder(o);
      setStage('paying');
    } catch (e: any) {
      setError(e.message);
      setStage('form');
    }
  };

  const onMessage = async (msg: RazorpayResult) => {
    if (msg.type === 'success') {
      setStage('verifying');
      try {
        const r = await api<{ plan: { expiresAt: number } }>('/payments/verify', { method: 'POST', body: { orderId: msg.orderId, paymentId: msg.paymentId, signature: msg.signature } });
        setUntil(r.plan?.expiresAt ?? null);
        await store.refresh().catch(() => {});
        setStage('done');
      } catch (err: any) {
        setError(err.message);
        setStage('form');
      }
    } else if (msg.type === 'failed') {
      // Razorpay shows its own "try another method" screen; keep it open and remember why.
      setError(msg.reason || 'Payment failed. Please try again.');
    } else {
      const reason = msg.type === 'error' ? msg.reason : '';
      if (order) api('/payments/failed', { method: 'POST', body: { orderId: order.order.id, reason: error || reason || msg.type } }).catch(() => {});
      setError(msg.type === 'dismiss' ? (error ? `${error} You were not charged.` : 'Payment was cancelled. You were not charged.') : reason || 'Payment failed. Please try again.');
      setStage('form');
    }
  };

  if (stage === 'done') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.yellow50 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 }}>
          <View style={{ width: 116, height: 116, borderRadius: 58, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={60} color={colors.white} strokeWidth={3} />
          </View>
          <T w="extrabold" size={26} center style={{ marginTop: 8 }}>
            {t('pay.success')}
          </T>
          <T size={16} color={colors.ink2} center lh={23}>
            {t('pay.successText', { date: shortDate(until ?? Date.now() + (plan?.months ?? 1) * 30 * 86400000) })}
          </T>
        </View>
        <BottomBar>
          <Button title={t('common.done')} onPress={() => navigation.pop(2)} />
        </BottomBar>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar title={t('pay.title')} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <Card style={{ padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <T w="extrabold" size={16} style={{ flex: 1 }}>
              {title}
            </T>
            <T w="extrabold" size={16}>
              {plan ? priceText(plan) : ''}
            </T>
          </View>
          <View style={{ height: 1, backgroundColor: colors.surface2 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={14} color={colors.ink2}>
              Valid for
            </T>
            <T size={14} color={colors.ink2}>
              {plan ? `${plan.months * 30} days` : ''}
            </T>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={14} color={colors.ink2}>
              GST
            </T>
            <T size={14} color={colors.ink2}>
              Included
            </T>
          </View>
        </Card>
        <Card style={{ padding: 16, gap: 10 }}>
          <T w="bold" size={15}>
            {t('pay.method')}
          </T>
          <T size={13} color={colors.ink2} lh={19}>
            UPI (Google Pay, PhonePe, Paytm), debit or credit card, and net banking. Payments are handled securely by Razorpay.
          </T>
        </Card>
        {error ? (
          <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.redSoft }}>
            <CircleAlert size={18} color={colors.redText} />
            <T w="semibold" size={13} color={colors.redText} style={{ flex: 1 }}>
              {error}
            </T>
          </View>
        ) : null}
      </ScrollView>
      <BottomBar>
        {stage === 'verifying' ? (
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <ActivityIndicator color={colors.ink} />
            <T w="bold" size={15}>
              {t('pay.processing')}
            </T>
          </View>
        ) : (
          <Button title={`${t('pay.payNow')}${plan?.price ? ` · ${rupees(plan.price)}` : ''}`} loading={stage === 'starting'} disabled={!plan?.price} onPress={start} />
        )}
      </BottomBar>

      <RazorpaySheet order={stage === 'paying' ? order : null} description={title} onResult={onMessage} onClose={() => setStage('form')} />
    </View>
  );
}

type SubResp = { plan: { name: string; startedAt: number; expiresAt: number } | null; payments: { id: string; name: string; amount: number; method: string; at: number }[] };

export function MyPlanScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { role } = useStore();
  const q = useQuery<SubResp>('/subscription');
  const plan = q.data?.plan;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar title={t('profile.plan')} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        {!q.data ? (
          q.error ? <ErrorBlock error={q.error} onRetry={q.reload} /> : <LoadingBlock />
        ) : (
          <>
            {plan ? (
              <View style={{ borderRadius: 20, backgroundColor: colors.ink, padding: 20, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Crown size={22} color={colors.yellow} fill={colors.yellow} />
                  <T w="extrabold" size={18} color={colors.white} style={{ flex: 1 }}>
                    {role === 'owner' ? t('plans.ownerPlan') : t('plans.driverPlan')} · {plan.name}
                  </T>
                </View>
                <T size={14} color={colors.yellow200}>
                  {t('plans.active', { date: shortDate(plan.expiresAt) })} · {daysLeft(plan.expiresAt)} days left
                </T>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: '#333', marginTop: 6 }}>
                  <View style={{ width: `${Math.min(100, Math.max(4, (daysLeft(plan.expiresAt) / Math.max(1, (plan.expiresAt - plan.startedAt) / 86400000)) * 100))}%`, height: 6, borderRadius: 3, backgroundColor: colors.yellow }} />
                </View>
              </View>
            ) : (
              <Card style={{ padding: 16 }}>
                <T size={14} color={colors.ink2}>
                  {t('profile.noPlan')}
                </T>
              </Card>
            )}
            <Button title={plan ? 'Extend my plan' : t('plans.pay')} variant={plan ? 'ghost' : 'primary'} onPress={() => navigation.navigate('Plans')} />
            <Section title="Payment history" style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.line }}>
              {q.data.payments.length ? (
                q.data.payments.map((p, i) => (
                  <ListRow
                    key={p.id}
                    title={`${p.name} plan`}
                    subtitle={`${shortDate(p.at)} · ${p.id}`}
                    right={
                      <T w="bold" size={13}>
                        {p.method === 'admin' ? 'Free' : rupees(p.amount)}
                      </T>
                    }
                    last={i === q.data!.payments.length - 1}
                  />
                ))
              ) : (
                <T size={14} color={colors.muted}>
                  No payments yet.
                </T>
              )}
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ---------------------------------------------------------- Notifications */

export function NotificationsScreen() {
  const { t } = useTranslation();
  const store = useStore();
  const { notices, markNoticesRead } = store;
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const tm = setTimeout(markNoticesRead, 1500);
    return () => clearTimeout(tm);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pull = async () => {
    setRefreshing(true);
    await store.refresh().catch(() => {});
    setRefreshing(false);
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar title={t('notif.title')} />
      {notices.length ? (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pull} colors={[colors.ink]} />}>
          {notices.map((n) => (
            <View key={n.id} style={{ flexDirection: 'row', gap: 12, padding: 16, backgroundColor: n.read ? colors.white : colors.yellow50, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: n.read ? 'transparent' : colors.yellowDark }} />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <T w="bold" size={14} style={{ flex: 1 }}>
                    {n.title}
                  </T>
                  <T size={11} color={colors.muted}>
                    {timeAgo(n.at)}
                  </T>
                </View>
                <T size={13} color={colors.ink2} lh={19}>
                  {n.text}
                </T>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <EmptyState icon={<Bell size={30} color={colors.ink} />} title={t('notif.empty')} text={t('notif.emptyText')} />
      )}
    </View>
  );
}

/* --------------------------------------------------------------- Settings */

export function SettingsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const store = useStore();
  const remove = () =>
    Alert.alert('Delete account?', 'Your profile, documents and chats will be removed. This cannot be undone.', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          store
            .deleteAccount()
            .then(() => navigation.reset({ index: 0, routes: [{ name: 'Language' }] }))
            .catch((e) => Alert.alert('Delete account', e.message)),
      },
    ]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar title={t('profile.notifications')} />
      <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
        <Section>
          <ListRow title={store.role === 'owner' ? 'New applicants' : 'New jobs for me'} subtitle="Notification" right={<Toggle label="Jobs" value={store.prefs.jobs} onChange={(v) => store.setPrefs({ jobs: v })} />} />
          <ListRow title="Chat messages" subtitle="Notification" right={<Toggle label="Chats" value={store.prefs.chats} onChange={(v) => store.setPrefs({ chats: v })} />} />
          <ListRow title="Updates on WhatsApp" subtitle="Job alerts and reminders" right={<Toggle label="WhatsApp" value={store.prefs.whatsapp} onChange={(v) => store.setPrefs({ whatsapp: v })} />} last />
        </Section>
        <Section style={{ marginTop: 8 }}>
          <ListRow title="Delete my account" danger onPress={remove} last />
        </Section>
      </ScrollView>
    </View>
  );
}

const FALLBACK_FAQ = [
  { q: 'How long does verification take?', a: 'Our team checks documents by hand, usually within 24 hours.' },
  { q: 'Do I pay anything to get a job?', a: 'No. Driver Finder only charges for the plan. Never pay an owner or agent to get a job.' },
  { q: 'How do I talk to an owner?', a: 'After the owner accepts, you can call, WhatsApp or chat from the app.' },
];

export function HelpScreen() {
  const q = useQuery<{ value: { q: string; a: string }[] }>('/cms/faq');
  const faqs = Array.isArray(q.data?.value) && q.data!.value.length ? q.data!.value : FALLBACK_FAQ;
  const phone = (support.phone || '').replace(/\D/g, '').slice(-10);
  const wa = (support.whatsapp || support.phone || '').replace(/\D/g, '').slice(-10);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar title="Help and support" />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        {phone || wa ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {phone ? <Button title="Call support" icon={<Phone size={18} color={colors.ink} fill={colors.ink} />} onPress={() => callNumber(phone)} style={{ flex: 1 }} /> : null}
            {wa ? <Button title="WhatsApp" variant="whatsapp" icon={<MessageSquare size={18} color={colors.white} />} onPress={() => openWhatsApp(wa)} style={{ flex: 1 }} /> : null}
          </View>
        ) : null}
        <Card style={{ padding: 16, gap: 14 }}>
          {faqs.map(({ q: question, a }) => (
            <View key={question} style={{ gap: 4 }}>
              <T w="bold" size={15}>
                {question}
              </T>
              <T size={14} color={colors.ink2} lh={20}>
                {a}
              </T>
            </View>
          ))}
        </Card>
        <Card style={{ padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Headphones size={22} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <T size={14} color={colors.ink2}>
              Support hours: {support.hours || '9 AM to 7 PM'}
            </T>
            {support.email ? (
              <T w="semibold" size={13} color={colors.ink}>
                {support.email}
              </T>
            ) : null}
          </View>
          <Mail size={20} color={colors.muted} />
        </Card>
      </ScrollView>
    </View>
  );
}

function LegalText({ k, title }: { k: string; title: string }) {
  const q = useQuery<{ value: string }>(`/cms/${k}`);
  return (
    <Card style={{ padding: 16, gap: 6 }}>
      <T w="extrabold" size={16}>
        {title}
      </T>
      {q.data ? (
        <T size={14} color={colors.ink2} lh={21}>
          {String(q.data.value || '').replace(/^# /gm, '')}
        </T>
      ) : (
        <ActivityIndicator color={colors.ink} />
      )}
    </Card>
  );
}

export function LegalScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar title="Terms and privacy" />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <LegalText k="terms" title="Terms of use" />
        <LegalText k="privacy" title="Privacy policy" />
        <LegalText k="refund" title="Refund policy" />
      </ScrollView>
    </View>
  );
}

export function DocumentsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { kyc, role } = useStore();
  const docs = role === 'owner' ? ['aadhaarFront', 'aadhaarBack', 'panCard'] : ['licenceFront', 'licenceBack', 'aadhaarFront', 'aadhaarBack'];
  const rejected = new Set(kyc.rejectedDocs.map((d) => d.key));
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar title={t('profile.documents')} />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }}>
        {docs.map((d) => {
          const has = kyc.docs[d];
          const bad = rejected.has(d);
          const verified = kyc.status === 'approved' && has;
          return (
            <Card key={d} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: bad ? colors.redSoft : verified ? colors.greenSoft : colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                {bad ? <CircleAlert size={22} color={colors.redText} /> : verified ? <Check size={22} color={colors.green} strokeWidth={3} /> : has ? <Clock size={22} color={colors.ink} /> : <Camera size={22} color={colors.muted} />}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <T w="bold" size={15}>
                  {d === 'panCard' ? 'PAN card or GST' : t(`kyc.${d}`)}
                </T>
                <T w="semibold" size={12} color={bad ? colors.redText : verified ? colors.greenText : colors.muted}>
                  {bad ? 'Retake needed' : verified ? t('common.verified') : has ? t('status.s2') : 'Not added yet'}
                </T>
              </View>
              <FileText size={16} color={colors.muted} />
            </Card>
          );
        })}
        {kyc.status !== 'approved' ? <Button title={t('status.pendingTitle')} variant="ghost" onPress={() => navigation.navigate('KycStatus')} /> : null}
      </ScrollView>
    </View>
  );
}
