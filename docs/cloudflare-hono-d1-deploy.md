# Cloudflare / Hono Deployment Notes

## Current QA Backend

The backend used for QA is:

- Hono on Node via `backend/src/index.ts`
- API routes in `backend/src/honoLocalApp.ts`
- Neon Postgres through `backend/src/config/database.ts`
- Local URL: `http://localhost:5000/api`

Run it with:

```powershell
cd backend
npm.cmd run dev
```

The frontend should point at:

```env
VITE_API_URL=http://localhost:5000/api
```

## Worker Status

`backend/src/worker.ts` is a Cloudflare Worker/Hono entry, but it currently uses
the D1 service layer. That means it is **not the production path** if the final
database is Neon Postgres.

Do not deploy the Worker as the production API until one of these decisions is
made:

1. Keep Neon: replace D1 services with a Worker-compatible Neon adapter.
2. Switch to D1: apply and maintain `backend/src/db/d1-schema.sql` as the source
   of truth.

For the current thesis QA flow, use Hono + Neon locally.

## Wrangler Wrapper

Windows ARM64 can fail on native Wrangler/workerd. Use the Docker wrapper only
for Wrangler commands:

```powershell
docker compose -f docker-compose.wrangler.yml run --rm wrangler wrangler --version
```

Cloudflare API tokens should go in a local-only `.env.wrangler` file at project
root:

```env
CLOUDFLARE_API_TOKEN=your_token_here
```

## Required Local Backend Env

`backend/.env` must define:

```env
DATABASE_URL=
JWT_SECRET=
TWO_FACTOR_ENCRYPTION_KEY=
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
APP_URL=http://localhost:5173
GOOGLE_CLIENT_ID=
EMAIL_PROVIDER=console
```

The backend now fails in production if `DATABASE_URL`, `JWT_SECRET`, or
`TWO_FACTOR_ENCRYPTION_KEY` is missing.

## Required Worker Secrets Later

When the Worker path is ready, set these with Wrangler secrets instead of
committing them to `wrangler.toml`:

```powershell
cd backend
docker compose -f ..\docker-compose.wrangler.yml run --rm wrangler wrangler secret put JWT_SECRET
docker compose -f ..\docker-compose.wrangler.yml run --rm wrangler wrangler secret put TWO_FACTOR_ENCRYPTION_KEY
docker compose -f ..\docker-compose.wrangler.yml run --rm wrangler wrangler secret put SENDGRID_API_KEY
```

## Upload Policy

Current QA local uploads:

- accept images only
- reject files above 5 MB
- save to local `backend/uploads` when R2 is not configured

Production Worker uploads must use R2. Cloudflare Workers cannot write to local
disk and should not buffer large user files beyond the configured limit.

## Pre-Merge Checks

```powershell
npm.cmd run build
cd backend
npm.cmd run build
npm.cmd run worker:build
npm.cmd test -- --run
```

## Timestamp Policy

Database timestamps are treated as UTC by the backend. The frontend formats
dates in the viewer's browser timezone, so users in PH, Australia, US, or other
regions see times localized to their own device.
