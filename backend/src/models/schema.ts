import { query } from '../config/database.js';

export async function initializeDatabase() {
  try {
    await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await query(`
      CREATE TABLE IF NOT EXISTS partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        logo_url VARCHAR(500),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        website VARCHAR(500),
        service_types TEXT,
        contact_person VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected')),
        verified BOOLEAN DEFAULT false,
        rating DECIMAL(3,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'partner', 'admin')),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
        avatar_url VARCHAR(500),
        profile_photo JSONB,
        bio TEXT,
        phone VARCHAR(20),
        address TEXT,
        terms_accepted_at TIMESTAMP,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT true,
        sms_notifications BOOLEAN DEFAULT false,
        newsletter BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_type VARCHAR(100) NOT NULL,
        condition VARCHAR(100) NOT NULL,
        fabric VARCHAR(100),
        cleanliness VARCHAR(100),
        description TEXT,
        photos JSON[] DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'processed', 'rejected')),
        assigned_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
        submission_code VARCHAR(50) UNIQUE,
        service_type VARCHAR(50) CHECK (service_type IS NULL OR service_type IN ('recycle', 'donate', 'upcycle', 'buyback')),
        quantity INTEGER DEFAULT 1 CHECK (quantity IS NULL OR quantity > 0),
        buyback_interest BOOLEAN DEFAULT false,
        action VARCHAR(100),
        scheduled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS submission_details (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID UNIQUE NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        item_types TEXT,
        other_item_type TEXT,
        condition TEXT,
        cleanliness TEXT,
        knows_fabric_type BOOLEAN,
        fabric_types TEXT,
        fabric_identification TEXT,
        brand TEXT,
        no_brand_visible BOOLEAN DEFAULT false,
        fabric_description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS burn_tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        performed BOOLEAN DEFAULT false,
        page INTEGER,
        moment TEXT,
        flames TEXT,
        no_flame TEXT,
        smell TEXT,
        ashes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS submission_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        storage_key TEXT,
        metadata JSONB,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('recycle', 'donate', 'upcycle', 'buyback')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS recommendation_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
        requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        engine_name VARCHAR(100) DEFAULT 'dss',
        engine_version VARCHAR(100),
        status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
        criteria JSONB,
        input_snapshot JSONB,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS recommendation_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID NOT NULL REFERENCES recommendation_runs(id) ON DELETE CASCADE,
        submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
        partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
        recommended_pathway VARCHAR(100) NOT NULL,
        rank INTEGER CHECK (rank IS NULL OR rank > 0),
        score DECIMAL(8,4),
        confidence DECIMAL(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
        explanation TEXT,
        details TEXT,
        output_payload JSONB,
        selected BOOLEAN DEFAULT false,
        generated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS recommendation_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recommendation_result_id UUID NOT NULL REFERENCES recommendation_results(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
        accepted BOOLEAN,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255),
        message TEXT,
        related_id UUID,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id UUID,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
        conversation_type VARCHAR(50) DEFAULT 'general',
        subject TEXT,
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
        related_submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        sender_type VARCHAR(50),
        content TEXT NOT NULL,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        filename TEXT,
        url TEXT NOT NULL,
        metadata JSONB,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await addMissingColumns();
    await createIndexes();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

async function addMissingColumns() {
  const statements = [
    `ALTER TABLE partners ADD COLUMN IF NOT EXISTS service_types TEXT;`,
    `ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);`,
    `ALTER TABLE partners ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo JSONB;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;`,
    `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_code VARCHAR(50) UNIQUE;`,
    `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS service_type VARCHAR(50);`,
    `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;`,
    `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS buyback_interest BOOLEAN DEFAULT false;`,
    `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS action VARCHAR(100);`,
    `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_type VARCHAR(50);`,
  ];

  for (const statement of statements) {
    await query(statement);
  }
}

async function createIndexes() {
  const statements = [
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
    `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`,
    `CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);`,
    `CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);`,
    `CREATE INDEX IF NOT EXISTS idx_submissions_assigned_partner_id ON submissions(assigned_partner_id);`,
    `CREATE INDEX IF NOT EXISTS idx_submission_details_submission_id ON submission_details(submission_id);`,
    `CREATE INDEX IF NOT EXISTS idx_burn_tests_submission_id ON burn_tests(submission_id);`,
    `CREATE INDEX IF NOT EXISTS idx_submission_images_submission_id ON submission_images(submission_id);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_submission_id ON transactions(submission_id);`,
    `CREATE INDEX IF NOT EXISTS idx_recommendation_runs_submission_id ON recommendation_runs(submission_id);`,
    `CREATE INDEX IF NOT EXISTS idx_recommendation_runs_status ON recommendation_runs(status);`,
    `CREATE INDEX IF NOT EXISTS idx_recommendation_results_run_id ON recommendation_results(run_id);`,
    `CREATE INDEX IF NOT EXISTS idx_recommendation_results_submission_id ON recommendation_results(submission_id);`,
    `CREATE INDEX IF NOT EXISTS idx_recommendation_results_partner_id ON recommendation_results(partner_id);`,
    `CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_result_id ON recommendation_feedback(recommendation_result_id);`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_partner_id ON conversations(partner_id);`,
    `CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);`,
    `CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);`,
  ];

  for (const statement of statements) {
    await query(statement);
  }
}
