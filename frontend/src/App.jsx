import { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AppointmentsPage from './pages/AppointmentsPage';
import DoctorsPage from './pages/DoctorsPage';
import PatientsPage from './pages/PatientsPage';
import WardsPage from './pages/WardsPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import BillingPage from './pages/BillingPage';
import PharmacyPage from './pages/PharmacyPage';
import LaboratoryPage from './pages/LaboratoryPage';
import ScannerPage from './pages/ScannerPage';
import ProfilePage from './pages/ProfilePage';
import MyQRPage from './pages/MyQRPage';
import ContactUsPage from './pages/ContactUsPage';
import DoctorStaffPage from './pages/DoctorStaffPage';
import SpecialistsPage from './pages/SpecialistsPage';
import LoadingSpinner from './components/LoadingSpinner';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    const roleHome = {
      admin: '/admin',
      doctor: '/doctor',
      staff: '/staff',
      patient: '/patient'
    }[user.role] || '/';

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full card p-8 border border-slate-800 rounded-3xl text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🔒</div>
          <h3 className="text-lg font-bold text-white">Access Restricted</h3>
          <p className="text-xs text-slate-400">
            You are logged in as <span className="text-cyan-400 font-mono font-bold uppercase">{user.role}</span>.
            This section requires <span className="text-amber-400 font-mono font-bold uppercase">{roles.join(' / ')}</span> clearance.
          </p>
          <div className="pt-2 border-t border-surface-border flex gap-3 justify-center">
            <Link to={roleHome} className="btn-primary py-2 px-4 text-xs font-bold">Go to My Dashboard</Link>
            <Link to="/" className="text-xs text-slate-500 hover:text-slate-400 self-center">Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Role Main Dashboards */}
      <Route path="/patient" element={
        <PrivateRoute roles={['patient']}>
          <PatientDashboard />
        </PrivateRoute>
      } />
      <Route path="/doctor" element={
        <PrivateRoute roles={['doctor']}>
          <DoctorDashboard />
        </PrivateRoute>
      } />
      <Route path="/staff" element={
        <PrivateRoute roles={['staff']}>
          <StaffDashboard />
        </PrivateRoute>
      } />
      <Route path="/admin" element={
        <PrivateRoute roles={['admin']}>
          <AdminDashboard />
        </PrivateRoute>
      } />

      {/* Connected Functional Modules */}
      <Route path="/appointments" element={
        <PrivateRoute>
          <AppointmentsPage />
        </PrivateRoute>
      } />
      <Route path="/doctors" element={
        <DoctorsPage />
      } />
      <Route path="/specialists" element={<SpecialistsPage />} />
      <Route path="/patients" element={
        <PrivateRoute roles={['admin', 'doctor', 'staff']}>
          <PatientsPage />
        </PrivateRoute>
      } />
      <Route path="/wards" element={
        <PrivateRoute roles={['admin', 'doctor', 'staff']}>
          <WardsPage />
        </PrivateRoute>
      } />
      <Route path="/prescriptions" element={
        <PrivateRoute>
          <PrescriptionsPage />
        </PrivateRoute>
      } />
      <Route path="/billing" element={
        <PrivateRoute roles={['admin', 'staff', 'patient']}>
          <BillingPage />
        </PrivateRoute>
      } />
      <Route path="/pharmacy" element={
        <PrivateRoute roles={['admin', 'staff', 'doctor']}>
          <PharmacyPage />
        </PrivateRoute>
      } />
      <Route path="/laboratory" element={
        <PrivateRoute roles={['admin', 'staff', 'doctor']}>
          <LaboratoryPage />
        </PrivateRoute>
      } />
      <Route path="/scanner" element={
        <PrivateRoute roles={['admin', 'staff', 'doctor']}>
          <ScannerPage />
        </PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute>
          <ProfilePage />
        </PrivateRoute>
      } />
      <Route path="/my-qr" element={
        <PrivateRoute roles={['patient']}>
          <MyQRPage />
        </PrivateRoute>
      } />
      <Route path="/my-staff" element={
        <PrivateRoute roles={['doctor']}>
          <DoctorStaffPage />
        </PrivateRoute>
      } />
      <Route path="/contact" element={
        <PrivateRoute>
          <ContactUsPage />
        </PrivateRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
