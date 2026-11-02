# Driver Finder: Project Plan

A platform that connects **vehicle owners** who need drivers with **drivers** looking for steady work. It covers cars, buses, trucks and other vehicles. Owners hire for monthly-salary or per-trip arrangements. This is **not** a ride-booking app: there are no daily trips and no per-trip commission. Revenue comes from **subscriptions** paid by both sides.

Sources: [Proposal & SOW-4.pdf](Proposal%20&%20SOW-4.pdf), [discussed on call.txt](discussed%20on%20call.txt), and the decision session of 30 Oct 2026. Build method: `NATIVE-APP-PLAYBOOK.md` with the Lifeline 360 project (`C:\Users\AnkitAhirwar\OneDrive\Desktop\lifeline 360`) as the code reference.

---

## 1. Decision log

| # | Topic | Decision |
|---|---|---|
| 1 | Core flow | **Hybrid.** Owners add vehicles and post job requirements; drivers browse, filter and apply. Owners can also search approved drivers directly and send a connect request. |
| 2 | Vehicle scope | **All vehicle types.** Admin manages categories (Car, Bus, Truck, Tempo/LCV, Tractor, ...) and sub-types (Sedan, Hatchback, SUV, Heavy truck, Trailer, ...). |
| 3 | Mobile app | **One React Native app** for both roles. After OTP login the user picks **Driver** or **Vehicle Owner**. |
| 4 | Mobile tech | **React Native CLI 0.87.1 + TypeScript**, the same setup as Lifeline 360 (React Navigation 7, lucide, react-native-svg, AsyncStorage 2.2). |
| 5 | Web | `frontend/`: **Vite + React 19 + Tailwind 4** (same as Lifeline). Holds the **admin panel** and the **landing page**. |
| 6 | Backend | **Node + Express + MongoDB**, in a **later phase**. |
| 7 | Phase 1 scope | **UI only, on sample data** behind a store/service layer. No backend, OTP provider or payment gateway yet. |
| 8 | Languages | **i18n from day one, rolled out in phases.** Launch with English, Hindi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada and Punjabi; add the rest later as translation files. |
| 9 | Driver UX | **Very simple.** The KYC is a step-by-step wizard (one document per screen, camera opens directly). Also big buttons, icons and vehicle pictures, minimal typing. |
| 10 | Paywall | **Browse free, pay to connect.** Applying, sending or accepting a connect request, viewing contact details and chat need an active plan. |
| 11 | Communication | **Both.** In-app chat, plus the phone number with Call and WhatsApp buttons, shown after a connection is accepted. |
| 12 | Verification | **Mandatory KYC for drivers and for owners.** The admin approves manually. Only approved users are visible and can connect. |
| 13 | Plans | **Separate Driver and Owner plans** (monthly, quarterly, yearly). Prices show as `[PRICE]` placeholders and the admin can edit them. |
| 14 | Brand | Name **Driver Finder**. Temporary logo drawn by us, to be replaced in the next version. |
| 15 | Package | **`com.driverfinder.app`** (permanent). |
| 16 | Design | **Design canvas first.** Coding starts after the client approves it. |

### Defaults I chose (change any of them if needed)

- **Who pays to connect:** whoever starts the action needs an active plan (a driver applying, an owner sending a request). Accepting also needs a plan, so both sides pay, as the call described.
- **Job posts** go live immediately. The admin can hide or flag them (the SOW's "content moderation").
- **Unapproved drivers and owners** can sign up and browse, but cannot apply, post or connect until KYC is approved.
- **Location:** the user picks a city or area from a list. No live maps or GPS in phase 1.
- **Release output:** a signed APK, as in Lifeline. An AAB comes later for the Play Store.

---

## 2. Folder layout

```text
driver finder new/
  docs/            scope, call notes, this plan
  mobile-app/      React Native CLI app (Driver + Owner), package com.driverfinder.app
  frontend/        Vite + React: /admin (admin panel) and / (landing page)
  backend/         Node + Express + MongoDB (later phase)
```

> The path contains spaces (`driver finder new`). If the native Android build fails on the path, build from a `subst` drive letter, as in playbook section 4.8.

---

## 3. Mobile app: screen map (about 60 screens)

### 3.1 Shared: onboarding and auth
1. Splash (routing: language picked? → logged in? → role picked? → profile/KYC state → home)
2. **Language picker**: big tiles with each language in its own script (हिन्दी, मराठी, ગુજરાતી, বাংলা, தமிழ், తెలుగు, ಕನ್ನಡ, ਪੰਜਾਬੀ, English)
3. Intro: 3 picture slides
4. Phone number
5. OTP (demo: any 6-digit code works)
6. **Role picker**: two large picture cards, "I am a Driver" and "I own a Vehicle"

### 3.2 Driver
**Onboarding and KYC wizard** (one item per screen, progress bar, voice-free and icon-led)
7. Name and photo (camera selfie)
8. City/area
9. Vehicles I can drive (category picture tiles, multi-select) → sub-types
10. Licence type and years of experience (chips, no typing)
11. Work preference: monthly salary / per trip / both, expected pay range, full-time or part-time
12. KYC step: driving licence front (camera with a guide frame)
13. KYC step: driving licence back
14. KYC step: Aadhaar front and back
15. KYC step: optional extras (PAN, police verification, badge)
16. Review and submit
17. Verification pending (what happens next, support call button)
18. Rejected: reason and re-upload of that document only
19. Approved welcome

**Tabs: Home · My Jobs · Chats · Profile**
20. Home: category icon row (Car, Bus, Truck, ...), job feed cards (vehicle photo, pay, monthly/per-trip tag, city, owner verified badge)
21. Filter sheet: category → type, pay type, pay range, city, shift
22. Job detail: vehicle photos, route/area, pay terms, duty hours, food/stay, requirements, owner card, **Apply** (paywall if no plan)
23. Apply confirmation
24. My Jobs: Applied / Shortlisted / Connected / Rejected tabs
25. Owner requests: "Owner wants to hire you" (accept/decline)
26. Connection detail: owner phone with Call and WhatsApp, open chat
27. Chats list
28. Chat thread (text, quick-reply chips for low-literacy users)
29. Profile: my details, completeness meter
30. My documents (statuses)
31. Edit profile / work preferences

### 3.3 Vehicle owner
**Onboarding and KYC**
32. Owner type: individual / fleet company
33. Name, company name, city
34. KYC: Aadhaar, PAN or GST, selfie
35. Verification pending / rejected / approved (shares the driver screens' components)

**Tabs: Home · Vehicles · Find Drivers · Chats · Profile**
36. Home dashboard: active jobs, new applicants, connections, plan status, quick actions
37. My Vehicles list
38. Add vehicle wizard: category → type → make/model/year → registration number → photos → RC upload
39. Vehicle detail / edit
40. Post a job: vehicle, pay type (monthly/per trip) and amount, route/area, shift/hours, food/stay, licence and experience required
41. My job posts (active / paused / closed)
42. Job post detail with applicants
43. Applicant list (filters)
44. Driver profile (experience, vehicles, licence, verified badge; contact locked until connected) → Shortlist / Connect / Reject
45. Find Drivers: search approved drivers by category, city, experience, pay type
46. Send connect request (pick vehicle/job, optional message)
47. Connections: phone with Call and WhatsApp, chat
48–49. Chats list / thread (shared)
50. Owner profile, documents, company details

### 3.4 Shared: subscription and account
51. Plans: Driver or Owner plans by role, monthly/quarterly/yearly, `[PRICE]`, benefits
52. Paywall sheet (opens on Apply, Connect or View contact)
53. Checkout (demo: no real payment taken)
54. Payment processing → success
55. My subscription: active plan, expiry, renew, history
56. Notifications
57. Settings: language change, notifications, logout, delete account
58. Help and support: FAQs, call/WhatsApp support
59. Terms, privacy, refund policy
60. Report a user/job (feeds disputes in the admin panel)

---

## 4. Admin panel (`frontend/` → `/admin`)

| Module | Contents |
|---|---|
| Login | Email + password (demo) |
| Dashboard | Users by role, KYC pending, active subscriptions, revenue (sample), new jobs, connections; charts |
| **KYC queue** | Drivers and Owners tabs. Document viewer (zoom, rotate, compare with selfie), approve, or reject with reason (per document) |
| Drivers | List, filters, detail (profile, documents, applications, subscription), suspend/activate, visibility |
| Owners | List, detail (company, vehicles, job posts, subscription), suspend/activate |
| Vehicles | All listed vehicles, RC check |
| Job posts | Moderation: active, flagged, hidden; hide or restore |
| Connections | Who connected with whom, when, status |
| Subscription plans | Create and edit plans by role, duration, price, benefits, active toggle |
| Subscriptions and payments | Transactions, active and expired plans, manual extend |
| Masters | Vehicle categories and sub-types (with icons), licence types, cities, document types per role |
| Reports and disputes | User and job reports, resolution notes, actions |
| Notifications | Broadcast to all, drivers or owners |
| CMS | FAQs, terms, privacy, refund policy, support number |
| Settings | Admin users and roles |

## 5. Landing page (`frontend/` → `/`)

Hero (download on Google Play), how it works for drivers and for owners, vehicle categories, why Driver Finder (verified drivers, all vehicle types, direct contact), subscription teaser, app screenshots, FAQ, contact form, footer, terms and privacy pages. English and Hindi toggle.

---

## 6. Design direction (Phase 2–3 of the playbook)

- **Palette (temporary logo):** a transport-trust feel. Deep blue primary, amber/yellow accent (road and highway signage), white surfaces, navy text. Green for verified/approved, red only for rejected, errors and reports. Each vehicle category gets its own colour.
- **Type:** the **Noto Sans** family, because it covers every Indic script (Latin plus Devanagari, Bengali, Gujarati, Gurmukhi, Tamil, Telugu, Kannada). It ships as static weights, per the playbook.
- **Driver UX rules:** a 56px+ primary button, one action per screen in wizards, icons and pictures alongside every label, at most one text field per wizard step, a font-scale cap of 1.3×, and a sticky help/call button.
- **Owner UX:** denser, more information per card, dashboards.
- Follow the playbook's "doesn't look AI-generated" checklist: real vehicle and driver photos, dense real information, flat tab bar, 10–16px corners.

**Canvas boards for approval (11):**
1. Design system (logo, palette, category colours, type, components)
2. Language picker and role picker
3. Driver KYC wizard step (camera with a guide frame) and pending state
4. Driver home: job feed with category row
5. Job detail with paywall sheet
6. Owner home dashboard
7. Post a job / add vehicle
8. Applicants → driver profile → connected (Call, WhatsApp, chat)
9. Subscription plans
10. Admin: KYC review screen
11. Landing page hero

---

## 7. Execution phases

| # | Phase | Output |
|---|---|---|
| 0 | Analysis and decisions | This plan (done) |
| 1 | Design direction and canvas | 11 boards approved; tokens written down |
| 2 | Mobile setup | `mobile-app/` scaffolded (RN 0.87.1, `com.driverfinder.app`), fonts, icons, release keystore and guard, baseline release build |
| 3 | Mobile architecture | Theme, `T` text component, UI kit, i18n (i18next with per-language JSON files), sample data, AppStore (session, role, profile, KYC state, vehicles, jobs, applications, connections, chats, subscription), navigation (role-based tab sets) |
| 4 | Mobile screens | Auth and role → Driver onboarding/KYC → Driver tabs → Owner onboarding/KYC → Owner tabs → subscription/paywall → chat → settings. A **demo switch** to simulate admin approval |
| 5 | Web | `frontend/` Vite app: landing page, then all admin modules on sample data |
| 6 | Verify and release | `tsc`, `eslint` and `jest` clean, emulator walkthrough with screenshots, signed APK in `mobile-app/release/`, web build, READMEs |
| **B** | **Backend (done 30 Oct 2026)** | Express + MongoDB Atlas API (`backend/`), SMS India Hub OTP with an on/off switch, Razorpay test mode, KYC files on the server disk, chat by polling; admin panel and landing page on the live API (`frontend/`); app v1.1.0 connected. Still to do: push notifications (FCM), VPS deployment with HTTPS, live Razorpay keys, real SMS sender/DLT template |

### Phase B outline (for later reference)
- **Collections:** users (role, phone, language, status), driverProfiles, ownerProfiles, documents (type, files, status, rejectReason), vehicleCategories/types, vehicles, jobs, applications, connectRequests, connections, chats/messages, plans, subscriptions, payments, reports, notifications, cms.
- **Integrations to choose then:** OTP (MSG91 or Firebase), payments (Razorpay recommended for India), storage (S3 or Cloudinary), push (FCM), chat (Socket.io).

---

## 8. Facts still needed from the client (placeholders until then)

1. Subscription prices, durations and benefits per role
2. The exact KYC document list for drivers and for owners (e.g. police verification, badge)
3. Whether *both* parties must be subscribed for a connection, or only the one who starts it
4. Translations: who reviews the Indic-language text (we draft, the client reviews)
5. Support phone/WhatsApp number, terms, privacy and refund policy text
6. Final logo and brand colours (next version)
7. Launch cities

> **Scope note for the client:** subscriptions, payments, in-app chat, owner KYC, all-vehicle support and multi-language were agreed on the call. They are **not** in the signed SOW (which covers trucks, job posts and applications). Update the SOW or send a change request before billing.
