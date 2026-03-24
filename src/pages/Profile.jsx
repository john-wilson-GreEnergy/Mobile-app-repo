import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  User, Shield, LogOut, ChevronRight, Bell, Moon,
  HelpCircle, FileText, Zap, Settings, Building2,
  CheckCircle2, Clock
} from 'lucide-react';

const MENU_ITEMS = [
  {
    section: 'Account',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
      { id: 'settings', label: 'Settings', icon: Settings, value: null },
    ],
  },
  {
    section: 'Support',
    items: [
      { id: 'help', label: 'Help & Support', icon: HelpCircle, value: null },
      { id: 'docs', label: 'Documentation', icon: FileText, value: null },
    ],
  },
];

export default function Profile() {
  const { user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await base44.auth.logout();
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';

  const roleLabel = user?.role === 'admin' ? 'Administrator' : 'Employee';
  const roleBadge = user?.role === 'admin'
    ? 'text-primary bg-primary/10 border-primary/20'
    : 'text-blue-400 bg-blue-500/10 border-blue-500/20';

  return (
    <div className="pb-8">
      <div className="px-4 pt-6 space-y-4">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 border border-primary/20"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(10,18,15,0.95) 100%)' }}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border-2 border-primary/30 flex items-center justify-center">
                <span className="text-primary text-xl font-black">{initials}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-black text-lg truncate">
                {user?.full_name || user?.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-gray-400 text-sm truncate">{user?.email}</p>
              <span className={`mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border ${roleBadge}`}>
                <Shield className="w-3 h-3" />
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/5">
            {[
              { label: 'Assignments', value: '12', icon: Building2 },
              { label: 'This Week', value: '2', icon: Clock },
              { label: 'Completed', value: '47', icon: CheckCircle2 },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="text-lg font-black text-white">{stat.value}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mt-0.5">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Build Info */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-2 py-2"
        >
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-gray-600 text-xs font-bold">GreEnergy Resources · Herding Cats v3.0</span>
        </motion.div>

        {/* Menu Sections */}
        {MENU_ITEMS.map((section, si) => (
          <motion.div
            key={section.section}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + si * 0.08 }}
          >
            <p className="text-gray-600 text-xs font-black uppercase tracking-widest mb-2 px-1">
              {section.section}
            </p>
            <div className="rounded-3xl bg-card border border-border overflow-hidden divide-y divide-border">
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-all active-scale"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4.5 h-4.5 text-gray-400" style={{ width: '18px', height: '18px' }} />
                    </div>
                    <span className="flex-1 text-left text-white font-semibold text-sm">{item.label}</span>
                    {item.value && (
                      <span className="text-gray-500 text-sm mr-1">{item.value}</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold active-scale disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}