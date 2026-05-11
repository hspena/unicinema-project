import React, { useState, useEffect } from 'react';
import Sidebar  from './Sidebar';
import Topbar   from './Topbar';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change / window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(prev => !prev)} />
        <main className="page-wrapper">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;