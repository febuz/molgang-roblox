import CollaborationManager from '../../src/features/collaboration';

describe('CollaborationManager', () => {
  let cm: CollaborationManager;
  beforeEach(() => {
    cm = new CollaborationManager();
  });

  describe('collaborations + messages', () => {
    it('starts a collaboration and appends messages', () => {
      const c = cm.startCollaboration('code-review', ['kai', 'zip'], 'high');
      expect(c.status).toBe('active');
      const m = cm.addMessage(c.id, 'kai', 'LGTM');
      expect(m).not.toBeNull();
      expect(cm.getCollaborationStatus(c.id).messageCount).toBe(1);
    });

    it('returns null adding a message to an unknown collaboration', () => {
      expect(cm.addMessage('nope', 'kai', 'hi')).toBeNull();
      expect(cm.getCollaborationStatus('nope')).toBeNull();
    });
  });

  describe('workspaces + documents', () => {
    it('creates a workspace (owner included in members) and adds documents', () => {
      const ws = cm.createWorkspace('Design', 'mira', ['luna']);
      expect(ws.members).toEqual(['mira', 'luna']);
      const doc = cm.addDocument(ws.id, 'Spec', 'body', 'mira')!;
      expect(doc.version).toBe(1);
      expect(doc.status).toBe('draft');
    });

    it('returns null adding a document to an unknown workspace', () => {
      expect(cm.addDocument('nope', 't', 'c', 'a')).toBeNull();
    });

    it('edits a document (bumps version) and reviews it', () => {
      const ws = cm.createWorkspace('W', 'mira', []);
      const doc = cm.addDocument(ws.id, 'Spec', 'v1', 'mira')!;
      const edited = cm.editDocument(ws.id, doc.id, 'v2', 'luna')!;
      expect(edited.version).toBe(2);
      expect(edited.lastEditedBy).toBe('luna');
      const reviewed = cm.reviewDocument(ws.id, doc.id, 'approved')!;
      expect(reviewed.status).toBe('approved');
    });

    it('returns null editing/reviewing an unknown document', () => {
      const ws = cm.createWorkspace('W', 'mira', []);
      expect(cm.editDocument(ws.id, 'nope', 'x', 'a')).toBeNull();
      expect(cm.reviewDocument(ws.id, 'nope', 'approved')).toBeNull();
      expect(cm.editDocument('nows', 'd', 'x', 'a')).toBeNull();
    });
  });

  describe('id uniqueness (regression for same-ms collisions)', () => {
    it('rapid createWorkspace calls get distinct ids (no overwrite)', () => {
      const a = cm.createWorkspace('A', 'o', []);
      const b = cm.createWorkspace('B', 'o', []);
      expect(a.id).not.toBe(b.id);
      expect(cm.getTeamSummary().totalWorkspaces).toBe(2);
    });

    it('rapidly-added documents are independently addressable', () => {
      const ws = cm.createWorkspace('W', 'o', []);
      const d1 = cm.addDocument(ws.id, 'one', 'c', 'o')!;
      const d2 = cm.addDocument(ws.id, 'two', 'c', 'o')!;
      expect(d1.id).not.toBe(d2.id);
      // Editing d2 must not mutate d1 (would happen if ids collided).
      cm.editDocument(ws.id, d2.id, 'edited-two', 'o');
      const reread1 = cm.editDocument(ws.id, d1.id, 'edited-one', 'o')!;
      expect(reread1.title).toBe('one');
      expect(reread1.content).toBe('edited-one');
    });

    it('rapid collaborations + messages get distinct ids', () => {
      const c1 = cm.startCollaboration('status-update', ['a']);
      const c2 = cm.startCollaboration('status-update', ['b']);
      expect(c1.id).not.toBe(c2.id);
      const m1 = cm.addMessage(c1.id, 'a', 'one')!;
      const m2 = cm.addMessage(c1.id, 'a', 'two')!;
      expect(m1.id).not.toBe(m2.id);
    });
  });

  describe('aggregation', () => {
    it('getTeamActivity lists active collaborations and documents, newest first', () => {
      const c = cm.startCollaboration('task-discussion', ['kai']);
      const ws = cm.createWorkspace('W', 'mira', []);
      cm.addDocument(ws.id, 'Doc', 'c', 'mira');
      const activity = cm.getTeamActivity();
      expect(activity.some(a => a.type === 'collaboration')).toBe(true);
      expect(activity.some(a => a.type === 'document')).toBe(true);
      // sorted descending by timestamp
      for (let i = 1; i < activity.length; i++) {
        expect(activity[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(activity[i].timestamp.getTime());
      }
    });

    it('getTeamSummary counts active collaborations, workspaces, documents', () => {
      cm.startCollaboration('code-review', ['a']);
      const ws = cm.createWorkspace('W', 'o', []);
      cm.addDocument(ws.id, 'D', 'c', 'o');
      const s = cm.getTeamSummary();
      expect(s.activeCollaborations).toBe(1);
      expect(s.totalWorkspaces).toBe(1);
      expect(s.totalDocuments).toBe(1);
    });
  });
});
