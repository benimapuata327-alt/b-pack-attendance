import { useEffect, useState } from 'react';
import { UsersRound, Plus, Pencil, Eye } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, AgentStatusBadge } from '@/components/ui/Feedback';
import { toast } from '@/components/ui/Toast';
import { fmtDateFR } from '@/api/businessLogic';
import type { Team, Agent } from '@/types';

export function TeamsPage() {
  const { user, can } = useAuth();
  const teamsQ = useFetch<Team[]>(() => api.listTeams(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [viewing, setViewing] = useState<Team | null>(null);
  const [members, setMembers] = useState<Agent[]>([]);
  const [saving, setSaving] = useState(false);

  const [stats, setStats] = useState<Record<string, { total: number; active: number }>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const res: Record<string, { total: number; active: number }> = {};
      for (const t of teamsQ.data ?? []) {
        const s = await api.teamStats(t.id);
        res[t.id] = { total: s.total, active: s.active };
      }
      if (active) setStats(res);
    })();
    return () => { active = false; };
  }, [teamsQ.data]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t: Team) => { setEditing(t); setModalOpen(true); };
  const viewTeam = async (t: Team) => { setViewing(t); setMembers(await api.teamMembers(t.id)); };

  const teams = teamsQ.data ?? [];

  return (
    <div>
      <PageHeader
        title="Équipes"
        subtitle={`${teams.length} équipe(s) configurée(s)`}
        icon={<UsersRound className="w-5 h-5" />}
        actions={can('teams.create') && <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouvelle équipe</Button>}
      />

      {teams.length === 0 ? (
        <Card><EmptyState title="Aucune équipe" icon={<UsersRound className="w-7 h-7" />} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => (
            <Card key={t.id} hover className="overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-graphite-600 text-white flex items-center justify-center font-display font-bold text-lg">{t.code}</div>
                  <div>
                    <h3 className="font-display font-bold text-graphite-600">{t.nom}</h3>
                    <p className="text-xs text-graphite-400">{t.description || 'Aucune description'}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => viewTeam(t)} className="p-1.5 rounded-lg text-graphite-400 hover:bg-blue-50 hover:text-blue-600 transition"><Eye className="w-4 h-4" /></button>
                  {can('teams.edit') && <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-graphite-400 hover:bg-brand-50 hover:text-brand-600 transition"><Pencil className="w-4 h-4" /></button>}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-graphite-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-display font-bold text-graphite-600">{stats[t.id]?.total ?? '—'}</p>
                  <p className="text-xs text-graphite-400">membres</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-display font-bold text-green-600">{stats[t.id]?.active ?? '—'}</p>
                  <p className="text-xs text-graphite-400">actifs</p>
                </div>
              </div>
              <p className="text-xs text-graphite-300 mt-3">Créée le {fmtDateFR(t.createdAt)}</p>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <TeamForm team={editing} onClose={() => setModalOpen(false)} saving={saving}
          onSave={async (data) => {
            setSaving(true);
            try {
              if (editing) { await api.updateTeam(editing.id, data, user); toast('success', 'Équipe modifiée.'); }
              else { await api.createTeam(data as never, user); toast('success', 'Équipe créée.'); }
              setModalOpen(false); teamsQ.refresh();
            } catch (e) { toast('error', e instanceof Error ? e.message : 'Erreur'); }
            finally { setSaving(false); }
          }} />
      )}

      {viewing && (
        <Modal open onClose={() => { setViewing(null); setMembers([]); }} title={viewing.nom} subtitle={`${members.length} membre(s)`} size="lg">
          {members.length === 0 ? <EmptyState title="Aucun membre" description="Aucun agent n'est assigné à cette équipe." /> : (
            <div className="table-wrap max-h-96 overflow-y-auto">
              <table className="table">
                <thead><tr><th>Matricule</th><th>Nom</th><th>Poste</th><th>Statut</th></tr></thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="font-mono font-semibold text-brand-600">{m.matricule}</td>
                      <td className="font-medium text-graphite-600">{m.prenom} {m.nom}</td>
                      <td>{m.positionNom ?? '—'}</td>
                      <td><AgentStatusBadge statut={m.statut} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function TeamForm({ team, onClose, onSave, saving }: { team: Team | null; onClose: () => void; onSave: (d: Partial<Team>) => void; saving: boolean }) {
  const [form, setForm] = useState({ code: team?.code ?? '', nom: team?.nom ?? '', description: team?.description ?? '' });
  return (
    <Modal open onClose={onClose} title={team ? 'Modifier l\'équipe' : 'Nouvelle équipe'} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button type="submit" form="team-form" loading={saving}>Enregistrer</Button></>}>
      <form id="team-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <Field label="Code" required hint="Lettre unique (A, B, C…) — influence le matricule"><Input required maxLength={3} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} disabled={!!team} /></Field>
        <Field label="Nom" required><Input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="TEAM A" /></Field>
        <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      </form>
    </Modal>
  );
}
