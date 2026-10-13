import { Link } from 'react-router-dom';
import { Heart, Phone, Clock, MapPin, Mail, Shield, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 pt-14 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-brand-600 flex items-center justify-center shadow-lg">
                <Heart size={20} className="text-white fill-white/20" />
              </div>
              <span className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">CarePoint Hospital</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Super-Speciality Hospital &amp; Research Institute providing world-class tertiary healthcare,
              robotic surgery, and interventional cardiology.
            </p>
            <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
              <MapPin size={12} />
              123 Medical Boulevard, Andheri East, Mumbai
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Mail size={12} className="text-slate-500" />
              care@carepointhealth.in
            </div>
          </div>

          {/* Super Specialities */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-4">Super Specialities</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {[
                'Cardiology & Cath Lab',
                'Pediatrics & Neonatology',
                'Orthopedics & Spine Center',
                'Neurology & Stroke Clinic',
                'Clinical Dermatology',
                'Internal Medicine & ICU',
              ].map((s) => (
                <li key={s}>
                  <a href="/#specialties" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-cyan-600/60" />
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/doctors" className="hover:text-cyan-400 transition-colors">Super Specialists Roster</Link></li>
              <li><Link to="/login"   className="hover:text-cyan-400 transition-colors">Patient Health Portal</Link></li>
              <li><Link to="/login"   className="hover:text-cyan-400 transition-colors">Clinician & Staff Sign In</Link></li>
              <li><Link to="/register" className="hover:text-cyan-400 transition-colors">Create Patient Account</Link></li>
              <li>
                <a href="/#symptom-search" className="hover:text-cyan-400 transition-colors">Clinical Symptom Checker</a>
              </li>
              <li>
                <a href="/#accreditation" className="hover:text-cyan-400 transition-colors">Accreditations & Trust</a>
              </li>
            </ul>
          </div>

          {/* Contact & Emergency */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-4">24/7 Emergency Lines</h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="p-3 rounded-xl bg-slate-900 border border-red-900/50">
                <div className="flex items-center gap-2 mb-1">
                  <Phone size={11} className="text-red-400 animate-pulse" />
                  <span className="text-[10px] uppercase font-mono text-slate-500">Emergency &amp; Ambulance</span>
                </div>
                <div className="text-base font-bold text-red-400 font-mono">1800-CARE-911</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={11} className="text-cyan-400" />
                  <span className="text-[10px] uppercase font-mono text-slate-500">OPD Appointments</span>
                </div>
                <div className="text-sm font-bold text-cyan-400 font-mono">+91 22 4000 5000</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['JCI', 'NABH', 'NABL', 'ISO 9001'].map((cert) => (
                  <span key={cert} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 text-[10px] font-mono font-semibold">
                    <CheckCircle2 size={9} />
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-3">
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-slate-700" />
            © 2026 CarePoint Super-Speciality Hospital &amp; Research Institute. All rights reserved.
          </div>
          <div className="flex items-center gap-4 font-mono">
            <Link to="/login" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/login" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
            <span>•</span>
            <span className="text-slate-700">HIPAA Compliant</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
