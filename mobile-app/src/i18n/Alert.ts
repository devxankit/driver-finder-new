/**
 * `Alert` in the user's language. Same call as React Native's Alert.alert; the
 * title, message and button labels are translated first (see auto.ts). Import
 * this instead of Alert from 'react-native'.
 */
import { Alert as NativeAlert, AlertButton, AlertOptions } from 'react-native';
import { txReady } from './auto';

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    txReady([title, message, ...(buttons ?? []).map((b) => b.text)])
      .then(([tt, mm, ...labels]) =>
        NativeAlert.alert(
          tt ?? title,
          mm,
          buttons?.map((b, i) => ({ ...b, text: labels[i] ?? b.text })),
          options,
        ),
      )
      .catch(() => NativeAlert.alert(title, message, buttons, options));
  },
};
