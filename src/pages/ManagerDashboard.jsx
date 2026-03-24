import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, normalizeEmployee, normalizeJobsite, normalizeAnnouncement, normalizeRequest, fetchAssignments } from '@/lib/db';
import { useQuery } from '@tanstack/react-query';
import {
  Users, MapPin, Calendar, ClipboardList, Zap,
  CheckCircle2, AlertTriangle, Clock, Megaphone, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' } }),
};

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: empRows = [] } = useQuery({
    queryKey: ['my-employee', user?.email],
    queryFn: () => db.employees.filter({ email: user?.email }),
    enabled: !!user?.email,
  });
  const myEmployee = empRows[0] ? normalizeEmployee(empRows[0]) : null;

  const { data: siteRows = [] } = useQuery({
    queryKey: ['jobsites'],
    queryFn: () => db.jobsites.list(),
  });
  const allSites = siteRows.map(normalizeJobsite);

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments-current'],
    queryFn: () => fetchAssignments({ limit: 300 }),
  });

  const { data: annRows = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => db.announcements.list(),
  });
  const announcements = annRows.map(normalizeAnnouncement);

  const { data: reqRows = [] } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: () => db.portal_requests.filter({ status: 'pending' }),
  });
  const pendingRequests = reqRows.map(normalizeRequest);

  // Filter to sites this manager manages
  const managerName = myEmployee ? `${myEmployee.first_name} ${myEmployee.last_name}` : user?.full_name;
  const mySites = allSites.filter(s => s.is_active && (
    !managerName || s.manager?.toLowerCase().includes(managerName?.split(' ')[0]?.toLowerCase())
  ));
  // Fall back to all active sites if no match
  const displaySites = mySites.length > 0 ? mySites : allSites.filter(s => s.is_active);

  const activeAssignments = allAssignments.filter(a => a.status === 'scheduled' || a.status === 'confirmed');

  const understaffedSites = displaySites.filter(site => {
    const staffed = allAssignments.filter(a =>
      a.jobsite_id === site.id && (a.status === 'scheduled' || a.status === 'confirmed')
    ).length;
    return staffed < (site.min_staffing || 1);
  });

  const greeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = myEmployee?.first_name || user?.full_name?.split(' ')[0] || 'Manager';

  return (
    <div className="px-4 py-4 pb-6 space-y-4">
      {/* Greeting */}
      <motion.div
        custom={0} variants={VARIANTS} initial="hidden" animate="visible"
        className="relative overflow-hidden rounded-3xl p-5 border border-primary/20"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(10,18,15,0.9) 100%)' }}
      >
        <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
          <Zap className="w-full h-full text-primary" />
        </div>
        <div className="relative">
          <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">
            {format(currentTime, 'EEEE, MMMM d')}
          </p>
          <h2 className="text-white text-xl font-black">{greeting()}, {firstName} 👋</h2>
          <p className="text-gray-400 text-sm mt-1">
            {understaffedSites.length > 0
              ? `${understaffedSites.length} site${understaffedSites.length > 1 ? 's' : ''} need attention`
              : 'All sites fully staffed'}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className={`w-2 h-2 rounded-full ${understaffedSites.length > 0 ? 'bg-yellow-400' : 'bg-primary'} animate-pulse`} />
            <span className={`text-xs font-bold ${understaffedSites.length > 0 ? 'text-yellow-400' : 'text-primary'}`}>
              {understaffedSites.length > 0 ? 'Staffing Gaps Detected' : 'All Sites Operational'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: 'My Sites', value: displaySites.length,
            icon: MapPin, path: '/sites',
            color: { icon: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }
          },
          {
            label: 'Assignments', value: activeAssignments.length,
            icon: Calendar, path: '/schedule',
            color: { icon: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }
          },
          {
            label: 'Pending Requests', value: pendingRequests.length,
            icon: ClipboardList, path: '/requests',
            color: {
              icon: pendingRequests.length > 0 ? 'text-yellow-400' : 'text-gray-400',
              bg: pendingRequests.length > 0 ? 'bg-yellow-500/10' : 'bg-white/5',
              border: pendingRequests.length > 0 ? 'border-yellow-500/20' : 'border-white/10'
            }
          },
          {
            label: 'Understaffed', value: understaffedSites.length,
            icon: AlertTriangle, path: '/sites',
            color: {
              icon: understaffedSites.length > 0 ? 'text-red-400' : 'text-emerald-400',
              bg: understaffedSites.length > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10',
              border: understaffedSites.length > 0 ? 'border-red-500/20' : 'border-emerald-500/20'
            }
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.button
              key={stat.label}
              custom={i + 1} variants={VARIANTS} initial="hidden" animate="visible"
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(stat.path)}
              className="text-left p-4 rounded-3xl bg-card border border-border hover:border-primary/20 transition-all active-scale"
            >
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center mb-3 ${stat.color.bg} ${stat.color.border}`}>
                <Icon className={`w-5 h-5 ${stat.color.icon}`} />
              </div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs font-bold text-gray-500 mt-0.5 uppercase tracking-wide">{stat.label}</div>
            </motion.button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div custom={5} variants={VARIANTS} initial="hidden" animate="visible">
        <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2 px-1">Quick Actions</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Schedule', icon: Calendar, path: '/schedule', color: 'text-purple-400 bg-purple-500/10' },
            { label: 'Sites', icon: MapPin, path: '/sites', color: 'text-blue-400 bg-blue-500/10' },
            { label: 'Requests', icon: ClipboardList, path: '/requests', color: 'text-yellow-400 bg-yellow-500/10' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                whileTap={{ scale: 0.93 }}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-border bg-card active-scale"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${action.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <motion.div custom={6} variants={VARIANTS} initial="hidden" animate="visible">
          <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2 px-1">Announcements</p>
          <div className="space-y-2">
            {announcements.slice(0, 2).map(ann => (
              <AnnouncementCard key={ann.id} announcement={ann} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function AnnouncementCard({ announcement }) {
  const priorityConfig = {
    urgent: { color: 'text-red-400 bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
    high: { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-400' },
    medium: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' },
    low: { color: 'text-gray-400 bg-white/5 border-white/10', dot: 'bg-gray-400' },
  };
  const config = priorityConfig[announcement.priority] || priorityConfig.medium;

  return (
    <div className={`p-4 rounded-2xl border ${config.color}`}>
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${config.dot}`} />
        <div>
          <p className="text-white font-bold text-sm">{announcement.title}</p>
          <p className="text-gray-400 text-xs mt-1 leading-relaxed line-clamp-2">{announcement.body}</p>
        </div>
      </div>
    </div>
  );
}