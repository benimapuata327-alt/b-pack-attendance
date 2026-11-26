import { useState } from 'react';
import { UserCog, Plus, Pencil, Power } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Loader';
import { toast } from '@/components/ui/Toast';
import { ROLE_LABELS } from '@/auth/permissions';
import { fmtDateFR, fmtDateTimeFR } from '@/api/businessLogic';
import type { User, Team, UserRole } from '@/types';

export function UsersPage() {
  const { user: current, can } = useAuth();
  const usersQ = useFetch<User[]>(() => api.listUsers(), []);
  const teamsQ = useFetch<Team[]>(() => api.listTeams(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  const users = usersQ.data ?? [];

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (u: User) => { setEditing(u); setModalOpen(true); };

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        subtitle={`${users.length} utilisateur(s)`}
        icon={<UserCog className="w-5 h-5" />}
        actions={can('users.create') && <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouvel utilisateur</Button>}
      />

      <Card>
        {users.length === 0 ? (
          <EmptyState title="Aucun utilisateur" icon={<UserCog className="w-7 h-7" />} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Matricule</th><th>Nom</th><th>Email</th><th>Rôle</th><th>Équipe</th><th>Dernière connexion</th><th>Statut</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-mono font-semibold text-brand-600">{u.matricule}</td>
                    <td className="font-medium text-graphite-600">{u.prenom} {u.nom}</td>
                    <td className="text-graphite-400">{u.email}</td>
                    <td><span className="badge bg-graphite-100 text-graphite-600">{ROLE_LABELS[u.role]}</span></td>
                    <td>{u.teamId ? `TEAM ${teamsQ.data?.find((t) => t.id === u.teamId)?.code}` : '—'}</td>
                    <td className="text-xs text-graphite-400">{u.derniereConnexion ? fmtDateTimeFR(u.derniereConnexion) : 'Jamais'}</td>
                    <td>{u.actif ? <span className="badge-active">Actif</span> : <span className="badge-inactive">Inactif</span>}</td>
                    <td className="text-right">
                      {can('users.edit') && current?.id !== u.id && <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-graphite-400 hover:bg-brand-50 hover:text-brand-600 transition"><Pencil className="w-4 h-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <UserForm user={editing} teams={teamsQ.data ?? []} onClose={() => setModalOpen(false)} saving={saving}
          onSave={async (data) => {
            setSaving(true);
            try {
              if (editing) { await api.updateUser(editing.id, data, current); toast('success', 'Utilisateur modifié.'); }
              else { await api.createUser(data, current); toast('success', 'Utilisateur créé. Matricule généré.'); }
              setModalOpen(false); usersQ.refresh();
            } catch (e) { toast('error', e instanceof Error ? e.message : 'Erreur'); }
            finally { setSaving(false); }
          }} />
      )}
    </div>
  );
}

function UserForm({ user, teams, onClose, onSave, saving }: { user: User | null; teams: Team[]; onClose: () => void; onSave: (d: Partial<User> & { password?: string }) => void; saving: boolean }) {
  const [form, setForm] = useState({
    nom: user?.nom ?? '', prenom: user?.prenom ?? '', email: user?.email ?? '',
    role: user?.role ?? 'SURVEILLANT' as UserRole,
    teamId: user?.teamId ?? '', telephone: user?.telephone ?? '',
    actif: user?.actif ?? true,
    password: '',
  });
  return (
    <Modal open onClose={onClose} title={user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'} subtitle={user ? user.matricule : 'Matricule généré automatiquement'} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button type="submit" form="user-form" loading={saving}>Enregistrer</Button></>}>
      <form id="user-form" onSubmit={(e) => { e.preventDefault(); onSave({ ...form, teamId: form.teamId || null, password: form.password || undefined }); }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nom" required><Input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></Field>
        <Field label="Prénom" required><Input required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></Field>
        <Field label="Email" required><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Téléphone"><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></Field>
        <Field label="Rôle" required>
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
            <option value="ADMINISTRATEUR">Administrateur</option>
            <option value="SURVEILLANT">Surveillant</option>
            <option value="RESPONSABLE">Responsable</option>
            <option value="DIRECTION">Direction</option>
          </Select>
        </Field>
        <Field label="Équipe assignée" hint="Requis pour le rôle Surveillant">
          <Select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">— Aucune —</option>
            {teams.map((t) => <option key={t.id} value={t.id}>TEAM {t.code}</option>)}
          </Select>
        </Field>
        {!user && <Field label="Mot de passe" required hint="Sera haché côté Laravel"><Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>}
        <Field label="Statut">
          <Select value={form.actif ? '1' : '0'} onChange={(e) => setForm({ ...form, actif: e.target.value === '1' })}>
            <option value="1">Actif</option><option value="0">Inactif</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
