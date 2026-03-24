import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import {
  ExternalLink, Link2, FileText, Shield, BookOpen, Wrench,
  HelpCircle, Phone, Clipboard, AlertCircle, Users, Settings,
  BarChart3, Calendar, Map, MessageSquare, Star, Zap
} from 'lucide-react';

// Map Lucide icon name string → component
const ICON_MAP = {
  BookOpen, Shield, FileText, Wrench, HelpCircle, Phone,
  Clipboard, AlertCircle, Users, Settings, BarChart3, Calendar,
  Map, MessageSquare, Star, Zap, Link2, ExternalLink,
};

function resolveIcon(iconName) {
  if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName];
  return Link2;
}

export default function GreEnergyLinks() {
  const { data: actionsData = [], isLoading } = useQuery({
    queryKey: ['portal-actions'],
    queryFn: () => db.portal_actions.list('sort_order'),
  });

  const actions = Array.isArray(actionsData) ? actionsData : [];

  // Group by category if the field exists, otherwise show flat list
  const groups = actions.reduce((acc, action) => {
    const cat = action.category || 'Resources';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(action);
    return acc;
  }, {});

  const groupEntries = Object.entries(groups);

  return (
    <div className="pb-6">
      <div className="px-4 pt-4 space-y-5">
        {/* Header */}
        <div
          className="relative overflow-hidden rounded-3xl p-5 border border-primary/20"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(10,18,15,0.9) 100%)' }}
        >
          <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">Resources</p>
          <h2 className="text-white text-xl font-black">GreEnergy Links</h2>
          <p className="text-gray-400 text-sm mt-1">Quick access to company resources</p>
        </div>

        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-card border border-border animate-pulse" />
          ))
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Link2 className="w-8 h-8 text-gray-600 mb-3" />
            <p className="text-white font-bold">No links available</p>
            <p className="text-gray-500 text-sm mt-1">Check back later for company resources</p>
          </div>
        ) : (
          groupEntries.map(([category, items], gi) => (
            <div key={category}>
              <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2 px-1">{category}</p>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const Icon = resolveIcon(item.icon);
                  const label = item.title || item.name;
                  const url = item.url;
                  return (
                    <motion.a
                      key={item.id}
                      href={url || '#'}
                      target={url ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (gi * items.length + i) * 0.04 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all active-scale block"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">{label}</p>
                        {item.description && (
                          <p className="text-gray-500 text-xs mt-0.5">{item.description}</p>
                        )}
                      </div>
                      {url && <ExternalLink className="w-4 h-4 text-gray-600 flex-shrink-0" />}
                    </motion.a>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}