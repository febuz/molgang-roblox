import React, { useState, useEffect } from 'react';
import './Backlog.css';

interface BacklogItem {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to: string;
  sprint: string;
  created_at: string;
  description?: string;
}

export default function Backlog() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    sprint: 'week1'
  });

  useEffect(() => {
    loadBacklog();
    const interval = setInterval(loadBacklog, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadBacklog = async () => {
    try {
      const res = await fetch('/api/backlog');
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to load backlog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/backlog/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setFormData({ title: '', description: '', priority: 'medium', assigned_to: '', sprint: 'week1' });
        setShowForm(false);
        await loadBacklog();
      }
    } catch (error) {
      console.error('Failed to create item:', error);
    }
  };

  const filteredItems = filter === 'all'
    ? items
    : items.filter(item => item.status === filter);

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#a0a0a0';
    }
  };

  if (loading) {
    return <div className="backlog-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="backlog-container">
      <div className="backlog-header">
        <h1>📋 Backlog Management</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Item'}
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <form onSubmit={handleCreateItem}>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter backlog item title"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add details (optional)"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Priority</label>
                <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
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
                <label>Sprint</label>
                <select value={formData.sprint} onChange={(e) => setFormData({ ...formData, sprint: e.target.value })}>
                  <option value="week1">Week 1</option>
                  <option value="week2">Week 2</option>
                  <option value="week3">Week 3</option>
                  <option value="week4">Week 4</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary">Create Backlog Item</button>
          </form>
        </div>
      )}

      <div className="filters">
        {(['all', 'pending', 'in_progress', 'completed'] as const).map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All Items' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="backlog-list">
        {filteredItems.length === 0 ? (
          <p className="empty-state">No backlog items found</p>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="backlog-item">
              <div className="item-header">
                <div className="item-title">
                  <div
                    className="priority-indicator"
                    style={{ backgroundColor: priorityColor(item.priority) }}
                    title={`Priority: ${item.priority}`}
                  ></div>
                  <h3>{item.title}</h3>
                </div>
                <div className="item-status">
                  <span className={`status-badge status-${item.status}`}>
                    {item.status === 'in_progress' ? 'In Progress' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </div>
              </div>

              {item.description && (
                <p className="item-description">{item.description}</p>
              )}

              <div className="item-footer">
                <div className="item-meta">
                  <span className="meta-tag">{item.assigned_to || 'Unassigned'}</span>
                  <span className="meta-tag">{item.sprint}</span>
                  <span className="meta-date">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="backlog-stats">
        <div className="stat">
          <h4>Total Items</h4>
          <p>{items.length}</p>
        </div>
        <div className="stat">
          <h4>In Progress</h4>
          <p>{items.filter(i => i.status === 'in_progress').length}</p>
        </div>
        <div className="stat">
          <h4>Completed</h4>
          <p>{items.filter(i => i.status === 'completed').length}</p>
        </div>
      </div>
    </div>
  );
}
