import { useState, useEffect } from 'react';
import { 
  Pill, AlertTriangle, Plus, Search, CheckCircle2, 
  Package, DollarSign, RefreshCw, X, ArrowDownRight, ArrowUpRight, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getInventory, addInventoryItem, dispenseMedicine, restockMedicine } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function PharmacyPage() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Add Item Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'Analgesic',
    quantity: 100,
    unit: 'Tablets',
    price: 10
  });

  // Dispense Modal
  const [dispenseTarget, setDispenseTarget] = useState(null);
  const [dispenseQty, setDispenseQty] = useState(1);
  const [submittingDispense, setSubmittingDispense] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoading(true);
    try {
      const res = await getInventory();
      setInventory(res.data || []);
    } catch {
      toast.error('Failed to load pharmacy inventory');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name || form.quantity === undefined) {
      toast.error('Item name and quantity are required');
      return;
    }
    setSubmittingAdd(true);
    try {
      const res = await addInventoryItem(form);
      toast.success(`${res.data.name} added to pharmacy inventory!`);
      setInventory(prev => [res.data, ...prev]);
      setIsAddOpen(false);
      setForm({
        name: '',
        category: 'Analgesic',
        quantity: 100,
        unit: 'Tablets',
        price: 10
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add item');
    } finally {
      setSubmittingAdd(false);
    }
  }

  async function handleDispenseSubmit(e) {
    e.preventDefault();
    if (!dispenseTarget) return;
    setSubmittingDispense(true);
    try {
      const res = await dispenseMedicine(dispenseTarget.id, { quantity: Number(dispenseQty) });
      toast.success(`Dispensed ${dispenseQty} ${dispenseTarget.unit} of ${dispenseTarget.name}`);
      setInventory(prev => prev.map(i => i.id === dispenseTarget.id ? res.data.item : i));
      setDispenseTarget(null);
      setDispenseQty(1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispense');
    } finally {
      setSubmittingDispense(false);
    }
  }

  async function handleQuickRestock(id) {
    try {
      const res = await restockMedicine(id, { quantity: 50 });
      toast.success('Restocked 50 units successfully!');
      setInventory(prev => prev.map(i => i.id === id ? res.data.item : i));
    } catch {
      toast.error('Restock failed');
    }
  }

  const totalItems = inventory.length;
  const inStockCount = inventory.filter(i => i.status === 'In Stock').length;
  const lowStockCount = inventory.filter(i => i.status === 'Low Stock' || i.quantity < 20).length;
  const totalUnits = inventory.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

  const categories = ['ALL', 'Analgesic', 'Antibiotic', 'Cardiac', 'Respiratory', 'General', 'Surgical'];

  const filtered = inventory.filter(i => {
    const q = search.toLowerCase();
    const matchesSearch = 
      i.name?.toLowerCase().includes(q) ||
      i.id?.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q);
    
    if (categoryFilter === 'ALL') return matchesSearch;
    return matchesSearch && i.category?.toLowerCase() === categoryFilter.toLowerCase();
  });

  return (
    <DashboardLayout title="Pharmacy & Medical Inventory Management">
      <div className="space-y-6">

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Formulations</div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{totalItems} SKUs</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Pill size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Stock Units</div>
              <div className="text-2xl font-bold font-mono text-white mt-1">{totalUnits} Units</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Package size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Adequate Stock</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{inStockCount} Items</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Low Stock Alerts</div>
              <div className="text-2xl font-bold font-mono text-red-400 mt-1">{lowStockCount} Reorder</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>

        {/* Filter and Action Bar */}
        <div className="bg-surface-card p-5 rounded-2xl border border-surface-border space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search medicine by name, category, SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-surface border border-surface-border focus:border-brand-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={fetchInventory}
                className="p-2.5 rounded-xl bg-surface hover:bg-slate-800 border border-surface-border text-slate-400 hover:text-white"
                title="Refresh"
              >
                <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
              </button>

              {['staff', 'admin'].includes(user?.role) && (
                <button 
                  onClick={() => setIsAddOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-900/30 transition-all hover:scale-[1.02] shrink-0"
                >
                  <Plus size={16} />
                  Add Medicine
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border/60 text-xs">
            <span className="text-slate-400 font-mono flex items-center gap-1 mr-2">
              <Filter size={13} /> Therapeutic Class:
            </span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  categoryFilter === cat 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm'
                    : 'bg-surface hover:bg-slate-800 text-slate-400 border border-surface-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Table */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="bg-surface-card rounded-2xl border border-surface-border overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/70 border-b border-surface-border text-[11px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">SKU / Item</th>
                    <th className="px-5 py-3.5">Therapeutic Class</th>
                    <th className="px-5 py-3.5">Stock Level</th>
                    <th className="px-5 py-3.5">Unit Price</th>
                    <th className="px-5 py-3.5">Inventory Status</th>
                    {!['doctor'].includes(user?.role) && <th className="px-5 py-3.5 text-right">Quick Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={user?.role === 'doctor' ? 5 : 6} className="text-center py-12 text-slate-500 text-sm">
                        No pharmacy items found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(item => (
                      <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white">{item.name}</div>
                          <div className="text-xs text-cyan-400 font-mono">{item.id}</div>
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-slate-300">
                          {item.category}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-white">
                          {item.quantity} <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-300 text-xs">
                          ₹{item.price} / unit
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold ${
                            item.status === 'In Stock' && item.quantity > 20 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                            item.status === 'Out of Stock' || item.quantity === 0 ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                            'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {item.quantity === 0 ? 'Out of Stock' : (item.quantity < 20 ? 'Low Stock' : 'In Stock')}
                          </span>
                        </td>
                        {!['doctor'].includes(user?.role) && (
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                disabled={item.quantity === 0}
                                onClick={() => {
                                  setDispenseTarget(item);
                                  setDispenseQty(1);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold inline-flex items-center gap-1 transition-all disabled:opacity-30"
                                title="Dispense to Patient"
                              >
                                <ArrowDownRight size={13} /> Dispense
                              </button>

                              <button
                                onClick={() => handleQuickRestock(item.id)}
                                className="px-2.5 py-1 rounded-xl bg-surface hover:bg-slate-800 text-slate-300 hover:text-white border border-surface-border text-xs font-semibold inline-flex items-center gap-1 transition-all"
                                title="Restock 50 Units"
                              >
                                <ArrowUpRight size={13} /> +50
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Item Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl">
              <button 
                onClick={() => setIsAddOpen(false)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Add Pharmacy Medication</h3>
              <p className="text-xs text-slate-400 mb-6">Register pharmaceutical formulation and initial stock quantity.</p>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Medication Name & Strength *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Metformin 500mg, Azithromycin 250mg"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Therapeutic Category</label>
                    <select 
                      value={form.category}
                      onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="Analgesic">Analgesic</option>
                      <option value="Antibiotic">Antibiotic</option>
                      <option value="Cardiac">Cardiac</option>
                      <option value="Respiratory">Respiratory</option>
                      <option value="General">General</option>
                      <option value="Surgical">Surgical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Dosage Unit</label>
                    <select 
                      value={form.unit}
                      onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="Tablets">Tablets</option>
                      <option value="Capsules">Capsules</option>
                      <option value="Syrup Bottle">Syrup Bottle</option>
                      <option value="Vials / Injections">Vials / Injections</option>
                      <option value="Packs">Packs</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Initial Quantity</label>
                    <input 
                      type="number"
                      required
                      min={1}
                      value={form.quantity}
                      onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Price per Unit (₹)</label>
                    <input 
                      type="number"
                      required
                      min={1}
                      value={form.price}
                      onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submittingAdd}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-900/40 transition-all disabled:opacity-50"
                  >
                    {submittingAdd ? 'Adding Item...' : 'Save & Stock Formulation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dispense Modal */}
        {dispenseTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-md bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl">
              <button 
                onClick={() => setDispenseTarget(null)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Dispense Medicine</h3>
              <p className="text-xs text-slate-400 mb-6">{dispenseTarget.name} (Available: {dispenseTarget.quantity} {dispenseTarget.unit})</p>

              <form onSubmit={handleDispenseSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Dispense Quantity</label>
                  <input 
                    type="number"
                    required
                    min={1}
                    max={dispenseTarget.quantity}
                    value={dispenseQty}
                    onChange={e => setDispenseQty(e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submittingDispense}
                    className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-900/40 transition-all disabled:opacity-50"
                  >
                    {submittingDispense ? 'Deducting Stock...' : 'Confirm Medicine Dispense'}
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
