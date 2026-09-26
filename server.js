require('dotenv').config();
require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const roles = ['admin', 'doctor', 'staff', 'pending'];
const staffSubroles = ['receptionist', 'nurse', 'billing', 'records'];
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
const Patient = mongoose.model('Patient', recordSchema({ name: { type: String, required: true, trim: true }, age: { type: Number, min: 0, max: 120, required: true }, gender: { type: String, enum: ['Female', 'Male', 'Other'], required: true }, phone: { type: String, required: true, trim: true }, email: String, address: String }));
const Doctor = mongoose.model('Doctor', recordSchema({ name: { type: String, required: true, trim: true }, specialization: { type: String, required: true }, phone: String, email: String }));
const Appointment = mongoose.model('Appointment', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true }, date: { type: Date, required: true }, reason: String, status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' } }));
const Prescription = mongoose.model('Prescription', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true }, medicine: { type: String, required: true }, dosage: { type: String, required: true }, instructions: String }));
const Invoice = mongoose.model('Invoice', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, description: { type: String, required: true }, amount: { type: Number, min: 0, required: true }, status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' } }));
const Visit = mongoose.model('Visit', recordSchema({ patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true }, doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true }, reason: { type: String, required: true }, priority: { type: String, enum: ['Routine', 'Urgent'], default: 'Routine' }, status: { type: String, enum: ['Waiting', 'In consultation', 'Completed'], default: 'Waiting' } }));

app.use(session({ name: 'carepoint.sid', secret: process.env.SESSION_SECRET || 'development-only-change-this-secret-please', resave: false, saveUninitialized: false, store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carepoint', collectionName: 'sessions' }), cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 } }));
app.use(express.static(path.join(__dirname, 'public')));

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
app.post('/api/auth/register', async (req, res) => {
  const displayName = String(req.body.displayName || '').trim();
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const confirmation = String(req.body.confirmPassword || '');
  const requestedRole = req.body.requestedRole;
  const requestedSubRole = requestedRole === 'staff' ? String(req.body.requestedSubRole || '') : undefined;
  if (displayName.length < 2 || displayName.length > 120 || !/^[a-z0-9._-]{3,80}$/.test(username) || !['doctor', 'staff'].includes(requestedRole) || (requestedRole === 'staff' && !staffSubroles.includes(requestedSubRole)) || password.length < 12 || password !== confirmation) {
    return res.status(400).json({ error: 'Enter your name, a valid username, a requested account type, and matching passwords of at least 12 characters.' });
  }
  try {
    const user = await User.create({ displayName, username, role: 'pending', requestedRole, ...(requestedSubRole ? { requestedSubRole } : {}), approved: false, active: true, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ user: safeUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'That username is already registered. Choose another username or sign in.' });
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
  user.passwordHash = await bcrypt.hash(password, 12); user.mustChangePassword = false; await user.save();
  req.session.user = safeUser(user); res.json({ user: req.session.user });
});

app.get('/api/dashboard', requireAuth, async (req, res) => {
  const user = req.session.user;
  if (user.role === 'pending' || user.approved === false) return res.status(403).json({ error: 'Your account is waiting for administrator approval.' });
  const canReadAppointments = ['admin', 'doctor'].includes(user.role) || (user.role === 'staff' && ['receptionist', 'nurse', 'records'].includes(user.subRole));
  const canReadPrescriptions = ['admin', 'doctor'].includes(user.role);
  const canReadInvoices = user.role === 'admin' || (user.role === 'staff' && ['receptionist', 'billing'].includes(user.subRole));
  const canReadVisits = ['admin', 'doctor'].includes(user.role) || (user.role === 'staff' && ['receptionist', 'nurse'].includes(user.subRole));
  const [patients, doctors, appointments, prescriptions, pendingBills, visits, upcoming] = await Promise.all([
    Patient.countDocuments(), canReadAppointments ? Doctor.countDocuments() : 0,
    canReadAppointments ? Appointment.countDocuments() : 0,
    canReadPrescriptions ? Prescription.countDocuments() : 0,
    canReadInvoices ? Invoice.countDocuments({ status: 'Pending' }) : 0,
    canReadVisits ? Visit.countDocuments({ status: { $in: ['Waiting', 'In consultation'] } }) : 0,
    canReadAppointments ? Appointment.find({ date: { $gte: new Date() }, status: 'Scheduled' }).populate('patient doctor').sort({ date: 1 }).limit(7) : []
  ]);
  res.json({ patients, doctors, appointments, prescriptions, pendingBills, visits, upcoming });
});
const resources = { patients: Patient, doctors: Doctor, appointments: Appointment, prescriptions: Prescription, invoices: Invoice, visits: Visit };
for (const [name, Model] of Object.entries(resources)) {
  const readRoles = {
    patients: ['admin', 'doctor', 'staff:receptionist', 'staff:nurse', 'staff:billing', 'staff:records'],
    doctors: ['admin', 'doctor', 'staff:receptionist', 'staff:nurse', 'staff:records'],
    appointments: ['admin', 'doctor', 'staff:receptionist', 'staff:nurse', 'staff:records'],
    prescriptions: ['admin', 'doctor'],
    invoices: ['admin', 'staff:receptionist', 'staff:billing'],
    visits: ['admin', 'doctor', 'staff:receptionist', 'staff:nurse']
  }[name];
  app.get(`/api/${name}`, allow(...readRoles), async (req, res) => {
    const query = {};
    if (name === 'patients' && req.query.q) query.$or = ['name', 'phone', 'email'].map(field => ({ [field]: { $regex: String(req.query.q).slice(0, 80), $options: 'i' } }));
    const rows = await Model.find(query).sort({ createdAt: -1 }).limit(300).populate(['appointments', 'prescriptions', 'patient', 'doctor'].filter(field => Model.schema.path(field)));
    res.json(rows);
  });
  const writeRoles = {
    patients: ['admin', 'staff:receptionist', 'staff:records'],
    doctors: ['admin'],
    appointments: ['admin', 'staff:receptionist', 'staff:records'],
    prescriptions: ['doctor', 'admin'],
    invoices: ['admin', 'staff:receptionist', 'staff:billing'],
    visits: ['admin', 'staff:receptionist', 'staff:nurse']
  }[name];
  app.post(`/api/${name}`, allow(...writeRoles), async (req, res) => {
    const doc = await Model.create(cleanFields(Model, req.body)); res.status(201).json(doc);
  });
  if (['appointments', 'invoices', 'visits'].includes(name)) app.patch(`/api/${name}/:id`, allow(...({ appointments: ['admin', 'doctor', 'staff:receptionist', 'staff:records'], invoices: ['admin', 'staff:receptionist', 'staff:billing'], visits: ['admin', 'staff:receptionist', 'staff:nurse'] }[name])), async (req, res) => {
    const allowed = name === 'appointments' ? ['status'] : name === 'invoices' ? ['status'] : ['status', 'priority'];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const row = await Model.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
    if (!row) return res.status(404).json({ error: 'Record not found.' }); res.json(row);
  });
  if (['patients', 'doctors'].includes(name)) app.patch(`/api/${name}/:id`, allow(...(name === 'patients' ? ['admin', 'staff:receptionist', 'staff:records'] : ['admin'])), async (req, res) => {
    const row = await Model.findByIdAndUpdate(req.params.id, cleanFields(Model, req.body), { new: true, runValidators: true });
    if (!row) return res.status(404).json({ error: 'Record not found.' }); res.json(row);
  });
  app.delete(`/api/${name}/:id`, allow(...(name === 'patients' ? ['admin', 'staff:receptionist', 'staff:records'] : ['admin'])), async (req, res) => {
    const row = await Model.findByIdAndDelete(req.params.id); if (!row) return res.status(404).json({ error: 'Record not found.' }); res.json({ ok: true });
  });
}
app.get('/api/staff', allow('admin'), async (_req, res) => res.json((await User.find().select('-passwordHash').sort({ username: 1 })).map(safeUser)));
app.post('/api/staff', allow('admin'), async (req, res) => {
  const displayName = String(req.body.displayName || '').trim(), username = String(req.body.username || '').trim().toLowerCase(), password = String(req.body.password || ''), role = req.body.role;
  const subRole = role === 'staff' ? String(req.body.subRole || '') : undefined;
  if (displayName.length < 2 || displayName.length > 120 || !/^[a-z0-9._-]{3,80}$/.test(username) || !['doctor', 'staff'].includes(role) || (role === 'staff' && !staffSubroles.includes(subRole)) || password.length < 12) return res.status(400).json({ error: 'Use a valid name and username, select Doctor or a Staff subrole, and set a temporary password of at least 12 characters.' });
  try { const user = await User.create({ displayName, username, role, approved: true, ...(subRole ? { subRole } : {}), passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true }); res.status(201).json(safeUser(user)); }
  catch (error) { if (error.code === 11000) return res.status(409).json({ error: 'That username is already in use.' }); throw error; }
});
app.patch('/api/staff/:id', allow('admin'), async (req, res) => {
  if (req.params.id === req.session.user.id) return res.status(400).json({ error: 'You cannot disable your own account.' });
  const user = await User.findById(req.params.id); if (!user) return res.status(404).json({ error: 'Staff member not found.' });
  if (user.role === 'pending' && req.body.approved === true) {
    const role = req.body.role;
    const subRole = role === 'staff' ? String(req.body.subRole || '') : undefined;
    if (!['doctor', 'staff'].includes(role) || (role === 'staff' && !staffSubroles.includes(subRole))) return res.status(400).json({ error: 'Choose Doctor or a valid Staff subrole to approve this account.' });
    user.role = role;
    user.subRole = subRole;
    user.approved = true;
    user.active = true;
  }
  if (typeof req.body.active === 'boolean') user.active = req.body.active;
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
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    const username = process.env.ADMIN_USERNAME.trim().toLowerCase();
    if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
    if (!await User.exists({ username })) await User.create({ username, role: 'admin', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12), mustChangePassword: true });
  }
  app.listen(PORT, () => console.log(`CarePoint running at http://localhost:${PORT}`));
}
start().catch(error => { console.error(error.message); process.exit(1); });
