import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAppointments, getAppointmentQR } from '../api/api';
import DashboardLayout from '../components/DashboardLayout';

export default function MyQRPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [fullscreenAppt, setFullscreenAppt] = useState(null);
  const [fullscreenQR, setFullscreenQR] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    fetchActiveAppointments();
  }, [user]);

  const fetchActiveAppointments = async () => {
    setLoading(true);
    try {
      const res = await getAppointments();
      const allAppts = res.data || [];
      // Filter for current user's active, non-completed appointments
      const currentUserName = user?.displayName?.toLowerCase();
      const currentUsername = user?.username?.toLowerCase();
      const currentUserId = user?.id;

      const myActive = allAppts.filter(a => {
        const isMine =
          (a.patientId && currentUserId && a.patientId === currentUserId) ||
          (a.patientUsername && currentUsername && a.patientUsername.toLowerCase() === currentUsername) ||
          (a.patientName && currentUserName && a.patientName.toLowerCase() === currentUserName) ||
          (!user && true); // Fallback for testing

        // Filter out completed and cancelled appointments
        const isActive = a.status !== 'Completed' && a.status !== 'Cancelled';
        return isMine && isActive;
      });

      // Sort by date / time descending
      myActive.sort((a, b) => new Date(b.date + ' ' + (b.time || '10:00 AM')) - new Date(a.date + ' ' + (a.time || '10:00 AM')));
      setAppointments(myActive);
      if (myActive.length > 0) {
        setSelectedAppt(myActive[0]);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQRModal = async (appt) => {
    setFullscreenAppt(appt);
    if (appt.qrCode) {
      setFullscreenQR(appt.qrCode);
    } else {
      setQrLoading(true);
      try {
        const res = await getAppointmentQR(appt.id);
        setFullscreenQR(res.data.qrCode);
      } catch (err) {
        console.error('Failed to load QR code:', err);
      } finally {
        setQrLoading(false);
      }
    }
  };

  const handleDownloadQR = (appt) => {
    const qrSrc = appt.qrCode || fullscreenQR;
    if (!qrSrc) return;
    const link = document.createElement('a');
    link.href = qrSrc;
    link.download = `CarePoint-Pass-${appt.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-blue-900 rounded-3xl p-8 border border-sky-800/40 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold tracking-wider uppercase mb-3">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                Live Patient Check-In Passes
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">My Active QR Passes</h1>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                Show this digital QR pass at the hospital OPD kiosk or reception scanner for instant contactless attendance and chamber queue priority.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchActiveAppointments}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
              >
                🔄 Refresh Passes
              </button>
              <Link
                to="/doctors"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-sky-600/30"
              >
                + Book New Appointment
              </Link>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm font-medium">Loading your active QR check-in passes…</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-5 shadow-xl">
            <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-4xl mx-auto">
              🎫
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No Active QR Passes Found</h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                You do not have any pending or upcoming appointments. Book an appointment with one of our specialists to generate your digital check-in pass.
              </p>
            </div>
            <Link
              to="/doctors"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-bold shadow-lg hover:from-sky-400 hover:to-blue-500 transition-all"
            >
              Browse Doctors & Book Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Active Appointment List */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                Upcoming Consultations ({appointments.length})
              </h2>
              {appointments.map((appt) => {
                const isSelected = selectedAppt?.id === appt.id;
                const isPending = appt.status === 'Pending Confirmation';
                const isCheckedIn = appt.status === 'Checked In';

                return (
                  <div
                    key={appt.id}
                    onClick={() => setSelectedAppt(appt)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 text-left ${
                      isSelected
                        ? 'bg-slate-800/90 border-sky-500/80 shadow-lg shadow-sky-500/10'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-mono text-slate-400">{appt.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isCheckedIn
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isPending
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                        }`}
                      >
                        {isCheckedIn ? 'Checked In' : isPending ? 'Pending Confirmation' : 'Confirmed'}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-sm leading-tight">{appt.doctorName}</h3>
                    <p className="text-sky-400 text-xs mt-0.5">{appt.dept}</p>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium text-slate-300">
                        📅 {appt.date}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-sky-300">
                        ⏰ {appt.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Selected Appointment QR Pass Display */}
            {selectedAppt && (
              <div className="lg:col-span-2">
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative">
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-sky-400 font-bold tracking-wider">
                          PASS REF: {selectedAppt.id}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs text-slate-400">CarePoint OPD Pass</span>
                      </div>
                      <h2 className="text-xl font-extrabold text-white mt-1">
                        {selectedAppt.doctorName}
                      </h2>
                      <p className="text-xs text-sky-300 mt-0.5">
                        {selectedAppt.dept} • {selectedAppt.opdRoom || 'OPD Wing A'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          selectedAppt.status === 'Checked In'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : selectedAppt.status === 'Pending Confirmation'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                        }`}
                      >
                        {selectedAppt.status === 'Checked In'
                          ? '✓ Checked In (In OPD Queue)'
                          : selectedAppt.status === 'Pending Confirmation'
                          ? '⏳ Awaiting Doctor/Staff Approval'
                          : '● Confirmed & Active'}
                      </span>
                    </div>
                  </div>

                  {/* QR Core or Pending Explanation */}
                  <div className="py-8">
                    {selectedAppt.status === 'Pending Confirmation' ? (
                      <div className="max-w-md mx-auto text-center space-y-4 py-8 px-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto text-amber-400 animate-pulse">
                          ⏳
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-amber-300">
                            Appointment Request Under Review
                          </h4>
                          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                            Your appointment with <strong>{selectedAppt.doctorName}</strong> on <strong>{selectedAppt.date}</strong> at <strong>{selectedAppt.time}</strong> is currently waiting for approval from the doctor or their assigned appointing staff (<strong>{selectedAppt.assignedStaffName || 'Rekha Joshi'}</strong>).
                          </p>
                          <p className="text-[11px] text-amber-400/90 mt-3 font-medium bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                            🔒 Per hospital policy, the check-in QR code is generated instantly once accepted by the medical staff.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                        {/* QR Image Box */}
                        <div className="bg-white p-4 rounded-2xl shadow-2xl border-4 border-sky-500/30 flex flex-col items-center group relative">
                          {selectedAppt.qrCode ? (
                            <img
                              src={selectedAppt.qrCode}
                              alt={`QR Pass ${selectedAppt.id}`}
                              className="w-56 h-56 object-contain"
                            />
                          ) : (
                            <div className="w-56 h-56 flex flex-col items-center justify-center bg-slate-100 rounded-xl text-slate-500 text-xs font-semibold gap-2">
                              <span>Generating QR…</span>
                            </div>
                          )}
                          <div className="mt-3 text-center">
                            <span className="text-[10px] font-mono tracking-widest text-slate-600 block uppercase font-bold">
                              {selectedAppt.qrToken || selectedAppt.id}
                            </span>
                          </div>
                        </div>

                        {/* Pass Details */}
                        <div className="space-y-4 max-w-sm text-left">
                          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-3">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                                Patient Name
                              </span>
                              <span className="text-sm font-bold text-white">
                                {selectedAppt.patientName}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/40">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                                  Date & Slot
                                </span>
                                <span className="text-xs font-bold text-sky-300">
                                  {selectedAppt.date}
                                </span>
                                <span className="text-[11px] text-slate-300 block">
                                  {selectedAppt.time}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                                  Consultation Fee
                                </span>
                                <span className="text-xs font-bold text-emerald-400">
                                  ₹{selectedAppt.fee || 800}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {selectedAppt.paymentStatus === 'Paid' ? '✓ Paid' : 'Pay after visit'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-700/40">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                                Appointed Staff Handler
                              </span>
                              <span className="text-xs font-semibold text-slate-200">
                                {selectedAppt.assignedStaffName || 'Rekha Joshi (OPD Reception)'}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleOpenQRModal(selectedAppt)}
                              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all"
                            >
                              🔍 Open Kiosk Pass (Full Screen)
                            </button>
                            <button
                              onClick={() => handleDownloadQR(selectedAppt)}
                              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-colors"
                              title="Download QR"
                            >
                              💾
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Notice */}
                  <div className="mt-6 pt-4 border-t border-slate-800 text-center text-slate-500 text-[11px] flex items-center justify-center gap-2">
                    <span>💡</span>
                    <span>
                      Check-in scan window opens 30 minutes before your appointment time. Please reach OPD chamber 10 minutes prior.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fullscreen / Kiosk QR Modal */}
        {fullscreenAppt && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-center space-y-5 shadow-2xl relative">
              <button
                onClick={() => setFullscreenAppt(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl p-1 rounded-full hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                  CarePoint Kiosk Check-In Pass
                </div>
                <h3 className="text-lg font-extrabold text-white">{fullscreenAppt.doctorName}</h3>
                <p className="text-xs text-sky-400">{fullscreenAppt.dept} • {fullscreenAppt.opdRoom || 'OPD'}</p>
              </div>

              {/* High Contrast QR Code Area */}
              <div className="bg-white p-5 rounded-2xl mx-auto inline-block shadow-inner">
                {qrLoading ? (
                  <div className="w-64 h-64 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : fullscreenQR ? (
                  <img
                    src={fullscreenQR}
                    alt="Kiosk QR"
                    className="w-64 h-64 object-contain"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center text-xs text-slate-400">
                    QR Unavailable
                  </div>
                )}
                <div className="mt-2 text-center">
                  <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                    {fullscreenAppt.qrToken || fullscreenAppt.id}
                  </span>
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-3 text-xs text-left space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Patient:</span>
                  <span className="font-bold text-white">{fullscreenAppt.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Slot:</span>
                  <span className="font-bold text-sky-300">{fullscreenAppt.date} @ {fullscreenAppt.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Appointing Staff:</span>
                  <span className="font-medium text-slate-200">{fullscreenAppt.assignedStaffName || 'Reception Staff'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadQR(fullscreenAppt)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition-colors"
                >
                  💾 Save Pass
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors"
                >
                  🖨️ Print Pass
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
