import { useMemo, useState } from 'react';
import { FileBarChart, Printer, FileSpreadsheet, Calendar, Users, UsersRound, Clock } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/Field';
import { EmptyState, StatusBadge } from '@/components/ui/Feedback';
import { BarChart, DonutChart } from '@/components/ui/Charts';
import { fmtDateFR, minutesToHuman } from '@/api/businessLogic';
import type { Attendance, Team, Rotation } from '@/types';

type ReportType = 'daily' | 'weekly' | 'monthly' | 'agent' | 'team' | 'shift';

export function ReportsPage() {
  const { user } = useAuth();
  const attendanceQ = useFetch<Attendance[]>(() => api.listAttendance(), []);
  const teamsQ = useFetch<Team[]>(() => api.listTeams(), []);
  const rotationsQ = useFetch<Rotation[]>(() => api.listRotations(), []);

  const [type, setType] = useState<ReportType>('daily');
  const [refDate, setRefDate] = useState(new Date().toISOString().slice(0, 10));
  const [teamId, setTeamId] = useState('');
  const allowedTeamId = user?.role === 'SURVEILLANT' && user.teamId ? user.teamId : null;
  const effTeamId = allowedTeamId ?? teamId;

  const records = attendanceQ.data ?? [];

  const filtered = useMemo(() => {
    const ref = new Date(refDate);
    return records.filter((r) => {
      if (effTeamId && r.teamId !== effTeamId) return false;
      if (type === 'daily') return r.serviceDate === refDate;
      if (type === 'weekly') {
        const d = new Date(r.serviceDate);
        const start = new Date(ref); start.setDate(ref.getDate() - ref.getDay() + 1);
        const end = new Date(start); end.setDate(start.getDate() + 6);
        return d >= start && d <= end;
      }
      if (type === 'monthly') return r.serviceDate.startsWith(refDate.slice(0, 7));
      return true;
    });
  }, [records, type, refDate, effTeamId]);

  const summary = useMemo(() => {
    const present = filtered.filter((r) => r.statut === 'PRESENT').length;
    const absent = filtered.filter((r) => r.statut === 'ABSENT').length;
    const late = filtered.filter((r) => r.statut === 'RETARD').length;
    const totalRetard = filtered.reduce((s, r) => s + r.retardMinutes, 0);
    return { present, absent, late, total: filtered.length, totalRetard };
  }, [filtered]);

  const byTeam = useMemo(() => {
    return (teamsQ.data ?? []).map((t) => ({
      label: t.code, color: '#F28C28',
      value: filtered.filter((r) => r.teamId === t.id).length,
    }));
  }, [filtered, teamsQ.data]);

  const byShift = useMemo(() => {
    const shifts: { label: string; value: number; color: string }[] = [];
    for (const s of ['MATIN', 'SOIR', 'NUIT'] as const) {
      shifts.push({ label: s, value: filtered.filter((r) => r.shift === s).length, color: s === 'MATIN' ? '#f59e0b' : s === 'SOIR' ? '#F28C28' : '#343A40' });
    }
    return shifts;
  }, [filtered]);

  const print = () => window.print();

  const exportCSV = () => {
    const headers = ['Matricule', 'Agent', 'Équipe', 'Date', 'Rotation', 'Heure', 'Statut', 'Retard (min)'];
    const rows = filtered.map((r) => [r.agentMatricule, r.agentNom, r.teamCode, r.serviceDate, r.shift, r.heureArrivee ?? '', r.statut, r.retardMinutes]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rapport_${type}_${refDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Rapports"
        subtitle="Analyse statistique et export des pointages"
        icon={<FileBarChart className="w-5 h-5" />}
        actions={<>
          <Button variant="ghost" size="sm" icon={<FileSpreadsheet className="w-4 h-4" />} onClick={exportCSV}>Excel/CSV</Button>
          <Button variant="ghost" size="sm" icon={<Printer className="w-4 h-4" />} onClick={print}>Imprimer / PDF</Button>
        </>}
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
            <option value="daily">Journalier</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="monthly">Mensuel</option>
            <option value="agent">Par agent</option>
            <option value="team">Par équipe</option>
            <option value="shift">Par rotation</option>
          </Select>
          <Input type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} />
          {!allowedTeamId && <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}><option value="">Toutes équipes</option>{(teamsQ.data ?? []).map((t) => <option key={t.id} value={t.id}>TEAM {t.code}</option>)}</Select>}
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><div className="text-center"><p className="text-3xl font-display font-bold text-green-600">{summary.present}</p><p className="text-xs text-graphite-400 mt-1">Présents</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-display font-bold text-amber-600">{summary.late}</p><p className="text-xs text-graphite-400 mt-1">Retards</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-display font-bold text-red-600">{summary.absent}</p><p className="text-xs text-graphite-400 mt-1">Absents</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-display font-bold text-graphite-600">{summary.totalRetard > 0 ? minutesToHuman(summary.totalRetard) : '0'}</p><p className="text-xs text-graphite-400 mt-1">Retard cumulé</p></div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Par équipe"><BarChart data={byTeam} /></Card>
        <Card title="Par rotation"><BarChart data={byShift} /></Card>
      </div>

      <Card title="Détail des pointages" subtitle={`${filtered.length} enregistrement(s)`}>
        {filtered.length === 0 ? (
          <EmptyState title="Aucune donnée" description="Aucun pointage sur la période sélectionnée." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Matricule</th><th>Agent</th><th>Équipe</th><th>Date</th><th>Rotation</th><th>Statut</th><th>Retard</th></tr></thead>
              <tbody>
                {filtered.slice(0, 100).map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono font-semibold text-brand-600">{r.agentMatricule}</td>
                    <td className="font-medium text-graphite-600">{r.agentNom}</td>
                    <td>{r.teamCode}</td>
                    <td>{fmtDateFR(r.serviceDate)}</td>
                    <td>{r.shift}</td>
                    <td><StatusBadge statut={r.statut} /></td>
                    <td className="text-amber-600">{r.retardMinutes > 0 ? minutesToHuman(r.retardMinutes) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
