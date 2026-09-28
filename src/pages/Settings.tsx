import React, { useState } from 'react';
import { User, Bell, Palette, Check, Shield, Sun, Moon, Monitor } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useApp } from '../context/AppContext';

export const Settings: React.FC = () => {
  const { profile, settings, updateSettings } = useApp();
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'appearance'>('account');

  // Notification toggles
  const [emailNotifications, setEmailNotifications] = useState(settings?.emailNotifications ?? true);
  const [weeklySummary, setWeeklySummary] = useState(settings?.weeklySummary ?? true);
  const [activityAlerts, setActivityAlerts] = useState(settings?.activityAlerts ?? true);
  const [themeDensity, setThemeDensity] = useState<'comfortable' | 'compact'>(
    settings?.themeDensity ?? 'comfortable'
  );
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(settings?.theme ?? 'system');
  const [language, setLanguage] = useState(settings?.language ?? 'English (US)');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    await updateSettings({
      emailNotifications,
      weeklySummary,
      activityAlerts,
    });
    setIsSaving(false);
  };

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    await updateSettings({
      themeDensity,
      theme,
      language,
    });
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Settings</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Manage your account preferences, notification rules, and display settings.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-button transition-colors ${
            activeTab === 'account'
              ? 'bg-primary-light text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-background'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Account</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-button transition-colors ${
            activeTab === 'notifications'
              ? 'bg-primary-light text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-background'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-button transition-colors ${
            activeTab === 'appearance'
              ? 'bg-primary-light text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-background'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Appearance</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'account' && (
        <Card
          title="Account Overview"
          subtitle="System authentication and identity profile"
        >
          <div className="space-y-4 max-w-xl">
            <div className="p-4 rounded-button bg-background border border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {(profile?.name || 'A')[0]}
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary">{profile?.name || 'Alex Morgan'}</p>
                <p className="text-xs text-text-secondary">{profile?.email || 'alex.morgan@example.com'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-button bg-background border border-border">
                <span className="text-[10px] font-semibold text-text-secondary uppercase">
                  User Role
                </span>
                <p className="font-semibold text-text-primary mt-0.5">Primary Researcher</p>
              </div>

              <div className="p-3 rounded-button bg-background border border-border">
                <span className="text-[10px] font-semibold text-text-secondary uppercase">
                  System Architecture
                </span>
                <p className="font-semibold text-text-primary mt-0.5">FastAPI & PostgreSQL Ready</p>
              </div>
            </div>

            <div className="p-3 rounded-button bg-purple-50/70 border border-purple-100 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-text-primary">Database Privacy Notice</p>
                <p className="text-text-secondary mt-0.5 text-[11px]">
                  All sensitive database operations will be routed securely through your local FastAPI REST server in future milestones.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card
          title="Notification Preferences"
          subtitle="Configure system alerts and email digests"
          footer={
            <Button
              size="sm"
              variant="primary"
              onClick={handleSaveNotifications}
              isLoading={isSaving}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Save Preferences
            </Button>
          }
        >
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center justify-between p-3 rounded-button bg-background border border-border">
              <div>
                <p className="text-xs font-semibold text-text-primary">Email Notifications</p>
                <p className="text-[11px] text-text-secondary">
                  Receive transactional alerts and daily status updates.
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-button bg-background border border-border">
              <div>
                <p className="text-xs font-semibold text-text-primary">Weekly Summary Digest</p>
                <p className="text-[11px] text-text-secondary">
                  Get a comprehensive weekly financial and study progress report.
                </p>
              </div>
              <input
                type="checkbox"
                checked={weeklySummary}
                onChange={(e) => setWeeklySummary(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-button bg-background border border-border">
              <div>
                <p className="text-xs font-semibold text-text-primary">Activity Alerts</p>
                <p className="text-[11px] text-text-secondary">
                  Notify on record modifications, additions, and habit status changes.
                </p>
              </div>
              <input
                type="checkbox"
                checked={activityAlerts}
                onChange={(e) => setActivityAlerts(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'appearance' && (
        <Card
          title="Appearance Settings"
          subtitle="Customize interface density and display language"
          footer={
            <Button
              size="sm"
              variant="primary"
              onClick={handleSaveAppearance}
              isLoading={isSaving}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Save Appearance
            </Button>
          }
        >
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-2">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light', label: 'Light', Icon: Sun },
                  { value: 'dark', label: 'Dark', Icon: Moon },
                  { value: 'system', label: 'System', Icon: Monitor },
                ].map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value as 'light' | 'dark' | 'system')}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-button border text-xs font-semibold transition ${
                      theme === value
                        ? 'bg-primary-light text-primary border-primary'
                        : 'bg-surface text-text-secondary border-border hover:text-text-primary hover:bg-background'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-secondary mt-2">System follows your device light/dark preference.</p>
            </div>

            <div>
              <label htmlFor="set-density" className="block text-xs font-semibold text-text-primary mb-1">
                Display Density
              </label>
              <select
                id="set-density"
                value={themeDensity}
                onChange={(e) => setThemeDensity(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="comfortable">Comfortable (Standard spacing)</option>
                <option value="compact">Compact (High density)</option>
              </select>
            </div>

            <div>
              <label htmlFor="set-lang" className="block text-xs font-semibold text-text-primary mb-1">
                Interface Language
              </label>
              <select
                id="set-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="English (US)">English (US)</option>
                <option value="English (UK)">English (UK)</option>
                <option value="Spanish">Español</option>
                <option value="French">Français</option>
                <option value="German">Deutsch</option>
              </select>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
