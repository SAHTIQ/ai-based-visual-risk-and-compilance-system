import type {
  UserProfile,
  FinancialRecord,
  StudyRecord,
  HabitRecord,
  ActivityLog,
  DashboardSummary,
  UserSettings,
  WorkSession,
  ProductivityAnalytics,
  MetricForecast,
  SimulationResponse,
  WorkActivityType,
  HabitCategory,
} from '../types';
const resolveApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (!envUrl) return 'http://localhost:8000/api';
  const clean = String(envUrl).trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

const API_BASE_URL = resolveApiBaseUrl();
const TOKEN_KEY = 'auth_token';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Transmit HTTP-Only cookies automatically
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error ${response.status}: ${response.statusText}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // ================= Auth =================
  async register(data: { name: string; email: string; password: string }) {
    const res = await fetchApi<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.token && typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, res.token);
    }
    return res;
  },

  async login(data: { email: string; password: string }) {
    const res = await fetchApi<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.token && typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, res.token);
    }
    return res;
  },

  async getCurrentUser() {
    return fetchApi<any>('/auth/me');
  },

  async logout() {
    try {
      return await fetchApi<any>('/auth/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  },

  // ================= User Profile =================
  async getProfile(): Promise<UserProfile> {
    const profile = await fetchApi<any>('/profile');

    const requiredFields = [profile.name, profile.email, profile.age, profile.gender, profile.occupation, profile.education];
    const filledCount = requiredFields.filter((f) => f !== null && f !== undefined && f !== '').length;
    const completionPercentage = Math.round((filledCount / requiredFields.length) * 100);

    return {
      id: String(profile.user_id || profile.id),
      name: profile.name || 'User Profile',
      email: profile.email || '',
      age: profile.age || null,
      gender: profile.gender || '',
      occupation: profile.occupation || '',
      education: profile.education || '',
      phone: profile.phone || '',
      location: profile.location || '',
      bio: profile.bio || '',
      completionPercentage,
      updatedAt: profile.updated_at ? profile.updated_at.replace('T', ' ').substring(0, 16) : '',
    };
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    await fetchApi('/profile', {
      method: 'PUT',
      body: JSON.stringify({
        age: updates.age,
        gender: updates.gender,
        occupation: updates.occupation,
        education: updates.education,
        phone: updates.phone,
        location: updates.location,
        bio: updates.bio,
      }),
    });

    return await api.getProfile();
  },

  // ================= Financial Records =================
  async getFinancialRecords(): Promise<FinancialRecord[]> {
    const records = await fetchApi<any[]>('/financial');
    return records.map((r) => ({
      id: String(r.id),
      date: r.recorded_at,
      category: r.expense_category as any,
      income: r.income,
      expenses: r.expenses,
      savings: r.savings,
      budget: r.budget,
      notes: r.financial_goal || '',
      createdAt: r.created_at ? r.created_at.replace('T', ' ').substring(0, 16) : r.recorded_at,
    }));
  },

  async addFinancialRecord(record: Omit<FinancialRecord, 'id' | 'createdAt'>): Promise<FinancialRecord> {
    const res = await fetchApi<any>('/financial', {
      method: 'POST',
      body: JSON.stringify({
        income: record.income,
        expenses: record.expenses,
        savings: record.savings,
        budget: record.budget,
        expense_category: record.category,
        financial_goal: record.notes || '',
        recorded_at: record.date,
      }),
    });

    return {
      id: String(res.id),
      date: res.recorded_at,
      category: res.expense_category as any,
      income: res.income,
      expenses: res.expenses,
      savings: res.savings,
      budget: res.budget,
      notes: res.financial_goal || '',
      createdAt: res.created_at ? res.created_at.replace('T', ' ').substring(0, 16) : res.recorded_at,
    };
  },

  async updateFinancialRecord(id: string, updates: Partial<Omit<FinancialRecord, 'id' | 'createdAt'>>): Promise<FinancialRecord> {
    const payload: any = {};
    if (updates.income !== undefined) payload.income = updates.income;
    if (updates.expenses !== undefined) payload.expenses = updates.expenses;
    if (updates.savings !== undefined) payload.savings = updates.savings;
    if (updates.budget !== undefined) payload.budget = updates.budget;
    if (updates.category) payload.expense_category = updates.category;
    if (updates.notes !== undefined) payload.financial_goal = updates.notes;
    if (updates.date) payload.recorded_at = updates.date;

    const res = await fetchApi<any>(`/financial/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return {
      id: String(res.id),
      date: res.recorded_at,
      category: res.expense_category as any,
      income: res.income,
      expenses: res.expenses,
      savings: res.savings,
      budget: res.budget,
      notes: res.financial_goal || '',
      createdAt: res.created_at ? res.created_at.replace('T', ' ').substring(0, 16) : res.recorded_at,
    };
  },

  async deleteFinancialRecord(id: string): Promise<boolean> {
    await fetchApi(`/financial/${id}`, { method: 'DELETE' });
    return true;
  },

  // ================= Study Records =================
  async getStudyRecords(): Promise<StudyRecord[]> {
    const records = await fetchApi<any[]>('/study');
    return records.map((r) => ({
      id: String(r.id),
      date: r.recorded_at,
      course: r.course,
      subject: r.subject,
      studyHours: r.study_hours,
      studyGoal: r.study_goal,
      performance: r.academic_performance as any,
      notes: '',
      createdAt: r.created_at ? r.created_at.replace('T', ' ').substring(0, 16) : r.recorded_at,
    }));
  },

  async addStudyRecord(record: Omit<StudyRecord, 'id' | 'createdAt'>): Promise<StudyRecord> {
    const res = await fetchApi<any>('/study', {
      method: 'POST',
      body: JSON.stringify({
        course: record.course,
        subject: record.subject,
        study_hours: record.studyHours,
        study_goal: record.studyGoal,
        academic_performance: record.performance,
        recorded_at: record.date,
      }),
    });

    return {
      id: String(res.id),
      date: res.recorded_at,
      course: res.course,
      subject: res.subject,
      studyHours: res.study_hours,
      studyGoal: res.study_goal,
      performance: res.academic_performance as any,
      notes: record.notes || '',
      createdAt: res.created_at ? res.created_at.replace('T', ' ').substring(0, 16) : res.recorded_at,
    };
  },

  async updateStudyRecord(id: string, updates: Partial<Omit<StudyRecord, 'id' | 'createdAt'>>): Promise<StudyRecord> {
    const payload: any = {};
    if (updates.course) payload.course = updates.course;
    if (updates.subject) payload.subject = updates.subject;
    if (updates.studyHours !== undefined) payload.study_hours = updates.studyHours;
    if (updates.studyGoal !== undefined) payload.study_goal = updates.studyGoal;
    if (updates.performance) payload.academic_performance = updates.performance;
    if (updates.date) payload.recorded_at = updates.date;

    const res = await fetchApi<any>(`/study/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return {
      id: String(res.id),
      date: res.recorded_at,
      course: res.course,
      subject: res.subject,
      studyHours: res.study_hours,
      studyGoal: res.study_goal,
      performance: res.academic_performance as any,
      notes: updates.notes || '',
      createdAt: res.created_at ? res.created_at.replace('T', ' ').substring(0, 16) : res.recorded_at,
    };
  },

  async deleteStudyRecord(id: string): Promise<boolean> {
    await fetchApi(`/study/${id}`, { method: 'DELETE' });
    return true;
  },

  // ================= Habits =================
  async getHabits(): Promise<HabitRecord[]> {
    const records = await fetchApi<any[]>('/habits');
    return records.map((r) => ({
      id: String(r.id),
      title: r.habit_name,
      category: (r.category as HabitCategory) || 'Routine',
      status: r.completed ? 'Completed' : 'Pending',
      duration: r.duration,
      frequency: r.frequency || 'Daily',
      date: r.recorded_at,
      streakCount: r.current_streak_days ?? 0,
      createdAt: r.created_at ? r.created_at.replace('T', ' ').substring(0, 16) : r.recorded_at,
    }));
  },

  async addHabit(habit: Omit<HabitRecord, 'id' | 'createdAt' | 'streakCount'>): Promise<HabitRecord> {
    const res = await fetchApi<any>('/habits', {
      method: 'POST',
      body: JSON.stringify({
        habit_name: habit.title,
        category: habit.category || 'Routine',
        completed: habit.status === 'Completed',
        duration: habit.duration,
        frequency: habit.frequency || 'Daily',
        recorded_at: habit.date,
      }),
    });

    return {
      id: String(res.id),
      title: res.habit_name,
      category: (res.category as HabitCategory) || habit.category || 'Routine',
      status: res.completed ? 'Completed' : 'Pending',
      duration: res.duration,
      frequency: res.frequency || habit.frequency || 'Daily',
      date: res.recorded_at,
      streakCount: res.current_streak_days ?? (habit.status === 'Completed' ? 1 : 0),
      createdAt: res.created_at ? res.created_at.replace('T', ' ').substring(0, 16) : res.recorded_at,
    };
  },

  async updateHabit(id: string, updates: Partial<Omit<HabitRecord, 'id' | 'createdAt'>>): Promise<HabitRecord> {
    const payload: any = {};
    if (updates.title) payload.habit_name = updates.title;
    if (updates.category) payload.category = updates.category;
    if (updates.status !== undefined) payload.completed = updates.status === 'Completed';
    if (updates.duration) payload.duration = updates.duration;
    if (updates.frequency) payload.frequency = updates.frequency;
    if (updates.date) payload.recorded_at = updates.date;

    const res = await fetchApi<any>(`/habits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return {
      id: String(res.id),
      title: res.habit_name,
      category: (res.category as HabitCategory) || updates.category || 'Routine',
      status: res.completed ? 'Completed' : 'Pending',
      duration: res.duration,
      frequency: res.frequency || updates.frequency || 'Daily',
      date: res.recorded_at,
      streakCount: res.current_streak_days ?? 0,
      createdAt: res.created_at ? res.created_at.replace('T', ' ').substring(0, 16) : res.recorded_at,
    };
  },

  async toggleHabitStatus(id: string): Promise<HabitRecord> {
    const habits = await api.getHabits();
    const current = habits.find((h) => h.id === id);
    if (!current) throw new Error('Habit not found');

    const newStatus = current.status === 'Completed' ? 'Pending' : 'Completed';
    return await api.updateHabit(id, { status: newStatus });
  },

  async deleteHabit(id: string): Promise<boolean> {
    await fetchApi(`/habits/${id}`, { method: 'DELETE' });
    return true;
  },

  // ================= Activities =================
  async getActivities(): Promise<ActivityLog[]> {
    const records = await fetchApi<any[]>('/activity');
    return records.map((act) => {
      const dt = new Date(act.created_at);
      const dateStr = dt.toISOString().split('T')[0];
      const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return {
        id: String(act.id),
        type: act.activity_type.toLowerCase() as any,
        activity: act.activity_type.replace(/_/g, ' '),
        description: act.description,
        date: dateStr,
        time: timeStr,
        timestamp: dt.getTime(),
      };
    });
  },

  // ================= Work Sessions (Behavior Tracking) =================
  async startWorkSession(activity_type: WorkActivityType = 'Coding', notes?: string): Promise<WorkSession> {
    return fetchApi<WorkSession>('/behavior/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ activity_type, notes }),
    });
  },

  async stopWorkSession(sessionId: number, notes?: string): Promise<WorkSession> {
    return fetchApi<WorkSession>(`/behavior/sessions/${sessionId}/stop`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  async getWorkSessions(): Promise<WorkSession[]> {
    return fetchApi<WorkSession[]>('/behavior/sessions');
  },

  async createManualWorkSession(data: {
    activity_type: WorkActivityType;
    started_at: string;
    ended_at: string;
    notes?: string;
  }): Promise<WorkSession> {
    return fetchApi<WorkSession>('/behavior/sessions/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ================= Milestone 2 Analytics & Forecasts =================
  async getProductivityAnalytics(): Promise<ProductivityAnalytics> {
    return fetchApi<ProductivityAnalytics>('/analytics/productivity');
  },

  async getFinancialAnalytics() {
    return fetchApi<any>('/analytics/financial');
  },

  async getHabitAnalytics() {
    return fetchApi<any[]>('/analytics/habits');
  },

  async getProductivityForecast(period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<MetricForecast> {
    return fetchApi<MetricForecast>(`/forecast/productivity?period=${period}`);
  },

  async getFinancialForecast(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<MetricForecast> {
    return fetchApi<MetricForecast>(`/forecast/financial?period=${period}`);
  },

  async getHabitForecast(period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<MetricForecast> {
    return fetchApi<MetricForecast>(`/forecast/habits?period=${period}`);
  },

  async getFutureSimulation(): Promise<SimulationResponse> {
    return fetchApi<SimulationResponse>('/simulation/future');
  },

  async getSimulationBaseline(): Promise<import('../types').BaselineMetrics> {
    return fetchApi<import('../types').BaselineMetrics>('/simulation/baseline');
  },

  async runCustomSimulation(
    params: import('../types').WhatIfParameters,
    save: boolean = false
  ): Promise<SimulationResponse> {
    return fetchApi<SimulationResponse>(`/simulation/simulate?save=${save}`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getSimulationHistory(): Promise<import('../types').SimulationHistoryItem[]> {
    return fetchApi<import('../types').SimulationHistoryItem[]>('/simulation/history');
  },

  async deleteSimulationHistoryItem(historyId: number): Promise<void> {
    await fetchApi(`/simulation/history/${historyId}`, {
      method: 'DELETE',
    });
  },

  // ================= Milestone 4: Risk & Compliance Intelligence =================
  async getRiskOverview(): Promise<import('../types').RiskOverview> {
    return fetchApi<import('../types').RiskOverview>('/risk/overview');
  },

  async getRiskTrends(days: number = 30): Promise<import('../types').RiskTrendPoint[]> {
    return fetchApi<import('../types').RiskTrendPoint[]>(`/risk/trends?days=${days}`);
  },

  async getRiskDetections(params?: {
    status?: string;
    risk_level?: string;
    only_violations?: boolean;
    limit?: number;
  }): Promise<import('../types').RiskDetection[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.risk_level) query.append('risk_level', params.risk_level);
    if (params?.only_violations !== undefined) query.append('only_violations', String(params.only_violations));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return fetchApi<import('../types').RiskDetection[]>(`/risk/detections${qs ? `?${qs}` : ''}`);
  },

  async getRiskDetectionDetail(id: number): Promise<import('../types').RiskDetection> {
    return fetchApi<import('../types').RiskDetection>(`/risk/detections/${id}`);
  },

  // ================= Milestone 4: AI Assistant & Persistent Chat =================
  async getConversations(): Promise<import('../types').Conversation[]> {
    return fetchApi<import('../types').Conversation[]>('/chat/conversations');
  },

  async createConversation(title?: string): Promise<import('../types').Conversation> {
    return fetchApi<import('../types').Conversation>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Investigation' }),
    });
  },

  async getConversationDetail(conversationId: number): Promise<import('../types').ConversationDetail> {
    return fetchApi<import('../types').ConversationDetail>(`/chat/conversations/${conversationId}`);
  },

  async deleteConversation(conversationId: number): Promise<void> {
    await fetchApi(`/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  },

  async sendChatMessage(conversationId: number, content: string): Promise<import('../types').ChatResponse> {
    return fetchApi<import('../types').ChatResponse>(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async quickAskAI(content: string): Promise<import('../types').ChatResponse> {
    return fetchApi<import('../types').ChatResponse>('/chat/quick-ask', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async getAIReadiness(): Promise<any> {
    return fetchApi<any>('/chat/readiness');
  },



  // ================= Dashboard Summary =================
  async getDashboardSummary(): Promise<DashboardSummary> {
    const [profile, financial, study, habits] = await Promise.all([
      api.getProfile(),
      api.getFinancialRecords(),
      api.getStudyRecords(),
      api.getHabits(),
    ]);

    const totalIncome = financial.reduce((acc, r) => acc + r.income, 0);
    const totalExpenses = financial.reduce((acc, r) => acc + r.expenses, 0);
    const totalSavings = financial.reduce((acc, r) => acc + r.savings, 0);
    const totalBudget = financial.reduce((acc, r) => acc + r.budget, 0);

    const totalHours = study.reduce((acc, r) => acc + r.studyHours, 0);
    const uniqueSubjects = new Set(study.map((r) => r.course)).size;
    const recent = study.length > 0 ? study[0] : null;

    return {
      profileCompletion: profile.completionPercentage,
      financialRecordsCount: financial.length,
      studyRecordsCount: study.length,
      activeHabitsCount: habits.length,
      financialMetrics: {
        totalIncome,
        totalExpenses,
        totalSavings,
        totalBudget,
      },
      studyMetrics: {
        totalHoursThisWeek: Number(totalHours.toFixed(1)),
        weeklyGoal: 25.0,
        subjectCount: uniqueSubjects,
        recentSession: recent
          ? {
              subject: `${recent.course} (${recent.subject})`,
              hours: recent.studyHours,
              date: recent.date,
            }
          : null,
      },
    };
  },

  // ================= User Settings =================
  async getSettings(): Promise<UserSettings> {
    const res = await fetchApi<any>('/settings');
    return {
      emailNotifications: res.email_notifications,
      weeklySummary: res.weekly_summary,
      activityAlerts: res.activity_alerts,
      themeDensity: res.theme_density as any,
      theme: (res.theme || 'system') as any,
      language: res.language,
    };
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const payload: any = {};
    if (settings.emailNotifications !== undefined) payload.email_notifications = settings.emailNotifications;
    if (settings.weeklySummary !== undefined) payload.weekly_summary = settings.weeklySummary;
    if (settings.activityAlerts !== undefined) payload.activity_alerts = settings.activityAlerts;
    if (settings.themeDensity) payload.theme_density = settings.themeDensity;
    if (settings.theme) payload.theme = settings.theme;
    if (settings.language) payload.language = settings.language;

    const res = await fetchApi<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return {
      emailNotifications: res.email_notifications,
      weeklySummary: res.weekly_summary,
      activityAlerts: res.activity_alerts,
      themeDensity: res.theme_density as any,
      theme: (res.theme || 'system') as any,
      language: res.language,
    };
  },
};
