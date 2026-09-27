# CarePoint Hospital Management System

A full stack hospital and clinic management app using HTML, CSS, browser JavaScript, Node.js/Express and MongoDB.

## Features

- MongoDB collections for staff, patients, doctors, appointments, prescriptions, invoices and patient flow visits
- Password-hashed login, MongoDB-backed secure sessions, login/logout and password changes
- Four dedicated workspaces for admins, doctors, staff subroles, and patients
- Admin-managed doctor and staff accounts with forced password change on first sign-in
- Patient portal registration, appointment requests, signed clinical notes, released lab results, prescriptions, admissions, billing, and secure clinic messages
- Admission/bed management, laboratory worklists, medication dispensing/refills with stock movements, and access/change audit history
- Reception check-in creates a nurse-assigned visit queue item; nurses can record triage vitals, handoff notes, and inpatient medication administration outcomes
- Imaging requests have a radiology worklist, scheduled/acquired/reported states, referring-doctor review, and patient-portal release
- Billing ledger supports itemized invoices, due dates, partial collections, refunds, signed adjustments, printable receipts, patient statements, insurance policies, claim decisions, remittances, and financial reporting
- Date-filtered admin reports with operational and billing totals and CSV export
- Searchable patient list, responsive dashboard and upcoming appointments
- Tailwind CSS and AOS scroll motion with reduced-motion support
- Input validation, Mongo operator sanitization, secure headers and HTTP-only session cookies

## Requirements

- Node.js 20 or newer
- MongoDB Community running locally or a MongoDB Atlas connection string

## Setup

From the `mini_project` folder, start it with:

```powershell
.\run.cmd
```

This installs dependencies if needed, starts the server, and prints the website URL. If you prefer to start it from the `hospital_management` folder directly, run:

```powershell
npm.cmd install
Copy-Item .env.example .env
```

Edit `.env`. Set a private random `SESSION_SECRET` of at least 32 characters, a strong initial admin password of at least 12 characters, and `MONGODB_URI` for your MongoDB instance. The initial administrator is created on startup if its username does not already exist. Keep `.env` private. To reset an existing administrator password, update the administrator password hash through your database administration process and keep `ADMIN_PASSWORD` in `.env` in sync; startup only uses it when creating a missing admin account.

```powershell
npm.cmd start
```

Open the `Website URL` printed in the terminal on this computer. If the default port is already busy, the app automatically tries the next port and prints the working URL. It also prints an `On your network` address. On another device connected to the same Wi-Fi or local network, open that address. If Windows Firewall asks, allow Node.js on private networks. If the page cannot be reached, allow inbound TCP access on the port shown in the URL and check that both devices are on the same network. Do not expose this educational app directly to the public internet.

The app will not start if the session secret or configured initial admin password is too short. Set `NODE_ENV=production` behind HTTPS to enable secure cookies.

## Roles and product direction

The target system has four user types: **Admin**, **Doctor**, **Staff**, and **Patient / normal user**. Each type needs its own post-login dashboard, landing page, navigation, and dedicated pages, with server-side permissions. The complete module and page scope is documented in [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md).

The app has Admin, Doctor, Staff, and Patient accounts with separate post-login workspaces. Doctor and staff accounts are never publicly registered: administrators create them through dashboard management pages, and new accounts must change their temporary password at first sign-in. Patient portal registration creates patient accounts only. The broader hospital workflow roadmap is in [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md). Admin accounts are configured through the private `.env` file.

Every API route checks the signed-in session and required role on the server. Hiding a browser control is not treated as authorization.

## Data model

Records reference patients and doctors using MongoDB ObjectIds. Removing a patient or doctor record does not cascade-delete linked records, so review and resolve dependent data before removing records.

## Existing Flask version

The older `app.py`, Jinja templates and `requirements.txt` are retained in the repository for reference. The supported MongoDB version is started with `npm start` and serves the frontend from `public/`.

## Deployment note

This is an educational starter, not a production medical-record platform. Production use needs a security review, audit trails, backups, encryption and access controls designed for the applicable health-data requirements.
