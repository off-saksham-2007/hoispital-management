import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, User, Search, Plus, CheckCircle2, 
  QrCode, RefreshCw, AlertCircle, Printer, 
  X, Check, Settings, UserCheck, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  getAppointments, createAppointment, confirmAppointment, 
  rejectAppointment, updateApptStatus, getDoctors, getStaff,
  getDoctorAvailableSlots, updateDoctorAvailability, markAppointmentAttendance
} from '../api/api';
import { useAuth } from '../context/AuthContext';

function parseMin(str) {
  if (!str) return 540;
  const m = String(str).trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return 540;
  let hours = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const ampm = m[3] ? m[3].toUpperCase() : null;
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

function fmtMin(m) {
  let hours = Math.floor(m / 60);
  const mins = m % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;
}

function calculateSlotPreview(timings, slotDuration, breakTime) {
  if (!timings || !timings.includes('-')) return [];
  const [t1, t2] = timings.split('-');
  const startMin = parseMin(t1);
  const endMin = parseMin(t2);
  const interval = Number(slotDuration) || 30;
  let bStart = null, bEnd = null;
  if (breakTime && breakTime.includes('-')) {
    const [b1, b2] = breakTime.split('-');
    bStart = parseMin(b1);
    bEnd = parseMin(b2);
  }
  const slots = [];
  for (let m = startMin; m + interval <= endMin; m += interval) {
    if (bStart !== null && bEnd !== null && m >= bStart && m < bEnd) continue;
    slots.push(fmtMin(m));
  }
  return slots;
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Booking Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    patientName: user?.displayName || '',
    phone: user?.phone || '',
    doctorId: '',
    doctorName: '',
    dept: 'General Medicine',
    date: new Date().toISOString().split('T')[0],
    time: '',
    reason: ''
  });

  // Dynamic slots state for booking
  const [doctorSlotsData, setDoctorSlotsData] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // QR Modal
  const [selectedQR, setSelectedQR] = useState(null);

  // Doctor Availability Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    doctorId: '',
    doctorName: '',
    startHour: '09:00 AM',
    endHour: '05:00 PM',
    timings: '09:00 AM - 05:00 PM',
    workingDays: 'Mon - Sat',
    slotDuration: 30,
    breakTime: '01:00 PM - 02:00 PM',
    opdRoom: 'OPD Wing A - Room 102',
    assignedStaffId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      setForm(p => ({
        ...p,
        patientName: user.displayName || user.name || p.patientName,
        phone: user.phone || p.phone
      }));
    }
  }, [user]);

  // Fetch slots whenever doctor or date in booking form changes
  useEffect(() => {
    if (isModalOpen && form.doctorId && form.date) {
      loadDoctorSlots(form.doctorId, form.date);
    }
  }, [isModalOpen, form.doctorId, form.date]);

  async function fetchData() {
    setLoading(true);
    try {
      const [apptRes, docRes, staffRes] = await Promise.all([
        getAppointments(),
        getDoctors(),
        getStaff().catch(() => ({ data: [] }))
      ]);
      setAppointments(apptRes.data || []);
      const docList = docRes.data || [];
      setDoctors(docList);
      setStaffList(staffRes.data || []);

      if (docList.length > 0 && !form.doctorId) {
        setForm(prev => ({
          ...prev,
          doctorId: docList[0].id,
          doctorName: docList[0].name,
          dept: docList[0].specialization
        }));
      }
    } catch {
      toast.error('Failed to load appointments data');
    } finally {
      setLoading(false);
    }
  }

  async function loadDoctorSlots(docId, targetDate) {
    setLoadingSlots(true);
    try {
      const res = await getDoctorAvailableSlots(docId, targetDate);
      setDoctorSlotsData(res.data);
      // Auto-select first available slot if currently selected slot isn't available
      const availableSlots = (res.data?.slots || []).filter(s => s.available);
      if (availableSlots.length > 0) {
        if (!form.time || !availableSlots.some(s => s.time.toLowerCase() === form.time.toLowerCase())) {
          setForm(p => ({ ...p, time: availableSlots[0].time }));
        }
      } else {
        setForm(p => ({ ...p, time: '' }));
      }
    } catch {
      toast.error('Could not fetch doctor schedule');
      setDoctorSlotsData(null);
    } finally {
      setLoadingSlots(false);
    }
  }

  // Find current doctor profile if logged-in user is doctor
  const myDoctorProfile = useMemo(() => {
    if (!doctors.length) return null;
    return doctors.find(d => 
      (d.username && user?.username && d.username.toLowerCase() === user.username.toLowerCase()) ||
      d.id === user?.id ||
      (d.name && user?.displayName && d.name.toLowerCase() === user.displayName.toLowerCase())
    ) || (user?.role === 'doctor' ? doctors[0] : null);
  }, [doctors, user]);

  function openAvailabilitySettings(targetDoc) {
    const doc = targetDoc || myDoctorProfile || doctors[0];
    if (!doc) {
      toast.error('No doctor profile found');
      return;
    }
    const currentTimings = doc.timings || '09:00 AM - 05:00 PM';
    const [startH, endH] = currentTimings.includes('-') 
      ? currentTimings.split('-').map(s => s.trim()) 
      : ['09:00 AM', '05:00 PM'];

    setSettingsForm({
      doctorId: doc.id,
      doctorName: doc.name,
      startHour: startH || '09:00 AM',
      endHour: endH || '05:00 PM',
      timings: currentTimings,
      workingDays: doc.workingDays || 'Mon - Sat',
      slotDuration: doc.slotDuration || 30,
      breakTime: doc.breakTime || '01:00 PM - 02:00 PM',
      opdRoom: doc.opdRoom || 'OPD Wing A - Room 102',
      assignedStaffId: doc.assignedStaffId || ''
    });
    setIsSettingsOpen(true);
  }

  async function handleSaveAvailability(e) {
    e.preventDefault();
    if (!settingsForm.doctorId) return;
    setSavingSettings(true);
    const combinedTimings = `${settingsForm.startHour} - ${settingsForm.endHour}`;
    try {
      const payload = {
        timings: combinedTimings,
        workingDays: settingsForm.workingDays,
        slotDuration: Number(settingsForm.slotDuration),
        breakTime: settingsForm.breakTime,
        opdRoom: settingsForm.opdRoom,
        assignedStaffId: settingsForm.assignedStaffId
      };
      const res = await updateDoctorAvailability(settingsForm.doctorId, payload);
      toast.success(res.data?.message || 'Availability settings updated successfully!');
      
      // Update local doctors state
      setDoctors(prev => prev.map(d => d.id === settingsForm.doctorId ? { ...d, ...payload, timings: combinedTimings } : d));
      setIsSettingsOpen(false);

      // Refresh appointments to ensure synced staff info
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update availability');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.patientName) {
      toast.error('Patient name is required');
      return;
    }
    if (!form.time) {
      toast.error('Please choose an available appointment time slot');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createAppointment(form);
      toast.success('Appointment booked successfully! QR token generated.');
      setAppointments(prev => [res.data, ...prev]);
      setIsModalOpen(false);
      setSelectedQR(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(id) {
    try {
      await confirmAppointment(id);
      toast.success('Appointment confirmed & QR pass issued!');
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Confirmed' } : a));
    } catch {
      toast.error('Failed to confirm appointment');
    }
  }

  async function handleReject(id) {
    try {
      await rejectAppointment(id);
      toast.success('Appointment marked cancelled');
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Cancelled' } : a));
    } catch {
      toast.error('Failed to cancel appointment');
    }
  }

  async function handleCheckIn(id) {
    try {
      await updateApptStatus(id, 'Checked In');
      toast.success('Patient checked in for triage!');
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Checked In', attendanceStatus: 'Checked In' } : a));
    } catch {
      toast.error('Failed to update status');
    }
  }

  // Appointing Staff marks attendance for their assigned doctor's appointment
  async function handleMarkAttendance(id) {
    try {
      const res = await markAppointmentAttendance(id);
      toast.success(res.data?.message || 'Attendance recorded successfully!');
      setAppointments(prev => prev.map(a => a.id === id ? {
        ...a,
        status: 'Checked In',
        attendanceStatus: 'Checked In',
        checkedInAt: res.data?.appointment?.checkedInAt || new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
        scannedBy: res.data?.appointment?.scannedBy || user.displayName
      } : a));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to mark attendance. Check assigned staff and time slot window.');
    }
  }

  const isPatient = user?.role === 'patient';
  const isDoctor = user?.role === 'doctor';
  const isStaff = user?.role === 'staff';
  const isAdmin = user?.role === 'admin';
  const canManageAppointments = ['doctor', 'staff', 'admin'].includes(user?.role);

  // Role-based filter: patients see only their own appointments
  const myAppointments = appointments.filter(a => {
    if (isPatient) {
      const name = (user?.displayName || user?.name || '').toLowerCase().trim();
      const username = (user?.username || '').toLowerCase().trim();
      const uid = String(user?.id || user?._id || '').trim();
      const aName = (a.patientName || '').toLowerCase().trim();
      const aUname = (a.patientUsername || '').toLowerCase().trim();
      const aId = String(a.patientId || '').trim();
      return (
        (name && aName === name) ||
        (username && (aUname === username || aName === username)) ||
        (uid && aId === uid)
      );
    }
    return true; // doctors, staff, admin see all
  });

  const filtered = myAppointments.filter(a => {
    const q = search.toLowerCase();
    const matchesSearch = 
      a.patientName?.toLowerCase().includes(q) ||
      a.doctorName?.toLowerCase().includes(q) ||
      a.dept?.toLowerCase().includes(q) ||
      a.id?.toLowerCase().includes(q) ||
      a.assignedStaffName?.toLowerCase().includes(q) ||
      a.qrToken?.toLowerCase().includes(q);
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && a.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  const totalCount = myAppointments.length;
  const scheduledCount = myAppointments.filter(a => ['Scheduled', 'Confirmed', 'Pending Confirmation'].includes(a.status)).length;
  const checkedInCount = myAppointments.filter(a => a.status === 'Checked In' || a.attendanceStatus === 'Checked In').length;
  const completedCount = myAppointments.filter(a => a.status === 'Completed').length;

  // Real-time preview of slots inside the doctor settings modal
  const livePreviewSlots = useMemo(() => {
    const t = `${settingsForm.startHour} - ${settingsForm.endHour}`;
    return calculateSlotPreview(t, settingsForm.slotDuration, settingsForm.breakTime);
  }, [settingsForm.startHour, settingsForm.endHour, settingsForm.slotDuration, settingsForm.breakTime]);

  return (
    <DashboardLayout title={isPatient ? "My Appointments & Bookings" : isDoctor ? "Doctor Appointments & Schedule" : "Appointments & Clinical Scheduling"}>
      <div className="space-y-6">
        
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {isPatient ? 'My Total Appointments' : 'Total Bookings'}
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">{totalCount}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Calendar size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {isPatient ? 'Upcoming / Scheduled' : 'Scheduled / Confirmed'}
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{scheduledCount}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {isPatient ? 'Attended / Checked In' : 'Attendance Marked / In Queue'}
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{checkedInCount}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <UserCheck size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {isPatient ? 'Completed Visits' : 'Completed Encounters'}
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{completedCount}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface-card p-4 rounded-2xl border border-surface-border">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder={isPatient ? "Search by Doctor, Department, or Appt ID..." : "Search by Patient, Doctor, Staff, Department, ID, or QR..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface border border-surface-border focus:border-brand-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-surface border border-surface-border text-xs rounded-xl px-3 py-2.5 text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked In">Checked In</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <button 
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-surface hover:bg-slate-800 border border-surface-border text-slate-400 hover:text-white"
              title="Refresh"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Doctor Availability Settings Button */}
            {(isDoctor || isAdmin) && (
              <button 
                onClick={() => openAvailabilitySettings()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-900/30 transition-all hover:scale-[1.02]"
                title="Configure consultation hours, working days, and appointing staff"
              >
                <Settings size={16} />
                <span>Availability Settings</span>
              </button>
            )}

            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-900/30 transition-all hover:scale-[1.02]"
            >
              <Plus size={16} />
              Book Appointment
            </button>
          </div>
        </div>

        {/* Appointments Table */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="bg-surface-card rounded-2xl border border-surface-border overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/70 border-b border-surface-border text-[11px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Appt ID</th>
                    {!isPatient && <th className="px-5 py-3.5">Patient Info</th>}
                    <th className="px-5 py-3.5">Attending Doctor</th>
                    <th className="px-5 py-3.5">Schedule</th>
                    <th className="px-5 py-3.5">Appointing Staff & Attendance</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isPatient ? 6 : 7} className="text-center py-12 text-slate-500 text-sm">
                        No appointments found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((appt) => {
                      const isMyStaffAppointment = isStaff && (
                        (appt.assignedStaffUsername && appt.assignedStaffUsername.toLowerCase() === user?.username?.toLowerCase()) ||
                        (appt.assignedStaffId && appt.assignedStaffId === user?.id)
                      );
                      const canStaffMarkAttendance = (isStaff && isMyStaffAppointment) || isAdmin;
                      const isAttendancePresent = appt.attendanceStatus === 'Checked In' || appt.status === 'Checked In';

                      return (
                        <tr key={appt.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-5 py-4 font-mono font-bold text-cyan-400 text-xs">
                            {appt.id}
                          </td>
                          {!isPatient && (
                            <td className="px-5 py-4">
                              <div className="font-semibold text-white">{appt.patientName}</div>
                              <div className="text-xs text-slate-500 font-mono">{appt.patientId}</div>
                            </td>
                          )}
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-200">{appt.doctorName}</div>
                            <div className="text-xs text-cyan-400 font-mono">{appt.dept}</div>
                          </td>
                          <td className="px-5 py-4 text-xs font-mono">
                            <div className="text-slate-200 font-semibold">{appt.date}</div>
                            <div className="text-cyan-400 font-bold">{appt.time}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                                <User size={13} className="text-slate-400" />
                                <span>{appt.assignedStaffName || 'Assigned Staff'}</span>
                              </div>
                              <div>
                                {isAttendancePresent ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                                    <CheckCircle2 size={12} className="text-emerald-400" />
                                    <span>Present ({appt.checkedInAt || 'Verified'})</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                    <Clock size={11} className="text-amber-400" />
                                    <span>Attendance Pending</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold ${
                              appt.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                              appt.status === 'Checked In' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' :
                              appt.status === 'Confirmed' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30' :
                              appt.status === 'Cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                              'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {appt.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {appt.qrCode && (
                                <button 
                                  onClick={() => setSelectedQR(appt)}
                                  className="p-1.5 rounded-lg bg-surface hover:bg-cyan-500/20 text-cyan-400 border border-surface-border transition-colors"
                                  title="View QR Pass"
                                >
                                  <QrCode size={15} />
                                </button>
                              )}

                              {/* Appointing Staff Mark Attendance button */}
                              {canStaffMarkAttendance && ['Confirmed', 'Scheduled'].includes(appt.status) && !isAttendancePresent && (
                                <button 
                                  onClick={() => handleMarkAttendance(appt.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all hover:scale-105"
                                  title="Mark Attendance for patient at scheduled time"
                                >
                                  <UserCheck size={14} />
                                  <span>Mark Attendance</span>
                                </button>
                              )}

                              {/* If staff belongs to another doctor, show notice */}
                              {isStaff && !isMyStaffAppointment && !isAdmin && (
                                <span className="text-[11px] text-slate-500 font-mono italic" title="Only assigned staff can mark attendance">
                                  Staff: {appt.assignedStaffName?.split(' ')[0] || 'Assigned'}
                                </span>
                              )}

                              {canManageAppointments && ['Pending Confirmation', 'Scheduled'].includes(appt.status) && (
                                <button 
                                  onClick={() => handleConfirm(appt.id)}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                                  title="Confirm Appointment & Generate QR"
                                >
                                  <Check size={15} />
                                </button>
                              )}

                              {/* Both patient and management can cancel unfulfilled appointments */}
                              {['Pending Confirmation', 'Scheduled'].includes(appt.status) && (
                                <button 
                                  onClick={() => handleReject(appt.id)}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors flex items-center gap-1 text-xs"
                                  title="Cancel Appointment"
                                >
                                  <X size={15} />
                                  {isPatient && <span>Cancel</span>}
                                </button>
                              )}

                              {/* Doctor / General check in */}
                              {canManageAppointments && !isStaff && ['Confirmed', 'Scheduled'].includes(appt.status) && (
                                <button 
                                  onClick={() => handleCheckIn(appt.id)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-colors"
                                  title="Check In Patient"
                                >
                                  Check In
                                </button>
                              )}
                            </div>
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

        {/* Doctor Availability & Schedule Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-2xl bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Settings size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Doctor Availability Settings</h3>
                  <p className="text-xs text-slate-400">
                    Configure your consulting hours. Patients can strictly only book appointments within these slots.
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <label className="block text-xs font-mono text-slate-400 mb-1">Select Doctor Profile to Configure:</label>
                  <select
                    value={settingsForm.doctorId}
                    onChange={e => {
                      const d = doctors.find(doc => doc.id === e.target.value);
                      if (d) openAvailabilitySettings(d);
                    }}
                    className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>
                    ))}
                  </select>
                </div>
              )}

              <form onSubmit={handleSaveAvailability} className="mt-6 space-y-5">
                {/* Working Days */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 font-semibold mb-2">
                    1. Consultation Working Days
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['Mon - Sat', 'Mon - Fri', 'All Days', 'Mon, Wed, Fri'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSettingsForm(p => ({ ...p, workingDays: preset }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          settingsForm.workingDays === preset 
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' 
                            : 'bg-surface border-surface-border text-slate-400 hover:text-white'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text"
                    value={settingsForm.workingDays}
                    onChange={e => setSettingsForm(p => ({ ...p, workingDays: e.target.value }))}
                    placeholder="e.g. Mon - Sat, or Mon, Tue, Thu"
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Patients will be blocked from booking on days outside this schedule.</span>
                </div>

                {/* Consultation Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 font-semibold mb-1">
                      2. Clinic Opening Time
                    </label>
                    <select
                      value={settingsForm.startHour}
                      onChange={e => setSettingsForm(p => ({ ...p, startHour: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                    >
                      {['07:00 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 font-semibold mb-1">
                      3. Clinic Closing Time
                    </label>
                    <select
                      value={settingsForm.endHour}
                      onChange={e => setSettingsForm(p => ({ ...p, endHour: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                    >
                      {['01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '04:30 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Slot Duration & Lunch Break */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 font-semibold mb-1">
                      4. Slot Duration (Minutes)
                    </label>
                    <select
                      value={settingsForm.slotDuration}
                      onChange={e => setSettingsForm(p => ({ ...p, slotDuration: Number(e.target.value) }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                    >
                      <option value="15">15 Minutes (Express / Follow-up)</option>
                      <option value="20">20 Minutes</option>
                      <option value="30">30 Minutes (Standard Consultation)</option>
                      <option value="45">45 Minutes (Detailed Assessment)</option>
                      <option value="60">60 Minutes (Specialized Procedure)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 font-semibold mb-1">
                      5. Lunch / Break Hours (Optional)
                    </label>
                    <select
                      value={settingsForm.breakTime}
                      onChange={e => setSettingsForm(p => ({ ...p, breakTime: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                    >
                      <option value="">No Break (Continuous)</option>
                      <option value="01:00 PM - 02:00 PM">01:00 PM - 02:00 PM</option>
                      <option value="01:30 PM - 02:30 PM">01:30 PM - 02:30 PM</option>
                      <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                    </select>
                  </div>
                </div>

                {/* Appointing Staff & OPD Room */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 font-semibold mb-1">
                      6. Appointing Staff (Marks Attendance)
                    </label>
                    <select
                      value={settingsForm.assignedStaffId}
                      onChange={e => setSettingsForm(p => ({ ...p, assignedStaffId: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="">Choose Appointing Staff Member...</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role || 'Staff'})</option>
                      ))}
                    </select>
                    <span className="text-[11px] text-cyan-400 mt-1 block">Only this staff member is authorized to mark attendance for your appointments.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 font-semibold mb-1">
                      7. OPD Room / Consultation Cabin
                    </label>
                    <input 
                      type="text"
                      value={settingsForm.opdRoom}
                      onChange={e => setSettingsForm(p => ({ ...p, opdRoom: e.target.value }))}
                      placeholder="e.g. OPD Wing A - Room 102"
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Live Preview of Generated Slots */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-cyan-400" />
                      Live Slot Preview for Patients ({livePreviewSlots.length} slots/day):
                    </span>
                    <span className="text-[11px] font-mono text-cyan-400">
                      {settingsForm.startHour} to {settingsForm.endHour}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {livePreviewSlots.map(slot => (
                      <span key={slot} className="px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-[11px] font-mono text-cyan-300">
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-bold text-xs shadow-xl shadow-cyan-900/40 transition-all disabled:opacity-50"
                  >
                    {savingSettings ? 'Saving Schedule...' : 'Save Availability Schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Book Appointment Modal with Live Slot Verification */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-surface"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Book New Appointment</h3>
              <p className="text-xs text-slate-400 mb-5">Select a specialist and pick from their verified available consultation slots.</p>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Attending Specialist */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Attending Specialist *</label>
                  <select 
                    value={form.doctorId}
                    onChange={e => {
                      const doc = doctors.find(d => d.id === e.target.value);
                      if (doc) {
                        setForm(p => ({
                          ...p,
                          doctorId: doc.id,
                          doctorName: doc.name,
                          dept: doc.specialization
                        }));
                      }
                    }}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.specialization} (Fee: ₹{d.fee || 800})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Patient Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-mono text-slate-400">Patient Full Name *</label>
                    {isPatient && (
                      <span className="text-[10px] text-cyan-400 font-mono">Logged-in Profile</span>
                    )}
                  </div>
                  <input 
                    type="text"
                    required
                    readOnly={isPatient}
                    placeholder="e.g. Ramesh Kumar"
                    value={form.patientName}
                    onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))}
                    className={`w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 ${isPatient ? 'bg-slate-900/80 text-slate-300 cursor-not-allowed border-dashed' : ''}`}
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Contact Phone *</label>
                  <input 
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Consultation Date *</label>
                  <input 
                    type="date"
                    required
                    value={form.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Dynamic Available Slots Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono text-slate-400">
                      Available Time Slots *
                    </label>
                    {doctorSlotsData && (
                      <span className="text-[11px] font-mono text-cyan-400">
                        Hours: {doctorSlotsData.timings}
                      </span>
                    )}
                  </div>

                  {loadingSlots ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      <LoadingSpinner />
                      <span className="mt-1 block">Checking doctor availability...</span>
                    </div>
                  ) : doctorSlotsData && !doctorSlotsData.isWorkingDay ? (
                    <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle size={15} />
                        Doctor not available on {doctorSlotsData.dayName}s
                      </div>
                      <p className="text-slate-300 text-[11px]">
                        Dr. {doctorSlotsData.doctorName}'s working schedule is: <span className="font-semibold text-white">{doctorSlotsData.workingDays}</span>. Please choose a different date.
                      </p>
                    </div>
                  ) : doctorSlotsData && doctorSlotsData.slots ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 bg-surface rounded-xl border border-surface-border">
                        {doctorSlotsData.slots.map(slot => {
                          const isSelected = form.time === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => setForm(p => ({ ...p, time: slot.time }))}
                              className={`py-2 px-1 rounded-lg text-xs font-mono font-medium transition-all text-center relative ${
                                isSelected
                                  ? 'bg-brand-600 text-white font-bold ring-2 ring-brand-400 shadow-lg'
                                  : slot.available
                                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/60'
                                  : 'bg-slate-950/70 text-slate-600 border border-slate-900 cursor-not-allowed line-through'
                              }`}
                            >
                              {slot.time}
                              {slot.booked && (
                                <span className="block text-[9px] text-red-400 font-sans no-underline font-semibold">Booked</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {form.time ? (
                        <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                          <CheckCircle2 size={13} /> Selected slot: <span className="font-bold">{form.time}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-400 font-mono">
                          Please tap on one of the available time slots above.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-mono">Select doctor and date to view consultation slots.</div>
                  )}
                </div>

                {/* Reason for Visit */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Reason for Visit / Symptoms</label>
                  <textarea 
                    rows={2}
                    placeholder="Brief description of symptoms or consultation reason"
                    value={form.reason}
                    onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submitting || (doctorSlotsData && !doctorSlotsData.isWorkingDay) || !form.time}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Locking Slot & Generating Booking...' : 'Confirm Appointment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* QR Pass Detail Modal */}
        {selectedQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-sm bg-surface-card border border-surface-border rounded-3xl p-6 text-center shadow-2xl">
              <button 
                onClick={() => setSelectedQR(null)}
                className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-3">
                <QrCode size={24} />
              </div>

              <h4 className="text-lg font-bold text-white">OPD Fast Track QR Token</h4>
              <p className="text-xs text-slate-400 mb-4">{selectedQR.patientName} — {selectedQR.doctorName}</p>

              {selectedQR.qrCode ? (
                <div className="p-3 bg-white rounded-2xl inline-block shadow-lg mx-auto mb-4">
                  <img src={selectedQR.qrCode} alt="Appointment QR" className="w-48 h-48 object-contain" />
                </div>
              ) : (
                <div className="py-8 text-xs text-slate-500">QR Code generating...</div>
              )}

              <div className="p-3 rounded-xl bg-surface border border-surface-border text-left text-xs font-mono space-y-1 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Token ID:</span>
                  <span className="text-cyan-400 font-bold">{selectedQR.qrToken || selectedQR.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Slot:</span>
                  <span className="text-white">{selectedQR.date} @ {selectedQR.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Appointing Staff:</span>
                  <span className="text-cyan-300">{selectedQR.assignedStaffName || 'Staff'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attendance:</span>
                  <span className={selectedQR.attendanceStatus === 'Checked In' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {selectedQR.attendanceStatus || 'Pending'}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => window.print()}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2"
              >
                <Printer size={15} /> Print Attendance Slip
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
