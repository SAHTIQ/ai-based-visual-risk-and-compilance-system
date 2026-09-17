import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toast } from '../common/Toast';
import { useApp } from '../../context/AppContext';

export const AppLayout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toasts, removeToast } = useApp();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />

        <main className="flex-1 overflow-y-auto">
          <div className="page-wrap px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
