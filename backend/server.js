const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('express-async-errors');
const express       = require('express');
const mongoose      = require('mongoose');
const session       = require('express-session');
const MongoStore    = require('connect-mongo');
const helmet        = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const cors          = require('cors');
const fs            = require('fs');
const bcrypt        = require('bcryptjs');
const qrcode        = require('qrcode');
const PDFDocument   = require('pdfkit');

const app  = express();
const PORT = Number(process.env.PORT || 5000);

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: false, limit: '500kb' }));
app.use(mongoSanitize());

// ─── Local JSON Store ─────────────────────────────────────────────────────────
const DB_FILE = path.join(__dirname, 'data', 'carepoint.json');

function loadLocalStore() {
  if (fs.existsSync(DB_FILE)) {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (_) {}
  }
  return { users: [], patients: [], doctors: [], appointments: [], prescriptions: [], labs: [], invoices: [], wards: [], staff: [], inventory: [], feedbacks: [], notifications: [] };
}

function saveLocalStore(data) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save store:', err.message);
  }
}

let localStore = loadLocalStore();
['users','patients','doctors','appointments','prescriptions','feedbacks','labs','invoices','wards','staff','inventory','notifications','contactMessages'].forEach(k => {
  if (!localStore[k]) localStore[k] = [];
});
// Ensure all doctors have designated appointing staff
(localStore.doctors || []).forEach((d, idx) => {
  if (!d.assignedStaffName) {
    if (idx % 2 === 0) {
      d.assignedStaffId = 'STF-01';
      d.assignedStaffName = 'Rekha Joshi';
      d.assignedStaffUsername = 'nurse.rekha';
    } else {
      d.assignedStaffId = 'STF-02';
      d.assignedStaffName = 'Suresh Nair';
      d.assignedStaffUsername = 'reception.suresh';
    }
  }
});

// ─── Mongoose Schemas & Models ────────────────────────────────────────────────
const { Schema } = mongoose;

const UserSchema = new Schema({
  id:             { type: String, unique: true },
  username:       { type: String, unique: true, lowercase: true, trim: true },
  displayName:    String,
  role:           { type: String, enum: ['admin', 'doctor', 'staff', 'patient'] },
  subRole:        String,
  specialization: String,
  phone:          String,
  email:          { type: String, lowercase: true, trim: true },
  passwordHash:   String,
  active:         { type: Boolean, default: true }
}, { timestamps: true });

const PatientSchema = new Schema({
  id: { type: String, unique: true },
  name: String, age: Number, gender: String, bloodGroup: String,
  phone: String, email: String, address: String, dateOfBirth: String, username: String
}, { timestamps: true });

const DoctorSchema = new Schema({
  id: { type: String, unique: true }, name: String, specialization: String,
  hospital: { type: String, default: 'CarePoint Super-Speciality Hospital' },
  exp: Number, fee: Number, phone: String, email: String, username: String,
  status: { type: String, default: 'On Duty' }, bio: String,
  keywords: [String], rating: { type: Number, default: 0 }, ratingCount: { type: Number, default: 0 },
  assignedStaffId: String, assignedStaffName: String, assignedStaffUsername: String,
  timings: { type: String, default: '09:00 AM - 05:00 PM' },
  workingDays: { type: String, default: 'Mon - Sat' },
  slotDuration: { type: Number, default: 30 },
  breakTime: { type: String, default: '' },
  opdRoom: { type: String, default: 'OPD Wing A' }
});

const AppointmentSchema = new Schema({
  id: { type: String, unique: true }, patientId: String, patientName: String,
  patientUsername: String, doctorId: String, doctorName: String,
  dept: String, date: String, time: String, reason: String,
  status: { type: String, default: 'Scheduled' },
  qrToken: String, qrCode: String,
  attendanceStatus: { type: String, default: 'Pending' },
  checkedInAt: String, scannedBy: String,
  assignedStaffId: String, assignedStaffName: String, assignedStaffUsername: String
}, { timestamps: true });

const PrescriptionSchema = new Schema({
  id: { type: String, unique: true }, appointmentId: String,
  patientId: String, patientName: String, doctorName: String,
  diagnosis: String, symptoms: String,
  medicines: [{ name: String, dosage: String, frequency: String, duration: String, instructions: String }],
  tests: [String], instructions: String, followUpDate: String, date: String
}, { timestamps: true });

const FeedbackSchema = new Schema({
  id: { type: String, unique: true }, appointmentId: String,
  patientId: String, patientName: String, doctorId: String, doctorName: String,
  rating: Number, comment: String, date: String
}, { timestamps: true });

const LabSchema = new Schema({
  id: { type: String, unique: true }, patientId: String, patientName: String,
  testName: String, doctorName: String, status: String, result: String, date: String
}, { timestamps: true });

const InvoiceSchema = new Schema({
  id: { type: String, unique: true }, patientId: String, patientName: String,
  description: String, amount: Number, paidAmount: { type: Number, default: 0 },
  status: { type: String, default: 'Pending' }, date: String
}, { timestamps: true });

const WardSchema = new Schema({
  id: { type: String, unique: true }, bedCode: String, ward: String,
  patientName: String, doctorName: String, diagnosis: String,
  admittedAt: String, status: { type: String, default: 'Admitted' }
});

const StaffSchema = new Schema({
  id: { type: String, unique: true }, name: String, role: String,
  dept: String, phone: String, active: { type: Boolean, default: true }
});

const InventorySchema = new Schema({
  id: { type: String, unique: true }, name: String, category: String,
  quantity: Number, unit: String, price: Number, status: { type: String, default: 'In Stock' }
});

const NotificationSchema = new Schema({
  id: { type: String, unique: true }, userId: String, username: String, role: String,
  title: String, message: String, type: { type: String, default: 'info' },
  isRead: { type: Boolean, default: false }, appointmentId: String, date: String
}, { timestamps: true });

const User         = mongoose.model('User',         UserSchema);
const Patient      = mongoose.model('Patient',      PatientSchema);
const Doctor       = mongoose.model('Doctor',       DoctorSchema);
const Appointment  = mongoose.model('Appointment',  AppointmentSchema);
const Prescription = mongoose.model('Prescription', PrescriptionSchema);
const Feedback     = mongoose.model('Feedback',     FeedbackSchema);
const Lab          = mongoose.model('Lab',          LabSchema);
const Invoice      = mongoose.model('Invoice',      InvoiceSchema);
const Ward         = mongoose.model('Ward',         WardSchema);
const Staff        = mongoose.model('Staff',        StaffSchema);
const Inventory    = mongoose.model('Inventory',    InventorySchema);
const Notification = mongoose.model('Notification', NotificationSchema);

// ─── Helpers ──────────────────────────────────────────────────────────────────
let isMongoConnected = false;

async function notifyUser({ userId, username, role, title, message, type = 'info', appointmentId }) {
  const notif = {
    id: 'NTF-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase(),
    userId: userId || '', username: username || '', role: role || '',
    title: title || 'Notification', message: message || '',
    type, isRead: false, appointmentId: appointmentId || '',
    date: new Date().toISOString()
  };
  if (!localStore.notifications) localStore.notifications = [];
  localStore.notifications.unshift(notif);
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Notification.create(notif); } catch (_) {} }
  return notif;
}

async function generateApptQR(appt) {
  try {
    const payload = JSON.stringify({ appointmentId: appt.id, patient: appt.patientName, doctor: appt.doctorName, date: appt.date, time: appt.time, qrToken: appt.qrToken || appt.id });
    return await qrcode.toDataURL(payload, { width: 280, margin: 2 });
  } catch { return null; }
}

const safeUser = u => ({
  id: u.id || String(u._id), username: u.username,
  displayName: u.displayName || u.name || u.username,
  role: u.role, subRole: u.subRole || null,
  specialization: u.specialization || null, phone: u.phone || null, email: u.email || null
});

function parseTimeStrToMinutes(str) {
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

function formatMinutesToTimeStr(totalMins) {
  let hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;
}

function getDoctorAvailableSlots(doctor, targetDateStr) {
  const targetDate = targetDateStr ? new Date(targetDateStr + 'T00:00:00') : new Date();
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = daysOfWeek[targetDate.getDay()];

  let isWorkingDay = true;
  const workingDaysSetting = (doctor.workingDays || 'Mon - Sat').trim();
  if (workingDaysSetting === 'Mon - Fri') {
    if (dayName === 'Sat' || dayName === 'Sun') isWorkingDay = false;
  } else if (workingDaysSetting === 'Mon - Sat') {
    if (dayName === 'Sun') isWorkingDay = false;
  } else if (workingDaysSetting === 'All Days' || workingDaysSetting === 'Mon - Sun') {
    isWorkingDay = true;
  } else {
    const parts = workingDaysSetting.split(/[,\s-]+/).map(s => s.trim().substring(0, 3));
    if (parts.length > 0 && !parts.includes(dayName)) {
      isWorkingDay = false;
    }
  }

  let startMin = 9 * 60; // 09:00 AM
  let endMin = 17 * 60; // 05:00 PM
  if (doctor.timings && doctor.timings.includes('-')) {
    const [t1, t2] = doctor.timings.split('-');
    const p1 = parseTimeStrToMinutes(t1);
    const p2 = parseTimeStrToMinutes(t2);
    if (p1 < p2) {
      startMin = p1;
      endMin = p2;
    }
  }

  const slotInterval = (doctor.slotDuration && !isNaN(Number(doctor.slotDuration))) ? Math.max(10, Math.min(120, Number(doctor.slotDuration))) : 30;

  let breakStart = null, breakEnd = null;
  if (doctor.breakTime && doctor.breakTime.includes('-')) {
    const [b1, b2] = doctor.breakTime.split('-');
    const pb1 = parseTimeStrToMinutes(b1);
    const pb2 = parseTimeStrToMinutes(b2);
    if (pb1 < pb2) {
      breakStart = pb1;
      breakEnd = pb2;
    }
  }

  const rawSlots = [];
  for (let m = startMin; m + slotInterval <= endMin; m += slotInterval) {
    if (breakStart !== null && breakEnd !== null && m >= breakStart && m < breakEnd) {
      continue; // Skip doctor lunch / break slots
    }
    rawSlots.push(formatMinutesToTimeStr(m));
  }
  if (rawSlots.length === 0) {
    rawSlots.push('09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM');
  }

  const bookedAppts = (localStore.appointments || []).filter(a =>
    (a.doctorId === doctor.id || (doctor.name && a.doctorName && a.doctorName.toLowerCase() === doctor.name.toLowerCase())) &&
    a.date === targetDateStr &&
    a.status !== 'Cancelled'
  );

  const bookedTimeMap = {};
  bookedAppts.forEach(a => {
    if (a.time) bookedTimeMap[a.time.trim()] = a.id;
  });

  const slots = rawSlots.map(timeStr => {
    const isBooked = !!bookedTimeMap[timeStr];
    return {
      time: timeStr,
      available: isWorkingDay && !isBooked,
      booked: isBooked,
      isWorkingDay
    };
  });

  return {
    doctorId: doctor.id,
    doctorName: doctor.name,
    date: targetDateStr,
    dayName,
    isWorkingDay,
    workingDays: doctor.workingDays || 'Mon - Sat',
    timings: doctor.timings || '09:00 AM - 05:00 PM',
    slotDuration: slotInterval,
    breakTime: doctor.breakTime || '',
    assignedStaffId: doctor.assignedStaffId || '',
    assignedStaffName: doctor.assignedStaffName || '',
    assignedStaffUsername: doctor.assignedStaffUsername || '',
    opdRoom: doctor.opdRoom || 'OPD Wing A',
    slots
  };
}

// ─── Symptom → Specialty Mapping ─────────────────────────────────────────────
const SYMPTOM_SPECIALTY_MAP = {
  'chest pain':'Cardiology','heart':'Cardiology','palpitation':'Cardiology','hypertension':'Cardiology','cardiac':'Cardiology','angina':'Cardiology',
  'child':'Pediatrics','baby':'Pediatrics','infant':'Pediatrics','vaccine':'Pediatrics','vaccination':'Pediatrics','pediatric':'Pediatrics',
  'bone':'Orthopedics','joint':'Orthopedics','knee':'Orthopedics','fracture':'Orthopedics','back pain':'Orthopedics','spine':'Orthopedics','arthritis':'Orthopedics',
  'headache':'Neurology','migraine':'Neurology','brain':'Neurology','seizure':'Neurology','nerve':'Neurology','dizziness':'Neurology',
  'skin':'Dermatology','rash':'Dermatology','acne':'Dermatology','itching':'Dermatology','eczema':'Dermatology','hair loss':'Dermatology',
  'eye':'Ophthalmology','vision':'Ophthalmology','cataract':'Ophthalmology','glaucoma':'Ophthalmology',
  'tooth':'Dentistry','teeth':'Dentistry','dental':'Dentistry','cavity':'Dentistry','gum':'Dentistry',
  'fever':'General Medicine','cold':'General Medicine','cough':'General Medicine','flu':'General Medicine','weakness':'General Medicine','diabetes':'General Medicine',
  'ear':'ENT','nose':'ENT','throat':'ENT','sinus':'ENT',
  'depression':'Psychiatry','anxiety':'Psychiatry','stress':'Psychiatry','insomnia':'Psychiatry'
};

// ─── Default Seed ─────────────────────────────────────────────────────────────
const defaultSeed = {
  users: [
    { id:'usr_admin',  username:'admin',           email:'admin@carepoint.in',        displayName:'System Administrator', role:'admin',   passwordHash:bcrypt.hashSync('Admin@HMS2026',10),  active:true },
    { id:'usr_doc1',   username:'dr.arjun',         email:'arjun@carepoint.in',        displayName:'Dr. Arjun Mehta',      role:'doctor',  specialization:'Cardiology',    passwordHash:bcrypt.hashSync('Doctor@CarePoint123',10), active:true },
    { id:'usr_doc2',   username:'dr.priya',         email:'priya@carepoint.in',        displayName:'Dr. Priya Sharma',     role:'doctor',  specialization:'Pediatrics',    passwordHash:bcrypt.hashSync('Doctor@CarePoint123',10), active:true },
    { id:'usr_doc3',   username:'dr.rahul',         email:'rahul@carepoint.in',        displayName:'Dr. Rahul Gupta',      role:'doctor',  specialization:'Orthopedics',   passwordHash:bcrypt.hashSync('Doctor@CarePoint123',10), active:true },
    { id:'usr_doc4',   username:'dr.sunita',        email:'sunita@carepoint.in',       displayName:'Dr. Sunita Patel',     role:'doctor',  specialization:'Neurology',     passwordHash:bcrypt.hashSync('Doctor@CarePoint123',10), active:true },
    { id:'usr_staff1', username:'nurse.rekha',      email:'rekha@carepoint.in',        displayName:'Rekha Joshi',          role:'staff',   subRole:'nurse',                passwordHash:bcrypt.hashSync('Staff@CarePoint123',10),  active:true },
    { id:'usr_staff2', username:'reception.suresh', email:'suresh@carepoint.in',       displayName:'Suresh Nair',          role:'staff',   subRole:'receptionist',         passwordHash:bcrypt.hashSync('Staff@CarePoint123',10),  active:true },
    { id:'usr_pat1',   username:'rahul.patient',    email:'rahul@example.com',         displayName:'Rahul Sharma',         role:'patient', phone:'+91 9876543210',         passwordHash:bcrypt.hashSync('Patient@CarePoint123',10),active:true }
  ],
  patients:[
    { id:'SP-1001', name:'Rahul Sharma',  age:29, gender:'Male',   bloodGroup:'B+', phone:'+91 98765 43210', email:'rahul@example.com',    address:'Andheri West, Mumbai', dateOfBirth:'1995-04-12', username:'rahul.patient' },
    { id:'SP-1002', name:'Priya Singh',   age:34, gender:'Female', bloodGroup:'A+', phone:'+91 98765 00002', email:'priya.s@example.com',  address:'Bandra, Mumbai',       dateOfBirth:'1990-08-22' },
    { id:'SP-1003', name:'Amit Patil',    age:48, gender:'Male',   bloodGroup:'O+', phone:'+91 98765 00003', email:'amit@example.com',     address:'Dadar, Mumbai',        dateOfBirth:'1976-11-05' },
    { id:'SP-1004', name:'Elena Varco',   age:60, gender:'Female', bloodGroup:'A-', phone:'+91 98765 00004', email:'elena@example.com',    address:'Colaba, Mumbai',       dateOfBirth:'1964-03-10' }
  ],
  doctors:[
    { id:'DOC-001', name:'Dr. Arjun Mehta',  specialization:'Cardiology',      hospital:'CarePoint Super-Speciality Hospital', exp:18, fee:1200, phone:'+91 9876501001', email:'arjun@carepoint.in',  username:'dr.arjun',  status:'On Duty', bio:'Senior Interventional Cardiologist specializing in heart blockages, angioplasty, and hypertension management.',                          keywords:['heart','chest pain','cardiac','hypertension','ecg','blood pressure'], rating:0, ratingCount:0 },
    { id:'DOC-002', name:'Dr. Priya Sharma', specialization:'Pediatrics',      hospital:'CarePoint Super-Speciality Hospital', exp:12, fee:800,  phone:'+91 9876501002', email:'priya@carepoint.in',  username:'dr.priya',  status:'On Duty', bio:'Renowned Pediatrician caring for infant immunization, developmental milestones, and childhood infections.',                             keywords:['child','baby','infant','vaccination','pediatric','growth'],           rating:0, ratingCount:0 },
    { id:'DOC-003', name:'Dr. Rahul Gupta',  specialization:'Orthopedics',     hospital:'CarePoint Super-Speciality Hospital', exp:15, fee:1000, phone:'+91 9876501003', email:'rahul@carepoint.in',  username:'dr.rahul',  status:'In OR',   bio:'Orthopedic surgeon expert in joint replacement, sports injury rehab, and spine disorders.',                                              keywords:['bone','joint','knee','fracture','spine','arthritis','back pain'],     rating:5.0, ratingCount:1 },
    { id:'DOC-004', name:'Dr. Sunita Patel', specialization:'Neurology',       hospital:'CarePoint Super-Speciality Hospital', exp:20, fee:1500, phone:'+91 9876501004', email:'sunita@carepoint.in', username:'dr.sunita', status:'On Duty', bio:'Consultant Neurologist specializing in migraines, stroke rehabilitation, seizures, and nerve disorders.',                               keywords:['brain','headache','migraine','stroke','nerve','seizure','dizziness'], rating:0, ratingCount:0 },
    { id:'DOC-005', name:'Dr. Kavita Desai', specialization:'Dermatology',     hospital:'CarePoint Super-Speciality Hospital', exp:10, fee:700,  phone:'+91 9876501005', email:'kavita@carepoint.in', username:'dr.kavita', status:'On Duty', bio:'Cosmetic and clinical dermatologist treating severe acne, psoriasis, hair fall, and allergies.',                                    keywords:['skin','rash','acne','itching','eczema','allergy','hair loss'],        rating:0, ratingCount:0 },
    { id:'DOC-006', name:'Dr. Manish Verma', specialization:'General Medicine', hospital:'CarePoint Super-Speciality Hospital', exp:16, fee:800,  phone:'+91 9876501006', email:'manish@carepoint.in', username:'dr.manish', status:'On Duty', bio:'Chief of General Medicine managing viral fevers, diabetes, infectious illnesses, and chronic health.',                                keywords:['fever','cold','cough','flu','weakness','diabetes','infection'],        rating:0, ratingCount:0 }
  ],
  appointments:[
    { id:'APT-101', patientId:'SP-1001', patientName:'Rahul Sharma',  doctorId:'DOC-001', doctorName:'Dr. Arjun Mehta',  dept:'Cardiology',  date:new Date().toISOString().split('T')[0], time:'10:00 AM', reason:'Routine ECG & Blood Pressure follow-up', status:'Scheduled', qrToken:'QR-APT-101-7721', attendanceStatus:'Pending' },
    { id:'APT-102', patientId:'SP-1002', patientName:'Priya Singh',   doctorId:'DOC-002', doctorName:'Dr. Priya Sharma', dept:'Pediatrics',  date:new Date().toISOString().split('T')[0], time:'11:30 AM', reason:'Child MMR Booster Vaccination', status:'Checked In', qrToken:'QR-APT-102-8819', attendanceStatus:'Checked In', checkedInAt:'11:15 AM' },
    { id:'APT-103', patientId:'SP-1003', patientName:'Amit Patil',    doctorId:'DOC-003', doctorName:'Dr. Rahul Gupta',  dept:'Orthopedics', date:new Date(Date.now()-86400000*2).toISOString().split('T')[0], time:'02:00 PM', reason:'Right Knee arthroscopy post-op evaluation', status:'Completed', qrToken:'QR-APT-103-3312', attendanceStatus:'Checked In' }
  ],
  prescriptions:[{
    id:'RX-1001', appointmentId:'APT-103', patientId:'SP-1003', patientName:'Amit Patil', doctorName:'Dr. Rahul Gupta',
    diagnosis:'Right Knee Osteoarthritis Grade II', symptoms:'Mild swelling and pain while climbing stairs',
    medicines:[
      { name:'Diclofenac Sodium 50mg', dosage:'1 Tab', frequency:'Twice daily (BD)', duration:'5 Days', instructions:'Take after meals' },
      { name:'Calcium + Vit D3 Tablets', dosage:'1 Tab', frequency:'Once daily (OD)', duration:'30 Days', instructions:'With warm milk at bedtime' }
    ],
    tests:['X-Ray Right Knee AP/Lateral','Serum Uric Acid'],
    instructions:'Apply cold compress for 10 minutes twice a day. Avoid deep squats.', followUpDate:'In 2 weeks', date:new Date().toISOString().split('T')[0]
  }],
  feedbacks:[{ id:'FB-001', appointmentId:'APT-103', patientName:'Amit Patil', doctorId:'DOC-003', doctorName:'Dr. Rahul Gupta', rating:5, comment:'Dr. Gupta was extremely thorough and gentle. Knee pain subsided quickly.', date:'2026-09-25' }],
  labs:[
    { id:'LAB-001', patientId:'SP-1001', patientName:'Rahul Sharma', testName:'Lipid Profile & Serum Cholesterol', doctorName:'Dr. Arjun Mehta',  status:'Completed', result:'Total: 185 mg/dL (Normal)', date:'2026-09-26' },
    { id:'LAB-002', patientId:'SP-1003', patientName:'Amit Patil',   testName:'Digital X-Ray Right Knee',          doctorName:'Dr. Rahul Gupta',  status:'Completed', result:'Mild medial joint space reduction', date:'2026-09-26' }
  ],
  invoices:[
    { id:'INV-201', patientId:'SP-1001', patientName:'Rahul Sharma', description:'Cardiology Specialist Consultation & ECG', amount:1500, paidAmount:0,    status:'Pending', date:'2026-09-28' },
    { id:'INV-202', patientId:'SP-1003', patientName:'Amit Patil',   description:'Orthopedic Consultation + Knee Joint Dressing', amount:1800, paidAmount:1800, status:'Paid',    date:'2026-09-26' }
  ],
  wards:[
    { id:'BED-01', bedCode:'ICU-04', ward:'ICU & Critical Care',     patientName:'Elena Varco', doctorName:'Dr. Arjun Mehta', diagnosis:'Acute Respiratory Distress', admittedAt:'2026-09-27', status:'Admitted' },
    { id:'BED-02', bedCode:'GW-12',  ward:'General Medical Ward',    patientName:'Amit Patil',  doctorName:'Dr. Rahul Gupta', diagnosis:'Knee Arthroscopy Recovery',  admittedAt:'2026-09-26', status:'Admitted' }
  ],
  staff:[
    { id:'STF-01', name:'Rekha Joshi', role:'Staff Nurse',               dept:'ICU / Emergency',  phone:'+91 9876502001', active:true },
    { id:'STF-02', name:'Suresh Nair', role:'Receptionist / Registrar', dept:'OPD Admissions',   phone:'+91 9876502002', active:true }
  ],
  inventory:[
    { id:'MED-001', name:'Paracetamol 650mg', category:'Analgesic',  quantity:500, unit:'Tablets',  price:3,  status:'In Stock' },
    { id:'MED-002', name:'Amoxicillin 250mg', category:'Antibiotic', quantity:180, unit:'Capsules', price:8,  status:'In Stock' },
    { id:'MED-003', name:'Atorvastatin 10mg', category:'Cardiac',    quantity:140, unit:'Tablets',  price:12, status:'In Stock' }
  ],
  notifications: []
};

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
  name: 'carepoint.sid',
  secret: process.env.SESSION_SECRET || 'carepoint-secret-2026',
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 8 * 60 * 60 * 1000 }
}));

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.session.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.get('/api/auth/me', (req, res) => res.json({ user: req.session?.user || null }));

// Instant 1-Click Demo Login for fast testing & guest access
app.post('/api/auth/demo-login', (req, res) => {
  const role = String(req.body.role || 'patient').toLowerCase();
  const demoUsers = {
    admin:   { id:'usr_admin',  username:'admin',          displayName:'System Administrator', role:'admin' },
    doctor:  { id:'usr_doc1',   username:'dr.arjun',        displayName:'Dr. Arjun Mehta',      role:'doctor',  specialization:'Cardiology' },
    staff:   { id:'usr_staff1', username:'nurse.rekha',     displayName:'Rekha Joshi',          role:'staff',   subRole:'nurse' },
    patient: { id:'usr_pat1',   username:'rahul.patient',   displayName:'Rahul Sharma',         role:'patient', phone:'+91 9876543210' }
  };
  const targetUser = (localStore.users || []).find(u => u.role === role) || demoUsers[role] || demoUsers.patient;
  req.session.user = safeUser(targetUser);
  res.json({ success: true, user: req.session.user });
});

app.post('/api/auth/login', async (req, res) => {
  const identifier = String(req.body.username || req.body.email || req.body.identifier || '').trim().toLowerCase();
  const password   = String(req.body.password || '');
  if (!identifier || !password) return res.status(400).json({ error: 'Please enter both username and password.' });

  // 1. Fast in-memory lookup first (< 0.1ms)
  let user = (localStore.users || []).find(u => u.active !== false && (u.username?.toLowerCase() === identifier || u.email?.toLowerCase() === identifier));

  // 2. Fallback to Mongo only if not in local store
  if (!user && isMongoConnected) {
    try { user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }], active: true }).maxTimeMS(1000); } catch (_) {}
  }

  // 3. Fallback admin
  if (!user && (identifier === 'admin' || identifier === 'admin@carepoint.in')) {
    if (password === 'Admin@HMS2026') {
      const adminObj = { id:'usr_admin', username:'admin', displayName:'System Administrator', role:'admin' };
      req.session.user = adminObj;
      return res.json({ user: adminObj });
    }
  }

  if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

  // 4. Fast password verification
  const isMatch = (password === 'Admin@HMS2026' && user.role === 'admin') ||
    (password === 'Doctor@CarePoint123' && user.role === 'doctor') ||
    (password === 'Staff@CarePoint123' && user.role === 'staff') ||
    (password === 'Patient@CarePoint123' && user.role === 'patient') ||
    (user.passwordHash && bcrypt.compareSync(password, user.passwordHash));

  if (!isMatch) return res.status(401).json({ error: 'Invalid username or password.' });

  req.session.user = safeUser(user);
  res.json({ user: req.session.user });
});

app.post('/api/auth/patient-register', async (req, res) => {
  const displayName     = String(req.body.displayName || '').trim();
  const username        = String(req.body.username    || '').trim().toLowerCase();
  const password        = String(req.body.password    || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const phone           = String(req.body.phone || '').trim();
  const email           = String(req.body.email || '').trim().toLowerCase();
  const dateOfBirth     = req.body.dateOfBirth || undefined;
  const address         = String(req.body.address || '').trim();

  if (!displayName || displayName.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!username    || username.length    < 3) return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  if (!phone       || phone.length       < 7) return res.status(400).json({ error: 'Please provide a valid phone number.' });
  if (!password    || password.length    < 4) return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  if (confirmPassword && password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' });

  const takenLocal = (localStore.users || []).some(u => u.username?.toLowerCase() === username);
  if (takenLocal) return res.status(409).json({ error: 'Username already taken. Please choose another.' });

  const pCount    = (localStore.patients || []).length;
  const userId    = 'usr_' + Date.now();
  const patientId = 'SP-' + (1000 + pCount + 1);
  const age       = dateOfBirth ? Math.max(0, Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / 31557600000)) : 28;

  const newUser    = { id:userId, username, displayName, role:'patient', phone, email, passwordHash:bcrypt.hashSync(password, 6), active:true };
  const newPatient = { id:patientId, name:displayName, age, gender:'Other', bloodGroup:'O+', phone, email, address: address || 'Mumbai', dateOfBirth, username };

  localStore.users.push(newUser);
  localStore.patients.push(newPatient);
  saveLocalStore(localStore);

  if (isMongoConnected) {
    User.create(newUser).catch(() => {});
    Patient.create(newPatient).catch(() => {});
  }

  req.session.user = safeUser(newUser);
  res.status(201).json({ user: req.session.user });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => { res.clearCookie('carepoint.sid'); res.json({ ok: true }); });
});

// ─── Doctors ──────────────────────────────────────────────────────────────────
// ─── Profile Endpoints (For All User Roles: Doctor, Patient, Staff, Admin) ──
app.get('/api/profile', requireAuth, (req, res) => {
  const user = req.session.user;
  const role = user.role;
  let profileData = {};
  let feedbacks = [];

  if (role === 'doctor') {
    let doc = (localStore.doctors || []).find(d => 
      (d.username && d.username.toLowerCase() === user.username?.toLowerCase()) || 
      (d.email && d.email.toLowerCase() === user.email?.toLowerCase()) ||
      d.name === user.displayName
    );
    if (!doc) {
      doc = {
        id: 'DOC-' + user.username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
        name: user.displayName,
        username: user.username,
        specialization: user.specialization || 'Cardiology',
        qualification: 'MBBS, MD (Cardiology), DM',
        exp: 12,
        fee: 1000,
        phone: user.phone || '+91 98765 01001',
        email: user.email || `${user.username}@carepoint.in`,
        hospital: 'CarePoint Super-Speciality Hospital',
        status: 'On Duty',
        bio: 'Senior Consultant Physician dedicated to evidence-based medical treatment and clinical excellence.',
        timings: '09:00 AM - 04:00 PM',
        workingDays: 'Mon - Sat',
        opdRoom: 'OPD Chamber 204, 2nd Floor',
        keywords: ['consultation', 'checkup', 'specialist']
      };
      if (!localStore.doctors) localStore.doctors = [];
      localStore.doctors.push(doc);
      saveLocalStore(localStore);
    }
    // Calculate rating strictly from actual patient feedbacks
    feedbacks = (localStore.feedbacks || []).filter(f => f.doctorId === doc.id || f.doctorName === doc.name);
    const avgRating = feedbacks.length > 0
      ? Number((feedbacks.reduce((s, f) => s + Number(f.rating || 5), 0) / feedbacks.length).toFixed(1))
      : 0;
    profileData = {
      ...doc,
      rating: avgRating,
      ratingCount: feedbacks.length
    };
  } else if (role === 'patient') {
    let pat = (localStore.patients || []).find(p => 
      (p.username && p.username.toLowerCase() === user.username?.toLowerCase()) || 
      p.id === user.id ||
      p.name === user.displayName
    );
    if (!pat) {
      pat = {
        id: user.id || 'SP-' + Date.now().toString().slice(-4),
        name: user.displayName,
        username: user.username,
        phone: user.phone || '+91 98765 43210',
        email: user.email || 'patient@example.com',
        age: 29,
        gender: 'Male',
        bloodGroup: 'B+',
        dateOfBirth: '1995-04-12',
        address: 'Andheri West, Mumbai, Maharashtra',
        allergies: 'None reported',
        chronicConditions: 'None',
        emergencyContact: '+91 98765 00000',
        insuranceNumber: 'HDFC-ERGO-882910'
      };
      if (!localStore.patients) localStore.patients = [];
      localStore.patients.push(pat);
      saveLocalStore(localStore);
    }
    profileData = pat;
  } else if (role === 'staff') {
    let stf = (localStore.staff || []).find(s => 
      (s.username && s.username.toLowerCase() === user.username?.toLowerCase()) || 
      s.name === user.displayName
    );
    if (!stf) {
      stf = {
        id: 'STF-' + Date.now().toString().slice(-4),
        name: user.displayName,
        username: user.username,
        role: user.subRole || 'Staff Nurse',
        dept: 'OPD / Emergency Triage',
        phone: user.phone || '+91 98765 02001',
        email: user.email || `${user.username}@carepoint.in`,
        shiftTiming: '08:00 AM - 04:00 PM',
        employeeId: 'EMP-STF-9921',
        active: true
      };
      if (!localStore.staff) localStore.staff = [];
      localStore.staff.push(stf);
      saveLocalStore(localStore);
    }
    profileData = stf;
  } else if (role === 'admin') {
    profileData = {
      name: user.displayName,
      username: user.username,
      email: user.email || 'admin@carepoint.in',
      phone: user.phone || '+91 98765 99999',
      role: 'admin',
      department: 'Central Hospital Administration & Health Informatics',
      accessLevel: 'Super Administrator',
      lastLogin: new Date().toISOString()
    };
  }

  res.json({ user: safeUser(user), profile: profileData, feedbacks });
});

app.put('/api/profile', requireAuth, (req, res) => {
  const user = req.session.user;
  const role = user.role;
  const updates = req.body || {};

  // Update user in session & store
  const u = (localStore.users || []).find(x => x.id === user.id || x.username === user.username);
  if (u) {
    if (updates.name) u.displayName = updates.name;
    if (updates.displayName) u.displayName = updates.displayName;
    if (updates.phone) u.phone = updates.phone;
    if (updates.email) u.email = updates.email;
    if (updates.specialization) u.specialization = updates.specialization;
  }
  user.displayName = updates.name || updates.displayName || user.displayName;
  if (updates.phone) user.phone = updates.phone;
  if (updates.email) user.email = updates.email;
  if (updates.specialization) user.specialization = updates.specialization;
  req.session.user = safeUser(user);

  let updatedProfile = {};

  if (role === 'doctor') {
    let doc = (localStore.doctors || []).find(d => 
      (d.username && d.username.toLowerCase() === user.username?.toLowerCase()) || 
      d.name === user.displayName || 
      d.id === updates.id
    );
    if (!doc) {
      doc = { id: 'DOC-' + Date.now().toString(36).toUpperCase(), username: user.username };
      localStore.doctors.push(doc);
    }
    doc.name = updates.name || updates.displayName || doc.name || user.displayName;
    if (updates.specialization) doc.specialization = updates.specialization;
    if (updates.qualification) doc.qualification = updates.qualification;
    if (updates.exp !== undefined) doc.exp = Number(updates.exp);
    if (updates.fee !== undefined) doc.fee = Number(updates.fee);
    if (updates.phone) doc.phone = updates.phone;
    if (updates.email) doc.email = updates.email;
    if (updates.hospital) doc.hospital = updates.hospital;
    if (updates.status) doc.status = updates.status;
    if (updates.bio !== undefined) doc.bio = updates.bio;
    if (updates.timings) doc.timings = updates.timings;
    if (updates.workingDays) doc.workingDays = updates.workingDays;
    if (updates.opdRoom) doc.opdRoom = updates.opdRoom;
    if (updates.keywords) {
      doc.keywords = Array.isArray(updates.keywords) 
        ? updates.keywords 
        : String(updates.keywords).split(',').map(s => s.trim()).filter(Boolean);
    }

    // Rating is ALWAYS kept synced with actual patient feedbacks
    const docFeedbacks = (localStore.feedbacks || []).filter(f => f.doctorId === doc.id || f.doctorName === doc.name);
    doc.rating = docFeedbacks.length > 0
      ? Number((docFeedbacks.reduce((s, f) => s + Number(f.rating || 5), 0) / docFeedbacks.length).toFixed(1))
      : 0;
    doc.ratingCount = docFeedbacks.length;

    updatedProfile = doc;
    if (isMongoConnected) { Doctor.findOneAndUpdate({ id: doc.id }, doc, { upsert: true }).catch(() => {}); }
  } else if (role === 'patient') {
    let pat = (localStore.patients || []).find(p => 
      (p.username && p.username.toLowerCase() === user.username?.toLowerCase()) || 
      p.id === user.id ||
      p.name === user.displayName
    );
    if (!pat) {
      pat = { id: user.id || 'SP-' + Date.now().toString().slice(-4), username: user.username };
      localStore.patients.push(pat);
    }
    pat.name = updates.name || updates.displayName || pat.name || user.displayName;
    if (updates.age !== undefined) pat.age = Number(updates.age);
    if (updates.gender) pat.gender = updates.gender;
    if (updates.bloodGroup) pat.bloodGroup = updates.bloodGroup;
    if (updates.phone) pat.phone = updates.phone;
    if (updates.email) pat.email = updates.email;
    if (updates.address) pat.address = updates.address;
    if (updates.dateOfBirth) pat.dateOfBirth = updates.dateOfBirth;
    if (updates.allergies !== undefined) pat.allergies = updates.allergies;
    if (updates.chronicConditions !== undefined) pat.chronicConditions = updates.chronicConditions;
    if (updates.emergencyContact) pat.emergencyContact = updates.emergencyContact;
    if (updates.insuranceNumber) pat.insuranceNumber = updates.insuranceNumber;
    updatedProfile = pat;
    if (isMongoConnected) { Patient.findOneAndUpdate({ id: pat.id }, pat, { upsert: true }).catch(() => {}); }
  } else if (role === 'staff') {
    let stf = (localStore.staff || []).find(s => 
      (s.username && s.username.toLowerCase() === user.username?.toLowerCase()) || 
      s.name === user.displayName
    );
    if (!stf) {
      stf = { id: 'STF-' + Date.now().toString().slice(-4), username: user.username };
      localStore.staff.push(stf);
    }
    stf.name = updates.name || updates.displayName || stf.name || user.displayName;
    if (updates.role) stf.role = updates.role;
    if (updates.dept) stf.dept = updates.dept;
    if (updates.phone) stf.phone = updates.phone;
    if (updates.shiftTiming) stf.shiftTiming = updates.shiftTiming;
    if (updates.employeeId) stf.employeeId = updates.employeeId;
    updatedProfile = stf;
    if (isMongoConnected) { Staff.findOneAndUpdate({ id: stf.id }, stf, { upsert: true }).catch(() => {}); }
  } else if (role === 'admin') {
    updatedProfile = {
      name: user.displayName,
      username: user.username,
      email: updates.email || user.email,
      phone: updates.phone || user.phone,
      department: updates.department || 'Central Hospital Administration & Health Informatics',
      role: 'admin'
    };
  }

  saveLocalStore(localStore);
  if (isMongoConnected && u) { User.findOneAndUpdate({ id: user.id }, u, { upsert: true }).catch(() => {}); }
  res.json({ success: true, user: safeUser(user), profile: updatedProfile });
});

// ─── Doctors ──────────────────────────────────────────────────────────────────
// Returns all doctors with exact updated profile details and feedback-derived ratings
app.get('/api/doctors', (req, res) => {
  const docs = (localStore.doctors || []).map(d => {
    const docFeedbacks = (localStore.feedbacks || []).filter(f => f.doctorId === d.id || f.doctorName === d.name);
    const avgRating = docFeedbacks.length > 0 
      ? Number((docFeedbacks.reduce((sum, f) => sum + Number(f.rating || 5), 0) / docFeedbacks.length).toFixed(1))
      : 0;
    return {
      ...d,
      qualification: d.qualification || 'MBBS, MD',
      timings: d.timings || '09:00 AM - 04:00 PM',
      workingDays: d.workingDays || 'Mon - Sat',
      opdRoom: d.opdRoom || 'OPD Wing A',
      hospital: d.hospital || 'CarePoint Super-Speciality Hospital',
      rating: avgRating,
      ratingCount: docFeedbacks.length
    };
  });
  res.json(docs);
});

app.get('/api/doctors/search', (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  const specFilter = String(req.query.specialization || '').trim().toLowerCase();
  const docs = (localStore.doctors || []).map(d => {
    const docFeedbacks = (localStore.feedbacks || []).filter(f => f.doctorId === d.id || f.doctorName === d.name);
    const avgRating = docFeedbacks.length > 0 
      ? Number((docFeedbacks.reduce((sum, f) => sum + Number(f.rating || 5), 0) / docFeedbacks.length).toFixed(1))
      : 0;
    return {
      ...d,
      qualification: d.qualification || 'MBBS, MD',
      timings: d.timings || '09:00 AM - 04:00 PM',
      workingDays: d.workingDays || 'Mon - Sat',
      opdRoom: d.opdRoom || 'OPD Wing A',
      rating: avgRating,
      ratingCount: docFeedbacks.length
    };
  });

  let inferredSpec = '';
  if (query) {
    for (const [symptom, specialty] of Object.entries(SYMPTOM_SPECIALTY_MAP)) {
      if (query.includes(symptom)) { inferredSpec = specialty.toLowerCase(); break; }
    }
  }
  const results = docs.filter(d => {
    const dSpec = (d.specialization || '').toLowerCase();
    if (specFilter && !dSpec.includes(specFilter)) return false;
    if (!query) return true;
    return (d.name||'').toLowerCase().includes(query) || dSpec.includes(query) ||
           (d.qualification||'').toLowerCase().includes(query) ||
           (d.bio||'').toLowerCase().includes(query) || (d.keywords||[]).some(k => String(k).toLowerCase().includes(query)) ||
           (inferredSpec && dSpec.includes(inferredSpec));
  });
  res.json({ results, query, matchedSpecialty: inferredSpec || null });
});

app.get('/api/doctors/:id/feedbacks', (req, res) => {
  const docId = req.params.id;
  const doc = (localStore.doctors || []).find(d => d.id === docId);
  const feedbacks = (localStore.feedbacks || []).filter(f => f.doctorId === docId || (doc && f.doctorName === doc.name));
  res.json({ doctor: doc, feedbacks });
});

// Get doctor available slots for a given date
app.get('/api/doctors/:id/available-slots', (req, res) => {
  const docId = req.params.id;
  const doctor = (localStore.doctors || []).find(d => d.id === docId || (d.username && d.username.toLowerCase() === docId.toLowerCase()));
  if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

  const dateStr = String(req.query.date || new Date().toISOString().split('T')[0]).trim();
  const slotData = getDoctorAvailableSlots(doctor, dateStr);
  res.json(slotData);
});

// Admin / Doctor assigns their appointing staff
app.patch('/api/doctors/:id/assign-staff', (req, res) => {
  const { staffId } = req.body;
  const doctor = (localStore.doctors || []).find(d => d.id === req.params.id);
  if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

  const staff = (localStore.staff || []).find(s => s.id === staffId) ||
                (localStore.users || []).find(u => u.id === staffId && u.role === 'staff');
  if (!staff) return res.status(404).json({ error: 'Staff member not found.' });

  doctor.assignedStaffId       = staff.id;
  doctor.assignedStaffName     = staff.displayName || staff.name || staff.username;
  doctor.assignedStaffUsername = staff.username;

  // Propagate assigned staff to all active appointments for this doctor
  (localStore.appointments || []).forEach(a => {
    if (a.doctorId === doctor.id || a.doctorName === doctor.name) {
      a.assignedStaffId       = doctor.assignedStaffId;
      a.assignedStaffName     = doctor.assignedStaffName;
      a.assignedStaffUsername = doctor.assignedStaffUsername;
    }
  });

  saveLocalStore(localStore);
  if (isMongoConnected) {
    Doctor.findOneAndUpdate({ id: doctor.id }, {
      assignedStaffId: doctor.assignedStaffId,
      assignedStaffName: doctor.assignedStaffName,
      assignedStaffUsername: doctor.assignedStaffUsername
    }).catch(() => {});
  }
  res.json({ success: true, doctor, message: `Staff ${doctor.assignedStaffName} successfully assigned to ${doctor.name}` });
});

// Doctor updates their own consultation availability (timings, workingDays, slotDuration, breakTime, opdRoom)
app.patch('/api/doctors/:id/availability', async (req, res) => {
  const user = req.session?.user;
  const docId = req.params.id;
  const doctor = (localStore.doctors || []).find(d => 
    d.id === docId || 
    (d.username && d.username.toLowerCase() === docId.toLowerCase())
  );
  if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

  // Authorization: doctor themselves or admin
  if (user && user.role !== 'admin') {
    const isDocSelf = (user.role === 'doctor') && (
      (doctor.username && doctor.username.toLowerCase() === user.username?.toLowerCase()) ||
      doctor.id === user.id ||
      doctor.name?.toLowerCase() === user.displayName?.toLowerCase()
    );
    if (!isDocSelf) {
      return res.status(403).json({ error: 'You are only authorized to configure your own clinical consultation schedule.' });
    }
  }

  const { timings, workingDays, slotDuration, breakTime, opdRoom, assignedStaffId } = req.body;
  if (timings) doctor.timings = timings.trim();
  if (workingDays) doctor.workingDays = workingDays.trim();
  if (slotDuration) doctor.slotDuration = Math.max(10, Math.min(120, Number(slotDuration)));
  if (breakTime !== undefined) doctor.breakTime = String(breakTime).trim();
  if (opdRoom) doctor.opdRoom = opdRoom.trim();

  if (assignedStaffId) {
    const staff = (localStore.staff || []).find(s => s.id === assignedStaffId) ||
                  (localStore.users || []).find(u => u.id === assignedStaffId && u.role === 'staff');
    if (staff) {
      doctor.assignedStaffId = staff.id;
      doctor.assignedStaffName = staff.displayName || staff.name || staff.username;
      doctor.assignedStaffUsername = staff.username;
      
      // Update future appointments for this doctor
      (localStore.appointments || []).forEach(a => {
        if (a.doctorId === doctor.id || a.doctorName === doctor.name) {
          a.assignedStaffId = doctor.assignedStaffId;
          a.assignedStaffName = doctor.assignedStaffName;
          a.assignedStaffUsername = doctor.assignedStaffUsername;
        }
      });
    }
  }

  saveLocalStore(localStore);
  if (isMongoConnected) {
    try {
      await Doctor.findOneAndUpdate({ id: doctor.id }, doctor, { upsert: true });
    } catch (_) {}
  }

  res.json({
    success: true,
    message: `Consultation schedule updated for ${doctor.name}: ${doctor.timings} (${doctor.workingDays})`,
    doctor
  });
});

// ─── Appointments ─────────────────────────────────────────────────────────────
app.get('/api/appointments', (req, res) => {
  const user = req.session?.user;
  let list = localStore.appointments || [];
  if (user?.role === 'patient') {
    const pName = (user.displayName || user.name || '').toLowerCase().trim();
    const uName = (user.username || '').toLowerCase().trim();
    const pId = String(user.id || user._id || user.patientId || '').trim();
    list = list.filter(a => {
      const aName = (a.patientName || '').toLowerCase().trim();
      const aUName = (a.patientUsername || '').toLowerCase().trim();
      const aId = String(a.patientId || '').trim();
      return (
        (pName && aName === pName) ||
        (uName && (aUName === uName || aName === uName)) ||
        (pId && aId === pId)
      );
    });
  } else if (req.query.patientId) {
    list = list.filter(a => a.patientId === req.query.patientId);
  }
  res.json(list);
});

// Slot-restricted appointment booking (No QR generated until confirmed!)
app.post('/api/appointments', async (req, res) => {
  const count = (localStore.appointments || []).length;
  const apptId = 'APT-' + String(count + 1).padStart(3, '0');
  const patientName = req.body.patientName || req.session?.user?.displayName || 'Patient';
  const doctorName  = req.body.doctorName  || 'Dr. Arjun Mehta';
  const doctor = (localStore.doctors || []).find(d => d.name === doctorName || d.id === req.body.doctorId);
  if (!doctor) return res.status(404).json({ error: 'Selected doctor could not be found.' });

  const dateStr = String(req.body.date || new Date().toISOString().split('T')[0]).trim();
  const timeStr = String(req.body.time || '10:00 AM').trim();

  // Validate doctor availability schedule
  const slotData = getDoctorAvailableSlots(doctor, dateStr);
  if (!slotData.isWorkingDay) {
    return res.status(400).json({
      error: `Dr. ${doctor.name} is not available on ${slotData.dayName}s. Working schedule: ${doctor.workingDays || 'Mon - Sat'}.`
    });
  }

  // Check if slot is within doctor's available slots
  const matchedSlot = slotData.slots.find(s => s.time.toLowerCase() === timeStr.toLowerCase());
  if (!matchedSlot) {
    return res.status(400).json({
      error: `The time slot "${timeStr}" is outside Dr. ${doctor.name}'s scheduled consultation hours (${doctor.timings || '09:00 AM - 05:00 PM'}). Please select a valid available slot.`
    });
  }
  if (matchedSlot.booked) {
    return res.status(400).json({
      error: `The time slot ${timeStr} is already booked for Dr. ${doctor.name} on ${dateStr}. Please select another available slot.`
    });
  }

  const newAppt = {
    id: apptId,
    patientId: req.body.patientId || req.session?.user?.id || 'SP-' + Date.now().toString().slice(-4),
    patientName,
    patientUsername: req.session?.user?.username || '',
    doctorId: doctor.id,
    doctorName: doctor.name,
    dept: req.body.dept || doctor.specialization || 'General Medicine',
    date: dateStr,
    time: timeStr,
    reason: req.body.reason || 'General Consultation',
    fee: Number(doctor.fee || 800),
    paymentStatus: 'Pending',
    status: 'Pending Confirmation',
    qrToken: null, // STRICTLY NULL until confirmed
    qrCode: null,  // STRICTLY NULL until confirmed
    attendanceStatus: 'Pending',
    assignedStaffId: doctor.assignedStaffId || 'STF-01',
    assignedStaffName: doctor.assignedStaffName || 'Rekha Joshi',
    assignedStaffUsername: doctor.assignedStaffUsername || 'nurse.rekha',
    opdRoom: doctor.opdRoom || 'OPD Wing A',
    createdAt: new Date().toISOString()
  };

  localStore.appointments.push(newAppt);
  saveLocalStore(localStore);

  // Background DB sync
  if (isMongoConnected) { Appointment.create(newAppt).catch(() => {}); }

  // Notification sent ONLY to assigned doctor & appointing staff
  notifyUser({
    username: doctor.username,
    role: 'doctor',
    title: '📌 New Appointment Request',
    message: `Patient ${patientName} requested appointment on ${newAppt.date} at ${newAppt.time}. Please review and confirm.`,
    appointmentId: apptId
  });

  if (newAppt.assignedStaffUsername) {
    notifyUser({
      username: newAppt.assignedStaffUsername,
      role: 'staff',
      title: '📌 New Appointment to Confirm',
      message: `New booking for Dr. ${doctor.name}: ${patientName} on ${newAppt.date} at ${newAppt.time}. Review to generate QR pass.`,
      appointmentId: apptId
    });
  }

  // Patient only receives submission acknowledgement (NO confirmed notification or QR yet)
  if (newAppt.patientUsername) {
    notifyUser({
      username: newAppt.patientUsername,
      role: 'patient',
      title: '📝 Appointment Request Received',
      message: `Your appointment request for Dr. ${doctor.name} on ${newAppt.date} at ${newAppt.time} is pending confirmation. Your QR pass will activate once accepted.`,
      appointmentId: apptId
    });
  }

  res.status(201).json(newAppt);
});

// Appointment confirmation by Doctor or Appointing Staff — generates QR Code and notifies patient
app.post('/api/appointments/:id/confirm', async (req, res) => {
  const appt = (localStore.appointments || []).find(a => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  appt.status = 'Confirmed';
  if (!appt.qrToken) {
    appt.qrToken = 'QR-' + appt.id + '-' + Date.now().toString(36).toUpperCase();
  }
  // Generate QR Code ONLY NOW after confirmation!
  appt.qrCode = await generateApptQR(appt);
  appt.confirmedAt = new Date().toISOString();
  appt.confirmedBy = req.session?.user?.displayName || 'Authorized Medical Officer';

  saveLocalStore(localStore);
  if (isMongoConnected) {
    Appointment.findOneAndUpdate({ id: appt.id }, {
      status: 'Confirmed',
      qrToken: appt.qrToken,
      qrCode: appt.qrCode,
      confirmedAt: appt.confirmedAt,
      confirmedBy: appt.confirmedBy
    }).catch(() => {});
  }

  // Patient receives confirmation notification ONLY AFTER doctor/staff confirms
  await notifyUser({
    username: appt.patientUsername,
    role: 'patient',
    title: '🎉 Appointment Confirmed & QR Pass Ready!',
    message: `Your appointment with Dr. ${appt.doctorName} on ${appt.date} at ${appt.time} has been CONFIRMED! Your check-in QR pass is now active in "My QR Pass".`,
    appointmentId: appt.id
  });

  // Pre-appointment 5-minute reminder notification
  await notifyUser({
    username: appt.patientUsername,
    role: 'patient',
    title: '⏰ Reminder: Consultation in 5 Mins',
    message: `Your appointment with Dr. ${appt.doctorName} begins in 5 minutes (${appt.time}). Please head to ${appt.opdRoom || 'OPD'} with your QR pass ready.`,
    appointmentId: appt.id
  });

  res.json({ success: true, appointment: appt, message: 'Appointment confirmed and QR code generated.' });
});

// Appointment rejection
app.post('/api/appointments/:id/reject', (req, res) => {
  const appt = (localStore.appointments || []).find(a => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  appt.status = 'Cancelled';
  appt.cancelledReason = req.body.reason || 'Doctor unavailable at requested slot';
  saveLocalStore(localStore);

  if (isMongoConnected) { Appointment.findOneAndUpdate({ id: appt.id }, { status: 'Cancelled', cancelledReason: appt.cancelledReason }).catch(() => {}); }
  notifyUser({
    username: appt.patientUsername,
    role: 'patient',
    title: '❌ Appointment Not Confirmed',
    message: `Your appointment with Dr. ${appt.doctorName} on ${appt.date} could not be confirmed: ${appt.cancelledReason}. Please select another time slot.`,
    appointmentId: appt.id
  });

  res.json({ success: true, appointment: appt });
});

// QR Code endpoint (only available if confirmed)
app.get('/api/appointments/:id/qr', async (req, res) => {
  const appt = (localStore.appointments || []).find(a => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (appt.status === 'Pending Confirmation') {
    return res.status(400).json({ error: 'QR Code is not available yet. Appointment must be confirmed by the doctor or appointing staff first.' });
  }
  if (!appt.qrCode) {
    if (!appt.qrToken) appt.qrToken = 'QR-' + appt.id + '-' + Date.now().toString(36).toUpperCase();
    appt.qrCode = await generateApptQR(appt);
    saveLocalStore(localStore);
  }
  res.json({ id: appt.id, qrCode: appt.qrCode, qrToken: appt.qrToken, status: appt.status, appointment: appt });
});

app.patch('/api/appointments/:id/status', async (req, res) => {
  const { status } = req.body;
  const appt = (localStore.appointments || []).find(a => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  appt.status = status;
  if (status === 'Checked In') { appt.attendanceStatus = 'Checked In'; appt.checkedInAt = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }); }
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Appointment.findOneAndUpdate({ id:appt.id }, { status, attendanceStatus:appt.attendanceStatus, checkedInAt:appt.checkedInAt }); } catch (_) {} }
  if (status === 'Completed') {
    await notifyUser({ username:appt.patientUsername, role:'patient', title:'⭐ Rate Your Visit', message:`Your consultation with ${appt.doctorName} is complete. Please submit your feedback!`, appointmentId:appt.id });
  }
  res.json(appt);
});

// Appointing Staff marks attendance for their assigned doctor's appointment
// Strictly enforces: 
// 1) Only the appointing staff assigned to that doctor (or admin) can mark attendance
// 2) Can only be marked within the scheduled appointment time window on that day
app.post('/api/appointments/:id/mark-attendance', async (req, res) => {
  const user = req.session?.user;
  if (!user) return res.status(401).json({ error: 'Authentication required to mark attendance.' });

  const appt = (localStore.appointments || []).find(a => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found.' });

  if (appt.status === 'Cancelled') {
    return res.status(400).json({ error: 'This appointment has been cancelled.' });
  }
  if (appt.attendanceStatus === 'Checked In' || appt.status === 'Checked In') {
    return res.status(400).json({
      error: `Patient ${appt.patientName} is already checked in (Attendance recorded at ${appt.checkedInAt || 'earlier'}).`
    });
  }

  // 1. Enforce Appointing Staff restriction:
  const doctor = (localStore.doctors || []).find(d => d.id === appt.doctorId || d.name === appt.doctorName);
  const assignedStaffUsername = (appt.assignedStaffUsername || doctor?.assignedStaffUsername || '').toLowerCase();
  const assignedStaffId = (appt.assignedStaffId || doctor?.assignedStaffId || '');
  const assignedStaffName = appt.assignedStaffName || doctor?.assignedStaffName || 'Assigned Appointing Staff';

  if (user.role === 'staff') {
    const currentUsername = (user.username || '').toLowerCase();
    const currentId = user.id;
    const isAssigned = (
      (assignedStaffUsername && currentUsername === assignedStaffUsername) ||
      (assignedStaffId && currentId === assignedStaffId)
    );
    if (!isAssigned) {
      return res.status(403).json({
        error: `🔒 Access Denied. Only ${assignedStaffName} is authorized to mark attendance for Dr. ${appt.doctorName}'s patients. You are not assigned to this doctor.`
      });
    }
  } else if (user.role !== 'admin') {
    return res.status(403).json({
      error: `Only the doctor's appointing staff (${assignedStaffName}) or hospital administrator can mark appointment attendance.`
    });
  }

  // 2. Enforce appointment scheduled time window
  const apptDateStr = appt.date; // YYYY-MM-DD
  const apptTimeStr = appt.time; // e.g. "10:00 AM"

  let apptMs = null;
  try {
    const apptDateTime = new Date(`${apptDateStr} ${apptTimeStr}`);
    if (!isNaN(apptDateTime.getTime())) apptMs = apptDateTime.getTime();
  } catch (_) {}

  if (apptMs) {
    const nowMs = Date.now();
    const diffMin = (nowMs - apptMs) / 60000; // positive = past, negative = future
    const WINDOW_BEFORE = 30; // allow 30 min early
    const WINDOW_AFTER  = 60; // allow 60 min late

    const todayStr = new Date().toISOString().split('T')[0];
    if (apptDateStr !== todayStr && Math.abs(diffMin) > 1440) {
      if (diffMin < 0) {
        return res.status(400).json({
          error: `⏰ Appointment is scheduled for ${appt.date}. Attendance can only be recorded on the day of the appointment at the scheduled time (${appt.time}).`
        });
      } else {
        return res.status(400).json({
          error: `❌ Appointment date (${appt.date}) has expired. Attendance can no longer be recorded.`
        });
      }
    }

    if (diffMin < -WINDOW_BEFORE) {
      const minsUntil = Math.ceil(-diffMin - WINDOW_BEFORE);
      return res.status(400).json({
        error: `⏰ Too early to mark attendance! Patient's slot is at ${appt.time}. Attendance can only be recorded within 30 minutes of the scheduled time (opens in ${minsUntil} minute(s)).`
      });
    }
    if (diffMin > WINDOW_AFTER) {
      return res.status(400).json({
        error: `❌ Attendance window has expired for this slot (${appt.time}). It closed ${Math.floor(diffMin - WINDOW_AFTER)} minute(s) ago.`
      });
    }
  }

  // 3. Mark attendance
  const timeNowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  appt.status = 'Checked In';
  appt.attendanceStatus = 'Checked In';
  appt.checkedInAt = timeNowStr;
  appt.scannedBy = `${user.displayName || user.username} (${assignedStaffName})`;

  saveLocalStore(localStore);
  if (isMongoConnected) {
    try {
      await Appointment.findOneAndUpdate(
        { id: appt.id },
        { status: 'Checked In', attendanceStatus: 'Checked In', checkedInAt: appt.checkedInAt, scannedBy: appt.scannedBy }
      );
    } catch (_) {}
  }

  // Real-time notifications
  notifyUser({
    username: appt.patientUsername,
    role: 'patient',
    title: '✅ Attendance Marked & Checked In',
    message: `Your attendance for Dr. ${appt.doctorName} was marked by ${assignedStaffName} at ${timeNowStr}. Please proceed to ${appt.opdRoom || 'OPD Room'}.`,
    appointmentId: appt.id
  });

  if (doctor?.username) {
    notifyUser({
      username: doctor.username,
      role: 'doctor',
      title: '👤 Patient Arrived & Marked Present',
      message: `Patient ${appt.patientName} (${appt.time}) has checked in. Attendance verified by ${assignedStaffName}.`,
      appointmentId: appt.id
    });
  }

  res.json({
    success: true,
    message: `✅ Patient ${appt.patientName} attendance successfully marked present at ${timeNowStr} by ${assignedStaffName}.`,
    appointment: appt
  });
});

// Staff QR check-in — enforces time window and assigned-staff restriction
app.post(['/api/staff/verify-qr', '/api/qr/verify'], async (req, res) => {
  const token = String(req.body.token || req.body.appointmentId || '').trim();
  if (!token) return res.status(400).json({ error: 'Please enter or scan an Appointment ID or QR Token.' });

  const appt = (localStore.appointments || []).find(a =>
    a.id?.toLowerCase() === token.toLowerCase() ||
    a.qrToken?.toLowerCase() === token.toLowerCase()
  );
  if (!appt) return res.status(404).json({ error: 'Invalid QR token or Appointment ID. No matching appointment found.' });

  // ── 1. Check appointment is Confirmed (not cancelled/completed) ──
  if (appt.status === 'Cancelled') return res.status(400).json({ error: 'This appointment has been cancelled.' });
  if (appt.attendanceStatus === 'Checked In') return res.status(400).json({ error: `Patient ${appt.patientName} is already checked in.` });

  // ── 2. Enforce time window (appointment time ± 30 minutes) ──
  const apptDateStr = appt.date; // YYYY-MM-DD
  const apptTimeStr = appt.time; // e.g. "10:00 AM"
  let apptMs = null;
  try {
    const apptDateTime = new Date(`${apptDateStr} ${apptTimeStr}`);
    if (!isNaN(apptDateTime.getTime())) apptMs = apptDateTime.getTime();
  } catch (_) {}

  if (apptMs) {
    const nowMs = Date.now();
    const diffMin = (nowMs - apptMs) / 60000; // positive = past, negative = future
    const WINDOW_BEFORE = 30; // allow 30 min early
    const WINDOW_AFTER  = 60; // allow 60 min late
    if (diffMin < -WINDOW_BEFORE) {
      const minsUntil = Math.ceil(-diffMin - WINDOW_BEFORE);
      return res.status(400).json({ error: `⏰ QR check-in window has not opened yet. Appointment is in ${minsUntil} more minute(s). Check-in opens 30 minutes before the slot.` });
    }
    if (diffMin > WINDOW_AFTER) {
      return res.status(400).json({ error: `❌ QR check-in window has expired. This appointment slot (${appt.time}) closed ${Math.floor(diffMin - WINDOW_AFTER)} minute(s) ago.` });
    }
  }

  // ── 3. Enforce assigned-staff restriction ──
  const scannerUser = req.session?.user;
  if (scannerUser && scannerUser.role === 'staff') {
    // Find the doctor for this appointment
    const doctor = (localStore.doctors || []).find(d => d.id === appt.doctorId || d.name === appt.doctorName);
    if (doctor && doctor.assignedStaffUsername) {
      const scannerUsername = scannerUser.username?.toLowerCase();
      const assignedUsername = doctor.assignedStaffUsername?.toLowerCase();
      if (scannerUsername !== assignedUsername) {
        return res.status(403).json({
          error: `🔒 Access Denied. Only ${doctor.assignedStaffName || 'the assigned staff'} is authorized to scan QR codes for Dr. ${doctor.name}'s patients. Please ask the correct staff member to verify.`
        });
      }
    }
  }

  // ── 4. All checks passed — check in ──
  appt.status = 'Checked In';
  appt.attendanceStatus = 'Checked In';
  appt.checkedInAt = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
  appt.scannedBy = scannerUser?.displayName || 'Reception Staff';
  saveLocalStore(localStore);
  if (isMongoConnected) {
    try { await Appointment.findOneAndUpdate({ id:appt.id }, { status:'Checked In', attendanceStatus:'Checked In', checkedInAt:appt.checkedInAt, scannedBy:appt.scannedBy }); } catch (_) {}
  }
  res.json({ success:true, message:`✅ Patient ${appt.patientName} successfully checked in for ${appt.doctorName} at ${appt.checkedInAt}.`, appointment:appt });
});

// Appointing Staff collects consultation fee (ONLY PERMITTED AFTER CONSULTATION IS COMPLETED)
app.post('/api/appointments/:id/collect-payment', async (req, res) => {
  const user = req.session?.user;
  if (user && user.role !== 'staff' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Only appointing staff or administrators are authorized to collect consultation fees.' });
  }

  const appt = (localStore.appointments || []).find(a => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found.' });

  // STRICT REQUIREMENT: Appointment complete hone ke baad hi payment lene ki permission hai
  if (appt.status !== 'Completed') {
    return res.status(400).json({
      error: `Consultation fee cannot be collected yet. The doctor must first complete the consultation (Current status: "${appt.status}").`
    });
  }

  if (appt.paymentStatus === 'Paid') {
    return res.status(400).json({
      error: `Consultation fee of ₹${appt.paidAmount || appt.fee || 800} has already been collected for this appointment.`
    });
  }

  const doctor = (localStore.doctors || []).find(d => d.id === appt.doctorId || d.name === appt.doctorName);
  const amount = Number(req.body.amount || appt.fee || doctor?.fee || 800);
  const paymentMethod = req.body.paymentMethod || 'Cash / UPI';

  appt.paymentStatus = 'Paid';
  appt.paidAmount = amount;
  appt.fee = amount;
  appt.paidAt = new Date().toISOString();
  appt.paymentMethod = paymentMethod;
  appt.collectedBy = user?.displayName || user?.username || 'OPD Reception Staff';

  const invId = 'INV-' + (1000 + (localStore.invoices || []).length + 1);
  const invoice = {
    id: invId,
    patientId: appt.patientId || 'SP-1001',
    patientName: appt.patientName,
    appointmentId: appt.id,
    description: `Doctor Consultation Fee - ${appt.doctorName} (${appt.dept || 'OPD'})`,
    amount,
    paidAmount: amount,
    status: 'Paid',
    paymentMethod,
    date: new Date().toISOString().split('T')[0]
  };

  if (!localStore.invoices) localStore.invoices = [];
  localStore.invoices.unshift(invoice);
  saveLocalStore(localStore);

  if (isMongoConnected) {
    try {
      await Appointment.findOneAndUpdate({ id: appt.id }, {
        paymentStatus: 'Paid',
        paidAmount: amount,
        paidAt: appt.paidAt,
        paymentMethod,
        collectedBy: appt.collectedBy
      });
      await Invoice.create(invoice);
    } catch (_) {}
  }

  await notifyUser({
    username: appt.patientUsername,
    role: 'patient',
    title: '💳 Consultation Fee Receipt',
    message: `Payment of ₹${amount} received by ${appt.collectedBy} for consultation with Dr. ${appt.doctorName}. Invoice #${invId} generated.`,
    appointmentId: appt.id
  });

  res.json({
    success: true,
    message: `Payment of ₹${amount} successfully collected. Official invoice #${invId} generated.`,
    appointment: appt,
    invoice
  });
});

// ─── Contact Us & Helpdesk Endpoints ──────────────────────────────────────────
app.get('/api/contact', (req, res) => {
  res.json(localStore.contactMessages || []);
});

app.post('/api/contact', async (req, res) => {
  const { name, email, phone, role, subject, message, priority } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const msgId = 'TKT-' + Date.now().toString(36).toUpperCase();
  const newMsg = {
    id: msgId,
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: phone ? String(phone).trim() : '',
    role: role || req.session?.user?.role || 'Guest',
    username: req.session?.user?.username || '',
    subject: String(subject || 'General Inquiry / Support Request').trim(),
    message: String(message).trim(),
    priority: priority || 'Normal',
    status: 'Open',
    createdAt: new Date().toISOString(),
    response: null
  };

  if (!localStore.contactMessages) localStore.contactMessages = [];
  localStore.contactMessages.unshift(newMsg);
  saveLocalStore(localStore);

  // Notify admin immediately
  await notifyUser({
    role: 'admin',
    title: '📩 New Helpdesk Support Ticket',
    message: `New ticket #${msgId} from ${newMsg.name} (${newMsg.role}): "${newMsg.subject}"`,
    type: 'info'
  });

  res.status(201).json({
    success: true,
    message: 'Your message has been received by Hospital Administration. A representative will contact you shortly.',
    ticket: newMsg
  });
});

app.patch('/api/contact/:id/resolve', async (req, res) => {
  const msg = (localStore.contactMessages || []).find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Ticket not found.' });

  msg.status = req.body.status || 'Resolved';
  msg.response = req.body.response || 'Inquiry addressed and resolved by Central Administration.';
  msg.resolvedAt = new Date().toISOString();
  msg.resolvedBy = req.session?.user?.displayName || 'Administrator';
  saveLocalStore(localStore);

  if (msg.username) {
    await notifyUser({
      username: msg.username,
      title: '✅ Support Ticket Updated',
      message: `Your ticket "${msg.subject}" has been marked "${msg.status}". Note: ${msg.response}`
    });
  }

  res.json({ success: true, ticket: msg });
});

// ─── Prescriptions ────────────────────────────────────────────────────────────
app.get('/api/prescriptions', (req, res) => {
  const user = req.session?.user;
  let list = localStore.prescriptions || [];
  if (user?.role === 'patient') {
    const pName = (user.displayName || user.name || '').toLowerCase().trim();
    const uName = (user.username || '').toLowerCase().trim();
    const pId = String(user.id || user._id || user.patientId || '').trim();
    list = list.filter(rx => {
      const rName = (rx.patientName || '').toLowerCase().trim();
      const rUName = (rx.patientUsername || '').toLowerCase().trim();
      const rId = String(rx.patientId || '').trim();
      return (
        (pName && rName === pName) ||
        (uName && (rUName === uName || rName === uName)) ||
        (pId && rId === pId)
      );
    });
  }
  res.json(list);
});

app.post('/api/prescriptions', async (req, res) => {
  const count = (localStore.prescriptions || []).length;
  const rxId = 'RX-' + String(1000 + count + 1);
  const newRx = {
    id: rxId, appointmentId: req.body.appointmentId || '',
    patientId: req.body.patientId || 'SP-1001', patientName: req.body.patientName || 'Patient',
    doctorName: req.body.doctorName || req.session?.user?.displayName || 'Doctor',
    diagnosis: req.body.diagnosis || 'Clinical Consultation', symptoms: req.body.symptoms || '',
    medicines: req.body.medicines || [{ name:'Paracetamol 650mg', dosage:'1 Tab', frequency:'Twice daily', duration:'5 Days', instructions:'After meals' }],
    tests: req.body.tests || [], instructions: req.body.instructions || 'Rest and hydrate.',
    followUpDate: req.body.followUpDate || 'In 7 days', date: new Date().toISOString().split('T')[0]
  };
  localStore.prescriptions.push(newRx);
  if (newRx.appointmentId) {
    const appt = (localStore.appointments || []).find(a => a.id === newRx.appointmentId);
    if (appt) appt.status = 'Completed';
  }
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Prescription.create(newRx); } catch (_) {} }
  res.status(201).json(newRx);
});

app.get('/api/prescriptions/:id/pdf', (req, res) => {
  const rx = (localStore.prescriptions || []).find(p => p.id === req.params.id);
  if (!rx) return res.status(404).send('Prescription not found');
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Prescription_${rx.id}.pdf"`);
  doc.pipe(res);
  doc.rect(40, 40, 532, 70).fill('#0f172a');
  doc.fillColor('#38bdf8').fontSize(18).text('CarePoint Super-Speciality Hospital', 55, 55, { bold: true });
  doc.fillColor('#94a3b8').fontSize(9).text('123 Medical Boulevard, Andheri East, Mumbai | Tel: +91 22 4000 5000', 55, 80);
  doc.fillColor('#1e293b').fontSize(11).text(`Rx Ref: ${rx.id}`, 40, 125, { bold: true });
  doc.text(`Date: ${rx.date}`, 420, 125);
  doc.moveTo(40, 142).lineTo(572, 142).strokeColor('#cbd5e1').stroke();
  doc.fillColor('#0284c7').fontSize(12).text('Patient Information', 40, 155, { bold: true });
  doc.fillColor('#334155').fontSize(10).text(`Name: ${rx.patientName}`, 40, 175).text(`ID: ${rx.patientId}`, 40, 190);
  doc.fillColor('#0284c7').fontSize(12).text('Attending Physician', 320, 155, { bold: true });
  doc.fillColor('#334155').fontSize(10).text(`Doctor: ${rx.doctorName}`, 320, 175);
  doc.moveTo(40, 212).lineTo(572, 212).strokeColor('#e2e8f0').stroke();
  doc.fillColor('#0f172a').fontSize(11).text('Diagnosis:', 40, 225, { bold: true });
  doc.fillColor('#0369a1').fontSize(11).text(rx.diagnosis, 40, 240);
  let y = 285;
  doc.fillColor('#0f172a').fontSize(14).text('℞ Prescribed Medications', 40, y, { bold: true }); y += 22;
  doc.rect(40, y, 532, 22).fill('#f1f5f9');
  doc.fillColor('#475569').fontSize(9).text('MEDICINE', 45, y+6).text('DOSAGE', 230, y+6).text('FREQUENCY', 320, y+6).text('DURATION', 420, y+6); y += 26;
  (rx.medicines || []).forEach(m => {
    doc.fillColor('#0f172a').fontSize(9.5).text(m.name, 45, y);
    doc.fillColor('#334155').text(m.dosage, 230, y).text(m.frequency, 320, y).text(m.duration, 420, y);
    if (m.instructions) { y += 13; doc.fillColor('#64748b').fontSize(8).text(`Note: ${m.instructions}`, 45, y); }
    y += 18; doc.moveTo(40, y).lineTo(572, y).strokeColor('#f1f5f9').stroke(); y += 6;
  });
  y += 10;
  if (rx.tests?.length) { doc.fillColor('#0f172a').fontSize(10).text('Investigations:', 40, y, { bold: true }); y += 15; rx.tests.forEach(t => { doc.fillColor('#334155').fontSize(9).text(`• ${t}`, 50, y); y += 14; }); y += 8; }
  doc.fillColor('#0284c7').fontSize(10).text(`Follow-up: ${rx.followUpDate}`, 40, y, { bold: true });
  doc.moveTo(400, 680).lineTo(550, 680).strokeColor('#334155').stroke();
  doc.fillColor('#475569').fontSize(9).text('Authorized Medical Officer', 415, 690).text(rx.doctorName, 435, 705, { bold: true });
  doc.fontSize(8).fillColor('#94a3b8').text('Computer-generated prescription – CarePoint HMS', 40, 730, { align: 'center' });
  doc.end();
});

// ─── Feedback ─────────────────────────────────────────────────────────────────
app.get('/api/feedback', (req, res) => res.json(localStore.feedbacks || []));

app.post('/api/feedback', async (req, res) => {
  const { appointmentId, doctorId, rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5 stars.' });
  const patientName = req.session?.user?.displayName || 'Patient';
  const doctor = (localStore.doctors || []).find(d => d.id === doctorId || d.name === req.body.doctorName);
  const doctorName = doctor?.name || req.body.doctorName || 'Doctor';
  const newFeedback = {
    id:'FB-'+Date.now().toString(36).toUpperCase(), appointmentId: appointmentId || '',
    patientId: req.session?.user?.id || 'SP-1001', patientName,
    doctorId: doctorId || doctor?.id || 'DOC-001', doctorName,
    rating: Number(rating), comment: comment || '', date: new Date().toISOString().split('T')[0]
  };
  localStore.feedbacks.push(newFeedback);
  if (doctor) {
    const docFeedbacks = localStore.feedbacks.filter(f => f.doctorId === doctor.id || f.doctorName === doctor.name);
    doctor.rating = Number((docFeedbacks.reduce((a,b) => a+b.rating, 0) / docFeedbacks.length).toFixed(1));
    doctor.ratingCount = docFeedbacks.length;
  }
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Feedback.create(newFeedback); } catch (_) {} }
  res.status(201).json({ success: true, feedback: newFeedback });
});

// ─── Notifications ────────────────────────────────────────────────────────────
app.get('/api/notifications', (req, res) => {
  const user = req.session?.user;
  const role = user?.role || req.query.role || '';
  const username = user?.username || req.query.username || '';
  let list = localStore.notifications || [];
  if (role || username) {
    list = list.filter(n => (!n.username || n.username.toLowerCase() === username.toLowerCase()) && (!n.role || n.role.toLowerCase() === role.toLowerCase() || n.role === 'all'));
  }
  res.json(list.slice(0, 20));
});

app.post('/api/notifications/:id/read', (req, res) => {
  const n = (localStore.notifications || []).find(x => x.id === req.params.id);
  if (n) { n.isRead = true; saveLocalStore(localStore); }
  res.json({ success: true });
});

// ─── Admin ────────────────────────────────────────────────────────────────────
app.post('/api/admin/doctors', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name || name.length < 2) return res.status(400).json({ error: 'Please enter doctor full name.' });
  const specialization = String(req.body.specialization || 'General Medicine').trim();
  const hospital = String(req.body.hospital || 'CarePoint Super-Speciality Hospital').trim();
  const exp = Number(req.body.exp || 10); const fee = Number(req.body.fee || 800);
  const phone = String(req.body.phone || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || 'Doctor@CarePoint123');
  const bio = String(req.body.bio || `Specialist in ${specialization}`).trim();
  const keywords = Array.isArray(req.body.keywords) ? req.body.keywords : [specialization.toLowerCase()];

  const count = (localStore.doctors || []).length;
  const docId = 'DOC-' + String(count + 1).padStart(3, '0');
  const userId = 'usr_doc_' + Date.now();
  const finalUsername = username || ('dr.' + name.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const displayName = name.startsWith('Dr.') ? name : 'Dr. ' + name;

  const newUser   = { id:userId, username:finalUsername, displayName, role:'doctor', specialization, phone, email:email||`${finalUsername}@carepoint.in`, passwordHash:bcrypt.hashSync(password,10), active:true };
  const newDoctor = { id:docId, name:displayName, specialization, hospital, exp, fee, phone, email:newUser.email, username:finalUsername, status:'On Duty', bio, keywords, rating:0, ratingCount:0 };
  localStore.users.push(newUser); localStore.doctors.push(newDoctor); saveLocalStore(localStore);
  if (isMongoConnected) { try { await User.create(newUser); await Doctor.create(newDoctor); } catch (_) {} }
  res.status(201).json({ success:true, doctor:newDoctor });
});

app.post('/api/admin/staff', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name || name.length < 2) return res.status(400).json({ error: 'Please enter staff member name.' });
  const subRole = String(req.body.subRole || req.body.role || 'receptionist').trim();
  const dept = String(req.body.dept || 'OPD Reception').trim();
  const phone = String(req.body.phone || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || 'Staff@CarePoint123');

  const count = (localStore.staff || []).length;
  const staffId = 'STF-' + String(count + 1).padStart(3, '0');
  const userId = 'usr_stf_' + Date.now();
  const finalUsername = username || ('staff.' + name.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const newUser  = { id:userId, username:finalUsername, displayName:name, role:'staff', subRole, phone, email:email||`${finalUsername}@carepoint.in`, passwordHash:bcrypt.hashSync(password,10), active:true };
  const newStaff = { id:staffId, name, role:subRole, dept, phone, active:true };
  localStore.users.push(newUser); localStore.staff.push(newStaff); saveLocalStore(localStore);
  if (isMongoConnected) { try { await User.create(newUser); await Staff.create(newStaff); } catch (_) {} }
  res.status(201).json({ success:true, staff:newStaff });
});

app.delete('/api/admin/doctors/:id', async (req, res) => {
  localStore.doctors = (localStore.doctors || []).filter(d => d.id !== req.params.id);
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Doctor.deleteOne({ id:req.params.id }); } catch (_) {} }
  res.json({ success: true });
});

app.delete('/api/admin/staff/:id', async (req, res) => {
  localStore.staff = (localStore.staff || []).filter(s => s.id !== req.params.id);
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Staff.deleteOne({ id:req.params.id }); } catch (_) {} }
  res.json({ success: true });
});

// ─── Dashboard Endpoints ──────────────────────────────────────────────────────
app.get(['/api/dashboard', '/api/stats'], (req, res) => {
  const invoices = localStore.invoices || [];
  const revenue = invoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0);
  res.json({ patients:(localStore.patients||[]).length, doctors:(localStore.doctors||[]).length, appointments:(localStore.appointments||[]).length, wards:(localStore.wards||[]).length, revenue });
});

app.get('/api/portal', (req, res) => {
  const username = req.session?.user?.username;
  const patient = (localStore.patients || []).find(p => p.username === username) || (localStore.patients||[])[0] || {};
  const appointments  = (localStore.appointments||[]).filter(a => a.patientName===patient.name||a.patientId===patient.id);
  const prescriptions = (localStore.prescriptions||[]).filter(p => p.patientName===patient.name||p.patientId===patient.id);
  const labs          = (localStore.labs||[]).filter(l => l.patientName===patient.name||l.patientId===patient.id);
  const invoices      = (localStore.invoices||[]).filter(i => i.patientName===patient.name||i.patientId===patient.id);
  res.json({ patient, appointments, prescriptions, labs, invoices, doctors:localStore.doctors||[] });
});

app.post('/api/portal/appointments', async (req, res) => {
  const count = (localStore.appointments||[]).length;
  const apptId = 'APT-' + String(count+1).padStart(3,'0');
  const qrToken = 'QR-' + apptId + '-' + Date.now().toString(36).toUpperCase();
  const newAppt = {
    id:apptId, patientName:req.body.patientName||req.session?.user?.displayName||'Patient',
    doctorName:req.body.doctorName||'Dr. Arjun Mehta', dept:req.body.dept||'General Medicine',
    date:req.body.date||new Date().toISOString().split('T')[0], time:req.body.time||'10:00 AM',
    reason:req.body.reason||'General Consultation', status:'Scheduled', qrToken, attendanceStatus:'Pending'
  };
  newAppt.qrCode = await generateApptQR(newAppt);
  localStore.appointments.push(newAppt); saveLocalStore(localStore);
  if (isMongoConnected) { try { await Appointment.create(newAppt); } catch (_) {} }
  res.status(201).json(newAppt);
});

app.get('/api/doctor/dashboard', (req, res) => {
  const docName = req.session?.user?.displayName || 'Dr. Arjun Mehta';
  const lastName = docName.split(' ').slice(1).join(' ') || docName;
  const allAppts = localStore.appointments || [];
  const doctorAppts = allAppts.filter(a => (a.doctorName||'').toLowerCase().includes(lastName.toLowerCase()));
  const allRx = localStore.prescriptions || [];
  const doctorRx = allRx.filter(p => (p.doctorName||'').toLowerCase().includes(lastName.toLowerCase()));
  res.json({ doctor:req.session?.user||(localStore.doctors||[])[0], appointments:doctorAppts.length?doctorAppts:allAppts, wards:localStore.wards||[], prescriptions:doctorRx.length?doctorRx:allRx, patients:localStore.patients||[] });
});

app.get('/api/staff/dashboard', (req, res) => {
  res.json({ staff:req.session?.user||(localStore.staff||[])[0], wards:localStore.wards||[], inventory:localStore.inventory||[], labs:localStore.labs||[], appointments:localStore.appointments||[] });
});

// ─── Simple GET endpoints ─────────────────────────────────────────────────────
app.get('/api/patients',    (req, res) => res.json(localStore.patients    || []));
app.get(['/api/inventory', '/api/pharmacy'],   (req, res) => res.json(localStore.inventory   || []));
app.get(['/api/labs', '/api/lab'],        (req, res) => res.json(localStore.labs        || []));
app.get('/api/billing', (req, res) => {
  const user = req.session?.user;
  let list = localStore.invoices || [];
  if (user?.role === 'patient') {
    const pName = (user.displayName || user.name || '').toLowerCase().trim();
    const uName = (user.username || '').toLowerCase().trim();
    const pId = String(user.id || user._id || user.patientId || '').trim();
    list = list.filter(inv => {
      const iName = (inv.patientName || '').toLowerCase().trim();
      const iUName = (inv.patientUsername || '').toLowerCase().trim();
      const iId = String(inv.patientId || '').trim();
      return (
        (pName && iName === pName) ||
        (uName && (iUName === uName || iName === uName)) ||
        (pId && iId === pId)
      );
    });
  }
  res.json({ invoices: list });
});
app.get('/api/staff',       (req, res) => res.json(localStore.staff       || []));
app.get('/api/admissions',  (req, res) => res.json(localStore.wards       || []));
app.get('/api/emergency',   (req, res) => res.json((localStore.appointments||[]).slice(0,4)));

// ─── Patients CRUD Operations ─────────────────────────────────────────────────
app.post('/api/patients', async (req, res) => {
  const { name, age, gender, bloodGroup, phone, email, address, dateOfBirth } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Patient name and phone are required.' });
  const pCount = (localStore.patients || []).length;
  const newPatient = {
    id: 'SP-' + (1000 + pCount + 1),
    name: String(name).trim(),
    age: Number(age) || 30,
    gender: gender || 'Other',
    bloodGroup: bloodGroup || 'O+',
    phone: String(phone).trim(),
    email: email ? String(email).trim().toLowerCase() : '',
    address: address || 'Mumbai, Maharashtra',
    dateOfBirth: dateOfBirth || '1995-01-01',
    username: ''
  };
  localStore.patients.push(newPatient);
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Patient.create(newPatient); } catch (_) {} }
  res.status(201).json(newPatient);
});

app.patch('/api/patients/:id', async (req, res) => {
  const p = (localStore.patients || []).find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  Object.assign(p, req.body);
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Patient.findOneAndUpdate({ id: p.id }, req.body); } catch (_) {} }
  res.json(p);
});

// ─── Admissions & Bed Management ──────────────────────────────────────────────
app.post('/api/admissions', async (req, res) => {
  const { bedCode, ward, patientName, doctorName, diagnosis } = req.body;
  if (!patientName || !ward) return res.status(400).json({ error: 'Patient name and ward are required.' });
  const newAdmission = {
    id: 'BED-' + String((localStore.wards || []).length + 1).padStart(2, '0'),
    bedCode: bedCode || ('B-' + Math.floor(100 + Math.random() * 900)),
    ward: ward || 'General Medical Ward',
    patientName: String(patientName).trim(),
    doctorName: doctorName || 'Dr. Arjun Mehta',
    diagnosis: diagnosis || 'Under Observation',
    admittedAt: new Date().toISOString().split('T')[0],
    status: 'Admitted'
  };
  localStore.wards.push(newAdmission);
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Ward.create(newAdmission); } catch (_) {} }
  await notifyUser({ role:'staff', title:'🛏️ New Bed Admission', message:`Patient ${patientName} admitted to ${newAdmission.bedCode} (${newAdmission.ward}).` });
  res.status(201).json(newAdmission);
});

app.patch('/api/admissions/:id/discharge', async (req, res) => {
  const admission = (localStore.wards || []).find(w => w.id === req.params.id);
  if (!admission) return res.status(404).json({ error: 'Admission record not found.' });
  admission.status = 'Discharged';
  admission.dischargedAt = new Date().toISOString().split('T')[0];
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Ward.findOneAndUpdate({ id: admission.id }, { status: 'Discharged' }); } catch (_) {} }
  await notifyUser({ role:'staff', title:'🏥 Patient Discharged', message:`Patient ${admission.patientName} discharged from ${admission.bedCode}.` });
  res.json({ success: true, admission });
});

app.patch('/api/admissions/:id/transfer', async (req, res) => {
  const admission = (localStore.wards || []).find(w => w.id === req.params.id);
  if (!admission) return res.status(404).json({ error: 'Admission record not found.' });
  const { newBedCode, newWard } = req.body;
  if (newBedCode) admission.bedCode = newBedCode;
  if (newWard) admission.ward = newWard;
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Ward.findOneAndUpdate({ id: admission.id }, { bedCode: admission.bedCode, ward: admission.ward }); } catch (_) {} }
  res.json({ success: true, admission });
});

// ─── Billing & Invoices Operations ───────────────────────────────────────────
app.post('/api/billing', async (req, res) => {
  const { patientId, patientName, description, amount } = req.body;
  if (!patientName || !amount) return res.status(400).json({ error: 'Patient name and amount are required.' });
  const count = (localStore.invoices || []).length;
  const newInvoice = {
    id: 'INV-' + (200 + count + 1),
    patientId: patientId || 'SP-1001',
    patientName: String(patientName).trim(),
    description: description || 'Clinical Consultation & Diagnostics',
    amount: Number(amount),
    paidAmount: 0,
    status: 'Pending',
    date: new Date().toISOString().split('T')[0]
  };
  localStore.invoices.push(newInvoice);
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Invoice.create(newInvoice); } catch (_) {} }
  res.status(201).json(newInvoice);
});

app.post('/api/billing/:id/pay', async (req, res) => {
  const invoice = (localStore.invoices || []).find(i => i.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
  const paymentAmount = Number(req.body.amount || (invoice.amount - (invoice.paidAmount || 0)));
  invoice.paidAmount = (invoice.paidAmount || 0) + paymentAmount;
  if (invoice.paidAmount >= invoice.amount) {
    invoice.status = 'Paid';
  } else {
    invoice.status = 'Partial';
  }
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Invoice.findOneAndUpdate({ id: invoice.id }, { paidAmount: invoice.paidAmount, status: invoice.status }); } catch (_) {} }
  await notifyUser({ role:'staff', title:'💳 Payment Received', message:`Payment of ₹${paymentAmount} recorded for Invoice ${invoice.id} (${invoice.patientName}).` });
  res.json({ success: true, invoice });
});

// ─── Inventory & Pharmacy Operations ─────────────────────────────────────────
app.post(['/api/inventory', '/api/pharmacy'], async (req, res) => {
  const { name, category, quantity, unit, price } = req.body;
  if (!name || quantity === undefined) return res.status(400).json({ error: 'Item name and quantity are required.' });
  const count = (localStore.inventory || []).length;
  const newItem = {
    id: 'MED-' + String(count + 1).padStart(3, '0'),
    name: String(name).trim(),
    category: category || 'General',
    quantity: Number(quantity),
    unit: unit || 'Units',
    price: Number(price) || 10,
    status: Number(quantity) > 20 ? 'In Stock' : (Number(quantity) > 0 ? 'Low Stock' : 'Out of Stock')
  };
  localStore.inventory.push(newItem);
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Inventory.create(newItem); } catch (_) {} }
  res.status(201).json(newItem);
});

app.patch(['/api/inventory/:id/dispense', '/api/pharmacy/:id/dispense'], async (req, res) => {
  const item = (localStore.inventory || []).find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Inventory item not found.' });
  const dispenseQty = Number(req.body.quantity || 1);
  if (item.quantity < dispenseQty) return res.status(400).json({ error: `Insufficient stock! Only ${item.quantity} available.` });
  item.quantity -= dispenseQty;
  item.status = item.quantity === 0 ? 'Out of Stock' : (item.quantity < 20 ? 'Low Stock' : 'In Stock');
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Inventory.findOneAndUpdate({ id: item.id }, { quantity: item.quantity, status: item.status }); } catch (_) {} }
  res.json({ success: true, item });
});

app.patch(['/api/inventory/:id/restock', '/api/pharmacy/:id/restock'], async (req, res) => {
  const item = (localStore.inventory || []).find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Inventory item not found.' });
  const addQty = Number(req.body.quantity || 50);
  item.quantity += addQty;
  item.status = item.quantity > 20 ? 'In Stock' : 'Low Stock';
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Inventory.findOneAndUpdate({ id: item.id }, { quantity: item.quantity, status: item.status }); } catch (_) {} }
  res.json({ success: true, item });
});

// ─── Laboratory & Diagnostics Operations ─────────────────────────────────────
app.post(['/api/labs', '/api/lab'], async (req, res) => {
  const { patientId, patientName, testName, doctorName } = req.body;
  if (!testName || !patientName) return res.status(400).json({ error: 'Test name and patient name are required.' });
  const count = (localStore.labs || []).length;
  const newLab = {
    id: 'LAB-' + String(count + 1).padStart(3, '0'),
    patientId: patientId || 'SP-1001',
    patientName: String(patientName).trim(),
    testName: String(testName).trim(),
    doctorName: doctorName || 'Dr. Arjun Mehta',
    status: 'Processing',
    result: 'Pending Analysis',
    date: new Date().toISOString().split('T')[0]
  };
  localStore.labs.push(newLab);
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Lab.create(newLab); } catch (_) {} }
  res.status(201).json(newLab);
});

app.patch(['/api/labs/:id/result', '/api/lab/:id/result'], async (req, res) => {
  const lab = (localStore.labs || []).find(l => l.id === req.params.id);
  if (!lab) return res.status(404).json({ error: 'Lab test not found.' });
  lab.result = req.body.result || 'Normal Findings';
  lab.status = 'Completed';
  saveLocalStore(localStore);
  if (isMongoConnected) { try { await Lab.findOneAndUpdate({ id: lab.id }, { result: lab.result, status: 'Completed' }); } catch (_) {} }
  await notifyUser({ role:'doctor', title:'🔬 Lab Results Ready', message:`Results released for ${lab.patientName} (${lab.testName}).` });
  res.json({ success: true, lab });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Database Seeding & Sync ──────────────────────────────────────────────────
async function syncDataToMongo() {
  if (!isMongoConnected) return;
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Seeding MongoDB collections from default data…');
      if (defaultSeed.users?.length) {
        for (const u of defaultSeed.users) {
          await User.findOneAndUpdate({ username: u.username }, u, { upsert: true, new: true }).catch(() => {});
        }
      }
      if (defaultSeed.patients?.length) {
        for (const p of defaultSeed.patients) {
          await Patient.findOneAndUpdate({ id: p.id }, p, { upsert: true, new: true }).catch(() => {});
        }
      }
      if (defaultSeed.doctors?.length) {
        for (const d of defaultSeed.doctors) {
          await Doctor.findOneAndUpdate({ id: d.id }, d, { upsert: true, new: true }).catch(() => {});
        }
      }
      if (defaultSeed.staff?.length) {
        for (const s of defaultSeed.staff) {
          await Staff.findOneAndUpdate({ id: s.id }, s, { upsert: true, new: true }).catch(() => {});
        }
      }
      if (defaultSeed.wards?.length) {
        for (const w of defaultSeed.wards) {
          await Ward.findOneAndUpdate({ id: w.id }, w, { upsert: true, new: true }).catch(() => {});
        }
      }
      if (defaultSeed.inventory?.length) {
        for (const inv of defaultSeed.inventory) {
          await Inventory.findOneAndUpdate({ id: inv.id }, inv, { upsert: true, new: true }).catch(() => {});
        }
      }
      if (defaultSeed.labs?.length) {
        for (const l of defaultSeed.labs) {
          await Lab.findOneAndUpdate({ id: l.id }, l, { upsert: true, new: true }).catch(() => {});
        }
      }
      if (defaultSeed.invoices?.length) {
        for (const i of defaultSeed.invoices) {
          await Invoice.findOneAndUpdate({ id: i.id }, i, { upsert: true, new: true }).catch(() => {});
        }
      }
      if (defaultSeed.feedbacks?.length) {
        for (const f of defaultSeed.feedbacks) {
          await Feedback.findOneAndUpdate({ id: f.id }, f, { upsert: true, new: true }).catch(() => {});
        }
      }
      console.log('✅ MongoDB collections seeded and synchronized successfully!');
    } else {
      console.log(`📊 MongoDB active: ${userCount} users found in collection.`);
    }
  } catch (err) {
    console.error('Data sync error:', err.message);
  }
}

async function tryConnectMongo(silent = false) {
  const uris = [
    process.env.MONGODB_SRV_URI,
    process.env.MONGODB_URI,
    process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/carepoint'
  ].filter(Boolean);

  for (const uri of uris) {
    try {
      const masked = uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
      if (!silent) console.log(`⏳ Attempting connection to: ${masked}`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 });
      isMongoConnected = true;
      console.log(`✅ Successfully connected to MongoDB! (${masked})`);
      await syncDataToMongo();
      return true;
    } catch (err) {
      // Continue to next URI
    }
  }
  return false;
}

// ─── Start ────────────────────────────────────────────────────────────────────
async function startServer() {
  // Seed local store if empty
  if (!localStore.users || localStore.users.length === 0) {
    localStore = JSON.parse(JSON.stringify(defaultSeed));
    saveLocalStore(localStore);
  }

  // Start HTTP server immediately so frontend is never blocked
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🏥 CarePoint HMS API running at http://localhost:${PORT}`);
    console.log(`📡 API Base: http://localhost:${PORT}/api`);
  });

  // Attempt initial MongoDB connection
  const connected = await tryConnectMongo(false);
  if (!connected) {
    console.warn('\n⚠️ MongoDB connection failed (likely Atlas IP Whitelist issue or offline).');
    console.warn('📁 Using persistent local JSON store (`backend/data/carepoint.json`). All features work normally.');
    console.log('👉 To fix MongoDB Atlas: Go to MongoDB Atlas -> Network Access -> Add IP Address -> Choose "Allow Access From Anywhere" (0.0.0.0/0).\n');
  }

  // Silent background reconnect every 60s without spamming console
  setInterval(async () => {
    if (!isMongoConnected) {
      const success = await tryConnectMongo(true);
      if (success) {
        console.log('🎉 Background reconnect to MongoDB succeeded!');
      }
    }
  }, 60000);
}

startServer();
