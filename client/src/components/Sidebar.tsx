import React, { useState } from 'react';
import './Sidebar.css';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: any) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [systemStatus, setSystemStatus] = useState('online');

  const menuItems = [
    { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
    { id: 'backlog', label: '📋 Backlog', icon: '📋' },
    { id: 'issues', label: '⚠️ Issues', icon: '⚠️' },
    { id: 'memory', label: '🧠 Memory', icon: '🧠' },
    { id: 'settings', label: '⚙️ Settings', icon: '⚙️' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo">VirtualPC</h1>
        <div className={`status-indicator ${systemStatus}`}></div>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`menu-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            title={item.label}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="agent-indicator">
          <div className="agent-dot"></div>
          <span>Agents Online</span>
        </div>
        <p className="version">VirtualPC v1.0</p>
      </div>
    </aside>
  );
}
