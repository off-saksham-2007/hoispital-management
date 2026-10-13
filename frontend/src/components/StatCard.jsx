import React from 'react';

export default function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-brand-600/10 text-brand-400 ring-brand-500/20',
    green:  'bg-emerald-600/10 text-emerald-400 ring-emerald-500/20',
    yellow: 'bg-amber-600/10 text-amber-400 ring-amber-500/20',
    red:    'bg-red-600/10 text-red-400 ring-red-500/20',
    purple: 'bg-purple-600/10 text-purple-400 ring-purple-500/20',
  };

  const renderIcon = () => {
    if (!Icon) return null;
    if (typeof Icon === 'string') return <span>{Icon}</span>;
    if (React.isValidElement(Icon)) return Icon;
    try {
      const Comp = Icon;
      return <Comp size={22} />;
    } catch {
      return null;
    }
  };

  return (
    <div className="stat-card animate-slide-up">
      <div className={`stat-icon ring-1 ${colors[color] || colors.blue}`}>
        {renderIcon()}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value ?? '–'}</div>
        <div className="text-sm font-medium text-slate-300">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
