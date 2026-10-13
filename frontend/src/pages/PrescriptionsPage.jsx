import { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Download, Printer, Calendar, 
  Stethoscope, Pill, RefreshCw, X, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getPrescriptions, createPrescription, getPrescriptionPdfUrl, getPatients } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New Rx Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    patientName: '',
    patientId: '',
    doctorName: user?.displayName || 'Dr. Arjun Mehta',
    diagnosis: '',
    symptoms: '',
    medicines: [
      { name: 'Paracetamol 650mg', dosage: '1 Tab', frequency: 'Twice daily (BD)', duration: '5 Days', instructions: 'After meals' }
    ],
    tests: '',
    instructions: 'Get plenty of rest and stay well hydrated. Avoid strenuous physical activity.',
    followUpDate: 'In 7 days'
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [rxRes, patRes, docRes] = await Promise.all([
        getPrescriptions(),
        getPatients(),
        getDoctors()
      ]);
      setPrescriptions(rxRes.data || []);
      setPatients(patRes.data || []);
      setDoctors(docRes.data || []);
      if (patRes.data?.length > 0 && !form.patientName) {
        setForm(p => ({
          ...p,
          patientName: patRes.data[0].name,
          patientId: patRes.data[0].id
        }));
      }
    } catch {
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }

  function addMedicineRow() {
    setForm(p => ({
      ...p,
      medicines: [
        ...p.medicines,
        { name: '', dosage: '1 Tab', frequency: 'Twice daily (BD)', duration: '5 Days', instructions: 'After meals' }
      ]
    }));
  }

  function removeMedicineRow(index) {
    setForm(p => ({
      ...p,
      medicines: p.medicines.filter((_, i) => i !== index)
    }));
  }

  function updateMedicine(index, field, value) {
    setForm(p => {
      const updated = [...p.medicines];
      updated[index][field] = value;
      return { ...p, medicines: updated };
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.patientName || !form.diagnosis) {
      toast.error('Patient name and diagnosis are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        tests: form.tests ? form.tests.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      const res = await createPrescription(payload);
      toast.success(`🎉 Prescription generated with Ref: ${res.data.id}`);
      setPrescriptions(prev => [res.data, ...prev]);
      setIsModalOpen(false);
      setSelectedRx(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to issue prescription');
    } finally {
      setSubmitting(false);
    }
  }

  // Role-based filter: patients only see their own prescriptions
  const isPatient = user?.role === 'patient';
  const myPrescriptions = prescriptions.filter(rx => {
    if (isPatient) {
      const name = (user?.displayName || user?.name || '').toLowerCase().trim();
      const username = (user?.username || '').toLowerCase().trim();
      const uid = String(user?.id || user?._id || '').trim();
      const rxName = (rx.patientName || '').toLowerCase().trim();
      const rxUname = (rx.patientUsername || '').toLowerCase().trim();
      const rxId = String(rx.patientId || '').trim();
      return (
        (name && rxName === name) ||
        (username && (rxUname === username || rxName === username)) ||
        (uid && rxId === uid)
      );
    }
    return true; // doctors, staff, admin see all
  });

  const filtered = myPrescriptions.filter(rx => {
    const q = search.toLowerCase();
    return (
      rx.id?.toLowerCase().includes(q) ||
      rx.patientName?.toLowerCase().includes(q) ||
      rx.doctorName?.toLowerCase().includes(q) ||
      rx.diagnosis?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout title={isPatient ? "My Prescriptions & Medications" : "Electronic Prescriptions & Clinical Records"}>
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {isPatient ? 'My Prescriptions' : 'Total Authored Rx'}
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{myPrescriptions.length} Records</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileText size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Digital PDF Export</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">100% Instant</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Download size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Clinical Security</div>
              <div className="text-2xl font-bold font-mono text-purple-400 mt-1">Authenticated</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Stethoscope size={22} />
            </div>
          </div>
        </div>

        {/* Action & Search Bar */}
        <div className="bg-surface-card p-5 rounded-2xl border border-surface-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder={isPatient ? "Search by Rx ID, doctor name, diagnosis..." : "Search by Rx ID (RX-xxxx), patient name, physician, diagnosis..."}
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

            {['doctor', 'admin'].includes(user?.role) && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-900/30 transition-all hover:scale-[1.02] shrink-0"
              >
                <Plus size={16} />
                Issue New Prescription
              </button>
            )}
          </div>
        </div>

        {/* Prescriptions Grid */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(rx => (
              <div 
                key={rx.id}
                className="bg-surface-card rounded-3xl p-6 border border-surface-border hover:border-cyan-500/40 transition-all duration-300 hover:shadow-2xl flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <FileText size={22} />
                      </div>
                      <div>
                        <div className="font-mono font-bold text-cyan-400 text-sm">{rx.id}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Date: {rx.date}</div>
                      </div>
                    </div>

                    <a
                      href={getPrescriptionPdfUrl(rx.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-surface-border text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Download PDF Prescription"
                    >
                      <Download size={14} /> PDF Slip
                    </a>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Patient:</span>
                      <strong className="text-white">{rx.patientName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Physician:</span>
                      <strong className="text-cyan-300">{rx.doctorName}</strong>
                    </div>
                    <div className="pt-2 border-t border-surface-border/60">
                      <span className="text-slate-400 font-mono">Diagnosis:</span>
                      <p className="text-slate-200 font-medium mt-0.5">{rx.diagnosis}</p>
                    </div>
                  </div>

                  {/* Medicines Preview */}
                  <div className="mt-4 pt-3 border-t border-surface-border/60">
                    <div className="text-[11px] font-mono uppercase text-slate-400 font-bold mb-2 flex items-center gap-1">
                      <Pill size={12} className="text-brand-400" /> Prescribed Medications:
                    </div>
                    <div className="space-y-1.5">
                      {rx.medicines?.map((m, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-surface border border-surface-border/60 text-xs flex justify-between items-center">
                          <span className="font-semibold text-white">{m.name}</span>
                          <span className="text-cyan-400 font-mono text-[11px]">{m.dosage} • {m.frequency}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {rx.instructions && (
                    <div className="mt-3 text-[11px] text-slate-400 italic">
                      Advice: {rx.instructions}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-surface-border flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Follow-Up: <strong className="text-slate-200">{rx.followUpDate || 'As needed'}</strong></span>
                  <button 
                    onClick={() => setSelectedRx(rx)}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    Full Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Issue Rx Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-2xl bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Issue Electronic Prescription (Rx)</h3>
              <p className="text-xs text-slate-400 mb-6">Create authorized digital prescription with dosage frequency and instructions.</p>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Patient *</label>
                    <select 
                      value={form.patientId}
                      onChange={e => {
                        const pat = patients.find(p => p.id === e.target.value);
                        if (pat) setForm(p => ({ ...p, patientId: pat.id, patientName: pat.name }));
                      }}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Attending Physician</label>
                    <input 
                      type="text"
                      value={form.doctorName}
                      onChange={e => setForm(p => ({ ...p, doctorName: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Primary Clinical Diagnosis *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Acute Bronchitis, Type-2 Diabetes Mellitus"
                    value={form.diagnosis}
                    onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Dynamic Medicine Rows */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono text-slate-400">Medications & Dosages *</label>
                    <button 
                      type="button"
                      onClick={addMedicineRow}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Plus size={13} /> Add Medicine
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.medicines.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-surface border border-surface-border/60 space-y-2">
                        <div className="flex items-center gap-2">
                          <input 
                            type="text"
                            required
                            placeholder="Medicine name & strength (e.g. Amoxicillin 500mg)"
                            value={m.name}
                            onChange={e => updateMedicine(idx, 'name', e.target.value)}
                            className="flex-1 bg-slate-900 border border-surface-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          />
                          {form.medicines.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => removeMedicineRow(idx)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <input 
                            type="text"
                            placeholder="Dosage (e.g. 1 Tab)"
                            value={m.dosage}
                            onChange={e => updateMedicine(idx, 'dosage', e.target.value)}
                            className="bg-slate-900 border border-surface-border rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                          />
                          <input 
                            type="text"
                            placeholder="Frequency (e.g. BD/TDS)"
                            value={m.frequency}
                            onChange={e => updateMedicine(idx, 'frequency', e.target.value)}
                            className="bg-slate-900 border border-surface-border rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                          />
                          <input 
                            type="text"
                            placeholder="Duration (e.g. 5 Days)"
                            value={m.duration}
                            onChange={e => updateMedicine(idx, 'duration', e.target.value)}
                            className="bg-slate-900 border border-surface-border rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Investigations to Order (comma-separated)</label>
                  <input 
                    type="text"
                    placeholder="e.g. Complete Blood Count (CBC), Chest X-Ray PA View"
                    value={form.tests}
                    onChange={e => setForm(p => ({ ...p, tests: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Follow-up Timeline</label>
                    <input 
                      type="text"
                      placeholder="e.g. In 7 days"
                      value={form.followUpDate}
                      onChange={e => setForm(p => ({ ...p, followUpDate: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Special Advice</label>
                    <input 
                      type="text"
                      placeholder="e.g. Rest and plenty of fluids"
                      value={form.instructions}
                      onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-900/40 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Generating Official Rx & PDF...' : 'Sign & Authorize Prescription'}
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
