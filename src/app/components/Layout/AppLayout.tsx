import React from 'react';
import Sidebar from './Sidebar';
import Topbar  from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <Topbar />
      {children}
    </div>
  </div>
);

export default AppLayout;
