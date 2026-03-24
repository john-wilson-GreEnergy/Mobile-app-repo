import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, normalizeRequest } from '@/lib/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList, ChevronLeft, Plus, CheckCircle2, XCircle,
  Clock, User, MessageSquare, X, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const TYPE_CONFIG = {
  time_off: { label: 'Time Off', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  schedule_change: { label: 'Schedule Change', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  equipment: { label: 'Equipment', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  general: { label: 'General', color: 'text-gray-400 bg-white/5 border-white/10' },
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  approved: { label: 'Approved', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  denied: { label: 'Denied', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle },
};

export default function Requests() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', request_type: 'general', priority: 'medium' });

  const { data: rawRequests = [], isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => db.portal_requests.list('-created_at'),
  });
  const requests = rawRequests.map(normalizeRequest);

  const createMutation = useMutation({
    mutationFn: (data) => db.portal_requests.create({
      request_type: data.request_type,
      details: data.description,
      status: 'pending',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setShowForm(false);
      setForm({ subject: '', description: '', request_type: 'general', priority: 'medium' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.portal_requests.update(id, { status: data.status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests'] }),
  });

  const filtered = requests.filter(r =>
    statusFilter === 'all' || r.status === statusFilter
  );

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center active-scale"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-bold active-scale"
          >
            <Plus className="w-4 h-4" /> New Request
          </motion.button>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {['all', 'pending', 'approved', 'denied'].map(f => (
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
              {f} {f !== 'all' && `(${requests.filter(r => r.status === f).length})`}
            </motion.button>
          ))}
        </div>

        {/* Request List */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-3xl bg-card border border-border animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-card border border-border flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-white font-bold">No requests found</p>
              <p className="text-gray-500 text-sm mt-1">All caught up!</p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((req, i) => {
                const type = TYPE_CONFIG[req.request_type] || TYPE_CONFIG.general;
                const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-4 rounded-3xl bg-card border border-border"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{req.subject}</p>
                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{req.description}</p>
                      </div>
                      <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-xl border ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${type.color}`}>
                        {type.label}
                      </span>
                      {req.employee_name && (
                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                          <User className="w-3 h-3" /> {req.employee_name}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-600 ml-auto">
                        {req.created_date ? format(new Date(req.created_date), 'MMM d') : ''}
                      </span>
                    </div>

                    {/* Admin Actions */}
                    {req.status === 'pending' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={() => updateMutation.mutate({ id: req.id, data: { status: 'approved' } })}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold active-scale"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={() => updateMutation.mutate({ id: req.id, data: { status: 'denied' } })}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold active-scale"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Deny
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* New Request Bottom Sheet */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-3xl p-6 pb-10"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-black text-lg">New Request</h3>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowForm(false)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center active-scale">
                  <X className="w-4 h-4 text-gray-400" />
                </motion.button>
              </div>

              <div className="space-y-3">
                <select
                  value={form.request_type}
                  onChange={e => setForm(f => ({ ...f, request_type: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border text-white text-sm outline-none focus:border-primary/50"
                >
                  <option value="time_off">Time Off</option>
                  <option value="schedule_change">Schedule Change</option>
                  <option value="equipment">Equipment</option>
                  <option value="general">General</option>
                </select>
                <input
                  type="text"
                  placeholder="Subject"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border text-white text-sm placeholder-gray-600 outline-none focus:border-primary/50"
                />
                <textarea
                  placeholder="Describe your request..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border text-white text-sm placeholder-gray-600 outline-none focus:border-primary/50 resize-none"
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.subject || !form.description || createMutation.isPending}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold active-scale disabled:opacity-40"
                >
                  {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}