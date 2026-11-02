# Driver Finder: Android app (React Native CLI)

One app for both sides of the platform. After phone OTP, the user picks **Driver** or **Vehicle Owner**:

- **Drivers** set up a simple profile, photograph their licence and Aadhaar one document at a time, browse jobs by vehicle type, apply, accept hiring requests, then call, WhatsApp or chat with owners.
- **Owners** add their business and vehicles, post jobs (monthly salary or per trip), review applicants, search verified drivers, send hiring requests, and contact drivers once connected.
- **Subscriptions:** browsing is free; applying, connecting and contact details need an active plan.

Built from the approved design canvas (docs/design, v0.2: the client's yellow and black logo, Noto Sans, the client's vehicle photos).

## Stack

- React Native 0.87.1 (New Architecture, Hermes), TypeScript
- React Navigation 7 (native stack, custom flat tab bar; separate tab sets for drivers and owners)
- `react-native-svg` and `lucide-react-native` for icons
- i18next + react-i18next. English and Hindi cover every driver screen. Marathi, Gujarati, Bengali, Punjabi, Tamil, Telugu and Kannada cover sign-in, role choice, tabs and the job feed, and fall back to English elsewhere. All non-English text is a draft for the client's reviewers.
- AsyncStorage (2.2) keeps the session, profile, KYC state, plan, applications and chats on the device.
- Application ID `com.driverfinder.app`, app name "Driver Finder", version 1.0.0 (code 1)

## Connected to the backend (version 1.1.0)

Everything runs against the Driver Finder API (`backend/`):

| Feature | How it works now |
|---|---|
| OTP login | Backend sends the SMS through SMS India Hub. With `OTP_ENABLED=false` no SMS is sent and the app fills the code in by itself. |
| KYC | The real camera (or gallery) photographs each document; it is resized and uploaded, then reviewed in the admin panel's KYC queue. The status screen checks for the decision every 10 s. Rejected documents are the only ones asked again. |
| Jobs, applications, hiring requests | Live from the server. Owners shortlist, connect and mark drivers hired; drivers accept or decline requests. |
| Plans and payment | Prices from the admin panel. Razorpay Checkout opens in a secure in-app page (UPI apps open from it); the server verifies the payment signature before the plan starts. |
| Chat | Live over Socket.IO: messages appear instantly on both phones, with typing indicator, online / last seen and read ticks; older messages load as you scroll up. Chatting needs an active plan. |
| Call / WhatsApp | Real numbers, shown only after both sides are connected and the viewer has an active plan. |
| Live updates | KYC decisions, new applicants, hiring requests, connections and notifications arrive instantly over the socket. If the socket drops, the app refreshes every 20 s until it reconnects, then catches up. Push notifications (FCM) are a later step. |
| Speed | Screens show their last data instantly (memory and on-device cache) and refresh in the background; detail screens open with the data from the tapped card; the job feed and driver search are virtualized lists that load 15–20 items at a time as you scroll; skeleton placeholders instead of spinners. |
| Support number, FAQ, terms | From the admin panel's "Content & support". |

**Server address:** the app calls `DEFAULT_API_URL` in `src/api/client.ts` (this PC on Wi-Fi for now). To point it at another address without rebuilding, **long-press the logo on the phone-number screen**. Over USB you can also run `adb reverse tcp:5000 tcp:5000` and use `http://localhost:5000`.

## Project layout

```text
mobile-app/
  App.tsx                    Providers: SafeArea → AppStore → RootNavigator (i18n loaded first)
  src/
    theme/index.ts           Design tokens from the canvas (yellow #FEBE02, ink #111111, category colours)
    i18n/index.ts            Translations (en, hi full; mr, gu, bn, pa, ta, te, kn core)
    components/
      T.tsx                  Text: Noto Sans per weight, font scaling capped at 1.3×
      ui.tsx                 Button, AppBar, Section, Card, ListRow, Chip, Tag, Field, Toggle, Steps, Sheet, EmptyState…
      brand.tsx              Logo, Wordmark, category tiles (image only), job cards, sample document card
      sheets.tsx             Paywall, KYC-pending sheet, Call · WhatsApp · Chat row
    api/client.ts            API address, token, fetch + photo upload
    data/catalog.ts          Shared types; categories, cities, licences and plans (filled from GET /meta)
    store/AppStore.tsx       Signed-in user and shared lists from the API, cached for offline start, polled while open
    hooks/useQuery.ts        Screen data loader that refreshes when the screen comes back into view
    utils/media.ts           Camera and gallery (react-native-image-picker), resized before upload
    navigation/              Root stack, driver tabs, owner tabs, start-up routing (routes.ts)
    screens/
      auth.tsx               Splash, Language, Phone, OTP, Role
      onboarding.tsx         Driver profile wizard, KYC camera wizard (drivers and owners), verification status
      driver.tsx             Job feed, job detail + paywall, My jobs (applied / requests / connected), profile, saved jobs
      owner.tsx              Owner setup, home, vehicles, add vehicle, post a job, applicants, find drivers, driver profile, profile
      shared.tsx             Plans, checkout, my plan, chats, chat thread, notifications, settings, help, legal, documents
  scripts/generate-icons.py  Launcher icons, Play Store icon and in-app logo from assets/brand/logo-full.png
  assets/fonts               Noto Sans (Regular, Medium, SemiBold, Bold, ExtraBold)
  release/                   Signed APKs (git-ignored)
```

## Run in development

```bash
cd mobile-app
npm install
npm start            # Metro
npm run android      # USB device or emulator
```

## Build the signed release APK (Windows)

The project path has spaces, which native C++ builds don't handle well. Map a short drive letter first (it is lost on reboot):

```cmd
subst N: "E:\Appzeto Projects\driver finder new"
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.13.11-hotspot"
cd /d N:\mobile-app\android
gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64"
```

Output: `android/app/build/outputs/apk/release/app-release.apk`, copied to `release/DriverFinder-1.0.0.apk`. Drop `x86_64` for a smaller phone-only APK. For the Play Store, run `gradlew.bat bundleRelease` (AAB) with the same key.

## Signing (important)

- Upload key: `android/app/driverfinder-upload.keystore` (alias `driverfinder-upload`)
- Passwords: `android/keystore.properties` (git-ignored)
- A release build **fails on purpose** if `keystore.properties` is missing, so it can never fall back to the debug key.
- **Back up the keystore file and keystore.properties somewhere safe, outside this folder.** Every future Play Store update must be signed with this same key.

## Notes

- Icons: run `python scripts/generate-icons.py` after changing `assets/brand/logo-full.png`.
- iOS: the code is iOS-ready, but building needs a Mac (`npx pod-install`, then Xcode).
- Vehicle photos are the client's; check usage rights for the published app (some show manufacturer logos).
