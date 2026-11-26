// LocalStorage development backend for B-PACK ATTENDANCE.
// Fully functional in-browser persistence so every module works before Laravel is connected.
// When API_MODE === 'laravel', this is not used — see api/client.ts.

import type {
  Agent, Assignment, Attendance, AuditLog, BreakRecord, Notification,
  Position, Rotation, Team, User, AppSettings,
} from '@/types';
import { uid } from './config';
import {
  computeStatus, generateMatricule, generateUserMatricule,
  DEFAULT_SETTINGS, todayISO,
} from './businessLogic';

const NS = 'bpack_db_v1';
const TOKEN_NS = 'bpack_local_token';

interface DBShape {
  users: User[];
  teams: Team[];
  positions: Position[];
  rotations: Rotation[];
  agents: Agent[];
  assignments: Assignment[];
  attendance: Attendance[];
  breaks: BreakRecord[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  settings: AppSettings;
  seeded: boolean;
}

function load(): DBShape {
  const raw = localStorage.getItem(NS);
  if (raw) {
    try { return JSON.parse(raw) as DBShape; } catch { /* fallthrough */ }
  }
  const fresh: DBShape = {
    users: [], teams: [], positions: [], rotations: [], agents: [],
    assignments: [], attendance: [], breaks: [], notifications: [],
    auditLogs: [], settings: DEFAULT_SETTINGS, seeded: false,
  };
  return fresh;
}

let db: DBShape = load();

function persist(): void {
  localStorage.setItem(NS, JSON.stringify(db));
}

function nowISO(): string { return new Date().toISOString(); }

// ---------- Seeding ----------
export function ensureSeed(): void {
  if (db.seeded) return;

  // Teams
  const teams: Team[] = [
    { id: uid(), uuid: uid(), code: 'A', nom: 'TEAM A', description: 'Équipe A', actif: true, createdAt: nowISO(), updatedAt: nowISO() },
    { id: uid(), uuid: uid(), code: 'B', nom: 'TEAM B', description: 'Équipe B', actif: true, createdAt: nowISO(), updatedAt: nowISO() },
    { id: uid(), uuid: uid(), code: 'C', nom: 'TEAM C', description: 'Équipe C', actif: true, createdAt: nowISO(), updatedAt: nowISO() },
  ];

  // Positions
  const positions: Position[] = [
    'Ensacheur', 'Surveillant', 'Manipulateur', 'Nettoyeur', '4 becs',
  ].map((nom) => ({
    id: uid(), uuid: uid(), code: nom.toUpperCase().replace(/[^A-Z0-9]/g, '-'),
    nom, description: '', actif: true, createdAt: nowISO(), updatedAt: nowISO(),
  }));

  // Rotations
  const rotations: Rotation[] = [
    { id: uid(), uuid: uid(), code: 'MATIN', nom: 'Matin', heureDebut: '07:00', heureFin: '15:00', chevauchementNuit: false, dureeHeures: 8, actif: true, createdAt: nowISO(), updatedAt: nowISO() },
    { id: uid(), uuid: uid(), code: 'SOIR', nom: 'Soir', heureDebut: '15:00', heureFin: '23:00', chevauchementNuit: false, dureeHeures: 8, actif: true, createdAt: nowISO(), updatedAt: nowISO() },
    { id: uid(), uuid: uid(), code: 'NUIT', nom: 'Nuit', heureDebut: '23:00', heureFin: '07:00', chevauchementNuit: true, dureeHeures: 8, actif: true, createdAt: nowISO(), updatedAt: nowISO() },
  ];

  // Users
  const users: User[] = [
    {
      id: uid(), uuid: uid(), matricule: 'BPACK-U-001',
      nom: 'Admin', prenom: 'Principal', email: 'admin@bpack.ci',
      role: 'ADMINISTRATEUR', teamId: null, telephone: '', actif: true,
      createdAt: nowISO(), updatedAt: nowISO(),
    },
    {
      id: uid(), uuid: uid(), matricule: 'BPACK-U-002',
      nom: 'Surveillant', prenom: 'Team A', email: 'surv.a@bpack.ci',
      role: 'SURVEILLANT', teamId: teams[0].id, telephone: '', actif: true,
      createdAt: nowISO(), updatedAt: nowISO(),
    },
    {
      id: uid(), uuid: uid(), matricule: 'BPACK-U-003',
      nom: 'Responsable', prenom: 'Production', email: 'resp@bpack.ci',
      role: 'RESPONSABLE', teamId: null, telephone: '', actif: true,
      createdAt: nowISO(), updatedAt: nowISO(),
    },
    {
      id: uid(), uuid: uid(), matricule: 'BPACK-U-004',
      nom: 'Direction', prenom: 'Generale', email: 'direction@bpack.ci',
      role: 'DIRECTION', teamId: null, telephone: '', actif: true,
      createdAt: nowISO(), updatedAt: nowISO(),
    },
  ];

  // Passwords stored separately for local mode (never in production-grade Laravel — there they are hashed server-side).
  const passwords: Record<string, string> = {
    'admin@bpack.ci': 'password',
    'surv.a@bpack.ci': 'password',
    'resp@bpack.ci': 'password',
    'direction@bpack.ci': 'password',
  };
  localStorage.setItem('bpack_local_pw', JSON.stringify(passwords));

  db = { ...db, teams, positions, rotations, users, seeded: true };
  persist();
}

// ---------- Auth (local) ----------
export function localLogin(email: string, password: string): { user: User; token: string } | null {
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.actif);
  if (!user) return null;
  const pw = JSON.parse(localStorage.getItem('bpack_local_pw') || '{}');
  if (pw[user.email] !== password) return null;
  const token = `local.${uid()}`;
  localStorage.setItem(TOKEN_NS, token);
  user.derniereConnexion = nowISO();
  user.updatedAt = nowISO();
  persist();
  return { user, token };
}

export function localLogout(): void {
  localStorage.removeItem(TOKEN_NS);
}

export function localGetCurrentUser(token: string): User | null {
  if (!token.startsWith('local.')) return null;
  const raw = localStorage.getItem('bpack_current_user');
  return raw ? (JSON.parse(raw) as User) : null;
}

export function localSetCurrentUser(user: User): void {
  localStorage.setItem('bpack_current_user', JSON.stringify(user));
}

// ---------- Generic CRUD helpers ----------
function enrichAgent(a: Agent): Agent {
  return {
    ...a,
    positionNom: db.positions.find((p) => p.id === a.positionId)?.nom,
    teamCode: db.teams.find((t) => t.id === a.teamId)?.code,
    rotationCode: db.rotations.find((r) => r.id === a.rotationId)?.code,
  };
}

function enrichAssignment(a: Assignment): Assignment {
  const ag = db.agents.find((x) => x.id === a.agentId);
  return {
    ...a,
    agentNom: ag ? `${ag.prenom} ${ag.nom}` : undefined,
    agentMatricule: ag?.matricule,
    teamCode: db.teams.find((t) => t.id === a.teamId)?.code,
    positionNom: db.positions.find((p) => p.id === a.positionId)?.nom,
    rotationCode: db.rotations.find((r) => r.id === a.rotationId)?.code,
  };
}

function enrichAttendance(r: Attendance): Attendance {
  const ag = db.agents.find((x) => x.id === r.agentId);
  return {
    ...r,
    agentNom: ag ? `${ag.prenom} ${ag.nom}` : undefined,
    agentMatricule: ag?.matricule,
    teamCode: db.teams.find((t) => t.id === r.teamId)?.code,
    rotationCode: db.rotations.find((r2) => r2.id === r.rotationId)?.code,
    positionNom: ag ? db.positions.find((p) => p.id === ag.positionId)?.nom : undefined,
  };
}

// ---------- Notifications / Audit ----------
function notify(
  destinataireId: string,
  category: Notification['category'],
  titre: string,
  message: string,
): void {
  db.notifications.unshift({
    id: uid(), uuid: uid(), destinataireId, category, titre, message,
    lue: false, createdAt: nowISO(),
  });
}

function notifyByRole(role: User['role'] | 'ALL', category: Notification['category'], titre: string, message: string): void {
  const targets = role === 'ALL' ? db.users : db.users.filter((u) => u.role === role && u.actif);
  for (const u of targets) notify(u.id, category, titre, message);
}

export function audit(
  user: { id: string; nom: string; prenom: string } | null,
  action: string,
  cible: string,
  valeursPrecedentes?: Record<string, unknown> | null,
  nouvellesValeurs?: Record<string, unknown> | null,
): void {
  db.auditLogs.unshift({
    id: uid(), uuid: uid(),
    userId: user?.id ?? 'system', userNom: user ? `${user.prenom} ${user.nom}` : 'Système',
    action, cible, valeursPrecedentes, nouvellesValeurs,
    createdAt: nowISO(),
  });
  persist();
}

// ---------- Public API (local) ----------
export const localDb = {
  // Settings
  getSettings(): AppSettings { return db.settings; },
  saveSettings(s: AppSettings): void { db.settings = s; persist(); },

  // Users
  listUsers(): User[] { return [...db.users]; },
  createUser(data: Omit<User, 'id' | 'uuid' | 'matricule' | 'createdAt' | 'updatedAt'>, actor: User | null): User {
    const existing = db.users.map((u) => u.matricule);
    const user: User = {
      ...data,
      id: uid(), uuid: uid(),
      matricule: generateUserMatricule(existing),
      createdAt: nowISO(), updatedAt: nowISO(),
    };
    db.users.push(user);
    const pw = JSON.parse(localStorage.getItem('bpack_local_pw') || '{}');
    pw[user.email] = (data as unknown as { password?: string }).password ?? 'password';
    localStorage.setItem('bpack_local_pw', JSON.stringify(pw));
    audit(actor, 'CREATION UTILISATEUR', user.matricule, null, { role: user.role, email: user.email });
    notifyByRole('ADMINISTRATEUR', 'SYSTEM', 'Nouvel utilisateur', `${user.prenom} ${user.nom} (${user.matricule}) créé.`);
    persist();
    return user;
  },
  updateUser(id: string, patch: Partial<User>, actor: User | null): User | null {
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx < 0) return null;
    const prev = { ...db.users[idx] };
    db.users[idx] = { ...db.users[idx], ...patch, updatedAt: nowISO() };
    audit(actor, 'MODIFICATION UTILISATEUR', db.users[idx].matricule, prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>);
    persist();
    return db.users[idx];
  },

  // Teams
  listTeams(): Team[] { return [...db.teams]; },
  createTeam(data: Pick<Team, 'code' | 'nom' | 'description'>, actor: User | null): Team {
    const team: Team = {
      ...data, id: uid(), uuid: uid(), actif: true,
      createdAt: nowISO(), updatedAt: nowISO(),
    };
    db.teams.push(team);
    audit(actor, 'CREATION ÉQUIPE', team.nom, null, { code: team.code });
    notifyByRole('ALL', 'TEAM', 'Nouvelle équipe', `L'équipe ${team.nom} a été créée.`);
    persist();
    return team;
  },
  updateTeam(id: string, patch: Partial<Team>, actor: User | null): Team | null {
    const idx = db.teams.findIndex((t) => t.id === id);
    if (idx < 0) return null;
    const prev = { ...db.teams[idx] };
    db.teams[idx] = { ...db.teams[idx], ...patch, updatedAt: nowISO() };
    audit(actor, 'MODIFICATION ÉQUIPE', db.teams[idx].nom, prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>);
    notifyByRole('ALL', 'TEAM', 'Équipe modifiée', `L'équipe ${db.teams[idx].nom} a été mise à jour.`);
    persist();
    return db.teams[idx];
  },
  teamMembers(teamId: string): Agent[] {
    return db.agents.filter((a) => a.teamId === teamId).map(enrichAgent);
  },
  teamStats(teamId: string) {
    const members = db.agents.filter((a) => a.teamId === teamId);
    const active = members.filter((a) => a.statut === 'ACTIF').length;
    const today = todayISO();
    const todayRecords = db.attendance.filter((r) => r.teamId === teamId && r.serviceDate === today);
    const present = todayRecords.filter((r) => r.statut === 'PRESENT').length;
    const absent = todayRecords.filter((r) => r.statut === 'ABSENT').length;
    const late = todayRecords.filter((r) => r.statut === 'RETARD').length;
    return { total: members.length, active, present, absent, late };
  },

  // Positions
  listPositions(): Position[] { return [...db.positions]; },
  createPosition(data: Pick<Position, 'nom' | 'description'>, actor: User | null): Position {
    const pos: Position = {
      ...data, id: uid(), uuid: uid(),
      code: data.nom.toUpperCase().replace(/[^A-Z0-9]/g, '-'),
      actif: true, createdAt: nowISO(), updatedAt: nowISO(),
    };
    db.positions.push(pos);
    audit(actor, 'CREATION POSTE', pos.nom, null, { nom: pos.nom });
    persist();
    return pos;
  },
  updatePosition(id: string, patch: Partial<Position>, actor: User | null): Position | null {
    const idx = db.positions.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    const prev = { ...db.positions[idx] };
    db.positions[idx] = { ...db.positions[idx], ...patch, updatedAt: nowISO() };
    audit(actor, 'MODIFICATION POSTE', db.positions[idx].nom, prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>);
    persist();
    return db.positions[idx];
  },

  // Rotations
  listRotations(): Rotation[] { return [...db.rotations]; },
  createRotation(data: Omit<Rotation, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, actor: User | null): Rotation {
    const rot: Rotation = { ...data, id: uid(), uuid: uid(), createdAt: nowISO(), updatedAt: nowISO() };
    db.rotations.push(rot);
    audit(actor, 'CREATION ROTATION', rot.nom, null, { code: rot.code });
    persist();
    return rot;
  },
  updateRotation(id: string, patch: Partial<Rotation>, actor: User | null): Rotation | null {
    const idx = db.rotations.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    const prev = { ...db.rotations[idx] };
    db.rotations[idx] = { ...db.rotations[idx], ...patch, updatedAt: nowISO() };
    audit(actor, 'MODIFICATION ROTATION', db.rotations[idx].nom, prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>);
    persist();
    return db.rotations[idx];
  },

  // Agents
  listAgents(): Agent[] { return db.agents.map(enrichAgent); },
  getAgent(id: string): Agent | null {
    const a = db.agents.find((x) => x.id === id);
    return a ? enrichAgent(a) : null;
  },
  createAgent(
    data: Omit<Agent, 'id' | 'uuid' | 'matricule' | 'createdAt' | 'updatedAt' | 'statut'> & { statut?: Agent['statut'] },
    actor: User | null,
  ): Agent {
    const teamCode = db.teams.find((t) => t.id === data.teamId)?.code ?? null;
    const matricule = generateMatricule(teamCode, db.agents.map((a) => a.matricule));
    const agent: Agent = {
      ...data,
      statut: data.statut ?? 'ACTIF',
      id: uid(), uuid: uid(), matricule,
      createdAt: nowISO(), updatedAt: nowISO(),
    };
    db.agents.push(agent);
    // create initial assignment if team/position/rotation provided
    if (agent.teamId) {
      db.assignments.push({
        id: uid(), uuid: uid(), agentId: agent.id, teamId: agent.teamId,
        positionId: agent.positionId, rotationId: agent.rotationId,
        dateDebut: todayISO(), dateFin: null, actif: true,
        createdAt: nowISO(), updatedAt: nowISO(),
      });
    }
    audit(actor, 'CREATION AGENT', agent.matricule, null, { nom: agent.nom, prenom: agent.prenom, teamCode });
    notifyByRole('ADMINISTRATEUR', 'AGENT', 'Nouvel agent', `${agent.prenom} ${agent.nom} (${agent.matricule}) ajouté.`);
    persist();
    return enrichAgent(agent);
  },
  updateAgent(id: string, patch: Partial<Agent>, actor: User | null): Agent | null {
    const idx = db.agents.findIndex((a) => a.id === id);
    if (idx < 0) return null;
    const prev = { ...db.agents[idx] };
    db.agents[idx] = { ...db.agents[idx], ...patch, updatedAt: nowISO() };
    audit(actor, 'MODIFICATION AGENT', db.agents[idx].matricule, prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>);
    notifyByRole('ADMINISTRATEUR', 'AGENT', 'Agent modifié', `Les informations de ${db.agents[idx].prenom} ${db.agents[idx].nom} ont été mises à jour.`);
    persist();
    return enrichAgent(db.agents[idx]);
  },
  toggleAgentStatus(id: string, actor: User | null): Agent | null {
    const a = db.agents.find((x) => x.id === id);
    if (!a) return null;
    const newStatut = a.statut === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    const prev = { ...a };
    a.statut = newStatut;
    a.updatedAt = nowISO();
    audit(actor, newStatut === 'INACTIF' ? 'DÉSACTIVATION AGENT' : 'ACTIVATION AGENT', a.matricule, { statut: prev.statut }, { statut: newStatut });
    notifyByRole('ADMINISTRATEUR', 'AGENT', 'Statut agent modifié', `${a.prenom} ${a.nom} est désormais ${newStatut === 'ACTIF' ? 'actif' : 'inactif'}.`);
    persist();
    return enrichAgent(a);
  },
  agentAttendanceHistory(agentId: string): Attendance[] {
    return db.attendance.filter((r) => r.agentId === agentId).map(enrichAttendance);
  },

  // Assignments
  listAssignments(): Assignment[] { return db.assignments.map(enrichAssignment); },
  createAssignment(data: Omit<Assignment, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, actor: User | null): Assignment {
    // close previous active assignment for the agent
    for (const a of db.assignments) {
      if (a.agentId === data.agentId && a.actif) {
        a.actif = false; a.dateFin = data.dateDebut; a.updatedAt = nowISO();
      }
    }
    const assignment: Assignment = { ...data, id: uid(), uuid: uid(), createdAt: nowISO(), updatedAt: nowISO() };
    db.assignments.push(assignment);
    // update agent's current team/position/rotation
    const ag = db.agents.find((x) => x.id === data.agentId);
    if (ag) {
      ag.teamId = data.teamId; ag.positionId = data.positionId; ag.rotationId = data.rotationId;
      ag.updatedAt = nowISO();
      // matricule preserved on team change (immutable)
    }
    audit(actor, 'AFFECTATION', assignment.agentId, null, { teamId: data.teamId, positionId: data.positionId, rotationId: data.rotationId });
    notifyByRole('ADMINISTRATEUR', 'ASSIGNMENT', 'Nouvelle affectation', `Agent ${ag?.matricule ?? ''} affecté à ${db.teams.find((t) => t.id === data.teamId)?.nom ?? ''}.`);
    persist();
    return enrichAssignment(assignment);
  },

  // Attendance
  listAttendance(): Attendance[] { return db.attendance.map(enrichAttendance); },
  saveCollectiveAttendance(
    records: Array<{ agentId: string; teamId: string; rotationId: string; serviceDate: string; shift: Attendance['shift']; heureArrivee: string | null }>,
    actor: User | null,
  ): { created: number; skipped: number } {
    let created = 0, skipped = 0;
    for (const rec of records) {
      // prevent duplicates: same agent + service date + shift
      const dup = db.attendance.find(
        (r) => r.agentId === rec.agentId && r.serviceDate === rec.serviceDate && r.shift === rec.shift,
      );
      if (dup) { skipped++; continue; }
      const { statut, retardMinutes } = computeStatus(rec.heureArrivee, rec.shift, db.settings.gracePeriodMinutes);
      const rec2: Attendance = {
        id: uid(), uuid: uid(),
        agentId: rec.agentId, teamId: rec.teamId, rotationId: rec.rotationId,
        serviceDate: rec.serviceDate, shift: rec.shift,
        heureArrivee: rec.heureArrivee, statut, retardMinutes,
        createdAt: nowISO(), updatedAt: nowISO(),
      };
      db.attendance.push(rec2);
      created++;
      const ag = db.agents.find((a) => a.id === rec.agentId);
      notifyByRole('ADMINISTRATEUR', 'ATTENDANCE', 'Pointage enregistré', `${ag?.matricule ?? ''} — ${statut}${statut === 'RETARD' ? ` (${retardMinutes} min)` : ''} le ${rec.serviceDate}.`);
      if (statut === 'ABSENT') notifyByRole('RESPONSABLE', 'ALERT', 'Absence enregistrée', `${ag?.matricule ?? ''} absent le ${rec.serviceDate}.`);
      if (statut === 'RETARD') notifyByRole('RESPONSABLE', 'ALERT', 'Retard enregistré', `${ag?.matricule ?? ''} en retard de ${retardMinutes} min le ${rec.serviceDate}.`);
    }
    audit(actor, 'CREATION POINTAGE', `${created} enregistrement(s)`, null, { date: records[0]?.serviceDate });
    persist();
    return { created, skipped };
  },
  updateAttendance(id: string, patch: Partial<Attendance>, actor: User | null): Attendance | null {
    const idx = db.attendance.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    const prev = { ...db.attendance[idx] };
    const merged = { ...db.attendance[idx], ...patch };
    if (patch.heureArrivee !== undefined) {
      const { statut, retardMinutes } = computeStatus(patch.heureArrivee, merged.shift, db.settings.gracePeriodMinutes);
      merged.statut = statut; merged.retardMinutes = retardMinutes;
    }
    merged.modifiePar = actor ? `${actor.prenom} ${actor.nom}` : null;
    merged.modifieLe = nowISO();
    merged.updatedAt = nowISO();
    db.attendance[idx] = merged;
    audit(actor, 'MODIFICATION POINTAGE', merged.uuid, prev as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>);
    notifyByRole('ADMINISTRATEUR', 'ATTENDANCE', 'Pointage modifié', `Enregistrement ${merged.uuid} corrigé par ${actor?.prenom ?? ''}.`);
    persist();
    return enrichAttendance(merged);
  },

  // Breaks
  listBreaks(): BreakRecord[] {
    return db.breaks.map((b) => ({
      ...b,
      agentNom: db.agents.find((a) => a.id === b.agentId) ? `${db.agents.find((a) => a.id === b.agentId)!.prenom} ${db.agents.find((a) => a.id === b.agentId)!.nom}` : undefined,
      agentMatricule: db.agents.find((a) => a.id === b.agentId)?.matricule,
    }));
  },
  createBreak(data: Omit<BreakRecord, 'id' | 'uuid' | 'createdAt' | 'updatedAt' | 'dureeMinutes'> & { dureeMinutes?: number | null }, actor: User | null): BreakRecord {
    let duree = data.dureeMinutes ?? null;
    if (data.heureFin && data.heureDebut) {
      const [h1, m1] = data.heureDebut.split(':').map(Number);
      const [h2, m2] = data.heureFin.split(':').map(Number);
      let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (mins < 0) mins += 24 * 60; // overnight break
      duree = mins;
    }
    const rec: BreakRecord = {
      ...data, dureeMinutes: duree,
      id: uid(), uuid: uid(), createdAt: nowISO(), updatedAt: nowISO(),
    };
    db.breaks.push(rec);
    audit(actor, 'CREATION PAUSE', rec.uuid, null, { agentId: rec.agentId });
    persist();
    return rec;
  },
  updateBreak(id: string, patch: Partial<BreakRecord>, actor: User | null): BreakRecord | null {
    const idx = db.breaks.findIndex((b) => b.id === id);
    if (idx < 0) return null;
    const prev = { ...db.breaks[idx] };
    const merged = { ...db.breaks[idx], ...patch, updatedAt: nowISO() };
    if (patch.heureFin && merged.heureFin && merged.heureDebut) {
      const [h1, m1] = merged.heureDebut.split(':').map(Number);
      const [h2, m2] = merged.heureFin.split(':').map(Number);
      let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (mins < 0) mins += 24 * 60;
      merged.dureeMinutes = mins;
    }
    db.breaks[idx] = merged;
    audit(actor, 'MODIFICATION PAUSE', merged.uuid, prev as unknown as Record<string, unknown>, patch as unknown as Record<string, unknown>);
    persist();
    return merged;
  },
  deleteBreak(id: string, actor: User | null): void {
    const b = db.breaks.find((x) => x.id === id);
    if (!b) return;
    db.breaks = db.breaks.filter((x) => x.id !== id);
    audit(actor, 'SUPPRESSION PAUSE', b.uuid, null, null);
    persist();
  },

  // Notifications
  listNotifications(userId: string): Notification[] {
    return db.notifications.filter((n) => n.destinataireId === userId || n.destinataireId === '*');
  },
  unreadCount(userId: string): number {
    return db.notifications.filter((n) => (n.destinataireId === userId || n.destinataireId === '*') && !n.lue).length;
  },
  markRead(id: string): void {
    const n = db.notifications.find((x) => x.id === id);
    if (n) { n.lue = true; n.dateLecture = nowISO(); persist(); }
  },
  markAllRead(userId: string): void {
    for (const n of db.notifications) {
      if (n.destinataireId === userId || n.destinataireId === '*') { n.lue = true; n.dateLecture = nowISO(); }
    }
    persist();
  },
  deleteNotification(id: string): void {
    db.notifications = db.notifications.filter((n) => n.id !== id);
    persist();
  },

  // Audit logs
  listAuditLogs(): AuditLog[] { return [...db.auditLogs]; },

  // Reset (dev helper, not exposed in UI)
  reset(): void { localStorage.removeItem(NS); localStorage.removeItem(TOKEN_NS); db = load(); ensureSeed(); },
};
