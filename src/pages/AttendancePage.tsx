import { useMemo, useState } from 'react';
import { Fingerprint, Save, Calendar, UsersRound, Clock, CheckCircle2, AlertTriangle, Pencil } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { useFetch } from '@/hooks/useData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Select, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, StatusBadge } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Loader';
import { toast } from '@/components/ui/Toast';
import { computeStatus, fmtDateFR, todayISO, minutesToHuman } from '@/api/businessLogic';
import type { Agent, Team, Rotation, Attendance, ShiftKey } from '@/types';

interface RowState { agentId: string; heureArrivee: string; }

export function AttendancePage() {
  const { user, can } = useAuth();
  const teamsQ = useFetch<Team[]>(() => api.listTeams(), []);
  const rotationsQ = useFetch<Rotation[]>(() => api.listRotations(), []);
  const agentsQ = useFetch<Agent[]>(() => api.listAgents(), []);
  const attendanceQ = useFetch<Attendance[]>(() => api.listAttendance(), []);

  // SURVEILLANT is restricted to their team
  const allowedTeams = useMemo(() => {
    const all = teamsQ.data ?? [];
    if (user?.role === 'SURVEILLANT' && user.teamId) return all.filter((t) => t.id === user.teamId);
    return all;
  }, [teamsQ.data, user]);

  const [serviceDate, setServiceDate] = useState(todayISO());
  const [teamId, setTeamId] = useState('');
  const [rotationId, setRotationId] = useState('');
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Attendance | null>(null);

  const selectedRotation = (rotationsQ.data ?? []).find((r) => r.id === rotationId);
  const shift = (selectedRotation?.code ?? 'MATIN') as ShiftKey;
  const grace = 15;

  // active agents assigned to the selected team
  const teamAgents = useMemo(() => {
    const all = agentsQ.data ?? [];
    return all.filter((a) => a.statut === 'ACTIF' && a.teamId === teamId);
  }, [agentsQ.data, teamId]);

  // existing records for this date+team+shift (to warn duplicates)
  const existing = useMemo(() => {
    const all = attendanceQ.data ?? [];
    return all.filter((r) => r.serviceDate === serviceDate && r.teamId === teamId && r.shift === shift);
  }, [attendanceQ.data, serviceDate, teamId, shift]);

  const existingByAgent = useMemo(() => {
    const m: Record<string, Attendance> = {};
    for (const r of existing) m[r.agentId] = r;
    return m;
  }, [existing]);

  // preview computed statuses
  const preview = useMemo(() => {
    return teamAgents.map((a) => {
      const row = rows[a.id];
      const arrival = row?.heureArrivee || '';
      const computed = arrival ? computeStatus(arrival, shift, grace) : null;
      const already = existingByAgent[a.id];
      return { agent: a, arrival, computed, already };
    });
  }, [teamAgents, rows, shift, existingByAgent]);

  const presentCount = preview.filter((p) => p.computed?.statut === 'PRESENT').length;
  const lateCount = preview.filter((p) => p.computed?.statut === 'RETARD').length;
  const absentCount = preview.filter((p) => p.computed?.statut === 'ABSENT').length + preview.filter((p) => !p.computed && !p.already).length;

  const setArrival = (agentId: string, heure: string) => {
    setRows((r) => ({ ...r, [agentId]: { agentId, heureArrivee: heure } }));
  };

  const markAbsent = (agentId: string) => {
    setRows((r) => ({ ...r, [agentId]: { agentId, heureArrivee: '' } }));
  };

  const fillAllNow = () => {
    const now = new Date().toTimeString().slice(0, 5);
    const next: Record<string, RowState> = {};
    for (const a of teamAgents) next[a.id] = { agentId: a.id, heureArrivee: now };
    setRows(next);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const records = teamAgents
        .map((a) => {
          const row = rows[a.id];
          const heure = row?.heureArrivee ?? '';
          return {
            agentId: a.id, teamId, rotationId,
            serviceDate, shift,
            heureArrivee: heure || null,
          };
        });
      const res = await api.saveCollectiveAttendance(records, user);
      toast('success', `${res.created} pointage(s) enregistré(s)${res.skipped > 0 ? `, ${res.skipped} doublon(s) ignoré(s)` : ''}.`);
      setRows({});
      attendanceQ.refresh();
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Erreur'); }
    finally { setSaving(false); setConfirmOpen(false); }
  };

  const onSaveEdit = async (heure: string) => {
    if (!editTarget) return;
    try {
      await api.updateAttendance(editTarget.id, { heureArrivee: heure || null }, user);
      toast('success', 'Pointage corrigé. Audit trail mis à jour.');
      setEditTarget(null);
      attendanceQ.refresh();
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Erreur'); }
  };

  const ready = teamId && rotationId && teamAgents.length > 0;

  return (
    <div>
      <PageHeader
        title="Pointage collectif"
        subtitle="Sélectionnez la date, l'équipe et la rotation — le statut est calculé automatiquement"
        icon={<Fingerprint className="w-5 h-5" />}
      />

      {/* Step bar */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={<><Calendar className="w-3.5 h-3.5 inline mr-1" /> 1. Date de service</>} required>
            <Input type="date" required value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
            {shift === 'NUIT' && <p className="text-xs text-amber-600 mt-1">Rotation nuit : la date de service correspond au jour de début du quart.</p>}
          </Field>
          <Field label={<><UsersRound className="w-3.5 h-3.5 inline mr-1" /> 2. Équipe</>} required>
            <Select required value={teamId} onChange={(e) => { setTeamId(e.target.value); setRows({}); }}>
              <option value="">— Choisir —</option>
              {allowedTeams.map((t) => <option key={t.id} value={t.id}>TEAM {t.code}</option>)}
            </Select>
          </Field>
          <Field label={<><Clock className="w-3.5 h-3.5 inline mr-1" /> 3. Rotation</>} required>
            <Select required value={rotationId} onChange={(e) => { setRotationId(e.target.value); setRows({}); }}>
              <option value="">— Choisir —</option>
              {(rotationsQ.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.nom} ({r.heureDebut}-{r.heureFin}{r.chevauchementNuit ? ' J+1' : ''})</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {!ready ? (
        <Card><EmptyState title="En attente de sélection" description="Choisissez une équipe et une rotation pour afficher les agents à pointer." icon={<Fingerprint className="w-7 h-7" />} /></Card>
      ) : (
        <>
          {/* Summary chips */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="card p-4 text-center"><p className="text-2xl font-display font-bold text-green-600">{presentCount}</p><p className="text-xs text-graphite-400">Présents</p></div>
            <div className="card p-4 text-center"><p className="text-2xl font-display font-bold text-amber-600">{lateCount}</p><p className="text-xs text-graphite-400">Retards</p></div>
            <div className="card p-4 text-center"><p className="text-2xl font-display font-bold text-red-600">{absentCount}</p><p className="text-xs text-graphite-400">Absents</p></div>
          </div>

          <Card
            title={`Agents de TEAM ${(teamsQ.data ?? []).find((t) => t.id === teamId)?.code}`}
            subtitle={`${teamAgents.length} agent(s) actif(s) — heure de référence ${selectedRotation?.heureDebut}`}
            actions={<Button variant="ghost" size="sm" onClick={fillAllNow}>Pointer maintenant</Button>}
          >
            {existing.length > 0 && (
              <div className="mb-4 flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{existing.length} pointage(s) existant(s) pour cette date/équipe/rotation. Les doublons seront ignorés lors de l'enregistrement.</span>
              </div>
            )}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Matricule</th><th>Agent</th><th>Poste</th><th>Heure d'arrivée</th><th>Statut calculé</th><th>Retard</th><th>Existant</th></tr>
                </thead>
                <tbody>
                  {preview.map(({ agent, arrival, computed, already }) => (
                    <tr key={agent.id}>
                      <td className="font-mono font-semibold text-brand-600">{agent.matricule}</td>
                      <td className="font-medium text-graphite-600">{agent.prenom} {agent.nom}</td>
                      <td className="text-graphite-400">{agent.positionNom ?? '—'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <input type="time" className="input w-32 py-1.5" value={arrival} onChange={(e) => setArrival(agent.id, e.target.value)} />
                          <button onClick={() => markAbsent(agent.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Absent</button>
                        </div>
                      </td>
                      <td>{computed ? <StatusBadge statut={computed.statut} /> : <span className="text-graphite-300 text-xs">—</span>}</td>
                      <td className="text-amber-600 font-medium">{computed?.retardMinutes ? minutesToHuman(computed.retardMinutes) : '—'}</td>
                      <td>
                        {already ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge statut={already.statut} />
                            {can('attendance.edit') && <button onClick={() => setEditTarget(already)} className="p-1 rounded text-graphite-400 hover:text-brand-600"><Pencil className="w-3.5 h-3.5" /></button>}
                          </div>
                        ) : <span className="text-graphite-300 text-xs">Nouveau</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-graphite-100">
              <p className="text-sm text-graphite-400"><CheckCircle2 className="w-4 h-4 inline mr-1 text-green-500" /> Statut calculé avec tolérance de {grace} min</p>
              {can('attendance.create') && <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={() => setConfirmOpen(true)}>Enregistrer le pointage</Button>}
            </div>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onSave}
        title="Confirmer le pointage collectif"
        message={`Enregistrer ${teamAgents.length} pointage(s) pour le ${fmtDateFR(serviceDate)} — rotation ${shift}. Les doublons seront ignorés.`}
        confirmLabel="Enregistrer"
      />

      {editTarget && (
        <EditAttendanceModal record={editTarget} onClose={() => setEditTarget(null)} onSave={onSaveEdit} />
      )}
    </div>
  );
}

function EditAttendanceModal({ record, onClose, onSave }: { record: Attendance; onClose: () => void; onSave: (heure: string) => void }) {
  const [heure, setHeure] = useState(record.heureArrivee ?? '');
  const computed = heure ? computeStatus(heure, record.shift, 15) : null;
  return (
    <Modal open onClose={onClose} title="Corriger le pointage" subtitle={`${record.agentMatricule} — ${record.agentNom} (${fmtDateFR(record.serviceDate)})`} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button onClick={() => onSave(heure)}>Corriger</Button></>}>
      <div className="space-y-4">
        <div className="bg-graphite-50 rounded-lg p-3 text-sm">
          <p className="text-graphite-400">Statut actuel</p>
          <div className="mt-1 flex items-center gap-2"><StatusBadge statut={record.statut} /> {record.modifiePar && <span className="text-xs text-graphite-400">modifié par {record.modifiePar}</span>}</div>
        </div>
        <Field label="Heure d'arrivée">
          <input type="time" className="input" value={heure} onChange={(e) => setHeure(e.target.value)} />
        </Field>
        {computed && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-graphite-400">Nouveau statut :</span>
            <StatusBadge statut={computed.statut} />
            {computed.retardMinutes > 0 && <span className="text-amber-600">{minutesToHuman(computed.retardMinutes)}</span>}
          </div>
        )}
        <p className="text-xs text-graphite-400">La correction est tracée dans le journal d'audit avec l'ancienne et la nouvelle valeur.</p>
      </div>
    </Modal>
  );
}
