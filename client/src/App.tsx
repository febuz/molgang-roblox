import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Backlog from './pages/Backlog';
import Issues from './pages/Issues';
import Memory from './pages/Memory';
import Settings from './pages/Settings';
import { useWebSocket } from './hooks/useWebSocket';

type PageType = 'dashboard' | 'backlog' | 'issues' | 'memory' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const { wsData } = useWebSocket();

  useEffect(() => {
    // Check system health on load
    fetch('/api/health')
      .then(r => r.json())
      .then(setSystemHealth)
      .catch(console.error);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard systemHealth={systemHealth} />;
      case 'backlog':
        return <Backlog />;
      case 'issues':
        return <Issues />;
      case 'memory':
        return <Memory />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard systemHealth={systemHealth} />;
    }
  };

  return (
    <div className="app">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
