import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar  from './Topbar';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close sidebar when resizing to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="app-layout">

      {/* Dark overlay behind sidebar on mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(p => !p)} />
        <div className="page-wrapper">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppLayout;