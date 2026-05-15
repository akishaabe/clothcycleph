# Google Sign-In Setup

ClothCycle uses Google Identity Services. The browser receives a Google ID token from the Google button and sends it to `POST /api/auth/google`; the backend verifies the token audience against `GOOGLE_CLIENT_ID`.

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

## Debugging

- If the Google button does not render, check `VITE_GOOGLE_CLIENT_ID`.
- If account selection succeeds but the app shows a backend/network error, check `VITE_API_URL`, backend server status, and `CORS_ORIGIN`.
- If the backend returns an audience mismatch, the frontend and backend Google client IDs are different.
- If backend logs show it cannot contact Google, the server or Worker cannot reach `https://oauth2.googleapis.com/tokeninfo`.
