import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { MinimalBarChart } from '../common/MinimalBarChart';
import { useApp } from '../../context/AppContext';

export const FinancialOverviewCard: React.FC = () => {
  const { dashboardSummary } = useApp();
  const navigate = useNavigate();

  const metrics = dashboardSummary?.financialMetrics || {
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    totalBudget: 0,
  };

  const chartData = [
    { label: 'Total Income', value: metrics.totalIncome, color: 'bg-primary' },
    { label: 'Total Expenses', value: metrics.totalExpenses, color: 'bg-red-500' },
    { label: 'Net Savings', value: metrics.totalSavings, color: 'bg-emerald-600' },
    { label: 'Target Budget', value: metrics.totalBudget, color: 'bg-gray-400' },
  ];

  return (
    <Card
      title="Financial Overview"
      subtitle="Monthly cash flow, expenditures, and allocations"
      headerAction={
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/financial')}
          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          View Records
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Quick Numbers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-button bg-background border border-border">
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Income</p>
            <p className="text-sm font-bold text-primary mt-0.5">
              ${metrics.totalIncome.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-button bg-background border border-border">
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Expenses</p>
            <p className="text-sm font-bold text-status-danger mt-0.5">
              ${metrics.totalExpenses.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-button bg-background border border-border">
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Savings</p>
            <p className="text-sm font-bold text-status-success mt-0.5">
              ${metrics.totalSavings.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-button bg-background border border-border">
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Budget</p>
            <p className="text-sm font-bold text-text-primary mt-0.5">
              ${metrics.totalBudget.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Minimal Bar Chart */}
        <div className="pt-1">
          <MinimalBarChart items={chartData} />
        </div>
      </div>
    </Card>
  );
};
