
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={`w-5 h-5 animate-spin text-brand-500 ${className ?? ''}`} />;
}

export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-graphite-400">
      <Spinner className="w-7 h-7 mb-3" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card p-6 text-center">
      <p className="text-red-600 font-medium">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-ghost btn-sm mt-3">Réessayer</button>}
    </div>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-graphite-900/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-graphite-600 text-lg">
          {title}
        </h3>

        <div className="text-sm text-graphite-500 mt-2">
          {message}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-ghost btn-sm" onClick={onClose}>
            Annuler
          </button>

          <button
            className={`${danger ? 'btn-danger' : 'btn-primary'} btn-sm`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
