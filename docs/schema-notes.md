# ClothCycle PH Schema Notes

## Files Inspected

- `backend/src/db/migrations/*.sql`
- `backend/src/db/d1-schema.sql`
- `backend/src/controllers/submissionController.ts`
- `backend/src/controllers/dssController.ts`
- `backend/src/controllers/transactionController.ts`
- `backend/src/controllers/adminController.ts`
- `backend/src/controllers/messageController.ts`
- `backend/src/controllers/notificationController.ts`
- `backend/src/services/dssEngine.ts`
- `backend/src/services/d1DssService.ts`
- `backend/src/services/d1SubmissionService.ts`
- `backend/src/services/d1TransactionService.ts`
- `backend/src/services/notificationService.ts`
- `backend/src/honoLocalApp.ts`
- `src/routes.jsx`
- `src/services/api.ts`
- Current dashboard/request pages used to confirm active flows and displayed fields.

## Source Of Truth Used

The DBML in `docs/clothcycle-current-schema.dbml` is based primarily on the current SQL migrations and the consolidated D1 schema:

- PostgreSQL migration history: `backend/src/db/migrations/*.sql`
- Consolidated D1-compatible schema: `backend/src/db/d1-schema.sql`
- Current runtime reads/writes in controllers and services.

The old DBML files and uploaded ERD/process-flow images were treated only as references, not source of truth.

Live database introspection was not used in this pass because the repository already contains both the migration history and the current D1 schema snapshot. Where those sources disagree, the DBML includes a note instead of guessing silently.

## Noted Schema Differences Or Uncertainties

- `transactions.to_partner_id` is nullable in the early PostgreSQL migration but marked `NOT NULL` in the D1 schema. The current DSS request flow requires a partner, so the DBML marks it `not null` and includes a note.
- `recommendation_runs.audit_label` appears in PostgreSQL migration `017_admin_dss_rules.sql` but is not present in `d1-schema.sql`. The DBML includes it with a note.
- Early notification migration history used `message` and `related_id`, while the current consolidated schema and controllers use `title`, `body`, `data`, `read`, and `read_at`. The DBML follows the current schema/controller usage.
- `photos` on `submissions` is represented as `json[]` in PostgreSQL code and JSON text in D1. The DBML uses a JSON-like type with a note.
- `outcome_photos` is stored as JSON/JSONB and is treated as an array by the frontend and backend.

## Enum-Like Fields

The schema mostly uses string fields plus CHECK constraints or application validation instead of database enum types. Enum-like values are documented in DBML notes for:

- user roles and statuses
- partner statuses
- submission statuses
- transaction request statuses
- tracking progress and fulfillment method
- DSS pathway values
- rule-change request statuses
- notification types
- conversation statuses

## Tables That Appear Internal, Administrative, Or Low-Touch

- `schema_migrations` is internal migration tracking.
- `rate_limits`, `auth_events`, `password_reset_tokens`, and `user_recovery_codes` support auth/security flows.
- `activity_logs` is used for audit logging.
- `deleted_records` powers the admin deleted-records page.
- `recommendation_feedback` exists in schema but appears less central than the active `recommendation_runs` and `recommendation_results` DSS audit flow.
- `conversations` exists for structured message grouping, while current message sends also write direct `messages` rows with related submission/transaction links.
