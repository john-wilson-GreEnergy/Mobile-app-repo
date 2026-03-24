import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, MessageSquare, MapPin,
  Bell, User, ClipboardList, Users, ClipboardCheck, Link2
} from 'lucide-react';
import NotificationToast from './NotificationToast';
import OfflineBanner from './OfflineBanner';
import { useEmployeeRole } from '@/hooks/useEmployeeRole';
import { useAuth } from '@/lib/AuthContext';
import { db, normalizeEmployee, fetchAssignments } from '@/lib/db';
import { useQuery } from '@tanstack/react-query';
import { useActivePortal } from '@/lib/ActivePortalContext';
import { useOfflineSync } from '@/lib/useOfflineSync';

// Nav tab sets per role
const NAV_TABS = {
  admin: [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, path: '/schedule' },
    { id: 'employees', label: 'Crew', icon: Users, path: '/employees' },
    { id: 'sites', label: 'Sites', icon: MapPin, path: '/sites' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ],
  site_manager: [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, path: '/schedule' },
    { id: 'sites', label: 'Sites', icon: MapPin, path: '/sites' },
    { id: 'requests', label: 'Requests', icon: ClipboardList, path: '/requests' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ],
  site_lead: [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, path: '/schedule' },
    { id: 'sites', label: 'Sites', icon: MapPin, path: '/sites' },
    { id: 'requests', label: 'Requests', icon: ClipboardList, path: '/requests' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ],
  hr: [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/' },
    { id: 'employees', label: 'Employees', icon: Users, path: '/employees' },
    { id: 'requests', label: 'Requests', icon: ClipboardList, path: '/requests' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, path: '/schedule' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ],
  bess_tech: [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/' },
    { id: 'schedule', label: 'Schedule', icon: Calendar, path: '/schedule' },
    { id: 'chat', label: 'Chat', icon: MessageSquare, path: '/chat' },
    { id: 'surveys', label: 'Surveys', icon: ClipboardCheck, path: '/surveys' },
    { id: 'map-portal', label: 'Map', icon: MapPin, path: '/map-portal' },
    { id: 'greenergy-links', label: 'GR Links', icon: Link2, path: '/greenergy-links' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ],
};

export default function MobileLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  console.log('MobileLayout rendering, location:', location.pathname);

  const { employeeRole } = useEmployeeRole();
  const { activePortal } = useActivePortal();
  const isSuperAdmin = user?.role === 'admin';
  const effectiveRole = isSuperAdmin && activePortal ? activePortal : employeeRole;
  const navTabs = NAV_TABS[effectiveRole] || NAV_TABS.bess_tech;
  const pathSlug = location.pathname.replace('/', '') || 'dashboard';
  const activeTab = navTabs.find(t => t.path === location.pathname)?.id || pathSlug;

  return (
    <div className="flex flex-col h-screen bg-background font-inter overflow-hidden">
      <div className="flex-none">
        <MobileHeader activeTab={activeTab} unreadCount={0} navigate={navigate} />
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
      <div className="flex-none">
        <BottomNav tabs={navTabs} activeTab={activeTab} navigate={navigate} />
      </div>
    </div>
  );
}

function MobileHeader({ activeTab, unreadCount, navigate }) {
  const titles = {
    dashboard: 'Dashboard', schedule: 'Schedule', chat: 'Chat',
    sites: 'Job Sites', profile: 'Profile', requests: 'Requests',
    employees: 'Employees', notifications: 'Notifications', analytics: 'Analytics',
    surveys: 'Surveys', 'map-portal': 'Map Portal', 'greenergy-links': 'GreEnergy Links',
  };

  return (
    <div className="glass border-b border-border px-4 pt-12 pb-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <img
          src="https://greenergy-bess-tech-v3-767247581917.us-west1.run.app/logo.png"
          alt="GreEnergy"
          className="w-7 h-7 object-contain"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">{titles[activeTab] || 'Dashboard'}</h1>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest">GreEnergy Resources</p>
        </div>
      </div>
      <button
        onClick={() => navigate('/notifications')}
        className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 active-scale"
      >
        <Bell className="w-5 h-5 text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-black text-primary-foreground animate-pulse-green">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}

function BottomNav({ tabs, activeTab, navigate }) {
  return (
    <div className="glass border-t border-border px-2 pb-6 pt-2 safe-bottom">
      <div className="flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              whileTap={{ scale: 0.9 }}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${isActive ? 'bg-primary/15' : ''}`}>
                <Icon className={`w-5 h-5 transition-all ${isActive ? 'text-primary' : 'text-gray-500'}`} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-all ${isActive ? 'text-primary' : 'text-gray-600'}`}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}