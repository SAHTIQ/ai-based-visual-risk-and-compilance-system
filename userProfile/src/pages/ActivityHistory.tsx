import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  UserCheck,
  DollarSign,
  BookOpen,
  CheckCircle2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import type { ActivityType } from '../types';

const ITEMS_PER_PAGE = 7;

export const ActivityHistory: React.FC = () => {
  const { activities, isLoadingActivities } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter logic
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchesSearch =
        act.activity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.date.includes(searchQuery);

      let matchesType = true;
      if (typeFilter === 'profile') {
        matchesType = act.type.startsWith('profile');
      } else if (typeFilter === 'financial') {
        matchesType = act.type.startsWith('financial');
      } else if (typeFilter === 'study') {
        matchesType = act.type.startsWith('study');
      } else if (typeFilter === 'habit') {
        matchesType = act.type.startsWith('habit');
      } else if (typeFilter === 'settings') {
        matchesType = act.type.startsWith('settings');
      }

      return matchesSearch && matchesType;
    });
  }, [activities, searchQuery, typeFilter]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / ITEMS_PER_PAGE));
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredActivities.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredActivities, currentPage]);

  const getIcon = (type: ActivityType) => {
    if (type.startsWith('profile')) return <UserCheck className="w-4 h-4 text-primary" />;
    if (type.startsWith('financial')) return <DollarSign className="w-4 h-4 text-emerald-600" />;
    if (type.startsWith('study')) return <BookOpen className="w-4 h-4 text-blue-600" />;
    if (type.startsWith('habit')) return <CheckCircle2 className="w-4 h-4 text-amber-600" />;
    return <Settings className="w-4 h-4 text-gray-600" />;
  };

  const getBgColor = (type: ActivityType) => {
    if (type.startsWith('profile')) return 'bg-primary-light';
    if (type.startsWith('financial')) return 'bg-emerald-50';
    if (type.startsWith('study')) return 'bg-blue-50';
    if (type.startsWith('habit')) return 'bg-amber-50';
    return 'bg-gray-100';
  };

  const getModuleBadge = (type: ActivityType) => {
    if (type.startsWith('profile')) return <Badge variant="primary" size="sm">Profile</Badge>;
    if (type.startsWith('financial')) return <Badge variant="success" size="sm">Financial</Badge>;
    if (type.startsWith('study')) return <Badge variant="neutral" size="sm">Study</Badge>;
    if (type.startsWith('habit')) return <Badge variant="warning" size="sm">Habits</Badge>;
    return <Badge variant="neutral" size="sm">System</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">User Activity History</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Chronological audit trail of all data entries, updates, modifications, and system events.
        </p>
      </div>

      <Card>
        {/* Controls: Search & Module Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search activity description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-border rounded-button text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-text-secondary" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="ALL">All Modules</option>
              <option value="profile">Profile Updates</option>
              <option value="financial">Financial Records</option>
              <option value="study">Study Records</option>
              <option value="habit">Habit Logs</option>
              <option value="settings">Settings Changes</option>
            </select>
          </div>
        </div>

        {/* Chronological Activity List */}
        <div className="pt-2">
          {isLoadingActivities ? (
            <div className="py-16 text-center text-xs text-text-secondary">
              Loading activity history...
            </div>
          ) : paginatedActivities.length > 0 ? (
            <div className="divide-y divide-border">
              {paginatedActivities.map((act) => (
                <div
                  key={act.id}
                  className="py-4 first:pt-2 last:pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-background/40 px-2 rounded-button transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-button flex items-center justify-center flex-shrink-0 mt-0.5 ${getBgColor(
                        act.type
                      )}`}
                    >
                      {getIcon(act.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-text-primary">{act.activity}</p>
                        {getModuleBadge(act.type)}
                      </div>
                      <p className="text-xs text-text-secondary mt-1">{act.description}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-right flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                      <Clock className="w-3.5 h-3.5 text-text-secondary" />
                      {act.time}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-text-secondary mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {act.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No activity records found"
              description="No user activities matched the search query or filter selection."
            />
          )}
        </div>

        {/* Pagination Footer */}
        {filteredActivities.length > ITEMS_PER_PAGE && (
          <div className="pt-4 mt-2 border-t border-border flex items-center justify-between text-xs">
            <span className="text-text-secondary">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredActivities.length)} of{' '}
              {filteredActivities.length} activities
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>

              <span className="px-2 font-semibold text-text-primary">
                {currentPage} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
