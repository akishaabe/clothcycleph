-- ClothCycle D1 Schema for Cloudflare Workers
-- SQLite-compatible schema converted from PostgreSQL

-- Partners table
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  website TEXT,
  service_types TEXT,
  accepted_service_types TEXT,
  accepts_clean_only INTEGER DEFAULT 0,
  capacity_notes TEXT,
  pickup_areas TEXT,
  rule_change_requires_admin INTEGER DEFAULT 1,
  contact_person TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected')),
  verified INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  latitude REAL CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  longitude REAL CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_setup_required INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'partner', 'admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  partner_id TEXT REFERENCES partners(id) ON DELETE SET NULL,
  avatar_url TEXT,
  profile_photo TEXT,
  bio TEXT,
  phone TEXT,
  address TEXT,
  terms_accepted_at TEXT,
  email_verified_at TEXT,
  last_login_at TEXT,
  two_factor_enabled INTEGER DEFAULT 1,
  two_factor_method TEXT DEFAULT 'email' CHECK (two_factor_method IN ('email', 'totp')),
  two_factor_secret_encrypted TEXT,
  two_factor_confirmed_at TEXT,
  two_factor_code_hash TEXT,
  two_factor_code_expires_at TEXT,
  failed_login_count INTEGER DEFAULT 0,
  locked_until TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_partner_id ON users(partner_id);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_notifications INTEGER DEFAULT 1,
  push_notifications INTEGER DEFAULT 1,
  sms_notifications INTEGER DEFAULT 0,
  newsletter INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- User recovery codes for 2FA
CREATE TABLE IF NOT EXISTS user_recovery_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_recovery_codes_user_id ON user_recovery_codes(user_id);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);

-- Auth events for security auditing
CREATE TABLE IF NOT EXISTS auth_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_event_type ON auth_events(event_type);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  submission_name TEXT,
  condition TEXT NOT NULL,
  fabric TEXT,
  cleanliness TEXT,
  description TEXT,
  photos TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'processed', 'rejected')),
  assigned_partner_id TEXT REFERENCES partners(id) ON DELETE SET NULL,
  submission_code TEXT UNIQUE,
  service_type TEXT CHECK (service_type IS NULL OR service_type IN ('recycle', 'donate', 'upcycle', 'buyback')),
  quantity INTEGER DEFAULT 1,
  buyback_interest INTEGER DEFAULT 0,
  action TEXT,
  upcycle_request TEXT,
  scheduled_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_assigned_partner_id ON submissions(assigned_partner_id);

-- Submission details table
CREATE TABLE IF NOT EXISTS submission_details (
  id TEXT PRIMARY KEY,
  submission_id TEXT UNIQUE NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  item_types TEXT,
  other_item_type TEXT,
  condition TEXT,
  cleanliness TEXT,
  knows_fabric_type INTEGER,
  fabric_types TEXT,
  custom_fabric_text TEXT,
  fabric_identification TEXT,
  brand TEXT,
  no_brand_visible INTEGER DEFAULT 0,
  fabric_description TEXT,
  restricted_category TEXT DEFAULT 'none',
  uniform_branding TEXT,
  fiber_composition TEXT,
  wearability TEXT,
  repairability TEXT,
  contamination_level TEXT,
  damage_classification TEXT,
  repurposing_potential TEXT,
  trim_removal TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Burn tests table (for fabric analysis)
CREATE TABLE IF NOT EXISTS burn_tests (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  performed INTEGER DEFAULT 0,
  page INTEGER,
  moment TEXT,
  flames TEXT,
  no_flame TEXT,
  smell TEXT,
  ashes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_burn_tests_submission_id ON burn_tests(submission_id);

-- Submission images table
CREATE TABLE IF NOT EXISTS submission_images (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_key TEXT,
  metadata TEXT,
  uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submission_images_submission_id ON submission_images(submission_id);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('recycle', 'donate', 'upcycle', 'buyback')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'rejected')),
  amount REAL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_submission_id ON transactions(submission_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_user_id ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_partner_id ON transactions(to_partner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Recommendations engine tables
CREATE TABLE IF NOT EXISTS recommendation_runs (
  id TEXT PRIMARY KEY,
  submission_id TEXT REFERENCES submissions(id) ON DELETE SET NULL,
  requested_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  engine_name TEXT DEFAULT 'dss',
  engine_version TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  criteria TEXT,
  input_snapshot TEXT,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommendation_runs_submission_id ON recommendation_runs(submission_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_runs_status ON recommendation_runs(status);

CREATE TABLE IF NOT EXISTS recommendation_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES recommendation_runs(id) ON DELETE CASCADE,
  submission_id TEXT REFERENCES submissions(id) ON DELETE CASCADE,
  partner_id TEXT REFERENCES partners(id) ON DELETE SET NULL,
  recommended_pathway TEXT NOT NULL,
  rank INTEGER,
  score REAL,
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  explanation TEXT,
  details TEXT,
  output_payload TEXT,
  selected INTEGER DEFAULT 0,
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommendation_results_run_id ON recommendation_results(run_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_results_submission_id ON recommendation_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_results_partner_id ON recommendation_results(partner_id);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id TEXT PRIMARY KEY,
  recommendation_result_id TEXT NOT NULL REFERENCES recommendation_results(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  accepted INTEGER,
  feedback TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_result_id ON recommendation_feedback(recommendation_result_id);

CREATE TABLE IF NOT EXISTS dss_rules (
  id TEXT PRIMARY KEY,
  rule_key TEXT UNIQUE NOT NULL,
  pathway TEXT CHECK (pathway IS NULL OR pathway IN ('recycle', 'donate', 'upcycle', 'buyback', 'rejected')),
  category TEXT,
  question_key TEXT,
  expected_values TEXT,
  weight REAL DEFAULT 0,
  active INTEGER DEFAULT 1,
  description TEXT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dss_rules_pathway ON dss_rules(pathway);
CREATE INDEX IF NOT EXISTS idx_dss_rules_active ON dss_rules(active);

CREATE TABLE IF NOT EXISTS partner_rule_change_requests (
  id TEXT PRIMARY KEY,
  partner_id TEXT REFERENCES partners(id) ON DELETE SET NULL,
  requested_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_area TEXT NOT NULL,
  requested_change TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'approved', 'declined', 'needs_more_information', 'implemented')),
  admin_notes TEXT,
  reviewed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_rule_change_requests_partner_id ON partner_rule_change_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_rule_change_requests_status ON partner_rule_change_requests(status);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('submission_approved', 'submission_rejected', 'message', 'partner_update', 'system')),
  title TEXT NOT NULL,
  body TEXT,
  data TEXT DEFAULT '{}',
  read INTEGER DEFAULT 0,
  read_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id TEXT REFERENCES partners(id) ON DELETE SET NULL,
  conversation_type TEXT DEFAULT 'general',
  subject TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  related_submission_id TEXT REFERENCES submissions(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_partner_id ON conversations(partner_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  sender_type TEXT,
  content TEXT NOT NULL,
  related_submission_id TEXT REFERENCES submissions(id) ON DELETE SET NULL,
  related_transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  action_url TEXT,
  metadata TEXT DEFAULT '{}',
  read INTEGER DEFAULT 0,
  read_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_from_user_id ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user_id ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Message attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  filename TEXT,
  url TEXT NOT NULL,
  metadata TEXT,
  uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);

-- Schema migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);
