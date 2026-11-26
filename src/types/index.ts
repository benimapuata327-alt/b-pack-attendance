// Domain types for B-PACK ATTENDANCE
// These mirror the Laravel/MySQL schema (see /database/schema.sql and /LARAVEL_API.md).

export type UserRole = 'ADMINISTRATEUR' | 'SURVEILLANT' | 'RESPONSABLE' | 'DIRECTION';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'RETARD';

export type AgentStatus = 'ACTIF' | 'INACTIF';

export type Gender = 'M' | 'F';

export type ShiftKey = 'MATIN' | 'SOIR' | 'NUIT';

export type NotificationCategory =
  | 'ATTENDANCE'
  | 'AGENT'
  | 'TEAM'
  | 'ASSIGNMENT'
  | 'ALERT'
  | 'SYSTEM';

export interface User {
  id: string;
  uuid: string;
  matricule: string; // e.g. BPACK-U-001
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  teamId: string | null; // for SURVEILLANT
  telephone?: string;
  actif: boolean;
  derniereConnexion?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  uuid: string;
  code: string; // A, B, C
  nom: string; // TEAM A
  description?: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  uuid: string;
  code: string;
  nom: string; // Ensacheur, Surveillant...
  description?: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Rotation {
  id: string;
  uuid: string;
  code: string; // MATIN, SOIR, NUIT
  nom: string;
  heureDebut: string; // "07:00"
  heureFin: string; // "15:00"
  chevauchementNuit: boolean; // true if end is next day
  dureeHeures: number;
  description?: string;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  uuid: string;
  matricule: string; // BPACK-A-001
  nom: string;
  nomDuMilieu?: string;
  prenom: string;
  genre: Gender;
  telephone?: string;
  adresse?: string;
  positionId: string | null;
  teamId: string | null;
  rotationId: string | null;
  dateRecrutement: string;
  statut: AgentStatus;
  // denormalized for display
  positionNom?: string;
  teamCode?: string;
  rotationCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  uuid: string;
  agentId: string;
  teamId: string;
  positionId: string | null;
  rotationId: string | null;
  dateDebut: string;
  dateFin: string | null; // null = current
  actif: boolean;
  // previous values kept for audit
  createdAt: string;
  updatedAt: string;
  // denormalized
  agentNom?: string;
  agentMatricule?: string;
  teamCode?: string;
  positionNom?: string;
  rotationCode?: string;
}

export interface Attendance {
  id: string;
  uuid: string;
  agentId: string;
  teamId: string;
  rotationId: string;
  serviceDate: string; // YYYY-MM-DD (the date shift STARTED)
  shift: ShiftKey;
  heureArrivee: string | null; // "HH:mm" or null if absent
  statut: AttendanceStatus;
  retardMinutes: number; // minutes late, 0 if present/absent
  remarque?: string;
  modifiePar?: string | null;
  modifieLe?: string | null;
  createdAt: string;
  updatedAt: string;
  // denormalized
  agentNom?: string;
  agentMatricule?: string;
  teamCode?: string;
  rotationCode?: string;
  positionNom?: string;
}

export interface BreakRecord {
  id: string;
  uuid: string;
  agentId: string;
  date: string; // YYYY-MM-DD
  heureDebut: string; // HH:mm
  heureFin: string | null; // HH:mm
  dureeMinutes: number | null;
  remarque?: string;
  createdAt: string;
  updatedAt: string;
  agentNom?: string;
  agentMatricule?: string;
}

export interface Notification {
  id: string;
  uuid: string;
  destinataireId: string; // user id, or '*' for all
  category: NotificationCategory;
  titre: string;
  message: string;
  lue: boolean;
  dateLecture?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  uuid: string;
  userId: string;
  userNom: string;
  action: string;
  cible: string; // record reference
  valeursPrecedentes?: Record<string, unknown> | null;
  nouvellesValeurs?: Record<string, unknown> | null;
  createdAt: string;
}

export interface WhatsAppConfig {
  configured: boolean;
  phoneNumberId?: string;
  wabaId?: string;
  recipients: { label: string; phone: string; role: UserRole }[];
}

export interface EmailConfig {
  configured: boolean;
  smtpHost?: string;
  fromAddress?: string;
  recipients: string[];
}

export interface AppSettings {
  whatsapp: WhatsAppConfig;
  email: EmailConfig;
  gracePeriodMinutes: number;
  companyName: string;
  partnerName: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

export interface ApiResult<T> {
  data: T;
}

export interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}
