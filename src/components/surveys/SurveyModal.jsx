import { useState, useEffect } from 'react';
import { X, ChevronRight, Send } from 'lucide-react';
import { db } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';

export default function SurveyModal({ isOpen, onClose, surveyType, raterId, targetId, weekStartDate }) {
  const [questions, setQuestions] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState({ well: '', improve: '', notes: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && surveyType) {
      db.survey_questions.filter({ survey_type: surveyType }, 'display_order').then(setQuestions);
    }
  }, [isOpen, surveyType]);

  if (!isOpen) return null;

  const categories = [...new Set(questions.map(q => q.category))];
  const currentCategory = categories[currentStep];
  const categoryQuestions = questions.filter(q => q.category === currentCategory);
  const isCommentsStep = currentStep >= categories.length;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await db.survey_submissions.create({
        rater_id: raterId,
        target_id: targetId,
        survey_type: surveyType,
        week_start_date: weekStartDate,
        scores,
        comments,
      });

      // Notify the target employee
      const isManagerEval = surveyType?.startsWith('manager_eval') || surveyType?.startsWith('tech_eval_manager');
      await db.notifications.create({
        employee_id: targetId,
        title: isManagerEval ? 'Manager Evaluation Received' : 'Peer Survey Received',
        message: isManagerEval
          ? `A manager has submitted an evaluation for you for the week of ${weekStartDate}.`
          : `A peer has submitted a survey evaluation for you for the week of ${weekStartDate}.`,
        type: 'info',
        read: false,
        action_url: '/surveys',
      });

      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="bg-card border border-border rounded-3xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-black text-lg">
            {isCommentsStep ? 'Comments' : `${currentCategory}`}
          </h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center active-scale">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {[...categories, 'Comments'].map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${i <= currentStep ? 'bg-primary' : 'bg-white/10'}`}
            />
          ))}
        </div>

        {!isCommentsStep ? (
          <div className="space-y-6">
            {categoryQuestions.map(q => (
              <div key={q.id} className="space-y-3">
                <p className="text-sm font-medium text-gray-300">{q.question_text}</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(score => (
                    <button
                      key={score}
                      onClick={() => setScores(prev => ({ ...prev, [q.id]: score }))}
                      className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${
                        scores[q.id] === score
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-4">
              <button
                disabled={currentStep === 0}
                onClick={() => setCurrentStep(s => s - 1)}
                className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-gray-400 disabled:opacity-30 text-sm font-bold"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(s => s + 1)}
                className="px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 active-scale"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { key: 'well', placeholder: 'What does this person do particularly well?' },
              { key: 'improve', placeholder: 'What areas could this person improve in?' },
              { key: 'notes', placeholder: 'Additional notes (optional)' },
            ].map(({ key, placeholder }) => (
              <textarea
                key={key}
                placeholder={placeholder}
                rows={3}
                value={comments[key]}
                onChange={e => setComments(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl bg-background border border-border text-white text-sm placeholder-gray-600 outline-none focus:border-primary/50 resize-none"
              />
            ))}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setCurrentStep(s => s - 1)}
                className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-gray-400 text-sm font-bold"
              >
                Back
              </button>
              <button
                disabled={loading}
                onClick={handleSubmit}
                className="px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 active-scale disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Survey'} <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}