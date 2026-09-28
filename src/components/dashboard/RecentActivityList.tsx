import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  DollarSign,
  BookOpen,
  CheckCircle2,
  Settings,
  ArrowUpRight,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import type { ActivityType } from '../../types';
import { useApp } from '../../context/AppContext';

export const RecentActivityList: React.FC = () => {
  const { activities } = useApp();
  const navigate = useNavigate();

  const getIcon = (type: ActivityType) => {
    switch (type) {
      case 'profile_updated':
        return <UserCheck className="w-4 h-4 text-primary" />;
      case 'financial_added':
      case 'financial_updated':
      case 'financial_deleted':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'study_added':
      case 'study_updated':
      case 'study_deleted':
        return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'habit_added':
      case 'habit_updated':
      case 'habit_status_changed':
      case 'habit_deleted':
        return <CheckCircle2 className="w-4 h-4 text-amber-600" />;
      default:
        return <Settings className="w-4 h-4 text-gray-600" />;
    }
  };

  const getBgColor = (type: ActivityType) => {
    switch (type) {
      case 'profile_updated':
        return 'bg-primary-light';
      case 'financial_added':
      case 'financial_updated':
      case 'financial_deleted':
        return 'bg-emerald-50';
      case 'study_added':
      case 'study_updated':
      case 'study_deleted':
        return 'bg-blue-50';
      case 'habit_added':
      case 'habit_updated':
      case 'habit_status_changed':
      case 'habit_deleted':
        return 'bg-amber-50';
      default:
        return 'bg-gray-100';
    }
  };

  const recent = activities.slice(0, 5);

  return (
    <Card
      title="Recent Activity"
      subtitle="Chronological audit log of user entries and modifications"
      headerAction={
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/activity')}
          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          View Full History
        </Button>
      }
    >
      {recent.length > 0 ? (
        <div className="divide-y divide-border">
          {recent.map((act) => (
            <div
              key={act.id}
              className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-button flex items-center justify-center flex-shrink-0 mt-0.5 ${getBgColor(
                    act.type
                  )}`}
                >
                  {getIcon(act.type)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-primary">{act.activity}</p>
                  <p className="text-[11px] text-text-secondary line-clamp-1 mt-0.5">
                    {act.description}
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-[11px] font-medium text-text-primary">{act.time}</p>
                <p className="text-[10px] text-text-secondary">{act.date}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-text-secondary">
          No data available
        </div>
      )}
    </Card>
  );
};
