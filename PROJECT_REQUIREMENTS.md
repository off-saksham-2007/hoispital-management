# CarePoint Product Requirements

This is the product direction for future work. It describes the target system; it does not claim that every listed feature is implemented yet. New changes should preserve these requirements unless the owner changes them.

## User types and sign-in destinations

The system has four distinct user types. After sign-in, each type lands on its own dashboard, navigation, pages, and actions. Both the interface and server routes must enforce the same role permissions.

1. **Admin** — clinic-wide operations, configuration, oversight, reporting, and user management. Admin creates doctor and staff accounts from the dashboard management pages. Sign-in must not offer doctor or staff registration or role selection.
2. **Doctor** — a personal clinical dashboard for the doctor's own schedule, assigned patients, encounters, clinical documentation, prescriptions, orders, and results.
3. **Staff** — an operations dashboard and pages limited to the staff member's assigned subrole (for example reception, nursing, billing, laboratory, pharmacy, or medical records). A staff member should only see actions and patient information needed for that work.
4. **Patient / normal user** — a patient portal, separate from internal clinic operations, for their own appointments, care information, prescriptions, results, bills, communications, and profile. Patients must never receive staff or doctor controls.

Patient account activation or registration, if enabled, is patient-only. Doctor and staff accounts are provisioned by an administrator. Admin account recovery is an administrative operation and must not create a public role-selection flow.

## Dashboards and page ownership

Each dashboard should show the signed-in person's relevant work, next actions, status summaries, alerts, and shortcuts. Landing after login must route by role. Each major function gets a focused page with its own list/detail views, create/edit flows where appropriate, search/filtering, status transitions, and empty/error states.

### Admin workspace

- Clinic overview: today's activity, appointments, admissions, queue, outstanding tasks, and operational summaries.
- User and access management: create, disable, and manage accounts; assign staff subroles; reset temporary credentials; review access and sessions.
- Doctor management and staff management, including their dedicated directories and detail pages.
- Patient registry, appointments and scheduling, clinical records, billing, and operational oversight.
- Departments, locations, rooms, beds, service catalogs, schedules, and system settings.
- Reports and exports with filters, date ranges, and clear data definitions.
- Audit history for sensitive record access and administrative changes.

### Doctor workspace

- Personal dashboard, calendar, appointments, and patient queue.
- Assigned patient list and patient chart with medical history, allergies, diagnoses, encounters, vitals, medications, prescriptions, referrals, and uploaded documents.
- Encounter notes and follow-up plans, with save/review/sign states and links to the author and visit.
- Orders and results for labs and imaging; result review and follow-up status.
- Prescription creation and medication history.
- Appropriate patient messaging and clinical task lists.

### Staff workspace

Pages and actions vary by assigned subrole; role names must be explicit and access must be enforced by the server.

- **Reception:** patient lookup/registration, appointment booking and check-in, queue, demographics, and referral intake.
- **Nursing:** assigned patient queue, triage/vitals, care tasks, medication administration records, and handoff notes.
- **Billing:** estimates, invoices, payments, insurance details/claims, refunds, and account statements.
- **Laboratory:** test orders, specimen collection and tracking, result entry, validation, and release.
- **Imaging / radiology:** study scheduling, acquisition tracking, report entry, referring-doctor review, and patient release.
- **Pharmacy:** prescriptions, dispensing, stock, substitutions, and refill workflow.
- **Medical records:** chart completeness, document scanning/upload, coding support, record requests, and authorized exports.
- **Operations/inventory:** supplies, purchase/stock movements, room and bed status, and maintenance tasks when those modules are enabled.

### Patient portal

- Patient home: upcoming visits, tasks, recent results, active prescriptions, and balances.
- Appointment request, confirmation, cancellation/rescheduling, and visit history.
- Personal demographics, contact preferences, dependents where authorized, and consent forms.
- Read-only view of released clinical summaries, visit notes, diagnoses, medications, prescriptions, lab/imaging results, and discharge instructions.
- Bills, payment history, receipts, and supported payment actions.
- Secure messages, reminders, forms, and document sharing with the clinic.

## Hospital and clinic functions

Build the system as connected modules with dedicated pages and workflows, rather than one overloaded screen:

- Patient registration, identity/demographics, duplicate review, consent, and longitudinal chart.
- Provider directory, specialties, departments, schedules, and staff assignments.
- Appointment booking, availability, reminders, check-in, waitlists, cancellation, and no-show tracking.
- Outpatient encounters, clinical notes, diagnoses, vitals, allergies, medication reconciliation, and care plans.
- Prescriptions, medication administration, pharmacy dispensing, and medication inventory.
- Laboratory orders, specimens, result entry/review/release, and result history.
- Imaging orders, scheduling, reports, and result review.
- Billing, invoices, payments, insurance/claims, adjustments, receipts, and financial reporting.
- Inpatient admission, bed/room allocation, transfers, nursing handoffs, discharge planning, and discharge summaries.
- Emergency/urgent-care intake and queue tracking where the clinic uses that workflow.
- Referrals, follow-up tasks, secure patient communications, documents, and forms.
- Inventory and purchasing for medicines, supplies, and equipment.
- Operational dashboards, clinical/financial reports, exports, audit trails, and system configuration.

## Shared behavior and quality requirements

- Role-based navigation, page access, and field/action permissions are enforced server-side; hiding a button is not authorization.
- Patient-facing access is limited to the authenticated patient's own records, with explicit authorization for dependents or proxies.
- Search, filters, pagination, validation, useful empty/loading/error states, and responsive layouts are provided on relevant pages.
- Important workflows have traceable status changes, timestamps, responsible users, and audit records.
- Sensitive actions use confirmation and clear feedback; credentials are hashed and sessions are protected.
- Pages should use plain language, keyboard-accessible controls, and clear distinction between draft, signed, pending, and released information.

## Delivery approach

Implement in vertical slices: first finalize the four role model and role-specific sign-in destinations; then account management and patient identity; then appointments and charts; then clinical workflows; then billing and ancillary departments; finally inpatient operations, reporting, audit, and polish. Each slice should include its pages, APIs, permissions, persistence, and workflow states together.

