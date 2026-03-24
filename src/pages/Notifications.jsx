import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, normalizeEmployee, fetchAssignments } from '@/lib/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, Clock, XCircle, MapPin, ChevronLeft, Calendar, Check, CheckCheck, Eye, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';

const typeConfig = {
  confirmed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  scheduled: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  cancelled: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  completed: { icon: CheckCircle2, color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' },
  survey: { icon: ClipboardCheck, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  info: { icon: Bell, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [readIds, setReadIds] = useState(new Set());
  const [acknowledgedIds, setAcknowledgedIds] = useState(new Set());

  const { data: empRows = [] } = useQuery({
    queryKey: ['my-employee', user?.email],
    queryFn: () => db.employees.filter({ email: user?.email }),
    enabled: !!user?.email,
  });
  const myEmployee = empRows[0] ? normalizeEmployee(empRows[0]) : null;

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['my-assignments-notif', myEmployee?.id],
    queryFn: () => fetchAssignments({ employee_fk: myEmployee.id }),
    enabled: !!myEmployee?.id,
  });

  const { data: surveyNotifs = [], isLoading: loadingSurveyNotifs } = useQuery({
    queryKey: ['survey-notifications', myEmployee?.id],
    queryFn: () => db.notifications.filter({ employee_id: myEmployee.id }, '-created_at', 50),
    enabled: !!myEmployee?.id,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => db.notifications.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['survey-notifications', myEmployee?.id] }),
  });

  const isLoading = loadingAssignments || loadingSurveyNotifs;

  const assignmentNotifs = assignments.map(a => ({
    id: a.id,
    title: statusTitle(a.status, a.jobsite_name),
    message: buildMessage(a),
    type: statusType(a.status),
    date: a.updated_date || a.created_date || a.week_start,
    assignment: a,
    isAssignmentRelated: true,
    isSurvey: false,
  }));

  const surveyNotifsFormatted = surveyNotifs.map(n => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: 'survey',
    date: n.created_at || n.created_date,
    isRead: n.read,
    actionUrl: n.action_url,
    isAssignmentRelated: false,
    isSurvey: true,
  }));

  const allNotifications = [
    ...surveyNotifsFormatted,
    ...assignmentNotifs,
  ].sort((a, b) => {
    const da = a.date ? new Date(a.date) : new Date(0);
    const db2 = b.date ? new Date(b.date) : new Date(0);
    return db2 - da;
  });

  const filtered = filter === 'all'
    ? allNotifications
    : filter === 'surveys'
    ? allNotifications.filter(n => n.isSurvey)
    : filter === 'acknowledged'
    ? allNotifications.filter(n => acknowledgedIds.has(n.id))
    : filter === 'scheduled'
    ? allNotifications.filter(n => n.type === 'scheduled' && !acknowledgedIds.has(n.id))
    : allNotifications.filter(n => !n.isAssignmentRelated && !n.isSurvey);

  const isRead = (notif) => notif.isSurvey ? notif.isRead : readIds.has(notif.id);
  const unreadCount = allNotifications.filter(n => !isRead(n)).length;

  const markRead = (notif) => {
    if (notif.isSurvey) {
      if (!notif.isRead) markReadMutation.mutate(notif.id);
    } else {
      setReadIds(prev => new Set([...prev, notif.id]));
    }
  };
  const markAllRead = () => {
    setReadIds(new Set(assignmentNotifs.map(n => n.id)));
    surveyNotifsFormatted.filter(n => !n.isRead).forEach(n => markReadMutation.mutate(n.id));
  };
  const acknowledge = (notif) => {
    setAcknowledgedIds(prev => new Set([...prev, notif.id]));
    markRead(notif);
  };

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
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold active-scale"
              >
                <Eye className="w-3.5 h-3.5" />
                Mark All Read
              </motion.button>
            )}
            <span className="text-gray-500 text-xs font-bold">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'surveys', label: 'Surveys' },
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'acknowledged', label: 'Acknowledged' },
          ].map(f => (
            <motion.button
              key={f.id}
              whileTap={{ scale: 0.93 }}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                filter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-gray-500'
              }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-3xl bg-card border border-border animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-card border border-border flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-white font-bold">No updates</p>
              <p className="text-gray-500 text-sm mt-1">No assignment updates found</p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((notif, i) => {
                const config = typeConfig[notif.type] || typeConfig.scheduled;
                const Icon = config.icon;
                const notifIsRead = isRead(notif);
                const isAcknowledged = acknowledgedIds.has(notif.id);
                const canAcknowledge = !notif.isSurvey && (notif.type === 'scheduled' || notif.type === 'confirmed');

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`p-4 rounded-3xl border transition-opacity ${config.bg} ${config.border} ${notifIsRead ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${config.bg} ${config.border}`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-bold text-sm">{notif.title}</p>
                          {!notifIsRead && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-gray-400 text-xs mt-1 leading-relaxed">{notif.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-600" />
                            <span className="text-gray-600 text-[10px]">
                              {notif.isSurvey
                                ? (notif.date ? format(new Date(notif.date), 'MMM d, yyyy') : '—')
                                : `Week of ${notif.assignment?.week_start}`}
                            </span>
                          </div>
                          {!notif.isSurvey && notif.assignment?.jobsite_name && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-primary" />
                              <span className="text-primary text-[10px] font-bold truncate">{notif.assignment.jobsite_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                          {!notifIsRead && (
                            <motion.button
                              whileTap={{ scale: 0.93 }}
                              onClick={() => markRead(notif)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-bold active-scale hover:text-white transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              Mark Read
                            </motion.button>
                          )}

                          {notif.isSurvey && notif.actionUrl && (
                            <motion.button
                              whileTap={{ scale: 0.93 }}
                              onClick={() => { markRead(notif); navigate(notif.actionUrl); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold active-scale"
                            >
                              <ClipboardCheck className="w-3 h-3" />
                              View Surveys
                            </motion.button>
                          )}

                          {canAcknowledge && (
                            isAcknowledged ? (
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold"
                              >
                                <CheckCheck className="w-3 h-3" />
                                Acknowledged
                              </motion.div>
                            ) : (
                              <motion.button
                                whileTap={{ scale: 0.93 }}
                                onClick={() => acknowledge(notif)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold active-scale"
                              >
                                <Check className="w-3 h-3" />
                                Confirm Receipt
                              </motion.button>
                            )
                          )}
                        </div>
                      </div>
                      <span className="text-gray-600 text-[10px] flex-shrink-0">
                        {notif.date ? format(new Date(notif.date), 'MMM d') : '—'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

function statusTitle(status, jobsite) {
  switch (status) {
    case 'confirmed': return `Assignment Confirmed${jobsite ? ` · ${jobsite}` : ''}`;
    case 'scheduled': return `Assignment Scheduled${jobsite ? ` · ${jobsite}` : ''}`;
    case 'cancelled': return `Assignment Cancelled${jobsite ? ` · ${jobsite}` : ''}`;
    case 'completed': return `Assignment Completed${jobsite ? ` · ${jobsite}` : ''}`;
    default: return `Assignment Update${jobsite ? ` · ${jobsite}` : ''}`;
  }
}

function buildMessage(a) {
  const parts = [];
  if (a.rotation_week) parts.push(`Rotation Week ${a.rotation_week}`);
  if (a.notes) parts.push(a.notes);
  if (!parts.length) parts.push(`Status: ${a.status}`);
  return parts.join(' · ');
}

function statusType(status) {
  return ['confirmed', 'scheduled', 'cancelled', 'completed'].includes(status) ? status : 'scheduled';
}