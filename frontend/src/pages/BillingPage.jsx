import { useState, useEffect } from 'react';
import { 
  CreditCard, DollarSign, Plus, Search, CheckCircle2, 
  Clock, AlertCircle, RefreshCw, Printer, X, Check, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getBilling, createInvoice, payInvoice, getPatients } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function BillingPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Invoice Modal
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    patientId: '',
    patientName: '',
    description: 'Specialist Consultation & Diagnostic Panel',
    amount: 1200
  });

  // Payment Modal
  const [payTarget, setPayTarget] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [billRes, patRes] = await Promise.all([getBilling(), getPatients()]);
      setInvoices(billRes.data?.invoices || billRes.data || []);
      setPatients(patRes.data || []);
      if (patRes.data?.length > 0 && !invoiceForm.patientName) {
        setInvoiceForm(p => ({
          ...p,
          patientId: patRes.data[0].id,
          patientName: patRes.data[0].name
        }));
      }
    } catch {
      toast.error('Failed to load billing ledger');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInvoice(e) {
    e.preventDefault();
    if (!invoiceForm.patientName || !invoiceForm.amount) {
      toast.error('Please enter patient and bill amount');
      return;
    }
    setSubmittingInvoice(true);
    try {
      const res = await createInvoice(invoiceForm);
      toast.success(`Invoice ${res.data.id} created successfully!`);
      setInvoices(prev => [res.data, ...prev]);
      setIsNewOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setSubmittingInvoice(false);
    }
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    if (!payTarget) return;
    setSubmittingPay(true);
    try {
      const res = await payInvoice(payTarget.id, { amount: Number(payAmount) });
      toast.success('Payment recorded successfully!');
      setInvoices(prev => prev.map(i => i.id === payTarget.id ? res.data.invoice : i));
      setPayTarget(null);
      setPayAmount('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed');
    } finally {
      setSubmittingPay(false);
    }
  }

  const isPatient = user?.role === 'patient';
  const isStaffOrAdmin = ['admin', 'staff'].includes(user?.role);

  // Role-based filter: patients only see their own invoices
  const visibleInvoices = invoices.filter(inv => {
    if (isPatient) {
      const pName = (user?.displayName || user?.name || '').toLowerCase().trim();
      const uName = (user?.username || '').toLowerCase().trim();
      const pId = String(user?.id || user?._id || user?.patientId || '').trim();
      const iName = (inv.patientName || '').toLowerCase().trim();
      const iUName = (inv.patientUsername || '').toLowerCase().trim();
      const iId = String(inv.patientId || '').trim();
      return (
        (pName && iName === pName) ||
        (uName && (iUName === uName || iName === uName)) ||
        (pId && iId === pId)
      );
    }
    return true; // admin and staff see all
  });

  const totalBilled = visibleInvoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const totalCollected = visibleInvoices.reduce((acc, i) => acc + (Number(i.paidAmount) || 0), 0);
  const totalPending = Math.max(0, totalBilled - totalCollected);
  const paidCount = visibleInvoices.filter(i => i.status === 'Paid').length;

  const filtered = visibleInvoices.filter(inv => {
    const q = search.toLowerCase();
    const matchesSearch = 
      inv.id?.toLowerCase().includes(q) ||
      inv.patientName?.toLowerCase().includes(q) ||
      inv.description?.toLowerCase().includes(q);
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && inv.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <DashboardLayout title={isPatient ? "My Invoices & Medical Bills" : "Hospital Billing, Invoicing & Claims Desk"}>
      <div className="space-y-6">

        {/* Ledger Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {isPatient ? 'My Total Billed' : 'Total Billed'}
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">₹{totalBilled.toLocaleString()}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <DollarSign size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {isPatient ? 'My Amount Paid' : 'Total Collected'}
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">₹{totalCollected.toLocaleString()}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {isPatient ? 'My Pending Balance' : 'Outstanding Dues'}
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">₹{totalPending.toLocaleString()}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {isPatient ? 'Settled Invoices' : 'Cleared Invoices'}
              </div>
              <div className="text-2xl font-bold font-mono text-purple-400 mt-1">{paidCount} Paid</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <CreditCard size={22} />
            </div>
          </div>
        </div>

        {/* Action & Filter Controls */}
        <div className="bg-surface-card p-5 rounded-2xl border border-surface-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by Invoice ID (INV-xxx), patient name, service..."
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
              <option value="ALL">All Payment Statuses</option>
              <option value="Paid">Fully Paid</option>
              <option value="Pending">Pending Payment</option>
              <option value="Partial">Partially Paid</option>
            </select>

            <button 
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-surface hover:bg-slate-800 border border-surface-border text-slate-400 hover:text-white"
              title="Refresh"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>

            {isStaffOrAdmin && (
              <button 
                onClick={() => setIsNewOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-900/30 transition-all hover:scale-[1.02] shrink-0"
              >
                <Plus size={16} />
                Generate Invoice
              </button>
            )}
          </div>
        </div>

        {/* Invoices Ledger Table */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="bg-surface-card rounded-2xl border border-surface-border overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/70 border-b border-surface-border text-[11px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Invoice #</th>
                    {!isPatient && <th className="px-5 py-3.5">Patient Details</th>}
                    <th className="px-5 py-3.5">Service Description</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Total Amount</th>
                    <th className="px-5 py-3.5">Paid / Due</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isPatient ? 7 : 8} className="text-center py-12 text-slate-500 text-sm">
                        No billing invoices found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(inv => {
                      const due = Math.max(0, (inv.amount || 0) - (inv.paidAmount || 0));
                      return (
                        <tr key={inv.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-5 py-4 font-mono font-bold text-cyan-400 text-xs">
                            {inv.id}
                          </td>
                          {!isPatient && (
                            <td className="px-5 py-4 font-semibold text-white">
                              {inv.patientName}
                            </td>
                          )}
                          <td className="px-5 py-4 text-xs text-slate-300 max-w-[200px] truncate">
                            {inv.description}
                          </td>
                          <td className="px-5 py-4 text-xs font-mono text-slate-400">
                            {inv.date}
                          </td>
                          <td className="px-5 py-4 font-mono font-bold text-white text-sm">
                            ₹{inv.amount}
                          </td>
                          <td className="px-5 py-4 text-xs font-mono">
                            <span className="text-emerald-400">₹{inv.paidAmount || 0}</span>
                            {due > 0 && <span className="text-amber-400 ml-1.5">(Due: ₹{due})</span>}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                              inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                              inv.status === 'Partial' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30' :
                              'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {inv.status !== 'Paid' ? (
                              <button
                                onClick={() => {
                                  setPayTarget(inv);
                                  setPayAmount(String(due));
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1 transition-all"
                              >
                                Record Pay
                              </button>
                            ) : (
                              <button 
                                onClick={() => window.print()}
                                className="p-1.5 rounded-lg bg-surface hover:bg-slate-800 text-slate-400 hover:text-white border border-surface-border"
                                title="Print Receipt"
                              >
                                <Printer size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Generate Invoice Modal */}
        {isNewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl">
              <button 
                onClick={() => setIsNewOpen(false)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Generate Patient Invoice</h3>
              <p className="text-xs text-slate-400 mb-6">Create new billing record for consultation, diagnostics, or procedures.</p>

              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Patient *</label>
                  <select 
                    value={invoiceForm.patientId}
                    onChange={e => {
                      const pat = patients.find(p => p.id === e.target.value);
                      if (pat) setInvoiceForm(p => ({ ...p, patientId: pat.id, patientName: pat.name }));
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
                  <label className="block text-xs font-mono text-slate-400 mb-1">Itemized Service Description *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Cardiology OPD Consultation & ECG Diagnostics"
                    value={invoiceForm.description}
                    onChange={e => setInvoiceForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Total Fee / Bill Amount (₹) *</label>
                  <input 
                    type="number"
                    required
                    min={1}
                    value={invoiceForm.amount}
                    onChange={e => setInvoiceForm(p => ({ ...p, amount: Number(e.target.value) }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submittingInvoice}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-900/40 transition-all disabled:opacity-50"
                  >
                    {submittingInvoice ? 'Generating Ledger Entry...' : 'Create & Issue Invoice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Record Payment Modal */}
        {payTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-md bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl">
              <button 
                onClick={() => setPayTarget(null)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Record Payment</h3>
              <p className="text-xs text-slate-400 mb-6">{payTarget.id} — {payTarget.patientName}</p>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="p-3 rounded-xl bg-surface border border-surface-border text-xs font-mono space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Amount:</span>
                    <span className="text-white">₹{payTarget.amount}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Already Paid:</span>
                    <span className="text-emerald-400">₹{payTarget.paidAmount || 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Remaining Due:</span>
                    <span className="text-amber-400 font-bold">₹{payTarget.amount - (payTarget.paidAmount || 0)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Payment Amount Received (₹) *</label>
                  <input 
                    type="number"
                    required
                    min={1}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submittingPay}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-900/40 transition-all disabled:opacity-50"
                  >
                    {submittingPay ? 'Recording Receipt...' : 'Confirm Receipt & Clear Dues'}
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
