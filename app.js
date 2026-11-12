'use strict';

// ── State & Storage ────────────────────────────────────────

const DEFAULT_USERS = [
  { name: 'Vishnu Teja', email: 'vishnuteja@cvr.ac.in', password: 'cvr2024', course: 'Computer Science & Engineering', cgpa: '8.4', attendance: '88%' },
  { name: 'Rahul Reddy', email: 'rahul@cvr.ac.in',      password: 'cvr2024', course: 'Electronics & Communication Engg', cgpa: '8.1', attendance: '85%' },
];

function getStored(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setStored(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
}

const users = getStored('cvr_v2_users', DEFAULT_USERS);
let currentUser = getStored('cvr_v2_current_user', null);

let _announcements = getStored('cvr_v2_announcements', null);
let _courses       = getStored('cvr_v2_courses', null);
let _timetable     = getStored('cvr_v2_timetable', null);
let _blogPosts     = getStored('cvr_v2_blog', null);

let editMode = getStored('cvr_v2_edit_mode', false) === true;
let currentSection = 'login';

let _announcementEditId = null;
let _currentDeptFilter  = 'All';
let _courseEditCode     = null;
let _blogEditId         = null;

// ── Utilities ──────────────────────────────────────────────

function $(id) { return document.getElementById(id); }
function app()  { return $('app'); }

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function delay(ms = 350) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showFeedback(msg, type = 'success') {
  const alertEl = $('section-feedback');
  if (alertEl) {
    alertEl.innerHTML = `
      <div class="alert alert-${type}">
        <span>${msg}</span>
        <button type="button" style="background:none;border:none;cursor:pointer;font-weight:700;" onclick="this.parentElement.remove()">✕</button>
      </div>`;
  }
}

function updateEditModeButton() {
  const btn = $('edit-mode-btn');
  if (!btn) return;
  btn.textContent = editMode ? '✏️ Edit Mode: ON' : '✏️ Edit Mode: OFF';
  btn.classList.toggle('active', editMode);
  btn.setAttribute('aria-pressed', String(editMode));
}

async function toggleEditMode() {
  editMode = !editMode;
  setStored('cvr_v2_edit_mode', editMode);
  updateEditModeButton();

  if (!editMode) {
    closeModal();
    _announcementEditId = null;
    _courseEditCode = null;
    _blogEditId = null;
  }

  if (currentSection === 'courses') {
    await renderCourses(_currentDeptFilter);
  } else {
    await show(currentSection);
  }
}

function show(section) {
  closeModal();
  currentSection = section;
  if (currentUser && ['dashboard', 'announcements', 'courses', 'timetable', 'blog'].includes(section)) {
    setStored('cvr_v2_section', section);
  }
  const map = {
    login:         renderLogin,
    register:      renderRegister,
    dashboard:     renderDashboard,
    announcements: renderAnnouncements,
    courses:       () => renderCourses(_currentDeptFilter || 'All'),
    timetable:     renderTimetable,
    blog:          renderBlog,
  };
  if (map[section]) return map[section]();
}

// ── Auth helpers ───────────────────────────────────────────

function loginUser(user) {
  currentUser = user;
  setStored('cvr_v2_current_user', user);
  $('nav-links').style.display = 'none';
  $('nav-user').style.display  = 'flex';
  $('username-display').textContent = user.name;
  updateEditModeButton();
}

function logout() {
  currentUser = null;
  editMode = false;
  setStored('cvr_v2_edit_mode', false);
  localStorage.removeItem('cvr_v2_current_user');
  localStorage.removeItem('cvr_v2_section');
  updateEditModeButton();
  $('nav-links').style.display = 'flex';
  $('nav-user').style.display  = 'none';
  show('login');
}

// ── Modal Helper ───────────────────────────────────────────

function openModal(title, bodyHTML) {
  const root = $('modal-root');
  root.innerHTML = `
    <div class="modal-overlay" onclick="if(event.target === this) closeModal()">
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button type="button" class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
      </div>
    </div>`;
}

function closeModal() {
  const root = $('modal-root');
  if (root) root.innerHTML = '';
}

// ── Reset to Defaults ──────────────────────────────────────

function resetAllData() {
  if (!confirm('Reset all notices, courses, timetable, and blog posts to defaults?')) return;
  localStorage.removeItem('cvr_v2_announcements');
  localStorage.removeItem('cvr_v2_courses');
  localStorage.removeItem('cvr_v2_timetable');
  localStorage.removeItem('cvr_v2_blog');
  _announcements = null;
  _courses = null;
  _timetable = null;
  _blogPosts = null;
  renderDashboard();
  showFeedback('All data reset to defaults.', 'success');
}

// ── Section: Login ─────────────────────────────────────────

function renderLogin() {
  currentSection = 'login';
  app().innerHTML = `
    <div class="card" style="max-width:420px;margin:0 auto">
      <div class="form-title">Student Login</div>
      <div class="form-sub">CVR College of Engineering</div>
      <div id="msg"></div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="email" placeholder="vishnuteja@cvr.ac.in" />
        <div class="error-msg" id="err-email"></div>
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="pass" placeholder="••••••••" />
        <div class="error-msg" id="err-pass"></div>
      </div>
      <button type="button" class="btn btn-primary btn-block" id="login-btn" onclick="doLogin()">Sign In</button>
      <p style="text-align:center;margin-top:14px;font-size:.85rem;color:#666">
        No account? <button type="button" class="btn-link" onclick="show('register')">Register</button>
      </p>
      <p style="text-align:center;margin-top:10px;font-size:.76rem;color:#888">
        Demo: <strong>vishnuteja@cvr.ac.in</strong> / <strong>cvr2024</strong>
      </p>
    </div>`;
}

async function doLogin() {
  const email = $('email').value.trim();
  const pass  = $('pass').value;
  $('err-email').textContent = '';
  $('err-pass').textContent  = '';

  if (!email) { $('err-email').textContent = 'Required'; return; }
  if (!pass)  { $('err-pass').textContent  = 'Required'; return; }

  const btn = $('login-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  await delay(400);

  const user = users.find(u => u.email === email && u.password === pass);
  if (user) {
    loginUser(user);
    show('dashboard');
  } else {
    $('msg').innerHTML = '<div class="alert alert-error">Invalid email or password.</div>';
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

// ── Section: Register ──────────────────────────────────────

function renderRegister() {
  currentSection = 'register';
  app().innerHTML = `
    <div class="card" style="max-width:420px;margin:0 auto">
      <div class="form-title">Create Account</div>
      <div class="form-sub">CVR College of Engineering</div>
      <div id="msg"></div>
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" id="reg-name" placeholder="Vishnu Teja" />
        <div class="error-msg" id="err-name"></div>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="reg-email" placeholder="rollno@cvr.ac.in" />
        <div class="error-msg" id="err-email"></div>
      </div>
      <div class="form-group">
        <label>Branch / Department</label>
        <select id="reg-course">
          <option value="">Select Branch</option>
          <option>Computer Science & Engineering</option>
          <option>CSE (Artificial Intelligence & ML)</option>
          <option>CSE (Data Science)</option>
          <option>Electronics & Communication Engg</option>
          <option>Electrical & Electronics Engg</option>
          <option>Mechanical Engineering</option>
          <option>Civil Engineering</option>
          <option>Information Technology</option>
        </select>
        <div class="error-msg" id="err-course"></div>
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="reg-pass" placeholder="Min 8 characters" />
        <div class="error-msg" id="err-pass"></div>
      </div>
      <button type="button" class="btn btn-primary btn-block" id="reg-btn" onclick="doRegister()">Create Account</button>
      <p style="text-align:center;margin-top:14px;font-size:.85rem;color:#666">
        Already registered? <button type="button" class="btn-link" onclick="show('login')">Login</button>
      </p>
    </div>`;
}

async function doRegister() {
  const name   = $('reg-name').value.trim();
  const email  = $('reg-email').value.trim();
  const course = $('reg-course').value;
  const pass   = $('reg-pass').value;
  let ok = true;

  ['err-name','err-email','err-course','err-pass'].forEach(id => $(id).textContent = '');

  if (!name)                          { $('err-name').textContent   = 'Required'; ok = false; }
  if (!email || !email.includes('@')) { $('err-email').textContent  = 'Valid email required'; ok = false; }
  if (!course)                        { $('err-course').textContent = 'Select a branch'; ok = false; }
  if (pass.length < 8)                { $('err-pass').textContent   = 'Min 8 characters'; ok = false; }
  if (!ok) return;

  if (users.find(u => u.email === email)) {
    $('err-email').textContent = 'Email already registered';
    return;
  }

  const btn = $('reg-btn');
  btn.disabled = true;
  btn.textContent = 'Creating account…';

  await delay(500);

  const newUser = { name, email, password: pass, course, cgpa: '8.0', attendance: '85%' };
  users.push(newUser);
  setStored('cvr_v2_users', users);
  loginUser(newUser);
  show('dashboard');
}

// ── Section: Dashboard & Profile Editing ───────────────────

function renderDashboard() {
  currentSection = 'dashboard';
  const u = currentUser;
  const courseCount = _courses ? _courses.length : 3;
  const noticeCount = _announcements ? _announcements.length : 2;

  app().innerHTML = `
    <div id="section-feedback"></div>
    <div class="card">
      <div class="section-header">
        <div>
          <h2>Welcome, ${escapeHtml(u.name)} 👋</h2>
          <p style="color:#666;font-size:.88rem;margin-top:4px;">${escapeHtml(u.course)} · CVR College of Engineering, Ibrahimpatnam</p>
        </div>
        ${editMode ? `<button type="button" class="btn btn-outline btn-sm" onclick="openProfileModal()">✏️ Edit Profile</button>` : ''}
      </div>

      <div class="stats">
        <div class="stat"><div class="stat-val">${courseCount}</div><div class="stat-lbl">Courses</div></div>
        <div class="stat"><div class="stat-val">${noticeCount}</div><div class="stat-lbl">Notices</div></div>
        <div class="stat"><div class="stat-val">${escapeHtml(u.attendance || '88%')}</div><div class="stat-lbl">Attendance</div></div>
        <div class="stat"><div class="stat-val">${escapeHtml(u.cgpa || '8.4')}</div><div class="stat-lbl">CGPA</div></div>
      </div>

      <p style="font-size:.85rem;color:#777;">
        ${editMode
          ? 'Edit Mode is ON — you can add, edit, or delete content across all sections.'
          : 'Use the navbar to view Notices, Courses, Timetable, and Blog. Turn on <strong>Edit Mode</strong> in the navbar to make changes.'}
      </p>

      ${editMode ? `
        <div style="margin-top:16px; text-align:right;">
          <button type="button" class="btn-link" style="color:#888; font-size:.78rem;" onclick="resetAllData()">↺ Reset all data to defaults</button>
        </div>
      ` : ''}
    </div>`;
}

function openProfileModal() {
  if (!editMode) return;
  const u = currentUser;
  const body = `
    <div class="form-group">
      <label>Full Name</label>
      <input type="text" id="prof-name" value="${escapeAttr(u.name)}" />
    </div>
    <div class="form-group">
      <label>Branch / Department</label>
      <input type="text" id="prof-course" value="${escapeAttr(u.course)}" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Current CGPA</label>
        <input type="text" id="prof-cgpa" value="${escapeAttr(u.cgpa || '8.4')}" />
      </div>
      <div class="form-group">
        <label>Attendance (%)</label>
        <input type="text" id="prof-att" value="${escapeAttr(u.attendance || '88%')}" />
      </div>
    </div>
    <div class="btn-group">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn btn-primary" id="save-prof-btn" onclick="saveProfile()">Save Profile</button>
    </div>`;
  openModal('Edit Student Profile', body);
}

async function saveProfile() {
  const btn = $('save-prof-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  await delay(300);

  currentUser.name       = $('prof-name').value.trim() || currentUser.name;
  currentUser.course     = $('prof-course').value.trim() || currentUser.course;
  currentUser.cgpa       = $('prof-cgpa').value.trim() || currentUser.cgpa;
  currentUser.attendance = $('prof-att').value.trim() || currentUser.attendance;

  const userIdx = users.findIndex(u => u.email === currentUser.email);
  if (userIdx !== -1) {
    users[userIdx] = { ...users[userIdx], ...currentUser };
    setStored('cvr_v2_users', users);
  }

  setStored('cvr_v2_current_user', currentUser);
  $('username-display').textContent = currentUser.name;

  closeModal();
  renderDashboard();
  showFeedback('Profile updated.', 'success');
}

// ── Section: Announcements ─────────────────────────────────

async function loadAnnouncements() {
  if (!_announcements) {
    const data = await fetchJSON('data/announcements.json');
    _announcements = data.announcements;
    setStored('cvr_v2_announcements', _announcements);
  }
  return _announcements;
}

async function renderAnnouncements() {
  currentSection = 'announcements';
  if (!_announcements) {
    app().innerHTML = '<div class="spinner">Loading notices…</div>';
  }

  try {
    const list = await loadAnnouncements();

    app().innerHTML = `
      <div id="section-feedback"></div>
      <div class="section-header">
        <h2>📢 Announcements</h2>
        ${editMode ? `<button type="button" class="btn btn-primary btn-sm" onclick="toggleAnnouncementEditor()">+ Post Notice</button>` : ''}
      </div>

      ${editMode ? `<div id="announcement-editor-wrap" style="display:none;"></div>` : ''}

      <div id="announcements-list">
        ${renderAnnouncementCards(list)}
      </div>`;

  } catch (e) {
    app().innerHTML = `<div class="alert alert-error">Failed to load: ${e.message}</div>`;
  }
}

function renderAnnouncementCards(list) {
  if (!list || list.length === 0) {
    return `<div class="card" style="text-align:center;color:#888;">No announcements found.</div>`;
  }
  return list.map(a => `
    <div class="card" id="ann-card-${a.id}">
      <div>
        <span class="tag ${tagClass(a.category)}">${escapeHtml(a.category)}</span>
        ${a.important ? '<span class="tag tag-red">Important</span>' : ''}
      </div>
      <div class="notice-title">${escapeHtml(a.title)}</div>
      <div class="notice-meta">📅 ${escapeHtml(a.date)} · 👤 ${escapeHtml(a.author)}</div>
      <div class="notice-body">${escapeHtml(a.body)}</div>
      ${editMode ? `
        <div class="card-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="editAnnouncement(${a.id})">✏️ Edit</button>
          <button type="button" class="btn btn-danger-outline btn-sm" onclick="deleteAnnouncement(${a.id})">🗑 Delete</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function toggleAnnouncementEditor(prefill = null) {
  if (!editMode) return;
  const wrap = $('announcement-editor-wrap');
  if (!wrap) return;

  if (wrap.style.display === 'block' && !prefill && _announcementEditId === null) {
    wrap.style.display = 'none';
    return;
  }

  _announcementEditId = prefill ? prefill.id : null;
  const isEditing = !!prefill;

  wrap.innerHTML = `
    <div class="editor-card">
      <div class="editor-header">
        <div class="editor-title">${isEditing ? '✏️ Edit Notice' : '✍️ Post New Notice'}</div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="closeAnnouncementEditor()">Cancel</button>
      </div>
      <div class="form-group">
        <label>Notice Title</label>
        <input type="text" id="ann-title" placeholder="e.g. Lab External Schedule" value="${isEditing ? escapeAttr(prefill.title) : ''}" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Category</label>
          <select id="ann-cat">
            <option ${isEditing && prefill.category === 'Academic' ? 'selected' : ''}>Academic</option>
            <option ${isEditing && prefill.category === 'Event' ? 'selected' : ''}>Event</option>
            <option ${isEditing && prefill.category === 'Exam' ? 'selected' : ''}>Exam</option>
            <option ${isEditing && prefill.category === 'Holiday' ? 'selected' : ''}>Holiday</option>
            <option ${isEditing && prefill.category === 'General' ? 'selected' : ''}>General</option>
          </select>
        </div>
        <div class="form-group">
          <label>Author / Office</label>
          <input type="text" id="ann-author" value="${isEditing ? escapeAttr(prefill.author) : (currentUser ? escapeAttr(currentUser.name) : 'CVRCE')}" />
        </div>
      </div>
      <div class="form-group">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="ann-imp" style="width:auto;" ${isEditing && prefill.important ? 'checked' : ''} />
          Mark as Important
        </label>
      </div>
      <div class="form-group">
        <label>Content</label>
        <textarea id="ann-body" placeholder="Write notice details...">${isEditing ? escapeHtml(prefill.body) : ''}</textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn btn-secondary" onclick="closeAnnouncementEditor()">Cancel</button>
        <button type="button" class="btn btn-primary" id="save-ann-btn" onclick="saveAnnouncement()">${isEditing ? 'Save Changes' : 'Post Notice'}</button>
      </div>
    </div>`;

  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeAnnouncementEditor() {
  _announcementEditId = null;
  const wrap = $('announcement-editor-wrap');
  if (wrap) wrap.style.display = 'none';
}

function editAnnouncement(id) {
  const item = _announcements.find(a => a.id === id);
  if (!item) return;
  toggleAnnouncementEditor(item);
}

async function saveAnnouncement() {
  const title  = $('ann-title').value.trim();
  const cat    = $('ann-cat').value;
  const author = $('ann-author').value.trim();
  const imp    = $('ann-imp').checked;
  const body   = $('ann-body').value.trim();

  if (!title) { alert('Please enter a title.'); return; }
  if (!body)  { alert('Please enter notice content.'); return; }

  const btn = $('save-ann-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  await delay(300);

  const todayStr = new Date().toISOString().slice(0, 10);

  if (_announcementEditId) {
    const idx = _announcements.findIndex(a => a.id === _announcementEditId);
    if (idx !== -1) {
      _announcements[idx] = {
        ..._announcements[idx],
        title,
        category: cat,
        author: author || 'CVRCE',
        important: imp,
        body,
      };
      setStored('cvr_v2_announcements', _announcements);
      showFeedback('Notice updated.', 'success');
    }
  } else {
    const newId = _announcements.length ? Math.max(..._announcements.map(a => a.id)) + 1 : 1;
    _announcements.unshift({
      id: newId,
      title,
      category: cat,
      author: author || (currentUser ? currentUser.name : 'CVRCE'),
      date: todayStr,
      important: imp,
      body,
    });
    setStored('cvr_v2_announcements', _announcements);
    showFeedback('Notice posted.', 'success');
  }

  closeAnnouncementEditor();
  $('announcements-list').innerHTML = renderAnnouncementCards(_announcements);
}

async function deleteAnnouncement(id) {
  if (!confirm('Delete this notice?')) return;

  const card = $(`ann-card-${id}`);
  if (card) card.style.opacity = '0.5';

  await delay(200);

  _announcements = _announcements.filter(a => a.id !== id);
  setStored('cvr_v2_announcements', _announcements);
  if (_announcementEditId === id) closeAnnouncementEditor();
  $('announcements-list').innerHTML = renderAnnouncementCards(_announcements);
  showFeedback('Notice deleted.', 'success');
}

// ── Section: Courses ───────────────────────────────────────

async function loadCourses() {
  if (!_courses) {
    const data = await fetchJSON('data/courses.json');
    _courses = data.courses;
    setStored('cvr_v2_courses', _courses);
  }
  return _courses;
}

async function renderCourses(filter = 'All') {
  currentSection = 'courses';
  _currentDeptFilter = filter;
  if (!_courses) {
    app().innerHTML = '<div class="spinner">Loading courses…</div>';
  }

  try {
    const list = await loadCourses();
    const depts = ['All', ...new Set(list.map(c => c.department))];
    if (!depts.includes(_currentDeptFilter)) _currentDeptFilter = 'All';
    const filtered = _currentDeptFilter === 'All' ? list : list.filter(c => c.department === _currentDeptFilter);

    app().innerHTML = `
      <div id="section-feedback"></div>
      <div class="section-header">
        <h2>📚 Courses</h2>
        ${editMode ? `<button type="button" class="btn btn-primary btn-sm" onclick="toggleCourseEditor()">+ Add Course</button>` : ''}
      </div>

      ${editMode ? `<div id="course-editor-wrap" style="display:none;"></div>` : ''}

      <div class="filters">
        ${depts.map(d => `<button type="button" class="f-btn ${d === _currentDeptFilter ? 'active' : ''}" onclick="renderCourses('${escapeAttr(d)}')">${escapeHtml(d)}</button>`).join('')}
      </div>

      <div class="grid" id="courses-grid">
        ${renderCourseCards(filtered)}
      </div>`;

  } catch (e) {
    app().innerHTML = `<div class="alert alert-error">Failed to load: ${e.message}</div>`;
  }
}

function renderCourseCards(list) {
  if (!list || list.length === 0) {
    return `<div class="card" style="grid-column: 1/-1; text-align:center; color:#888;">No courses found.</div>`;
  }
  return list.map(c => `
    <div class="card" id="course-card-${escapeAttr(c.code)}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div class="course-code">${escapeHtml(c.code)}</div>
        <span class="tag tag-gray">${escapeHtml(c.department)}</span>
      </div>
      <div class="course-name">${escapeHtml(c.name)}</div>
      <div class="course-info">👨‍🏫 ${escapeHtml(c.instructor)} · <strong>${c.credits} credits</strong></div>
      <p class="course-desc">${escapeHtml(c.description)}</p>
      ${editMode ? `
        <div class="card-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="editCourse('${escapeJs(c.code)}')">✏️ Edit</button>
          <button type="button" class="btn btn-danger-outline btn-sm" onclick="deleteCourse('${escapeJs(c.code)}')">🗑 Delete</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function toggleCourseEditor(prefill = null) {
  if (!editMode) return;
  const wrap = $('course-editor-wrap');
  if (!wrap) return;

  if (wrap.style.display === 'block' && !prefill && _courseEditCode === null) {
    wrap.style.display = 'none';
    return;
  }

  _courseEditCode = prefill ? prefill.code : null;
  const isEditing = !!prefill;

  wrap.innerHTML = `
    <div class="editor-card">
      <div class="editor-header">
        <div class="editor-title">${isEditing ? `✏️ Edit Course (${escapeHtml(prefill.code)})` : '➕ Add New Course'}</div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="closeCourseEditor()">Cancel</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Course Code</label>
          <input type="text" id="crs-code" placeholder="e.g. 22CS305PC" value="${isEditing ? escapeAttr(prefill.code) : ''}" ${isEditing ? 'disabled' : ''} />
        </div>
        <div class="form-group">
          <label>Course Name</label>
          <input type="text" id="crs-name" placeholder="e.g. Cloud Computing" value="${isEditing ? escapeAttr(prefill.name) : ''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Department</label>
          <select id="crs-dept">
            <option ${isEditing && prefill.department === 'CSE' ? 'selected' : ''}>CSE</option>
            <option ${isEditing && prefill.department === 'AIML' ? 'selected' : ''}>AIML</option>
            <option ${isEditing && prefill.department === 'DS' ? 'selected' : ''}>DS</option>
            <option ${isEditing && prefill.department === 'ECE' ? 'selected' : ''}>ECE</option>
            <option ${isEditing && prefill.department === 'EEE' ? 'selected' : ''}>EEE</option>
            <option ${isEditing && prefill.department === 'Mechanical' ? 'selected' : ''}>Mechanical</option>
            <option ${isEditing && prefill.department === 'Civil' ? 'selected' : ''}>Civil</option>
          </select>
        </div>
        <div class="form-group">
          <label>Instructor</label>
          <input type="text" id="crs-inst" placeholder="e.g. Dr. K. Srinivas" value="${isEditing ? escapeAttr(prefill.instructor) : ''}" />
        </div>
        <div class="form-group">
          <label>Credits</label>
          <select id="crs-cred">
            <option ${isEditing && prefill.credits == 1 ? 'selected' : ''}>1</option>
            <option ${isEditing && prefill.credits == 2 ? 'selected' : ''}>2</option>
            <option ${isEditing && prefill.credits == 3 ? 'selected' : ''} ${!isEditing ? 'selected' : ''}>3</option>
            <option ${isEditing && prefill.credits == 4 ? 'selected' : ''}>4</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="crs-desc" placeholder="Syllabus summary...">${isEditing ? escapeHtml(prefill.description) : ''}</textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn btn-secondary" onclick="closeCourseEditor()">Cancel</button>
        <button type="button" class="btn btn-primary" id="save-crs-btn" onclick="saveCourse()">${isEditing ? 'Save Changes' : 'Add Course'}</button>
      </div>
    </div>`;

  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeCourseEditor() {
  _courseEditCode = null;
  const wrap = $('course-editor-wrap');
  if (wrap) wrap.style.display = 'none';
}

function editCourse(code) {
  const item = _courses.find(c => c.code === code);
  if (!item) return;
  toggleCourseEditor(item);
}

async function saveCourse() {
  const code  = $('crs-code').value.trim().toUpperCase();
  const name  = $('crs-name').value.trim();
  const dept  = $('crs-dept').value;
  const inst  = $('crs-inst').value.trim();
  const cred  = parseInt($('crs-cred').value, 10) || 3;
  const desc  = $('crs-desc').value.trim();

  if (!code) { alert('Course Code required'); return; }
  if (!name) { alert('Course Name required.'); return; }
  if (!inst) { alert('Instructor required.'); return; }

  const btn = $('save-crs-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  await delay(300);

  if (_courseEditCode) {
    const idx = _courses.findIndex(c => c.code === _courseEditCode);
    if (idx !== -1) {
      _courses[idx] = {
        ..._courses[idx],
        name,
        department: dept,
        instructor: inst,
        credits: cred,
        description: desc || 'Course lectures and labs.',
      };
      setStored('cvr_v2_courses', _courses);
    }
    _courseEditCode = null;
    await renderCourses(_currentDeptFilter);
    showFeedback('Course updated.', 'success');
  } else {
    if (_courses.find(c => c.code === code)) {
      alert(`Course code ${code} already exists!`);
      btn.disabled = false;
      btn.textContent = 'Add Course';
      return;
    }
    _courses.unshift({
      code,
      name,
      department: dept,
      instructor: inst,
      credits: cred,
      description: desc || 'Course lectures and labs.',
    });
    setStored('cvr_v2_courses', _courses);
    _courseEditCode = null;
    if (_currentDeptFilter !== 'All' && _currentDeptFilter !== dept) {
      _currentDeptFilter = 'All';
    }
    await renderCourses(_currentDeptFilter);
    showFeedback('Course added.', 'success');
  }
}

async function deleteCourse(code) {
  if (!confirm(`Delete course ${code}?`)) return;

  const card = $(`course-card-${code}`);
  if (card) card.style.opacity = '0.5';

  await delay(200);

  _courses = _courses.filter(c => c.code !== code);
  setStored('cvr_v2_courses', _courses);
  if (_courseEditCode === code) _courseEditCode = null;
  await renderCourses(_currentDeptFilter);
  showFeedback('Course deleted.', 'success');
}

// ── Section: Timetable ─────────────────────────────────────

async function loadTimetable() {
  if (!_timetable) {
    const data = await fetchJSON('data/timetable.json');
    _timetable = data;
    setStored('cvr_v2_timetable', _timetable);
  }
  return _timetable;
}

async function renderTimetable() {
  currentSection = 'timetable';
  if (!_timetable) {
    app().innerHTML = '<div class="spinner">Loading timetable…</div>';
  }

  try {
    const data  = await loadTimetable();
    const today = new Date().getDay() - 1; // 0=Mon, 5=Sat

    const headers = data.days.map((d, i) =>
      `<th class="${i === today ? 'today-col' : ''}">${escapeHtml(d)}${i === today ? ' ★' : ''}</th>`
    ).join('');

    const rows = data.periods.map(p => {
      const cells = data.days.map((d, i) => {
        const slot = data.grid[d]?.[p];
        const clickAttr = editMode ? `onclick="openSlotModal('${escapeJs(d)}', '${escapeJs(p)}')" title="Click to edit slot"` : '';
        const cellClass = `${i === today ? 'today-col' : ''} ${editMode ? 'slot-cell' : ''}`;

        if (!slot) {
          return `
            <td class="${cellClass} free" ${clickAttr}>
              — ${editMode ? '<span class="click-hint">+ edit</span>' : ''}
            </td>`;
        }
        return `
          <td class="${cellClass}" ${clickAttr}>
            <div class="cls-name">${escapeHtml(slot.subject)}</div>
            <div class="cls-room">${escapeHtml(slot.room)}</div>
            ${editMode ? '<span class="click-hint">✏️ edit</span>' : ''}
          </td>`;
      }).join('');
      return `<tr><td class="period-col">${escapeHtml(p)}</td>${cells}</tr>`;
    }).join('');

    app().innerHTML = `
      <div id="section-feedback"></div>
      <div class="section-header">
        <div>
          <h2>🗓 Weekly Schedule</h2>
          ${editMode ? `<p style="font-size:.82rem; color:#666; margin-top:2px;">Click on any cell in the table to edit a class slot.</p>` : ''}
        </div>
        ${editMode ? `<button type="button" class="btn btn-outline btn-sm" onclick="openSlotModal('Monday', '${escapeJs(data.periods[0])}')">✏️ Edit Slot</button>` : ''}
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="timetable">
            <thead><tr><th>Period</th>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;

  } catch (e) {
    app().innerHTML = `<div class="alert alert-error">Failed to load: ${e.message}</div>`;
  }
}

function openSlotModal(day, period) {
  if (!editMode) return;
  const currentSlot = _timetable?.grid?.[day]?.[period];
  const subjectVal  = currentSlot ? currentSlot.subject : '';
  const roomVal     = currentSlot ? currentSlot.room : '';

  const dayOptions = (_timetable?.days || ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"])
    .map(d => `<option ${d === day ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('');

  const periodOptions = (_timetable?.periods || ["9:10–10:10 AM","10:10–11:10 AM","11:20–12:20 PM","12:20–1:10 PM","1:50–2:50 PM","2:50–3:50 PM"])
    .map(p => `<option ${p === period ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');

  const body = `
    <div class="form-row">
      <div class="form-group">
        <label>Day</label>
        <select id="slot-day" onchange="syncSlotInputs()">${dayOptions}</select>
      </div>
      <div class="form-group">
        <label>Period / Time</label>
        <select id="slot-period" onchange="syncSlotInputs()">${periodOptions}</select>
      </div>
    </div>
    <div class="form-group">
      <label>Subject / Activity</label>
      <input type="text" id="slot-subject" placeholder="e.g. Web Tech Lab" value="${escapeAttr(subjectVal)}" />
    </div>
    <div class="form-group">
      <label>Room / Lab</label>
      <input type="text" id="slot-room" placeholder="e.g. CB-304" value="${escapeAttr(roomVal)}" />
    </div>
    <div class="btn-group">
      <button type="button" class="btn btn-secondary" onclick="clearCurrentSlot()">Clear Slot</button>
      <button type="button" class="btn btn-primary" id="save-slot-btn" onclick="saveSlot()">Save Slot</button>
    </div>`;

  openModal('Edit Schedule Slot', body);
}

function syncSlotInputs() {
  const day    = $('slot-day')?.value;
  const period = $('slot-period')?.value;
  const slot   = _timetable?.grid?.[day]?.[period];
  if ($('slot-subject')) $('slot-subject').value = slot ? slot.subject : '';
  if ($('slot-room'))    $('slot-room').value    = slot ? slot.room : '';
}

function clearCurrentSlot() {
  $('slot-subject').value = '';
  $('slot-room').value = '';
  saveSlot();
}

async function saveSlot() {
  const day    = $('slot-day').value;
  const period = $('slot-period').value;
  const subj   = $('slot-subject').value.trim();
  const room   = $('slot-room').value.trim();

  const btn = $('save-slot-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving…';
  }

  await delay(250);

  if (!_timetable.grid[day]) _timetable.grid[day] = {};

  if (subj) {
    _timetable.grid[day][period] = {
      subject: subj,
      room: room || 'CB-304',
    };
  } else {
    _timetable.grid[day][period] = null;
  }

  setStored('cvr_v2_timetable', _timetable);
  closeModal();
  await renderTimetable();
  showFeedback(`Schedule updated (${day}, ${period}).`, 'success');
}

// ── Section: Blog ──────────────────────────────────────────

async function loadBlog() {
  if (!_blogPosts) {
    const data = await fetchJSON('data/blog.json');
    _blogPosts = data.posts;
    setStored('cvr_v2_blog', _blogPosts);
  }
  return _blogPosts;
}

async function renderBlog() {
  currentSection = 'blog';
  if (!_blogPosts) {
    app().innerHTML = '<div class="spinner">Loading blog posts…</div>';
  }

  try {
    const posts = await loadBlog();

    app().innerHTML = `
      <div id="section-feedback"></div>
      <div class="section-header">
        <h2>✍️ College Blog</h2>
        ${editMode ? `<button type="button" class="btn btn-primary btn-sm" onclick="toggleBlogEditor()">+ Write Story</button>` : ''}
      </div>

      ${editMode ? `<div id="blog-editor-wrap" style="display:none;"></div>` : ''}

      <div id="blog-list">
        ${renderBlogCards(posts)}
      </div>`;

  } catch (e) {
    app().innerHTML = `<div class="alert alert-error">Failed to load: ${e.message}</div>`;
  }
}

function renderBlogCards(posts) {
  if (!posts || posts.length === 0) {
    return `<div class="card" style="text-align:center; color:#888;">No blog posts available.</div>`;
  }
  return posts.map(p => `
    <div class="card" id="blog-card-${p.id}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
        <div class="blog-title">${escapeHtml(p.title)}</div>
        <span class="tag ${tagClass(p.category)}">${escapeHtml(p.category)}</span>
      </div>
      <div class="blog-meta">✍️ <strong>${escapeHtml(p.author)}</strong> · 📅 ${escapeHtml(p.date)} · 👁 ${p.views || 100} views</div>
      <p class="blog-excerpt">${escapeHtml(p.excerpt)}</p>
      <div style="margin-top:6px;">${(p.tags || []).map(t => `<span class="tag tag-gray">#${escapeHtml(t)}</span>`).join('')}</div>
      <div class="blog-full" id="bf-${p.id}">${p.full}</div>
      <div class="blog-footer">
        <button type="button" class="read-btn" onclick="togglePost(${p.id}, this)">Read more ↓</button>
        ${editMode ? `
          <div class="card-actions" style="margin-top:0; padding-top:0; border-top:none;">
            <button type="button" class="btn btn-outline btn-sm" onclick="editBlogPost(${p.id})">✏️ Edit</button>
            <button type="button" class="btn btn-danger-outline btn-sm" onclick="deleteBlogPost(${p.id})">🗑 Delete</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function togglePost(id, btn) {
  const el = $(`bf-${id}`);
  if (!el) return;
  const open = el.classList.toggle('open');
  btn.textContent = open ? 'Collapse ↑' : 'Read more ↓';
}

function toggleBlogEditor(prefill = null) {
  if (!editMode) return;
  const wrap = $('blog-editor-wrap');
  if (!wrap) return;

  if (wrap.style.display === 'block' && !prefill && _blogEditId === null) {
    wrap.style.display = 'none';
    return;
  }

  _blogEditId = prefill ? prefill.id : null;
  const isEditing = !!prefill;

  wrap.innerHTML = `
    <div class="editor-card">
      <div class="editor-header">
        <div class="editor-title">${isEditing ? '✏️ Edit Story' : '✍️ Write New Story'}</div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="closeBlogEditor()">Cancel</button>
      </div>
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="post-title" placeholder="Article title" value="${isEditing ? escapeAttr(prefill.title) : ''}" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Category</label>
          <select id="post-cat">
            <option ${isEditing && prefill.category === 'Academic' ? 'selected' : ''}>Academic</option>
            <option ${isEditing && prefill.category === 'Event' ? 'selected' : ''}>Event</option>
            <option ${isEditing && prefill.category === 'General' ? 'selected' : ''}>General</option>
            <option ${isEditing && prefill.category === 'Club' ? 'selected' : ''}>Club</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tags (comma separated)</label>
          <input type="text" id="post-tags" value="${isEditing ? escapeAttr((prefill.tags || []).join(', ')) : 'Campus, Coding'}" />
        </div>
      </div>
      <div class="form-group">
        <label>Summary</label>
        <input type="text" id="post-excerpt" placeholder="Short preview" value="${isEditing ? escapeAttr(prefill.excerpt) : ''}" />
      </div>
      <div class="form-group">
        <label>Full Content</label>
        <textarea id="post-body" style="min-height:110px;" placeholder="Write your story...">${isEditing ? escapeHtml(htmlToPlainText(prefill.full)) : ''}</textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button type="button" class="btn btn-secondary" onclick="closeBlogEditor()">Cancel</button>
        <button type="button" class="btn btn-primary" id="save-post-btn" onclick="saveBlogPost()">${isEditing ? 'Save Changes' : 'Publish Story'}</button>
      </div>
    </div>`;

  wrap.style.display = 'block';
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeBlogEditor() {
  _blogEditId = null;
  const wrap = $('blog-editor-wrap');
  if (wrap) wrap.style.display = 'none';
}

function editBlogPost(id) {
  const item = _blogPosts.find(p => p.id === id);
  if (!item) return;
  toggleBlogEditor(item);
}

async function saveBlogPost() {
  const title   = $('post-title').value.trim();
  const cat     = $('post-cat').value;
  const tagsRaw = $('post-tags').value;
  const excerpt = $('post-excerpt').value.trim();
  const full    = $('post-body').value.trim();

  if (!title)   { alert('Please enter a title.'); return; }
  if (!excerpt) { alert('Please enter a summary.'); return; }
  if (!full)    { alert('Please write the full content.'); return; }

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

  const btn = $('save-post-btn');
  btn.disabled = true;
  btn.textContent = 'Publishing…';

  await delay(300);

  const todayStr = new Date().toISOString().slice(0, 10);
  const formattedBody = plainTextToHtml(full);

  if (_blogEditId) {
    const idx = _blogPosts.findIndex(p => p.id === _blogEditId);
    if (idx !== -1) {
      _blogPosts[idx] = {
        ..._blogPosts[idx],
        title,
        category: cat,
        tags,
        excerpt,
        full: formattedBody,
      };
      setStored('cvr_v2_blog', _blogPosts);
      showFeedback('Story updated.', 'success');
    }
  } else {
    const newId = _blogPosts.length ? Math.max(..._blogPosts.map(p => p.id)) + 1 : 1;
    _blogPosts.unshift({
      id: newId,
      title,
      author: currentUser ? currentUser.name : 'Vishnu Teja',
      date: todayStr,
      category: cat,
      views: 1,
      tags,
      excerpt,
      full: formattedBody,
    });
    setStored('cvr_v2_blog', _blogPosts);
    showFeedback('Story published.', 'success');
  }

  closeBlogEditor();
  $('blog-list').innerHTML = renderBlogCards(_blogPosts);
}

async function deleteBlogPost(id) {
  if (!confirm('Delete this story?')) return;

  const card = $(`blog-card-${id}`);
  if (card) card.style.opacity = '0.5';

  await delay(200);

  _blogPosts = _blogPosts.filter(p => p.id !== id);
  setStored('cvr_v2_blog', _blogPosts);
  if (_blogEditId === id) closeBlogEditor();
  $('blog-list').innerHTML = renderBlogCards(_blogPosts);
  showFeedback('Story deleted.', 'success');
}

// ── Helpers ────────────────────────────────────────────────

function tagClass(cat) {
  return { Academic:'', Event:'tag-green', Exam:'tag-red', Holiday:'tag-orange', Club:'tag-green' }[cat] || 'tag-gray';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeJs(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function htmlToPlainText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p>/gi, '')
    .trim();
}

function plainTextToHtml(text) {
  const safe = escapeHtml(text.trim());
  return safe
    .split(/\n\n+/)
    .map(para => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

// ── Init ───────────────────────────────────────────────────

if (currentUser) {
  loginUser(currentUser);
  const savedSection = getStored('cvr_v2_section', 'dashboard');
  const validSections = ['dashboard', 'announcements', 'courses', 'timetable', 'blog'];
  show(validSections.includes(savedSection) ? savedSection : 'dashboard');
} else {
  show('login');
}
