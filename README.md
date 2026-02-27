# AWS S3 Studio – AI Workspace

Modern S3 file workspace with AI search, summaries, and a rich web UI.  
Frontend is a Next.js app in the `web/` folder.

---

### Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind
- **AI**: Google Gemini
- **Auth & DB**: Supabase (OAuth + Postgres)
- **Storage**: Your own AWS S3 bucket

---

### 1. Prerequisites

- Node.js 18+ and npm (or pnpm / yarn)
- A Supabase project
- A Google Cloud project for OAuth (for Google sign‑in)
- An AWS S3 bucket to connect

---

### 2. Local Setup

From the repo root:

```bash
cd web
npm install
```

Create `web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_or_anon_key

GOOGLE_GEMINI_API_KEY=your_gemini_api_key
```

> **Do not commit real keys.** `.env*` is already in `.gitignore`.

Then run the dev server:

```bash
cd web
npm run dev
```

Visit `http://localhost:3000`.

---

### 3. Supabase Setup

1. **Project URL & Key**
   - In Supabase dashboard → **Settings → API**, copy:
     - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
     - Publishable key (or `anon` key) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

2. **Google OAuth provider**
   - Supabase → **Authentication → Providers → Google**:
     - Enable **Sign in with Google**
     - Paste Google **Client ID** and **Client Secret**
     - Callback URL (from Supabase UI) must be added to Google Console (see below).

3. **Database schema**
   - Open Supabase **SQL editor**
   - Paste and run contents of `supabase-schema.sql` from the repo root to create:
     - `users`, `aws_connections`, `files`, `folders`, `activities`
   - This powers metadata and future analytics.

---

### 4. Google OAuth Setup

1. Go to Google Cloud Console → **APIs & Services → Credentials**.
2. Create an **OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs:

```text
http://localhost:3000/auth/callback
```

3. Copy **Client ID** and **Client Secret** into Supabase → **Authentication → Providers → Google**.

Supabase will now accept Google sign‑ins on the `/login` page.

---

### 5. AWS S3 Requirements

This app never stores your AWS keys on the server – they stay in the browser and are sent only to API routes for the current session.

To connect:

1. Have an S3 bucket ready.
2. Use an IAM user with at least:
   - `s3:ListBucket` on the bucket
   - `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on the bucket path
3. In the UI, go to `/connect` and enter:
   - Bucket name
   - Region (e.g. `ap-south-1`)
   - Access key ID and secret access key

---

### 6. Running in Production (high‑level)

After pushing to GitHub:

- **Vercel** (recommended for the `web` app):
  - Import the repo.
  - Set the same env vars in Vercel Project Settings.
  - Use `web/` as the root if you create a monorepo project.

Backend workers or cron jobs can be added later to process files and populate Supabase metadata and embeddings.

---

### 7. Contributing / Forking Notes

If you fork this repo:

1. Create **your own** Supabase project and Google OAuth credentials.
2. Create your own S3 bucket.
3. Fill in `.env.local` with **your** keys and URLs.
4. Run the SQL from `supabase-schema.sql` in your Supabase project.

You should then be able to run `npm run dev` in `web/` and use the app end‑to‑end.

