import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Phone, Mail, MapPin, Heart, 
  FileText, Activity, Calendar, AlertCircle, RefreshCw, X, ChevronRight, Bed
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getPatients, createPatient, getAppointments, getPrescriptions, getLabs, getBilling } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function PatientsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBlood, setSelectedBlood] = useState('ALL');

  // Selected Patient for EMR Dossier Modal
  const [activePatient, setActivePatient] = useState(null);

  // New Patient Registration Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    bloodGroup: 'O+',
    phone: '',
    email: '',
    address: 'Mumbai, Maharashtra',
    dateOfBirth: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [pRes, aRes, rxRes, lRes] = await Promise.all([
        getPatients(),
        getAppointments(),
        getPrescriptions(),
        getLabs()
      ]);
      setPatients(pRes.data || []);
      setAppointments(aRes.data || []);
      setPrescriptions(rxRes.data || []);
      setLabs(lRes.data || []);
    } catch {
      toast.error('Failed to load patient records');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error('Please enter patient name and mobile number');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createPatient(form);
      toast.success(`🎉 Patient registered with MRN: ${res.data.id}`);
      setPatients(prev => [res.data, ...prev]);
      setIsRegisterOpen(false);
      setForm({
        name: '',
        age: '',
        gender: 'Male',
        bloodGroup: 'O+',
        phone: '',
        email: '',
        address: 'Mumbai, Maharashtra',
        dateOfBirth: ''
      });
      setActivePatient(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  const bloodGroups = ['ALL', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = 
      p.name?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q);
    
    if (selectedBlood === 'ALL') return matchesSearch;
    return matchesSearch && p.bloodGroup === selectedBlood;
  });

  // Calculate patient dossier items
  const patientAppts = activePatient 
    ? appointments.filter(a => a.patientId === activePatient.id || a.patientName === activePatient.name)
    : [];
  const patientRx = activePatient
    ? prescriptions.filter(r => r.patientId === activePatient.id || r.patientName === activePatient.name)
    : [];
  const patientLabs = activePatient
    ? labs.filter(l => l.patientId === activePatient.id || l.patientName === activePatient.name)
    : [];

  return (
    <DashboardLayout title="Patient Registry & Electronic Medical Records (EMR)">
      <div className="space-y-6">

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Registered</div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{patients.length}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Users size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Active Consultations</div>
              <div className="text-2xl font-bold font-mono text-purple-400 mt-1">{appointments.length}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Calendar size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Issued Prescriptions</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{prescriptions.length}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileText size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Diagnostic Reports</div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{labs.length}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Activity size={22} />
            </div>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="bg-surface-card p-5 rounded-2xl border border-surface-border space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search patient by name, Medical Record # (SP-xxxx), phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-surface border border-surface-border focus:border-brand-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={fetchData}
                className="p-2.5 rounded-xl bg-surface hover:bg-slate-800 border border-surface-border text-slate-400 hover:text-white"
                title="Refresh"
              >
                <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
              </button>

            {['staff', 'admin'].includes(user?.role) && (
              <button 
                onClick={() => setIsRegisterOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-900/30 transition-all hover:scale-[1.02] shrink-0"
              >
                <UserPlus size={16} />
                Register New Patient
              </button>
            )}
            </div>
          </div>

          {/* Blood Group Filter */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border/60 text-xs">
            <span className="text-slate-400 font-mono flex items-center gap-1 mr-2">
              <Heart size={13} className="text-red-400" /> Blood Group:
            </span>
            {bloodGroups.map(bg => (
              <button
                key={bg}
                onClick={() => setSelectedBlood(bg)}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  selectedBlood === bg 
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-semibold shadow-sm'
                    : 'bg-surface hover:bg-slate-800 text-slate-400 border border-surface-border'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        {/* Patient Table */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="bg-surface-card rounded-2xl border border-surface-border overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/70 border-b border-surface-border text-[11px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">MRN / ID</th>
                    <th className="px-5 py-3.5">Patient Details</th>
                    <th className="px-5 py-3.5">Age & Gender</th>
                    <th className="px-5 py-3.5">Blood Group</th>
                    <th className="px-5 py-3.5">Contact Phone</th>
                    <th className="px-5 py-3.5">Address</th>
                    <th className="px-5 py-3.5 text-right">EMR Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500 text-sm">
                        No registered patients found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(p => (
                      <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-cyan-400 text-xs">
                          {p.id}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white">{p.name}</div>
                          <div className="text-xs text-slate-400">{p.email || 'No email registered'}</div>
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-slate-300">
                          {p.age} Yrs • {p.gender}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-mono font-bold">
                            {p.bloodGroup || 'O+'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-slate-300">
                          {p.phone}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400 max-w-[200px] truncate">
                          {p.address}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setActivePatient(p)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                          >
                            View EMR <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EMR Dossier Modal */}
        {activePatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-3xl bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setActivePatient(null)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              {/* Dossier Header */}
              <div className="flex items-start gap-4 mb-6 pb-6 border-b border-surface-border">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-brand-600 flex items-center justify-center text-white text-2xl font-bold font-mono shadow-lg shrink-0">
                  {activePatient.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-2xl font-bold text-white">{activePatient.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold">
                      {activePatient.id}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-4 font-mono">
                    <span>Age: <strong>{activePatient.age} Yrs</strong></span>
                    <span>Gender: <strong>{activePatient.gender}</strong></span>
                    <span className="text-red-400">Blood Group: <strong>{activePatient.bloodGroup}</strong></span>
                    <span>Phone: <strong>{activePatient.phone}</strong></span>
                  </div>
                </div>
              </div>

              {/* Longitudinal Chart Sections */}
              <div className="space-y-6">
                
                {/* Section 1: Prescriptions */}
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-2">
                    <FileText size={15} className="text-brand-400" /> Prescriptions & Medication Orders ({patientRx.length})
                  </h4>
                  {patientRx.length === 0 ? (
                    <div className="p-4 rounded-xl bg-surface border border-surface-border text-xs text-slate-500">
                      No prescriptions on record for this patient.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {patientRx.map(rx => (
                        <div key={rx.id} className="p-4 rounded-xl bg-surface border border-surface-border text-xs space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-cyan-400 font-mono">{rx.id} — {rx.date}</span>
                            <span className="text-slate-300 font-medium">Physician: {rx.doctorName}</span>
                          </div>
                          <div className="text-slate-200">
                            <strong>Diagnosis:</strong> {rx.diagnosis}
                          </div>
                          <div className="text-slate-400">
                            <strong>Medicines:</strong> {rx.medicines?.map(m => `${m.name} (${m.dosage}, ${m.frequency})`).join(' • ') || 'None'}
                          </div>
                          {rx.instructions && (
                            <div className="text-slate-500 italic">"{rx.instructions}"</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 2: Appointments */}
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-2">
                    <Calendar size={15} className="text-purple-400" /> Clinical Encounters & Visits ({patientAppts.length})
                  </h4>
                  {patientAppts.length === 0 ? (
                    <div className="p-4 rounded-xl bg-surface border border-surface-border text-xs text-slate-500">
                      No visit history found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {patientAppts.map(a => (
                        <div key={a.id} className="p-3 rounded-xl bg-surface border border-surface-border text-xs space-y-1">
                          <div className="flex justify-between font-mono">
                            <span className="text-white font-bold">{a.date} @ {a.time}</span>
                            <span className="text-cyan-400">{a.status}</span>
                          </div>
                          <div className="text-slate-300">{a.doctorName} ({a.dept})</div>
                          <div className="text-slate-400 truncate">{a.reason || 'Consultation'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3: Diagnostic Labs */}
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-2">
                    <Activity size={15} className="text-emerald-400" /> Laboratory & Investigations ({patientLabs.length})
                  </h4>
                  {patientLabs.length === 0 ? (
                    <div className="p-4 rounded-xl bg-surface border border-surface-border text-xs text-slate-500">
                      No lab investigations found for this patient.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {patientLabs.map(l => (
                        <div key={l.id} className="p-3 rounded-xl bg-surface border border-surface-border flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-white">{l.testName}</div>
                            <div className="text-slate-400 font-mono">Ordered by {l.doctorName} on {l.date}</div>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                              {l.status}
                            </span>
                            <div className="text-slate-300 font-mono mt-0.5">{l.result}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Register Patient Modal */}
        {isRegisterOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setIsRegisterOpen(false)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Register New Patient</h3>
              <p className="text-xs text-slate-400 mb-6">Create hospital Medical Record Number (MRN) and identity profile.</p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Patient Full Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Ananya Sen"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Age *</label>
                    <input 
                      type="number"
                      required
                      placeholder="e.g. 32"
                      value={form.age}
                      onChange={e => setForm(p => ({ ...p, age: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Gender</label>
                    <select 
                      value={form.gender}
                      onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Blood Group</label>
                    <select 
                      value={form.bloodGroup}
                      onChange={e => setForm(p => ({ ...p, bloodGroup: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Mobile Contact *</label>
                    <input 
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Email</label>
                    <input 
                      type="email"
                      placeholder="patient@example.com"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Residential Address</label>
                  <input 
                    type="text"
                    placeholder="Area, City, State"
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-900/40 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Generating MRN & File...' : 'Complete Patient Registration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
