// Unified API service.
// Routes calls to the localStorage dev backend OR the Laravel REST client
// based on API_MODE in api/config.ts.

import { API_MODE } from './config';
import { laravelClient } from './client';
import { localDb, ensureSeed, localLogin, localLogout, localSetCurrentUser, localGetCurrentUser } from './localDb';
import { audit } from './localDb';
import type {
  Agent, Assignment, Attendance, AuditLog, BreakRecord, Notification,
  Position, Rotation, Team, User, AppSettings,
} from '@/types';

ensureSeed();

export const api = {
  mode: API_MODE,

  // ---------- Auth ----------
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    if (API_MODE === 'laravel') {
      const res = await laravelClient.post<{ user: User; token: string }>('/api/auth/login', { email, password });
      localSetCurrentUser(res.user);
      return res;
    }
    const r = localLogin(email, password);
    if (!r) throw new Error('Email ou mot de passe incorrect.');
    localSetCurrentUser(r.user);
    audit(r.user, 'CONNEXION', r.user.matricule);
    return r;
  },
  async logout(actor: User | null): Promise<void> {
    if (API_MODE === 'laravel') { await laravelClient.post('/api/auth/logout'); return; }
    if (actor) audit(actor, 'DÉCONNEXION', actor.matricule);
    localLogout();
  },
  async me(token: string): Promise<User | null> {
    if (API_MODE === 'laravel') return laravelClient.get<User>('/api/auth/me');
    return localGetCurrentUser(token);
  },

  // ---------- Settings ----------
  async getSettings(): Promise<AppSettings> {
    if (API_MODE === 'laravel') return laravelClient.get<AppSettings>('/api/settings');
    return localDb.getSettings();
  },
  async saveSettings(s: AppSettings, actor: User | null): Promise<AppSettings> {
    if (API_MODE === 'laravel') return laravelClient.put<AppSettings>('/api/settings', s);
    localDb.saveSettings(s);
    audit(actor, 'MODIFICATION PARAMÈTRES', 'settings');
    return s;
  },

  // ---------- Users ----------
  async listUsers(): Promise<User[]> {
    if (API_MODE === 'laravel') return laravelClient.get<User[]>('/api/users');
    return localDb.listUsers();
  },
  async createUser(data: Partial<User> & { password?: string }, actor: User | null): Promise<User> {
    if (API_MODE === 'laravel') return laravelClient.post<User>('/api/users', data);
    return localDb.createUser(data as never, actor);
  },
  async updateUser(id: string, patch: Partial<User>, actor: User | null): Promise<User | null> {
    if (API_MODE === 'laravel') return laravelClient.put<User>(`/api/users/${id}`, patch);
    return localDb.updateUser(id, patch, actor);
  },

  // ---------- Teams ----------
  async listTeams(): Promise<Team[]> {
    if (API_MODE === 'laravel') return laravelClient.get<Team[]>('/api/teams');
    return localDb.listTeams();
  },
  async createTeam(data: Pick<Team, 'code' | 'nom' | 'description'>, actor: User | null): Promise<Team> {
    if (API_MODE === 'laravel') return laravelClient.post<Team>('/api/teams', data);
    return localDb.createTeam(data, actor);
  },
  async updateTeam(id: string, patch: Partial<Team>, actor: User | null): Promise<Team | null> {
    if (API_MODE === 'laravel') return laravelClient.put<Team>(`/api/teams/${id}`, patch);
    return localDb.updateTeam(id, patch, actor);
  },
  async teamMembers(teamId: string): Promise<Agent[]> {
    if (API_MODE === 'laravel') return laravelClient.get<Agent[]>(`/api/teams/${teamId}/members`);
    return localDb.teamMembers(teamId);
  },
  async teamStats(teamId: string) {
    if (API_MODE === 'laravel') return laravelClient.get<{ total: number; active: number; present: number; absent: number; late: number }>(`/api/teams/${teamId}/stats`);
    return localDb.teamStats(teamId);
  },

  // ---------- Positions ----------
  async listPositions(): Promise<Position[]> {
    if (API_MODE === 'laravel') return laravelClient.get<Position[]>('/api/positions');
    return localDb.listPositions();
  },
  async createPosition(data: Pick<Position, 'nom' | 'description'>, actor: User | null): Promise<Position> {
    if (API_MODE === 'laravel') return laravelClient.post<Position>('/api/positions', data);
    return localDb.createPosition(data, actor);
  },
  async updatePosition(id: string, patch: Partial<Position>, actor: User | null): Promise<Position | null> {
    if (API_MODE === 'laravel') return laravelClient.put<Position>(`/api/positions/${id}`, patch);
    return localDb.updatePosition(id, patch, actor);
  },

  // ---------- Rotations ----------
  async listRotations(): Promise<Rotation[]> {
    if (API_MODE === 'laravel') return laravelClient.get<Rotation[]>('/api/rotations');
    return localDb.listRotations();
  },
  async createRotation(data: Omit<Rotation, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, actor: User | null): Promise<Rotation> {
    if (API_MODE === 'laravel') return laravelClient.post<Rotation>('/api/rotations', data);
    return localDb.createRotation(data, actor);
  },
  async updateRotation(id: string, patch: Partial<Rotation>, actor: User | null): Promise<Rotation | null> {
    if (API_MODE === 'laravel') return laravelClient.put<Rotation>(`/api/rotations/${id}`, patch);
    return localDb.updateRotation(id, patch, actor);
  },

  // ---------- Agents ----------
  async listAgents(): Promise<Agent[]> {
    if (API_MODE === 'laravel') return laravelClient.get<Agent[]>('/api/agents');
    return localDb.listAgents();
  },
  async getAgent(id: string): Promise<Agent | null> {
    if (API_MODE === 'laravel') return laravelClient.get<Agent>(`/api/agents/${id}`);
    return localDb.getAgent(id);
  },
  async createAgent(data: Partial<Agent>, actor: User | null): Promise<Agent> {
    if (API_MODE === 'laravel') return laravelClient.post<Agent>('/api/agents', data);
    return localDb.createAgent(data as never, actor);
  },
  async updateAgent(id: string, patch: Partial<Agent>, actor: User | null): Promise<Agent | null> {
    if (API_MODE === 'laravel') return laravelClient.put<Agent>(`/api/agents/${id}`, patch);
    return localDb.updateAgent(id, patch, actor);
  },
  async toggleAgentStatus(id: string, actor: User | null): Promise<Agent | null> {
    if (API_MODE === 'laravel') return laravelClient.patch<Agent>(`/api/agents/${id}/toggle-status`);
    return localDb.toggleAgentStatus(id, actor);
  },
  async agentAttendanceHistory(agentId: string): Promise<Attendance[]> {
    if (API_MODE === 'laravel') return laravelClient.get<Attendance[]>(`/api/agents/${agentId}/attendance`);
    return localDb.agentAttendanceHistory(agentId);
  },

  // ---------- Assignments ----------
  async listAssignments(): Promise<Assignment[]> {
    if (API_MODE === 'laravel') return laravelClient.get<Assignment[]>('/api/assignments');
    return localDb.listAssignments();
  },
  async createAssignment(data: Partial<Assignment>, actor: User | null): Promise<Assignment> {
    if (API_MODE === 'laravel') return laravelClient.post<Assignment>('/api/assignments', data);
    return localDb.createAssignment(data as never, actor);
  },

  // ---------- Attendance ----------
  async listAttendance(): Promise<Attendance[]> {
    if (API_MODE === 'laravel') return laravelClient.get<Attendance[]>('/api/attendance');
    return localDb.listAttendance();
  },
  async saveCollectiveAttendance(records: Array<{ agentId: string; teamId: string; rotationId: string; serviceDate: string; shift: Attendance['shift']; heureArrivee: string | null }>, actor: User | null) {
    if (API_MODE === 'laravel') return laravelClient.post<{ created: number; skipped: number }>('/api/attendance/collective', { records });
    return localDb.saveCollectiveAttendance(records, actor);
  },
  async updateAttendance(id: string, patch: Partial<Attendance>, actor: User | null): Promise<Attendance | null> {
    if (API_MODE === 'laravel') return laravelClient.put<Attendance>(`/api/attendance/${id}`, patch);
    return localDb.updateAttendance(id, patch, actor);
  },

  // ---------- Breaks ----------
  async listBreaks(): Promise<BreakRecord[]> {
    if (API_MODE === 'laravel') return laravelClient.get<BreakRecord[]>('/api/breaks');
    return localDb.listBreaks();
  },
  async createBreak(data: Partial<BreakRecord>, actor: User | null): Promise<BreakRecord> {
    if (API_MODE === 'laravel') return laravelClient.post<BreakRecord>('/api/breaks', data);
    return localDb.createBreak(data as never, actor);
  },
  async updateBreak(id: string, patch: Partial<BreakRecord>, actor: User | null): Promise<BreakRecord | null> {
    if (API_MODE === 'laravel') return laravelClient.put<BreakRecord>(`/api/breaks/${id}`, patch);
    return localDb.updateBreak(id, patch, actor);
  },
  async deleteBreak(id: string, actor: User | null): Promise<void> {
    if (API_MODE === 'laravel') { await laravelClient.del(`/api/breaks/${id}`); return; }
    localDb.deleteBreak(id, actor);
  },

  // ---------- Notifications ----------
  async listNotifications(userId: string): Promise<Notification[]> {
    if (API_MODE === 'laravel') return laravelClient.get<Notification[]>(`/api/notifications?user=${userId}`);
    return localDb.listNotifications(userId);
  },
  async unreadCount(userId: string): Promise<number> {
    if (API_MODE === 'laravel') return laravelClient.get<number>(`/api/notifications/unread-count?user=${userId}`);
    return localDb.unreadCount(userId);
  },
  async markRead(id: string): Promise<void> {
    if (API_MODE === 'laravel') { await laravelClient.post(`/api/notifications/${id}/read`); return; }
    localDb.markRead(id);
  },
  async markAllRead(userId: string): Promise<void> {
    if (API_MODE === 'laravel') { await laravelClient.post('/api/notifications/read-all', { userId }); return; }
    localDb.markAllRead(userId);
  },
  async deleteNotification(id: string): Promise<void> {
    if (API_MODE === 'laravel') { await laravelClient.del(`/api/notifications/${id}`); return; }
    localDb.deleteNotification(id);
  },

  // ---------- Audit logs ----------
  async listAuditLogs(): Promise<AuditLog[]> {
    if (API_MODE === 'laravel') return laravelClient.get<AuditLog[]>('/api/audit-logs');
    return localDb.listAuditLogs();
  },
};
