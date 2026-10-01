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

export interface SimulationDay {
  date: string;
  work_hours: number;
  focus_hours: number;
  distraction_hours: number;
  focus_ratio: number;
  productivity_score: number;
  savings?: number | null;
  monthly_spending?: number | null;
  burnout_pct?: number | null;
  wellbeing_score?: number | null;
  emergency_runway_months?: number | null;
}

export interface SimulationSummary {
  outcome: string;
  projected_average_productivity: number | null;
  projected_total_work_hours: number | null;
  change_from_current: number | null;
  projected_savings?: number | null;
  savings_change?: number | null;
  projected_burnout?: number | null;
  burnout_change?: number | null;
  projected_wellbeing?: number | null;
  wellbeing_change?: number | null;
  projected_runway?: number | null;
  runway_change?: number | null;
}

export interface SimulationScenario {
  name: string;
  daily_values: SimulationDay[];
  summary: SimulationSummary;
  supporting_factors: string[];
  evidence: string[];
  rules: string[];
  confidence: number | null;
  recommendation: string;
}

export interface BaselineMetrics {
  savings: number;
  monthly_spending: number;
  study_load_hrs_week: number;
  sleep_hrs_night: number;
  exercise_days_week: number;
  burnout_pct: number;
  wellbeing_score: number;
  emergency_runway_months: number;
  records_used: number;
  data_range_start?: string | null;
  data_range_end?: string | null;
  baseline_date?: string | null;
  data_status: 'valid' | 'insufficient_evidence';
  has_savings: boolean;
  has_spending: boolean;
  has_study: boolean;
  has_sleep: boolean;
  has_exercise: boolean;
}

export interface WhatIfParameters {
  study_load_hrs_week?: number;
  sleep_hrs_night?: number;
  monthly_spending?: number;
  savings?: number;
  exercise_days_week?: number;
  horizon_days: number;
}

export interface MetricImpact {
  metric: string;
  label: string;
  baseline: number;
  simulated: number;
  change: number;
  pct_change?: number | null;
  unit: string;
  direction_is_favorable: boolean;
}

export interface SensitivityItem {
  feature_name: string;
  label: string;
  impact_level: 'High' | 'Medium-High' | 'Medium' | 'Low';
  impact_score: number;
  outcome_metric: string;
  description: string;
}

export interface RuleTraceItem {
  condition_id: string;
  condition_name: string;
  condition_text: string;
  input_values: Record<string, any>;
  is_satisfied: boolean;
  status_label: string;
  impact_explanation: string;
}

export interface WhyRecommendationDetail {
  selected_scenario: string;
  selected_features: Record<string, any>;
  baseline_values: Record<string, any>;
  scenario_changes: Record<string, any>;
  simulated_impact: MetricImpact[];
  rules_evaluated: number;
  rules_triggered: string[];
  primary_contributing_factor: string;
  evidence_used: string;
  confidence_pct: number;
  final_recommendation: string;
}

export interface SimulationEvidenceMeta {
  records_used: number;
  historical_range: string;
  features_used: string[];
  insufficient_features: string[];
  confidence_pct: number;
  method: string;
  is_sufficient: boolean;
  note: string;
}

export interface SimulationResponse {
  simulation_period: number;
  evidence_status: 'valid' | 'insufficient_evidence';
  historical_observations: number;
  scenarios: Record<'best' | 'expected' | 'risk', SimulationScenario>;
  note: string;
  baseline?: BaselineMetrics;
  impact?: MetricImpact[];
  sensitivity?: SensitivityItem[];
  evidence_meta?: SimulationEvidenceMeta;
  rule_trace?: RuleTraceItem[];
  why_recommendation?: WhyRecommendationDetail;
  ai_explanation?: string;
  recommendation?: string;
  history_id?: number | null;
}

export interface SimulationHistoryItem {
  id: number;
  scenario_name: string;
  horizon_days: number;
  created_at: string;
  confidence?: number | null;
  recommendation: string;
  baseline: BaselineMetrics;
  impact: MetricImpact[];
  ai_explanation: string;
  why_recommendation?: WhyRecommendationDetail | null;
}

// ================= Milestone 4 Extensions =================

export interface RiskOverview {
  current_risk_status: string;
  risk_level_code: 'low' | 'medium' | 'high' | 'elevated';
  recent_violations: number;
  violations_delta_pct?: number | null;
  total_detections: number;
  detections_delta_pct?: number | null;
  compliance_status: string;
  compliance_rate_pct: number;
  active_hazards_count: number;
  last_inspection_date?: string | null;
}

export interface RiskTrendPoint {
  date: string;
  risk_score: number;
  violations_count: number;
  detections_count: number;
  label: string;
}

export interface RiskDetection {
  id: number;
  detected_object: string;
  risk_level: 'High' | 'Medium' | 'Low';
  confidence: number;
  confidence_pct: number;
  rule_code: string;
  rule_description: string;
  evidence_summary: string;
  image_path?: string | null;
  status: 'active' | 'mitigated' | 'investigating' | 'cleared';
  is_violation: boolean;
  detected_at: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender: 'user' | 'assistant';
  content: string;
  metadata_json?: string | null;
  created_at: string;
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message?: string | null;
}

export interface ConversationDetail {
  id: number;
  user_id: number;
  title: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface InlineCardsData {
  productivity?: {
    type: 'productivity';
    score: number;
    change_pct: string;
    consistency: string;
    focus_hours: string;
    peak_hours: string;
  };
  habit?: {
    type: 'habit';
    habit_name: string;
    completion_rate: string;
    current_streak: string;
    trend: string;
  };
  study?: {
    type: 'study';
    recent_hours: string;
    records_count: number;
  };
  financial?: {
    type: 'financial';
    savings_rate: string;
    budget_usage: string;
  };
  forecast?: {
    type: 'forecast';
    metric: string;
    current_value: number;
    forecast_value: number;
    trend: string;
    confidence: string;
    factors: string[];
    view_url: string;
  };
  simulation?: {
    type: 'simulation';
    scenario: string;
    current_state: string;
    simulated_outcome: string;
    difference: string;
    important_factors: string[];
    view_url: string;
  };
  insight?: {
    type: 'insight';
    title: string;
    observation: string;
    why_it_matters: string;
    relevant_data: string;
    view_url: string;
  };
}

export interface ChatResponse {
  conversation_id: number;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  is_success: boolean;
  is_configured: boolean;
  error_message?: string | null;
  sources_used?: string[] | null;
  inline_cards?: InlineCardsData | null;
  data_summary?: Record<string, any> | null;
  readiness?: {
    rag_retrieval?: {
      is_operational: boolean;
      status_label: string;
      description: string;
    };
    web_research?: {
      is_operational: boolean;
      status_label: string;
      description: string;
    };
  } | null;
}


