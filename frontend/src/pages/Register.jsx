import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Heart, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ displayName:'', username:'', email:'', phone:'', dateOfBirth:'', address:'', password:'', confirmPassword:'' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match!'); return; }
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to CarePoint 🎉');
      navigate('/patient');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Heart size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">CarePoint HMS</span>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold text-white mb-1">Create Account</h2>
          <p className="text-slate-400 text-sm mb-8">Register as a patient to book appointments</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input name="displayName" value={form.displayName} onChange={change} required className="input" placeholder="Rahul Sharma" />
              </div>
              <div>
                <label className="label">Username *</label>
                <input name="username" value={form.username} onChange={change} required className="input" placeholder="rahul.sharma" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Phone *</label>
                <input name="phone" value={form.phone} onChange={change} required className="input" placeholder="+91 9876543210" />
              </div>
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" value={form.email} onChange={change} className="input" placeholder="you@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date of Birth</label>
                <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={change} className="input" />
              </div>
              <div>
                <label className="label">Address</label>
                <input name="address" value={form.address} onChange={change} className="input" placeholder="Mumbai" />
              </div>
            </div>
            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <input name="password" type={showPwd ? 'text' : 'password'} value={form.password} onChange={change} required className="input pr-12" placeholder="Min 4 characters" />
                <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password *</label>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={change} required className="input" placeholder="Repeat password" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                <span className="flex items-center gap-2"><UserPlus size={18} /> Create Account</span>
              )}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
