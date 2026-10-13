import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { getDoctors, getStaff, assignDoctorStaff } from '../api/api';
import toast from 'react-hot-toast';
import { UserCheck, RefreshCw, Link2, Search, Users } from 'lucide-react';

export default function DoctorStaffPage() {
  const { user } = useAuth();
  const [myDoctor, setMyDoctor] = useState(null);
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [docRes, staffRes] = await Promise.all([getDoctors(), getStaff()]);
      const docs = docRes.data || [];
      const staffList = staffRes.data || [];

      // Find the doctor record matching the logged-in user
      const me = docs.find(d =>
        d.username?.toLowerCase() === user?.username?.toLowerCase() ||
        d.name?.toLowerCase() === user?.displayName?.toLowerCase() ||
        d.id === user?.id
      );
      setMyDoctor(me || null);
      setAllStaff(staffList);
      if (me?.assignedStaffId) setSelectedStaffId(me.assignedStaffId);
    } catch {
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(staffId) {
    if (!myDoctor) return toast.error('Doctor record not found');
    setSaving(true);
    try {
      await assignDoctorStaff(myDoctor.id, staffId);
      toast.success('Appointing staff updated successfully!');
      setSelectedStaffId(staffId);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign staff');
    } finally {
      setSaving(false);
    }
  }

  const assignedStaff = allStaff.find(s => s.id === (myDoctor?.assignedStaffId || selectedStaffId));
  const filteredStaff = allStaff.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.dept?.toLowerCase().includes(search.toLowerCase()) ||
    s.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="My Appointing Staff">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">

        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 border border-indigo-800/40 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wider uppercase mb-3">
              <UserCheck size={13} /> Staff Assignment
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">My Appointing Staff</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Select the nursing / reception staff member who handles your patient appointments, confirmations, and OPD queue management.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-brand-600 border-t-brand-300 rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm mt-3">Loading staff directory…</p>
          </div>
        ) : (
          <>
            {/* Currently Assigned Staff Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Link2 size={16} className="text-indigo-400" />
                Currently Assigned Appointing Staff
              </h2>

              {assignedStaff ? (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    {assignedStaff.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-base">{assignedStaff.name}</div>
                    <div className="text-xs text-indigo-300 font-medium mt-0.5">{assignedStaff.role || 'Staff Nurse'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{assignedStaff.dept || 'OPD'} • {assignedStaff.phone || 'No phone'}</div>
                  </div>
                  <div className="shrink-0">
                    <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                      ✓ Active
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center">
                  <p className="text-amber-400 text-sm font-medium">⚠️ No appointing staff assigned yet</p>
                  <p className="text-slate-400 text-xs mt-1">Select a staff member below to assign them as your OPD handler.</p>
                </div>
              )}
            </div>

            {/* Staff Selection */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  Available Staff Members ({filteredStaff.length})
                </h2>
                <button
                  onClick={loadData}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={15} />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, department, or role…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {filteredStaff.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No staff members found.</p>
              ) : (
                <div className="space-y-2.5">
                  {filteredStaff.map(s => {
                    const isAssigned = s.id === (myDoctor?.assignedStaffId || selectedStaffId);
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                          isAssigned
                            ? 'bg-indigo-500/10 border-indigo-500/40 shadow-md'
                            : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${
                          isAssigned ? 'bg-gradient-to-br from-indigo-600 to-purple-600' : 'bg-slate-700'
                        }`}>
                          {s.name?.charAt(0)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm">{s.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {s.role || 'Staff Nurse'} • {s.dept || 'OPD'}{s.phone ? ` • ${s.phone}` : ''}
                          </div>
                        </div>

                        {isAssigned ? (
                          <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold shrink-0">
                            ✓ Assigned
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAssign(s.id)}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shrink-0 disabled:opacity-50"
                          >
                            {saving ? 'Assigning…' : 'Assign'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Info Note */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
              <span className="text-xl mt-0.5">💡</span>
              <div>
                <p className="font-semibold text-slate-300 mb-1">How appointing staff works:</p>
                <p>When a patient books an appointment with you, the notification goes to your assigned staff member. They can then confirm or reject the appointment on your behalf. Once confirmed, the patient receives their QR check-in pass.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
