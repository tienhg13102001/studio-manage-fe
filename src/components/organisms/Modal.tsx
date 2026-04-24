import type { ReactNode } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = { sm: 'max-w-md', md: 'max-w-4xl', lg: 'max-w-5xl' };

const Modal = ({ isOpen, onClose, title, children, size = 'md' }: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative rounded-xl shadow-xl w-full ${sizeClass[size]} mx-4 my-4 md:my-8 flex flex-col max-h-[calc(100dvh-2rem)] md:max-h-[90dvh]`}
        style={{
          background: 'var(--modal-bg)',
          border: '1px solid var(--modal-border)',
          boxShadow: 'var(--modal-shadow)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--modal-border)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            &times;
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
