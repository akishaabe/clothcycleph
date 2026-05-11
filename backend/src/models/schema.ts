import { query } from '../config/database.js';

export async function initializeDatabase() {
  try {
    // Partners table (must be first due to foreign key reference)
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
        verified BOOLEAN DEFAULT false,
        rating DECIMAL(3,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'partner', 'admin')),
        partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
        avatar_url VARCHAR(500),
        bio TEXT,
        phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Submissions table (core of ClothCycle)
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
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('recycle', 'donate', 'upcycle')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Messages table
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Notifications table
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

    // Create indexes for better performance
    await query(`CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_transactions_submission_id ON transactions(submission_id);`);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}
