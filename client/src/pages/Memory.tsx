import React, { useState, useEffect } from 'react';
import './Memory.css';

interface MemoryEntry {
  id: string;
  type: 'decision' | 'fact' | 'precedent' | 'learning';
  content: string;
  agent: string;
  timestamp: string;
  tags: string[];
  relatedTo?: string[];
}

export default function Memory() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'fact',
    content: '',
    agent: 'fill',
    tags: ''
  });

  useEffect(() => {
    loadMemoryStatus();
    const interval = setInterval(loadMemoryStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadMemoryStatus = async () => {
    try {
      const res = await fetch('/api/memory/status');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Failed to load memory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const res = await fetch('/api/memory/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await res.json();
      setQueryResults(data.results || []);
    } catch (error) {
      console.error('Failed to query memory:', error);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/memory/add-fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim())
        })
      });

      if (res.ok) {
        setFormData({ type: 'fact', content: '', agent: 'fill', tags: '' });
        setShowAddForm(false);
        await loadMemoryStatus();
      }
    } catch (error) {
      console.error('Failed to add memory entry:', error);
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'decision': return '#3b82f6';
      case 'fact': return '#22c55e';
      case 'precedent': return '#a855f7';
      case 'learning': return '#f59e0b';
      default: return '#a0a0a0';
    }
  };

  if (loading) {
    return <div className="memory-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="memory-container">
      <div className="memory-header">
        <h1>🧠 Shared Memory (LightRAG)</h1>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '✕ Cancel' : '+ Add to Memory'}
        </button>
      </div>

      {showAddForm && (
        <div className="form-container">
          <form onSubmit={handleAddEntry}>
            <div className="form-group">
              <label>Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="fact">Fact</option>
                <option value="decision">Decision</option>
                <option value="precedent">Precedent</option>
                <option value="learning">Learning</option>
              </select>
            </div>

            <div className="form-group">
              <label>Content</label>
              <textarea
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter memory content"
                rows={4}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Agent</label>
                <select value={formData.agent} onChange={(e) => setFormData({ ...formData, agent: e.target.value })}>
                  <option value="fill">Fill (CEO)</option>
                  <option value="kai">Kai (CTO)</option>
                  <option value="zip">Zip (Dev)</option>
                  <option value="mira">Mira (Artist)</option>
                  <option value="luna">Luna (Tech Artist)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="e.g., optimization, zone-design, pvp"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary">Add to Memory</button>
          </form>
        </div>
      )}

      <div className="memory-search">
        <form onSubmit={handleQuery}>
          <div className="search-group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team knowledge, decisions, precedents..."
            />
            <button type="submit" className="btn-primary">🔍 Search</button>
          </div>
        </form>
      </div>

      {queryResults.length > 0 && (
        <div className="query-results">
          <h2>Search Results</h2>
          <div className="results-list">
            {queryResults.map((result, idx) => (
              <div key={idx} className="result-item">
                <h4>{result.title || result.content.substring(0, 50)}</h4>
                <p>{result.content}</p>
                <div className="result-meta">
                  <span className="meta-tag">{result.agent || 'Unknown'}</span>
                  <span className="meta-tag">{result.similarity || 'N/A'}% match</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="memory-entries">
        <h2>📚 Memory Entries ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="empty-state">No memory entries yet</p>
        ) : (
          <div className="entries-list">
            {entries.map(entry => (
              <div key={entry.id} className="memory-entry">
                <div className="entry-header">
                  <span
                    className="entry-type"
                    style={{ backgroundColor: typeColor(entry.type) }}
                    title={entry.type}
                  >
                    {entry.type.toUpperCase()}
                  </span>
                  <span className="entry-agent">{entry.agent || 'System'}</span>
                  <span className="entry-date">
                    {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="entry-content">{entry.content}</p>

                {entry.tags && entry.tags.length > 0 && (
                  <div className="entry-tags">
                    {entry.tags.map(tag => (
                      <span key={tag} className="tag">#{tag}</span>
                    ))}
                  </div>
                )}

                {entry.relatedTo && entry.relatedTo.length > 0 && (
                  <div className="entry-related">
                    <span className="related-label">Related to:</span>
                    {entry.relatedTo.map(rel => (
                      <span key={rel} className="related-item">{rel}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="memory-stats">
        <h2>💾 Memory Statistics</h2>
        <div className="stats-grid">
          <div className="stat-box">
            <h4>Total Entries</h4>
            <p>{entries.length}</p>
          </div>
          <div className="stat-box">
            <h4>Decisions</h4>
            <p>{entries.filter(e => e.type === 'decision').length}</p>
          </div>
          <div className="stat-box">
            <h4>Facts</h4>
            <p>{entries.filter(e => e.type === 'fact').length}</p>
          </div>
          <div className="stat-box">
            <h4>Learnings</h4>
            <p>{entries.filter(e => e.type === 'learning').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
