import React from 'react';
import { Image, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import Pressable from './Pressable';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { BadgeCheck, Bookmark, BookmarkCheck } from 'lucide-react-native';
import T from './T';
import { Tag } from './ui';
import { category, CategoryKey, colors } from '../theme';
import { cat, categories, images, Job } from '../data/catalog';
import { fileSource } from '../api/client';
import { rupees } from '../utils/format';

/** The client's emblem in a white circle (it is drawn on white). */
export function Logo({ size = 40, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.white, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image source={images.logo} style={{ width: size * 0.96, height: size * 0.96 }} resizeMode="contain" />
    </View>
  );
}

/** "Driver" in black, "Finder" on a yellow pill, as on the canvas. */
export function Wordmark({ size = 18, light }: { size?: number; light?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <T w="extrabold" size={size} color={light ? colors.white : colors.ink}>
        Driver
      </T>
      <View style={{ backgroundColor: colors.yellow, borderRadius: size * 0.32, paddingHorizontal: size * 0.32, paddingVertical: 1 }}>
        <T w="extrabold" size={size} color={colors.ink}>
          Finder
        </T>
      </View>
    </View>
  );
}

export function SteeringIcon({ size = 32, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Circle cx={12} cy={12} r={2.2} fill={color} />
      <Path d="M3.5 10.5h6.3M14.2 10.5h6.3M12 14.2V21" />
    </Svg>
  );
}

export function KeyIcon({ size = 32, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={8} cy={15} r={4.5} />
      <Circle cx={8} cy={15} r={1.4} fill={color} />
      <Path d="M11.2 11.8 20 3M16.5 6.5l2.5 2.5M14 9l2 2" />
    </Svg>
  );
}

/** Drawing of a card, used as the "how to hold it" guide in the KYC camera step. */
export function DocMock({ kind, width = 260 }: { kind: string; width?: number }) {
  const h = width * 0.63;
  const isAadhaar = kind.startsWith('aadhaar');
  const back = kind.endsWith('Back');
  const title = kind.startsWith('pan') ? 'PAN CARD' : isAadhaar ? 'AADHAAR' : 'DRIVING LICENCE';
  return (
    <View style={{ width, height: h, borderRadius: 12, backgroundColor: isAadhaar ? '#F6F3EA' : '#EEF2F8', padding: width * 0.05, gap: 8, borderWidth: 1, borderColor: '#D9DEE8' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T w="extrabold" size={10} color={isAadhaar ? '#7A5A00' : '#1E3A8A'}>
          {title}
          {back ? ' · BACK' : ''}
        </T>
        <View style={{ width: 22, height: 14, borderRadius: 3, backgroundColor: isAadhaar ? '#E9D9A8' : '#C9D3E6' }} />
      </View>
      {back ? (
        <View style={{ flex: 1, gap: 7, paddingTop: 4 }}>
          {[92, 78, 85, 60, 70].map((w, i) => (
            <View key={i} style={{ height: 7, width: `${w}%`, borderRadius: 3, backgroundColor: '#B8C0D0' }} />
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
          <View style={{ width: width * 0.22, height: width * 0.28, borderRadius: 4, backgroundColor: '#C6CCD8', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
            <View style={{ width: width * 0.09, height: width * 0.09, borderRadius: width, backgroundColor: '#9AA4B8', marginBottom: 2 }} />
            <View style={{ width: width * 0.17, height: width * 0.08, borderTopLeftRadius: width, borderTopRightRadius: width, backgroundColor: '#9AA4B8' }} />
          </View>
          <View style={{ flex: 1, gap: 7, paddingTop: 2 }}>
            {[90, 70, 80, 55, 65].map((w, i) => (
              <View key={i} style={{ height: 7, width: `${w}%`, borderRadius: 3, backgroundColor: i === 0 ? '#98A3BC' : '#B8C0D0' }} />
            ))}
          </View>
        </View>
      )}
      <Svg width="100%" height={12}>
        {Array.from({ length: 60 }).map((_, i) => (
          <Rect key={i} x={i * 4} y={0} width={i % 3 ? 1.4 : 2.4} height={12} fill="#4A4A47" opacity={0.45} />
        ))}
      </Svg>
    </View>
  );
}

/* --------------------------------------------------------- Category tiles */

/** Image-only vehicle tiles (the canvas design): the name is for screen readers. */
export function CategoryRow({
  value,
  onChange,
  keys,
  style,
}: {
  value: CategoryKey | null;
  onChange: (k: CategoryKey | null) => void;
  keys?: CategoryKey[];
  style?: StyleProp<ViewStyle>;
}) {
  const list = keys ? categories.filter((c) => keys.includes(c.key)) : categories;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 4, gap: 10 }} style={style}>
      {list.map((c) => {
        const on = value === c.key;
        return (
          <Pressable
            key={c.key}
            accessibilityRole="button"
            accessibilityLabel={c.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(on ? null : c.key)}
            android_ripple={{ color: 'rgba(17,17,17,0.10)' }}
            style={({ pressed }) => ({
              width: 108,
              height: 80,
              borderRadius: 18,
              backgroundColor: on ? colors.yellow50 : colors.white,
              borderWidth: on ? 2 : 1,
              borderColor: on ? colors.ink : colors.line,
              padding: 6,
              opacity: pressed ? 0.85 : 1,
            })}>
            <Image source={c.tile} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Selectable vehicle tile with a label, for forms (drivers pick what they drive). */
export function CategoryPick({ k, on, onPress }: { k: CategoryKey; on: boolean; onPress: () => void }) {
  const c = cat(k);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={c.label}
      onPress={onPress}
      android_ripple={{ color: 'rgba(17,17,17,0.10)' }}
      style={({ pressed }) => ({
        // Three per row; a last odd tile keeps the same size instead of stretching.
        width: '31%',
        borderRadius: 16,
        backgroundColor: on ? colors.yellow50 : colors.white,
        borderWidth: on ? 2 : 1,
        borderColor: on ? colors.ink : colors.line,
        padding: 6,
        paddingBottom: 8,
        alignItems: 'center',
        gap: 2,
        opacity: pressed ? 0.85 : 1,
      })}>
      <Image source={c.tile} style={{ width: '100%', height: 62 }} resizeMode="contain" />
      <T w={on ? 'extrabold' : 'semibold'} size={13}>
        {c.label}
      </T>
      {on ? (
        <View style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.yellow} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round">
            <Path d="m5 12 4.5 4.5L19 7" />
          </Svg>
        </View>
      ) : null}
    </Pressable>
  );
}

/* --------------------------------------------------------------- Job cards */

export function PayTag({ type, labels }: { type: 'monthly' | 'trip'; labels: { monthly: string; trip: string } }) {
  return <Tag label={type === 'monthly' ? labels.monthly : labels.trip} tone={type === 'monthly' ? 'monthly' : 'trip'} />;
}

export function JobCard({
  job,
  onPress,
  saved,
  onSave,
  labels,
  status,
}: {
  job: Job;
  onPress: () => void;
  saved?: boolean;
  onSave?: () => void;
  labels: { monthly: string; trip: string; perMonth: string; perTrip: string; posted: string };
  status?: React.ReactNode;
}) {
  const c = cat(job.category);
  const o = job.owner;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${rupees(job.pay)}`}
      android_ripple={{ color: 'rgba(17,17,17,0.10)' }}
      style={({ pressed }) => ({ borderRadius: 18, overflow: 'hidden', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.92 : 1 })}>
      <View style={{ height: 150, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.surface2 }}>
        <Image source={c.photo} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        <Tag label={`${c.label} · ${job.vehicle}`} tone={job.category} style={{ position: 'absolute', left: 10, top: 10 }} />
        {onSave ? (
          <Pressable
            onPress={onSave}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from saved' : 'Save job'}
            style={{ position: 'absolute', right: 10, top: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
            {saved ? <BookmarkCheck size={18} color={colors.ink} fill={colors.yellow} /> : <Bookmark size={18} color={colors.ink} />}
          </Pressable>
        ) : null}
      </View>
      <View style={{ padding: 14, gap: 7 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T w="extrabold" size={21}>
            {rupees(job.pay)}
            <T w="semibold" size={13} color={colors.muted}>
              {job.payType === 'monthly' ? ` ${labels.perMonth}` : ` ${labels.perTrip}`}
            </T>
          </T>
          {status ?? <PayTag type={job.payType} labels={labels} />}
        </View>
        <T w="bold" size={15}>
          {job.title}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {job.idleAllowance ? <Tag label={`Bhatta ${rupees(job.idleAllowance.amount)}/day`} tone="yellow" /> : null}
          {job.mileage ? <Tag label={`${job.mileage} km/l`} tone="neutral" /> : null}
          {job.bonus?.amount ? <Tag label={`Bonus ${rupees(job.bonus.amount)}`} tone="green" /> : null}
          {[job.licence, job.experience, job.idleAllowance ? '' : job.stay].filter((x) => x && x !== 'Not provided').map((x) => (
            <Tag key={x} label={x} tone="neutral" />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {o?.verified !== false ? <BadgeCheck size={15} color={colors.white} fill={colors.green} /> : null}
          <T w="bold" size={12} color={colors.greenText} numberOfLines={1} style={{ flexShrink: 1 }}>
            {o?.company ?? 'Your job'}
          </T>
          <T size={12} color={colors.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
            · {job.area} · {labels.posted}
          </T>
        </View>
      </View>
    </Pressable>
  );
}

/** Compact row card used in lists (saved jobs, owner's posts). */
export function JobRow({ job, onPress, right, sub }: { job: Job; onPress: () => void; right?: React.ReactNode; sub?: string }) {
  const c = cat(job.category);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', gap: 12, padding: 10, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.9 : 1 })}>
      <View style={{ width: 96, height: 76, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.surface2, overflow: 'hidden' }}>
        <Image source={c.photo} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </View>
      <View style={{ flex: 1, gap: 3, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <T w="extrabold" size={16}>
            {rupees(job.pay)}
            <T w="semibold" size={12} color={colors.muted}>
              {job.payType === 'monthly' ? ' /month' : ' /trip'}
            </T>
          </T>
          {right}
        </View>
        <T w="bold" size={14} numberOfLines={1}>
          {job.title}
        </T>
        <T size={12} color={colors.muted} numberOfLines={1}>
          {sub ?? `${c.label} · ${job.licence} · ${job.area}`}
        </T>
      </View>
    </Pressable>
  );
}

export function CategoryBadge({ k }: { k: CategoryKey }) {
  return (
    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: category[k].fg }} />
  );
}

/**
 * A person's photo from the server, or their initials on yellow when there is
 * none (most new users have not added a photo yet).
 */
export function PersonPhoto({ path, name, size = 48, radius, style }: { path?: string | null; name?: string; size?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const r = radius ?? size * 0.3;
  const src = fileSource(path);
  if (src) return <Image source={src} style={[{ width: size, height: size, borderRadius: r, backgroundColor: colors.surface2 }, style as any]} />;
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={[{ width: size, height: size, borderRadius: r, backgroundColor: colors.yellow100, alignItems: 'center', justifyContent: 'center' }, style]}>
      <T w="extrabold" size={size * 0.36} color={colors.yellowText}>
        {initials}
      </T>
    </View>
  );
}
