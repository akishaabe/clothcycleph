import type { HttpRequest as Request, HttpResponse as Response } from '../types/http.js';
import type { HttpRequest as AuthRequest } from '../types/http.js';
import { AppError } from '../utils/errorHandler.js';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../services/notificationService.js';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { unread } = req.query;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const notifications = await getUserNotifications(userId, unread === 'true');

    res.json({
      data: notifications,
      count: notifications.length,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const count = await getUnreadNotificationCount(userId);

    res.json({ unread_count: count });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const preferences = await getNotificationPreferences(userId);
    res.json({ data: preferences });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const updatePreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const preferences = await updateNotificationPreferences(userId, req.body || {});
    res.json({ message: 'Notification preferences saved', data: preferences });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const notification = await markNotificationAsRead(id, userId);

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    res.json({
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const notifications = await markAllNotificationsAsRead(userId);

    res.json({
      message: 'All notifications marked as read',
      count: notifications.length,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const deleteNotificationById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'User not authenticated');
    }

    const notification = await deleteNotification(id, userId);

    if (!notification) {
      throw new AppError(404, 'Notification not found');
    }

    res.json({
      message: 'Notification deleted',
      data: notification,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
