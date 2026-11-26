import { useMemo, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/Feedback';
import { fmtDateTimeFR } from '@/api/businessLogic';
import type { AuditLog } from '@/types';

export function AuditPage() {
  useAuth();
  const logsQ = useFetch<AuditLog[]>(() => api.listAuditLogs(), []);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const actions = useMemo(() => {
    const set = new Set((logsQ.data ?? []).map((l) => l.action));
    return Array.from(set).sort();
  }, [logsQ.data]);

  const filtered = useMemo(() => {
    const list = (logsQ.data ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list.filter((l) => {
      if (actionFilter && l.action !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const full = `${l.userNom} ${l.action} ${l.cible}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [logsQ.data, search, actionFilter]);

  return (
    <div>
      <PageHeader
        title="Journal des activités"
        subtitle={`${filtered.length} entrée(s) — traçabilité complète des actions`}
        icon={<ScrollText className="w-5 h-5" />}
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-graphite-300" />
            <Input className="pl-9" placeholder="Rechercher (utilisateur, action, cible)…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">Toutes les actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="Aucune entrée" description="Les actions importantes sont enregistrées ici automatiquement." icon={<ScrollText className="w-7 h-7" />} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Cible</th><th>Détails</th></tr></thead>
              <tbody>
                {filtered.slice(0, 200).map((l) => (
                  <tr key={l.id}>
                    <td className="text-graphite-400 whitespace-nowrap">{fmtDateTimeFR(l.createdAt)}</td>
                    <td className="font-medium text-graphite-600">{l.userNom}</td>
                    <td><span className="badge bg-brand-50 text-brand-600">{l.action}</span></td>
                    <td className="font-mono text-xs text-graphite-500">{l.cible}</td>
                    <td className="text-xs text-graphite-400 max-w-md">
                      {l.nouvellesValeurs && <div><span className="text-graphite-300">Nouveau :</span> <code>{JSON.stringify(l.nouvellesValeurs).slice(0, 80)}</code></div>}
                      {l.valeursPrecedentes && <div className="mt-0.5"><span className="text-graphite-300">Avant :</span> <code>{JSON.stringify(l.valeursPrecedentes).slice(0, 80)}</code></div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 200 && <p className="text-center text-xs text-graphite-400 py-3">200 premières entrées affichées sur {filtered.length}.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
