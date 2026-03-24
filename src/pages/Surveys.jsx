import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { db, normalizeEmployee } from '@/lib/db';
import { ClipboardCheck, List } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import SurveyInitiator from '@/components/surveys/SurveyInitiator';
import SurveyReviewTab from '@/components/surveys/SurveyReviewTab';

export default function Surveys() {
  const { user } = useAuth();
  const [tab, setTab] = useState('submit');

  const { data: empRows = [] } = useQuery({
    queryKey: ['my-employee', user?.email],
    queryFn: () => db.employees.filter({ email: user?.email }),
    enabled: !!user?.email,
  });
  const myEmployee = empRows[0] ? normalizeEmployee(empRows[0]) : null;

  const isAdmin = user?.role === 'admin';
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return (
    <div className="pb-6">
      <div className="px-4 pt-4 space-y-4">
        {/* Header */}
        <div
          className="relative overflow-hidden rounded-3xl p-5 border border-primary/20"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(10,18,15,0.9) 100%)' }}
        >
          <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">Performance</p>
          <h2 className="text-white text-xl font-black">Surveys</h2>
          <p className="text-gray-400 text-sm mt-1">Submit peer assessments</p>
        </div>

        {/* Tabs — admins can also review all surveys */}
        {isAdmin && (
          <div className="flex gap-2">
            {[
              { id: 'submit', label: 'Submit', icon: ClipboardCheck },
              { id: 'review', label: 'Review All', icon: List },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                    tab === t.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-gray-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {tab === 'submit' ? (
            <motion.div
              key="submit"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {myEmployee ? (
                <SurveyInitiator myEmployee={myEmployee} weekStartDate={weekStart} />
              ) : (
                <div className="p-6 rounded-2xl bg-card border border-border text-center">
                  <p className="text-gray-500 text-sm">Loading your employee profile...</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <SurveyReviewTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}