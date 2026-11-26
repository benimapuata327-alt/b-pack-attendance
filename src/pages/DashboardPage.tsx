import { useMemo } from 'react';
import { Users, UserCheck, UserX, Clock, UsersRound, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, StatCard } from '@/components/ui/Card';
import { BarChart, DonutChart, LineChart } from '@/components/ui/Charts';
import { PageLoader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/Feedback';
import { fmtDateFR, fmtDateTimeFR, minutesToHuman, todayISO } from '@/api/businessLogic';
import type { Agent, Attendance, Team } from '@/types';

export function DashboardPage() {
  const { user } = useAuth();
  const agentsQ = useFetch<Agent[]>(() => api.listAgents(), []);
  const attendanceQ = useFetch<Attendance[]>(() => api.listAttendance(), []);
  const teamsQ = useFetch<Team[]>(() => api.listTeams(), []);

  const loading = agentsQ.loading || attendanceQ.loading || teamsQ.loading;

  const stats = useMemo(() => {
    const agents = agentsQ.data ?? [];
    const records = attendanceQ.data ?? [];
    const teams = teamsQ.data ?? [];
    const active = agents.filter((a) => a.statut === 'ACTIF');
    const today = todayISO();
    const todayRecords = records.filter((r) => r.serviceDate === today);
    const present = todayRecords.filter((r) => r.statut === 'PRESENT').length;
    const absent = todayRecords.filter((r) => r.statut === 'ABSENT').length;
    const late = todayRecords.filter((r) => r.statut === 'RETARD').length;

    // last 7 days trend
    const days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayRecords = records.filter((r) => r.serviceDate === iso);
      const presentCount = dayRecords.filter((r) => r.statut === 'PRESENT').length;
      days.push({ label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3), value: presentCount });
    }

    // monthly (current month)
    const month = new Date().toISOString().slice(0, 7);
    const monthRecords = records.filter((r) => r.serviceDate.startsWith(month));
    const monthPresent = monthRecords.filter((r) => r.statut === 'PRESENT').length;
    const monthAbsent = monthRecords.filter((r) => r.statut === 'ABSENT').length;
    const monthLate = monthRecords.filter((r) => r.statut === 'RETARD').length;

    // per-team bar chart (present today)
    const perTeam = teams.map((t) => ({
      label: t.code,
      value: todayRecords.filter((r) => r.teamId === t.id && r.statut === 'PRESENT').length,
      color: '#F28C28',
    }));

    // recent activities = latest 6 attendance records
    const recent = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

    // alerts: absences + late today
    const alerts = todayRecords.filter((r) => r.statut !== 'PRESENT').slice(0, 5);

    return {
      total: agents.length, active: active.length,
      present, absent, late, teams: teams.length,
      days, monthPresent, monthAbsent, monthLate,
      perTeam, recent, alerts, todayRecords,
    };
  }, [agentsQ.data, attendanceQ.data, teamsQ.data]);

  if (loading) return <PageLoader label="Chargement du tableau de bord…" />;

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle={`Bienvenue, ${user?.prenom}. Voici la situation au ${fmtDateFR(todayISO())}.`}
        icon={<Activity className="w-5 h-5" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard label="Agents total" value={stats.total} icon={<Users className="w-6 h-6" />} tone="graphite" />
        <StatCard label="Agents actifs" value={stats.active} icon={<UserCheck className="w-6 h-6" />} tone="green" />
        <StatCard label="Présents aujourd'hui" value={stats.present} icon={<UserCheck className="w-6 h-6" />} tone="brand" />
        <StatCard label="Absents aujourd'hui" value={stats.absent} icon={<UserX className="w-6 h-6" />} tone="red" />
        <StatCard label="En retard aujourd'hui" value={stats.late} icon={<Clock className="w-6 h-6" />} tone="amber" />
        <StatCard label="Équipes" value={stats.teams} icon={<UsersRound className="w-6 h-6" />} tone="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="Présences — 7 derniers jours" subtitle="Évolution quotidienne" className="lg:col-span-2">
          <LineChart data={stats.days} />
        </Card>
        <Card title="Répartition du jour" subtitle="Pointages d'aujourd'hui">
          {stats.todayRecords.length === 0 ? (
            <EmptyState title="Aucun pointage" description="Aucune présence enregistrée aujourd'hui." />
          ) : (
            <DonutChart
              centerValue={String(stats.todayRecords.length)}
              centerLabel="pointages"
              segments={[
                { label: 'Présents', value: stats.present, color: '#22c55e' },
                { label: 'Retards', value: stats.late, color: '#f59e0b' },
                { label: 'Absents', value: stats.absent, color: '#ef4444' },
              ]}
            />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="Présents par équipe" subtitle="Aujourd'hui" className="lg:col-span-1">
          {stats.perTeam.every((t) => t.value === 0) ? (
            <EmptyState title="Aucune donnée" />
          ) : (
            <BarChart data={stats.perTeam} />
          )}
        </Card>

        <Card title="Statistiques mensuelles" subtitle={new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} className="lg:col-span-1">
          <div className="space-y-4">
            <Row label="Présences" value={stats.monthPresent} color="bg-green-500" />
            <Row label="Retards" value={stats.monthLate} color="bg-amber-500" />
            <Row label="Absences" value={stats.monthAbsent} color="bg-red-500" />
          </div>
        </Card>

        <Card title="Alertes importantes" subtitle="Absences et retards du jour" className="lg:col-span-1">
          {stats.alerts.length === 0 ? (
            <EmptyState title="Aucune alerte" description="Tout est sous contrôle." icon={<AlertTriangle className="w-7 h-7" />} />
          ) : (
            <div className="space-y-3">
              {stats.alerts.map((r) => (
                <div key={r.id} className="flex items-center gap-3 text-sm">
                  <StatusBadge statut={r.statut} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-graphite-600 truncate">{r.agentMatricule} — {r.agentNom}</p>
                    <p className="text-xs text-graphite-400">{r.teamCode} · {r.shift}</p>
                  </div>
                  {r.statut === 'RETARD' && <span className="text-xs text-amber-600 font-medium">{minutesToHuman(r.retardMinutes)}</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Activités récentes" subtitle="Derniers pointages enregistrés">
        {stats.recent.length === 0 ? (
          <EmptyState title="Aucune activité" description="Les pointages apparaîtront ici." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Matricule</th><th>Agent</th><th>Équipe</th><th>Date</th><th>Rotation</th><th>Statut</th><th>Heure</th></tr>
              </thead>
              <tbody>
                {stats.recent.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium text-graphite-600">{r.agentMatricule}</td>
                    <td>{r.agentNom}</td>
                    <td>{r.teamCode}</td>
                    <td>{fmtDateFR(r.serviceDate)}</td>
                    <td>{r.shift}</td>
                    <td><StatusBadge statut={r.statut} /></td>
                    <td className="text-graphite-400">{r.heureArrivee ?? '—'} <span className="text-xs">{fmtDateTimeFR(r.createdAt)}</span></td>
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

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-sm text-graphite-500 flex-1">{label}</span>
      <span className="font-display font-bold text-graphite-600">{value}</span>
    </div>
  );
}
