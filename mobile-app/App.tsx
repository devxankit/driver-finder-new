import './src/i18n';
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStoreProvider } from './src/store/AppStore';
import RootNavigator from './src/navigation/RootNavigator';

// enableFreeze is deliberately off: with navigation.reset it left native views
// missing on Android (Fabric "MissingViewState"), so screens drew stale content.

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AppStoreProvider>
        <RootNavigator />
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
