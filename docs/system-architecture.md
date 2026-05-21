# ClothCycle PH System Architecture

## Architecture Overview

ClothCycle PH uses a layered web application architecture. The frontend handles role-based user interaction, the backend exposes Hono API routes and business logic, the DSS engine evaluates textile submissions, and Neon PostgreSQL stores transactional, DSS, audit, messaging, and notification data.

```mermaid
flowchart TD
  A[Users] --> F[React + Vite Frontend]
  B[Partners] --> F
  C[Admins] --> F

  F --> G[Hono Backend API]

  G --> H[Auth and Role Guard Module]
  G --> I[Submission Module]
  G --> J[DSS Engine Module]
  G --> K[Partner Request Module]
  G --> L[Messages and Notifications Module]
  G --> M[Admin Management Module]

  H --> DB[(Neon PostgreSQL)]
  I --> DB
  J --> DB
  K --> DB
  L --> DB
  M --> DB

  G --> O[Google OAuth]
  G --> P[Email / OTP Service]
  G --> Q[File Upload Storage]

  R[Cloudflare Workers Target] -. deploys .-> G
  S[Cloudflare R2 Future Storage] -. future .-> Q
```

## Main Components

| Layer | Component | Responsibility |
|---|---|---|
| Presentation Layer | React + Vite frontend | Login, registration, dashboards, textile submission, DSS confirmation, messages, notifications, settings |
| API Layer | Hono backend | Handles REST API requests, authentication checks, role checks, validation, and service orchestration |
| Decision Support Layer | DSS Engine | Evaluates textile details and burn-test answers, ranks Recycle / Donate / Upcycle, records audit trail |
| Data Layer | Neon PostgreSQL | Stores users, partners, submissions, DSS runs/results, transactions, messages, notifications, admin logs |
| External Services | Google OAuth, Email/OTP, file storage | Account sign-in, verification, reset flows, uploaded images and attachments |
| Deployment Target | Cloudflare Workers | Planned runtime target for the Hono backend |

## User Flow

1. User registers or logs in.
2. User submits textile details, optional burn-test answers, images, and intended pathway.
3. Backend saves the submission to Neon PostgreSQL.
4. DSS Engine evaluates the saved answers.
5. DSS confirmation page shows ranked Recycle / Donate / Upcycle recommendations.
6. User selects the final pathway and sends the request to a partner.
7. Partner views the request, DSS explanation, images, and user brief.
8. Partner accepts, declines, or completes the request.
9. User receives notification and can track status from request pages.

## Partner Flow

1. Partner logs in through partner account.
2. Partner views assigned textile requests.
3. Partner reviews item details, DSS reasoning, user brief, and uploaded images.
4. Partner updates the request status.
5. System notifies the user.
6. Partner may submit rule/preference change requests to admin.

## Admin Flow

1. Admin logs in through admin dashboard.
2. Admin manages users, partners, submissions, DSS records, and system activity.
3. Admin reviews partner rule change requests.
4. Admin accepts, declines, or asks for more information.
5. System records audit activity and notifies the partner.

## DSS Architecture

```mermaid
flowchart LR
  A[Submission Form Answers] --> B[Submission Records]
  C[Burn Test Answers] --> B
  B --> D[DSS Engine]
  D --> E[Eligibility Screening]
  D --> F[Burn Test Fabric Analysis]
  D --> G[Weighted Pathway Scoring]
  E --> H[Recommendation Results]
  F --> H
  G --> H
  H --> I[DSS Confirmation Page]
  H --> J[Recommendation Audit Trail]
  I --> K[Partner Request]
```

The DSS engine currently scores Recycle, Donate, and Upcycle. Buyback is not a scored DSS pathway. It is a yes/no preference shown only when the final selected pathway is Upcycle.

## Database Groups

| Group | Tables |
|---|---|
| Identity and Auth | `users`, `user_preferences`, `password_reset_tokens`, `user_recovery_codes`, `auth_events`, `rate_limits` |
| Partner Management | `partners`, `partner_rule_change_requests` |
| Textile Submission | `submissions`, `submission_details`, `burn_tests`, `submission_images` |
| DSS Audit | `recommendation_runs`, `recommendation_results`, `recommendation_feedback`, `dss_rules` |
| Transactions | `transactions` |
| Communication | `conversations`, `messages`, `message_attachments`, `notifications` |
| Administration | `activity_logs`, `schema_migrations` |

## Deployment View

```mermaid
flowchart TD
  A[Browser Client] --> B[Cloudflare Pages / Static Frontend]
  B --> C[Hono API on Cloudflare Workers]
  C --> D[(Neon PostgreSQL)]
  C --> E[Google OAuth]
  C --> F[Email Provider]
  C --> G[Cloudflare R2 Future Storage]
```

For local QA, the frontend runs with Vite and points to the local Hono backend through `VITE_API_URL`. For deployment, the same Hono API is intended to run on Cloudflare Workers while continuing to use Neon PostgreSQL as the production database.
