import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Orbit,
  Bot,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [simulationStatus, setSimulationStatus] = useState<'ready' | 'insufficient' | 'unavailable'>('unavailable');
  const [showHelpChoiceModal, setShowHelpChoiceModal] = useState(false);

  useEffect(() => {
    api.getFutureSimulation()
      .then((result) => setSimulationStatus(result.evidence_status === 'valid' ? 'ready' : 'insufficient'))
      .catch(() => setSimulationStatus('unavailable'));
  }, []);

  const overviewItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/productivity', label: 'Productivity & Behavior', icon: Zap },
    { to: '/forecasting', label: 'Predictive Forecasting', icon: TrendingUp },
    { to: '/simulation', label: 'Future Simulation', icon: Orbit },
    { to: '/ai-assistant', label: 'AI Assistant', icon: Bot },
  ];

  const dataItems = [
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/financial', label: 'Financial', icon: DollarSign },
    { to: '/study', label: 'Study', icon: BookOpen },
    { to: '/habits', label: 'Habits', icon: CheckSquare },
    { to: '/activity', label: 'Activity History', icon: History },
  ];

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
            <div className="min-w-0 max-w-[164px]">
              <p className="text-[10px] font-semibold uppercase leading-3 text-text-primary">AI-BASED VISUAL RISK AND COMPILANCE SYSTEM</p>
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
            <button
              type="button"
              onClick={() => setShowHelpChoiceModal(true)}
              className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-muted text-left transition-colors"
            >
              <HelpCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Help & Docs</span>
            </button>
          </div>
        </nav>

        <div className="p-3 border-t border-border">
          <div className="rounded-lg bg-muted px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-medium uppercase tracking-wide text-text-secondary">30-Day Outlook</span>
              <Orbit className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            </div>
            <p className="mt-1 text-xs font-medium text-text-primary">
              {simulationStatus === 'ready' ? 'Simulation Ready' : simulationStatus === 'insufficient' ? 'More data needed' : 'Simulation unavailable'}
            </p>
            <NavLink to="/simulation" onClick={() => onClose()} className="mt-2 inline-flex text-xs font-medium text-primary hover:underline">
              View Simulation
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Choice Modal: Asks user which documentation resource to open */}
      <Modal
        isOpen={showHelpChoiceModal}
        onClose={() => setShowHelpChoiceModal(false)}
        title="Help & Documentation"
        subtitle="Choose which documentation resource you would like to view:"
        maxWidth="md"
      >
        <div className="space-y-3.5 py-1">
          <button
            type="button"
            onClick={() => {
              setShowHelpChoiceModal(false);
              onClose();
              navigate('/help-docs?tab=project-docs');
            }}
            className="w-full text-left p-4 rounded-xl border border-border bg-surface hover:border-primary/50 hover:bg-primary/5 transition-all flex items-start gap-4 group"
          >
            <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                  Project Technical Documentation
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/15 text-primary shrink-0">
                  30 Chapters
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                Full academic report by Mohammed Sahtiq S: system design, ML models (Linear & Logistic Regression), DB ERD, and code highlights.
              </p>
              <div className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-primary">
                <span>Open Project Documentation</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowHelpChoiceModal(false);
              onClose();
              navigate('/help-docs?tab=user-manual');
            }}
            className="w-full text-left p-4 rounded-xl border border-border bg-surface hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-start gap-4 group"
          >
            <div className="w-11 h-11 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Website User & Help Manual
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                  User Guide
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                Step-by-step instructions on navigating this website: Dashboard KPIs, Work sessions, Predictive forecasting, What-If simulation, and AI Assistant.
              </p>
              <div className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Open Website Help Manual</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>
        </div>
      </Modal>
    </>
  );
};
