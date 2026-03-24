import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, normalizeEmployee, normalizeJobsite, normalizeAnnouncement, normalizeRequest, fetchAssignments } from '@/lib/db';
import { useQuery } from '@tanstack/react-query';
import {
  Users, MapPin, Calendar, ClipboardList, AlertTriangle,
  ChevronRight, Zap, CheckCircle2, Clock, ArrowRight,
  Megaphone, Construction, TrendingUp, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const BENTO_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' } }),
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: empRows = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => db.employees.list(),
  });
  const employees = empRows.map(normalizeEmployee);

  const { data: siteRows = [] } = useQuery({
    queryKey: ['jobsites'],
    queryFn: () => db.jobsites.list(),
  });
  const jobsites = siteRows.map(normalizeJobsite);

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments-current'],
    queryFn: () => fetchAssignments({ limit: 50 }),
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
  const requests = reqRows.map(normalizeRequest);

  const activeEmployees = employees.filter(e => e.is_active).length;
  const activeSites = jobsites.filter(j => j.is_active).length;
  const pendingRequests = requests.length;
  const activeAssignments = assignments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;

  const greeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="px-4 py-4 pb-6 space-y-4">
      {/* Greeting Banner */}
      <motion.div
        custom={0}
        variants={BENTO_VARIANTS}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-3xl p-5 border border-primary/20"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(10,18,15,0.9) 100%)' }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
          <Zap className="w-full h-full text-primary" />
        </div>
        <div className="relative">
          <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">
            {format(currentTime, 'EEEE, MMMM d')}
          </p>
          <h2 className="text-white text-xl font-black">{greeting()}, Admin 👋</h2>
          <p className="text-gray-400 text-sm mt-1">
            {activeAssignments} active assignments this week
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            <span className="text-primary text-xs font-bold">System Operational</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Active Crew', value: activeEmployees, icon: Users, color: 'emerald', path: '/employees' },
          { label: 'Job Sites', value: activeSites, icon: MapPin, color: 'blue', path: '/sites' },
          { label: 'Assignments', value: activeAssignments, icon: Calendar, color: 'purple', path: '/schedule' },
          { label: 'Requests', value: pendingRequests, icon: ClipboardList, color: pendingRequests > 0 ? 'red' : 'yellow', path: '/requests' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          const colorMap = {
            emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            blue: { icon: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            yellow: { icon: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
            red: { icon: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
            purple: { icon: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          };
          const c = colorMap[stat.color];
          return (
            <motion.button
              key={stat.label}
              custom={i + 1}
              variants={BENTO_VARIANTS}
              initial="hidden"
              animate="visible"
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(stat.path)}
              className="text-left p-4 rounded-3xl bg-card border border-border hover:border-primary/20 transition-all active-scale"
            >
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center mb-3 ${c.bg} ${c.border}`}>
                <Icon className={`w-5 h-5 ${c.icon}`} />
              </div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs font-bold text-gray-500 mt-0.5 uppercase tracking-wide">{stat.label}</div>
            </motion.button>
          );
        })}
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <motion.div custom={5} variants={BENTO_VARIANTS} initial="hidden" animate="visible">
          <SectionHeader title="Announcements" icon={Megaphone} count={announcements.length} />
          <div className="space-y-2 mt-2">
            {announcements.slice(0, 3).map((ann) => (
              <AnnouncementCard key={ann.id} announcement={ann} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div custom={6} variants={BENTO_VARIANTS} initial="hidden" animate="visible">
        <SectionHeader title="Quick Actions" icon={Activity} />
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { label: 'Schedule', icon: Calendar, path: '/schedule', color: 'text-purple-400 bg-purple-500/10' },
            { label: 'Employees', icon: Users, path: '/employees', color: 'text-blue-400 bg-blue-500/10' },
            { label: 'Sites', icon: MapPin, path: '/sites', color: 'text-emerald-400 bg-emerald-500/10' },
            { label: 'Requests', icon: ClipboardList, path: '/requests', color: 'text-yellow-400 bg-yellow-500/10' },
            { label: 'Analytics', icon: TrendingUp, path: '/analytics', color: 'text-pink-400 bg-pink-500/10' },
            { label: 'Alerts', icon: AlertTriangle, path: '/notifications', color: 'text-red-400 bg-red-500/10' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                whileTap={{ scale: 0.93 }}
                onClick={() => navigate(action.path)}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-border bg-card active-scale`}
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

      {/* Recent Assignments */}
      {assignments.length > 0 && (
        <motion.div custom={7} variants={BENTO_VARIANTS} initial="hidden" animate="visible">
          <SectionHeader title="Recent Assignments" icon={Calendar} action={{ label: 'See All', path: '/schedule', navigate }} />
          <div className="space-y-2 mt-2">
            {assignments.slice(0, 4).map((a) => (
              <AssignmentRow key={a.id} assignment={a} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, count, action }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        <span className="text-white font-bold text-sm uppercase tracking-wide">{title}</span>
        {count !== undefined && (
          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center">
            {count}
          </span>
        )}
      </div>
      {action && (
        <button onClick={() => action.navigate(action.path)} className="flex items-center gap-1 text-primary text-xs font-bold">
          {action.label} <ChevronRight className="w-3 h-3" />
        </button>
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
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-2xl border ${config.color} active-scale`}
    >
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${config.dot}`} />
        <div>
          <p className="text-white font-bold text-sm">{announcement.title}</p>
          <p className="text-gray-400 text-xs mt-1 leading-relaxed line-clamp-2">{announcement.body}</p>
        </div>
      </div>
    </motion.div>
  );
}

function AssignmentRow({ assignment }) {
  const statusConfig = {
    scheduled: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
    confirmed: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    completed: { color: 'text-gray-400', bg: 'bg-white/5' },
    cancelled: { color: 'text-red-400', bg: 'bg-red-500/10' },
  };
  const s = statusConfig[assignment.status] || statusConfig.scheduled;

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
      <div className={`w-2 h-8 rounded-full ${s.bg.replace('/10', '/30')}`} />
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">{assignment.employee_name || 'Unassigned'}</p>
        <p className="text-gray-500 text-xs truncate">{assignment.jobsite_name} · {assignment.week_start}</p>
      </div>
      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${s.color} ${s.bg}`}>
        {assignment.status}
      </span>
    </div>
  );
}