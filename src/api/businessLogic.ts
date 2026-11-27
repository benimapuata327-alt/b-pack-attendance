
import type { AttendanceStatus, ShiftKey, AppSettings } from '@/types';

export function generateMatricule(teamCode: string | null, existing: string[]): string {
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

export function computeStatus(
  arrival: string | null,
  shift: ShiftKey,
  graceMinutes: number,
): { statut: AttendanceStatus; retardMinutes: number } {
  if (!arrival) return { statut: 'ABSENT', retardMinutes: 0 };

  const startHour = shift === 'MATIN' ? 7 : shift === 'SOIR' ? 15 : 23;
  const [h, m] = arrival.split(':').map(Number);

  let arrivalMin = h * 60 + m;
  const startMin = startHour * 60;

  // Une arrivée après minuit appartient toujours au service de nuit.
  if (shift === 'NUIT' && arrivalMin < 7 * 60) {
    arrivalMin += 24 * 60;
  }

  const diff = arrivalMin - startMin;

  if (diff <= graceMinutes) {
    return { statut: 'PRESENT', retardMinutes: 0 };
  }

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
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
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
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}
