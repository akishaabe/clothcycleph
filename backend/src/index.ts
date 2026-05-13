import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { createServer } from 'http';
import { config } from './config/env.js';
import { initializeDatabase } from './models/schema.js';
import { initializeRedis, closeRedis } from './config/redis.js';
import { initializeQueues, setupQueueProcessors, closeQueues } from './services/jobQueue.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import submissionRoutes from './routes/submissions.js';
import messageRoutes from './routes/messages.js';
import uploadRoutes from './routes/upload.js';
import notificationRoutes from './routes/notifications.js';
import transactionRoutes from './routes/transactions.js';
import dssRoutes from './routes/dss.js';
import adminRoutes from './routes/admin.js';
import { initializeSocketServer } from './services/socketService.js';

const app = express();
const httpServer = createServer(app);
let databaseStatus: 'starting' | 'connected' | 'error' = 'starting';
let redisStatus: 'starting' | 'connected' | 'error' = 'starting';
let queueStatus: 'disabled' | 'initialized' = 'disabled';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use(
  cors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void
    ) {
      if (!origin || isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
  })
);

// Health check
app.get('/api/health', (req, res) => {
  const isHealthy = databaseStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    message: 'ClothCycle Backend is running',
    database: databaseStatus,
    redis: redisStatus,
    queues: queueStatus,
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dss', dssRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start Express first so health checks can report database startup failures.
async function startServer() {
  const PORT = config.server.port;

  initializeSocketServer(httpServer);

  try {
    await listen(PORT);
  } catch (error) {
    const serverError = error as NodeJS.ErrnoException;

    if (serverError.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Stop the other backend process or set a different PORT in backend/.env.`
      );
    } else {
      console.error('Failed to start HTTP server:', error);
    }

    process.exit(1);
  }

  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${config.server.env}`);

  try {
    await initializeDatabase();
    databaseStatus = 'connected';
    console.log('✅ Database initialized');
  } catch (error) {
    databaseStatus = 'error';
    console.error('❌ Database initialization failed:', error);
  }

  // Initialize Redis
  try {
    const redis = await initializeRedis();
    if (redis) {
      redisStatus = 'connected';
      initializeQueues();
      setupQueueProcessors();
      queueStatus = 'initialized';
    } else {
      redisStatus = 'error';
      queueStatus = 'disabled';
    }
  } catch (error) {
    redisStatus = 'error';
    queueStatus = 'disabled';
    console.warn('⚠️ Redis unavailable - running in degraded mode');
  }
}

function listen(port: number) {
  return new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      httpServer.off('listening', onListening);
      reject(error);
    };

    const onListening = () => {
      httpServer.off('error', onError);
      resolve();
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);
    httpServer.listen(port);
  });
}

function isAllowedCorsOrigin(origin: string) {
  if (config.cors.origins.includes(origin)) {
    return true;
  }

  if (config.server.env === 'development') {
    return /^http:\/\/(localhost|127\.0\.0\.1):517\d$/.test(origin);
  }

  return false;
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}, starting graceful shutdown...`);

  try {
    await closeQueues();
  } catch (error) {
    console.error('Error closing job queues:', error);
  }

  try {
    await closeRedis();
  } catch (error) {
    console.error('Error closing Redis:', error);
  }

  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;
