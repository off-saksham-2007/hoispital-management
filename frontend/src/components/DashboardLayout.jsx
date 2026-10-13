import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Heart, LogOut, Menu, X, Bell, ChevronRight, LayoutDashboard,
  Calendar, Users, Stethoscope, Bed, FileText, CreditCard, 
  Pill, Activity, QrCode, User, UserCheck, MessageCircle
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function DashboardLayout({ title, subtitle, navItems, tabs, children, activeTab, setActiveTab, onTabChange }) {
  // Normalize: support both (navItems + setActiveTab) and (tabs + onTabChange)
  const normalizedNavItems = navItems || tabs;
  const normalizedSetTab = setActiveTab || onTabChange;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  }

  const roleColors = {
    admin: 'bg-purple-600/20 text-purple-300 border-purple-500/30',
    doctor: 'bg-brand-600/20 text-brand-300 border-brand-500/30',
    staff: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
    patient: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
  };

  // Default modular navigation for all roles with Profile for each user type
  const defaultItemsByRole = {
    admin: [
      { id: 'dash', label: 'Command Center', icon: LayoutDashboard, path: '/admin' },
      { id: 'profile', label: 'Admin Profile', icon: User, path: '/profile' },
      { id: 'appts', label: 'Appointments', icon: Calendar, path: '/appointments' },
      { id: 'patients', label: 'Patients & EMR', icon: Users, path: '/patients' },
      { id: 'doctors', label: 'Doctor Roster', icon: Stethoscope, path: '/doctors' },
      { id: 'wards', label: 'Wards & Beds', icon: Bed, path: '/wards' },
      { id: 'rx', label: 'Prescriptions', icon: FileText, path: '/prescriptions' },
      { id: 'billing', label: 'Billing & Ledger', icon: CreditCard, path: '/billing' },
      { id: 'pharmacy', label: 'Pharmacy Stocks', icon: Pill, path: '/pharmacy' },
      { id: 'lab', label: 'Diagnostics Lab', icon: Activity, path: '/laboratory' },
      { id: 'scanner', label: 'QR Scanner Station', icon: QrCode, path: '/scanner' },
    ],
    doctor: [
      { id: 'dash', label: 'Clinical Desk', icon: LayoutDashboard, path: '/doctor' },
      { id: 'profile', label: 'Doctor Profile', icon: User, path: '/profile' },
      { id: 'appts', label: 'My Appointments', icon: Calendar, path: '/appointments' },
      { id: 'patients', label: 'Patient EMR', icon: Users, path: '/patients' },
      { id: 'rx', label: 'Prescription Studio', icon: FileText, path: '/prescriptions' },
      { id: 'wards', label: 'Inpatient Rounds', icon: Bed, path: '/wards' },
      { id: 'lab', label: 'Lab Reports', icon: Activity, path: '/laboratory' },
      { id: 'my-staff', label: 'My Appointing Staff', icon: UserCheck, path: '/my-staff' },
      { id: 'contact', label: 'Contact & Help', icon: MessageCircle, path: '/contact' },
    ],
    staff: [
      { id: 'dash', label: 'Staff Station', icon: LayoutDashboard, path: '/staff' },
      { id: 'profile', label: 'Staff Profile', icon: User, path: '/profile' },
      { id: 'scanner', label: 'QR Fast Track', icon: QrCode, path: '/scanner' },
      { id: 'appts', label: 'Appointments', icon: Calendar, path: '/appointments' },
      { id: 'patients', label: 'Patient Intake', icon: Users, path: '/patients' },
      { id: 'wards', label: 'Bed Allocation', icon: Bed, path: '/wards' },
      { id: 'pharmacy', label: 'Pharmacy Roster', icon: Pill, path: '/pharmacy' },
      { id: 'lab', label: 'Diagnostic Orders', icon: Activity, path: '/laboratory' },
      { id: 'billing', label: 'Billing Desk', icon: CreditCard, path: '/billing' },
      { id: 'contact', label: 'Contact & Help', icon: MessageCircle, path: '/contact' },
    ],
    patient: [
      { id: 'dash', label: 'My Health Portal', icon: LayoutDashboard, path: '/patient' },
      { id: 'profile', label: 'Patient Profile', icon: User, path: '/profile' },
      { id: 'appts', label: 'Book Appointment', icon: Calendar, path: '/appointments' },
      { id: 'doctors', label: 'Find Specialist', icon: Stethoscope, path: '/doctors' },
      { id: 'rx', label: 'My Prescriptions', icon: FileText, path: '/prescriptions' },
      { id: 'billing', label: 'My Invoices', icon: CreditCard, path: '/billing' },
      { id: 'my-qr', label: 'My QR Pass', icon: QrCode, path: '/my-qr' },
      { id: 'contact', label: 'Contact & Help', icon: MessageCircle, path: '/contact' },
    ]
  };

  const currentRole = user?.role || 'patient';
  const roleNavItems = normalizedNavItems || defaultItemsByRole[currentRole] || defaultItemsByRole.patient;

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-surface-card border-r border-surface-border
        flex flex-col transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-border">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Heart size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">CarePoint</div>
            <div className="text-xs text-slate-500">HMS Platform</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* User info - Clickable to open Profile */}
        <div className="px-4 py-4 border-b border-surface-border">
          <button 
            onClick={() => navigate('/profile')}
            title="Click to view and edit profile"
            className="w-full text-left flex items-center gap-3 px-3 py-3 bg-surface hover:bg-slate-800/80 rounded-xl border border-surface-border hover:border-cyan-500/40 transition-all group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 group-hover:scale-105 transition-transform">
              {user?.displayName?.charAt(0) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">{user?.displayName}</div>
              <span className={`badge border text-xs ${roleColors[user?.role]}`}>
                {user?.role?.toUpperCase()}
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {roleNavItems.map(item => {
            const isActive = item.path 
              ? location.pathname === item.path 
              : activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.path) {
                    navigate(item.path);
                  } else if (normalizedSetTab) {
                    normalizedSetTab(item.id);
                  }
                  setSidebarOpen(false);
                }}
                className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
              >
                <item.icon size={18} />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight size={14} />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-surface-border">
          <button onClick={handleLogout} className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-900/20">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-surface-card border-b border-surface-border px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
            <Menu size={22} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">{title}</h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              {subtitle || new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <button 
              onClick={() => navigate('/profile')}
              title="My Profile & Settings"
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-slate-800 border border-surface-border hover:border-cyan-500/40 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
            >
              <User size={14} className="text-cyan-400" />
              <span className="hidden sm:inline">Profile</span>
            </button>
            <ThemeToggle />
            <button className="relative w-9 h-9 bg-surface rounded-xl border border-surface-border flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <Bell size={17} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
