import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import { getDoctorDashboard, updateApptStatus, createPrescription } from '../api/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Calendar, FileText, Users, Bed, CheckCircle, Clock, XCircle } from 'lucide-react';

const NAV = [
  { id:'overview',      label:'Overview',       icon: ({ size }) => <span style={{fontSize:size-2}}>🏠</span> },
  { id:'appointments',  label:'My Appointments', icon: Calendar },
  { id:'prescribe',     label:'Write Rx',        icon: FileText },
  { id:'patients',      label:'My Patients',     icon: Users },
  { id:'wards',         label:'Ward Admissions', icon: Bed },
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

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [rxForm, setRxForm]       = useState({
    appointmentId:'', patientName:'', patientId:'', diagnosis:'', symptoms:'',
    medicines:[{ name:'', dosage:'', frequency:'', duration:'', instructions:'' }],
    tests:'', instructions:'', followUpDate:''
  });

  const load = useCallback(async () => {
    try { const r = await getDoctorDashboard(); setData(r.data); }
    catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(id, status) {
    try {
      await updateApptStatus(id, status);
      toast.success(`Status updated to "${status}"`);
      await load();
    } catch { toast.error('Failed to update status'); }
  }

  async function handlePrescribe(e) {
    e.preventDefault();
    try {
      const tests = rxForm.tests ? rxForm.tests.split(',').map(t=>t.trim()) : [];
      await createPrescription({
        ...rxForm, tests,
        doctorName: user?.displayName,
      });
      toast.success('Prescription created! 💊');
      setRxForm({ appointmentId:'', patientName:'', patientId:'', diagnosis:'', symptoms:'', medicines:[{ name:'', dosage:'', frequency:'', duration:'', instructions:'' }], tests:'', instructions:'', followUpDate:'' });
      await load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create prescription'); }
  }

  function addMedicine() { setRxForm(p => ({ ...p, medicines:[...p.medicines, { name:'', dosage:'', frequency:'', duration:'', instructions:'' }] })); }
  function updateMed(i, k, v) { setRxForm(p => { const m=[...p.medicines]; m[i]={...m[i],[k]:v}; return {...p,medicines:m}; }); }
  function removeMed(i) { setRxForm(p => ({ ...p, medicines:p.medicines.filter((_,idx)=>idx!==i) })); }

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand-900 border-t-brand-500 rounded-full animate-spin" /></div>;

  const appts  = data?.appointments  || [];
  const pats   = data?.patients      || [];
  const wards  = data?.wards         || [];
  const rxs    = data?.prescriptions || [];
  const today  = new Date().toISOString().split('T')[0];
  const todayAppts = appts.filter(a => a.date === today);

  return (
    <DashboardLayout title="Doctor Console" navItems={NAV} activeTab={activeTab} setActiveTab={setActiveTab}>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-slide-up">
          <div>
            <h2 className="text-xl font-bold text-white">Good morning, {user?.displayName}! 👨‍⚕️</h2>
            <p className="text-slate-400 text-sm mt-1">{user?.specialization} · {new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📅" label="Today's Appointments" value={todayAppts.length} color="blue" />
            <StatCard icon="✅" label="Completed Today"      value={todayAppts.filter(a=>a.status==='Completed').length} color="green" />
            <StatCard icon="🛏️" label="Ward Patients"       value={wards.length}   color="yellow" />
            <StatCard icon="💊" label="Prescriptions"        value={rxs.length}    color="purple" />
          </div>

          <div className="card">
            <h3 className="font-semibold text-white mb-4">📅 Today's Schedule</h3>
            {todayAppts.length === 0 ? (
              <div className="text-center py-8"><div className="text-4xl mb-3">📋</div><p className="text-slate-400 text-sm">No appointments today.</p></div>
            ) : (
              <div className="space-y-3">
                {todayAppts.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-3 p-3 bg-surface rounded-xl border border-surface-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-brand-600/20 rounded-xl flex items-center justify-center text-brand-400 font-bold text-sm">{a.time?.split(':')[0]}</div>
                      <div>
                        <div className="font-medium text-white text-sm">{a.patientName}</div>
                        <div className="text-xs text-slate-400">{a.time} · {a.reason}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={STATUS_BADGE[a.status]||'badge-blue'}>{a.status}</span>
                      {a.status !== 'Completed' && a.status !== 'Cancelled' && (
                        <div className="flex gap-1">
                          <button onClick={()=>handleStatusChange(a.id,'In Consultation')} className="w-7 h-7 rounded-lg bg-brand-600/20 hover:bg-brand-600 text-brand-400 hover:text-white transition-all flex items-center justify-center" title="In Consultation"><Clock size={13}/></button>
                          <button onClick={()=>handleStatusChange(a.id,'Completed')} className="w-7 h-7 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-all flex items-center justify-center" title="Complete"><CheckCircle size={13}/></button>
                          <button onClick={()=>handleStatusChange(a.id,'Cancelled')} className="w-7 h-7 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition-all flex items-center justify-center" title="Cancel"><XCircle size={13}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ALL APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-6 animate-slide-up">
          <h2 className="text-xl font-bold text-white">📅 All Appointments</h2>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-surface-border">
                <th className="table-header">Patient</th><th className="table-header">Date</th>
                <th className="table-header">Time</th><th className="table-header">Reason</th>
                <th className="table-header">Status</th><th className="table-header">Actions</th>
              </tr></thead>
              <tbody>
                {appts.slice().reverse().map(a => (
                  <tr key={a.id} className="table-row">
                    <td className="table-cell font-medium text-white">{a.patientName}</td>
                    <td className="table-cell text-slate-400">{a.date}</td>
                    <td className="table-cell text-slate-400">{a.time}</td>
                    <td className="table-cell text-slate-400 max-w-xs truncate">{a.reason}</td>
                    <td className="table-cell"><span className={STATUS_BADGE[a.status]||'badge-blue'}>{a.status}</span></td>
                    <td className="table-cell">
                      {a.status !== 'Completed' && a.status !== 'Cancelled' && (
                        <div className="flex gap-1">
                          <button onClick={()=>handleStatusChange(a.id,'Completed')} className="btn-success text-xs py-1 px-2">✅ Done</button>
                          <button onClick={()=>handleStatusChange(a.id,'Cancelled')} className="btn-danger text-xs py-1 px-2">❌ Cancel</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRESCRIBE */}
      {activeTab === 'prescribe' && (
        <div className="space-y-6 animate-slide-up max-w-2xl">
          <h2 className="text-xl font-bold text-white">💊 Write Prescription</h2>
          <form onSubmit={handlePrescribe} className="card space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Patient Name *</label>
                <input className="input" value={rxForm.patientName} onChange={e=>setRxForm(p=>({...p,patientName:e.target.value}))} required placeholder="Patient name" />
              </div>
              <div>
                <label className="label">Appointment ID</label>
                <select className="input" value={rxForm.appointmentId} onChange={e=>{
                  const a=appts.find(a=>a.id===e.target.value);
                  setRxForm(p=>({...p,appointmentId:e.target.value,patientName:a?.patientName||p.patientName,patientId:a?.patientId||''}));
                }}>
                  <option value="">— Select appointment —</option>
                  {appts.filter(a=>a.status!=='Cancelled').map(a=><option key={a.id} value={a.id}>{a.id} – {a.patientName} ({a.date})</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Diagnosis *</label>
              <input className="input" value={rxForm.diagnosis} onChange={e=>setRxForm(p=>({...p,diagnosis:e.target.value}))} required placeholder="Primary diagnosis" />
            </div>
            <div>
              <label className="label">Symptoms</label>
              <input className="input" value={rxForm.symptoms} onChange={e=>setRxForm(p=>({...p,symptoms:e.target.value}))} placeholder="Patient reported symptoms" />
            </div>

            {/* Medicines */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="label mb-0">Medicines</label>
                <button type="button" onClick={addMedicine} className="btn-secondary text-xs py-1 px-3">+ Add</button>
              </div>
              <div className="space-y-3">
                {rxForm.medicines.map((m,i) => (
                  <div key={i} className="bg-surface p-3 rounded-xl border border-surface-border grid grid-cols-2 gap-3">
                    <input className="input text-sm col-span-2" placeholder="Medicine name" value={m.name} onChange={e=>updateMed(i,'name',e.target.value)} />
                    <input className="input text-sm" placeholder="Dosage (e.g. 1 Tab)" value={m.dosage} onChange={e=>updateMed(i,'dosage',e.target.value)} />
                    <input className="input text-sm" placeholder="Frequency" value={m.frequency} onChange={e=>updateMed(i,'frequency',e.target.value)} />
                    <input className="input text-sm" placeholder="Duration" value={m.duration} onChange={e=>updateMed(i,'duration',e.target.value)} />
                    <div className="flex gap-2">
                      <input className="input text-sm flex-1" placeholder="Notes" value={m.instructions} onChange={e=>updateMed(i,'instructions',e.target.value)} />
                      {rxForm.medicines.length > 1 && <button type="button" onClick={()=>removeMed(i)} className="text-red-400 hover:text-red-300 px-2">✕</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Lab Tests (comma separated)</label>
              <input className="input" value={rxForm.tests} onChange={e=>setRxForm(p=>({...p,tests:e.target.value}))} placeholder="CBC, LFT, X-Ray Chest…" />
            </div>
            <div>
              <label className="label">Instructions</label>
              <textarea className="input resize-none" rows={2} value={rxForm.instructions} onChange={e=>setRxForm(p=>({...p,instructions:e.target.value}))} placeholder="General advice…" />
            </div>
            <div>
              <label className="label">Follow-up Date</label>
              <input className="input" value={rxForm.followUpDate} onChange={e=>setRxForm(p=>({...p,followUpDate:e.target.value}))} placeholder="e.g. In 7 days or 2026-10-15" />
            </div>
            <button type="submit" className="btn-primary">💊 Save Prescription</button>
          </form>
        </div>
      )}

      {/* PATIENTS */}
      {activeTab === 'patients' && (
        <div className="space-y-6 animate-slide-up">
          <h2 className="text-xl font-bold text-white">👥 My Patients</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pats.map(p => (
              <div key={p.id} className="card-hover">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-brand-600 rounded-xl flex items-center justify-center text-white font-bold">{p.name?.charAt(0)}</div>
                  <div>
                    <div className="font-semibold text-white text-sm">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.id}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[['Age',p.age],['Gender',p.gender],['Blood',p.bloodGroup],['Phone',p.phone]].map(([k,v])=>(
                    <div key={k}><span className="text-slate-500">{k}: </span><span className="text-slate-300">{v||'–'}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WARDS */}
      {activeTab === 'wards' && (
        <div className="space-y-6 animate-slide-up">
          <h2 className="text-xl font-bold text-white">🛏️ Ward Admissions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wards.map(w => (
              <div key={w.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <span className="badge-purple text-sm">🛏 {w.bedCode}</span>
                  <span className="badge-green">{w.status}</span>
                </div>
                <div className="font-semibold text-white">{w.patientName}</div>
                <div className="text-sm text-slate-400">{w.ward}</div>
                <div className="text-xs text-slate-500 mt-2">Diagnosis: {w.diagnosis}</div>
                <div className="text-xs text-slate-500">Admitted: {w.admittedAt}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
