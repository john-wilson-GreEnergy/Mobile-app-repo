import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, normalizeEmployee, normalizeJobsite, normalizeAnnouncement, normalizeRequest, fetchAssignments } from '@/lib/db';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Users, MapPin, Calendar, BarChart3, ClipboardList, Layers,
  Zap, AlertTriangle, CheckCircle2, Megaphone, Upload,
  Activity, TrendingUp, MessageSquare, RefreshCw
} from 'lucide-react';

const VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' } }),
};

export default function AdminPortal() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const { data: empRows = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => db.employees.list(),
  });
  const employees = (Array.isArray(empRows) ? empRows : []).map(normalizeEmployee);

  const { data: siteRows = [] } = useQuery({
    queryKey: ['jobsites'],
    queryFn: () => db.jobsites.list(),
  });
  const jobsites = (Array.isArray(siteRows) ? siteRows : []).map(normalizeJobsite);

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments-current'],
    queryFn: () => fetchAssignments({ limit: 300 }),
  });

  const { data: annRows = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => db.announcements.list(),
  });
  const announcements = (Array.isArray(annRows) ? annRows : []).map(normalizeAnnouncement);

  const { data: reqRows = [] } = useQuery({
    queryKey: ['pending-requests'],
    queryFn: () => db.portal_requests.filter({ status: 'pending' }),
  });
  const pendingRequests = (Array.isArray(reqRows) ? reqRows : []).map(normalizeRequest);

  const activeEmployees = employees.filter(e => e.is_active).length;
  const bessTechs = employees.filter(e => e.role === 'bess_tech').length;
  const activeSites = jobsites.filter(j => j.is_active).length;
  const activeAssignments = assignments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;

  const understaffed = jobsites.filter(site => {
    const staffed = assignments.filter(a =>
      a.jobsite_id === site.id && (a.status === 'scheduled' || a.status === 'confirmed')
    ).length;
    return staffed < (site.min_staffing || 1);
  }).length;

  const greeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const QUICK_ACTIONS = [
    { label: 'Scheduler', icon: Calendar, path: '/schedule', color: 'text-purple-400 bg-purple-500/10' },
    { label: 'Employees', icon: Users, path: '/employees', color: 'text-blue-400 bg-blue-500/10' },
    { label: 'Sites', icon: MapPin, path: '/sites', color: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Requests', icon: ClipboardList, path: '/requests', color: 'text-yellow-400 bg-yellow-500/10' },
    { label: 'Analytics', icon: BarChart3, path: '/analytics', color: 'text-pink-400 bg-pink-500/10' },
    { label: 'Alerts', icon: AlertTriangle, path: '/notifications', color: 'text-red-400 bg-red-500/10' },
  ];

  const STATS = [
    { label: 'Active Crew', value: activeEmployees, sub: `${bessTechs} techs`, icon: Users, color: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }, path: '/employees' },
    { label: 'Job Sites', value: activeSites, icon: MapPin, color: { icon: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }, path: '/sites' },
    { label: 'Assignments', value: activeAssignments, icon: Calendar, color: { icon: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }, path: '/schedule' },
    { label: 'Requests', value: pendingRequests.length, icon: ClipboardList, color: { icon: pendingRequests.length > 0 ? 'text-yellow-400' : 'text-gray-400', bg: pendingRequests.length > 0 ? 'bg-yellow-500/10' : 'bg-white/5', border: pendingRequests.length > 0 ? 'border-yellow-500/20' : 'border-white/10' }, path: '/requests' },
  ];

  return (
    <div className="px-4 py-4 pb-6 space-y-4">
      {/* Hero Banner */}
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
            {format(currentTime, 'EEEE, MMMM d')} · Admin Console
          </p>
          <h2 className="text-white text-xl font-black">{greeting()}, Admin ⚡️</h2>
          <p className="text-gray-400 text-sm mt-1">
            {activeAssignments} active assignments · {understaffed > 0 ? `${understaffed} understaffed` : 'All sites staffed'}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className={`w-2 h-2 rounded-full ${understaffed > 0 ? 'bg-yellow-400' : 'bg-primary'} animate-pulse`} />
            <span className={`text-xs font-bold ${understaffed > 0 ? 'text-yellow-400' : 'text-primary'}`}>
              {understaffed > 0 ? `${understaffed} Site${understaffed > 1 ? 's' : ''} Need Attention` : 'System Operational'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {STATS.map((stat, i) => {
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
              {stat.sub && <div className="text-[10px] text-gray-600 mt-0.5">{stat.sub}</div>}
            </motion.button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div custom={5} variants={VARIANTS} initial="hidden" animate="visible">
        <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2 px-1">Quick Actions</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map(action => {
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

      {/* Recent Alerts */}
      <motion.div custom={6} variants={VARIANTS} initial="hidden" animate="visible">
        <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2 px-1">System Status</p>
        <div className="p-4 rounded-3xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-white text-sm font-bold">Database</span>
            </div>
            <span className="text-primary text-xs font-bold">Real-time ✓</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${understaffed > 0 ? 'bg-yellow-400' : 'bg-primary'}`} />
              <span className="text-white text-sm font-bold">Staffing</span>
            </div>
            <span className={`text-xs font-bold ${understaffed > 0 ? 'text-yellow-400' : 'text-primary'}`}>
              {understaffed > 0 ? `${understaffed} gaps` : '100% OK'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${pendingRequests.length > 0 ? 'bg-yellow-400' : 'bg-primary'}`} />
              <span className="text-white text-sm font-bold">Requests</span>
            </div>
            <span className={`text-xs font-bold ${pendingRequests.length > 0 ? 'text-yellow-400' : 'text-primary'}`}>
              {pendingRequests.length > 0 ? `${pendingRequests.length} pending` : 'All clear'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <motion.div custom={7} variants={VARIANTS} initial="hidden" animate="visible">
          <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2 px-1">Announcements</p>
          <div className="space-y-2">
            {announcements.slice(0, 3).map(ann => (
              <AnnouncementCard key={ann.id} announcement={ann} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Assignments */}
      {assignments.length > 0 && (
        <motion.div custom={8} variants={VARIANTS} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Recent Assignments</p>
            <button onClick={() => navigate('/schedule')} className="text-primary text-xs font-bold">See All</button>
          </div>
          <div className="space-y-2">
            {assignments.slice(0, 4).map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                <div className={`w-2 h-8 rounded-full ${a.status === 'confirmed' ? 'bg-emerald-500/30' : 'bg-blue-500/30'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{a.employee_name || 'Unassigned'}</p>
                  <p className="text-gray-500 text-xs truncate">{a.jobsite_name} · {a.week_start}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${a.status === 'confirmed' ? 'text-emerald-400 bg-emerald-500/10' : 'text-blue-400 bg-blue-500/10'}`}>
                  {a.status}
                </span>
              </div>
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