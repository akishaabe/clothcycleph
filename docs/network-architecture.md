# Network Architecture

```mermaid
flowchart TD
  subgraph Client["Client Network"]
    Browser[User browser]
  end

  subgraph Edge["Cloudflare Edge"]
    Pages[Static frontend / Pages]
    Worker[ClothCycle PH Worker API]
    R2[(R2 bucket)]
    D1[(D1 database)]
    Secrets[Worker secrets]
  end

  subgraph External["External Services"]
    Email[Brevo / SendGrid / Resend email API]
    Google[Google Identity Services]
  end

  Browser -- HTTPS --> Pages
  Browser -- HTTPS API calls with bearer token --> Worker
  Worker -- SQL binding --> D1
  Worker -- object upload/download --> R2
  Worker -- reads runtime secrets --> Secrets
  Worker -- HTTPS email requests --> Email
  Worker -- HTTPS token verification --> Google
  Worker -- signed/public upload URLs or proxied file reads --> Browser
```

## Production Network Flow

1. Browser loads the React/Vite static frontend.
2. Frontend sends authenticated API requests to the Hono Worker API.
3. Worker verifies JWT/session state and applies role guards.
4. Worker reads/writes the D1 database for users, submissions, DSS records, requests, messages, notifications, tracking, and admin records.
5. Worker uploads or retrieves images and attachments through R2.
6. Worker sends verification, two-factor, and password-reset emails through the configured email provider.
7. Google login uses Google Identity verification from the backend.

## Local Development Network Flow

```mermaid
flowchart LR
  Browser[Browser localhost] --> Vite[Vite dev server :5173]
  Vite --> Api[Local Hono API :5000 or Wrangler dev]
  Api --> Db[(Local PostgreSQL or D1 dev database)]
  Api --> Uploads[Local/R2-compatible uploads]
  Api --> Email[Console or configured email provider]
```

## Network Security Notes

- The browser does not connect directly to the database.
- The browser does not receive backend secrets.
- Worker secrets should hold `JWT_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`, and the chosen email API key.
- R2 bucket access is mediated by the backend upload/download routes or public base URL configuration.
- CORS is controlled by configured origins and localhost dev allowances.
