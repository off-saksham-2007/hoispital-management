import { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, Calendar, Award, Stethoscope, 
  Clock, Building2, Shield, Heart, Star, Sparkles, CheckCircle2, 
  Save, AlertCircle, MessageSquare, Activity, FileText, BadgeCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getProfile, updateProfile } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  
  // Doctor form state
  const [docForm, setDocForm] = useState({
    id: '',
    name: '',
    username: '',
    email: '',
    phone: '',
    specialization: 'Cardiology',
    qualification: 'MBBS, MD',
    exp: 10,
    fee: 800,
    hospital: 'CarePoint Super-Speciality Hospital',
    status: 'On Duty',
    bio: '',
    timings: '09:00 AM - 04:00 PM',
    workingDays: 'Mon - Sat',
    opdRoom: 'OPD Chamber 204',
    keywords: '',
    rating: 0,
    ratingCount: 0
  });

  // Patient form state
  const [patientForm, setPatientForm] = useState({
    id: '',
    name: '',
    username: '',
    email: '',
    phone: '',
    age: 28,
    gender: 'Male',
    bloodGroup: 'O+',
    dateOfBirth: '1996-01-01',
    address: '',
    allergies: '',
    chronicConditions: '',
    emergencyContact: '',
    insuranceNumber: ''
  });

  // Staff form state
  const [staffForm, setStaffForm] = useState({
    id: '',
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'Staff Nurse',
    dept: 'OPD Admissions',
    shiftTiming: '08:00 AM - 04:00 PM',
    employeeId: ''
  });

  // Admin form state
  const [adminForm, setAdminForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    department: 'Hospital Administration & Governance'
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await getProfile();
      const p = res.data.profile || {};
      setFeedbacks(res.data.feedbacks || []);

      if (user?.role === 'doctor') {
        setDocForm({
          id: p.id || '',
          name: p.name || user?.displayName || '',
          username: p.username || user?.username || '',
          email: p.email || user?.email || '',
          phone: p.phone || user?.phone || '',
          specialization: p.specialization || user?.specialization || 'Cardiology',
          qualification: p.qualification || 'MBBS, MD',
          exp: p.exp ?? 10,
          fee: p.fee ?? 800,
          hospital: p.hospital || 'CarePoint Super-Speciality Hospital',
          status: p.status || 'On Duty',
          bio: p.bio || '',
          timings: p.timings || '09:00 AM - 04:00 PM',
          workingDays: p.workingDays || 'Mon - Sat',
          opdRoom: p.opdRoom || 'OPD Chamber 204',
          keywords: Array.isArray(p.keywords) ? p.keywords.join(', ') : (p.keywords || ''),
          rating: p.rating || 0,
          ratingCount: p.ratingCount || 0
        });
      } else if (user?.role === 'patient') {
        setPatientForm({
          id: p.id || '',
          name: p.name || user?.displayName || '',
          username: p.username || user?.username || '',
          email: p.email || user?.email || '',
          phone: p.phone || user?.phone || '',
          age: p.age ?? 28,
          gender: p.gender || 'Male',
          bloodGroup: p.bloodGroup || 'O+',
          dateOfBirth: p.dateOfBirth || '1996-01-01',
          address: p.address || '',
          allergies: p.allergies || 'None reported',
          chronicConditions: p.chronicConditions || 'None',
          emergencyContact: p.emergencyContact || '',
          insuranceNumber: p.insuranceNumber || ''
        });
      } else if (user?.role === 'staff') {
        setStaffForm({
          id: p.id || '',
          name: p.name || user?.displayName || '',
          username: p.username || user?.username || '',
          email: p.email || user?.email || '',
          phone: p.phone || user?.phone || '',
          role: p.role || user?.subRole || 'Staff Nurse',
          dept: p.dept || 'OPD / Emergency',
          shiftTiming: p.shiftTiming || '08:00 AM - 04:00 PM',
          employeeId: p.employeeId || 'EMP-STF-9921'
        });
      } else if (user?.role === 'admin') {
        setAdminForm({
          name: p.name || user?.displayName || 'System Administrator',
          username: p.username || user?.username || 'admin',
          email: p.email || user?.email || 'admin@carepoint.in',
          phone: p.phone || user?.phone || '+91 98765 99999',
          department: p.department || 'Hospital Administration & Governance'
        });
      }
    } catch {
      toast.error('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDoctorSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateProfile(docForm);
      if (res.data?.user) updateUser(res.data.user);
      toast.success('Doctor Profile updated! Find My Doctor cards now show these details.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handlePatientSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateProfile(patientForm);
      if (res.data?.user) updateUser(res.data.user);
      toast.success('Patient Health Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleStaffSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateProfile(staffForm);
      if (res.data?.user) updateUser(res.data.user);
      toast.success('Staff Station Profile saved!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleAdminSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateProfile(adminForm);
      if (res.data?.user) updateUser(res.data.user);
      toast.success('Administrative settings updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  const role = user?.role || 'patient';

  return (
    <DashboardLayout title="My Account & Clinical Profile">
      <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
        
        {/* Profile Header Card */}
        <div className="card bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-600 to-brand-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-cyan-950/50 flex-shrink-0">
                {user?.displayName?.replace('Dr. ', '').charAt(0) || user?.username?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans']">{user?.displayName}</h2>
                  <BadgeCheck size={20} className="text-cyan-400" />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-950 border border-cyan-800 text-cyan-300 uppercase">
                    {role}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">@{user?.username}</span>
                  {role === 'doctor' && docForm.specialization && (
                    <span className="text-xs text-brand-400 font-medium font-mono">• {docForm.specialization}</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-4">
                  <span className="flex items-center gap-1"><Mail size={12} className="text-slate-500" /> {user?.email || 'No email provided'}</span>
                  {user?.phone && <span className="flex items-center gap-1"><Phone size={12} className="text-slate-500" /> {user.phone}</span>}
                </p>
              </div>
            </div>

            {/* Quick Status / Rating Highlight */}
            {role === 'doctor' && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-right flex-shrink-0">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Patient Rating</div>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <Star size={18} className="text-amber-400 fill-amber-400" />
                  <span className="text-2xl font-bold text-white font-mono">{docForm.ratingCount > 0 ? Number(docForm.rating).toFixed(1) : '—'}</span>
                  <span className="text-xs text-slate-400 font-mono">/ 5</span>
                </div>
                <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                  Based on {feedbacks.length} verified review{feedbacks.length === 1 ? '' : 's'}
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* DOCTOR PROFILE FORM */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {role === 'doctor' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <form onSubmit={handleDoctorSubmit} className="card p-6 sm:p-8 space-y-6 rounded-3xl border border-slate-800 bg-surface-card">
                    <div className="flex items-center justify-between border-b border-surface-border pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Stethoscope size={18} className="text-cyan-400" />
                          Physician Clinical Profile
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Information entered here is directly presented to patients on the Find My Doctor page.
                        </p>
                      </div>
                      <button 
                        type="submit" 
                        disabled={saving}
                        className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2"
                      >
                        <Save size={15} />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>

                    {/* Duty Status Selector */}
                    <div>
                      <label className="block text-xs font-mono font-semibold text-slate-300 mb-2 uppercase">
                        Current Duty Status
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['On Duty', 'In OPD', 'In Surgery', 'Off Duty'].map(st => (
                          <button
                            type="button"
                            key={st}
                            onClick={() => setDocForm(p => ({ ...p, status: st }))}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold font-mono border transition-all ${
                              docForm.status === st 
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-950/30' 
                                : 'bg-surface hover:bg-slate-800 text-slate-400 border-surface-border'
                            }`}
                          >
                            ● {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Basic Doctor Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Full Name & Honorific *</label>
                        <input 
                          type="text" 
                          required
                          value={docForm.name} 
                          onChange={e => setDocForm(p => ({ ...p, name: e.target.value }))}
                          className="input" 
                          placeholder="e.g. Dr. Arjun Mehta"
                        />
                      </div>
                      <div>
                        <label className="label">Specialization / Department *</label>
                        <select 
                          value={docForm.specialization}
                          onChange={e => setDocForm(p => ({ ...p, specialization: e.target.value }))}
                          className="input"
                        >
                          <option value="Cardiology">Cardiology</option>
                          <option value="Pediatrics">Pediatrics</option>
                          <option value="Orthopedics">Orthopedics</option>
                          <option value="Neurology">Neurology</option>
                          <option value="Dermatology">Dermatology</option>
                          <option value="General Medicine">General Medicine</option>
                          <option value="Ophthalmology">Ophthalmology</option>
                          <option value="Dentistry">Dentistry</option>
                          <option value="ENT">ENT</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="label">Medical Degrees & Qualifications</label>
                        <input 
                          type="text" 
                          value={docForm.qualification} 
                          onChange={e => setDocForm(p => ({ ...p, qualification: e.target.value }))}
                          className="input" 
                          placeholder="e.g. MBBS, MD, DM"
                        />
                      </div>
                      <div>
                        <label className="label">Years Experience</label>
                        <input 
                          type="number" 
                          value={docForm.exp} 
                          onChange={e => setDocForm(p => ({ ...p, exp: e.target.value }))}
                          className="input font-mono" 
                          placeholder="e.g. 15"
                        />
                      </div>
                      <div>
                        <label className="label">Consultation Fee (₹)</label>
                        <input 
                          type="number" 
                          value={docForm.fee} 
                          onChange={e => setDocForm(p => ({ ...p, fee: e.target.value }))}
                          className="input font-mono" 
                          placeholder="e.g. 1000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Hospital / Branch Location</label>
                        <input 
                          type="text" 
                          value={docForm.hospital} 
                          onChange={e => setDocForm(p => ({ ...p, hospital: e.target.value }))}
                          className="input" 
                          placeholder="e.g. CarePoint Super-Speciality Hospital"
                        />
                      </div>
                      <div>
                        <label className="label">OPD Chamber / Room No.</label>
                        <input 
                          type="text" 
                          value={docForm.opdRoom} 
                          onChange={e => setDocForm(p => ({ ...p, opdRoom: e.target.value }))}
                          className="input" 
                          placeholder="e.g. OPD Chamber 204, 2nd Floor"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Daily OPD Timings</label>
                        <input 
                          type="text" 
                          value={docForm.timings} 
                          onChange={e => setDocForm(p => ({ ...p, timings: e.target.value }))}
                          className="input font-mono" 
                          placeholder="e.g. 09:00 AM - 04:00 PM"
                        />
                      </div>
                      <div>
                        <label className="label">Available Days</label>
                        <input 
                          type="text" 
                          value={docForm.workingDays} 
                          onChange={e => setDocForm(p => ({ ...p, workingDays: e.target.value }))}
                          className="input" 
                          placeholder="e.g. Mon - Sat"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Contact Phone</label>
                        <input 
                          type="text" 
                          value={docForm.phone} 
                          onChange={e => setDocForm(p => ({ ...p, phone: e.target.value }))}
                          className="input" 
                          placeholder="+91 98765 01001"
                        />
                      </div>
                      <div>
                        <label className="label">Clinical Email</label>
                        <input 
                          type="email" 
                          value={docForm.email} 
                          onChange={e => setDocForm(p => ({ ...p, email: e.target.value }))}
                          className="input" 
                          placeholder="doctor@carepoint.in"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Physician Biography & Clinical Statement</label>
                      <textarea 
                        rows={4}
                        value={docForm.bio} 
                        onChange={e => setDocForm(p => ({ ...p, bio: e.target.value }))}
                        className="input" 
                        placeholder="Describe your clinical expertise, sub-specializations, treatments offered, and approach to patient care..."
                      />
                    </div>

                    <div>
                      <label className="label">Keywords & Symptoms Treated (comma separated)</label>
                      <input 
                        type="text" 
                        value={docForm.keywords} 
                        onChange={e => setDocForm(p => ({ ...p, keywords: e.target.value }))}
                        className="input font-mono text-xs" 
                        placeholder="e.g. heart, chest pain, angioplasty, hypertension, ecg, cholesterol"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Used by the clinical symptom matcher to recommend you to patients.</p>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-surface-border">
                      <button 
                        type="submit" 
                        disabled={saving}
                        className="btn-primary py-3 px-6 text-sm font-bold flex items-center gap-2"
                      >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Update Doctor Profile'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Column: Rating & Patient Reviews Empirical View */}
                <div className="space-y-6">
                  <div className="card p-6 rounded-3xl border border-slate-800 bg-surface-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Star size={18} className="text-amber-400 fill-amber-400" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Patient Feedback Score</h4>
                    </div>
                    
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-center my-4">
                      <div className="text-4xl font-black text-amber-400 font-mono">
                        {feedbacks.length > 0 ? Number(docForm.rating).toFixed(1) : '—'}
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-1 text-amber-400">
                        {[1,2,3,4,5].map(i => (
                          <Star 
                            key={i} 
                            size={16} 
                            className={feedbacks.length > 0 && i <= Math.round(docForm.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'} 
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-2 font-mono">
                        {feedbacks.length} Verified Patient Review{feedbacks.length === 1 ? '' : 's'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300 leading-relaxed">
                      <AlertCircle size={14} className="inline mr-1 text-cyan-400" />
                      <strong>Integrity Guarantee:</strong> Doctor ratings are automatically calculated exclusively from verified patient feedback submitted after completed consultations. They cannot be manually edited.
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="card p-6 rounded-3xl border border-slate-800 bg-surface-card space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-2">
                      <MessageSquare size={14} className="text-cyan-400" />
                      Recent Patient Reviews ({feedbacks.length})
                    </h4>
                    
                    {feedbacks.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4 text-center">
                        No patient reviews recorded yet. Reviews will appear here automatically when patients submit feedback.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {feedbacks.map(f => (
                          <div key={f.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-semibold text-white">{f.patientName || 'Verified Patient'}</span>
                              <div className="flex items-center gap-1 text-amber-400 font-mono">
                                <Star size={12} className="fill-amber-400" />
                                <span>{f.rating}/5</span>
                              </div>
                            </div>
                            <p className="text-slate-300 italic mb-2 leading-relaxed">"{f.comment}"</p>
                            <div className="text-[10px] text-slate-500 font-mono">{f.date}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* PATIENT PROFILE FORM */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {role === 'patient' && (
              <form onSubmit={handlePatientSubmit} className="card p-6 sm:p-8 space-y-6 rounded-3xl border border-slate-800 bg-surface-card max-w-4xl mx-auto">
                <div className="flex items-center justify-between border-b border-surface-border pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Heart size={18} className="text-brand-400" />
                      Patient EMR & Personal Health Profile
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Your registered details for appointments, prescriptions, diagnostic labs, and insurance billing.
                    </p>
                  </div>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2"
                  >
                    <Save size={15} />
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Full Legal Name *</label>
                    <input 
                      type="text" 
                      required
                      value={patientForm.name} 
                      onChange={e => setPatientForm(p => ({ ...p, name: e.target.value }))}
                      className="input" 
                    />
                  </div>
                  <div>
                    <label className="label">Age</label>
                    <input 
                      type="number" 
                      value={patientForm.age} 
                      onChange={e => setPatientForm(p => ({ ...p, age: e.target.value }))}
                      className="input font-mono" 
                    />
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select 
                      value={patientForm.gender}
                      onChange={e => setPatientForm(p => ({ ...p, gender: e.target.value }))}
                      className="input"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Blood Group</label>
                    <select 
                      value={patientForm.bloodGroup}
                      onChange={e => setPatientForm(p => ({ ...p, bloodGroup: e.target.value }))}
                      className="input font-mono font-bold"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Date of Birth</label>
                    <input 
                      type="date" 
                      value={patientForm.dateOfBirth} 
                      onChange={e => setPatientForm(p => ({ ...p, dateOfBirth: e.target.value }))}
                      className="input font-mono" 
                    />
                  </div>
                  <div>
                    <label className="label">Emergency Contact Phone</label>
                    <input 
                      type="text" 
                      value={patientForm.emergencyContact} 
                      onChange={e => setPatientForm(p => ({ ...p, emergencyContact: e.target.value }))}
                      className="input font-mono" 
                      placeholder="+91 98765 00000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Phone Number *</label>
                    <input 
                      type="text" 
                      required
                      value={patientForm.phone} 
                      onChange={e => setPatientForm(p => ({ ...p, phone: e.target.value }))}
                      className="input font-mono" 
                    />
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <input 
                      type="email" 
                      value={patientForm.email} 
                      onChange={e => setPatientForm(p => ({ ...p, email: e.target.value }))}
                      className="input" 
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Residential Address</label>
                  <input 
                    type="text" 
                    value={patientForm.address} 
                    onChange={e => setPatientForm(p => ({ ...p, address: e.target.value }))}
                    className="input" 
                    placeholder="Street, City, Pincode, State"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-surface-border">
                  <div>
                    <label className="label text-red-400 font-semibold">Known Drug & Environmental Allergies</label>
                    <input 
                      type="text" 
                      value={patientForm.allergies} 
                      onChange={e => setPatientForm(p => ({ ...p, allergies: e.target.value }))}
                      className="input text-red-300" 
                      placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, None"
                    />
                  </div>
                  <div>
                    <label className="label text-amber-400 font-semibold">Chronic Conditions & Medical History</label>
                    <input 
                      type="text" 
                      value={patientForm.chronicConditions} 
                      onChange={e => setPatientForm(p => ({ ...p, chronicConditions: e.target.value }))}
                      className="input text-amber-300" 
                      placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Health Insurance Policy Number</label>
                  <input 
                    type="text" 
                    value={patientForm.insuranceNumber} 
                    onChange={e => setPatientForm(p => ({ ...p, insuranceNumber: e.target.value }))}
                    className="input font-mono" 
                    placeholder="e.g. STAR-HEALTH-9920192"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-surface-border">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="btn-primary py-3 px-6 text-sm font-bold flex items-center gap-2"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Update Patient Health Profile'}
                  </button>
                </div>
              </form>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* STAFF PROFILE FORM */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {role === 'staff' && (
              <form onSubmit={handleStaffSubmit} className="card p-6 sm:p-8 space-y-6 rounded-3xl border border-slate-800 bg-surface-card max-w-3xl mx-auto">
                <div className="flex items-center justify-between border-b border-surface-border pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Shield size={18} className="text-emerald-400" />
                      Hospital Staff & Operations Profile
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Operational credentials for triage duty, QR scanner verification, and ward rounds.
                    </p>
                  </div>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2"
                  >
                    <Save size={15} />
                    {saving ? 'Saving...' : 'Save Staff Profile'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Staff Member Name *</label>
                    <input 
                      type="text" 
                      required
                      value={staffForm.name} 
                      onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))}
                      className="input" 
                    />
                  </div>
                  <div>
                    <label className="label">Hospital Role / Title</label>
                    <input 
                      type="text" 
                      value={staffForm.role} 
                      onChange={e => setStaffForm(p => ({ ...p, role: e.target.value }))}
                      className="input" 
                      placeholder="e.g. Staff Nurse / Receptionist / Triage Officer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Assigned Department</label>
                    <input 
                      type="text" 
                      value={staffForm.dept} 
                      onChange={e => setStaffForm(p => ({ ...p, dept: e.target.value }))}
                      className="input" 
                      placeholder="e.g. OPD Admissions / ICU / ER"
                    />
                  </div>
                  <div>
                    <label className="label">Duty Shift Timings</label>
                    <input 
                      type="text" 
                      value={staffForm.shiftTiming} 
                      onChange={e => setStaffForm(p => ({ ...p, shiftTiming: e.target.value }))}
                      className="input font-mono" 
                      placeholder="e.g. 08:00 AM - 04:00 PM (Morning)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Contact Phone</label>
                    <input 
                      type="text" 
                      value={staffForm.phone} 
                      onChange={e => setStaffForm(p => ({ ...p, phone: e.target.value }))}
                      className="input font-mono" 
                    />
                  </div>
                  <div>
                    <label className="label">Staff Employee ID</label>
                    <input 
                      type="text" 
                      value={staffForm.employeeId} 
                      onChange={e => setStaffForm(p => ({ ...p, employeeId: e.target.value }))}
                      className="input font-mono" 
                      placeholder="EMP-STF-01"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-surface-border">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="btn-primary py-3 px-6 text-sm font-bold flex items-center gap-2"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Update Staff Profile'}
                  </button>
                </div>
              </form>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ADMIN PROFILE FORM */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {role === 'admin' && (
              <form onSubmit={handleAdminSubmit} className="card p-6 sm:p-8 space-y-6 rounded-3xl border border-slate-800 bg-surface-card max-w-3xl mx-auto">
                <div className="flex items-center justify-between border-b border-surface-border pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Shield size={18} className="text-purple-400" />
                      Hospital Administrator Settings
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      System Governance & Hospital Director Account Configuration.
                    </p>
                  </div>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2"
                  >
                    <Save size={15} />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Administrator Name *</label>
                    <input 
                      type="text" 
                      required
                      value={adminForm.name} 
                      onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))}
                      className="input" 
                    />
                  </div>
                  <div>
                    <label className="label">Administrative Department</label>
                    <input 
                      type="text" 
                      value={adminForm.department} 
                      onChange={e => setAdminForm(p => ({ ...p, department: e.target.value }))}
                      className="input" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Official Email</label>
                    <input 
                      type="email" 
                      value={adminForm.email} 
                      onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))}
                      className="input" 
                    />
                  </div>
                  <div>
                    <label className="label">Emergency / Direct Phone</label>
                    <input 
                      type="text" 
                      value={adminForm.phone} 
                      onChange={e => setAdminForm(p => ({ ...p, phone: e.target.value }))}
                      className="input font-mono" 
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-surface-border">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="btn-primary py-3 px-6 text-sm font-bold flex items-center gap-2"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Administrator Settings'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
