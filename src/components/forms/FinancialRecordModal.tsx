import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { FinancialRecord, FinancialCategory } from '../../types';

interface FinancialRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<FinancialRecord, 'id' | 'createdAt'>) => Promise<boolean>;
  recordToEdit?: FinancialRecord | null;
}

const CATEGORIES: FinancialCategory[] = [
  'Salary',
  'Freelance',
  'Investments',
  'Education',
  'Housing',
  'Living Expenses',
  'Healthcare',
  'Utilities',
  'Entertainment',
  'Other',
];

export const FinancialRecordModal: React.FC<FinancialRecordModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  recordToEdit,
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<FinancialCategory>('Salary');
  const [income, setIncome] = useState<number | string>(0);
  const [expenses, setExpenses] = useState<number | string>(0);
  const [savings, setSavings] = useState<number | string>(0);
  const [budget, setBudget] = useState<number | string>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (recordToEdit) {
      setDate(recordToEdit.date);
      setCategory(recordToEdit.category);
      setIncome(recordToEdit.income);
      setExpenses(recordToEdit.expenses);
      setSavings(recordToEdit.savings);
      setBudget(recordToEdit.budget);
      setNotes(recordToEdit.notes || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Salary');
      setIncome(0);
      setExpenses(0);
      setSavings(0);
      setBudget(0);
      setNotes('');
    }
    setErrors({});
  }, [recordToEdit, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!date) newErrors.date = 'Date is required';
    if (!category) newErrors.category = 'Category is required';
    if (Number(income) < 0) newErrors.income = 'Income cannot be negative';
    if (Number(expenses) < 0) newErrors.expenses = 'Expenses cannot be negative';
    if (Number(budget) < 0) newErrors.budget = 'Budget cannot be negative';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const success = await onSubmit({
      date,
      category,
      income: Number(income) || 0,
      expenses: Number(expenses) || 0,
      savings: Number(savings) || 0,
      budget: Number(budget) || 0,
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
      title={recordToEdit ? 'Edit Financial Record' : 'Add Financial Record'}
      subtitle="Record income, expense, and budget allocations for tracking."
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
        {/* Date & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fin-date" className="block text-xs font-semibold text-text-primary mb-1">
              Date *
            </label>
            <input
              id="fin-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            {errors.date && <p className="text-[11px] text-status-danger mt-1">{errors.date}</p>}
          </div>

          <div>
            <label htmlFor="fin-category" className="block text-xs font-semibold text-text-primary mb-1">
              Category *
            </label>
            <select
              id="fin-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FinancialCategory)}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Income & Expenses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fin-income" className="block text-xs font-semibold text-text-primary mb-1">
              Income ($)
            </label>
            <input
              id="fin-income"
              type="number"
              min="0"
              step="any"
              value={income}
              onChange={(e) => {
                const val = e.target.value;
                setIncome(val);
                // Auto compute savings helper if desired
                if (Number(val) > 0 && Number(expenses) >= 0) {
                  setSavings(Math.max(0, Number(val) - Number(expenses)));
                }
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="0.00"
            />
            {errors.income && <p className="text-[11px] text-status-danger mt-1">{errors.income}</p>}
          </div>

          <div>
            <label htmlFor="fin-expenses" className="block text-xs font-semibold text-text-primary mb-1">
              Expenses ($)
            </label>
            <input
              id="fin-expenses"
              type="number"
              min="0"
              step="any"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="0.00"
            />
            {errors.expenses && <p className="text-[11px] text-status-danger mt-1">{errors.expenses}</p>}
          </div>
        </div>

        {/* Savings & Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fin-savings" className="block text-xs font-semibold text-text-primary mb-1">
              Savings ($)
            </label>
            <input
              id="fin-savings"
              type="number"
              min="0"
              step="any"
              value={savings}
              onChange={(e) => setSavings(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="fin-budget" className="block text-xs font-semibold text-text-primary mb-1">
              Target Budget ($)
            </label>
            <input
              id="fin-budget"
              type="number"
              min="0"
              step="any"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="0.00"
            />
            {errors.budget && <p className="text-[11px] text-status-danger mt-1">{errors.budget}</p>}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="fin-notes" className="block text-xs font-semibold text-text-primary mb-1">
            Notes / Description (Optional)
          </label>
          <textarea
            id="fin-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-border rounded-button text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="Add relevant context or description..."
          />
        </div>
      </form>
    </Modal>
  );
};
