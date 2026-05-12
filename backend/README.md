# ClothCycle Backend API

Node.js + Express + TypeScript backend for ClothCycle PH application.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or pnpm

### Installation

1. **Clone/Setup**
```bash
cd backend
cp .env.example .env
```

On Windows PowerShell, use:
```powershell
Copy-Item .env.example .env
```

2. **Update `.env` with your own database credentials**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/clothcycle
JWT_SECRET=your_secret_key_here
CORS_ORIGIN=http://localhost:5173
```

Each developer keeps their own `.env`. Do not commit `.env`.

If PostgreSQL was installed on a different port, update the port in `DATABASE_URL`.
For example:
```env
DATABASE_URL=postgresql://postgres:password@localhost:6543/clothcycle
```

3. **Install dependencies**
```bash
npm install
# or
pnpm install
```

4. **Create PostgreSQL Database**
```bash
createdb clothcycle
# The schema will be auto-created on first run
```

5. **Start development server**
```bash
npm run dev
```

On Windows PowerShell, if `npm` is blocked by script policy, use:
```powershell
npm.cmd run dev
```

Server will run on `http://localhost:5000`

## Team Database Setup

There are two supported ways to run the project as a team.

### Option A: Each member uses a local database

Use this when everyone wants to work offline or avoid changing the same data.

Each member creates their own `.env`:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:your_port/clothcycle
JWT_SECRET=shared_dev_secret
CORS_ORIGIN=http://localhost:5173
```

Then create the database locally:
```bash
createdb clothcycle
```

The backend will create the tables automatically on first run.

### Option B: Everyone uses one shared database

Use this when your group wants to see the same users, submissions, and messages.

Create one PostgreSQL database using a hosted provider such as Supabase, Neon, Render, Railway, or a school-hosted Postgres server. Put the same shared URL in each member's local `.env`:
```env
DATABASE_URL=postgresql://username:password@host:5432/clothcycle?sslmode=require
JWT_SECRET=shared_dev_secret
CORS_ORIGIN=http://localhost:5173
```

Important:
- Do not put the real shared database password in `.env.example`, README, or commits.
- Share the real `DATABASE_URL` privately through your group chat or password manager.
- Use the same `JWT_SECRET` for everyone if you want login tokens to work across machines.
- Keep `CORS_ORIGIN` as each member's frontend URL, usually `http://localhost:5173`.

After the shared database is configured, one person should apply migrations:
```bash
npm run migrate
```

Then start the backend:
```bash
npm run dev
```

In another terminal, verify the main API modules against the running backend:
```bash
npm run verify:crud
```

On Windows PowerShell, use `npm.cmd` if scripts are blocked:
```powershell
npm.cmd run migrate
npm.cmd run dev
npm.cmd run verify:crud
```

## Role Testing

During development, the frontend dashboards are intentionally reachable by direct URL so the team can test screens quickly:
```text
http://localhost:5173/dashboard
http://localhost:5173/partner
http://localhost:5173/admin
```

Login still returns the user's real backend role and redirects to the matching dashboard:
- `user` -> `/dashboard`
- `partner` -> `/partner`
- `admin` -> `/admin`

Do not rely on frontend route hiding for security. When a backend endpoint becomes role-sensitive, protect that API route with `roleMiddleware`.

## 📁 Project Structure

```
src/
├── config/          # Configuration files
│   ├── database.ts  # PostgreSQL connection
│   └── env.ts       # Environment variables
├── controllers/     # Business logic
│   ├── authController.ts
│   ├── submissionController.ts
│   └── messageController.ts
├── middleware/      # Express middleware
│   ├── auth.ts      # JWT authentication
│   └── errorHandler.ts
├── models/          # Database schema
│   └── schema.ts    # Table definitions
├── routes/          # API endpoints
│   ├── auth.ts
│   ├── submissions.ts
│   └── messages.ts
├── utils/           # Utility functions
│   ├── auth.ts      # JWT & password utilities
│   └── errorHandler.ts
└── index.ts         # Entry point
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)

### Submissions
- `POST /api/submissions` - Create clothing submission (protected)
- `GET /api/submissions` - Get user's submissions (protected)
- `GET /api/submissions/:id` - Get submission details (protected)
- `PUT /api/submissions/:id/status` - Update submission status (protected)

### Messages
- `POST /api/messages` - Send message (protected)
- `GET /api/messages/conversations` - Get all conversations (protected)
- `GET /api/messages/:userId` - Get messages with user (protected)
- `PUT /api/messages/:id/read` - Mark message as read (protected)

## 🔐 Authentication

Uses JWT tokens. Include in request headers:
```
Authorization: Bearer <token>
```

## 📊 Database Schema

### Users
```
id, email, name, password_hash, role, partner_id, avatar_url, bio, phone, address, created_at, updated_at
```

### Submissions
```
id, user_id, item_type, condition, fabric, cleanliness, description, photos, status, assigned_partner_id, created_at, updated_at
```

### Messages
```
id, from_user_id, to_user_id, content, read, created_at
```

### Transactions
```
id, submission_id, from_user_id, to_partner_id, type, notes, created_at, updated_at
```

### Notifications
```
id, user_id, type, title, message, related_id, read, created_at
```

## 📦 Scripts

```bash
npm run dev      # Start development server
npm run build    # Compile TypeScript
npm run start    # Run compiled code
npm run test     # Run tests
```

## 🔄 Next Steps

- [ ] Add image upload to Cloudflare R2
- [ ] Implement real-time notifications with Socket.io
- [ ] Add Kafka event streaming
- [ ] Implement Redis caching
- [ ] Add partner/admin endpoints
- [ ] Create notification service
- [ ] Add email notifications
- [ ] Implement pagination
- [ ] Add input validation with Zod

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt
- **Validation**: Zod (ready to implement)

## 📝 Notes

- Database tables are auto-created on first run
- All user-related routes require JWT authentication
- Passwords are hashed with bcrypt
- CORS is configured for frontend origin
