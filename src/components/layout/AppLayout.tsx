import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toast } from '../common/Toast';
import { useApp } from '../../context/AppContext';

export const AppLayout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toasts, removeToast } = useApp();
  const location = useLocation();
  const isAIAssistant = location.pathname.startsWith('/ai-assistant');

  return (
    <div className={`bg-background flex ${isAIAssistant ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className={`flex-1 flex flex-col min-w-0 ${isAIAssistant ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <Header onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />

        <main className={`flex-1 ${isAIAssistant ? 'flex flex-col min-h-0 overflow-hidden' : 'overflow-y-auto'}`}>
          {isAIAssistant ? (
            <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 overflow-hidden">
              <Outlet />
            </div>
          ) : (
            <div className="page-wrap px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
              <Outlet />
            </div>
          )}
        </main>
      </div>

      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
