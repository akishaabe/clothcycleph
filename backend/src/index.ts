import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { initializeDatabase } from './models/schema.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import submissionRoutes from './routes/submissions.js';
import messageRoutes from './routes/messages.js';
import uploadRoutes from './routes/upload.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: config.cors.origin }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ClothCycle Backend is running' });
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

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✅ Database initialized');

    const PORT = config.server.port;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${config.server.env}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
