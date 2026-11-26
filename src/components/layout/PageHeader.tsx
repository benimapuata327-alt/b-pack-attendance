import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

export function PageHeader({ title, subtitle, actions, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 animate-fade-in">
      <div className="flex items-center gap-3">
        {icon && <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">{icon}</div>}
        <div>
          <h1 className="text-2xl font-display font-bold text-graphite-600">{title}</h1>
          {subtitle && <p className="text-sm text-graphite-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
