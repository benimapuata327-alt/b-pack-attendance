// Role-based access control. Central permission map.
import type { UserRole } from '@/types';

export type PermissionKey =
  | 'dashboard.view'
  | 'agents.view' | 'agents.create' | 'agents.edit' | 'agents.toggle'
  | 'teams.view' | 'teams.create' | 'teams.edit'
  | 'positions.view' | 'positions.create' | 'positions.edit'
  | 'rotations.view' | 'rotations.create' | 'rotations.edit'
  | 'assignments.view' | 'assignments.create'
  | 'attendance.view' | 'attendance.create' | 'attendance.edit'
  | 'breaks.view' | 'breaks.create' | 'breaks.edit' | 'breaks.delete'
  | 'history.view'
  | 'reports.view'
  | 'notifications.view'
  | 'users.view' | 'users.create' | 'users.edit'
  | 'audit.view'
  | 'settings.view' | 'settings.edit';

const ALL: PermissionKey[] = [
  'dashboard.view',
  'agents.view', 'agents.create', 'agents.edit', 'agents.toggle',
  'teams.view', 'teams.create', 'teams.edit',
  'positions.view', 'positions.create', 'positions.edit',
  'rotations.view', 'rotations.create', 'rotations.edit',
  'assignments.view', 'assignments.create',
  'attendance.view', 'attendance.create', 'attendance.edit',
  'breaks.view', 'breaks.create', 'breaks.edit', 'breaks.delete',
  'history.view',
  'reports.view',
  'notifications.view',
  'users.view', 'users.create', 'users.edit',
  'audit.view',
  'settings.view', 'settings.edit',
];

const PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  ADMINISTRATEUR: ALL,
  SURVEILLANT: [
    'dashboard.view',
    'agents.view',
    'teams.view',
    'positions.view',
    'rotations.view',
    'attendance.view', 'attendance.create',
    'breaks.view', 'breaks.create',
    'history.view',
    'notifications.view',
  ],
  RESPONSABLE: [
    'dashboard.view',
    'agents.view',
    'teams.view',
    'positions.view',
    'rotations.view',
    'assignments.view',
    'attendance.view', 'attendance.edit',
    'breaks.view',
    'history.view',
    'reports.view',
    'notifications.view',
  ],
  DIRECTION: [
    'dashboard.view',
    'agents.view',
    'teams.view',
    'positions.view',
    'rotations.view',
    'assignments.view',
    'attendance.view',
    'breaks.view',
    'history.view',
    'reports.view',
    'notifications.view',
    'audit.view',
  ],
};

export function can(role: UserRole, perm: PermissionKey): boolean {
  return PERMISSIONS[role]?.includes(perm) ?? false;
}

export function canAny(role: UserRole, perms: PermissionKey[]): boolean {
  return perms.some((p) => can(role, p));
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRATEUR: 'Administrateur',
  SURVEILLANT: 'Surveillant',
  RESPONSABLE: 'Responsable',
  DIRECTION: 'Direction',
};

// Navigation modules a role is allowed to see.
export type ModuleKey =
  | 'dashboard' | 'agents' | 'teams' | 'positions' | 'rotations'
  | 'assignments' | 'attendance' | 'breaks' | 'history' | 'reports'
  | 'notifications' | 'users' | 'audit' | 'settings';

export const MODULE_PERMISSIONS: Record<ModuleKey, PermissionKey> = {
  dashboard: 'dashboard.view',
  agents: 'agents.view',
  teams: 'teams.view',
  positions: 'positions.view',
  rotations: 'rotations.view',
  assignments: 'assignments.view',
  attendance: 'attendance.view',
  breaks: 'breaks.view',
  history: 'history.view',
  reports: 'reports.view',
  notifications: 'notifications.view',
  users: 'users.view',
  audit: 'audit.view',
  settings: 'settings.view',
};

export function canAccessModule(role: UserRole, mod: ModuleKey): boolean {
  return can(role, MODULE_PERMISSIONS[mod]);
}
