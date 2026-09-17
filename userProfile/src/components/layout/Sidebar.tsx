import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  DollarSign,
  BookOpen,
  CheckSquare,
  History,
  Settings,
  HelpCircle,
  ShieldCheck,
  X,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { showToast } = useApp();

  const overviewItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/productivity', label: 'Productivity & Behavior', icon: Zap },
    { to: '/forecasting', label: 'Predictive Forecasting', icon: TrendingUp },
  ];

  const dataItems = [
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/financial', label: 'Financial', icon: DollarSign },
    { to: '/study', label: 'Study', icon: BookOpen },
    { to: '/habits', label: 'Habits', icon: CheckSquare },
    { to: '/activity', label: 'Activity History', icon: History },
  ];

  const handleHelpClick = (e: React.MouseEvent) => {
    e.preventDefault();
    showToast('Milestone 2 Documentation & Help is available in the Project Guide.', 'info');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13px] font-medium transition-colors ${
      isActive
        ? 'bg-primary-light text-primary'
        : 'text-text-secondary hover:text-text-primary hover:bg-muted'
    }`;

  const renderItems = (items: typeof overviewItems) =>
    items.map((item) => {
      const Icon = item.icon;
      return (
        <NavLink key={item.to} to={item.to} onClick={() => onClose()} className={linkClass}>
          <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
        </NavLink>
      );
    });

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-[232px] shrink-0 bg-surface border-r border-border flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 text-white rounded-lg bg-primary shrink-0">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-text-primary truncate">User Profile</p>
              <p className="text-[11px] text-text-secondary">Analytics & ML</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="lg:hidden icon-btn h-8 w-8"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Main">
          <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            Overview
          </p>
          <div className="space-y-0.5">{renderItems(overviewItems)}</div>

          <p className="px-2.5 pt-5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            Records
          </p>
          <div className="space-y-0.5">{renderItems(dataItems)}</div>

          <p className="px-2.5 pt-5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            System
          </p>
          <div className="space-y-0.5">
            <NavLink to="/settings" onClick={() => onClose()} className={linkClass}>
              <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Settings</span>
            </NavLink>
            <a
              href="#help"
              onClick={handleHelpClick}
              className="flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-muted"
            >
              <HelpCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Help & Docs</span>
            </a>
          </div>
        </nav>

        <div className="p-3 border-t border-border">
          <div className="rounded-lg bg-muted px-3 py-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-secondary">Milestone</span>
              <span className="font-medium text-text-primary">M2</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5">Behavior & ML</p>
          </div>
        </div>
      </aside>
    </>
  );
};
