import React, { useState } from 'react';
import { Bell, ChevronDown, Menu, User, Settings, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/productivity': 'Productivity & Behavior',
  '/forecasting': 'Predictive Forecasting',
  '/profile': 'Profile',
  '/financial': 'Financial',
  '/study': 'Study',
  '/habits': 'Habits',
  '/activity': 'Activity History',
  '/settings': 'Settings',
};

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { profile, settings, updateSettings, activities } = useApp();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const userName = profile?.name || 'Alex Morgan';
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const recentNotifications = activities.slice(0, 4);
  const pageTitle = PAGE_TITLES[location.pathname] || 'Analytics';
  const theme = settings?.theme || 'system';
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const selectTheme = async (value: 'light' | 'dark' | 'system') => {
    setShowThemeMenu(false);
    await updateSettings({ theme: value });
  };

  return (
    <header className="h-14 px-4 sm:px-6 lg:px-8 border-b border-border bg-surface sticky top-0 z-30 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          aria-label="Open sidebar menu"
          className="lg:hidden icon-btn"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{pageTitle}</p>
          <p className="text-xs text-text-secondary hidden sm:block truncate">
            Welcome, {userName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowThemeMenu(!showThemeMenu);
              setShowNotifications(false);
              setShowUserMenu(false);
            }}
            aria-label={`Theme: ${theme}`}
            className="icon-btn"
          >
            <ThemeIcon className="w-4 h-4" />
          </button>
          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-surface rounded-lg border border-border shadow-card py-1 z-50">
              {([
                ['light', 'Light', Sun],
                ['dark', 'Dark', Moon],
                ['system', 'System', Monitor],
              ] as const).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectTheme(value)}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                    theme === value ? 'text-primary bg-primary-light' : 'text-text-primary hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
              setShowThemeMenu(false);
            }}
            aria-label="View notifications"
            className="relative icon-btn"
          >
            <Bell className="w-4 h-4" />
            {recentNotifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface rounded-lg border border-border shadow-card py-2 z-50">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">Notifications</span>
                <span className="text-xs text-text-secondary">{recentNotifications.length} recent</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {recentNotifications.length === 0 ? (
                  <p className="p-4 text-sm text-text-secondary">No data available</p>
                ) : (
                  recentNotifications.map((act) => (
                    <div key={act.id} className="p-3 hover:bg-muted">
                      <p className="text-sm font-medium text-text-primary">{act.activity}</p>
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{act.description}</p>
                      <p className="text-xs text-text-secondary mt-1">{act.date} • {act.time}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-border text-center">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/activity');
                  }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View all activity history
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
              setShowThemeMenu(false);
            }}
            aria-label="User account menu"
            className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-muted border border-transparent hover:border-border"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-white font-semibold text-xs flex items-center justify-center">
              {userInitials}
            </div>
            <div className="text-left hidden sm:block max-w-[140px]">
              <p className="text-xs font-semibold text-text-primary leading-none truncate">{userName}</p>
              <p className="text-[11px] text-text-secondary leading-none mt-1 truncate">
                {profile?.occupation ? profile.occupation.split(' ')[0] : 'User'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-secondary hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-surface rounded-lg border border-border shadow-card py-1.5 z-50">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-sm font-semibold text-text-primary">{userName}</p>
                <p className="text-xs text-text-secondary truncate">{profile?.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/profile');
                }}
                className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-muted flex items-center gap-2"
              >
                <User className="w-4 h-4 text-text-secondary" />
                <span>My Profile</span>
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/settings');
                }}
                className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-muted flex items-center gap-2"
              >
                <Settings className="w-4 h-4 text-text-secondary" />
                <span>Settings</span>
              </button>
              <button
                onClick={async () => {
                  setShowUserMenu(false);
                  await logout();
                  navigate('/login', { replace: true });
                }}
                className="w-full px-4 py-2 text-left text-sm text-status-danger hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
