from functools import wraps
from datetime import datetime, timedelta
from pathlib import Path
import csv
import hmac
import io
import os
import secrets
from getpass import getpass
from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from markupsafe import Markup
from sqlalchemy import inspect as sqlalchemy_inspect
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = PROJECT_ROOT / "instance" / "hospital.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
PUBLIC_ADMIN_MODE = os.environ.get("PUBLIC_ADMIN_MODE", "1").strip().lower() in {"1", "true", "yes", "on"}
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH.as_posix()}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_SECURE=os.environ.get("FLASK_ENV") == "production", PERMANENT_SESSION_LIFETIME=timedelta(hours=8))
db = SQLAlchemy(app)
LOGIN_ATTEMPTS = {}
ROLE_NAMES = {"admin": "Administrator", "receptionist": "Receptionist", "doctor": "Doctor"}


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="receptionist")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    must_change_password = db.Column(db.Boolean, nullable=False, default=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Patient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(20), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120))
    address = db.Column(db.String(255))
    appointments = db.relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = db.relationship("Prescription", back_populates="patient", cascade="all, delete-orphan")


class Doctor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    specialization = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    appointments = db.relationship("Appointment", back_populates="doctor", cascade="all, delete-orphan")
    prescriptions = db.relationship("Prescription", back_populates="doctor", cascade="all, delete-orphan")


class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patient.id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor.id"), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    reason = db.Column(db.String(255))
    status = db.Column(db.String(30), nullable=False, default="Scheduled")

    patient = db.relationship("Patient", back_populates="appointments")
    doctor = db.relationship("Doctor", back_populates="appointments")


class Prescription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patient.id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor.id"), nullable=False)
    medicine = db.Column(db.String(255), nullable=False)
    dosage = db.Column(db.String(120), nullable=False)
    instructions = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    patient = db.relationship("Patient", back_populates="prescriptions")
    doctor = db.relationship("Doctor", back_populates="prescriptions")


class Invoice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patient.id"), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="Pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    patient = db.relationship("Patient")


class QueueVisit(db.Model):
    """Front desk flow board. Priority is assigned by clinic staff, not inferred."""
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patient.id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctor.id"), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    priority = db.Column(db.String(20), nullable=False, default="Routine")
    status = db.Column(db.String(30), nullable=False, default="Waiting")
    checked_in_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    patient = db.relationship("Patient")
    doctor = db.relationship("Doctor")


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session and (not PUBLIC_ADMIN_MODE or view.__name__ in {"logout", "change_password"}):
            return redirect(url_for("login"))
        return view(*args, **kwargs)
    return wrapped


def roles_required(*roles):
    def decorate(view):
        @wraps(view)
        @login_required
        def wrapped(*args, **kwargs):
            if PUBLIC_ADMIN_MODE and "user_id" not in session:
                return view(*args, **kwargs)
            user = db.session.get(User, session.get("user_id"))
            if not user or not user.is_active or user.role not in roles:
                flash("You don’t have permission to access that page.", "warning")
                return redirect(url_for("index"))
            return view(*args, **kwargs)
        return wrapped
    return decorate


@app.before_request
def enforce_session_and_csrf():
    if session.get("user_id"):
        user = db.session.get(User, session["user_id"])
        if not user or not user.is_active:
            session.clear()
            return redirect(url_for("login"))
        session["role"] = user.role
        if user.must_change_password and request.endpoint not in {"change_password", "logout", "static"}:
            return redirect(url_for("change_password"))
    elif PUBLIC_ADMIN_MODE:
        session.setdefault("username", "Clinic Administrator")
        session["role"] = "admin"
    if request.method == "POST":
        expected = session.get("csrf_token", "")
        supplied = request.form.get("csrf_token", "")
        if not expected or not supplied or not hmac.compare_digest(expected, supplied):
            return "Invalid or expired form token. Reload the page and try again.", 400


@app.context_processor
def template_security_helpers():
    token = session.setdefault("csrf_token", secrets.token_urlsafe(32))
    return {"csrf_input": lambda: Markup('<input type="hidden" name="csrf_token" value="{}">'.format(token))}


@app.route("/")
def index():
    return render_template(
        "dashboard.html",
        patients=Patient.query.count(),
        doctors=Doctor.query.count(),
        appointments=Appointment.query.count(),
        prescriptions=Prescription.query.count(),
        upcoming=Appointment.query.order_by(Appointment.appointment_date.asc()).limit(6).all(),
        today_count=Appointment.query.filter(db.func.date(Appointment.appointment_date) == datetime.utcnow().date().isoformat()).count(),
        pending_bills=Invoice.query.filter_by(status="Pending").count(),
        waiting_count=QueueVisit.query.filter(QueueVisit.status.in_(["Waiting", "In consultation"])).count(),
    )


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip().lower()
        password = request.form["password"]
        client = request.remote_addr or "unknown"
        key = f"{client}:{username}"
        now = datetime.utcnow()
        attempts = [moment for moment in LOGIN_ATTEMPTS.get(key, []) if now - moment < timedelta(minutes=15)]
        if len(attempts) >= 5:
            flash("Too many sign-in attempts. Try again in 15 minutes.", "danger")
            return render_template("login.html"), 429
        user = User.query.filter_by(username=username).first()
        if user and user.is_active and user.check_password(password):
            LOGIN_ATTEMPTS.pop(key, None)
            session.clear()
            session.permanent = True
            session["csrf_token"] = secrets.token_urlsafe(32)
            session["user_id"] = user.id
            session["username"] = user.username
            session["role"] = user.role
            return redirect(url_for("index"))
        attempts.append(now)
        LOGIN_ATTEMPTS[key] = attempts
        flash("Invalid username or password.", "danger")
    return render_template("login.html")


@app.route("/logout", methods=["POST"])
@login_required
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/account/password", methods=["GET", "POST"])
@login_required
def change_password():
    user = db.session.get(User, session["user_id"])
    if request.method == "POST":
        old_password = request.form.get("old_password", "")
        new_password = request.form.get("new_password", "")
        confirm = request.form.get("confirm_password", "")
        if not user.check_password(old_password):
            flash("Current password is incorrect.", "danger")
        elif len(new_password) < 12:
            flash("Choose a password with at least 12 characters.", "danger")
        elif new_password != confirm:
            flash("The new passwords do not match.", "danger")
        else:
            user.set_password(new_password)
            user.must_change_password = False
            db.session.commit()
            flash("Password updated.", "success")
            return redirect(url_for("index"))
    return render_template("change_password.html", forced=user.must_change_password)


@app.route("/staff", methods=["GET", "POST"])
@roles_required("admin")
def staff():
    if request.method == "POST":
        username = request.form.get("username", "").strip().lower()
        role = request.form.get("role", "")
        password = request.form.get("password", "")
        if not username or len(username) > 80 or role not in {"admin", "doctor", "receptionist"}:
            flash("Enter a valid username and role.", "danger")
        elif len(password) < 12:
            flash("Temporary passwords must be at least 12 characters.", "danger")
        elif User.query.filter_by(username=username).first():
            flash("That username is already in use.", "danger")
        else:
            user = User(username=username, role=role, must_change_password=True)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            flash("Staff account created. They’ll be asked to change the temporary password at sign-in.", "success")
            return redirect(url_for("staff"))
    return render_template("staff.html", users=User.query.order_by(User.username).all())


@app.route("/staff/<int:user_id>/toggle", methods=["POST"])
@roles_required("admin")
def toggle_staff(user_id):
    user = db.get_or_404(User, user_id)
    if user.id == session.get("user_id"):
        flash("You can’t deactivate your own account.", "warning")
    else:
        user.is_active = not user.is_active
        db.session.commit()
        flash(f"{user.username} account {'enabled' if user.is_active else 'disabled'}.", "success")
    return redirect(url_for("staff"))


@app.route("/patients")
@login_required
def patients():
    q = request.args.get("q", "").strip()
    gender = request.args.get("gender", "")
    page_number = request.args.get("page", 1, type=int)
    query = Patient.query
    if q:
        term = f"%{q}%"
        query = query.filter(db.or_(Patient.name.ilike(term), Patient.phone.ilike(term), Patient.email.ilike(term), db.cast(Patient.id, db.String).ilike(term)))
    if gender in {"Male", "Female", "Other"}:
        query = query.filter(Patient.gender == gender)
    pagination = query.order_by(Patient.name).paginate(page=page_number, per_page=10, error_out=False)
    selected_id = request.args.get("selected", type=int)
    selected_patient = db.session.get(Patient, selected_id) if selected_id else (pagination.items[0] if pagination.items else None)
    patient_appointments = sorted(selected_patient.appointments, key=lambda row: row.appointment_date, reverse=True)[:5] if selected_patient else []
    prescriptions = Prescription.query.filter_by(patient_id=selected_patient.id).order_by(Prescription.created_at.desc()).limit(4).all() if selected_patient else []
    invoices = Invoice.query.filter_by(patient_id=selected_patient.id).order_by(Invoice.created_at.desc()).limit(4).all() if selected_patient else []
    gender_counts = {value: Patient.query.filter_by(gender=value).count() for value in ("Male", "Female", "Other")}
    return render_template("patients.html", patients=pagination.items, pagination=pagination, q=q, gender=gender,
                           selected_patient=selected_patient, patient_appointments=patient_appointments,
                           patient_prescriptions=prescriptions, patient_invoices=invoices,
                           patient_count=Patient.query.count(), gender_counts=gender_counts)


@app.route("/patients/export")
@login_required
def export_patients():
    q = request.args.get("q", "").strip()
    gender = request.args.get("gender", "")
    query = Patient.query
    if q:
        term = f"%{q}%"
        query = query.filter(db.or_(Patient.name.ilike(term), Patient.phone.ilike(term), Patient.email.ilike(term), db.cast(Patient.id, db.String).ilike(term)))
    if gender in {"Male", "Female", "Other"}:
        query = query.filter(Patient.gender == gender)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Patient ID", "Name", "Age", "Gender", "Phone", "Email", "Address"])
    for patient in query.order_by(Patient.name).all():
        writer.writerow([patient.id, patient.name, patient.age, patient.gender, patient.phone, patient.email or "", patient.address or ""])
    return app.response_class(output.getvalue(), mimetype="text/csv; charset=utf-8",
                              headers={"Content-Disposition": "attachment; filename=patients.csv"})


@app.route("/patients/import", methods=["POST"])
@roles_required("admin", "receptionist")
def import_patients():
    upload = request.files.get("file")
    if not upload or not upload.filename.lower().endswith(".csv"):
        flash("Choose a CSV file to import.", "warning")
        return redirect(url_for("patients"))
    try:
        stream = io.StringIO(upload.stream.read().decode("utf-8-sig"), newline="")
        reader = csv.DictReader(stream)
        required = {"name", "age", "gender", "phone"}
        if not reader.fieldnames or not required.issubset({name.strip().lower() for name in reader.fieldnames}):
            raise ValueError("CSV must include name, age, gender, and phone columns.")
        fieldnames = {name.strip().lower(): name for name in reader.fieldnames}
        imported = 0
        for row in reader:
            value = lambda key: (row.get(fieldnames[key]) or "").strip()
            name, phone, gender_value = value("name"), value("phone"), value("gender").title()
            age_value = int(value("age"))
            if not name or not phone or gender_value not in {"Male", "Female", "Other"} or not 0 <= age_value <= 120:
                raise ValueError("Each row needs a name, phone, valid gender, and age from 0 to 120.")
            db.session.add(Patient(name=name, age=age_value, gender=gender_value, phone=phone,
                                   email=value("email") if "email" in fieldnames else "",
                                   address=value("address") if "address" in fieldnames else ""))
            imported += 1
        db.session.commit()
        flash(f"Imported {imported} patient records.", "success")
    except (UnicodeDecodeError, csv.Error, ValueError, TypeError):
        db.session.rollback()
        flash("Import failed. Check the CSV headers and patient values, then try again.", "danger")
    return redirect(url_for("patients"))


@app.route("/patients/add", methods=["GET", "POST"])
@roles_required("admin", "receptionist")
def add_patient():
    if request.method == "POST":
        patient = Patient(
            name=request.form["name"].strip(),
            age=int(request.form["age"]),
            gender=request.form["gender"],
            phone=request.form["phone"].strip(),
            email=request.form.get("email", "").strip(),
            address=request.form.get("address", "").strip(),
        )
        db.session.add(patient)
        db.session.commit()
        flash("Patient registered successfully.", "success")
        return redirect(url_for("patients"))
    return render_template("patient_form.html", patient=None)


@app.route("/patients/edit/<int:patient_id>", methods=["GET", "POST"])
@roles_required("admin", "receptionist")
def edit_patient(patient_id):
    patient = db.get_or_404(Patient, patient_id)
    if request.method == "POST":
        patient.name = request.form["name"].strip()
        patient.age = int(request.form["age"])
        patient.gender = request.form["gender"]
        patient.phone = request.form["phone"].strip()
        patient.email = request.form.get("email", "").strip()
        patient.address = request.form.get("address", "").strip()
        db.session.commit()
        flash("Patient updated successfully.", "success")
        return redirect(url_for("patients"))
    return render_template("patient_form.html", patient=patient)


@app.route("/patients/delete/<int:patient_id>", methods=["POST"])
@roles_required("admin", "receptionist")
def delete_patient(patient_id):
    patient = db.get_or_404(Patient, patient_id)
    if Invoice.query.filter_by(patient_id=patient.id).first() or QueueVisit.query.filter_by(patient_id=patient.id).first():
        flash("This patient has linked invoices or patient-flow visits. Resolve those records before deleting the patient.", "warning")
        return redirect(url_for("patients", selected=patient.id))
    db.session.delete(patient)
    db.session.commit()
    flash("Patient deleted.", "success")
    return redirect(url_for("patients"))


@app.route("/doctors")
@login_required
def doctors():
    return render_template("doctors.html", doctors=Doctor.query.order_by(Doctor.name).all())


@app.route("/doctors/add", methods=["GET", "POST"])
@roles_required("admin")
def add_doctor():
    if request.method == "POST":
        doctor = Doctor(
            name=request.form["name"].strip(),
            specialization=request.form["specialization"].strip(),
            phone=request.form.get("phone", "").strip(),
            email=request.form.get("email", "").strip(),
        )
        db.session.add(doctor)
        db.session.commit()
        flash("Doctor added successfully.", "success")
        return redirect(url_for("doctors"))
    return render_template("doctor_form.html", doctor=None)


@app.route("/doctors/edit/<int:doctor_id>", methods=["GET", "POST"])
@roles_required("admin")
def edit_doctor(doctor_id):
    doctor = db.get_or_404(Doctor, doctor_id)
    if request.method == "POST":
        doctor.name = request.form["name"].strip()
        doctor.specialization = request.form["specialization"].strip()
        doctor.phone = request.form.get("phone", "").strip()
        doctor.email = request.form.get("email", "").strip()
        db.session.commit()
        flash("Doctor updated successfully.", "success")
        return redirect(url_for("doctors"))
    return render_template("doctor_form.html", doctor=doctor)


@app.route("/doctors/delete/<int:doctor_id>", methods=["POST"])
@roles_required("admin")
def delete_doctor(doctor_id):
    doctor = db.get_or_404(Doctor, doctor_id)
    db.session.delete(doctor)
    db.session.commit()
    flash("Doctor deleted.", "success")
    return redirect(url_for("doctors"))


@app.route("/appointments")
@login_required
def appointments():
    requested_day = request.args.get("date", "")
    try:
        selected_day = datetime.fromisoformat(requested_day).date() if requested_day else datetime.utcnow().date()
    except ValueError:
        selected_day = datetime.utcnow().date()
    day_start = datetime.combine(selected_day, datetime.min.time())
    day_end = day_start + timedelta(days=1)
    day_query = Appointment.query.filter(Appointment.appointment_date >= day_start, Appointment.appointment_date < day_end)
    all_day_appointments = day_query.order_by(Appointment.appointment_date.asc()).all()
    status = request.args.get("status", "All")
    specialty = request.args.get("specialty", "All")
    if specialty != "All":
        day_query = day_query.join(Doctor).filter(Doctor.specialization == specialty)
    if status in {"Scheduled", "Completed", "Cancelled"}:
        day_query = day_query.filter(Appointment.status == status)
    rows = day_query.order_by(Appointment.appointment_date.asc()).all()
    doctors = Doctor.query.order_by(Doctor.name).all()
    doctor_summaries = []
    for doctor in doctors:
        visits = [appointment for appointment in rows if appointment.doctor_id == doctor.id]
        if visits:
            doctor_summaries.append({"doctor": doctor, "appointments": visits})
    specialty_counts = {}
    for appointment in all_day_appointments:
        label = appointment.doctor.specialization or "General"
        specialty_counts[label] = specialty_counts.get(label, 0) + 1
    return render_template("appointments.html", appointments=rows, all_day_appointments=all_day_appointments,
                           doctors=doctors, doctor_summaries=doctor_summaries, specialty_counts=specialty_counts,
                           selected_day=selected_day, previous_day=selected_day - timedelta(days=1),
                           next_day=selected_day + timedelta(days=1), status=status, specialty=specialty,
                           today=datetime.utcnow().date(),
                           time_slots=sorted({appointment.appointment_date.strftime("%H:%M") for appointment in rows}))


@app.route("/appointments/calendar.ics")
@login_required
def export_appointments_calendar():
    try:
        selected_day = datetime.fromisoformat(request.args.get("date", "")).date()
    except ValueError:
        selected_day = datetime.utcnow().date()
    day_start = datetime.combine(selected_day, datetime.min.time())
    day_end = day_start + timedelta(days=1)
    rows = Appointment.query.filter(Appointment.appointment_date >= day_start,
                                    Appointment.appointment_date < day_end,
                                    Appointment.status != "Cancelled").order_by(Appointment.appointment_date).all()
    escape_ical = lambda value: str(value or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Careflow//Clinic Schedule//EN", "CALSCALE:GREGORIAN"]
    for appointment in rows:
        start = appointment.appointment_date.strftime("%Y%m%dT%H%M%S")
        end = (appointment.appointment_date + timedelta(minutes=30)).strftime("%Y%m%dT%H%M%S")
        lines.extend(["BEGIN:VEVENT", f"UID:careflow-appointment-{appointment.id}@local", f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
                      f"DTSTART:{start}", f"DTEND:{end}",
                      f"SUMMARY:{escape_ical(appointment.patient.name)} - Dr. {escape_ical(appointment.doctor.name)}",
                      f"DESCRIPTION:{escape_ical(appointment.reason or 'Clinic appointment')} ({escape_ical(appointment.status)})",
                      "END:VEVENT"])
    lines.append("END:VCALENDAR")
    return app.response_class("\r\n".join(lines) + "\r\n", mimetype="text/calendar",
                              headers={"Content-Disposition": f"attachment; filename=clinic-{selected_day.isoformat()}.ics"})


@app.route("/appointments/add", methods=["GET", "POST"])
@roles_required("admin", "receptionist")
def add_appointment():
    patients = Patient.query.order_by(Patient.name).all()
    doctors = Doctor.query.order_by(Doctor.name).all()
    if request.method == "POST":
        try:
            appointment_date = datetime.fromisoformat(request.form["appointment_date"])
        except (TypeError, ValueError):
            flash("Choose a valid appointment date and time.", "danger")
            return render_template("appointment_form.html", patients=patients, doctors=doctors)
        doctor_id = int(request.form["doctor_id"])
        conflict = Appointment.query.filter_by(doctor_id=doctor_id, appointment_date=appointment_date, status="Scheduled").first()
        if conflict:
            flash("That doctor already has a scheduled appointment at this time. Choose another slot.", "warning")
            return render_template("appointment_form.html", patients=patients, doctors=doctors)
        appointment = Appointment(
            patient_id=int(request.form["patient_id"]),
            doctor_id=doctor_id,
            appointment_date=appointment_date,
            reason=request.form.get("reason", "").strip(),
        )
        db.session.add(appointment)
        db.session.commit()
        flash("Appointment booked successfully.", "success")
        return redirect(url_for("appointments", date=appointment_date.date().isoformat()))
    return render_template("appointment_form.html", patients=patients, doctors=doctors,
                           selected_date=request.args.get("date", ""))


@app.route("/appointments/status/<int:appointment_id>/<status>", methods=["POST"])
@roles_required("admin", "receptionist", "doctor")
def appointment_status(appointment_id, status):
    appointment = db.get_or_404(Appointment, appointment_id)
    allowed = {"Scheduled", "Completed", "Cancelled"}
    if status in allowed:
        appointment.status = status
        db.session.commit()
        flash(f"Appointment marked {status.lower()}.", "success")
    return redirect(url_for("appointments", date=request.args.get("date", "")))


@app.route("/appointments/delete/<int:appointment_id>", methods=["POST"])
@roles_required("admin")
def delete_appointment(appointment_id):
    appointment = db.get_or_404(Appointment, appointment_id)
    db.session.delete(appointment)
    db.session.commit()
    flash("Appointment deleted.", "success")
    return redirect(url_for("appointments"))


@app.route("/prescriptions")
@roles_required("admin", "doctor")
def prescriptions():
    q = request.args.get("q", "").strip()
    period = request.args.get("period", "All")
    page_number = request.args.get("page", 1, type=int)
    base_query = Prescription.query.join(Patient).join(Doctor)
    if q:
        term = f"%{q}%"
        base_query = base_query.filter(db.or_(Prescription.medicine.ilike(term), Prescription.dosage.ilike(term),
                                              Prescription.instructions.ilike(term), Patient.name.ilike(term),
                                              Doctor.name.ilike(term), db.cast(Prescription.id, db.String).ilike(term)))
    today_start = datetime.combine(datetime.utcnow().date(), datetime.min.time())
    filtered_query = base_query
    if period == "Today":
        filtered_query = filtered_query.filter(Prescription.created_at >= today_start)
    elif period == "Earlier":
        filtered_query = filtered_query.filter(Prescription.created_at < today_start)
    pagination = filtered_query.order_by(Prescription.created_at.desc()).paginate(page=page_number, per_page=8, error_out=False)
    selected_id = request.args.get("selected", type=int)
    selected_prescription = db.session.get(Prescription, selected_id) if selected_id else (pagination.items[0] if pagination.items else None)
    patient_history = Prescription.query.filter_by(patient_id=selected_prescription.patient_id).order_by(Prescription.created_at.desc()).limit(5).all() if selected_prescription else []
    return render_template("prescriptions.html", prescriptions=pagination.items, pagination=pagination, q=q,
                           period=period, selected_prescription=selected_prescription, patient_history=patient_history,
                           total_count=Prescription.query.count(), today_count=Prescription.query.filter(Prescription.created_at >= today_start).count(),
                           patient_count=db.session.query(Prescription.patient_id).distinct().count(),
                           doctor_count=db.session.query(Prescription.doctor_id).distinct().count())


@app.route("/prescriptions/export")
@roles_required("admin", "doctor")
def export_prescriptions():
    q = request.args.get("q", "").strip()
    base_query = Prescription.query.join(Patient).join(Doctor)
    if q:
        term = f"%{q}%"
        base_query = base_query.filter(db.or_(Prescription.medicine.ilike(term), Prescription.dosage.ilike(term),
                                              Prescription.instructions.ilike(term), Patient.name.ilike(term),
                                              Doctor.name.ilike(term), db.cast(Prescription.id, db.String).ilike(term)))
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Prescription ID", "Date", "Patient", "Patient ID", "Doctor", "Specialty", "Medicine", "Dosage", "Instructions"])
    for row in base_query.order_by(Prescription.created_at.desc()).all():
        writer.writerow([f"RX-{row.created_at.year}-{row.id:04d}", row.created_at.isoformat(), row.patient.name,
                         row.patient.id, row.doctor.name, row.doctor.specialization, row.medicine, row.dosage, row.instructions or ""])
    return app.response_class(output.getvalue(), mimetype="text/csv; charset=utf-8",
                              headers={"Content-Disposition": "attachment; filename=prescriptions.csv"})


@app.route("/prescriptions/add", methods=["GET", "POST"])
@roles_required("admin", "doctor")
def add_prescription():
    patients = Patient.query.order_by(Patient.name).all()
    doctors = Doctor.query.order_by(Doctor.name).all()
    if request.method == "POST":
        prescription = Prescription(
            patient_id=int(request.form["patient_id"]),
            doctor_id=int(request.form["doctor_id"]),
            medicine=request.form["medicine"].strip(),
            dosage=request.form["dosage"].strip(),
            instructions=request.form.get("instructions", "").strip(),
        )
        db.session.add(prescription)
        db.session.commit()
        flash("Prescription record saved.", "success")
        return redirect(url_for("prescriptions", selected=prescription.id))
    return render_template("prescription_form.html", patients=patients, doctors=doctors,
                           selected_patient_id=request.args.get("patient_id", type=int))


@app.route("/billing", methods=["GET", "POST"])
@roles_required("admin", "receptionist")
def billing():
    if request.method == "POST":
        invoice = Invoice(patient_id=int(request.form["patient_id"]), description=request.form["description"].strip(), amount=float(request.form["amount"]))
        db.session.add(invoice)
        db.session.commit()
        flash("Invoice created successfully.", "success")
        return redirect(url_for("billing"))
    return render_template("billing.html", invoices=Invoice.query.order_by(Invoice.created_at.desc()).all(), patients=Patient.query.order_by(Patient.name).all(), total= db.session.query(db.func.coalesce(db.func.sum(Invoice.amount), 0)).filter_by(status="Pending").scalar())


@app.route("/billing/status/<int:invoice_id>", methods=["POST"])
@roles_required("admin", "receptionist")
def invoice_status(invoice_id):
    invoice = db.get_or_404(Invoice, invoice_id)
    invoice.status = "Paid" if invoice.status == "Pending" else "Pending"
    db.session.commit()
    flash(f"Invoice marked {invoice.status.lower()}.", "success")
    return redirect(url_for("billing"))


@app.route("/flow", methods=["GET", "POST"])
@roles_required("admin", "receptionist")
def patient_flow():
    if request.method == "POST":
        visit = QueueVisit(patient_id=int(request.form["patient_id"]), doctor_id=int(request.form["doctor_id"]), reason=request.form["reason"].strip(), priority=request.form["priority"])
        db.session.add(visit)
        db.session.commit()
        flash("Patient added to the care queue.", "success")
        return redirect(url_for("patient_flow"))
    active = QueueVisit.query.filter(QueueVisit.status.in_(["Waiting", "In consultation"])).order_by(QueueVisit.checked_in_at.asc()).all()
    done = QueueVisit.query.filter_by(status="Completed").order_by(QueueVisit.checked_in_at.desc()).limit(8).all()
    return render_template("flow.html", active=active, done=done, patients=Patient.query.order_by(Patient.name).all(), doctors=Doctor.query.order_by(Doctor.name).all())


@app.route("/flow/status/<int:visit_id>/<status>", methods=["POST"])
@roles_required("admin", "receptionist", "doctor")
def flow_status(visit_id, status):
    visit = db.get_or_404(QueueVisit, visit_id)
    if status in {"Waiting", "In consultation", "Completed"}:
        visit.status = status
        db.session.commit()
        flash(f"Visit moved to {status.lower()}.", "success")
    return redirect(url_for("patient_flow"))


def seed_database():
    legacy_admin = User.query.filter_by(username="admin").first()
    if legacy_admin and legacy_admin.check_password("admin123"):
        legacy_admin.is_active = False

    if Doctor.query.count() == 0:
        db.session.add_all([
            Doctor(name="Dr. Ananya Sharma", specialization="Cardiology", phone="9876543210", email="ananya@clinic.com"),
            Doctor(name="Dr. Rahul Mehta", specialization="General Medicine", phone="9876501234", email="rahul@clinic.com"),
        ])

    if Patient.query.count() == 0:
        db.session.add_all([
            Patient(name="Aarav Patel", age=22, gender="Male", phone="9000000001", email="aarav@example.com", address="Pune"),
            Patient(name="Priya Shah", age=31, gender="Female", phone="9000000002", email="priya@example.com", address="Pune"),
        ])
    db.session.commit()


def ensure_schema():
    db.create_all()
    # Additive SQLite migration for databases created before account controls existed.
    columns = {column["name"] for column in sqlalchemy_inspect(db.engine).get_columns("user")}
    with db.engine.begin() as connection:
        if "is_active" not in columns:
            connection.exec_driver_sql("ALTER TABLE user ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1")
        if "must_change_password" not in columns:
            connection.exec_driver_sql("ALTER TABLE user ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT 0")


@app.cli.command("init-db")
def init_db_command():
    """Create or update the SQLite schema without deleting existing records."""
    ensure_schema()
    seed_database()
    print(f"Database ready: {DB_PATH}")


@app.cli.command("create-admin")
def create_admin_command():
    """Create the first administrator or reset an existing account to admin."""
    ensure_schema()
    username = input("Administrator username: ").strip().lower()
    if not username or len(username) > 80:
        raise SystemExit("Username must be between 1 and 80 characters.")
    password = getpass("Administrator password (12+ characters): ")
    confirmation = getpass("Confirm password: ")
    if len(password) < 12 or password != confirmation:
        raise SystemExit("Passwords must match and contain at least 12 characters.")
    user = User.query.filter_by(username=username).first()
    if user is None:
        user = User(username=username)
        db.session.add(user)
    user.role = "admin"
    user.is_active = True
    user.must_change_password = False
    user.set_password(password)
    db.session.commit()
    print(f"Administrator account ready for {username}.")


with app.app_context():
    ensure_schema()
    seed_database()


if __name__ == "__main__":
    app.run(debug=True)
