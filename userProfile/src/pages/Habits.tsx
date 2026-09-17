import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Flame,
  Clock,
  Calendar,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { PageHeader } from '../components/layout/PageHeader';
import { HabitModal } from '../components/forms/HabitModal';
import { DeleteConfirmModal } from '../components/forms/DeleteConfirmModal';
import { useApp } from '../context/AppContext';
import type { HabitRecord } from '../types';

export const Habits: React.FC = () => {
  const { habits, isLoadingHabits, addHabit, updateHabit, toggleHabitStatus, deleteHabit } =
    useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Completed' | 'Pending'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitRecord | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<HabitRecord | null>(null);

  // Filtered habits
  const filteredHabits = useMemo(() => {
    return habits.filter((habit) => {
      const matchesSearch =
        habit.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        habit.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'ALL' || habit.category === selectedCategory;

      const matchesStatus =
        statusFilter === 'ALL' || habit.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [habits, searchQuery, selectedCategory, statusFilter]);

  // Aggregate stats
  const completedCount = habits.filter((h) => h.status === 'Completed').length;
  const pendingCount = habits.filter((h) => h.status === 'Pending').length;
  const maxStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.streakCount)) : 0;

  const handleCreateOrUpdate = async (
    data: Omit<HabitRecord, 'id' | 'createdAt' | 'streakCount'>
  ) => {
    if (editingHabit) {
      return await updateHabit(editingHabit.id, data);
    } else {
      return await addHabit(data);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingHabit) return false;
    return await deleteHabit(deletingHabit.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Habits"
        description="Completion, consistency, streaks, and habit history."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingHabit(null);
              setIsAddModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Habit
          </Button>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-card bg-surface border border-border shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-button bg-primary-light text-primary flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Total Tracked</p>
            <p className="text-lg font-bold text-text-primary">{habits.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-card bg-surface border border-border shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-button bg-emerald-50 text-status-success flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Completed Today</p>
            <p className="text-lg font-bold text-status-success">{completedCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-card bg-surface border border-border shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-button bg-amber-50 text-status-warning flex items-center justify-center flex-shrink-0">
            <Circle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Pending</p>
            <p className="text-lg font-bold text-status-warning">{pendingCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-card bg-surface border border-border shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-button bg-red-50 text-status-danger flex items-center justify-center flex-shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Best Streak</p>
            <p className="text-lg font-bold text-status-danger">{maxStreak} days</p>
          </div>
        </div>
      </div>

      {/* Main Habits List Card */}
      <Card>
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search habit title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-text-secondary" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input-field w-auto"
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed Only</option>
              <option value="Pending">Pending Only</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field w-auto"
            >
              <option value="ALL">All Categories</option>
              <option value="Fitness">Fitness</option>
              <option value="Study">Study</option>
              <option value="Health">Health</option>
              <option value="Mindfulness">Mindfulness</option>
              <option value="Productivity">Productivity</option>
              <option value="Routine">Routine</option>
            </select>
          </div>
        </div>

        {/* Habits Table / List */}
        <div className="overflow-x-auto -mx-5 -mb-5">
          {isLoadingHabits ? (
            <div className="py-16 text-center text-xs text-text-secondary">
              Loading habit tracking list...
            </div>
          ) : filteredHabits.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="table-head">
                  <th className="py-3 px-5 font-semibold w-12 text-center">Status</th>
                  <th className="py-3 px-5 font-semibold">Habit</th>
                  <th className="py-3 px-5 font-semibold">Category</th>
                  <th className="py-3 px-5 font-semibold">Duration</th>
                  <th className="py-3 px-5 font-semibold">Frequency</th>
                  <th className="py-3 px-5 font-semibold">Streak</th>
                  <th className="py-3 px-5 font-semibold">Date</th>
                  <th className="py-3 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHabits.map((habit) => {
                  const isCompleted = habit.status === 'Completed';
                  return (
                    <tr
                      key={habit.id}
                      className="hover:bg-background/60 transition-colors"
                    >
                      <td className="py-3 px-5 text-center">
                        <button
                          onClick={() => toggleHabitStatus(habit.id)}
                          aria-label={`Mark ${habit.title} as ${isCompleted ? 'Pending' : 'Completed'}`}
                          className={`p-1 rounded-full transition-colors ${
                            isCompleted
                              ? 'text-status-success hover:text-emerald-700'
                              : 'text-gray-300 hover:text-primary'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 fill-emerald-50" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <p
                          className={`font-semibold ${
                            isCompleted ? 'text-text-secondary line-through' : 'text-text-primary'
                          }`}
                        >
                          {habit.title}
                        </p>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <Badge variant="neutral" size="sm">
                          {habit.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-text-secondary" />
                          {habit.duration}
                        </div>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap text-text-secondary">
                        {habit.frequency}
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap font-medium text-text-primary">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs">
                          <Flame className="w-3 h-3 text-status-warning" />
                          <span>{habit.streakCount}d</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {habit.date}
                        </div>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingHabit(habit);
                              setIsAddModalOpen(true);
                            }}
                            aria-label={`Edit ${habit.title}`}
                            className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-light rounded-button transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingHabit(habit)}
                            aria-label={`Delete ${habit.title}`}
                            className="p-1.5 text-text-secondary hover:text-status-danger hover:bg-red-50 rounded-button transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="No habits found"
              description={
                searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No habit items match your filter criteria.'
                  : 'Start tracking daily habits and build consistent streaks.'
              }
              actionLabel="+ Add Habit"
              onAction={() => {
                setEditingHabit(null);
                setIsAddModalOpen(true);
              }}
            />
          )}
        </div>
      </Card>

      {/* Add / Edit Habit Modal */}
      <HabitModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingHabit(null);
        }}
        onSubmit={handleCreateOrUpdate}
        habitToEdit={editingHabit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingHabit}
        onClose={() => setDeletingHabit(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Habit"
        itemDescription={
          deletingHabit
            ? `${deletingHabit.title} (${deletingHabit.duration}, ${deletingHabit.streakCount} day streak)`
            : ''
        }
      />
    </div>
  );
};
