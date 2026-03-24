import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, normalizeEmployee, normalizeJobsite, fetchAssignments } from '@/lib/db';
import { format, startOfWeek, addWeeks, subWeeks, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Users, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Schedule() {
  const [weekOffset, setWeekOffset] = useState(0);

  const baseWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeek = weekOffset >= 0 ? addWeeks(baseWeek, weekOffset) : subWeeks(baseWeek, Math.abs(weekOffset));
  const weekEnd = addDays(currentWeek, 6);
  const weekLabel = `${format(currentWeek, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
  const weekStartStr = format(currentWeek, 'yyyy-MM-dd');

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments-week', weekStartStr],
    queryFn: () => fetchAssignments({ week_start: weekStartStr }),
  });

  const { data: siteRows = [] } = useQuery({
    queryKey: ['jobsites'],
    queryFn: () => db.jobsites.list(),
  });
  const jobsites = siteRows.map(normalizeJobsite);

  // Group assignments by jobsite
  const byJobsite = jobsites.map(site => ({
    site,
    assignments: assignments.filter(a => a.jobsite_id === site.id),
  }));

  return (
    <div className="px-4 py-4 pb-6">
      {/* Week Selector */}
      <div className="flex items-center justify-between bg-card border border-border rounded-3xl p-3 mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setWeekOffset(w => w - 1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 active-scale">
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </motion.button>
        <div className="text-center">
          <p className="text-white font-bold text-sm">{weekLabel}</p>
          {weekOffset === 0 && <p className="text-primary text-xs font-bold">Current Week</p>}
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setWeekOffset(w => w + 1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 active-scale">
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </motion.button>
      </div>

      {/* Schedule by Site */}
      <div className="space-y-4">
        {byJobsite.map(({ site, assignments: siteAssignments }) => (
          <div key={site.id} className="rounded-3xl bg-card border border-border p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-white font-bold truncate">{site.jobsite_name}</p>
                </div>
                {site.city && (
                  <p className="text-gray-500 text-xs">{site.city}, {site.state}</p>
                )}
              </div>
              <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">
                {siteAssignments.length} / {site.min_staffing || 1}
              </span>
            </div>

            {siteAssignments.length === 0 ? (
              <div className="py-4 text-center text-gray-500 text-xs">No assignments</div>
            ) : (
              <div className="space-y-2">
                {siteAssignments.map(a => (
                  <div key={a.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                    <Users className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="text-white text-xs font-bold flex-1">{a.employee_name || 'Unassigned'}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      a.status === 'confirmed' ? 'text-emerald-400 bg-emerald-500/10' : 'text-blue-400 bg-blue-500/10'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}