import { useState, useEffect } from 'react';
import { 
  Activity, Plus, Search, CheckCircle2, Clock, 
  AlertCircle, RefreshCw, X, FileCheck, Stethoscope, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getLabs, orderLabTest, submitLabResult, getPatients, getDoctors } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function LaboratoryPage() {
  const { user } = useAuth();
  const [labs, setLabs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Order Test Modal
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({
    patientId: '',
    patientName: '',
    testName: 'Complete Blood Count (CBC)',
    doctorName: 'Dr. Arjun Mehta'
  });

  // Result Entry Modal
  const [resultTarget, setResultTarget] = useState(null);
  const [resultText, setResultText] = useState('');
  const [submittingResult, setSubmittingResult] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [labRes, patRes, docRes] = await Promise.all([
        getLabs(),
        getPatients(),
        getDoctors()
      ]);
      setLabs(labRes.data || []);
      setPatients(patRes.data || []);
      setDoctors(docRes.data || []);
      if (patRes.data?.length > 0 && !orderForm.patientName) {
        setOrderForm(p => ({
          ...p,
          patientId: patRes.data[0].id,
          patientName: patRes.data[0].name
        }));
      }
    } catch {
      toast.error('Failed to load laboratory tests');
    } finally {
      setLoading(false);
    }
  }

  async function handleOrderSubmit(e) {
    e.preventDefault();
    if (!orderForm.patientName || !orderForm.testName) {
      toast.error('Please enter patient and investigation name');
      return;
    }
    setSubmittingOrder(true);
    try {
      const res = await orderLabTest(orderForm);
      toast.success(`Lab investigation ${res.data.id} registered!`);
      setLabs(prev => [res.data, ...prev]);
      setIsOrderOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Order failed');
    } finally {
      setSubmittingOrder(false);
    }
  }

  async function handleResultSubmit(e) {
    e.preventDefault();
    if (!resultTarget) return;
    setSubmittingResult(true);
    try {
      const res = await submitLabResult(resultTarget.id, { result: resultText });
      toast.success('Lab findings verified and released to EMR!');
      setLabs(prev => prev.map(l => l.id === resultTarget.id ? res.data.lab : l));
      setResultTarget(null);
      setResultText('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit results');
    } finally {
      setSubmittingResult(false);
    }
  }

  const totalTests = labs.length;
  const completedCount = labs.filter(l => l.status === 'Completed').length;
  const processingCount = labs.filter(l => l.status !== 'Completed').length;

  const testProtocols = [
    'Complete Blood Count (CBC)',
    'Lipid Profile & Serum Cholesterol',
    'HbA1c & Fasting Blood Sugar',
    'Liver Function Test (LFT)',
    'Digital Chest X-Ray PA View',
    '12-Lead Electrocardiogram (ECG)',
    'Renal / Kidney Function Test (KFT)',
    'Thyroid Profile (T3, T4, TSH)'
  ];

  const filtered = labs.filter(l => {
    const q = search.toLowerCase();
    const matchesSearch = 
      l.id?.toLowerCase().includes(q) ||
      l.patientName?.toLowerCase().includes(q) ||
      l.testName?.toLowerCase().includes(q) ||
      l.doctorName?.toLowerCase().includes(q);
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && l.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <DashboardLayout title="Laboratory & Diagnostics Command Desk">
      <div className="space-y-6">

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Diagnostic Orders</div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{totalTests} Orders</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Specimens In Processing</div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{processingCount} Analyzing</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Verified & Released</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{completedCount} Released</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        {/* Filter and Action Bar */}
        <div className="bg-surface-card p-5 rounded-2xl border border-surface-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by Specimen ID, patient name, investigation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface border border-surface-border focus:border-brand-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-surface border border-surface-border text-xs rounded-xl px-3 py-2.5 text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Test Statuses</option>
              <option value="Processing">Processing / In Analysis</option>
              <option value="Completed">Completed & Released</option>
            </select>

            <button 
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-surface hover:bg-slate-800 border border-surface-border text-slate-400 hover:text-white"
              title="Refresh"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>

            {['doctor', 'admin'].includes(user?.role) && (
              <button 
                onClick={() => setIsOrderOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-900/30 transition-all hover:scale-[1.02] shrink-0"
              >
                <Plus size={16} />
                Order Lab Test
              </button>
            )}
          </div>
        </div>

        {/* Lab Orders Table */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="bg-surface-card rounded-2xl border border-surface-border overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/70 border-b border-surface-border text-[11px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Order ID</th>
                    <th className="px-5 py-3.5">Patient Details</th>
                    <th className="px-5 py-3.5">Investigation Protocol</th>
                    <th className="px-5 py-3.5">Ordering Physician</th>
                    <th className="px-5 py-3.5">Order Date</th>
                    <th className="px-5 py-3.5">Status & Findings</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500 text-sm">
                        No diagnostic investigations found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(lab => (
                      <tr key={lab.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-cyan-400 text-xs">
                          {lab.id}
                        </td>
                        <td className="px-5 py-4 font-semibold text-white">
                          {lab.patientName}
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-200">
                          {lab.testName}
                        </td>
                        <td className="px-5 py-4 text-xs text-cyan-400 font-mono">
                          {lab.doctorName}
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-slate-400">
                          {lab.date}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                            lab.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                            'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {lab.status}
                          </span>
                          <div className="text-xs text-slate-400 mt-1 font-mono">
                            {lab.result || 'Awaiting Analysis'}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {lab.status !== 'Completed' ? (
                            ['staff', 'admin'].includes(user?.role) ? (
                              <button
                                onClick={() => {
                                  setResultTarget(lab);
                                  setResultText('');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold inline-flex items-center gap-1 transition-all"
                              >
                                <FileCheck size={14} /> Enter Results
                              </button>
                            ) : (
                              <span className="text-xs font-mono text-amber-400">
                                In Analysis
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-mono text-emerald-400 font-semibold">
                              ✓ Verified
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Order Test Modal */}
        {isOrderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl">
              <button 
                onClick={() => setIsOrderOpen(false)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Order Diagnostic Test</h3>
              <p className="text-xs text-slate-400 mb-6">Dispatch pathology or imaging request to central diagnostic laboratory.</p>

              <form onSubmit={handleOrderSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Patient *</label>
                  <select 
                    value={orderForm.patientId}
                    onChange={e => {
                      const pat = patients.find(p => p.id === e.target.value);
                      if (pat) setOrderForm(p => ({ ...p, patientId: pat.id, patientName: pat.name }));
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
                  <label className="block text-xs font-mono text-slate-400 mb-1">Investigation Protocol *</label>
                  <select 
                    value={orderForm.testName}
                    onChange={e => setOrderForm(p => ({ ...p, testName: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    {testProtocols.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Ordering Physician</label>
                  <select 
                    value={orderForm.doctorName}
                    onChange={e => setOrderForm(p => ({ ...p, doctorName: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.name}>
                        {d.name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submittingOrder}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-900/40 transition-all disabled:opacity-50"
                  >
                    {submittingOrder ? 'Dispatching Test Order...' : 'Confirm Laboratory Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enter Findings Modal */}
        {resultTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-md bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl">
              <button 
                onClick={() => setResultTarget(null)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Enter Diagnostic Findings</h3>
              <p className="text-xs text-slate-400 mb-6">{resultTarget.testName} for {resultTarget.patientName}</p>

              <form onSubmit={handleResultSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Clinical Findings & Values *</label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="e.g. Hemoglobin: 13.8 g/dL, WBC: 7,200/uL, Platelets: 240,000/uL (Normal reference ranges met)"
                    value={resultText}
                    onChange={e => setResultText(e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submittingResult}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-900/40 transition-all disabled:opacity-50"
                  >
                    {submittingResult ? 'Releasing to EMR...' : 'Release Diagnostic Findings'}
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
