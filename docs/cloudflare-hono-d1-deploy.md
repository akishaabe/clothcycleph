# Cloudflare Hono + D1 Deployment Notes

Use the Hono Worker in `backend/src/worker.ts` as the deployment backend.

## Local D1 schema apply

```bash
cd backend
npm ci
npm run d1:apply:local
```

Note for Windows ARM64 machines: the frontend native packages include Windows
ARM64 builds (`esbuild`, Rollup, Tailwind Oxide), but Wrangler's local Worker
runtime currently installs `@cloudflare/workerd-windows-64` and not a native
`workerd-windows-arm64` package. If `wrangler dev` or local D1 fails with
`Unsupported platform: win32 arm64 LE`, use one of these paths:

- Run the backend commands in WSL2 Ubuntu with ARM64 Linux Node, where
  `@cloudflare/workerd-linux-arm64` is available.
- Use Windows x64 Node under emulation and regenerate `backend/node_modules`
  with `npm ci`.
- Skip local Worker emulation and use remote D1 / Cloudflare dry-run deploy
  commands from a supported environment.

This project pins Wrangler locally in `backend/package.json`. Use `npm run ...`
from `backend` instead of relying on a global Wrangler install. On Windows
PowerShell systems with script execution disabled, call `npm.cmd` directly:

```powershell
cd backend
npm.cmd ci
npm.cmd exec wrangler -- --version
npm.cmd run worker:build
npm.cmd exec wrangler -- deploy --dry-run --outdir .wrangler-dry-run
```

The frontend build uses Vite/Rollup/esbuild packages that include Windows ARM64
optional binaries. The backend Worker build now avoids Node-only auth imports in
the Worker path, so Cloudflare bundling does not need Node built-in polyfills for
JWT/password utilities.

## Remote D1 schema apply

After `backend/wrangler.toml` has the real D1 `database_id`:

```bash
cd backend
npm ci
npm run d1:apply:remote
```

## Deploy verification

Before publishing:

```bash
cd backend
npm run worker:build
npm exec wrangler -- deploy --dry-run --outdir .wrangler-dry-run
```

To publish after configuring real `database_id`, R2 bucket, routes, and secrets:

```bash
cd backend
npm run deploy
```

If Wrangler warns that multiple environments are defined, either deploy the
top-level configuration intentionally with `npm exec wrangler -- deploy --env=""`
or add all required bindings and vars under the target environment before using
`--env production`.

## Required Cloudflare bindings / secrets

- `DB`: D1 database binding
- `R2_BUCKET`: R2 bucket binding
- `JWT_SECRET`: Wrangler secret
- `TWO_FACTOR_ENCRYPTION_KEY`: Wrangler secret
- `SENDGRID_API_KEY` or `BREVO_API_KEY`: Wrangler secret when email sending is enabled
- `CORS_ORIGIN`: comma-separated frontend origins
- `APP_URL`: deployed frontend URL
- `GOOGLE_CLIENT_ID`: Google OAuth Web Client ID, matching `VITE_GOOGLE_CLIENT_ID`
- `R2_PUBLIC_BASE_URL`: Worker public URL, used for `/api/uploads/:key`

Images are stored in R2. The database stores image URLs, storage keys, labels, and metadata only.

## Timestamp policy

D1 `CURRENT_TIMESTAMP` values are UTC and may look like
`2026-05-15 12:30:00`. The Worker normalizes top-level timestamp fields to
explicit UTC strings before JSON responses, and the frontend formats display
dates with `Asia/Manila` by default. Override with `VITE_DISPLAY_TIME_ZONE` only
if the app is deployed for another locale.
