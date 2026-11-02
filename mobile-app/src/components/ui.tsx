import React from 'react';
import { ActivityIndicator, Image, ImageSourcePropType, KeyboardAvoidingView, KeyboardTypeOptions, Modal, ScrollView, StyleProp, TextInput, View, ViewStyle } from 'react-native';
import Pressable from './Pressable';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BadgeCheck, Check, ChevronRight } from 'lucide-react-native';
import T from './T';
import { category, CategoryKey, colors, font, neutralCategory, radius, shadow } from '../theme';

/* ------------------------------------------------------------------ Button */

type ButtonVariant = 'primary' | 'dark' | 'outline' | 'ghost' | 'danger' | 'whatsapp';

const BTN: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.yellow, fg: colors.ink },
  dark: { bg: colors.ink, fg: colors.white },
  outline: { bg: colors.white, fg: colors.ink, border: colors.ink },
  ghost: { bg: colors.white, fg: colors.ink, border: colors.line },
  danger: { bg: colors.white, fg: colors.redText, border: '#E7B3B6' },
  whatsapp: { bg: colors.whatsapp, fg: colors.white },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = BTN[variant];
  const h = size === 'lg' ? 56 : size === 'md' ? 48 : 38;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      android_ripple={{ color: 'rgba(17,17,17,0.10)' }}
      style={({ pressed }) => [
        {
          height: h,
          borderRadius: size === 'sm' ? radius.sm + 2 : 14,
          backgroundColor: disabled ? colors.line : v.bg,
          borderWidth: v.border && !disabled ? 1.5 : 0,
          borderColor: v.border,
          paddingHorizontal: size === 'sm' ? 12 : 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon}
          <T w={variant === 'primary' ? 'extrabold' : 'bold'} size={size === 'lg' ? 17 : size === 'md' ? 15 : 13} color={disabled ? colors.muted : v.fg}>
            {title}
          </T>
          {iconRight}
        </>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ AppBar */

export function AppBar({
  title,
  subtitle,
  right,
  onBack,
  border = true,
  back = true,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  border?: boolean;
  back?: boolean;
}) {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.white, borderBottomWidth: border ? 1 : 0, borderBottomColor: colors.line }}>
      <View style={{ height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 6 }}>
        {back ? <BackButton onPress={onBack ?? (() => nav.goBack())} /> : <View style={{ width: 8 }} />}
        <View style={{ flex: 1, paddingRight: 8 }}>
          {title ? (
            <T w="extrabold" size={17} numberOfLines={1}>
              {title}
            </T>
          ) : null}
          {subtitle ? (
            <T size={12} color={colors.muted} numberOfLines={1}>
              {subtitle}
            </T>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function BackButton({ onPress, light }: { onPress: () => void; light?: boolean }) {
  return (
    <IconButton label="Back" onPress={onPress} style={{ backgroundColor: light ? colors.white : colors.bg, borderWidth: light ? 1 : 0, borderColor: colors.line }}>
      <ArrowLeft size={21} color={colors.ink} />
    </IconButton>
  );
}

export function IconButton({
  children,
  onPress,
  label,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      android_ripple={{ color: 'rgba(17,17,17,0.12)', borderless: true, radius: 24 }}
      style={({ pressed }) => [
        { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, opacity: pressed ? 0.6 : 1 },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

/* --------------------------------------------------------- Layout helpers */

export function Section({
  title,
  action,
  onAction,
  children,
  style,
}: {
  title?: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ backgroundColor: colors.white, paddingVertical: 16, paddingHorizontal: 18 }, style]}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <T w="extrabold" size={16}>
            {title}
          </T>
          {action ? (
            <Pressable onPress={onAction} hitSlop={8}>
              <T w="bold" size={13}>
                {action}
              </T>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function SectionHeader({ title, action, onAction, count }: { title: string; action?: string; onAction?: () => void; count?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 }}>
      <T w="extrabold" size={17}>
        {title}
        {count != null ? <T w="semibold" size={17} color={colors.muted}>{`  ·  ${count}`}</T> : null}
      </T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <T w="bold" size={13}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const base: ViewStyle = { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, style, { opacity: pressed ? 0.9 : 1 }]}>
      {children}
    </Pressable>
  );
}

/** Sticky bottom action area with the safe-area inset. */
export function BottomBar({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { paddingHorizontal: 18, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) + 4, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
        style,
      ]}>
      {children}
    </View>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  danger,
  last,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      android_ripple={{ color: 'rgba(17,17,17,0.10)' }}
      style={({ pressed }) => ({
        minHeight: 58,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.surface2,
        opacity: pressed ? 0.7 : 1,
      })}>
      {icon ? (
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: danger ? colors.redSoft : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T w="semibold" size={15} color={danger ? colors.redText : colors.ink}>
          {title}
        </T>
        {subtitle ? (
          <T size={12} color={colors.muted} style={{ marginTop: 2 }}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={18} color={colors.muted} /> : null)}
    </Pressable>
  );
}

export function InfoTile({ label, value, icon, style }: { label: string; value: string; icon?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', gap: 10, alignItems: 'center' }, style]}>
      {icon ? (
        <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T size={12} color={colors.muted}>
          {label}
        </T>
        <T w="bold" size={14} style={{ marginTop: 1 }}>
          {value}
        </T>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ Chips */

export function Chip({
  label,
  selected,
  onPress,
  icon,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      android_ripple={{ color: 'rgba(17,17,17,0.10)' }}
      style={({ pressed }) => [
        {
          height: 42,
          paddingHorizontal: 15,
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.ink : colors.white,
          borderWidth: 1,
          borderColor: selected ? colors.ink : colors.line,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {selected ? <Check size={14} color={colors.white} strokeWidth={3} /> : icon}
      <T w={selected ? 'bold' : 'semibold'} size={13} color={selected ? colors.white : colors.ink}>
        {label}
      </T>
    </Pressable>
  );
}

type TagTone = 'monthly' | 'trip' | 'neutral' | 'green' | 'red' | 'yellow' | CategoryKey;

const TAG: Record<'monthly' | 'trip' | 'neutral' | 'green' | 'red' | 'yellow', { bg: string; fg: string }> = {
  monthly: { bg: colors.yellow100, fg: colors.yellowText },
  yellow: { bg: colors.yellow100, fg: colors.yellowText },
  trip: { bg: colors.neutralSoft, fg: colors.neutralText },
  neutral: { bg: colors.surface2, fg: colors.ink2 },
  green: { bg: colors.greenSoft, fg: colors.greenText },
  red: { bg: colors.redSoft, fg: colors.redText },
};

export function Tag({ label, tone = 'neutral', style }: { label: string; tone?: TagTone; style?: StyleProp<ViewStyle> }) {
  const cc = category[tone] ?? neutralCategory;
  const c = tone in TAG ? TAG[tone as keyof typeof TAG] : { bg: cc.bg, fg: cc.text };
  return (
    <View style={[{ alignSelf: 'flex-start', height: 26, paddingHorizontal: 9, borderRadius: 8, backgroundColor: c.bg, justifyContent: 'center' }, style]}>
      <T w="bold" size={12} color={c.fg}>
        {label}
      </T>
    </View>
  );
}

export function StatusTag({ status }: { status: string }) {
  const tone: TagTone =
    status === 'Connected' || status === 'Hired' || status === 'Approved' || status === 'Verified'
      ? 'green'
      : status === 'Shortlisted'
        ? 'yellow'
        : status === 'Not selected' || status === 'Rejected' || status === 'Declined'
          ? 'red'
          : status === 'Request sent' || status === 'Pending'
            ? 'trip'
            : 'neutral';
  return <Tag label={status} tone={tone} />;
}

export function Verified({ size = 16 }: { size?: number }) {
  return <BadgeCheck size={size} color={colors.white} fill={colors.green} strokeWidth={2.2} accessibilityLabel="Verified" />;
}

/* ------------------------------------------------------------------ Inputs */

/**
 * Open the keyboard once the screen has finished sliding in. Opening it during
 * the transition makes the slide and the keyboard animation fight for frames.
 */
export function useFocusAfterTransition(ref: React.RefObject<React.ComponentRef<typeof TextInput> | null>, enabled = true) {
  const nav = useNavigation();
  React.useEffect(() => {
    if (!enabled) return;
    let done = false;
    const focus = () => {
      if (done) return;
      done = true;
      ref.current?.focus();
    };
    const unsub = nav.addListener('transitionEnd' as never, (e: { data?: { closing?: boolean } }) => {
      if (!e?.data?.closing) focus();
    });
    const fallback = setTimeout(focus, 450); // no transition, e.g. a wizard step change
    return () => {
      unsub();
      clearTimeout(fallback);
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  prefix,
  suffix,
  maxLength,
  autoFocus,
  multiline,
}: {
  label?: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  prefix?: string;
  suffix?: string;
  maxLength?: number;
  autoFocus?: boolean;
  multiline?: boolean;
}) {
  const [focus, setFocus] = React.useState(false);
  const input = React.useRef<React.ComponentRef<typeof TextInput>>(null);
  useFocusAfterTransition(input, !!autoFocus);
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <T w="bold" size={14}>
          {label}
        </T>
      ) : null}
      <View
        style={{
          minHeight: 56,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: focus ? colors.ink : colors.line,
          backgroundColor: colors.white,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          paddingHorizontal: 16,
          gap: 10,
        }}>
        {prefix ? (
          <T w="bold" size={17}>
            {prefix}
          </T>
        ) : null}
        <TextInput
          ref={input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{ flex: 1, fontFamily: font.semibold, fontSize: 16, color: colors.ink, paddingVertical: multiline ? 14 : 0, minHeight: multiline ? 96 : undefined, textAlignVertical: multiline ? 'top' : 'center' }}
        />
        {suffix ? (
          <T w="semibold" size={14} color={colors.muted}>
            {suffix}
          </T>
        ) : null}
      </View>
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={{ width: 52, height: 32, borderRadius: 16, padding: 3, backgroundColor: value ? colors.ink : colors.lineStrong, alignItems: value ? 'flex-end' : 'flex-start' }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: value ? colors.yellow : colors.white, ...shadow.card }} />
    </Pressable>
  );
}

export function RadioDot({ on }: { on: boolean }) {
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: on ? 0 : 2,
        borderColor: colors.lineStrong,
        backgroundColor: on ? colors.ink : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {on ? <Check size={14} color={colors.yellow} strokeWidth={3.4} /> : null}
    </View>
  );
}

/** Segmented progress bar for wizards: done steps green, current black. */
export function Steps({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < current ? colors.green : i === current ? colors.ink : colors.line }} />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ Media */

export function Avatar({ source, size = 48, rounded = 'md' }: { source: ImageSourcePropType; size?: number; rounded?: 'md' | 'full' }) {
  return <Image source={source} style={{ width: size, height: size, borderRadius: rounded === 'full' ? size / 2 : size * 0.28, backgroundColor: colors.surface2 }} />;
}

/** A vehicle shown whole on white, the way the client's product photos are shot. */
export function VehiclePhoto({ source, height, style }: { source: ImageSourcePropType; height: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ height, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: 10 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.yellow100, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <T w="extrabold" size={18} center>
        {title}
      </T>
      <T size={14} color={colors.ink2} center lh={20}>
        {text}
      </T>
      {action ? <View style={{ marginTop: 8, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function DemoNote({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.neutralSoft }}>
      <View style={{ paddingHorizontal: 6, height: 20, borderRadius: 5, backgroundColor: colors.ink, justifyContent: 'center' }}>
        <T w="extrabold" size={10} color={colors.yellow}>
          DEMO
        </T>
      </View>
      <T size={12} color={colors.neutralText} style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}

/**
 * Screen container that keeps the bottom action bar above the keyboard.
 * The app draws edge to edge, so Android does not resize the window itself.
 */
export function KeyboardSafe({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <KeyboardAvoidingView behavior="padding" style={[{ flex: 1 }, style]}>
      {children}
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------------ Sheet */

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  // Never mount a hidden <Modal>: on Android (Fabric) an unopened Modal left the
  // screen's native views out of sync, so later steps drew stale content.
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(12,12,12,0.5)', justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 16) + 10, maxHeight: '88%', ...shadow.sheet }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.lineStrong, marginBottom: 14 }} />
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
