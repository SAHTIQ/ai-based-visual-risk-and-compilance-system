import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Target, Clock, ArrowUpRight } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useApp } from '../../context/AppContext';

export const StudyOverviewCard: React.FC = () => {
  const { dashboardSummary } = useApp();
  const navigate = useNavigate();

  const studyMetrics = dashboardSummary?.studyMetrics || {
    totalHoursThisWeek: 0,
    weeklyGoal: 25.0,
    subjectCount: 0,
    recentSession: null,
  };

  const progressPercentage = Math.min(
    100,
    Math.round((studyMetrics.totalHoursThisWeek / Math.max(1, studyMetrics.weeklyGoal)) * 100)
  );

  return (
    <Card
      title="Study Overview"
      subtitle="Academic tracking, study time, and goals"
      headerAction={
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/study')}
          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          View Study Log
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Metric Badges */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-2.5 rounded-button bg-background border border-border">
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Hours Studied</p>
            <p className="text-base font-bold text-primary mt-0.5">
              {studyMetrics.totalHoursThisWeek} <span className="text-xs font-normal text-text-secondary">hrs</span>
            </p>
          </div>

          <div className="p-2.5 rounded-button bg-background border border-border">
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Active Courses</p>
            <p className="text-base font-bold text-text-primary mt-0.5">
              {studyMetrics.subjectCount}
            </p>
          </div>

          <div className="p-2.5 rounded-button bg-background border border-border">
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Weekly Goal</p>
            <p className="text-base font-bold text-text-primary mt-0.5">
              {studyMetrics.weeklyGoal} <span className="text-xs font-normal text-text-secondary">hrs</span>
            </p>
          </div>
        </div>

        {/* Weekly Goal Progress Bar */}
        <div className="p-3 rounded-button bg-purple-50/60 border border-purple-100">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" />
              Weekly Goal Progress
            </span>
            <span className="font-bold text-primary">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-purple-200/60 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-text-secondary mt-1.5">
            {studyMetrics.totalHoursThisWeek} of {studyMetrics.weeklyGoal} hours completed
          </p>
        </div>

        {/* Recent Study Session */}
        <div>
          <p className="text-[11px] font-semibold text-text-secondary uppercase mb-2">
            Recent Study Session
          </p>
          {studyMetrics.recentSession ? (
            <div className="flex items-center justify-between p-3 rounded-button bg-background border border-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-button bg-primary-light text-primary flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-primary truncate">
                    {studyMetrics.recentSession.subject}
                  </p>
                  <p className="text-[11px] text-text-secondary flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {studyMetrics.recentSession.date}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-text-primary flex-shrink-0 ml-2 px-2.5 py-1 rounded-button bg-white border border-border">
                {studyMetrics.recentSession.hours} hrs
              </span>
            </div>
          ) : (
            <div className="text-xs text-text-secondary p-3 bg-background rounded-button border border-border text-center">
              No recent study session logged
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
