import { Server as HTTPServer } from 'http';
interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status: 'online' | 'away' | 'offline';
    lastSeen: Date;
}
interface ActivityLog {
    userId: string;
    action: string;
    resource: string;
    timestamp: Date;
    changes?: Record<string, unknown>;
}
export declare class CollaborationManager {
    private io;
    private users;
    private activityLog;
    private collaborations;
    constructor(httpServer: HTTPServer);
    private setupEventHandlers;
    private broadcastUserList;
    private logActivity;
    getUsers(): User[];
    getActivityLog(limit?: number, userId?: string): ActivityLog[];
    getOnlineCount(): number;
    getUserActivity(userId: string): ActivityLog[];
}
export default CollaborationManager;
//# sourceMappingURL=realtime.d.ts.map