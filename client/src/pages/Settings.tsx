import React, { useState } from 'react';
import './Settings.css';

export default function Settings() {
  const [settings, setSettings] = useState({
    theme: 'dark',
    refreshRate: '5000',
    notifications: true,
    autoBackup: true
  });

  const handleChange = (field: string, value: any) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = () => {
    localStorage.setItem('virtualpc-settings', JSON.stringify(settings));
    alert('Settings saved!');
  };

  return (
    <div className="settings-container">
      <h1>⚙️ Settings</h1>

      <div className="settings-sections">
        <section className="settings-section">
          <h2>Display</h2>
          <div className="setting-group">
            <label>Theme</label>
            <select value={settings.theme} onChange={(e) => handleChange('theme', e.target.value)}>
              <option value="dark">Dark (Default)</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
            <p className="setting-hint">Choose your preferred color scheme</p>
          </div>
        </section>

        <section className="settings-section">
          <h2>Updates & Refresh</h2>
          <div className="setting-group">
            <label>Refresh Rate (ms)</label>
            <input
              type="number"
              value={settings.refreshRate}
              onChange={(e) => handleChange('refreshRate', e.target.value)}
              min="1000"
              max="60000"
              step="1000"
            />
            <p className="setting-hint">How often to fetch updated data (milliseconds)</p>
          </div>

          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.autoBackup}
                onChange={(e) => handleChange('autoBackup', e.target.checked)}
              />
              <span>Auto-backup memory data</span>
            </label>
            <p className="setting-hint">Automatically backup LightRAG data periodically</p>
          </div>
        </section>

        <section className="settings-section">
          <h2>Notifications</h2>
          <div className="setting-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleChange('notifications', e.target.checked)}
              />
              <span>Enable notifications</span>
            </label>
            <p className="setting-hint">Get alerts for critical issues and blockers</p>
          </div>
        </section>

        <section className="settings-section">
          <h2>System Information</h2>
          <div className="info-group">
            <div className="info-item">
              <span className="info-label">Version:</span>
              <span className="info-value">VirtualPC v1.0</span>
            </div>
            <div className="info-item">
              <span className="info-label">API Endpoint:</span>
              <span className="info-value">localhost:3100</span>
            </div>
            <div className="info-item">
              <span className="info-label">Neo4j Memory:</span>
              <span className="info-value">Connected</span>
            </div>
            <div className="info-item">
              <span className="info-label">Kafka Broker:</span>
              <span className="info-value">Active</span>
            </div>
          </div>
        </section>

        <section className="settings-section danger-zone">
          <h2>Danger Zone</h2>
          <div className="danger-actions">
            <button className="btn-danger" onClick={() => {
              if (confirm('Clear all local data? This cannot be undone.')) {
                localStorage.clear();
                alert('Local data cleared');
              }
            }}>
              🗑️ Clear Local Data
            </button>
            <button className="btn-danger" onClick={() => {
              if (confirm('Reset all settings to defaults?')) {
                setSettings({ theme: 'dark', refreshRate: '5000', notifications: true, autoBackup: true });
                alert('Settings reset');
              }
            }}>
              🔄 Reset Settings
            </button>
          </div>
        </section>
      </div>

      <div className="settings-footer">
        <button className="btn-primary" onClick={handleSave}>
          💾 Save Settings
        </button>
      </div>
    </div>
  );
}
