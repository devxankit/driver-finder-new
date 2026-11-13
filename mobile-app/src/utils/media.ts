import { AppState } from 'react-native';
import { Alert } from '../i18n/Alert';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';

export type Picked = { uri: string; type: string; name: string; size?: number };

/** Same limits as the server: JPG, PNG or WebP up to 8 MB. */
export const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Why a picked image can't be uploaded, or null when it is fine. */
export function imageProblem(p: Picked): string | null {
  if (!IMAGE_TYPES.includes(p.type.toLowerCase())) return 'Please choose a JPG, PNG or WebP image.';
  if (p.size && p.size > MAX_IMAGE_BYTES) return 'Each image must be smaller than 8 MB.';
  return null;
}

/** Multipart file entry for a picked image ("image/jpg" is sent as the standard "image/jpeg"). */
export const formFile = (p: Picked, name: string) => ({ uri: p.uri, type: p.type.toLowerCase() === 'image/jpg' ? 'image/jpeg' : p.type, name: p.name || name }) as any;

/**
 * Photos are resized on the phone before upload: documents stay readable at
 * 1600px, and uploads stay small on 2G/3G connections.
 */
const OPTS = { mediaType: 'photo' as const, maxWidth: 1600, maxHeight: 1600, quality: 0.8 as const, includeBase64: false, saveToPhotos: false };

function pick(res: ImagePickerResponse): Picked | null {
  if (res.didCancel) return null;
  if (res.errorCode) {
    Alert.alert('Camera', res.errorCode === 'camera_unavailable' ? 'The camera is not available on this phone.' : res.errorMessage || 'Could not open the camera.');
    return null;
  }
  const a = res.assets?.[0];
  if (!a?.uri) return null;
  return { uri: a.uri, type: a.type || 'image/jpeg', name: a.fileName || 'photo.jpg', size: a.fileSize };
}

/**
 * The picker answers while our activity is still resuming. A state update made
 * at that moment was only partly drawn on screen (seen on a OnePlus, RN 0.87
 * new architecture), so hand the result back once the app is active again.
 */
function whenActive(): Promise<void> {
  return new Promise((resolve) => {
    const settle = () => setTimeout(resolve, 250);
    if (AppState.currentState === 'active') return settle();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        sub.remove();
        settle();
      }
    });
  });
}

export async function takePhoto(front = false): Promise<Picked | null> {
  const res = await launchCamera({ ...OPTS, cameraType: front ? 'front' : 'back' });
  await whenActive();
  return pick(res);
}

/** Several photos from the gallery at once (up to `max`). */
export async function choosePhotos(max: number): Promise<Picked[]> {
  const res = await launchImageLibrary({ ...OPTS, selectionLimit: Math.max(1, max) });
  await whenActive();
  if (res.didCancel) return [];
  if (res.errorCode) {
    Alert.alert('Gallery', res.errorMessage || 'Could not open the gallery.');
    return [];
  }
  return (res.assets ?? []).filter((a) => a.uri).map((a, i) => ({ uri: a.uri!, type: a.type || 'image/jpeg', name: a.fileName || `photo-${i + 1}.jpg`, size: a.fileSize }));
}

export async function choosePhoto(): Promise<Picked | null> {
  const res = await launchImageLibrary({ ...OPTS, selectionLimit: 1 });
  await whenActive();
  return pick(res);
}
