import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Stethoscope, Star, Search, Award, Clock,
  CheckCircle2, Calendar, Sparkles, BadgeCheck,
  MapPin, Heart, Lock,
  UserCheck, X, Filter, Shield, RefreshCw
} from 'lucide-react';
import { getDoctors } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import ThemeToggle from '../components/ThemeToggle';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SPECIALTY_COLORS = {
  Cardiology:        { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-400',    icon: '❤️' },
  Pediatrics:        { bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     text: 'text-sky-400',     icon: '🍼' },
  Orthopedics:       { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   icon: '🦴' },
  Neurology:         { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  icon: '🧠' },
  Dermatology:       { bg: 'bg-pink-500/10',    border: 'border-pink-500/30',    text: 'text-pink-400',    icon: '✨' },
  'General Medicine': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: '🩺' },
  Oncology:          { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400',  icon: '🔬' },
  Ophthalmology:     { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-400',    icon: '👁️' },
};

function getSpecColor(spec) {
  return SPECIALTY_COLORS[spec] || { bg: 'bg-brand-500/10', border: 'border-brand-500/30', text: 'text-brand-400', icon: '🏥' };
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />
      ))}
      <span className="ml-1 text-xs text-amber-400 font-mono">{rating.toFixed(1)}</span>
    </div>
  );
}

function DoctorCard({ doc, onBook }) {
  const color = getSpecColor(doc.specialization);
  const docRating = Number(doc.rating) || 0;
  const docReviews = Number(doc.ratingCount) || 0;
  const displayName = doc.name?.startsWith('Dr.') ? doc.name : `Dr. ${doc.name || 'Specialist'}`;
  const initials = displayName.replace(/^Dr\.\s*/, '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'DR';

  return (
    <div className="group relative bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-950/30 transition-all duration-300 flex flex-col">
      <div className="h-1 bg-gradient-to-r from-cyan-500 to-brand-500 opacity-80" />
      <div className="p-5 flex flex-col flex-1 gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl ${color.bg} ${color.border} border flex items-center justify-center shrink-0 text-lg font-bold ${color.text} group-hover:scale-105 transition-transform duration-300`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm leading-tight truncate">{displayName}</h3>
            <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${color.bg} ${color.border} border ${color.text}`}>
              <span>{color.icon}</span>
              {doc.specialization}
            </div>
            {docReviews > 0 ? (
              <div className="mt-1.5"><StarRating rating={docRating} /></div>
            ) : (
              <div className="mt-1.5 text-[11px] font-mono text-slate-500">New / Verified Specialist</div>
            )}
          </div>
          <BadgeCheck size={18} className="text-cyan-400 shrink-0 mt-0.5" />
        </div>

        {doc.bio && (
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{doc.bio}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {doc.exp && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/50 px-2 py-1 rounded-lg">
              <Award size={11} className="text-amber-400" />{doc.exp}+ yrs
            </span>
          )}
          {doc.hospital && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/50 px-2 py-1 rounded-lg">
              <MapPin size={11} className="text-emerald-400" />
              {doc.hospital.length > 20 ? doc.hospital.slice(0, 20) + '…' : doc.hospital}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/50 px-2 py-1 rounded-lg">
            <Clock size={11} className="text-cyan-400" />Available
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="text-emerald-400 font-mono font-semibold">
            ₹{doc.fee ? doc.fee.toLocaleString() : '500'} consultation
          </span>
          <span>{docReviews > 0 ? `${docReviews} review${docReviews > 1 ? 's' : ''}` : 'No reviews yet'}</span>
        </div>

        <button
          onClick={() => onBook(doc)}
          className="mt-auto w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Calendar size={15} />
          Book Appointment
        </button>
      </div>
    </div>
  );
}

function LoginModal({ onClose, navigate }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700/70 rounded-2xl shadow-2xl shadow-slate-950/60 overflow-hidden" style={{ animation: 'fadeInScale 0.25s ease' }}>
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-brand-500 to-emerald-500" />
        <div className="p-8 space-y-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-brand-600/30 border border-cyan-500/30 flex items-center justify-center">
              <Lock size={28} className="text-cyan-400" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">Login Required</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Appointment book karne ke liye pehle{' '}
              <span className="text-cyan-400 font-medium">login</span> ya{' '}
              <span className="text-emerald-400 font-medium">register</span> karna hoga.
            </p>
          </div>
          <div className="space-y-2">
            {['Appointments track karein', 'Digital prescriptions paayein', 'QR-based check-in ka use karein'].map(b => (
              <div key={b} className="flex items-center gap-2.5 text-sm text-slate-300">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                {b}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-bold text-sm transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30"
            >
              <Lock size={15} />
              Login karo
            </button>
            <button
              onClick={() => navigate('/register')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <UserCheck size={15} />
              Naya account banao (Free)
            </button>
          </div>
          <p className="text-center text-xs text-slate-600">Browsing free hai — appointment ke liye hi login chahiye</p>
        </div>
      </div>
    </div>
  );
}

export default function SpecialistsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allDoctors, setAllDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('ALL');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  useEffect(() => {
    getDoctors()
      .then(res => setAllDoctors(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const shuffled = useMemo(() => shuffleArray(allDoctors), [allDoctors, shuffleKey]);

  const specialties = useMemo(() => {
    const specs = [...new Set(allDoctors.map(d => d.specialization).filter(Boolean))];
    return ['ALL', ...specs];
  }, [allDoctors]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return shuffled.filter(d => {
      const matchSearch = !q || d.name?.toLowerCase().includes(q) || d.specialization?.toLowerCase().includes(q) || d.bio?.toLowerCase().includes(q);
      const matchSpec = selectedSpec === 'ALL' || d.specialization === selectedSpec;
      return matchSearch && matchSpec;
    });
  }, [shuffled, search, selectedSpec]);

  function handleBook() {
    if (user?.role === 'patient') {
      navigate('/patient');
    } else {
      setShowLoginModal(true);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/70 shadow-xl shadow-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-cyan-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-900/30 transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center">
                <Heart size={18} className="text-cyan-400 fill-cyan-400/20 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">CarePoint</span>
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/70 border border-cyan-800/50 px-1.5 py-0.5 rounded-full">SUPER-SPEC</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Hospital &amp; Research Institute</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <Link to="/" className="hover:text-cyan-400 transition-colors">Home</Link>
            <span className="text-cyan-400 border-b border-cyan-500 pb-0.5">Specialists</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <button
                onClick={() => { const m = { admin:'/admin', doctor:'/doctor', staff:'/staff', patient:'/patient' }; navigate(m[user.role] || '/patient'); }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-sm font-medium flex items-center gap-2 transition-all"
              >
                <UserCheck size={15} /> Dashboard
              </button>
            ) : (
              <>
                <Link to="/register" className="hidden sm:flex px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 border border-slate-700/60 transition-all items-center gap-1.5">
                  Sign Up
                </Link>
                <Link to="/login" className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/30 transition-all hover:scale-[1.03] active:scale-[0.97] flex items-center gap-1.5">
                  <Lock size={14} /> Login
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-80 h-80 bg-brand-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md">
            <Sparkles size={13} className="text-amber-400" />
            <span className="text-xs font-mono font-medium text-cyan-300">Expert Specialists · Verified Doctors · Real Results</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-['Plus_Jakarta_Sans']">
            Hamare{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-brand-400 to-emerald-400">
              Expert Specialists
            </span>{' '}
            se Miliye
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            CarePoint ke super-speciality doctors — years of experience aur hazaron patients ka trust. Browse karein aur apna doctor chunein.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
            {[
              { icon: <Stethoscope size={15} className="text-cyan-400" />, label: `${allDoctors.length}+ Doctors` },
              { icon: <Shield size={15} className="text-emerald-400" />, label: 'NABH Certified' },
              { icon: <Star size={15} className="text-amber-400 fill-amber-400" />, label: '4.8★ Rating' },
              { icon: <Clock size={15} className="text-purple-400" />, label: '24/7 Available' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 text-sm text-slate-400">
                {s.icon}<span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Doctor ka naam, specialty ya condition search karein..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/60 focus:border-cyan-500/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={() => setShuffleKey(k => k + 1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-all"
              title="Shuffle doctors"
            >
              <RefreshCw size={15} className="text-cyan-400" />
              <span className="hidden sm:inline">Shuffle</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
              <Filter size={12} /> Filter:
            </div>
            {specialties.map(s => {
              const color = s === 'ALL' ? null : getSpecColor(s);
              const active = selectedSpec === s;
              return (
                <button
                  key={s}
                  onClick={() => setSelectedSpec(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? s === 'ALL'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : `${color.bg} ${color.border} ${color.text}`
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  {s !== 'ALL' && color && <span className="mr-1">{color.icon}</span>}
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Doctors Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Specialists load ho rahe hain...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Stethoscope size={40} className="text-slate-600" />
            <p className="text-slate-400">Koi doctor nahi mila. Search change karein.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">
                <span className="text-cyan-400 font-mono font-bold">{filtered.length}</span> specialists mile
                {selectedSpec !== 'ALL' && <span className="text-slate-600"> · {selectedSpec}</span>}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Lock size={11} /> Appointment ke liye login zaroori hai
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map(doc => (
                <DoctorCard key={doc.id} doc={doc} onBook={handleBook} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* CTA Banner for guests */}
      {!user && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="relative rounded-2xl overflow-hidden border border-cyan-500/20 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.08),transparent_60%)]" />
            <div className="relative z-10 space-y-2">
              <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">Appointment Book Karne ke Liye Ready Ho?</h3>
              <p className="text-sm text-slate-400">Login karein ya free account banayein — sirf 2 minute lagenge!</p>
            </div>
            <div className="relative z-10 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-bold text-sm transition-all hover:scale-[1.03] flex items-center gap-2 shadow-lg shadow-cyan-900/30"
              >
                <Lock size={14} /> Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
              >
                <UserCheck size={14} /> Register Free
              </button>
            </div>
          </div>
        </section>
      )}

      <Footer />

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} navigate={navigate} />}

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
