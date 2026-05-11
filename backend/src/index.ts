import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config/env.js';
import { initializeDatabase } from './models/schema.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import submissionRoutes from './routes/submissions.js';
import messageRoutes from './routes/messages.js';
import uploadRoutes from './routes/upload.js';
import { initializeSocketServer } from './services/socketService.js';

const app = express();
const httpServer = createServer(app);
let databaseStatus: 'starting' | 'connected' | 'error' = 'starting';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

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
    console.log('Database initialized');
  } catch (error) {
    databaseStatus = 'error';
    console.error('Database initialization failed:', error);
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

startServer();

export default app;
