import { v4 as uuidv4 } from 'uuid';
import pool, { query } from '../config/database.js';
import { generateToken, hashPassword } from '../utils/auth.js';

const API_URL = process.env.VERIFY_API_URL || 'http://localhost:5000/api';
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const createdIds = {
  users: [] as string[],
  partners: [] as string[],
  submissions: [] as string[],
  transactions: [] as string[],
  notifications: [] as string[],
};

type Role = 'user' | 'partner' | 'admin';

async function main() {
  const user = await createUser('user');
  const partnerUser = await createUser('partner');
  const admin = await createUser('admin');
  const partner = await createPartner(partnerUser.id);

  const userToken = tokenFor(user);
  const partnerToken = tokenFor(partnerUser);
  const adminToken = tokenFor(admin);

  await check('health', async () => {
    await request('/health');
  });

  await check('auth profile read/update', async () => {
    await request('/auth/profile', { token: userToken });
    await request('/auth/profile', {
      method: 'PUT',
      token: userToken,
      body: { bio: `CRUD verification ${runId}` },
    });
  });

  const submission = await check('submissions create/read/status', async () => {
    const created = await request('/submissions', {
      method: 'POST',
      token: userToken,
      body: {
        item_type: 'shirt',
        condition: 'good',
        fabric: 'cotton',
        cleanliness: 'clean',
        description: `CRUD verification ${runId}`,
        photos: [],
      },
    });
    createdIds.submissions.push(created.data.id);

    await request('/submissions', { token: userToken });
    await request(`/submissions/${created.data.id}`, { token: userToken });
    await request(`/submissions/${created.data.id}/status`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'verified' },
    });

    return created.data;
  });

  await check('messages create/read/mark-read', async () => {
    const sent = await request('/messages', {
      method: 'POST',
      token: userToken,
      body: {
        to_user_id: partnerUser.id,
        content: `CRUD verification message ${runId}`,
      },
    });

    await request('/messages/contacts', { token: userToken });
    await request('/messages/conversations', { token: userToken });
    await request(`/messages/${user.id}`, { token: partnerToken });
    await request(`/messages/${sent.data.id}/read`, {
      method: 'PUT',
      token: partnerToken,
    });
  });

  await check('notifications read/count/mark-read', async () => {
    const notificationId = uuidv4();
    createdIds.notifications.push(notificationId);
    await query(
      `INSERT INTO notifications (id, user_id, type, title, body, data)
       VALUES ($1, $2, 'system', $3, $4, '{}'::jsonb)`,
      [notificationId, user.id, 'CRUD verification', runId]
    );

    await request('/notifications', { token: userToken });
    await request('/notifications/count', { token: userToken });
    await request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
      token: userToken,
    });
    await request('/notifications/read-all', {
      method: 'PUT',
      token: userToken,
    });
  });

  await check('transactions create/read/update', async () => {
    const created = await request('/transactions', {
      method: 'POST',
      token: adminToken,
      body: {
        submission_id: submission.id,
        to_partner_id: partner.id,
        type: 'donate',
        notes: `CRUD verification ${runId}`,
      },
    });
    createdIds.transactions.push(created.data.id);

    await request(`/transactions/submission/${submission.id}`, { token: userToken });
    await request('/transactions/user', { token: userToken });
    await request(`/transactions/partner/${partner.id}`, { token: partnerToken });
    await request(`/transactions/${created.data.id}`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'completed' },
    });
  });
}

async function createUser(role: Role) {
  const id = uuidv4();
  const email = `crud-${role}-${runId}@example.com`;
  const passwordHash = await hashPassword('Verify123!');

  createdIds.users.push(id);
  const result = await query(
    `INSERT INTO users (
       id, email, name, password_hash, role, email_verified_at, two_factor_enabled
     )
     VALUES ($1, $2, $3, $4, $5, NOW(), false)
     RETURNING id, email, role`,
    [id, email, `CRUD ${role}`, passwordHash, role]
  );

  return result.rows[0] as { id: string; email: string; role: Role };
}

async function createPartner(userId: string) {
  const id = uuidv4();
  createdIds.partners.push(id);
  const result = await query(
    `INSERT INTO partners (id, user_id, name, email, status, verified)
     VALUES ($1, $2, $3, $4, 'active', true)
     RETURNING id`,
    [id, userId, 'CRUD Partner', `crud-partner-${runId}@example.com`]
  );

  await query('UPDATE users SET partner_id = $1 WHERE id = $2', [id, userId]);
  return result.rows[0] as { id: string };
}

function tokenFor(user: { id: string; email: string; role: Role }) {
  return generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

async function check<T>(name: string, action: () => Promise<T>) {
  try {
    const result = await action();
    console.log(`PASS ${name}`);
    return result;
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

async function request(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: Record<string, unknown>;
  } = {}
) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${text}`);
  }

  return data;
}

async function cleanup() {
  await query('DELETE FROM transactions WHERE id = ANY($1)', [createdIds.transactions]);
  await query('DELETE FROM notifications WHERE id = ANY($1)', [createdIds.notifications]);
  await query('DELETE FROM submissions WHERE id = ANY($1)', [createdIds.submissions]);
  await query('DELETE FROM partners WHERE id = ANY($1)', [createdIds.partners]);
  await query('DELETE FROM users WHERE id = ANY($1)', [createdIds.users]);
}

main()
  .then(async () => {
    await cleanup();
    console.log('CRUD verification completed.');
  })
  .catch(async (error) => {
    console.error(error);
    await cleanup().catch((cleanupError) => {
      console.error('Cleanup failed:', cleanupError);
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
