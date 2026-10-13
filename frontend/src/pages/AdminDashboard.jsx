import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import {
  getDoctors, createDoctor, deleteDoctor,
  getStaff, createStaff, deleteStaff,
  getPatients, getAppointments, getBilling, getInventory,
  assignDoctorStaff, getContactMessages, resolveContactMessage
} from '../api/api';
import toast from 'react-hot-toast';
import {
  Users, Stethoscope, UserCheck, CreditCard,
  Plus, Trash2, Search, Package, ShieldCheck, Headphones, Link2
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [doctors, setDoctors] = useState([]);
  const [staff, setStaff] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Doctor modal form
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    name: '', specialization: 'Cardiology', exp: 5, fee: 1000,
    phone: '', email: '', username: '', password: 'Doctor@CarePoint123'
  });

  // Staff modal form
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '', role: 'Nurse', dept: 'ICU', phone: '',
    username: '', password: 'Staff@CarePoint123'
  });

  // Staff-Doctor assignment
  const [assigningDoc, setAssigningDoc] = useState(null);
  const [selectedStaffForDoc, setSelectedStaffForDoc] = useState('');

  // Helpdesk resolve modal
  const [resolvingTicket, setResolvingTicket] = useState(null);
  const [resolveResponse, setResolveResponse] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [docRes, staffRes, patRes, apptRes, billRes, invRes, contactRes] = await Promise.all([
        getDoctors().catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] })),
        getPatients().catch(() => ({ data: [] })),
        getAppointments().catch(() => ({ data: [] })),
        getBilling().catch(() => ({ data: { invoices: [] } })),
        getInventory().catch(() => ({ data: [] })),
        getContactMessages().catch(() => ({ data: [] }))
      ]);
      setDoctors(docRes.data || []);
      setStaff(staffRes.data || []);
      setPatients(patRes.data || []);
      setAppointments(apptRes.data || []);
      setInvoices(billRes.data?.invoices || billRes.data || []);
      setInventory(invRes.data || []);
      setContactMessages(contactRes.data || []);
    } catch {
      toast.error('Failed to load system telemetry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    try {
      await createDoctor(docForm);
      toast.success(`Dr. ${docForm.name} added to roster`);
      setShowDocModal(false);
      setDocForm({ name: '', specialization: 'Cardiology', exp: 5, fee: 1000, phone: '', email: '', username: '', password: 'Doctor@CarePoint123' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add doctor');
    }
  };

  const handleDeleteDoctor = async (id) => {
    if (!window.confirm('Are you sure you want to remove this doctor from the roster?')) return;
    try {
      await deleteDoctor(id);
      toast.success('Doctor removed');
      loadData();
    } catch {
      toast.error('Failed to delete doctor');
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      await createStaff(staffForm);
      toast.success(`Staff member ${staffForm.name} onboarded`);
      setShowStaffModal(false);
      setStaffForm({ name: '', role: 'Nurse', dept: 'ICU', phone: '', username: '', password: 'Staff@CarePoint123' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to onboard staff');
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to remove this staff record?')) return;
    try {
      await deleteStaff(id);
      toast.success('Staff record removed');
      loadData();
    } catch {
      toast.error('Failed to remove staff');
    }
  };

  const totalRevenue = invoices.reduce((acc, inv) => acc + (Number(inv.paidAmount) || 0), 0);
  const openTickets = contactMessages.filter(m => m.status === 'Open').length;

  const handleAssignStaff = async (docId) => {
    if (!selectedStaffForDoc) return toast.error('Please select a staff member first');
    try {
      await assignDoctorStaff(docId, selectedStaffForDoc);
      toast.success('Staff assigned successfully to doctor!');
      setAssigningDoc(null);
      setSelectedStaffForDoc('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign staff');
    }
  };

  const handleResolveTicket = async (ticketId) => {
    if (!resolveResponse.trim()) return toast.error('Please enter a response before resolving.');
    try {
      await resolveContactMessage(ticketId, { status: 'Resolved', response: resolveResponse });
      toast.success('Ticket resolved and patient notified!');
      setResolvingTicket(null);
      setResolveResponse('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resolve ticket');
    }
  };

  const tabs = [
    { id: 'overview',  label: 'Overview & KPIs',  icon: ShieldCheck },
    { id: 'doctors',   label: 'Doctors Roster',   icon: Stethoscope, badge: doctors.length },
    { id: 'staff',     label: 'Hospital Staff',   icon: UserCheck,   badge: staff.length },
    { id: 'patients',  label: 'Patients',         icon: Users,       badge: patients.length },
    { id: 'billing',   label: 'Billing & Revenue',icon: CreditCard },
    { id: 'inventory', label: 'Inventory',        icon: Package,     badge: inventory.length },
    { id: 'helpdesk',  label: 'Helpdesk',         icon: Headphones,  badge: openTickets || undefined },
  ];

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-brand-300 rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm font-medium">Loading Admin Command Center…</p>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title="Admin Command Center"
      subtitle="Enterprise system monitoring, access control and staff provisioning"
    >
      {/* ── OVERVIEW TAB ────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users}       label="Total Patients"     value={patients.length}          sub="Registered in database" color="blue" />
            <StatCard icon={Stethoscope} label="Active Doctors"     value={doctors.length}           sub="On roster & OPD duty"   color="green" />
            <StatCard icon={UserCheck}   label="Clinical Staff"     value={staff.length}             sub="Nurses, tech & admin"   color="purple" />
            <StatCard icon={CreditCard}  label="Audited Revenue"    value={`₹${totalRevenue.toLocaleString('en-IN')}`} sub="Settled invoices"      color="yellow" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions Card */}
            <div className="card p-6 border border-border/60 bg-surface-card">
              <h2 className="text-lg font-bold text-slate-100 mb-2">Hospital Operations Controls</h2>
              <p className="text-sm text-slate-400 mb-6">Manage staff credentials, department allocations, and provider rosters.</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowDocModal(true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Doctor
                </button>
                <button
                  onClick={() => setShowStaffModal(true)}
                  className="btn bg-surface-elevated hover:bg-surface-border text-slate-200 border border-border flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Staff Member
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="card p-6 border border-border/60 bg-surface-card">
              <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> System Integrity & Services
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border/40 text-sm">
                  <span className="text-slate-300 font-medium">Database Layer</span>
                  <span className="badge badge-success">Mongoose / MongoDB Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border/40 text-sm">
                  <span className="text-slate-300 font-medium">Session Auth</span>
                  <span className="badge badge-info">Express Session Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border/40 text-sm">
                  <span className="text-slate-300 font-medium">Total Appointments Scheduled</span>
                  <span className="font-semibold text-brand-400">{appointments.length} Total</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DOCTORS TAB ────────────────────────────────────────────── */}
      {activeTab === 'doctors' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold text-slate-100">Medical Specialists ({doctors.length})</h2>
            <button
              onClick={() => setShowDocModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Provision New Doctor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doc) => (
              <div key={doc.id || doc._id} className="card p-5 border border-border/60 bg-surface-card flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-100 text-base">{doc.name}</h3>
                    <span className="badge badge-primary">{doc.specialization}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{doc.hospital || 'CarePoint Hospital'}</p>
                  <div className="space-y-1 text-xs text-slate-300">
                    <div><span className="text-slate-400">Experience:</span> {doc.exp} yrs</div>
                    <div><span className="text-slate-400">Fee:</span> ₹{doc.fee}</div>
                    <div><span className="text-slate-400">Username:</span> <code className="text-brand-300">{doc.username || 'auto'}</code></div>
                    <div className="pt-1">
                      <span className="text-slate-400">Assigned Appointing Staff:</span>{' '}
                      {doc.assignedStaffName
                        ? <span className="text-emerald-400 font-semibold">{doc.assignedStaffName}</span>
                        : <span className="text-amber-400 font-semibold">Unassigned</span>}
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/40 mt-4 flex items-center justify-between gap-2">
                  <button
                    onClick={() => { setAssigningDoc(doc); setSelectedStaffForDoc(doc.assignedStaffId || ''); }}
                    className="text-sky-400 hover:text-sky-300 text-xs font-semibold flex items-center gap-1 p-1 hover:bg-sky-500/10 rounded transition"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Assign Staff
                  </button>
                  <button
                    onClick={() => handleDeleteDoctor(doc.id || doc._id)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 p-1 hover:bg-rose-500/10 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STAFF TAB ────────────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold text-slate-100">Hospital Staff ({staff.length})</h2>
            <button
              onClick={() => setShowStaffModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Provision Staff
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Designation / Role</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id || s._id}>
                    <td className="font-semibold text-slate-200">{s.name}</td>
                    <td><span className="badge badge-info">{s.role}</span></td>
                    <td>{s.dept || 'General'}</td>
                    <td>{s.phone || 'N/A'}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteStaff(s.id || s._id)}
                        className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PATIENTS TAB ────────────────────────────────────────────── */}
      {activeTab === 'patients' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold text-slate-100">Patient Directory ({patients.length})</h2>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9"
              />
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Age / Gender</th>
                  <th>Blood Group</th>
                  <th>Phone</th>
                  <th>Registered Username</th>
                </tr>
              </thead>
              <tbody>
                {patients
                  .filter(p => !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((p) => (
                    <tr key={p.id || p._id}>
                      <td><code className="text-brand-400">{p.id}</code></td>
                      <td className="font-semibold text-slate-200">{p.name}</td>
                      <td>{p.age} yrs / {p.gender}</td>
                      <td><span className="badge badge-danger">{p.bloodGroup || 'O+'}</span></td>
                      <td>{p.phone}</td>
                      <td><code className="text-slate-400">{p.username || 'N/A'}</code></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BILLING TAB ────────────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-100">Revenue & Invoicing Audit</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Patient</th>
                  <th>Description</th>
                  <th>Billed Amount</th>
                  <th>Settled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id || inv._id}>
                    <td><code>{inv.id}</code></td>
                    <td className="font-semibold text-slate-200">{inv.patientName}</td>
                    <td>{inv.description}</td>
                    <td>₹{inv.amount}</td>
                    <td className="text-emerald-400 font-semibold">₹{inv.paidAmount || 0}</td>
                    <td>
                      <span className={`badge ${inv.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── INVENTORY TAB ────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-100">Medical Supplies & Pharmacy Inventory</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Stock Quantity</th>
                  <th>Unit</th>
                  <th>Unit Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id || item._id}>
                    <td className="font-semibold text-slate-200">{item.name}</td>
                    <td><span className="badge badge-info">{item.category}</span></td>
                    <td className="font-bold text-slate-100">{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>₹{item.price}</td>
                    <td>
                      <span className={`badge ${item.quantity > 20 ? 'badge-success' : 'badge-danger'}`}>
                        {item.status || (item.quantity > 20 ? 'In Stock' : 'Low Stock')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── HELPDESK / CONTACT MESSAGES TAB ────────────────────── */}
      {activeTab === 'helpdesk' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Helpdesk Tickets ({contactMessages.length})</h2>
              <p className="text-xs text-slate-400 mt-0.5">{openTickets} open ticket{openTickets !== 1 ? 's' : ''} awaiting admin response</p>
            </div>
            <button onClick={loadData} className="btn bg-surface-elevated text-slate-200 border border-border text-xs">🔄 Refresh</button>
          </div>

          {contactMessages.length === 0 ? (
            <div className="card p-10 text-center text-slate-400 text-sm">No support tickets found.</div>
          ) : (
            <div className="space-y-3">
              {contactMessages.map((msg) => (
                <div key={msg.id} className={`card p-5 border flex flex-col gap-3 ${
                  msg.status === 'Open' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/60 bg-surface-card'
                }`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-sm">{msg.subject}</span>
                        <span className={`badge text-[10px] ${
                          msg.priority === 'Urgent' ? 'badge-danger' :
                          msg.priority === 'High' ? 'badge-warning' : 'badge-info'
                        }`}>{msg.priority}</span>
                        <span className={`badge text-[10px] ${msg.status === 'Open' ? 'badge-warning' : 'badge-success'}`}>{msg.status}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        From: <strong className="text-slate-300">{msg.name}</strong>
                        {' '}({msg.role}) · {msg.email}
                        {msg.phone ? ` · ${msg.phone}` : ''}
                        {' '} · <span className="text-slate-500 font-mono">{msg.id}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(msg.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-800/60 rounded-lg p-3 leading-relaxed">{msg.message}</p>
                  {msg.response && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-300">
                      <strong>Admin Response:</strong> {msg.response}
                    </div>
                  )}
                  {msg.status === 'Open' && (
                    <button
                      onClick={() => { setResolvingTicket(msg); setResolveResponse(''); }}
                      className="btn btn-primary text-xs w-fit"
                    >
                      ✅ Respond & Resolve Ticket
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ADD DOCTOR MODAL ────────────────────────────────────────── */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full bg-surface-card border border-border">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Provision New Doctor Profile</h3>
            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Verma"
                  value={docForm.name}
                  onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Specialization</label>
                  <select
                    value={docForm.specialization}
                    onChange={(e) => setDocForm({ ...docForm, specialization: e.target.value })}
                    className="input"
                  >
                    {['Cardiology','Pediatrics','Orthopedics','Neurology','Dermatology','Dentistry','General Medicine','Psychiatry','ENT','Ophthalmology'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Fee (₹)</label>
                  <input
                    type="number"
                    value={docForm.fee}
                    onChange={(e) => setDocForm({ ...docForm, fee: Number(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Experience (Years)</label>
                  <input
                    type="number"
                    value={docForm.exp}
                    onChange={(e) => setDocForm({ ...docForm, exp: Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={docForm.phone}
                    onChange={(e) => setDocForm({ ...docForm, phone: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Portal Username (Login ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. dr.rajesh"
                    value={docForm.username}
                    onChange={(e) => setDocForm({ ...docForm, username: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Portal Password</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Doctor@Pass123"
                    value={docForm.password}
                    onChange={(e) => setDocForm({ ...docForm, password: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="btn bg-surface-elevated text-slate-300 hover:bg-surface-border"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD STAFF MODAL ────────────────────────────────────────── */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full bg-surface-card border border-border">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Provision Hospital Staff</h3>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="label">Staff Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Sen"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Role</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="input"
                  >
                    <option value="Nurse">Nurse</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Lab Technician">Lab Technician</option>
                    <option value="Pharmacist">Pharmacist</option>
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <input
                    type="text"
                    value={staffForm.dept}
                    onChange={(e) => setStaffForm({ ...staffForm, dept: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98765 00000"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Portal Username (Login ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. nurse.ananya"
                    value={staffForm.username}
                    onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Portal Password</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Staff@Pass123"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="btn bg-surface-elevated text-slate-300 hover:bg-surface-border"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN STAFF TO DOCTOR MODAL ────────────────────────── */}
      {assigningDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full bg-surface-card border border-border">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Assign Appointing Staff</h3>
            <p className="text-xs text-slate-400 mb-4">
              Select which staff member will handle appointment confirmations, QR scanning, and fee collection for <strong className="text-sky-300">{assigningDoc.name}</strong>
            </p>
            <div className="mb-4">
              <label className="label">Appointing Staff Member</label>
              <select
                value={selectedStaffForDoc}
                onChange={(e) => setSelectedStaffForDoc(e.target.value)}
                className="input"
              >
                <option value="">-- Select Staff --</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role || s.dept})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssigningDoc(null)}
                className="btn bg-surface-elevated text-slate-300 hover:bg-surface-border"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssignStaff(assigningDoc.id)}
                className="btn btn-primary"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESOLVE HELPDESK TICKET MODAL ───────────────────────── */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full bg-surface-card border border-border">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Resolve Support Ticket</h3>
            <p className="text-xs text-slate-400 mb-1">Ticket: <span className="text-sky-400 font-mono">{resolvingTicket.id}</span></p>
            <p className="text-xs text-slate-300 font-semibold mb-3">{resolvingTicket.subject}</p>
            <div className="mb-4">
              <label className="label">Admin Response / Resolution Note</label>
              <textarea
                rows={4}
                value={resolveResponse}
                onChange={(e) => setResolveResponse(e.target.value)}
                placeholder="Type your response to the patient/staff here…"
                className="input resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setResolvingTicket(null)}
                className="btn bg-surface-elevated text-slate-300 hover:bg-surface-border"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveTicket(resolvingTicket.id)}
                className="btn btn-primary"
              >
                ✅ Mark Resolved & Notify
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
