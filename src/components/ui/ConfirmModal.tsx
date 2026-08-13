import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  showCancelButton?: boolean;
  zIndexClassName?: string;
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  isLoading = false,
  variant = 'danger',
  showCancelButton = true,
  zIndexClassName = 'z-50',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variants = {
    danger: {
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      bg: 'bg-red-50',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    },
    warning: {
      icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
      bg: 'bg-amber-50',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
    },
    info: {
      icon: <AlertTriangle className="h-6 w-6 text-blue-600" />,
      bg: 'bg-blue-50',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    },
    success: {
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />,
      bg: 'bg-emerald-50',
      button: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
    }
  };

  const activeVariant = variants[variant];

  return (
    <div className={cn('fixed inset-0 flex items-center justify-center p-4', zIndexClassName)}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={cn("mb-4 flex h-14 w-14 items-center justify-center rounded-full", activeVariant.bg)}>
            {activeVariant.icon}
          </div>

          <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>
          {typeof message === 'string' ? (
            <p className="mb-8 text-sm text-slate-500 leading-relaxed">{message}</p>
          ) : (
            <div className="mb-8 w-full text-sm text-slate-500 leading-relaxed">{message}</div>
          )}

          <div className="flex w-full gap-3">
            {showCancelButton ? (
              <button
                disabled={isLoading}
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            ) : null}
            <button
              disabled={isLoading}
              onClick={onConfirm}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50",
                activeVariant.button
              )}
            >
              {isLoading ? 'กำลังดำเนินการ...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
