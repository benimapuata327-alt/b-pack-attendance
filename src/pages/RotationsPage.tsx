import { useState } from 'react';
import { Clock, Plus, Pencil, Sunrise, Sunset, Moon } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Feedback';
import { toast } from '@/components/ui/Toast';
import type { Rotation } from '@/types';

function shiftIcon(code: string) {
  if (code === 'MATIN') return <Sunrise className="w-6 h-6 text-amber-500" />;
  if (code === 'SOIR') return <Sunset className="w-6 h-6 text-brand-500" />;
  return <Moon className="w-6 h-6 text-graphite-500" />;
}

export function RotationsPage() {
  const { user, can } = useAuth();
  const rotationsQ = useFetch<Rotation[]>(() => api.listRotations(), []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rotation | null>(null);
  const [saving, setSaving] = useState(false);
  const rotations = rotationsQ.data ?? [];

  return (
    <div>
      <PageHeader
        title="Rotations"
        subtitle={`${rotations.length} rotation(s) — 3x8 (Matin / Soir / Nuit)`}
        icon={<Clock className="w-5 h-5" />}
        actions={can('rotations.create') && <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditing(null); setModalOpen(true); }}>Nouvelle rotation</Button>}
      />

      {rotations.length === 0 ? (
        <Card><EmptyState title="Aucune rotation" icon={<Clock className="w-7 h-7" />} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rotations.map((r) => (
            <Card key={r.id} hover>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-graphite-50 flex items-center justify-center">{shiftIcon(r.code)}</div>
                  <div>
                    <h3 className="font-display font-bold text-graphite-600">{r.nom}</h3>
                    <p className="text-xs text-graphite-400 font-mono">{r.heureDebut} → {r.heureFin}{r.chevauchementNuit ? ' (J+1)' : ''}</p>
                  </div>
                </div>
                {can('rotations.edit') && <button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 rounded-lg text-graphite-400 hover:bg-brand-50 hover:text-brand-600 transition"><Pencil className="w-4 h-4" /></button>}
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-graphite-500"><Clock className="w-4 h-4" /> {r.dureeHeures}h</div>
                {r.chevauchementNuit && <span className="badge bg-graphite-100 text-graphite-500">Nuit J+1</span>}
              </div>
              <p className="text-xs text-graphite-400 mt-3">{r.description || 'Aucune description'}</p>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <RotationForm rotation={editing} onClose={() => setModalOpen(false)} saving={saving}
          onSave={async (data) => {
            setSaving(true);
            try {
              if (editing) { await api.updateRotation(editing.id, data, user); toast('success', 'Rotation modifiée.'); }
              else { await api.createRotation(data as never, user); toast('success', 'Rotation créée.'); }
              setModalOpen(false); rotationsQ.refresh();
            } catch (e) { toast('error', e instanceof Error ? e.message : 'Erreur'); }
            finally { setSaving(false); }
          }} />
      )}
    </div>
  );
}

function RotationForm({ rotation, onClose, onSave, saving }: { rotation: Rotation | null; onClose: () => void; onSave: (d: Partial<Rotation>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    code: rotation?.code ?? '', nom: rotation?.nom ?? '',
    heureDebut: rotation?.heureDebut ?? '07:00', heureFin: rotation?.heureFin ?? '15:00',
    chevauchementNuit: rotation?.chevauchementNuit ?? false,
    dureeHeures: rotation?.dureeHeures ?? 8,
    description: rotation?.description ?? '',
    actif: rotation?.actif ?? true,
  });
  return (
    <Modal open onClose={onClose} title={rotation ? 'Modifier la rotation' : 'Nouvelle rotation'} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button type="submit" form="rot-form" loading={saving}>Enregistrer</Button></>}>
      <form id="rot-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <Field label="Code" required><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MATIN" disabled={!!rotation} /></Field>
        <Field label="Nom" required><Input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Heure début" required><Input type="time" required value={form.heureDebut} onChange={(e) => setForm({ ...form, heureDebut: e.target.value })} /></Field>
          <Field label="Heure fin" required><Input type="time" required value={form.heureFin} onChange={(e) => setForm({ ...form, heureFin: e.target.value })} /></Field>
        </div>
        <Field label="Durée (heures)"><Input type="number" min={1} max={12} value={form.dureeHeures} onChange={(e) => setForm({ ...form, dureeHeures: Number(e.target.value) })} /></Field>
        <Field label="Chevauchement nuit">
          <Select value={form.chevauchementNuit ? '1' : '0'} onChange={(e) => setForm({ ...form, chevauchementNuit: e.target.value === '1' })}>
            <option value="0">Non</option><option value="1">Oui — la fin est le lendemain</option>
          </Select>
        </Field>
        <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      </form>
    </Modal>
  );
}
