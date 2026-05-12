import { createClient, type RedisClientType } from 'redis';
import { config } from './env.js';

let redisClient: RedisClientType | null = null;
let redisConnected = false;

export async function initializeRedis(): Promise<RedisClientType | null> {
  if (redisClient !== null) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            console.warn('Redis: Max retries reached, giving up');
            return new Error('Redis max retries exceeded');
          }
          return retries * 100;
        },
        connectTimeout: 5000,
      },
    });

    redisClient.on('error', (err) => {
      if (config.server.env === 'development') {
        console.warn('Redis Error (running in degraded mode):', (err as Error).message);
      } else {
        console.error('Redis Error:', err);
      }
    });

    redisClient.on('connect', () => {
      redisConnected = true;
      console.log('✅ Redis connected');
    });

    redisClient.on('disconnect', () => {
      redisConnected = false;
      console.warn('⚠️ Redis disconnected');
    });

    await redisClient.connect();
    redisConnected = true;
    return redisClient;
  } catch (error) {
    if (config.server.env === 'development') {
      console.warn(
        '⚠️ Redis unavailable in development mode. Continue without caching/queues.\n' +
        '   To enable, start Redis: redis-server\n' +
        '   Or set REDIS_URL env var to your Redis instance'
      );
      return null;
    } else {
      console.error('❌ Redis initialization failed in production:', error);
      throw error;
    }
  }
}

export function getRedisClient(): RedisClientType | null {
  return redisConnected ? redisClient : null;
}

export function isRedisConnected(): boolean {
  return redisConnected;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      console.warn('Error closing Redis connection:', (error as Error).message);
    }
    redisClient = null;
    redisConnected = false;
  }
}
