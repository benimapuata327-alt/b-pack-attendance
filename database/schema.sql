-- ============================================================
-- B-PACK ATTENDANCE — Schéma MySQL pour Laravel
-- PEAKING PLANT × CONTIAG MANPOWER
-- ------------------------------------------------------------
-- Ce fichier contient le schéma complet de la base MySQL.
-- À exécuter dans votre environnement Laragon (phpMyAdmin ou CLI).
-- Compatible MySQL 8 / MariaDB 10.4+.
--
-- Dans Laravel, créez les migrations équivalentes avec :
--   php artisan make:migration create_users_table
--   php artisan make:migration create_teams_table
--   ... etc.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------- Users ----------
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  matricule VARCHAR(20) NOT NULL UNIQUE,          -- BPACK-U-001
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  telephone VARCHAR(30) NULL,
  role ENUM('ADMINISTRATEUR','SURVEILLANT','RESPONSABLE','DIRECTION') NOT NULL DEFAULT 'SURVEILLANT',
  team_id BIGINT UNSIGNED NULL,
  password VARCHAR(255) NOT NULL,                 -- bcrypt hash
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  derniere_connexion DATETIME NULL,
  remember_token VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_team (team_id),
  CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Teams ----------
CREATE TABLE IF NOT EXISTS teams (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE,               -- A, B, C
  nom VARCHAR(100) NOT NULL,
  description TEXT NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- NOTE: users.team_id référence teams.id ; créez teams AVANT users
-- (en Laravel, ordonnez les migrations : teams avant users).

-- ---------- Positions ----------
CREATE TABLE IF NOT EXISTS positions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  code VARCHAR(30) NOT NULL UNIQUE,
  nom VARCHAR(100) NOT NULL,
  description TEXT NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Rotations ----------
CREATE TABLE IF NOT EXISTS rotations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE,               -- MATIN, SOIR, NUIT
  nom VARCHAR(50) NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  chevauchement_nuit BOOLEAN NOT NULL DEFAULT FALSE,
  duree_heures TINYINT NOT NULL DEFAULT 8,
  description TEXT NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Agents ----------
CREATE TABLE IF NOT EXISTS agents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  matricule VARCHAR(20) NOT NULL UNIQUE,          -- BPACK-A-001 (IMMUTABLE)
  nom VARCHAR(100) NOT NULL,
  nom_du_milieu VARCHAR(100) NULL,
  prenom VARCHAR(100) NOT NULL,
  genre ENUM('M','F') NOT NULL,
  telephone VARCHAR(30) NULL,
  adresse VARCHAR(255) NULL,
  position_id BIGINT UNSIGNED NULL,
  team_id BIGINT UNSIGNED NULL,
  rotation_id BIGINT UNSIGNED NULL,
  date_recrutement DATE NOT NULL,
  statut ENUM('ACTIF','INACTIF') NOT NULL DEFAULT 'ACTIF',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_agents_team (team_id),
  INDEX idx_agents_position (position_id),
  INDEX idx_agents_statut (statut),
  CONSTRAINT fk_agents_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_agents_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  CONSTRAINT fk_agents_rotation FOREIGN KEY (rotation_id) REFERENCES rotations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Assignments (historique d'affectations) ----------
CREATE TABLE IF NOT EXISTS assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  agent_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  position_id BIGINT UNSIGNED NULL,
  rotation_id BIGINT UNSIGNED NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NULL,                             -- NULL = affectation courante
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assignments_agent (agent_id),
  INDEX idx_assignments_team (team_id),
  CONSTRAINT fk_asg_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_asg_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_asg_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  CONSTRAINT fk_asg_rotation FOREIGN KEY (rotation_id) REFERENCES rotations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Attendance (pointages) ----------
CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  agent_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  rotation_id BIGINT UNSIGNED NOT NULL,
  service_date DATE NOT NULL,                     -- date de DÉBUT du quart
  shift ENUM('MATIN','SOIR','NUIT') NOT NULL,
  heure_arrivee TIME NULL,                        -- NULL = absent
  statut ENUM('PRESENT','ABSENT','RETARD') NOT NULL,
  retard_minutes INT NOT NULL DEFAULT 0,
  remarque TEXT NULL,
  modifie_par BIGINT UNSIGNED NULL,
  modifie_le DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_attendance (agent_id, service_date, shift),  -- anti-doublon
  INDEX idx_att_date (service_date),
  INDEX idx_att_team (team_id),
  INDEX idx_att_statut (statut),
  CONSTRAINT fk_att_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_rotation FOREIGN KEY (rotation_id) REFERENCES rotations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_att_modifie_par FOREIGN KEY (modifie_par) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Breaks (pauses) ----------
CREATE TABLE IF NOT EXISTS breaks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  agent_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NULL,
  duree_minutes INT NULL,
  remarque TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_breaks_agent (agent_id),
  CONSTRAINT fk_breaks_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  destinataire_id BIGINT UNSIGNED NOT NULL,       -- user_id
  category ENUM('ATTENDANCE','AGENT','TEAM','ASSIGNMENT','ALERT','SYSTEM') NOT NULL,
  titre VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  lue BOOLEAN NOT NULL DEFAULT FALSE,
  date_lecture DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (destinataire_id),
  INDEX idx_notif_lue (lue),
  CONSTRAINT fk_notif_user FOREIGN KEY (destinataire_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Audit logs ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NULL,
  user_nom VARCHAR(200) NOT NULL,
  action VARCHAR(100) NOT NULL,
  cible VARCHAR(200) NOT NULL,
  valeurs_precedentes JSON NULL,
  nouvelles_valeurs JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Settings (app config) ----------
CREATE TABLE IF NOT EXISTS settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  key_name VARCHAR(100) NOT NULL UNIQUE,
  value JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- WhatsApp message history ----------
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  notification_id BIGINT UNSIGNED NULL,
  phone_to VARCHAR(30) NOT NULL,
  template_name VARCHAR(100) NULL,
  payload JSON NULL,
  status ENUM('PENDING','SENT','DELIVERED','READ','FAILED') NOT NULL DEFAULT 'PENDING',
  provider_message_id VARCHAR(200) NULL,
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wa_notif FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- personal_access_tokens (Sanctum) ----------
CREATE TABLE IF NOT EXISTS personal_access_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tokenable_type VARCHAR(255) NOT NULL,
  tokenable_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  abilities TEXT NULL,
  last_used_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pat_tokenable (tokenable_type, tokenable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- DONNÉES INITIALES
-- ============================================================

INSERT INTO teams (uuid, code, nom, description) VALUES
  (UUID(), 'A', 'TEAM A', 'Équipe A'),
  (UUID(), 'B', 'TEAM B', 'Équipe B'),
  (UUID(), 'C', 'TEAM C', 'Équipe C');

INSERT INTO positions (uuid, code, nom, description) VALUES
  (UUID(), 'ENSACHEUR', 'Ensacheur', ''),
  (UUID(), 'SURVEILLANT', 'Surveillant', ''),
  (UUID(), 'MANIPULATEUR', 'Manipulateur', ''),
  (UUID(), 'NETTOYEUR', 'Nettoyeur', ''),
  (UUID(), '4-BECS', '4 becs', '');

INSERT INTO rotations (uuid, code, nom, heure_debut, heure_fin, chevauchement_nuit, duree_heures) VALUES
  (UUID(), 'MATIN', 'Matin', '07:00:00', '15:00:00', FALSE, 8),
  (UUID(), 'SOIR', 'Soir', '15:00:00', '23:00:00', FALSE, 8),
  (UUID(), 'NUIT', 'Nuit', '23:00:00', '07:00:00', TRUE, 8);

-- Utilisateur admin par défaut — mot de passe : "password" (bcrypt hash ci-dessous)
-- Le hash correspond à : Hash::make('password')
INSERT INTO users (uuid, matricule, nom, prenom, email, role, password, actif) VALUES
  (UUID(), 'BPACK-U-001', 'Admin', 'Principal', 'admin@bpack.ci', 'ADMINISTRATEUR', '$2y$12$exampleBcryptHashReplaceWithLaravelArtisanTinker', TRUE);
