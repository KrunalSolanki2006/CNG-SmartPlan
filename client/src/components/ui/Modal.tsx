import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div
        ref={modalRef}
        className={`relative w-full ${maxWidthClasses[maxWidth]} rounded-card-lg bg-white shadow-modal border border-[#DCE4E8] flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#F1F5F9]">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-[#0F172A]">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="text-xs text-[#64748B] mt-0.5">
                {description}
              </p>
            )}
          </div>
          <IconButton ariaLabel="Close dialog" variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="p-4 bg-[#FAFCFD] border-t border-[#F1F5F9] rounded-b-card-lg flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
