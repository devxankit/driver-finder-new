# Driver Finder: website and admin panel

One Vite + React 19 + Tailwind 4 app with two parts:

- `/`: landing page (English and Hindi), plus `/terms`, `/privacy` and `/refund`. Plans, FAQs, categories and the support contact come live from the API, and the contact form saves enquiries for the admin.
- `/admin`: admin panel. Dashboard, KYC queue with a document viewer (zoom, rotate, compare with the profile photo), drivers, owners, job moderation, vehicles, connections, plans, subscriptions and payments, categories and lists, reports and website enquiries, notifications, content and support, and admin users.

The admin code is a separate bundle, so visitors to the landing page never download it.

## Run it

```bash
cd frontend
npm install
cp .env.example .env   # defaults work for local development
npm run dev            # http://localhost:5173  and  http://localhost:5173/admin
```

The backend must be running (`cd backend && npm run dev`). In development Vite forwards `/api` and `/uploads` to it.

## Build

```bash
npm run build          # output in dist/
```

Serve `dist/` with any static host or nginx, with every unknown path falling back to `index.html` (the app uses client-side routes). If the API is on another domain, set `VITE_API_URL=https://api.yourdomain` before building, and add the site's address to `CLIENT_URL` in the backend `.env`.

`VITE_PLAY_STORE_URL` turns the "Coming soon on Google Play" buttons into real links once the app is published.

## Admin roles

- **Super admin:** everything, including plan prices and admin users.
- **Staff:** KYC, users, jobs, reports, notifications and content.
