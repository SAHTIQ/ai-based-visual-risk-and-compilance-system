export type Gender = 'Male' | 'Female' | 'Non-Binary' | 'Prefer not to say';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: Gender;
  occupation: string;
  education: string;
  phone?: string;
  location?: string;
  bio?: string;
  completionPercentage: number;
  avatarUrl?: string;
  updatedAt: string;
}

export type FinancialCategory = 
  | 'Salary'
  | 'Freelance'
  | 'Investments'
  | 'Education'
  | 'Housing'
  | 'Living Expenses'
  | 'Healthcare'
  | 'Utilities'
  | 'Entertainment'
  | 'Other';

export interface FinancialRecord {
  id: string;
  date: string;
  category: FinancialCategory;
  income: number;
  expenses: number;
  savings: number;
  budget: number;
  notes?: string;
  createdAt: string;
}

export type PerformanceGrade = 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement';

export interface StudyRecord {
  id: string;
  date: string;
  course: string;
  subject: string;
  studyHours: number;
  studyGoal: number; // in hours
  performance: PerformanceGrade;
  notes?: string;
  createdAt: string;
}

export type HabitStatus = 'Completed' | 'Pending';
export type HabitCategory = 'Health' | 'Study' | 'Mindfulness' | 'Productivity' | 'Fitness' | 'Routine';

export interface HabitRecord {
  id: string;
  title: string;
  category: HabitCategory;
  status: HabitStatus;
  duration: string; // e.g., "30 mins", "45 mins", "8 hours"
  frequency: string; // e.g., "Daily", "Weekdays", "3x/week"
  date: string;
  streakCount: number;
  createdAt: string;
  completionRatePct?: number;
  longestStreakDays?: number;
  weeklyFrequency?: string;
  monthlyFrequency?: string;
  trend?: 'increasing' | 'stable' | 'declining';
}

export type ActivityType = 
  | 'profile_updated'
  | 'financial_added'
  | 'financial_updated'
  | 'financial_deleted'
  | 'study_added'
  | 'study_updated'
  | 'study_deleted'
  | 'habit_added'
  | 'habit_updated'
  | 'habit_status_changed'
  | 'habit_deleted'
  | 'settings_updated'
  | 'work_session_started'
  | 'work_session_completed'
  | 'register'
  | 'login'
  | 'logout'
  | 'demo_data_generated';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  activity: string;
  description: string;
  date: string;
  time: string;
  timestamp: number;
}

export interface DashboardSummary {
  profileCompletion: number;
  financialRecordsCount: number;
  studyRecordsCount: number;
  activeHabitsCount: number;
  financialMetrics: {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    totalBudget: number;
  };
  studyMetrics: {
    totalHoursThisWeek: number;
    weeklyGoal: number;
    subjectCount: number;
    recentSession: {
      subject: string;
      hours: number;
      date: string;
    } | null;
  };
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserSettings {
  emailNotifications: boolean;
  weeklySummary: boolean;
  activityAlerts: boolean;
  themeDensity: 'compact' | 'comfortable';
  theme: ThemePreference;
  language: string;
}

// ================= Milestone 2 Extensions =================

export type WorkActivityType = 'Coding' | 'Study' | 'Project' | 'Reading' | 'Meeting' | 'Other';

export interface WorkSession {
  id: number;
  user_id: number;
  activity_type: WorkActivityType;
  started_at: string;
  ended_at?: string | null;
  duration_minutes: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  notes?: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface TimeAllocationItem {
  activity_type: string;
  minutes: number;
  hours: number;
  percentage: number;
}

export interface DailyHeatmapItem {
  date: string;
  minutes: number;
  session_count: number;
}

export interface ActivityHeatmapCell {
  day: string;
  time_label: string;
  minutes: number;
  session_count: number;
}

export interface ProductivityAnalytics {
  productivity_score: number;
  score_breakdown: {
    focus_component: number;
    consistency_component: number;
    habit_component: number;
  };
  total_work_minutes: number;
  total_work_hours: number;
  total_focus_minutes: number;
  total_focus_hours: number;
  average_session_minutes: number;
  longest_session_minutes: number;
  total_sessions_count: number;
  daily_work_hours: number;
  weekly_work_hours: number;
  monthly_work_hours: number;
  consistency_pct: number;
  peak_working_hours: string;
  most_productive_day: string;
  least_productive_day: string;
  time_allocation: TimeAllocationItem[];
  daily_heatmap: DailyHeatmapItem[];
  activity_heatmap: ActivityHeatmapCell[];
}

export interface ForecastEvaluation {
  mae: number | null;
  rmse: number | null;
  r2: number | null; // null when statistically undefined (zero-variance evaluation window)
  accuracy?: number | null;
  precision?: number | null;
  recall?: number | null;
  f1?: number | null;
}

export interface ModelEvaluation {
  model: string;
  train_mae: number | null;
  test_mae: number | null;
  train_rmse: number | null;
  test_rmse: number | null;
  train_r2: number | null;
  test_r2: number | null;
  explained_variance: number | null;
  train_accuracy: number | null;
  test_accuracy: number | null;
  train_precision: number | null;
  test_precision: number | null;
  train_recall: number | null;
  test_recall: number | null;
  train_f1: number | null;
  test_f1: number | null;
  train_observations: number;
  test_observations: number;
}

export interface MetricForecast {
  metric: string;
  period: 'daily' | 'weekly' | 'monthly';
  unit: string;
  current_value: number;
  predicted_value: number | null;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number | null;
  model: string;
  baseline_moving_average: number;
  historical_observations: number;
  required_observations: number;
  status: 'valid' | 'insufficient_evidence';
  reason?: string | null;
  evaluation?: ForecastEvaluation | null;
  model_evaluations: ModelEvaluation[];
  evidence: string[];
  historical_series: { label: string; value: number }[];
  regression_series: { label: string; value: number }[];
  forecast_series: { label: string; value: number }[];
}
