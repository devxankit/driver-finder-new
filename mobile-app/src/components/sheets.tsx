import React from 'react';
import { Alert, Linking, View } from 'react-native';
import Pressable from './Pressable';
import { useTranslation } from 'react-i18next';
import { Check, Clock, Crown, MessageSquare, Phone } from 'lucide-react-native';
import T from './T';
import { Button, Sheet } from './ui';
import { colors } from '../theme';
import { plans, PRICE_LABEL } from '../data/catalog';
import { rupees } from '../utils/format';
import { Role } from '../store/AppStore';

export function callNumber(phone: string) {
  Linking.openURL(`tel:+91${phone}`).catch(() => Alert.alert('Cannot place a call on this device.'));
}

export function openWhatsApp(phone: string) {
  Linking.openURL(`https://wa.me/91${phone}`).catch(() => Alert.alert('WhatsApp is not available.'));
}

/** Lowest monthly price for the role, from the admin's plans. */
function cheapest(role: Role) {
  const priced = plans.filter((p) => p.role === role && p.price > 0);
  if (!priced.length) return PRICE_LABEL;
  const best = Math.min(...priced.map((p) => Math.round(p.price / p.months)));
  return `${rupees(best)} /month`;
}

/** Paywall: shown when a free user tries to apply, connect or open contact details. */
export function PaywallSheet({ visible, onClose, onPlans, role }: { visible: boolean; onClose: () => void; onPlans: () => void; role: Role }) {
  const { t } = useTranslation();
  const driver = role === 'driver';
  // Benefits come from the admin's plans; the translated defaults cover a fresh install.
  const fromPlans = plans.find((p) => p.role === role && p.benefits.length)?.benefits.slice(0, 3);
  const perks = fromPlans ?? (driver ? [t('job.b1'), t('job.b2'), t('job.b3')] : ['Post jobs for all your vehicles', 'Send hiring requests to drivers', 'Call, WhatsApp and chat with drivers']);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 54, height: 54, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Crown size={26} color={colors.yellow} fill={colors.yellow} />
          </View>
          <View style={{ flex: 1 }}>
            <T w="extrabold" size={20} lh={25}>
              {driver ? t('job.payTitle') : 'Get the Owner plan to connect'}
            </T>
            <T size={13} color={colors.ink2}>
              {driver ? t('job.paySub') : 'One plan, all verified drivers'}
            </T>
          </View>
        </View>
        <View style={{ gap: 11 }}>
          {perks.map((p) => (
            <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Check size={14} color={colors.green} strokeWidth={3.2} />
              </View>
              <T w="semibold" size={15}>
                {p}
              </T>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, backgroundColor: colors.yellow50 }}>
          <T w="semibold" size={13} color={colors.yellowText}>
            {t('job.startsAt')}
          </T>
          <T w="extrabold" size={16} color={colors.ink}>
            {cheapest(role)}
          </T>
        </View>
        <Button title={t('job.seePlans')} onPress={onPlans} />
        <Pressable onPress={onClose} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <T w="bold" size={15} color={colors.ink2}>
            {t('job.notNow')}
          </T>
        </Pressable>
      </View>
    </Sheet>
  );
}

export function KycSheet({ visible, onClose, onStatus }: { visible: boolean; onClose: () => void; onStatus: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ gap: 14, alignItems: 'center' }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.yellow100, alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={34} color={colors.ink} />
        </View>
        <T w="extrabold" size={20} center>
          {t('job.kycTitle')}
        </T>
        <T size={15} color={colors.ink2} center lh={21}>
          {t('job.kycText')}
        </T>
        <Button title={t('status.pendingTitle')} variant="dark" onPress={onStatus} style={{ alignSelf: 'stretch' }} />
        <Pressable onPress={onClose} style={{ height: 44, justifyContent: 'center' }}>
          <T w="bold" size={15} color={colors.ink2}>
            {t('common.ok')}
          </T>
        </Pressable>
      </View>
    </Sheet>
  );
}

/** Call · WhatsApp · Chat, shown only after a connection. */
export function ContactRow({ phone, onChat }: { phone: string; onChat: () => void }) {
  const { t } = useTranslation();
  const items = [
    { key: 'call', label: t('common.call'), bg: colors.yellow, fg: colors.ink, Icon: Phone, onPress: () => callNumber(phone), border: false },
    { key: 'wa', label: t('common.whatsapp'), bg: colors.whatsapp, fg: colors.white, Icon: MessageSquare, onPress: () => openWhatsApp(phone), border: false },
    { key: 'chat', label: t('common.chat'), bg: colors.white, fg: colors.ink, Icon: MessageSquare, onPress: onChat, border: true },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map(({ key, label, bg, fg, Icon, onPress, border }) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          style={({ pressed }) => ({
            flex: 1,
            height: 50,
            borderRadius: 12,
            backgroundColor: bg,
            borderWidth: border ? 1.5 : 0,
            borderColor: colors.ink,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            opacity: pressed ? 0.85 : 1,
          })}>
          <Icon size={17} color={fg} fill={key === 'call' ? fg : 'transparent'} />
          <T w="bold" size={14} color={fg}>
            {label}
          </T>
        </Pressable>
      ))}
    </View>
  );
}
