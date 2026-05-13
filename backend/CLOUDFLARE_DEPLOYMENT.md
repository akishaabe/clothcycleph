# Cloudflare Workers & D1 Deployment Guide

## Overview

ClothCycle has been migrated to run on Cloudflare Workers with D1 (SQLite) database. This guide explains the deployment process.

### What's Been Done

✅ **Worker Setup**
- `backend/src/worker.ts` - Hono-based API gateway running auth endpoints on D1
- Auth endpoints fully ported: signup, login, 2FA verify, profile get/update
- Fallback proxy for other endpoints (until fully ported)

✅ **D1 Database**
- `backend/src/db/d1-schema.sql` - SQLite schema for D1
- `backend/src/config/d1.ts` - D1 client module with query helpers
- `backend/src/services/authD1Service.ts` - Auth logic ported to D1

✅ **R2 Storage**
- Already configured in existing `r2Service.ts`
- Uses Cloudflare's S3-compatible API

✅ **Configuration**
- `backend/wrangler.toml` - Updated with D1 and R2 bindings

---

## Deployment Steps

### 1. Create D1 Database on Cloudflare

```bash
# Create a new D1 database
npx wrangler d1 create clothcycle

# This will output a database_id - copy it
```

Then update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "clothcycle"
database_id = "your-database-id-here"
```

### 2. Initialize the D1 Schema

```bash
# Apply the D1 schema to your database
npx wrangler d1 execute clothcycle --file ./src/db/d1-schema.sql
```

Verify the schema was created:
```bash
npx wrangler d1 execute clothcycle --command "SELECT name FROM sqlite_master WHERE type='table';"
```

### 3. Build the Worker

```bash
# From backend directory
npm run build
# or
npm run worker:build
```

### 4. Deploy the Worker

```bash
# Deploy to Cloudflare Workers
npx wrangler deploy

# Output will show your worker URL, e.g.:
# https://clothcycle-api.yourusername.workers.dev/api/health
```

### 5. Test the Worker

```bash
# Test health endpoint
curl https://clothcycle-api.yourusername.workers.dev/api/health

# Test signup
curl -X POST https://clothcycle-api.yourusername.workers.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","password":"Password123!"}'
```

### 6. Update Frontend API Endpoint

In `src/services/api.ts`, update the API base URL:

```typescript
const API_BASE_URL = 'https://clothcycle-api.yourusername.workers.dev/api';
```

Or use environment variable:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://clothcycle-api.yourusername.workers.dev/api';
```

Update `.env`:
```
VITE_API_URL=https://clothcycle-api.yourusername.workers.dev/api
```

### 7. Deploy Frontend

```bash
# From root directory
npm run build
npm run preview
# Or deploy to your hosting (Vercel, Netlify, etc.)
```

---

## Local Development

For local testing before deployment:

### Start the Worker Locally

```bash
# From backend directory
npx wrangler dev

# Worker will run at http://localhost:8787/api
```

### Update Frontend for Local Dev

In `.env` or `src/services/api.ts`:
```
VITE_API_URL=http://localhost:8787/api
```

---

## Current Status

### ✅ Ported to D1
- Auth: signup, login, 2FA verification
- Auth: profile get, profile update
- User management with security features
- Rate limiting
- Auth event logging

### 🔄 In Progress
- Message endpoints
- Submission endpoints
- Notification endpoints
- Transaction endpoints
- Upload endpoints

### ⚠️ Fallback Proxy
- Unmigrated endpoints proxy to Express backend (if BACKEND_ORIGIN is set)
- Set `BACKEND_ORIGIN=https://your-express-backend.com` in `wrangler.toml`

---

## Environment Variables

Set these in `wrangler.toml` or Cloudflare Dashboard:

```toml
[vars]
EMAIL_PROVIDER = "sendgrid"  # or "brevo", "console"
BREVO_API_KEY = "your-brevo-key"
SENDGRID_API_KEY = "your-sendgrid-key"
EMAIL_FROM = "noreply@clothcycleph.com"
JWT_SECRET = "your-jwt-secret"
TWO_FACTOR_ENCRYPTION_KEY = "your-encryption-key"
BACKEND_ORIGIN = "https://express-backend.example.com"  # For fallback proxy
```

---

## Next Steps

1. **Port Remaining Endpoints** - Create D1 versions of submission, message, notification, and transaction controllers
2. **Remove Express Proxy** - Once all endpoints are ported, remove the fallback proxy
3. **Migrate Data** - Set up data migration from PostgreSQL to D1
4. **Edge Locations** - Deploy to multiple regions for better global performance
5. **Analytics** - Set up Cloudflare analytics and monitoring

---

## Troubleshooting

### "DB binding is undefined"
- Ensure D1 database is bound in `wrangler.toml`
- Run `npx wrangler d1 create clothcycle` if not created

### "Table does not exist"
- Verify schema was applied: `npx wrangler d1 execute clothcycle --command "SELECT name FROM sqlite_master WHERE type='table';"`
- Re-apply schema if needed: `npx wrangler d1 execute clothcycle --file ./src/db/d1-schema.sql`

### "CORS errors"
- CORS is configured in `worker.ts` but verify origin is allowed
- Check `c.req.header('origin')` in cors middleware

### Worker deployment fails
- Run `npm run worker:build` to check TypeScript errors
- Ensure `wrangler.toml` is valid
- Check `npm run build` passes

---

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [D1 Database Guide](https://developers.cloudflare.com/d1/)
- [R2 Object Storage](https://developers.cloudflare.com/r2/)
- [Hono Framework](https://hono.dev/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
