import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { config } from './config/env.js';
import { initializeDatabase } from './models/schema.js';
import app, { setLocalDatabaseStatus } from './honoLocalApp.js';

const httpServer = createServer(handleRequest);
let databaseStatus: 'starting' | 'connected' | 'error' = 'starting';

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  try {
    const origin = `http://${req.headers.host || `localhost:${config.server.port}`}`;
    const url = new URL(req.url || '/', origin);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as any,
      body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : (req as any),
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    const response =
      url.pathname === '/api/health'
        ? await app.fetch(request)
        : await app.fetch(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (!response.body) {
      res.end();
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    console.error('Hono server error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

async function startServer() {
  const port = config.server.port;

  try {
    await listen(port);
  } catch (error) {
    const serverError = error as NodeJS.ErrnoException;

    if (serverError.code === 'EADDRINUSE') {
      console.error(
        `Port ${port} is already in use. Stop the other backend process or set a different PORT in backend/.env.`
      );
    } else {
      console.error('Failed to start Hono HTTP server:', error);
    }

    process.exit(1);
  }

  console.log(`Hono server running on http://localhost:${port}`);
  console.log(`Environment: ${config.server.env}`);

  try {
    await initializeDatabase();
    databaseStatus = 'connected';
    setLocalDatabaseStatus(databaseStatus);
    console.log('Database initialized');
  } catch (error) {
    databaseStatus = 'error';
    setLocalDatabaseStatus(databaseStatus);
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

async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}, starting graceful shutdown...`);

  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;
