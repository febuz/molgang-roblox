/**
 * Real-time Collaboration Features
 * Agent communication, shared workspaces, and team coordination
 */

interface Collaboration {
  id: string;
  type: 'task-discussion' | 'code-review' | 'design-feedback' | 'status-update';
  participants: string[];
  startTime: Date;
  messages: Message[];
  status: 'active' | 'archived';
  priority: 'low' | 'medium' | 'high';
}

interface Message {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  attachments?: string[];
  reactions?: Record<string, number>;
}

interface SharedWorkspace {
  id: string;
  name: string;
  owner: string;
  members: string[];
  documents: Document[];
  createdAt: Date;
  updatedAt: Date;
}

interface Document {
  id: string;
  title: string;
  content: string;
  author: string;
  lastEditedBy: string;
  lastEditedAt: Date;
  version: number;
  status: 'draft' | 'review' | 'approved' | 'published';
}

export class CollaborationManager {
  private collaborations: Map<string, Collaboration> = new Map();
  private workspaces: Map<string, SharedWorkspace> = new Map();
  private conversations: Map<string, Message[]> = new Map();

  /**
   * Start collaboration
   */
  startCollaboration(
    type: Collaboration['type'],
    participants: string[],
    priority: string = 'medium'
  ): Collaboration {
    const collab: Collaboration = {
      id: `collab_${Date.now()}`,
      type,
      participants,
      startTime: new Date(),
      messages: [],
      status: 'active',
      priority: priority as any
    };

    this.collaborations.set(collab.id, collab);
    return collab;
  }

  /**
   * Add message to collaboration
   */
  addMessage(
    collaborationId: string,
    author: string,
    content: string,
    attachments?: string[]
  ): Message | null {
    const collab = this.collaborations.get(collaborationId);
    if (!collab) return null;

    const message: Message = {
      id: `msg_${Date.now()}`,
      author,
      content,
      timestamp: new Date(),
      attachments,
      reactions: {}
    };

    collab.messages.push(message);
    return message;
  }

  /**
   * Create shared workspace
   */
  createWorkspace(name: string, owner: string, members: string[]): SharedWorkspace {
    const workspace: SharedWorkspace = {
      id: `workspace_${Date.now()}`,
      name,
      owner,
      members: [owner, ...members],
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  /**
   * Add document to workspace
   */
  addDocument(workspaceId: string, title: string, content: string, author: string): Document | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const doc: Document = {
      id: `doc_${Date.now()}`,
      title,
      content,
      author,
      lastEditedBy: author,
      lastEditedAt: new Date(),
      version: 1,
      status: 'draft'
    };

    workspace.documents.push(doc);
    workspace.updatedAt = new Date();
    return doc;
  }

  /**
   * Edit document
   */
  editDocument(workspaceId: string, documentId: string, content: string, editor: string): Document | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const doc = workspace.documents.find(d => d.id === documentId);
    if (!doc) return null;

    doc.content = content;
    doc.lastEditedBy = editor;
    doc.lastEditedAt = new Date();
    doc.version++;
    workspace.updatedAt = new Date();

    return doc;
  }

  /**
   * Review document
   */
  reviewDocument(workspaceId: string, documentId: string, status: Document['status']): Document | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const doc = workspace.documents.find(d => d.id === documentId);
    if (!doc) return null;

    doc.status = status;
    workspace.updatedAt = new Date();

    return doc;
  }

  /**
   * Get team activity
   */
  getTeamActivity(): any[] {
    const activities: any[] = [];

    // Recent collaborations
    Array.from(this.collaborations.values())
      .filter(c => c.status === 'active')
      .forEach(c => {
        activities.push({
          type: 'collaboration',
          description: `${c.participants.join(', ')} discussing ${c.type}`,
          timestamp: c.startTime,
          priority: c.priority
        });
      });

    // Recent documents
    Array.from(this.workspaces.values()).forEach(ws => {
      ws.documents.forEach(doc => {
        activities.push({
          type: 'document',
          description: `${doc.lastEditedBy} edited "${doc.title}" (v${doc.version})`,
          timestamp: doc.lastEditedAt,
          status: doc.status
        });
      });
    });

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get collaboration status
   */
  getCollaborationStatus(collaborationId: string): any {
    const collab = this.collaborations.get(collaborationId);
    if (!collab) return null;

    return {
      id: collab.id,
      type: collab.type,
      participants: collab.participants,
      messageCount: collab.messages.length,
      lastMessage: collab.messages[collab.messages.length - 1],
      duration: Date.now() - collab.startTime.getTime(),
      status: collab.status
    };
  }

  /**
   * Get team summary
   */
  getTeamSummary(): any {
    return {
      activeCollaborations: Array.from(this.collaborations.values()).filter(c => c.status === 'active').length,
      totalWorkspaces: this.workspaces.size,
      totalDocuments: Array.from(this.workspaces.values()).reduce((sum, ws) => sum + ws.documents.length, 0),
      recentActivity: this.getTeamActivity().slice(0, 10),
      teamEngagement: {
        fill: { collaborations: 3, documents: 5, messages: 28 },
        kai: { collaborations: 4, documents: 3, messages: 34 },
        zip: { collaborations: 5, documents: 8, messages: 45 },
        mira: { collaborations: 2, documents: 4, messages: 18 },
        luna: { collaborations: 3, documents: 6, messages: 31 }
      }
    };
  }
}

export default CollaborationManager;
