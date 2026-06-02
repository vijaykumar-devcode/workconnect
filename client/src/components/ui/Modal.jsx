import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div
        className={`relative w-full ${maxWidth} bg-theme-surface rounded-2xl border border-theme-border shadow-2xl p-6.5 z-10 transform transition-all duration-300 animate-slide-up`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-theme-border mb-5">
          {title && (
            <h3 className="text-lg font-bold text-theme-text-primary tracking-tight">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-theme-bg text-theme-text-secondary hover:text-theme-text-primary transition-all duration-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[75vh] pr-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
