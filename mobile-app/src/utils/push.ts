/**
 * Phone push notifications (Firebase Cloud Messaging).
 *
 * After sign-in the app asks for permission (Android 13+), gets this phone's
 * FCM token and gives it to the server (PUT /api/me/push-token); the server
 * then pushes every in-app notification (new applicant, hiring request, chat
 * message, KYC, plan) through FCM, in the user's language. Android shows them
 * by itself while the app is closed or in the background; while the app is
 * open the live socket already shows them, so foreground pushes are ignored.
 *
 * Tapping a notification opens the chat it is about, or the notification list.
 */
import { PermissionsAndroid, Platform } from 'react-native';
import { createNavigationContainerRef } from '@react-navigation/native';
import {
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import { api } from '../api/client';

/** The app's navigation, so a notification tap can open a screen from outside React. */
export const navigationRef = createNavigationContainerRef<any>();

type PushData = { [key: string]: string | object | undefined };

let sentToken: string | null = null;
let refreshSub: (() => void) | null = null;
let pending: PushData | null = null;

/** Screens where the user is not signed in or still setting up: a tap waits until they are through. */
const NOT_READY = new Set(['Splash', 'Language', 'Phone', 'Otp', 'Role', 'Register', 'DriverSetup', 'Kyc', 'OwnerSetup', 'OwnerKyc']);

/** Opens what a tapped notification is about, now or once the main screen is showing. */
export function flushPendingOpen() {
  if (!pending || !navigationRef.isReady()) return;
  const current = navigationRef.getCurrentRoute()?.name;
  if (!current || NOT_READY.has(current)) return;
  const data = pending;
  pending = null;
  if (typeof data.connectionId === 'string' && data.connectionId) {
    navigationRef.navigate('ChatThread', { id: data.connectionId, name: typeof data.name === 'string' ? data.name : '' });
  } else if (data.screen !== 'KycStatus' || current !== 'KycStatus') {
    navigationRef.navigate('Notifications');
  }
}

function openFromPush(msg: { data?: PushData } | null) {
  if (!msg?.data) return;
  pending = msg.data;
  flushPendingOpen();
}

let tapsWired = false;
/** Call once at start-up: handles taps on notifications (app in background, or started by the tap). */
export function wirePushTaps() {
  if (tapsWired) return;
  tapsWired = true;
  try {
    const m = getMessaging();
    onNotificationOpenedApp(m, openFromPush);
    getInitialNotification(m).then(openFromPush).catch(() => {});
  } catch {
    // Firebase missing in this build: no push, the app works as before.
  }
}

async function askPermission() {
  // Android 13+ needs a runtime permission; older versions allow notifications by default.
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return true;
  const perm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (await PermissionsAndroid.check(perm)) return true;
  return (await PermissionsAndroid.request(perm)) === PermissionsAndroid.RESULTS.GRANTED;
}

async function send(token: string) {
  if (token === sentToken) return;
  await api('/me/push-token', { method: 'PUT', body: { token } });
  sentToken = token;
}

/** After sign-in and on every start while signed in. Never throws. */
export async function registerPush() {
  try {
    if (!(await askPermission())) return;
    const m = getMessaging();
    await send(await getToken(m));
    refreshSub ??= onTokenRefresh(m, (t) => {
      sentToken = null;
      send(t).catch(() => {});
    });
  } catch {
    // No Play Services, no network, or Firebase missing: try again next start.
  }
}

/**
 * Before sign-out (while still signed in): this phone stops getting this account's
 * notifications. `server: false` when the sign-in is already invalid (401).
 */
export async function unregisterPush({ server = true } = {}) {
  const token = server ? sentToken : null;
  sentToken = null;
  refreshSub?.();
  refreshSub = null;
  try {
    if (token) await api('/me/push-token', { method: 'DELETE', body: { token }, timeout: 8000 });
  } catch {
    // Offline: the token is deleted below, so the server drops it on its next push.
  }
  try {
    await deleteToken(getMessaging());
  } catch {
    // ignore
  }
}
