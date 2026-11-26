import { useMemo, useState } from 'react';
import { Users, Plus, Search, Pencil, Eye, Power, UserX } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, AgentStatusBadge } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Loader';
import { toast } from '@/components/ui/Toast';
import { fmtDateFR } from '@/api/businessLogic';
import type { Agent, Team, Position, Rotation, Gender, Attendance } from '@/types';
import { StatusBadge } from '@/components/ui/Feedback';

export function AgentsPage() {
  const { user, can } = useAuth();
  const agentsQ = useFetch<Agent[]>(() => api.listAgents(), []);
  const teamsQ = useFetch<Team[]>(() => api.listTeams(), []);
  const positionsQ = useFetch<Position[]>(() => api.listPositions(), []);
  const rotationsQ = useFetch<Rotation[]>(() => api.listRotations(), []);

  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [viewing, setViewing] = useState<Agent | null>(null);
  const [history, setHistory] = useState<Attendance[] | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const list = agentsQ.data ?? [];
    return list.filter((a) => {
      if (search) {
        const q = search.toLowerCase();
        const full = `${a.prenom} ${a.nomDuMilieu ?? ''} ${a.nom} ${a.matricule}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      if (teamFilter && a.teamId !== teamFilter) return false;
      if (positionFilter && a.positionId !== positionFilter) return false;
      if (statusFilter && a.statut !== statusFilter) return false;
      return true;
    });
  }, [agentsQ.data, search, teamFilter, positionFilter, statusFilter]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (a: Agent) => { setEditing(a); setModalOpen(true); };

  const viewAgent = async (a: Agent) => {
    setViewing(a);
    const h = await api.agentAttendanceHistory(a.id);
    setHistory(h);
  };

  const onToggle = async () => {
    if (!toggleTarget) return;
    try {
      await api.toggleAgentStatus(toggleTarget.id, user);
      toast('success', `Agent ${toggleTarget.statut === 'ACTIF' ? 'désactivé' : 'activé'} avec succès.`);
      agentsQ.refresh();
    } catch { toast('error', 'Échec de la modification du statut.'); }
  };

  return (
    <div>
      <PageHeader
        title="Agents"
        subtitle={`${filtered.length} agent(s) — matricules générés automatiquement`}
        icon={<Users className="w-5 h-5" />}
        actions={can('agents.create') && <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouvel agent</Button>}
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-graphite-300" />
            <Input className="pl-9" placeholder="Rechercher par nom ou matricule…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="">Toutes les équipes</option>
            {(teamsQ.data ?? []).map((t) => <option key={t.id} value={t.id}>TEAM {t.code}</option>)}
          </Select>
          <Select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
            <option value="">Tous les postes</option>
            {(positionsQ.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="ACTIF">Actif</option>
            <option value="INACTIF">Inactif</option>
          </Select>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="Aucun agent" description="Ajoutez votre premier agent pour commencer." icon={<Users className="w-7 h-7" />}
            action={can('agents.create') && <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouvel agent</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Matricule</th><th>Nom complet</th><th>Genre</th><th>Poste</th><th>Équipe</th><th>Rotation</th><th>Recrutement</th><th>Statut</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono font-semibold text-brand-600">{a.matricule}</td>
                    <td className="font-medium text-graphite-600">{a.prenom} {a.nomDuMilieu ? `${a.nomDuMilieu} ` : ''}{a.nom}</td>
                    <td>{a.genre === 'M' ? 'Homme' : 'Femme'}</td>
                    <td>{a.positionNom ?? '—'}</td>
                    <td>{a.teamCode ? `TEAM ${a.teamCode}` : '—'}</td>
                    <td>{a.rotationCode ?? '—'}</td>
                    <td>{fmtDateFR(a.dateRecrutement)}</td>
                    <td><AgentStatusBadge statut={a.statut} /></td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => viewAgent(a)} className="p-1.5 rounded-lg text-graphite-400 hover:bg-blue-50 hover:text-blue-600 transition" title="Voir"><Eye className="w-4 h-4" /></button>
                        {can('agents.edit') && <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg text-graphite-400 hover:bg-brand-50 hover:text-brand-600 transition" title="Modifier"><Pencil className="w-4 h-4" /></button>}
                        {can('agents.toggle') && <button onClick={() => setToggleTarget(a)} className={`p-1.5 rounded-lg transition ${a.statut === 'ACTIF' ? 'text-graphite-400 hover:bg-red-50 hover:text-red-600' : 'text-graphite-400 hover:bg-green-50 hover:text-green-600'}`} title={a.statut === 'ACTIF' ? 'Désactiver' : 'Activer'}><Power className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <AgentForm
          agent={editing}
          teams={teamsQ.data ?? []}
          positions={positionsQ.data ?? []}
          rotations={rotationsQ.data ?? []}
          onClose={() => setModalOpen(false)}
          saving={saving}
          onSave={async (data) => {
            setSaving(true);
            try {
              if (editing) {
                await api.updateAgent(editing.id, data, user);
                toast('success', 'Agent modifié avec succès.');
              } else {
                await api.createAgent(data, user);
                toast('success', 'Agent créé. Matricule généré automatiquement.');
              }
              setModalOpen(false);
              agentsQ.refresh();
            } catch (e) { toast('error', e instanceof Error ? e.message : 'Erreur'); }
            finally { setSaving(false); }
          }}
        />
      )}

      {viewing && (
        <Modal open onClose={() => { setViewing(null); setHistory(null); }} title={viewing.matricule} subtitle={`${viewing.prenom} ${viewing.nom}`} size="lg">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Info label="Nom" value={viewing.nom} />
            <Info label="Prénom" value={viewing.prenom} />
            <Info label="Nom du milieu" value={viewing.nomDuMilieu || '—'} />
            <Info label="Genre" value={viewing.genre === 'M' ? 'Homme' : 'Femme'} />
            <Info label="Téléphone" value={viewing.telephone || '—'} />
            <Info label="Adresse" value={viewing.adresse || '—'} />
            <Info label="Poste" value={viewing.positionNom ?? '—'} />
            <Info label="Équipe" value={viewing.teamCode ? `TEAM ${viewing.teamCode}` : '—'} />
            <Info label="Rotation" value={viewing.rotationCode ?? '—'} />
            <Info label="Recrutement" value={fmtDateFR(viewing.dateRecrutement)} />
            <Info label="Statut" value={viewing.statut === 'ACTIF' ? 'Actif' : 'Inactif'} />
            <Info label="Créé le" value={fmtDateFR(viewing.createdAt)} />
          </div>
          <h4 className="section-title mb-3">Historique de présence</h4>
          {history && history.length === 0 ? (
            <EmptyState title="Aucun pointage" icon={<UserX className="w-7 h-7" />} />
          ) : (
            <div className="table-wrap max-h-64 overflow-y-auto">
              <table className="table">
                <thead><tr><th>Date</th><th>Rotation</th><th>Heure</th><th>Statut</th><th>Retard</th></tr></thead>
                <tbody>
                  {history?.map((r) => (
                    <tr key={r.id}>
                      <td>{fmtDateFR(r.serviceDate)}</td><td>{r.shift}</td><td>{r.heureArrivee ?? '—'}</td>
                      <td><StatusBadge statut={r.statut} /></td><td>{r.retardMinutes > 0 ? `${r.retardMinutes} min` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={onToggle}
        title={toggleTarget?.statut === 'ACTIF' ? 'Désactiver l\'agent' : 'Activer l\'agent'}
        message={toggleTarget?.statut === 'ACTIF'
          ? `Voulez-vous désactiver ${toggleTarget.prenom} ${toggleTarget.nom} ? Il ne sera plus disponible pour le pointage.`
          : `Voulez-vous réactiver ${toggleTarget?.prenom} ${toggleTarget?.nom} ?`}
        confirmLabel={toggleTarget?.statut === 'ACTIF' ? 'Désactiver' : 'Activer'}
        danger={toggleTarget?.statut === 'ACTIF'}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-graphite-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-graphite-600 mt-0.5">{value}</p>
    </div>
  );
}

interface AgentFormProps {
  agent: Agent | null;
  teams: Team[];
  positions: Position[];
  rotations: Rotation[];
  onClose: () => void;
  onSave: (data: Partial<Agent>) => void;
  saving: boolean;
}

function AgentForm({ agent, teams, positions, rotations, onClose, onSave, saving }: AgentFormProps) {
  const [form, setForm] = useState({
    nom: agent?.nom ?? '',
    nomDuMilieu: agent?.nomDuMilieu ?? '',
    prenom: agent?.prenom ?? '',
    genre: agent?.genre ?? 'M' as Gender,
    telephone: agent?.telephone ?? '',
    adresse: agent?.adresse ?? '',
    positionId: agent?.positionId ?? '',
    teamId: agent?.teamId ?? '',
    rotationId: agent?.rotationId ?? '',
    dateRecrutement: agent?.dateRecrutement ?? new Date().toISOString().slice(0, 10),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      positionId: form.positionId || null,
      teamId: form.teamId || null,
      rotationId: form.rotationId || null,
    });
  };

  return (
    <Modal
      open onClose={onClose}
      title={agent ? 'Modifier l\'agent' : 'Nouvel agent'}
      subtitle={agent ? agent.matricule : 'Le matricule sera généré automatiquement selon l\'équipe'}
      size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button type="submit" form="agent-form" loading={saving}>Enregistrer</Button></>}
    >
      <form id="agent-form" onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nom" required><Input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></Field>
        <Field label="Prénom" required><Input required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></Field>
        <Field label="Nom du milieu"><Input value={form.nomDuMilieu} onChange={(e) => setForm({ ...form, nomDuMilieu: e.target.value })} /></Field>
        <Field label="Genre" required>
          <Select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value as Gender })}>
            <option value="M">Homme</option><option value="F">Femme</option>
          </Select>
        </Field>
        <Field label="Téléphone"><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="07 XX XX XX XX" /></Field>
        <Field label="Date de recrutement" required><Input type="date" required value={form.dateRecrutement} onChange={(e) => setForm({ ...form, dateRecrutement: e.target.value })} /></Field>
        <Field label="Adresse" ><Input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} /></Field>
        <Field label="Équipe" hint="Détermine le préfixe du matricule">
          <Select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">— Aucune —</option>
            {teams.map((t) => <option key={t.id} value={t.id}>TEAM {t.code}</option>)}
          </Select>
        </Field>
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
      </form>
    </Modal>
  );
}
