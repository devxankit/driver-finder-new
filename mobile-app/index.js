/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Pushes that arrive while the app is closed are shown by Android itself; nothing to do here,
// but FCM wants a handler registered before the app starts.
setBackgroundMessageHandler(getMessaging(), async () => {});

AppRegistry.registerComponent(appName, () => App);
