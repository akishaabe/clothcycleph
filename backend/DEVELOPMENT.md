# 🚀 ClothCycle Backend - Development Guide

## Quick Start (Without Redis)

The backend now works **without Redis** in development mode! Redis is optional and will gracefully degrade.

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Run Migrations
```bash
npm run migrate
```

### 3. Start Development Server
```bash
npm run dev
```

**That's it!** The server will start and say something like:
```
⚠️ Redis unavailable in development mode. Continue without caching/queues.
   To enable, start Redis: redis-server
```

This is normal and expected for local development! ✅

---

## Architecture (Development vs Production)

### Development Mode (Without Redis)
- ✅ All API endpoints work
- ✅ Database fully operational
- ✅ Authentication & messaging work
- ✅ Emails send immediately (no queue)
- ✅ Notifications created instantly (no cache)
- ⚠️ No background job processing
- ⚠️ No caching (slightly slower)

### Production Mode (With Redis Required)
- ✅ All features above PLUS:
- ✅ Background job queues (Bull)
- ✅ Caching for performance
- ✅ Async email processing
- ✅ Notification batching
- ✅ Image processing pipeline

---

## Setting Up Redis (Optional)

### For Windows Users

#### Option 1: WSL2 + Redis
```bash
# In WSL2 terminal
sudo apt-get update
sudo apt-get install redis-server
redis-server
```

#### Option 2: Docker
```bash
docker run -d -p 6379:6379 redis:latest
```

#### Option 3: Windows Subsystem
Download from: https://github.com/microsoftarchive/redis/releases

### For macOS
```bash
brew install redis
redis-server
```

### For Linux
```bash
sudo apt-get install redis-server
redis-server
```

### Verify Redis Connection
```bash
# In another terminal
redis-cli ping
# Should output: PONG
```

---

## Server Startup Messages

### ✅ All Systems Go
```
✅ Database initialized
✅ Redis connected
✅ Job queues initialized
```

### ⚠️ Degraded Mode (OK for development)
```
✅ Database initialized
⚠️ Redis unavailable in development mode. Continue without caching/queues.
   To enable, start Redis: redis-server
```

### ❌ Critical Error (Server won't start)
```
❌ Database initialization failed
```
**Fix:** Check DATABASE_URL in .env

---

## API Endpoints Tested

### Core Endpoints (Work Without Redis)
```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/2fa/verify
POST   /api/submissions
GET    /api/submissions
GET    /api/messages/:userId
POST   /api/messages
```

### Queue-Based Endpoints (Graceful Fallback)
```
POST   /api/notifications      # Creates immediately if no queue
GET    /api/notifications
PUT    /api/notifications/:id/read
```

### Email/Notifications (Without Queue)
- Emails send immediately to Resend API
- Notifications created directly in database
- No background processing (but still works!)

---

## Environment Variables Explained

```env
# Required for any environment
DATABASE_URL=postgresql://postgres:password@localhost:5432/clothcycle
JWT_SECRET=your_secret_key
PORT=5030
NODE_ENV=development

# Optional (dev mode skips if not available)
REDIS_URL=redis://localhost:6379

# Email (highly recommended)
RESEND_API_KEY=re_xxx
EMAIL_FROM=ClothCycle PH <email@example.com>

# Google Auth
GOOGLE_CLIENT_ID=xxx

# File Storage (optional for now)
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=xxx

# CORS Origins
CORS_ORIGIN=http://localhost:5173
```

---

## Health Check Endpoint

Check server status anytime:
```bash
curl http://localhost:5030/api/health
```

Response:
```json
{
  "status": "ok",
  "message": "ClothCycle Backend is running",
  "database": "connected",
  "redis": "error",
  "queues": "disabled"
}
```

---

## Switching Between Dev & Production

### For Production
1. Set `NODE_ENV=production`
2. Ensure `REDIS_URL` points to a real Redis instance
3. Use managed services (Railway, Render, Upstash)

### For Development
1. Leave `NODE_ENV=development`
2. Optionally set up local Redis
3. Everything else is optional

---

## Common Issues

### "Port 5030 is already in use"
```bash
# Kill the existing process
lsof -ti:5030 | xargs kill -9
# Or change PORT in .env
```

### "Cannot connect to database"
```bash
# Verify PostgreSQL is running
psql -U postgres -d clothcycle -c "SELECT 1"
# Check DATABASE_URL in .env
```

### "Redis connection refused" (in production)
- This is CRITICAL in production
- In development, it's fine (you'll see the degraded message)
- For production, either start Redis or use a managed Redis service

---

## Development Workflow

```bash
# Terminal 1: Start the backend
cd backend
npm run dev

# Terminal 2: (Optional) Start Redis
redis-server

# Terminal 3: Test the API
curl http://localhost:5030/api/health
```

---

## Next Steps

- ✅ Backend API is fully functional
- ⬜ Update frontend to use new endpoints
- ⬜ Deploy to Railway/Render
- ⬜ Set up production Redis (Upstash)
- ⬜ Configure CDN for file uploads

Happy coding! 🎉
