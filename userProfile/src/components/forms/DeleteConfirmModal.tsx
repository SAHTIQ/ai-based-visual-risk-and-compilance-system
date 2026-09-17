import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
  title: string;
  itemDescription: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemDescription,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    const success = await onConfirm();
    setIsDeleting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            isLoading={isDeleting}
          >
            Delete Record
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-red-100 text-status-danger flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-text-primary font-medium">
            Are you sure you want to delete this record?
          </p>
          <p className="text-xs text-text-secondary mt-1 bg-background p-2.5 rounded-button border border-border">
            {itemDescription}
          </p>
          <p className="text-[11px] text-text-secondary mt-2">
            This action will remove the record from your current profile session.
          </p>
        </div>
      </div>
    </Modal>
  );
};
