import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  UserProfile,
  FinancialRecord,
  StudyRecord,
  HabitRecord,
  ActivityLog,
  DashboardSummary,
  UserSettings,
  ThemePreference,
} from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  selectedDate: string;
  setSelectedDate: (date: string) => void;

  // Profile
  profile: UserProfile | null;
  isLoadingProfile: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;

  // Financial
  financialRecords: FinancialRecord[];
  isLoadingFinancial: boolean;
  addFinancialRecord: (data: Omit<FinancialRecord, 'id' | 'createdAt'>) => Promise<boolean>;
  updateFinancialRecord: (id: string, data: Partial<Omit<FinancialRecord, 'id' | 'createdAt'>>) => Promise<boolean>;
  deleteFinancialRecord: (id: string) => Promise<boolean>;

  // Study
  studyRecords: StudyRecord[];
  isLoadingStudy: boolean;
  addStudyRecord: (data: Omit<StudyRecord, 'id' | 'createdAt'>) => Promise<boolean>;
  updateStudyRecord: (id: string, data: Partial<Omit<StudyRecord, 'id' | 'createdAt'>>) => Promise<boolean>;
  deleteStudyRecord: (id: string) => Promise<boolean>;

  // Habits
  habits: HabitRecord[];
  isLoadingHabits: boolean;
  addHabit: (data: Omit<HabitRecord, 'id' | 'createdAt' | 'streakCount'>) => Promise<boolean>;
  updateHabit: (id: string, data: Partial<Omit<HabitRecord, 'id' | 'createdAt'>>) => Promise<boolean>;
  toggleHabitStatus: (id: string) => Promise<boolean>;
  deleteHabit: (id: string) => Promise<boolean>;

  // Activities
  activities: ActivityLog[];
  isLoadingActivities: boolean;
  refreshActivities: () => Promise<void>;

  // Dashboard
  dashboardSummary: DashboardSummary | null;
  isLoadingDashboard: boolean;
  refreshDashboard: () => Promise<void>;

  // Settings
  settings: UserSettings | null;
  updateSettings: (data: Partial<UserSettings>) => Promise<boolean>;

  // Toast
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [selectedDate, setSelectedDateState] = useState(
    () => localStorage.getItem('selected-tracking-date') || getLocalDateKey(),
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [isLoadingFinancial, setIsLoadingFinancial] = useState(true);

  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [isLoadingStudy, setIsLoadingStudy] = useState(true);

  const [habits, setHabits] = useState<HabitRecord[]>([]);
  const [isLoadingHabits, setIsLoadingHabits] = useState(true);

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  const [settings, setSettings] = useState<UserSettings | null>(null);

  // Apply the selected theme globally. System mode follows the OS preference.
  useEffect(() => {
    const preference: ThemePreference = settings?.theme || (localStorage.getItem('app-theme') as ThemePreference) || 'system';
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const isDark = preference === 'dark' || (preference === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    apply();
    if (preference === 'system') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
  }, [settings?.theme]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const setSelectedDate = useCallback((date: string) => {
    setSelectedDateState(date);
    localStorage.setItem('selected-tracking-date', date);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshActivities = useCallback(async () => {
    try {
      const data = await api.getActivities();
      setActivities(data);
    } catch {
      // ignore
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const data = await api.getDashboardSummary();
      setDashboardSummary(data);
    } catch {
      // ignore
    }
  }, []);

  // Load user-specific data only after authentication has been established.
  useEffect(() => {
    if (!isAuthenticated) {
      setProfile(null);
      setFinancialRecords([]);
      setStudyRecords([]);
      setHabits([]);
      setActivities([]);
      setDashboardSummary(null);
      setSettings(null);
      setIsLoadingProfile(false);
      setIsLoadingFinancial(false);
      setIsLoadingStudy(false);
      setIsLoadingHabits(false);
      setIsLoadingActivities(false);
      setIsLoadingDashboard(false);
      return;
    }

    let cancelled = false;
    const loadAll = async () => {
      const load = async <T,>(fn: () => Promise<T>, setter: (value: T) => void, setLoading?: (value: boolean) => void) => {
        try {
          const value = await fn();
          if (!cancelled) setter(value);
        } catch (err) {
          console.error('Failed to load data', err);
        } finally {
          if (!cancelled && setLoading) setLoading(false);
        }
      };

      await api.getProfile().then((v) => { if (!cancelled) setProfile(v); }).catch((e) => console.error('Profile load failed', e)).finally(() => { if (!cancelled) setIsLoadingProfile(false); });
      await Promise.all([
        load(api.getFinancialRecords, setFinancialRecords, setIsLoadingFinancial),
        load(api.getStudyRecords, setStudyRecords, setIsLoadingStudy),
        load(api.getHabits, setHabits, setIsLoadingHabits),
        load(api.getActivities, setActivities, setIsLoadingActivities),
        load(api.getDashboardSummary, setDashboardSummary, setIsLoadingDashboard),
        load(api.getSettings, setSettings),
      ]);
    };
    loadAll();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Profile operations
  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      const updated = await api.updateProfile(data);
      setProfile(updated);
      await Promise.all([refreshActivities(), refreshDashboard()]);
      showToast('Profile information updated successfully', 'success');
      return true;
    } catch {
      showToast('Failed to update profile', 'error');
      return false;
    }
  };

  // Financial operations
  const addFinancialRecord = async (data: Omit<FinancialRecord, 'id' | 'createdAt'>) => {
    try {
      const newRec = await api.addFinancialRecord(data);
      setFinancialRecords((prev) => [newRec, ...prev]);
      await Promise.all([refreshActivities(), refreshDashboard()]);
      showToast('Financial record added successfully', 'success');
      return true;
    } catch {
      showToast('Failed to add financial record', 'error');
      return false;
    }
  };

  const updateFinancialRecord = async (id: string, data: Partial<Omit<FinancialRecord, 'id' | 'createdAt'>>) => {
    try {
      const updated = await api.updateFinancialRecord(id, data);
      setFinancialRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
      await Promise.all([refreshActivities(), refreshDashboard()]);
      showToast('Financial record updated successfully', 'success');
      return true;
    } catch {
      showToast('Failed to update financial record', 'error');
      return false;
    }
  };

  const deleteFinancialRecord = async (id: string) => {
    try {
      await api.deleteFinancialRecord(id);
      setFinancialRecords((prev) => prev.filter((r) => r.id !== id));
      await Promise.all([refreshActivities(), refreshDashboard()]);
      showToast('Financial record deleted', 'info');
      return true;
    } catch {
      showToast('Failed to delete financial record', 'error');
      return false;
    }
  };

  // Study operations
  const addStudyRecord = async (data: Omit<StudyRecord, 'id' | 'createdAt'>) => {
    try {
      const newRec = await api.addStudyRecord(data);
      setStudyRecords((prev) => [newRec, ...prev]);
      await Promise.all([refreshActivities(), refreshDashboard()]);
      showToast('Study session record added', 'success');
      return true;
    } catch {
      showToast('Failed to add study record', 'error');
      return false;
    }
  };

  const updateStudyRecord = async (id: string, data: Partial<Omit<StudyRecord, 'id' | 'createdAt'>>) => {
    try {
      const updated = await api.updateStudyRecord(id, data);
      setStudyRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
      await Promise.all([refreshActivities(), refreshDashboard()]);
      showToast('Study record updated', 'success');
      return true;
    } catch {
      showToast('Failed to update study record', 'error');
      return false;
    }
  };

  const deleteStudyRecord = async (id: string) => {
    try {
      await api.deleteStudyRecord(id);
      setStudyRecords((prev) => prev.filter((r) => r.id !== id));
      await Promise.all([refreshActivities(), refreshDashboard()]);
      showToast('Study record removed', 'info');
      return true;
    } catch {
      showToast('Failed to delete study record', 'error');
      return false;
    }
  };

  // Habit operations
  const addHabit = async (data: Omit<HabitRecord, 'id' | 'createdAt' | 'streakCount'>) => {
    try {
      const newHabit = await api.addHabit(data);
      setHabits((prev) => [newHabit, ...prev]);
      await Promise.all([refreshActivities(), refreshDashboard()]);
      showToast('New habit added to tracker', 'success');
      return true;
    } catch {
      showToast('Failed to add habit', 'error');
      return false;
    }
  };

  const updateHabit = async (id: string, data: Partial<Omit<HabitRecord, 'id' | 'createdAt'>>) => {
    try {
      const updated = await api.updateHabit(id, data);
      setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
      await Promise.all([refreshActivities(), refreshDashboard()]);
      showToast('Habit details updated', 'success');
      return true;
    } catch {
      showToast('Failed to update habit', 'error');
      return false;
    }
  };

  const toggleHabitStatus = async (id: string) => {
    try {
      const updated = await api.toggleHabitStatus(id);
      setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
      await Promise.all([refreshActivities(), refreshDashboard()]);
      showToast(`Habit status set to ${updated.status}`, 'success');
      return true;
    } catch {
      showToast('Failed to toggle habit', 'error');
      return false;
    }
  };

  const deleteHabit = async (id: string) => {
    try {
      await api.deleteHabit(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
      await Promise.all([refreshActivities(), refreshDashboard()]);
      showToast('Habit removed', 'info');
      return true;
    } catch {
      showToast('Failed to delete habit', 'error');
      return false;
    }
  };

  // Settings
  const updateSettings = async (data: Partial<UserSettings>) => {
    try {
      const updated = await api.updateSettings(data);
      setSettings(updated);
      if (updated.theme) localStorage.setItem('app-theme', updated.theme);
      await refreshActivities();
      showToast('Settings saved successfully', 'success');
      return true;
    } catch {
      showToast('Failed to save settings', 'error');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        profile,
        isLoadingProfile,
        updateProfile,
        financialRecords,
        isLoadingFinancial,
        addFinancialRecord,
        updateFinancialRecord,
        deleteFinancialRecord,
        studyRecords,
        isLoadingStudy,
        addStudyRecord,
        updateStudyRecord,
        deleteStudyRecord,
        habits,
        isLoadingHabits,
        addHabit,
        updateHabit,
        toggleHabitStatus,
        deleteHabit,
        activities,
        isLoadingActivities,
        refreshActivities,
        dashboardSummary,
        isLoadingDashboard,
        refreshDashboard,
        settings,
        updateSettings,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
