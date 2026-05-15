# Cloudflare Hono + D1 Deployment Notes

Use the Hono Worker in `backend/src/worker.ts` as the deployment backend.

## Local D1 schema apply

```bash
cd backend
npm run d1:apply:local
```

Note for Windows ARM64 machines: Wrangler's local Worker runtime depends on
`workerd`, which may fail with `Unsupported platform: win32 arm64 LE`. If that
happens, use WSL2, an x64 Node environment, or apply the schema to remote D1
instead.

## Remote D1 schema apply

After `backend/wrangler.toml` has the real D1 `database_id`:

```bash
cd backend
npm run d1:apply:remote
```

## Required Cloudflare bindings / secrets

- `DB`: D1 database binding
- `R2_BUCKET`: R2 bucket binding
- `JWT_SECRET`: Wrangler secret
- `TWO_FACTOR_ENCRYPTION_KEY`: Wrangler secret
- `SENDGRID_API_KEY` or `BREVO_API_KEY`: Wrangler secret when email sending is enabled
- `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`: Wrangler secrets when SMS 2FA is enabled
- `CORS_ORIGIN`: comma-separated frontend origins
- `APP_URL`: deployed frontend URL
- `R2_PUBLIC_BASE_URL`: Worker public URL, used for `/api/uploads/:key`

Images are stored in R2. The database stores image URLs, storage keys, labels, and metadata only.
