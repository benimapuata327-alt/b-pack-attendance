import { useMemo, useState } from 'react';
import { Coffee, Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Select, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Loader';
import { toast } from '@/components/ui/Toast';
import { fmtDateFR, minutesToHuman, todayISO } from '@/api/businessLogic';
import type { BreakRecord, Agent } from '@/types';

export function BreaksPage() {
  const { user, can } = useAuth();
  const breaksQ = useFetch<BreakRecord[]>(() => api.listBreaks(), []);
  const agentsQ = useFetch<Agent[]>(() => api.listAgents(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BreakRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BreakRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterAgent, setFilterAgent] = useState('');

  const filtered = useMemo(() => {
    const list = (breaksQ.data ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list.filter((b) => !filterAgent || b.agentId === filterAgent);
  }, [breaksQ.data, filterAgent]);

  const activeAgents = (agentsQ.data ?? []).filter((a) => a.statut === 'ACTIF');

  return (
    <div>
      <PageHeader
        title="Pauses"
        subtitle="Les pauses ne comptent jamais comme une absence"
        icon={<Coffee className="w-5 h-5" />}
        actions={can('breaks.create') && <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditing(null); setModalOpen(true); }}>Nouvelle pause</Button>}
      />

      <Card className="mb-6">
        <Select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="max-w-xs">
          <option value="">Tous les agents</option>
          {(agentsQ.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.matricule} — {a.prenom} {a.nom}</option>)}
        </Select>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="Aucune pause enregistrée" description="Enregistrez la pause d'un agent : date, heures et remarques." icon={<Coffee className="w-7 h-7" />}
            action={can('breaks.create') && <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditing(null); setModalOpen(true); }}>Nouvelle pause</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Matricule</th><th>Agent</th><th>Date</th><th>Début</th><th>Fin</th><th>Durée</th><th>Remarques</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono font-semibold text-brand-600">{b.agentMatricule}</td>
                    <td className="font-medium text-graphite-600">{b.agentNom}</td>
                    <td>{fmtDateFR(b.date)}</td>
                    <td>{b.heureDebut}</td>
                    <td>{b.heureFin ?? <span className="text-graphite-300">En cours</span>}</td>
                    <td className="font-medium text-graphite-600">{b.dureeMinutes != null ? minutesToHuman(b.dureeMinutes) : '—'}</td>
                    <td className="text-graphite-400 max-w-xs truncate">{b.remarque || '—'}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {can('breaks.edit') && <button onClick={() => { setEditing(b); setModalOpen(true); }} className="p-1.5 rounded-lg text-graphite-400 hover:bg-brand-50 hover:text-brand-600 transition"><Pencil className="w-4 h-4" /></button>}
                        {can('breaks.delete') && <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg text-graphite-400 hover:bg-red-50 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>}
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
        <BreakForm
          record={editing} agents={activeAgents} onClose={() => setModalOpen(false)} saving={saving}
          onSave={async (data) => {
            setSaving(true);
            try {
              if (editing) { await api.updateBreak(editing.id, data, user); toast('success', 'Pause modifiée.'); }
              else { await api.createBreak(data, user); toast('success', 'Pause enregistrée.'); }
              setModalOpen(false); breaksQ.refresh();
            } catch (e) { toast('error', e instanceof Error ? e.message : 'Erreur'); }
            finally { setSaving(false); }
          }} />
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={async () => {
        if (!deleteTarget) return;
        await api.deleteBreak(deleteTarget.id, user);
        toast('success', 'Pause supprimée.');
        breaksQ.refresh();
      }} title="Supprimer la pause" message="Cette action est irréversible." confirmLabel="Supprimer" danger />
    </div>
  );
}

function BreakForm({ record, agents, onClose, onSave, saving }: { record: BreakRecord | null; agents: Agent[]; onClose: () => void; onSave: (d: Partial<BreakRecord>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    agentId: record?.agentId ?? '',
    date: record?.date ?? todayISO(),
    heureDebut: record?.heureDebut ?? '',
    heureFin: record?.heureFin ?? '',
    remarque: record?.remarque ?? '',
  });
  const duree = useMemo(() => {
    if (!form.heureDebut || !form.heureFin) return null;
    const [h1, m1] = form.heureDebut.split(':').map(Number);
    const [h2, m2] = form.heureFin.split(':').map(Number);
    let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins < 0) mins += 24 * 60;
    return mins;
  }, [form.heureDebut, form.heureFin]);

  return (
    <Modal open onClose={onClose} title={record ? 'Modifier la pause' : 'Nouvelle pause'} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button type="submit" form="break-form" loading={saving}>Enregistrer</Button></>}>
      <form id="break-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <Field label="Agent" required>
          <Select required value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })} disabled={!!record}>
            <option value="">— Choisir —</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.matricule} — {a.prenom} {a.nom}</option>)}
          </Select>
        </Field>
        <Field label="Date" required><Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Heure début" required><Input type="time" required value={form.heureDebut} onChange={(e) => setForm({ ...form, heureDebut: e.target.value })} /></Field>
          <Field label="Heure fin"><Input type="time" value={form.heureFin} onChange={(e) => setForm({ ...form, heureFin: e.target.value })} /></Field>
        </div>
        {duree != null && <div className="flex items-center gap-2 text-sm text-graphite-500"><Clock className="w-4 h-4" /> Durée : <span className="font-semibold text-graphite-600">{minutesToHuman(duree)}</span></div>}
        <Field label="Remarques"><Textarea rows={2} value={form.remarque} onChange={(e) => setForm({ ...form, remarque: e.target.value })} /></Field>
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">Une pause ne compte jamais comme une absence.</p>
      </form>
    </Modal>
  );
}
