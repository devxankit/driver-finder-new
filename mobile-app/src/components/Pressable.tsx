import React from 'react';
import { Insets, Pressable as RNPressable, PressableProps } from 'react-native';

/**
 * The app's single Pressable. It works around two React Native 0.87 (new
 * architecture, Android) touch problems:
 *
 * 1. A tap is cancelled when a move event lands outside the button's measured
 *    area, and with edge-to-edge drawing that area can sit offset from the real
 *    button. Real finger presses always move a little, so taps near the edges
 *    were lost. A generous retention area keeps them; scrolling still cancels
 *    taps because the scroll view takes over the touch.
 *
 * 2. When a Pressable goes from disabled to enabled, RN leaves the native view
 *    marked disabled, and a disabled native view cannot be the touch target, so
 *    only the text label received taps. Remounting the view made it vanish, so
 *    "disabled" is handled here in JS instead: the native view stays enabled and
 *    presses are simply ignored while disabled.
 */
const RETENTION: Insets = { top: 140, bottom: 140, left: 140, right: 140 };
const RIPPLE = { color: 'rgba(17,17,17,0.10)' };

export default function Pressable({ disabled, onPress, onLongPress, onPressIn, onPressOut, accessibilityState, ...rest }: PressableProps) {
  const off = !!disabled;
  return (
    <RNPressable
      pressRetentionOffset={RETENTION}
      android_ripple={off ? undefined : RIPPLE}
      {...rest}
      onPress={off ? undefined : onPress}
      onLongPress={off ? undefined : onLongPress}
      onPressIn={off ? undefined : onPressIn}
      onPressOut={off ? undefined : onPressOut}
      accessibilityState={accessibilityState ? { ...accessibilityState, disabled: undefined } : undefined}
      accessibilityHint={off ? 'Not available yet' : rest.accessibilityHint}
    />
  );
}
