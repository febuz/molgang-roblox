import React, { useState, useEffect } from 'react';
import './Issues.css';

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  assigned_to: string;
  blocking_task: string;
  created_at: string;
  updated_at: string;
}

export default function Issues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    assigned_to: '',
    blocking_task: ''
  });

  useEffect(() => {
    loadIssues();
    const interval = setInterval(loadIssues, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadIssues = async () => {
    try {
      const res = await fetch('/api/issues');
      const data = await res.json();
      setIssues(data.issues || []);
    } catch (error) {
      console.error('Failed to load issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/issues/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setFormData({ title: '', description: '', severity: 'medium', assigned_to: '', blocking_task: '' });
        setShowForm(false);
        await loadIssues();
      }
    } catch (error) {
      console.error('Failed to create issue:', error);
    }
  };

  const filteredIssues = filter === 'all'
    ? issues
    : issues.filter(issue => issue.status === filter);

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#7f1d1d';
      case 'high': return '#991b1b';
      case 'medium': return '#78350f';
      case 'low': return '#1e3a1f';
      default: return '#374151';
    }
  };

  const severityTextColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#fca5a5';
      case 'high': return '#fca5a5';
      case 'medium': return '#fcd34d';
      case 'low': return '#86efac';
      default: return '#9ca3af';
    }
  };

  if (loading) {
    return <div className="issues-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="issues-container">
      <div className="issues-header">
        <h1>⚠️ Issues & Blockers</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Report Issue'}
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <form onSubmit={handleCreateIssue}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter issue title"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue in detail"
                rows={4}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Severity</label>
                <select value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label>Assign To</label>
                <select value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}>
                  <option value="">Unassigned</option>
                  <option value="fill">Fill (CEO)</option>
                  <option value="kai">Kai (CTO)</option>
                  <option value="zip">Zip (Dev)</option>
                  <option value="mira">Mira (Artist)</option>
                  <option value="luna">Luna (Tech Artist)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Blocking Task</label>
                <input
                  type="text"
                  value={formData.blocking_task}
                  onChange={(e) => setFormData({ ...formData, blocking_task: e.target.value })}
                  placeholder="e.g., MOLGANG-6.1"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary">Report Issue</button>
          </form>
        </div>
      )}

      <div className="filters">
        {(['all', 'open', 'in_progress', 'resolved'] as const).map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All Issues' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="issues-list">
        {filteredIssues.length === 0 ? (
          <p className="empty-state">No issues found</p>
        ) : (
          filteredIssues.map(issue => (
            <div
              key={issue.id}
              className="issue-item"
              style={{ borderLeftColor: severityColor(issue.severity) }}
            >
              <div className="issue-header">
                <div className="issue-title">
                  <span
                    className="severity-badge"
                    style={{
                      backgroundColor: severityColor(issue.severity),
                      color: severityTextColor(issue.severity)
                    }}
                  >
                    {issue.severity.toUpperCase()}
                  </span>
                  <h3>{issue.title}</h3>
                </div>
                <div className="issue-status">
                  <span className={`status-badge status-${issue.status}`}>
                    {issue.status === 'in_progress' ? 'In Progress' : issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                  </span>
                </div>
              </div>

              <p className="issue-description">{issue.description}</p>

              <div className="issue-footer">
                <div className="issue-meta">
                  <span className="meta-label">Assigned to:</span>
                  <span className="meta-value">{issue.assigned_to || 'Unassigned'}</span>
                  {issue.blocking_task && (
                    <>
                      <span className="meta-label">Blocking:</span>
                      <span className="meta-value">{issue.blocking_task}</span>
                    </>
                  )}
                </div>
                <div className="issue-dates">
                  <span className="meta-date">Created: {new Date(issue.created_at).toLocaleDateString()}</span>
                  <span className="meta-date">Updated: {new Date(issue.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="issues-stats">
        <div className="stat">
          <h4>Open</h4>
          <p>{issues.filter(i => i.status === 'open').length}</p>
        </div>
        <div className="stat">
          <h4>In Progress</h4>
          <p>{issues.filter(i => i.status === 'in_progress').length}</p>
        </div>
        <div className="stat">
          <h4>Critical</h4>
          <p style={{ color: '#fca5a5' }}>{issues.filter(i => i.severity === 'critical').length}</p>
        </div>
        <div className="stat">
          <h4>Total</h4>
          <p>{issues.length}</p>
        </div>
      </div>
    </div>
  );
}
