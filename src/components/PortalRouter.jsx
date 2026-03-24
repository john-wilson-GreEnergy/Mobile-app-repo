/**
 * PortalRouter - resolves which portal dashboard to show based on Employee entity role.
 * Admins get a switcher to preview all 5 portals.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { db, normalizeEmployee } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import AdminPortal from '@/pages/portals/AdminPortal';
import SiteManagerPortal from '@/pages/portals/SiteManagerPortal';
import SiteLeadPortal from '@/pages/portals/SiteLeadPortal';
import HRPortal from '@/pages/portals/HRPortal';
import BessTechPortal from '@/pages/portals/BessTechPortal';
import { useActivePortal } from '@/lib/ActivePortalContext';

const PORTALS = [
  { key: 'admin',        label: 'Admin',        color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { key: 'site_manager', label: 'Site Manager', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { key: 'site_lead',    label: 'Site Lead',    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { key: 'hr',           label: 'HR',           color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { key: 'bess_tech',    label: 'BESS Tech',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
];

function portalComponent(key) {
  switch (key) {
    case 'admin':        return <AdminPortal />;
    case 'site_manager': return <SiteManagerPortal />;
    case 'site_lead':    return <SiteLeadPortal />;
    case 'hr':           return <HRPortal />;
    default:             return <BessTechPortal />;
  }
}

export default function PortalRouter() {
  const { user } = useAuth();
  const [activePortal, setActivePortal] = useState('bess_tech');
  const [showSwitcher, setShowSwitcher] = useState(false);
  const { setActivePortal: setContextPortal } = useActivePortal();

  console.log('PortalRouter rendering, user:', user);

  const isSuperAdmin = user?.role === 'admin';

  // Sync active portal to context so MobileLayout can update bottom nav
  // Must be called before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (isSuperAdmin) setContextPortal(activePortal);
  }, [activePortal, isSuperAdmin]);



  // Admin / super admin → show portal switcher
  if (isSuperAdmin) {
    return (
      <div>
        {/* Portal Switcher Bar */}
        <div className="px-4 pt-3 pb-1">
          <button
            onClick={() => setShowSwitcher(s => !s)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-card border border-border"
          >
            <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Viewing Portal</span>
            <span className={`text-xs font-black px-3 py-1 rounded-xl border ${PORTALS.find(p => p.key === activePortal)?.color}`}>
              {PORTALS.find(p => p.key === activePortal)?.label} ▾
            </span>
          </button>

          <AnimatePresence>
            {showSwitcher && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-2 p-2 rounded-2xl bg-card border border-border flex flex-wrap gap-2"
              >
                {PORTALS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { setActivePortal(p.key); setShowSwitcher(false); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      activePortal === p.key ? p.color : 'text-gray-500 bg-white/5 border-white/10'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {portalComponent(activePortal)}
      </div>
    );
  }

  return <EmployeePortalResolver userEmail={user?.email} />;
}

function EmployeePortalResolver({ userEmail }) {
  const { data: empRows = [], isLoading, isError } = useQuery({
    queryKey: ['my-employee', userEmail],
    queryFn: () => db.employees.filter({ email: userEmail }),
    enabled: !!userEmail,
    retry: 0,
    staleTime: 1000 * 60 * 5,
  });

  const myEmployee = empRows[0] ? normalizeEmployee(empRows[0]) : null;
  const employeeRole = myEmployee?.role;

  // Always default to BESS Tech for now to prevent crashes
  return <BessTechPortal />;
}