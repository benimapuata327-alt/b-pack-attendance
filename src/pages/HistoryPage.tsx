import { useMemo, useState } from 'react';
import { History, Search, Printer, FileSpreadsheet, Filter } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/Field';
import { EmptyState, StatusBadge } from '@/components/ui/Feedback';
import { fmtDateFR, minutesToHuman } from '@/api/businessLogic';
import type { Attendance, Team, Position, Rotation } from '@/types';

export function HistoryPage() {
  const { user } = useAuth();
  const attendanceQ = useFetch<Attendance[]>(() => api.listAttendance(), []);
  const teamsQ = useFetch<Team[]>(() => api.listTeams(), []);
  const positionsQ = useFetch<Position[]>(() => api.listPositions(), []);
  const rotationsQ = useFetch<Rotation[]>(() => api.listRotations(), []);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [teamId, setTeamId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [rotationId, setRotationId] = useState('');
  const [status, setStatus] = useState('');

  // SURVEILLANT restricted to their team
  const allowedTeamId = user?.role === 'SURVEILLANT' && user.teamId ? user.teamId : null;
  const effectiveTeamId = allowedTeamId ?? teamId;

  const filtered = useMemo(() => {
    const list = (attendanceQ.data ?? []).slice().sort((a, b) => b.serviceDate.localeCompare(a.serviceDate) || b.createdAt.localeCompare(a.createdAt));
    return list.filter((r) => {
      if (from && r.serviceDate < from) return false;
      if (to && r.serviceDate > to) return false;
      if (effectiveTeamId && r.teamId !== effectiveTeamId) return false;
      if (rotationId && r.rotationId !== rotationId) return false;
      if (status && r.statut !== status) return false;
      if (positionId) {
        // position is on agent; filter via denormalized positionNom
        const pos = positionsQ.data?.find((p) => p.id === positionId);
        if (pos && r.positionNom !== pos.nom) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const full = `${r.agentNom} ${r.agentMatricule}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [attendanceQ.data, from, to, effectiveTeamId, rotationId, status, positionId, search, positionsQ.data]);

  const exportCSV = () => {
    const headers = ['Matricule', 'Agent', 'Équipe', 'Poste', 'Date', 'Rotation', 'Heure', 'Statut', 'Retard (min)', 'Modifié par'];
    const rows = filtered.map((r) => [r.agentMatricule, r.agentNom, r.teamCode, r.positionNom ?? '', r.serviceDate, r.shift, r.heureArrivee ?? '', r.statut, r.retardMinutes, r.modifiePar ?? '']);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `historique_pointage_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const print = () => window.print();

  return (
    <div>
      <PageHeader
        title="Historique des pointages"
        subtitle={`${filtered.length} enregistrement(s)`}
        icon={<History className="w-5 h-5" />}
        actions={<>
          <Button variant="ghost" size="sm" icon={<FileSpreadsheet className="w-4 h-4" />} onClick={exportCSV}>Excel/CSV</Button>
          <Button variant="ghost" size="sm" icon={<Printer className="w-4 h-4" />} onClick={print}>Imprimer</Button>
        </>}
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-graphite-300" />
            <Input className="pl-9" placeholder="Nom ou matricule…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Du" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Au" />
          {!allowedTeamId && <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}><option value="">Toutes équipes</option>{(teamsQ.data ?? []).map((t) => <option key={t.id} value={t.id}>TEAM {t.code}</option>)}</Select>}
          <Select value={positionId} onChange={(e) => setPositionId(e.target.value)}><option value="">Tous postes</option>{(positionsQ.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</Select>
          <Select value={rotationId} onChange={(e) => setRotationId(e.target.value)}><option value="">Toutes rotations</option>{(rotationsQ.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}</Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous statuts</option><option value="PRESENT">Présent</option><option value="RETARD">Retard</option><option value="ABSENT">Absent</option></Select>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="Aucun pointage trouvé" description="Ajustez vos filtres pour afficher des résultats." icon={<Filter className="w-7 h-7" />} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Matricule</th><th>Agent</th><th>Équipe</th><th>Poste</th><th>Date</th><th>Rotation</th><th>Heure</th><th>Statut</th><th>Retard</th><th>Modifié</th></tr></thead>
              <tbody>
                {filtered.slice(0, 200).map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono font-semibold text-brand-600">{r.agentMatricule}</td>
                    <td className="font-medium text-graphite-600">{r.agentNom}</td>
                    <td>{r.teamCode}</td>
                    <td className="text-graphite-400">{r.positionNom ?? '—'}</td>
                    <td>{fmtDateFR(r.serviceDate)}</td>
                    <td>{r.shift}</td>
                    <td>{r.heureArrivee ?? '—'}</td>
                    <td><StatusBadge statut={r.statut} /></td>
                    <td className="text-amber-600">{r.retardMinutes > 0 ? minutesToHuman(r.retardMinutes) : '—'}</td>
                    <td className="text-xs text-graphite-400">{r.modifiePar ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 200 && <p className="text-center text-xs text-graphite-400 py-3">200 premiers affichés sur {filtered.length}. Affinez vos filtres ou exportez pour tout voir.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
