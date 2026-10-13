import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Heart, Shield, Stethoscope, Users, Calendar, ArrowRight, CheckCircle2, 
  Search, Phone, Clock, MapPin, Sparkles, Star, Activity, UserCheck, 
  ChevronRight, Award, Lock, FileText, QrCode, Mail,
  Cpu, Building2, Bed, CreditCard, Pill, ShieldCheck, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDoctors, searchDoctors } from '../api/api';
import Anime3DCanvas from '../components/Anime3DCanvas';
import Footer from '../components/Footer';
import ThemeToggle from '../components/ThemeToggle';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, quickDemoLogin } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [matchedSpecialty, setMatchedSpecialty] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getDoctors()
      .then(res => {
        const list = res.data || [];
        setDoctors(list);
        setSearchResults(list.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(doctors.slice(0, 3));
      setMatchedSpecialty(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchDoctors({ q: searchQuery });
        setSearchResults(res.data?.results || []);
        setMatchedSpecialty(res.data?.matchedSpecialty || null);
      } catch {
        const q = searchQuery.toLowerCase();
        setSearchResults(doctors.filter(d =>
          d.name?.toLowerCase().includes(q) ||
          d.specialization?.toLowerCase().includes(q) ||
          d.bio?.toLowerCase().includes(q)
        ));
      } finally { setSearching(false); }
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery, doctors]);

  // Booking action — logged-in patients go to /patient (appointments tab), others go to login
  const handleOpenBooking = (_doc) => {
    if (user?.role === 'patient') {
      navigate('/patient');
    } else {
      navigate('/login');
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* â”€â”€â”€ Top Notification & Emergency Hotline â”€â”€â”€ */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 border-b border-slate-800/80 px-4 py-2 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              24/7 Level-1 Trauma Emergency Care
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline text-slate-400">NABH Gold Certified & JCI International Accredited</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="tel:18002273911" className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 transition-colors">
              <Phone size={13} className="animate-bounce" />
              Emergency Hotline: 1800-CARE-911
            </a>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 flex items-center gap-1">
              <Clock size={12} className="text-amber-400" />
              OPD Hours: 8:00 AM â€“ 9:00 PM
            </span>
          </div>
        </div>
      </div>

      {/* â”€â”€â”€ Main Navigation Bar â”€â”€â”€ */}
      <nav className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/70 shadow-xl shadow-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">

          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 via-cyan-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-900/30 transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Heart size={20} className="text-cyan-400 fill-cyan-400/20 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">CarePoint</span>
                <span className="hidden sm:inline text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/70 border border-cyan-800/50 px-1.5 py-0.5 rounded-full">
                  SUPER-SPEC
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Hospital &amp; Research Institute</p>
            </div>
          </Link>

          {/* Center Nav */}
          <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-400">
            <a href="#specialties" className="hover:text-cyan-400 transition-colors">Specialties</a>
            <Link to="/specialists" className="hover:text-cyan-400 transition-colors">Specialists</Link>
            <a href="#symptom-search" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
              <Sparkles size={13} className="text-cyan-400" /> Specialist Match
            </a>
            <a href="#accreditation" className="hover:text-cyan-400 transition-colors">About</a>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <button
                onClick={() => {
                  const map = { admin:'/admin', doctor:'/doctor', staff:'/staff', patient:'/patient' };
                  navigate(map[user.role] || '/patient');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-sm font-medium flex items-center gap-2 transition-all"
              >
                <UserCheck size={15} />
                Dashboard
              </button>
            ) : (
              <>
                {/* Contact Us */}
                <a
                  href="#contact"
                  className="hidden md:flex px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all items-center gap-1.5"
                >
                  <Mail size={13} className="text-slate-500" />
                  Contact Us
                </a>
                {/* Sign Up */}
                <Link
                  to="/register"
                  className="hidden sm:flex px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 border border-slate-700/60 transition-all items-center gap-1.5"
                >
                  Sign Up
                </Link>
                {/* Login */}
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/30 transition-all hover:scale-[1.03] active:scale-[0.97] flex items-center gap-1.5"
                >
                  <Lock size={14} />
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* â”€â”€â”€ Hero Section with Holographic Anime.js Biometric Engine â”€â”€â”€ */}
      <section className="relative pt-12 pb-24 overflow-hidden">
        {/* Glow Spheres in Background */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-brand-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/2 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-[110px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Hero Left Content */}
            <div className="lg:col-span-6 space-y-7">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md shadow-lg shadow-cyan-950/30">
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-mono font-medium text-cyan-300">
                  âœ¨ Next-Gen Healthcare Intelligence & Clinical Excellence
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] font-['Plus_Jakarta_Sans']">
                Where Advanced Medicine Meets{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-brand-400 to-emerald-400">
                  Compassionate Care.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
                Experience India's premier digital hospital ecosystem. Instant contactless QR OPD check-ins, automated electronic prescriptions, intelligent symptom-to-specialist matching, and 150+ board-certified super-specialists under one unified health system.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/login"
                  className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-brand-600 hover:from-cyan-400 hover:to-brand-500 text-slate-950 font-bold text-base shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2.5"
                >
                  <Calendar size={18} />
                  Book Doctor Consultation
                </Link>
                <Link
                  to="/doctors"
                  className="px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold text-base transition-all hover:border-cyan-500/50 flex items-center gap-2"
                >
                  <Stethoscope size={17} className="text-cyan-400" />
                  View All Specialists
                </Link>
              </div>

              {/* ⚡ 1-Click Instant Portal Access (No Signup Barrier) */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md space-y-2.5 shadow-xl shadow-cyan-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-400" />
                    INSTANT DASHBOARD ACCESS (NO ACCOUNT REQUIRED)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">1-Click Live Test</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={async () => {
                      await quickDemoLogin('patient');
                      navigate('/patient');
                    }}
                    className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 hover:border-cyan-400 text-xs font-bold text-slate-200 transition-all text-left flex items-center gap-2 group shadow-sm"
                  >
                    <span className="text-xl">🧑</span>
                    <div className="min-w-0">
                      <div className="text-[11px] leading-tight">Patient Portal</div>
                      <div className="text-[9px] text-slate-500 group-hover:text-slate-900 font-mono truncate">Book &amp; Records</div>
                    </div>
                  </button>

                  <button
                    onClick={async () => {
                      await quickDemoLogin('doctor');
                      navigate('/doctor');
                    }}
                    className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 hover:border-cyan-400 text-xs font-bold text-slate-200 transition-all text-left flex items-center gap-2 group shadow-sm"
                  >
                    <span className="text-xl">👨‍⚕️</span>
                    <div className="min-w-0">
                      <div className="text-[11px] leading-tight">Doctor Desk</div>
                      <div className="text-[9px] text-slate-500 group-hover:text-slate-900 font-mono truncate">Clinical EMR</div>
                    </div>
                  </button>

                  <button
                    onClick={async () => {
                      await quickDemoLogin('staff');
                      navigate('/staff');
                    }}
                    className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 hover:border-cyan-400 text-xs font-bold text-slate-200 transition-all text-left flex items-center gap-2 group shadow-sm"
                  >
                    <span className="text-xl">👩‍💼</span>
                    <div className="min-w-0">
                      <div className="text-[11px] leading-tight">Staff Station</div>
                      <div className="text-[9px] text-slate-500 group-hover:text-slate-900 font-mono truncate">QR Fast-Track</div>
                    </div>
                  </button>

                  <button
                    onClick={async () => {
                      await quickDemoLogin('admin');
                      navigate('/admin');
                    }}
                    className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 hover:border-cyan-400 text-xs font-bold text-slate-200 transition-all text-left flex items-center gap-2 group shadow-sm"
                  >
                    <span className="text-xl">🔐</span>
                    <div className="min-w-0">
                      <div className="text-[11px] leading-tight">Admin Center</div>
                      <div className="text-[9px] text-slate-500 group-hover:text-slate-900 font-mono truncate">Command Center</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-2xl font-black text-cyan-400 font-mono">99.4%</div>
                  <div className="text-xs text-slate-400 mt-0.5">Surgical Success</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-2xl font-black text-emerald-400 font-mono">150+</div>
                  <div className="text-xs text-slate-400 mt-0.5">Super Specialists</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-2xl font-black text-brand-400 font-mono">0 min</div>
                  <div className="text-xs text-slate-400 mt-0.5">Emergency Triage</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-2xl font-black text-purple-400 font-mono">45k+</div>
                  <div className="text-xs text-slate-400 mt-0.5">Patients Healed</div>
                </div>
              </div>

            </div>

            {/* Hero Right: Animated 3D Bio-Core Canvas */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-3xl p-1 bg-gradient-to-b from-cyan-500/30 via-slate-800 to-slate-900 shadow-2xl shadow-cyan-950/50">
                <div className="rounded-[22px] overflow-hidden bg-slate-950 relative h-[450px] sm:h-[490px]">
                  <Anime3DCanvas className="w-full h-full" />
                </div>
              </div>

              {/* Bottom Feature Badges */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">QR Fast Track</h4>
                    <p className="text-[11px] text-slate-400">Zero-wait hospital check-ins</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">100% Paperless</h4>
                    <p className="text-[11px] text-slate-400">Encrypted digital health record</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* â”€â”€â”€ Live Hospital Operations Triage Ticker â”€â”€â”€ */}
      <div className="bg-slate-900/90 border-y border-slate-800 py-3.5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
          <div className="shrink-0 flex items-center gap-2 px-3 py-1 rounded-lg bg-red-950/70 border border-red-500/30 text-red-400 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            LIVE HOSPITAL STATUS
          </div>
          <div className="flex items-center gap-8 text-xs font-mono text-slate-300 overflow-x-auto no-scrollbar whitespace-nowrap">
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">â—</span> ER Trauma Beds: <strong>14 Available</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-cyan-400">â—</span> Cardiac Cath Lab: <strong>All 3 Suites Operational</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-purple-400">â—</span> Critical Care ICU: <strong>6 Ventilators Ready</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-amber-400">â—</span> 24/7 Pharmacy: <strong>In Full Stock</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-400">â—</span> Blood Bank: <strong>All Blood Groups Available</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Smart Doctor Finder & Symptom Matcher ─── */}
      <section id="symptom-search" className="py-20 bg-slate-900/40 relative">
        <span id="clinical-search" className="sr-only" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-4">
              <Sparkles size={13} />
              Smart Clinical Routing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-['Plus_Jakarta_Sans']">
              Describe Your Health Symptoms
            </h2>
            <p className="text-slate-400 mt-3 text-base">
              Our clinical intelligence engine maps your health concerns to the ideal board-certified super-specialist instantly.
            </p>

            {/* Live Search Input */}
            <div className="mt-8 relative max-w-2xl mx-auto">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="E.g. chest pain, severe migraine, knee joint stiffness, baby fever, skin allergy..."
                  className="w-full bg-slate-950 border-2 border-slate-800 focus:border-cyan-500 rounded-2xl pl-12 pr-28 py-4 text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-xl"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-24 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                  >
                    Clear
                  </button>
                )}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold">
                    {searching ? 'Analyzing...' : 'Search Active'}
                  </span>
                </div>
              </div>

              {/* Symptom Suggestions Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
                <span className="text-slate-500 font-mono">Popular searches:</span>
                {['Chest Pain', 'Baby Vaccination', 'Knee Joint Pain', 'Migraine', 'Skin Allergy', 'Viral Fever'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="px-3 py-1 rounded-full bg-slate-800/80 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Matched Specialty Badge */}
            {matchedSpecialty && (
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-950/80 border border-brand-500/40 text-cyan-300 text-xs font-mono">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Specialty Detected: <strong className="text-white uppercase tracking-wider">{matchedSpecialty}</strong>
              </div>
            )}
          </div>

          {/* Results Doctor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-900/90 rounded-3xl border border-slate-800 hover:border-cyan-500/50 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-950/40 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white text-xl font-bold font-mono shadow-md">
                      {doc.name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {doc.status || 'Available'}
                      </span>
                      {doc.ratingCount > 0 ? (
                        <div className="text-xs font-mono text-slate-400 mt-1.5 flex items-center justify-end gap-1">
                          <Star size={13} className="text-amber-400 fill-amber-400" />
                          <span className="font-bold text-white">{Number(doc.rating).toFixed(1)}</span>
                          <span>({doc.ratingCount})</span>
                        </div>
                      ) : (
                        <div className="text-[11px] font-mono text-slate-500 mt-1.5 text-right">
                          Verified Specialist
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans'] group-hover:text-cyan-300 transition-colors">
                    {doc.name}
                  </h3>
                  <div className="text-sm font-semibold text-cyan-400 font-mono mt-0.5">
                    {doc.specialization}
                  </div>
                  <p className="text-xs text-slate-400 mt-3 line-clamp-3 leading-relaxed">
                    {doc.bio || `Senior Consultant specializing in advanced clinical diagnosis and patient care.`}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 font-mono">Consultation Fee</div>
                    <div className="text-lg font-bold text-white font-mono">â‚¹{doc.fee || 800}</div>
                  </div>
                  <button
                    onClick={() => handleOpenBooking(doc)}
                    className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 font-semibold text-xs transition-all flex items-center gap-1.5"
                  >
                    <Calendar size={14} />
                    Book Slot
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/doctors"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-sm font-semibold transition-all"
            >
              Explore Complete Directory of 150+ Specialists <ArrowRight size={16} />
            </Link>
          </div>

        </div>
      </section>

      {/* â”€â”€â”€ Clinical Centers of Excellence â”€â”€â”€ */}
      <section id="specialties" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-3">
            <Building2 size={13} />
            Centers of Excellence
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Plus_Jakarta_Sans']">
            Comprehensive Super-Specialities
          </h2>
          <p className="text-slate-400 mt-3 text-base">
            Equipped with state-of-the-art robotic surgical suites, international diagnostic labs, and dedicated intensive care units.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Cardiology & Cath Lab',
              desc: 'Interventional cardiology, primary angioplasty, electrophysiology, and advanced coronary intensive care.',
              icon: 'ðŸ«€',
              specialist: 'Dr. Arjun Mehta',
              stats: '99.7% Success'
            },
            {
              title: 'Pediatrics & NICU',
              desc: 'Comprehensive infant care, routine vaccinations, pediatric surgeries, and Level-3 neonatal intensive care.',
              icon: 'ðŸ‘¶',
              specialist: 'Dr. Priya Sharma',
              stats: '24/7 Neonatal Unit'
            },
            {
              title: 'Orthopedics & Joint Care',
              desc: 'Computer-navigated joint replacements, arthroscopic sports surgeries, and spinal reconstruction.',
              icon: 'ðŸ¦´',
              specialist: 'Dr. Rahul Gupta',
              stats: 'Robotic Arthroplasty'
            },
            {
              title: 'Neurosciences & Stroke Unit',
              desc: 'Comprehensive stroke rescue within golden hour, microsurgery for cranial tumors, and neuro-rehabilitation.',
              icon: '🧠',
              specialist: 'Dr. Sunita Patel',
              stats: 'Golden Hour Rapid Triage'
            },
            {
              title: 'Clinical Dermatology',
              desc: 'Advanced laser treatments, severe chronic dermatosis therapy, allergy testing, and cosmetic diagnostics.',
              icon: 'âœ¨',
              specialist: 'Dr. Kavita Desai',
              stats: 'Aesthetic & Clinical'
            },
            {
              title: 'Internal & Critical Medicine',
              desc: 'Multidisciplinary management of metabolic conditions, infectious fevers, and multi-organ critical support.',
              icon: 'ðŸ©º',
              specialist: 'Dr. Manish Verma',
              stats: '24/7 Level-1 ICU'
            }
          ].map((spec, i) => (
            <div
              key={i}
              className="bg-slate-900/60 rounded-3xl p-7 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl group"
            >
              <div className="text-4xl mb-4 p-3 w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                {spec.icon}
              </div>
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1">
                {spec.stats}
              </div>
              <h3 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans'] group-hover:text-cyan-300 transition-colors">
                {spec.title}
              </h3>
              <p className="text-slate-400 text-sm mt-2.5 leading-relaxed">
                {spec.desc}
              </p>
              <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Head: <strong className="text-slate-200">{spec.specialist}</strong></span>
                <button
                  onClick={() => {
                    const doc = doctors.find(d => d.name === spec.specialist) || doctors[0];
                    handleOpenBooking(doc);
                  }}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  Consult Now <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€â”€ Unified Hospital Ecosystem Workspaces â”€â”€â”€ */}
      <section id="portals" className="py-20 bg-slate-900/50 border-t border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-3">
              <Cpu size={13} />
              Unified Hospital Ecosystem
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Plus_Jakarta_Sans']">
              Dedicated Digital Workspaces
            </h2>
            <p className="text-slate-400 mt-2 text-base">
              Engineered for seamless collaboration between patients, clinicians, nursing staff, and hospital administration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Patient Portal Card */}
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 hover:border-cyan-500/50 flex flex-col justify-between transition-all group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl mb-4">
                  ðŸ§‘
                </div>
                <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">Patient Health Portal</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Book appointments, view digital QR passes, download PDF prescriptions, track lab results, and review medical history.
                </p>
                <div className="mt-4 space-y-1.5 text-xs text-slate-300 font-mono">
                  <div className="flex items-center gap-1.5 text-cyan-400">âœ“ Instant QR Attendance Pass</div>
                  <div className="flex items-center gap-1.5 text-cyan-400">âœ“ PDF Prescription Downloads</div>
                  <div className="flex items-center gap-1.5 text-cyan-400">âœ“ Diagnostic Reports Access</div>
                </div>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-800">
                <Link
                  to="/login"
                  className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  Sign In to Patient Portal <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Doctor Desk Card */}
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 hover:border-brand-500/50 flex flex-col justify-between transition-all group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-2xl mb-4">
                  ðŸ‘¨â€âš•ï¸
                </div>
                <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">Doctor Clinical Desk</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Live OPD consultation queue, electronic prescription authoring with dosage calculators, and patient records.
                </p>
                <div className="mt-4 space-y-1.5 text-xs text-slate-300 font-mono">
                  <div className="flex items-center gap-1.5 text-brand-400">âœ“ Live OPD Patient Queue</div>
                  <div className="flex items-center gap-1.5 text-brand-400">âœ“ 1-Click Electronic Rx</div>
                  <div className="flex items-center gap-1.5 text-brand-400">âœ“ Inpatient Ward Rounds</div>
                </div>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-800">
                <Link
                  to="/login"
                  className="w-full py-2.5 rounded-xl bg-brand-500/20 hover:bg-brand-500 text-brand-300 hover:text-white border border-brand-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  Doctor Clinical Sign In <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Staff Station Card */}
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 hover:border-emerald-500/50 flex flex-col justify-between transition-all group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl mb-4">
                  ðŸ‘©â€ðŸ’¼
                </div>
                <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">Staff & Nurse Station</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Hospital QR token verification scanner, inpatient ward bed admissions, and pharmacy inventory management.
                </p>
                <div className="mt-4 space-y-1.5 text-xs text-slate-300 font-mono">
                  <div className="flex items-center gap-1.5 text-emerald-400">âœ“ Fast QR Token Scanner</div>
                  <div className="flex items-center gap-1.5 text-emerald-400">âœ“ Bed & Ward Allocation</div>
                  <div className="flex items-center gap-1.5 text-emerald-400">âœ“ Pharmacy & Supplies Desk</div>
                </div>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-800">
                <Link
                  to="/login"
                  className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  Staff Station Sign In <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Admin Command Center */}
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 hover:border-purple-500/50 flex flex-col justify-between transition-all group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl mb-4">
                  ðŸ”
                </div>
                <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">Admin Central Command</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  System-wide analytics, doctor & staff onboarding, department financials, and operational oversight.
                </p>
                <div className="mt-4 space-y-1.5 text-xs text-slate-300 font-mono">
                  <div className="flex items-center gap-1.5 text-purple-400">âœ“ Hospital Financial Analytics</div>
                  <div className="flex items-center gap-1.5 text-purple-400">âœ“ Doctor & Staff Provisioning</div>
                  <div className="flex items-center gap-1.5 text-purple-400">âœ“ Bed Occupancy Overview</div>
                </div>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-800">
                <Link
                  to="/login"
                  className="w-full py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  Admin Console Access <ArrowRight size={14} />
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* â”€â”€â”€ Accreditations & Trust â”€â”€â”€ */}
      <section id="accreditation" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 via-brand-950/70 to-slate-900 rounded-3xl border border-slate-800 p-8 sm:p-12 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono mb-4 border border-cyan-500/30">
                <Award size={14} /> International Clinical Quality
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-['Plus_Jakarta_Sans']">
                Global Gold Standards in Healthcare
              </h2>
              <p className="text-slate-300 text-sm sm:text-base mt-3 leading-relaxed">
                CarePoint Super-Speciality Hospital is fully certified and accredited by international medical regulatory bodies, maintaining zero-tolerance protocols for patient safety, sterile environments, and diagnostic precision.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-6 text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} /> JCI International Accredited
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} /> NABH Gold Standard Certified
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} /> NABL Certified Pathology
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} /> ISO 9001:2015 Healthcare
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-3xl font-extrabold text-cyan-400 font-mono">24/7</div>
                <div className="text-xs text-slate-300 font-semibold mt-1">Trauma & Cath Lab</div>
                <p className="text-[11px] text-slate-500 mt-1">Zero downtime surgical ready</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-3xl font-extrabold text-emerald-400 font-mono">100%</div>
                <div className="text-xs text-slate-300 font-semibold mt-1">Sterile Air Cleanliness</div>
                <p className="text-[11px] text-slate-500 mt-1">HEPA Class 100 laminar OTs</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-3xl font-extrabold text-purple-400 font-mono">15+</div>
                <div className="text-xs text-slate-300 font-semibold mt-1">Years Clinical Heritage</div>
                <p className="text-[11px] text-slate-500 mt-1">Over 250,000 OPD visits</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-3xl font-extrabold text-amber-400 font-mono">100%</div>
                <div className="text-xs text-slate-300 font-semibold mt-1">NABH & JCI Compliance</div>
                <p className="text-[11px] text-slate-500 mt-1">Certified quality protocols</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€â”€ Contact Section â”€â”€â”€ */}
      <section id="contact" className="py-16 bg-slate-900/40 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-4">
            <Mail size={12} /> Contact & Support
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-['Plus_Jakarta_Sans'] mb-3">Get in Touch</h2>
          <p className="text-slate-400 text-sm mb-8">Our team is available 24/7 for emergencies. For OPD appointments and inquiries, reach out below.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-red-900/40 text-center">
              <Phone size={20} className="text-red-400 mx-auto mb-2 animate-pulse" />
              <div className="text-xs text-slate-500 font-mono mb-1">EMERGENCY</div>
              <a href="tel:18002273911" className="text-lg font-bold text-red-400 font-mono hover:text-red-300">1800-CARE-911</a>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-900/40 text-center">
              <Phone size={20} className="text-cyan-400 mx-auto mb-2" />
              <div className="text-xs text-slate-500 font-mono mb-1">OPD DESK</div>
              <a href="tel:+912240005000" className="text-lg font-bold text-cyan-400 font-mono hover:text-cyan-300">+91 22 4000 5000</a>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <Mail size={20} className="text-slate-400 mx-auto mb-2" />
              <div className="text-xs text-slate-500 font-mono mb-1">EMAIL</div>
              <a href="mailto:care@carepointhealth.in" className="text-sm font-bold text-slate-300 font-mono hover:text-white">care@carepointhealth.in</a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Shared Footer ─── */}
      <Footer />

    </div>
  );
}
