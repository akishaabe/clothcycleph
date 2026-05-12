import Queue from 'bull';
import { config } from '../config/env.js';
import { sendEmail } from './emailService.js';
import { createNotification } from './notificationService.js';
import { isRedisConnected } from '../config/redis.js';

// Initialize queues - will be null if Redis is unavailable
let emailQueue: Queue.Queue | null = null;
let notificationQueue: Queue.Queue | null = null;
let imageProcessingQueue: Queue.Queue | null = null;
let submissionQueue: Queue.Queue | null = null;

export function initializeQueues() {
  if (!isRedisConnected()) {
    console.warn('⚠️ Redis not connected - job queues disabled (degraded mode)');
    return;
  }

  try {
    emailQueue = new Queue('emails', config.redis.url);
    notificationQueue = new Queue('notifications', config.redis.url);
    imageProcessingQueue = new Queue('image-processing', config.redis.url);
    submissionQueue = new Queue('submissions', config.redis.url);

    console.log('✅ Job queues initialized');
  } catch (error) {
    console.warn('⚠️ Failed to initialize job queues:', (error as Error).message);
  }
}

// Processors registered when queues are initialized
export function setupQueueProcessors() {
  if (!emailQueue || !notificationQueue || !imageProcessingQueue || !submissionQueue) {
    return;
  }

  // Email queue processor
  emailQueue.process(async (job) => {
    const { to, subject, html, text } = job.data;
    try {
      await sendEmail({ to, subject, html, text });
      return { success: true, jobId: job.id };
    } catch (error) {
      console.error('Email job failed:', error);
      throw error;
    }
  });

  emailQueue.on('failed', (job, err) => {
    console.error(`Email job ${job.id} failed after ${job.attemptsMade} attempts: ${err.message}`);
  });

  emailQueue.on('completed', (job) => {
    console.log(`Email job ${job.id} completed`);
  });

  // Notification queue processor
  notificationQueue.process(async (job) => {
    const { userId, type, title, body, data } = job.data;
    try {
      await createNotification({
        userId,
        type,
        title,
        body,
        data,
      });
      return { success: true, jobId: job.id };
    } catch (error) {
      console.error('Notification job failed:', error);
      throw error;
    }
  });

  notificationQueue.on('failed', (job, err) => {
    console.error(`Notification job ${job.id} failed: ${err.message}`);
  });

  // Image processing queue processor
  imageProcessingQueue.process(async (job) => {
    const { imageUrl, type } = job.data;
    try {
      console.log(`Processing image: ${imageUrl} (${type})`);
      return { success: true, jobId: job.id, processed: imageUrl };
    } catch (error) {
      console.error('Image processing job failed:', error);
      throw error;
    }
  });

  // Submission queue processor
  submissionQueue.process(async (job) => {
    const { submissionId, action } = job.data;
    try {
      console.log(`Processing submission ${submissionId}: ${action}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      console.error('Submission job failed:', error);
      throw error;
    }
  });
}

// Helper functions to enqueue jobs
export async function enqueueEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  options?: { delay?: number; attempts?: number }
) {
  // If Redis/queue is not available, send email immediately
  if (!emailQueue) {
    console.log('📧 Sending email immediately (no queue available):', subject);
    try {
      await sendEmail({ to, subject, html, text });
      return { success: true };
    } catch (error) {
      console.error('Failed to send email immediately:', error);
      throw error;
    }
  }

  try {
    const job = await emailQueue.add(
      { to, subject, html, text },
      {
        attempts: options?.attempts || 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        delay: options?.delay,
      }
    );
    return job;
  } catch (error) {
    console.error('Failed to enqueue email:', error);
    throw error;
  }
}

export async function enqueueNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>,
  options?: { delay?: number }
) {
  // If Redis/queue is not available, create notification immediately
  if (!notificationQueue) {
    console.log('🔔 Creating notification immediately (no queue available):', title);
    try {
      await createNotification({
        userId,
        type,
        title,
        body,
        data,
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to create notification immediately:', error);
      throw error;
    }
  }

  try {
    const job = await notificationQueue.add(
      { userId, type, title, body, data },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        delay: options?.delay,
      }
    );
    return job;
  } catch (error) {
    console.error('Failed to enqueue notification:', error);
    throw error;
  }
}

export async function enqueueImageProcessing(
  imageUrl: string,
  type: 'thumbnail' | 'optimization' | 'analysis',
  options?: { delay?: number }
) {
  if (!imageProcessingQueue) {
    console.log('⏭️ Skipping image processing (no queue available):', imageUrl);
    return { success: false, queued: false };
  }

  try {
    const job = await imageProcessingQueue.add(
      { imageUrl, type },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        delay: options?.delay,
      }
    );
    return job;
  } catch (error) {
    console.error('Failed to enqueue image processing:', error);
    throw error;
  }
}

export async function enqueueSubmissionProcessing(
  submissionId: string,
  action: 'verify' | 'process' | 'reject' | 'assign',
  options?: { delay?: number; data?: Record<string, unknown> }
) {
  if (!submissionQueue) {
    console.log('⏭️ Skipping submission processing (no queue available):', submissionId);
    return { success: false, queued: false };
  }

  try {
    const job = await submissionQueue.add(
      { submissionId, action, ...options?.data },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        delay: options?.delay,
      }
    );
    return job;
  } catch (error) {
    console.error('Failed to enqueue submission processing:', error);
    throw error;
  }
}

// Clean up queue connections
export async function closeQueues() {
  const queues = [emailQueue, notificationQueue, imageProcessingQueue, submissionQueue].filter(
    (q) => q !== null
  );

  if (queues.length === 0) {
    console.log('No queues to close');
    return;
  }

  try {
    await Promise.all(queues.map((q) => q!.close()));
    console.log('✅ Job queues closed');
  } catch (error) {
    console.warn('Error closing job queues:', (error as Error).message);
  }
}
