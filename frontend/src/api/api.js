import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Auth
export const getMe          = ()       => api.get('/auth/me');
export const login          = (data)   => api.post('/auth/login', data);
export const demoLogin      = (role)   => api.post('/auth/demo-login', { role });
export const register       = (data)   => api.post('/auth/patient-register', data);
export const logout         = ()       => api.post('/auth/logout');

// User Profile
export const getProfile     = ()       => api.get('/profile');
export const updateProfile  = (data)   => api.put('/profile', data);

// Doctors
export const getDoctors          = ()       => api.get('/doctors');
export const searchDoctors       = (params) => api.get('/doctors/search', { params });
export const getDoctorFeedbacks  = (id)     => api.get(`/doctors/${id}/feedbacks`);
export const getDoctorAvailableSlots = (doctorId, date) => api.get(`/doctors/${doctorId}/available-slots`, { params: { date } });
export const updateDoctorAvailability = (doctorId, data) => api.patch(`/doctors/${doctorId}/availability`, data);
export const assignDoctorStaff   = (doctorId, staffId) => api.patch(`/doctors/${doctorId}/assign-staff`, { staffId });

// Appointments
export const getAppointments           = (params)   => api.get('/appointments', { params });
export const createAppointment         = (data)     => api.post('/appointments', data);
export const confirmAppointment        = (id)       => api.post(`/appointments/${id}/confirm`);
export const rejectAppointment         = (id, data) => api.post(`/appointments/${id}/reject`, data);
export const updateApptStatus          = (id, status) => api.patch(`/appointments/${id}/status`, { status });
export const markAppointmentAttendance = (id)       => api.post(`/appointments/${id}/mark-attendance`);
export const getAppointmentQR          = (id)       => api.get(`/appointments/${id}/qr`);
export const verifyQR                  = (data)     => api.post('/staff/verify-qr', data);
export const collectAppointmentPayment = (id, data) => api.post(`/appointments/${id}/collect-payment`, data);

// Contact & Helpdesk
export const getContactMessages        = ()         => api.get('/contact');
export const sendContactMessage        = (data)     => api.post('/contact', data);
export const resolveContactMessage     = (id, data) => api.patch(`/contact/${id}/resolve`, data);

// Prescriptions
export const getPrescriptions     = ()     => api.get('/prescriptions');
export const createPrescription   = (data) => api.post('/prescriptions', data);
export const getPrescriptionPdfUrl = (id)  => `/api/prescriptions/${id}/pdf`;

// Feedback
export const getFeedback          = ()     => api.get('/feedback');
export const submitFeedback       = (data) => api.post('/feedback', data);

// Notifications
export const getNotifications     = ()     => api.get('/notifications');
export const markNotifRead        = (id)   => api.post(`/notifications/${id}/read`);

// Admin
export const createDoctor         = (data) => api.post('/admin/doctors', data);
export const createStaff          = (data) => api.post('/admin/staff', data);
export const deleteDoctor         = (id)   => api.delete(`/admin/doctors/${id}`);
export const deleteStaff          = (id)   => api.delete(`/admin/staff/${id}`);

// Dashboards
export const getDashboard         = ()     => api.get('/dashboard');
export const getPortal            = ()     => api.get('/portal');
export const bookPortalAppointment = (d)   => api.post('/portal/appointments', d);
export const getDoctorDashboard   = ()     => api.get('/doctor/dashboard');
export const getStaffDashboard    = ()     => api.get('/staff/dashboard');

// Other / Module Operations
export const getPatients          = ()         => api.get('/patients');
export const createPatient        = (data)     => api.post('/patients', data);
export const updatePatient        = (id, data) => api.patch(`/patients/${id}`, data);

export const getInventory         = ()         => api.get('/inventory');
export const addInventoryItem     = (data)     => api.post('/inventory', data);
export const dispenseMedicine     = (id, data) => api.patch(`/inventory/${id}/dispense`, data);
export const restockMedicine      = (id, data) => api.patch(`/inventory/${id}/restock`, data);

export const getLabs              = ()         => api.get('/labs');
export const orderLabTest         = (data)     => api.post('/labs', data);
export const submitLabResult      = (id, data) => api.patch(`/labs/${id}/result`, data);

export const getBilling           = ()         => api.get('/billing');
export const createInvoice        = (data)     => api.post('/billing', data);
export const payInvoice           = (id, data) => api.post(`/billing/${id}/pay`, data);

export const getStaff             = ()         => api.get('/staff');

export const getAdmissions        = ()         => api.get('/admissions');
export const admitPatient         = (data)     => api.post('/admissions', data);
export const dischargePatient     = (id)       => api.patch(`/admissions/${id}/discharge`);
export const transferPatient      = (id, data) => api.patch(`/admissions/${id}/transfer`, data);

export const getEmergency         = ()         => api.get('/emergency');

// Diagram-aligned aliases
export const getPharmacy          = ()         => api.get('/pharmacy');
export const addPharmacyItem      = (data)     => api.post('/pharmacy', data);
export const dispensePharmacyMed  = (id, data) => api.patch(`/pharmacy/${id}/dispense`, data);
export const restockPharmacyMed   = (id, data) => api.patch(`/pharmacy/${id}/restock`, data);
export const getLabTests          = ()         => api.get('/lab');
export const getStats             = ()         => api.get('/stats');

export default api;
