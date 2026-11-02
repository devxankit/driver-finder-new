import { Alert, AppState } from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';

export type Picked = { uri: string; type: string; name: string };

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
  return { uri: a.uri, type: a.type || 'image/jpeg', name: a.fileName || 'photo.jpg' };
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

export async function choosePhoto(): Promise<Picked | null> {
  const res = await launchImageLibrary({ ...OPTS, selectionLimit: 1 });
  await whenActive();
  return pick(res);
}
