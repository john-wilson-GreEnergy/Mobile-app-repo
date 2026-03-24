import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, normalizeEmployee, normalizeJobsite, normalizeAnnouncement, fetchAssignments } from '@/lib/db';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { format, startOfWeek } from 'date-fns';
import {
  MapPin, Users, Calendar, ClipboardList,
  Zap, CheckCircle2, Clock, Search, AlertTriangle
} from 'lucide-react';

const VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' } }),
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'crew', label: 'Crew' },
  { id: 'schedule', label: 'Schedule' },
];

export default function SiteLeadPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

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
  const allJobsites = siteRows.map(normalizeJobsite);

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['assignments-week', currentWeekStart],
    queryFn: () => fetchAssignments({ week_start: currentWeekStart }),
  });

  const { data: myAssignmentHistory = [] } = useQuery({
    queryKey: ['my-assignments', myEmployee?.id],
    queryFn: () => fetchAssignments({ employee_fk: myEmployee.id }),
    enabled: !!myEmployee?.id,
  });

  const { data: annRows = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => db.announcements.list(),
  });
  const announcements = annRows.map(normalizeAnnouncement);

  const { data: allEmpRows = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => db.employees.list(),
  });
  const allEmployees = allEmpRows.map(normalizeEmployee);

  // Find site this lead is assigned to this week
  const myCurrentAssignment = useMemo(() =>
    allAssignments.find(a => a.employee_id === myEmployee?.id),
    [allAssignments, myEmployee]
  );

  const mySite = useMemo(() =>
    allJobsites.find(s => s.id === myCurrentAssignment?.jobsite_id),
    [allJobsites, myCurrentAssignment]
  );

  // Crew at the same site this week
  const siteAssignments = useMemo(() =>
    mySite ? allAssignments.filter(a => a.jobsite_id === mySite.id) : [],
    [allAssignments, mySite]
  );

  const siteCrewIds = new Set(siteAssignments.map(a => a.employee_id));
  const siteCrew = useMemo(() =>
    allEmployees.filter(e => e.is_active && siteCrewIds.has(e.id)),
    [allEmployees, siteCrewIds]
  );

  const filteredCrew = useMemo(() =>
    siteCrew.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [siteCrew, searchQuery]
  );

  const upcomingAssignments = myAssignmentHistory.filter(a =>
    (a.status === 'scheduled' || a.status === 'confirmed') && a.week_start >= currentWeekStart
  ).slice(0, 5);

  const firstName = myEmployee?.first_name || user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="pb-6">
      {/* Tab Bar */}
      <div className="px-4 pt-4 flex gap-2 pb-3">
        {TABS.map(tab => (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.93 }}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wide transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-gray-500'
            }`}
          >
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="px-4 space-y-4">
          {/* Hero */}
          <motion.div
            custom={0} variants={VARIANTS} initial="hidden" animate="visible"
            className="relative overflow-hidden rounded-3xl p-5 border border-primary/20"
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(10,18,15,0.9) 100%)' }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
              <Zap className="w-full h-full text-primary" />
            </div>
            <div className="relative">
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">
                Site Lead · {currentWeekStart}
              </p>
              <h2 className="text-white text-lg font-black">Hey {firstName} 👋</h2>
              {mySite ? (
                <>
                  <p className="text-gray-400 text-sm mt-1">{mySite.jobsite_name}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-primary text-xs font-bold">{siteCrew.length} crew members this week</span>
                  </div>
                </>
              ) : (
                <p className="text-gray-400 text-sm mt-1">No site assignment this week</p>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Site Crew', value: siteCrew.length, icon: Users, color: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }, tab: 'crew' },
              { label: 'My Upcoming', value: upcomingAssignments.length, icon: Calendar, color: { icon: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }, tab: 'schedule' },
              { label: 'Current Site', value: mySite ? 1 : 0, icon: MapPin, color: { icon: mySite ? 'text-blue-400' : 'text-gray-400', bg: mySite ? 'bg-blue-500/10' : 'bg-white/5', border: mySite ? 'border-blue-500/20' : 'border-white/10' }, path: '/sites' },
              { label: 'Requests', value: 0, icon: ClipboardList, color: { icon: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' }, path: '/requests' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.button
                  key={stat.label}
                  custom={i + 1} variants={VARIANTS} initial="hidden" animate="visible"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => stat.path ? navigate(stat.path) : setActiveTab(stat.tab)}
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

          {/* Current Site Info */}
          {mySite && (
            <motion.div custom={5} variants={VARIANTS} initial="hidden" animate="visible">
              <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2 px-1">Current Site</p>
              <div className="p-4 rounded-3xl bg-card border border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-bold">{mySite.jobsite_name}</p>
                    {mySite.jobsite_id_ref && <p className="text-primary text-xs font-bold mt-0.5">{mySite.jobsite_id_ref}</p>}
                    {mySite.city && <p className="text-gray-500 text-xs mt-1">{mySite.city}, {mySite.state}</p>}
                    {mySite.manager && <p className="text-gray-600 text-xs mt-1">Manager: {mySite.manager}</p>}
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-xl ${
                    mySite.status === 'operational' ? 'text-emerald-400 bg-emerald-500/10' :
                    mySite.status === 'offline' ? 'text-red-400 bg-red-500/10' : 'text-yellow-400 bg-yellow-500/10'
                  }`}>
                    {mySite.status || 'operational'}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Crew Assigned</span>
                  <span className="text-white font-bold text-sm">{siteCrew.length} / {mySite.min_staffing || 1}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Announcements */}
          {announcements.length > 0 && (
            <motion.div custom={6} variants={VARIANTS} initial="hidden" animate="visible">
              <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2 px-1">Announcements</p>
              <div className="space-y-2">
                {announcements.slice(0, 3).map(ann => (
                  <AnnouncementCard key={ann.id} announcement={ann} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ── CREW TAB ── */}
      {activeTab === 'crew' && (
        <div className="px-4 space-y-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border">
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search crew..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-white text-sm placeholder-gray-600 flex-1 outline-none"
            />
          </div>

          {mySite && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-primary text-xs font-bold">{mySite.jobsite_name} · Week of {currentWeekStart}</span>
            </div>
          )}

          <p className="text-gray-500 text-xs font-bold px-1">{filteredCrew.length} crew members</p>

          <div className="space-y-2">
            <AnimatePresence>
              {filteredCrew.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="w-8 h-8 text-gray-600 mb-3" />
                  <p className="text-white font-bold">No crew at your site this week</p>
                </div>
              ) : (
                filteredCrew.map((emp, i) => {
                  const assignment = siteAssignments.find(a => a.employee_id === emp.id);
                  const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
                  const isMe = emp.email === user?.email;
                  return (
                    <motion.div
                      key={emp.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border ${isMe ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-primary/20 border border-primary/30' : 'bg-primary/10 border border-primary/20'}`}>
                        <span className="text-primary font-black text-xs">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">{emp.first_name} {emp.last_name} {isMe && '(You)'}</p>
                        <p className="text-gray-500 text-xs capitalize">{emp.role?.replace('_', ' ')}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${assignment?.status === 'confirmed' ? 'text-emerald-400 bg-emerald-500/10' : 'text-blue-400 bg-blue-500/10'}`}>
                        {assignment?.status || 'scheduled'}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── SCHEDULE TAB ── */}
      {activeTab === 'schedule' && (
        <div className="px-4 space-y-3">
          <p className="text-gray-500 text-xs font-black uppercase tracking-widest px-1">My Upcoming Assignments</p>
          <div className="space-y-2">
            <AnimatePresence>
              {upcomingAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Calendar className="w-8 h-8 text-gray-600 mb-3" />
                  <p className="text-white font-bold">No upcoming assignments</p>
                </div>
              ) : (
                upcomingAssignments.map((a, i) => {
                  const s = a.status === 'confirmed'
                    ? { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 }
                    : { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Clock };
                  const Icon = s.icon;
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`p-4 rounded-3xl border ${s.bg} ${s.border}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-2xl border flex items-center justify-center flex-shrink-0 ${s.bg} ${s.border}`}>
                          <Icon className={`w-4 h-4 ${s.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-bold text-sm">{a.jobsite_name}</p>
                          <p className="text-gray-400 text-xs mt-0.5">Week of {a.week_start}</p>
                          {a.rotation_week && (
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg mt-1 inline-block">
                              Rotation Week {a.rotation_week}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-xl border ${s.color} ${s.bg} ${s.border}`}>
                          {a.status}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/schedule')}
            className="w-full py-3 rounded-2xl border border-border text-gray-400 text-sm font-bold active-scale"
          >
            View Full Schedule →
          </motion.button>
        </div>
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