# New Revised System Architecture

## Architecture Overview

ClothCycle PH is a role-based web application with a React frontend, Hono API layer, rule-based DSS engine, Cloudflare Worker deployment target, and a D1-compatible database schema. The project also retains PostgreSQL migrations for local or alternate deployment paths.

```mermaid
flowchart TD
  Users[Users, Partners, Admins] --> Frontend[React + Vite Frontend]
  Frontend --> AuthContext[Auth Context and Protected Routes]
  Frontend --> ApiClient[API Client]

  ApiClient --> Worker[Hono API on Cloudflare Worker]
  ApiClient -. local dev .-> LocalApi[Local Hono API]

  Worker --> Auth[Auth and Security Services]
  Worker --> Submission[Submission and Tracking Services]
  Worker --> DSS[DSS Engine and Partner Handoff]
  Worker --> Messaging[Messages and Notifications]
  Worker --> Admin[Admin and Audit Services]
  Worker --> Uploads[Upload Service]
  Worker --> GIS[Partner Location Service]

  LocalApi --> Auth
  LocalApi --> Submission
  LocalApi --> DSS
  LocalApi --> Messaging
  LocalApi --> Admin
  LocalApi --> Uploads
  LocalApi --> GIS

  Auth --> DB[(D1 / PostgreSQL-compatible database)]
  Submission --> DB
  DSS --> DB
  Messaging --> DB
  Admin --> DB
  GIS --> DB
  Uploads --> R2[(Cloudflare R2 or local upload target)]

  Auth --> Email[Brevo, SendGrid, Resend, or console email provider]
  Auth --> Google[Google Identity]
```

## Main Layers

| Layer | Current components | Responsibility |
|---|---|---|
| Presentation | React, Vite, React Router, AuthContext, role-protected routes | Landing, login/signup, dashboards, submission wizard, DSS review, my requests, messages, notifications, settings, admin pages |
| API | `backend/src/worker.ts`, `backend/src/honoLocalApp.ts` | REST API, CORS, secure headers, request validation, authentication, role checks |
| Auth | `authD1Service`, JWT utilities, email/TOTP 2FA, password reset, Google login | Signup, login, session restore, verification, forgot/reset password, security events |
| Submission | `d1SubmissionService` | Textile submissions, detailed textile answers, burn tests, images, delivery tracking updates |
| DSS | `dssEngine`, `d1DssService`, `d1GisService` | Eligibility screening, pathway scoring, recommendation audit, partner suggestions, route/bag context, partner handoff |
| Partner Requests | `transactions` through DSS and transaction services | Pending, accepted, rejected, completed partner request lifecycle |
| Communication | `d1MessageService`, `d1NotificationService` | Automatic request messages, tracking messages, outcome messages, notification counts/preferences |
| Admin | Admin routes/services and dashboard pages | User/partner management, required partner location, submission status, DSS rules, rule-change requests, deleted records |
| Storage | R2 upload service and `uploaded_files` registry | Submission images, message attachments, partner outcome photos |

## Current Frontend Route Map

- Public: `/`, `/login`, `/signup`, `/terms`, `/privacy`
- User: `/dashboard`, `/submit`, `/dss/:submissionId`, `/dss-requests`, `/my-requests`
- Partner: `/partner`
- Admin: `/admin`, `/admin/deleted-records`
- Shared protected: `/settings`, `/notifications`, `/messages`

## Current Data Architecture

```mermaid
flowchart LR
  Users[(users)] <--> Partners[(partners)]
  Users --> Submissions[(submissions)]
  Submissions --> Details[(submission_details)]
  Submissions --> Burn[(burn_tests)]
  Submissions --> Images[(submission_images)]
  Submissions --> Runs[(recommendation_runs)]
  Runs --> Results[(recommendation_results)]
  Results --> Transactions[(transactions)]
  Transactions --> Tracking[(request_tracking_updates)]
  Transactions --> Messages[(messages)]
  Transactions --> Notifications[(notifications)]
  Messages --> Attachments[(message_attachments)]
  Uploads[(uploaded_files)] --> Images
  Uploads --> Attachments
  Uploads --> Transactions
  Admin[(admin users)] --> Rules[(dss_rules)]
  Partners --> RuleRequests[(partner_rule_change_requests)]
  RuleRequests --> RuleReplies[(partner_rule_change_request_replies)]
  Admin --> Deleted[(deleted_records)]
```

## DSS Architecture

The DSS is an explainable rule-based module. It reads saved submission data, screens restricted categories and unsafe contamination, optionally analyzes burn-test observations, scores Donate/Recycle/Upcycle, generates matched/not-matched/skipped criteria, and saves the selected recommendation when the user sends it to a partner.

Buyback is not scored as a standalone DSS route in the current engine. It is stored as an upcycle-related user preference when applicable.

## Runtime And Deployment View

```mermaid
flowchart TD
  Browser[Browser] --> Pages[Static frontend host]
  Pages --> Worker[Cloudflare Worker API]
  Worker --> D1[(Cloudflare D1 database)]
  Worker --> R2[(Cloudflare R2 bucket)]
  Worker --> Email[Configured email provider]
  Worker --> Google[Google Identity verification]

  DevBrowser[Local browser] -.-> Vite[Vite dev server]
  Vite -.-> LocalHono[Local Hono API]
  LocalHono -.-> LocalDb[(Local PostgreSQL or D1 dev DB)]
  LocalHono -.-> LocalStorage[Local/R2-compatible upload target]
```

## Security And Access Control

- API routes use bearer JWT authentication for protected requests.
- Role guards restrict user, partner, and admin dashboards and endpoints.
- Partner request updates require the assigned partner, partner email match, or admin.
- Tracking updates can only be created by the request owner after the partner request is accepted.
- Partner locations are required for partner accounts because they are displayed during DSS partner selection.
- Secrets such as `JWT_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`, and email API keys are server-side only.
