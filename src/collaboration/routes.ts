import { Router, Request, Response } from 'express';
import CollaborationManager from './realtime';

export const createCollaborationRouter = (
  collaborationManager: CollaborationManager
) => {
  const router = Router();

  /**
   * GET /collaboration/users
   * Get list of online users
   */
  router.get('/users', (req: Request, res: Response) => {
    const users = collaborationManager.getUsers();
    res.json({
      status: 'ok',
      count: users.length,
      users,
    });
  });

  /**
   * GET /collaboration/stats
   * Get collaboration statistics
   */
  router.get('/stats', (req: Request, res: Response) => {
    const users = collaborationManager.getUsers();
    const onlineCount = collaborationManager.getOnlineCount();
    const activityLog = collaborationManager.getActivityLog(100);

    res.json({
      status: 'ok',
      stats: {
        totalUsers: users.length,
        onlineUsers: onlineCount,
        offlineUsers: users.length - onlineCount,
        recentActivity: activityLog.length,
      },
    });
  });

  /**
   * GET /collaboration/activity
   * Get activity log
   */
  router.get('/activity', (req: Request, res: Response) => {
    const { limit = 50, userId } = req.query;
    const activity = collaborationManager.getActivityLog(
      parseInt(limit as string),
      userId as string
    );

    res.json({
      status: 'ok',
      count: activity.length,
      activity,
    });
  });

  /**
   * GET /collaboration/activity/:userId
   * Get user activity
   */
  router.get('/activity/:userId', (req: Request, res: Response) => {
    const { userId } = req.params;
    const activity = collaborationManager.getUserActivity(userId);

    res.json({
      status: 'ok',
      userId,
      activityCount: activity.length,
      activity,
    });
  });

  /**
   * POST /collaboration/notifications
   * Get user notifications
   */
  router.post('/notifications', (req: Request, res: Response) => {
    const { userId, type, filters } = req.body;

    // Simulate notification retrieval
    const notifications = [
      {
        id: '1',
        type: 'task_assigned',
        title: 'Task assigned to you',
        description: 'New task: Phase 6 - Team Collaboration',
        timestamp: new Date(),
        read: false,
      },
      {
        id: '2',
        type: 'comment_mention',
        title: 'You were mentioned',
        description: '@user mentioned you in a comment',
        timestamp: new Date(Date.now() - 60000),
        read: false,
      },
    ];

    res.json({
      status: 'ok',
      userId,
      count: notifications.length,
      notifications,
    });
  });

  /**
   * POST /collaboration/presence
   * Update user presence
   */
  router.post('/presence', (req: Request, res: Response) => {
    const { userId, presence } = req.body;

    res.json({
      status: 'updated',
      userId,
      presence,
    });
  });

  return router;
};

export default createCollaborationRouter;
