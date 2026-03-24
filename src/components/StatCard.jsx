import { motion } from 'framer-motion';

export default function StatCard({ label, value, sub, icon: Icon, color = 'emerald', onClick }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`w-full text-left p-4 rounded-3xl border bg-card/80 ${onClick ? 'active-scale cursor-pointer hover:border-primary/30' : 'cursor-default'} border-border transition-all`}
    >
      {Icon && (
        <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center mb-3 ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-sm font-semibold text-gray-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </motion.button>
  );
}