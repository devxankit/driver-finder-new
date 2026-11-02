import React from 'react';
import { View } from 'react-native';
import Pressable from '../components/Pressable';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Briefcase, House, LucideIcon, MessageSquare, Truck, User, UserSearch } from 'lucide-react-native';
import T from '../components/T';
import { colors } from '../theme';
import { useStore } from '../store/AppStore';

import { LanguageScreen, OtpScreen, PhoneScreen, RegisterScreen, RoleScreen, SplashScreen } from '../screens/auth';
import { DriverSetupScreen, KycScreen, KycStatusScreen } from '../screens/onboarding';
import { DriverHomeScreen, DriverProfileTab, JobDetailScreen, MyJobsScreen, SavedJobsScreen } from '../screens/driver';
import {
  AddVehicleScreen, DriverViewScreen, OwnerHomeScreen, OwnerJobsScreen, OwnerProfileTab, OwnerSetupScreen, PostJobScreen, VehiclesScreen,
} from '../screens/owner';
import {
  CheckoutScreen, DocumentsScreen, HelpScreen, LegalScreen, MyPlanScreen, NotificationsScreen, PlansScreen, SettingsScreen,
} from '../screens/shared';
import { ChatsScreen, ChatThreadScreen } from '../screens/chat';

const Stack = createNativeStackNavigator();
const DriverTab = createBottomTabNavigator();
const OwnerTab = createBottomTabNavigator();

type TabDef = { name: string; label: string; Icon: LucideIcon; component: React.ComponentType<any> };

/** Flat tab bar from the canvas: hairline top border, yellow marker on the active tab. */
function TabBar({ state, navigation, tabs }: BottomTabBarProps & { tabs: TabDef[] }) {
  const insets = useSafeAreaInsets();
  const { unreadChats: chatCount, requests, role } = useStore();
  const reqCount = role === 'driver' ? requests.filter((r) => r.status === 'Pending').length : 0;
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8 }}>
      {state.routes.map((r, i) => {
        const tab = tabs.find((x) => x.name === r.name)!;
        const focused = state.index === i;
        const badge = tab.name === 'Chats' ? chatCount : tab.name === 'MyJobs' ? reqCount : 0;
        return (
          <Pressable
            key={r.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(r.name);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 }}>
            {focused ? <View style={{ position: 'absolute', top: -9, width: 30, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.yellow }} /> : null}
            <tab.Icon size={23} color={focused ? colors.ink : colors.muted} strokeWidth={focused ? 2.3 : 1.8} />
            <T w={focused ? 'extrabold' : 'semibold'} size={11} color={focused ? colors.ink : colors.muted} numberOfLines={1}>
              {tab.label}
            </T>
            {badge ? (
              <View style={{ position: 'absolute', top: -4, left: '55%', minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
                <T w="extrabold" size={10} color={colors.white}>
                  {badge}
                </T>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const DRIVER_TABS: TabDef[] = [
  { name: 'Jobs', label: 'tabs.jobs', Icon: House, component: DriverHomeScreen },
  { name: 'MyJobs', label: 'tabs.myJobs', Icon: Briefcase, component: MyJobsScreen },
  { name: 'Chats', label: 'tabs.chats', Icon: MessageSquare, component: ChatsScreen },
  { name: 'Profile', label: 'tabs.profile', Icon: User, component: DriverProfileTab },
];

/** Driver tab labels are translation keys; owner labels stay English. */
function DriverTabBar(p: BottomTabBarProps) {
  const { t } = useTranslation();
  return <TabBar {...p} tabs={DRIVER_TABS.map((x) => ({ ...x, label: t(x.label) }))} />;
}
const renderDriverTabBar = (p: BottomTabBarProps) => <DriverTabBar {...p} />;

function DriverMain() {
  return (
    <DriverTab.Navigator screenOptions={{ headerShown: false }} tabBar={renderDriverTabBar}>
      {DRIVER_TABS.map((x) => (
        <DriverTab.Screen key={x.name} name={x.name} component={x.component} />
      ))}
    </DriverTab.Navigator>
  );
}

const OWNER_TABS: TabDef[] = [
  { name: 'Home', label: 'Drivers', Icon: UserSearch, component: OwnerHomeScreen },
  { name: 'Jobs', label: 'My jobs', Icon: Briefcase, component: OwnerJobsScreen },
  { name: 'Vehicles', label: 'Vehicles', Icon: Truck, component: VehiclesScreen },
  { name: 'Chats', label: 'Chats', Icon: MessageSquare, component: ChatsScreen },
  { name: 'Profile', label: 'Profile', Icon: User, component: OwnerProfileTab },
];

const renderOwnerTabBar = (p: BottomTabBarProps) => <TabBar {...p} tabs={OWNER_TABS} />;

function OwnerMain() {
  return (
    <OwnerTab.Navigator screenOptions={{ headerShown: false }} tabBar={renderOwnerTabBar}>
      {OWNER_TABS.map((x) => (
        <OwnerTab.Screen key={x.name} name={x.name} component={x.component} />
      ))}
    </OwnerTab.Navigator>
  );
}

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.ink } };

export default function RootNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }} initialRouteName="Splash">
        <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Language" component={LanguageScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Phone" component={PhoneScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="Role" component={RoleScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'fade' }} />

        <Stack.Screen name="DriverSetup" component={DriverSetupScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Kyc" component={KycScreen} />
        <Stack.Screen name="OwnerSetup" component={OwnerSetupScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="OwnerKyc" component={KycScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="KycStatus" component={KycStatusScreen} options={{ animation: 'fade' }} />

        <Stack.Screen name="DriverMain" component={DriverMain} options={{ animation: 'fade' }} />
        <Stack.Screen name="OwnerMain" component={OwnerMain} options={{ animation: 'fade' }} />

        <Stack.Screen name="JobDetail" component={JobDetailScreen} />
        <Stack.Screen name="SavedJobs" component={SavedJobsScreen} />

        <Stack.Screen name="AddVehicle" component={AddVehicleScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="PostJob" component={PostJobScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="OwnerJobs" component={OwnerJobsScreen} />
        <Stack.Screen name="DriverView" component={DriverViewScreen} />

        <Stack.Screen name="Plans" component={PlansScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="MyPlan" component={MyPlanScreen} />
        <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="Legal" component={LegalScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
