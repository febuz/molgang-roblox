"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationManager = void 0;
const socket_io_1 = require("socket.io");
class CollaborationManager {
    constructor(httpServer) {
        this.users = new Map();
        this.activityLog = [];
        this.collaborations = new Map();
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
            transports: ['websocket', 'polling'],
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`User connected: ${socket.id}`);
            // User joins
            socket.on('user:join', (userData) => {
                const user = {
                    id: socket.id,
                    name: userData.name || 'Guest',
                    email: userData.email || '',
                    avatar: userData.avatar,
                    status: 'online',
                    lastSeen: new Date(),
                };
                this.users.set(socket.id, user);
                this.broadcastUserList();
                socket.emit('user:joined', { userId: socket.id });
            });
            // User status changed
            socket.on('user:status', (status) => {
                const user = this.users.get(socket.id);
                if (user) {
                    user.status = status;
                    user.lastSeen = new Date();
                    this.broadcastUserList();
                }
            });
            // Task collaboration
            socket.on('task:create', (taskData) => {
                this.logActivity({
                    userId: socket.id,
                    action: 'create',
                    resource: 'task',
                    timestamp: new Date(),
                    changes: taskData,
                });
                this.io.emit('task:created', {
                    userId: socket.id,
                    data: taskData,
                    timestamp: new Date(),
                });
            });
            socket.on('task:update', (taskId, updates) => {
                this.logActivity({
                    userId: socket.id,
                    action: 'update',
                    resource: `task:${taskId}`,
                    timestamp: new Date(),
                    changes: updates,
                });
                this.io.emit('task:updated', {
                    userId: socket.id,
                    taskId,
                    updates,
                    timestamp: new Date(),
                });
            });
            socket.on('task:delete', (taskId) => {
                this.logActivity({
                    userId: socket.id,
                    action: 'delete',
                    resource: `task:${taskId}`,
                    timestamp: new Date(),
                });
                this.io.emit('task:deleted', {
                    userId: socket.id,
                    taskId,
                    timestamp: new Date(),
                });
            });
            // Typing indicator
            socket.on('typing:start', (resource) => {
                socket.broadcast.emit('typing:indicator', {
                    userId: socket.id,
                    resource,
                    isTyping: true,
                });
            });
            socket.on('typing:stop', (resource) => {
                socket.broadcast.emit('typing:indicator', {
                    userId: socket.id,
                    resource,
                    isTyping: false,
                });
            });
            // Presence
            socket.on('presence:update', (data) => {
                const user = this.users.get(socket.id);
                if (user) {
                    user.lastSeen = new Date();
                    this.io.emit('presence:update', {
                        userId: socket.id,
                        presence: data,
                    });
                }
            });
            // Disconnect
            socket.on('disconnect', () => {
                const user = this.users.get(socket.id);
                if (user) {
                    user.status = 'offline';
                    user.lastSeen = new Date();
                }
                this.broadcastUserList();
                console.log(`User disconnected: ${socket.id}`);
            });
        });
    }
    broadcastUserList() {
        const users = Array.from(this.users.values());
        this.io.emit('users:list', users);
    }
    logActivity(activity) {
        this.activityLog.push(activity);
        // Keep only last 1000 activities
        if (this.activityLog.length > 1000) {
            this.activityLog.shift();
        }
    }
    getUsers() {
        return Array.from(this.users.values());
    }
    getActivityLog(limit = 50, userId) {
        let activities = this.activityLog;
        if (userId) {
            activities = activities.filter((a) => a.userId === userId);
        }
        return activities.slice(-limit);
    }
    getOnlineCount() {
        return Array.from(this.users.values()).filter((u) => u.status === 'online').length;
    }
    getUserActivity(userId) {
        return this.activityLog.filter((a) => a.userId === userId);
    }
}
exports.CollaborationManager = CollaborationManager;
exports.default = CollaborationManager;
//# sourceMappingURL=realtime.js.map