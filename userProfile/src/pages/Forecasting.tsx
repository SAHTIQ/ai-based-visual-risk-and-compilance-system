import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Activity,
  CheckCircle2,
  FileText,
  Info,
  TrendingDown,
  TrendingUp,
  Minus,
  Wallet,
} from 'lucide-react';
import type { MetricForecast } from '../types';

type MetricKey = 'productivity' | 'financial' | 'habits';
type Period = 'daily' | 'weekly' | 'monthly';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const PERIOD_WORDS: Record<Period, { short: string; next: string; average: string }> = {
  daily: { short: 'day', next: 'Next Day', average: '3-Day' },
  weekly: { short: 'week', next: 'Next Week', average: '3-Week' },
  monthly: { short: 'month', next: 'Next Month', average: '3-Month' },
};

function metricTitle(metric: MetricKey) {
  if (metric === 'productivity') return 'Work Hours';
  if (metric === 'financial') return 'Expenses';
  return 'Habit Consistency';
}

function formatValue(value: number | null | undefined, metric: MetricKey) {
  if (value === null || value === undefined) return '—';
  if (metric === 'financial') {
    return `₹${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
  }
  if (metric === 'habits') return `${value.toFixed(1)}%`;
  return `${value.toFixed(1)} hrs`;
}

function changeText(current: number, predicted: number | null) {
  if (predicted === null || current === 0) return null;
  const pct = ((predicted - current) / Math.abs(current)) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

function Chart({
  forecast,
  metric,
  period,
}: {
  forecast: MetricForecast;
  metric: MetricKey;
  period: Period;
}) {
  const points = forecast.historical_series;
  const regression = forecast.regression_series;
  const predicted = forecast.predicted_value;
  const width = 1000;
  const height = 280;
  const pad = { left: 54, right: 28, top: 16, bottom: 36 };

  if (!points.length) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-text-secondary">
        No historical data is available for this metric.
      </div>
    );
  }

  const allValues = [
    ...points.map((p) => p.value),
    ...regression.map((p) => p.value),
    ...(predicted !== null && predicted !== undefined ? [predicted] : []),
  ];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = Math.max(max - min, 1);
  const yMin = Math.max(0, min - range * 0.15);
  const yMax = max + range * 0.15;

  const x = (i: number) =>
    pad.left + (i / Math.max(points.length - 1, 1)) * (width - pad.left - pad.right);
  const y = (value: number) =>
    pad.top + ((yMax - value) / Math.max(yMax - yMin, 1)) * (height - pad.top - pad.bottom);

  const actualPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`)
    .join(' ');
  const regressionPath = regression
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`)
    .join(' ');

  const forecastX = x(points.length - 1);
  const forecastY = predicted !== null && predicted !== undefined ? y(predicted) : forecastX;
  const forecastLine =
    predicted !== null && predicted !== undefined
      ? `M ${forecastX} ${y(points[points.length - 1].value)} L ${width - pad.right} ${forecastY}`
      : '';

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / yTicks).reverse();

  const visibleLabels = points.map((p, i) => {
    const every = Math.max(1, Math.ceil(points.length / 8));
    return i === points.length - 1 || i % every === 0 ? { ...p, i } : null;
  }).filter(Boolean) as { label: string; value: number; i: number }[];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[280px]" role="img" aria-label={`${metricTitle(metric)} ${period} historical trend and forecast`}>
        {tickValues.map((value, i) => {
          const yy = y(value);
          return (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={yy} y2={yy} stroke="var(--chart-grid)" strokeWidth="1" />
              <text x={pad.left - 8} y={yy + 4} textAnchor="end" fontSize="11" fill="var(--chart-axis)">
                {metric === 'financial' ? `₹${Math.round(value).toLocaleString()}` : metric === 'habits' ? `${Math.round(value)}%` : `${value.toFixed(0)}h`}
              </text>
            </g>
          );
        })}

        <path d={`${actualPath} L ${x(points.length - 1)} ${height - pad.bottom} L ${x(0)} ${height - pad.bottom} Z`} fill="var(--chart-fill)" stroke="none" />
        <path d={actualPath} fill="none" stroke="var(--chart-actual)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        {regressionPath && (
          <path d={regressionPath} fill="none" stroke="var(--chart-regression)" strokeWidth="1.5" strokeDasharray="5 5" />
        )}
        {forecastLine && (
          <path d={forecastLine} fill="none" stroke="var(--chart-forecast)" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" />
        )}

        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4.5 : 3.25} fill="var(--color-surface)" stroke="var(--chart-actual)" strokeWidth="2">
            <title>{`${p.label}: ${formatValue(p.value, metric)}`}</title>
          </circle>
        ))}

        {predicted !== null && predicted !== undefined && (
          <circle cx={width - pad.right} cy={forecastY} r="4.5" fill="var(--chart-forecast)" stroke="var(--color-surface)" strokeWidth="2">
            <title>{`${PERIOD_WORDS[period].next}: ${formatValue(predicted, metric)}`}</title>
          </circle>
        )}

        {visibleLabels.map(({ label, i }) => (
          <text key={i} x={x(i)} y={height - 12} textAnchor="middle" fontSize="11" fill="var(--chart-axis)">
            {label}
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap items-center gap-5 pt-1 text-xs text-text-secondary">
        <span className="flex items-center gap-2">
          <span className="w-6 h-0.5 rounded-full" style={{ background: 'var(--chart-actual)' }} />
          Historical data
        </span>
        <span className="flex items-center gap-2">
          <span className="w-6 border-t border-dashed" style={{ borderColor: 'var(--chart-regression)' }} />
          Regression trend
        </span>
        <span className="flex items-center gap-2">
          <span className="w-6 border-t border-dotted" style={{ borderColor: 'var(--chart-forecast)' }} />
          Forecast
        </span>
      </div>
    </div>
  );
}

export const Forecasting: React.FC = () => {
  const { showToast } = useApp();
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('productivity');
  const [period, setPeriod] = useState<Period>('daily');
  const [forecast, setForecast] = useState<MetricForecast | null>(null);
  const [loading, setLoading] = useState(true);

  const loadForecast = async () => {
    setLoading(true);
    try {
      let result: MetricForecast;
      if (selectedMetric === 'productivity') {
        result = await api.getProductivityForecast(period);
      } else if (selectedMetric === 'financial') {
        result = await api.getFinancialForecast(period);
      } else {
        result = await api.getHabitForecast(period);
      }
      setForecast(result);
    } catch (err: any) {
      setForecast(null);
      showToast(err.message || 'Failed to load predictive analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
  }, [selectedMetric, period]);

  const currentFromSeries =
    forecast && forecast.historical_series.length
      ? forecast.historical_series[forecast.historical_series.length - 1].value
      : forecast?.current_value ?? 0;

  const change = useMemo(
    () => changeText(currentFromSeries, forecast?.predicted_value ?? null),
    [currentFromSeries, forecast?.predicted_value]
  );

  const trendIcon =
    forecast?.trend === 'increasing'
      ? TrendingUp
      : forecast?.trend === 'decreasing'
        ? TrendingDown
        : Minus;

  const TrendIcon = trendIcon;
  const trendHint =
    forecast?.trend === 'increasing'
      ? 'The fitted trend is rising relative to recent history.'
      : forecast?.trend === 'decreasing'
        ? 'The fitted trend is falling relative to recent history.'
        : 'The fitted trend is relatively stable.';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Predictive Forecasting"
        description="Historical performance and next-period prediction"
      />

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-medium text-text-secondary mb-1.5">Metric</p>
          <div className="seg-group" role="group" aria-label="Forecast metric">
            {([
              ['productivity', 'Work Hours', Activity],
              ['financial', 'Expenses', Wallet],
              ['habits', 'Habit Consistency', CheckCircle2],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedMetric(key)}
                className={`seg-btn inline-flex items-center gap-1.5 ${selectedMetric === key ? 'seg-btn-active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-text-secondary mb-1.5">Period</p>
          <div className="seg-group" role="group" aria-label="Forecast period">
            {PERIODS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriod(item.key)}
                className={`seg-btn ${period === item.key ? 'seg-btn-active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <Card>
          <p className="py-16 text-center text-sm text-text-secondary">
            Loading {period} {metricTitle(selectedMetric).toLowerCase()} forecast…
          </p>
        </Card>
      ) : forecast ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface border border-border rounded-card p-5 shadow-card">
              <p className="text-xs font-medium text-text-secondary">Current Period</p>
              <p className="metric-value mt-2">{formatValue(currentFromSeries, selectedMetric)}</p>
              <p className="text-sm text-text-secondary mt-1">Latest completed {PERIOD_WORDS[period].short}</p>
            </div>
            <div className="bg-surface border border-border rounded-card p-5 shadow-card">
              <p className="text-xs font-medium text-text-secondary">Next Period</p>
              <p className="metric-value mt-2">{formatValue(forecast.predicted_value, selectedMetric)}</p>
              <p className="text-sm text-text-secondary mt-1">
                {change ? `${change} expected change` : 'Prediction'}
              </p>
            </div>
            <div className="bg-surface border border-border rounded-card p-5 shadow-card">
              <p className="text-xs font-medium text-text-secondary">Trend</p>
              <p className="mt-2 flex items-center gap-2 text-xl font-semibold capitalize text-text-primary">
                <TrendIcon className="w-5 h-5" aria-hidden="true" />
                {forecast.trend}
              </p>
              <p className="text-sm text-text-secondary mt-1">{trendHint}</p>
            </div>
          </div>

          <Card>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 mb-2 border-b border-border">
              <div>
                <h2 className="card-title">Historical Trend</h2>
                <p className="text-sm text-text-secondary mt-1">
                  {metricTitle(selectedMetric)} · {period} view
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                forecast.status === 'valid'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {forecast.status === 'valid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                {forecast.status === 'valid' ? 'Model validated' : 'Insufficient evidence'}
              </span>
            </div>
            {forecast.historical_series.length ? (
              <Chart forecast={forecast} metric={selectedMetric} period={period} />
            ) : (
              <div className="p-12 text-center text-sm text-text-secondary">No historical series data available.</div>
            )}
          </Card>

          <Card>
            <h3 className="card-title">Model Performance Comparison</h3>
            <p className="text-sm text-text-secondary mt-1 mb-4">
              Chronological held-out evaluation from the three ML models
            </p>
            {forecast.model_evaluations?.length ? (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[720px]">
                  {forecast.model_evaluations.map((model) => (
                    <div key={model.model} className="rounded-lg border border-border p-4 bg-muted">
                      <h4 className="font-semibold text-text-primary">{model.model}</h4>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Train MAE</span>
                          <strong>{model.train_mae.toFixed(3)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Test MAE</span>
                          <strong>{model.test_mae.toFixed(3)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Train RMSE</span>
                          <strong>{model.train_rmse.toFixed(3)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Test RMSE</span>
                          <strong>{model.test_rmse.toFixed(3)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Test R²</span>
                          <strong>{model.test_r2 ?? '—'}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Explained Variance</span>
                          <strong>{model.explained_variance ?? '—'}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : forecast.evaluation ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-text-secondary font-medium">MAE</p>
                  <p className="text-xl font-semibold mt-1 tabular-nums">{forecast.evaluation.mae}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-text-secondary font-medium">RMSE</p>
                  <p className="text-xl font-semibold mt-1 tabular-nums">{forecast.evaluation.rmse}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <p className="text-xs text-text-secondary font-medium">R²</p>
                  <p className="text-xl font-semibold mt-1 tabular-nums">{forecast.evaluation.r2 ?? '—'}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 dark:bg-amber-950/30 dark:border-amber-800">
                <p className="font-semibold text-amber-800 dark:text-amber-200">Insufficient Data</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{forecast.reason}</p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary border-t border-border pt-3">
              <span>Observations: <strong className="text-text-primary font-medium">{forecast.historical_observations}</strong></span>
              <span>Required: <strong className="text-text-primary font-medium">{forecast.required_observations}</strong></span>
              <span className="capitalize">Selected model: <strong className="text-text-primary font-medium">{forecast.model.replace('_', ' ')}</strong></span>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-text-secondary" aria-hidden="true" />
              <h3 className="card-title">Evidence</h3>
            </div>
            <p className="text-sm leading-6 text-text-secondary mb-3">
              {forecast.status === 'valid'
                ? `Based on the historical ${period} ${metricTitle(selectedMetric).toLowerCase()} trend, the selected ML model estimates ${formatValue(forecast.predicted_value, selectedMetric)} for the ${PERIOD_WORDS[period].short === 'day' ? 'next day' : PERIOD_WORDS[period].short === 'week' ? 'next week' : 'next month'}.`
                : 'A future prediction is withheld until enough historical observations are available for meaningful validation.'}
            </p>
            {forecast.evidence?.length ? (
              <ul className="space-y-2">
                {forecast.evidence.map((item, idx) => (
                  <li key={idx} className="text-sm text-text-primary pl-3 border-l-2 border-border">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary">No data available</p>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
};
