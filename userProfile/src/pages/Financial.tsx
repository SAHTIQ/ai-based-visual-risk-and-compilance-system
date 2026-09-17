import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { PageHeader } from '../components/layout/PageHeader';
import { FinancialRecordModal } from '../components/forms/FinancialRecordModal';
import { DeleteConfirmModal } from '../components/forms/DeleteConfirmModal';
import { useApp } from '../context/AppContext';
import type { FinancialRecord } from '../types';

export const Financial: React.FC = () => {
  const {
    financialRecords,
    isLoadingFinancial,
    addFinancialRecord,
    updateFinancialRecord,
    deleteFinancialRecord,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<FinancialRecord | null>(null);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return financialRecords.filter((record) => {
      const matchesSearch =
        record.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.notes && record.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        record.date.includes(searchQuery);

      const matchesCategory =
        selectedCategory === 'ALL' || record.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [financialRecords, searchQuery, selectedCategory]);

  // Aggregate totals
  const totalIncome = financialRecords.reduce((acc, r) => acc + r.income, 0);
  const totalExpenses = financialRecords.reduce((acc, r) => acc + r.expenses, 0);
  const totalSavings = financialRecords.reduce((acc, r) => acc + r.savings, 0);
  const totalBudget = financialRecords.reduce((acc, r) => acc + r.budget, 0);

  const handleCreateOrUpdate = async (data: Omit<FinancialRecord, 'id' | 'createdAt'>) => {
    if (editingRecord) {
      return await updateFinancialRecord(editingRecord.id, data);
    } else {
      return await addFinancialRecord(data);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return false;
    return await deleteFinancialRecord(deletingRecord.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial"
        description="Current balances, spending history, and recorded cash flow."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingRecord(null);
              setIsAddModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Financial Record
          </Button>
        }
      />

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-card bg-surface border border-border shadow-card">
          <div className="w-9 h-9 rounded-lg bg-primary-light text-primary flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-text-secondary">Total Income</p>
          <p className="text-xl font-semibold text-text-primary mt-1 tabular-nums">${totalIncome.toLocaleString()}</p>
        </div>

        <div className="p-5 rounded-card bg-surface border border-border shadow-card">
          <div className="w-9 h-9 rounded-lg bg-red-50 text-status-danger flex items-center justify-center mb-3">
            <TrendingDown className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-text-secondary">Total Expenses</p>
          <p className="text-xl font-semibold text-text-primary mt-1 tabular-nums">${totalExpenses.toLocaleString()}</p>
        </div>

        <div className="p-5 rounded-card bg-surface border border-border shadow-card">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-status-success flex items-center justify-center mb-3">
            <PiggyBank className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-text-secondary">Net Savings</p>
          <p className="text-xl font-semibold text-text-primary mt-1 tabular-nums">${totalSavings.toLocaleString()}</p>
        </div>

        <div className="p-5 rounded-card bg-surface border border-border shadow-card">
          <div className="w-9 h-9 rounded-lg bg-muted text-text-secondary flex items-center justify-center mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-text-secondary">Budget Target</p>
          <p className="text-xl font-semibold text-text-primary mt-1 tabular-nums">${totalBudget.toLocaleString()}</p>
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        {/* Controls: Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search category or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-text-secondary" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field w-auto"
            >
              <option value="ALL">All Categories</option>
              <option value="Salary">Salary</option>
              <option value="Freelance">Freelance</option>
              <option value="Investments">Investments</option>
              <option value="Education">Education</option>
              <option value="Housing">Housing</option>
              <option value="Living Expenses">Living Expenses</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Utilities">Utilities</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Financial Table */}
        <div className="overflow-x-auto -mx-5 -mb-5">
          {isLoadingFinancial ? (
            <div className="py-16 text-center text-xs text-text-secondary">
              Loading financial records...
            </div>
          ) : filteredRecords.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="table-head">
                  <th className="py-3 px-5 font-semibold">Date</th>
                  <th className="py-3 px-5 font-semibold">Category</th>
                  <th className="py-3 px-5 font-semibold">Income</th>
                  <th className="py-3 px-5 font-semibold">Expenses</th>
                  <th className="py-3 px-5 font-semibold">Savings</th>
                  <th className="py-3 px-5 font-semibold">Budget</th>
                  <th className="py-3 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-background/60 transition-colors"
                  >
                    <td className="py-3 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-text-primary">
                        <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                        {record.date}
                      </div>
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap">
                      <Badge variant="neutral" size="sm">
                        {record.category}
                      </Badge>
                      {record.notes && (
                        <p className="text-[11px] text-text-secondary mt-0.5 max-w-xs truncate">
                          {record.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap font-semibold text-primary">
                      {record.income > 0 ? `$${record.income.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap font-semibold text-status-danger">
                      {record.expenses > 0 ? `$${record.expenses.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap font-semibold text-status-success">
                      {record.savings > 0 ? `$${record.savings.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap text-text-primary">
                      ${record.budget.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingRecord(record);
                            setIsAddModalOpen(true);
                          }}
                          aria-label={`Edit ${record.category} record`}
                          className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-light rounded-button transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingRecord(record)}
                          aria-label={`Delete ${record.category} record`}
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
              title="No financial records found"
              description={
                searchQuery || selectedCategory !== 'ALL'
                  ? 'No records match your filter parameters.'
                  : 'Start tracking your financial inflow and outflows by adding your first record.'
              }
              actionLabel="+ Add Financial Record"
              onAction={() => {
                setEditingRecord(null);
                setIsAddModalOpen(true);
              }}
            />
          )}
        </div>
      </Card>

      {/* Add / Edit Modal */}
      <FinancialRecordModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={handleCreateOrUpdate}
        recordToEdit={editingRecord}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Financial Record"
        itemDescription={
          deletingRecord
            ? `${deletingRecord.category} record from ${deletingRecord.date} (Income: $${deletingRecord.income} | Expenses: $${deletingRecord.expenses})`
            : ''
        }
      />
    </div>
  );
};
