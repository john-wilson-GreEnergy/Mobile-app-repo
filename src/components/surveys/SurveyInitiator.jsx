import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, X, ChevronRight, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SurveyModal from './SurveyModal';

const getSurveyType = (raterRole, targetRole) => {
  if (raterRole === 'bess_tech') {
    if (targetRole === 'site_manager') return 'tech_eval_manager';
    if (targetRole === 'site_lead') return 'tech_eval_lead';
  }
  if (raterRole === 'site_lead') {
    if (targetRole === 'bess_tech') return 'lead_eval_tech';
    if (targetRole === 'site_manager') return 'tech_eval_manager';
  }
  if (raterRole === 'site_manager') {
    if (targetRole === 'bess_tech') return 'manager_eval_tech';
    if (targetRole === 'site_lead') return 'tech_eval_lead';
  }
  return 'tech_eval_manager';
};

const REASON_MESSAGES = {
  no_assignment: 'You have no assignment for this week.',
  rotation_week: 'You are on a rotation/off week — surveys are only available when assigned to a site.',
  role_not_eligible: 'Your role is not eligible to submit surveys.',
};

export default function SurveyInitiator({ myEmployee, weekStartDate }) {
  const [eligibleTargets, setEligibleTargets] = useState([]);
  const [alreadySurveyed, setAlreadySurveyed] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState(null);
  const [error, setError] = useState(null);

  const handleStartSurvey = async () => {
    if (!myEmployee?.id) return;
    setLoading(true);
    setError(null);
    setReason(null);
    try {
      const res = await base44.functions.invoke('getSurveyEligibleTargets', {
        employee_id: myEmployee.id,
        week_start: weekStartDate,
      });
      const { data, already_surveyed, reason: r, error: err } = res.data || {};
      if (err) { setError(err); return; }
      if (r) setReason(r);
      setEligibleTargets(data || []);
      setAlreadySurveyed(already_surveyed || []);
      setShowTargetModal(true);
    } catch (e) {
      setError('Could not load eligible employees.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleStartSurvey}
        disabled={loading}
        className="w-full p-4 bg-white/5 hover:bg-primary/10 hover:border-primary/30 rounded-2xl border border-white/5 flex items-center justify-between transition-all group disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-white">{loading ? 'Checking eligibility...' : 'Start New Survey'}</span>
        </div>
        <Plus className="w-4 h-4 text-gray-500" />
      </button>

      {error && <p className="text-red-400 text-xs mt-2 px-1">{error}</p>}

      {/* Target Selection Sheet */}
      <AnimatePresence>
        {showTargetModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-card border-t border-border rounded-t-3xl w-full max-w-lg p-6 pb-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-black text-lg">Select Employee to Survey</h3>
                <button onClick={() => setShowTargetModal(false)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center active-scale">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Reason message if ineligible */}
              {reason && (
                <p className="text-yellow-400 text-xs font-bold mb-4 p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                  {REASON_MESSAGES[reason] || reason}
                </p>
              )}

              {/* Eligible targets */}
              {eligibleTargets.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
                  {eligibleTargets.map(emp => (
                    <motion.button
                      key={emp.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedTarget(emp);
                        setShowTargetModal(false);
                        setShowSurveyModal(true);
                      }}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all active-scale"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-xs font-black">
                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-bold text-sm">{emp.first_name} {emp.last_name}</p>
                        <p className="text-gray-500 text-xs capitalize">{emp.role?.replace(/_/g, ' ')}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </motion.button>
                  ))}
                </div>
              ) : !reason && (
                <p className="text-gray-500 text-sm text-center py-6">No eligible employees found at your current jobsite this week.</p>
              )}

              {/* Already surveyed this week */}
              {alreadySurveyed.length > 0 && (
                <div className="mt-2">
                  <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-2">Already Surveyed This Week</p>
                  <div className="space-y-1">
                    {alreadySurveyed.map(emp => (
                      <div key={emp.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 opacity-60">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-gray-400 text-sm">{emp.first_name} {emp.last_name}</span>
                        <span className="text-gray-600 text-xs capitalize ml-auto">{emp.role?.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Survey Modal */}
      {selectedTarget && (
        <SurveyModal
          isOpen={showSurveyModal}
          onClose={() => { setShowSurveyModal(false); setSelectedTarget(null); }}
          surveyType={getSurveyType(myEmployee?.role, selectedTarget.role)}
          raterId={myEmployee?.id}
          targetId={selectedTarget.id}
          weekStartDate={weekStartDate}
        />
      )}
    </>
  );
}