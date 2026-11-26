# Project memory

## Product intent & audience

- B-Pack Attendance Management System: workforce management web app for tracking attendance, shifts, teams, and breaks.
- Target users: HR/admin staff and managers monitoring attendance; agents/employees who clock in.
- Backend integration planned with Laravel (migrations, controllers, models).
- App UI language: French (module names, labels).

## Brand personality & voice

- Professional, enterprise-grade workforce tool.
- Clear, utilitarian communication with domain-specific HR terminology in French.

## Visual design & UX direction

- Stack: Vite + React (JSX), Tailwind CSS, Lucide React icons; `@/` path alias for imports.
- Avoid extra UI/icon packages unless explicitly requested.
- Aesthetic: production-grade, non-cookie-cutter; visually polished for real deployment.
- 14 functional modules implemented: Dashboard, Agents, Teams, Positions, Rotations, Assignments, Timekeeping, Breaks, History, Reports, Notifications, Users, Activity Log, Settings.

## Decisions, constraints & rationale

- Build and typecheck pass cleanly with zero errors.
- Automated ID generation for entities (agents, etc.).
- Role-based access control implemented.
- Reporting tools included.
- No external UI theme or icon libraries added beyond Lucide React.

## Open questions & assumptions

- Laravel backend not yet scaffolded — migrations, controllers, and models still to be prepared.
- No demo data seeded yet (agents and timekeeping records) for real-condition testing.
- Potential future work: module-specific improvements (charts, filters, exports), design/color adjustments per screen.
- Assumed the frontend operates standalone until Laravel API endpoints are defined; data structures may need alignment when backend is wired.