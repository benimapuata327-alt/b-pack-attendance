import { useState } from 'react';
import { Briefcase, Plus, Pencil } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Feedback';
import { toast } from '@/components/ui/Toast';
import { fmtDateFR } from '@/api/businessLogic';
import type { Position } from '@/types';

export function PositionsPage() {
  const { user, can } = useAuth();
  const positionsQ = useFetch<Position[]>(() => api.listPositions(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [saving, setSaving] = useState(false);

  const positions = positionsQ.data ?? [];

  return (
    <div>
      <PageHeader
        title="Postes"
        subtitle={`${positions.length} poste(s) configuré(s)`}
        icon={<Briefcase className="w-5 h-5" />}
        actions={can('positions.create') && <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditing(null); setModalOpen(true); }}>Nouveau poste</Button>}
      />

      <Card>
        {positions.length === 0 ? (
          <EmptyState title="Aucun poste" icon={<Briefcase className="w-7 h-7" />} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Code</th><th>Nom</th><th>Description</th><th>Créé le</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-graphite-400">{p.code}</td>
                    <td className="font-medium text-graphite-600">{p.nom}</td>
                    <td className="text-graphite-400">{p.description || '—'}</td>
                    <td>{fmtDateFR(p.createdAt)}</td>
                    <td>{can('positions.edit') && <button onClick={() => { setEditing(p); setModalOpen(true); }} className="p-1.5 rounded-lg text-graphite-400 hover:bg-brand-50 hover:text-brand-600 transition"><Pencil className="w-4 h-4" /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <PositionForm position={editing} onClose={() => setModalOpen(false)} saving={saving}
          onSave={async (data) => {
            setSaving(true);
            try {
              if (editing) { await api.updatePosition(editing.id, data, user); toast('success', 'Poste modifié.'); }
              else { await api.createPosition(data as never, user); toast('success', 'Poste créé.'); }
              setModalOpen(false); positionsQ.refresh();
            } catch (e) { toast('error', e instanceof Error ? e.message : 'Erreur'); }
            finally { setSaving(false); }
          }} />
      )}
    </div>
  );
}

function PositionForm({ position, onClose, onSave, saving }: { position: Position | null; onClose: () => void; onSave: (d: Partial<Position>) => void; saving: boolean }) {
  const [form, setForm] = useState({ nom: position?.nom ?? '', description: position?.description ?? '' });
  return (
    <Modal open onClose={onClose} title={position ? 'Modifier le poste' : 'Nouveau poste'} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button type="submit" form="pos-form" loading={saving}>Enregistrer</Button></>}>
      <form id="pos-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <Field label="Nom" required><Input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ensacheur" /></Field>
        <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      </form>
    </Modal>
  );
}
