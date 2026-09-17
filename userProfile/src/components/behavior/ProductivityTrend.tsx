import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../common/Card';
import { api } from '../../services/api';
import type { MetricForecast } from '../../types';

type Period = 'daily' | 'weekly' | 'monthly';
const periods: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const formatScore = (v: number) => `${v.toFixed(1)}/100`;

function TrendChart({ forecast, period }: { forecast: MetricForecast; period: Period }) {
  const raw = forecast.historical_series;
  const points = period === 'daily' ? raw.slice(-7) : raw;
  const width = 900;
  const height = 240;
  const pad = { left: 42, right: 28, top: 16, bottom: 32 };
  const values = [...points.map(p => p.value), ...(forecast.predicted_value != null ? [forecast.predicted_value] : [])];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const yMin = Math.max(0, min - range * 0.12);
  const yMax = max + range * 0.12;
  const x = (i: number) => pad.left + (i / Math.max(points.length - 1, 1)) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + ((yMax - v) / Math.max(yMax - yMin, 1)) * (height - pad.top - pad.bottom);
  const line = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.value)}`).join(' ');
  const area = points.length ? `${line} L ${x(points.length - 1)} ${height-pad.bottom} L ${x(0)} ${height-pad.bottom} Z` : '';
  const tickValues = [0, .25, .5, .75, 1].map(t => yMin + (yMax-yMin)*t).reverse();
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));

  if (!points.length) return <div className="h-[240px] grid place-items-center text-sm text-text-secondary">No productivity history available.</div>;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[240px]" role="img" aria-label="Productivity historical trend">
        {tickValues.map((v, i) => (
          <g key={i}>
            <line x1={pad.left} x2={width-pad.right} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" />
            <text x={pad.left-8} y={y(v)+4} textAnchor="end" fontSize="11" fill="var(--chart-axis)">{Math.round(v)}/100</text>
          </g>
        ))}
        <path d={area} fill="var(--chart-fill)" stroke="none"/>
        <path d={line} fill="none" stroke="var(--chart-actual)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
        {points.map((p,i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r="3.5" fill="var(--color-surface)" stroke="var(--chart-actual)" strokeWidth="2">
            <title>{`${p.label}: ${formatScore(p.value)}`}</title>
          </circle>
        ))}
        {forecast.predicted_value !== null && forecast.predicted_value !== undefined && (
          <g>
            <path d={`M ${x(points.length-1)} ${y(points[points.length-1].value)} L ${width-pad.right} ${y(forecast.predicted_value)}`} fill="none" stroke="var(--chart-forecast)" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round"/>
            <circle cx={width-pad.right} cy={y(forecast.predicted_value)} r="4" fill="var(--chart-forecast)">
              <title>{`Next period: ${formatScore(forecast.predicted_value)}`}</title>
            </circle>
          </g>
        )}
        {points.map((p,i) => i % labelEvery === 0 || i === points.length-1 ? (
          <text key={`l${i}`} x={x(i)} y={height-10} textAnchor="middle" fontSize="11" fill="var(--chart-axis)">{p.label}</text>
        ) : null)}
      </svg>
      <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-2"><span className="w-5 h-0.5 rounded-full" style={{background:'var(--chart-actual)'}}/>Historical</span>
        <span className="flex items-center gap-2"><span className="w-5 border-t border-dashed" style={{borderColor:'var(--chart-forecast)'}}/>Forecast</span>
      </div>
    </div>
  );
}

export const ProductivityTrend: React.FC = () => {
  const [period, setPeriod] = useState<Period>('daily');
  const [forecast, setForecast] = useState<MetricForecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getProductivityForecast(period).then(data => { if (active) setForecast(data); }).catch(() => { if (active) setForecast(null); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period]);

  const current = forecast?.historical_series.at(-1)?.value ?? 0;
  const change = forecast?.predicted_value != null && current ? ((forecast.predicted_value-current)/Math.abs(current))*100 : null;
  const Trend = forecast?.trend === 'increasing' ? TrendingUp : forecast?.trend === 'decreasing' ? TrendingDown : Minus;

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-border">
        <div>
          <h3 className="card-title">Productivity Trend</h3>
          <p className="text-sm text-text-secondary mt-1">Historical work hours with the next-period forecast</p>
        </div>
        <div className="seg-group" role="group" aria-label="Trend period">
          {periods.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`seg-btn ${period === p.key ? 'seg-btn-active' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="h-[240px] grid place-items-center text-sm text-text-secondary">Loading productivity trend…</div>
      ) : forecast ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-text-secondary">Current</p>
              <p className="text-lg font-semibold text-text-primary tabular-nums">{formatScore(current)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Next period</p>
              <p className="text-lg font-semibold text-text-primary tabular-nums">{forecast.predicted_value == null ? '—' : formatScore(forecast.predicted_value)}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Trend</p>
              <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary capitalize">
                <Trend className="w-4 h-4" aria-hidden="true" />{forecast.trend}
              </p>
            </div>
            {change != null && (
              <div>
                <p className="text-xs text-text-secondary">Expected change</p>
                <p className="text-lg font-semibold text-text-primary tabular-nums">{change >= 0 ? '+' : ''}{change.toFixed(1)}%</p>
              </div>
            )}
          </div>
          <TrendChart forecast={forecast} period={period}/>
        </>
      ) : (
        <div className="h-[240px] grid place-items-center text-sm text-text-secondary">Unable to load productivity trend.</div>
      )}
    </Card>
  );
};
