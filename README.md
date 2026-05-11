# PTDMS

Personnel Training & Development Management System

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Zustand
- React Hook Form + Zod
- Supabase Auth + PostgreSQL + RLS

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Set Supabase values in `.env`:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Run the dev server:

```bash
npm run dev
```

## Supabase

Initial database migrations are in:

```text
supabase/migrations/202605080001_auth_rbac_foundation.sql
supabase/migrations/202605080002_training_domain_schema.sql
```

Apply them to your Supabase project in filename order before testing authentication, RBAC, dashboard, and training records with real data.

## Phase 1 Supabase Setup

1. Create `.env` from `.env.example` and set real Supabase values:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

2. Open Supabase SQL Editor and run migrations in order:

```text
supabase/migrations/202605080001_auth_rbac_foundation.sql
supabase/migrations/202605080002_training_domain_schema.sql
```

3. In Supabase Authentication settings, configure redirect URLs:

```text
http://127.0.0.1:5173/auth/callback
http://127.0.0.1:5173/reset-password
```

4. Enable email confirmation if the organization requires verified users before login.

5. Start the app:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

6. Test these flows:

- Register
- Email verification
- Login
- Forgot password
- Reset password
- Logout
- Role-based route access
- Dashboard summary
- Training records table
