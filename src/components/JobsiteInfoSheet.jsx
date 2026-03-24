import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation, Users, Building2, ChevronRight } from 'lucide-react';

export default function JobsiteInfoSheet({ site, groupSites = [], onClose }) {
  if (!site) return null;

  const handleDirections = (s) => {
    if (s.latitude && s.longitude) {
      window.open(`https://maps.google.com/?q=${s.latitude},${s.longitude}`, '_blank');
    } else if (s.address) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(s.address)}`, '_blank');
    }
  };

  // sibling sites in same group (excluding the primary)
  const siblings = groupSites.filter(s => s.id !== site.id);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          className="relative bg-card border-t border-border rounded-t-3xl max-h-[85vh] flex flex-col"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="px-5 pt-2 pb-4 flex items-start justify-between flex-shrink-0 border-b border-border">
            <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-0.5">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <h2 className="text-white font-black text-lg leading-tight truncate">
                {site.jobsite_group ? `${site.jobsite_group} — ${site.jobsite_name}` : site.jobsite_name}
              </h2>
            </div>
            {site.city && (
              <p className="text-gray-500 text-xs ml-6 mt-0.5">{site.city}, {site.state}</p>
            )}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 active-scale"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

            {/* Primary site details */}
            <div>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-3">Site Details</p>
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Site ID" value={site.jobsite_id_ref || 'N/A'} />
                <InfoField label="Customer" value={site.jobsite_group || '—'} />
                <InfoField label="Address" value={site.address || '—'} />
                <InfoField label="City / State" value={site.city && site.state ? `${site.city}, ${site.state}` : '—'} />
                <InfoField label="Manager" value={site.manager || 'Unassigned'} />
                <InfoField label="Min Staffing" value={site.min_staffing || 1} />
                {site.safety_score != null && (
                  <InfoField label="Safety Score" value={`${site.safety_score}%`} highlight />
                )}
                {site.drive_time_minutes != null && (
                  <InfoField label="Drive Time" value={`${site.drive_time_minutes} min`} />
                )}
                {site.wage && (
                  <InfoField label="Wage" value={site.wage} highlight />
                )}
              </div>

              {site.notes && (
                <div className="mt-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-gray-600 text-[10px] uppercase font-bold tracking-widest mb-1">Notes</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{site.notes}</p>
                </div>
              )}
            </div>

            {/* Directions button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleDirections(site)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active-scale"
            >
              <Navigation className="w-4 h-4" />
              Get Directions
            </motion.button>

            {/* Sibling sites in same group */}
            {siblings.length > 0 && (
              <div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-3">
                  Other Sites in {site.jobsite_group || 'This Group'}
                </p>
                <div className="space-y-2">
                  {siblings.map(s => (
                    <div key={s.id} className="p-3 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate">{s.jobsite_name}</p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {s.jobsite_id_ref && <span className="text-primary mr-2">{s.jobsite_id_ref}</span>}
                            {s.city && `${s.city}, ${s.state}`}
                          </p>
                          {s.manager && <p className="text-gray-600 text-xs mt-0.5">Manager: {s.manager}</p>}
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDirections(s)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-500 text-xs font-bold active-scale hover:text-primary hover:border-primary/20 transition-colors flex-shrink-0"
                        >
                          <Navigation className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safe area spacer */}
            <div className="h-4" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function InfoField({ label, value, highlight }) {
  return (
    <div>
      <p className="text-gray-600 text-[10px] uppercase font-bold tracking-widest">{label}</p>
      <p className={`text-sm font-bold mt-0.5 truncate ${highlight ? 'text-primary' : 'text-white'}`}>{value || '—'}</p>
    </div>
  );
}