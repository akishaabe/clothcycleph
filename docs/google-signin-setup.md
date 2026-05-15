# Google Sign-In Setup

ClothCycle uses Google Identity Services. The browser receives a Google ID token from the Google button and sends it to `POST /api/auth/google`; the backend verifies the token audience against `GOOGLE_CLIENT_ID`.

Google Sign-In is treated as a trusted provider flow and bypasses the app's email/password 2FA challenge.

## Local Environment

Frontend `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

Backend `backend/.env`:

```env
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

The frontend and backend client IDs must match exactly.

## Google Cloud Console

Create or use an OAuth 2.0 Client ID with application type **Web application**.

Add these Authorized JavaScript origins for local development:

```text
http://localhost:5173
http://127.0.0.1:5173
```

Add the production frontend origin when deployed.

This Google Identity Services flow does not require a redirect URI or client secret because the frontend receives an ID token and the backend validates that token.

## Cloudflare production checklist

Use the deployed frontend origin as the Google OAuth **Authorized JavaScript origin**:

```text
https://clothcycleph.com
https://<your-cloudflare-pages-project>.pages.dev
```

Do not add `/login`, `/signup`, or `/api/auth/google` as redirect URIs for the current button flow. The app uses the Google Identity Services popup/button callback, then posts the ID token to:

```text
https://api.clothcycleph.com/api/auth/google
```

Production frontend environment:

```env
VITE_API_URL=https://api.clothcycleph.com/api
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
VITE_DISPLAY_TIME_ZONE=Asia/Manila
```

Production Worker configuration:

```text
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
CORS_ORIGIN=https://clothcycleph.com,https://<your-cloudflare-pages-project>.pages.dev
APP_URL=https://clothcycleph.com
```

The frontend stores the ClothCycle JWT in browser storage and sends it through the `Authorization` header, so cross-site cookies are not required for Google sign-in. HTTPS is required for production Google Identity Services and Cloudflare provides it for both custom domains and `pages.dev`.

## Debugging

- If the Google button does not render, check `VITE_GOOGLE_CLIENT_ID`.
- If account selection succeeds but the app shows a backend/network error, check `VITE_API_URL`, backend server status, and `CORS_ORIGIN`.
- If the backend returns an audience mismatch, the frontend and backend Google client IDs are different.
- If backend logs show it cannot contact Google, the server or Worker cannot reach `https://oauth2.googleapis.com/tokeninfo`.
