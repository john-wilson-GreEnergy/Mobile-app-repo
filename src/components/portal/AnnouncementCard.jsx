export default function AnnouncementCard({ announcement }) {
  const priorityConfig = {
    urgent: { color: 'text-red-400 bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
    high: { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-400' },
    medium: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' },
    low: { color: 'text-gray-400 bg-white/5 border-white/10', dot: 'bg-gray-400' },
  };
  const config = priorityConfig[announcement.priority] || priorityConfig.medium;

  return (
    <div className={`p-4 rounded-2xl border ${config.color}`}>
      <div className="flex items-start gap-3">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${config.dot}`} />
        <div>
          <p className="text-white font-bold text-sm">{announcement.title}</p>
          <p className="text-gray-400 text-xs mt-1 leading-relaxed line-clamp-2">{announcement.body}</p>
        </div>
      </div>
    </div>
  );
}