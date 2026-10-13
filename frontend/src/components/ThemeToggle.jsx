import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Reusable animated theme toggle button.
 * Shows Sun icon in dark mode (click → light) and Moon icon in light mode (click → dark).
 */
export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`
        relative w-9 h-9 rounded-xl border flex items-center justify-center
        transition-all duration-300 overflow-hidden group
        ${isDark
          ? 'bg-slate-800/80 border-slate-700/60 text-amber-400 hover:bg-slate-700 hover:border-amber-500/40'
          : 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-amber-50 hover:border-amber-400/60'
        }
        ${className}
      `}
    >
      {/* Sun ray glow on hover in dark mode */}
      {isDark && (
        <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-amber-500/10" />
      )}

      <span className={`transition-all duration-300 ${isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0 absolute'}`}>
        <Sun size={16} />
      </span>
      <span className={`transition-all duration-300 ${isDark ? '-rotate-90 scale-0 absolute' : 'rotate-0 scale-100'}`}>
        <Moon size={16} className="text-brand-600" />
      </span>
    </button>
  );
}
