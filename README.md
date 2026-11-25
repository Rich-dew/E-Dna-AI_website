# TaxaTrace — eDNA Taxonomy & Biodiversity Platform

TaxaTrace is a responsive, mobile-first React + TypeScript + Tailwind CSS application with a lightweight Express backend for environmental DNA (eDNA) taxonomy assignment, novel-taxon detection, biodiversity analytics, and ecological reporting.

## Architecture (Separated Roles)

- **Firebase Authentication**: Email/Password and Google sign-in, email verification gate, session persistence, password reset, and custom claims (`admin: true`).
- **Firebase Firestore**: `users/{uid}`, `projects`, `jobs`, `auditLogs`, and `settings/announcement`.
- **Supabase**: PostgreSQL tables (`samples`, `sequences`, `taxa_reference`, `assignments`, `diversity_metrics`) with `owner_uid` indexed on every table + private Storage bucket `edna-uploads` protected by Row Level Security.
- **Express Backend (`server.ts`)**: Server-side Gemini API ecological summaries (`/api/gemini/summarize`), allowlisted NCBI BLAST / BOLD ID online taxonomy proxy (`/api/taxonomy/online`), and server-side second-step admin passcode verification (`/api/admin/*`).

---

## 1. Enable Firebase Authentication & Firestore

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Open **Authentication → Sign-in method** and enable:
   - **Email/Password**
   - **Google** (add your production domain and `localhost` under **Settings → Authorized domains**)
3. Open **Firestore Database → Create database** (Production mode).
4. Deploy the security rules from `firestore.rules` via Firebase CLI (`firebase deploy --only firestore:rules`) or paste `firestore.rules` into **Firestore → Rules**.
5. Register a Web App in **Project Settings → Your apps** and copy the six `VITE_FIREBASE_*` keys into your environment variables.

---

## 2. Configure Supabase Third-Party Auth & Run `schema.sql`

TaxaTrace passes the live Firebase ID token into `@supabase/supabase-js` using the `accessToken` callback so Supabase RLS can enforce `owner_uid = auth.jwt()->>'sub'` without ever exposing a `service_role` key to the browser.

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Enable **Firebase Third-Party Auth** in **Supabase Dashboard → Authentication → Third-Party Auth → Add Provider → Firebase** and enter your Firebase Project ID.
3. Open **SQL Editor** and execute the entire contents of `schema.sql` to create:
   - Tables (`samples`, `sequences`, `taxa_reference`, `assignments`, `diversity_metrics`) with indexed `owner_uid`
   - Row Level Security policies (`owner_uid = auth.jwt()->>'sub'` and admin reads via `(auth.jwt()->>'admin')::boolean`)
   - Private Storage bucket `edna-uploads` with per-user folder policies
   - Curated reference taxa seed records and a sample dataset
4. Copy your **Project URL** (`VITE_SUPABASE_URL`) and **anon public key** (`VITE_SUPABASE_ANON_KEY`). **Never** put `service_role` in any `VITE_*` variable.

### Fallback if Firebase Third-Party Auth Cannot Be Enabled

If your Supabase plan or self-hosted instance does not support Third-Party Firebase JWT verification:
1. Keep Supabase client writes disabled in the browser and route Postgres/Storage calls through authenticated Express endpoints in `server.ts`.
2. Send the Firebase ID token in `Authorization: Bearer <firebaseIdToken>` from the client to `server.ts`.
3. Verify the token server-side with `firebase-admin`'s `verifyIdToken(token)` to obtain the trusted `uid` and `admin` claim, then execute parameterized SQL or Supabase queries scoped explicitly to `where owner_uid = $uid` (or mint a short-lived Supabase-signed JWT containing `sub: uid` and `admin: claim`).

---

## 3. Configure Environment Variables & Secrets

Copy `.env.example` to `.env` (or configure secrets in your hosting platform):

```bash
GEMINI_API_KEY=your_server_side_gemini_key
APP_URL=https://your-domain.example

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_anon_key

# Optional custom path for the hidden admin control plane (default: /control-9x7k)
VITE_ADMIN_ROUTE=/control-9x7k

# Server-only second-step admin passcode (never prefix with VITE_)
ADMIN_PASSCODE=your-long-random-admin-passcode
```

---

## 4. Seed the First Admin Manually

Public registration always writes `role: "user"` and Firestore rules reject any self-assignment of `role` or `disabled`. To seed the first administrator:

1. Create a standard account in Firebase Authentication (or via the public Register page) and note the user's `UID`.
2. Set the Firebase custom claim `admin: true` using the Firebase Admin SDK in a one-off local Node script:

```js
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

initializeApp({ credential: cert(serviceAccount) });

const uid = 'REPLACE_WITH_ADMIN_UID';
await getAuth().setCustomUserClaims(uid, { admin: true });
await getFirestore().collection('users').doc(uid).set(
  { role: 'admin', disabled: false },
  { merge: true },
);
console.log('Seeded first TaxaTrace admin:', uid);
```

3. Ensure `ADMIN_PASSCODE` is set in server environment secrets (if unset during local preview, the control plane offers a one-time first-run passcode claim stored as an `scrypt` hash on the server).
4. Visit your hidden admin route (default `/control-9x7k`), sign in with your admin email/password, and complete Step 2 passcode verification. Anyone without `admin=true` + Firestore `role == 'admin'` receives the standard 404 page.

---

## 5. Run Locally

```bash
npm install
npm run dev
```

Run unit tests for the bioinformatics engine and validation utilities:

```bash
npx --yes tsx --test src/lib/ednaEngine.test.ts src/lib/validation.test.ts
```
