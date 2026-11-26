import { useState } from 'react';
import {
  LayoutDashboard, Users, UsersRound, Briefcase, Clock, Shuffle,
  Fingerprint, Coffee, History, FileBarChart, Bell, UserCog,
  ScrollText, Settings, Menu, X, ChevronRight, LogOut, Boxes,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { canAccessModule, ROLE_LABELS, type ModuleKey } from '@/auth/permissions';
import { API_MODE } from '@/api/config';
import { useNotifications } from '@/hooks/useData';
import { fmtDateTimeFR } from '@/api/businessLogic';
import type { NotificationCategory } from '@/types';

interface NavItem { key: ModuleKey; label: string; icon: LucideIcon; route: string; }

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, route: '/dashboard' },
  { key: 'agents', label: 'Agents', icon: Users, route: '/agents' },
  { key: 'teams', label: 'Équipes', icon: UsersRound, route: '/teams' },
  { key: 'positions', label: 'Postes', icon: Briefcase, route: '/positions' },
  { key: 'rotations', label: 'Rotations', icon: Clock, route: '/rotations' },
  { key: 'assignments', label: 'Affectations', icon: Shuffle, route: '/assignments' },
  { key: 'attendance', label: 'Pointage', icon: Fingerprint, route: '/attendance' },
  { key: 'breaks', label: 'Pauses', icon: Coffee, route: '/breaks' },
  { key: 'history', label: 'Historique', icon: History, route: '/history' },
  { key: 'reports', label: 'Rapports', icon: FileBarChart, route: '/reports' },
  { key: 'notifications', label: 'Notifications', icon: Bell, route: '/notifications' },
  { key: 'users', label: 'Utilisateurs', icon: UserCog, route: '/users' },
  { key: 'audit', label: 'Journal des activités', icon: ScrollText, route: '/audit' },
  { key: 'settings', label: 'Paramètres', icon: Settings, route: '/settings' },
];

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  ATTENDANCE: 'Pointage', AGENT: 'Agent', TEAM: 'Équipe',
  ASSIGNMENT: 'Affectation', ALERT: 'Alerte', SYSTEM: 'Système',
};

interface AppShellProps {
  route: string;
  navigate: (r: string) => void;
  children: React.ReactNode;
}

export function AppShell({ route, navigate, children }: AppShellProps) {
  const { user, logout, can } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { unread, items, refresh } = useNotifications(user?.id);

  if (!user) return null;
  const nav = NAV.filter((n) => canAccessModule(user.role, n.key));
  const current = nav.find((n) => n.route === route) ?? nav[0];

  const handleNavigate = (r: string) => { navigate(r); setMobileOpen(false); };

  return (
    <div className="min-h-screen flex bg-graphite-50">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-graphite-600 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-graphite-700/60">
          <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center shadow-brand">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-display font-bold text-white text-sm">B-PACK</p>
            <p className="text-[10px] text-graphite-300 tracking-wider uppercase">Attendance</p>
          </div>
          <button className="ml-auto lg:hidden text-graphite-300" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active = route === item.route;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.route)}
                className={`sidebar-link w-full text-left ${active ? 'sidebar-link-active' : ''}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
                {item.key === 'notifications' && unread > 0 && (
                  <span className="ml-auto bg-brand-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{unread}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-graphite-700/60">
          <div className="px-2 py-2 rounded-lg bg-graphite-700/40">
            <p className="text-[10px] text-graphite-300 uppercase tracking-wide">Site</p>
            <p className="text-xs font-semibold text-white">PEAKING PLANT</p>
            <p className="text-[10px] text-graphite-300 mt-0.5">en partenariat avec CONTIAG MANPOWER</p>
          </div>
          {API_MODE === 'local' && (
            <p className="text-[10px] text-amber-400/80 mt-2 px-2">Mode développement local — Laravel non connecté</p>
          )}
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-graphite-900/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-graphite-100 flex items-center gap-4 px-4 lg:px-6">
          <button className="lg:hidden p-2 -ml-2 text-graphite-500" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-graphite-400 text-sm">
            <span className="hidden sm:inline">B-PACK Attendance</span>
            <ChevronRight className="w-4 h-4 hidden sm:inline" />
            <span className="font-semibold text-graphite-600">{current?.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 rounded-lg text-graphite-500 hover:bg-graphite-100 transition"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 bg-brand-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{unread}</span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-graphite-100 z-40 animate-slide-in-right max-h-96 overflow-y-auto">
                    <div className="px-4 py-3 border-b border-graphite-100 flex items-center justify-between">
                      <p className="font-display font-semibold text-graphite-600">Notifications</p>
                      <button onClick={() => { navigate('/notifications'); setNotifOpen(false); }} className="text-xs text-brand-600 hover:underline">Tout voir</button>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-sm text-graphite-400 text-center py-8">Aucune notification</p>
                    ) : (
                      items.slice(0, 8).map((n) => (
                        <button key={n.id} onClick={() => { navigate('/notifications'); setNotifOpen(false); }} className={`w-full text-left px-4 py-3 border-b border-graphite-50 hover:bg-graphite-50 transition ${!n.lue ? 'bg-brand-50/40' : ''}`}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-semibold text-brand-600 uppercase">{CATEGORY_LABEL[n.category]}</span>
                            {!n.lue && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                          </div>
                          <p className="text-sm font-medium text-graphite-600">{n.titre}</p>
                          <p className="text-xs text-graphite-400 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-graphite-300 mt-1">{fmtDateTimeFR(n.createdAt)}</p>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* User menu */}
            <div className="flex items-center gap-2 pl-3 border-l border-graphite-100">
              <div className="w-9 h-9 rounded-full bg-graphite-600 text-white flex items-center justify-center font-semibold text-sm">
                {user.prenom[0]}{user.nom[0]}
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-semibold text-graphite-600">{user.prenom} {user.nom}</p>
                <p className="text-xs text-graphite-400">{ROLE_LABELS[user.role]}</p>
              </div>
              <button onClick={() => logout()} className="p-2 text-graphite-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Déconnexion">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
