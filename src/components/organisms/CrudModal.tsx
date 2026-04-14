import type { ReactNode } from 'react';
import Spinner from '../atoms/Spinner';
import Modal from './Modal';

interface CrudModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Must be a <form> element with an id matching the submitFormId */
  children: ReactNode;
  /** The id of the <form> so the submit button can target it */
  submitFormId: string;
  isSubmitting?: boolean;
  submitLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Organism: Modal pre-wired with a sticky footer containing Submit + Cancel buttons.
 * The submit button targets a <form id={submitFormId}> rendered in children.
 *
 * Usage:
 *   <CrudModal submitFormId="customer-form" ...>
 *     <form id="customer-form" onSubmit={handleSubmit(onSubmit)}>…</form>
 *   </CrudModal>
 */
const CrudModal = ({
  isOpen,
  onClose,
  title,
  children,
  submitFormId,
  isSubmitting = false,
  submitLabel = 'Lưu',
  size = 'md',
}: CrudModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
    <div className="space-y-4">{children}</div>
    <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
      <button type="button" onClick={onClose} className="btn-secondary">
        Huỷ
      </button>
      <button type="submit" form={submitFormId} disabled={isSubmitting} className="btn-primary">
        {isSubmitting && <Spinner size="sm" className="mr-2" />}
        {submitLabel}
      </button>
    </div>
  </Modal>
);

export default CrudModal;
