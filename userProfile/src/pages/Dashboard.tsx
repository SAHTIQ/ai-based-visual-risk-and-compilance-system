import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Scan,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Orbit,
  ArrowRight,
  Bot,
  Send,
  Loader2,
  ExternalLink,
  Calendar,
  X,
  Eye,
  Info,
  Sparkles,
  ChevronRight,
  Check,
  Copy,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { api } from '../services/api';
import type {
  RiskOverview,
  RiskTrendPoint,
  RiskDetection,
  SimulationResponse,
  MetricForecast,
  ChatMessage,
} from '../types';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useApp();

  // Data states
  const [overview, setOverview] = useState<RiskOverview | null>(null);
  const [trends, setTrends] = useState<RiskTrendPoint[]>([]);
  const [detections, setDetections] = useState<RiskDetection[]>([]);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [forecast, setForecast] = useState<MetricForecast | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<RiskDetection | null>(null);

  // Simulation tab state
  const [activeScenarioTab, setActiveScenarioTab] = useState<'best' | 'expected' | 'risk'>('expected');
  const [timeRange, setTimeRange] = useState<number>(30);

  // Dashboard Chatbot states
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [copiedMsgId, setCopiedMsgId] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'Explain my latest risk status.',
    'Why was this detection classified as high risk?',
    'Summarize my recent violations.',
    'Explain my latest simulation results.',
    'What should I investigate first?',
  ];

  // Initial load
  useEffect(() => {
    loadDashboardData();
    loadRecentConversation();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      const [ov, tr, dt, sim, fc] = await Promise.all([
        api.getRiskOverview(),
        api.getRiskTrends(timeRange),
        api.getRiskDetections({ limit: 6 }),
        api.getFutureSimulation().catch(() => null),
        api.getProductivityForecast().catch(() => null),
      ]);
      setOverview(ov);
      setTrends(tr);
      setDetections(dt);
      setSimulation(sim);
      setForecast(fc);
    } catch {
      // Keep UI resilient
    }
  };

  const loadRecentConversation = async () => {
    try {
      const convs = await api.getConversations();
      if (convs.length > 0) {
        const latest = convs[0];
        setActiveConvId(latest.id);
        const detail = await api.getConversationDetail(latest.id);
        setChatMessages(detail.messages);
      }
    } catch {
      // New conversation will be created on first message
    }
  };

  const handleSendDashboardMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text || isChatSending) return;

    setChatInput('');
    setIsChatSending(true);

    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      conversation_id: activeConvId || 0,
      sender: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, tempUserMsg]);
    scrollChatToBottom();

    try {
      let res;
      if (activeConvId) {
        res = await api.sendChatMessage(activeConvId, text);
      } else {
        res = await api.quickAskAI(text);
        setActiveConvId(res.conversation_id);
      }

      setIsConfigured(res.is_configured);

      // Refresh full messages
      const updated = await api.getConversationDetail(res.conversation_id);
      setChatMessages(updated.messages);
    } catch (err: any) {
      showToast(err.message || 'Failed to send message', 'error');
    } finally {
      setIsChatSending(false);
      scrollChatToBottom();
    }
  };

  const handleClearChat = async () => {
    try {
      const created = await api.createConversation('Dashboard Session');
      setActiveConvId(created.id);
      setChatMessages([]);
      showToast('Started new conversation thread', 'info');
    } catch {
      showToast('Could not reset chat', 'error');
    }
  };

  const scrollChatToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleCopy = (msgId: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    showToast('Copied to clipboard', 'info');
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const currentScenario = simulation?.scenarios?.[activeScenarioTab];

  return (
    <div className="space-y-6">
      {/* 1. Header & Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Welcome back, {user?.name?.split(' ')[0] || 'Alex'}!
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Here is your visual risk intelligence overview, compliance analytics, and AI-powered insights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-button bg-surface border border-border text-xs font-medium text-text-secondary shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="bg-transparent text-text-primary outline-none cursor-pointer"
            >
              <option value={14} className="bg-surface text-text-primary">Last 14 Days</option>
              <option value={30} className="bg-surface text-text-primary">Last 30 Days</option>
              <option value={60} className="bg-surface text-text-primary">Last 60 Days</option>
              <option value={90} className="bg-surface text-text-primary">Last Quarter</option>
            </select>
          </div>
          <button
            onClick={() => navigate('/ai-assistant')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-primary text-white text-xs font-medium hover:bg-primary-hover transition-colors shadow-sm"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Dedicated Assistant</span>
          </button>
        </div>
      </div>

      {/* 2. Top Overview Cards (4 summary cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Current Risk Status */}
        <Card className="hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                Current Risk Status
              </p>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {overview?.current_risk_status || 'Calculating...'}
              </p>
            </div>
            <div
              className={`p-2.5 rounded-xl ${
                overview?.risk_level_code === 'high' || overview?.risk_level_code === 'elevated'
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                  : overview?.risk_level_code === 'medium'
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                overview?.active_hazards_count && overview.active_hazards_count > 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}
            >
              {overview?.active_hazards_count || 0} active hazard{overview?.active_hazards_count === 1 ? '' : 's'}
            </span>
            <span className="text-text-secondary">requiring attention</span>
          </div>
        </Card>

        {/* Card 2: Recent Violations */}
        <Card className="hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                Recent Violations
              </p>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {overview ? overview.recent_violations : '—'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            {overview?.violations_delta_pct !== undefined && overview.violations_delta_pct !== null && (
              <span
                className={`inline-flex items-center font-medium ${
                  overview.violations_delta_pct > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {overview.violations_delta_pct > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
                )}
                {overview.violations_delta_pct > 0 ? `+${overview.violations_delta_pct}%` : `${overview.violations_delta_pct}%`}
              </span>
            )}
            <span className="text-text-secondary">vs. previous period</span>
          </div>
        </Card>

        {/* Card 3: Total Detections */}
        <Card className="hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                Total Detections
              </p>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {overview ? overview.total_detections : '—'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <Scan className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            {overview?.detections_delta_pct !== undefined && overview.detections_delta_pct !== null && (
              <span className="inline-flex items-center text-sky-600 dark:text-sky-400 font-medium">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                {overview.detections_delta_pct >= 0 ? `+${overview.detections_delta_pct}%` : `${overview.detections_delta_pct}%`}
              </span>
            )}
            <span className="text-text-secondary">automated optical scans</span>
          </div>
        </Card>

        {/* Card 4: Compliance Status */}
        <Card className="hover:shadow-card-hover transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                Compliance Status
              </p>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {overview ? overview.compliance_status : '—'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              {overview?.last_inspection_date
                ? `Last verified: ${overview.last_inspection_date}`
                : 'Continuous inspection active'}
            </span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Left/Center 2 Cols + Right AI Panel 1 Col */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= LEFT / CENTER SECTIONS (8 Cols) ================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section B: Risk Trends */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Historical Risk Trends
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Calculated daily risk index and violation frequency across authenticated records
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-primary rounded-full inline-block" /> Risk Index
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-rose-500 rounded-full inline-block" /> Violation
                </span>
              </div>
            </div>

            {trends.length > 0 ? (
              <RiskTrendChart data={trends} />
            ) : (
              <div className="py-12 text-center text-xs text-text-secondary">
                No historical trend points available for this range.
              </div>
            )}
          </Card>

          {/* Section C: Simulation Engine (Milestone 3 Reused) */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <Orbit className="w-4 h-4 text-primary" />
                  <h2 className="text-base font-semibold text-text-primary">
                    Milestone 3 Simulation Engine
                  </h2>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Multi-horizon trajectory models: Best-case, Expected, and Risk scenarios
                </p>
              </div>

              {/* Scenario Switcher */}
              <div className="flex p-0.5 rounded-lg bg-muted border border-border">
                <button
                  onClick={() => setActiveScenarioTab('best')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeScenarioTab === 'best'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Best-Case
                </button>
                <button
                  onClick={() => setActiveScenarioTab('expected')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeScenarioTab === 'expected'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Expected
                </button>
                <button
                  onClick={() => setActiveScenarioTab('risk')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeScenarioTab === 'risk'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Risk Scenario
                </button>
              </div>
            </div>

            {/* Scenario Content */}
            {simulation?.evidence_status === 'valid' && currentScenario ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-muted border border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        {currentScenario.name} Projection ({simulation.simulation_period} Days)
                      </span>
                      <p className="mt-1 text-xs text-text-primary font-medium">
                        {currentScenario.summary.outcome}
                      </p>
                    </div>
                    {currentScenario.confidence && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary-light text-primary">
                        {Math.round(currentScenario.confidence * 100)}% Confidence
                      </span>
                    )}
                  </div>

                  {/* Scenario Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border/80">
                    <div>
                      <p className="text-[10px] text-text-secondary">Projected Savings</p>
                      <p className="text-sm font-bold text-text-primary">
                        {currentScenario.summary.projected_savings != null
                          ? `₹${currentScenario.summary.projected_savings.toLocaleString()}`
                          : '—'}
                      </p>
                      <span className="text-[10px] text-text-secondary">
                        {currentScenario.summary.savings_change != null
                          ? `${currentScenario.summary.savings_change >= 0 ? '+' : ''}₹${currentScenario.summary.savings_change.toLocaleString()}`
                          : ''}
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] text-text-secondary">Productivity Score</p>
                      <p className="text-sm font-bold text-text-primary">
                        {currentScenario.summary.projected_average_productivity != null
                          ? `${currentScenario.summary.projected_average_productivity}/100`
                          : '—'}
                      </p>
                      <span className="text-[10px] text-text-secondary">
                        {currentScenario.summary.change_from_current != null
                          ? `${currentScenario.summary.change_from_current >= 0 ? '+' : ''}${currentScenario.summary.change_from_current.toFixed(1)} pts`
                          : ''}
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] text-text-secondary">Burnout Index</p>
                      <p className="text-sm font-bold text-text-primary">
                        {currentScenario.summary.projected_burnout != null
                          ? `${currentScenario.summary.projected_burnout}%`
                          : '—'}
                      </p>
                      <span className="text-[10px] text-text-secondary">
                        {currentScenario.summary.burnout_change != null
                          ? `${currentScenario.summary.burnout_change >= 0 ? '+' : ''}${currentScenario.summary.burnout_change.toFixed(1)}%`
                          : ''}
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] text-text-secondary">Emergency Runway</p>
                      <p className="text-sm font-bold text-text-primary">
                        {currentScenario.summary.projected_runway != null
                          ? `${currentScenario.summary.projected_runway} mo`
                          : '—'}
                      </p>
                      <span className="text-[10px] text-text-secondary">
                        {currentScenario.summary.runway_change != null
                          ? `${currentScenario.summary.runway_change >= 0 ? '+' : ''}${currentScenario.summary.runway_change.toFixed(1)} mo`
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Scenario Recommendation & Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-primary-light/30 border border-primary/20">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      Scenario Recommendation
                    </p>
                    <p className="text-xs text-text-primary font-medium">
                      {currentScenario.recommendation}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/simulation')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
                  >
                    <span>Full Simulation Page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-text-secondary space-y-2">
                <p>Simulation requires baseline history. Run the simulation to view multi-horizon models.</p>
                <button
                  onClick={() => navigate('/simulation')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-primary text-white text-xs font-medium"
                >
                  <Orbit className="w-3.5 h-3.5" />
                  <span>Configure Simulation</span>
                </button>
              </div>
            )}
          </Card>

          {/* Section D: Recent Detections */}
          <Card>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <Scan className="w-4 h-4 text-primary" />
                  Recent Visual Detections
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Latest automated hazard detections and compliance verifications
                </p>
              </div>
              <span className="text-xs text-text-secondary font-medium">
                {detections.length} recorded events
              </span>
            </div>

            {detections.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-secondary text-[11px] uppercase tracking-wider">
                      <th className="pb-2 font-medium">Detected Hazard / Object</th>
                      <th className="pb-2 font-medium">Risk Level</th>
                      <th className="pb-2 font-medium">Confidence</th>
                      <th className="pb-2 font-medium">Date & Time</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium text-right">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detections.map((det) => (
                      <tr key={det.id} className="hover:bg-muted/60 transition-colors">
                        <td className="py-3 pr-2 font-medium text-text-primary">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                det.risk_level === 'High'
                                  ? 'bg-rose-500'
                                  : det.risk_level === 'Medium'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                            />
                            <span className="truncate max-w-[200px]" title={det.detected_object}>
                              {det.detected_object}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              det.risk_level === 'High'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                : det.risk_level === 'Medium'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            }`}
                          >
                            {det.risk_level}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-text-secondary font-mono">
                          {det.confidence_pct}%
                        </td>
                        <td className="py-3 px-2 text-text-secondary">
                          {new Date(det.detected_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-2">
                          <span className="capitalize text-text-secondary text-[11px]">
                            {det.status}
                          </span>
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <button
                            onClick={() => setSelectedDetection(det)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-text-secondary">No detections available.</p>
            )}
          </Card>

          {/* Section E: AI Recommendations */}
          <Card className="border-primary/30 bg-primary-light/20">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-base font-semibold text-text-primary">
                  AI Risk & Compliance Recommendations
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                Evidence-Grounded
              </span>
            </div>

            <div className="space-y-3">
              {/* Primary Highlighted Recommendation */}
              <div className="p-3.5 rounded-xl bg-surface border border-primary/30 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary text-white shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-light text-primary">
                        Primary Action
                      </span>
                      <span className="text-xs text-text-secondary">
                        {simulation?.scenarios?.best?.recommendation ? 'Simulation & Risk Engine' : 'Risk Engine'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-text-primary leading-snug">
                      {simulation?.recommendation ||
                        'Prioritize inspection of overhead crane transit pathways to enforce ANSI/OSHA head protection standards.'}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Reason: Grounded in recent optical captures indicating active violations in high-consequence zones.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/simulation')}
                    className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    <span>Simulation</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Supporting Secondary Recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-lg bg-surface border border-border text-xs flex items-start gap-2.5">
                  <div className="p-1.5 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Egress Clearance Verification</p>
                    <p className="text-text-secondary text-[11px] mt-0.5">
                      Clear storage boxes near fire egress corridor NFPA-101-7.2.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-surface border border-border text-xs flex items-start gap-2.5">
                  <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Sustain High-Visibility Protocol</p>
                    <p className="text-text-secondary text-[11px] mt-0.5">
                      Maintain 100% reflective vest compliance in material transfer aisle 3.
                    </p>
                  </div>
                </div>
              </div>

              {forecast && (
                <div className="p-2.5 rounded-lg bg-surface/80 border border-border text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span className="text-text-secondary">ML Predictive Forecast:</span>
                    <span className="font-medium text-text-primary capitalize">
                      {forecast.trend} (~{forecast.predicted_value != null ? `${forecast.predicted_value} ${forecast.unit}` : 'Baseline'})
                    </span>
                    {forecast.confidence != null && (
                      <span className="text-[11px] text-text-secondary font-mono">
                        ({Math.round(forecast.confidence * 100)}% reliability)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => navigate('/forecasting')}
                    className="text-primary hover:underline text-[11px] font-medium shrink-0"
                  >
                    View Model Analytics
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN: DASHBOARD AI CHATBOT PANEL (4 Cols) ================= */}
        <div className="lg:col-span-4">
          <Card className="h-full flex flex-col p-0 overflow-hidden min-h-[640px] max-h-[880px]">
            {/* Panel Header */}
            <div className="p-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-text-primary">AI Risk Assistant</h3>
                  <p className="text-[10px] text-text-secondary">Persistent Grounded Chat</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleClearChat}
                  className="px-2 py-1 rounded text-[11px] text-text-secondary hover:text-text-primary hover:bg-muted transition-colors"
                  title="Start fresh thread"
                >
                  Clear
                </button>
                <button
                  onClick={() => navigate('/ai-assistant')}
                  className="p-1.5 rounded text-text-secondary hover:text-primary hover:bg-muted transition-colors"
                  title="Open full page assistant"
                  aria-label="Open full page assistant"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Unconfigured Alert Banner */}
            {!isConfigured && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Setup Notice:</span> Add <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">OPENAI_API_KEY</code> in <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">backend/.env</code> for live hosted generations. Grounding engine is active.
                </div>
              </div>
            )}

            {/* Chat Messages Stream */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary-light text-primary mx-auto flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-primary">Ask Risk Intelligence</h4>
                    <p className="text-[11px] text-text-secondary mt-1 max-w-[240px] mx-auto">
                      Query your live risk status, rule breaches, simulation results, or ML forecasts.
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary px-1">
                      Suggested questions:
                    </p>
                    {suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendDashboardMessage(q)}
                        className="w-full text-left p-2 rounded-lg text-xs bg-muted hover:bg-primary-light/50 hover:text-primary border border-border transition-colors truncate"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {!isUser && (
                        <div className="w-6 h-6 rounded-md bg-primary-light text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div
                        className={`group relative max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                          isUser
                            ? 'bg-primary text-white rounded-br-none shadow-sm'
                            : 'bg-muted text-text-primary rounded-bl-none border border-border'
                        }`}
                      >
                        <MarkdownRenderer content={msg.content} isUser={isUser} />
                        {!isUser && (
                          <div className="flex items-center justify-end gap-1 mt-1 pt-1 border-t border-border/60 text-[9px] text-text-secondary">
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="opacity-70 hover:opacity-100 transition-opacity flex items-center gap-0.5"
                            >
                              {copiedMsgId === msg.id ? (
                                <Check className="w-2.5 h-2.5 text-status-success" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                              <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {isChatSending && (
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-md bg-primary-light text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-muted text-text-primary rounded-xl rounded-bl-none border border-border px-3 py-2 text-xs flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Analyzing database records...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-border bg-surface">
              <div className="flex items-center gap-2 bg-muted rounded-xl border border-border p-1.5 focus-within:border-primary transition-colors">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendDashboardMessage();
                  }}
                  placeholder="Ask anything about your risks..."
                  disabled={isChatSending}
                  className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-secondary outline-none px-2"
                />
                <button
                  onClick={() => handleSendDashboardMessage()}
                  disabled={!chatInput.trim() || isChatSending}
                  className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary-hover disabled:opacity-40 transition-colors"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Detection Evidence Detail Modal */}
      {selectedDetection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface border border-border rounded-card max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Detection Evidence & Rule Audit
                </span>
                <h3 className="text-base font-bold text-text-primary mt-0.5">
                  {selectedDetection.detected_object}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetection(null)}
                className="p-1 rounded-lg hover:bg-muted text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted border border-border">
                <div>
                  <p className="text-[10px] text-text-secondary">Risk Classification</p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      selectedDetection.risk_level === 'High'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        : selectedDetection.risk_level === 'Medium'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    }`}
                  >
                    {selectedDetection.risk_level}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary">Model Confidence</p>
                  <p className="mt-1 font-mono font-bold text-text-primary">
                    {selectedDetection.confidence_pct}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary">Applicable Standard</p>
                  <p className="mt-1 font-mono font-semibold text-primary">
                    {selectedDetection.rule_code}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-secondary">Observed Timestamp</p>
                  <p className="mt-1 text-text-primary">
                    {new Date(selectedDetection.detected_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                  Compliance Rule Description
                </p>
                <p className="p-2.5 rounded-lg bg-muted text-text-primary">
                  {selectedDetection.rule_description}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                  Verified Sensor / Visual Evidence
                </p>
                <p className="p-2.5 rounded-lg bg-muted text-text-primary font-mono text-[11px] leading-relaxed">
                  {selectedDetection.evidence_summary}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-border">
              <button
                onClick={() => setSelectedDetection(null)}
                className="px-4 py-2 rounded-button bg-primary text-white text-xs font-medium hover:bg-primary-hover transition-colors"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ================= Mini SVG Risk Trend Component =================
function RiskTrendChart({ data }: { data: RiskTrendPoint[] }) {
  const width = 800;
  const height = 180;
  const pad = { left: 32, right: 20, top: 16, bottom: 28 };

  const values = data.map((d) => d.risk_score);
  const max = Math.max(...values, 80);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 10);
  const yMin = 0;
  const yMax = max + range * 0.1;

  const x = (i: number) =>
    pad.left + (i / Math.max(data.length - 1, 1)) * (width - pad.left - pad.right);
  const y = (v: number) =>
    pad.top + ((yMax - v) / Math.max(yMax - yMin, 1)) * (height - pad.top - pad.bottom);

  const line = data.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.risk_score)}`).join(' ');
  const area = `${line} L ${x(data.length - 1)} ${height - pad.bottom} L ${x(0)} ${height - pad.bottom} Z`;
  const every = Math.max(1, Math.ceil(data.length / 7));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px]" role="img" aria-label="Risk Trends Chart">
      <defs>
        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[20, 50, 80].map((level) => (
        <line
          key={level}
          x1={pad.left}
          y1={y(level)}
          x2={width - pad.right}
          y2={y(level)}
          stroke="var(--color-border)"
          strokeDasharray="4 4"
        />
      ))}

      {/* Area & Line */}
      <path d={area} fill="url(#riskGrad)" />
      <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Data points */}
      {data.map((p, i) => {
        const hasViolations = p.violations_count > 0;
        return (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.risk_score)}
            r={hasViolations ? 4.5 : 2.5}
            fill={hasViolations ? '#EF4444' : 'var(--color-surface)'}
            stroke={hasViolations ? '#DC2626' : 'var(--color-primary)'}
            strokeWidth="2"
          >
            <title>{`${p.label}: Risk Score ${p.risk_score} (${p.violations_count} violations)`}</title>
          </circle>
        );
      })}

      {/* X Labels */}
      {data.map((p, i) =>
        i % every === 0 || i === data.length - 1 ? (
          <text
            key={`xl-${i}`}
            x={x(i)}
            y={height - 8}
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-text-secondary)"
          >
            {p.label}
          </text>
        ) : null
      )}
    </svg>
  );
}
