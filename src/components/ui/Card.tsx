import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Card({ children, className, hover, title, subtitle, actions }: CardProps) {
  return (
    <div className={`card ${hover ? 'card-hover' : ''} ${className ?? ''}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-graphite-100">
          <div>
            {title && <h3 className="section-title">{title}</h3>}
            {subtitle && <p className="text-sm text-graphite-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: 'brand' | 'green' | 'amber' | 'red' | 'graphite' | 'blue';
  hint?: string;
}

const toneMap = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  graphite: 'bg-graphite-100 text-graphite-600',
  blue: 'bg-blue-50 text-blue-600',
};

export function StatCard({ label, value, icon, tone = 'brand', hint }: StatCardProps) {
  return (
    <div className="card card-hover p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-graphite-400">{label}</p>
          <p className="text-3xl font-display font-bold text-graphite-600 mt-2">{value}</p>
          {hint && <p className="text-xs text-graphite-300 mt-1">{hint}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
