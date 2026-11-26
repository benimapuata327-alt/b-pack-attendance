// Business logic shared between local and Laravel modes.
// Matricule generation + attendance status calculation.

import type { AttendanceStatus, ShiftKey } from '@/types';
import type { AppSettings } from '@/types';

/**
 * Generate an agent matricule based on the team code.
 * Format: BPACK-{TEAM}-{NNN}  e.g. BPACK-A-001
 * - No duplicates (caller checks existing list).
 * - Safe for concurrent creation (sequence determined server-side / lock in Laravel).
 * - Preserved when agent changes teams (matricule is immutable once assigned).
 */
export function generateMatricule(
  teamCode: string | null,
  existing: string[],
): string {
  const code = (teamCode || 'X').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prefix = `BPACK-${code}-`;
  const used = existing
    .filter((m) => m.startsWith(prefix))
    .map((m) => parseInt(m.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export function generateUserMatricule(existing: string[]): string {
  const prefix = 'BPACK-U-';
  const used = existing
    .filter((m) => m.startsWith(prefix))
    .map((m) => parseInt(m.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

/**
 * Compute attendance status from arrival time and shift.
 * Rules:
 *  - Morning starts 07:00, Evening 15:00, Night 23:00.
 *  - Grace period: 15 minutes (arrival exactly 15:00 after start still tolerated).
 *  - Arrival after grace -> RETARD with exact lateness minutes.
 *  - No arrival -> ABSENT.
 */
export function computeStatus(
  arrival: string | null,
  shift: ShiftKey,
  graceMinutes: number,
): { statut: AttendanceStatus; retardMinutes: number } {
  if (!arrival) return { statut: 'ABSENT', retardMinutes: 0 };
  const startHour = shift === 'MATIN' ? 7 : shift === 'SOIR' ? 15 : 23;
  const [h, m] = arrival.split(':').map(Number);
  const arrivalMin = h * 60 + m;
  const startMin = startHour * 60;
  const diff = arrivalMin - startMin;
  if (diff <= graceMinutes) return { statut: 'PRESENT', retardMinutes: 0 };
  return { statut: 'RETARD', retardMinutes: diff };
}

export function shiftStartHour(shift: ShiftKey): number {
  return shift === 'MATIN' ? 7 : shift === 'SOIR' ? 15 : 23;
}

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'PEAKING PLANT',
  partnerName: 'CONTIAG MANPOWER',
  gracePeriodMinutes: 15,
  whatsapp: { configured: false, recipients: [] },
  email: { configured: false, recipients: [] },
};

export function minutesToHuman(min: number): string {
  if (min <= 0) return '0 min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

export function fmtDateFR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTimeFR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}
