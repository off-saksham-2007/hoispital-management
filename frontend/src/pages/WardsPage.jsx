import { useState, useEffect } from 'react';
import { 
  Bed, UserCheck, AlertTriangle, ShieldCheck, Plus, Search, 
  RefreshCw, CheckCircle2, ArrowRightLeft, LogOut, X, Filter, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getAdmissions, admitPatient, dischargePatient, transferPatient, getDoctors, getPatients } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function WardsPage() {
  const { user } = useAuth();
  const [admissions, setAdmissions] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wardFilter, setWardFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Admit Modal
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);
  const [submittingAdmit, setSubmittingAdmit] = useState(false);
  const [admitForm, setAdmitForm] = useState({
    ward: 'ICU & Critical Care',
    bedCode: 'ICU-05',
    patientName: '',
    doctorName: 'Dr. Arjun Mehta',
    diagnosis: 'Acute Monitoring'
  });

  // Transfer Modal
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferForm, setTransferForm] = useState({
    newWard: 'General Medical Ward',
    newBedCode: 'GW-15'
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [admRes, docRes, patRes] = await Promise.all([
        getAdmissions(),
        getDoctors(),
        getPatients()
      ]);
      setAdmissions(admRes.data || []);
      setDoctors(docRes.data || []);
      setPatients(patRes.data || []);
      if (patRes.data?.length > 0 && !admitForm.patientName) {
        setAdmitForm(p => ({ ...p, patientName: patRes.data[0].name }));
      }
    } catch {
      toast.error('Failed to load bed admissions');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdmit(e) {
    e.preventDefault();
    if (!admitForm.patientName || !admitForm.bedCode) {
      toast.error('Patient name and bed code are required');
      return;
    }
    setSubmittingAdmit(true);
    try {
      const res = await admitPatient(admitForm);
      toast.success(`Patient admitted to ${res.data.bedCode} (${res.data.ward})`);
      setAdmissions(prev => [res.data, ...prev]);
      setIsAdmitOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Admission failed');
    } finally {
      setSubmittingAdmit(false);
    }
  }

  async function handleDischarge(id) {
    if (!window.confirm('Confirm patient discharge and bed sanitization?')) return;
    try {
      await dischargePatient(id);
      toast.success('Patient successfully discharged!');
      setAdmissions(prev => prev.map(a => a.id === id ? { ...a, status: 'Discharged' } : a));
    } catch {
      toast.error('Failed to discharge patient');
    }
  }

  async function handleTransferSubmit(e) {
    e.preventDefault();
    if (!transferTarget) return;
    try {
      await transferPatient(transferTarget.id, transferForm);
      toast.success(`Patient transferred to ${transferForm.newBedCode} (${transferForm.newWard})`);
      setAdmissions(prev => prev.map(a => a.id === transferTarget.id ? { 
        ...a, 
        bedCode: transferForm.newBedCode, 
        ward: transferForm.newWard 
      } : a));
      setTransferTarget(null);
    } catch {
      toast.error('Failed to transfer patient');
    }
  }

  const activeAdmissions = admissions.filter(a => a.status !== 'Discharged');
  const totalBeds = 48; // Total hospital bed capacity
  const occupiedCount = activeAdmissions.length;
  const availableBeds = Math.max(0, totalBeds - occupiedCount);
  const occupancyRate = Math.round((occupiedCount / totalBeds) * 100);

  const wardTypes = [
    'ALL',
    'ICU & Critical Care',
    'General Medical Ward',
    'Emergency Trauma Bay',
    'Cardiac Step-Down',
    'Pediatric NICU'
  ];

  const filtered = activeAdmissions.filter(a => {
    const q = search.toLowerCase();
    const matchesSearch = 
      a.patientName?.toLowerCase().includes(q) ||
      a.doctorName?.toLowerCase().includes(q) ||
      a.bedCode?.toLowerCase().includes(q) ||
      a.diagnosis?.toLowerCase().includes(q);
    
    if (wardFilter === 'ALL') return matchesSearch;
    return matchesSearch && a.ward === wardFilter;
  });

  return (
    <DashboardLayout title="Inpatient Bed & Ward Management Hub">
      <div className="space-y-6">

        {/* Occupancy Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Bed Capacity</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">{totalBeds} Beds</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Bed size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Currently Occupied</div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{occupiedCount} Inpatients</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UserCheck size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Available Ready Beds</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{availableBeds} Sanitized</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Occupancy Ratio</div>
              <div className="text-2xl font-bold font-mono text-purple-400 mt-1">{occupancyRate}% Rate</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Activity size={22} />
            </div>
          </div>
        </div>

        {/* Filter & Action Controls */}
        <div className="bg-surface-card p-5 rounded-2xl border border-surface-border space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search by Bed Code, Patient, Attending Physician, Diagnosis..."
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
                  onClick={() => setIsAdmitOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-900/30 transition-all hover:scale-[1.02] shrink-0"
                >
                  <Plus size={16} />
                  Admit Patient
                </button>
              )}
            </div>
          </div>

          {/* Ward Type Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border/60 text-xs">
            <span className="text-slate-400 font-mono flex items-center gap-1 mr-2">
              <Filter size={13} /> Ward Type:
            </span>
            {wardTypes.map(w => (
              <button
                key={w}
                onClick={() => setWardFilter(w)}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  wardFilter === w 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm'
                    : 'bg-surface hover:bg-slate-800 text-slate-400 border border-surface-border'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Live Beds Grid */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(adm => (
              <div 
                key={adm.id}
                className="bg-surface-card rounded-3xl p-6 border border-surface-border hover:border-brand-500/40 transition-all duration-300 hover:shadow-2xl flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
                        {adm.bedCode}
                      </div>
                      <div>
                        <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                          {adm.ward}
                        </span>
                        <div className="text-[11px] text-slate-500 font-mono">Admitted: {adm.admittedAt}</div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Occupied
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {adm.patientName}
                  </h3>
                  <div className="text-xs text-slate-300 mt-1">
                    <strong>Diagnosis:</strong> <span className="text-slate-400">{adm.diagnosis || 'Clinical evaluation'}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    <strong>Physician:</strong> <span className="text-cyan-400">{adm.doctorName}</span>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-surface-border flex items-center justify-between gap-2">
                  {['staff', 'admin'].includes(user?.role) && (
                    <button
                      onClick={() => {
                        setTransferTarget(adm);
                        setTransferForm({ newWard: adm.ward, newBedCode: adm.bedCode });
                      }}
                      className="px-3 py-2 rounded-xl bg-surface hover:bg-slate-800 text-slate-300 hover:text-white border border-surface-border font-semibold text-xs transition-all flex items-center gap-1.5"
                    >
                      <ArrowRightLeft size={14} /> Transfer
                    </button>
                  )}

                  {['doctor', 'admin'].includes(user?.role) && (
                    <button
                      onClick={() => handleDischarge(adm.id)}
                      className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 font-semibold text-xs transition-all flex items-center gap-1.5"
                    >
                      <LogOut size={14} /> Discharge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Admit Patient Modal */}
        {isAdmitOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl">
              <button 
                onClick={() => setIsAdmitOpen(false)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Admit Inpatient to Ward</h3>
              <p className="text-xs text-slate-400 mb-6">Assign bed, attending clinician, and provisional diagnosis.</p>

              <form onSubmit={handleAdmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Patient Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Elena Varco"
                    value={admitForm.patientName}
                    onChange={e => setAdmitForm(p => ({ ...p, patientName: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Hospital Ward</label>
                    <select 
                      value={admitForm.ward}
                      onChange={e => setAdmitForm(p => ({ ...p, ward: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="ICU & Critical Care">ICU & Critical Care</option>
                      <option value="General Medical Ward">General Medical Ward</option>
                      <option value="Emergency Trauma Bay">Emergency Trauma Bay</option>
                      <option value="Cardiac Step-Down">Cardiac Step-Down</option>
                      <option value="Pediatric NICU">Pediatric NICU</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Bed Bay Code</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. ICU-06"
                      value={admitForm.bedCode}
                      onChange={e => setAdmitForm(p => ({ ...p, bedCode: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Attending Physician</label>
                  <select 
                    value={admitForm.doctorName}
                    onChange={e => setAdmitForm(p => ({ ...p, doctorName: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.name}>
                        {d.name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Provisional Diagnosis / Reason</label>
                  <textarea 
                    rows={2}
                    placeholder="e.g. Post-operative observation, severe acute broncho-spasm"
                    value={admitForm.diagnosis}
                    onChange={e => setAdmitForm(p => ({ ...p, diagnosis: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submittingAdmit}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-900/40 transition-all disabled:opacity-50"
                  >
                    {submittingAdmit ? 'Allocating Bed Bay...' : 'Confirm Patient Admission'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transfer Bed Modal */}
        {transferTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-md bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl">
              <button 
                onClick={() => setTransferTarget(null)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Transfer Bed / Ward</h3>
              <p className="text-xs text-slate-400 mb-6">Patient: {transferTarget.patientName} (Current: {transferTarget.bedCode})</p>

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Destination Ward</label>
                  <select 
                    value={transferForm.newWard}
                    onChange={e => setTransferForm(p => ({ ...p, newWard: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="ICU & Critical Care">ICU & Critical Care</option>
                    <option value="General Medical Ward">General Medical Ward</option>
                    <option value="Emergency Trauma Bay">Emergency Trauma Bay</option>
                    <option value="Cardiac Step-Down">Cardiac Step-Down</option>
                    <option value="Pediatric NICU">Pediatric NICU</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">New Bed Code</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. GW-18"
                    value={transferForm.newBedCode}
                    onChange={e => setTransferForm(p => ({ ...p, newBedCode: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-900/40 transition-all"
                  >
                    Confirm Bed Transfer
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
