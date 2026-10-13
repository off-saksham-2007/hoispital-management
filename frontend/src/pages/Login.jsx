import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Heart, Eye, EyeOff, LogIn } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.displayName}! 👋`);
      const map = { admin:'/admin', doctor:'/doctor', staff:'/staff', patient:'/patient' };
      navigate(map[user.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-brand-900 via-[#0f1f40] to-surface p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 75% 75%, #7c3aed 0%, transparent 50%)' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Heart size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">CarePoint HMS</span>
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Smart Healthcare,<br />
            <span className="text-gradient">Simplified.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            A modern hospital management platform for patients, doctors, staff, and administrators — all in one place.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[['1200+','Patients Served'],['48+','Expert Doctors'],['99.9%','Uptime'],['24/7','Support']].map(([n,l]) => (
            <div key={l} className="glass rounded-2xl p-4">
              <div className="text-2xl font-bold text-brand-400">{n}</div>
              <div className="text-slate-400 text-sm mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 justify-center mb-8 lg:hidden">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <Heart size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">CarePoint HMS</span>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-brand-600/20 rounded-xl flex items-center justify-center">
                <Heart size={20} className="text-brand-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Sign in</h2>
                <p className="text-slate-400 text-sm">Access your CarePoint dashboard</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Username or Email</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={change}
                  placeholder="Enter your username or email"
                  required
                  autoComplete="username"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={change}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 font-bold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2"><LogIn size={18} /> Sign In</span>
                )}
              </button>
            </form>

            <p className="text-center text-slate-400 text-sm mt-5">
              New patient?{' '}
              <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
