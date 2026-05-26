# Diagram Notes

## Files And Flows Inspected

- Frontend routes: `src/routes.jsx`
- User submission flow: `src/app/pages/SubmissionFormPage.jsx`
- Recommendation confirmation flow: `src/app/pages/DssConfirmationPage.jsx`
- User dashboard and request history: `src/app/pages/UserDashboard.jsx`, `src/app/pages/SubmittedRequestsPage.jsx`, `src/app/pages/DssRequestsPage.jsx`
- Partner dashboard and request handling: `src/app/pages/PartnerDashboard.jsx`
- Admin dashboard and deleted-records page: `src/app/pages/AdminDashboard.jsx`, `src/app/pages/AdminDeletedRecordsPage.jsx`
- Messages and notifications pages: `src/app/pages/MessagesPage.jsx`, `src/app/pages/NotificationsPage.jsx`
- API routes: `backend/src/honoLocalApp.ts`
- Submission and tracking controllers: `backend/src/controllers/submissionController.ts`
- DSS request and partner rule controllers: `backend/src/controllers/dssController.ts`
- Transaction controller: `backend/src/controllers/transactionController.ts`
- Admin controller: `backend/src/controllers/adminController.ts`
- DSS engine: `backend/src/services/dssEngine.ts`
- D1 service equivalents: `backend/src/services/d1DssService.ts`, `backend/src/services/d1SubmissionService.ts`, `backend/src/services/d1TransactionService.ts`
- Schema sources: `backend/src/db/migrations/*.sql`, `backend/src/db/d1-schema.sql`

## Changes Reflected Compared To The Older Flow Images

- The older diagram shows a more manual pathway selection and older external partner handoff. The current implementation saves a submission first, opens a DSS confirmation page, then sends a selected pathway and partner request.
- Current DSS output is stored in `recommendation_runs` and `recommendation_results`, including the selected result and output payload.
- Current partner handoff creates a `transactions` row used as the partner request record.
- Partner decisions currently normalize to `pending`, `accepted`, `rejected`, or `completed`.
- A tracking/delivery-details flow now appears after a partner accepts the request.
- User tracking updates create both notifications and automatic messages for the partner.
- Partner completion can include outcome title, description, and photos, then notifies/messages the user with a celebration-style update.
- Admin flow now includes DSS rules, partner rule-change requests, DSS audit/export, user/submission management, and deleted-record review.

## Assumptions Made

- The diagrams describe implemented app behavior, not planned-only behavior.
- `transactions` is treated as the partner request table because all current DSS partner request views and status updates use it.
- Partner request statuses are shown using the normalized current flow: `pending`, `accepted`, `rejected`, `completed`.
- Tracking is shown only after an accepted partner request because the current backend rejects tracking updates unless the request status is `accepted`.
- Partner rule-change statuses include values seen in schema and controller logic. The controller currently allows `pending`, `accepted`, `declined`, and `needs_more_information`; the schema also supports `approved` and `implemented`.

## Missing Or Not Shown As Completed

- The system does not appear to run a fully external logistics integration. Tracking uses user-entered courier/drop-off details.
- Carbon footprint values are stored as estimated route context on the request, not as a full audited carbon-accounting calculation.
- The DSS is rule-based and explainable; it is not shown as an AI/ML classifier.
- Admin DSS rule records exist, but the core `dssEngine.ts` still contains the primary rule logic used for recommendations in the inspected code path.
