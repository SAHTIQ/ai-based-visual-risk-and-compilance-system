import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { StudyRecord, PerformanceGrade } from '../../types';

interface StudyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<StudyRecord, 'id' | 'createdAt'>) => Promise<boolean>;
  recordToEdit?: StudyRecord | null;
}

const PERFORMANCE_OPTIONS: PerformanceGrade[] = [
  'Excellent',
  'Good',
  'Satisfactory',
  'Needs Improvement',
];

export const StudyRecordModal: React.FC<StudyRecordModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  recordToEdit,
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [course, setCourse] = useState('');
  const [subject, setSubject] = useState('');
  const [studyHours, setStudyHours] = useState<number | string>(2.0);
  const [studyGoal, setStudyGoal] = useState<number | string>(3.0);
  const [performance, setPerformance] = useState<PerformanceGrade>('Good');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (recordToEdit) {
      setDate(recordToEdit.date);
      setCourse(recordToEdit.course);
      setSubject(recordToEdit.subject);
      setStudyHours(recordToEdit.studyHours);
      setStudyGoal(recordToEdit.studyGoal);
      setPerformance(recordToEdit.performance);
      setNotes(recordToEdit.notes || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setCourse('');
      setSubject('');
      setStudyHours(2.0);
      setStudyGoal(3.0);
      setPerformance('Good');
      setNotes('');
    }
    setErrors({});
  }, [recordToEdit, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = 'Date is required';
    if (!course.trim()) newErrors.course = 'Course code/name is required';
    if (!subject.trim()) newErrors.subject = 'Subject/Topic is required';
    if (Number(studyHours) <= 0) newErrors.studyHours = 'Study hours must be greater than 0';
    if (Number(studyGoal) <= 0) newErrors.studyGoal = 'Study goal must be greater than 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const success = await onSubmit({
      date,
      course: course.trim().toUpperCase(),
      subject: subject.trim(),
      studyHours: Number(studyHours),
      studyGoal: Number(studyGoal),
      performance,
      notes: notes.trim(),
    });
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={recordToEdit ? 'Edit Study Record' : 'Add Study Record'}
      subtitle="Track study duration, topics, goals, and academic focus."
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            {recordToEdit ? 'Save Changes' : 'Add Record'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date & Course */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="std-date" className="block text-xs font-semibold text-text-primary mb-1">
              Date *
            </label>
            <input
              id="std-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            {errors.date && <p className="text-[11px] text-status-danger mt-1">{errors.date}</p>}
          </div>

          <div>
            <label htmlFor="std-course" className="block text-xs font-semibold text-text-primary mb-1">
              Course Code *
            </label>
            <input
              id="std-course"
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. CS-501, IS-620"
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            {errors.course && <p className="text-[11px] text-status-danger mt-1">{errors.course}</p>}
          </div>
        </div>

        {/* Subject / Topic */}
        <div>
          <label htmlFor="std-subject" className="block text-xs font-semibold text-text-primary mb-1">
            Subject / Topic Description *
          </label>
          <input
            id="std-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Database Indexing & Query Plans"
            className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
          {errors.subject && <p className="text-[11px] text-status-danger mt-1">{errors.subject}</p>}
        </div>

        {/* Study Hours, Goal, Performance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="std-hours" className="block text-xs font-semibold text-text-primary mb-1">
              Study Hours *
            </label>
            <input
              id="std-hours"
              type="number"
              min="0.1"
              step="0.5"
              value={studyHours}
              onChange={(e) => setStudyHours(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            {errors.studyHours && <p className="text-[11px] text-status-danger mt-1">{errors.studyHours}</p>}
          </div>

          <div>
            <label htmlFor="std-goal" className="block text-xs font-semibold text-text-primary mb-1">
              Target Goal (hrs) *
            </label>
            <input
              id="std-goal"
              type="number"
              min="0.1"
              step="0.5"
              value={studyGoal}
              onChange={(e) => setStudyGoal(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            {errors.studyGoal && <p className="text-[11px] text-status-danger mt-1">{errors.studyGoal}</p>}
          </div>

          <div>
            <label htmlFor="std-perf" className="block text-xs font-semibold text-text-primary mb-1">
              Self Performance
            </label>
            <select
              id="std-perf"
              value={performance}
              onChange={(e) => setPerformance(e.target.value as PerformanceGrade)}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              {PERFORMANCE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="std-notes" className="block text-xs font-semibold text-text-primary mb-1">
            Study Notes & Key Takeaways (Optional)
          </label>
          <textarea
            id="std-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="Key concepts reviewed, questions for next session..."
          />
        </div>
      </form>
    </Modal>
  );
};
