import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Search, X } from 'lucide-react';
import { format } from 'date-fns';

export default function SurveyReviewTab() {
  const [surveys, setSurveys] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      db.survey_submissions.list('-created_at', 200),
      db.survey_questions.list('display_order', 500),
    ]).then(([subs, qs]) => {
      setSurveys(subs || []);
      setQuestions(qs || []);
      setLoading(false);
    });
  }, []);

  const questionMap = new Map(questions.map(q => [q.id, q.question_text]));

  const filtered = surveys.filter(s => {
    const rater = `${s.rater?.first_name || ''} ${s.rater?.last_name || ''}`.toLowerCase();
    const target = `${s.target?.first_name || ''} ${s.target?.last_name || ''}`.toLowerCase();
    const matchSearch = !searchTerm || rater.includes(searchTerm.toLowerCase()) || target.includes(searchTerm.toLowerCase());
    const matchDate = !dateFilter || s.week_start_date === dateFilter;
    return matchSearch && matchDate;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by employee name..."
            className="pl-9 pr-4 py-2.5 w-full bg-card border border-border rounded-2xl text-white text-sm placeholder-gray-600 outline-none focus:border-primary/50"
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <input
          type="date"
          className="px-4 py-2.5 bg-card border border-border rounded-2xl text-white text-sm outline-none focus:border-primary/50"
          onChange={e => setDateFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No surveys found.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-[10px] text-gray-500 uppercase bg-white/5">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Rater</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(s => (
                <tr
                  key={s.id}
                  className="hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => setSelectedSurvey(s)}
                >
                  <td className="px-4 py-3 text-xs">{s.week_start_date || (s.created_at ? format(new Date(s.created_at), 'MMM d, yyyy') : '—')}</td>
                  <td className="px-4 py-3 text-xs font-bold text-white">{s.rater?.first_name} {s.rater?.last_name}</td>
                  <td className="px-4 py-3 text-xs">{s.target?.first_name} {s.target?.last_name}</td>
                  <td className="px-4 py-3 text-xs text-primary">{s.survey_type?.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSurvey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white font-black text-lg">Survey Details</h2>
              <button
                onClick={() => setSelectedSurvey(null)}
                className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center active-scale"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Scores */}
              {selectedSurvey.scores && (
                <div>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-3">Scores</p>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedSurvey.scores).map(([key, value]) => (
                      <div key={key} className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                        <p className="text-gray-500 text-xs mb-1">{questionMap.get(key) || key.replace(/_/g, ' ')}</p>
                        <p className="text-primary font-black text-lg">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              {selectedSurvey.comments && (
                <div>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-3">Comments</p>
                  <div className="space-y-3">
                    {[
                      { key: 'well', label: 'What went well?' },
                      { key: 'improve', label: 'What to improve?' },
                      { key: 'notes', label: 'Notes' },
                    ].map(({ key, label }) => selectedSurvey.comments[key] && (
                      <div key={key}>
                        <p className="text-gray-500 text-xs mb-1">{label}</p>
                        <p className="text-white text-sm bg-white/5 border border-white/10 p-3 rounded-2xl leading-relaxed">
                          {selectedSurvey.comments[key]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}