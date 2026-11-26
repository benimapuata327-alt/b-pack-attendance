import { useMemo, useState } from 'react';
import { Shuffle, Plus, ArrowRight } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Feedback';
import { toast } from '@/components/ui/Toast';
import { fmtDateFR, todayISO } from '@/api/businessLogic';
import type { Assignment, Agent, Team, Position, Rotation } from '@/types';

export function AssignmentsPage() {
  const { user, can } = useAuth();
  const assignmentsQ = useFetch<Assignment[]>(() => api.listAssignments(), []);
  const agentsQ = useFetch<Agent[]>(() => api.listAgents(), []);
  const teamsQ = useFetch<Team[]>(() => api.listTeams(), []);
  const positionsQ = useFetch<Position[]>(() => api.listPositions(), []);
  const rotationsQ = useFetch<Rotation[]>(() => api.listRotations(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterAgent, setFilterAgent] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [showHistory, setShowHistory] = useState(true);

  const filtered = useMemo(() => {
    const list = (assignmentsQ.data ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list.filter((a) => {
      if (filterAgent && a.agentId !== filterAgent) return false;
      if (filterTeam && a.teamId !== filterTeam) return false;
      if (!showHistory && !a.actif) return false;
      return true;
    });
  }, [assignmentsQ.data, filterAgent, filterTeam, showHistory]);

  return (
    <div>
      <PageHeader
        title="Affectations"
        subtitle="Historique complet — les anciennes affectations sont conservées"
        icon={<Shuffle className="w-5 h-5" />}
        actions={can('assignments.create') && <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>Nouvelle affectation</Button>}
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}>
            <option value="">Tous les agents</option>
            {(agentsQ.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.matricule} — {a.prenom} {a.nom}</option>)}
          </Select>
          <Select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
            <option value="">Toutes les équipes</option>
            {(teamsQ.data ?? []).map((t) => <option key={t.id} value={t.id}>TEAM {t.code}</option>)}
          </Select>
          <Select value={showHistory ? '1' : '0'} onChange={(e) => setShowHistory(e.target.value === '1')}>
            <option value="1">Toutes les affectations</option>
            <option value="0">Affectations actuelles uniquement</option>
          </Select>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="Aucune affectation" description="Affectez des agents à des équipes, postes et rotations." icon={<Shuffle className="w-7 h-7" />}
            action={can('assignments.create') && <Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>Nouvelle affectation</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Agent</th><th>Équipe</th><th>Poste</th><th>Rotation</th><th>Du</th><th>Au</th><th>Statut</th></tr></thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td><span className="font-mono text-brand-600 font-semibold">{a.agentMatricule}</span> <span className="text-graphite-600">{a.agentNom}</span></td>
                    <td>TEAM {a.teamCode}</td>
                    <td>{a.positionNom ?? '—'}</td>
                    <td>{a.rotationCode ?? '—'}</td>
                    <td>{fmtDateFR(a.dateDebut)}</td>
                    <td>{a.dateFin ? fmtDateFR(a.dateFin) : <span className="text-graphite-300">En cours</span>}</td>
                    <td>{a.actif ? <span className="badge-active">Active</span> : <span className="badge-inactive">Archivée</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <AssignmentForm
          agents={agentsQ.data ?? []} teams={teamsQ.data ?? []} positions={positionsQ.data ?? []} rotations={rotationsQ.data ?? []}
          onClose={() => setModalOpen(false)} saving={saving}
          onSave={async (data) => {
            setSaving(true);
            try {
              await api.createAssignment(data, user);
              toast('success', 'Affectation créée. L\'ancienne affectation a été archivée.');
              setModalOpen(false); assignmentsQ.refresh(); agentsQ.refresh();
            } catch (e) { toast('error', e instanceof Error ? e.message : 'Erreur'); }
            finally { setSaving(false); }
          }} />
      )}
    </div>
  );
}

function AssignmentForm({ agents, teams, positions, rotations, onClose, onSave, saving }: {
  agents: Agent[]; teams: Team[]; positions: Position[]; rotations: Rotation[];
  onClose: () => void; onSave: (d: Partial<Assignment>) => void; saving: boolean;
}) {
  const [form, setForm] = useState({
    agentId: '', teamId: '', positionId: '', rotationId: '',
    dateDebut: todayISO(),
  });
  const activeAgents = agents.filter((a) => a.statut === 'ACTIF');
  return (
    <Modal open onClose={onClose} title="Nouvelle affectation" subtitle="L'agent sera désaffecté de sa précédente équipe (historique conservé)" size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button type="submit" form="asg-form" loading={saving}>Affecter</Button></>}>
      <form id="asg-form" onSubmit={(e) => { e.preventDefault(); onSave({ ...form, positionId: form.positionId || null, rotationId: form.rotationId || null, actif: true, dateFin: null }); }} className="space-y-4">
        <Field label="Agent" required>
          <Select required value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}>
            <option value="">— Choisir —</option>
            {activeAgents.map((a) => <option key={a.id} value={a.id}>{a.matricule} — {a.prenom} {a.nom} {a.teamCode ? `(actuel: TEAM ${a.teamCode})` : ''}</option>)}
          </Select>
        </Field>
        <div className="flex items-center gap-2 text-graphite-300 my-1"><ArrowRight className="w-4 h-4" /></div>
        <Field label="Équipe" required>
          <Select required value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">— Choisir —</option>
            {teams.map((t) => <option key={t.id} value={t.id}>TEAM {t.code}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Poste">
            <Select value={form.positionId} onChange={(e) => setForm({ ...form, positionId: e.target.value })}>
              <option value="">— Aucun —</option>
              {positions.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </Select>
          </Field>
          <Field label="Rotation">
            <Select value={form.rotationId} onChange={(e) => setForm({ ...form, rotationId: e.target.value })}>
              <option value="">— Aucune —</option>
              {rotations.map((r) => <option key={r.id} value={r.id}>{r.nom} ({r.heureDebut}-{r.heureFin})</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Date de début" required><input type="date" required className="input" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} /></Field>
      </form>
    </Modal>
  );
}
