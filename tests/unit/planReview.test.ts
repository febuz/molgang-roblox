import {
  splitMarkdownIntoSections,
  planStatus,
  aggregateFeedback,
  Plan,
  PlanSection,
} from '../../src/plan-review';

/**
 * Unit tests for the plan-review pure logic: splitting a markdown plan into
 * comment-able sections, deriving overall status, and aggregating section-
 * anchored feedback for the engineers.
 */

const MD = `Intro paragraph before any heading.

## Data layer
Use Postgres for the task engine.

## API
REST under /api.

### Auth
JWT sessions.`;

describe('splitMarkdownIntoSections', () => {
  it('splits on ATX headings and captures pre-heading text as Overview', () => {
    const s = splitMarkdownIntoSections(MD);
    expect(s.map(x => x.heading)).toEqual(['Overview', 'Data layer', 'API', 'Auth']);
    expect(s[1].body).toContain('Postgres');
    expect(s.every(x => x.status === 'open')).toBe(true);
  });

  it('gives unique ids even for duplicate headings', () => {
    const s = splitMarkdownIntoSections('## Step\na\n## Step\nb');
    expect(s[0].id).not.toEqual(s[1].id);
  });

  it('handles empty input', () => {
    expect(splitMarkdownIntoSections('')).toEqual([]);
  });
});

describe('planStatus', () => {
  const mk = (st: PlanSection['status']): PlanSection => ({ id: 'x', heading: 'h', body: '', status: st });
  it('is approved only when every section is accepted', () => {
    expect(planStatus([mk('accepted'), mk('accepted')])).toBe('approved');
  });
  it('is changes-requested when any section needs changes', () => {
    expect(planStatus([mk('accepted'), mk('needs-changes')])).toBe('changes-requested');
  });
  it('is in-review otherwise', () => {
    expect(planStatus([mk('accepted'), mk('open')])).toBe('in-review');
    expect(planStatus([])).toBe('in-review');
  });
});

describe('aggregateFeedback', () => {
  const basePlan = (): Plan => ({
    id: 'p1', title: 'Persistence plan', author: 'Athena', createdAt: 'now',
    sections: [
      { id: 'data-layer', heading: 'Data layer', body: '', status: 'needs-changes' },
      { id: 'api', heading: 'API', body: '', status: 'accepted' },
    ],
    comments: [
      { id: 'c1', sectionId: 'data-layer', author: 'Operator', text: 'Use a connection pool', createdAt: 'now', resolved: false },
      { id: 'c2', sectionId: 'api', author: 'Operator', text: 'resolved note', createdAt: 'now', resolved: true },
    ],
  });

  it('digests only sections needing changes or with unresolved comments', () => {
    const r = aggregateFeedback(basePlan());
    expect(r.status).toBe('changes-requested');
    expect(r.actionable).toBe(1);
    expect(r.digest).toContain('Data layer');
    expect(r.digest).toContain('connection pool');
    expect(r.digest).not.toContain('resolved note'); // resolved comment excluded
  });

  it('reports all-accepted when nothing is open', () => {
    const p = basePlan();
    p.sections.forEach(s => (s.status = 'accepted'));
    p.comments.forEach(c => (c.resolved = true));
    const r = aggregateFeedback(p);
    expect(r.status).toBe('approved');
    expect(r.actionable).toBe(0);
    expect(r.digest).toContain('No open comments');
  });
});
