# Diagram Notes

## Files And Flows Inspected

- Frontend routing: `src/routes.jsx`
- User submission and DSS review pages: `src/app/pages/SubmissionFormPage.jsx`, `src/app/pages/DssConfirmationPage.jsx`
- User dashboard/request pages: `src/app/pages/UserDashboard.jsx`, `src/app/pages/DssRequestsPage.jsx`, `src/app/pages/SubmittedRequestsPage.jsx`
- Partner dashboard/request handling: `src/app/pages/PartnerDashboard.jsx`
- Admin dashboard/deleted records: `src/app/pages/AdminDashboard.jsx`, `src/app/pages/AdminDeletedRecordsPage.jsx`
- Messages and notifications: `src/app/pages/MessagesPage.jsx`, `src/app/pages/NotificationsPage.jsx`
- Worker API routes: `backend/src/worker.ts`
- Local Hono API routes: `backend/src/honoLocalApp.ts`
- DSS engine and handoff: `backend/src/services/dssEngine.ts`, `backend/src/services/d1DssService.ts`
- Submission/tracking: `backend/src/services/d1SubmissionService.ts`
- Messages/notifications: `backend/src/services/d1MessageService.ts`, `backend/src/services/d1NotificationService.ts`
- Uploads/storage: `backend/src/services/d1UploadService.ts`
- Partner locations: `backend/src/services/d1GisService.ts`
- Schema sources: `backend/src/db/d1-schema.sql`, `backend/src/db/migrations/*.sql`, `backend/src/db/d1-migrations/*.sql`

## What Changed Compared With The Older Flow Images

- The older flow images included a more manual pathway route before persistence. The current app saves a submission first, then opens a DSS confirmation page for recommendation review.
- The current implementation uses `transactions` as the partner request record.
- DSS handoff now saves `recommendation_runs` and `recommendation_results`, including selected output payload data.
- Bag color is now part of the partner request context: green for donation, white for recycling, black for upcycling.
- Weight is now captured on `submission_details`.
- The accepted-request logistics flow is now implemented through `request_tracking_updates`.
- Partner completion can include narrative outcome title, description, and photos on `transactions`.
- User and partner updates use both `notifications` and `messages` where the current service flow supports it.
- Admin now has deleted-record review, DSS rule management, partner rule-change review, and partner-location requirements.
- Uploaded files are tracked in `uploaded_files`, with R2 used in the Worker path.

## Assumptions Kept Explicit

- The diagrams show implemented behavior from the current codebase, not future-only ideas.
- Lightweight route/carbon context is shown as an estimate because the code stores `estimated_distance_km` and `estimated_carbon_kg`, not a full audited carbon accounting model.
- The DSS is shown as a rule-based decision support system, not an AI/ML classifier.
- External courier APIs are not shown because tracking is user-entered.
- Partner rule records exist in the admin UI/schema, but the main recommendation scoring logic currently lives in `dssEngine.ts`.
