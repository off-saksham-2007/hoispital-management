const app = document.querySelector('#app');
const endpointForSection = { Patients: 'patients', 'Patient intake': 'patients', 'Patient charts': 'patients', 'My patients': 'patients', Doctors: 'doctors', Appointments: 'appointments', 'My schedule': 'appointments', Prescriptions: 'prescriptions', Invoices: 'invoices', Billing: 'invoices', 'Patient flow': 'visits', 'Lab results': 'labs', 'Test bench': 'labs', Admissions: 'admissions', Beds: 'beds', Inventory: 'inventory', 'Clinical notes': 'encounters' };
const staffTitles = { receptionist: 'Reception', nurse: 'Nursing', billing: 'Billing', records: 'Medical records', lab: 'Laboratory', imaging: 'Radiology', pharmacy: 'Pharmacy', operations: 'Operations' };
const roleSections = {
  admin: ['Dashboard', 'Patients', 'Doctors', 'Appointments', 'Emergency care', 'Referrals', 'Follow-up tasks', 'Clinical notes', 'Admissions', 'Beds', 'Prescriptions', 'Lab results', 'Imaging', 'Billing', 'Inventory', 'Patient flow', 'Reports', 'Messages', 'Staff', 'Audit log'],
  doctor: ['Dashboard', 'My schedule', 'My patients', 'Referrals', 'Follow-up tasks', 'Emergency care', 'Clinical notes', 'Prescriptions', 'Lab results', 'Imaging', 'Admissions', 'Messages'],
  staff: {
    receptionist: ['Dashboard', 'Patient intake', 'Appointments', 'Emergency care', 'Referrals', 'Follow-up tasks', 'Patient flow', 'Patients', 'Messages'],
    nurse: ['Dashboard', 'Emergency care', 'Follow-up tasks', 'Patient flow', 'Appointments', 'My patients', 'Admissions', 'Medication administration', 'Beds', 'Lab results', 'Messages'],
    billing: ['Dashboard', 'Billing'],
    records: ['Dashboard', 'Patient charts', 'Patients', 'Referrals', 'Follow-up tasks', 'Messages'],
    lab: ['Dashboard', 'Test bench'], imaging: ['Dashboard', 'Imaging'], pharmacy: ['Dashboard', 'Prescriptions', 'Inventory'], operations: ['Dashboard', 'Beds', 'Inventory']
  },
  patient: ['Dashboard', 'Find care', 'My appointments', 'My referrals', 'My admissions', 'My health', 'Test results', 'Imaging results', 'Billing', 'Messages', 'My profile']
};
let me = null, section = 'Dashboard', cache = {};

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isStaff = (...subroles) => me?.role === 'staff' && subroles.includes(me.subRole);
const roleTitle = user => user.role === 'pending' ? 'Access pending' : user.role === 'staff' ? (staffTitles[user.subRole] || 'Staff') : user.role === 'admin' ? 'Administrator' : user.role === 'patient' ? 'Patient portal' : 'Doctor';

function currentSections() {
  if (me?.role === 'staff') return roleSections.staff[me.subRole] || ['Dashboard'];
  return roleSections[me?.role] || ['Dashboard'];
}

function refreshMotion() {
  if (!window.AOS) return;
  AOS.init({ duration: 720, easing: 'ease-out-cubic', once: true, offset: 34, disable: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  requestAnimationFrame(() => AOS.refreshHard());
}

function setTheme(theme) {
  const value = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = value;
  try { localStorage.setItem('carepoint-theme', value); } catch {}
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    const next = value === 'dark' ? 'light' : 'dark';
    button.textContent = value === 'dark' ? '☼ Light' : '☾ Dark';
    button.setAttribute('aria-label', `Switch to ${next} theme`);
    button.setAttribute('aria-pressed', String(value === 'dark'));
  });
}

function bindThemeToggles() {
  setTheme(document.documentElement.dataset.theme || 'dark');
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
}

async function api(url, options = {}) {
  const response = await fetch('/api' + url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && me) { me = null; renderLogin('Your session ended. Sign in again to continue.'); }
    throw new Error(body.error || 'Request failed.');
  }
  return body;
}

function toast(message, bad = false) {
  const element = document.createElement('div');
  element.className = 'notice' + (bad ? ' bad' : '');
  element.textContent = message;
  document.body.append(element);
  setTimeout(() => element.remove(), 3200);
}

function renderLanding() {
  app.innerHTML = `<div class="landing-page" id="top">
    <nav class="landing-nav" aria-label="Main navigation">
      <a class="landing-brand" href="#top" aria-label="CarePoint home"><span class="brand-mark" aria-hidden="true">+</span><span>CarePoint</span></a>
      <div class="landing-links"><a href="#platform">Platform</a><a href="#teams">For care teams</a><a href="#about">About</a></div>
      <div class="landing-actions">
        <button class="theme-toggle" data-theme-toggle type="button">Dark</button>
        <button class="nav-login" data-show-login type="button">Log in</button>
        <button class="nav-login" data-show-patient-signup type="button">Patient portal</button>
      </div>
    </nav>

    <main>
      <section class="landing-hero" aria-labelledby="hero-title">
        <div class="hero-orb orb-one" aria-hidden="true"></div><div class="hero-orb orb-two" aria-hidden="true"></div>
        <div class="hero-copy">
          <p class="eyebrow"><span class="eyebrow-dot"></span> THE CARE TEAM WORKSPACE</p>
          <h1 id="hero-title">Care moves better <span>when it moves together.</span></h1>
          <p class="hero-lede">Bring the everyday work of your clinic into one clear, connected space, so your team can spend more energy where it matters.</p>
          <div class="hero-buttons"><button class="hero-primary" data-show-login type="button">Enter your workspace <span aria-hidden="true">↗</span></button><a class="hero-secondary" href="#platform">Explore the platform <span aria-hidden="true">↓</span></a></div>
          <p class="hero-note">Sign in with an account created by your clinic administrator.</p>
          <div class="hero-tags"><span><i aria-hidden="true">✳</i> Patient-first</span><span><i aria-hidden="true">⌘</i> Team-connected</span><span><i aria-hidden="true">◌</i> One workspace</span></div>
        </div>

        <div class="hero-art" aria-label="Illustration of a connected clinic dashboard">
          <div class="art-halo halo-back" aria-hidden="true"></div><div class="art-halo halo-front" aria-hidden="true"></div>
          <div class="orbit orbit-a" aria-hidden="true"><span></span></div><div class="orbit orbit-b" aria-hidden="true"><span></span></div>
          <div class="preview-card preview-main">
            <div class="preview-top"><div class="preview-brand"><span class="mini-mark">+</span><span>CarePoint</span></div><span class="preview-avatar">CP</span></div>
            <div class="preview-heading"><div><small>YOUR CLINIC, IN SYNC</small><h2>A clearer day.</h2></div><span class="preview-date">TODAY <b>↗</b></span></div>
            <div class="preview-stats"><article><span>Appointments</span><strong>18</strong><i class="sparkline spark-one"></i></article><article><span>Care team</span><strong>06</strong><i class="sparkline spark-two"></i></article></div>
            <div class="preview-schedule"><div class="schedule-label"><span>TEAM PULSE</span><span class="pulse-live"><i></i> CONNECTED</span></div><div class="team-row"><span class="team-icon team-teal">✳</span><span><b>Patient flow</b><small>Everyone in the loop</small></span><strong>01</strong></div><div class="team-row"><span class="team-icon team-coral">⌁</span><span><b>Daily coordination</b><small>Care, without the clutter</small></span><strong>02</strong></div></div>
            <div class="preview-bottom"><span class="mini-avatars"><i>A</i><i>M</i><i>+</i></span><span>Your team, moving together</span><b>→</b></div>
          </div>
          <div class="float-note float-note-top"><span class="float-icon">✦</span><span><b>Everything in its place</b><small>One connected workspace</small></span></div>
          <div class="float-note float-note-bottom"><span class="float-check">✓</span><span><b>Care team connected</b><small>Clearer work, every day</small></span></div>
        </div>
      </section>

      <section class="signal-strip" aria-label="CarePoint workspace modules"><span>MADE FOR THE RHYTHM OF A CLINIC</span><div><b>Patient records</b><i></i><b>Appointments</b><i></i><b>Care teams</b><i></i><b>Clinic operations</b></div></section>

      <section class="platform-section" id="platform">
        <div class="section-heading"><p class="eyebrow">ONE SPACE. LESS FRICTION.</p><h2>Good care takes a team.<br><span>Give yours room to connect.</span></h2><p>Keep the moving parts of clinic work close at hand, with tools shaped around the way care teams work together.</p></div>
        <div class="feature-grid">
          <article class="feature-card feature-card-teal"><div class="feature-icon icon-records" aria-hidden="true"><span></span><span></span><span></span></div><p class="feature-kicker">01 / PATIENT CARE</p><h3>See the whole picture.</h3><p>Keep patient records, appointments and care details organized in one shared workspace.</p><a href="#teams" aria-label="Learn about connected care teams">Built around your day <span>↗</span></a><div class="feature-decoration decor-records" aria-hidden="true"></div></article>
          <article class="feature-card feature-card-blue"><div class="feature-icon icon-calendar" aria-hidden="true"><span></span><span></span><span></span><span></span></div><p class="feature-kicker">02 / TEAMWORK</p><h3>Keep everyone in sync.</h3><p>Make it easier for doctors and staff to coordinate the details that keep a clinic moving.</p><a href="#teams" aria-label="See tools for care teams">Made for care teams <span>↗</span></a><div class="feature-decoration decor-team" aria-hidden="true"><i></i><i></i><i></i></div></article>
          <article class="feature-card feature-card-lilac"><div class="feature-icon icon-flow" aria-hidden="true"><span></span><span></span><span></span></div><p class="feature-kicker">03 / OPERATIONS</p><h3>Bring the day together.</h3><p>Connect patient flow, billing and day-to-day clinic operations without losing sight of care.</p><a href="#about" aria-label="About the CarePoint workspace">A calmer workflow <span>↗</span></a><div class="feature-decoration decor-flow" aria-hidden="true"></div></article>
        </div>
      </section>

      <section class="teams-section" id="teams">
        <div class="teams-art" aria-hidden="true"><div class="team-ring ring-one"></div><div class="team-ring ring-two"></div><div class="team-center"><span>+</span><small>CAREPOINT</small></div><div class="role-node node-admin"><b>A</b><span>Admin</span></div><div class="role-node node-doctor"><b>D</b><span>Doctor</span></div><div class="role-node node-staff"><b>S</b><span>Staff</span></div><div class="connect-line line-one"></div><div class="connect-line line-two"></div><div class="connect-line line-three"></div></div>
      </section>

    </main>

    <footer class="landing-footer"><a class="landing-brand" href="#top"><span class="brand-mark" aria-hidden="true">+</span><span>CarePoint</span></a><p>A clearer view of clinic work.</p><div class="footer-links"><a href="#platform">Platform</a><a href="#teams">Care teams</a><button data-show-login type="button">Log in</button></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} CarePoint</span><span>For the people who make care happen.</span><a href="#top">Back to top ↑</a></div></footer>
  </div>`;
  bindThemeToggles();
  document.querySelectorAll('.feature-card,.preview-main,.float-note,.section-heading').forEach((element, index) => { element.dataset.aos = 'fade-up'; element.dataset.aosDelay = String(Math.min(index % 4, 3) * 80); });
  document.querySelectorAll('[data-show-login]').forEach(button => button.onclick = () => me ? render() : renderLogin());
  document.querySelectorAll('[data-show-patient-signup]').forEach(button => button.onclick = () => renderPatientRegister());
  refreshMotion();
}

function renderLogin(message = '', success = false) {
  app.innerHTML = `<section class="auth-page">
    <header class="auth-nav"><a class="landing-brand" href="#" id="back-home"><span class="brand-mark" aria-hidden="true">+</span><span>CarePoint</span></a><div class="auth-nav-actions"><button class="theme-toggle" data-theme-toggle type="button">Dark</button><button class="auth-back" id="back-home-secondary" type="button">← Back to home</button></div></header>
    <div class="auth-layout"><div class="auth-message"><p class="eyebrow">WELCOME TO YOUR WORKSPACE</p><h1>Good to have<br><span>you back.</span></h1><p>Sign in to pick up where your team left off.</p><div class="auth-decoration" aria-hidden="true"><span></span><span></span><span></span></div></div>
      <form id="login" class="card login-card auth-card"><div class="auth-card-mark" aria-hidden="true">+</div><p class="eyebrow">CAREPOINT WORKSPACE</p><h2>Sign in</h2><p class="muted">Use your username or account ID and password.</p>${message ? `<div class="${success ? 'success' : 'error'}" role="${success ? 'status' : 'alert'}">${esc(message)}</div>` : ''}
        <div class="field"><label for="login-username">Username or account ID</label><input id="login-username" name="username" autocomplete="username" required autofocus></div>
        <div class="field"><label for="login-password">Password</label><input id="login-password" name="password" type="password" autocomplete="current-password" required></div>
        <button class="btn primary full" type="submit">Continue securely <span aria-hidden="true">↗</span></button>
        <p class="auth-help">Clinic accounts are provided by your administrator. <button class="auth-link" id="patient-signup" type="button">Create a patient portal account</button></p>
      </form>
    </div><div class="auth-footer"><span>CarePoint · A clearer view of clinic work</span><a href="#" id="auth-home-link">Return to home</a></div>
  </section>`;
  bindThemeToggles();
  const goHome = event => { event?.preventDefault(); renderLanding(); };
  document.querySelector('#back-home').onclick = goHome;
  document.querySelector('#back-home-secondary').onclick = goHome;
  document.querySelector('#auth-home-link').onclick = goHome;
  document.querySelector('#patient-signup').onclick = () => renderPatientRegister();
  document.querySelector('#login').onsubmit = async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(data) });
      me = result.user;
      section = 'Dashboard';
      render();
    } catch (error) {
      renderLogin(error.message);
    }
  };
  refreshMotion();
}

function renderPatientRegister(message = '', success = false) {
  app.innerHTML = `<section class="auth-page patient-auth"><header class="auth-nav"><a class="landing-brand" href="#" id="patient-home"><span class="brand-mark">+</span><span>CarePoint</span></a><div class="auth-nav-actions"><button class="theme-toggle" data-theme-toggle type="button">Dark</button><button class="auth-back" id="patient-signin" type="button">I already have an account</button></div></header>
    <div class="auth-layout register-layout"><div class="auth-message"><p class="eyebrow">YOUR CARE, ALL IN ONE PLACE</p><h1>A simpler way<br><span>to stay well.</span></h1><p>Book visits, follow your care and keep your health information close.</p><div class="auth-decoration" aria-hidden="true"><span></span><span></span><span></span></div></div>
      <form id="patient-register" class="card auth-card"><div class="auth-card-mark" aria-hidden="true">+</div><p class="eyebrow">PATIENT PORTAL</p><h2>Create your account</h2><p class="muted">This creates a patient account only.</p>${message ? `<div class="${success ? 'success' : 'error'}" role="${success ? 'status' : 'alert'}">${esc(message)}</div>` : ''}
        <div class="field"><label for="patient-name">Full name</label><input id="patient-name" name="displayName" autocomplete="name" minlength="2" maxlength="120" required></div>
        <div class="field"><label for="patient-username">Username</label><input id="patient-username" name="username" autocomplete="username" pattern="[A-Za-z0-9._-]{3,80}" minlength="3" maxlength="80" required></div>
        <div class="field"><label for="patient-phone">Phone</label><input id="patient-phone" name="phone" autocomplete="tel" type="tel" minlength="7" maxlength="20" required></div>
        <div class="field"><label for="patient-email">Email <span class="muted">(optional)</span></label><input id="patient-email" name="email" autocomplete="email" type="email"></div>
        <div class="field"><label for="patient-dob">Date of birth <span class="muted">(optional)</span></label><input id="patient-dob" name="dateOfBirth" type="date"></div>
        <div class="field"><label for="patient-address">Address <span class="muted">(optional)</span></label><input id="patient-address" name="address" autocomplete="street-address"></div>
        <div class="field"><label for="patient-password">Password</label><input id="patient-password" name="password" type="password" minlength="12" autocomplete="new-password" required><small class="field-help">Use at least 12 characters.</small></div>
        <div class="field"><label for="patient-confirm">Confirm password</label><input id="patient-confirm" name="confirmPassword" type="password" minlength="12" autocomplete="new-password" required></div>
        <button class="btn primary full" type="submit">Create patient portal <span>↗</span></button>
      </form></div><div class="auth-footer"><span>CarePoint · Patient portal</span><a href="#" id="patient-home-link">Return to home</a></div></section>`;
  bindThemeToggles();
  const goHome = event => { event?.preventDefault(); renderLanding(); };
  document.querySelector('#patient-home').onclick = goHome;
  document.querySelector('#patient-home-link').onclick = goHome;
  document.querySelector('#patient-signin').onclick = () => renderLogin();
  document.querySelector('#patient-register').onsubmit = async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    if (body.password !== body.confirmPassword) return renderPatientRegister('Passwords do not match.');
    try {
      await api('/auth/patient-register', { method: 'POST', body: JSON.stringify(body) });
      renderLogin('Patient portal created. Sign in with your username and password.', true);
    } catch (error) { renderPatientRegister(error.message); }
  };
  refreshMotion();
}

function renderPendingAccount() {
  const requestTitle = me.requestedRole === 'staff' ? `Staff · ${staffTitles[me.requestedSubRole] || 'Staff'}` : 'Doctor';
  app.innerHTML = `<section class="auth-page"><header class="auth-nav"><a class="landing-brand" href="#"><span class="brand-mark" aria-hidden="true">+</span><span>CarePoint</span></a><div class="auth-nav-actions"><button class="theme-toggle" data-theme-toggle type="button">Dark</button><button class="auth-back" id="pending-logout" type="button">Sign out</button></div></header>
    <main class="pending-wrap"><div class="pending-icon" aria-hidden="true">…</div><p class="eyebrow">ACCOUNT CREATED</p><h1>Your account is<br><span>under review.</span></h1><p class="pending-copy">You are signed in as <b>${esc(me.displayName || me.username)}</b>. An administrator must approve your requested access before clinic records become available.</p><div class="pending-details"><div><span>Account ID</span><b>${esc(me.id)}</b></div><div><span>Requested access</span><b>${esc(requestTitle)}</b></div><div><span>Status</span><b class="pending-status">Waiting for administrator</b></div></div><div class="pending-actions"><button class="hero-primary" id="check-approval" type="button">Check approval status <span>↻</span></button><button class="text-cta" id="pending-back" type="button">Back to homepage</button></div></main><div class="auth-footer"><span>CarePoint · A clearer view of clinic work</span><span>Access is assigned by your administrator.</span></div></section>`;
  bindThemeToggles();
  document.querySelector('#pending-back').onclick = () => renderLanding();
  document.querySelector('#pending-logout').onclick = async () => { try { await api('/auth/logout', { method: 'POST' }); } finally { me = null; renderLanding(); } };
  document.querySelector('#check-approval').onclick = async event => {
    event.currentTarget.disabled = true;
    try {
      const { user } = await api('/auth/me');
      me = user;
      if (me.role === 'pending' || me.approved === false) toast('Your account is still waiting for approval.');
      else { section = 'Dashboard'; render(); }
    } catch (error) { toast(error.message, true); }
    finally { if (document.querySelector('#check-approval')) document.querySelector('#check-approval').disabled = false; }
  };
}

function navAllowed(item) { return currentSections().includes(item); }

function render() {
  if (!me) return renderLanding();
  if (me.role === 'pending' || me.approved === false) return renderPendingAccount();
  if (!navAllowed(section)) section = 'Dashboard';
  const links = currentSections().map((item, index) => `<button class="${section === item ? 'active' : ''}" data-section="${esc(item)}" data-aos="fade-right" data-aos-delay="${Math.min(index, 5) * 35}">${esc(item)}</button>`).join('');
  const patientMode = me.role === 'patient';
  app.innerHTML = `<div class="shell min-h-screen grid grid-cols-[264px_minmax(0,1fr)] ${patientMode ? 'patient-shell' : ''}" id="workspace">
    <aside class="sidebar">
      <div class="brand"><b aria-hidden="true">?</b><span>CarePoint<small style="display:block;margin:1px 0 0 47px;color:#87a49c;font:700 8px 'DM Sans';letter-spacing:.15em">${patientMode ? 'PATIENT PORTAL' : 'CLINIC SUITE'}</small></span></div>
      <nav class="nav" aria-label="Main navigation">${links}</nav>
      <div class="userbox"><strong>${esc(me.displayName || me.username)}</strong><small>${esc(roleTitle(me))} account</small><button class="btn" id="account-password" type="button">Change password</button><button class="btn" id="logout" type="button">Sign out</button></div>
    </aside>
    <main class="main min-w-0">
      <header class="top"><div style="display:flex;align-items:center;gap:12px"><button class="btn nav-toggle" id="nav-toggle" type="button" style="display:none" aria-label="Open navigation">?</button><div><p class="muted" style="margin:0 0 5px">${esc(roleTitle(me))} workspace</p><h1>${esc(section)}</h1></div></div><div class="top-actions"><button class="theme-toggle" data-theme-toggle type="button">Dark</button><span class="pill">? &nbsp;Secure session</span></div></header>
      <div id="content"></div>
    </main>
  </div>`;
  bindThemeToggles();
  document.querySelectorAll('[data-section]').forEach(button => button.onclick = () => { section = button.dataset.section; document.querySelector('#workspace').classList.remove('nav-open'); render(); });
  document.querySelector('#nav-toggle').onclick = () => document.querySelector('#workspace').classList.toggle('nav-open');
  document.querySelector('#account-password').onclick = () => changePassword(false);
  document.querySelector('#logout').onclick = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } finally { me = null; renderLanding(); }
  };
  if (me.mustChangePassword) return changePassword(true);
  refreshMotion();
  loadSection().catch(error => toast(error.message, true));
}

function changePassword(forced = false) {
  document.querySelector('#content').innerHTML = `<section class="card" style="max-width:560px">
    <h2>${forced ? 'Set your new password' : 'Change password'}</h2>
    <p class="muted">Choose a password with at least 12 characters.</p>
    <form id="pw">${forced ? '' : '<div class="field"><label for="current-password">Current password</label><input id="current-password" type="password" name="currentPassword" autocomplete="current-password" required></div>'}<div class="field"><label for="new-password">New password</label><input id="new-password" type="password" name="password" autocomplete="new-password" minlength="12" required></div>
    <button class="btn primary" type="submit">Save password</button></form>
  </section>`;
  document.querySelector('#pw').onsubmit = async event => {
    event.preventDefault();
    try {
      const result = await api('/auth/password', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
      me = result.user;
      toast('Password updated.');
      render();
    } catch (error) { toast(error.message, true); }
  };
}

async function loadSection() {
  const target = document.querySelector('#content');
  if (me.role === 'patient') return renderPatientSection(target, section);
  if (section === 'Billing') {
    const billing=await api('/billing');
    const insurance=me.role==='admin'||isStaff('billing')?await api('/insurance'):{policies:[],claims:[]};
    return renderBillingPage(target,{...billing,...insurance});
  }
  if (section === 'Messages') return renderClinicMessages(target);
  if (section === 'Audit log') return renderAuditLog(target);
  if (section === 'Reports') return renderReports(target);
  if (section === 'Inventory') return renderInventory(target);
  if (section === 'Medication administration') return renderMAR(target);
  if (section === 'Lab results' || section === 'Test bench') return renderLabList(target, await api('/labs'));
  if (section === 'Imaging') return renderImaging(target, await api('/imaging'));
  if (section === 'Emergency care') return renderEmergency(target, await api('/emergency'));
  if (section === 'Referrals') return renderReferrals(target, await api('/referrals'));
  if (section === 'Follow-up tasks') return renderFollowups(target, await api('/followups'));
  if (section === 'Dashboard') return renderClinicalDashboard(target, await api('/dashboard'));
  if (section === 'Staff') return staff(target);
  const url = endpointForSection[section];
  if (!url) { target.innerHTML = '<section class="card empty">This workspace page is being prepared.</section>'; return; }
  const data = await api('/' + url);
  cache[url] = data;
  renderTable(target, url, data);
}

function sectionButton(label, icon = '&#8599;') { return `<button class="btn" type="button" data-section="${esc(label)}">${esc(label)} <span aria-hidden="true">${icon}</span></button>`; }
function metricCard(label, value, detail, index = 0) { return `<article class="card stat" data-aos="fade-up" data-aos-delay="${index * 70}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span class="muted" style="font-size:10px">${esc(detail || '')}</span></article>`; }

function renderClinicalDashboard(target, data) {
  const firstName = (me.displayName || me.username).split(/\s+/)[0];
  const admin = me.role === 'admin';
  const doctor = me.role === 'doctor';
  const imagingStaff = isStaff('imaging');
  const dashboardSection = admin ? 'Appointments' : doctor ? 'My schedule' : imagingStaff ? 'Imaging' : 'Appointments';
  const activityHeaders = imagingStaff ? ['Patient', 'Study', 'Body site', 'Priority', 'Status'] : ['Patient', 'Doctor', 'Date', 'Status'];
  const activityRows = imagingStaff ? (data.upcoming || []).map(item => [item.patient?.name, item.modality, item.bodySite, item.priority, item.status]) : (data.upcoming || []).map(item => [item.patient?.name, item.doctor?.name, new Date(item.date).toLocaleString(), item.status]);
  const heading = admin ? 'Your clinic, in rhythm.' : doctor ? 'Good to see you, Dr. ' + firstName + '.' : 'Good morning, ' + firstName + '.';
  const message = admin ? 'A live view of people, schedules and care moving through your clinic today.' : doctor ? 'Your schedule and care team are ready for the day.' : `${roleTitle(me)} workspace - here are the tasks and updates for your shift.`;
  const metrics = admin
    ? [['Active patients', data.patients, 'Across the clinic'], ['Care team', data.doctors, 'Doctors on directory'], ['Appointments', data.appointments, 'Scheduled visits'], ['Open invoices', data.pendingBills, 'Need follow-up']]
    : doctor
      ? [['My patients', data.patients, 'In your care'], ['Appointments', data.appointments, 'Upcoming visits'], ['Prescriptions', data.prescriptions, 'On patient charts'], ['Lab results', data.results || 0, 'Released for review'], ['Imaging review', data.imagingOrders || 0, 'Reports needing your review']]
      : isStaff('billing') ? [['Open invoices', data.pendingBills, 'Awaiting payment'], ['Patients', data.patients, 'Registered patients']]
        : isStaff('pharmacy') ? [['Ready to dispense', data.prescriptions, 'Active prescription fills'], ['Medication items', data.medicationStock, 'In inventory'], ['Low stock', data.lowStock, 'At or below reorder point']]
        : isStaff('nurse') ? [['Assigned patients', data.patients, 'In your current care'], ['Active queue', data.visits, 'Waiting or in consultation'], ['Admissions', data.activeAdmissions, 'Currently admitted to your care'], ['Appointments', data.appointments, 'Upcoming for assigned patients']]
          : isStaff('imaging') ? [['Imaging queue', data.queue, 'Ordered or scheduled'], ['Awaiting report', data.awaitingReport, 'Acquired studies'], ['Awaiting review', data.awaitingReview, 'Reports for doctors'], ['STAT priority', data.urgent, 'Urgent studies in progress']]
        : [['Patients', data.patients, 'In the clinic system'], ['Appointments', data.appointments, 'Scheduled visits'], ...(data.visits !== undefined ? [['Active queue', data.visits, 'Waiting or in care']] : [])];
  const shortcuts = admin ? ['Patients', 'Doctors', 'Appointments', 'Admissions', 'Imaging', 'Inventory', 'Reports'] : doctor ? ['My schedule', 'My patients', 'Clinical notes', 'Prescriptions', 'Lab results', 'Imaging'] : isStaff('pharmacy') ? ['Prescriptions', 'Inventory'] : isStaff('nurse') ? ['Patient flow', 'Admissions', 'Medication administration', 'My patients'] : currentSections().filter(item => item !== 'Dashboard').slice(0, 4);
  target.innerHTML = `<section class="workspace-hero" data-aos="fade-up"><span class="eyebrow">${admin ? 'CLINIC OVERVIEW' : doctor ? 'YOUR CLINICAL DAY' : 'SHIFT OVERVIEW'}</span><h2>${esc(heading)}</h2><p>${esc(message)}</p><div class="hero-quick" style="position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:8px;margin-top:20px">${shortcuts.map(label => `<button class="btn" data-section="${esc(label)}" style="background:#ffffff12;border:1px solid #ffffff22;color:#effcf6">${esc(label)} &nbsp;&#8599;</button>`).join('')}</div></section>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:16px">${metrics.map((item,index)=>metricCard(...item,index)).join('')}</div>
    <div class="section-kicker">${admin ? 'Clinic pulse' : doctor ? 'Your day' : 'Shift details'}</div>
    <div class="two"><section class="card" data-aos="fade-up"><div class="toolbar"><div><strong>${imagingStaff ? 'Studies needing next step' : doctor ? 'Upcoming visits' : 'Upcoming appointments'}</strong><p class="muted" style="margin:5px 0 0;font-size:11px">${new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</p></div>${sectionButton(dashboardSection)}</div>${data.upcoming?.length ? table(activityHeaders,activityRows) : (imagingStaff ? '<div class="empty">No studies need your next action yet.</div>' : '<div class="empty">Your upcoming visits will appear here.</div>')}</section>
      <section class="card" data-aos="fade-up" data-aos-delay="100"><div class="section-kicker" style="margin-top:0">A calmer way to work</div><h3 style="font:700 20px Manrope;letter-spacing:-.04em">Care in one clear view.</h3><p class="muted" style="font-size:12px;line-height:1.8">Stay close to the next action, keep important work visible, and move through the day with your team.</p><div style="display:grid;gap:8px;margin-top:18px">${shortcuts.map((label,index)=>`<button class="btn" data-section="${esc(label)}" style="display:flex;justify-content:space-between;text-align:left;background:#f6faf8;border:1px solid #e8efec"><span><b style="color:#173633">${esc(label)}</b><small style="display:block;color:#82918d;margin-top:3px">Open ${esc(label.toLowerCase())} workspace</small></span><span style="color:#218872">${String(index+1).padStart(2,'0')} &#8599;</span></button>`).join('')}</div></section></div>`;
  target.querySelectorAll('[data-section]').forEach(button => button.onclick = () => { section = button.dataset.section; render(); });
  refreshMotion();
}

function portalStatus(value) {
  const tone = ({ Scheduled:'good', 'Checked-in':'waiting', Requested:'waiting', Completed:'good', Cancelled:'quiet', 'No-show':'alert', Pending:'waiting', Submitted:'waiting', Approved:'good', 'Partially approved':'waiting', Denied:'alert', 'Partially paid':'waiting', Paid:'good', Voided:'quiet', Active:'good', Inactive:'quiet', Released:'good', Ordered:'waiting', Acquired:'waiting', Reported:'waiting', Reviewed:'good', Given:'good', Refused:'alert', Held:'waiting', Missed:'alert', Admitted:'waiting', Discharged:'quiet' })[value] || 'quiet';
  return `<span class="portal-status ${tone}">${esc(value)}</span>`;
}

async function renderReferrals(target, referrals) {
  const canCreate=['admin','doctor'].includes(me.role), frontDesk=me.role==='admin'||isStaff('receptionist','records'), clinician=me.role==='admin'||me.role==='doctor';
  target.innerHTML=`<section class="workspace-hero" data-aos="fade-up"><span class="eyebrow">CARE COORDINATION</span><h2>Referrals, with the next step in view.</h2><p>Keep the reason, receiving specialty, expected date, and outcome together with each patient referral.</p></section><section class="card referral-board" data-aos="fade-up"><div class="toolbar"><div><strong>Referral register</strong><p class="muted" style="margin:5px 0 0;font-size:11px">${referrals.length} referrals · open items stay visible until completed or closed.</p></div>${canCreate?'<button id="add-referral" class="btn primary">+ New referral</button>':''}</div><div class="referral-list">${referrals.map((item,index)=>{const actions=[];if(item.status==='Ordered'&&frontDesk)actions.push(`<button class="btn primary" data-referral-status="Scheduled" data-referral="${esc(item._id)}">Schedule</button>`);if(['Ordered','Scheduled'].includes(item.status)&&clinician){if(item.status==='Scheduled')actions.push(`<button class="btn primary" data-referral-status="Completed" data-referral="${esc(item._id)}">Mark complete</button>`);actions.push(`<button class="btn" data-referral-status="Declined" data-referral="${esc(item._id)}">Decline</button>`)}if(['Ordered','Scheduled'].includes(item.status)&&frontDesk)actions.push(`<button class="btn" data-referral-status="Cancelled" data-referral="${esc(item._id)}">Cancel</button>`);return `<article class="referral-card" data-aos="fade-up" data-aos-delay="${Math.min(index,5)*45}"><div class="referral-card-head"><div><span class="eyebrow">${esc(item.priority)} PRIORITY · ${esc(item.specialty)}</span><h3>${esc(item.patient?.name||'Patient')}<small>${esc(item.patient?.phone||'')}</small></h3></div>${portalStatus(item.status)}</div><p>${esc(item.reason)}</p><div class="referral-meta"><span>Referring doctor <b>${esc(item.doctor?.name||'Care team')}</b></span><span>Destination <b>${esc(item.destination||'To be assigned')}</b></span><span>Expected <b>${item.dueAt?new Date(item.dueAt).toLocaleDateString():'Not scheduled'}</b></span></div>${item.note?`<p class="muted">${esc(item.note)}</p>`:''}${actions.length?`<div class="actions">${actions.join('')}</div>`:''}</article>`}).join('')||'<div class="empty">No referrals yet. New referrals will be tracked here from order to outcome.</div>'}</div></section>`;
  target.querySelector('#add-referral')?.addEventListener('click',openReferralDialog);
  target.querySelectorAll('[data-referral-status]').forEach(button=>button.onclick=async()=>{try{const body={status:button.dataset.referralStatus};if(body.status==='Scheduled'){const value=prompt('Expected referral date (optional, for example 2026-10-08):');if(value===null)return;if(value.trim()){const date=new Date(value);if(!Number.isFinite(date.getTime()))return toast('Enter a valid referral date.',true);body.dueAt=date.toISOString()}}await api('/referrals/'+button.dataset.referral,{method:'PATCH',body:JSON.stringify(body)});toast('Referral status updated.');loadSection()}catch(error){toast(error.message,true)}});
  refreshMotion();
}

async function openReferralDialog() {
  try{const [patients,doctors]=await Promise.all([api('/patients'),api('/doctors')]);if(!patients.length||!doctors.length)return toast('Add a patient and provider before creating a referral.',true);const modal=document.createElement('dialog');modal.className='card workflow-dialog';modal.innerHTML=`<span class="eyebrow">CARE COORDINATION</span><h2>Place a referral</h2><form id="referral-form"><div class="formgrid"><div class="field"><label>Patient</label><select name="patient" required>${patients.map(item=>`<option value="${esc(item._id)}">${esc(item.name)} · ${esc(item.phone||'')}</option>`).join('')}</select></div><div class="field"><label>Referring doctor</label><select name="doctor" required>${doctors.map(item=>`<option value="${esc(item._id)}">${esc(item.name)} · ${esc(item.specialization)}</option>`).join('')}</select></div><div class="field"><label>Receiving specialty</label><input name="specialty" maxlength="160" placeholder="Cardiology, neurology..." required></div><div class="field"><label>Priority</label><select name="priority"><option>Routine</option><option>Urgent</option></select></div><div class="field wide"><label>Destination / clinic</label><input name="destination" maxlength="200" placeholder="Optional receiving clinic or provider"></div><div class="field wide"><label>Clinical reason and referral question</label><textarea name="reason" rows="4" minlength="5" maxlength="2000" required></textarea></div><div class="field"><label>Expected by</label><input name="dueAt" type="date"></div><div class="field"><label>Coordination note</label><input name="note" maxlength="1000"></div></div><div class="actions"><button class="btn primary" type="submit">Place referral</button><button class="btn" type="button" id="referral-cancel">Cancel</button></div></form>`;document.body.append(modal);modal.showModal();modal.querySelector('#referral-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();modal.querySelector('#referral-form').onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));if(me.role==='doctor')delete body.doctor;if(body.dueAt)body.dueAt=new Date(body.dueAt+'T12:00:00').toISOString();try{await api('/referrals',{method:'POST',body:JSON.stringify(body)});modal.close();toast('Referral added to the care coordination queue.');loadSection()}catch(error){toast(error.message,true)}}}catch(error){toast(error.message,true)}
}

async function renderFollowups(target, tasks) {
  const canCreate=['admin','doctor'].includes(me.role),canAdmin=me.role==='admin';
  target.innerHTML=`<section class="workspace-hero" data-aos="fade-up"><span class="eyebrow">CARE PLAN TASKS</span><h2>Follow-up, made actionable.</h2><p>Track patient callbacks, repeat tests, post-visit check-ins, and care plan steps with an owner and due date.</p></section><section class="card referral-board" data-aos="fade-up"><div class="toolbar"><div><strong>Follow-up worklist</strong><p class="muted" style="margin:5px 0 0;font-size:11px">${tasks.filter(item=>['Open','In progress'].includes(item.status)).length} active tasks · Assigned owners can update progress.</p></div>${canCreate?'<button id="add-followup" class="btn primary">+ Assign follow-up</button>':''}</div><div class="referral-list">${tasks.map((task,index)=>{const owns=canAdmin||String(task.assignedTo?._id||task.assignedTo)===String(me.id)||String(task.createdBy?._id||task.createdBy)===String(me.id);const buttons=owns&&task.status==='Open'?`<button class="btn primary" data-task-status="In progress" data-task="${esc(task._id)}">Start</button><button class="btn" data-task-status="Completed" data-task="${esc(task._id)}">Complete</button>`:owns&&task.status==='In progress'?`<button class="btn" data-task-status="Open" data-task="${esc(task._id)}">Reopen</button><button class="btn primary" data-task-status="Completed" data-task="${esc(task._id)}">Complete</button>`:'';return `<article class="referral-card" data-aos="fade-up" data-aos-delay="${Math.min(index,5)*45}"><div class="referral-card-head"><div><span class="eyebrow">DUE ${new Date(task.dueAt).toLocaleDateString()}${task.patientVisible?' · SHARED WITH PATIENT':''}</span><h3>${esc(task.title)}<small>${esc(task.patient?.name||'Patient')}</small></h3></div>${portalStatus(task.status)}</div><p>${esc(task.instructions||'No additional instructions.')}</p><div class="referral-meta"><span>Assigned to <b>${esc(task.assignedTo?.displayName||task.assignedTo?.username||'Care team')}</b></span>${task.encounter?`<span>Visit <b>${esc(task.encounter.chiefConcern)}</b></span>`:''}${task.referral?`<span>Referral <b>${esc(task.referral.specialty)}</b></span>`:''}</div>${task.completionNote?`<p class="muted">${esc(task.completionNote)}</p>`:''}${buttons?`<div class="actions">${buttons}</div>`:''}</article>`}).join('')||'<div class="empty">No follow-up tasks. Add one from a patient encounter or assign a care team action.</div>'}</div></section>`;
  target.querySelector('#add-followup')?.addEventListener('click',openFollowupDialog);
  target.querySelectorAll('[data-task-status]').forEach(button=>button.onclick=async()=>{let completionNote;if(button.dataset.taskStatus==='Completed'){completionNote=prompt('Optional completion note:');if(completionNote===null)return}try{await api('/followups/'+button.dataset.task,{method:'PATCH',body:JSON.stringify({status:button.dataset.taskStatus,completionNote})});toast('Follow-up task updated.');loadSection()}catch(error){toast(error.message,true)}});
  refreshMotion();
}

async function openFollowupDialog() {
  try{const [patients,staff]=await Promise.all([api('/patients'),me.role==='admin'?api('/staff'):Promise.resolve([])]);if(!patients.length)return toast('Add a patient before assigning follow-up.',true);const assignees=me.role==='admin'?staff.filter(user=>user.active&&['admin','doctor','staff'].includes(user.role)):[me];const modal=document.createElement('dialog');modal.className='card workflow-dialog';modal.innerHTML=`<span class="eyebrow">CARE PLAN TASK</span><h2>Assign follow-up</h2><form id="followup-form"><div class="field"><label>Patient</label><select name="patient" required>${patients.map(item=>`<option value="${esc(item._id)}">${esc(item.name)} · ${esc(item.phone||'')}</option>`).join('')}</select></div><div class="field"><label>Task</label><input name="title" maxlength="200" placeholder="Call patient after discharge" required></div><div class="formgrid"><div class="field"><label>Owner</label>${me.role==='admin'?`<select name="assignedTo" required>${assignees.map(user=>`<option value="${esc(user._id)}">${esc(user.displayName||user.username)} · ${esc(roleTitle(user))}</option>`).join('')}</select>`:`<input value="${esc(me.displayName||me.username)}" disabled><input type="hidden" name="assignedTo" value="${esc(me.id)}">`}</div><div class="field"><label>Due date</label><input name="dueAt" type="date" value="${new Date(Date.now()+86400000).toISOString().slice(0,10)}" required></div></div><div class="field"><label>Instructions</label><textarea name="instructions" rows="3" maxlength="2000"></textarea></div><label class="check-field"><input name="patientVisible" type="checkbox" value="true"> Share this follow-up in the patient's portal</label><div class="actions"><button class="btn primary" type="submit">Assign task</button><button class="btn" type="button" id="followup-cancel">Cancel</button></div></form>`;document.body.append(modal);modal.showModal();modal.querySelector('#followup-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();modal.querySelector('#followup-form').onsubmit=async event=>{event.preventDefault();const formData=new FormData(event.currentTarget),body=Object.fromEntries(formData);body.patientVisible=formData.has('patientVisible');body.dueAt=new Date(body.dueAt+'T12:00:00').toISOString();try{await api('/followups',{method:'POST',body:JSON.stringify(body)});modal.close();toast('Follow-up task assigned.');loadSection()}catch(error){toast(error.message,true)}}}catch(error){toast(error.message,true)}
}

async function renderEmergency(target, visits) {
  const canIntake=me.role==='admin'||isStaff('receptionist'),isNurse=isStaff('nurse'),isDoctor=me.role==='doctor';
  const counts=['Arrived','Triaged','In care'].map(status=>[status,visits.filter(item=>item.status===status).length]);
  target.innerHTML=`<section class="workspace-hero emergency-hero" data-aos="fade-up"><span class="eyebrow">URGENT CARE · LIVE QUEUE</span><h2>Every arrival gets seen.</h2><p>Record arrivals, prioritize triage, and keep the clinical team in sync through disposition.</p></section><div class="grid emergency-metrics">${counts.map((item,index)=>metricCard(item[0],item[1],item[0]==='Arrived'?'Needs triage':item[0]==='Triaged'?'Waiting for a clinician':'In active care',index)).join('')}</div><section class="card referral-board"><div class="toolbar"><div><strong>Emergency arrivals</strong><p class="muted" style="margin:5px 0 0;font-size:11px">Sorted by priority and arrival time · ${visits.length} recent visits</p></div>${canIntake?'<button class="btn primary" id="emergency-intake">+ Register arrival</button>':''}</div><div class="emergency-list">${visits.map((visit,index)=>{let action='';if((isNurse||me.role==='admin')&&visit.status==='Arrived')action=`<button class="btn primary" data-emergency-triage="${esc(visit._id)}">Record triage</button>`;else if((isDoctor||me.role==='admin')&&visit.status==='Triaged')action=`<button class="btn primary" data-emergency-advance="${esc(visit._id)}">Start care</button>`;else if((isDoctor||me.role==='admin')&&visit.status==='In care')action=`<button class="btn primary" data-emergency-advance="${esc(visit._id)}">Record disposition</button>`;return `<article class="emergency-card priority-${visit.priority.toLowerCase()}" data-aos="fade-up" data-aos-delay="${Math.min(index,5)*40}"><div class="referral-card-head"><div><span class="eyebrow">${esc(visit.priority)} · ${esc(visit.arrivalMode)} · ${new Date(visit.arrivedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</span><h3>${esc(visit.patient?.name||'Patient')}${visit.patient?.age?`<small>${esc(visit.patient.age)} years · ${esc(visit.patient.gender||'')}</small>`:''}</h3></div>${portalStatus(visit.status)}</div><p><b>Presenting concern:</b> ${esc(visit.chiefConcern)}</p><div class="referral-meta"><span>Nurse <b>${esc(visit.assignedNurse?.displayName||'Awaiting assignment')}</b></span><span>Attending <b>${esc(visit.attendingDoctor?.name||'Awaiting assignment')}</b></span><span>Arrived <b>${new Date(visit.arrivedAt).toLocaleString()}</b></span></div>${visit.status!=='Arrived'?`<div class="emergency-vitals">${visit.bloodPressure?`<span>BP ${esc(visit.bloodPressure)}</span>`:''}${visit.pulse?`<span>Pulse ${esc(visit.pulse)}</span>`:''}${visit.temperature?`<span>${esc(visit.temperature)} °C</span>`:''}${visit.oxygenSaturation?`<span>SpO₂ ${esc(visit.oxygenSaturation)}%</span>`:''}${visit.triageNote?`<p>${esc(visit.triageNote)}</p>`:''}</div>`:''}${visit.dispositionNote?`<p class="muted">Disposition: ${esc(visit.dispositionNote)}</p>`:''}${action?`<div class="actions">${action}</div>`:''}</article>`}).join('')||'<div class="empty">No emergency arrivals. New urgent cases will appear here as soon as reception registers them.</div>'}</div></section>`;
  target.querySelector('#emergency-intake')?.addEventListener('click',openEmergencyIntake);
  target.querySelectorAll('[data-emergency-triage]').forEach(button=>button.onclick=()=>openEmergencyTriage(visits.find(item=>item._id===button.dataset.emergencyTriage)));
  target.querySelectorAll('[data-emergency-advance]').forEach(button=>button.onclick=()=>advanceEmergency(visits.find(item=>item._id===button.dataset.emergencyAdvance)));
  refreshMotion();
}

async function openEmergencyIntake() {
  try{const [patients,doctors,nurses]=await Promise.all([api('/patients'),api('/doctors'),api('/nurses')]);if(!patients.length)return toast('Register the patient before creating an emergency visit.',true);const modal=document.createElement('dialog');modal.className='card workflow-dialog';modal.innerHTML=`<span class="eyebrow">URGENT ARRIVAL</span><h2>Register emergency visit</h2><form id="emergency-form"><div class="field"><label>Patient</label><select name="patient" required>${patients.map(item=>`<option value="${esc(item._id)}">${esc(item.name)} · ${esc(item.phone||'')}</option>`).join('')}</select></div><div class="formgrid"><div class="field"><label>Arrival method</label><select name="arrivalMode"><option>Walk-in</option><option>Ambulance</option><option>Transfer</option></select></div><div class="field"><label>Initial priority</label><select name="priority"><option>Emergency</option><option selected>High</option><option>Medium</option></select></div><div class="field"><label>Attending doctor</label><select name="attendingDoctor"><option value="">Assign later</option>${doctors.map(item=>`<option value="${esc(item._id)}">${esc(item.name)} · ${esc(item.specialization)}</option>`).join('')}</select></div><div class="field"><label>Triage nurse</label><select name="assignedNurse"><option value="">Assign at triage</option>${nurses.map(item=>`<option value="${esc(item._id)}">${esc(item.displayName||item.username)}</option>`).join('')}</select></div><div class="field wide"><label>Presenting concern</label><textarea name="chiefConcern" rows="4" maxlength="1000" required></textarea></div></div><div class="actions"><button class="btn danger" type="submit">Add to emergency queue</button><button class="btn" type="button" id="emergency-cancel">Cancel</button></div></form>`;document.body.append(modal);modal.showModal();modal.querySelector('#emergency-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();modal.querySelector('#emergency-form').onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));if(!body.attendingDoctor)delete body.attendingDoctor;if(!body.assignedNurse)delete body.assignedNurse;try{await api('/emergency',{method:'POST',body:JSON.stringify(body)});modal.close();toast('Emergency arrival added to the live queue.');loadSection()}catch(error){toast(error.message,true)}}}catch(error){toast(error.message,true)}
}

function openEmergencyTriage(visit) {
  if(!visit)return;const modal=document.createElement('dialog');modal.className='card workflow-dialog';modal.innerHTML=`<span class="eyebrow">TRIAGE · ${esc(visit.priority)}</span><h2>${esc(visit.patient?.name||'Patient')}</h2><p class="muted">${esc(visit.chiefConcern)}</p><form id="triage-form"><div class="formgrid"><div class="field"><label>Blood pressure</label><input name="bloodPressure" maxlength="40" placeholder="120/80"></div><div class="field"><label>Pulse (bpm)</label><input name="pulse" type="number" min="0" max="300"></div><div class="field"><label>Temperature (°C)</label><input name="temperature" type="number" min="20" max="50" step="0.1"></div><div class="field"><label>Oxygen saturation (%)</label><input name="oxygenSaturation" type="number" min="0" max="100"></div><div class="field wide"><label>Triage note</label><textarea name="triageNote" rows="3" maxlength="2000" required></textarea></div></div><div class="actions"><button class="btn primary">Complete triage</button><button class="btn" type="button" id="triage-cancel">Cancel</button></div></form>`;document.body.append(modal);modal.showModal();modal.querySelector('#triage-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();modal.querySelector('#triage-form').onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));body.status='Triaged';for(const key of ['pulse','temperature','oxygenSaturation'])if(body[key])body[key]=Number(body[key]);else delete body[key];try{await api('/emergency/'+visit._id,{method:'PATCH',body:JSON.stringify(body)});modal.close();toast('Triage recorded and case placed in the clinician queue.');loadSection()}catch(error){toast(error.message,true)}};
}

async function advanceEmergency(visit) {
  if(!visit)return;
  if(visit.status==='Triaged'){try{await api('/emergency/'+visit._id,{method:'PATCH',body:JSON.stringify({status:'In care'})});toast('Emergency case moved into active care.');loadSection()}catch(error){toast(error.message,true)}return}
  const modal=document.createElement('dialog');modal.className='card workflow-dialog';modal.innerHTML=`<span class="eyebrow">EMERGENCY DISPOSITION</span><h2>Close this care step</h2><p class="muted">${esc(visit.patient?.name||'Patient')} · ${esc(visit.priority)} priority</p><form id="disposition-form"><div class="field"><label>Disposition</label><select name="status"><option>Admitted</option><option>Transferred</option><option>Discharged</option></select></div><div class="field"><label>Clinical handoff / discharge note</label><textarea name="dispositionNote" rows="4" maxlength="2000" minlength="10" required></textarea></div><div class="actions"><button class="btn primary">Save disposition</button><button class="btn" type="button" id="disposition-cancel">Cancel</button></div></form>`;document.body.append(modal);modal.showModal();modal.querySelector('#disposition-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();modal.querySelector('#disposition-form').onsubmit=async event=>{event.preventDefault();try{await api('/emergency/'+visit._id,{method:'PATCH',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});modal.close();toast('Emergency disposition recorded.');loadSection()}catch(error){toast(error.message,true)}};
}

function invoicePaidAmount(invoice) {
  const paid=Number(invoice?.paidAmount||0);
  return invoice?.status==='Paid'&&paid===0?invoiceTotalAmount(invoice):paid;
}
function invoiceTotalAmount(invoice) { return Number(invoice?.amount||0)+Number(invoice?.adjustedAmount||0); }
function portalStat(label, value, hint, index) { return `<article class="card stat" data-aos="fade-up" data-aos-delay="${index*75}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span class="muted" style="font-size:10px">${esc(hint)}</span></article>`; }
function printBillingReceipt(transaction, patientName) {
  if (!transaction) return;
  const receipt=window.open('','_blank','popup,width=560,height=720');
  if (!receipt) return toast('Allow the receipt window to open, then try again.',true);
  const money=value=>new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(Number(value||0));
  const signedAmount=transaction.type==='Refund'?-Number(transaction.amount):Number(transaction.amount);
  receipt.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>CarePoint receipt ${esc(transaction.receiptNumber||'')}</title><style>body{font:15px Arial,sans-serif;color:#18332e;padding:36px;max-width:520px;margin:auto}.brand{font-size:12px;letter-spacing:.16em;color:#22836d;font-weight:bold}h1{font-size:25px;margin:9px 0 4px}.muted{color:#74827c;font-size:12px}.box{border:1px solid #dfe9e4;border-radius:12px;padding:18px;margin-top:22px}.row{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid #edf1ee}.row:last-child{border:0}.amount{font-size:22px;font-weight:bold}@media print{body{padding:0}}</style></head><body><div class="brand">CAREPOINT · PATIENT ACCOUNTS</div><h1>${transaction.type==='Refund'?'Refund receipt':'Payment receipt'}</h1><div class="muted">${esc(transaction.receiptNumber||'Receipt')} · ${new Date(transaction.processedAt).toLocaleString()}</div><div class="box"><div class="row"><span>Patient</span><b>${esc(patientName||'Patient')}</b></div><div class="row"><span>Invoice</span><b>${esc(transaction.invoice?.invoiceNumber||transaction.invoice?.description||'Invoice')}</b></div><div class="row"><span>Transaction</span><b>${esc(transaction.type)}</b></div><div class="row"><span>Method</span><b>${esc(transaction.method)}</b></div>${transaction.reference?`<div class="row"><span>Reference</span><b>${esc(transaction.reference)}</b></div>`:''}${transaction.note?`<div class="row"><span>Note</span><b>${esc(transaction.note)}</b></div>`:''}<div class="row amount"><span>${transaction.type==='Refund'?'Refunded':'Received'}</span><b>${money(signedAmount)}</b></div></div><p class="muted">This receipt records a transaction posted to your CarePoint account statement.</p></body></html>`);
  receipt.document.close();receipt.focus();setTimeout(()=>receipt.print(),250);
}

async function renderPatientSection(target, page) {
  const data = await api('/portal');
  const patient = data.patient;
  const future = data.appointments.filter(item => ['Scheduled','Requested','Checked-in'].includes(item.status) && new Date(item.date) >= new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const next = future[0];
    const patientBalance = data.invoices.filter(item=>item.status!=='Voided').reduce((sum,item)=>sum+Math.max(0,invoiceTotalAmount(item)-invoicePaidAmount(item)),0);
  const portalMoney = value => new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(Number(value||0));
  const greeting = (me.displayName || patient.name || me.username).split(/\s+/)[0];
  const portalHero = `<section class="workspace-hero" data-aos="fade-up"><span class="eyebrow">YOUR PATIENT PORTAL</span><h2>${page === 'Dashboard' ? `Welcome back, ${esc(greeting)}.` : esc(page)}</h2><p>${page === 'Dashboard' ? 'Your care, visits and health information together in one secure place.' : 'A private view of your care, connected to your clinic.'}</p></section>`;
  if (page === 'Dashboard') {
    target.innerHTML = `${portalHero}<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:16px">${portalStat('Upcoming visits',future.length,'Scheduled or requested',0)}${portalStat('Prescriptions',data.prescriptions.length,'In your medication history',1)}${portalStat('Test results',data.labOrders.length,'Released to your portal',2)}${portalStat('Imaging results',data.imagingOrders.length,'Reviewed reports',3)}${portalStat('Open balance',portalMoney(patientBalance),'Remaining on invoices',4)}</div><div class="two"><section class="card" data-aos="fade-up"><div class="section-kicker" style="margin-top:0">Next appointment</div>${next?`<div class="portal-result"><div class="portal-result-icon">&#10010;</div><div><b>${esc(next.doctor?.name || 'Care team')}</b><p class="muted" style="margin:5px 0;font-size:12px">${new Date(next.date).toLocaleString(undefined,{weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'})}</p></div>${portalStatus(next.status)}</div>`:'<div class="empty">No appointment booked yet.</div>'}<div style="margin-top:18px">${sectionButton('Find care')}</div></section><section class="card" data-aos="fade-up" data-aos-delay="100"><div class="section-kicker" style="margin-top:0">Your latest results</div>${data.labOrders[0]?`<div class="portal-result"><div class="portal-result-icon">&#8981;</div><div><b>${esc(data.labOrders[0].testName)}</b><p class="muted" style="margin:5px 0;font-size:11px">Released ${new Date(data.labOrders[0].releasedAt || data.labOrders[0].updatedAt).toLocaleDateString()}</p></div>${sectionButton('Test results')}</div>`:data.imagingOrders[0]?`<div class="portal-result"><div class="portal-result-icon">&#8981;</div><div><b>${esc(data.imagingOrders[0].modality)} · ${esc(data.imagingOrders[0].bodySite)}</b><p class="muted" style="margin:5px 0;font-size:11px">Released ${new Date(data.imagingOrders[0].releasedAt).toLocaleDateString()}</p></div>${sectionButton('Imaging results')}</div>`:'<div class="empty">Released results will appear here.</div>'}</section></div>`;
  } else if (page === 'Find care') {
    target.innerHTML = `${portalHero}<div class="section-kicker">Choose your care team</div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${data.doctors.map((doctor,index)=>`<article class="card" data-aos="fade-up" data-aos-delay="${index*55}"><div class="portal-result"><div class="portal-result-icon">&#9638;</div><div><b>${esc(doctor.name)}</b><p class="muted" style="margin:3px 0 0;font-size:11px">${esc(doctor.specialization)}</p></div></div><button class="btn primary full transition-all duration-300 hover:-translate-y-0.5" data-book-doctor="${esc(doctor._id)}">Request appointment</button></article>`).join('')||'<div class="card empty">The clinic directory is being updated. Check back soon.</div>'}</div>`;
    target.querySelectorAll('[data-book-doctor]').forEach(button=>button.onclick=()=>bookPatientAppointment(button.dataset.bookDoctor));
  } else if (page === 'My appointments') {
    target.innerHTML = `${portalHero}<div style="display:grid;gap:12px;margin-top:16px">${data.appointments.map(item=>`<article class="card portal-result" data-aos="fade-up"><div class="portal-result-icon">&#9830;</div><div style="flex:1"><b>${esc(item.doctor?.name || 'Care team')}</b><p class="muted" style="margin:5px 0;font-size:11px">${new Date(item.date).toLocaleString()}${item.reason?' &#183; '+esc(item.reason):''}</p></div>${portalStatus(item.status)}${['Requested','Scheduled'].includes(item.status)?`<button class="btn" data-cancel-appointment="${esc(item._id)}">Cancel</button>`:''}</article>`).join('')||'<div class="card empty">No appointments yet. Find a doctor to request your first visit.</div>'}</div>`;
    target.querySelectorAll('[data-cancel-appointment]').forEach(button=>button.onclick=async()=>{try{await api('/portal/appointments/'+button.dataset.cancelAppointment,{method:'PATCH',body:JSON.stringify({status:'Cancelled'})});toast('Appointment cancelled.');renderPatientSection(target,page)}catch(error){toast(error.message,true)}});
  } else if (page === 'My health') {
    target.innerHTML = `${portalHero}<div class="section-kicker">Medication history</div><div style="display:grid;gap:12px">${data.prescriptions.map(item=>`<article class="card portal-result" data-aos="fade-up"><div class="portal-result-icon">&#9830;</div><div style="flex:1"><b>${esc(item.medicine)} &#183; ${esc(item.dosage)}</b><p class="muted" style="margin:5px 0;font-size:11px">${esc(item.doctor?.name || 'Care team')} &#183; ${new Date(item.createdAt).toLocaleDateString()}</p>${item.quantity ? `<small>This fill: ${esc(item.dispensedQuantity || 0)} of ${esc(item.quantity)} - lifetime dispensed ${esc(item.totalDispensedQuantity || 0)} - refills left ${Math.max(0, Number(item.refills || 0) - Number(item.refillsUsed || 0))} - ${esc(item.status || 'Active')}</small>` : '<small>Quantity needs review by your care team.</small>'}${item.instructions?`<p>${esc(item.instructions)}</p>`:''}</div></article>`).join('')||'<div class="card empty">Your medication history will appear here.</div>'}</div><div class="section-kicker">Medication administration record</div><div style="display:grid;gap:10px">${data.medicationAdministration.map(item=>`<article class="card portal-result" data-aos="fade-up"><div class="portal-result-icon">&#9830;</div><div style="flex:1"><b>${esc(item.prescription?.medicine || "Medication")} - ${esc(item.doseGiven)}</b><p class="muted" style="margin:5px 0;font-size:11px">${new Date(item.administeredAt).toLocaleString()} - ${esc(item.administeredBy?.displayName || "Nursing team")}</p>${item.notes?`<small>${esc(item.notes)}</small>`:""}</div>${portalStatus(item.status)}</article>`).join("")||'<div class="card empty">No inpatient doses have been recorded.</div>'}</div><div class="section-kicker">Signed visit notes</div><div style="display:grid;gap:12px">${data.encounters.map(item=>`<article class="card" data-aos="fade-up"><b>${esc(item.chiefConcern)}</b><p class="muted" style="margin:5px 0;font-size:11px">${esc(item.doctor?.name || 'Care team')} &#183; ${new Date(item.signedAt).toLocaleDateString()}</p>${item.diagnosis?`<p><b>Assessment:</b> ${esc(item.diagnosis)}</p>`:''}<p style="font-size:13px;line-height:1.7;white-space:pre-wrap">${esc(item.note)}</p></article>`).join('')||'<div class="card empty">Signed visit notes will appear here once released by your doctor.</div>'}</div>`;
  } else if (page === 'My admissions') {
    target.innerHTML = `${portalHero}<div class="section-kicker">Hospital stays and discharge plans</div><div style="display:grid;gap:12px">${data.admissions.map(item=>`<article class="card" data-aos="fade-up"><div class="portal-result"><div class="portal-result-icon">&#9638;</div><div style="flex:1"><b>${esc(item.status)} · ${esc(item.bed?.ward || 'Hospital stay')}</b><p class="muted" style="margin:4px 0;font-size:11px">${new Date(item.admittedAt).toLocaleDateString()}${item.dischargedAt?' to '+new Date(item.dischargedAt).toLocaleDateString():''} · Dr. ${esc(item.doctor?.name || '')}</p></div>${portalStatus(item.status)}</div>${item.status==='Discharged'&&item.dischargeSummary?`<p style="margin:14px 0 0;padding:12px;border-radius:10px;background:#f5faf7;color:#405850;font-size:13px;line-height:1.7">${esc(item.dischargeSummary)}</p>`:''}</article>`).join('')||'<div class="card empty">Your hospital admissions and discharge plans will appear here.</div>'}</div>`;
  } else if (page === 'Test results') {
    target.innerHTML = `${portalHero}<div class="section-kicker">Results released by your care team</div><div style="display:grid;gap:12px">${data.labOrders.map(item=>`<article class="card" data-aos="fade-up"><div class="portal-result"><div class="portal-result-icon">&#9830;</div><div style="flex:1"><b>${esc(item.testName)}</b><p class="muted" style="margin:4px 0;font-size:11px">${esc(item.doctor?.name || 'Care team')} &#183; ${new Date(item.releasedAt || item.updatedAt).toLocaleDateString()}</p></div>${portalStatus('Released')}</div>${item.result?`<p style="margin:14px 0 0;padding:12px;border-radius:10px;background:#f5faf7;color:#405850;font-size:13px;line-height:1.7">${esc(item.result)}</p>`:''}</article>`).join('')||'<div class="card empty">No results have been released to your portal yet.</div>'}</div>`;
  } else if (page === 'Imaging results') {
    target.innerHTML = `${portalHero}<div class="section-kicker">Imaging reports released by your doctor</div><div style="display:grid;gap:12px">${data.imagingOrders.map(item=>`<article class="card imaging-result" data-aos="fade-up"><div class="toolbar"><div><span class="eyebrow">${esc(item.modality)} STUDY</span><h3>${esc(item.bodySite)}</h3><p class="muted" style="margin:4px 0 0;font-size:11px">${esc(item.doctor?.name || 'Care team')} · ${new Date(item.releasedAt).toLocaleDateString()}</p></div>${portalStatus('Released')}</div><p class="imaging-indication"><b>Reason for study</b><br>${esc(item.clinicalIndication)}</p><div class="imaging-report">${esc(item.reportText)}</div>${item.reviewNote?`<p class="muted"><b>Doctor note:</b> ${esc(item.reviewNote)}</p>`:''}${item.followUpRequired?`<div class="imaging-followup"><b>Follow-up recommended</b><span>${esc(item.followUpNote || 'Contact your care team for next steps.')}</span></div>`:''}</article>`).join('')||'<div class="card empty">Your imaging reports will appear here after your doctor reviews and releases them.</div>'}</div>`;
  } else if (page === 'Billing') {
    const openInvoices=data.invoices.filter(item=>item.status!=='Voided');
    const balance=openInvoices.reduce((sum,item)=>sum+Math.max(0,invoiceTotalAmount(item)-invoicePaidAmount(item)),0);
    const billed=openInvoices.reduce((sum,item)=>sum+invoiceTotalAmount(item),0);
    const received=data.paymentTransactions.reduce((sum,item)=>sum+(item.type==='Refund'?-Number(item.amount||0):Number(item.amount||0)),0);
    const money=value=>new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(Number(value||0));
    target.innerHTML = `${portalHero}<div class="grid billing-metrics">${portalStat('Total billed',money(billed),'Across your statements',0)}${portalStat('Paid to date',money(received),'Payments less refunds',1)}${portalStat('Current balance',money(balance),'On invoices still open',2)}</div><section class="card billing-section" data-aos="fade-up"><div class="section-kicker" style="margin-top:0">Your invoices</div>${openInvoices.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Invoice</th><th>Description</th><th>Issued</th><th>Due</th><th>Total</th><th>Adjustment</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead><tbody>${openInvoices.map(item=>{const paid=invoicePaidAmount(item);return `<tr><td>${esc(item.invoiceNumber||'Invoice')}</td><td>${esc(item.description)}</td><td>${new Date(item.createdAt).toLocaleDateString()}</td><td>${item.dueAt?new Date(item.dueAt).toLocaleDateString():'—'}</td><td>${money(invoiceTotalAmount(item))}</td><td>${money(item.adjustedAmount||0)}</td><td>${money(paid)}</td><td>${money(Math.max(0,invoiceTotalAmount(item)-paid))}</td><td>${portalStatus(item.status)}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Your account has no active invoices.</div>'}</section><section class="card billing-section" data-aos="fade-up"><div class="toolbar"><div><div class="section-kicker" style="margin-top:0">Payment history and receipts</div><p class="muted" style="margin:4px 0 0;font-size:11px">Keep a copy of each payment or refund for your records.</p></div></div>${data.paymentTransactions.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Receipt</th><th>Date</th><th>Invoice</th><th>Type</th><th>Method</th><th>Amount</th><th></th></tr></thead><tbody>${data.paymentTransactions.map(item=>`<tr><td>${esc(item.receiptNumber||'Receipt')}</td><td>${new Date(item.processedAt).toLocaleString()}</td><td>${esc(item.invoice?.invoiceNumber||item.invoice?.description||'Invoice')}</td><td>${esc(item.type)}</td><td>${esc(item.method)}</td><td>${item.type==='Refund'?'−':'+'}${money(item.amount)}</td><td><button class="btn" data-receipt="${esc(item._id)}">View receipt</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Payment receipts will appear here after a transaction is recorded by the clinic.</div>'}</section>`;
    target.insertAdjacentHTML('beforeend',`<section class="card billing-section insurance-section" data-aos="fade-up"><div class="section-kicker" style="margin-top:0">Your insurance coverage</div>${data.insurancePolicies?.length?`<div class="coverage-cards">${data.insurancePolicies.map(policy=>`<article class="coverage-card"><div><span class="eyebrow">${policy.active?'ACTIVE PLAN':'PLAN HISTORY'}</span><h3>${esc(policy.payer)}</h3><p>${esc(policy.coveragePercent)}% plan coverage · Member ${esc(policy.memberId)}</p>${policy.groupId?`<small>Group ${esc(policy.groupId)}</small>`:''}</div>${portalStatus(policy.active?'Active':'Inactive')}</article>`).join('')}</div>`:'<p class="muted">Contact the billing team to add or update insurance coverage.</p>'}<div class="section-kicker">Claim status</div>${data.insuranceClaims?.length?`<div class="tablewrap"><table class="table insurance-claims"><thead><tr><th>Claim</th><th>Invoice</th><th>Payer</th><th>Requested</th><th>Approved</th><th>Paid</th><th>Status</th></tr></thead><tbody>${data.insuranceClaims.map(claim=>`<tr><td>${esc(claim.claimNumber)}${claim.payerReference?`<small style="display:block;color:#819089">Payer reference ${esc(claim.payerReference)}</small>`:''}</td><td>${esc(claim.invoice?.invoiceNumber||'Invoice')}</td><td>${esc(claim.policy?.payer||'Payer')}</td><td>${money(claim.requestedAmount)}</td><td>${money(claim.approvedAmount||0)}</td><td>${money(claim.paidAmount||0)}</td><td>${portalStatus(claim.status)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Submitted claims and payer decisions will show here.</p>'}</section>`);
    target.insertAdjacentHTML('beforeend',`<section class="card billing-section adjustment-section" data-aos="fade-up"><div class="section-kicker" style="margin-top:0">Account adjustments</div>${data.invoiceAdjustments?.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Adjustment</th><th>Date</th><th>Invoice</th><th>Reason</th><th>Amount</th></tr></thead><tbody>${data.invoiceAdjustments.map(item=>`<tr><td>${esc(item.adjustmentNumber)}</td><td>${new Date(item.processedAt).toLocaleDateString()}</td><td>${esc(item.invoice?.invoiceNumber||'Invoice')}</td><td>${esc(item.reason)}</td><td><b>${Number(item.amount)<0?'−':'+'}${money(Math.abs(Number(item.amount||0)))}</b></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Credits and charges will appear here if the clinic adjusts your account.</p>'}</section>`);
    target.querySelectorAll('[data-receipt]').forEach(button=>button.onclick=()=>printBillingReceipt(data.paymentTransactions.find(item=>item._id===button.dataset.receipt),patient.name));  } else if (page === 'Messages') {
    target.innerHTML = `${portalHero}<section class="card" style="margin-top:16px"><div class="section-kicker" style="margin-top:0">Secure messages with your clinic</div><div class="portal-message">${data.messages.map(item=>`<article class="${item.direction==='patient'?'mine':''}">${esc(item.body)}<small>${item.direction==='patient'?'You':'Care team'} &#183; ${new Date(item.createdAt).toLocaleString()}</small></article>`).join('')||'<p class="muted">Start a private conversation with the clinic team.</p>'}</div><form id="portal-message-form" class="field"><label for="portal-message-text">Your message</label><textarea id="portal-message-text" name="body" rows="3" maxlength="3000" required></textarea><button class="btn primary" type="submit">Send securely</button></form></section>`;
    target.querySelector('#portal-message-form').onsubmit=async event=>{event.preventDefault();try{await api('/portal/messages',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});renderPatientSection(target,page);toast('Message sent.')}catch(error){toast(error.message,true)}};
  } else if (page === 'My profile') {
    target.innerHTML = `${portalHero}<section class="card" style="max-width:700px;margin-top:16px"><div class="section-kicker" style="margin-top:0">Your contact details</div><form id="patient-profile"><div class="formgrid"><div class="field"><label>Full name</label><input value="${esc(patient.name)}" disabled></div><div class="field"><label>Phone</label><input name="phone" type="tel" value="${esc(patient.phone)}" required></div><div class="field"><label>Email</label><input name="email" type="email" value="${esc(patient.email||'')}"></div><div class="field"><label>Emergency contact</label><input name="emergencyContact" value="${esc(patient.emergencyContact||'')}"></div><div class="field wide"><label>Address</label><input name="address" value="${esc(patient.address||'')}"></div></div><button class="btn primary" type="submit">Save contact details</button></form></section>`;
    target.querySelector('#patient-profile').onsubmit=async event=>{event.preventDefault();try{await api('/portal/profile',{method:'PATCH',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});toast('Profile updated.')}catch(error){toast(error.message,true)}};
  }
  target.querySelectorAll('[data-section]').forEach(button=>button.onclick=()=>{section=button.dataset.section;render()});
  refreshMotion();
}

async function bookPatientAppointment(doctorId) {
  const modal=document.createElement('dialog');modal.className='card';
  const today=new Date(Date.now()+86400000).toISOString().slice(0,16);
  modal.innerHTML=`<h2>Request an appointment</h2><p class="muted">Choose a preferred time. The clinic will confirm your request.</p><form id="book-form"><div class="field"><label for="book-date">Preferred date and time</label><input id="book-date" name="date" type="datetime-local" min="${today}" required></div><div class="field"><label for="book-reason">What would you like help with?</label><textarea id="book-reason" name="reason" rows="3" maxlength="255" placeholder="A short reason for your visit"></textarea></div><div class="actions"><button class="btn primary" type="submit">Send request</button><button class="btn" id="book-cancel" type="button">Cancel</button></div></form>`;
  document.body.append(modal);modal.showModal();modal.querySelector('#book-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();
  modal.querySelector('#book-form').onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));body.doctor=doctorId;body.date=new Date(body.date).toISOString();try{await api('/portal/appointments',{method:'POST',body:JSON.stringify(body)});modal.close();toast('Appointment request sent to the clinic.');section='My appointments';render()}catch(error){toast(error.message,true)}};
}

function renderLabList(target, labs) {
  target.innerHTML=`<section class="card" data-aos="fade-up"><div class="toolbar"><div><strong>${me.role==='doctor'?'Ordered tests and results':'Laboratory worklist'}</strong><p class="muted" style="margin:5px 0 0;font-size:11px">Track every order from collection to release.</p></div>${['admin','doctor'].includes(me.role)?'<button id="add-lab" class="btn primary" type="button">+ Order a test</button>':''}</div>${labs.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Patient</th><th>Test</th><th>Ordered by</th><th>Result</th><th>Status</th></tr></thead><tbody>${labs.map(item=>`<tr><td>${esc(item.patient?.name)}</td><td>${esc(item.testName)}</td><td>${esc(item.doctor?.name)}</td><td>${esc(item.result||'--')}</td><td>${me.role==='admin'||isStaff('lab')?`<button class="btn" data-lab="${esc(item._id)}" data-next="${esc(item.status)}">${esc(item.status)} - update</button>`:portalStatus(item.status)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No laboratory orders yet.</div>'}</section>`;
  target.querySelector('#add-lab')?.addEventListener('click',()=>createLabDialog());
  target.querySelectorAll('[data-lab]').forEach(button=>button.onclick=()=>updateLab(button.dataset.lab,button.dataset.next));
  refreshMotion();
}

async function createLabDialog() {
  const [patients,doctors]=await Promise.all([api('/patients'),api('/doctors')]);
  const modal=document.createElement('dialog');modal.className='card';
  modal.innerHTML=`<h2>Order a laboratory test</h2><form id="lab-form"><div class="field"><label>Patient</label><select name="patient" required>${patients.map(item=>`<option value="${esc(item._id)}">${esc(item.name)}</option>`).join('')}</select></div><div class="field"><label>Ordering doctor</label><select name="doctor" required>${doctors.map(item=>`<option value="${esc(item._id)}">${esc(item.name)}</option>`).join('')}</select></div><div class="field"><label>Test name</label><input name="testName" required maxlength="160"></div><div class="field"><label>Specimen</label><input name="specimen" maxlength="120"></div><div class="actions"><button class="btn primary">Create order</button><button class="btn" type="button" id="lab-cancel">Cancel</button></div></form>`;
  document.body.append(modal);modal.showModal();modal.querySelector('#lab-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();
  modal.querySelector('#lab-form').onsubmit=async event=>{event.preventDefault();try{await api('/labs',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});modal.close();toast('Test order created.');loadSection()}catch(error){toast(error.message,true)}};
}
async function updateLab(id,status) {
  const next={Ordered:'Collected',Collected:'Processing',Processing:'Released',Released:'Released'}[status];
  const result=status==='Processing'?prompt('Enter the result to release to the patient:'):undefined;
  try{await api('/labs/'+id,{method:'PATCH',body:JSON.stringify({status:next,...(result?{result}:{})})});toast('Laboratory order updated.');loadSection()}catch(error){toast(error.message,true)}
}

function renderImaging(target, orders) {
  const canOrder = ['admin', 'doctor'].includes(me.role);
  const canOperate = me.role === 'admin' || isStaff('imaging');
  const steps = ['Ordered', 'Scheduled', 'Acquired', 'Reported', 'Reviewed', 'Released'];
  const orderCards = orders.map((order,index)=>{
    const step=steps.indexOf(order.status);
    const canAdvance=canOperate&&['Ordered','Scheduled','Acquired'].includes(order.status);
    const canReview=me.role==='doctor'&&order.status==='Reported';
    const canRelease=me.role==='doctor'&&order.status==='Reviewed';
    const search=[order.patient?.name,order.doctor?.name,order.modality,order.bodySite,order.clinicalIndication].join(' ').toLowerCase();
    return `<article class="card imaging-order" data-imaging-card data-search="${esc(search)}" data-imaging-status="${esc(order.status)}" data-imaging-priority="${esc(order.priority)}" data-aos="fade-up" data-aos-delay="${Math.min(index,5)*45}"><div class="toolbar"><div><span class="eyebrow">${esc(order.modality)} · ${esc(order.priority)} PRIORITY</span><h3>${esc(order.bodySite)} <small>for ${esc(order.patient?.name || 'Patient')}</small></h3><p class="muted" style="margin:4px 0 0;font-size:11px">Ordered by ${esc(order.doctor?.name || 'Care team')} · ${new Date(order.createdAt).toLocaleString()}</p></div>${portalStatus(order.status)}</div><div class="imaging-track-scroll"><div class="imaging-track" aria-label="Study progress">${steps.map((label,index)=>`<span class="${index<=step?'complete':''} ${index===step?'current':''}"><i>${index<step?'✓':index+1}</i><small>${label}</small></span>`).join('')}</div></div><div class="imaging-summary"><p><b>Clinical indication</b><span>${esc(order.clinicalIndication)}</span></p><p><b>Scheduled</b><span>${order.scheduledAt?new Date(order.scheduledAt).toLocaleString():'Not scheduled'}</span></p>${order.acquiredAt?`<p><b>Acquired</b><span>${new Date(order.acquiredAt).toLocaleString()}</span></p>`:''}${order.reportedAt?`<p><b>Reported</b><span>${new Date(order.reportedAt).toLocaleString()}</span></p>`:''}${order.reviewedAt?`<p><b>Reviewed</b><span>${new Date(order.reviewedAt).toLocaleString()}</span></p>`:''}${order.archiveReference?`<p><b>Image archive ref</b><span>${esc(order.archiveReference)}</span></p>`:''}</div>${order.reportText?`<details class="imaging-report-detail" ${['Reported','Reviewed'].includes(order.status)?'open':''}><summary>Radiology report</summary><div class="imaging-report">${esc(order.reportText)}</div>${order.reviewNote?`<p><b>Doctor review:</b> ${esc(order.reviewNote)}</p>`:''}${order.followUpRequired?`<div class="imaging-followup"><b>Follow-up required</b><span>${esc(order.followUpNote || 'Care team follow-up requested.')}</span></div>`:''}</details>`:''}<div class="actions">${canAdvance?`<button class="btn primary" data-imaging-action="${esc(order._id)}">${order.status==='Ordered'?'Schedule study':order.status==='Scheduled'?'Mark acquired':'Enter report'}</button>`:''}${canReview?`<button class="btn primary" data-imaging-review="${esc(order._id)}">Review report</button>`:''}${canRelease?`<button class="btn primary" data-imaging-release="${esc(order._id)}">Release to patient</button>`:''}</div></article>`;
  }).join('');
  target.innerHTML = `<section class="workspace-hero" data-aos="fade-up"><span class="eyebrow">RADIOLOGY & DIAGNOSTIC IMAGING</span><h2>Imaging, with a clear chain of care.</h2><p>Follow each study from a doctor's request through acquisition, reporting, physician review, and patient release.</p></section><section class="card imaging-worklist" data-aos="fade-up"><div class="toolbar"><div><strong>${isStaff('imaging') ? 'Radiology worklist' : me.role === 'doctor' ? 'My imaging orders and reviews' : 'Clinic imaging oversight'}</strong><p class="muted" style="margin:5px 0 0;font-size:11px">${orders.length} studies · Reports stay private until the referring doctor releases them.</p></div>${canOrder ? '<button id="add-imaging" class="btn primary" type="button">+ Request imaging</button>' : ''}</div>${orders.length ? `<div class="imaging-filters" role="search"><div class="field"><label for="imaging-search">Search studies</label><input id="imaging-search" type="search" placeholder="Patient, body site, indication"></div><div class="field"><label for="imaging-status-filter">Status</label><select id="imaging-status-filter"><option value="">All statuses</option>${steps.map(status=>`<option value="${status}">${status}</option>`).join('')}</select></div><div class="field"><label for="imaging-priority-filter">Priority</label><select id="imaging-priority-filter"><option value="">All priorities</option><option>STAT</option><option>Urgent</option><option>Routine</option></select></div><small id="imaging-filter-count" class="muted">Showing ${orders.length} studies</small></div><div class="imaging-list">${orderCards}<div id="imaging-filter-empty" class="empty" hidden>No studies match these filters.</div></div>`:'<div class="empty">No imaging studies in this worklist yet.</div>'}</section>`;
  target.querySelector('#add-imaging')?.addEventListener('click', createImagingDialog);
  target.querySelectorAll('[data-imaging-action]').forEach(button=>button.onclick=()=>advanceImaging(orders.find(item=>item._id===button.dataset.imagingAction)));
  target.querySelectorAll('[data-imaging-review]').forEach(button=>button.onclick=()=>reviewImaging(orders.find(item=>item._id===button.dataset.imagingReview)));
  target.querySelectorAll('[data-imaging-release]').forEach(button=>button.onclick=()=>releaseImaging(orders.find(item=>item._id===button.dataset.imagingRelease)));
  const applyImagingFilters=()=>{const query=(target.querySelector('#imaging-search')?.value||'').trim().toLowerCase();const status=target.querySelector('#imaging-status-filter')?.value||'';const priority=target.querySelector('#imaging-priority-filter')?.value||'';let visible=0;target.querySelectorAll('[data-imaging-card]').forEach(card=>{const matches=card.dataset.search.includes(query)&&(!status||card.dataset.imagingStatus===status)&&(!priority||card.dataset.imagingPriority===priority);card.hidden=!matches;if(matches)visible++});const count=target.querySelector('#imaging-filter-count');if(count)count.textContent=`Showing ${visible} of ${orders.length} studies`;const empty=target.querySelector('#imaging-filter-empty');if(empty)empty.hidden=visible!==0};
  target.querySelector('#imaging-search')?.addEventListener('input',applyImagingFilters);
  target.querySelector('#imaging-status-filter')?.addEventListener('change',applyImagingFilters);
  target.querySelector('#imaging-priority-filter')?.addEventListener('change',applyImagingFilters);
  refreshMotion();
}
async function createImagingDialog() {
  try {
    const [patients,doctors]=await Promise.all([api('/patients'),api('/doctors')]);
    const modal=document.createElement('dialog');modal.className='card imaging-dialog';
    modal.innerHTML=`<span class="eyebrow">DOCTOR'S ORDER</span><h2>Request an imaging study</h2><p class="muted">Include the body site and clinical reason so the imaging team can prepare the right study.</p><form id="imaging-order-form"><div class="formgrid"><div class="field"><label for="image-patient">Patient</label><select id="image-patient" name="patient" required>${patients.map(item=>`<option value="${esc(item._id)}">${esc(item.name)} · ${esc(item.phone)}</option>`).join('')}</select></div><div class="field"><label for="image-doctor">Referring doctor</label><select id="image-doctor" name="doctor" required>${doctors.map(item=>`<option value="${esc(item._id)}">${esc(item.name)} · ${esc(item.specialization)}</option>`).join('')}</select></div><div class="field"><label for="image-modality">Modality</label><select id="image-modality" name="modality" required><option>X-ray</option><option>CT</option><option>MRI</option><option>Ultrasound</option><option>Mammography</option><option>Fluoroscopy</option><option>Nuclear medicine</option><option>Other</option></select></div><div class="field"><label for="image-priority">Priority</label><select id="image-priority" name="priority"><option>Routine</option><option>Urgent</option><option>STAT</option></select></div><div class="field wide"><label for="image-site">Body site and laterality</label><input id="image-site" name="bodySite" maxlength="160" placeholder="Right knee" required></div><div class="field wide"><label for="image-indication">Clinical indication</label><textarea id="image-indication" name="clinicalIndication" rows="4" maxlength="1000" placeholder="Symptoms, question to answer, and relevant history" required></textarea></div></div><div class="actions"><button class="btn primary" type="submit" ${patients.length&&doctors.length?'':'disabled'}>Create imaging order</button><button class="btn" type="button" id="image-cancel">Cancel</button></div></form>`;
    document.body.append(modal);modal.showModal();modal.querySelector('#image-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();
    modal.querySelector('#imaging-order-form').onsubmit=async event=>{event.preventDefault();try{await api('/imaging',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});modal.close();toast('Imaging order added to the radiology worklist.');loadSection()}catch(error){toast(error.message,true)}};
  } catch(error){toast(error.message,true)}
}

async function advanceImaging(order) {
  if(!order)return;
  if(order.status==='Scheduled'){
    if(!confirm(`Mark the ${order.modality} study for ${order.patient?.name||'this patient'} as acquired?`))return;
    try{await api('/imaging/'+order._id,{method:'PATCH',body:JSON.stringify({status:'Acquired'})});toast('Study marked as acquired.');loadSection()}catch(error){toast(error.message,true)}
    return;
  }
  const modal=document.createElement('dialog');modal.className='card imaging-dialog';
  if(order.status==='Ordered'){
    const tomorrow=new Date(Date.now()+86400000);const defaultTime=new Date(tomorrow.getTime()-tomorrow.getTimezoneOffset()*60000).toISOString().slice(0,16);const now=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
    modal.innerHTML=`<h2>Schedule imaging</h2><p class="muted">${esc(order.modality)} · ${esc(order.bodySite)} · ${esc(order.patient?.name)}</p><form id="imaging-transition-form"><div class="field"><label for="image-scheduled-at">Appointment date and time</label><input id="image-scheduled-at" name="scheduledAt" type="datetime-local" min="${now}" value="${defaultTime}" required></div><div class="actions"><button class="btn primary">Save schedule</button><button class="btn" type="button" id="image-action-cancel">Cancel</button></div></form>`;
  }else{
    modal.innerHTML=`<h2>Enter radiology report</h2><p class="muted">${esc(order.modality)} · ${esc(order.bodySite)} · ${esc(order.patient?.name)}</p><form id="imaging-transition-form"><div class="field"><label for="image-report">Findings and impression</label><textarea id="image-report" name="reportText" rows="8" maxlength="12000" minlength="5" placeholder="Describe the findings and provide an impression." required></textarea></div><div class="field"><label for="archive-ref">Image archive reference</label><input id="archive-ref" name="archiveReference" maxlength="240" placeholder="Optional study accession or archive reference"></div><div class="actions"><button class="btn primary">Submit report for physician review</button><button class="btn" type="button" id="image-action-cancel">Cancel</button></div></form>`;
  }
  document.body.append(modal);modal.showModal();modal.querySelector('#image-action-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();
  modal.querySelector('#imaging-transition-form').onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));body.status=order.status==='Ordered'?'Scheduled':'Reported';if(body.scheduledAt)body.scheduledAt=new Date(body.scheduledAt).toISOString();try{await api('/imaging/'+order._id,{method:'PATCH',body:JSON.stringify(body)});modal.close();toast(body.status==='Scheduled'?'Imaging appointment scheduled.':'Report submitted for physician review.');loadSection()}catch(error){toast(error.message,true)}};
}

function reviewImaging(order) {
  if(!order)return;
  const modal=document.createElement('dialog');modal.className='card imaging-dialog';
  modal.innerHTML=`<span class="eyebrow">REFERRING DOCTOR REVIEW</span><h2>Review imaging report</h2><p class="muted">${esc(order.patient?.name)} · ${esc(order.modality)} ${esc(order.bodySite)}</p><div class="imaging-report">${esc(order.reportText)}</div><form id="imaging-review-form"><div class="field"><label for="image-review-note">Clinical interpretation or note</label><textarea id="image-review-note" name="reviewNote" rows="3" maxlength="2000" placeholder="Optional note for the patient's chart"></textarea></div><label class="check-field"><input id="image-follow-up-required" name="followUpRequired" type="checkbox" value="true"> Follow-up is required</label><div class="field" id="image-follow-up-field" hidden><label for="image-follow-up-note">Follow-up plan</label><textarea id="image-follow-up-note" name="followUpNote" rows="3" maxlength="1000"></textarea></div><div class="actions"><button class="btn primary">Save review</button><button class="btn" type="button" id="image-review-cancel">Cancel</button></div></form>`;
  document.body.append(modal);modal.showModal();const follow=modal.querySelector('#image-follow-up-required');const followField=modal.querySelector('#image-follow-up-field');const sync=()=>{followField.hidden=!follow.checked;modal.querySelector('#image-follow-up-note').required=follow.checked};follow.onchange=sync;sync();modal.querySelector('#image-review-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();
  modal.querySelector('#imaging-review-form').onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));body.status='Reviewed';body.followUpRequired=follow.checked;try{await api('/imaging/'+order._id,{method:'PATCH',body:JSON.stringify(body)});modal.close();toast('Report reviewed. You can release it to the patient when ready.');loadSection()}catch(error){toast(error.message,true)}};
}

async function releaseImaging(order) {
  if(!order||!confirm(`Release the reviewed ${order.modality} report to ${order.patient?.name||'the patient'}'s portal?`))return;
  try{await api('/imaging/'+order._id,{method:'PATCH',body:JSON.stringify({status:'Released'})});toast('Imaging report released to the patient portal.');loadSection()}catch(error){toast(error.message,true)}
}

async function renderClinicMessages(target) {
  const messages=await api('/messages');
  const byPatient=new Map();messages.forEach(item=>{const key=item.patient?._id;if(!key)return;if(!byPatient.has(key))byPatient.set(key,{patient:item.patient,messages:[]});byPatient.get(key).messages.push(item)});
  target.innerHTML=`<section class="workspace-hero" data-aos="fade-up"><span class="eyebrow">CARE TEAM COMMUNICATION</span><h2>Patient messages.</h2><p>Reply to secure messages from the patient portal.</p></section><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:18px">${[...byPatient.values()].map(({patient,messages:thread})=>`<article class="card" data-aos="fade-up"><b>${esc(patient.name)}</b><div class="portal-message">${thread.map(item=>`<article class="${item.direction==='clinic'?'mine':''}">${esc(item.body)}<small>${item.direction==='patient'?'Patient':'Clinic'} &#183; ${new Date(item.createdAt).toLocaleString()}</small></article>`).join('')}</div><form data-reply="${esc(patient._id)}" class="field"><textarea name="body" rows="2" maxlength="3000" placeholder="Write a reply" required></textarea><button class="btn primary">Reply</button></form></article>`).join('')||'<div class="card empty">No patient messages yet.</div>'}</div>`;
  target.querySelectorAll('[data-reply]').forEach(form=>form.onsubmit=async event=>{event.preventDefault();try{await api('/messages/'+form.dataset.reply,{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});toast('Reply sent.');loadSection()}catch(error){toast(error.message,true)}});
  refreshMotion();
}

async function renderBillingPage(target, data) {
  const canPay=me.role==='admin'||isStaff('billing','receptionist');
  const canRefund=me.role==='admin'||isStaff('billing');
  const canManageInsurance=me.role==='admin'||isStaff('billing');
  const canAdjust=me.role==='admin'||isStaff('billing');
  const canVoid=me.role==='admin';
  data.policies=data.policies||[]; data.claims=data.claims||[]; data.adjustments=data.adjustments||[];
  const money=value=>new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(Number(value||0));
  const activeInvoices=data.invoices.filter(item=>item.status!=='Voided');
  const billed=activeInvoices.reduce((sum,item)=>sum+invoiceTotalAmount(item),0);
  const outstanding=activeInvoices.reduce((sum,item)=>sum+Math.max(0,invoiceTotalAmount(item)-invoicePaidAmount(item)),0);
  const collected=data.transactions.reduce((sum,item)=>sum+(item.type==='Refund'?-Number(item.amount||0):Number(item.amount||0)),0);
  const paymentHistory=data.transactions.map(transaction=>{
    const invoice=data.invoices.find(item=>item._id===String(transaction.invoice?._id||transaction.invoice));
    const refundable=Math.max(0,Number(transaction.amount||0)-Number(transaction.refundedAmount||0));
     return `<tr><td>${esc(transaction.receiptNumber||'Receipt')}</td><td>${new Date(transaction.processedAt).toLocaleString()}</td><td>${esc(invoice?.invoiceNumber||transaction.invoice?.invoiceNumber||'Invoice')} · ${esc(transaction.patient?.name||'Patient')}</td><td>${esc(transaction.type)}</td><td>${esc(transaction.method)}</td><td>${transaction.type==='Refund'?'−':'+'}${money(transaction.amount)}</td><td class="actions"><button class="btn" data-print-receipt="${esc(transaction._id)}">Receipt</button>${canRefund&&transaction.type==='Payment'&&transaction.method!=='Insurance'&&refundable>0?`<button class="btn danger" data-refund="${esc(transaction._id)}">Refund</button>`:''}</td></tr>`;
  }).join('');
  const invoiceRows=data.invoices.map(invoice=>{
    const paid=invoicePaidAmount(invoice);
    const balance=invoice.status==='Voided'?0:Math.max(0,invoiceTotalAmount(invoice)-paid);
    const search=[invoice.invoiceNumber,invoice.patient?.name,invoice.description].join(' ').toLowerCase();
    const hasTransactions=data.transactions.some(item=>String(item.invoice?._id||item.invoice)===invoice._id);
    const policy=data.policies.find(item=>String(item.patient?._id||item.patient)===String(invoice.patient?._id||invoice.patient)&&item.active&&new Date(item.effectiveFrom)<=new Date()&&(!item.expiresAt||new Date(item.expiresAt)>=new Date()));
    const hasClaim=data.claims.some(item=>String(item.invoice?._id||item.invoice)===invoice._id&&item.status!=='Denied');
    return `<tr data-invoice-row data-search="${esc(search)}" data-invoice-status="${esc(invoice.status)}"><td><b>${esc(invoice.invoiceNumber||'Invoice')}</b></td><td>${esc(invoice.patient?.name||'Patient')}</td><td>${esc(invoice.description)}</td><td>${new Date(invoice.createdAt).toLocaleDateString()}${invoice.dueAt?`<small style="display:block;color:#819089">Due ${new Date(invoice.dueAt).toLocaleDateString()}</small>`:''}</td><td>${money(invoiceTotalAmount(invoice))}</td><td>${money(invoice.adjustedAmount||0)}</td><td>${money(paid)}</td><td><b>${money(balance)}</b></td><td>${portalStatus(invoice.status)}</td><td class="actions">${canPay&&balance>0?`<button class="btn primary" data-pay-invoice="${esc(invoice._id)}">Record payment</button>`:''}${canAdjust&&invoice.status!=='Voided'?`<button class="btn" data-adjust-invoice="${esc(invoice._id)}">Adjust</button>`:''}${canManageInsurance&&policy&&balance>0&&!hasClaim?`<button class="btn" data-submit-claim="${esc(invoice._id)}" data-policy="${esc(policy._id)}">Submit insurance claim</button>`:''}${canVoid&&invoice.status==='Pending'&&paid===0&&!hasTransactions?`<button class="btn danger" data-void-invoice="${esc(invoice._id)}">Void</button>`:''}</td></tr>`;
  }).join('');
  const insuranceSection=canManageInsurance?`<section class="card billing-section insurance-section" data-aos="fade-up"><div class="toolbar"><div><strong>Insurance coverage and claims</strong><p class="muted" style="margin:5px 0 0;font-size:11px">Manage active patient plans, submit invoice claims, record payer decisions, and post remittances to account balances.</p></div><button id="add-policy" class="btn primary" type="button">+ Add patient coverage</button></div><div class="section-kicker">Patient coverage</div>${data.policies.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Patient</th><th>Payer</th><th>Member / group</th><th>Coverage</th><th>Effective</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.policies.map(policy=>`<tr><td>${esc(policy.patient?.name||'Patient')}</td><td><b>${esc(policy.payer)}</b></td><td>${esc(policy.memberId)}${policy.groupId?`<small style="display:block;color:#819089">Group ${esc(policy.groupId)}</small>`:''}</td><td>${esc(policy.coveragePercent)}%</td><td>${new Date(policy.effectiveFrom).toLocaleDateString()}${policy.expiresAt?`<small style="display:block;color:#819089">through ${new Date(policy.expiresAt).toLocaleDateString()}</small>`:''}</td><td>${portalStatus(policy.active?'Active':'Inactive')}</td><td><button class="btn" data-toggle-policy="${esc(policy._id)}" data-active="${policy.active?'true':'false'}">${policy.active?'Deactivate':'Activate'}</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No insurance coverage has been recorded. Add a plan to enable claim submission for that patient.</div>'}<div class="section-kicker">Claims and payer decisions</div>${data.claims.length?`<div class="tablewrap"><table class="table insurance-claims"><thead><tr><th>Claim</th><th>Invoice / patient</th><th>Payer</th><th>Requested</th><th>Approved</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.claims.map(claim=>`<tr><td><b>${esc(claim.claimNumber)}</b><small style="display:block;color:#819089">${new Date(claim.submittedAt).toLocaleDateString()}${claim.payerReference?` · Ref ${esc(claim.payerReference)}`:''}</small>${claim.decisionNote?`<small style="display:block;color:#819089">${esc(claim.decisionNote)}</small>`:''}</td><td>${esc(claim.invoice?.invoiceNumber||'Invoice')}<small style="display:block;color:#819089">${esc(claim.patient?.name||'Patient')}</small></td><td>${esc(claim.policy?.payer||'Payer')}</td><td>${money(claim.requestedAmount)}</td><td>${money(claim.approvedAmount||0)}</td><td>${money(claim.paidAmount||0)}</td><td>${portalStatus(claim.status)}</td><td class="actions">${claim.status==='Submitted'?`<button class="btn primary" data-adjudicate-claim="${esc(claim._id)}">Record decision</button>`:''}${['Approved','Partially approved'].includes(claim.status)?`<button class="btn" data-pay-claim="${esc(claim._id)}">Post remittance</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Submitted claims and their payer decisions will appear here.</div>'}</section>`:'';
  const adjustmentSection=canAdjust?`<section class="card billing-section adjustment-section" data-aos="fade-up"><div class="toolbar"><div><strong>Invoice adjustments</strong><p class="muted" style="margin:5px 0 0;font-size:11px">Signed charges and credits with a reason and staff audit trail. The original invoice amount stays on record.</p></div><span class="pill">${data.adjustments.length} entries</span></div>${data.adjustments.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Adjustment</th><th>Processed</th><th>Invoice / patient</th><th>Reason</th><th>Amount</th><th>Recorded by</th></tr></thead><tbody>${data.adjustments.map(item=>`<tr><td>${esc(item.adjustmentNumber)}</td><td>${new Date(item.processedAt).toLocaleString()}</td><td>${esc(item.invoice?.invoiceNumber||'Invoice')}<small style="display:block;color:#819089">${esc(item.patient?.name||'Patient')}</small></td><td>${esc(item.reason)}</td><td><b>${Number(item.amount)<0?'−':'+'}${money(Math.abs(Number(item.amount||0)))}</b></td><td>${esc(item.actor?.displayName||item.actor?.username||'Former user')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Invoice credits and added charges will appear here with their reasons.</div>'}</section>`:'';
  target.innerHTML=`<section class="workspace-hero" data-aos="fade-up"><span class="eyebrow">PATIENT ACCOUNTS</span><h2>Billing, with a clear balance.</h2><p>Issue itemized invoices, record partial or full payments, apply signed adjustments, and preserve refunds and receipts in a traceable account ledger.</p></section><div class="grid billing-metrics">${metricCard('Open balance',money(outstanding),'Remaining across active invoices',0)}${metricCard('Collected',money(collected),'Payments less refunds',1)}${metricCard('Billed',money(billed),'Active invoice totals',2)}${metricCard('Open invoices',activeInvoices.filter(item=>['Pending','Partially paid'].includes(item.status)).length,'Need payment follow-up',3)}</div><section class="card billing-section" data-aos="fade-up"><div class="toolbar"><div><strong>Invoice register</strong><p class="muted" style="margin:5px 0 0;font-size:11px">${data.invoices.length} invoices · payments and adjustments update the remaining balance.</p></div>${canCreate('invoices')?'<button id="add-invoice" class="btn primary" type="button">+ Create invoice</button>':''}</div><div class="billing-filters"><div class="field"><label for="invoice-search">Search accounts</label><input id="invoice-search" type="search" placeholder="Patient, invoice number, service"></div><div class="field"><label for="invoice-status">Status</label><select id="invoice-status"><option value="">All statuses</option><option>Pending</option><option>Partially paid</option><option>Paid</option><option>Voided</option></select></div><small id="invoice-count" class="muted">Showing ${data.invoices.length} invoices</small></div>${data.invoices.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Invoice</th><th>Patient</th><th>Description</th><th>Dates</th><th>Current total</th><th>Adjustment</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>${invoiceRows}</tbody></table></div>`:'<div class="empty">No invoices yet. Create an invoice to start a patient account.</div>'}</section><section class="card billing-section" data-aos="fade-up"><div class="toolbar"><div><strong>Payments and refunds</strong><p class="muted" style="margin:5px 0 0;font-size:11px">Append-only receipts with the person, time, payment method and invoice recorded.</p></div><span class="pill">${data.transactions.length} ledger entries</span></div>${data.transactions.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Receipt</th><th>Processed</th><th>Invoice / patient</th><th>Type</th><th>Method</th><th>Amount</th><th>Recorded by</th><th>Actions</th></tr></thead><tbody>${data.transactions.map(transaction=>`<tr><td>${esc(transaction.receiptNumber||'Receipt')}${transaction.reverses?.receiptNumber?`<small style="display:block;color:#819089">Reverses ${esc(transaction.reverses.receiptNumber)}</small>`:''}</td><td>${new Date(transaction.processedAt).toLocaleString()}</td><td>${esc(transaction.invoice?.invoiceNumber||'Invoice')}<small style="display:block;color:#819089">${esc(transaction.patient?.name||'Patient')}</small></td><td>${esc(transaction.type)}</td><td>${esc(transaction.method)}</td><td>${transaction.type==='Refund'?'−':'+'}${money(transaction.amount)}</td><td>${esc(transaction.actor?.displayName||transaction.actor?.username||'Former user')}</td><td class="actions"><button class="btn" data-print-receipt="${esc(transaction._id)}">Receipt</button>${canRefund&&transaction.type==='Payment'&&transaction.method!=='Insurance'&&Number(transaction.amount)>Number(transaction.refundedAmount||0)?`<button class="btn danger" data-refund="${esc(transaction._id)}">Refund</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Payment collections and refunds will appear here with their receipt numbers.</div>'}</section>`;
  if(insuranceSection)target.insertAdjacentHTML('beforeend',insuranceSection);
  if(adjustmentSection)target.insertAdjacentHTML('beforeend',adjustmentSection);
  target.querySelector('#add-invoice')?.addEventListener('click',()=>form('invoices'));
  target.querySelector('#add-policy')?.addEventListener('click',()=>openPolicyDialog());
  target.querySelectorAll('[data-pay-invoice]').forEach(button=>button.onclick=()=>openPaymentDialog(data.invoices.find(item=>item._id===button.dataset.payInvoice)));
  target.querySelectorAll('[data-adjust-invoice]').forEach(button=>button.onclick=()=>openAdjustmentDialog(data.invoices.find(item=>item._id===button.dataset.adjustInvoice)));
  target.querySelectorAll('[data-submit-claim]').forEach(button=>button.onclick=async()=>{try{await api('/invoices/'+button.dataset.submitClaim+'/claims',{method:'POST',body:JSON.stringify({policy:button.dataset.policy})});toast('Insurance claim submitted to the payer queue.');loadSection()}catch(error){toast(error.message,true)}});
  target.querySelectorAll('[data-toggle-policy]').forEach(button=>button.onclick=async()=>{try{await api('/insurance/policies/'+button.dataset.togglePolicy,{method:'PATCH',body:JSON.stringify({active:button.dataset.active!=='true'})});toast('Coverage status updated.');loadSection()}catch(error){toast(error.message,true)}});
  target.querySelectorAll('[data-adjudicate-claim]').forEach(button=>button.onclick=()=>openClaimDecisionDialog(data.claims.find(item=>item._id===button.dataset.adjudicateClaim)));
  target.querySelectorAll('[data-pay-claim]').forEach(button=>button.onclick=()=>openClaimPaymentDialog(data.claims.find(item=>item._id===button.dataset.payClaim)));
  target.querySelectorAll('[data-refund]').forEach(button=>button.onclick=()=>openRefundDialog(data.transactions.find(item=>item._id===button.dataset.refund)));
  target.querySelectorAll('[data-print-receipt]').forEach(button=>button.onclick=()=>{const transaction=data.transactions.find(item=>item._id===button.dataset.printReceipt);printBillingReceipt(transaction,transaction?.patient?.name)});
  target.querySelectorAll('[data-void-invoice]').forEach(button=>button.onclick=()=>voidInvoice(data.invoices.find(item=>item._id===button.dataset.voidInvoice)));
  const filterInvoices=()=>{const query=(target.querySelector('#invoice-search')?.value||'').trim().toLowerCase();const status=target.querySelector('#invoice-status')?.value||'';let visible=0;target.querySelectorAll('[data-invoice-row]').forEach(row=>{const matches=row.dataset.search.includes(query)&&(!status||row.dataset.invoiceStatus===status);row.hidden=!matches;if(matches)visible++});const count=target.querySelector('#invoice-count');if(count)count.textContent=`Showing ${visible} of ${data.invoices.length} invoices`};
  target.querySelector('#invoice-search')?.addEventListener('input',filterInvoices);
  target.querySelector('#invoice-status')?.addEventListener('change',filterInvoices);
  refreshMotion();
}

async function openPaymentDialog(invoice) {
  if(!invoice)return;
  const balance=Math.max(0,invoiceTotalAmount(invoice)-invoicePaidAmount(invoice));
  const modal=document.createElement('dialog');modal.className='card billing-dialog';
  modal.innerHTML=`<span class="eyebrow">ACCOUNT COLLECTION</span><h2>Record a payment</h2><p class="muted">${esc(invoice.invoiceNumber||'Invoice')} · ${esc(invoice.patient?.name||'Patient')} · Remaining ${new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(balance)}</p><form id="payment-form"><div class="field"><label for="payment-amount">Amount received</label><input id="payment-amount" name="amount" type="number" min="0.01" max="${balance.toFixed(2)}" step="0.01" value="${balance.toFixed(2)}" required></div><div class="field"><label for="payment-method">Payment method</label><select id="payment-method" name="method" required><option>Cash</option><option>Card</option><option>Bank transfer</option><option>Other</option></select></div><div class="field"><label for="payment-reference">Reference</label><input id="payment-reference" name="reference" maxlength="160" placeholder="Card last four, transfer ID, or receipt ref"></div><div class="field"><label for="payment-note">Account note</label><textarea id="payment-note" name="note" rows="2" maxlength="500" placeholder="Optional payment note"></textarea></div><div class="actions"><button class="btn primary" type="submit">Post payment</button><button class="btn" type="button" id="payment-cancel">Cancel</button></div></form>`;
  document.body.append(modal);modal.showModal();modal.querySelector('#payment-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();
  modal.querySelector('#payment-form').onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));body.amount=Number(body.amount);try{await api('/invoices/'+invoice._id+'/payments',{method:'POST',body:JSON.stringify(body)});modal.close();toast('Payment posted and a receipt was added to the ledger.');loadSection()}catch(error){toast(error.message,true)}};
}

function openRefundDialog(transaction) {
  if(!transaction)return;
  const refundable=Math.max(0,Number(transaction.amount||0)-Number(transaction.refundedAmount||0));
  const modal=document.createElement('dialog');modal.className='card billing-dialog';
  modal.innerHTML=`<span class="eyebrow">REVERSE A PAYMENT</span><h2>Record a refund</h2><p class="muted">Receipt ${esc(transaction.receiptNumber||'')} · ${esc(transaction.invoice?.invoiceNumber||'Invoice')} · Refundable ${new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(refundable)}</p><form id="refund-form"><div class="field"><label for="refund-amount">Refund amount</label><input id="refund-amount" name="amount" type="number" min="0.01" max="${refundable.toFixed(2)}" step="0.01" value="${refundable.toFixed(2)}" required></div><div class="field"><label for="refund-note">Reason</label><textarea id="refund-note" name="note" rows="3" minlength="3" maxlength="500" required></textarea></div><div class="actions"><button class="btn danger" type="submit">Post refund</button><button class="btn" type="button" id="refund-cancel">Cancel</button></div></form>`;
  document.body.append(modal);modal.showModal();modal.querySelector('#refund-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();
  modal.querySelector('#refund-form').onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));body.amount=Number(body.amount);body.originalPayment=transaction._id;try{await api('/invoices/'+transaction.invoice._id+'/refunds',{method:'POST',body:JSON.stringify(body)});modal.close();toast('Refund posted and the invoice balance was recalculated.');loadSection()}catch(error){toast(error.message,true)}};
}

async function voidInvoice(invoice) {
  if(!invoice||!confirm(`Void unpaid invoice ${invoice.invoiceNumber||''} for ${invoice.patient?.name||'this patient'}? It will remain in account history.`))return;
  const voidReason=prompt('Enter the reason for voiding this invoice:');
  if(voidReason===null||voidReason.trim().length<3)return;
  try{await api('/invoices/'+invoice._id,{method:'PATCH',body:JSON.stringify({status:'Voided',voidReason})});toast('Invoice voided and retained in the account history.');loadSection()}catch(error){toast(error.message,true)}
}

async function openPolicyDialog() {
  let patients=[];
  try{patients=await api('/patients')}catch(error){return toast(error.message,true)}
  if(!patients.length)return toast('Add a patient record before entering coverage.',true);
  const modal=document.createElement('dialog');modal.className='card billing-dialog';
  modal.innerHTML=`<span class="eyebrow">PATIENT COVERAGE</span><h2>Add insurance plan</h2><p class="muted">This becomes the patient’s active plan. A prior active plan will be retained as inactive history.</p><form id="policy-form"><div class="field"><label for="policy-patient">Patient</label><select id="policy-patient" name="patient" required>${patients.map(patient=>`<option value="${esc(patient._id)}">${esc(patient.name)} · ${esc(patient.phone||'No phone')}</option>`).join('')}</select></div><div class="formgrid"><div class="field"><label for="policy-payer">Insurance payer</label><input id="policy-payer" name="payer" maxlength="160" required></div><div class="field"><label for="policy-member">Member ID</label><input id="policy-member" name="memberId" maxlength="120" required></div><div class="field"><label for="policy-group">Group ID</label><input id="policy-group" name="groupId" maxlength="120"></div><div class="field"><label for="policy-coverage">Coverage percentage</label><input id="policy-coverage" name="coveragePercent" type="number" min="0.01" max="100" step="0.01" value="80" required></div><div class="field"><label for="policy-effective">Effective from</label><input id="policy-effective" name="effectiveFrom" type="date" value="${new Date().toISOString().slice(0,10)}" required></div><div class="field"><label for="policy-expiry">Expires on</label><input id="policy-expiry" name="expiresAt" type="date"></div></div><div class="field"><label for="policy-note">Coverage note</label><textarea id="policy-note" name="note" rows="2" maxlength="500" placeholder="Optional coordination notes"></textarea></div><div class="actions"><button class="btn primary" type="submit">Save coverage</button><button class="btn" type="button" id="policy-cancel">Cancel</button></div></form>`;
  document.body.append(modal);modal.showModal();modal.querySelector('#policy-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();
  modal.querySelector('#policy-form').onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));body.coveragePercent=Number(body.coveragePercent);if(body.expiresAt)body.expiresAt=new Date(body.expiresAt+'T23:59:59').toISOString();body.effectiveFrom=new Date(body.effectiveFrom+'T00:00:00').toISOString();try{await api('/insurance/policies',{method:'POST',body:JSON.stringify(body)});modal.close();toast('Insurance coverage saved.');loadSection()}catch(error){toast(error.message,true)}};
}

function openClaimDecisionDialog(claim) {
  if(!claim)return;
  const modal=document.createElement('dialog');modal.className='card billing-dialog';
  modal.innerHTML=`<span class="eyebrow">PAYER ADJUDICATION</span><h2>Record claim decision</h2><p class="muted">${esc(claim.claimNumber)} · Requested ${new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(Number(claim.requestedAmount||0))}</p><form id="claim-decision-form"><div class="field"><label for="claim-decision">Decision</label><select id="claim-decision" name="status"><option>Approved</option><option>Partially approved</option><option>Denied</option></select></div><div class="field"><label for="claim-approved">Approved amount</label><input id="claim-approved" name="approvedAmount" type="number" min="0.01" max="${Number(claim.requestedAmount).toFixed(2)}" step="0.01" value="${Number(claim.requestedAmount).toFixed(2)}"></div><div class="field"><label for="claim-payer-ref">Payer reference / EOB number</label><input id="claim-payer-ref" name="payerReference" maxlength="160"></div><div class="field"><label for="claim-decision-note">Decision note or denial reason</label><textarea id="claim-decision-note" name="decisionNote" rows="3" maxlength="1000"></textarea></div><div class="actions"><button class="btn primary" type="submit">Save decision</button><button class="btn" type="button" id="claim-decision-cancel">Cancel</button></div></form>`;
  document.body.append(modal);modal.showModal();modal.querySelector('#claim-decision-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();
  const decision=modal.querySelector('#claim-decision'),amount=modal.querySelector('#claim-approved'),note=modal.querySelector('#claim-decision-note');
  decision.onchange=()=>{amount.disabled=decision.value==='Denied';note.required=decision.value==='Denied'};
  modal.querySelector('#claim-decision-form').onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));body.approvedAmount=Number(body.approvedAmount||0);try{await api('/insurance/claims/'+claim._id,{method:'PATCH',body:JSON.stringify(body)});modal.close();toast('Payer decision recorded.');loadSection()}catch(error){toast(error.message,true)}};
}

function openClaimPaymentDialog(claim) {
  if(!claim)return;
  const invoice=claim.invoice||{};
  const allowed=Math.max(0,Math.min(Number(claim.approvedAmount||0)-Number(claim.paidAmount||0),invoiceTotalAmount(invoice)-invoicePaidAmount(invoice)));
  if(allowed<=0)return toast('There is no remaining approved amount that can be applied to this invoice.',true);
  const modal=document.createElement('dialog');modal.className='card billing-dialog';
  modal.innerHTML=`<span class="eyebrow">INSURANCE REMITTANCE</span><h2>Post payer payment</h2><p class="muted">${esc(claim.claimNumber)} · Approved balance ${new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(allowed)}</p><form id="claim-payment-form"><div class="field"><label for="remit-amount">Amount received</label><input id="remit-amount" name="amount" type="number" min="0.01" max="${allowed.toFixed(2)}" step="0.01" value="${allowed.toFixed(2)}" required></div><div class="field"><label for="remit-reference">Payer remittance / EOB reference</label><input id="remit-reference" name="reference" maxlength="160"></div><div class="field"><label for="remit-note">Posting note</label><textarea id="remit-note" name="note" maxlength="350" rows="2"></textarea></div><div class="actions"><button class="btn primary" type="submit">Post remittance</button><button class="btn" type="button" id="claim-payment-cancel">Cancel</button></div></form>`;
  document.body.append(modal);modal.showModal();modal.querySelector('#claim-payment-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();
  modal.querySelector('#claim-payment-form').onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));body.amount=Number(body.amount);try{await api('/insurance/claims/'+claim._id+'/payments',{method:'POST',body:JSON.stringify(body)});modal.close();toast('Insurance remittance posted to the invoice and payment ledger.');loadSection()}catch(error){toast(error.message,true)}};
}

function openAdjustmentDialog(invoice) {
  if(!invoice)return;
  const total=invoiceTotalAmount(invoice),paid=invoicePaidAmount(invoice),balance=Math.max(0,total-paid);
  const modal=document.createElement('dialog');modal.className='card billing-dialog';
  modal.innerHTML=`<span class="eyebrow">ACCOUNT ADJUSTMENT</span><h2>Adjust invoice balance</h2><p class="muted">${esc(invoice.invoiceNumber||'Invoice')} · Current total ${new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(total)} · Paid ${new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(paid)}</p><form id="adjustment-form"><div class="field"><label for="adjustment-amount">Signed adjustment amount</label><input id="adjustment-amount" name="amount" type="number" min="-100000000" max="100000000" step="0.01" placeholder="Positive adds a charge; negative adds a credit" required><small>Credits cannot reduce the balance below payments already posted (${new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(balance)} remaining).</small></div><div class="field"><label for="adjustment-reason">Reason</label><textarea id="adjustment-reason" name="reason" rows="3" minlength="3" maxlength="500" placeholder="Explain the billing correction or credit" required></textarea></div><div class="actions"><button class="btn primary" type="submit">Post adjustment</button><button class="btn" type="button" id="adjustment-cancel">Cancel</button></div></form>`;
  document.body.append(modal);modal.showModal();modal.querySelector('#adjustment-cancel').onclick=()=>modal.close();modal.onclose=()=>modal.remove();
  modal.querySelector('#adjustment-form').onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(event.currentTarget));body.amount=Number(body.amount);try{await api('/invoices/'+invoice._id+'/adjustments',{method:'POST',body:JSON.stringify(body)});modal.close();toast('Adjustment posted; the original invoice and audit history are retained.');loadSection()}catch(error){toast(error.message,true)}};
}

function table(headings, rows) {
  return `<div class="tablewrap"><table class="table"><thead><tr>${headings.map(item => `<th>${esc(item)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(item => `<td>${esc(item)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

async function renderAuditLog(target) {
  const rows = await api('/audit');
  target.innerHTML = `<section class="card" data-aos="fade-up"><div class="toolbar"><div><strong>Access and change history</strong><p class="muted" style="margin:5px 0 0;font-size:11px">Sensitive record access and successful changes · Latest 250 events</p></div><span class="pill">Admin only</span></div>${rows.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Record group</th><th>Response</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${new Date(row.createdAt).toLocaleString()}</td><td>${esc(row.actor?.displayName || row.actor?.username || 'Former user')}</td><td>${esc(row.actor?.role || '—')}</td><td>${esc(row.method)}</td><td>${esc(row.resource)}${row.target?` / ${esc(row.target)}`:''}</td><td>${row.outcome<400?'<span class="portal-status good">Success</span>':`<span class="portal-status alert">${row.outcome}</span>`}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Audit events will appear as clinic records are used.</div>'}</section>`;
  refreshMotion();
}

function renderReports(target) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  target.innerHTML = `<section class="workspace-hero" data-aos="fade-up"><span class="eyebrow">CLINIC INTELLIGENCE</span><h2>See the shape of care.</h2><p>Operational and financial activity with a clear date range and exportable summary.</p></section><section class="card report-filter" data-aos="fade-up"><form id="report-range"><div class="field"><label for="report-from">From</label><input id="report-from" name="from" type="date" value="${monthAgo}" required></div><div class="field"><label for="report-to">Through</label><input id="report-to" name="to" type="date" value="${today}" required></div><button class="btn primary" type="submit">Update report</button></form></section><div id="report-results" class="report-results"><div class="card empty">Loading clinic activity...</div></div>`;
  const form = target.querySelector('#report-range');
  const output = target.querySelector('#report-results');
  const load = async (from, to) => {
    output.innerHTML = '<div class="card empty">Loading clinic activity...</div>';
    try {
      const data = await api(`/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const summary = data.summary;
      const money = value => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value || 0));
      const cards = [
        ['New patients', summary.registeredPatients, 'Profiles created in range'],
        ['Appointments', summary.appointments, 'Not cancelled, by appointment date'],
        ['Completed', summary.completedAppointments, 'Visits marked completed'],
        ['No-shows', summary.noShows, 'Visits marked no-show'],
        ['Billed', money(summary.billed), 'Invoices created in range'],
        ['Collected', money(summary.collected), `${summary.payments} payments recorded`],
        ['Outstanding', money(summary.outstanding), `${summary.openInvoices} currently open invoices`],
        ['Admissions', summary.admissions, 'Hospital stays started in range']
      ];
      const dayCounts = new Map(data.dailyAppointments.map(row => [row._id, row.count]));
      const days = [];
      for (let time = Date.parse(`${data.from}T00:00:00Z`), end = Date.parse(`${data.to}T00:00:00Z`); time <= end; time += 86400000) {
        const key = new Date(time).toISOString().slice(0, 10);
        days.push({ key, count: dayCounts.get(key) || 0 });
      }
      const peak = Math.max(1, ...days.map(day => day.count));
      const bars = days.map((day,index) => `<div class="report-day" title="${day.key}: ${day.count} appointments"><span class="report-bar" style="height:${Math.max(day.count ? 6 : 2, day.count / peak * 100)}%"></span><small>${day.key.slice(5)}</small></div>`).join('');
      output.innerHTML = `<div class="report-heading"><div><span class="eyebrow">${esc(data.from)} TO ${esc(data.to)}</span><h2>Clinic activity</h2></div><button class="btn" id="export-report" type="button">Download CSV</button></div><div class="grid report-metrics">${cards.map((item,index)=>metricCard(...item,index)).join('')}</div><section class="card report-chart" data-aos="fade-up"><div class="toolbar"><div><strong>Appointments by day</strong><p class="muted" style="margin:5px 0 0;font-size:11px">Scheduled date, excluding cancelled visits · UTC</p></div><span class="pill">Peak ${peak} / day</span></div><div class="report-chart-scroll"><div class="report-bars">${bars}</div></div></section><details class="card report-definitions" data-aos="fade-up"><summary>How these figures are counted</summary><ul><li><b>New patients:</b> patient profiles created during the selected dates.</li><li><b>Appointments:</b> appointment records by scheduled date, excluding cancelled visits. Completed and no-show totals are subsets.</li><li><b>Billed:</b> invoices issued and signed adjustments recorded during the selected dates.</li><li><b>Collected:</b> posted payment ledger entries less refunds during the selected dates, including insurance remittances.</li><li><b>Outstanding:</b> active invoice totals after signed adjustments and payments, regardless of invoice creation date.</li><li><b>Admissions:</b> hospital stays by admission start date.</li></ul></details>`;
      output.querySelector('#export-report').onclick = () => {
        const rows = [['Measure', 'Value'], ...cards.map(([label,value]) => [label,value]), [], ['Appointment date (UTC)', 'Appointments'], ...days.map(day => [day.key,day.count])];
        const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        link.download = `carepoint-report-${data.from}-to-${data.to}.csv`;
        link.click(); URL.revokeObjectURL(link.href);
      };
      refreshMotion();
    } catch (error) { output.innerHTML = `<div class="card empty" role="alert">${esc(error.message)} Try another date range.</div>`; }
  };
  form.onsubmit = event => { event.preventDefault(); const range = Object.fromEntries(new FormData(form)); load(range.from,range.to); };
  load(monthAgo,today);
}

function canCreate(key) {
  if (key === 'doctors') return me.role === 'admin';
  if (key === 'encounters') return ['admin', 'doctor'].includes(me.role);
  if (key === 'beds') return me.role === 'admin' || isStaff('operations');
  if (key === 'admissions') return me.role === 'admin' || isStaff('receptionist', 'nurse');
  if (key === 'inventory') return me.role === 'admin' || isStaff('pharmacy', 'operations');
  if (key === 'prescriptions') return ['doctor', 'admin'].includes(me.role);
  if (key === 'patients' || key === 'appointments') return me.role === 'admin' || isStaff('receptionist', 'records');
  if (key === 'invoices') return me.role === 'admin' || isStaff('receptionist', 'billing');
  if (key === 'visits') return me.role === 'admin' || isStaff('receptionist', 'nurse');
  return false;
}

function canUpdate(key) {
  if (key === 'appointments') return ['admin', 'doctor'].includes(me.role) || isStaff('receptionist', 'records');
  if (key === 'invoices') return me.role === 'admin' || isStaff('receptionist', 'billing');
  if (key === 'visits') return me.role === 'admin' || isStaff('receptionist', 'nurse');
  if (key === 'admissions') return ['admin', 'doctor'].includes(me.role) || isStaff('nurse');
  if (key === 'beds') return me.role === 'admin' || isStaff('operations');
  if (key === 'encounters') return ['admin', 'doctor'].includes(me.role);
  return false;
}

function canDelete(key) {
  return me.role === 'admin' && !['admissions', 'beds'].includes(key);
}
function canViewChart() { return me.role === 'admin' || me.role === 'doctor' || isStaff('nurse', 'records'); }

function renderTable(target, key, data) {
  const titles = {
    patients: ['Name', 'Age', 'Gender', 'Phone', 'Email'], doctors: ['Name', 'Specialty', 'Phone', 'Email'],
    appointments: ['Patient', 'Doctor', 'Date', 'Status'], prescriptions: ['Patient', 'Doctor', 'Medicine', 'Dosage', 'Fill quantity', 'This fill', 'Lifetime dispensed', 'Refills left', 'Status'],
    invoices: ['Patient', 'Description', 'Amount', 'Status'], visits: ['Patient', 'Doctor', 'Assigned nurse', 'Reason', 'Priority', 'Status', 'Triage'],
    admissions: ['Patient', 'Attending doctor', 'Bed', 'Assigned nurse', 'Admitted', 'Status'], beds: ['Bed', 'Ward', 'Room', 'Type', 'Status'],
    inventory: ['Item', 'Category', 'Stock', 'Unit', 'Reorder at', 'Expiry'], encounters: ['Patient','Doctor','Visit reason','Diagnosis','Clinical note','State','Signed']
  };
  const rows = data.map(item => {
    const cells = key === 'patients' ? [item.name, item.age, item.gender, item.phone, item.email]
      : key === 'doctors' ? [item.name, item.specialization, item.phone, item.email]
      : key === 'appointments' ? [item.patient?.name, item.doctor?.name, new Date(item.date).toLocaleString(), item.status]
      : key === 'prescriptions' ? [item.patient?.name, item.doctor?.name, item.medicine, item.dosage, item.quantity ?? 'Needs review', item.dispensedQuantity || 0, item.totalDispensedQuantity || 0, Math.max(0, Number(item.refills || 0) - Number(item.refillsUsed || 0)), item.quantity ? item.status : 'Needs review']
      : key === 'invoices' ? [item.patient?.name, item.description, `$${Number(item.amount).toFixed(2)}`, item.status]
      : key === 'admissions' ? [item.patient?.name, item.doctor?.name, item.bed?.code, item.assignedNurse?.displayName, new Date(item.admittedAt).toLocaleString(), item.status]
      : key === 'visits' ? [item.patient?.name, item.doctor?.name, item.assignedNurse?.displayName, item.reason, item.priority, item.status, item.bloodPressure ? `BP ${item.bloodPressure}` : item.triagedAt ? 'Vitals recorded' : 'Awaiting triage']
      : key === 'beds' ? [item.code, item.ward, item.room, item.kind, item.status]
      : key === 'inventory' ? [item.name, item.category, item.quantity, item.unit, item.reorderAt, item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : '—']
      : key === 'encounters' ? [item.patient?.name, item.doctor?.name, item.chiefConcern, item.diagnosis, String(item.note || '').slice(0, 90), item.status, item.signedAt ? new Date(item.signedAt).toLocaleString() : '—']
      : [item.patient?.name, item.doctor?.name, item.reason, item.priority, item.status];
    return `<tr>${cells.map(value => `<td>${esc(value)}</td>`).join('')}<td>${actions(key, item)}</td></tr>`;
  }).join('');
  target.innerHTML = `<section class="card"><div class="toolbar">
    ${key === 'patients' ? '<input id="search" aria-label="Search patients" placeholder="Search name, phone, email">' : ''}
    ${canCreate(key) ? `<button class="btn primary" id="add" type="button">+ Add ${esc(section === 'Patient flow' ? 'visit' : section.replace(/s$/, '').toLowerCase())}</button>` : ''}
  </div>${data.length ? `<div class="tablewrap"><table class="table"><thead><tr>${titles[key].map(value => `<th>${esc(value)}</th>`).join('')}<th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty">No records yet.</div>'}</section>`;
  target.querySelector('#add')?.addEventListener('click', () => form(key));
  target.querySelector('#search')?.addEventListener('input', async event => {
    const filtered = await api('/patients?q=' + encodeURIComponent(event.target.value));
    renderTable(target, key, filtered);
  });
  target.querySelectorAll('[data-delete]').forEach(button => button.onclick = async () => {
    if (!confirm('Delete this record?')) return;
    try { await api(`/${key}/${button.dataset.delete}`, { method: 'DELETE' }); toast('Record deleted.'); loadSection(); }
    catch (error) { toast(error.message, true); }
  });
  target.querySelectorAll('[data-chart]').forEach(button => button.onclick = () => openPatientChart(button.dataset.chart));
  target.querySelectorAll('[data-check-in]').forEach(button => button.onclick = () => checkInAppointment(data.find(item => item._id === button.dataset.checkIn)));
  target.querySelectorAll('[data-dispense]').forEach(button => button.onclick = () => openDispenseDialog(data.find(item => item._id === button.dataset.dispense)));
  target.querySelectorAll('[data-refill]').forEach(button => button.onclick = () => authorizePrescriptionRefill(button.dataset.refill));
  target.querySelectorAll('[data-edit-note]').forEach(button => button.onclick = () => editEncounter(data.find(item => item._id === button.dataset.editNote)));
  target.querySelectorAll('[data-triage]').forEach(button => button.onclick = () => editTriage(data.find(item => item._id === button.dataset.triage)));
  target.querySelectorAll('[data-assign-nurse]').forEach(button => button.onclick = () => assignNurse(key, data.find(item => item._id === button.dataset.assignNurse)));
  target.querySelectorAll('[data-status]').forEach(select => select.onchange = async () => {
    if (key === 'encounters' && select.value === 'Signed' && !confirm('Sign and lock this clinical note? Signed notes cannot be edited.')) { select.value = 'Draft'; return; }
    const changes = { status: select.value };
    if (key === 'admissions' && select.value === 'Discharged') {
      const summary = prompt('Add the discharge summary and instructions for the patient:');
      if (summary === null) { select.value = 'Admitted'; return; }
      changes.dischargeSummary = summary;
    }
    try { await api(`/${key}/${select.dataset.status}`, { method: 'PATCH', body: JSON.stringify(changes) }); toast('Updated.'); loadSection(); }
    catch (error) { toast(error.message, true); }
  });
  target.querySelectorAll('[data-stock]').forEach(button => button.onclick = async () => {
    const value = prompt('Enter the new on-hand quantity:');
    if (value === null || !Number.isFinite(Number(value)) || Number(value) < 0) return;
    const reason = prompt('Briefly describe why stock is changing:');
    if (reason === null || reason.trim().length < 3) return;
    try { await api('/inventory/' + button.dataset.stock, { method:'PATCH', body:JSON.stringify({ quantity:Number(value), reason }) }); toast('Stock level updated.'); loadSection(); }
    catch (error) { toast(error.message, true); }
  });
}

function actions(key, item) {
  const statusOptions = key === 'appointments' ? (item.status === 'Requested' ? (me.role === 'doctor' ? ['Requested'] : ['Requested', 'Scheduled', 'Cancelled']) : item.status === 'Scheduled' ? (me.role === 'doctor' ? ['Scheduled', 'Completed'] : ['Scheduled', 'Cancelled', 'No-show']) : item.status === 'Checked-in' && me.role === 'doctor' ? ['Checked-in', 'Completed'] : [])
    : key === 'invoices' ? []
    : key === 'visits' ? ['Waiting', 'In consultation', 'Completed']
    : key === 'admissions' && item.status === 'Admitted' ? ['Admitted', 'Discharged']
    : key === 'beds' && item.status !== 'Occupied' ? [item.status, 'Available', 'Cleaning', 'Maintenance'].filter((value,index,list)=>list.indexOf(value)===index)
    : key === 'encounters' && item.status === 'Draft' ? ['Draft', 'Signed'] : [];
  const canDispense = key === 'prescriptions' && (me.role === 'admin' || isStaff('pharmacy')) && item.quantity > Number(item.dispensedQuantity || 0) && ['Active', 'Partially dispensed'].includes(item.status);
  const canRefill = key === 'prescriptions' && ['admin', 'doctor'].includes(me.role) && item.status === 'Refill due' && Number(item.refillsUsed || 0) < Number(item.refills || 0);
  const canTriage = key === 'visits' && (me.role === 'admin' || isStaff('nurse'));
  const canCheckIn = key === 'appointments' && item.status === 'Scheduled' && (me.role === 'admin' || isStaff('receptionist'));
  const canAssignNurse = ['visits','admissions'].includes(key) && (me.role === 'admin' || isStaff('receptionist')) && (key !== 'admissions' || item.status === 'Admitted');
  return `<div class="actions">${key === 'patients' && canViewChart() ? `<button class="btn" data-chart="${esc(item._id)}" type="button">View chart</button>` : ''}${canCheckIn ? `<button class="btn primary" data-check-in="${esc(item._id)}" type="button">Check in</button>` : ''}${canDispense ? `<button class="btn primary" data-dispense="${esc(item._id)}" type="button">Dispense</button>` : ''}${canRefill ? `<button class="btn" data-refill="${esc(item._id)}" type="button">Authorize refill</button>` : ''}${canTriage ? `<button class="btn" data-triage="${esc(item._id)}" type="button">Triage / handoff</button>` : ''}${canAssignNurse ? `<button class="btn" data-assign-nurse="${esc(item._id)}" type="button">Assign nurse</button>` : ''}${key === 'encounters' && item.status === 'Draft' && canUpdate(key) ? `<button class="btn" data-edit-note="${esc(item._id)}" type="button">Edit draft</button>` : ''}${statusOptions.length > 1 && canUpdate(key) ? `<select data-status="${esc(item._id)}" aria-label="Update status">${statusOptions.map(value => `<option ${item.status === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select>` : ''}${key === 'inventory' && (me.role === 'admin' || isStaff('pharmacy','operations')) ? `<button class="btn" data-stock="${esc(item._id)}" type="button">Adjust stock</button>` : ''}${canDelete(key) ? `<button class="btn danger" data-delete="${esc(item._id)}" type="button">Delete</button>` : ''}</div>`;
}

async function checkInAppointment(item) {
  if (!item) return;
  try {
    const nurses = await api('/nurses');
    const modal = document.createElement('dialog'); modal.className = 'card';
    modal.innerHTML = `<h2>Check in patient</h2><p class="muted">${esc(item.patient?.name || 'Patient')} · ${esc(item.doctor?.name || 'Care team')} · ${new Date(item.date).toLocaleString()}</p><form id="check-in-form"><div class="field"><label for="check-in-nurse">Assign nurse</label><select id="check-in-nurse" name="assignedNurse" required>${nurses.map(nurse=>`<option value="${esc(nurse.id)}">${esc(nurse.displayName)}</option>`).join('')}</select></div><div class="field"><label for="check-in-priority">Queue priority</label><select id="check-in-priority" name="priority"><option>Routine</option><option>Urgent</option></select></div><div class="actions"><button class="btn primary" type="submit" ${nurses.length?'':'disabled'}>Check in and add to queue</button><button class="btn" id="cancel-check-in" type="button">Cancel</button></div>${nurses.length?'':'<p class="empty">Create an active nurse account before checking patients into the care queue.</p>'}</form>`;
    document.body.append(modal); modal.showModal();
    modal.querySelector('#cancel-check-in').onclick=()=>modal.close(); modal.onclose=()=>modal.remove();
    modal.querySelector('#check-in-form').onsubmit=async event=>{event.preventDefault();try{await api('/appointments/'+item._id+'/check-in',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});modal.close();toast('Patient checked in and added to the nursing queue.');loadSection()}catch(error){toast(error.message,true)}};
  } catch (error) { toast(error.message,true); }
}

async function assignNurse(key, item) {
  if (!item) return;
  try {
    const nurses = await api('/nurses');
    const modal = document.createElement('dialog'); modal.className = 'card';
    modal.innerHTML = `<h2>Assign nursing care</h2><p class="muted">${esc(item.patient?.name || item.reason || 'Patient task')}</p><form id="nurse-assignment"><div class="field"><label for="assigned-nurse">Nurse</label><select id="assigned-nurse" name="assignedNurse" required>${nurses.map(nurse=>`<option value="${esc(nurse.id)}" ${String(item.assignedNurse?._id || item.assignedNurse)===nurse.id?'selected':''}>${esc(nurse.displayName)}</option>`).join('')}</select></div>${nurses.length?'':'<p class="empty">Create an active nurse account before assigning care.</p>'}<div class="actions"><button class="btn primary" type="submit" ${nurses.length?'':'disabled'}>Save assignment</button><button class="btn" id="cancel-assignment" type="button">Cancel</button></div></form>`;
    document.body.append(modal); modal.showModal();
    modal.querySelector('#cancel-assignment').onclick=()=>modal.close(); modal.onclose=()=>modal.remove();
    modal.querySelector('#nurse-assignment').onsubmit=async event=>{event.preventDefault();try{await api(`/${key}/${item._id}`,{method:'PATCH',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});modal.close();toast('Nursing assignment updated.');loadSection()}catch(error){toast(error.message,true)}};
  } catch (error) { toast(error.message,true); }
}

function editTriage(item) {
  if (!item) return;
  const modal = document.createElement('dialog'); modal.className = 'card';
  modal.innerHTML = `<h2>Patient triage and handoff</h2><p class="muted">${esc(item.patient?.name)} · ${esc(item.reason)} · ${esc(item.priority)}</p><form id="triage-form"><div class="formgrid"><div class="field"><label for="triage-bp">Blood pressure</label><input id="triage-bp" name="bloodPressure" value="${esc(item.bloodPressure || '')}" placeholder="120/80"></div><div class="field"><label for="triage-pulse">Pulse (bpm)</label><input id="triage-pulse" name="pulse" type="number" min="0" max="300" value="${esc(item.pulse ?? '')}"></div><div class="field"><label for="triage-temp">Temperature (°C)</label><input id="triage-temp" name="temperature" type="number" min="20" max="50" step="0.1" value="${esc(item.temperature ?? '')}"></div><div class="field"><label for="triage-weight">Weight (kg)</label><input id="triage-weight" name="weight" type="number" min="0" max="500" step="0.1" value="${esc(item.weight ?? '')}"></div><div class="field wide"><label for="triage-handoff">Care handoff note</label><textarea id="triage-handoff" name="handoffNote" rows="4" maxlength="2000">${esc(item.handoffNote || '')}</textarea></div></div><div class="actions"><button class="btn primary" type="submit">Save triage</button><button class="btn" id="cancel-triage" type="button">Cancel</button></div></form>`;
  document.body.append(modal); modal.showModal();
  modal.querySelector('#cancel-triage').onclick = () => modal.close(); modal.onclose = () => modal.remove();
  modal.querySelector('#triage-form').onsubmit = async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    for (const key of ['pulse','temperature','weight']) if (body[key] === '') delete body[key]; else body[key] = Number(body[key]);
    try { await api('/visits/' + item._id, { method: 'PATCH', body: JSON.stringify(body) }); modal.close(); toast('Triage and handoff saved.'); loadSection(); }
    catch (error) { toast(error.message, true); }
  };
}

async function authorizePrescriptionRefill(id) {
  if (!confirm('Authorize the next refill? The pharmacist can dispense after the authorization is recorded.')) return;
  try { await api('/prescriptions/' + id + '/refills', { method: 'POST', body: '{}' }); toast('Refill authorized.'); loadSection(); }
  catch (error) { toast(error.message, true); }
}

async function renderInventory(target) {
  const [items, movements] = await Promise.all([api('/inventory'), api('/stock-movements')]);
  renderTable(target, 'inventory', items);
  target.insertAdjacentHTML('beforeend', `<section class="card stock-ledger" data-aos="fade-up"><div class="toolbar"><div><strong>Stock movement ledger</strong><p class="muted" style="margin:5px 0 0;font-size:11px">Append-only record of opening stock, corrections and dispensing.</p></div><span class="pill">Latest ${movements.length}</span></div>${movements.length ? `<div class="tablewrap"><table class="table"><thead><tr><th>Time</th><th>Medication / item</th><th>Movement</th><th>Change</th><th>Recorded by</th><th>Reference</th></tr></thead><tbody>${movements.map(row => `<tr><td>${new Date(row.createdAt).toLocaleString()}</td><td>${esc(row.item?.name || 'Removed item')}</td><td>${esc(row.type)}</td><td>${row.change > 0 ? '+' : ''}${esc(row.change)} ${esc(row.item?.unit || '')}</td><td>${esc(row.actor?.displayName || row.actor?.username || 'Former user')}</td><td>${row.prescription ? `Prescription ${esc(String(row.prescription._id).slice(-6))}` : esc(row.reason || '')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Stock movements will appear here as inventory changes.</div>'}</section>`);
  refreshMotion();
}

async function renderMAR(target) {
  const data = await api('/mar');
  const active = data.admissions.filter(item => item.status === 'Admitted');
  target.innerHTML = `<section class="workspace-hero" data-aos="fade-up"><span class="eyebrow">NURSING WORKFLOW</span><h2>Medication administration record.</h2><p>Record each dose against an active inpatient medication order, with the outcome and responsible clinician attached.</p></section><div class="section-kicker">Active assigned admissions</div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(290px,1fr))">${active.map((admission,index)=>{
    const patientId=String(admission.patient?._id);
    const meds=data.prescriptions.filter(item=>String(item.patient)===patientId);
    return `<section class="card mar-card" data-aos="fade-up" data-aos-delay="${Math.min(index,5)*55}"><div class="toolbar"><div><strong>${esc(admission.patient?.name || 'Patient')}</strong><p class="muted" style="margin:5px 0 0;font-size:10px">${esc(admission.bed?.ward || 'Inpatient')} · ${esc(admission.bed?.code || '')} · Dr. ${esc(admission.doctor?.name || '')}</p></div>${portalStatus(admission.status)}</div>${meds.length?`<form class="mar-form" data-mar-admission="${esc(admission._id)}"><div class="field"><label>Medication order</label><select name="prescription" required>${meds.map(item=>`<option value="${esc(item._id)}">${esc(item.medicine)} · ${esc(item.dosage)} · ${esc(item.status)}</option>`).join('')}</select></div><div class="formgrid"><div class="field"><label>Dose given / due</label><input name="doseGiven" maxlength="120" placeholder="1 tablet or 5 ml" required></div><div class="field"><label>Administration outcome</label><select name="status"><option>Given</option><option>Refused</option><option>Held</option><option>Missed</option></select></div></div><div class="field"><label>Reason or nursing note</label><textarea name="notes" rows="2" maxlength="1000" placeholder="Required for held, refused, or missed doses"></textarea></div><button class="btn primary" type="submit">Record administration</button></form>`:'<div class="empty">No active medication orders for this inpatient.</div>'}</section>`;
  }).join('')||'<div class="card empty">No active admissions are assigned to your nursing queue.</div>'}</div><div class="section-kicker">Recent medication administration history</div><section class="card" data-aos="fade-up">${data.events.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Time</th><th>Patient</th><th>Medication</th><th>Dose</th><th>Outcome</th><th>Recorded by</th><th>Note</th></tr></thead><tbody>${data.events.map(item=>`<tr><td>${new Date(item.administeredAt).toLocaleString()}</td><td>${esc(item.admission?.patient?.name || 'Patient')}</td><td>${esc(item.prescription?.medicine || 'Medication')}</td><td>${esc(item.doseGiven)}</td><td>${portalStatus(item.status)}</td><td>${esc(item.administeredBy?.displayName || item.administeredBy?.username || '')}</td><td>${esc(item.notes || '')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No doses have been recorded for assigned admissions.</div>'}</section>`;
  target.querySelectorAll('[data-mar-admission]').forEach(form=>{
    const outcome=form.querySelector('[name="status"]'); const notes=form.querySelector('[name="notes"]');
    const syncNoteRequirement=()=>{notes.required=outcome.value!=='Given';notes.minLength=outcome.value==='Given'?0:3;};
    outcome.onchange=syncNoteRequirement; syncNoteRequirement();
    form.onsubmit=async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(form));body.admission=form.dataset.marAdmission;try{await api('/mar',{method:'POST',body:JSON.stringify(body)});toast('Medication administration recorded.');loadSection()}catch(error){toast(error.message,true)}};
  });
  refreshMotion();
}

async function openDispenseDialog(prescription) {
  if (!prescription || !prescription.quantity) return toast('This prescription needs a quantity review before dispensing.', true);
  try {
    const stock = await api('/inventory');
    const today = new Date().toISOString().slice(0, 10);
    const matches = stock.filter(item => item.category === 'Medication' && item.quantity > 0 && item.name.trim().toLocaleLowerCase('en-US') === prescription.medicine.trim().toLocaleLowerCase('en-US') && (!item.expiresAt || new Date(item.expiresAt).toISOString().slice(0, 10) >= today));
    const remaining = Math.max(0, Number(prescription.quantity) - Number(prescription.dispensedQuantity || 0));
    const modal = document.createElement('dialog'); modal.className = 'card';
    modal.innerHTML = `<h2>Dispense medication</h2><p class="muted">${esc(prescription.patient?.name)} · ${esc(prescription.medicine)} · ${esc(prescription.dosage)}</p><div class="dispense-summary"><span>Prescribed <b>${esc(prescription.quantity)}</b></span><span>Dispensed <b>${esc(prescription.dispensedQuantity || 0)}</b></span><span>Remaining <b>${esc(remaining)}</b></span></div><form id="dispense-form"><div class="field"><label for="dispense-stock">Medication stock</label><select id="dispense-stock" name="stockItem" ${matches.length ? 'required' : 'disabled'}>${matches.map(item => `<option value="${esc(item._id)}" data-quantity="${esc(item.quantity)}">${esc(item.name)} · ${esc(item.quantity)} ${esc(item.unit)}${item.expiresAt ? ' · expires ' + new Date(item.expiresAt).toLocaleDateString() : ''}</option>`).join('')}</select></div><div class="field"><label for="dispense-quantity">Quantity to dispense</label><input id="dispense-quantity" name="quantity" type="number" min="0.01" max="${remaining}" step="0.01" value="${Math.min(remaining, Number(matches[0]?.quantity || 0))}" ${matches.length ? 'required' : 'disabled'}></div>${matches.length ? '' : '<p class="error" role="status">No unexpired stock with the exact prescribed medication name is available.</p>'}<div class="actions"><button class="btn primary" type="submit" ${matches.length ? '' : 'disabled'}>Confirm dispense</button><button class="btn" id="cancel-dispense" type="button">Cancel</button></div></form>`;
    document.body.append(modal); modal.showModal();
    const select = modal.querySelector('#dispense-stock'); const amount = modal.querySelector('#dispense-quantity');
    select.onchange = () => { const available = Number(select.selectedOptions[0]?.dataset.quantity || 0); amount.max = Math.min(remaining, available); amount.value = amount.max; };
    modal.querySelector('#cancel-dispense').onclick = () => modal.close(); modal.onclose = () => modal.remove();
    modal.querySelector('#dispense-form').onsubmit = async event => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.currentTarget)); body.quantity = Number(body.quantity);
      try { await api('/prescriptions/' + prescription._id + '/dispense', { method: 'POST', body: JSON.stringify(body) }); modal.close(); toast('Medication dispensed and stock ledger updated.'); loadSection(); }
      catch (error) { toast(error.message, true); }
    };
  } catch (error) { toast(error.message, true); }
}

function editEncounter(item) {
  if (!item || item.status !== 'Draft') return;
  const modal = document.createElement('dialog'); modal.className = 'card';
  modal.innerHTML = `<h2>Edit clinical note</h2><p class="muted">${esc(item.patient?.name)} · ${esc(item.doctor?.name)} · Draft note</p><form id="edit-note-form"><div class="formgrid"><div class="field"><label for="edit-concern">Visit reason</label><input id="edit-concern" name="chiefConcern" value="${esc(item.chiefConcern)}" maxlength="500" required></div><div class="field"><label for="edit-diagnosis">Assessment / diagnosis</label><input id="edit-diagnosis" name="diagnosis" value="${esc(item.diagnosis || '')}"></div><div class="field"><label for="edit-bp">Blood pressure</label><input id="edit-bp" name="bloodPressure" value="${esc(item.bloodPressure || '')}" placeholder="120/80"></div><div class="field"><label for="edit-pulse">Pulse (bpm)</label><input id="edit-pulse" name="pulse" type="number" min="0" max="300" value="${esc(item.pulse ?? '')}"></div><div class="field"><label for="edit-temp">Temperature (°C)</label><input id="edit-temp" name="temperature" type="number" step="0.1" value="${esc(item.temperature ?? '')}"></div><div class="field"><label for="edit-weight">Weight (kg)</label><input id="edit-weight" name="weight" type="number" step="0.1" min="0" value="${esc(item.weight ?? '')}"></div><div class="field wide"><label for="edit-note">Clinical note</label><textarea id="edit-note" name="note" rows="7" maxlength="12000" required>${esc(item.note)}</textarea></div></div><div class="actions"><button class="btn primary" type="submit">Save draft</button><button class="btn" id="cancel-edit-note" type="button">Cancel</button></div></form>`;
  document.body.append(modal); modal.showModal();
  modal.querySelector('#cancel-edit-note').onclick = () => modal.close(); modal.onclose = () => modal.remove();
  modal.querySelector('#edit-note-form').onsubmit = async event => {
    event.preventDefault();
    try { await api('/encounters/' + item._id, { method: 'PATCH', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); modal.close(); toast('Draft saved.'); loadSection(); }
    catch (error) { toast(error.message, true); }
  };
}

async function openPatientChart(patientId) {
  try {
    const data = await api('/patients/' + patientId + '/chart');
    const patient = data.patient;
    const group = (title, items, renderRow, empty) => `<section class="chart-section" data-aos="fade-up"><div class="section-kicker">${esc(title)}</div>${items.length ? `<div class="chart-list">${items.map(renderRow).join('')}</div>` : `<div class="empty">${esc(empty)}</div>`}</section>`;
    const modal = document.createElement('dialog');
    modal.className = 'card patient-chart';
    modal.innerHTML = `<header class="chart-header"><div><span class="eyebrow">LONGITUDINAL PATIENT RECORD</span><h2>${esc(patient.name)}</h2><p class="muted">${esc(patient.age)} years${patient.gender ? ' · ' + esc(patient.gender) : ''} · ${esc(patient.phone)}${patient.bloodGroup ? ' · Blood group ' + esc(patient.bloodGroup) : ''}</p></div><button class="btn" type="button" id="close-chart" aria-label="Close patient chart">Close</button></header><div class="chart-contact"><span><small>Email</small><b>${esc(patient.email || 'Not provided')}</b></span><span><small>Address</small><b>${esc(patient.address || 'Not provided')}</b></span><span><small>Emergency contact</small><b>${esc(patient.emergencyContact || 'Not provided')}</b></span></div>${group('Appointments', data.appointments, item => `<article><div><b>${esc(item.doctor?.name || 'Care team')}</b><small>${new Date(item.date).toLocaleString()} · ${esc(item.reason || 'Visit')}</small></div>${portalStatus(item.status)}</article>`, 'No appointments recorded.')}${group('Clinical notes', data.encounters, item => `<article><div><b>${esc(item.chiefConcern)}</b><small>${esc(item.doctor?.name || 'Care team')} · ${new Date(item.signedAt || item.createdAt).toLocaleDateString()} · ${esc(item.diagnosis || 'Assessment pending')}</small><p>${esc(item.note)}</p></div><span class="pill">${esc(item.status)}</span></article>`, 'No clinical notes available.')}${group('Prescriptions', data.prescriptions, item => `<article><div><b>${esc(item.medicine)} · ${esc(item.dosage)}</b><small>${esc(item.doctor?.name || 'Care team')} · ${new Date(item.createdAt).toLocaleDateString()}</small>${item.instructions ? `<p>${esc(item.instructions)}</p>` : ''}</div></article>`, 'No prescriptions recorded.')}${group('Medication administration', data.medicationAdministration, item => `<article><div><b>${esc(item.prescription?.medicine || 'Medication')} · ${esc(item.doseGiven)}</b><small>${new Date(item.administeredAt).toLocaleString()} · ${esc(item.administeredBy?.displayName || item.administeredBy?.username || 'Nursing team')}</small>${item.notes ? `<p>${esc(item.notes)}</p>` : ''}</div>${portalStatus(item.status)}</article>`, 'No medication doses documented.')}${group('Imaging studies', data.imagingOrders, item => `<article><div><b>${esc(item.modality)} · ${esc(item.bodySite)}</b><small>${esc(item.doctor?.name || 'Care team')} · ${new Date(item.createdAt).toLocaleDateString()} · ${esc(item.priority)} priority</small><p><b>Indication:</b> ${esc(item.clinicalIndication)}</p>${item.reportText?`<p><b>Report:</b> ${esc(item.reportText)}</p>`:''}${item.reviewNote?`<p><b>Doctor review:</b> ${esc(item.reviewNote)}</p>`:''}${item.followUpRequired?`<p><b>Follow-up:</b> ${esc(item.followUpNote || 'Required')}</p>`:''}</div>${portalStatus(item.status)}</article>`, 'No imaging reports are waiting for your clinical review.')}${group('Released laboratory results', data.labOrders, item => `<article><div><b>${esc(item.testName)}</b><small>${esc(item.doctor?.name || 'Care team')} · ${new Date(item.releasedAt || item.updatedAt).toLocaleDateString()}</small><p>${esc(item.result || 'Result released')}</p></div>${portalStatus(item.status)}</article>`, 'No results released.')}${group('Hospital stays', data.admissions, item => `<article><div><b>${esc(item.status)} · ${esc(item.bed?.ward || 'Hospital stay')}</b><small>${new Date(item.admittedAt).toLocaleDateString()} · ${esc(item.doctor?.name || 'Care team')}</small>${item.dischargeSummary ? `<p>${esc(item.dischargeSummary)}</p>` : ''}</div>${portalStatus(item.status)}</article>`, 'No admissions recorded.')}`;
    document.body.append(modal); modal.showModal(); modal.querySelector('#close-chart').onclick = () => modal.close(); modal.onclose = () => modal.remove(); refreshMotion();
  } catch (error) { toast(error.message, true); }
}

async function form(key) {
  const needsPatients = ['appointments', 'prescriptions', 'invoices', 'visits', 'admissions', 'encounters'].includes(key);
  const needsDoctors = ['appointments', 'prescriptions', 'visits', 'admissions', 'encounters'].includes(key);
  const needsBeds = key === 'admissions';
  const needsAppointments = key === 'encounters';
  const needsNurses = ['visits', 'admissions'].includes(key) && !isStaff('nurse');
  const [patients, doctors, beds, appointments, nurses] = await Promise.all([
    needsPatients ? api('/patients') : Promise.resolve([]),
    needsDoctors ? api('/doctors') : Promise.resolve([]),
    needsBeds ? api('/beds') : Promise.resolve([]),
    needsAppointments ? api('/appointments') : Promise.resolve([]),
    needsNurses ? api('/nurses') : Promise.resolve([])
  ]);
  const fields = {
    patients: [['name', 'Patient name', 'text'], ['age', 'Age', 'number'], ['gender', 'Gender', 'select:Female,Male,Other'], ['phone', 'Phone', 'tel'], ['email', 'Email', 'email'], ['address', 'Address', 'text']],
    doctors: [['name', 'Doctor name', 'text'], ['specialization', 'Specialty', 'text'], ['phone', 'Phone', 'tel'], ['email', 'Email', 'email']],
    appointments: [['patient', 'Patient', 'ref:patients'], ['doctor', 'Doctor', 'ref:doctors'], ['date', 'Date and time', 'datetime-local'], ['reason', 'Reason', 'text']],
    prescriptions: [['patient', 'Patient', 'ref:patients'], ['doctor', 'Doctor', 'ref:doctors'], ['medicine', 'Medicine', 'text'], ['dosage', 'Dosage', 'text'], ['quantity', 'Total quantity','number'], ['refills','Refills allowed','number'], ['instructions', 'Instructions', 'text']],
    invoices: [['patient', 'Patient', 'ref:patients'], ['description', 'Description', 'text'], ['amount', 'Amount', 'number'], ['dueAt', 'Due date', 'date']],
    visits: [['patient', 'Patient', 'ref:patients'], ['doctor', 'Doctor', 'ref:doctors'], ['reason', 'Reason', 'text'], ['priority', 'Priority', 'select:Routine,Urgent']],
    beds: [['code','Bed identifier','text'],['ward','Ward','text'],['room','Room','text'],['kind','Bed type','select:Standard,Private,ICU,Observation'],['status','Initial status','select:Available,Maintenance']],
    admissions: [['patient','Patient','ref:patients'],['doctor','Attending doctor','ref:doctors'],['bed','Available bed','ref:beds'],['reason','Admission reason','text'],['diagnosis','Initial diagnosis','text']],
    inventory: [['name','Item name','text'],['category','Category','select:Medication,Supply,Equipment'],['unit','Unit','text'],['quantity','On-hand quantity','number'],['reorderAt','Reorder threshold','number'],['expiresAt','Expiry date','date'],['supplier','Supplier','text']],
    encounters: [['patient','Patient','ref:patients'],['doctor','Attending doctor','ref:doctors'],['appointment','Checked-in, scheduled or completed visit','ref:appointments'],['chiefConcern','Visit reason','text'],['diagnosis','Assessment / diagnosis','text'],['bloodPressure','Blood pressure','text'],['pulse','Pulse (bpm)','number'],['temperature','Temperature (°C)','number'],['weight','Weight (kg)','number'],['note','Clinical note','textarea']]
  };
  if (needsNurses) fields[key].splice(2, 0, ['assignedNurse', 'Assigned nurse', 'ref:nurses']);
  const html = fields[key].map(([name, label, type]) => {
    const control = type.startsWith('select:')
      ? `<select name="${name}" required>${type.slice(7).split(',').map(value => `<option>${esc(value)}</option>`).join('')}</select>`
      : type.startsWith('ref:')
        ? `<select name="${name}" required>${(name === 'patient' ? patients : name === 'bed' ? beds.filter(item=>item.status==='Available') : name === 'appointment' ? appointments.filter(item=>['Checked-in','Scheduled','Completed'].includes(item.status)) : name === 'assignedNurse' ? nurses : doctors).map(item => `<option value="${esc(item._id)}">${esc(name === 'appointment' ? `${item.patient?.name || 'Patient'} · ${new Date(item.date).toLocaleString()} · ${item.status}` : item.displayName || item.name || item.code)}</option>`).join('')}</select>`
        : type === 'textarea' ? `<textarea name="${name}" rows="5" maxlength="12000" ${name==='note'?'required':''}></textarea>`
        : `<input name="${name}" type="${type}" ${['name', 'age', 'phone', 'specialization', 'patient', 'doctor', 'date', 'reason', 'medicine', 'dosage', 'quantity', 'description', 'amount', 'chiefConcern', 'note'].includes(name) ? 'required' : ''} ${name === 'date' ? 'required' : ''} ${name === 'age' ? 'min="0" max="120"' : ''} ${name === 'amount' ? 'min="0.01" step="0.01"' : ['quantity'].includes(name) ? `min="${key === 'prescriptions' ? '0.01' : '0'}" step="0.01"` : ''} ${name === 'refills' ? 'min="0" max="24" step="1"' : ''}>`;
    return `<div class="field"><label>${esc(label)}</label>${control}</div>`;
  }).join('');
  const modal = document.createElement('dialog');
  modal.className = 'card';
  modal.style = 'border:0;border-radius:14px;width:min(580px,94vw);max-height:90vh;overflow:auto';
  modal.innerHTML = `<h2>Add ${esc(section === 'Patient flow' ? 'visit' : section.replace(/s$/, '').toLowerCase())}</h2><form id="record"><div class="formgrid">${html}</div><div class="actions"><button class="btn primary">Save</button><button class="btn" type="button" id="cancel">Cancel</button></div></form>`;
  document.body.append(modal);
  modal.showModal();
  modal.querySelector('#cancel').onclick = () => modal.close();
  modal.onclose = () => modal.remove();
  modal.querySelector('#record').onsubmit = async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    if (body.age) body.age = Number(body.age);
    if (body.amount) body.amount = Number(body.amount);
    if (body.quantity !== undefined) body.quantity = Number(body.quantity);
    if (body.refills === '') delete body.refills;
    else if (body.refills !== undefined) body.refills = Number(body.refills);
    for (const field of ['pulse', 'temperature', 'weight']) {
      if (body[field] === '') delete body[field];
      else if (body[field] !== undefined) body[field] = Number(body[field]);
    }
    if (body.date) body.date = new Date(body.date).toISOString();
    if (body.dueAt) body.dueAt = new Date(body.dueAt).toISOString();
    if (body.expiresAt) body.expiresAt = new Date(body.expiresAt).toISOString();
    try { await api('/' + key, { method: 'POST', body: JSON.stringify(body) }); modal.close(); toast('Saved successfully.'); loadSection(); }
    catch (error) { toast(error.message, true); }
  };
}

function staff(target) {
  api('/staff').then(users => {
    target.innerHTML = `<section class="card">
      <div class="toolbar"><div><strong>Team accounts</strong><p class="muted" style="margin:5px 0 0">Create doctor and staff accounts. They change the temporary password at first sign-in.</p></div><button class="btn primary" id="add-user" type="button">+ Create user</button></div>
      ${users.length ? `<div class="tablewrap"><table class="table"><thead><tr><th>Username</th><th>Account type</th><th>Status</th><th>Actions</th></tr></thead><tbody>${users.map(user => `<tr><td>${esc(user.username)}</td><td>${esc(user.role === 'staff' ? `Staff · ${staffTitles[user.subRole] || user.subRole}` : roleTitle(user))}</td><td>${user.active ? 'Active' : 'Disabled'}</td><td class="actions">${user.id === me.id ? '<span class="muted">Current account</span>' : `<button class="btn" data-user="${esc(user.id)}" type="button">${user.active ? 'Disable' : 'Enable'}</button><button class="btn" data-reset-user="${esc(user.id)}" type="button">Reset password</button>`}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No accounts yet.</div>'}
    </section>`;
    target.querySelector('#add-user').onclick = () => createUserDialog();
    target.querySelectorAll('[data-user]').forEach(button => button.onclick = async () => {
      const user = users.find(item => item.id === button.dataset.user);
      try { await api('/staff/' + user.id, { method: 'PATCH', body: JSON.stringify({ active: !user.active }) }); toast('Account status updated.'); staff(target); }
      catch (error) { toast(error.message, true); }
    });
    target.querySelectorAll('[data-reset-user]').forEach(button => button.onclick = () => resetTeamPassword(button.dataset.resetUser));
  }).catch(error => toast(error.message, true));
}

function resetTeamPassword(userId) {
  const modal = document.createElement('dialog');
  modal.className = 'card';
  modal.innerHTML = `<h2>Reset team password</h2><p class="muted">The user will be asked to set a new password at their next sign-in.</p><form id="reset-team-password"><div class="field"><label for="reset-password">Temporary password</label><input id="reset-password" type="password" name="password" minlength="12" autocomplete="new-password" required></div><div class="actions"><button class="btn primary" type="submit">Reset password</button><button class="btn" id="cancel-reset" type="button">Cancel</button></div></form>`;
  document.body.append(modal); modal.showModal();
  modal.querySelector('#cancel-reset').onclick = () => modal.close();
  modal.onclose = () => modal.remove();
  modal.querySelector('#reset-team-password').onsubmit = async event => {
    event.preventDefault();
    try { await api('/staff/' + userId, { method: 'PATCH', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); modal.close(); toast('Temporary password set.'); }
    catch (error) { toast(error.message, true); }
  };
}

function createUserDialog() {
  const modal = document.createElement('dialog');
  modal.className = 'card';
  modal.style = 'border:0;border-radius:14px;width:min(580px,94vw);max-height:90vh;overflow:auto';
  modal.innerHTML = `<h2>Create a team account</h2><p class="muted">Choose Doctor or Staff. A temporary password must be at least 12 characters.</p>
    <form id="new-user"><div class="formgrid">
      <div class="field wide"><label for="new-display-name">Full name</label><input id="new-display-name" name="displayName" minlength="2" maxlength="120" required></div>
      <div class="field"><label for="new-username">Username</label><input id="new-username" name="username" pattern="[A-Za-z0-9._-]{3,80}" autocomplete="off" minlength="3" maxlength="80" required></div>
      <div class="field"><label for="new-role">Account type</label><select id="new-role" name="role"><option value="doctor">Doctor</option><option value="staff">Staff</option></select></div>
      <div class="field wide" id="subrole-field" hidden><label for="new-subrole">Staff subrole</label><select id="new-subrole" name="subRole"><option value="receptionist">Receptionist</option><option value="nurse">Nurse</option><option value="billing">Billing staff</option><option value="records">Medical records staff</option><option value="lab">Laboratory</option><option value="imaging">Radiology / imaging</option><option value="pharmacy">Pharmacy</option><option value="operations">Operations</option></select></div>
      <div class="field wide"><label for="temp-password">Temporary password</label><input id="temp-password" name="password" type="password" autocomplete="new-password" minlength="12" required></div>
    </div><div class="actions"><button class="btn primary" type="submit">Create account</button><button class="btn" type="button" id="cancel-user">Cancel</button></div></form>`;
  document.body.append(modal);
  modal.showModal();
  const role = modal.querySelector('#new-role');
  const subroleField = modal.querySelector('#subrole-field');
  const subrole = modal.querySelector('#new-subrole');
  const syncSubrole = () => { const isStaffAccount = role.value === 'staff'; subroleField.hidden = !isStaffAccount; subrole.disabled = !isStaffAccount; };
  role.onchange = syncSubrole;
  syncSubrole();
  modal.querySelector('#cancel-user').onclick = () => modal.close();
  modal.onclose = () => modal.remove();
  modal.querySelector('#new-user').onsubmit = async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api('/staff', { method: 'POST', body: JSON.stringify(body) });
      modal.close();
      toast('Account created. Share the username and temporary password securely.');
      loadSection();
    } catch (error) { toast(error.message, true); }
  };
}

api('/auth/me').then(({ user }) => { me = user; if (me) { section = 'Dashboard'; render(); } else renderLanding(); }).catch(() => { me = null; renderLanding(); });
