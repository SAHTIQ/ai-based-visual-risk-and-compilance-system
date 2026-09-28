import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  BookOpen,
  Clock,
  Target,
  Award,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { StudyRecordModal } from '../components/forms/StudyRecordModal';
import { DeleteConfirmModal } from '../components/forms/DeleteConfirmModal';
import { useApp } from '../context/AppContext';
import type { StudyRecord, PerformanceGrade } from '../types';

export const Study: React.FC = () => {
  const {
    studyRecords,
    isLoadingStudy,
    addStudyRecord,
    updateStudyRecord,
    deleteStudyRecord,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StudyRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<StudyRecord | null>(null);

  // Extract unique course list
  const uniqueCourses = useMemo(() => {
    return Array.from(new Set(studyRecords.map((r) => r.course))).sort();
  }, [studyRecords]);

  // Filtered study records
  const filteredRecords = useMemo(() => {
    return studyRecords.filter((record) => {
      const matchesSearch =
        record.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.notes && record.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        record.date.includes(searchQuery);

      const matchesCourse =
        selectedCourse === 'ALL' || record.course === selectedCourse;

      return matchesSearch && matchesCourse;
    });
  }, [studyRecords, searchQuery, selectedCourse]);

  // Aggregate stats
  const totalHours = studyRecords.reduce((acc, r) => acc + r.studyHours, 0);
  const avgSession = studyRecords.length > 0 ? (totalHours / studyRecords.length).toFixed(1) : 0;
  const excellentSessions = studyRecords.filter((r) => r.performance === 'Excellent').length;

  const handleCreateOrUpdate = async (data: Omit<StudyRecord, 'id' | 'createdAt'>) => {
    if (editingRecord) {
      return await updateStudyRecord(editingRecord.id, data);
    } else {
      return await addStudyRecord(data);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return false;
    return await deleteStudyRecord(deletingRecord.id);
  };

  const getPerformanceBadgeVariant = (perf: PerformanceGrade) => {
    switch (perf) {
      case 'Excellent':
        return 'success';
      case 'Good':
        return 'primary';
      case 'Satisfactory':
        return 'warning';
      case 'Needs Improvement':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Study Data</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Log academic study sessions, coursework hours, and performance goals.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingRecord(null);
            setIsAddModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Study Record
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-card bg-surface border border-border shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-button bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Total Study Time</p>
            <p className="text-lg font-bold text-text-primary">{totalHours.toFixed(1)} hrs</p>
          </div>
        </div>

        <div className="p-4 rounded-card bg-surface border border-border shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-button bg-primary-light text-primary flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Active Courses</p>
            <p className="text-lg font-bold text-primary">{uniqueCourses.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-card bg-surface border border-border shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-button bg-emerald-50 text-status-success flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Top Sessions</p>
            <p className="text-lg font-bold text-status-success">{excellentSessions} rated</p>
          </div>
        </div>

        <div className="p-4 rounded-card bg-surface border border-border shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-button bg-amber-50 text-status-warning flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-secondary uppercase">Avg Session</p>
            <p className="text-lg font-bold text-status-warning">{avgSession} hrs</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search course, topic, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border border-border rounded-button text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-text-secondary" />
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="ALL">All Courses</option>
              {uniqueCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Study Table */}
        <div className="overflow-x-auto -mx-5 -mb-5">
          {isLoadingStudy ? (
            <div className="py-16 text-center text-xs text-text-secondary">
              Loading study records...
            </div>
          ) : filteredRecords.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-border text-text-secondary uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-5 font-semibold">Date</th>
                  <th className="py-3 px-5 font-semibold">Course</th>
                  <th className="py-3 px-5 font-semibold">Subject</th>
                  <th className="py-3 px-5 font-semibold">Study Hours</th>
                  <th className="py-3 px-5 font-semibold">Study Goal</th>
                  <th className="py-3 px-5 font-semibold">Performance</th>
                  <th className="py-3 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-background/60 transition-colors">
                    <td className="py-3 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-text-primary">
                        <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                        {record.date}
                      </div>
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap font-bold text-primary">
                      {record.course}
                    </td>
                    <td className="py-3 px-5">
                      <p className="font-medium text-text-primary">{record.subject}</p>
                      {record.notes && (
                        <p className="text-[11px] text-text-secondary truncate max-w-sm mt-0.5">
                          {record.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap font-semibold text-text-primary">
                      {record.studyHours} hrs
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap text-text-secondary">
                      {record.studyGoal} hrs
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap">
                      <Badge variant={getPerformanceBadgeVariant(record.performance)} size="sm">
                        {record.performance}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingRecord(record);
                            setIsAddModalOpen(true);
                          }}
                          aria-label={`Edit ${record.course} session`}
                          className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-light rounded-button transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingRecord(record)}
                          aria-label={`Delete ${record.course} session`}
                          className="p-1.5 text-text-secondary hover:text-status-danger hover:bg-red-50 rounded-button transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              title="No study records found"
              description={
                searchQuery || selectedCourse !== 'ALL'
                  ? 'No study sessions match your filter parameters.'
                  : 'Start tracking your study sessions by logging your first subject.'
              }
              actionLabel="+ Add Study Record"
              onAction={() => {
                setEditingRecord(null);
                setIsAddModalOpen(true);
              }}
            />
          )}
        </div>
      </Card>

      {/* Add / Edit Modal */}
      <StudyRecordModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={handleCreateOrUpdate}
        recordToEdit={editingRecord}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Study Record"
        itemDescription={
          deletingRecord
            ? `${deletingRecord.course}: ${deletingRecord.subject} (${deletingRecord.studyHours} hrs on ${deletingRecord.date})`
            : ''
        }
      />
    </div>
  );
};
