import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import { getStaffDashboard, confirmAppointment, rejectAppointment, updateApptStatus, verifyQR, collectAppointmentPayment, markAppointmentAttendance } from '../api/api';
import toast from 'react-hot-toast';
import { Calendar, Package, TestTube, Bed, QrCode, CheckCircle, XCircle, CreditCard, Camera, CameraOff, UserCheck } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const NAV = [
  { id:'overview',     label:'Overview',       icon: ({ size }) => <span style={{fontSize:size-2}}>🏠</span> },
  { id:'appointments', label:'Appointments',   icon: Calendar },
  { id:'qr-checkin',   label:'QR Check-in',    icon: QrCode },
  { id:'wards',        label:'Ward Beds',       icon: Bed },
  { id:'labs',         label:'Lab Orders',      icon: TestTube },
  { id:'inventory',    label:'Inventory',       icon: Package },
];

const STATUS_BADGE = {
  'Scheduled':'badge-blue','Confirmed':'badge-green','Checked In':'badge-green',
  'Completed':'badge-purple','Cancelled':'badge-red','Pending Confirmation':'badge-yellow','In Consultation':'badge-yellow',
};

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [qrToken, setQrToken]     = useState('');
  const [qrResult, setQrResult]   = useState(null);

  const load = useCallback(async () => {
    try { const r = await getStaffDashboard(); setData(r.data); }
    catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleConfirm(id) {
    try { await confirmAppointment(id); toast.success('🎉 Appointment confirmed & QR Pass generated for patient!'); await load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to confirm'); }
  }
  async function handleReject(id) {
    const reason = window.prompt('Optional: Reason for cancellation (leave blank for default):');
    try { await rejectAppointment(id, { reason: reason || undefined }); toast.success('Appointment cancelled and patient notified.'); await load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to cancel'); }
  }
  async function handleCollectFee(appt) {
    const method = window.prompt(`Collect consultation fee of ₹${appt.fee || 800} for ${appt.patientName}?\nEnter payment method (Cash / UPI / Card):`, 'Cash / UPI');
    if (method === null) return; // User pressed Cancel
    try {
      const res = await collectAppointmentPayment(appt.id, { amount: appt.fee || 800, paymentMethod: method || 'Cash / UPI' });
      toast.success(res.data.message || `Fee of ₹${appt.fee || 800} collected successfully!`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fee collection failed');
    }
  }
  async function handleMarkAttendance(id) {
    try {
      const res = await markAppointmentAttendance(id);
      toast.success(res.data?.message || '✅ Attendance marked present for scheduled slot!');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to mark attendance. Check assigned doctor staff & appointment time window.');
    }
  }
  async function handleQR(e) {
    e.preventDefault();
    try {
      const r = await verifyQR({ token: qrToken });
      setQrResult({ success: true, message: r.data.message, appt: r.data.appointment });
      toast.success('Patient checked in!');
      await load();
    } catch (err) {
      setQrResult({ success: false, message: err.response?.data?.error || 'Invalid QR code' });
      toast.error('QR verification failed');
    }
  }

  // ── Camera QR Scanner ──────────────────────────────────────────
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError]   = useState('');
  const scannerRef = useRef(null);

  async function startCamera() {
    setCameraError('');
    setQrResult(null);
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopCamera();
          const token = decodedText.trim();
          setQrToken(token);
          try {
            const r = await verifyQR({ token });
            setQrResult({ success: true, message: r.data.message, appt: r.data.appointment });
            toast.success('✅ Patient checked in via camera scan!');
            await load();
          } catch (err) {
            setQrResult({ success: false, message: err.response?.data?.error || 'Invalid QR code' });
            toast.error('QR verification failed');
          }
        },
        () => {}
      );
      setCameraActive(true);
    } catch {
      setCameraError('Camera access denied or unavailable. Please grant permission and retry.');
      toast.error('Could not access camera');
    }
  }

  async function stopCamera() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setCameraActive(false);
  }

  useEffect(() => {
    return () => { if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); } };
  }, []);

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand-900 border-t-brand-500 rounded-full animate-spin" /></div>;

  const appts = data?.appointments || [];
  const wards = data?.wards        || [];
  const labs  = data?.labs         || [];
  const inv   = data?.inventory    || [];
  const today = new Date().toISOString().split('T')[0];
  const pending = appts.filter(a => a.status === 'Pending Confirmation');

  return (
    <DashboardLayout title="Staff Desk" navItems={NAV} activeTab={activeTab} setActiveTab={setActiveTab}>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-slide-up">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="📋" label="Total Appointments" value={appts.length}  color="blue" />
            <StatCard icon="⏳" label="Pending Confirm"   value={pending.length} color="yellow" />
            <StatCard icon="🛏️" label="Occupied Beds"    value={wards.length}   color="red" />
            <StatCard icon="📦" label="Inventory Items"   value={inv.length}     color="green" />
          </div>

          {/* Pending Appointments */}
          {pending.length > 0 && (
            <div className="card border-amber-500/30 bg-amber-900/5">
              <h3 className="font-semibold text-amber-300 mb-4">⏳ Pending Confirmation ({pending.length})</h3>
              <div className="space-y-3">
                {pending.map(a => (
                  <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface rounded-xl border border-amber-500/20">
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">{a.patientName}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{a.doctorName} · {a.date} at <strong className="text-sky-300">{a.time}</strong></div>
                      {a.reason && <div className="text-xs text-slate-500 mt-0.5">Reason: {a.reason}</div>}
                      <div className="text-xs text-emerald-400 mt-0.5 font-semibold">Fee: ₹{a.fee || 800}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleConfirm(a.id)} className="btn-success text-xs py-1.5 px-3 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Confirm & Gen QR
                      </button>
                      <button onClick={() => handleReject(a.id)} className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">📅 Today's Appointments</h3>
            {appts.filter(a=>a.date===today).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No appointments today.</p>
            ) : (
              <div className="space-y-3">
                {appts.filter(a=>a.date===today).map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-surface-border">
                    <div>
                      <div className="font-medium text-white text-sm">{a.patientName}</div>
                      <div className="text-xs text-slate-400">{a.doctorName} · {a.time}</div>
                    </div>
                    <span className={STATUS_BADGE[a.status]||'badge-blue'}>{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-6 animate-slide-up">
          <h2 className="text-xl font-bold text-white">📅 All Appointments</h2>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-surface-border">
                <th className="table-header">Patient</th><th className="table-header">Doctor</th>
                <th className="table-header">Date & Time</th>
                <th className="table-header">Fee</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr></thead>
              <tbody>
                {appts.slice().reverse().map(a => (
                  <tr key={a.id} className="table-row">
                    <td className="table-cell font-medium text-white">{a.patientName}</td>
                    <td className="table-cell text-slate-400">{a.doctorName}</td>
                    <td className="table-cell text-slate-400">{a.date} {a.time}</td>
                    <td className="table-cell">
                      <span className="text-emerald-400 font-semibold text-xs">₹{a.fee || 800}</span>
                      {a.paymentStatus === 'Paid' && (
                        <span className="ml-1.5 text-[10px] text-emerald-500 font-bold">✔ Paid</span>
                      )}
                    </td>
                    <td className="table-cell"><span className={STATUS_BADGE[a.status]||'badge-blue'}>{a.status}</span></td>
                    <td className="table-cell">
                      {a.status === 'Pending Confirmation' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleConfirm(a.id)} className="btn-success text-xs py-1 px-2">Confirm</button>
                          <button onClick={() => handleReject(a.id)} className="btn-danger text-xs py-1 px-2">Reject</button>
                        </div>
                      )}
                      {['Confirmed', 'Scheduled'].includes(a.status) && a.attendanceStatus !== 'Checked In' && (
                        <button
                          onClick={() => handleMarkAttendance(a.id)}
                          className="flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs py-1.5 px-2.5 rounded-lg font-bold shadow-sm transition-all"
                          title="Mark patient attendance at scheduled slot time"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Mark Attendance
                        </button>
                      )}
                      {a.attendanceStatus === 'Checked In' && a.status !== 'Completed' && (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-400" /> Present ({a.checkedInAt || 'Checked In'})
                        </span>
                      )}
                      {a.status === 'Completed' && a.paymentStatus !== 'Paid' && (
                        <button
                          onClick={() => handleCollectFee(a)}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1.5 px-3 rounded-lg font-bold transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Collect ₹{a.fee || 800}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR CHECK-IN */}
      {activeTab === 'qr-checkin' && (
        <div className="space-y-6 animate-slide-up max-w-xl">
          <h2 className="text-xl font-bold text-white">📲 QR Code Check-in</h2>

          {/* Camera Viewfinder */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-sm">Camera Scanner</h3>
                <p className="text-xs text-slate-400">Point camera at patient's QR code to auto-verify</p>
              </div>
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg transition-all"
                >
                  <Camera className="w-4 h-4" /> Open Camera &amp; Scan
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all"
                >
                  <CameraOff className="w-4 h-4" /> Stop Camera
                </button>
              )}
            </div>

            {/* The html5-qrcode element mounts here */}
            <div
              id="qr-reader"
              className={`w-full rounded-xl overflow-hidden border-2 ${cameraActive ? 'border-cyan-500/50' : 'border-surface-border hidden'}`}
            />

            {cameraError && (
              <div className="p-3 rounded-xl bg-red-900/20 border border-red-500/30 text-xs text-red-300">
                ⚠️ {cameraError}
              </div>
            )}
          </div>

          {/* Manual input fallback */}
          <div className="card">
            <h3 className="font-semibold text-white text-sm mb-3">Manual Token Entry</h3>
            <form onSubmit={handleQR} className="space-y-3">
              <div>
                <label className="label">Appointment ID or QR Token</label>
                <input
                  className="input font-mono"
                  value={qrToken}
                  onChange={e => setQrToken(e.target.value)}
                  placeholder="APT-101 or QR-APT-101-XXXXX"
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">
                🔍 Verify &amp; Check In
              </button>
            </form>
          </div>

          {/* Result card */}
          {qrResult && (
            <div className={`p-4 rounded-xl border ${qrResult.success ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
              <div className={`font-semibold text-sm ${qrResult.success ? 'text-emerald-300' : 'text-red-300'}`}>
                {qrResult.success ? '✅' : '❌'} {qrResult.message}
              </div>
              {qrResult.appt && (
                <div className="mt-3 text-xs text-slate-400 space-y-1.5 border-t border-surface-border pt-3">
                  <div>Patient: <span className="text-white font-semibold">{qrResult.appt.patientName}</span></div>
                  <div>Doctor: <span className="text-white">{qrResult.appt.doctorName}</span></div>
                  <div>Time: <span className="text-white">{qrResult.appt.time}</span></div>
                  <div>Checked in at: <span className="text-emerald-400 font-semibold">{qrResult.appt.checkedInAt}</span></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}


      {/* WARDS */}
      {activeTab === 'wards' && (
        <div className="space-y-6 animate-slide-up">
          <h2 className="text-xl font-bold text-white">🛏️ Ward Bed Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wards.map(w => (
              <div key={w.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="badge-purple">🛏 {w.bedCode}</span>
                  <span className={w.status==='Admitted'?'badge-red':'badge-green'}>{w.status}</span>
                </div>
                <div className="font-semibold text-white">{w.patientName}</div>
                <div className="text-sm text-slate-400">{w.ward}</div>
                <div className="text-xs text-slate-500 mt-2">Dr. {w.doctorName} · Admitted: {w.admittedAt}</div>
                <div className="text-xs text-slate-400 mt-1">Diagnosis: {w.diagnosis}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LABS */}
      {activeTab === 'labs' && (
        <div className="space-y-6 animate-slide-up">
          <h2 className="text-xl font-bold text-white">🧪 Lab Orders</h2>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-surface-border">
                <th className="table-header">Patient</th><th className="table-header">Test</th>
                <th className="table-header">Doctor</th><th className="table-header">Date</th>
                <th className="table-header">Status</th><th className="table-header">Result</th>
              </tr></thead>
              <tbody>
                {labs.map(l => (
                  <tr key={l.id} className="table-row">
                    <td className="table-cell font-medium text-white">{l.patientName}</td>
                    <td className="table-cell text-slate-300">{l.testName}</td>
                    <td className="table-cell text-slate-400">{l.doctorName}</td>
                    <td className="table-cell text-slate-400">{l.date}</td>
                    <td className="table-cell"><span className={l.status==='Completed'?'badge-green':'badge-yellow'}>{l.status}</span></td>
                    <td className="table-cell text-slate-300 text-xs">{l.result||'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-slide-up">
          <h2 className="text-xl font-bold text-white">📦 Inventory</h2>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-surface-border">
                <th className="table-header">Item</th><th className="table-header">Category</th>
                <th className="table-header">Qty</th><th className="table-header">Unit</th>
                <th className="table-header">Price</th><th className="table-header">Status</th>
              </tr></thead>
              <tbody>
                {inv.map(i => (
                  <tr key={i.id} className="table-row">
                    <td className="table-cell font-medium text-white">{i.name}</td>
                    <td className="table-cell text-slate-400">{i.category}</td>
                    <td className="table-cell text-slate-300">{i.quantity}</td>
                    <td className="table-cell text-slate-400">{i.unit}</td>
                    <td className="table-cell text-slate-300">₹{i.price}</td>
                    <td className="table-cell"><span className={i.status==='In Stock'?'badge-green':'badge-red'}>{i.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
