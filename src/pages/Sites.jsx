import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, normalizeJobsite, fetchAssignments } from '@/lib/db';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, Search, Users, Activity, ChevronRight,
  Building2, CheckCircle2, AlertTriangle, Clock, X
} from 'lucide-react';

export default function Sites() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSite, setSelectedSite] = useState(null);

  const { data: rawSites = [], isLoading } = useQuery({
    queryKey: ['jobsites'],
    queryFn: () => db.jobsites.list(),
  });
  const jobsites = rawSites.map(normalizeJobsite);

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments-current'],
    queryFn: () => fetchAssignments({ limit: 500 }),
  });

  const filtered = jobsites.filter(site => {
    const matchSearch = !searchQuery ||
      site.jobsite_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.jobsite_id_ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || site.status === statusFilter;
    return matchSearch && matchStatus && site.is_active;
  });

  const getSiteStaffing = (site) => {
    return assignments.filter(a =>
      a.jobsite_id === site.id && (a.status === 'scheduled' || a.status === 'confirmed')
    ).length;
  };

  if (selectedSite) {
    return (
      <SiteDetail
        site={selectedSite}
        staffing={getSiteStaffing(selectedSite)}
        onBack={() => setSelectedSite(null)}
      />
    );
  }

  return (
    <div className="pb-6">
      <div className="px-4 pt-4 space-y-3">
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search sites..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent text-white text-sm placeholder-gray-600 flex-1 outline-none"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'operational', 'commissioning', 'offline'].map(f => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.93 }}
              onClick={() => setStatusFilter(f)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wide transition-all ${
                statusFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-gray-500'
              }`}
            >
              {f}
            </motion.button>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total', value: jobsites.filter(j => j.is_active).length, color: 'text-white' },
            { label: 'Operational', value: jobsites.filter(j => j.status === 'operational').length, color: 'text-emerald-400' },
            { label: 'Offline', value: jobsites.filter(j => j.status === 'offline').length, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded-2xl bg-card border border-border">
              <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-600 uppercase font-bold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Site List */}
        <div className="space-y-2 mt-1">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-3xl bg-card border border-border animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <EmptySites />
          ) : (
            <AnimatePresence>
              {filtered.map((site, i) => (
                <motion.div
                  key={site.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <SiteCard
                    site={site}
                    staffing={getSiteStaffing(site)}
                    onClick={() => setSelectedSite(site)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

function SiteCard({ site, staffing, onClick }) {
  const statusConfig = {
    operational: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
    commissioning: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Clock },
    offline: { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle },
  };
  const s = statusConfig[site.status] || statusConfig.operational;
  const StatusIcon = s.icon;
  const isUnderstaffed = staffing < (site.min_staffing || 1);

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left p-4 rounded-3xl bg-card border border-border hover:border-primary/20 transition-all active-scale"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${s.bg} ${s.color.replace('text-', 'border-').replace('400', '500/20')}`}>
            <Building2 className={`w-5 h-5 ${s.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{site.jobsite_name}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {site.jobsite_id_ref && <span className="text-primary mr-2">{site.jobsite_id_ref}</span>}
              {site.city && `${site.city}, ${site.state}`}
            </p>
            {site.jobsite_group && (
              <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-lg mt-1 inline-block">
                {site.jobsite_group}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-xl ${s.color} ${s.bg}`}>
            {site.status || 'operational'}
          </span>
          <div className="flex items-center gap-1">
            <Users className={`w-3.5 h-3.5 ${isUnderstaffed ? 'text-red-400' : 'text-gray-500'}`} />
            <span className={`text-xs font-bold ${isUnderstaffed ? 'text-red-400' : 'text-gray-400'}`}>
              {staffing}/{site.min_staffing || 1}
            </span>
          </div>
        </div>
      </div>
      {site.manager && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center text-primary text-[9px] font-black">
            {site.manager.charAt(0)}
          </div>
          <span className="text-gray-500 text-xs">{site.manager}</span>
        </div>
      )}
    </motion.button>
  );
}

function SiteDetail({ site, staffing, onBack }) {
  const statusConfig = {
    operational: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    commissioning: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    offline: { color: 'text-red-400', bg: 'bg-red-500/10' },
  };
  const s = statusConfig[site.status] || statusConfig.operational;

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        {/* Back + Title */}
        <div className="flex items-center gap-3 mb-6">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center active-scale">
            <ChevronRight className="w-5 h-5 text-gray-400 rotate-180" />
          </motion.button>
          <div>
            <h2 className="text-white font-black text-lg">{site.jobsite_name}</h2>
            <p className="text-primary text-xs font-bold">{site.jobsite_id_ref}</p>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`flex items-center gap-3 p-4 rounded-2xl border mb-4 ${s.bg} ${s.color.replace('text-', 'border-').replace('400', '500/20')}`}>
          <Activity className={`w-5 h-5 ${s.color}`} />
          <span className={`font-bold text-sm uppercase tracking-wide ${s.color}`}>{site.status || 'Operational'}</span>
        </div>

        {/* Details */}
        <div className="space-y-3">
          {[
            { label: 'Address', value: site.address ? `${site.address}, ${site.city}, ${site.state}` : 'N/A' },
            { label: 'Group', value: site.jobsite_group || 'N/A' },
            { label: 'Manager', value: site.manager || 'N/A' },
            { label: 'Min Staffing', value: site.min_staffing || 1 },
            { label: 'Current Staff', value: `${staffing} assigned` },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border">
              <span className="text-gray-500 text-sm">{item.label}</span>
              <span className="text-white font-bold text-sm">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptySites() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-3xl bg-card border border-border flex items-center justify-center mb-4">
        <MapPin className="w-8 h-8 text-gray-600" />
      </div>
      <p className="text-white font-bold">No sites found</p>
      <p className="text-gray-500 text-sm mt-1">Try adjusting your search</p>
    </div>
  );
}