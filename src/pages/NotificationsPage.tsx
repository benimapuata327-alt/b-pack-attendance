import { useState } from 'react';
import { Bell, CheckCheck, Trash2, Check } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useNotifications } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { fmtDateTimeFR } from '@/api/businessLogic';
import type { NotificationCategory } from '@/types';

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  ATTENDANCE: 'Pointage', AGENT: 'Agent', TEAM: 'Équipe',
  ASSIGNMENT: 'Affectation', ALERT: 'Alerte', SYSTEM: 'Système',
};
const CATEGORY_COLOR: Record<NotificationCategory, string> = {
  ATTENDANCE: 'bg-brand-50 text-brand-600',
  AGENT: 'bg-blue-50 text-blue-600',
  TEAM: 'bg-green-50 text-green-600',
  ASSIGNMENT: 'bg-purple-50 text-purple-600',
  ALERT: 'bg-red-50 text-red-600',
  SYSTEM: 'bg-graphite-100 text-graphite-500',
};

export function NotificationsPage() {
  const { user } = useAuth();
  const { items, unread, refresh } = useNotifications(user?.id);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const list = items.filter((n) => (filter === 'unread' ? !n.lue : true));

  const onMarkRead = async (id: string) => { await api.markRead(id); refresh(); };
  const onMarkAll = async () => { if (user) { await api.markAllRead(user.id); refresh(); } };
  const onDelete = async (id: string) => { await api.deleteNotification(id); refresh(); };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} non lue(s)` : 'Toutes les notifications sont lues'}
        icon={<Bell className="w-5 h-5" />}
        actions={unread > 0 && <Button variant="ghost" size="sm" icon={<CheckCheck className="w-4 h-4" />} onClick={onMarkAll}>Tout marquer comme lu</Button>}
      />

      <Card className="mb-4">
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'all' ? 'bg-brand-500 text-white' : 'bg-graphite-50 text-graphite-500 hover:bg-graphite-100'}`}>Toutes ({items.length})</button>
          <button onClick={() => setFilter('unread')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'unread' ? 'bg-brand-500 text-white' : 'bg-graphite-50 text-graphite-500 hover:bg-graphite-100'}`}>Non lues ({unread})</button>
        </div>
      </Card>

      <Card>
        {list.length === 0 ? (
          <EmptyState title="Aucune notification" description="Les notifications importantes apparaîtront ici." icon={<Bell className="w-7 h-7" />} />
        ) : (
          <div className="divide-y divide-graphite-50">
            {list.map((n) => (
              <div key={n.id} className={`flex items-start gap-3 p-4 transition ${!n.lue ? 'bg-brand-50/30' : ''}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${CATEGORY_COLOR[n.category]}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${CATEGORY_COLOR[n.category]}`}>{CATEGORY_LABEL[n.category]}</span>
                    {!n.lue && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                  </div>
                  <p className="font-medium text-graphite-600 mt-1">{n.titre}</p>
                  <p className="text-sm text-graphite-400 mt-0.5">{n.message}</p>
                  <p className="text-xs text-graphite-300 mt-1">{fmtDateTimeFR(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.lue && <button onClick={() => onMarkRead(n.id)} className="p-1.5 rounded-lg text-graphite-400 hover:bg-green-50 hover:text-green-600 transition" title="Marquer comme lu"><Check className="w-4 h-4" /></button>}
                  <button onClick={() => onDelete(n.id)} className="p-1.5 rounded-lg text-graphite-400 hover:bg-red-50 hover:text-red-600 transition" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
