import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import { getPortal, bookPortalAppointment, getDoctors, getNotifications, markNotifRead, getPrescriptions, submitFeedback } from '../api/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Calendar, FileText, TestTube, CreditCard, Star, Bell, Stethoscope, Search } from 'lucide-react';

const NAV = [
  { id:'overview',      label:'Overview',       icon: ({ size }) => <span style={{fontSize: size-2}}>🏠</span> },
  { id:'appointments',  label:'Appointments',   icon: Calendar },
  { id:'prescriptions', label:'Prescriptions',  icon: FileText },
  { id:'labs',          label:'Lab Reports',    icon: TestTube },
  { id:'billing',       label:'Billing',        icon: CreditCard },
  { id:'doctors',       label:'Find Doctors',   icon: Stethoscope },
  { id:'feedback',      label:'Feedback',       icon: Star },
  { id:'notifications', label:'Notifications',  icon: Bell },
];

const STATUS_BADGE = {
  'Scheduled':            'badge-blue',
  'Confirmed':            'badge-green',
  'Checked In':           'badge-green',
  'Completed':            'badge-purple',
  'Cancelled':            'badge-red',
  'Pending Confirmation': 'badge-yellow',
  'In Consultation':      'badge-yellow',
};

export default function PatientDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData]           = useState(null);
  const [doctors, setDoctors]     = useState([]);
  const [notifs, setNotifs]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [bookForm, setBookForm]   = useState({ doctorName:'', dept:'', date:'', time:'10:00 AM', reason:'' });
  const [feedbackForm, setFeedbackForm] = useState({ doctorId:'', doctorName:'', rating:5, comment:'', appointmentId:'' });
  const [doctorSearch, setDoctorSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, d, n] = await Promise.all([getPortal(), getDoctors(), getNotifications()]);
      setData(p.data);
      setDoctors(d.data);
      setNotifs(n.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleBook(e) {
    e.preventDefault();
    try {
      await bookPortalAppointment({ ...bookForm, patientName: user?.displayName });
      toast.success('Appointment booked! ✅');
      setBookForm({ doctorName:'', dept:'', date:'', time:'10:00 AM', reason:'' });
      await load();
      setActiveTab('appointments');
    } catch (err) { toast.error(err.response?.data?.error || 'Booking failed'); }
  }

  async function handleFeedback(e) {
    e.preventDefault();
    try {
      await submitFeedback(feedbackForm);
      toast.success('Feedback submitted! ⭐');
      setFeedbackForm({ doctorId:'', doctorName:'', rating:5, comment:'', appointmentId:'' });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to submit feedback'); }
  }

  async function handleMarkRead(id) {
    await markNotifRead(id);
    setNotifs(p => p.map(n => n.id === id ? {...n, isRead:true} : n));
  }

  const filteredDoctors = doctors.filter(d =>
    !doctorSearch ||
    d.name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    d.specialization?.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-900 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );

  const appts = data?.appointments || [];
  const rxs   = data?.prescriptions || [];
  const labs  = data?.labs || [];
  const invoices = data?.invoices || [];
  const patient  = data?.patient  || {};
  const unread   = notifs.filter(n => !n.isRead).length;

  return (
    <DashboardLayout title="Patient Portal" navItems={NAV.map(n => n.id==='notifications'?{...n,label:`Notifications${unread?` (${unread})`:''}`,icon:Bell}:n)} activeTab={activeTab} setActiveTab={setActiveTab}>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
              {patient.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Welcome, {patient.name || user?.displayName}!</h2>
              <p className="text-slate-400 text-sm">Patient ID: <span className="text-brand-400 font-mono">{patient.id || '–'}</span>
                {patient.bloodGroup && <> · Blood Group: <span className="text-red-400 font-semibold">{patient.bloodGroup}</span></>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📅" label="Total Appointments" value={appts.length} color="blue" />
            <StatCard icon="💊" label="Prescriptions"      value={rxs.length}  color="purple" />
            <StatCard icon="🧪" label="Lab Reports"        value={labs.length}  color="green" />
            <StatCard icon="🧾" label="Pending Bills"      value={invoices.filter(i=>i.status==='Pending').length} color="yellow" />
          </div>

          {/* Upcoming Appointments */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Recent Appointments</h3>
              <button onClick={()=>setActiveTab('appointments')} className="text-brand-400 text-sm hover:text-brand-300">View all →</button>
            </div>
            {appts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-slate-400 text-sm">No appointments yet.</p>
                <button onClick={()=>setActiveTab('doctors')} className="btn-primary mt-4 text-sm">Book Appointment</button>
              </div>
            ) : (
              <div className="space-y-3">
                {appts.slice(-5).reverse().map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-surface-border">
                    <div>
                      <div className="font-medium text-white text-sm">{a.doctorName}</div>
                      <div className="text-xs text-slate-400">{a.dept} · {a.date} at {a.time}</div>
                    </div>
                    <span className={STATUS_BADGE[a.status] || 'badge-blue'}>{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {unread > 0 && (
            <div className="card border-brand-500/30 bg-brand-900/10">
              <div className="flex items-center gap-2 mb-3">
                <Bell size={16} className="text-brand-400" />
                <h3 className="font-semibold text-brand-300">{unread} New Notification{unread > 1 ? 's' : ''}</h3>
              </div>
              {notifs.filter(n=>!n.isRead).slice(0,3).map(n => (
                <div key={n.id} className="flex items-start justify-between gap-3 py-2 border-b border-surface-border last:border-0">
                  <div>
                    <div className="text-sm font-medium text-white">{n.title}</div>
                    <div className="text-xs text-slate-400">{n.message}</div>
                  </div>
                  <button onClick={()=>handleMarkRead(n.id)} className="text-xs text-brand-400 hover:text-brand-300 flex-shrink-0">Mark read</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-6 animate-slide-up">
          {/* Book form */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">📅 Book Appointment</h3>
            <form onSubmit={handleBook} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Doctor</label>
                <select className="input" value={bookForm.doctorName} onChange={e=>{
                  const d = doctors.find(d=>d.name===e.target.value);
                  setBookForm(p=>({...p, doctorName:e.target.value, dept:d?.specialization||''}));
                }}>
                  <option value="">— Select Doctor —</option>
                  {doctors.map(d => <option key={d.id} value={d.name}>{d.name} ({d.specialization})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={bookForm.date} min={new Date().toISOString().split('T')[0]}
                  onChange={e=>setBookForm(p=>({...p,date:e.target.value}))} required />
              </div>
              <div>
                <label className="label">Time</label>
                <select className="input" value={bookForm.time} onChange={e=>setBookForm(p=>({...p,time:e.target.value}))}>
                  {['09:00 AM','10:00 AM','11:00 AM','12:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM'].map(t=>(
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Reason / Symptoms</label>
                <input className="input" value={bookForm.reason} onChange={e=>setBookForm(p=>({...p,reason:e.target.value}))} placeholder="Brief description of your concern" />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="btn-primary">📅 Book Appointment</button>
              </div>
            </form>
          </div>

          {/* List */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">My Appointments</h3>
            {appts.length === 0 ? <p className="text-slate-400 text-sm text-center py-6">No appointments found.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-surface-border">
                    <th className="table-header">Doctor</th><th className="table-header">Dept</th>
                    <th className="table-header">Date & Time</th><th className="table-header">Status</th>
                    <th className="table-header">QR</th>
                  </tr></thead>
                  <tbody>
                    {appts.slice().reverse().map(a => (
                      <tr key={a.id} className="table-row">
                        <td className="table-cell font-medium text-white">{a.doctorName}</td>
                        <td className="table-cell text-slate-400">{a.dept}</td>
                        <td className="table-cell text-slate-400">{a.date} at {a.time}</td>
                        <td className="table-cell"><span className={STATUS_BADGE[a.status]||'badge-blue'}>{a.status}</span></td>
                        <td className="table-cell">
                          {a.qrCode && <img src={a.qrCode} alt="QR" className="w-10 h-10 rounded" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRESCRIPTIONS */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-xl font-bold text-white">💊 My Prescriptions</h2>
          {rxs.length === 0 ? <div className="card text-center py-12"><div className="text-4xl mb-3">💊</div><p className="text-slate-400">No prescriptions yet.</p></div> : (
            rxs.map(rx => (
              <div key={rx.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-semibold text-white">{rx.diagnosis}</div>
                    <div className="text-sm text-slate-400">By {rx.doctorName} · {rx.date}</div>
                  </div>
                  <a href={`/api/prescriptions/${rx.id}/pdf`} target="_blank" rel="noreferrer"
                    className="btn-secondary text-xs py-1.5 px-3">📄 PDF</a>
                </div>
                <div className="space-y-2">
                  {(rx.medicines||[]).map((m,i) => (
                    <div key={i} className="flex items-center gap-3 bg-surface p-3 rounded-xl border border-surface-border">
                      <div className="w-8 h-8 bg-brand-600/20 rounded-lg flex items-center justify-center text-brand-400 font-bold text-xs">{i+1}</div>
                      <div>
                        <div className="text-sm font-medium text-white">{m.name}</div>
                        <div className="text-xs text-slate-400">{m.dosage} · {m.frequency} · {m.duration}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {rx.followUpDate && <p className="text-xs text-brand-400 mt-3">Follow-up: {rx.followUpDate}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* LABS */}
      {activeTab === 'labs' && (
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-xl font-bold text-white">🧪 Lab Reports</h2>
          {labs.length === 0 ? <div className="card text-center py-12"><div className="text-4xl mb-3">🧪</div><p className="text-slate-400">No lab reports found.</p></div> : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-surface-border">
                  <th className="table-header">Test Name</th><th className="table-header">Doctor</th>
                  <th className="table-header">Date</th><th className="table-header">Status</th><th className="table-header">Result</th>
                </tr></thead>
                <tbody>
                  {labs.map(l => (
                    <tr key={l.id} className="table-row">
                      <td className="table-cell font-medium text-white">{l.testName}</td>
                      <td className="table-cell text-slate-400">{l.doctorName}</td>
                      <td className="table-cell text-slate-400">{l.date}</td>
                      <td className="table-cell"><span className={l.status==='Completed'?'badge-green':'badge-yellow'}>{l.status}</span></td>
                      <td className="table-cell text-slate-300">{l.result||'Pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* BILLING */}
      {activeTab === 'billing' && (
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-xl font-bold text-white">🧾 Billing & Invoices</h2>
          {invoices.length === 0 ? <div className="card text-center py-12"><div className="text-4xl mb-3">🧾</div><p className="text-slate-400">No invoices found.</p></div> : (
            invoices.map(inv => (
              <div key={inv.id} className="card flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{inv.description}</div>
                  <div className="text-xs text-slate-400">{inv.id} · {inv.date}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">₹{inv.amount?.toLocaleString('en-IN')}</div>
                  <span className={inv.status==='Paid'?'badge-green':'badge-yellow'}>{inv.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* DOCTORS */}
      {activeTab === 'doctors' && (
        <div className="space-y-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input pl-9" placeholder="Search by name, specialization or symptom…"
                value={doctorSearch} onChange={e=>setDoctorSearch(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDoctors.map(d => (
              <div key={d.id} className="card-hover cursor-default">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold">
                    {d.name?.split(' ').slice(-1)[0]?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{d.name}</div>
                    <div className="badge-blue text-xs mt-1 inline-flex">{d.specialization}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{d.bio}</p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  {d.ratingCount > 0 ? (
                    <span>⭐ {Number(d.rating).toFixed(1)} ({d.ratingCount} review{d.ratingCount > 1 ? 's' : ''})</span>
                  ) : (
                    <span className="text-slate-500 font-mono">No reviews yet</span>
                  )}
                  <span className="font-semibold text-emerald-400">₹{d.fee}</span>
                </div>
                <button onClick={()=>{
                  setBookForm(p=>({...p, doctorName:d.name, dept:d.specialization}));
                  setActiveTab('appointments');
                  toast.success(`${d.name} selected for booking!`);
                }} className="btn-primary w-full justify-center mt-3 text-sm py-2">
                  Book Appointment
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="space-y-6 animate-slide-up">
          <div className="card max-w-lg">
            <h3 className="font-semibold text-white mb-4">⭐ Submit Feedback</h3>
            <form onSubmit={handleFeedback} className="space-y-4">
              <div>
                <label className="label">Doctor</label>
                <select className="input" value={feedbackForm.doctorId} onChange={e=>{
                  const d = doctors.find(d=>d.id===e.target.value);
                  setFeedbackForm(p=>({...p, doctorId:e.target.value, doctorName:d?.name||''}));
                }} required>
                  <option value="">— Select Doctor —</option>
                  {doctors.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Rating</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(r=>(
                    <button key={r} type="button"
                      onClick={()=>setFeedbackForm(p=>({...p,rating:r}))}
                      className={`text-2xl transition-transform hover:scale-110 ${r<=feedbackForm.rating?'':'opacity-30'}`}>⭐</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Comment</label>
                <textarea className="input resize-none" rows={3} value={feedbackForm.comment}
                  onChange={e=>setFeedbackForm(p=>({...p,comment:e.target.value}))} placeholder="Share your experience…" />
              </div>
              <button type="submit" className="btn-primary">Submit Feedback</button>
            </form>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-xl font-bold text-white">🔔 Notifications</h2>
          {notifs.length === 0 ? <div className="card text-center py-12"><div className="text-4xl mb-3">🔔</div><p className="text-slate-400">No notifications.</p></div> : (
            notifs.map(n => (
              <div key={n.id} className={`card flex gap-4 ${!n.isRead?'border-brand-500/30 bg-brand-900/5':''}`}>
                <div className="text-2xl flex-shrink-0">{n.type==='success'?'✅':n.type==='warning'?'⚠️':'ℹ️'}</div>
                <div className="flex-1">
                  <div className="font-medium text-white">{n.title}</div>
                  <div className="text-sm text-slate-400 mt-0.5">{n.message}</div>
                  <div className="text-xs text-slate-600 mt-1">{new Date(n.date).toLocaleString('en-IN')}</div>
                </div>
                {!n.isRead && (
                  <button onClick={()=>handleMarkRead(n.id)} className="text-xs text-brand-400 hover:text-brand-300 flex-shrink-0">✓ Read</button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
