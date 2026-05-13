# Cloudflare Workers and D1 Deployment Guide

ClothCycle's backend API is now implemented in the Cloudflare Worker at `src/worker.ts`. The Worker uses Hono, D1 for relational data, and R2 for uploads. The Express server remains in the repository as a legacy/local backend, but deployed Cloudflare traffic no longer depends on an Express fallback proxy.

## Ported Worker Endpoints

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/auth/2fa/verify`
- `POST /api/auth/2fa/resend`
- `GET /api/auth/2fa/status`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/enable`
- `POST /api/auth/2fa/disable`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/profile`
- `PUT /api/auth/profile`
- `POST /api/submissions`
- `GET /api/submissions`
- `GET /api/submissions/:id`
- `PUT /api/submissions/:id/status`
- `GET /api/gis/partners`
- `GET /api/dss/partners`
- `GET /api/dss/submissions/:submissionId`
- `POST /api/dss/send`
- `GET /api/dss/requests/user`
- `GET /api/dss/requests/partner`
- `POST /api/dss/requests/:id/remind`
- `PUT /api/dss/requests/:id/status`
- `GET /api/messages/contacts`
- `GET /api/messages/conversations`
- `GET /api/messages/:userId`
- `POST /api/messages`
- `PUT /api/messages/:id/read`
- `POST /api/upload`
- `GET /api/notifications`
- `GET /api/notifications/count`
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/read-all`
- `POST /api/transactions`
- `GET /api/transactions/submission/:submissionId`
- `GET /api/transactions/user`
- `GET /api/transactions/partner/:partnerId`
- `PUT /api/transactions/:id`

## Deployment Steps

1. Create the D1 database.

```bash
npx wrangler d1 create clothcycle
```

2. Copy the returned `database_id` into `wrangler.toml`.

```toml
[[d1_databases]]
binding = "DB"
database_name = "clothcycle"
database_id = "your-database-id"
```

3. Apply the D1 schema from the backend directory.

```bash
npx wrangler d1 execute clothcycle --file ./src/db/d1-schema.sql
```

4. Create or bind the R2 bucket named in `wrangler.toml`.

```bash
npx wrangler r2 bucket create clothcycle-uploads
```

5. Set production secrets in Cloudflare. Do not keep real secrets in `wrangler.toml`.

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put TWO_FACTOR_ENCRYPTION_KEY
npx wrangler secret put SENDGRID_API_KEY
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
```

6. Build and deploy.

```bash
npm run worker:build
npm run deploy
```

7. Point the frontend to the Worker.

```env
VITE_API_URL=https://clothcycle-api.your-subdomain.workers.dev/api
```

## Local Worker Development

```bash
cd backend
npx wrangler dev
```

Use this frontend setting for local Worker testing:

```env
VITE_API_URL=http://localhost:8787/api
```

## Notes

- `BACKEND_ORIGIN` is no longer used because the Worker does not proxy to Express.
- Queue-backed jobs were replaced with direct D1 side effects for migrated routes, such as creating notifications when transactions change.
- GIS partner discovery uses partner coordinates in D1 and returns `distance_km` plus rank reasoning when `lat` and `lng` are supplied.
- SMS 2FA uses Twilio over `fetch` in the Worker. Configure `SMS_PROVIDER=twilio`, `TWILIO_FROM_NUMBER`, and store `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` as secrets.
