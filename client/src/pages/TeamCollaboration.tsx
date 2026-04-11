import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import './TeamCollaboration.css';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  avatar?: string;
}

interface Activity {
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  changes?: Record<string, unknown>;
}

export const TeamCollaboration: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<number>(0);
  const [typing, setTyping] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io('/collaboration', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      newSocket.emit('user:join', {
        name: 'Current User',
        email: 'user@example.com',
      });
    });

    newSocket.on('users:list', (users: TeamMember[]) => {
      setTeamMembers(users);
    });

    newSocket.on('task:created', (data) => {
      setActivities((prev) => [
        {
          userId: data.userId,
          action: 'created',
          resource: 'task',
          timestamp: new Date().toISOString(),
          changes: data.data,
        },
        ...prev,
      ].slice(0, 50));
    });

    newSocket.on('typing:indicator', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTyping((prev) => {
        const updated = new Set(prev);
        if (isTyping) {
          updated.add(userId);
        } else {
          updated.delete(userId);
        }
        return updated;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const getOnlineCount = () =>
    teamMembers.filter((m) => m.status === 'online').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#10b981';
      case 'away':
        return '#f59e0b';
      case 'offline':
        return '#6b7280';
      default:
        return '#999';
    }
  };

  return (
    <div className="team-collaboration">
      <div className="collab-header">
        <h1>👥 Team Collaboration</h1>
        <div className="collab-stats">
          <span className="stat">Online: {getOnlineCount()}/{teamMembers.length}</span>
          {notifications > 0 && (
            <span className="notification-badge">{notifications}</span>
          )}
        </div>
      </div>

      <div className="collab-grid">
        {/* Team Members */}
        <div className="collab-section">
          <h2>Team Members</h2>
          <div className="members-list">
            {teamMembers.map((member) => (
              <div key={member.id} className="member-card">
                <div className="member-avatar">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} />
                  ) : (
                    <div className="avatar-placeholder">
                      {member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="member-info">
                  <div className="member-name">{member.name}</div>
                  <div className="member-email">{member.email}</div>
                  <div className="member-status">
                    <span
                      className="status-dot"
                      style={{ backgroundColor: getStatusColor(member.status) }}
                    />
                    <span className="status-text">{member.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="collab-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {activities.length === 0 ? (
              <div className="empty-state">No activity yet</div>
            ) : (
              activities.map((activity, idx) => (
                <div key={idx} className="activity-item">
                  <div className="activity-icon">📝</div>
                  <div className="activity-content">
                    <div className="activity-action">
                      <strong>User</strong> {activity.action} {activity.resource}
                    </div>
                    <div className="activity-time">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Typing Indicator */}
      {typing.size > 0 && (
        <div className="typing-indicator">
          <span>✏️ {typing.size} user(s) typing...</span>
        </div>
      )}

      {/* Notifications */}
      <div className="notifications-section">
        <h2>Notifications</h2>
        <div className="notifications-list">
          <div className="notification-item unread">
            <div className="notification-icon">🎯</div>
            <div className="notification-content">
              <div className="notification-title">Task assigned to you</div>
              <div className="notification-desc">
                Phase 6 - Team Collaboration Features
              </div>
              <div className="notification-time">just now</div>
            </div>
          </div>
          <div className="notification-item unread">
            <div className="notification-icon">💬</div>
            <div className="notification-content">
              <div className="notification-title">You were mentioned</div>
              <div className="notification-desc">@user mentioned you in a comment</div>
              <div className="notification-time">5 minutes ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCollaboration;
