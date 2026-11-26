import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let pushFn: ((type: ToastType, message: string) => void) | null = null;

export function toast(type: ToastType, message: string): void {
  pushFn?.(type, message);
}

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    pushFn = (type, message) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    };
    return () => { pushFn = null; };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div key={t.id} className="bg-white rounded-xl shadow-lg border border-graphite-100 p-4 flex items-start gap-3 animate-slide-in-right">
          {icons[t.type]}
          <p className="text-sm text-graphite-600 flex-1">{t.message}</p>
          <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-graphite-300 hover:text-graphite-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
