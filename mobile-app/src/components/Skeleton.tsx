import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

/**
 * Grey placeholder blocks that gently pulse while data loads, so screens keep
 * their shape instead of jumping from a spinner to content. Runs on the
 * native driver (no JS work per frame).
 */
function usePulse() {
  const v = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.55, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v;
}

export function Bone({ w = '100%', h = 14, r = 7, style }: { w?: number | `${number}%`; h?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: w, height: h, borderRadius: r, backgroundColor: colors.surface2 }, style]} />;
}

/** Placeholder shaped like a JobCard. */
export function JobCardSkeleton() {
  const o = usePulse();
  return (
    <Animated.View style={{ opacity: o, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
      <View style={{ height: 150, backgroundColor: colors.bg }} />
      <View style={{ padding: 14, gap: 10 }}>
        <Bone w="40%" h={20} />
        <Bone w="85%" />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Bone w={70} h={24} r={8} />
          <Bone w={70} h={24} r={8} />
          <Bone w={90} h={24} r={8} />
        </View>
        <Bone w="60%" h={12} />
      </View>
    </Animated.View>
  );
}

/** Placeholder rows for person / job lists. */
export function RowSkeleton({ count = 4 }: { count?: number }) {
  const o = usePulse();
  return (
    <Animated.View style={{ opacity: o, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: i < count - 1 ? 1 : 0, borderBottomColor: colors.surface2 }}>
          <Bone w={52} h={52} r={15} />
          <View style={{ flex: 1, gap: 8 }}>
            <Bone w="55%" />
            <Bone w="80%" h={11} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

/** Placeholder for a detail screen body. */
export function DetailSkeleton() {
  const o = usePulse();
  return (
    <Animated.View style={{ opacity: o, gap: 12, padding: 18 }}>
      <Bone w="35%" h={24} r={8} />
      <Bone w="90%" h={22} />
      <Bone h={80} r={14} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Bone w="48%" h={50} r={12} />
        <Bone w="48%" h={50} r={12} />
      </View>
      <Bone h={120} r={14} />
    </Animated.View>
  );
}
