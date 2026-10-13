import { useState, useEffect } from 'react';
import { 
  Stethoscope, Star, Search, Plus, Award, Phone, Mail, Clock, 
  CheckCircle2, AlertCircle, Building2, Calendar, X, Sparkles, Filter,
  BadgeCheck, MessageSquare, MapPin, UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getDoctors, createDoctor, createAppointment, getDoctorFeedbacks, getDoctorAvailableSlots } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function DoctorsPage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');

  // Reviews Drawer / Modal
  const [reviewsDoc, setReviewsDoc] = useState(null);
  const [docReviews, setDocReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Booking Modal
  const [bookingDoc, setBookingDoc] = useState(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    patientName: user?.displayName || '',
    phone: user?.phone || '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    reason: ''
  });
  const [docSlots, setDocSlots] = useState(null);
  const [loadingDocSlots, setLoadingDocSlots] = useState(false);

  // Add Doctor Modal (Admin)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    name: '',
    specialization: 'Cardiology',
    hospital: 'CarePoint Super-Speciality Hospital',
    exp: 10,
    fee: 1000,
    phone: '',
    email: '',
    bio: '',
    username: '',
    password: 'Doctor@CarePoint123'
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (bookingDoc?.id && bookingForm.date) {
      setLoadingDocSlots(true);
      getDoctorAvailableSlots(bookingDoc.id, bookingForm.date)
        .then(res => {
          setDocSlots(res.data);
          const av = (res.data?.slots || []).filter(s => s.available);
          if (av.length > 0) {
            setBookingForm(p => ({ ...p, time: av[0].time }));
          } else {
            setBookingForm(p => ({ ...p, time: '' }));
          }
        })
        .catch(() => setDocSlots(null))
        .finally(() => setLoadingDocSlots(false));
    }
  }, [bookingDoc, bookingForm.date]);

  async function fetchDoctors() {
    setLoading(true);
    try {
      const res = await getDoctors();
      setDoctors(res.data || []);
    } catch {
      toast.error('Failed to load doctors roster');
    } finally {
      setLoading(false);
    }
  }

  async function handleBookSubmit(e) {
    e.preventDefault();
    if (!bookingForm.patientName || !bookingForm.phone) {
      toast.error('Please enter patient name and contact phone.');
      return;
    }
    setSubmittingBooking(true);
    try {
      await createAppointment({
        ...bookingForm,
        doctorId: bookingDoc.id,
        doctorName: bookingDoc.name,
        dept: bookingDoc.specialization
      });
      toast.success(`🎉 Appointment requested with ${bookingDoc.name}!`);
      setBookingDoc(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setSubmittingBooking(false);
    }
  }

  async function openReviewsModal(doc) {
    setReviewsDoc(doc);
    setLoadingReviews(true);
    try {
      const res = await getDoctorFeedbacks(doc.id);
      setDocReviews(res.data.feedbacks || []);
    } catch {
      setDocReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }

  async function handleAddDoctor(e) {
    e.preventDefault();
    if (!docForm.name) {
      toast.error('Please enter doctor name.');
      return;
    }
    setSubmittingDoc(true);
    try {
      const res = await createDoctor(docForm);
      toast.success('Physician onboarded successfully!');
      setDoctors(prev => [res.data.doctor, ...prev]);
      setIsAddOpen(false);
      setDocForm({
        name: '',
        specialization: 'Cardiology',
        hospital: 'CarePoint Super-Speciality Hospital',
        exp: 10,
        fee: 1000,
        phone: '',
        email: '',
        bio: '',
        username: '',
        password: 'Doctor@CarePoint123'
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add doctor');
    } finally {
      setSubmittingDoc(false);
    }
  }

  const specialties = ['ALL', 'Cardiology', 'Pediatrics', 'Orthopedics', 'Neurology', 'Dermatology', 'General Medicine'];

  const filtered = doctors.filter(d => {
    const q = search.toLowerCase();
    const matchesSearch = 
      d.name?.toLowerCase().includes(q) ||
      d.specialization?.toLowerCase().includes(q) ||
      d.bio?.toLowerCase().includes(q);
    
    if (selectedSpecialty === 'ALL') return matchesSearch;
    return matchesSearch && d.specialization?.toLowerCase() === selectedSpecialty.toLowerCase();
  });

  return (
    <DashboardLayout title="Doctor Directory & Clinical Roster">
      <div className="space-y-6">

        {/* Header Banner & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Specialists</div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{doctors.length}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Stethoscope size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Specialities Covered</div>
              <div className="text-2xl font-bold font-mono text-purple-400 mt-1">6 Centers</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Building2 size={22} />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Duty Availability</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">24/7 Level-1 Coverage</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        {/* Filter & Action Controls */}
        <div className="bg-surface-card p-5 rounded-2xl border border-surface-border space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search physician by name, specialty, condition..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-surface border border-surface-border focus:border-brand-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            {user?.role === 'admin' && (
              <button 
                onClick={() => setIsAddOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-900/30 transition-all hover:scale-[1.02] shrink-0"
              >
                <Plus size={16} />
                Onboard Specialist
              </button>
            )}
          </div>

          {/* Specialty Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border/60">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1 mr-2">
              <Filter size={13} /> Department:
            </span>
            {specialties.map(spec => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialty(spec)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedSpecialty === spec 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm'
                    : 'bg-surface hover:bg-slate-800 text-slate-400 border border-surface-border'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Doctors Roster Grid */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(doc => {
              const statusColor = {
                'On Duty': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                'In OPD': 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
                'In Surgery': 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                'Off Duty': 'bg-slate-800 border-slate-700 text-slate-400',
              }[doc.status] || 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';

              return (
                <div 
                  key={doc.id}
                  className="bg-surface-card rounded-3xl p-6 border border-surface-border hover:border-cyan-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-950/40 flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

                  <div>
                    {/* Top Row: Avatar + Duty Status + Rating Badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-brand-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold font-mono shadow-lg shadow-cyan-950/40 group-hover:scale-105 transition-transform">
                          {doc.name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700 text-cyan-400 shadow-sm" title="Verified Specialist">
                          <BadgeCheck size={14} className="fill-cyan-500 text-slate-950" />
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-medium ${statusColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${doc.status === 'Off Duty' ? 'bg-slate-500' : 'bg-current animate-pulse'}`} />
                          {doc.status || 'On Duty'}
                        </span>

                        {/* Patient Feedback Rating Button */}
                        <button
                          onClick={() => openReviewsModal(doc)}
                          title="Click to view verified patient feedbacks"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-xs font-mono transition-all group/rating shadow-sm"
                        >
                          {doc.ratingCount > 0 ? (
                            <>
                              <Star size={13} className="text-amber-400 fill-amber-400" />
                              <span className="font-bold text-white group-hover/rating:text-amber-300">{Number(doc.rating).toFixed(1)}</span>
                              <span className="text-[11px] text-slate-400">({doc.ratingCount} review{doc.ratingCount > 1 ? 's' : ''})</span>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500">No reviews yet</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Doctor Name & Qualifications */}
                    <div className="mb-2">
                      <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                        {doc.name}
                      </h3>
                      <div className="text-xs font-medium text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-cyan-400 font-semibold font-mono">{doc.specialization}</span>
                        {doc.qualification && (
                          <span className="text-slate-400 font-mono">• {doc.qualification}</span>
                        )}
                        <span className="text-slate-500 font-mono">• {doc.exp || 10} Yrs Exp</span>
                      </div>
                    </div>

                    {/* Bio (Exact info from doctor profile) */}
                    <p className="text-xs text-slate-300/90 line-clamp-3 leading-relaxed mt-2.5 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/40">
                      {doc.bio || `Senior Specialist Consultant providing comprehensive clinical consultations, diagnosis, and evidence-based treatment plans.`}
                    </p>

                    {/* Timings & OPD Room */}
                    <div className="mt-3.5 space-y-1.5 text-[11px] font-mono text-slate-400">
                      <div className="flex items-center gap-1.5 text-cyan-300/90">
                        <Clock size={13} className="text-cyan-400 shrink-0" />
                        <span>{doc.workingDays || 'Mon - Sat'} • {doc.timings || '09:00 AM - 04:00 PM'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin size={13} className="text-slate-500 shrink-0" />
                        <span>{doc.opdRoom || 'OPD Wing A'} • {doc.hospital || 'CarePoint Super-Speciality'}</span>
                      </div>
                    </div>

                    {/* Keywords chips */}
                    {doc.keywords && (Array.isArray(doc.keywords) ? doc.keywords.length > 0 : String(doc.keywords).trim().length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {(Array.isArray(doc.keywords) ? doc.keywords : String(doc.keywords).split(','))
                          .slice(0, 3)
                          .map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800/70 text-[10px] text-slate-400 font-mono">
                              #{String(kw).trim()}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Fee & Actions */}
                  <div className="pt-4 mt-4 border-t border-surface-border flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Consultation Fee</div>
                      <div className="text-lg font-extrabold text-white font-mono flex items-baseline gap-1">
                        <span>₹{doc.fee || 800}</span>
                        <span className="text-[10px] font-normal text-slate-400">/ session</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openReviewsModal(doc)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-all shadow-sm"
                        title="View Patient Reviews"
                      >
                        <MessageSquare size={14} />
                      </button>

                      <button
                        onClick={() => {
                          setBookingDoc(doc);
                          setBookingForm(p => ({ ...p, doctorId: doc.id, doctorName: doc.name, dept: doc.specialization }));
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                      >
                        <Calendar size={14} />
                        Book Slot
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Book Slot Modal */}
        {bookingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl">
              <button 
                onClick={() => setBookingDoc(null)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">
                Book Consultation with {bookingDoc.name}
              </h3>
              <p className="text-xs text-cyan-400 font-mono mb-6">
                {bookingDoc.specialization} • Fee: ₹{bookingDoc.fee}
              </p>

              <form onSubmit={handleBookSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Patient Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={bookingForm.patientName}
                    onChange={e => setBookingForm(p => ({ ...p, patientName: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Mobile Phone *</label>
                  <input 
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={bookingForm.phone}
                    onChange={e => setBookingForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Consultation Date *</label>
                  <input 
                    type="date"
                    required
                    value={bookingForm.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setBookingForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Dynamic Doctor Slots */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono text-slate-400">Available Consultation Slots *</label>
                    {docSlots && <span className="text-[11px] font-mono text-cyan-400">{docSlots.timings}</span>}
                  </div>

                  {loadingDocSlots ? (
                    <div className="py-3 text-center text-xs text-slate-400">
                      <LoadingSpinner /> Loading slots...
                    </div>
                  ) : docSlots && !docSlots.isWorkingDay ? (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
                      Dr. {docSlots.doctorName} is not available on {docSlots.dayName}s. Schedule: {docSlots.workingDays}.
                    </div>
                  ) : docSlots && docSlots.slots ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 bg-surface rounded-xl border border-surface-border">
                        {docSlots.slots.map(s => (
                          <button
                            key={s.time}
                            type="button"
                            disabled={!s.available}
                            onClick={() => setBookingForm(p => ({ ...p, time: s.time }))}
                            className={`py-2 px-1 rounded-lg text-xs font-mono transition-all text-center relative ${
                              bookingForm.time === s.time
                                ? 'bg-brand-600 text-white font-bold ring-2 ring-brand-400'
                                : s.available
                                ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/60'
                                : 'bg-slate-950/70 text-slate-600 border border-slate-900 cursor-not-allowed line-through'
                            }`}
                          >
                            {s.time}
                            {s.booked && <span className="block text-[9px] text-red-400 no-underline font-semibold">Booked</span>}
                          </button>
                        ))}
                      </div>
                      {bookingForm.time ? (
                        <div className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle2 size={13} /> Selected: {bookingForm.time}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-400 font-mono">Please tap an available slot.</div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Chief Symptoms</label>
                  <textarea 
                    rows={2}
                    placeholder="Brief description of symptoms"
                    value={bookingForm.reason}
                    onChange={e => setBookingForm(p => ({ ...p, reason: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submittingBooking}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-900/40 transition-all disabled:opacity-50"
                  >
                    {submittingBooking ? 'Locking Appointment Slot...' : 'Confirm Consultation Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Doctor Reviews & Verified Patient Feedback Modal */}
        {reviewsDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
              <button 
                onClick={() => setReviewsDoc(null)}
                className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-xl font-bold font-mono">
                  {reviewsDoc.name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
                    {reviewsDoc.name}
                    <BadgeCheck size={18} className="text-cyan-400" />
                  </h3>
                  <p className="text-xs text-cyan-400 font-mono mt-0.5">
                    {reviewsDoc.specialization} {reviewsDoc.qualification && `• ${reviewsDoc.qualification}`}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {reviewsDoc.ratingCount > 0 ? (
                      <>
                        <div className="flex items-center gap-1 text-amber-400 font-bold font-mono text-sm">
                          <Star size={16} className="fill-amber-400" />
                          <span>{Number(reviewsDoc.rating).toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">• Based on {reviewsDoc.ratingCount} verified patient feedback{reviewsDoc.ratingCount > 1 ? 's' : ''}</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">No reviews recorded yet</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-surface-border pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
                  <MessageSquare size={14} className="text-cyan-400" />
                  Patient Reviews & Experience ({docReviews.length})
                </h4>

                {loadingReviews ? (
                  <div className="py-8 text-center"><LoadingSpinner /></div>
                ) : docReviews.length === 0 ? (
                  <div className="py-8 text-center space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800/60 p-4">
                    <p className="text-sm font-semibold text-slate-300">No written reviews yet for {reviewsDoc.name}.</p>
                    <p className="text-xs text-slate-500">Patients can submit verified feedback after completing consultation appointments.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {docReviews.map(r => (
                      <div key={r.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{r.patientName || 'Verified Patient'}</span>
                          <div className="flex items-center gap-1 text-amber-400 font-mono">
                            <Star size={12} className="fill-amber-400" />
                            <span>{r.rating}/5</span>
                          </div>
                        </div>
                        <p className="text-slate-300 italic leading-relaxed">"{r.comment}"</p>
                        <div className="text-[10px] text-slate-500 font-mono">{r.date}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-surface-border flex justify-end gap-3">
                <button
                  onClick={() => setReviewsDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const d = reviewsDoc;
                    setReviewsDoc(null);
                    setBookingDoc(d);
                    setBookingForm(p => ({ ...p, doctorId: d.id, doctorName: d.name, dept: d.specialization }));
                  }}
                  className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                >
                  <Calendar size={14} />
                  Book with {reviewsDoc.name.split(' ')[1] || reviewsDoc.name}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Specialist Modal (Admin) */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setIsAddOpen(false)}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Onboard Medical Specialist</h3>
              <p className="text-xs text-slate-400 mb-6">Create physician credentials and roster assignment.</p>

              <form onSubmit={handleAddDoctor} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Full Name (with Dr. prefix) *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Khanna"
                    value={docForm.name}
                    onChange={e => setDocForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Super Speciality</label>
                    <select 
                      value={docForm.specialization}
                      onChange={e => setDocForm(p => ({ ...p, specialization: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="Cardiology">Cardiology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="General Medicine">General Medicine</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Years of Exp</label>
                    <input 
                      type="number"
                      value={docForm.exp}
                      onChange={e => setDocForm(p => ({ ...p, exp: Number(e.target.value) }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Consultation Fee (₹)</label>
                    <input 
                      type="number"
                      value={docForm.fee}
                      onChange={e => setDocForm(p => ({ ...p, fee: Number(e.target.value) }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Contact Phone</label>
                    <input 
                      type="tel"
                      placeholder="+91 98765 00000"
                      value={docForm.phone}
                      onChange={e => setDocForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Email Address</label>
                  <input 
                    type="email"
                    placeholder="doctor@carepoint.in"
                    value={docForm.email}
                    onChange={e => setDocForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Clinical Bio & Credentials</label>
                  <textarea 
                    rows={2}
                    placeholder="Brief background, fellowship, and surgical focus"
                    value={docForm.bio}
                    onChange={e => setDocForm(p => ({ ...p, bio: e.target.value }))}
                    className="w-full bg-surface border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submittingDoc}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-900/40 transition-all disabled:opacity-50"
                  >
                    {submittingDoc ? 'Adding Physician...' : 'Save & Onboard Doctor'}
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
