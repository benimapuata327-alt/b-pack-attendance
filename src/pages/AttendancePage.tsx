
import { useMemo, useState } from 'react';
import {
  Fingerprint, Save, Calendar, UsersRound, Clock,
  CheckCircle2, AlertTriangle, Pencil
} from 'lucide-react';

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

import {
  computeStatus, fmtDateFR, todayISO, minutesToHuman
} from '@/api/businessLogic';

import type {
  Agent, Team, Rotation, Attendance, ShiftKey, AppSettings
} from '@/types';

interface RowState {
  agentId: string;
  heureArrivee: string;
  absent: boolean;
}

export function AttendancePage() {
  const { user, can } = useAuth();

  const teamsQ = useFetch<Team[]>(() => api.listTeams(), []);
  const rotationsQ = useFetch<Rotation[]>(() => api.listRotations(), []);
  const agentsQ = useFetch<Agent[]>(() => api.listAgents(), []);
  const attendanceQ = useFetch<Attendance[]>(() => api.listAttendance(), []);
  const settingsQ = useFetch<AppSettings>(() => api.getSettings(), []);

  const allowedTeams = useMemo(() => {
    const all = teamsQ.data ?? [];

    if (user?.role === 'SURVEILLANT' && user.teamId) {
      return all.filter((t) => t.id === user.teamId);
    }

    return all;
  }, [teamsQ.data, user]);

  const [serviceDate, setServiceDate] = useState(todayISO());
  const [teamId, setTeamId] = useState('');
  const [rotationId, setRotationId] = useState('');
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Attendance | null>(null);

  const selectedRotation = (rotationsQ.data ?? []).find(
    (r) => r.id === rotationId
  );

  const shift = (selectedRotation?.code ?? 'MATIN') as ShiftKey;
  const grace = settingsQ.data?.gracePeriodMinutes ?? 15;

  const teamAgents = useMemo(() => {
    return (agentsQ.data ?? []).filter(
      (a) => a.statut === 'ACTIF' && a.teamId === teamId
    );
  }, [agentsQ.data, teamId]);

  const existing = useMemo(() => {
    return (attendanceQ.data ?? []).filter(
      (r) =>
        r.serviceDate === serviceDate &&
        r.teamId === teamId &&
        r.shift === shift
    );
  }, [attendanceQ.data, serviceDate, teamId, shift]);

  const existingByAgent = useMemo(() => {
    const map: Record<string, Attendance> = {};

    for (const record of existing) {
      map[record.agentId] = record;
    }

    return map;
  }, [existing]);

  const preview = useMemo(() => {
    return teamAgents.map((agent) => {
      const row = rows[agent.id];
      const arrival = row?.heureArrivee ?? '';
      const isAbsent = row?.absent ?? false;

      let computed = null;

      if (isAbsent) {
        computed = { statut: 'ABSENT' as const, retardMinutes: 0 };
      } else if (arrival) {
        computed = computeStatus(arrival, shift, grace);
      }

      return {
        agent,
        arrival,
        computed,
        already: existingByAgent[agent.id],
        isAbsent,
      };
    });
  }, [teamAgents, rows, shift, grace, existingByAgent]);

  const presentCount = preview.filter(
    (p) => p.computed?.statut === 'PRESENT'
  ).length;

  const lateCount = preview.filter(
    (p) => p.computed?.statut === 'RETARD'
  ).length;

  const absentCount = preview.filter(
    (p) => p.computed?.statut === 'ABSENT'
  ).length;

  const pendingCount = preview.filter(
    (p) => !p.computed && !p.already
  ).length;

  const setArrival = (agentId: string, heure: string) => {
    setRows((current) => ({
      ...current,
      [agentId]: {
        agentId,
        heureArrivee: heure,
        absent: false,
      },
    }));
  };

  const markAbsent = (agentId: string) => {
    setRows((current) => ({
      ...current,
      [agentId]: {
        agentId,
        heureArrivee: '',
        absent: true,
      },
    }));
  };

  const fillAllNow = () => {
    const now = new Date().toTimeString().slice(0, 5);
    const next: Record<string, RowState> = {};

    for (const agent of teamAgents) {
      if (!existingByAgent[agent.id]) {
        next[agent.id] = {
          agentId: agent.id,
          heureArrivee: now,
          absent: false,
        };
      }
    }

    setRows((current) => ({ ...current, ...next }));

    toast('success', 'Heure actuelle appliquée aux agents non encore pointés.');
  };

  const onSave = async () => {
    if (!teamId || !rotationId || !serviceDate) {
      toast('error', 'Veuillez sélectionner la date, l’équipe et la rotation.');
      return;
    }

    if (pendingCount > 0) {
      toast('error', `Il reste ${pendingCount} agent(s) sans statut. Saisissez leur heure ou marquez-les absents.`);
      setConfirmOpen(false);
      return;
    }

    const records = preview
      .filter((p) => !p.already)
      .map((p) => ({
        agentId: p.agent.id,
        teamId,
        rotationId,
        serviceDate,
        shift,
        heureArrivee: p.isAbsent ? null : p.arrival || null,
      }));

    if (records.length === 0) {
      toast('info', 'Tous les agents de cette équipe ont déjà été pointés.');
      setConfirmOpen(false);
      return;
    }

    setSaving(true);

    try {
      const result = await api.saveCollectiveAttendance(records, user);

      toast(
        'success',
        `${result.created} pointage(s) enregistré(s), ${result.skipped} doublon(s) ignoré(s).`
      );

      setRows({});
      attendanceQ.refresh();
    } catch (error) {
      toast(
        'error',
        error instanceof Error ? error.message : 'Erreur lors de l’enregistrement.'
      );
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const onSaveEdit = async (heure: string) => {
    if (!editTarget) return;

    try {
      await api.updateAttendance(
        editTarget.id,
        { heureArrivee: heure || null },
        user
      );

      toast('success', 'Pointage corrigé avec succès.');
      setEditTarget(null);
      attendanceQ.refresh();
    } catch (error) {
      toast(
        'error',
        error instanceof Error ? error.message : 'Erreur de correction.'
      );
    }
  };

  const ready = Boolean(
    teamId && rotationId && teamAgents.length > 0
  );

  return (
    <div>
      <PageHeader
        title="Pointage collectif"
        subtitle="Sélectionnez la date, l'équipe et la rotation. Le statut est calculé automatiquement."
        icon={<Fingerprint className="w-5 h-5" />}
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label={<><Calendar className="w-3.5 h-3.5 inline mr-1" /> 1. Date de service</>}
            required
          >
            <Input
              type="date"
              required
              value={serviceDate}
              onChange={(e) => {
                setServiceDate(e.target.value);
                setRows({});
              }}
            />

            {shift === 'NUIT' && (
              <p className="text-xs text-amber-600 mt-1">
                La date correspond au jour de début du service de nuit.
              </p>
            )}
          </Field>

          <Field
            label={<><UsersRound className="w-3.5 h-3.5 inline mr-1" /> 2. Équipe</>}
            required
          >
            <Select
              required
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
                setRows({});
              }}
            >
              <option value="">— Choisir —</option>
              {allowedTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  TEAM {team.code}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={<><Clock className="w-3.5 h-3.5 inline mr-1" /> 3. Rotation</>}
            required
          >
            <Select
              required
              value={rotationId}
              onChange={(e) => {
                setRotationId(e.target.value);
                setRows({});
              }}
            >
              <option value="">— Choisir —</option>
              {(rotationsQ.data ?? []).map((rotation) => (
                <option key={rotation.id} value={rotation.id}>
                  {rotation.nom} ({rotation.heureDebut}-{rotation.heureFin})
                  {rotation.chevauchementNuit ? ' J+1' : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {!ready ? (
        <Card>
          <EmptyState
            title="En attente de sélection"
            description="Choisissez une équipe et une rotation pour afficher les agents à pointer."
            icon={<Fingerprint className="w-7 h-7" />}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              <p className="text-xs text-graphite-400">Présents</p>
            </div>

            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
              <p className="text-xs text-graphite-400">Retards</p>
            </div>

            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
              <p className="text-xs text-graphite-400">Absents</p>
            </div>

            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
              <p className="text-xs text-graphite-400">À pointer</p>
            </div>
          </div>

          <Card
            title={`Agents de TEAM ${
              (teamsQ.data ?? []).find((t) => t.id === teamId)?.code
            }`}
            subtitle={`${teamAgents.length} agent(s) actif(s) — tolérance ${grace} minutes`}
            actions={
              <Button variant="ghost" size="sm" onClick={fillAllNow}>
                Pointer maintenant
              </Button>
            }
          >
            {existing.length > 0 && (
              <div className="mb-4 flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  {existing.length} pointage(s) déjà enregistré(s).
                  Les doublons seront ignorés.
                </span>
              </div>
            )}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Matricule</th>
                    <th>Agent</th>
                    <th>Poste</th>
                    <th>Heure d'arrivée</th>
                    <th>Statut calculé</th>
                    <th>Retard</th>
                    <th>Existant</th>
                  </tr>
                </thead>

                <tbody>
                  {preview.map(({ agent, arrival, computed, already }) => (
                    <tr key={agent.id}>
                      <td className="font-mono font-semibold text-brand-600">
                        {agent.matricule}
                      </td>

                      <td className="font-medium text-graphite-600">
                        {agent.prenom} {agent.nom}
                      </td>

                      <td className="text-graphite-400">
                        {agent.positionNom ?? '—'}
                      </td>

                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            className="input w-32 py-1.5"
                            value={arrival}
                            disabled={Boolean(already)}
                            onChange={(e) => setArrival(agent.id, e.target.value)}
                          />

                          <button
                            type="button"
                            disabled={Boolean(already)}
                            onClick={() => markAbsent(agent.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                          >
                            Absent
                          </button>
                        </div>
                      </td>

                      <td>
                        {already ? (
                          <StatusBadge statut={already.statut} />
                        ) : computed ? (
                          <StatusBadge statut={computed.statut} />
                        ) : (
                          <span className="text-graphite-300 text-xs">
                            À pointer
                          </span>
                        )}
                      </td>

                      <td className="text-amber-600 font-medium">
                        {already
                          ? already.retardMinutes
                            ? minutesToHuman(already.retardMinutes)
                            : '—'
                          : computed?.retardMinutes
                            ? minutesToHuman(computed.retardMinutes)
                            : '—'}
                      </td>

                      <td>
                        {already ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge statut={already.statut} />

                            {can('attendance.edit') && (
                              <button
                                type="button"
                                onClick={() => setEditTarget(already)}
                                className="p-1 rounded text-graphite-400 hover:text-brand-600"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-graphite-300 text-xs">
                            Nouveau
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-graphite-100">
              <p className="text-sm text-graphite-400">
                <CheckCircle2 className="w-4 h-4 inline mr-1 text-green-500" />
                Tolérance configurée : {grace} minutes
              </p>

              {can('attendance.create') && (
                <Button
                  icon={<Save className="w-4 h-4" />}
                  loading={saving}
                  disabled={saving || pendingCount > 0}
                  onClick={() => setConfirmOpen(true)}
                >
                  Enregistrer le pointage
                </Button>
              )}
            </div>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onSave}
        title="Confirmer le pointage collectif"
        message={`Enregistrer les pointages pour le ${fmtDateFR(serviceDate)} — rotation ${shift} ?`}
        confirmLabel="Enregistrer"
      />

      {editTarget && (
        <EditAttendanceModal
          record={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={onSaveEdit}
        />
      )}
    </div>
  );
}

function EditAttendanceModal({
  record,
  onClose,
  onSave,
}: {
  record: Attendance;
  onClose: () => void;
  onSave: (heure: string) => void;
}) {
  const [heure, setHeure] = useState(record.heureArrivee ?? '');
  const [saving, setSaving] = useState(false);

  const computed = heure
    ? computeStatus(heure, record.shift, 15)
    : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(heure);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Corriger le pointage"
      subtitle={`${record.agentMatricule} — ${record.agentNom} (${fmtDateFR(record.serviceDate)})`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={saving} onClick={handleSave}>
            Corriger
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-graphite-50 rounded-lg p-3 text-sm">
          <p className="text-graphite-400">Statut actuel</p>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge statut={record.statut} />
            {record.modifiePar && (
              <span className="text-xs text-graphite-400">
                Modifié par {record.modifiePar}
              </span>
            )}
          </div>
        </div>

        <Field label="Heure d'arrivée">
          <input
            type="time"
            className="input"
            value={heure}
            onChange={(e) => setHeure(e.target.value)}
          />
        </Field>

        {computed && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-graphite-400">Nouveau statut :</span>
            <StatusBadge statut={computed.statut} />
            {computed.retardMinutes > 0 && (
              <span className="text-amber-600">
                {minutesToHuman(computed.retardMinutes)}
              </span>
            )}
          </div>
        )}

        <p className="text-xs text-graphite-400">
          La correction est enregistrée dans le journal d'audit.
        </p>
      </div>
    </Modal>
  );
}
