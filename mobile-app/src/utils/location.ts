/**
 * Device location, used to show owners how far each driver is.
 *
 * Drivers report their location whenever the app opens (at most every few
 * minutes) so owners see an up-to-date distance. Owners use theirs to sort
 * drivers nearest first and as the pickup point of per-trip jobs. Nothing here
 * ever blocks the app: a denied permission, GPS switched off or a timeout just
 * means no distance is shown.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

Geolocation.setRNConfiguration({ skipPermissionRequests: true, authorizationLevel: 'whenInUse', locationProvider: 'auto' });

export type Coords = { lat: number; lng: number };
/** granted · denied (can ask again) · blocked ("don't ask again": only Settings helps) · unknown (not checked yet). */
export type LocStatus = 'unknown' | 'granted' | 'denied' | 'blocked';

const FINE = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
const COARSE = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
const REPORT_EVERY_MS = 10 * 60 * 1000;
const ASKED_KEY = 'df.locationAsked';

export async function locationAllowed(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const [fine, coarse] = await Promise.all([PermissionsAndroid.check(FINE), PermissionsAndroid.check(COARSE)]);
  return fine || coarse;
}

/** Shows the system prompt. Android 12+ lets the user pick "approximate", which is enough here. */
export async function askLocation(): Promise<LocStatus> {
  if (Platform.OS !== 'android') return 'granted';
  AsyncStorage.setItem(ASKED_KEY, '1').catch(() => {});
  const r = await PermissionsAndroid.requestMultiple([FINE, COARSE]);
  const vals = [r[FINE], r[COARSE]];
  if (vals.includes(PermissionsAndroid.RESULTS.GRANTED)) return 'granted';
  return vals.includes(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) ? 'blocked' : 'denied';
}

/** True once the app has shown the system prompt on this phone. */
export const askedBefore = () => AsyncStorage.getItem(ASKED_KEY).then((v) => v === '1').catch(() => true);

export class LocationError extends Error {
  /** 1 permission denied · 2 location (GPS) off or unavailable · 3 timed out */
  constructor(message: string, public code: number) {
    super(message);
  }
}

function position(highAccuracy: boolean): Promise<Coords> {
  return new Promise((resolve, reject) =>
    Geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new LocationError(e.code === 1 ? 'Location permission is off.' : e.code === 2 ? 'Location is off. Turn on location (GPS) on your phone.' : 'Could not get your location. Please try again.', e.code)),
      { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 20000 : 12000, maximumAge: 5 * 60 * 1000 },
    ),
  );
}

/** Current position: a quick network fix first, GPS if that fails. */
export async function currentPosition(): Promise<Coords> {
  try {
    return await position(false);
  } catch (e) {
    if (e instanceof LocationError && e.code === 1) throw e;
    return position(true);
  }
}

let last: { at: number; coords: Coords } | null = null;

/**
 * Sends the location to the server (throttled) and returns it. Returns null
 * without asking when permission is not granted or the location is unavailable.
 */
export async function reportLocation(force = false): Promise<Coords | null> {
  if (!force && last && Date.now() - last.at < REPORT_EVERY_MS) return last.coords;
  if (!(await locationAllowed())) return null;
  try {
    const coords = await currentPosition();
    last = { at: Date.now(), coords };
    api('/me/location', { method: 'PUT', body: coords }).catch(() => {});
    return coords;
  } catch {
    return last?.coords ?? null;
  }
}

/**
 * The phone's location for a screen. Reports it on mount and whenever the app
 * comes back to the foreground, if permission is already granted. `enable()`
 * asks for permission (or opens Settings when blocked) and returns the
 * coordinates, or throws a LocationError with a message to show.
 */
export function useMyLocation() {
  const [coords, setCoords] = useState<Coords | null>(last?.coords ?? null);
  const [status, setStatus] = useState<LocStatus>('unknown');
  const alive = useRef(true);

  const sync = useCallback(async (force = false) => {
    const ok = await locationAllowed();
    if (!alive.current) return;
    setStatus((s) => (ok ? 'granted' : s === 'blocked' ? 'blocked' : 'denied'));
    if (!ok) return;
    const c = await reportLocation(force);
    if (alive.current && c) setCoords(c);
  }, []);

  useEffect(() => {
    alive.current = true;
    sync();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && sync());
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, [sync]);

  const enable = useCallback(async (): Promise<Coords> => {
    const st: LocStatus = (await locationAllowed()) ? 'granted' : await askLocation();
    if (alive.current) setStatus(st);
    if (st === 'blocked') {
      Linking.openSettings().catch(() => {});
      throw new LocationError('Allow location for Driver Finder in Settings, then come back.', 1);
    }
    if (st !== 'granted') throw new LocationError('Location permission is off.', 1);
    const c = await currentPosition();
    last = { at: Date.now(), coords: c };
    await api('/me/location', { method: 'PUT', body: c }).catch(() => {});
    if (alive.current) setCoords(c);
    return c;
  }, []);

  return { coords, status, enable, refresh: () => sync(true) };
}

/** "800 m away", "2.4 km away", "35 km away". */
export function distanceText(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} m away`;
  if (km < 10) return `${km.toFixed(1).replace(/\.0$/, '')} km away`;
  return `${Math.round(km)} km away`;
}
