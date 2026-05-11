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

2. **Update .env with your database credentials**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/clothcycle
JWT_SECRET=your_secret_key_here
CORS_ORIGIN=http://localhost:5173
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

Server will run on `http://localhost:5000`

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
