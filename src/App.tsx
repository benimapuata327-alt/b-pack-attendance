import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { useRoute } from '@/components/ui/Router';
import { ToastContainer } from '@/components/ui/Toast';
import { PageLoader } from '@/components/ui/Loader';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AgentsPage } from '@/pages/AgentsPage';
import { TeamsPage } from '@/pages/TeamsPage';
import { PositionsPage } from '@/pages/PositionsPage';
import { RotationsPage } from '@/pages/RotationsPage';
import { AssignmentsPage } from '@/pages/AssignmentsPage';
import { AttendancePage } from '@/pages/AttendancePage';
import { BreaksPage } from '@/pages/BreaksPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { UsersPage } from '@/pages/UsersPage';
import { AuditPage } from '@/pages/AuditPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { canAccessModule, type ModuleKey } from '@/auth/permissions';

const ROUTE_TO_MODULE: Record<string, ModuleKey> = {
  '/dashboard': 'dashboard',
  '/agents': 'agents',
  '/teams': 'teams',
  '/positions': 'positions',
  '/rotations': 'rotations',
  '/assignments': 'assignments',
  '/attendance': 'attendance',
  '/breaks': 'breaks',
  '/history': 'history',
  '/reports': 'reports',
  '/notifications': 'notifications',
  '/users': 'users',
  '/audit': 'audit',
  '/settings': 'settings',
};

function renderPage(route: string) {
  switch (route) {
    case '/dashboard': return <DashboardPage />;
    case '/agents': return <AgentsPage />;
    case '/teams': return <TeamsPage />;
    case '/positions': return <PositionsPage />;
    case '/rotations': return <RotationsPage />;
    case '/assignments': return <AssignmentsPage />;
    case '/attendance': return <AttendancePage />;
    case '/breaks': return <BreaksPage />;
    case '/history': return <HistoryPage />;
    case '/reports': return <ReportsPage />;
    case '/notifications': return <NotificationsPage />;
    case '/users': return <UsersPage />;
    case '/audit': return <AuditPage />;
    case '/settings': return <SettingsPage />;
    default: return <DashboardPage />;
  }
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const [route, navigate] = useRoute();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><PageLoader label="Chargement…" /></div>;

  if (!user) return <LoginPage />;

  // permission guard: redirect to dashboard if module not allowed
  const mod = ROUTE_TO_MODULE[route] ?? 'dashboard';
  const allowed = canAccessModule(user.role, mod);
  const effectiveRoute = allowed ? route : '/dashboard';
  if (!allowed && route !== '/dashboard') navigate('/dashboard');

  return (
    <AppShell route={effectiveRoute} navigate={navigate}>
      {renderPage(effectiveRoute)}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <ToastContainer />
    </AuthProvider>
  );
}
