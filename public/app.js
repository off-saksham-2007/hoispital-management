const app = document.querySelector('#app');
const sections = ['Dashboard', 'Patients', 'Doctors', 'Appointments', 'Prescriptions', 'Invoices', 'Patient flow', 'Staff'];
const endpoints = { Patients: 'patients', Doctors: 'doctors', Appointments: 'appointments', Prescriptions: 'prescriptions', Invoices: 'invoices', 'Patient flow': 'visits' };
const staffTitles = { receptionist: 'Receptionist', nurse: 'Nurse', billing: 'Billing staff', records: 'Medical records staff' };
let me = null, section = 'Dashboard', cache = {};

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isStaff = (...subroles) => me?.role === 'staff' && subroles.includes(me.subRole);
const roleTitle = user => user.role === 'pending' ? 'Access pending' : user.role === 'staff' ? (staffTitles[user.subRole] || 'Staff') : user.role === 'admin' ? 'Administrator' : 'Doctor';

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
        <button class="nav-signin" data-show-register type="button">Sign up <span aria-hidden="true">↗</span></button>
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
          <p class="hero-note">Create an account to request access, or sign in if you already have one.</p>
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
        <div class="teams-copy"><p class="eyebrow">A WORKSPACE THAT KNOWS ITS TEAM</p><h2>The right people.<br><span>The right access.</span></h2><p>People can request an account themselves. Administrators review each request and assign doctor or staff access before clinic records become available.</p><div class="access-list"><div><span class="access-icon access-admin">A</span><p><b>Administrators</b><small>Review account requests and oversee clinic operations.</small></p><span class="access-arrow">↗</span></div><div><span class="access-icon access-doctor">D</span><p><b>Doctors</b><small>Coordinate care, appointments and prescriptions.</small></p><span class="access-arrow">↗</span></div><div><span class="access-icon access-staff">S</span><p><b>Staff</b><small>Use access suited to each team responsibility.</small></p><span class="access-arrow">↗</span></div></div><button class="text-cta" data-show-register type="button">Create your account <span>↗</span></button></div>
      </section>

      <section class="closing-section" id="about"><div class="closing-glow" aria-hidden="true"></div><p class="eyebrow">A LITTLE MORE CLARITY, EVERY DAY</p><h2>Make room for<br><span>the care that matters.</span></h2><p>CarePoint brings your clinic's people and work into one connected view.</p><button class="hero-primary" data-show-register type="button">Create your account <span aria-hidden="true">↗</span></button><small>New accounts can sign in while an administrator reviews their requested access.</small></section>
    </main>

    <footer class="landing-footer"><a class="landing-brand" href="#top"><span class="brand-mark" aria-hidden="true">+</span><span>CarePoint</span></a><p>A clearer view of clinic work.</p><div class="footer-links"><a href="#platform">Platform</a><a href="#teams">Care teams</a><button data-show-login type="button">Log in</button></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} CarePoint</span><span>For the people who make care happen.</span><a href="#top">Back to top ↑</a></div></footer>
  </div>`;
  bindThemeToggles();
  document.querySelectorAll('[data-show-login]').forEach(button => button.onclick = () => me ? render() : renderLogin());
  document.querySelectorAll('[data-show-register]').forEach(button => button.onclick = () => renderRegister());
}

function renderLogin(message = '', success = false) {
  app.innerHTML = `<section class="auth-page">
    <header class="auth-nav"><a class="landing-brand" href="#" id="back-home"><span class="brand-mark" aria-hidden="true">+</span><span>CarePoint</span></a><div class="auth-nav-actions"><button class="theme-toggle" data-theme-toggle type="button">Dark</button><button class="auth-back" id="back-home-secondary" type="button">← Back to home</button></div></header>
    <div class="auth-layout"><div class="auth-message"><p class="eyebrow">WELCOME TO YOUR WORKSPACE</p><h1>Good to have<br><span>you back.</span></h1><p>Sign in to pick up where your team left off.</p><div class="auth-decoration" aria-hidden="true"><span></span><span></span><span></span></div></div>
      <form id="login" class="card login-card auth-card"><div class="auth-card-mark" aria-hidden="true">+</div><p class="eyebrow">CAREPOINT WORKSPACE</p><h2>Sign in</h2><p class="muted">Use your username or account ID and password.</p>${message ? `<div class="${success ? 'success' : 'error'}" role="${success ? 'status' : 'alert'}">${esc(message)}</div>` : ''}
        <div class="field"><label for="login-username">Username or account ID</label><input id="login-username" name="username" autocomplete="username" required autofocus></div>
        <div class="field"><label for="login-password">Password</label><input id="login-password" name="password" type="password" autocomplete="current-password" required></div>
        <button class="btn primary full" type="submit">Continue securely <span aria-hidden="true">↗</span></button>
        <p class="auth-help">New to CarePoint? <button class="auth-link" id="open-register" type="button">Create an account</button>. Your account can sign in while an administrator reviews your requested role.</p>
      </form>
    </div><div class="auth-footer"><span>CarePoint · A clearer view of clinic work</span><a href="#" id="auth-home-link">Return to home</a></div>
  </section>`;
  bindThemeToggles();
  const goHome = event => { event?.preventDefault(); renderLanding(); };
  document.querySelector('#back-home').onclick = goHome;
  document.querySelector('#back-home-secondary').onclick = goHome;
  document.querySelector('#auth-home-link').onclick = goHome;
  document.querySelector('#open-register').onclick = () => renderRegister();
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
}

function renderRegister(message = '') {
  app.innerHTML = `<section class="auth-page">
    <header class="auth-nav"><a class="landing-brand" href="#" id="register-home"><span class="brand-mark" aria-hidden="true">+</span><span>CarePoint</span></a><div class="auth-nav-actions"><button class="theme-toggle" data-theme-toggle type="button">Dark</button><button class="auth-back" id="register-login" type="button">I have an account</button></div></header>
    <div class="auth-layout register-layout"><div class="auth-message"><p class="eyebrow">JOIN YOUR CARE TEAM</p><h1>Start with a<br><span>clearer view.</span></h1><p>Create your account, then request the access that matches your role.</p><div class="auth-decoration" aria-hidden="true"><span></span><span></span><span></span></div></div>
      <form id="register" class="card auth-card"><div class="auth-card-mark" aria-hidden="true">+</div><p class="eyebrow">CREATE AN ACCOUNT</p><h2>Join CarePoint</h2><p class="muted">Choose your sign-in details and request a role.</p>${message ? `<div class="error" role="alert">${esc(message)}</div>` : ''}
        <div class="field"><label for="register-name">Full name</label><input id="register-name" name="displayName" autocomplete="name" minlength="2" maxlength="120" required></div>
        <div class="field"><label for="register-username">Username</label><input id="register-username" name="username" autocomplete="username" pattern="[A-Za-z0-9._-]{3,80}" minlength="3" maxlength="80" required><small class="field-help">3–80 letters, numbers, dots, underscores or hyphens.</small></div>
        <div class="field"><label for="register-role">Request account type</label><select id="register-role" name="requestedRole"><option value="staff">Staff</option><option value="doctor">Doctor</option></select></div>
        <div class="field" id="register-subrole-field"><label for="register-subrole">Requested staff subrole</label><select id="register-subrole" name="requestedSubRole"><option value="receptionist">Receptionist</option><option value="nurse">Nurse</option><option value="billing">Billing staff</option><option value="records">Medical records staff</option></select></div>
        <div class="field"><label for="register-password">Password</label><input id="register-password" name="password" type="password" autocomplete="new-password" minlength="12" required><small class="field-help">Use at least 12 characters.</small></div>
        <div class="field"><label for="register-confirm">Confirm password</label><input id="register-confirm" name="confirmPassword" type="password" autocomplete="new-password" minlength="12" required></div>
        <p class="auth-help">You can sign in right away. An administrator must approve your requested doctor or staff access before you can open clinic records.</p>
        <button class="btn primary full" type="submit">Create account <span aria-hidden="true">↗</span></button>
      </form>
    </div><div class="auth-footer"><span>CarePoint · A clearer view of clinic work</span><a href="#" id="register-home-link">Return to home</a></div>
  </section>`;
  bindThemeToggles();
  const goHome = event => { event?.preventDefault(); renderLanding(); };
  document.querySelector('#register-home').onclick = goHome;
  document.querySelector('#register-home-link').onclick = goHome;
  document.querySelector('#register-login').onclick = () => renderLogin();
  const requestedRole = document.querySelector('#register-role');
  const subroleField = document.querySelector('#register-subrole-field');
  const subrole = document.querySelector('#register-subrole');
  const syncSubrole = () => { const requestedStaff = requestedRole.value === 'staff'; subroleField.hidden = !requestedStaff; subrole.disabled = !requestedStaff; };
  requestedRole.onchange = syncSubrole;
  syncSubrole();
  document.querySelector('#register').onsubmit = async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    if (body.password !== body.confirmPassword) return renderRegister('The passwords do not match.');
    try {
      const { user } = await api('/auth/register', { method: 'POST', body: JSON.stringify(body) });
      renderLogin(`Account created. Your account ID is ${user.id}. Sign in with this ID or your username. Your requested access is pending administrator approval.`, true);
    } catch (error) { renderRegister(error.message); }
  };
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

function navAllowed(item) {
  if (item === 'Staff') return me.role === 'admin';
  if (item === 'Prescriptions') return ['admin', 'doctor'].includes(me.role);
  if (item === 'Invoices') return me.role === 'admin' || isStaff('receptionist', 'billing');
  if (item === 'Patient flow') return ['admin', 'doctor'].includes(me.role) || isStaff('receptionist', 'nurse');
  if (item === 'Doctors' || item === 'Appointments') return !isStaff('billing');
  return true;
}

function render() {
  if (!me) return renderLanding();
  if (me.role === 'pending' || me.approved === false) return renderPendingAccount();
  if (!navAllowed(section)) section = 'Dashboard';
  const links = sections.filter(navAllowed).map(item => `<button class="${section === item ? 'active' : ''}" data-section="${esc(item)}">${item === 'Dashboard' ? '⌂' : '◦'} &nbsp;${esc(item)}</button>`).join('');
  app.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="brand"><b aria-hidden="true">+</b>CarePoint</div>
      <nav class="nav" aria-label="Main navigation">${links}</nav>
      <div class="userbox"><strong>${esc(me.username)}</strong><small>${esc(roleTitle(me))} account</small><button class="btn" id="logout" type="button">Sign out</button></div>
    </aside>
    <main class="main">
      <header class="top"><div><p class="muted" style="margin:0 0 5px">${esc(roleTitle(me))} workspace</p><h1>${esc(section)}</h1></div><div class="top-actions"><button class="theme-toggle" data-theme-toggle type="button">Dark</button><span class="pill">Secure session</span></div></header>
      <div id="content"></div>
    </main>
  </div>`;
  bindThemeToggles();
  document.querySelectorAll('[data-section]').forEach(button => button.onclick = () => { section = button.dataset.section; render(); });
  document.querySelector('#logout').onclick = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } finally { me = null; renderLanding(); }
  };
  if (me.mustChangePassword) return changePassword(true);
  loadSection().catch(error => toast(error.message, true));
}

function changePassword(forced = false) {
  document.querySelector('#content').innerHTML = `<section class="card" style="max-width:560px">
    <h2>${forced ? 'Set your new password' : 'Change password'}</h2>
    <p class="muted">Choose a password with at least 12 characters.</p>
    <form id="pw"><div class="field"><label for="new-password">New password</label><input id="new-password" type="password" name="password" autocomplete="new-password" minlength="12" required></div>
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
  if (section === 'Dashboard') {
    const dashboard = await api('/dashboard');
    const stats = [['Patients', dashboard.patients]];
    if (!isStaff('billing')) stats.push(['Doctors', dashboard.doctors], ['Appointments', dashboard.appointments]);
    if (['admin', 'doctor'].includes(me.role)) stats.push(['Prescriptions', dashboard.prescriptions]);
    if (me.role === 'admin' || isStaff('receptionist', 'billing')) stats.push(['Pending invoices', dashboard.pendingBills]);
    target.innerHTML = `<div class="grid">${stats.map(([label, count]) => `<article class="card stat"><small>${esc(label)}</small><strong>${count}</strong></article>`).join('')}</div>
      <section class="card"><h3>Upcoming appointments</h3>${dashboard.upcoming.length ? table(['Patient', 'Doctor', 'Date', 'Status'], dashboard.upcoming.map(item => [item.patient?.name, item.doctor?.name, new Date(item.date).toLocaleString(), item.status])) : '<div class="empty">No upcoming appointments.</div>'}</section>`;
    return;
  }
  if (section === 'Staff') return staff(target);
  const url = endpoints[section], data = await api('/' + url);
  cache[url] = data;
  renderTable(target, url, data);
}

function table(headings, rows) {
  return `<div class="tablewrap"><table class="table"><thead><tr>${headings.map(item => `<th>${esc(item)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(item => `<td>${esc(item)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function canCreate(key) {
  if (key === 'doctors') return me.role === 'admin';
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
  return false;
}

function canDelete(key) {
  return me.role === 'admin' || (key === 'patients' && isStaff('receptionist', 'records'));
}

function renderTable(target, key, data) {
  const titles = {
    patients: ['Name', 'Age', 'Gender', 'Phone', 'Email'], doctors: ['Name', 'Specialty', 'Phone', 'Email'],
    appointments: ['Patient', 'Doctor', 'Date', 'Status'], prescriptions: ['Patient', 'Doctor', 'Medicine', 'Dosage'],
    invoices: ['Patient', 'Description', 'Amount', 'Status'], visits: ['Patient', 'Doctor', 'Reason', 'Priority', 'Status']
  };
  const rows = data.map(item => {
    const cells = key === 'patients' ? [item.name, item.age, item.gender, item.phone, item.email]
      : key === 'doctors' ? [item.name, item.specialization, item.phone, item.email]
      : key === 'appointments' ? [item.patient?.name, item.doctor?.name, new Date(item.date).toLocaleString(), item.status]
      : key === 'prescriptions' ? [item.patient?.name, item.doctor?.name, item.medicine, item.dosage]
      : key === 'invoices' ? [item.patient?.name, item.description, `$${Number(item.amount).toFixed(2)}`, item.status]
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
  target.querySelectorAll('[data-status]').forEach(select => select.onchange = async () => {
    try { await api(`/${key}/${select.dataset.status}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); toast('Updated.'); }
    catch (error) { toast(error.message, true); }
  });
}

function actions(key, item) {
  const statusOptions = key === 'appointments' ? ['Scheduled', 'Completed', 'Cancelled']
    : key === 'invoices' ? ['Pending', 'Paid']
    : key === 'visits' ? ['Waiting', 'In consultation', 'Completed'] : [];
  return `<div class="actions">${statusOptions.length && canUpdate(key) ? `<select data-status="${esc(item._id)}" aria-label="Update status">${statusOptions.map(value => `<option ${item.status === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select>` : ''}${canDelete(key) ? `<button class="btn danger" data-delete="${esc(item._id)}" type="button">Delete</button>` : ''}</div>`;
}

async function form(key) {
  const needsPatients = ['appointments', 'prescriptions', 'invoices', 'visits'].includes(key);
  const needsDoctors = ['appointments', 'prescriptions', 'visits'].includes(key);
  const [patients, doctors] = await Promise.all([
    needsPatients ? api('/patients') : Promise.resolve([]),
    needsDoctors ? api('/doctors') : Promise.resolve([])
  ]);
  const fields = {
    patients: [['name', 'Patient name', 'text'], ['age', 'Age', 'number'], ['gender', 'Gender', 'select:Female,Male,Other'], ['phone', 'Phone', 'tel'], ['email', 'Email', 'email'], ['address', 'Address', 'text']],
    doctors: [['name', 'Doctor name', 'text'], ['specialization', 'Specialty', 'text'], ['phone', 'Phone', 'tel'], ['email', 'Email', 'email']],
    appointments: [['patient', 'Patient', 'ref:patients'], ['doctor', 'Doctor', 'ref:doctors'], ['date', 'Date and time', 'datetime-local'], ['reason', 'Reason', 'text']],
    prescriptions: [['patient', 'Patient', 'ref:patients'], ['doctor', 'Doctor', 'ref:doctors'], ['medicine', 'Medicine', 'text'], ['dosage', 'Dosage', 'text'], ['instructions', 'Instructions', 'text']],
    invoices: [['patient', 'Patient', 'ref:patients'], ['description', 'Description', 'text'], ['amount', 'Amount', 'number']],
    visits: [['patient', 'Patient', 'ref:patients'], ['doctor', 'Doctor', 'ref:doctors'], ['reason', 'Reason', 'text'], ['priority', 'Priority', 'select:Routine,Urgent']]
  };
  const html = fields[key].map(([name, label, type]) => {
    const control = type.startsWith('select:')
      ? `<select name="${name}" required>${type.slice(7).split(',').map(value => `<option>${esc(value)}</option>`).join('')}</select>`
      : type.startsWith('ref:')
        ? `<select name="${name}" required>${(name === 'patient' ? patients : doctors).map(item => `<option value="${esc(item._id)}">${esc(item.name)}</option>`).join('')}</select>`
        : `<input name="${name}" type="${type}" ${['name', 'age', 'phone', 'specialization', 'patient', 'doctor', 'date', 'reason', 'medicine', 'dosage', 'description', 'amount'].includes(name) ? 'required' : ''} ${name === 'date' ? 'required' : ''} ${name === 'age' ? 'min="0" max="120"' : ''} ${name === 'amount' ? 'min="0" step="0.01"' : ''}>`;
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
    if (body.date) body.date = new Date(body.date).toISOString();
    try { await api('/' + key, { method: 'POST', body: JSON.stringify(body) }); modal.close(); toast('Saved successfully.'); loadSection(); }
    catch (error) { toast(error.message, true); }
  };
}

function staff(target) {
  api('/staff').then(users => {
    target.innerHTML = `<section class="card">
      <div class="toolbar"><div><strong>Team accounts</strong><p class="muted" style="margin:5px 0 0">Review self-registrations and create accounts for your team. Administrator-created users change their temporary password at first sign-in.</p></div><button class="btn primary" id="add-user" type="button">+ Create user</button></div>
      ${users.length ? `<div class="tablewrap"><table class="table"><thead><tr><th>Username</th><th>Account type</th><th>Status</th><th>Action</th></tr></thead><tbody>${users.map(user => `<tr><td>${esc(user.username)}</td><td>${esc(user.role === 'staff' ? `Staff · ${staffTitles[user.subRole] || user.subRole}` : roleTitle(user))}</td><td>${user.active ? 'Active' : 'Disabled'}</td><td><button class="btn" data-user="${esc(user.id)}" type="button">${user.active ? 'Disable' : 'Enable'}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No accounts yet.</div>'}
    </section>`;
    const pendingUsers = users.filter(user => user.role === 'pending');
    if (pendingUsers.length) {
      const queue = document.createElement('section');
      queue.className = 'card pending-queue';
      queue.innerHTML = `<h2>Registration requests <span>${pendingUsers.length}</span></h2><p class="muted">Review a requested role before giving the account access to clinic data.</p><div class="pending-request-list">${pendingUsers.map(user => {
        const requested = user.requestedRole === 'staff' ? `Staff · ${staffTitles[user.requestedSubRole] || 'Staff'}` : 'Doctor';
        return `<article><div><b>${esc(user.displayName || user.username)}</b><small>${esc(user.username)} · Requested ${esc(requested)}</small></div><button class="btn primary" data-review="${esc(user.id)}" type="button">Review</button></article>`;
      }).join('')}</div>`;
      target.prepend(queue);
      queue.querySelectorAll('[data-review]').forEach(button => button.onclick = () => reviewUserDialog(pendingUsers.find(user => user.id === button.dataset.review), target));
    }
    target.querySelectorAll('tbody tr').forEach((row, index) => {
      if (users[index]?.role === 'pending') row.cells[2].textContent = 'Pending approval';
    });
    target.querySelector('#add-user').onclick = () => createUserDialog();
    target.querySelectorAll('[data-user]').forEach(button => button.onclick = async () => {
      const user = users.find(item => item.id === button.dataset.user);
      try { await api('/staff/' + user.id, { method: 'PATCH', body: JSON.stringify({ active: !user.active }) }); toast('Account status updated.'); staff(target); }
      catch (error) { toast(error.message, true); }
    });
  }).catch(error => toast(error.message, true));
}

function reviewUserDialog(user, target) {
  const modal = document.createElement('dialog');
  modal.className = 'card';
  modal.style = 'border:0;border-radius:14px;width:min(580px,94vw);max-height:90vh;overflow:auto';
  modal.innerHTML = `<h2>Review account request</h2><p class="muted">${esc(user.displayName || user.username)} (${esc(user.username)}) requested ${esc(user.requestedRole === 'staff' ? staffTitles[user.requestedSubRole] || 'Staff' : 'Doctor')} access.</p>
    <form id="approve-user"><div class="field"><label for="approve-role">Assign account type</label><select id="approve-role" name="role"><option value="doctor" ${user.requestedRole === 'doctor' ? 'selected' : ''}>Doctor</option><option value="staff" ${user.requestedRole === 'staff' ? 'selected' : ''}>Staff</option></select></div>
    <div class="field" id="approve-subrole-field"><label for="approve-subrole">Staff subrole</label><select id="approve-subrole" name="subRole">${Object.entries(staffTitles).map(([value, label]) => `<option value="${value}" ${user.requestedSubRole === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></div>
    <div class="actions"><button class="btn primary" type="submit">Approve access</button><button class="btn" id="cancel-review" type="button">Cancel</button></div></form>`;
  document.body.append(modal);
  modal.showModal();
  const role = modal.querySelector('#approve-role'), field = modal.querySelector('#approve-subrole-field'), subrole = modal.querySelector('#approve-subrole');
  const sync = () => { const staffAccount = role.value === 'staff'; field.hidden = !staffAccount; subrole.disabled = !staffAccount; };
  role.onchange = sync;
  sync();
  modal.querySelector('#cancel-review').onclick = () => modal.close();
  modal.onclose = () => modal.remove();
  modal.querySelector('#approve-user').onsubmit = async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    body.approved = true;
    try {
      await api('/staff/' + user.id, { method: 'PATCH', body: JSON.stringify(body) });
      modal.close();
      toast('Account approved. The user can refresh their approval status.');
      staff(target);
    } catch (error) { toast(error.message, true); }
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
      <div class="field wide" id="subrole-field" hidden><label for="new-subrole">Staff subrole</label><select id="new-subrole" name="subRole"><option value="receptionist">Receptionist</option><option value="nurse">Nurse</option><option value="billing">Billing staff</option><option value="records">Medical records staff</option></select></div>
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

api('/auth/me').then(({ user }) => { me = user; renderLanding(); }).catch(() => { me = null; renderLanding(); });
