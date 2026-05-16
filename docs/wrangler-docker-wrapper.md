# Wrangler Docker Wrapper

This is only a Linux wrapper for Wrangler on machines where native Wrangler fails.

It does not run the app backend, does not run local D1, and does not publish ports.

Normal local development stays the same:

```powershell
cd backend
npm.cmd run dev
```

```powershell
cd C:\clothcycle-ph
npm.cmd run dev
```

## Build the wrapper

Run from the project root:

```powershell
docker compose -f docker-compose.wrangler.yml build wrangler
```

## Check Wrangler

```powershell
docker compose -f docker-compose.wrangler.yml run --rm wrangler wrangler --version
```

## Authentication

Do not use browser login inside this Docker wrapper. The container has no desktop browser opener, so `wrangler login` can fail with `Missing file or directory: xdg-open`.

Use a Cloudflare API token instead. Create a local-only file at the project root:

```powershell
notepad .env.wrangler
```

Add this value:

```env
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
```

Then check the token:

```powershell
docker compose -f docker-compose.wrangler.yml run --rm wrangler wrangler whoami
```

`.env.wrangler` is ignored by git through the existing `.env.*` rule, so it stays local to your laptop.

## Remote commands only

Use this wrapper for remote Cloudflare commands, for example:

```powershell
docker compose -f docker-compose.wrangler.yml run --rm wrangler wrangler d1 execute clothcycle --remote --file=src/db/d1-schema.sql
```

```powershell
docker compose -f docker-compose.wrangler.yml run --rm wrangler wrangler deploy
```

Avoid using this wrapper as your app backend. Keep frontend on `5173`, backend on `5000`, and Neon as the database while developing locally.
