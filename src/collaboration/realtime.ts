import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
}

interface CollaborationEvent {
  type: string;
  userId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

interface ActivityLog {
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  changes?: Record<string, unknown>;
}

export class CollaborationManager {
  private io: SocketIOServer;
  private users: Map<string, User> = new Map();
  private activityLog: ActivityLog[] = [];
  private collaborations: Map<string, Set<string>> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`User connected: ${socket.id}`);

      // User joins
      socket.on('user:join', (userData: Partial<User>) => {
        const user: User = {
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
      socket.on('user:status', (status: User['status']) => {
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
      socket.on('typing:start', (resource: string) => {
        socket.broadcast.emit('typing:indicator', {
          userId: socket.id,
          resource,
          isTyping: true,
        });
      });

      socket.on('typing:stop', (resource: string) => {
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

  private broadcastUserList() {
    const users = Array.from(this.users.values());
    this.io.emit('users:list', users);
  }

  private logActivity(activity: ActivityLog) {
    this.activityLog.push(activity);
    // Keep only last 1000 activities
    if (this.activityLog.length > 1000) {
      this.activityLog.shift();
    }
  }

  public getUsers(): User[] {
    return Array.from(this.users.values());
  }

  public getActivityLog(
    limit: number = 50,
    userId?: string
  ): ActivityLog[] {
    let activities = this.activityLog;
    if (userId) {
      activities = activities.filter((a) => a.userId === userId);
    }
    return activities.slice(-limit);
  }

  public getOnlineCount(): number {
    return Array.from(this.users.values()).filter(
      (u) => u.status === 'online'
    ).length;
  }

  public getUserActivity(userId: string): ActivityLog[] {
    return this.activityLog.filter((a) => a.userId === userId);
  }
}

export default CollaborationManager;
