# Driver Finder: API (Node + Express + MongoDB)

One API serves the Android app (drivers and vehicle owners), the admin panel and the landing page.

- Node 20+, Express 4, Mongoose (MongoDB Atlas), Zod validation, JWT auth
- OTP over SMS India Hub, with a switch to turn SMS off while testing
- Razorpay (orders, signature check, webhook) for plans
- Files on the server disk: public images in `uploads/public`, KYC documents in `uploads/private` (only admins can open them)
- Socket.IO on the same port for live chat and live updates (see below)

## Run it

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values (see below)
npm run seed              # first admin, vehicle categories, cities, licence types, plans, CMS text
npm run seed -- --demo    # optional demo marketplace: 12 owners, ~45 jobs, 25 drivers with photos (all marked isDemo)
npm run seed -- --remove-demo   # before launch: deletes every demo account and everything linked to it
npm run dev               # http://localhost:5000  (prints the LAN URL for the phone)
```

`npm run create-admin -- you@example.com "password" "Your name"` creates a super admin, or resets the password of an existing one.

## Settings (`.env`)

| Variable | What it does |
|---|---|
| `MONGODB_URI` | Atlas connection string (database `driver_finder`) |
| `JWT_SECRET` | Long random string. Changing it signs everyone out. |
| `CLIENT_URL` | Browser origins allowed to call the API (admin panel, landing page), comma-separated |
| `OTP_ENABLED` | `true` sends real SMS through SMS India Hub. `false` sends nothing and returns the code to the app, which fills it in by itself. |
| `SMSINDIAHUB_*` | API key (or user and password), 6-letter sender ID, DLT template ID, PE ID, and the message text. The message must match the DLT-approved template exactly; `{otp}` is replaced with the code. |
| `TEST_PHONE_NUMBERS`, `TEST_OTP_CODE` | Fixed OTP for review accounts (for example the Play Store reviewer), even when SMS is on |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay keys (test keys now, live keys at launch) |
| `RAZORPAY_WEBHOOK_SECRET` | Optional. Secret of the Razorpay webhook (defaults to the key secret) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First super admin, created by `npm run seed` |
| `TRUST_PROXY` | `1` behind nginx on the VPS |

## Rules the API enforces

- **KYC:** drivers upload licence (front, back) and Aadhaar (front, back); owners upload Aadhaar (front, back) and PAN/GST. An admin approves, or rejects with a reason and the documents to retake.
- **Pay to connect:** applying, sending or accepting a hiring request, connecting with an applicant, chatting and seeing phone numbers need approved KYC **and** an active plan. Errors come back as `KYC_REQUIRED` or `PLAN_REQUIRED`, and the app opens the matching sheet.
- **Posting a job** needs approved KYC only.
- **Plans:** separate driver and owner plans, managed in the admin panel. Price 0 means "price at launch" and blocks checkout. Buying again before expiry extends from the current end date.
- **Suspended** users are signed out and their jobs leave the feed.

## API map

Mobile app (`/api`, Bearer token from `/auth/verify`):

| Area | Endpoints |
|---|---|
| Public | `GET /meta` (categories, cities, licences, plans, support), `GET /cms/:key`, `GET /stats`, `POST /enquiries` |
| Auth | `POST /auth/otp`, `POST /auth/verify` |
| Me | `GET/PATCH/DELETE /me`, `POST /me/role`, `PUT /me/driver`, `PUT /me/owner`, `POST /me/photo` |
| KYC | `POST /kyc/docs/:key` (multipart `file`), `POST /kyc/submit` |
| Jobs | `GET /jobs` (feed, filters `category`, `payType`, `city`, `q`), `GET /jobs/:id`, `GET /jobs/saved`, `POST /jobs/:id/save`, `POST /jobs/:id/apply`, owner: `GET /jobs/mine`, `POST /jobs`, `PATCH /jobs/:id`, `GET /jobs/:id/applicants` |
| Applications | `GET /applications/mine`, `PATCH /applications/:id` (owner: Shortlisted, Connected, Not selected) |
| Drivers (owner) | `GET /drivers`, `GET /drivers/:id`, `POST /drivers/:id/shortlist`, `GET /owner/links` |
| Hiring requests | `GET /requests`, `POST /requests`, `PATCH /requests/:id` |
| Vehicles | `GET/POST /vehicles`, `PATCH/DELETE /vehicles/:id`, `POST /vehicles/:id/photo` |
| Chat | `GET /connections`, `PATCH /connections/:id` (hired), `GET/POST /connections/:id/messages` (`?after=` for polling) |
| Plans | `GET /plans`, `GET /subscription`, `POST /payments/order`, `POST /payments/verify`, `POST /payments/failed`, `POST /payments/webhook` (Razorpay) |
| Other | `GET /notifications`, `POST /notifications/read`, `POST /reports` |

Admin panel (`/api/admin`, admin token): login, dashboard, users, KYC approve/reject, private document files, jobs moderation, vehicles, connections, plans, subscriptions (grant/extend), payments, categories and lists, reports, enquiries, broadcasts, CMS, admin users.

## Live updates (Socket.IO)

The socket runs on the same port at `/socket.io` and signs in with the same JWT as the REST API (`auth: { token }`). App users join their own room; admins join `admins`. Writes still go through REST (validation, plan checks), then the server pushes:

| Event | To | When |
|---|---|---|
| `message:new` | both people in a chat | a message is sent (the app shows it instantly) |
| `chat:typing` | the other person | typing starts/stops |
| `chat:read` | the other person | messages were read (double ticks) |
| `presence` | people you are connected with | you come online / go offline |
| `notification` | the user | any new inbox item |
| `me:changed` | the user | KYC approved/rejected, plan bought/extended, suspended |
| `sync { what }` | affected users | applications, requests, connections, jobs, links changed |
| `admin:sync { what }` | admins | new KYC submission, report, payment, enquiry, job |

Behind nginx, forward websockets: `proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";` on the `/socket.io/` location. Run a single Node process (or add the Socket.IO Redis adapter before scaling to several).

## Speed

- Keep the VPS in the same region as the Atlas cluster: each database round trip from a far-away machine costs ~150 ms, from the same region a few ms.
- `/meta` is cacheable for 60 s; the job feed caches the list of hidden owners; independent queries run in parallel; responses are gzip-compressed and send ETags (unchanged lists return 304).

## Deploying on the VPS (later)

1. Install Node 20 LTS and PM2; copy `backend/` (without `node_modules` and `.env`) and create `.env` with production values (`NODE_ENV=production`, `TRUST_PROXY=1`, a new `JWT_SECRET`, live Razorpay keys, `OTP_ENABLED=true`).
2. `npm ci --omit=dev && npm run seed && pm2 start src/server.js --name driver-finder-api`.
3. nginx: HTTPS (Let's Encrypt) for `api.yourdomain`, proxy to `localhost:5000`, and `client_max_body_size 10m` for photo uploads.
4. Back up `uploads/` (KYC documents) daily together with the database.
5. In Razorpay, add a webhook to `https://api.yourdomain/api/payments/webhook` for `payment.captured`.
6. In the app, change `DEFAULT_API_URL` in `mobile-app/src/api/client.ts` to the https address, and turn cleartext traffic off in `AndroidManifest.xml`.
