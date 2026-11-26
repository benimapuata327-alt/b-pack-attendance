# B-PACK ATTENDANCE — Guide d'intégration Laravel + MySQL

**PEAKING PLANT × CONTIAG MANPOWER**

Application complète de gestion de présence et de main-d'œuvre industrielle, en français, construite en React + TypeScript + Tailwind CSS. Conçue pour se connecter à votre backend **Laravel REST API + MySQL** (environnement Laragon / VS Code sur Windows).

---

## 1. Architecture

```
Frontend (React + TS)  ──HTTP/JSON──▶  Backend (Laravel REST)  ──▶  MySQL
   src/api/index.ts                     routes/api.php              database/schema.sql
```

Le frontend possède une **couche d'intégration API** (`src/api/`) qui fonctionne dans deux modes :

| Mode | Quand | Stockage |
|------|-------|----------|
| `local` (par défaut) | Laravel pas encore connecté | localStorage du navigateur |
| `laravel` | `VITE_LARAVEL_API_URL` définie | MySQL via votre API Laravel |

**Aucune donnée n'est perdue** : le passage de `local` à `laravel` se fait en une seule variable d'environnement.

---

## 2. Connexion à Laravel

### 2.1 Côté frontend (ce projet)

Créez un fichier `.env` à la racine :

```env
VITE_LARAVEL_API_URL=http://bpack.test/api
```

> Adaptez l'URL selon votre virtualhost Laragon (ex: `http://localhost:8000/api` si vous servez avec `php artisan serve`).

Redémarrez le serveur de développement. L'application bascule automatiquement en mode Laravel.

### 2.2 Côté Laravel (votre projet)

1. **Créez le projet Laravel** (si nouveau) :
   ```bash
   composer create-project laravel/laravel bpack-api
   cd bpack-api
   ```

2. **Configurez `.env` Laravel** :
   ```env
   DB_DATABASE=bpack
   DB_USERNAME=root
   DB_PASSWORD=

   # Authentification (Sanctum)
   SANCTUM_STATEFUL_DOMAINS=bpack.test

   # WhatsApp Business Cloud API
   WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_WABA_ID=...
   WHATSAPP_ACCESS_TOKEN=...    # JAMAIS exposé au frontend
   WHATSAPP_VERIFY_TOKEN=...

   # Email (SMTP)
   MAIL_HOST=smtp.exemple.com
   MAIL_FROM_ADDRESS=noreply@bpack.ci
   ```

3. **Exécutez le schéma MySQL** :
   - Importez `database/schema.sql` via phpMyAdmin, **ou**
   - Créez les migrations Laravel équivalentes (chaque table du schéma correspond à une migration).

4. **Installez Sanctum** pour l'authentification par token :
   ```bash
   composer require laravel/sanctum
   php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
   php artisan migrate
   ```

5. **Créez le premier admin** (tinker) :
   ```bash
   php artisan tinker
   >>> User::create([
        'uuid'=>Str::uuid(),'matricule'=>'BPACK-U-001',
        'nom'=>'Admin','prenom'=>'Principal',
        'email'=>'admin@bpack.ci','role'=>'ADMINISTRATEUR',
        'password'=>Hash::make('password')
   ]);
   ```

---

## 3. Endpoints API requis

Toutes les routes sont préfixées par `/api` et protégées par `auth:sanctum` (sauf login).

### Authentification
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | `{email, password}` → `{user, token}` |
| POST | `/api/auth/logout` | Révoque le token courant |
| GET | `/api/auth/me` | Retourne l'utilisateur connecté |

### Paramètres
| Méthode | Route |
|---------|-------|
| GET / PUT | `/api/settings` |

### Users (Admin seulement)
| Méthode | Route |
|---------|-------|
| GET | `/api/users` |
| POST | `/api/users` |
| PUT | `/api/users/{id}` |

### Teams
| Méthode | Route |
|---------|-------|
| GET | `/api/teams` |
| POST | `/api/teams` |
| PUT | `/api/teams/{id}` |
| GET | `/api/teams/{id}/members` |
| GET | `/api/teams/{id}/stats` |

### Positions
| Méthode | Route |
|---------|-------|
| GET | `/api/positions` |
| POST | `/api/positions` |
| PUT | `/api/positions/{id}` |

### Rotations
| Méthode | Route |
|---------|-------|
| GET | `/api/rotations` |
| POST | `/api/rotations` |
| PUT | `/api/rotations/{id}` |

### Agents
| Méthode | Route |
|---------|-------|
| GET | `/api/agents` |
| GET | `/api/agents/{id}` |
| POST | `/api/agents` | Le matricule est généré côté serveur |
| PUT | `/api/agents/{id}` |
| PATCH | `/api/agents/{id}/toggle-status` |
| GET | `/api/agents/{id}/attendance` |

### Assignments
| Méthode | Route |
|---------|-------|
| GET | `/api/assignments` |
| POST | `/api/assignments` | Archive automatiquement l'ancienne affectation |

### Attendance
| Méthode | Route |
|---------|-------|
| GET | `/api/attendance` |
| POST | `/api/attendance/collective` | `{records: [...]}` → `{created, skipped}` |
| PUT | `/api/attendance/{id}` | Correction avec audit trail |

### Breaks
| Méthode | Route |
|---------|-------|
| GET / POST | `/api/breaks` |
| PUT / DELETE | `/api/breaks/{id}` |

### Notifications
| Méthode | Route |
|---------|-------|
| GET | `/api/notifications?user={id}` |
| GET | `/api/notifications/unread-count?user={id}` |
| POST | `/api/notifications/{id}/read` |
| POST | `/api/notifications/read-all` |
| DELETE | `/api/notifications/{id}` |

### Audit logs
| Méthode | Route |
|---------|-------|
| GET | `/api/audit-logs` |

---

## 4. Logique métier côté serveur

### Génération des matricules
- Format agent : `BPACK-{TEAM_CODE}-{NNN}` (ex: `BPACK-A-001`)
- Format user : `BPACK-U-{NNN}`
- **Immuables** : le matricule ne change pas quand l'agent change d'équipe.
- **Concurrence** : utilisez un verrou ou une transaction avec `SELECT ... FOR UPDATE` sur la table agents pour éviter les doublons.

### Calcul du statut de présence
```
début_MATIN = 07:00 | début_SOIR = 15:00 | début_NUIT = 23:00
tolérance = 15 minutes (configurable)
arrivée ≤ début + tolérance → PRÉSENT
arrivée > début + tolérance → RETARD (retard = arrivée - début)
pas d'arrivée → ABSENT
```

### Rotation nuit
La `service_date` correspond toujours au **jour de début** du quart. Un quart de nuit qui commence le 2026-01-15 à 23:00 et finit le 2026-01-16 à 07:00 a pour date de service `2026-01-15`.

### Anti-doublon de pointage
Contrainte `UNIQUE (agent_id, service_date, shift)` sur la table `attendance`. L'endpoint `/attendance/collective` ignore les doublons et renvoie `{created, skipped}`.

---

## 5. Sécurité

- **Mots de passe** : hachés avec bcrypt (`Hash::make()`) — jamais en clair.
- **Tokens** : Laravel Sanctum, transmis via `Authorization: Bearer {token}`.
- **RBAC** : middleware `role:` sur chaque route (ex: `->middleware(['auth:sanctum','role:ADMINISTRATEUR'])`).
- **Validation** : Form Requests côté Laravel + validation côté frontend.
- **Tokens WhatsApp/SMTP** : stockés uniquement dans `.env` Laravel, jamais envoyés au frontend.
- **Audit trail** : chaque action sensible est enregistrée avec avant/après.

---

## 6. Comptes de démonstration (mode local)

| Email | Rôle | Mot de passe |
|-------|------|-------------|
| admin@bpack.ci | Administrateur | password |
| surv.a@bpack.ci | Surveillant (TEAM A) | password |
| resp@bpack.ci | Responsable | password |
| direction@bpack.ci | Direction | password |

---

## 7. Structure du frontend

```
src/
├── api/              Couche d'intégration (config, client Laravel, logique métier, backend local)
├── auth/             Contexte d'authentification + permissions (RBAC)
├── components/
│   ├── layout/       AppShell (sidebar + header), PageHeader
│   └── ui/           Composants réutilisables (Button, Card, Modal, Field, Charts, Toast…)
├── hooks/            useFetch, useNotifications
├── pages/            Une page par module (14 modules)
├── types/            Types TypeScript du domaine
└── App.tsx           Routing + garde de permissions
```

---

## 7. Démarrage rapide

```bash
npm install
npm run dev
```

L'application s'ouvre en mode local (données dans le navigateur). Connectez-vous avec `admin@bpack.ci` / `password`. Quand votre API Laravel est prête, ajoutez `VITE_LARAVEL_API_URL` dans `.env` et redémarrez.
