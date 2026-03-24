import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { db, normalizeEmployee, fetchAssignments } from '@/lib/db';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock, CheckCircle2, Info, WifiOff } from 'lucide-react';
import { format, startOfWeek, addWeeks, subWeeks, addDays } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import Schedule from './Schedule';
import { fetchAndCacheAssignments } from '@/lib/cacheService';
import { useOnlineStatus } from '@/lib/useOfflineSync';

export default function EmployeeSchedule() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [weekOffset, setWeekOffset] = useState(0);
  const [cachedAssignments, setCachedAssignments] = useState([]);

  const baseWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeek = weekOffset >= 0 ? addWeeks(baseWeek, weekOffset) : subWeeks(baseWeek, Math.abs(weekOffset));
  const weekEnd = addDays(currentWeek, 6);
  const weekLabel = `${format(currentWeek, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  const { data: empRows = [] } = useQuery({
    queryKey: ['my-employee', user?.email],
    queryFn: () => db.employees.filter({ email: user?.email }),
    enabled: !!user?.email,
  });
  const myEmployee = empRows[0] ? normalizeEmployee(empRows[0]) : null;

  // Managers get the full schedule view
  if (myEmployee && (myEmployee.role === 'site_manager' || myEmployee.role === 'site_lead')) {
    return <Schedule />;
  }

  const { data: liveAssignments = [], isLoading } = useQuery({
    queryKey: ['my-assignments', myEmployee?.id],
    queryFn: async () => {
      return fetchAndCacheAssignments(
        myEmployee.id,
        () => fetchAssignments({ employee_fk: myEmployee.id }),
        isOnline
      );
    },
    enabled: !!myEmployee?.id,
  });

  // Sync cached assignments for offline use
  useEffect(() => {
    if (myEmployee?.id) {
      fetchAndCacheAssignments(
        myEmployee.id,
        () => Promise.resolve(liveAssignments),
        false
      ).then(setCachedAssignments);
    }
  }, [liveAssignments, myEmployee?.id]);

  const assignments = isOnline ? liveAssignments : cachedAssignments;

  const myAssignments = assignments.filter(a => {
    const weekStart = format(currentWeek, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    return a.week_start >= weekStart && a.week_start <= weekEndStr;
  });

  const allUpcoming = assignments.filter(a =>
    (a.status === 'scheduled' || a.status === 'confirmed') &&
    a.week_start >= format(new Date(), 'yyyy-MM-dd')
  );

  return (
    <div className="pb-6">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="mx-4 mt-4 flex items-center gap-2 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
          <WifiOff className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-400 text-xs font-bold">Showing cached schedule — you're offline</p>
        </div>
      )}
      {/* Week Selector */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between bg-card border border-border rounded-3xl p-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setWeekOffset(w => w - 1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 active-scale">
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </motion.button>
          <div className="text-center">
            <p className="text-white font-bold text-sm">{weekLabel}</p>
            {weekOffset === 0 && <p className="text-primary text-xs font-bold">Current Week</p>}
            {weekOffset === 1 && <p className="text-gray-500 text-xs">Next Week</p>}
            {weekOffset === -1 && <p className="text-gray-500 text-xs">Last Week</p>}
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setWeekOffset(w => w + 1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 active-scale">
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </motion.button>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 mt-3 grid grid-cols-2 gap-2">
        <div className="text-center p-3 rounded-2xl bg-card border border-border">
          <div className="text-xl font-black text-white">{allUpcoming.length}</div>
          <div className="text-[10px] text-gray-600 uppercase font-bold mt-0.5">Upcoming</div>
        </div>
        <div className="text-center p-3 rounded-2xl bg-card border border-border">
          <div className="text-xl font-black text-emerald-400">{assignments.filter(a => a.status === 'confirmed').length}</div>
          <div className="text-[10px] text-gray-600 uppercase font-bold mt-0.5">Confirmed</div>
        </div>
      </div>

      {/* This week's assignments */}
      <div className="px-4 mt-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-3xl bg-card border border-border animate-pulse" />
          ))
        ) : myAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-card border border-border flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-white font-bold">No assignments this week</p>
            <p className="text-gray-500 text-sm mt-1">Check other weeks using the navigator above</p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest px-1">This Week</p>
            <AnimatePresence>
              {myAssignments.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <AssignmentCard assignment={a} />
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}

        {/* All upcoming */}
        {allUpcoming.length > 0 && myAssignments.length === 0 && (
          <>
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest px-1 mt-2">All Upcoming</p>
            {allUpcoming.slice(0, 5).map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <AssignmentCard assignment={a} />
              </motion.div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function AssignmentCard({ assignment }) {
  const statusConfig = {
    scheduled: { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Clock },
    confirmed: { label: 'Confirmed', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
    completed: { label: 'Completed', color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10', icon: CheckCircle2 },
    cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Info },
  };
  const s = statusConfig[assignment.status] || statusConfig.scheduled;
  const StatusIcon = s.icon;

  return (
    <div className={`p-4 rounded-3xl border ${s.bg} ${s.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-white font-bold text-sm truncate">{assignment.jobsite_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
            <span className="text-gray-400 text-xs">Week of {assignment.week_start}</span>
          </div>
          {assignment.rotation_week && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg mt-2 inline-block">
              Rotation Week {assignment.rotation_week}
            </span>
          )}
          {assignment.notes && (
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">{assignment.notes}</p>
          )}
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border flex-shrink-0 ${s.color} ${s.bg} ${s.border}`}>
          <StatusIcon className="w-3 h-3" />
          {s.label}
        </div>
      </div>
    </div>
  );
}