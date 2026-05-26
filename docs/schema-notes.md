# ClothCycle PH Schema Notes

## Files Inspected

- `backend/src/db/d1-schema.sql`
- `backend/src/db/migrations/*.sql`
- `backend/src/db/d1-migrations/*.sql`
- `backend/src/worker.ts`
- `backend/src/honoLocalApp.ts`
- `backend/src/services/authD1Service.ts`
- `backend/src/services/d1SubmissionService.ts`
- `backend/src/services/d1DssService.ts`
- `backend/src/services/d1TransactionService.ts`
- `backend/src/services/d1MessageService.ts`
- `backend/src/services/d1NotificationService.ts`
- `backend/src/services/d1UploadService.ts`
- `backend/src/services/d1GisService.ts`
- `backend/src/services/dssEngine.ts`
- `src/routes.jsx`
- Current dashboard, submission, DSS confirmation, messages, notifications, and admin pages.

## Source Of Truth Used

`docs/clothcycle-current-schema.dbml` is based primarily on `backend/src/db/d1-schema.sql`, because that file is the current consolidated Cloudflare Worker/D1 schema. The PostgreSQL migration files and D1 migration files were also checked so recent changes were not missed.

The running database was not introspected in this pass. The documentation is project-source based: schema files, migrations, Worker routes, local Hono routes, and service reads/writes.

## Current Schema Highlights

- `users` stores auth profile data, role, status, password setup state, email verification fields, two-factor fields, lockout fields, and optional partner linkage.
- `partners` stores real partner records, service-type metadata, contact/location details, active/pending status, and coordinates for GIS-style partner display.
- `submissions`, `submission_details`, `burn_tests`, and `submission_images` store the textile intake flow.
- `transactions` is the implemented partner request table. It stores request status, pathway type, bag color, lightweight route/carbon estimates, and partner outcome report fields.
- `request_tracking_updates` stores user-entered courier/drop-off updates after a partner accepts a request.
- `recommendation_runs` and `recommendation_results` store DSS audit records and selected recommendation output payloads.
- `uploaded_files` records R2/local-upload metadata and links uploaded files to submissions, messages, or transaction outcomes.
- `deleted_records` powers the admin deleted-records page.

## Noted Differences Or Uncertainties

- D1 stores IDs as `TEXT`. PostgreSQL migrations use UUID defaults. The DBML follows the current D1 schema and notes that PostgreSQL migrations remain for local deployments.
- D1 stores booleans as `INTEGER`; services normalize them to booleans for frontend use.
- D1 stores JSON-shaped data as `TEXT`; services parse fields such as `photos`, `metadata`, `output_payload`, `outcome_photos`, and burn-test arrays.
- `recommendation_runs.audit_label` appears in PostgreSQL migration history but not in the current D1 schema snapshot. It remains in DBML as a noted compatibility field.
- `transactions.to_partner_id` is required by the current D1 schema and DSS send flow.
- Some schema-supported values are broader than current UI choices. For example, tracking supports `pickup` and `other`, while the current user UI emphasizes courier shipping and direct drop-off.

## Tables That Appear Internal Or Low-Touch

- `schema_migrations` is migration bookkeeping.
- `rate_limits`, `auth_events`, `password_reset_tokens`, and `user_recovery_codes` support auth/security flows.
- `activity_logs` supports audit logging.
- `recommendation_feedback` exists but is less central than the active DSS run/result audit flow.
- `conversations` exists for message grouping, while active automatic and direct messages are stored in `messages` with related submission/transaction links.
