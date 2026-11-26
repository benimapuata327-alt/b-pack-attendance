import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-graphite-100 flex items-center justify-center text-graphite-400 mb-4">
        {icon ?? <Inbox className="w-7 h-7" />}
      </div>
      <h4 className="font-display font-semibold text-graphite-600">{title}</h4>
      {description && <p className="text-sm text-graphite-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return <span className={`badge ${className ?? ''}`}>{children}</span>;
}

export function StatusBadge({ statut }: { statut: 'PRESENT' | 'ABSENT' | 'RETARD' }) {
  if (statut === 'PRESENT') return <span className="badge-present">Présent</span>;
  if (statut === 'ABSENT') return <span className="badge-absent">Absent</span>;
  return <span className="badge-late">Retard</span>;
}

export function AgentStatusBadge({ statut }: { statut: 'ACTIF' | 'INACTIF' }) {
  return statut === 'ACTIF'
    ? <span className="badge-active">Actif</span>
    : <span className="badge-inactive">Inactif</span>;
}
