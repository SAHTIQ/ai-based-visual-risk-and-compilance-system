import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { HabitRecord, HabitCategory, HabitStatus } from '../../types';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<HabitRecord, 'id' | 'createdAt' | 'streakCount'>) => Promise<boolean>;
  habitToEdit?: HabitRecord | null;
}

const CATEGORIES: HabitCategory[] = [
  'Health',
  'Study',
  'Mindfulness',
  'Productivity',
  'Fitness',
  'Routine',
];

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  habitToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<HabitCategory>('Fitness');
  const [status, setStatus] = useState<HabitStatus>('Pending');
  const [duration, setDuration] = useState('30 mins');
  const [frequency, setFrequency] = useState('Daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (habitToEdit) {
      setTitle(habitToEdit.title);
      setCategory(habitToEdit.category);
      setStatus(habitToEdit.status);
      setDuration(habitToEdit.duration);
      setFrequency(habitToEdit.frequency);
      setDate(habitToEdit.date);
    } else {
      setTitle('');
      setCategory('Fitness');
      setStatus('Pending');
      setDuration('30 mins');
      setFrequency('Daily');
      setDate(new Date().toISOString().split('T')[0]);
    }
    setErrors({});
  }, [habitToEdit, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Habit title is required';
    if (!duration.trim()) newErrors.duration = 'Duration is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const success = await onSubmit({
      title: title.trim(),
      category,
      status,
      duration: duration.trim(),
      frequency,
      date,
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
      title={habitToEdit ? 'Edit Habit' : 'Add Habit'}
      subtitle="Define daily or routine habits to build consistent personal disciplines."
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
            {habitToEdit ? 'Save Changes' : 'Add Habit'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Habit Title */}
        <div>
          <label htmlFor="hab-title" className="block text-xs font-semibold text-text-primary mb-1">
            Habit Name *
          </label>
          <input
            id="hab-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Daily Exercise, Technical Reading"
            className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
          {errors.title && <p className="text-[11px] text-status-danger mt-1">{errors.title}</p>}
        </div>

        {/* Category & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="hab-cat" className="block text-xs font-semibold text-text-primary mb-1">
              Category
            </label>
            <select
              id="hab-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as HabitCategory)}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="hab-status" className="block text-xs font-semibold text-text-primary mb-1">
              Today's Status
            </label>
            <select
              id="hab-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as HabitStatus)}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Duration & Frequency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="hab-dur" className="block text-xs font-semibold text-text-primary mb-1">
              Target Duration *
            </label>
            <input
              id="hab-dur"
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 30 mins, 45 mins, 8 hours"
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            {errors.duration && <p className="text-[11px] text-status-danger mt-1">{errors.duration}</p>}
          </div>

          <div>
            <label htmlFor="hab-freq" className="block text-xs font-semibold text-text-primary mb-1">
              Frequency
            </label>
            <select
              id="hab-freq"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="Daily">Daily</option>
              <option value="Weekdays">Weekdays</option>
              <option value="Weekends">Weekends</option>
              <option value="3x/week">3x/week</option>
              <option value="Weekly">Weekly</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
};
