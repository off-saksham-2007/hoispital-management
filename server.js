require('dotenv').config();
require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const os = require('os');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const roles = ['admin', 'doctor', 'staff', 'patient', 'pending'];
const staffSubroles = ['receptionist', 'nurse', 'billing', 'records', 'lab', 'imaging', 'pharmacy', 'operations'];
const imagingPriorityRank = { STAT: 0, Urgent: 1, Routine: 2 };
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(mongoSanitize());

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  displayName: { type: String, trim: true, maxlength: 120 },
  passwordHash: { type: String, required: true }, role: { type: String, enum: roles, required: true },
  subRole: { type: String, enum: staffSubroles },
  patientRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  requestedRole: { type: String, enum: ['doctor', 'staff'] },
  requestedSubRole: { type: String, enum: staffSubroles },
  approved: { type: Boolean, default: true },
  active: { type: Boolean, default: true }, mustChangePassword: { type: Boolean, default: false }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

function recordSchema(fields) { return new mongoose.Schema(fields, { timestamps: true, strict: true }); }
function cleanFields(Model, input) {
  const values = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (Model.schema.path(key) && !['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) values[key] = value;
  }
  return values;
}
const Patient = mongoose.model('Patient', recordSchema({ name: { type: String, required: true, trim: true }, age: { type: Number, min: 0, max: 120, required: true }, gender: { type: String, enum: ['Female', 'Male', 'Other'] }, phone: { type: String, required: true, trim: true }, email: String, address: String, dateOfBirth: Date, bloodGroup: String, emergencyContact: String, account: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true } }));
const Doctor = mongoose.model('Doctor', recordSchema({ name: { type: String, required: true, trim: true }, specialization: { type: String, required: true }, phone: String, email: String, account: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true } }));
const Appointment = mongoose.model('Appointment', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true }, date: { type: Date, required: true }, reason: String, checkedInAt: Date, completedAt: Date, status: { type: String, enum: ['Requested', 'Scheduled', 'Checked-in', 'Completed', 'Cancelled', 'No-show'], default: 'Scheduled' } }));
const Prescription = mongoose.model('Prescription', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true }, medicine: { type: String, required: true }, dosage: { type: String, required: true }, quantity: { type: Number, min: 0.01, max: 100000, required: true }, refills: { type: Number, min: 0, max: 24, default: 0 }, refillsUsed: { type: Number, min: 0, max: 24, default: 0 }, dispensedQuantity: { type: Number, min: 0, default: 0 }, totalDispensedQuantity: { type: Number, min: 0, default: 0 }, status: { type: String, enum: ['Active', 'Partially dispensed', 'Refill due', 'Dispensed', 'Discontinued'], default: 'Active' }, dispensedAt: Date, dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, instructions: String }));
const Invoice = mongoose.model('Invoice', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, invoiceNumber: { type: String, unique: true, sparse: true }, description: { type: String, required: true, trim: true, maxlength: 500 }, amount: { type: Number, min: 0.01, required: true }, amountCents: { type: Number, min: 1 }, adjustedAmount: { type: Number, default: 0 }, adjustedCents: { type: Number, default: 0 }, paidAmount: { type: Number, min: 0, default: 0 }, paidCents: { type: Number, min: 0, default: 0 }, dueAt: Date, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, status: { type: String, enum: ['Pending', 'Partially paid', 'Paid', 'Voided'], default: 'Pending' }, paidAt: Date, voidedAt: Date, voidReason: { type: String, maxlength: 500 } }));
const PaymentTransaction = mongoose.model('PaymentTransaction', recordSchema({ invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true }, patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, receiptNumber: { type: String, unique: true, sparse: true }, type: { type: String, enum: ['Payment', 'Refund'], required: true }, amount: { type: Number, min: 0.01, required: true }, amountCents: { type: Number, min: 1 }, refundedAmount: { type: Number, min: 0, default: 0 }, refundedCents: { type: Number, min: 0, default: 0 }, reverses: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction' }, method: { type: String, enum: ['Cash', 'Card', 'Bank transfer', 'Insurance', 'Other'], required: true }, reference: { type: String, maxlength: 160 }, note: { type: String, maxlength: 500 }, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, processedAt: { type: Date, default: Date.now } }));
const InvoiceAdjustment = mongoose.model('InvoiceAdjustment', recordSchema({ invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true }, patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, adjustmentNumber: { type: String, required: true, unique: true }, amount: { type: Number, required: true }, amountCents: { type: Number, required: true }, reason: { type: String, required: true, maxlength: 500 }, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, processedAt: { type: Date, default: Date.now } }));
const InsurancePolicy = mongoose.model('InsurancePolicy', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, payer: { type: String, required: true, trim: true, maxlength: 160 }, memberId: { type: String, required: true, trim: true, maxlength: 120 }, groupId: { type: String, trim: true, maxlength: 120 }, coveragePercent: { type: Number, min: 0, max: 100, default: 80 }, effectiveFrom: { type: Date, required: true }, expiresAt: Date, active: { type: Boolean, default: true }, note: { type: String, maxlength: 500 }, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } }));
const InsuranceClaim = mongoose.model('InsuranceClaim', recordSchema({ invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true }, patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, policy: { type: mongoose.Schema.Types.ObjectId, ref: 'InsurancePolicy', required: true }, claimNumber: { type: String, required: true, unique: true }, requestedAmount: { type: Number, min: 0.01, required: true }, requestedCents: { type: Number, min: 1, required: true }, approvedAmount: { type: Number, min: 0, default: 0 }, approvedCents: { type: Number, min: 0, default: 0 }, paidAmount: { type: Number, min: 0, default: 0 }, paidCents: { type: Number, min: 0, default: 0 }, status: { type: String, enum: ['Submitted', 'Approved', 'Partially approved', 'Denied', 'Partially paid', 'Paid'], default: 'Submitted' }, payerReference: { type: String, maxlength: 160 }, decisionNote: { type: String, maxlength: 1000 }, submittedAt: { type: Date, default: Date.now }, decidedAt: Date, decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, paidAt: Date, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } }));
const Visit = mongoose.model('Visit', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true }, appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', unique: true, sparse: true }, assignedNurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reason: { type: String, required: true, maxlength: 500 }, priority: { type: String, enum: ['Routine', 'Urgent'], default: 'Routine' }, status: { type: String, enum: ['Waiting', 'In consultation', 'Completed'], default: 'Waiting' }, bloodPressure: String, pulse: { type: Number, min: 0, max: 300 }, temperature: { type: Number, min: 20, max: 50 }, weight: { type: Number, min: 0, max: 500 }, triagedAt: Date, triagedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, handoffNote: { type: String, maxlength: 2000 } }));
const LabOrder = mongoose.model('LabOrder', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true }, testName: { type: String, required: true }, specimen: String, result: String, status: { type: String, enum: ['Ordered', 'Collected', 'Processing', 'Released'], default: 'Ordered' }, orderedAt: { type: Date, default: Date.now }, releasedAt: Date }));
const ImagingOrder = mongoose.model('ImagingOrder', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true }, modality: { type: String, enum: ['X-ray', 'CT', 'MRI', 'Ultrasound', 'Mammography', 'Fluoroscopy', 'Nuclear medicine', 'Other'], required: true }, bodySite: { type: String, required: true, maxlength: 160 }, clinicalIndication: { type: String, required: true, maxlength: 1000 }, priority: { type: String, enum: ['Routine', 'Urgent', 'STAT'], default: 'Routine' }, status: { type: String, enum: ['Ordered', 'Scheduled', 'Acquired', 'Reported', 'Reviewed', 'Released'], default: 'Ordered' }, scheduledAt: Date, acquiredAt: Date, reportedAt: Date, reportText: { type: String, maxlength: 12000 }, archiveReference: { type: String, maxlength: 240 }, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reviewedAt: Date, reviewNote: { type: String, maxlength: 2000 }, followUpRequired: { type: Boolean, default: false }, followUpNote: { type: String, maxlength: 1000 }, releasedAt: Date }));
const Message = mongoose.model('Message', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, body: { type: String, required: true, maxlength: 3000 }, direction: { type: String, enum: ['patient', 'clinic'], required: true }, readAt: Date }));
const Bed = mongoose.model('Bed', recordSchema({ code: { type: String, required: true, unique: true, trim: true }, ward: { type: String, required: true, trim: true }, room: { type: String, required: true, trim: true }, kind: { type: String, enum: ['Standard', 'Private', 'ICU', 'Observation'], default: 'Standard' }, status: { type: String, enum: ['Available', 'Occupied', 'Cleaning', 'Maintenance'], default: 'Available' } }));
const Admission = mongoose.model('Admission', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true }, bed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true }, assignedNurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, admittedAt: { type: Date, default: Date.now }, dischargedAt: Date, reason: { type: String, required: true, maxlength: 500 }, diagnosis: String, dischargeSummary: String, status: { type: String, enum: ['Admitted', 'Discharged'], default: 'Admitted' } }));
const StockItem = mongoose.model('StockItem', recordSchema({ name: { type: String, required: true, trim: true }, category: { type: String, enum: ['Medication', 'Supply', 'Equipment'], required: true }, unit: { type: String, required: true, trim: true }, quantity: { type: Number, min: 0, required: true, default: 0 }, reorderAt: { type: Number, min: 0, required: true, default: 0 }, expiresAt: Date, supplier: String }));
const StockMovement = mongoose.model('StockMovement', recordSchema({ item: { type: mongoose.Schema.Types.ObjectId, ref: 'StockItem', required: true }, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, type: { type: String, enum: ['Initial stock', 'Adjustment', 'Dispense'], required: true }, change: { type: Number, required: true }, reason: String, prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' } }));
const MedicationAdministration = mongoose.model('MedicationAdministration', recordSchema({ admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true }, prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', required: true }, patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, doseGiven: { type: String, required: true, maxlength: 120 }, status: { type: String, enum: ['Given', 'Refused', 'Held', 'Missed'], required: true }, administeredAt: { type: Date, default: Date.now }, notes: { type: String, maxlength: 1000 } }));
const Encounter = mongoose.model('Encounter', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true }, appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }, author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, chiefConcern: { type: String, required: true, maxlength: 500 }, diagnosis: String, note: { type: String, required: true, maxlength: 12000 }, bloodPressure: String, pulse: { type: Number, min: 0, max: 300 }, temperature: { type: Number, min: 20, max: 50 }, weight: { type: Number, min: 0, max: 500 }, status: { type: String, enum: ['Draft', 'Signed'], default: 'Draft' }, signedAt: Date }));
const Referral = mongoose.model('Referral', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true }, specialty: { type: String, required: true, trim: true, maxlength: 160 }, destination: { type: String, trim: true, maxlength: 200 }, reason: { type: String, required: true, maxlength: 2000 }, priority: { type: String, enum: ['Routine', 'Urgent'], default: 'Routine' }, status: { type: String, enum: ['Ordered', 'Scheduled', 'Completed', 'Declined', 'Cancelled'], default: 'Ordered' }, appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }, dueAt: Date, note: { type: String, maxlength: 1000 }, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, closedAt: Date }));
const FollowUpTask = mongoose.model('FollowUpTask', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, title: { type: String, required: true, trim: true, maxlength: 200 }, instructions: { type: String, maxlength: 2000 }, dueAt: { type: Date, required: true }, assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, encounter: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter' }, referral: { type: mongoose.Schema.Types.ObjectId, ref: 'Referral' }, patientVisible: { type: Boolean, default: false }, status: { type: String, enum: ['Open', 'In progress', 'Completed', 'Cancelled'], default: 'Open' }, completionNote: { type: String, maxlength: 1000 }, completedAt: Date }));
const EmergencyVisit = mongoose.model('EmergencyVisit', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, chiefConcern: { type: String, required: true, maxlength: 1000 }, arrivalMode: { type: String, enum: ['Walk-in', 'Ambulance', 'Transfer'], default: 'Walk-in' }, priority: { type: String, enum: ['Emergency', 'High', 'Medium'], default: 'High' }, status: { type: String, enum: ['Arrived', 'Triaged', 'In care', 'Admitted', 'Transferred', 'Discharged'], default: 'Arrived' }, attendingDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }, assignedNurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, bloodPressure: String, pulse: { type: Number, min: 0, max: 300 }, temperature: { type: Number, min: 20, max: 50 }, oxygenSaturation: { type: Number, min: 0, max: 100 }, triageNote: { type: String, maxlength: 2000 }, dispositionNote: { type: String, maxlength: 2000 }, arrivedAt: { type: Date, default: Date.now }, triagedAt: Date, closedAt: Date, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } }));
const AuditEvent = mongoose.model('AuditEvent', recordSchema({ actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, method: { type: String, required: true }, resource: { type: String, required: true }, target: String, outcome: { type: Number, required: true } }));

async function nurseAssignedPatientIds(userId) {
  const [visitPatients, admissionPatients] = await Promise.all([
    Visit.distinct('patient', { assignedNurse: userId }),
    Admission.distinct('patient', { assignedNurse: userId })
  ]);
  return [...new Set([...visitPatients, ...admissionPatients].map(String))];
}

app.use(session({ name: 'carepoint.sid', secret: process.env.SESSION_SECRET || 'development-only-change-this-secret-please', resave: false, saveUninitialized: false, store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carepoint', collectionName: 'sessions' }), cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 } }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', (req, res, next) => {
  const user = req.session?.user;
  const sensitiveRead = req.method === 'GET' && /\/api\/(patients|portal|encounters|labs|imaging|messages|admissions|reports|mar|billing|insurance)(\/|\?|$)/.test(req.originalUrl);
  const write = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
  if (!user || (!write && !sensitiveRead)) return next();
  res.on('finish', () => {
    const parts = req.path.split('/').filter(Boolean);
    AuditEvent.create({ actor: user.id, method: req.method, resource: parts[1] || 'api', target: parts[2] || '', outcome: res.statusCode }).catch(() => {});
  });
  next();
});

function normalizeSessionUser(user) {
  if (user?.role === 'receptionist') { user.role = 'staff'; user.subRole = 'receptionist'; }
  return user;
}
const requireAuth = async (req, res, next) => {
  const user = normalizeSessionUser(req.session?.user);
  if (!user) return res.status(401).json({ error: 'Please sign in.' });
  if (!await User.exists({ _id: user.id, active: true })) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'This account is disabled. Contact your administrator.' });
  }
  next();
};
const allow = (...accepted) => async (req, res, next) => {
  const user = normalizeSessionUser(req.session?.user);
  if (!user) return res.status(401).json({ error: 'Please sign in.' });
  if (!await User.exists({ _id: user.id, active: true })) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'This account is disabled. Contact your administrator.' });
  }
  const access = user.role === 'staff' ? `staff:${user.subRole}` : user.role;
  if (!accepted.includes(access)) return res.status(403).json({ error: 'Your role cannot perform this action.' });
  next();
};
const safeUser = user => ({ id: String(user._id), username: user.username, displayName: user.displayName || user.username, role: user.role, subRole: user.subRole || null, requestedRole: user.requestedRole || null, requestedSubRole: user.requestedSubRole || null, approved: user.approved !== false, active: user.active, mustChangePassword: user.mustChangePassword });
app.get('/api/auth/me', async (req, res) => {
  const user = normalizeSessionUser(req.session?.user);
  if (user) {
    const account = await User.findOne({ _id: user.id, active: true });
    if (!account) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'This account is disabled. Contact your administrator.' });
    }
    req.session.user = safeUser(account);
    return res.json({ user: req.session.user });
  }
  res.json({ user: null });
});
app.post('/api/auth/patient-register', async (req, res) => {
  const displayName = String(req.body.displayName || '').trim();
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const confirmation = String(req.body.confirmPassword || '');
  const phone = String(req.body.phone || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  if (displayName.length < 2 || displayName.length > 120 || !/^[a-z0-9._-]{3,80}$/.test(username) || phone.length < 7 || phone.length > 20 || password.length < 12 || password !== confirmation) {
    return res.status(400).json({ error: 'Enter your name, a valid username and phone, and matching passwords of at least 12 characters.' });
  }
  try {
    const user = await User.create({ displayName, username, role: 'patient', active: true, approved: true, passwordHash: await bcrypt.hash(password, 12) });
    const age = req.body.dateOfBirth ? Math.max(0, Math.floor((Date.now() - new Date(req.body.dateOfBirth).getTime()) / 31557600000)) : 0;
    const profile = await Patient.create({ name: displayName, age, dateOfBirth: req.body.dateOfBirth || undefined, phone, email, address: String(req.body.address || '').trim(), account: user._id });
    user.patientRecord = profile._id;
    await user.save();
    res.status(201).json({ user: safeUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'That username is already in use. Choose another username or sign in.' });
    throw error;
  }
});
app.post('/api/auth/login', async (req, res) => {
  const identifier = String(req.body.username || '').trim();
  const lookup = [{ username: identifier.toLowerCase() }];
  if (mongoose.isObjectIdOrHexString(identifier)) lookup.push({ _id: identifier });
  const user = await User.findOne({ $or: lookup, active: true });
  if (!user || !await bcrypt.compare(String(req.body.password || ''), user.passwordHash)) return res.status(401).json({ error: 'Username or password is incorrect.' });
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Could not create a secure session.' });
    req.session.user = safeUser(user);
    res.json({ user: req.session.user });
  });
});
app.post('/api/auth/logout', requireAuth, (req, res) => req.session.destroy(() => { res.clearCookie('carepoint.sid'); res.json({ ok: true }); }));
app.post('/api/auth/password', requireAuth, async (req, res) => {
  const password = String(req.body.password || '');
  if (password.length < 12) return res.status(400).json({ error: 'Use at least 12 characters.' });
  const user = await User.findById(req.session.user.id);
  if (!user.mustChangePassword && !await bcrypt.compare(String(req.body.currentPassword || ''), user.passwordHash)) return res.status(403).json({ error: 'Enter your current password to continue.' });
  user.passwordHash = await bcrypt.hash(password, 12); user.mustChangePassword = false; await user.save();
  req.session.user = safeUser(user); res.json({ user: req.session.user });
});

app.get('/api/portal', allow('patient'), async (req, res) => {
  const patient = await Patient.findOne({ account: req.session.user.id });
  if (!patient) return res.status(404).json({ error: 'Patient profile not found. Contact the clinic.' });
  const [appointments, prescriptions, invoices, paymentTransactions, invoiceAdjustments, insurancePolicies, insuranceClaims, labOrders, imagingOrders, messages, doctors, admissions, encounters, medicationAdministration, referrals, followUpTasks, emergencyVisits] = await Promise.all([
    Appointment.find({ patient: patient._id }).populate('doctor').sort({ date: -1 }).limit(100),
    Prescription.find({ patient: patient._id }).populate('doctor').sort({ createdAt: -1 }).limit(100),
    Invoice.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(100),
    PaymentTransaction.find({ patient: patient._id }).populate('invoice', 'invoiceNumber description').sort({ processedAt: -1 }).limit(250),
    InvoiceAdjustment.find({ patient: patient._id }).populate('invoice', 'invoiceNumber description').sort({ processedAt: -1 }).limit(250),
    InsurancePolicy.find({ patient: patient._id }).select('payer memberId groupId coveragePercent effectiveFrom expiresAt active').sort({ active: -1, createdAt: -1 }).limit(10),
    InsuranceClaim.find({ patient: patient._id }).populate('invoice', 'invoiceNumber description').populate('policy', 'payer memberId').select('claimNumber invoice policy requestedAmount approvedAmount paidAmount status payerReference submittedAt decidedAt paidAt').sort({ submittedAt: -1 }).limit(100),
    LabOrder.find({ patient: patient._id, status: 'Released' }).populate('doctor').sort({ releasedAt: -1 }).limit(100),
    ImagingOrder.find({ patient: patient._id, status: 'Released' }).populate('doctor').sort({ releasedAt: -1 }).limit(100),
    Message.find({ patient: patient._id }).sort({ createdAt: 1 }).limit(200),
    Doctor.find().select('name specialization').sort({ name: 1 }),
    Admission.find({ patient: patient._id }).populate('doctor bed').sort({ admittedAt: -1 }).limit(20),
    Encounter.find({ patient: patient._id, status: 'Signed' }).populate('doctor').sort({ signedAt: -1 }).limit(100),
    MedicationAdministration.find({ patient: patient._id }).populate('prescription').populate('administeredBy', 'displayName username').sort({ administeredAt: -1 }).limit(100),
    Referral.find({ patient: patient._id }).populate('doctor', 'name specialization').populate('appointment', 'date status').sort({ createdAt: -1 }).limit(100),
    FollowUpTask.find({ patient: patient._id, patientVisible: true }).sort({ dueAt: 1 }).limit(100),
    EmergencyVisit.find({ patient: patient._id }).populate('attendingDoctor', 'name specialization').sort({ arrivedAt: -1 }).limit(20)
  ]);
  res.json({ patient, appointments, prescriptions, invoices, paymentTransactions, invoiceAdjustments, insurancePolicies, insuranceClaims, labOrders, imagingOrders, messages, doctors, admissions, encounters, medicationAdministration, referrals, followUpTasks, emergencyVisits });
});
app.get('/api/referrals', allow('admin', 'doctor', 'staff:receptionist', 'staff:records'), async (req, res) => {
  const filter = {};
  if (req.session.user.role === 'doctor') {
    const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
    filter.doctor = provider?._id || null;
  }
  const referrals = await Referral.find(filter).populate('patient', 'name phone').populate('doctor', 'name specialization').populate('appointment', 'date status').populate('createdBy', 'displayName username role').sort({ createdAt: -1 }).limit(1000);
  res.json(referrals);
});
app.post('/api/referrals', allow('admin', 'doctor'), async (req, res) => {
  const patient = await Patient.findById(req.body.patient);
  const doctor = req.session.user.role === 'doctor' ? (await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName })) : await Doctor.findById(req.body.doctor);
  const specialty = String(req.body.specialty || '').trim().slice(0, 160);
  const reason = String(req.body.reason || '').trim().slice(0, 2000);
  const dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
  if (!patient || !doctor || specialty.length < 2 || reason.length < 5 || (dueAt && !Number.isFinite(dueAt.getTime()))) return res.status(400).json({ error: 'Choose a patient and provider, then enter a specialty and referral reason.' });
  if (req.session.user.role === 'doctor') {
    const inCare = await Appointment.exists({ patient: patient._id, doctor: doctor._id, status: { $in: ['Scheduled', 'Checked-in', 'Completed'] } }) || await Encounter.exists({ patient: patient._id, doctor: doctor._id });
    if (!inCare) return res.status(403).json({ error: 'Referrals can only be placed for a patient in your care.' });
  }
  const referral = await Referral.create({ patient: patient._id, doctor: doctor._id, specialty, destination: String(req.body.destination || '').trim().slice(0, 200), reason, priority: req.body.priority === 'Urgent' ? 'Urgent' : 'Routine', dueAt: dueAt || undefined, note: String(req.body.note || '').trim().slice(0, 1000), createdBy: req.session.user.id });
  await referral.populate([{ path: 'patient', select: 'name phone' }, { path: 'doctor', select: 'name specialization' }, { path: 'createdBy', select: 'displayName username role' }]);
  res.status(201).json(referral);
});
app.patch('/api/referrals/:id', allow('admin', 'doctor', 'staff:receptionist', 'staff:records'), async (req, res) => {
  const referral = await Referral.findById(req.params.id);
  if (!referral) return res.status(404).json({ error: 'Referral not found.' });
  const actor = req.session.user;
  if (actor.role === 'doctor') {
    const provider = await Doctor.findOne({ account: actor.id }) || await Doctor.findOne({ name: actor.displayName });
    if (String(referral.doctor) !== String(provider?._id)) return res.status(403).json({ error: 'This referral is not in your care.' });
  }
  const nextStatus = req.body.status;
  const frontDesk = actor.role === 'admin' || (actor.role === 'staff' && ['receptionist', 'records'].includes(actor.subRole));
  const clinician = actor.role === 'admin' || actor.role === 'doctor';
  const transitions = referral.status === 'Ordered' ? (frontDesk ? ['Scheduled', 'Cancelled'] : ['Scheduled', 'Declined', 'Cancelled']) : referral.status === 'Scheduled' ? (frontDesk ? ['Cancelled'] : ['Completed', 'Cancelled']) : [];
  if (!transitions.includes(nextStatus) || (nextStatus === 'Completed' && !clinician)) return res.status(400).json({ error: 'Choose a valid referral workflow transition.' });
  if (req.body.appointment) {
    const appointment = await Appointment.findOne({ _id: req.body.appointment, patient: referral.patient });
    if (!appointment) return res.status(400).json({ error: 'Choose an appointment belonging to this patient.' });
    referral.appointment = appointment._id;
  }
  if (req.body.dueAt) {
    const dueAt = new Date(req.body.dueAt);
    if (!Number.isFinite(dueAt.getTime())) return res.status(400).json({ error: 'Enter a valid scheduled date.' });
    referral.dueAt = dueAt;
  }
  referral.status = nextStatus;
  referral.note = req.body.note === undefined ? referral.note : String(req.body.note).trim().slice(0, 1000);
  if (['Completed', 'Declined', 'Cancelled'].includes(nextStatus)) referral.closedAt = new Date();
  await referral.save();
  await referral.populate([{ path: 'patient', select: 'name phone' }, { path: 'doctor', select: 'name specialization' }, { path: 'appointment', select: 'date status' }]);
  res.json(referral);
});

app.get('/api/followups', allow('admin', 'doctor', 'staff:nurse', 'staff:receptionist', 'staff:records'), async (req, res) => {
  const user = req.session.user;
  const filter = user.role === 'admin' ? {} : user.role === 'doctor' ? { $or: [{ createdBy: user.id }, { assignedTo: user.id }] } : { assignedTo: user.id };
  const tasks = await FollowUpTask.find(filter).populate('patient', 'name phone').populate('assignedTo', 'displayName username role subRole').populate('createdBy', 'displayName username role').populate('encounter', 'chiefConcern diagnosis').populate('referral', 'specialty status').sort({ status: 1, dueAt: 1 }).limit(1000);
  res.json(tasks);
});
app.post('/api/followups', allow('admin', 'doctor'), async (req, res) => {
  const patient = await Patient.findById(req.body.patient);
  const assignee = await User.findOne({ _id: req.body.assignedTo || req.session.user.id, active: true, role: { $in: ['admin', 'doctor', 'staff'] } });
  const dueAt = new Date(req.body.dueAt);
  const title = String(req.body.title || '').trim().slice(0, 200);
  if (!patient || !assignee || !Number.isFinite(dueAt.getTime()) || title.length < 3) return res.status(400).json({ error: 'Choose a patient, active assignee, due date, and task title.' });
  let encounter, referral;
  if (req.body.encounter) encounter = await Encounter.findOne({ _id: req.body.encounter, patient: patient._id });
  if (req.body.referral) referral = await Referral.findOne({ _id: req.body.referral, patient: patient._id });
  if (req.body.encounter && !encounter || req.body.referral && !referral) return res.status(400).json({ error: 'Choose a related encounter or referral belonging to this patient.' });
  if (req.session.user.role === 'doctor') {
    const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
    const inCare = encounter && String(encounter.doctor) === String(provider?._id) || referral && String(referral.doctor) === String(provider?._id) || await Appointment.exists({ patient: patient._id, doctor: provider?._id, status: { $in: ['Scheduled', 'Checked-in', 'Completed'] } });
    if (!inCare) return res.status(403).json({ error: 'Follow-up tasks can only be assigned for a patient in your care.' });
  }
  const task = await FollowUpTask.create({ patient: patient._id, title, instructions: String(req.body.instructions || '').trim().slice(0, 2000), dueAt, assignedTo: assignee._id, createdBy: req.session.user.id, encounter: encounter?._id, referral: referral?._id, patientVisible: req.body.patientVisible === true });
  await task.populate([{ path: 'patient', select: 'name phone' }, { path: 'assignedTo', select: 'displayName username role subRole' }, { path: 'createdBy', select: 'displayName username role' }]);
  res.status(201).json(task);
});
app.patch('/api/followups/:id', allow('admin', 'doctor', 'staff:nurse', 'staff:receptionist', 'staff:records'), async (req, res) => {
  const task = await FollowUpTask.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Follow-up task not found.' });
  const user = req.session.user;
  if (user.role !== 'admin' && String(task.assignedTo) !== String(user.id) && String(task.createdBy) !== String(user.id)) return res.status(403).json({ error: 'This follow-up task is assigned to another team member.' });
  const nextStatus = req.body.status;
  const allowed = task.status === 'Open' ? ['In progress', 'Completed', 'Cancelled'] : task.status === 'In progress' ? ['Open', 'Completed', 'Cancelled'] : [];
  if (!allowed.includes(nextStatus)) return res.status(400).json({ error: 'Choose a valid task status transition.' });
  if (nextStatus === 'Cancelled' && user.role !== 'admin' && String(task.createdBy) !== String(user.id)) return res.status(403).json({ error: 'Only the task creator or an administrator can cancel this task.' });
  task.status = nextStatus;
  task.completionNote = req.body.completionNote === undefined ? task.completionNote : String(req.body.completionNote).trim().slice(0, 1000);
  task.completedAt = nextStatus === 'Completed' ? new Date() : undefined;
  await task.save();
  res.json(task);
});

app.get('/api/emergency', allow('admin', 'doctor', 'staff:receptionist', 'staff:nurse'), async (req, res) => {
  const user = req.session.user;
  const filter = {};
  if (user.role === 'doctor') {
    const provider = await Doctor.findOne({ account: user.id }) || await Doctor.findOne({ name: user.displayName });
    filter.attendingDoctor = provider?._id || null;
  } else if (user.role === 'staff' && user.subRole === 'nurse') filter.$or = [{ assignedNurse: user.id }, { assignedNurse: { $exists: false } }];
  const visits = await EmergencyVisit.find(filter).populate('patient', 'name age gender phone emergencyContact').populate('attendingDoctor', 'name specialization').populate('assignedNurse', 'displayName username').populate('createdBy', 'displayName username').sort({ priority: -1, arrivedAt: 1 }).limit(500);
  res.json(visits);
});
app.post('/api/emergency', allow('admin', 'staff:receptionist'), async (req, res) => {
  const patient = await Patient.findById(req.body.patient);
  const chiefConcern = String(req.body.chiefConcern || '').trim().slice(0, 1000);
  const doctor = req.body.attendingDoctor ? await Doctor.findById(req.body.attendingDoctor) : null;
  const nurse = req.body.assignedNurse ? await User.findOne({ _id: req.body.assignedNurse, role: 'staff', subRole: 'nurse', active: true }) : null;
  if (!patient || chiefConcern.length < 3 || (req.body.attendingDoctor && !doctor) || (req.body.assignedNurse && !nurse)) return res.status(400).json({ error: 'Choose a patient, valid care team members, and describe the emergency concern.' });
  const priority = ['Emergency', 'High', 'Medium'].includes(req.body.priority) ? req.body.priority : 'High';
  const visit = await EmergencyVisit.create({ patient: patient._id, chiefConcern, arrivalMode: ['Walk-in', 'Ambulance', 'Transfer'].includes(req.body.arrivalMode) ? req.body.arrivalMode : 'Walk-in', priority, attendingDoctor: doctor?._id, assignedNurse: nurse?._id, createdBy: req.session.user.id });
  await visit.populate([{ path: 'patient', select: 'name age gender phone emergencyContact' }, { path: 'attendingDoctor', select: 'name specialization' }, { path: 'assignedNurse', select: 'displayName username' }]);
  res.status(201).json(visit);
});
app.patch('/api/emergency/:id', allow('admin', 'doctor', 'staff:nurse'), async (req, res) => {
  const visit = await EmergencyVisit.findById(req.params.id);
  if (!visit) return res.status(404).json({ error: 'Emergency visit not found.' });
  const user = req.session.user;
  let provider;
  if (user.role === 'doctor') {
    provider = await Doctor.findOne({ account: user.id }) || await Doctor.findOne({ name: user.displayName });
    if (String(visit.attendingDoctor) !== String(provider?._id)) return res.status(403).json({ error: 'This emergency visit is not assigned to your care.' });
  }
  if (user.role === 'staff' && user.subRole === 'nurse' && visit.assignedNurse && String(visit.assignedNurse) !== String(user.id)) return res.status(403).json({ error: 'This emergency visit is assigned to another nurse.' });
  const nurse = user.role === 'staff' && user.subRole === 'nurse';
  const changes = {};
  if (req.body.status) {
    const allowed = visit.status === 'Arrived' ? (nurse || user.role === 'admin' ? ['Triaged'] : []) : visit.status === 'Triaged' ? (provider || user.role === 'admin' ? ['In care'] : []) : visit.status === 'In care' ? (provider || user.role === 'admin' ? ['Admitted', 'Transferred', 'Discharged'] : []) : [];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Choose a valid emergency care transition for your role.' });
    changes.status = req.body.status;
    if (['Admitted', 'Transferred', 'Discharged'].includes(changes.status)) changes.closedAt = new Date();
  }
  if (nurse || user.role === 'admin') {
    for (const key of ['bloodPressure', 'pulse', 'temperature', 'oxygenSaturation', 'triageNote']) if (key in req.body) changes[key] = ['pulse', 'temperature', 'oxygenSaturation'].includes(key) ? Number(req.body[key]) : String(req.body[key]).trim().slice(0, key === 'triageNote' ? 2000 : 40);
    if (Object.keys(changes).some(key => ['bloodPressure', 'pulse', 'temperature', 'oxygenSaturation', 'triageNote'].includes(key)) || changes.status === 'Triaged') { changes.triagedAt = new Date(); if (!visit.assignedNurse && nurse) changes.assignedNurse = user.id; }
  }
  if (provider || user.role === 'admin') {
    if ('dispositionNote' in req.body) changes.dispositionNote = String(req.body.dispositionNote).trim().slice(0, 2000);
  }
  if (!Object.keys(changes).length) return res.status(400).json({ error: 'There are no emergency visit changes to save.' });
  const updated = await EmergencyVisit.findByIdAndUpdate(visit._id, changes, { new: true, runValidators: true }).populate('patient', 'name age gender phone emergencyContact').populate('attendingDoctor', 'name specialization').populate('assignedNurse', 'displayName username');
  res.json(updated);
});

app.post('/api/portal/appointments', allow('patient'), async (req, res) => {
  const patient = await Patient.findOne({ account: req.session.user.id });
  const doctor = await Doctor.findById(req.body.doctor);
  const date = new Date(req.body.date);
  if (!patient || !doctor || !Number.isFinite(date.getTime()) || date <= new Date() || date > new Date(Date.now() + 180 * 86400000)) return res.status(400).json({ error: 'Choose a doctor and a future appointment date within the next six months.' });
  const windowStart = new Date(date.getTime() - 30 * 60000), windowEnd = new Date(date.getTime() + 30 * 60000);
  if (await Appointment.exists({ doctor: doctor._id, status: { $in: ['Requested', 'Scheduled', 'Checked-in'] }, date: { $gte: windowStart, $lte: windowEnd } })) return res.status(409).json({ error: 'That time is already requested or booked. Choose another time.' });
  const booking = await Appointment.create({ patient: patient._id, doctor: doctor._id, date, reason: String(req.body.reason || 'General consultation').trim().slice(0, 255), status: 'Requested' });
  res.status(201).json(booking);
});
app.patch('/api/portal/appointments/:id', allow('patient'), async (req, res) => {
  const patient = await Patient.findOne({ account: req.session.user.id });
  if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });
  const appointment = await Appointment.findOne({ _id: req.params.id, patient: patient._id, status: { $in: ['Requested', 'Scheduled'] } });
  if (!appointment) return res.status(404).json({ error: 'Appointment not found or can no longer be cancelled.' });
  appointment.status = 'Cancelled';
  await appointment.save();
  res.json(appointment);
});
app.patch('/api/portal/profile', allow('patient'), async (req, res) => {
  const patient = await Patient.findOne({ account: req.session.user.id });
  if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });
  for (const key of ['phone', 'email', 'address', 'emergencyContact']) if (typeof req.body[key] === 'string') patient[key] = req.body[key].trim().slice(0, key === 'address' ? 255 : 120);
  await patient.save();
  res.json({ patient });
});
app.post('/api/portal/messages', allow('patient'), async (req, res) => {
  const patient = await Patient.findOne({ account: req.session.user.id });
  const body = String(req.body.body || '').trim();
  if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });
  if (body.length < 2 || body.length > 3000) return res.status(400).json({ error: 'Message must be between 2 and 3,000 characters.' });
  const message = await Message.create({ patient: patient._id, sender: req.session.user.id, body, direction: 'patient' });
  res.status(201).json(message);
});

app.get('/api/dashboard', requireAuth, async (req, res) => {
  const user = req.session.user;
  if (user.role === 'pending' || user.approved === false) return res.status(403).json({ error: 'Your account is waiting for administrator approval.' });
  if (user.role === 'patient') {
    const patient = await Patient.findOne({ account: user.id });
    if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });
    const [appointments, prescriptions, unpaid, results, imagingResults] = await Promise.all([
      Appointment.countDocuments({ patient: patient._id, status: { $in: ['Requested', 'Scheduled'] } }),
      Prescription.countDocuments({ patient: patient._id }),
      Invoice.countDocuments({ patient: patient._id, status: { $in: ['Pending', 'Partially paid'] } }),
      LabOrder.countDocuments({ patient: patient._id, status: 'Released' }),
      ImagingOrder.countDocuments({ patient: patient._id, status: 'Released' })
    ]);
    return res.json({ role: 'patient', patients: 1, appointments, prescriptions, pendingBills: unpaid, results, imagingResults });
  }
  if (user.role === 'doctor') {
    const provider = await Doctor.findOne({ account: user.id }) || await Doctor.findOne({ name: user.displayName });
    if (!provider) return res.json({ role: 'doctor', patients: 0, appointments: 0, prescriptions: 0, results: 0, upcoming: [] });
    const patientIds = await Appointment.distinct('patient', { doctor: provider._id });
    const [appointments, prescriptions, results, imagingOrders, upcoming] = await Promise.all([
      Appointment.countDocuments({ doctor: provider._id, status: { $in: ['Requested', 'Scheduled', 'Checked-in'] } }),
      Prescription.countDocuments({ doctor: provider._id }),
      LabOrder.countDocuments({ doctor: provider._id, status: 'Released' }),
      ImagingOrder.countDocuments({ doctor: provider._id, status: { $in: ['Reported', 'Reviewed'] } }),
      Appointment.find({ doctor: provider._id, date: { $gte: new Date() }, status: { $in: ['Requested', 'Scheduled', 'Checked-in'] } }).populate('patient doctor').sort({ date: 1 }).limit(8)
    ]);
    return res.json({ role: 'doctor', patients: patientIds.length, appointments, prescriptions, results, imagingOrders, upcoming });
  }
  if (user.role === 'staff' && user.subRole === 'imaging') {
    const [queue, awaitingReport, awaitingReview, urgent, upcoming] = await Promise.all([
      ImagingOrder.countDocuments({ status: { $in: ['Ordered', 'Scheduled'] } }),
      ImagingOrder.countDocuments({ status: 'Acquired' }),
      ImagingOrder.countDocuments({ status: 'Reported' }),
      ImagingOrder.countDocuments({ priority: 'STAT', status: { $nin: ['Reviewed', 'Released'] } }),
      ImagingOrder.find({ status: { $in: ['Ordered', 'Scheduled', 'Acquired'] } }).populate([{ path: 'patient', select: 'name age gender' }, { path: 'doctor', select: 'name specialization' }]).sort({ createdAt: 1 }).limit(200)
    ]);
    upcoming.sort((a, b) => imagingPriorityRank[a.priority] - imagingPriorityRank[b.priority] || new Date(a.createdAt) - new Date(b.createdAt));
    return res.json({ role: 'staff', subRole: 'imaging', queue, awaitingReport, awaitingReview, urgent, upcoming: upcoming.slice(0, 8) });
  }
  const canReadAppointments = ['admin', 'doctor'].includes(user.role) || (user.role === 'staff' && ['receptionist', 'nurse', 'records'].includes(user.subRole));
  const nurseUser = user.role === 'staff' && user.subRole === 'nurse';
  let nursePatientIds = null;
  if (nurseUser) {
    const [visitPatients, admissionPatients] = await Promise.all([
      Visit.distinct('patient', { assignedNurse: user.id, status: { $in: ['Waiting', 'In consultation'] } }),
      Admission.distinct('patient', { assignedNurse: user.id, status: 'Admitted' })
    ]);
    nursePatientIds = [...new Set([...visitPatients, ...admissionPatients].map(String))];
  }
  const pharmacyUser = user.role === 'staff' && user.subRole === 'pharmacy';
  const canReadPrescriptions = ['admin', 'doctor'].includes(user.role) || pharmacyUser;
  const canReadInvoices = user.role === 'admin' || (user.role === 'staff' && ['receptionist', 'billing'].includes(user.subRole));
  const canReadVisits = ['admin', 'doctor'].includes(user.role) || (user.role === 'staff' && ['receptionist', 'nurse'].includes(user.subRole));
  const [patients, doctors, appointments, prescriptions, pendingBills, visits, upcoming, medicationStock, lowStock] = await Promise.all([
    nurseUser ? nursePatientIds.length : Patient.countDocuments(), canReadAppointments ? Doctor.countDocuments() : 0,
    canReadAppointments ? Appointment.countDocuments({ ...(nurseUser ? { patient: { $in: nursePatientIds } } : {}), status: { $in: ['Requested', 'Scheduled', 'Checked-in'] } }) : 0,
    canReadPrescriptions ? Prescription.countDocuments(pharmacyUser ? { status: { $in: ['Active', 'Partially dispensed'] } } : {}) : 0,
    canReadInvoices ? Invoice.countDocuments({ status: { $in: ['Pending', 'Partially paid'] } }) : 0,
    canReadVisits ? Visit.countDocuments({ ...(nurseUser ? { assignedNurse: user.id } : {}), status: { $in: ['Waiting', 'In consultation'] } }) : 0,
    canReadAppointments ? Appointment.find({ ...(nurseUser ? { patient: { $in: nursePatientIds } } : {}), date: { $gte: new Date() }, status: { $in: ['Requested', 'Scheduled', 'Checked-in'] } }).populate('patient doctor').sort({ date: 1 }).limit(7) : [],
    pharmacyUser ? StockItem.countDocuments({ category: 'Medication' }) : 0,
    pharmacyUser ? StockItem.countDocuments({ category: 'Medication', $expr: { $lte: ['$quantity', '$reorderAt'] } }) : 0
  ]);
  const activeAdmissions = nurseUser ? await Admission.countDocuments({ assignedNurse: user.id, status: 'Admitted' }) : 0;
  res.json({ patients, doctors, appointments, prescriptions, pendingBills, visits, upcoming, medicationStock, lowStock, activeAdmissions });
});

app.get('/api/reports', allow('admin'), async (req, res) => {
  const parseDay = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
  };
  const today = new Date();
  const endDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const from = req.query.from ? parseDay(req.query.from) : new Date(endDay.getTime() - 29 * 86400000);
  const toDay = req.query.to ? parseDay(req.query.to) : endDay;
  if (!from || !toDay || from > toDay) return res.status(400).json({ error: 'Choose a valid date range.' });
  const to = new Date(toDay.getTime() + 86400000);
  if (to.getTime() - from.getTime() > 366 * 86400000) return res.status(400).json({ error: 'Reports can cover up to 366 days at a time.' });
  const appointmentRange = { date: { $gte: from, $lt: to } };
  const createdRange = { createdAt: { $gte: from, $lt: to } };
  const processedRange = { processedAt: { $gte: from, $lt: to } };
  const sumAmount = rows => Number(rows[0]?.total || 0);
  const [registeredPatients, appointments, completedAppointments, noShows, billed, adjustments, collected, outstanding, admissions, dailyAppointments] = await Promise.all([
    Patient.countDocuments(createdRange),
    Appointment.countDocuments({ ...appointmentRange, status: { $ne: 'Cancelled' } }),
    Appointment.countDocuments({ ...appointmentRange, status: 'Completed' }),
    Appointment.countDocuments({ ...appointmentRange, status: 'No-show' }),
    Invoice.aggregate([{ $match: createdRange }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    InvoiceAdjustment.aggregate([{ $match: processedRange }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    PaymentTransaction.aggregate([{ $match: { ...processedRange, type: { $in: ['Payment', 'Refund'] } } }, { $group: { _id: null, total: { $sum: { $cond: [{ $eq: ['$type', 'Refund'] }, { $multiply: ['$amount', -1] }, '$amount'] } }, count: { $sum: { $cond: [{ $eq: ['$type', 'Payment'] }, 1, 0] } } } }]),
    Invoice.aggregate([{ $match: { status: { $in: ['Pending', 'Partially paid'] } } }, { $group: { _id: null, total: { $sum: { $subtract: [{ $add: ['$amount', { $ifNull: ['$adjustedAmount', 0] }] }, { $ifNull: ['$paidAmount', 0] }] } }, count: { $sum: 1 } } }]),
    Admission.countDocuments({ admittedAt: { $gte: from, $lt: to } }),
    Appointment.aggregate([
      { $match: { ...appointmentRange, status: { $ne: 'Cancelled' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  ]);
  res.json({
    from: from.toISOString().slice(0, 10), to: toDay.toISOString().slice(0, 10),
    summary: { registeredPatients, appointments, completedAppointments, noShows, billed: sumAmount(billed) + sumAmount(adjustments), collected: sumAmount(collected), payments: collected[0]?.count || 0, outstanding: sumAmount(outstanding), openInvoices: outstanding[0]?.count || 0, admissions },
    dailyAppointments
  });
});

const resources = { patients: Patient, doctors: Doctor, appointments: Appointment, prescriptions: Prescription, invoices: Invoice, visits: Visit, admissions: Admission, beds: Bed, inventory: StockItem, encounters: Encounter };
for (const [name, Model] of Object.entries(resources)) {
  const readRoles = {
    patients: ['admin', 'doctor', 'staff:receptionist', 'staff:nurse', 'staff:billing', 'staff:records'],
    doctors: ['admin', 'doctor', 'staff:receptionist', 'staff:nurse', 'staff:records'],
    appointments: ['admin', 'doctor', 'staff:receptionist', 'staff:nurse', 'staff:records'],
    prescriptions: ['admin', 'doctor', 'staff:pharmacy'],
    invoices: ['admin', 'staff:receptionist', 'staff:billing'],
    visits: ['admin', 'doctor', 'staff:receptionist', 'staff:nurse'],
    admissions: ['admin', 'doctor', 'staff:receptionist', 'staff:nurse'],
    beds: ['admin', 'staff:nurse', 'staff:operations'],
    inventory: ['admin', 'staff:pharmacy', 'staff:operations'],
    encounters: ['admin', 'doctor']
  }[name];
  app.get(`/api/${name}`, allow(...readRoles), async (req, res) => {
    const query = {};
    if (name === 'patients' && req.session.user.role === 'doctor') {
      const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
      query._id = { $in: provider ? await Appointment.distinct('patient', { doctor: provider._id, status: { $in: ['Requested', 'Scheduled', 'Checked-in', 'Completed'] } }) : [] };
    }
    if (name === 'patients' && req.session.user.role === 'staff' && req.session.user.subRole === 'nurse') query._id = { $in: await nurseAssignedPatientIds(req.session.user.id) };
    if (name === 'doctors' && req.session.user.role === 'doctor') {
      const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
      query._id = provider?._id || null;
    }
    if (['appointments', 'prescriptions'].includes(name) && req.session.user.role === 'doctor') {
      const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
      query.doctor = provider?._id || null;
    }
    if (name === 'appointments' && req.session.user.role === 'staff' && req.session.user.subRole === 'nurse') query.patient = { $in: await nurseAssignedPatientIds(req.session.user.id) };
    if (name === 'visits' && req.session.user.role === 'staff' && req.session.user.subRole === 'nurse') query.assignedNurse = req.session.user.id;
    if (name === 'visits' && req.session.user.role === 'doctor') {
      const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
      query.doctor = provider?._id || null;
    }
    if (name === 'admissions' && req.session.user.role === 'doctor') {
      const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
      query.doctor = provider?._id || null;
    }
    if (name === 'admissions' && req.session.user.role === 'staff' && req.session.user.subRole === 'nurse') query.assignedNurse = req.session.user.id;
    if (name === 'encounters' && req.session.user.role === 'doctor') {
      const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
      query.doctor = provider?._id || null;
    }
    if (name === 'patients' && req.query.q) query.$or = ['name', 'phone', 'email'].map(field => ({ [field]: { $regex: String(req.query.q).slice(0, 80), $options: 'i' } }));
    const rows = await Model.find(query).sort({ createdAt: -1 }).limit(300).populate(['appointments', 'prescriptions', 'patient', 'doctor', 'bed', 'assignedNurse', 'triagedBy'].filter(field => Model.schema.path(field)));
    res.json(rows);
  });
  const writeRoles = {
    patients: ['admin', 'staff:receptionist', 'staff:records'],
    doctors: ['admin'],
    appointments: ['admin', 'staff:receptionist', 'staff:records'],
    prescriptions: ['doctor', 'admin'],
    invoices: ['admin', 'staff:receptionist', 'staff:billing'],
    visits: ['admin', 'staff:receptionist', 'staff:nurse'],
    admissions: ['admin', 'staff:receptionist', 'staff:nurse'],
    beds: ['admin', 'staff:operations'],
    inventory: ['admin', 'staff:pharmacy', 'staff:operations'],
    encounters: ['admin', 'doctor']
  }[name];
  app.post(`/api/${name}`, allow(...writeRoles), async (req, res) => {
    if (name === 'visits') {
      const patient = await Patient.findById(req.body.patient);
      const doctor = await Doctor.findById(req.body.doctor);
      const isNurse = req.session.user.role === 'staff' && req.session.user.subRole === 'nurse';
      const assignedNurse = isNurse ? await User.findOne({ _id: req.session.user.id, role: 'staff', subRole: 'nurse', active: true }) : await User.findOne({ _id: req.body.assignedNurse, role: 'staff', subRole: 'nurse', active: true });
      const reason = String(req.body.reason || '').trim();
      if (!patient || !doctor || !assignedNurse || reason.length < 2 || reason.length > 500) return res.status(400).json({ error: 'Choose a patient, doctor, assigned active nurse, and valid visit reason.' });
      const priority = ['Routine', 'Urgent'].includes(req.body.priority) ? req.body.priority : 'Routine';
      return res.status(201).json(await Visit.create({ patient: patient._id, doctor: doctor._id, assignedNurse: assignedNurse._id, reason, priority, status: 'Waiting' }));
    }
    if (name === 'admissions') {
      const patient = await Patient.findById(req.body.patient);
      const doctor = await Doctor.findById(req.body.doctor);
      const isNurse = req.session.user.role === 'staff' && req.session.user.subRole === 'nurse';
      const assignedNurse = isNurse ? await User.findOne({ _id: req.session.user.id, role: 'staff', subRole: 'nurse', active: true }) : await User.findOne({ _id: req.body.assignedNurse, role: 'staff', subRole: 'nurse', active: true });
      if (!patient || !doctor || !assignedNurse) return res.status(400).json({ error: 'Choose a valid patient, attending doctor, and assigned active nurse.' });
      const bed = await Bed.findOneAndUpdate({ _id: req.body.bed, status: 'Available' }, { $set: { status: 'Occupied' } }, { new: true });
      if (!bed) return res.status(409).json({ error: 'That bed is no longer available.' });
      try {
        const admission = await Admission.create({ patient: patient._id, doctor: doctor._id, bed: bed._id, assignedNurse: assignedNurse._id, reason: String(req.body.reason || '').trim(), diagnosis: String(req.body.diagnosis || '').trim() });
        return res.status(201).json(admission);
      } catch (error) {
        await Bed.updateOne({ _id: bed._id, status: 'Occupied' }, { $set: { status: 'Available' } });
        throw error;
      }
    }
    if (name === 'encounters') {
      const patient = await Patient.findById(req.body.patient);
      const doctor = await Doctor.findById(req.body.doctor);
      const provider = req.session.user.role === 'doctor' ? await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName }) : doctor;
      const appointment = patient && doctor ? await Appointment.findOne({ _id: req.body.appointment, patient: patient._id, doctor: doctor._id, status: { $in: ['Checked-in', 'Scheduled', 'Completed'] } }) : null;
      if (!patient || !doctor || !provider || String(provider._id) !== String(doctor._id) || !appointment) return res.status(403).json({ error: 'Choose a scheduled or completed visit under your doctor profile.' });
      if (await Encounter.exists({ appointment: appointment._id })) return res.status(409).json({ error: 'A clinical note already exists for this visit.' });
      const encounter = await Encounter.create({ ...cleanFields(Encounter, req.body), appointment: appointment._id, author: req.session.user.id, status: 'Draft' });
      return res.status(201).json(encounter);
    }
    if (name === 'appointments') {
      const patient = await Patient.findById(req.body.patient);
      const doctor = await Doctor.findById(req.body.doctor);
      const date = new Date(req.body.date);
      if (!patient || !doctor || !Number.isFinite(date.getTime())) return res.status(400).json({ error: 'Choose a valid patient, doctor, and appointment date.' });
      const windowStart = new Date(date.getTime() - 30 * 60000), windowEnd = new Date(date.getTime() + 30 * 60000);
      if (await Appointment.exists({ doctor: doctor._id, status: { $in: ['Requested', 'Scheduled', 'Checked-in'] }, date: { $gte: windowStart, $lte: windowEnd } })) return res.status(409).json({ error: 'That doctor has another requested or scheduled visit near this time.' });
    }
    if (name === 'invoices') {
      const patient = await Patient.findById(req.body.patient);
      const description = String(req.body.description || '').trim();
      const amount = Number(req.body.amount);
      const amountCents = parseCurrencyCents(req.body.amount);
      const dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
      if (!patient || description.length < 2 || description.length > 500 || amountCents === null || amount > 100000000 || (dueAt && !Number.isFinite(dueAt.getTime()))) return res.status(400).json({ error: 'Choose a patient, enter a description, and set a positive invoice amount with up to two decimal places.' });
      const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const invoice = await Invoice.create({ patient: patient._id, invoiceNumber, description, amount: amountCents / 100, amountCents, adjustedAmount: 0, adjustedCents: 0, paidAmount: 0, paidCents: 0, dueAt: dueAt || undefined, createdBy: req.session.user.id, status: 'Pending' });
      await invoice.populate('patient', 'name phone');
      return res.status(201).json(invoice);
    }
    if (name === 'doctors') {
      const details = cleanFields(Model, req.body);
      const existing = await Doctor.findOne({ name: new RegExp(`^${String(details.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      if (existing) { Object.assign(existing, details); await existing.save(); return res.status(200).json(existing); }
      const provider = await Doctor.create(details); return res.status(201).json(provider);
    }
    if (name === 'prescriptions' && req.session.user.role === 'doctor') {
      const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
      if (!provider || String(provider._id) !== String(req.body.doctor) || !await Appointment.exists({ patient: req.body.patient, doctor: provider._id, status: { $in: ['Checked-in', 'Scheduled', 'Completed'] } })) return res.status(403).json({ error: 'Prescriptions can only be added to a patient with a scheduled or completed visit in your care.' });
    }
    if (name === 'prescriptions') {
      const fields = cleanFields(Model, req.body);
      const quantity = Number(fields.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) return res.status(400).json({ error: 'Enter the total medication quantity prescribed.' });
      delete fields.status; delete fields.dispensedQuantity; delete fields.totalDispensedQuantity; delete fields.refillsUsed; delete fields.dispensedAt; delete fields.dispensedBy;
      const prescription = await Prescription.create({ ...fields, status: 'Active', refillsUsed: 0, dispensedQuantity: 0, totalDispensedQuantity: 0 });
      return res.status(201).json(prescription);
    }
    const doc = await Model.create(cleanFields(Model, req.body));
    if (name === 'inventory' && doc.quantity > 0) await StockMovement.create({ item: doc._id, actor: req.session.user.id, type: 'Initial stock', change: doc.quantity, reason: 'Initial stock entry' });
    res.status(201).json(doc);
  });
  if (['appointments', 'invoices', 'visits', 'admissions', 'beds', 'inventory'].includes(name)) app.patch(`/api/${name}/:id`, allow(...({ appointments: ['admin', 'doctor', 'staff:receptionist', 'staff:records'], invoices: ['admin', 'staff:receptionist', 'staff:billing'], visits: ['admin', 'staff:receptionist', 'staff:nurse'], admissions: ['admin', 'doctor', 'staff:receptionist', 'staff:nurse'], beds: ['admin', 'staff:operations'], inventory: ['admin', 'staff:pharmacy', 'staff:operations'] }[name])), async (req, res) => {
    const allowed = name === 'appointments' || name === 'beds' ? ['status'] : name === 'invoices' ? ['status', 'voidReason'] : name === 'admissions' ? ['status', 'dischargeSummary', 'assignedNurse'] : name === 'inventory' ? ['quantity', 'reorderAt', 'expiresAt'] : name === 'visits' ? ['status', 'priority', 'bloodPressure', 'pulse', 'temperature', 'weight', 'handoffNote', 'assignedNurse'] : ['status', 'priority'];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (changes.assignedNurse !== undefined) {
      if (!(req.session.user.role === 'admin' || (req.session.user.role === 'staff' && req.session.user.subRole === 'receptionist'))) return res.status(403).json({ error: 'Only administration or reception can reassign nursing work.' });
      const nurse = await User.findOne({ _id: changes.assignedNurse, role: 'staff', subRole: 'nurse', active: true });
      if (!nurse) return res.status(400).json({ error: 'Choose an active nurse account.' });
      changes.assignedNurse = nurse._id;
    }
    const filter = { _id: req.params.id };
    if (name === 'appointments' && req.session.user.role === 'doctor') {
      const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
      filter.doctor = provider?._id || null;
    }
    if (name === 'admissions' && req.session.user.role === 'doctor') {
      const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
      filter.doctor = provider?._id || null;
    }
    if (name === 'admissions' && req.session.user.role === 'staff' && req.session.user.subRole === 'nurse') filter.assignedNurse = req.session.user.id;
    if (name === 'visits' && req.session.user.role === 'staff' && req.session.user.subRole === 'nurse') filter.assignedNurse = req.session.user.id;
    const current = await Model.findOne(filter);
    if (!current) return res.status(404).json({ error: 'Record not found.' });
    if (name === 'admissions' && changes.status === 'Discharged') {
      if (current.status !== 'Admitted') return res.status(400).json({ error: 'Only an active admission can be discharged.' });
      const summary = String(changes.dischargeSummary || '').trim();
      if (summary.length < 10) return res.status(400).json({ error: 'Add a discharge summary before completing the discharge.' });
      changes.dischargeSummary = summary.slice(0, 5000);
      changes.dischargedAt = new Date();
    }
    if (name === 'admissions' && changes.status && changes.status !== current.status && changes.status !== 'Discharged') return res.status(400).json({ error: 'Choose a valid admission status transition.' });
    if (name === 'admissions' && changes.assignedNurse && current.status !== 'Admitted') return res.status(400).json({ error: 'Only active admissions can be reassigned.' });
    if (name === 'beds') {
      if (current.status === 'Occupied' || changes.status === 'Occupied') return res.status(400).json({ error: 'Bed occupancy is managed through the admission workflow.' });
      if (!['Available', 'Cleaning', 'Maintenance'].includes(changes.status)) return res.status(400).json({ error: 'Choose Available, Cleaning, or Maintenance.' });
    }
    if (name === 'visits') {
      const triageFields = ['bloodPressure', 'pulse', 'temperature', 'weight', 'handoffNote'];
      for (const key of triageFields) {
        if (!(key in changes)) continue;
        if (['pulse', 'temperature', 'weight'].includes(key)) changes[key] = changes[key] === '' ? null : Number(changes[key]);
        else if (typeof changes[key] === 'string') changes[key] = changes[key].trim().slice(0, key === 'handoffNote' ? 2000 : 40);
      }
      if (triageFields.some(key => key in changes)) { changes.triagedAt = new Date(); changes.triagedBy = req.session.user.id; }
    }
    if (name === 'appointments' && changes.status) {
      const isDoctor = req.session.user.role === 'doctor';
      const isFrontDesk = req.session.user.role === 'admin' || (req.session.user.role === 'staff' && ['receptionist', 'records'].includes(req.session.user.subRole));
      const transitions = isDoctor ? (['Scheduled', 'Checked-in'].includes(current.status) ? ['Completed'] : []) : isFrontDesk ? (current.status === 'Requested' ? ['Scheduled', 'Cancelled'] : current.status === 'Scheduled' ? ['Cancelled', 'No-show'] : []) : [];
      if (changes.status === 'Checked-in' || !transitions.includes(changes.status)) return res.status(400).json({ error: 'Use the check-in action for arrival and choose a valid appointment status transition.' });
      if (changes.status === 'Completed') changes.completedAt = new Date();
    }
    if (name === 'invoices' && changes.status) {
      if (changes.status !== 'Voided' || req.session.user.role !== 'admin' || current.status === 'Voided') return res.status(400).json({ error: 'Record invoice payments through the payment ledger. Only an administrator can void an unpaid invoice.' });
      if (current.status !== 'Pending' || Number(current.paidAmount || 0) > 0 || await PaymentTransaction.exists({ invoice: current._id })) return res.status(409).json({ error: 'Only an unpaid invoice without payment history can be voided.' });
      const reason = String(changes.voidReason || '').trim();
      if (reason.length < 3) return res.status(400).json({ error: 'Enter a reason before voiding this invoice.' });
      changes.status = 'Voided';
      changes.voidReason = reason.slice(0, 500);
      changes.voidedAt = new Date();
      filter.status = 'Pending';
      filter.$expr = { $eq: [invoicePaidCentsExpr, 0] };
    }
    if (name === 'inventory' && changes.quantity !== undefined) {
      const nextQuantity = Number(changes.quantity);
      if (!Number.isFinite(nextQuantity) || nextQuantity < 0) return res.status(400).json({ error: 'Stock quantity must be zero or greater.' });
      const row = await StockItem.findOneAndUpdate({ ...filter, quantity: current.quantity }, { $set: { ...changes, quantity: nextQuantity } }, { new: true, runValidators: true });
      if (!row) return res.status(409).json({ error: 'Stock changed in another session. Refresh and try again.' });
      const change = nextQuantity - current.quantity;
      if (change) await StockMovement.create({ item: row._id, actor: req.session.user.id, type: 'Adjustment', change, reason: String(req.body.reason || 'Manual stock correction').trim().slice(0, 240) });
      return res.json(row);
    }
    const row = await Model.findOneAndUpdate(filter, changes, { new: true, runValidators: true });
    if (!row && name === 'invoices') return res.status(409).json({ error: 'The invoice changed while you were working. Refresh the account and try again.' });
    if (name === 'admissions' && row.status === 'Discharged') await Bed.updateOne({ _id: row.bed }, { $set: { status: 'Cleaning' } });
    if (name === 'visits' && row.status === 'Completed' && row.appointment) await Appointment.updateOne({ _id: row.appointment, status: 'Checked-in' }, { $set: { status: 'Completed', completedAt: new Date() } });
    if (name === 'appointments' && row.status === 'Completed') await Visit.updateOne({ appointment: row._id, status: { $ne: 'Completed' } }, { $set: { status: 'Completed' } });
    res.json(row);
  });
  if (name === 'encounters') app.patch('/api/encounters/:id', allow('admin', 'doctor'), async (req, res) => {
    const filter = { _id: req.params.id };
    if (req.session.user.role === 'doctor') {
      const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
      filter.doctor = provider?._id || null;
    }
    const encounter = await Encounter.findOne(filter);
    if (!encounter) return res.status(404).json({ error: 'Encounter not found.' });
    if (encounter.status === 'Signed') return res.status(409).json({ error: 'Signed clinical notes are locked.' });
    if (req.body.status && req.body.status !== 'Signed') return res.status(400).json({ error: 'Clinical notes can only move from Draft to Signed.' });
    const editable = ['chiefConcern', 'diagnosis', 'note', 'bloodPressure', 'pulse', 'temperature', 'weight'];
    for (const key of editable) {
      if (!(key in req.body)) continue;
      if (['pulse', 'temperature', 'weight'].includes(key) && req.body[key] === '') { encounter[key] = undefined; continue; }
      encounter[key] = req.body[key];
    }
    if (!String(encounter.chiefConcern || '').trim() || !String(encounter.note || '').trim()) return res.status(400).json({ error: 'A visit reason and clinical note are required.' });
    if (req.body.status === 'Signed') { encounter.status = 'Signed'; encounter.signedAt = new Date(); }
    await encounter.save(); res.json(encounter);
  });
  if (['patients', 'doctors'].includes(name)) app.patch(`/api/${name}/:id`, allow(...(name === 'patients' ? ['admin', 'staff:receptionist', 'staff:records'] : ['admin'])), async (req, res) => {
    const row = await Model.findByIdAndUpdate(req.params.id, cleanFields(Model, req.body), { new: true, runValidators: true });
    if (!row) return res.status(404).json({ error: 'Record not found.' }); res.json(row);
  });
  app.delete(`/api/${name}/:id`, allow('admin'), async (req, res) => {
    if (name === 'invoices') return res.status(409).json({ error: 'Financial invoices are retained in the account history. Void an eligible unpaid invoice instead.' });
    const row = await Model.findByIdAndDelete(req.params.id); if (!row) return res.status(404).json({ error: 'Record not found.' }); res.json({ ok: true });
  });
}
function parseCurrencyCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return null;
  const cents = Math.round(amount * 100);
  return Math.abs(amount * 100 - cents) < 0.000001 ? cents : null;
}
function newReceiptNumber() { return `RCT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`; }
const invoiceStoredPaidCentsExpr = { $ifNull: ['$paidCents', { $round: [{ $multiply: [{ $ifNull: ['$paidAmount', 0] }, 100] }, 0] }] };
const invoiceBaseCentsExpr = { $ifNull: ['$amountCents', { $round: [{ $multiply: ['$amount', 100] }, 0] }] };
const invoiceAdjustedCentsExpr = { $ifNull: ['$adjustedCents', { $round: [{ $multiply: [{ $ifNull: ['$adjustedAmount', 0] }, 100] }, 0] }] };
const invoiceAmountCentsExpr = { $add: [invoiceBaseCentsExpr, invoiceAdjustedCentsExpr] };
const invoicePaidCentsExpr = { $cond: [{ $and: [{ $eq: ['$status', 'Paid'] }, { $eq: [invoiceStoredPaidCentsExpr, 0] }] }, invoiceAmountCentsExpr, invoiceStoredPaidCentsExpr] };
app.get('/api/billing', allow('admin', 'staff:billing', 'staff:receptionist'), async (req, res) => {
  const canReadAdjustmentLedger = req.session.user.role === 'admin' || (req.session.user.role === 'staff' && req.session.user.subRole === 'billing');
  const [invoices, transactions, adjustments] = await Promise.all([
    Invoice.find().populate('patient', 'name phone').sort({ createdAt: -1 }).limit(500),
    PaymentTransaction.find().populate('invoice', 'invoiceNumber description amount paidAmount status').populate('patient', 'name').populate('actor', 'displayName username role').sort({ processedAt: -1 }).limit(1000),
    canReadAdjustmentLedger ? InvoiceAdjustment.find().populate('invoice', 'invoiceNumber description').populate('patient', 'name').populate('actor', 'displayName username role').sort({ processedAt: -1 }).limit(1000) : []
  ]);
  res.json({ invoices, transactions, adjustments });
});
app.post('/api/invoices/:id/adjustments', allow('admin', 'staff:billing'), async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice || invoice.status === 'Voided') return res.status(404).json({ error: 'An active invoice is required to post an adjustment.' });
  const rawAmount = Number(req.body.amount);
  const absoluteCents = Number.isFinite(rawAmount) ? parseCurrencyCents(Math.abs(rawAmount)) : null;
  const reason = String(req.body.reason || '').trim().slice(0, 500);
  if (absoluteCents === null || !rawAmount || reason.length < 3) return res.status(400).json({ error: 'Enter a non-zero adjustment amount with up to two decimal places and a reason.' });
  const amountCents = Math.sign(rawAmount) * absoluteCents;
  const adjustmentNumber = `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const adjustment = await InvoiceAdjustment.create({ invoice: invoice._id, patient: invoice.patient, adjustmentNumber, amount: amountCents / 100, amountCents, reason, actor: req.session.user.id });
  const nextAdjustedCents = { $add: [invoiceAdjustedCentsExpr, amountCents] };
  const nextTotalCents = { $add: [invoiceBaseCentsExpr, nextAdjustedCents] };
  let updated;
  try {
    updated = await Invoice.findOneAndUpdate({ _id: invoice._id, status: { $ne: 'Voided' }, $expr: { $and: [{ $gte: [nextTotalCents, invoicePaidCentsExpr] }, { $gte: [nextTotalCents, 1] }] } }, [{ $set: { adjustedCents: nextAdjustedCents, adjustedAmount: { $divide: [nextAdjustedCents, 100] }, paidCents: invoicePaidCentsExpr, paidAmount: { $divide: [invoicePaidCentsExpr, 100] }, status: { $cond: [{ $gte: [invoicePaidCentsExpr, nextTotalCents] }, 'Paid', { $cond: [{ $gt: [invoicePaidCentsExpr, 0] }, 'Partially paid', 'Pending'] }] }, paidAt: { $cond: [{ $gte: [invoicePaidCentsExpr, nextTotalCents] }, new Date(), null] } } }], { new: true }).populate('patient', 'name phone');
  } catch (error) {
    await InvoiceAdjustment.deleteOne({ _id: adjustment._id }).catch(() => {});
    throw error;
  }
  if (!updated) {
    await InvoiceAdjustment.deleteOne({ _id: adjustment._id });
    return res.status(409).json({ error: 'The adjustment cannot reduce the invoice below zero or below payments already posted.' });
  }
  await adjustment.populate([{ path: 'invoice', select: 'invoiceNumber description amount adjustedAmount paidAmount status' }, { path: 'patient', select: 'name' }, { path: 'actor', select: 'displayName username role' }]);
  res.status(201).json({ invoice: updated, adjustment });
});
app.get('/api/insurance', allow('admin', 'staff:billing'), async (_req, res) => {
  const [policies, claims] = await Promise.all([
    InsurancePolicy.find().populate('patient', 'name phone').populate('createdBy', 'displayName username').sort({ active: -1, createdAt: -1 }).limit(1000),
    InsuranceClaim.find().populate('invoice', 'invoiceNumber description amount amountCents adjustedAmount adjustedCents paidAmount paidCents status').populate('patient', 'name').populate('policy', 'payer memberId coveragePercent').populate('createdBy decidedBy', 'displayName username role').sort({ submittedAt: -1 }).limit(1000)
  ]);
  res.json({ policies, claims });
});
app.post('/api/insurance/policies', allow('admin', 'staff:billing'), async (req, res) => {
  const patient = await Patient.findById(req.body.patient);
  const payer = String(req.body.payer || '').trim().slice(0, 160);
  const memberId = String(req.body.memberId || '').trim().slice(0, 120);
  const groupId = String(req.body.groupId || '').trim().slice(0, 120);
  const coveragePercent = Number(req.body.coveragePercent);
  const effectiveFrom = new Date(req.body.effectiveFrom);
  const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
  if (!patient || payer.length < 2 || !memberId || !Number.isFinite(coveragePercent) || coveragePercent <= 0 || coveragePercent > 100 || !Number.isFinite(effectiveFrom.getTime()) || (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt < effectiveFrom))) return res.status(400).json({ error: 'Enter a patient, payer, member ID, valid coverage percentage, and valid coverage dates.' });
  const active = req.body.active !== false;
  if (active) await InsurancePolicy.updateMany({ patient: patient._id, active: true }, { $set: { active: false } });
  const policy = await InsurancePolicy.create({ patient: patient._id, payer, memberId, groupId, coveragePercent, effectiveFrom, expiresAt: expiresAt || undefined, active, note: String(req.body.note || '').trim().slice(0, 500), createdBy: req.session.user.id });
  await policy.populate([{ path: 'patient', select: 'name phone' }, { path: 'createdBy', select: 'displayName username' }]);
  res.status(201).json(policy);
});
app.patch('/api/insurance/policies/:id', allow('admin', 'staff:billing'), async (req, res) => {
  const policy = await InsurancePolicy.findById(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Insurance policy not found.' });
  const changes = {};
  if (req.body.active !== undefined) {
    if (typeof req.body.active !== 'boolean') return res.status(400).json({ error: 'Choose whether the policy is active.' });
    changes.active = req.body.active;
  }
  if ('note' in req.body) changes.note = String(req.body.note || '').trim().slice(0, 500);
  if (!Object.keys(changes).length) return res.status(400).json({ error: 'There are no policy changes to save.' });
  if (changes.active) await InsurancePolicy.updateMany({ patient: policy.patient, _id: { $ne: policy._id }, active: true }, { $set: { active: false } });
  const updated = await InsurancePolicy.findByIdAndUpdate(policy._id, changes, { new: true, runValidators: true }).populate('patient', 'name phone');
  res.json(updated);
});
app.post('/api/invoices/:id/claims', allow('admin', 'staff:billing'), async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice || !['Pending', 'Partially paid'].includes(invoice.status)) return res.status(404).json({ error: 'An open invoice is required to submit an insurance claim.' });
  const policy = await InsurancePolicy.findOne({ _id: req.body.policy, patient: invoice.patient, active: true });
  if (!policy) return res.status(400).json({ error: 'Choose an active insurance policy for this patient.' });
  const now = new Date();
  if (policy.effectiveFrom > now || (policy.expiresAt && policy.expiresAt < now)) return res.status(400).json({ error: 'This policy is outside its coverage dates.' });
  if (await InsuranceClaim.exists({ invoice: invoice._id, status: { $ne: 'Denied' } })) return res.status(409).json({ error: 'This invoice already has a submitted or accepted insurance claim.' });
  const invoiceCents = Number(invoice.amountCents || Math.round(invoice.amount * 100)) + Number(invoice.adjustedCents ?? Math.round(Number(invoice.adjustedAmount || 0) * 100));
  const paidCents = Number(invoice.paidCents ?? Math.round(Number(invoice.paidAmount || 0) * 100));
  const requestedCents = Math.min(invoiceCents - paidCents, Math.round(invoiceCents * policy.coveragePercent / 100));
  if (requestedCents <= 0) return res.status(409).json({ error: 'No invoice balance is available to claim.' });
  const claimNumber = `CLM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const claim = await InsuranceClaim.create({ invoice: invoice._id, patient: invoice.patient, policy: policy._id, claimNumber, requestedCents, requestedAmount: requestedCents / 100, status: 'Submitted', createdBy: req.session.user.id });
  await claim.populate([{ path: 'invoice', select: 'invoiceNumber description amount amountCents adjustedAmount adjustedCents paidAmount paidCents status' }, { path: 'patient', select: 'name' }, { path: 'policy', select: 'payer memberId coveragePercent' }, { path: 'createdBy', select: 'displayName username role' }]);
  res.status(201).json(claim);
});
app.patch('/api/insurance/claims/:id', allow('admin', 'staff:billing'), async (req, res) => {
  const claim = await InsuranceClaim.findById(req.params.id);
  if (!claim) return res.status(404).json({ error: 'Insurance claim not found.' });
  if (claim.status !== 'Submitted') return res.status(409).json({ error: 'Only submitted claims can be adjudicated.' });
  const status = req.body.status;
  if (!['Approved', 'Partially approved', 'Denied'].includes(status)) return res.status(400).json({ error: 'Choose Approved, Partially approved, or Denied.' });
  const approvedCents = status === 'Denied' ? 0 : parseCurrencyCents(req.body.approvedAmount);
  if (status === 'Denied') {
    if (!String(req.body.decisionNote || '').trim()) return res.status(400).json({ error: 'Add a reason when denying a claim.' });
  } else if (approvedCents === null || approvedCents > claim.requestedCents || (status === 'Approved' && approvedCents !== claim.requestedCents) || (status === 'Partially approved' && approvedCents >= claim.requestedCents)) {
    return res.status(400).json({ error: 'Enter an approved amount that matches the selected decision and does not exceed the claim request.' });
  }
  claim.status = status;
  claim.approvedCents = approvedCents;
  claim.approvedAmount = approvedCents / 100;
  claim.payerReference = String(req.body.payerReference || '').trim().slice(0, 160);
  claim.decisionNote = String(req.body.decisionNote || '').trim().slice(0, 1000);
  claim.decidedAt = new Date();
  claim.decidedBy = req.session.user.id;
  await claim.save();
  await claim.populate([{ path: 'invoice', select: 'invoiceNumber description amount amountCents adjustedAmount adjustedCents paidAmount paidCents status' }, { path: 'patient', select: 'name' }, { path: 'policy', select: 'payer memberId coveragePercent' }, { path: 'createdBy decidedBy', select: 'displayName username role' }]);
  res.json(claim);
});
const claimPaidCentsExpr = { $ifNull: ['$paidCents', { $round: [{ $multiply: [{ $ifNull: ['$paidAmount', 0] }, 100] }, 0] }] };
const claimApprovedCentsExpr = { $ifNull: ['$approvedCents', { $round: [{ $multiply: [{ $ifNull: ['$approvedAmount', 0] }, 100] }, 0] }] };
app.post('/api/insurance/claims/:id/payments', allow('admin', 'staff:billing'), async (req, res) => {
  const claim = await InsuranceClaim.findById(req.params.id);
  if (!claim || !['Approved', 'Partially approved'].includes(claim.status)) return res.status(409).json({ error: 'Only an approved claim can receive an insurance remittance.' });
  const amountCents = parseCurrencyCents(req.body.amount);
  const reference = String(req.body.reference || '').trim().slice(0, 160);
  if (amountCents === null) return res.status(400).json({ error: 'Enter a positive remittance amount with up to two decimal places.' });
  const nextClaimPaid = { $add: [claimPaidCentsExpr, amountCents] };
  const reserved = await InsuranceClaim.findOneAndUpdate({ _id: claim._id, status: { $in: ['Approved', 'Partially approved'] }, $expr: { $lte: [nextClaimPaid, claimApprovedCentsExpr] } }, [{ $set: { paidCents: nextClaimPaid, paidAmount: { $divide: [nextClaimPaid, 100] }, status: { $cond: [{ $gte: [nextClaimPaid, claimApprovedCentsExpr] }, 'Paid', 'Partially paid'] }, paidAt: { $cond: [{ $gte: [nextClaimPaid, claimApprovedCentsExpr] }, new Date(), null] } } }], { new: true });
  if (!reserved) return res.status(409).json({ error: 'The remittance exceeds the approved amount remaining on this claim.' });
  let transaction, invoiceCommitted = false;
  try {
    const invoice = await Invoice.findById(claim.invoice);
    if (!invoice || !['Pending', 'Partially paid'].includes(invoice.status)) throw new Error('This invoice is no longer open for an insurance payment.');
    transaction = await PaymentTransaction.create({ invoice: invoice._id, patient: claim.patient, receiptNumber: newReceiptNumber(), type: 'Payment', amount: amountCents / 100, amountCents, method: 'Insurance', reference, note: `Insurance claim ${claim.claimNumber}${req.body.note ? ` · ${String(req.body.note).trim().slice(0, 350)}` : ''}`, actor: req.session.user.id });
    const nextPaidCents = { $add: [invoicePaidCentsExpr, amountCents] };
    const updatedInvoice = await Invoice.findOneAndUpdate({ _id: invoice._id, status: { $in: ['Pending', 'Partially paid'] }, $expr: { $lte: [nextPaidCents, invoiceAmountCentsExpr] } }, [{ $set: { paidCents: nextPaidCents, paidAmount: { $divide: [nextPaidCents, 100] }, status: { $cond: [{ $gte: [nextPaidCents, invoiceAmountCentsExpr] }, 'Paid', 'Partially paid'] }, paidAt: { $cond: [{ $gte: [nextPaidCents, invoiceAmountCentsExpr] }, new Date(), null] } } }], { new: true });
    if (!updatedInvoice) throw new Error('The remittance is greater than the remaining invoice balance.');
    invoiceCommitted = true;
    await Promise.all([reserved.populate([{ path: 'invoice', select: 'invoiceNumber description amount amountCents adjustedAmount adjustedCents paidAmount paidCents status' }, { path: 'patient', select: 'name' }, { path: 'policy', select: 'payer memberId' }]), transaction.populate([{ path: 'invoice', select: 'invoiceNumber description amount paidAmount status' }, { path: 'patient', select: 'name' }, { path: 'actor', select: 'displayName username role' }])]);
    res.status(201).json({ claim: reserved, invoice: updatedInvoice, transaction });
  } catch (error) {
    if (!invoiceCommitted) {
      const rollbackClaimPaid = { $subtract: [claimPaidCentsExpr, amountCents] };
      await InsuranceClaim.updateOne({ _id: claim._id }, [{ $set: { paidCents: rollbackClaimPaid, paidAmount: { $divide: [rollbackClaimPaid, 100] }, status: { $cond: [{ $lte: [rollbackClaimPaid, 0] }, claim.status, 'Partially paid'] }, paidAt: null } }]).catch(() => {});
      if (transaction) await PaymentTransaction.deleteOne({ _id: transaction._id }).catch(() => {});
    }
    if (/no longer open|greater than the remaining/.test(error.message)) return res.status(409).json({ error: error.message });
    throw error;
  }
});
app.post('/api/invoices/:id/payments', allow('admin', 'staff:billing', 'staff:receptionist'), async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
  if (!['Pending', 'Partially paid'].includes(invoice.status)) return res.status(409).json({ error: 'This invoice is not available for payment.' });
  const amountCents = parseCurrencyCents(req.body.amount);
  const methods = ['Cash', 'Card', 'Bank transfer', 'Other'];
  if (amountCents === null || !methods.includes(req.body.method)) return res.status(400).json({ error: 'Enter a positive amount with up to two decimal places and select a payment method.' });
  const transaction = await PaymentTransaction.create({ invoice: invoice._id, patient: invoice.patient, receiptNumber: newReceiptNumber(), type: 'Payment', amount: amountCents / 100, amountCents, method: req.body.method, reference: String(req.body.reference || '').trim().slice(0, 160), note: String(req.body.note || '').trim().slice(0, 500), actor: req.session.user.id });
  const nextPaidCents = { $add: [invoicePaidCentsExpr, amountCents] };
  const totalCents = invoiceAmountCentsExpr;
  let updated;
  try {
    updated = await Invoice.findOneAndUpdate({ _id: invoice._id, status: { $in: ['Pending', 'Partially paid'] }, $expr: { $lte: [nextPaidCents, totalCents] } }, [{ $set: { paidCents: nextPaidCents, paidAmount: { $divide: [nextPaidCents, 100] }, status: { $cond: [{ $gte: [nextPaidCents, totalCents] }, 'Paid', 'Partially paid'] }, paidAt: { $cond: [{ $gte: [nextPaidCents, totalCents] }, new Date(), null] } } }], { new: true }).populate('patient', 'name phone');
  } catch (error) {
    await PaymentTransaction.deleteOne({ _id: transaction._id }).catch(() => {});
    throw error;
  }
  if (!updated) { await PaymentTransaction.deleteOne({ _id: transaction._id }); return res.status(409).json({ error: 'The payment is greater than the remaining invoice balance. Refresh the account and try again.' }); }
  await transaction.populate([{ path: 'invoice', select: 'invoiceNumber description amount paidAmount status' }, { path: 'patient', select: 'name' }, { path: 'actor', select: 'displayName username role' }]);
  res.status(201).json({ invoice: updated, transaction });
});
app.post('/api/invoices/:id/refunds', allow('admin', 'staff:billing'), async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  const originalPayment = await PaymentTransaction.findOne({ _id: req.body.originalPayment, invoice: req.params.id, type: 'Payment' });
  if (!invoice || !originalPayment) return res.status(404).json({ error: 'Invoice or original payment was not found.' });
  if (originalPayment.method === 'Insurance') return res.status(409).json({ error: 'Insurance remittance corrections are not supported in this billing workflow.' });
  const amountCents = parseCurrencyCents(req.body.amount);
  const note = String(req.body.note || '').trim().slice(0, 500);
  if (amountCents === null || note.length < 3) return res.status(400).json({ error: 'Enter a refund amount and a reason of at least three characters.' });
  const refundedCentsExpr = { $ifNull: ['$refundedCents', { $round: [{ $multiply: [{ $ifNull: ['$refundedAmount', 0] }, 100] }, 0] }] };
  const originalCentsExpr = { $ifNull: ['$amountCents', { $round: [{ $multiply: ['$amount', 100] }, 0] }] };
  const nextRefundedCents = { $add: [refundedCentsExpr, amountCents] };
  const reserved = await PaymentTransaction.findOneAndUpdate({ _id: originalPayment._id, type: 'Payment', $expr: { $lte: [nextRefundedCents, originalCentsExpr] } }, [{ $set: { refundedCents: nextRefundedCents, refundedAmount: { $divide: [nextRefundedCents, 100] } } }], { new: true });
  if (!reserved) return res.status(409).json({ error: 'The refund exceeds the remaining amount on this receipt.' });
  let refund, committed = false;
  try {
    refund = await PaymentTransaction.create({ invoice: invoice._id, patient: invoice.patient, receiptNumber: newReceiptNumber(), type: 'Refund', amount: amountCents / 100, amountCents, reverses: originalPayment._id, method: originalPayment.method, note, actor: req.session.user.id });
    const nextPaidCents = { $subtract: [invoicePaidCentsExpr, amountCents] };
    const totalCents = invoiceAmountCentsExpr;
    const updated = await Invoice.findOneAndUpdate({ _id: invoice._id, status: { $in: ['Partially paid', 'Paid'] }, $expr: { $gte: [invoicePaidCentsExpr, amountCents] } }, [{ $set: { paidCents: nextPaidCents, paidAmount: { $divide: [nextPaidCents, 100] }, status: { $cond: [{ $lte: [nextPaidCents, 0] }, 'Pending', 'Partially paid'] }, paidAt: null } }], { new: true }).populate('patient', 'name phone');
    if (!updated) {
      await PaymentTransaction.updateOne({ _id: originalPayment._id }, { $inc: { refundedCents: -amountCents, refundedAmount: -(amountCents / 100) } });
      await PaymentTransaction.deleteOne({ _id: refund._id });
      return res.status(409).json({ error: 'The refund is greater than the amount currently paid on this invoice.' });
    }
    committed = true;
    await refund.populate([{ path: 'invoice', select: 'invoiceNumber description amount paidAmount status' }, { path: 'patient', select: 'name' }, { path: 'actor', select: 'displayName username role' }, { path: 'reverses', select: 'receiptNumber amount method' }]);
    res.status(201).json({ invoice: updated, transaction: refund });
  } catch (error) {
    if (!committed) {
      await PaymentTransaction.updateOne({ _id: originalPayment._id }, { $inc: { refundedCents: -amountCents, refundedAmount: -(amountCents / 100) } }).catch(() => {});
      if (refund) await PaymentTransaction.deleteOne({ _id: refund._id }).catch(() => {});
    }
    throw error;
  }
});
app.post('/api/appointments/:id/check-in', allow('admin', 'staff:receptionist'), async (req, res) => {
  const appointment = await Appointment.findOne({ _id: req.params.id, status: 'Scheduled' });
  if (!appointment) return res.status(409).json({ error: 'Only a scheduled appointment can be checked in.' });
  const nurse = await User.findOne({ _id: req.body.assignedNurse, role: 'staff', subRole: 'nurse', active: true });
  if (!nurse) return res.status(400).json({ error: 'Assign an active nurse to the arriving patient.' });
  if (await Visit.exists({ appointment: appointment._id })) return res.status(409).json({ error: 'This appointment already has a patient-flow visit.' });
  const checkedIn = await Appointment.findOneAndUpdate({ _id: appointment._id, status: 'Scheduled' }, { $set: { status: 'Checked-in', checkedInAt: new Date() } }, { new: true });
  if (!checkedIn) return res.status(409).json({ error: 'The appointment changed in another session. Refresh the schedule.' });
  try {
    const priority = req.body.priority === 'Urgent' ? 'Urgent' : 'Routine';
    const visit = await Visit.create({ appointment: appointment._id, patient: appointment.patient, doctor: appointment.doctor, assignedNurse: nurse._id, reason: String(appointment.reason || 'Scheduled appointment').trim().slice(0, 500), priority, status: 'Waiting' });
    return res.status(201).json({ appointment: checkedIn, visit });
  } catch (error) {
    await Appointment.updateOne({ _id: appointment._id, status: 'Checked-in' }, { $set: { status: 'Scheduled' }, $unset: { checkedInAt: 1 } });
    if (error.code === 11000) return res.status(409).json({ error: 'This appointment already has a patient-flow visit.' });
    throw error;
  }
});
app.get('/api/patients/:id/chart', allow('admin', 'doctor', 'staff:nurse', 'staff:records'), async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found.' });
  const user = req.session.user;
  const provider = user.role === 'doctor' ? await Doctor.findOne({ account: user.id }) || await Doctor.findOne({ name: user.displayName }) : null;
  if (user.role === 'doctor' && (!provider || !await Appointment.exists({ patient: patient._id, doctor: provider._id, status: { $in: ['Requested', 'Scheduled', 'Checked-in', 'Completed'] } }))) return res.status(403).json({ error: 'This patient is not assigned to your care.' });
  if (user.role === 'staff' && user.subRole === 'nurse') {
    const assignments = await Promise.all([Visit.exists({ patient: patient._id, assignedNurse: user.id }), Admission.exists({ patient: patient._id, assignedNurse: user.id })]);
    if (!assignments.some(Boolean)) return res.status(403).json({ error: 'This patient is not assigned to your nursing queue.' });
  }
  const scope = { patient: patient._id };
  const imagingScope = user.role === 'admin' ? scope : user.role === 'doctor' ? { ...scope, status: { $in: ['Reported', 'Reviewed', 'Released'] } } : { ...scope, status: 'Released' };
  const [appointments, encounters, prescriptions, labOrders, imagingOrders, admissions, medicationAdministration] = await Promise.all([
    Appointment.find(scope).populate('doctor').sort({ date: -1 }).limit(50),
    ['admin', 'doctor'].includes(user.role) ? Encounter.find({ ...scope }).populate('doctor').sort({ createdAt: -1 }).limit(50) : user.role === 'staff' && user.subRole === 'records' ? Encounter.find({ patient: patient._id, status: 'Signed' }).populate('doctor').sort({ signedAt: -1 }).limit(50) : [],
    ['admin', 'doctor'].includes(user.role) ? Prescription.find(scope).populate('doctor').sort({ createdAt: -1 }).limit(50) : [],
    LabOrder.find({ ...scope, status: 'Released' }).populate('doctor').sort({ releasedAt: -1 }).limit(50),
    ImagingOrder.find(imagingScope).populate('doctor reviewedBy', 'name displayName username').sort({ createdAt: -1 }).limit(50),
    Admission.find(scope).populate('doctor bed assignedNurse').sort({ admittedAt: -1 }).limit(20),
    MedicationAdministration.find(scope).populate('prescription').populate('administeredBy', 'displayName username').sort({ administeredAt: -1 }).limit(100)
  ]);
  res.json({ patient, appointments, encounters, prescriptions, labOrders, imagingOrders, admissions, medicationAdministration });
});
app.post('/api/prescriptions/:id/dispense', allow('admin', 'staff:pharmacy'), async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) return res.status(404).json({ error: 'Prescription not found.' });
  if (!Number.isFinite(prescription.quantity) || prescription.quantity <= 0) return res.status(409).json({ error: 'This older prescription has no recorded quantity. Ask the prescriber to replace it before dispensing.' });
  if (!['Active', 'Partially dispensed'].includes(prescription.status)) return res.status(409).json({ error: 'This prescription is no longer available to dispense.' });
  const amount = Number(req.body.quantity);
  const dispensed = Number(prescription.dispensedQuantity || 0);
  const remaining = prescription.quantity - dispensed;
  if (!Number.isFinite(amount) || amount <= 0 || amount - remaining > 0.000001) return res.status(400).json({ error: `Enter a quantity above zero and no greater than ${remaining}.` });
  const stockCandidate = await StockItem.findById(req.body.stockItem);
  if (!stockCandidate || stockCandidate.category !== 'Medication' || stockCandidate.name.trim().toLocaleLowerCase('en-US') !== prescription.medicine.trim().toLocaleLowerCase('en-US')) return res.status(400).json({ error: 'Choose an in-stock medication with the exact prescribed name.' });
  if (stockCandidate.expiresAt && stockCandidate.expiresAt.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)) return res.status(409).json({ error: 'That medication batch has expired.' });
  const stock = await StockItem.findOneAndUpdate({ _id: stockCandidate._id, category: 'Medication', quantity: { $gte: amount } }, { $inc: { quantity: -amount } }, { new: true });
  if (!stock) return res.status(409).json({ error: 'There is not enough stock. Refresh inventory and try again.' });
  let movement;
  try {
    movement = await StockMovement.create({ item: stock._id, actor: req.session.user.id, type: 'Dispense', change: -amount, reason: `Prescription ${prescription._id}`, prescription: prescription._id });
  } catch (error) {
    await StockItem.updateOne({ _id: stock._id }, { $inc: { quantity: amount } });
    throw error;
  }
  const nextDispensed = dispensed + amount;
  const nextStatus = nextDispensed + 0.000001 >= prescription.quantity ? (Number(prescription.refillsUsed || 0) < Number(prescription.refills || 0) ? 'Refill due' : 'Dispensed') : 'Partially dispensed';
  const updated = await Prescription.findOneAndUpdate(
    { _id: prescription._id, dispensedQuantity: dispensed, status: prescription.status },
    { $inc: { dispensedQuantity: amount, totalDispensedQuantity: amount }, $set: { status: nextStatus, dispensedAt: new Date(), dispensedBy: req.session.user.id } },
    { new: true }
  );
  if (!updated) {
    await Promise.all([
      StockItem.updateOne({ _id: stock._id }, { $inc: { quantity: amount } }),
      StockMovement.deleteOne({ _id: movement._id })
    ]);
    return res.status(409).json({ error: 'This prescription changed in another session. Refresh and try again.' });
  }
  await updated.populate('patient doctor dispensedBy', 'name displayName username');
  res.json({ prescription: updated, stockItem: stock });
});
app.post('/api/prescriptions/:id/refills', allow('admin', 'doctor'), async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) return res.status(404).json({ error: 'Prescription not found.' });
  if (req.session.user.role === 'doctor') {
    const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
    if (!provider || String(provider._id) !== String(prescription.doctor) || !await Appointment.exists({ patient: prescription.patient, doctor: provider._id, status: { $in: ['Checked-in', 'Scheduled', 'Completed'] } })) return res.status(403).json({ error: 'Only the prescribing doctor can authorize a refill for a patient in their care.' });
  }
  if (prescription.status !== 'Refill due' || Number(prescription.refillsUsed || 0) >= Number(prescription.refills || 0)) return res.status(409).json({ error: 'There are no authorized refills available for this prescription.' });
  const updated = await Prescription.findOneAndUpdate(
    { _id: prescription._id, status: 'Refill due', refillsUsed: Number(prescription.refillsUsed || 0), $expr: { $gt: ['$refills', '$refillsUsed'] } },
    { $inc: { refillsUsed: 1 }, $set: { dispensedQuantity: 0, status: 'Active', dispensedAt: null, dispensedBy: null } },
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(409).json({ error: 'The refill changed in another session. Refresh and try again.' });
  res.json(updated);
});
app.get('/api/stock-movements', allow('admin', 'staff:pharmacy', 'staff:operations'), async (_req, res) => {
  const rows = await StockMovement.find().populate('item actor prescription').sort({ createdAt: -1 }).limit(250);
  res.json(rows);
});
app.get('/api/audit', allow('admin'), async (req, res) => {
  const rows = await AuditEvent.find().populate('actor', 'username displayName role').sort({ createdAt: -1 }).limit(250);
  res.json(rows);
});
app.get('/api/nurses', allow('admin', 'staff:receptionist', 'staff:nurse'), async (_req, res) => {
  const nurses = await User.find({ role: 'staff', subRole: 'nurse', active: true }).select('username displayName role subRole active').sort({ displayName: 1 });
  res.json(nurses.map(safeUser));
});
app.get('/api/mar', allow('admin', 'staff:nurse'), async (req, res) => {
  const nurse = req.session.user.role === 'staff' && req.session.user.subRole === 'nurse';
  const admissionQuery = nurse ? { assignedNurse: req.session.user.id } : {};
  const admissions = await Admission.find(admissionQuery).populate('patient doctor bed assignedNurse').sort({ admittedAt: -1 }).limit(200);
  const admissionIds = admissions.map(item => item._id);
  const patientIds = [...new Set(admissions.map(item => String(item.patient?._id)).filter(Boolean))];
  const [events, prescriptions] = await Promise.all([
    MedicationAdministration.find({ admission: { $in: admissionIds } }).populate('prescription').populate('administeredBy', 'displayName username').populate({ path: 'admission', populate: { path: 'patient', select: 'name' } }).sort({ administeredAt: -1 }).limit(500),
    Prescription.find({ patient: { $in: patientIds }, status: { $in: ['Active', 'Partially dispensed', 'Dispensed'] } }).populate('doctor').sort({ createdAt: -1 }).limit(500)
  ]);
  res.json({ admissions, events, prescriptions });
});
app.post('/api/mar', allow('admin', 'staff:nurse'), async (req, res) => {
  const isNurse = req.session.user.role === 'staff' && req.session.user.subRole === 'nurse';
  const admission = await Admission.findOne({ _id: req.body.admission, status: 'Admitted', ...(isNurse ? { assignedNurse: req.session.user.id } : {}) });
  if (!admission) return res.status(404).json({ error: 'Active assigned admission not found.' });
  const prescription = await Prescription.findOne({ _id: req.body.prescription, patient: admission.patient, status: { $in: ['Active', 'Partially dispensed', 'Dispensed'] } });
  if (!prescription) return res.status(400).json({ error: 'Choose an active medication prescribed for this admitted patient.' });
  const status = String(req.body.status || '');
  const doseGiven = String(req.body.doseGiven || '').trim();
  const notes = String(req.body.notes || '').trim().slice(0, 1000);
  if (!['Given', 'Refused', 'Held', 'Missed'].includes(status) || doseGiven.length < 1 || doseGiven.length > 120) return res.status(400).json({ error: 'Choose an administration outcome and enter the dose.' });
  if (status !== 'Given' && notes.length < 3) return res.status(400).json({ error: 'Add a short reason when a dose is refused, held, or missed.' });
  const event = await MedicationAdministration.create({ admission: admission._id, prescription: prescription._id, patient: admission.patient, administeredBy: req.session.user.id, doseGiven, status, notes });
  await event.populate('prescription administeredBy');
  res.status(201).json(event);
});
app.get('/api/staff', allow('admin'), async (_req, res) => res.json((await User.find({ role: { $in: ['admin', 'doctor', 'staff'] } }).select('-passwordHash').sort({ username: 1 })).map(safeUser)));
app.post('/api/staff', allow('admin'), async (req, res) => {
  const displayName = String(req.body.displayName || '').trim(), username = String(req.body.username || '').trim().toLowerCase(), password = String(req.body.password || ''), role = req.body.role;
  const subRole = role === 'staff' ? String(req.body.subRole || '') : undefined;
  if (displayName.length < 2 || displayName.length > 120 || !/^[a-z0-9._-]{3,80}$/.test(username) || !['doctor', 'staff'].includes(role) || (role === 'staff' && !staffSubroles.includes(subRole)) || password.length < 12) return res.status(400).json({ error: 'Use a valid name and username, select Doctor or a Staff subrole, and set a temporary password of at least 12 characters.' });
  try {
    const user = await User.create({ displayName, username, role, approved: true, ...(subRole ? { subRole } : {}), passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true });
    if (role === 'doctor') {
      let provider = await Doctor.findOne({ name: displayName, account: { $exists: false } });
      if (!provider) provider = new Doctor({ name: displayName, specialization: 'General Practice' });
      provider.account = user._id;
      await provider.save();
    }
    res.status(201).json(safeUser(user));
  }
  catch (error) { if (error.code === 11000) return res.status(409).json({ error: 'That username is already in use.' }); throw error; }
});
app.get('/api/labs', allow('admin', 'doctor', 'staff:lab'), async (req, res) => {
  const query = {};
  if (req.session.user.role === 'doctor') {
    const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
    query.doctor = provider?._id || null;
  }
  const orders = await LabOrder.find(query).populate('patient doctor').sort({ createdAt: -1 }).limit(300);
  res.json(orders);
});
app.post('/api/labs', allow('admin', 'doctor'), async (req, res) => {
  const doctor = await Doctor.findById(req.body.doctor);
  const patient = await Patient.findById(req.body.patient);
  if (!doctor || !patient) return res.status(400).json({ error: 'Choose an existing patient and doctor.' });
  if (req.session.user.role === 'doctor') {
    const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
    if (!provider || String(provider._id) !== String(doctor._id)) return res.status(403).json({ error: 'Doctors can only place orders under their own profile.' });
  if (!await Appointment.exists({ patient: patient._id, doctor: provider._id, status: { $in: ['Checked-in', 'Scheduled', 'Completed'] } })) return res.status(403).json({ error: 'This patient has no scheduled or completed visit under your care.' });
  }
  const order = await LabOrder.create({ patient: patient._id, doctor: doctor._id, testName: String(req.body.testName || '').trim(), specimen: String(req.body.specimen || '').trim() });
  res.status(201).json(order);
});
app.patch('/api/labs/:id', allow('admin', 'staff:lab'), async (req, res) => {
  const order = await LabOrder.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Laboratory order not found.' });
  const sequence = ['Ordered', 'Collected', 'Processing', 'Released'];
  const next = String(req.body.status || order.status);
  if (sequence.indexOf(next) !== sequence.indexOf(order.status) + 1) return res.status(400).json({ error: 'Move the order one step at a time: ordered, collected, processing, released.' });
  if (next === 'Released' && !String(req.body.result || '').trim()) return res.status(400).json({ error: 'Enter and review the result before releasing it.' });
  order.status = next;
  if (typeof req.body.result === 'string') order.result = req.body.result.trim().slice(0, 5000);
  if (next === 'Released') order.releasedAt = new Date();
  await order.save();
  res.json(order);
});
app.get('/api/imaging', allow('admin', 'doctor', 'staff:imaging'), async (req, res) => {
  const query = {};
  if (req.session.user.role === 'doctor') {
    const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
    query.doctor = provider?._id || null;
  }
  const imagingQuery = ImagingOrder.find(query);
  if (req.session.user.role === 'staff') imagingQuery.select('patient doctor modality bodySite clinicalIndication priority status scheduledAt acquiredAt reportText archiveReference createdAt updatedAt');
  const orders = await imagingQuery.populate([{ path: 'patient', select: 'name age gender' }, { path: 'doctor', select: 'name specialization' }, { path: 'reviewedBy', select: 'displayName username' }]).sort({ createdAt: -1 }).limit(500);
  orders.sort((a, b) => imagingPriorityRank[a.priority] - imagingPriorityRank[b.priority] || new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders);
});
app.post('/api/imaging', allow('admin', 'doctor'), async (req, res) => {
  const patient = await Patient.findById(req.body.patient);
  const doctor = await Doctor.findById(req.body.doctor);
  const modalities = ['X-ray', 'CT', 'MRI', 'Ultrasound', 'Mammography', 'Fluoroscopy', 'Nuclear medicine', 'Other'];
  const bodySite = String(req.body.bodySite || '').trim();
  const clinicalIndication = String(req.body.clinicalIndication || '').trim();
  const priority = ['Routine', 'Urgent', 'STAT'].includes(req.body.priority) ? req.body.priority : 'Routine';
  if (!patient || !doctor || !modalities.includes(req.body.modality) || bodySite.length < 2 || bodySite.length > 160 || clinicalIndication.length < 4 || clinicalIndication.length > 1000) return res.status(400).json({ error: 'Choose a patient, modality, body site, and clinical indication.' });
  if (req.session.user.role === 'doctor') {
    const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
    if (!provider || String(provider._id) !== String(doctor._id)) return res.status(403).json({ error: 'Doctors can only place imaging orders under their own profile.' });
    if (!await Appointment.exists({ patient: patient._id, doctor: provider._id, status: { $in: ['Checked-in', 'Scheduled', 'Completed'] } })) return res.status(403).json({ error: 'This patient has no scheduled or completed visit under your care.' });
  }
  const order = await ImagingOrder.create({ patient: patient._id, doctor: doctor._id, modality: req.body.modality, bodySite, clinicalIndication, priority });
  await order.populate('patient doctor');
  res.status(201).json(order);
});
app.patch('/api/imaging/:id', allow('admin', 'doctor', 'staff:imaging'), async (req, res) => {
  const order = await ImagingOrder.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Imaging order not found.' });
  const next = String(req.body.status || '');
  const changes = {};
  const isDoctor = req.session.user.role === 'doctor';
  if (isDoctor) {
    const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
    if (!provider || String(provider._id) !== String(order.doctor)) return res.status(403).json({ error: 'Only the referring doctor can review and release this imaging report.' });
    if (order.status === 'Reported' && next === 'Reviewed') {
      const reviewNote = String(req.body.reviewNote || '').trim().slice(0, 2000);
      const followUpNote = String(req.body.followUpNote || '').trim().slice(0, 1000);
      const followUpRequired = req.body.followUpRequired === true || req.body.followUpRequired === 'true';
      if (followUpRequired && followUpNote.length < 3) return res.status(400).json({ error: 'Add the follow-up plan before marking it required.' });
      Object.assign(changes, { status: 'Reviewed', reviewedBy: req.session.user.id, reviewedAt: new Date(), reviewNote, followUpRequired, followUpNote });
    } else if (order.status === 'Reviewed' && next === 'Released') {
      changes.status = 'Released';
      changes.releasedAt = new Date();
    }
    else return res.status(409).json({ error: 'Review the reported result, then release the reviewed report.' });
  } else {
    const transitions = { Ordered: 'Scheduled', Scheduled: 'Acquired', Acquired: 'Reported' };
    if (transitions[order.status] !== next) return res.status(409).json({ error: 'Imaging staff can move an order through schedule, acquisition, and report entry in sequence.' });
    changes.status = next;
    if (next === 'Scheduled') {
      const scheduledAt = new Date(req.body.scheduledAt);
      if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date()) return res.status(400).json({ error: 'Choose a future imaging appointment time.' });
      changes.scheduledAt = scheduledAt;
    }
    if (next === 'Acquired') changes.acquiredAt = new Date();
    if (next === 'Reported') {
      const reportText = String(req.body.reportText || '').trim();
      if (reportText.length < 5 || reportText.length > 12000) return res.status(400).json({ error: 'Enter an imaging report between 5 and 12,000 characters.' });
      changes.reportText = reportText;
      changes.archiveReference = String(req.body.archiveReference || '').trim().slice(0, 240);
      changes.reportedAt = new Date();
    }
  }
  const updated = await ImagingOrder.findOneAndUpdate({ _id: order._id, status: order.status }, { $set: changes }, { new: true, runValidators: true }).populate([{ path: 'patient', select: 'name age gender' }, { path: 'doctor', select: 'name specialization' }, { path: 'reviewedBy', select: 'displayName username' }]);
  if (!updated) return res.status(409).json({ error: 'This imaging order changed in another session. Refresh the worklist.' });
  res.json(updated);
});
app.get('/api/messages', allow('admin', 'doctor', 'staff:receptionist', 'staff:nurse', 'staff:records'), async (req, res) => {
  const query = {};
  if (req.session.user.role === 'doctor') {
    const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
    const patientIds = provider ? await Appointment.distinct('patient', { doctor: provider._id }) : [];
    query.patient = { $in: patientIds };
  }
  if (req.session.user.role === 'staff' && req.session.user.subRole === 'nurse') query.patient = { $in: await nurseAssignedPatientIds(req.session.user.id) };
  res.json(await Message.find(query).populate('patient').sort({ createdAt: 1 }).limit(500));
});
app.post('/api/messages/:patientId', allow('admin', 'doctor', 'staff:receptionist', 'staff:nurse', 'staff:records'), async (req, res) => {
  const patient = await Patient.findById(req.params.patientId);
  const body = String(req.body.body || '').trim();
  if (!patient) return res.status(404).json({ error: 'Patient not found.' });
  if (body.length < 2 || body.length > 3000) return res.status(400).json({ error: 'Message must be between 2 and 3,000 characters.' });
  if (req.session.user.role === 'doctor') {
    const provider = await Doctor.findOne({ account: req.session.user.id }) || await Doctor.findOne({ name: req.session.user.displayName });
    if (!provider || !await Appointment.exists({ patient: patient._id, doctor: provider._id })) return res.status(403).json({ error: 'This patient is not assigned to your care.' });
  }
  if (req.session.user.role === 'staff' && req.session.user.subRole === 'nurse' && !(await nurseAssignedPatientIds(req.session.user.id)).includes(String(patient._id))) return res.status(403).json({ error: 'This patient is not assigned to your nursing queue.' });
  const message = await Message.create({ patient: patient._id, sender: req.session.user.id, body, direction: 'clinic' });
  res.status(201).json(message);
});
app.patch('/api/staff/:id', allow('admin'), async (req, res) => {
  if (req.params.id === req.session.user.id) return res.status(400).json({ error: 'You cannot disable your own account.' });
  const user = await User.findOne({ _id: req.params.id, role: { $in: ['admin', 'doctor', 'staff'] } }); if (!user) return res.status(404).json({ error: 'Team account not found.' });
  if (typeof req.body.active === 'boolean') user.active = req.body.active;
  if (typeof req.body.password === 'string') {
    if (req.body.password.length < 12) return res.status(400).json({ error: 'Temporary passwords must contain at least 12 characters.' });
    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.mustChangePassword = true;
  }
  await user.save(); res.json(safeUser(user));
});
app.use('/api', (err, _req, res, _next) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message });
  console.error(err); res.status(500).json({ error: 'The request could not be completed.' });
});

async function start() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('Set SESSION_SECRET to a random value of at least 32 characters in .env');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carepoint');
  await User.updateMany({ role: 'receptionist' }, { $set: { role: 'staff', subRole: 'receptionist' } });
  await User.updateMany({ role: { $in: ['admin', 'doctor', 'staff'] }, approved: { $exists: false } }, { $set: { approved: true } });
  await Prescription.updateMany({ dispensedQuantity: { $exists: false } }, { $set: { dispensedQuantity: 0 } });
  await Prescription.updateMany({ totalDispensedQuantity: { $exists: false } }, { $set: { totalDispensedQuantity: 0 } });
  await Prescription.updateMany({ refillsUsed: { $exists: false } }, { $set: { refillsUsed: 0 } });
  await Prescription.updateMany({ status: { $exists: false } }, { $set: { status: 'Active' } });
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    const username = process.env.ADMIN_USERNAME.trim().toLowerCase();
    if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
    if (!await User.exists({ username })) await User.create({ username, role: 'admin', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), mustChangePassword: true });
  }
  const administrator = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
  if (administrator) {
    const ledgeredItems = await StockMovement.distinct('item');
    const openingStock = await StockItem.find({ _id: { $nin: ledgeredItems }, quantity: { $gt: 0 } });
    if (openingStock.length) await StockMovement.insertMany(openingStock.map(item => ({ item: item._id, actor: administrator._id, type: 'Initial stock', change: item.quantity, reason: 'Opening balance when stock ledger was enabled' })));
  }
  const listen = port => {
    const server = app.listen(port, HOST, () => {
      console.log(`Website URL: http://localhost:${port}`);
      if (HOST === '0.0.0.0' || HOST === '::') {
      const addresses = Object.values(os.networkInterfaces()).flat().filter(address => address && !address.internal && address.family === 'IPv4');
        for (const address of addresses) console.log(`On your network: http://${address.address}:${port}`);
      }
    });
    server.once('error', error => {
      if (error.code === 'EADDRINUSE' && port < 65535) {
        console.warn(`Port ${port} is busy; trying ${port + 1}...`);
        listen(port + 1);
        return;
      }
      console.error(`Could not start the website on port ${port}: ${error.message}`);
      process.exit(1);
    });
  };
  listen(PORT);
}
start().catch(error => { console.error(error.message); process.exit(1); });
