"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCollaborationRouter = void 0;
const express_1 = require("express");
const createCollaborationRouter = (collaborationManager) => {
    const router = (0, express_1.Router)();
    /**
     * GET /collaboration/users
     * Get list of online users
     */
    router.get('/users', (req, res) => {
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
    router.get('/stats', (req, res) => {
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
    router.get('/activity', (req, res) => {
        const { limit = 50, userId } = req.query;
        const activity = collaborationManager.getActivityLog(parseInt(limit), userId);
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
    router.get('/activity/:userId', (req, res) => {
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
    router.post('/notifications', (req, res) => {
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
    router.post('/presence', (req, res) => {
        const { userId, presence } = req.body;
        res.json({
            status: 'updated',
            userId,
            presence,
        });
    });
    return router;
};
exports.createCollaborationRouter = createCollaborationRouter;
exports.default = exports.createCollaborationRouter;
//# sourceMappingURL=routes.js.map