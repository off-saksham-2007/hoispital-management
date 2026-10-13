import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendContactMessage } from '../api/api';
import DashboardLayout from '../components/DashboardLayout';

export default function ContactUsPage() {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'patient',
    subject: '',
    category: 'Appointment / Doctor Availability',
    priority: 'Normal',
    message: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await sendContactMessage(formData);
      setSuccessTicket(res.data.ticket);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 border border-indigo-800/40 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wider uppercase mb-3">
              🏥 Central Hospital Administration Helpdesk
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Contact Administration & Support</h1>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
              Have questions regarding doctor schedules, appointment approvals, QR attendance, or billing? Submit a ticket directly to the hospital administrative desk.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
              {successTicket ? (
                <div className="text-center py-10 space-y-5 animate-in fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto text-emerald-400">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Ticket Submitted Successfully</h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Your ticket has been dispatched to the Hospital Administration queue.
                    </p>
                  </div>

                  <div className="max-w-xs mx-auto bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 text-left space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Ticket Reference:</span>
                      <span className="font-mono font-bold text-sky-400">{successTicket.id}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Subject:</span>
                      <span className="font-semibold text-white truncate max-w-[140px]">{successTicket.subject}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Status:</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        {successTicket.status}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSuccessTicket(null);
                      setFormData({
                        name: user?.displayName || '',
                        email: user?.email || '',
                        phone: user?.phone || '',
                        role: user?.role || 'patient',
                        subject: '',
                        category: 'Appointment / Doctor Availability',
                        priority: 'Normal',
                        message: ''
                      });
                    }}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                  >
                    Submit Another Query
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center justify-between">
                    <span>Submit an Administrative Query</span>
                    <span className="text-xs font-normal text-slate-400">
                      Logged in as: <strong className="text-sky-400">{user?.displayName || 'Guest User'}</strong>
                    </span>
                  </h2>

                  {errorMsg && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-sky-500"
                        placeholder="e.g. Rahul Sharma"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-sky-500"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-sky-500"
                        placeholder="+91 98765 00000"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        User Role
                      </label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-sky-500"
                      >
                        <option value="patient">Patient / Attendant</option>
                        <option value="doctor">Consultant Doctor</option>
                        <option value="staff">Appointing / Nursing Staff</option>
                        <option value="visitor">External Visitor / Vendor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Priority Level
                      </label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-sky-500"
                      >
                        <option value="Normal">Normal</option>
                        <option value="High">High (Needs today's response)</option>
                        <option value="Urgent">Urgent / Emergency Escalation</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Query Subject *
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-sky-500"
                      placeholder="e.g. Need rescheduling assistance for Cardiology appointment"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Detailed Message *
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-xs focus:outline-none focus:border-sky-500 leading-relaxed resize-none"
                      placeholder="Describe your issue, appointment reference ID, or specific question in detail…"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Submitting to Admin…' : '✉️ Dispatch Message to Admin Helpdesk'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right: Hospital Contact & Helpdesk Information */}
          <div className="space-y-5">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📞</span> Quick Helpdesk Directory
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-sky-400 font-semibold uppercase block">
                    Central Reception & Appointments
                  </span>
                  <p className="font-bold text-white text-sm mt-0.5">+91 22 4000 5000</p>
                  <p className="text-slate-400 text-[11px]">Available Mon - Sat (08:00 AM - 08:00 PM)</p>
                </div>

                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                  <span className="text-[10px] text-rose-400 font-semibold uppercase block">
                    Emergency & Trauma Care (24x7)
                  </span>
                  <p className="font-bold text-rose-300 text-sm mt-0.5">102 / +91 22 4000 5999</p>
                  <p className="text-slate-400 text-[11px]">Dedicated ambulance & triage response</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-sky-400 font-semibold uppercase block">
                    Hospital Administration Email
                  </span>
                  <p className="font-bold text-white text-xs mt-0.5">admin@carepoint.in</p>
                  <p className="text-slate-400 text-[11px]">Escalations, staffing & grievance handling</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📍</span> Hospital Campus
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                CarePoint Super-Speciality Hospital & Research Center<br />
                123 Medical Boulevard, Andheri East<br />
                Mumbai, Maharashtra - 400069
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                OPD Wing: Floor 1 & 2 • Administrative Wing: Level 4
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
