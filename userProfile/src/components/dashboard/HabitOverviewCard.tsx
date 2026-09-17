import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowUpRight, Plus } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useApp } from '../../context/AppContext';

export const HabitOverviewCard: React.FC = () => {
  const { habits, toggleHabitStatus } = useApp();
  const navigate = useNavigate();

  const previewHabits = habits.slice(0, 4);

  return (
    <Card
      title="Habit Overview"
      subtitle="Today's routine and discipline checklist"
      headerAction={
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/habits')}
          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          Manage Habits
        </Button>
      }
    >
      <div className="space-y-3">
        {previewHabits.length > 0 ? (
          previewHabits.map((habit) => {
            const isCompleted = habit.status === 'Completed';
            return (
              <div
                key={habit.id}
                className="flex items-center justify-between p-3 rounded-button bg-background border border-border hover:border-gray-300 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleHabitStatus(habit.id)}
                    aria-label={`Toggle ${habit.title} status`}
                    className={`transition-colors p-0.5 rounded-full ${
                      isCompleted ? 'text-status-success hover:text-emerald-700' : 'text-gray-400 hover:text-primary'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 fill-emerald-100" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isCompleted ? 'text-text-secondary line-through' : 'text-text-primary'
                      }`}
                    >
                      {habit.title}
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      {habit.category} • {habit.duration} • {habit.streakCount}d streak
                    </p>
                  </div>
                </div>

                <Badge variant={isCompleted ? 'success' : 'warning'} size="sm">
                  {habit.status}
                </Badge>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 text-xs text-text-secondary">
            No habits configured yet.
          </div>
        )}

        <div className="pt-1 flex items-center justify-between text-xs text-text-secondary">
          <span>
            {habits.filter((h) => h.status === 'Completed').length} of {habits.length} completed today
          </span>
          <button
            onClick={() => navigate('/habits')}
            className="text-primary font-semibold hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Habit
          </button>
        </div>
      </div>
    </Card>
  );
};
