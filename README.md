# CarePoint Hospital Management System

A full stack hospital and clinic management app using HTML, CSS, browser JavaScript, Node.js/Express and MongoDB.

## Features

- MongoDB collections for staff, patients, doctors, appointments, prescriptions, invoices and patient flow visits
- Password-hashed login, MongoDB-backed secure sessions, login/logout and password changes
- Role-based access for administrators, doctors and staff subroles
- Public account registration with administrator review before access to clinic data
- Admin-managed doctor and staff accounts with forced password change on first sign-in
- Patient and doctor records, appointment scheduling and statuses, prescriptions, billing and patient flow
- Searchable patient list, responsive dashboard and upcoming appointments
- Input validation, Mongo operator sanitization, secure headers and HTTP-only session cookies

## Requirements

- Node.js 20 or newer
- MongoDB Community running locally or a MongoDB Atlas connection string

## Setup

From this folder:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env`. Set a private random `SESSION_SECRET` of at least 32 characters, a strong initial admin password of at least 12 characters, and `MONGODB_URI` for your MongoDB instance. The initial administrator is created on startup if its username does not already exist. Keep `.env` private. If an admin user already exists, startup does not reset its password.

```powershell
npm start
```

Open <http://localhost:3000>. The app will not start if the session secret or configured initial admin password is too short. Set `NODE_ENV=production` behind HTTPS to enable secure cookies.

## Roles

- **Administrator:** all modules, doctor records and staff access management.
- **Doctor:** view clinic records, manage appointment statuses and create prescriptions.
- **Staff:** receptionist, nurse, billing staff or medical records staff. Each subrole only sees the modules needed for its work.

People can register with their name, username and password and request doctor or staff access. They can sign in with their username or account ID, but clinic data stays unavailable until an administrator reviews and approves the requested role in **Staff**. Administrators can also create doctor and staff accounts directly. Admin accounts are configured through the private `.env` file and cannot be created from registration.

Every API route checks the signed-in session and required role on the server. Hiding a browser control is not treated as authorization.

## Data model

Records reference patients and doctors using MongoDB ObjectIds. Removing a patient or doctor record does not cascade-delete linked records, so review and resolve dependent data before removing records.

## Existing Flask version

The older `app.py`, Jinja templates and `requirements.txt` are retained in the repository for reference. The supported MongoDB version is started with `npm start` and serves the frontend from `public/`.

## Deployment note

This is an educational starter, not a production medical-record platform. Production use needs a security review, audit trails, backups, encryption and access controls designed for the applicable health-data requirements.
