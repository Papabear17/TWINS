/* ============================================================
   TWINS — Platform Pelatihan Renang  |  script.js
   ============================================================ */

const STORAGE_KEY = 'twinsData_v3';
const THEME_KEY   = 'twinsTheme';
const SESSION_KEY = 'twinsUserSession';
const INVITE_LINK = 'https://wabsitetwins.vercel.app/';

// ── Password Hashing (simple SHA-256 for frontend validation) ──
async function hashPassword(plaintext) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Demo Accounts (passwords should be hashed on first init) ──
const DEMO_ACCOUNTS = [
  { id: 1, name: 'Admin TWINS', email: 'admin@twins.id',   password: 'admin123', role: 'Admin'   },
  { id: 2, name: 'Coach Rina',  email: 'rina@twins.id',    password: 'rina123',  role: 'Coach'   },
  { id: 3, name: 'Manager',     email: 'manager@twins.id', password: 'mgr123',   role: 'Manager' }
];

let currentUser = null;
let firebaseStateUnsubscribe = null;
let firebaseStateSignature = '';

// ── Default State ──────────────────────────────
const defaultState = {
  theme: 'light',
  isLoggedIn: false,
  activeSection: 'dashboard',
  sharedUpdatedAt: 0,
  config: { appName: 'Twins Swimming Club', contact: 'twinsswimmingclub@gmail.com', regFee: 100000, dueDay: 5 },
  locations: [
    { id: 1, name: 'Kolam Renang Bukit Dago',   address: 'Bukit Dago, Tangerang Selatan',  capacity: 30, status: 'Aktif' },
    { id: 2, name: 'Kolam Renang Panser',        address: 'Panser, Tangerang Selatan',       capacity: 25, status: 'Aktif' },
    { id: 3, name: 'Kolam Renang Bali Resort',   address: 'Bali Resort, Tangerang Selatan',  capacity: 20, status: 'Aktif' }
  ],
  members: [
    { id: 1, name: 'Admin TWINS',  phone: '081111111111', email: 'admin@twins.id',  dob: '1990-01-15', locationId: 1, package: 'Premium',  joinDate: '2026-01-01', status: 'Aktif' },
    { id: 2, name: 'Aqil Syafiq',  phone: '081234567890', email: 'aqil@twins.id',   dob: '1998-05-14', locationId: 1, package: 'Premium',  joinDate: '2026-06-01', status: 'Aktif' },
    { id: 3, name: 'Bima Putra',   phone: '082345678901', email: 'bima@email.com',  dob: '2000-11-20', locationId: 1, package: 'Standard', joinDate: '2026-06-15', status: 'Aktif' },
    { id: 4, name: 'Citra Dewi',   phone: '083456789012', email: 'citra@email.com', dob: '1995-03-08', locationId: 3, package: 'Basic',    joinDate: '2026-07-01', status: 'Aktif' },
    { id: 5, name: 'Doni Pratama', phone: '084567890123', email: 'doni@email.com',   dob: '1990-07-25', locationId: 2, package: 'Standard', joinDate: '2026-05-10', status: 'Tidak Aktif' }
  ],
  payments: [
    { id: 1, memberId: 1, type: 'Pendaftaran', amount: 100000, date: '2026-06-01', status: 'Lunas',     note: '' },
    { id: 2, memberId: 1, type: 'Bulanan',     amount: 650000, date: '2026-06-01', status: 'Lunas',     note: 'Juni 2026' },
    { id: 3, memberId: 1, type: 'Bulanan',     amount: 650000, date: '2026-07-01', status: 'Lunas',     note: 'Juli 2026' },
    { id: 4, memberId: 2, type: 'Pendaftaran', amount: 100000, date: '2026-06-15', status: 'Lunas',     note: '' },
    { id: 5, memberId: 2, type: 'Bulanan',     amount: 400000, date: '2026-06-15', status: 'Lunas',     note: 'Juni 2026' },
    { id: 6, memberId: 2, type: 'Bulanan',     amount: 400000, date: '2026-07-15', status: 'Menunggak', note: 'Juli 2026' },
    { id: 7, memberId: 3, type: 'Pendaftaran', amount: 100000, date: '2026-07-01', status: 'Lunas',     note: '' },
    { id: 8, memberId: 3, type: 'Bulanan',     amount: 250000, date: '2026-07-01', status: 'Lunas',     note: 'Juli 2026' }
  ],
  schedules: [
    { id: 1, memberId: 1, day: 'Senin',  time: '07:00', coach: 'Coach Rina', type: 'Personal Training' },
    { id: 2, memberId: 1, day: 'Rabu',   time: '07:00', coach: 'Coach Rina', type: 'Strength' },
    { id: 3, memberId: 1, day: 'Jumat',  time: '07:00', coach: 'Coach Rina', type: 'Cardio' },
    { id: 4, memberId: 2, day: 'Selasa', time: '18:00', coach: 'Coach Dion', type: 'Group Class' },
    { id: 5, memberId: 2, day: 'Kamis',  time: '18:00', coach: 'Coach Dion', type: 'Group Class' },
    { id: 6, memberId: 3, day: 'Sabtu',  time: '09:00', coach: 'Coach Tari', type: 'Yoga' }
  ],
  notes: [
    { id: 1, memberId: 1, type: 'Catatan',  date: '2026-07-01', score: 8, content: 'Progres squat meningkat, stamina baik.' },
    { id: 2, memberId: 1, type: 'Evaluasi', date: '2026-07-15', score: 9, content: 'Target bulanan tercapai 90%.' },
    { id: 3, memberId: 2, type: 'Progress', date: '2026-07-10', score: 7, content: 'Perlu fokus pada konsistensi latihan.' }
  ],
  adminUsers: [...DEMO_ACCOUNTS],
  packages: [
    { id: 1, name: 'Basic',    price: 250000, desc: '2x seminggu, akses kolam renang', status: 'none', popular: false },
    { id: 2, name: 'Standard', price: 400000, desc: '3x seminggu, akses kolam renang + kelas', status: 'recommended', popular: false },
    { id: 3, name: 'Premium',  price: 650000, desc: 'Unlimited, personal trainer', status: 'popular', popular: true }
  ],
  orgMembers: [
    { id: 101, name: 'Yanto',     title: 'Founder',      spec: 'Strategi Klub & Pengembangan', level: 'head',   parentId: null, phone: '081111111111' },
    { id: 102, name: 'Aqil',      title: 'Head Coach',   spec: 'Teknik Dasar & Kompetisi',      level: 'senior', parentId: 101,  phone: '081222222222' },
    { id: 103, name: 'Syafiq',    title: 'Ops Manager',  spec: 'Operasional Cabang',            level: 'staff',  parentId: 101,  phone: '081333333333' },
    { id: 104, name: 'Rina',      title: 'Senior Coach', spec: 'Private Class & Anak',          level: 'coach',  parentId: 102,  phone: '081444444444' },
    { id: 105, name: 'Dion',      title: 'Coach',        spec: 'Group Class & Endurance',       level: 'coach',  parentId: 102,  phone: '081555555555' },
    { id: 106, name: 'Tari',      title: 'Staff Admin',  spec: 'Administrasi & Jadwal',         level: 'staff',  parentId: 103,  phone: '081666666666' }
  ],
  paymentConfig: {
    waNumber:           '6281294708266',
    reassuranceTitle:   'Pembayaranmu Aman Bersama TWINS',
    reassuranceText:    'Twins Swimming Club platform resmi — setiap transaksi dikonfirmasi tim kami maksimal 1×24 jam.',
    trustPoints:        'Pembayaran ke rekening resmi Twins Swimming Club\nKonfirmasi cepat via WhatsApp\nData pribadi aman & rahasia',
    transferBank:       'BCA',
    transferAccount:    '1234567890',
    transferName:       'Twins Swimming Club',
    transferNote:       'Pastikan nominal transfer sesuai. Simpan bukti transfer dan kirim ke WhatsApp admin.',
    qrisNote:           'Scan QRIS — pembayaran instan & aman',
    qrisImageBase64:    '',
    waTemplateTransfer: 'Halo Admin Twins Swimming Club! 👋\n\nSaya ingin konfirmasi pembayaran pendaftaran:\n• Nama    : {nama}\n• Paket   : {paket}\n• Total   : {total}\n• Metode  : Transfer Bank {bank}\n• Rekening: {rekening} a.n {atasnama}\n• Ref/Bukti: {ref}\n\nMohon konfirmasi. Terima kasih! 🙏',
    waTemplateQris:     'Halo Admin Twins Swimming Club! 👋\n\nKonfirmasi pembayaran via QRIS:\n• Nama  : {nama}\n• Paket : {paket}\n• Total : {total}\n• Ref   : {ref}\n\nTerima kasih! 🙏',
  },
  webConfig: {},
  webMedia: {}
};

let state = JSON.parse(JSON.stringify(defaultState));

// ── Persistence ────────────────────────────────
function cloneStateData(data) {
  return JSON.parse(JSON.stringify(data));
}

function mergeAppState(parsed = {}) {
  const base = cloneStateData(defaultState);
  return {
    ...base,
    ...parsed,
    config:        { ...base.config,        ...(parsed.config        || {}) },
    paymentConfig: { ...base.paymentConfig, ...(parsed.paymentConfig || {}) },
    webConfig:     { ...(base.webConfig     || {}), ...(parsed.webConfig || {}) },
    webMedia:      { ...(base.webMedia      || {}), ...(parsed.webMedia || {}) }
  };
}

function syncMemberStatusWithPayments() {
  if (!Array.isArray(state.members) || !Array.isArray(state.payments)) return;
  state.members = state.members.map(member => {
    if (member.status !== 'Aktif') return member;
    const hasOverdue = state.payments.some(p => p.memberId === member.id && p.status === 'Menunggak');
    return hasOverdue ? { ...member, status: 'Tidak Aktif' } : member;
  });
}

function getFirebaseBridge() {
  return window.twinsFirebase && window.twinsFirebase.enabled ? window.twinsFirebase : null;
}

function getSharedUpdatedAt(source = {}) {
  return Number(source?.sharedUpdatedAt || 0);
}

function touchSharedState(source = state) {
  source.sharedUpdatedAt = Date.now();
  return source.sharedUpdatedAt;
}

function buildSharedStatePayload() {
  // Jangan sync adminUsers ke Firebase karena data ini bersifat lokal dan sensitif.
  const { adminUsers, ...safeState } = state;
  return safeState;
}

function mergeRemoteStateWithLocal(remoteState = {}) {
  const nextState = mergeAppState(remoteState);
  nextState.adminUsers = cloneStateData(
    Array.isArray(state.adminUsers) && state.adminUsers.length
      ? state.adminUsers
      : defaultState.adminUsers,
  );
  return nextState;
}

function persistLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    firebaseStateSignature = JSON.stringify(state);
  } catch (e) {
    console.warn('Failed to save state', e);
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = mergeAppState(JSON.parse(saved));
    }
  } catch (e) {
    console.warn('Failed to load saved state', e);
  }
  normalizeStateCollections();
  syncMemberStatusWithPayments();
  firebaseStateSignature = JSON.stringify(state);
}
function saveState() {
  state = mergeAppState(state);
  normalizeStateCollections();
  syncMemberStatusWithPayments();
  touchSharedState(state);
  persistLocalState();

  const bridge = getFirebaseBridge();
  if (bridge) {
    bridge.saveSharedState(buildSharedStatePayload()).catch((error) => {
      console.warn('Failed to sync state to Firebase', error);
    });
  }
  // update sync indicator
  try { refreshAdminSyncStatus(); } catch(e){}
}

// ── Firebase Real-Time Subscription ──
function subscribeToFirebaseChanges() {
  const bridge = getFirebaseBridge();
  if (!bridge) return;

  // Unsubscribe dari listener lama jika ada
  if (firebaseStateUnsubscribe) {
    firebaseStateUnsubscribe();
  }

  // Subscribe ke perubahan Firebase
  firebaseStateUnsubscribe = bridge.subscribeSharedState(
    (remoteState) => {
      if (!remoteState) return;

      // Jangan update jika remote state lebih lama dari local (untuk menghindari rollback)
      if (getSharedUpdatedAt(remoteState) <= getSharedUpdatedAt(state)) {
        return;
      }

      // Merge remote state dengan local (preserve adminUsers)
      const nextState = mergeRemoteStateWithLocal(remoteState);
      state = nextState;
      normalizeStateCollections();
      persistLocalState();

      // Re-render UI untuk reflect perubahan dari Firebase
      if (currentUser) {
        render();
        checkNotifications();
        showToast('Data tersinkronisasi dari server');
      }
    },
    (error) => {
      console.warn('Firebase subscription error:', error);
    }
  );
}

async function hydrateSharedState() {
  if (!window.twinsFirebaseReady) return;

  // Tampilkan loading skeleton saat mulai sync Firebase
  const overlay = document.getElementById('firebaseLoadingOverlay');
  if (overlay) overlay.style.display = 'flex';

  // Helper: sembunyikan overlay dengan fade
  const hideOverlay = () => {
    if (!overlay) return;
    overlay.style.transition = 'opacity 0.4s ease';
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; overlay.style.opacity = ''; }, 420);
  };

  // Timeout 8 detik — jika Firebase tidak respond, lanjut pakai localStorage
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Firebase sync timeout (8s)')), 8000)
  );

  try {
    await Promise.race([window.twinsFirebaseReady, timeoutPromise]);
    const bridge = getFirebaseBridge();
    if (!bridge) {
      hideOverlay();
      return;
    }

    const remoteState = await Promise.race([bridge.loadSharedState(), timeoutPromise]);
    if (remoteState) {
      const nextState = mergeRemoteStateWithLocal(remoteState);
      if (getSharedUpdatedAt(nextState) < getSharedUpdatedAt(state)) {
        saveState();
        return;
      }
      state = nextState;
      normalizeStateCollections();
      persistLocalState();
    } else {
      saveState();
    }
  } catch (error) {
    console.warn('Firebase sync unavailable, using localStorage only:', error.message);
  } finally {
    // Sembunyikan skeleton setelah sync selesai (berhasil atau gagal atau timeout)
    hideOverlay();
  }
}

async function subscribeSharedState() {
  if (!window.twinsFirebaseReady) return;

  try {
    await window.twinsFirebaseReady;
    const bridge = getFirebaseBridge();
    if (!bridge) return;

    if (typeof firebaseStateUnsubscribe === 'function') {
      firebaseStateUnsubscribe();
    }

    firebaseStateUnsubscribe = bridge.subscribeSharedState((remoteState) => {
      if (!remoteState) return;

      const nextState = mergeRemoteStateWithLocal(remoteState);
      if (getSharedUpdatedAt(nextState) < getSharedUpdatedAt(state)) {
        bridge.saveSharedState(buildSharedStatePayload()).catch((error) => {
          console.warn('Failed to restore newer local state to Firebase', error);
        });
        return;
      }
      const nextSignature = JSON.stringify(nextState);
      if (nextSignature === firebaseStateSignature) return;

      state = nextState;
      normalizeStateCollections();
      persistLocalState();

      if (document.readyState !== 'loading') {
        applyTheme();
        render();
        if (currentUser) applyRoleUI();
      }
    }, (error) => {
      console.warn('Realtime Firebase listener failed', error);
    });
  } catch (error) {
    console.warn('Realtime Firebase listener unavailable', error);
  }
}

function inferOrgTitle(member = {}) {
  if (member.title && String(member.title).trim()) return String(member.title).trim();
  if (member.role && String(member.role).trim()) return String(member.role).trim();
  if (member.level === 'head') return 'Head Coach';
  if (member.level === 'senior') return 'Senior Coach';
  if (member.level === 'staff') return 'Staff Admin';
  return 'Coach';
}

function inferOrgSpec(member = {}) {
  if (member.spec && String(member.spec).trim()) return String(member.spec).trim();
  const title = inferOrgTitle(member).toLowerCase();
  if (title.includes('founder')) return 'Strategi Klub & Pengembangan';
  if (title.includes('head coach')) return 'Teknik Dasar & Kompetisi';
  if (title.includes('senior coach')) return 'Program Lanjutan & Evaluasi';
  if (title.includes('manager')) return 'Operasional & Kemitraan';
  if (title.includes('admin')) return 'Administrasi Member & Jadwal';
  return 'Pelatihan & Pendampingan Member';
}

function inferOrgLevel(member = {}) {
  if (member.level && ['head', 'senior', 'coach', 'staff'].includes(member.level)) return member.level;
  const title = inferOrgTitle(member).toLowerCase();
  if (title.includes('founder') || title.includes('direktur')) return 'head';
  if (title.includes('head') || title.includes('manager') || title.includes('senior')) return 'senior';
  if (title.includes('admin') || title.includes('staff')) return 'staff';
  return 'coach';
}

function normalizeOrgMembers(members = []) {
  return (members || []).map((member, index) => {
    const normalized = {
      ...member,
      id: member.id || Date.now() + index,
      name: member.name || `Anggota ${index + 1}`,
      title: inferOrgTitle(member),
      spec: inferOrgSpec(member),
      level: inferOrgLevel(member),
      phone: member.phone || '',
      parentId: member.parentId ?? null
    };
    delete normalized.role;
    return normalized;
  });
}

function normalizeStateCollections() {
  // Jangan pernah fallback ke defaultState — biarkan empty array jika user menghapus semua
  if (!Array.isArray(state.orgMembers) || state.orgMembers.length === 0) {
    state.orgMembers = [];
  } else {
    state.orgMembers = normalizeOrgMembers(state.orgMembers);
  }
}

// ── Password Hashing (Web Crypto API — SHA-256) ──────────────
async function hashPassword(plain) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(plain));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash semua akun demo saat pertama kali dimuat
async function ensureHashedPasswords() {
  if (!state.adminUsers) return;
  let changed = false;
  for (const u of state.adminUsers) {
    // Jika password belum di-hash (bukan 64 karakter hex), hash sekarang
    if (u.password && u.password.length !== 64) {
      u.password = await hashPassword(u.password);
      changed = true;
    }
  }
  if (changed) persistLocalState();
}

// ── Auth ───────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  const err   = document.getElementById('loginError');

  const hashed = await hashPassword(pass);
  const user = state.adminUsers.find(u => u.email === email && u.password === hashed);
  if (!user) {
    err.textContent = 'Email atau password salah.';
    err.classList.remove('hidden');
    return;
  }
  err.classList.add('hidden');
  currentUser = user;

  // Simpan sesi
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch(e) {}

  // ── Tampilkan post-login welcome overlay ──────────────────────
  showLoginWelcome(user.name, user.role, () => {
    const loginPage = document.getElementById('loginPage');
    loginPage.style.display       = 'none';
    loginPage.style.pointerEvents = 'none';
    loginPage.style.zIndex        = '-1';
    document.getElementById('appShell').style.display = 'grid';
    applyRoleUI();
    applyTheme();

    const map = { dashboard:'dashboardSection', locations:'locationsSection', members:'membersSection', membership:'membershipSection', payments:'paymentsSection', schedule:'scheduleSection', notes:'notesSection', progress:'progressSection', reports:'reportsSection', settings:'settingsSection', orgchart:'orgchartSection' };
    Object.values(map).forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-section="dashboard"]`)?.classList.add('active');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if(sidebar) sidebar.classList.remove('mobile-open');
    if(overlay) overlay.classList.remove('active');
    const dash = document.getElementById('dashboardSection');
    if (dash) dash.style.display = 'block';
    render();

    // ── Subscribe ke Firebase untuk real-time updates ──
    if (!firebaseStateUnsubscribe) {
      subscribeToFirebaseChanges();
    }
  });
}

function doLogout() {
  showConfirm({
    title: 'Keluar dari TWINS',
    message: 'Yakin ingin keluar? Sesi kamu akan berakhir.',
    okLabel: 'Ya, Keluar',
    type: 'warn'
  }).then(ok => {
    if (!ok) return;
    currentUser = null;
    
    // Unsubscribe dari Firebase sebelum logout
    if (firebaseStateUnsubscribe) {
      firebaseStateUnsubscribe();
      firebaseStateUnsubscribe = null;
    }
    
    try { sessionStorage.removeItem(SESSION_KEY); } catch(e) {}
    document.getElementById('appShell').style.display         = 'none';
    const loginPage = document.getElementById('loginPage');
    loginPage.style.display       = 'flex';
    loginPage.style.pointerEvents = 'auto';
    loginPage.style.zIndex        = '9999';
    document.getElementById('loginEmail').value    = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError')?.classList.add('hidden');
  });
}

// ── Post-Login Welcome Animation ────────────────────────────────
function showLoginWelcome(userName, userRole, onDone) {
  // Buat overlay
  const overlay = document.createElement('div');
  overlay.id = 'loginWelcomeOverlay';
  overlay.innerHTML = `
    <div class="lw-inner">
      <div class="lw-logo-wrap">
        <img src="./logo.jpeg" alt="TWINS" class="lw-logo" />
        <div class="lw-ring"></div>
      </div>
      <div class="lw-greeting">Selamat Datang,</div>
      <div class="lw-name">${userName}</div>
      <div class="lw-role">${userRole} · Twins Swimming Club</div>
      <div class="lw-bar-wrap"><div class="lw-bar"></div></div>
    </div>
    <div class="lw-waves">
      <svg viewBox="0 0 1440 100" preserveAspectRatio="none">
        <path d="M0,50 C240,90 480,10 720,50 C960,90 1200,10 1440,50 L1440,100 L0,100 Z" fill="rgba(30,144,255,0.15)"/>
        <path d="M0,70 C360,20 720,100 1080,50 C1260,25 1380,80 1440,70 L1440,100 L0,100 Z" fill="rgba(30,144,255,0.08)"/>
      </svg>
    </div>`;
  document.body.appendChild(overlay);

  // Auto dismiss setelah 2.2 detik
  setTimeout(() => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.6s ease';
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      onDone();
    }, 650);
  }, 2200);
}

function applyRoleUI() {
  if (!currentUser) return;
  document.getElementById('sidebarRoleLabel').textContent = currentUser.role;
  document.getElementById('headerRolePill').textContent   = currentUser.role;
  document.getElementById('userChipName').textContent     = currentUser.name;
  document.getElementById('userChipAvatar').textContent   = currentUser.name.charAt(0).toUpperCase();
  const isAdmin = currentUser.role === 'Admin';
  // Sembunyikan menu Pengaturan untuk non-Admin
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
  
  const hiddenForUsers = ['payments', 'reports', 'settings'];
  hiddenForUsers.forEach(sec => {
    const btn = document.querySelector(`.nav-btn[data-section="${sec}"]`);
    if (btn) btn.style.display = isAdmin ? '' : 'none';
  });

  // Sembunyikan menu Pendaftaran untuk akun bergelar Coach
  const membersBtn = document.querySelector(`.nav-btn[data-section="members"]`);
  if (membersBtn) {
    membersBtn.style.display = currentUser.role === 'Coach' ? 'none' : '';
  }
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if(sidebar) sidebar.classList.toggle('mobile-open');
  if(overlay) overlay.classList.toggle('active');
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('active');
}

// ── Toast & Confirm ──────────────────────────────────────
function applyTheme() {
  const theme = state.theme || localStorage.getItem(THEME_KEY) || 'light';
  state.theme = theme;
  document.body.classList.toggle('dark', theme === 'dark');
  const sun = document.getElementById('themeIconSun');
  const moon = document.getElementById('themeIconMoon');
  if (sun) sun.style.display = theme === 'dark' ? '' : 'none';
  if (moon) moon.style.display = theme === 'dark' ? 'none' : '';
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
}

// ── Navigation ──────────────────────────────────
let _currentSection = 'dashboard';

function showSection(section) {
  const map = {
    dashboard: 'dashboardSection',
    locations: 'locationsSection',
    members:   'membersSection',
    membership: 'membershipSection',
    payments:  'paymentsSection',
    schedule:  'scheduleSection',
    notes:     'notesSection',
    progress:  'progressSection',
    reports:   'reportsSection',
    settings:  'settingsSection',
    orgchart:  'orgchartSection'
  };

  const renderMap = {
    dashboard: () => { renderDashboard(); checkNotifications(); },
    locations: renderLocations,
    members:   renderMembers,
    membership: renderMembership,
    payments:  renderPayments,
    schedule:  renderSchedules,
    notes:     renderNotes,
    progress:  renderProgress,
    reports:   renderReports,
    settings:  renderSettings,
    orgchart:  renderOrgChart
  };

  if (section === _currentSection) return;

  const prevId = map[_currentSection];
  const nextId = map[section];
  const prevEl = document.getElementById(prevId);
  const nextEl = document.getElementById(nextId);
  if (!nextEl) return;

  // Animasi header title
  const headerTitle = document.getElementById('headerTitle');
  const titleMap = {
    dashboard: 'TWINS Dashboard', locations: 'Lokasi & Slot',
    members: 'Pendaftaran Member', membership: 'Keanggotaan',
    payments: 'Pembayaran',
    schedule: 'Jadwal Latihan', notes: 'Catatan & Evaluasi',
    progress: 'Progress Member', reports: 'Laporan',
    settings: 'Pengaturan', orgchart: 'Struktur Organisasi'
  };
  if (headerTitle) {
    headerTitle.classList.add('changing');
    setTimeout(() => {
      headerTitle.textContent = titleMap[section] || 'TWINS Dashboard';
      headerTitle.classList.remove('changing');
    }, 200);
  }

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-section') === section)
  );
  if (window.innerWidth <= 900) closeMobileSidebar();

  // Animasi: slide out current, slide in next
  if (prevEl && prevEl.style.display !== 'none') {
    prevEl.classList.add('section-exit');
    setTimeout(() => {
      prevEl.style.display = 'none';
      prevEl.classList.remove('section-exit');
    }, 220);
  } else {
    Object.values(map).forEach(id => {
      const el = document.getElementById(id);
      if (el && id !== nextId) el.style.display = 'none';
    });
  }

  // Render & tampilkan next dengan animasi masuk
  if (renderMap[section]) renderMap[section]();
  nextEl.style.display = 'block';
  nextEl.classList.remove('section-enter');
  void nextEl.offsetWidth; // force reflow
  nextEl.classList.add('section-enter');
  setTimeout(() => nextEl.classList.remove('section-enter'), 350);

  _currentSection = section;

  // Tutup sidebar mobile
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('active');
}

// ── Toast ───────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden'); t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.classList.remove('show'); t.classList.add('hidden'); }, 2200);
}

// ── Confirm ─────────────────────────────────────
let _confirmResolve = null;
function showConfirm({ title='Konfirmasi', message='Yakin?', okLabel='Hapus', type='danger' } = {}) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent   = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOkBtn').textContent   = okLabel;
    const wrap = document.getElementById('confirmIconWrap');
    const ok   = document.getElementById('confirmOkBtn');
    wrap.className = 'confirm-icon-wrap' + (type === 'warn' ? ' warn' : '');
    ok.className   = 'confirm-btn-ok'    + (type === 'primary' ? ' primary' : '');
    document.getElementById('confirmOverlay').classList.remove('hidden');
  });
}
function resolveConfirm(r) {
  document.getElementById('confirmOverlay').classList.add('hidden');
  if (_confirmResolve) { _confirmResolve(r); _confirmResolve = null; }
}

// ── Helpers ─────────────────────────────────────
const getMemberName   = id => { const m = state.members.find(m=>m.id===id);   return m ? m.name : '—'; };
const getLocationName = id => { const l = state.locations.find(l=>l.id===id); return l ? l.name : '—'; };
const normalizeWhatsAppNumber = phone => {
  if (!phone) return '';
  let num = String(phone).replace(/[^0-9+]/g, '');
  if (num.startsWith('+')) num = num.slice(1);
  if (num.startsWith('0')) num = '62' + num.slice(1);
  return num;
};
function chatMember(phone) {
  const waPhone = normalizeWhatsAppNumber(phone);
  if (!waPhone) { showToast('Nomor WhatsApp member tidak valid.', 4000); return; }
  window.open(`https://wa.me/${waPhone}`, '_blank', 'noopener');
}
const formatRp = n => 'Rp ' + Number(n).toLocaleString('id-ID');
const thisMonthStr = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
// Hitung otomatis jumlah member aktif di suatu lokasi
const getActualFilled = id => state.members.filter(m => m.locationId === id && m.status === 'Aktif').length;

function populateLocationSelect(selectId, selectedId) {
  const sel = document.getElementById(selectId); if (!sel) return;
  sel.innerHTML = '<option value="">— Pilih Lokasi —</option>';
  state.locations.forEach(l => {
    const filled = getActualFilled(l.id);
    const avail  = l.capacity - filled;
    const o = document.createElement('option');
    o.value = l.id;
    o.textContent = `${l.name} (${avail} kosong)`;
    if (l.id == selectedId) o.selected = true;
    sel.appendChild(o);
  });
}
function populateMemberSelect(selectId, selectedId) {
  const sel = document.getElementById(selectId); if (!sel) return;
  sel.innerHTML = '<option value="">— Pilih Member —</option>';
  state.members.forEach(m => { const o = document.createElement('option'); o.value=m.id; o.textContent=`${m.name} (${m.phone})`; if(m.id==selectedId) o.selected=true; sel.appendChild(o); });
}
function populatePackageSelect(selectId, selectedVal) {
  const sel = document.getElementById(selectId); if (!sel) return;
  const pkgs = state.packages || [];
  sel.innerHTML = '';
  pkgs.forEach(p => {
    const o = document.createElement('option');
    o.value = p.name;
    o.textContent = `${p.name} — ${formatRp(p.price)}/bln`;
    if (p.name === selectedVal) o.selected = true;
    sel.appendChild(o);
  });
}

// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════
function renderDashboard() {
  const activeMembers = state.members.filter(m=>m.status==='Aktif').length;
  const totalSlots    = state.locations.reduce((a,l)=>a+(l.capacity-getActualFilled(l.id)),0);
  const overdue       = state.payments.filter(p=>p.status==='Menunggak').length;
  const month         = thisMonthStr();
  const monthRevenue  = state.payments.filter(p=>p.status==='Lunas'&&p.date.startsWith(month)).reduce((a,p)=>a+Number(p.amount),0);

  const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  set('headerMemberCount', `${activeMembers} members`);
  set('headerActiveSlots',  `${totalSlots} slots`);

  // ── Animasi 1: Counter angka stat ──────────────────────────
  animateCounter('statMembers',  activeMembers, 1200);
  animateCounter('statSlots',    totalSlots,    1000);
  animateCounter('statOverdue',  overdue,       800);
  animateRpCounter('statRevenue', monthRevenue, 1400);

  const rm = document.getElementById('recentMembers');
  if (rm) rm.innerHTML = [...state.members].slice(-4).reverse().map(m => `
    <div class="mini-item">
      <div class="mini-avatar">${m.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
      <div><strong style="font-size:.875rem">${m.name}</strong><br><small class="text-muted">${getLocationName(m.locationId)} · ${m.package}</small></div>
      <span class="status-pill ${m.status==='Aktif'?'completed':'pending'}">${m.status}</span>
    </div>`).join('') || '<p class="empty-state">Belum ada member</p>';

  const rp = document.getElementById('recentPayments');
  if (rp) rp.innerHTML = [...state.payments].slice(-4).reverse().map(p => `
    <div class="mini-item">
      <div class="mini-avatar pay-icon">${p.type==='Bulanan'?'↻':'+'}</div>
      <div><strong style="font-size:.875rem">${getMemberName(p.memberId)}</strong><br><small class="text-muted">${p.type} · ${p.date}</small></div>
      <span class="mini-amount ${p.status==='Lunas'?'text-positive':'text-negative'}">${formatRp(p.amount)}</span>
    </div>`).join('') || '<p class="empty-state">Belum ada pembayaran</p>';

  const ss = document.getElementById('slotSummary');
  if (ss) ss.innerHTML = state.locations.map(l => {
    const filled = getActualFilled(l.id);
    const pct = Math.round((filled/l.capacity)*100);
    const barColor = pct>=100 ? 'var(--danger)' : pct>70 ? 'var(--warning)' : 'var(--primary)';
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:.875rem;font-weight:600">${l.name}</span>
        <span class="text-muted" style="font-size:.8rem">${l.capacity-filled} kosong</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill"
          style="width:0%;background:${barColor};transition:width 0.9s cubic-bezier(0.22,1,0.36,1)"
          data-target="${pct}">
        </div>
      </div>
      <small class="text-muted">${filled}/${l.capacity} terisi</small>
    </div>`;
  }).join('') || '<p class="empty-state">Belum ada lokasi</p>';

  // Animasi 6: progress bar tumbuh setelah render
  setTimeout(() => {
    document.querySelectorAll('.progress-bar-fill[data-target]').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  }, 100);

  // ── Animasi 2: Stagger cards masuk ─────────────────────────
  setTimeout(() => {
    document.querySelectorAll('#dashboardSection .metric-card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(24px)';
      setTimeout(() => {
        card.style.transition = 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.22,1,0.36,1)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, i * 80);
    });
    document.querySelectorAll('#dashboardSection .card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => {
        card.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 200 + i * 60);
    });
  }, 50);

  setTimeout(renderDashboardCharts, 50);
}

// ══════════════════════════════════════════════
// ANIMASI DASHBOARD (1,2,3,4,5,6)
// ══════════════════════════════════════════════

// 1 — Counter angka (integer)
function animateCounter(elId, target, duration) {
  const el = document.getElementById(elId);
  if (!el) return;
  const start = 0;
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    el.textContent = Math.round(start + (target - start) * ease);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// 1b — Counter Rupiah
function animateRpCounter(elId, target, duration) {
  const el = document.getElementById(elId);
  if (!el) return;
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * ease);
    el.textContent = 'Rp ' + current.toLocaleString('id-ID');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
// ══════════════════════════════════════════════
function renderLocations() {
  const list = document.getElementById('locationList'); if (!list) return;
  const search = (document.getElementById('locationSearch')?.value||'').toLowerCase();
  const filter = document.getElementById('locationFilter')?.value||'';
  const filtered = state.locations.filter(l => {
    const filled = getActualFilled(l.id);
    return (!search || l.name.toLowerCase().includes(search) || l.address.toLowerCase().includes(search)) &&
           (!filter || (filter==='available'&&filled<l.capacity) || (filter==='full'&&filled>=l.capacity));
  });
  if (!filtered.length) { list.innerHTML='<p class="empty-state">Tidak ada lokasi.</p>'; return; }
  list.innerHTML='';
  filtered.forEach(l => {
    const filled = getActualFilled(l.id);
    const avail  = l.capacity - filled;
    const pct    = Math.round((filled/l.capacity)*100);
    const div    = document.createElement('div'); div.className='item-box';

    const peserta  = state.members.filter(m => m.locationId === l.id);
    const memberIds = peserta.map(m => m.id);
    let explicitCoaches = l.coaches ? l.coaches.split(',').map(c=>c.trim()).filter(c=>c) : [];
    let scheduleCoaches = state.schedules.filter(s => memberIds.includes(s.memberId)).map(s => s.coach);
    const coaches = [...new Set([...explicitCoaches, ...scheduleCoaches])];

    div.innerHTML = `<div class="item-row">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <strong>${l.name}</strong>
          <span class="status-pill ${l.status==='Aktif'?'completed':'pending'}">${l.status}</span>
          <span class="status-pill ${avail<=0?'pending':'scheduled'}">${avail<=0?'Penuh':`${avail} slot kosong`}</span>
        </div>
        <small class="text-muted">${l.address}</small>
        <div class="progress-bar-wrap" style="max-width:280px;margin-top:6px"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <small class="text-muted">${filled}/${l.capacity} terisi (${peserta.length} member terdaftar)</small>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="mini-btn" onclick="toggleLocationDetail(${l.id})">Lihat Detail</button>
        ${currentUser?.role === 'Admin' ? `
        <button class="mini-btn" onclick="editLocation(${l.id})">Edit</button>
        <button class="mini-btn danger-btn" onclick="deleteLocation(${l.id})">Hapus</button>
        ` : ''}
      </div>
    </div>
    <div id="locDetail_${l.id}" class="loc-detail hidden">
      <div class="loc-detail-inner">
        <div class="loc-detail-col">
          <p class="loc-detail-title">Peserta (${peserta.length})</p>
          ${peserta.length ? peserta.map(m=>`
            <div class="loc-detail-item">
              <div class="loc-detail-avatar">${m.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
              <div>
                <span style="font-size:.85rem;font-weight:500">${m.name}</span>
                <span class="role-badge" style="margin-left:4px">${m.package}</span><br>
                <small class="text-muted">${m.phone}</small>
              </div>
              <span class="status-pill ${m.status==='Aktif'?'completed':'pending'}" style="flex-shrink:0">${m.status}</span>
            </div>`).join('') : '<p class="empty-state" style="padding:10px 0">Belum ada peserta</p>'}
        </div>
        <div class="loc-detail-divider"></div>
        <div class="loc-detail-col">
          <p class="loc-detail-title">Coach / Trainer (${coaches.length})</p>
          ${coaches.length ? coaches.map(c=>`
            <div class="loc-detail-item">
              <div class="loc-detail-avatar coach-av">${c.replace('Coach ','').charAt(0)}</div>
              <span style="font-size:.85rem;font-weight:500">${c}</span>
            </div>`).join('') : '<p class="empty-state" style="padding:10px 0">Belum ada coach terdaftar</p>'}
        </div>
      </div>
    </div>`;
    list.appendChild(div);
  });
}
function toggleLocationDetail(id) {
  const el = document.getElementById(`locDetail_${id}`);
  if (!el) return;
  el.classList.toggle('hidden');
}

function populateCoachCheckboxes(selectedCoachesStr = '') {
  const container = document.getElementById('locCoachCheckboxes');
  const selectedArr = selectedCoachesStr.split(',').map(s=>s.trim()).filter(s=>s);
  const coaches = state.orgMembers.filter(m => m.level === 'coach');
  
  if(coaches.length === 0) {
    container.innerHTML = '<div style="padding:15px; text-align:center; color:var(--text-muted); font-size:0.85rem">Belum ada coach terdaftar</div>';
    return;
  }
  
  let html = `
    <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
      <thead style="background:var(--bg); border-bottom:1px solid var(--border);">
        <tr>
          <th style="padding:10px; width:50px; text-align:center;">Pilih</th>
          <th style="padding:10px; text-align:left;">Nama Coach</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  coaches.forEach((c, idx) => {
    const isChecked = selectedArr.includes(c.name);
    const bg = idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)';
    html += `
      <tr style="border-bottom:1px solid var(--border); background:${bg}; cursor:pointer;" onclick="const cb=document.getElementById('cbCoach_${idx}'); cb.checked=!cb.checked; event.stopPropagation();">
        <td style="padding:8px; text-align:center;">
          <input type="checkbox" id="cbCoach_${idx}" name="locCoachCheckbox" value="${c.name}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px;" onclick="event.stopPropagation()">
        </td>
        <td style="padding:8px;">Coach ${c.name}</td>
      </tr>
    `;
  });
  
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function openLocationModal() { state.editingLocationId=null; ['locName','locAddress'].forEach(id=>document.getElementById(id).value=''); document.getElementById('locCapacity').value=''; document.getElementById('locStatus').value='Aktif'; populateCoachCheckboxes(''); document.getElementById('locationModalTitle').textContent='Tambah Lokasi'; document.getElementById('locationModal').classList.remove('hidden'); }
function closeLocationModal() { document.getElementById('locationModal').classList.add('hidden'); }
function editLocation(id) { const l=state.locations.find(x=>x.id===id); if(!l) return; state.editingLocationId=id; document.getElementById('locName').value=l.name; populateCoachCheckboxes(l.coaches||''); document.getElementById('locAddress').value=l.address; document.getElementById('locCapacity').value=l.capacity; document.getElementById('locStatus').value=l.status; document.getElementById('locationModalTitle').textContent='Edit Lokasi'; document.getElementById('locationModal').classList.remove('hidden'); }
function saveLocation() {
  const name=document.getElementById('locName').value.trim(); 
  const coaches = Array.from(document.querySelectorAll('input[name="locCoachCheckbox"]:checked')).map(cb => cb.value).join(', ');
  const address=document.getElementById('locAddress').value.trim(); const capacity=parseInt(document.getElementById('locCapacity').value)||0; const status=document.getElementById('locStatus').value;
  if(!name||!address||capacity<1){showToast('Nama, alamat, dan kapasitas wajib diisi');return;}
  if(state.editingLocationId){state.locations=state.locations.map(l=>l.id===state.editingLocationId?{...l,name,coaches,address,capacity,status}:l);showToast('Lokasi diperbarui');}
  else{state.locations.push({id:Date.now(),name,coaches,address,capacity,status});showToast('Lokasi ditambahkan');}
  saveState();closeLocationModal();render();
}
async function deleteLocation(id) { const l=state.locations.find(x=>x.id===id); if(!l) return; const ok=await showConfirm({title:'Hapus Lokasi',message:`"${l.name}" akan dihapus permanen.`,okLabel:'Ya, Hapus'}); if(!ok) return; state.locations=state.locations.filter(x=>x.id!==id); saveState();render();showToast('Lokasi dihapus'); }

// ══════════════════════════════════════════════
// MEMBER
// ══════════════════════════════════════════════
function renderMembers() {
  const list=document.getElementById('memberList'); if(!list) return;
  const search=(document.getElementById('memberSearch')?.value||'').toLowerCase();
  const sf=document.getElementById('memberStatusFilter')?.value||'';
  const filtered=state.members
    .filter(m=>(!search||m.name.toLowerCase().includes(search)||m.phone.includes(search))&&(!sf||m.status===sf))
    .slice()
    .sort((a,b)=>{
      // Terbaru (joinDate terbesar) tampil paling atas; fallback ke id terbesar
      const da = a.joinDate||'';
      const db = b.joinDate||'';
      if(db!==da) return db.localeCompare(da);
      return (b.id||0)-(a.id||0);
    });
  if(!filtered.length){list.innerHTML='<p class="empty-state">Tidak ada member.</p>';return;}
  list.innerHTML='';
  filtered.forEach(m=>{
    const initials=m.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const proofPayment = state.payments.find(p => p.memberId === m.id && p.proofImage);
    const proofButton = proofPayment ? `<button class="mini-btn" onclick="openProofPreview(${proofPayment.id})">Bukti</button>` : '';

    // Badge status dengan warna sesuai
    const statusClass = m.status==='Aktif' ? 'completed'
      : m.status==='Menunggu Verifikasi' ? 'waiting'
      : 'pending';

    // Tombol Setujui hanya muncul jika status Menunggu Verifikasi
    const approveBtn = m.status==='Menunggu Verifikasi'
      ? `<button class="mini-btn approve-btn" onclick="approveMember(${m.id})">Setujui</button>`
      : '';

    const div=document.createElement('div');div.className='item-box';
    div.innerHTML=`<div class="item-row">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
        <div class="user-avatar" style="flex-shrink:0">${initials}</div>
        <div style="min-width:0">
          <strong>${m.name}</strong>&nbsp;<span class="role-badge">${m.package}</span>
          <br><small class="text-muted">${m.phone}${m.email?' &middot; '+m.email:''}</small>
          <br><small class="text-muted">${getLocationName(m.locationId)} &middot; Bergabung: ${m.joinDate}</small>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;align-items:center;flex-wrap:wrap;justify-content:flex-end">
        <span class="status-pill ${statusClass}">${m.status}</span>
        ${approveBtn}
        ${proofButton}
        <button class="mini-btn" onclick="chatMember('${(m.phone||'').replace(/'/g,'\\\'')}')">Chat</button>
        <button class="mini-btn" onclick="editMember(${m.id})">Edit</button>
        <button class="mini-btn danger-btn" onclick="deleteMember(${m.id})">Hapus</button>
      </div>
    </div>`;
    list.appendChild(div);
  });
}
function openMemberModal(){state.editingMemberId=null;['memName','memPhone','memEmail','memDob'].forEach(id=>document.getElementById(id).value='');populatePackageSelect('memPackage','Basic');document.getElementById('memStatus').value='Aktif';document.getElementById('memJoinDate').value=new Date().toISOString().slice(0,10);populateLocationSelect('memLocation',null);document.getElementById('memberModalTitle').textContent='Daftarkan Member Baru';document.getElementById('memberModal').classList.remove('hidden');}
function closeMemberModal(){document.getElementById('memberModal').classList.add('hidden');}
function editMember(id){const m=state.members.find(x=>x.id===id);if(!m)return;state.editingMemberId=id;document.getElementById('memName').value=m.name;document.getElementById('memPhone').value=m.phone;document.getElementById('memEmail').value=m.email;document.getElementById('memDob').value=m.dob;document.getElementById('memJoinDate').value=m.joinDate;populatePackageSelect('memPackage',m.package);document.getElementById('memStatus').value=m.status;populateLocationSelect('memLocation',m.locationId);document.getElementById('memberModalTitle').textContent='Edit Data Member';document.getElementById('memberModal').classList.remove('hidden');}
function saveMember(){
  const name=document.getElementById('memName').value.trim();const phone=document.getElementById('memPhone').value.trim();const email=document.getElementById('memEmail').value.trim();const dob=document.getElementById('memDob').value;const locationId=parseInt(document.getElementById('memLocation').value);const pkg=document.getElementById('memPackage').value;const joinDate=document.getElementById('memJoinDate').value;const status=document.getElementById('memStatus').value;
  if(!name||!phone||!locationId){showToast('Nama, HP, dan lokasi wajib diisi');return;}
  if(state.editingMemberId){state.members=state.members.map(m=>m.id===state.editingMemberId?{...m,name,phone,email,dob,locationId,package:pkg,joinDate,status}:m);showToast('Data member diperbarui');}
  else{state.members.push({id:Date.now(),name,phone,email,dob,locationId,package:pkg,joinDate,status});showToast('Member berhasil didaftarkan');}
  saveState();closeMemberModal();render();
}
async function deleteMember(id){const m=state.members.find(x=>x.id===id);if(!m)return;const ok=await showConfirm({title:'Hapus Member',message:`"${m.name}" beserta data terkait akan dihapus.`,okLabel:'Ya, Hapus'});if(!ok)return;
  state.members=state.members.filter(x=>x.id!==id);state.payments=state.payments.filter(x=>x.memberId!==id);state.schedules=state.schedules.filter(x=>x.memberId!==id);state.notes=state.notes.filter(x=>x.memberId!==id);saveState();render();showToast('Member dihapus');}

async function approveMember(id){
  const member = state.members.find(x => x.id === id);
  if (!member) return;
  if (member.status === 'Aktif') {
    showToast('Member sudah aktif.');
    return;
  }
  const ok = await showConfirm({
    title: 'Setujui Member',
    message: `Setujui ${member.name} sebagai member aktif?`,
    okLabel: 'Setujui',
    type: 'primary'
  });
  if (!ok) return;
  state.members = state.members.map(m => m.id === id ? { ...m, status: 'Aktif' } : m);
  state.payments = state.payments.map(p => {
    if (p.memberId === id && p.type === 'Pendaftaran' && p.status === 'Menunggak') {
      return { ...p, status: 'Lunas', note: `${p.note} | Disetujui Admin` };
    }
    return p;
  });
  saveState();
  render();
  showToast(`Member ${member.name} disetujui dan diaktifkan.`);
}

// ══════════════════════════════════════════════
// KEANGGOTAAN (MEMBERSHIP OVERVIEW — SEMUA MEMBER)
// ══════════════════════════════════════════════
function renderMembership() {
  const section = document.getElementById('membershipSection');
  if (!section) return;

  // ── Metrics ──
  const total   = state.members.length;
  const aktif   = state.members.filter(m => m.status === 'Aktif').length;
  const pending = state.members.filter(m => m.status === 'Menunggu Verifikasi' || m.status === 'Menunggu Verifikasi Admin').length;
  const nonaktif= state.members.filter(m => m.status === 'Tidak Aktif').length;

  const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  set('msTotal',    total);
  set('msAktif',    aktif);
  set('msPending',  pending);
  set('msNonaktif', nonaktif);

  // ── Package Summary ──
  const packages = state.packages || [];
  const pkgSummary = document.getElementById('msPackageSummary');
  if (pkgSummary) {
    pkgSummary.innerHTML = packages.map(p => {
      const count = state.members.filter(m => m.package === p.name).length;
      return `
        <div class="card ms-package-card">
          <div class="ms-pkg-name">${p.name}</div>
          <div class="ms-pkg-price">${formatRp(p.price)}<small>/bln</small></div>
          <div class="ms-pkg-count">${count} member</div>
          <div class="ms-pkg-bar"><div class="ms-pkg-bar-fill" style="width:${total ? (count/total)*100 : 0}%"></div></div>
        </div>`;
    }).join('');
  }

  // ── Status Chart (Donut) ──
  renderMsStatusChart(aktif, pending, nonaktif);

  // ── Members per Location ──
  const locSummary = document.getElementById('msLocationSummary');
  if (locSummary) {
    locSummary.innerHTML = state.locations.map(l => {
      const count = state.members.filter(m => m.locationId === l.id).length;
      return `<div class="ms-loc-item"><strong>${l.name}</strong> <span class="status-pill completed">${count} member</span></div>`;
    }).join('');
  }

  // ── Member List ──
  renderMsMemberList();
}

function renderMsStatusChart(aktif, pending, nonaktif) {
  const canvas = document.getElementById('msStatusChart');
  const legend = document.getElementById('msStatusLegend');
  if (!canvas) return;

  const side = 150;
  canvas.style.width  = side + 'px';
  canvas.style.height = side + 'px';
  canvas.style.flexShrink = '0';
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.round(side * dpr);
  canvas.height = Math.round(side * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const total = aktif + pending + nonaktif || 1;
  const cx = side/2, cy = side/2, r = 58, ir = 36;
  const slices = [
    { v: aktif,    c: '#16a34a', l: 'Aktif' },
    { v: pending,  c: '#eab308', l: 'Menunggu' },
    { v: nonaktif, c: '#ef4444', l: 'Tidak Aktif' }
  ].filter(s => s.v > 0);

  const startTime = performance.now();
  const duration  = 700;
  function draw(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    ctx.clearRect(0, 0, side, side);
    let angle = -Math.PI / 2;
    slices.forEach(s => {
      const fullSweep = (s.v / total) * Math.PI * 2;
      const sweep = fullSweep * ease;
      if (sweep <= 0) { angle += fullSweep; return; }
      ctx.beginPath();
      ctx.arc(cx, cy, r, angle, angle + sweep);
      ctx.lineTo(cx + Math.cos(angle + sweep) * ir, cy + Math.sin(angle + sweep) * ir);
      ctx.arc(cx, cy, ir, angle + sweep, angle, true);
      ctx.closePath();
      ctx.fillStyle = s.c;
      ctx.fill();
      angle += fullSweep;
    });
    if (progress < 1) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  if (legend) {
    legend.innerHTML = slices.map(s => `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="width:10px;height:10px;border-radius:50%;background:${s.c};display:inline-block"></span>
        <span>${s.l}: <strong>${s.v}</strong></span>
      </div>`).join('');
  }
}

function renderMsMemberList() {
  const list = document.getElementById('msMemberList');
  if (!list) return;

  const search   = (document.getElementById('msSearch')?.value || '').toLowerCase();
  const sf       = document.getElementById('msStatusFilter')?.value || '';
  const pf       = document.getElementById('msPackageFilter')?.value || '';
  const pkgs     = state.packages || [];

  // Populate package filter
  const pkgSel = document.getElementById('msPackageFilter');
  if (pkgSel && pkgSel.options.length <= 1) {
    pkgs.forEach(p => {
      const o = document.createElement('option');
      o.value = p.name;
      o.textContent = p.name;
      pkgSel.appendChild(o);
    });
  }

  const filtered = state.members.filter(m => {
    const nameMatch = !search || m.name.toLowerCase().includes(search) || m.phone.includes(search);
    const statusMatch = !sf || m.status === sf;
    const pkgMatch = !pf || m.package === pf;
    return nameMatch && statusMatch && pkgMatch;
  });

  if (!filtered.length) {
    list.innerHTML = '<p class="empty-state">Tidak ada member.</p>';
    return;
  }

  list.innerHTML = filtered.map(m => {
    const initials = m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const statusClass = m.status === 'Aktif' ? 'completed' : m.status === 'Menunggu Verifikasi' || m.status === 'Menunggu Verifikasi Admin' ? 'waiting' : 'pending';
    return `
      <div class="item-box">
        <div class="item-row">
          <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
            <div class="user-avatar" style="flex-shrink:0">${initials}</div>
            <div style="min-width:0">
              <strong>${m.name}</strong>&nbsp;<span class="role-badge">${m.package}</span>
              <br><small class="text-muted">${getLocationName(m.locationId)} &middot; ${m.phone}${m.email ? ' &middot; '+m.email : ''}</small>
              <br><small class="text-muted">Bergabung: ${m.joinDate}${m.dob ? ' &middot; Lahir: '+m.dob : ''}</small>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;align-items:center;flex-wrap:wrap">
            <span class="status-pill ${statusClass}">${m.status}</span>
            <button class="mini-btn" onclick="chatMember('${(m.phone||'').replace(/'/g,"\\'")}')">Chat</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════
// PEMBAYARAN
// ══════════════════════════════════════════════
function renderPayments(){
  const month=thisMonthStr();
  const total=state.payments.filter(p=>p.status==='Lunas').reduce((a,p)=>a+Number(p.amount),0);
  const mRev=state.payments.filter(p=>p.status==='Lunas'&&p.date.startsWith(month)).reduce((a,p)=>a+Number(p.amount),0);
  const overdue=state.payments.filter(p=>p.status==='Menunggak').length;
  const newReg=state.payments.filter(p=>p.type==='Pendaftaran'&&p.date.startsWith(month)).length;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('payStatTotal',formatRp(total));set('payStatMonth',formatRp(mRev));set('payStatOverdue',overdue);set('payStatNew',newReg);
  const list=document.getElementById('paymentList');if(!list)return;
  const tf=document.getElementById('payTypeFilter')?.value||'';const sf=document.getElementById('payStatusFilter')?.value||'';
  const filtered=state.payments.filter(p=>(!tf||p.type===tf)&&(!sf||p.status===sf)).sort((a,b)=>b.date.localeCompare(a.date));
  if(!filtered.length){list.innerHTML='<p class="empty-state">Tidak ada pembayaran.</p>';return;}
  list.innerHTML=`<table class="dashboard-table"><thead><tr><th>Member</th><th>Tipe</th><th>Jumlah</th><th>Tanggal</th><th>Status</th><th>Bukti</th><th>Catatan</th><th></th></tr></thead><tbody id="paymentTbody"></tbody></table>`;
  const tbody=document.getElementById('paymentTbody');
  filtered.forEach(p=>{const proofCell = p.proofImage ? `<button class="mini-btn" onclick="openProofPreview(${p.id})">Lihat</button>` : '—';
    const tr=document.createElement('tr');
    // action buttons: edit, delete, and confirm (if menunggak)
    let actionButtons = `<button class="mini-btn" onclick="editPayment(${p.id})">Edit</button><button class="mini-btn danger-btn" onclick="deletePayment(${p.id})">Hapus</button>`;
    if (p.status === 'Menunggak' && p.proofImage) {
      actionButtons = `<button class="mini-btn primary-btn" onclick="approvePayment(${p.id})">Konfirmasi</button>` + actionButtons;
    }
    // Member name cell uses class for truncation and note cell uses ellipsis
    const noteText = p.note || '—';
    tr.innerHTML=`<td class="member-name"><strong title="${getMemberName(p.memberId)}">${getMemberName(p.memberId)}</strong></td><td><span class="role-badge">${p.type}</span></td><td><strong>${formatRp(p.amount)}</strong></td><td>${p.date}</td><td><span class="status-pill ${p.status==='Lunas'?'completed':'pending'}">${p.status}</span></td><td>${proofCell}</td><td class="note-cell"><small class="text-muted" title="${noteText}">${noteText}</small></td><td class="actions-cell"><div style="display:flex;gap:6px;align-items:center">` +
      // add WhatsApp contact button (open WA chat to member phone)
      // pass payment id so we can craft a message including payment details
      `<button class="mini-btn" onclick="openWhatsAppToMember(${p.id})">WA</button>` +
      actionButtons + `</div></td>`;tbody.appendChild(tr);});
}

async function approvePayment(paymentId) {
  const p = state.payments.find(x => x.id === paymentId);
  if (!p) return;
  if (p.status === 'Lunas') { showToast('Pembayaran sudah dikonfirmasi.'); return; }
  const ok = await showConfirm({ title: 'Konfirmasi Pembayaran', message: `Konfirmasi pembayaran untuk ${getMemberName(p.memberId)} sebesar ${formatRp(p.amount)}?`, okLabel: 'Konfirmasi', type: 'primary' });
  if (!ok) return;
  // tandai pembayaran Lunas
  state.payments = state.payments.map(x => x.id === paymentId ? { ...x, status: 'Lunas', note: (x.note || '') + ' | Dikonfirmasi Admin' } : x);
  // aktifkan member jika perlu
  const member = state.members.find(m => m.id === p.memberId);
  if (member) {
    member.status = 'Aktif';
  }
  saveState();
  renderPayments();
  renderDashboard();
  showToast('Pembayaran dikonfirmasi dan member diaktifkan.');
}

// Sync status UI updates
function updateSyncStatusAdmin(statusText) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.textContent = statusText;
  el.title = `Sinkronisasi: ${statusText}`;
  // update class
  el.classList.remove('sync-ok','sync-warn','sync-off');
  const t = (statusText||'').toLowerCase();
  if (t.includes('tersinkron') || t.includes('terhubung') || t.includes('terhubung')) el.classList.add('sync-ok');
  else if (t.includes('connect') || t.includes('connecting') || t.includes('connecting...') || t.includes('connecting')) el.classList.add('sync-warn');
  else if (t.includes('local')) el.classList.add('sync-off');
  else el.classList.add('sync-warn');
}

// Utility: open WhatsApp chat to a member's phone number
function openWhatsAppToMember(paymentId) {
  const p = state.payments.find(x => x.id === paymentId);
  if (!p) { showToast('Data pembayaran tidak ditemukan.'); return; }
  const member = state.members.find(m => m.id === p.memberId);
  if (!member || !member.phone) { showToast('Nomor HP tidak tersedia untuk member ini.'); return; }
  const normalize = (ph) => ph.replace(/[^0-9+]/g, '').replace(/^0/, '62').replace(/^\+/, '');
  const phone = normalize(member.phone);
  // build a more specific prefilled message including timestamp and payment details
  const pad2 = n => String(n).padStart(2,'0');
  function formatDateTime(d){
    try{
      const t = new Date(d);
      const day = pad2(t.getDate());
      const month = t.toLocaleString('id-ID', { month: 'short' });
      const year = t.getFullYear();
      const hh = pad2(t.getHours());
      const mm = pad2(t.getMinutes());
      return `${day} ${month} ${year} ${hh}:${mm}`;
    }catch(e){ return String(d); }
  }
  const paymentDate = p.date || '';
  const now = formatDateTime(new Date());
  const pd = formatDateTime(paymentDate);
  const pkg = (p.type === 'Pendaftaran' && p.note) ? p.note : (p.type || '');
  const parts = [];
  parts.push(`Halo ${member.name || ''},`);
  parts.push(`Saya Admin TWINS. Kami melihat ada transaksi *${p.type}*${pkg? ` (${pkg})` : ''} untuk akun Anda.`);
  parts.push(`Jumlah: ${formatRp(p.amount)}; Tanggal transaksi: ${pd}`);
  parts.push(`ID Pembayaran: ${p.id}`);
  parts.push(`Pesan ini dikirim: ${now}`);
  parts.push(`Mohon konfirmasi atau kirim bukti transfer jika belum terunggah. Terima kasih.`);
  const text = encodeURIComponent(parts.join('\n'));
  const url = `https://wa.me/${phone}?text=${text}`;
  window.open(url, '_blank');
}

// Simple HTML escape if needed (used for title attributes)
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// show connected/disconnected based on Firebase readiness and last shared time
function refreshAdminSyncStatus() {
  try {
    const bridge = getFirebaseBridge();
    if (!bridge) {
      updateSyncStatusAdmin('Local only');
      return;
    }
    if (!window.twinsFirebaseReady) {
      updateSyncStatusAdmin('Connecting...');
      return;
    }
    // if we have saved signature/time
    const last = state.sharedUpdatedAt || 0;
    if (last) {
      const ago = Math.round((Date.now() - last) / 1000);
      updateSyncStatusAdmin('Tersinkron ' + (ago < 60 ? ago + 's' : Math.round(ago/60) + 'm') + ' lalu');
    } else {
      updateSyncStatusAdmin('Terhubung');
    }
  } catch (e) { console.warn(e); }
}
function openPaymentModal(){state.editingPaymentId=null;populateMemberSelect('payMember',null);document.getElementById('payType').value='Bulanan';document.getElementById('payAmount').value='';document.getElementById('payDate').value=new Date().toISOString().slice(0,10);document.getElementById('payStatus').value='Lunas';document.getElementById('payNote').value='';document.getElementById('paymentModalTitle').textContent='Catat Pembayaran';document.getElementById('paymentModal').classList.remove('hidden');}
function openProofPreview(paymentId){
  const p = state.payments.find(x => x.id === paymentId);
  if (!p || !p.proofImage) return;
  const image = document.getElementById('proofModalImage');
  if (!image) return;
  image.src = p.proofImage;
  document.getElementById('proofModal').classList.remove('hidden');
}

function closeProofModal(){
  const modal = document.getElementById('proofModal');
  if (!modal) return;
  modal.classList.add('hidden');
  const image = document.getElementById('proofModalImage');
  if (image) image.src = '';
}

function closePaymentModal(){document.getElementById('paymentModal').classList.add('hidden');}
function editPayment(id){const p=state.payments.find(x=>x.id===id);if(!p)return;state.editingPaymentId=id;populateMemberSelect('payMember',p.memberId);document.getElementById('payType').value=p.type;document.getElementById('payAmount').value=p.amount;document.getElementById('payDate').value=p.date;document.getElementById('payStatus').value=p.status;document.getElementById('payNote').value=p.note;document.getElementById('paymentModalTitle').textContent='Edit Pembayaran';document.getElementById('paymentModal').classList.remove('hidden');}
function savePayment(){
  const memberId=parseInt(document.getElementById('payMember').value);const type=document.getElementById('payType').value;const amount=parseInt(document.getElementById('payAmount').value)||0;const date=document.getElementById('payDate').value;const status=document.getElementById('payStatus').value;const note=document.getElementById('payNote').value.trim();
  if(!memberId||!amount||!date){showToast('Member, jumlah, dan tanggal wajib diisi');return;}
  if(state.editingPaymentId){state.payments=state.payments.map(p=>p.id===state.editingPaymentId?{...p,memberId,type,amount,date,status,note}:p);showToast('Pembayaran diperbarui');}
  else{state.payments.push({id:Date.now(),memberId,type,amount,date,status,note});showToast('Pembayaran dicatat');}
  saveState();closePaymentModal();renderPayments();renderDashboard();
}
async function deletePayment(id){const ok=await showConfirm({title:'Hapus Pembayaran',message:'Data pembayaran ini akan dihapus permanen.',okLabel:'Ya, Hapus'});if(!ok)return;state.payments=state.payments.filter(x=>x.id!==id);saveState();renderPayments();renderDashboard();showToast('Pembayaran dihapus');}
function exportPaymentCSV(){const h='Member,Tipe,Jumlah,Tanggal,Status,Catatan\n';const r=state.payments.map(p=>`"${getMemberName(p.memberId)}","${p.type}",${p.amount},"${p.date}","${p.status}","${p.note}"`).join('\n');const blob=new Blob([h+r],{type:'text/csv'});const url=URL.createObjectURL(blob);Object.assign(document.createElement('a'),{href:url,download:'twins-payments.csv'}).click();URL.revokeObjectURL(url);showToast('CSV diunduh');}

function exportPaymentPDF(){
  const rows=state.payments.map(p=>`
    <tr>
      <td>${getMemberName(p.memberId)}</td>
      <td>${p.type}</td>
      <td>${formatRp(p.amount)}</td>
      <td>${p.date}</td>
      <td>${p.status}</td>
      <td>${p.note||'—'}</td>
    </tr>`).join('');
  const total=state.payments.filter(p=>p.status==='Lunas').reduce((a,p)=>a+Number(p.amount),0);
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Laporan Pembayaran TWINS</title>
  <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{color:#1d6fc4;margin-bottom:4px}
  p.sub{color:#666;font-size:13px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#1d6fc4;color:#fff;padding:8px 12px;text-align:left}
  td{padding:8px 12px;border-bottom:1px solid #e5e7eb}
  tr:nth-child(even){background:#f0f6ff}
  .total{margin-top:16px;font-weight:bold;text-align:right;font-size:14px}
  </style></head><body>
  <h1>${state.config?.appName || 'TWINS Platform Pelatihan Renang'}</h1>
  <p class="sub">Laporan Pembayaran — Dicetak: ${new Date().toLocaleDateString('id-ID',{dateStyle:'long'})}</p>
  <table><thead><tr><th>Member</th><th>Tipe</th><th>Jumlah</th><th>Tanggal</th><th>Status</th><th>Catatan</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <p class="total">Total Lunas: ${formatRp(total)}</p>
  </body></html>`;
  const w=window.open('','_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(()=>w.print(),400);
  showToast('PDF siap dicetak');
}

// ══════════════════════════════════════════════
// JADWAL
// ══════════════════════════════════════════════
const DAY_ORDER=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
function renderSchedules(){
  const list=document.getElementById('scheduleList');if(!list)return;
  const search=(document.getElementById('scheduleSearch')?.value||'').toLowerCase();
  const df=document.getElementById('scheduleDayFilter')?.value||'';
  const filtered=state.schedules.filter(s=>(!search||getMemberName(s.memberId).toLowerCase().includes(search))&&(!df||s.day===df)).sort((a,b)=>DAY_ORDER.indexOf(a.day)-DAY_ORDER.indexOf(b.day)||a.time.localeCompare(b.time));
  if(!filtered.length){list.innerHTML='<p class="empty-state">Tidak ada jadwal.</p>';return;}
  list.innerHTML='';
  filtered.forEach(s=>{const div=document.createElement('div');div.className='item-box';div.innerHTML=`<div class="item-row"><div style="display:flex;align-items:center;gap:12px;flex:1"><div class="schedule-day-badge">${s.day.slice(0,3)}</div><div><strong>${getMemberName(s.memberId)}</strong>&nbsp;<span class="role-badge">${s.type}</span><br><small class="text-muted">${s.time} · ${s.coach}</small></div></div><div style="display:flex;gap:6px;flex-shrink:0"><button class="mini-btn" onclick="editSchedule(${s.id})">Edit</button><button class="mini-btn danger-btn" onclick="deleteSchedule(${s.id})">Hapus</button></div></div>`;list.appendChild(div);});
}
function openScheduleModal(){state.editingScheduleId=null;populateMemberSelect('schMember',null);document.getElementById('schDay').value='Senin';document.getElementById('schTime').value='07:00';document.getElementById('schCoach').value='';document.getElementById('schType').value='Personal Training';document.getElementById('scheduleModalTitle').textContent='Tambah Jadwal';document.getElementById('scheduleModal').classList.remove('hidden');}
function closeScheduleModal(){document.getElementById('scheduleModal').classList.add('hidden');}
function editSchedule(id){const s=state.schedules.find(x=>x.id===id);if(!s)return;state.editingScheduleId=id;populateMemberSelect('schMember',s.memberId);document.getElementById('schDay').value=s.day;document.getElementById('schTime').value=s.time;document.getElementById('schCoach').value=s.coach;document.getElementById('schType').value=s.type;document.getElementById('scheduleModalTitle').textContent='Edit Jadwal';document.getElementById('scheduleModal').classList.remove('hidden');}
function saveSchedule(){
  const memberId=parseInt(document.getElementById('schMember').value);const day=document.getElementById('schDay').value;const time=document.getElementById('schTime').value;const coach=document.getElementById('schCoach').value.trim();const type=document.getElementById('schType').value;
  if(!memberId||!time||!coach){showToast('Member, waktu, dan coach wajib diisi');return;}
  if(state.editingScheduleId){state.schedules=state.schedules.map(s=>s.id===state.editingScheduleId?{...s,memberId,day,time,coach,type}:s);showToast('Jadwal diperbarui');}
  else{state.schedules.push({id:Date.now(),memberId,day,time,coach,type});showToast('Jadwal ditambahkan');}
  saveState();closeScheduleModal();renderSchedules();
}
async function deleteSchedule(id){const ok=await showConfirm({title:'Hapus Jadwal',message:'Jadwal latihan ini akan dihapus.',okLabel:'Ya, Hapus'});if(!ok)return;state.schedules=state.schedules.filter(x=>x.id!==id);saveState();renderSchedules();showToast('Jadwal dihapus');}

// ══════════════════════════════════════════════
// CATATAN & EVALUASI
// ══════════════════════════════════════════════
function renderNotes(){
  const list=document.getElementById('noteList');if(!list)return;
  const search=(document.getElementById('noteSearch')?.value||'').toLowerCase();
  const tf=document.getElementById('noteTypeFilter')?.value||'';
  const filtered=state.notes.filter(n=>(!search||getMemberName(n.memberId).toLowerCase().includes(search)||n.content.toLowerCase().includes(search))&&(!tf||n.type===tf)).sort((a,b)=>b.date.localeCompare(a.date));
  if(!filtered.length){list.innerHTML='<p class="empty-state">Tidak ada catatan.</p>';return;}
  list.innerHTML='';
  filtered.forEach(n=>{
    const div=document.createElement('div');div.className='item-box';
    const scoreHtml=n.score?`<span class="score-badge">Skor: ${n.score}/10</span>`:'';
    div.innerHTML=`<div class="item-row">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <strong>${getMemberName(n.memberId)}</strong>
          <span class="role-badge">${n.type}</span>
          ${scoreHtml}
          <small class="text-muted">${n.date}</small>
        </div>
        <p style="font-size:.875rem;color:var(--text);line-height:1.5">${n.content}</p>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;margin-left:12px">
        <button class="mini-btn" onclick="editNote(${n.id})">Edit</button>
        <button class="mini-btn danger-btn" onclick="deleteNote(${n.id})">Hapus</button>
      </div>
    </div>`;
    list.appendChild(div);
  });
}
function openNoteModal(){state.editingNoteId=null;populateMemberSelect('noteMember',null);document.getElementById('noteType').value='Catatan';document.getElementById('noteDate').value=new Date().toISOString().slice(0,10);document.getElementById('noteScore').value='';document.getElementById('noteContent').value='';document.getElementById('noteModalTitle').textContent='Tambah Catatan';document.getElementById('noteModal').classList.remove('hidden');}
function closeNoteModal(){document.getElementById('noteModal').classList.add('hidden');}
function editNote(id){const n=state.notes.find(x=>x.id===id);if(!n)return;state.editingNoteId=id;populateMemberSelect('noteMember',n.memberId);document.getElementById('noteType').value=n.type;document.getElementById('noteDate').value=n.date;document.getElementById('noteScore').value=n.score||'';document.getElementById('noteContent').value=n.content;document.getElementById('noteModalTitle').textContent='Edit Catatan';document.getElementById('noteModal').classList.remove('hidden');}
function saveNote(){
  const memberId=parseInt(document.getElementById('noteMember').value);const type=document.getElementById('noteType').value;const date=document.getElementById('noteDate').value;const score=parseInt(document.getElementById('noteScore').value)||null;const content=document.getElementById('noteContent').value.trim();
  if(!memberId||!date||!content){showToast('Member, tanggal, dan catatan wajib diisi');return;}
  if(state.editingNoteId){state.notes=state.notes.map(n=>n.id===state.editingNoteId?{...n,memberId,type,date,score,content}:n);showToast('Catatan diperbarui');}
  else{state.notes.push({id:Date.now(),memberId,type,date,score,content});showToast('Catatan disimpan');}
  saveState();closeNoteModal();renderNotes();
}
async function deleteNote(id){const ok=await showConfirm({title:'Hapus Catatan',message:'Catatan ini akan dihapus permanen.',okLabel:'Ya, Hapus'});if(!ok)return;state.notes=state.notes.filter(x=>x.id!==id);saveState();renderNotes();showToast('Catatan dihapus');}

// ══════════════════════════════════════════════
// PENGATURAN (ADMIN)
// ══════════════════════════════════════════════
function getWebConfigDefaults() {
  return {
    clubName: 'Twins Swimming Club',
    foundedYear: '2021',
    tagline: 'Klub renang profesional di Tangerang Selatan sejak 2021',
    aboutText: 'Twins Swimming Club adalah klub renang yang berfokus pada latihan aman, progresif, dan menyenangkan untuk anak-anak, remaja, hingga dewasa bersama coach berpengalaman.',
    city: 'Tangerang Selatan, Banten',
    email: 'twinsswimmingclub@gmail.com',
    instagram: '@twinsswimmingclub',
    tiktok: '@twinsswimmingclub',
    statMembers: '100+',
    statCoaches: '5+',
    statLocations: '3'
  };
}

function renderSettings(){
  renderAdminUsers();
  renderPackages();
  // Config Dashboard
  const cfg=state.config||{};
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
  set('cfgAppName',cfg.appName||'');set('cfgContact',cfg.contact||'');set('cfgRegFee',cfg.regFee||100000);set('cfgDueDay',cfg.dueDay||5);

  // Payment & WA config
  const pcfg = state.paymentConfig || {};
  set('cfgWaNumber',       pcfg.waNumber        || '');
  set('cfgReassuranceTitle',pcfg.reassuranceTitle|| '');
  set('cfgReassuranceText', pcfg.reassuranceText || '');
  set('cfgTrustPoints',     pcfg.trustPoints     || '');
  set('cfgTransferBank',    pcfg.transferBank    || '');
  set('cfgTransferAccount', pcfg.transferAccount || '');
  set('cfgTransferName',    pcfg.transferName    || '');
  set('cfgTransferNote',    pcfg.transferNote    || '');
  set('cfgQrisNote',        pcfg.qrisNote        || '');
  set('cfgInviteLink',      INVITE_LINK);
  set('cfgWaTemplateTransfer', pcfg.waTemplateTransfer || '');
  set('cfgWaTemplateQris',     pcfg.waTemplateQris     || '');

  // Render QRIS preview
  _renderQrisPreview(pcfg.qrisImageBase64 || '');
  // Render invite QR preview
  _renderInviteQrPreview(INVITE_LINK);

  // Web config
  renderWebSettings();

  // Pertahankan tab terakhir yang dibuka
  switchSettingsTab(state.settingsTab || 'dashboard');
}

// ── QRIS Image Upload ───────────────────────────────────────────
function handleQrisUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('⚠️ Ukuran gambar melebihi 2MB. Pilih gambar yang lebih kecil.');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    // Simpan langsung ke state
    if (!state.paymentConfig) state.paymentConfig = {};
    state.paymentConfig.qrisImageBase64 = base64;
    saveState();
    _renderQrisPreview(base64);
    showToast('✅ Gambar QRIS berhasil diunggah!');
  };
  reader.readAsDataURL(file);
}

function removeQrisImage() {
  if (!state.paymentConfig) state.paymentConfig = {};
  state.paymentConfig.qrisImageBase64 = '';
  saveState();
  _renderQrisPreview('');
  // Reset file input
  const fi = document.getElementById('qrisFileInput');
  if (fi) fi.value = '';
  showToast('Gambar QRIS dihapus');
}

function _renderQrisPreview(base64) {
  const img         = document.getElementById('qrisPreviewImg');
  const placeholder = document.getElementById('qrisPreviewPlaceholder');
  const removeBtn   = document.getElementById('qrisRemoveBtn');
  if (!img || !placeholder) return;

  if (base64) {
    img.src = base64;
    img.style.display = 'block';
    placeholder.style.display = 'none';
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  } else {
    img.src = '';
    img.style.display = 'none';
    placeholder.style.display = 'flex';
    if (removeBtn) removeBtn.style.display = 'none';
  }
}

function savePaymentConfig() {
  if (!state.paymentConfig) state.paymentConfig = {};
  const get = id => document.getElementById(id)?.value.trim() || '';
  state.paymentConfig.waNumber          = get('cfgWaNumber');
  state.paymentConfig.reassuranceTitle  = get('cfgReassuranceTitle');
  state.paymentConfig.reassuranceText   = get('cfgReassuranceText');
  state.paymentConfig.trustPoints       = get('cfgTrustPoints');
  state.paymentConfig.transferBank      = get('cfgTransferBank');
  state.paymentConfig.transferAccount   = get('cfgTransferAccount');
  state.paymentConfig.transferName      = get('cfgTransferName');
  state.paymentConfig.transferNote      = get('cfgTransferNote');
  state.paymentConfig.qrisNote          = get('cfgQrisNote');
  state.paymentConfig.waTemplateTransfer= get('cfgWaTemplateTransfer');
  state.paymentConfig.waTemplateQris    = get('cfgWaTemplateQris');
  // qrisImageBase64 sudah disimpan langsung saat upload, tidak perlu diambil lagi
  saveState();
  _renderInviteQrPreview(INVITE_LINK);
  showToast('✅ Pengaturan pembayaran & WA disimpan');
}

function copyInviteLink() {
  const value = INVITE_LINK;
  navigator.clipboard.writeText(value).then(() => {
    showToast('✅ Link undangan klien disalin');
  }).catch(() => {
    showToast('Gagal menyalin link. Salin manual.');
  });
}

function _renderInviteQrPreview(url) {
  const img = document.getElementById('inviteQrImage');
  const placeholder = document.getElementById('inviteQrPlaceholder');
  if (!img || !placeholder) return;
  if (url) {
    img.src = 'https://chart.googleapis.com/chart?cht=qr&chs=220x220&chl=' + encodeURIComponent(url) + '&chld=L|2';
    img.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    img.src = '';
    img.style.display = 'none';
    placeholder.style.display = 'flex';
  }
}

function downloadInviteQr(){
  const url = INVITE_LINK;
  const qrUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=600x600&chl=' + encodeURIComponent(url) + '&chld=L|2';
  fetch(qrUrl).then(r=>r.blob()).then(blob=>{
    const a = document.createElement('a');
    const objUrl = URL.createObjectURL(blob);
    a.href = objUrl;
    a.download = 'twins-invite-qr.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  }).catch(()=>{
    window.open(qrUrl,'_blank');
  });
}

// ══════════════════════════════════════════════
// SETTINGS TAB SWITCH
// ══════════════════════════════════════════════
function switchSettingsTab(tab) {
  state.settingsTab = tab;
  document.querySelectorAll('.stab-btn').forEach(b => b.classList.toggle('active', b.dataset.stab === tab));
  document.getElementById('stabDashboard').style.display = tab === 'dashboard' ? 'block' : 'none';
  document.getElementById('stabWeb').style.display       = tab === 'web'       ? 'block' : 'none';
}

// ══════════════════════════════════════════════
// WEB CONFIG (Landing Page)
// ══════════════════════════════════════════════
function saveWebConfig() {
  const defaults = getWebConfigDefaults();
  if (!state.webConfig) state.webConfig = {};
  const get = id => document.getElementById(id)?.value.trim() || '';
  state.webConfig.clubName      = get('webClubName')      || defaults.clubName;
  state.webConfig.foundedYear   = get('webFoundedYear')   || defaults.foundedYear;
  state.webConfig.tagline       = get('webTagline')       || defaults.tagline;
  state.webConfig.aboutText     = get('webAboutText')     || defaults.aboutText;
  state.webConfig.city          = get('webCity')          || defaults.city;
  state.webConfig.email         = get('webEmail')         || defaults.email;
  state.webConfig.instagram     = get('webInstagram')     || defaults.instagram;
  state.webConfig.tiktok        = get('webTiktok')        || defaults.tiktok;
  state.webConfig.statMembers   = get('webStatMembers')   || defaults.statMembers;
  state.webConfig.statCoaches   = get('webStatCoaches')   || defaults.statCoaches;
  state.webConfig.statLocations = get('webStatLocations') || defaults.statLocations;
  saveState();
  renderWebSettings();
  showToast('✅ Pengaturan web disimpan');
}

function renderWebSettings() {
  const cfg = { ...getWebConfigDefaults(), ...(state.webConfig || {}) };
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = v ?? '';
  };
  set('webClubName',      cfg.clubName);
  set('webFoundedYear',   cfg.foundedYear);
  set('webTagline',       cfg.tagline);
  set('webAboutText',     cfg.aboutText);
  set('webCity',          cfg.city);
  set('webEmail',         cfg.email);
  set('webInstagram',     cfg.instagram);
  set('webTiktok',        cfg.tiktok);
  set('webStatMembers',   cfg.statMembers);
  set('webStatCoaches',   cfg.statCoaches);
  set('webStatLocations', cfg.statLocations);

  // Render media previews (foto)
  const mediaKeys = ['heroImg','aboutImg','prog1','prog2','prog3'];
  mediaKeys.forEach(key => _renderWebMediaPreview(key, (state.webMedia || {})[key] || ''));

  // Render galeri admin
  renderGalleryAdmin();
}

// ══════════════════════════════════════════════
// GALERI KEGIATAN — ADMIN
// ══════════════════════════════════════════════

function renderGalleryAdmin() {
  const grid = document.getElementById('galleryAdminGrid');
  const countEl = document.getElementById('galleryCount');
  const uploadLabel = document.getElementById('galleryUploadLabel');
  if (!grid) return;

  const gallery = state.webGallery || [];
  if (countEl) countEl.textContent = gallery.length;
  if (uploadLabel) uploadLabel.style.opacity = gallery.length >= 10 ? '0.4' : '1';

  if (!gallery.length) {
    grid.innerHTML = '<p class="text-muted" style="font-size:.85rem">Belum ada foto galeri.</p>';
    return;
  }

  grid.innerHTML = '';
  gallery.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'gallery-admin-item';
    div.innerHTML = `
      <img src="${item.src}" alt="${item.caption||''}" loading="lazy" />
      <div class="gallery-admin-overlay">
        <input class="gallery-admin-caption" type="text" value="${item.caption||''}"
          placeholder="Caption foto…"
          onchange="updateGalleryCaption(${idx}, this.value)" />
      </div>
      <button class="gallery-admin-del" onclick="deleteGalleryItem(${idx})" title="Hapus">✕</button>
    `;
    grid.appendChild(div);
  });
}

function handleGalleryUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;
  const gallery = state.webGallery || [];
  const remaining = 10 - gallery.length;
  if (remaining <= 0) { showToast('⚠️ Maksimum 10 foto galeri'); return; }

  const toProcess = files.slice(0, remaining);
  let processed = 0;

  toProcess.forEach(file => {
    if (!file.type.startsWith('image/')) { processed++; return; }
    if (file.size > 3 * 1024 * 1024) { showToast(`⚠️ ${file.name} melebihi 3MB, dilewati`); processed++; return; }
    const reader = new FileReader();
    reader.onload = e => {
      if (!state.webGallery) state.webGallery = [];
      state.webGallery.push({ src: e.target.result, caption: '' });
      processed++;
      if (processed === toProcess.length) {
        saveState();
        renderGalleryAdmin();
        showToast(`✅ ${toProcess.length} foto berhasil diunggah!`);
      }
    };
    reader.readAsDataURL(file);
  });

  event.target.value = '';
}

function updateGalleryCaption(idx, caption) {
  if (!state.webGallery || !state.webGallery[idx]) return;
  state.webGallery[idx].caption = caption;
  saveState();
}

function deleteGalleryItem(idx) {
  if (!state.webGallery) return;
  state.webGallery.splice(idx, 1);
  saveState();
  renderGalleryAdmin();
  showToast('Foto dihapus');
}

function handleWebMediaUpload(event, key) {
  const file = event.target.files[0];
  if (!file) return;
  const maxMB = key === 'heroImg' || key === 'aboutImg' ? 5 : 3;
  if (file.size > maxMB * 1024 * 1024) { showToast(`⚠️ Ukuran melebihi ${maxMB}MB`); event.target.value=''; return; }
  const reader = new FileReader();
  reader.onload = e => {
    if (!state.webMedia) state.webMedia = {};
    state.webMedia[key] = e.target.result;
    saveState();
    _renderWebMediaPreview(key, e.target.result);
    showToast('✅ Foto berhasil diunggah!');
  };
  reader.readAsDataURL(file);
}

function removeWebMedia(key) {
  if (!state.webMedia) return;
  state.webMedia[key] = '';
  saveState();
  _renderWebMediaPreview(key, '');
  const inputMap = { heroImg: 'heroImgInput', aboutImg: 'aboutImgInput', prog1: 'prog1Input', prog2: 'prog2Input', prog3: 'prog3Input' };
  const inp = document.getElementById(inputMap[key]);
  if (inp) inp.value = '';
  showToast('Media dihapus');
}

function _renderWebMediaPreview(key, base64) {
  const imgMap = { heroImg: 'heroImgPreviewImg', aboutImg: 'aboutImgPreviewImg', prog1: 'prog1Img', prog2: 'prog2Img', prog3: 'prog3Img' };
  const phMap  = { heroImg: 'heroImgPlaceholder', aboutImg: 'aboutImgPlaceholder', prog1: 'prog1Placeholder', prog2: 'prog2Placeholder', prog3: 'prog3Placeholder' };
  const rmMap  = { heroImg: 'heroImgRemoveBtn', aboutImg: 'aboutImgRemoveBtn', prog1: 'prog1RemoveBtn', prog2: 'prog2RemoveBtn', prog3: 'prog3RemoveBtn' };

  const img = document.getElementById(imgMap[key]);
  const ph  = document.getElementById(phMap[key]);
  const rm  = document.getElementById(rmMap[key]);

  if (!img || !ph) return;
  if (base64) {
    img.src = base64; img.style.display = 'block'; ph.style.display = 'none';
    if (rm) rm.style.display = 'inline-flex';
  } else {
    img.src = ''; img.style.display = 'none'; ph.style.display = 'flex';
    if (rm) rm.style.display = 'none';
  }
}

function renderAdminUsers(){
  const list=document.getElementById('adminUserList');if(!list)return;
  list.innerHTML='';
  (state.adminUsers||[]).forEach(u=>{
    const div=document.createElement('div');div.className='item-box';
    div.innerHTML=`<div class="item-row">
      <div style="display:flex;align-items:center;gap:10px;flex:1">
        <div class="user-avatar" style="width:32px;height:32px;font-size:.75rem">${u.name.charAt(0)}</div>
        <div><strong style="font-size:.875rem">${u.name}</strong><br><small class="text-muted">${u.email}</small></div>
        <span class="role-badge">${u.role}</span>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="mini-btn" onclick="editAdminUser(${u.id})">Edit</button>
        <button class="mini-btn danger-btn" onclick="deleteAdminUser(${u.id})">Hapus</button>
      </div>
    </div>`;
    list.appendChild(div);
  });
}

function openAdminUserModal(){state.editingAdminUserId=null;['auName','auEmail','auPassword'].forEach(id=>document.getElementById(id).value='');document.getElementById('auRole').value='Coach';document.getElementById('adminUserModalTitle').textContent='Tambah Akun';document.getElementById('adminUserModal').classList.remove('hidden');}
function closeAdminUserModal(){document.getElementById('adminUserModal').classList.add('hidden');}
function editAdminUser(id){const u=state.adminUsers.find(x=>x.id===id);if(!u)return;state.editingAdminUserId=id;document.getElementById('auName').value=u.name;document.getElementById('auEmail').value=u.email;document.getElementById('auPassword').value='';document.getElementById('auRole').value=u.role;document.getElementById('adminUserModalTitle').textContent='Edit Akun';document.getElementById('adminUserModal').classList.remove('hidden');}
async function saveAdminUser(){
  const name=document.getElementById('auName').value.trim();const email=document.getElementById('auEmail').value.trim();const password=document.getElementById('auPassword').value;const role=document.getElementById('auRole').value;
  if(!name||!email){showToast('Nama dan email wajib diisi');return;}
  if(!state.adminUsers) state.adminUsers=[];
  if(state.editingAdminUserId){
    const hashedPw = password ? await hashPassword(password) : state.adminUsers.find(u=>u.id===state.editingAdminUserId)?.password;
    state.adminUsers=state.adminUsers.map(u=>u.id===state.editingAdminUserId?{...u,name,email,password:hashedPw,role}:u);
    showToast('Akun diperbarui');
  } else {
    if(!password){showToast('Password wajib diisi untuk akun baru');return;}
    const hashedPw = await hashPassword(password);
    state.adminUsers.push({id:Date.now(),name,email,password:hashedPw,role});
    showToast('Akun ditambahkan');
  }
  saveState();closeAdminUserModal();renderAdminUsers();
}
async function deleteAdminUser(id){
  if(currentUser&&currentUser.id===id){showToast('Tidak bisa menghapus akun yang sedang aktif');return;}
  const ok=await showConfirm({title:'Hapus Akun',message:'Akun pengguna ini akan dihapus.',okLabel:'Ya, Hapus'});
  if(!ok)return;state.adminUsers=state.adminUsers.filter(x=>x.id!==id);saveState();renderAdminUsers();showToast('Akun dihapus');
}

function renderPackages(){
  const list=document.getElementById('packageList');if(!list)return;
  list.innerHTML='';
  (state.packages||[]).forEach(p=>{
    const status = p.status || (p.popular ? 'popular' : 'none');
    const statusLabel = status === 'popular'
      ? '⭐ Paling Populer'
      : status === 'recommended'
      ? '✨ Rekomendasi'
      : status === 'exclusive'
      ? '🔒 Eksklusif'
      : '';
    const div=document.createElement('div');div.className='item-box';
    div.innerHTML=`<div class="item-row">
      <div style="flex:1">
        <strong>${p.name}</strong>&nbsp;<strong class="text-positive">${formatRp(p.price)}/bln</strong>
        ${statusLabel ? `<span class="text-positive" style="font-size:.75rem;margin-left:8px">${statusLabel}</span>` : ''}
        <br><small class="text-muted">${p.desc||''}</small>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="mini-btn" onclick="editPackage(${p.id})">Edit</button>
        <button class="mini-btn danger-btn" onclick="deletePackage(${p.id})">Hapus</button>
      </div>
    </div>`;
    list.appendChild(div);
  });
}
function openPackageModal(){
  state.editingPackageId=null;
  ['pkgName','pkgDesc'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('pkgPrice').value='';
  Array.from(document.getElementsByName('pkgStatus')).forEach(r=>r.checked = r.value === 'none');
  document.getElementById('packageModalTitle').textContent='Tambah Paket';
  document.getElementById('packageModal').classList.remove('hidden');
}
function closePackageModal(){document.getElementById('packageModal').classList.add('hidden');}
function editPackage(id){
  const p=state.packages.find(x=>x.id===id);
  if(!p)return;
  state.editingPackageId=id;
  document.getElementById('pkgName').value=p.name;
  document.getElementById('pkgPrice').value=p.price;
  document.getElementById('pkgDesc').value=p.desc||'';
  const status = p.status || (p.popular ? 'popular' : 'none');
  Array.from(document.getElementsByName('pkgStatus')).forEach(r=>r.checked = r.value === status);
  document.getElementById('packageModalTitle').textContent='Edit Paket';
  document.getElementById('packageModal').classList.remove('hidden');
}
function savePackage(){
  const name=document.getElementById('pkgName').value.trim();
  const price=parseInt(document.getElementById('pkgPrice').value)||0;
  const desc=document.getElementById('pkgDesc').value.trim();
  const status = Array.from(document.getElementsByName('pkgStatus')).find(r=>r.checked)?.value || 'none';
  const popular = status === 'popular';
  if(!name||!price){showToast('Nama dan harga wajib diisi');return;}
  if(!state.packages)state.packages=[];
  if(state.editingPackageId){
    state.packages=state.packages.map(p=>p.id===state.editingPackageId?{...p,name,price,desc,status,popular}:p);
    showToast('Paket diperbarui');
  } else {
    state.packages.push({id:Date.now(),name,price,desc,status,popular});
    showToast('Paket ditambahkan');
  }
  saveState();closePackageModal();renderPackages();
}
async function deletePackage(id){const ok=await showConfirm({title:'Hapus Paket',message:'Paket ini akan dihapus.',okLabel:'Ya, Hapus'});if(!ok)return;state.packages=state.packages.filter(x=>x.id!==id);saveState();renderPackages();showToast('Paket dihapus');}

function saveConfig(){
  if(!state.config)state.config={};
  state.config.appName=document.getElementById('cfgAppName').value.trim();
  state.config.contact=document.getElementById('cfgContact').value.trim();
  state.config.regFee=parseInt(document.getElementById('cfgRegFee').value)||100000;
  state.config.dueDay=parseInt(document.getElementById('cfgDueDay').value)||5;
  saveState();
  applyAppInfo();
  showToast('Konfigurasi disimpan');
}

// ══════════════════════════════════════════════
// GRAFIK PERFORMA DASHBOARD
// ══════════════════════════════════════════════
function renderDashboardCharts() {
  renderRevenueChart();
  renderPayStatusChart();
  renderProgressChart();
}

function setCanvasHiDPI(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

// 3 — Grafik bar DRAW dari nol (animasi)
function renderRevenueChart() {
  const canvas = document.getElementById('revenueChartDash');
  if (!canvas) return;
  const parentRect = canvas.parentElement.getBoundingClientRect();
  const ctx = setCanvasHiDPI(canvas, parentRect.width || 300, parentRect.height || 220);
  const W = parentRect.width || 300;
  const H = parentRect.height || 220;

  const months = [], revenues = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    months.push(d.toLocaleString('id-ID', { month: 'short' }));
    revenues.push(state.payments.filter(p=>p.status==='Lunas'&&p.date.startsWith(key)).reduce((a,p)=>a+Number(p.amount),0));
  }

  const pad=30, maxVal=Math.max(...revenues,1);
  const bw=(W-pad*2)/months.length*0.55;
  const gap=(W-pad*2)/months.length;

  const startTime = performance.now();
  const duration  = 900;

  function drawFrame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(29,111,196,0.08)';
    ctx.lineWidth = 1;
    const levels = [0, 0.25, 0.5, 0.75, 1];
    levels.forEach((r, index) => {
      const y = pad + (1 - r) * (H - pad * 2);
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(W - pad, y);
      ctx.stroke();

      if (index > 0) {
        ctx.fillStyle = '#7fa3cc';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatRp(Math.round(maxVal * r)).replace('Rp ', ''), pad - 6, y);
      }
    });

    // Animated bars
    revenues.forEach((v, i) => {
      const x = pad + gap * i + (gap - bw) / 2;
      const fullH = (v / maxVal) * (H - pad * 2);
      const bh = Math.max(fullH * ease, 8);
      const y = pad + (H - pad * 2) - bh;
      const g = ctx.createLinearGradient(0, y, 0, H - pad);
      g.addColorStop(0, '#1d6fc4');
      g.addColorStop(1, '#60a5fa');
      ctx.fillStyle = v === 0 ? 'rgba(29,111,196,0.15)' : g;
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 6);
      ctx.fill();
    });

    // Labels
    ctx.fillStyle = '#1f456e';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    months.forEach((m, i) => ctx.fillText(m, pad + gap * i + gap / 2, H - 18));

    if (progress < 1) requestAnimationFrame(drawFrame);
  }
  requestAnimationFrame(drawFrame);
}

function renderPayStatusChart() {
  const canvas = document.getElementById('payStatusChart');
  const legend = document.getElementById('payStatusLegend');
  if (!canvas) return;

  // Fixed size: always 160×160 regardless of layout timing
  const side = 160;
  canvas.style.width  = side + 'px';
  canvas.style.height = side + 'px';
  canvas.style.flexShrink = '0';
  const ctx = setCanvasHiDPI(canvas, side, side);
  const W = side, H = side;
  const month=thisMonthStr();
  const lunas   = state.payments.filter(p=>p.date.startsWith(month)&&p.status==='Lunas').length;
  const tunggak = state.payments.filter(p=>p.date.startsWith(month)&&p.status==='Menunggak').length;
  const total   = lunas+tunggak || 1;
  // radius proportional to fixed side
  const cx=W/2, cy=H/2, r=62, ir=38;
  const slices=[{v:lunas,c:'#1d6fc4',l:'Lunas'},{v:tunggak,c:'#ef4444',l:'Menunggak'}];

  // 3 — Donut draw animasi sweep
  const startTime = performance.now();
  const duration  = 800;
  function drawDonut(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    ctx.clearRect(0,0,W,H);
    let angle=-Math.PI/2;
    slices.forEach(s=>{
      const fullSweep=(s.v/total)*Math.PI*2;
      const sweep = fullSweep * ease;
      if (sweep <= 0) { angle += fullSweep; return; }
      ctx.beginPath(); ctx.arc(cx,cy,r,angle,angle+sweep);
      ctx.lineTo(cx+Math.cos(angle+sweep)*ir, cy+Math.sin(angle+sweep)*ir);
      ctx.arc(cx,cy,ir,angle+sweep,angle,true); ctx.closePath();
      ctx.fillStyle=s.c; ctx.fill();
      angle+=fullSweep;
    });
    if (progress < 1) requestAnimationFrame(drawDonut);
  }
  requestAnimationFrame(drawDonut);

  if (legend) legend.innerHTML = slices.map(s=>`
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <span style="width:10px;height:10px;border-radius:50%;background:${s.c};display:inline-block;flex-shrink:0"></span>
      <span>${s.l}: <strong>${s.v}</strong></span>
    </div>`).join('');
}

function renderProgressChart() {
  const canvas = document.getElementById('progressChart');
  if (!canvas) return;
  const parentRect = canvas.parentElement.getBoundingClientRect();
  const ctx = setCanvasHiDPI(canvas, parentRect.width || 300, parentRect.height || 180);
  const W = parentRect.width || 300;
  const H = parentRect.height || 180;
  ctx.clearRect(0,0,W,H);

  // Average score per member
  const members = state.members.filter(m=>m.status==='Aktif').slice(0,5);
  if (!members.length) { ctx.fillStyle='#7fa3cc'; ctx.font='13px Inter,sans-serif'; ctx.textAlign='center'; ctx.fillText('Belum ada data progress',W/2,H/2); return; }

  const scores = members.map(m=>{
    const ns=state.notes.filter(n=>n.memberId===m.id&&n.score);
    return ns.length ? ns.reduce((a,n)=>a+n.score,0)/ns.length : 0;
  });
  const labels=members.map(m => {
    const firstName = m.name.split(' ')[0] || m.name;
    return firstName.length > 8 ? firstName.slice(0, 7) + '…' : firstName;
  });
  const maxVal=10;
  const pad=45, bw=(W-pad*2)/members.length*0.5;
  const gap=(W-pad*2)/members.length;

  ctx.strokeStyle='rgba(29,111,196,0.1)'; ctx.lineWidth=1;
  [2,4,6,8,10].forEach(v=>{
    const y=pad+(1-v/maxVal)*(H-pad*2);
    ctx.beginPath(); ctx.moveTo(pad,y); ctx.lineTo(W-pad,y); ctx.stroke();
    ctx.fillStyle='#7fa3cc'; ctx.font='10px Inter,sans-serif'; ctx.textAlign='right';
    ctx.textBaseline='middle';
    ctx.fillText(v, pad-4, y);
  });

  scores.forEach((v,i)=>{
    const x=pad+gap*i+(gap-bw)/2;
    const bh=(v/maxVal)*(H-pad*2);
    const y=pad+(H-pad*2)-bh;
    ctx.fillStyle=v>=7?'#1d6fc4':v>=4?'#60a5fa':'#bfdbfe';
    ctx.beginPath(); ctx.roundRect(x,y,bw,bh||2,3); ctx.fill();
  });

  ctx.fillStyle='#4a6fa5'; ctx.font='11px Inter,sans-serif'; ctx.textAlign='center';
  ctx.textBaseline='top';
  labels.forEach((l,i)=>ctx.fillText(l, pad+gap*i+gap/2, H-14));
}

// ══════════════════════════════════════════════
// PROGRESS MEMBER (FR-07)
// ══════════════════════════════════════════════
function renderProgress() {
  const sel = document.getElementById('progressMemberFilter');
  const container = document.getElementById('progressContent');
  if (!container) return;

  // Populate dropdown
  if (sel) {
    const prev = sel.value;
    sel.innerHTML = '<option value="">— Pilih Member —</option>';
    state.members.forEach(m => {
      const o = document.createElement('option');
      o.value = m.id; o.textContent = m.name;
      if (m.id == prev) o.selected = true;
      sel.appendChild(o);
    });
  }

  const memberId = parseInt(sel?.value);
  if (!memberId) {
    container.innerHTML = '<p class="empty-state">Pilih member untuk melihat progress.</p>';
    return;
  }

  const member   = state.members.find(m => m.id === memberId);
  const notes    = state.notes.filter(n => n.memberId === memberId).sort((a,b)=>a.date.localeCompare(b.date));
  const schedules= state.schedules.filter(s => s.memberId === memberId);
  const payments = state.payments.filter(p => p.memberId === memberId);
  const scores   = notes.filter(n => n.score).map(n => n.score);
  const avgScore = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : '—';
  const lastScore= scores.length ? scores[scores.length-1] : null;
  const trend    = scores.length >= 2 ? (scores[scores.length-1] > scores[scores.length-2] ? '▲' : '▼') : '→';

  container.innerHTML = `
    <div class="progress-grid">
      <!-- Member Info -->
      <div class="card">
        <h3>Profil Member</h3>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
          <div class="user-avatar" style="width:52px;height:52px;font-size:1.1rem;">
            ${member.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
          </div>
          <div>
            <p style="font-weight:700;font-size:1rem;">${member.name}</p>
            <p class="text-muted" style="font-size:.82rem;">${member.phone}</p>
            <span class="status-pill ${member.status==='Aktif'?'completed':'pending'}">${member.status}</span>
          </div>
        </div>
        <div class="progress-info-row"><span class="text-muted">Paket</span><strong>${member.package}</strong></div>
        <div class="progress-info-row"><span class="text-muted">Lokasi</span><strong>${getLocationName(member.locationId)}</strong></div>
        <div class="progress-info-row"><span class="text-muted">Bergabung</span><strong>${member.joinDate}</strong></div>
        <div class="progress-info-row"><span class="text-muted">Jadwal/Minggu</span><strong>${schedules.length}x</strong></div>
      </div>

      <!-- Score Summary -->
      <div class="card">
        <h3>Ringkasan Evaluasi</h3>
        <div class="score-summary">
          <div class="score-big">${avgScore}</div>
          <div class="score-label">Rata-rata Skor</div>
          <div class="score-trend ${scores.length>=2&&scores[scores.length-1]>scores[scores.length-2]?'up':'down'}">${trend} ${lastScore ? 'Terakhir: '+lastScore+'/10' : 'Belum ada skor'}</div>
        </div>
        <div style="margin-top:16px;">
          <p class="text-muted" style="font-size:.78rem;margin-bottom:8px;">RIWAYAT SKOR</p>
          <div class="score-history">
            ${scores.length ? scores.map((s,i)=>`
              <div class="score-bar-item">
                <div class="score-bar-fill" style="height:${(s/10)*60}px;background:${s>=7?'var(--primary)':s>=5?'#60a5fa':'#bfdbfe'}"></div>
                <small>${s}</small>
              </div>`).join('') : '<p class="empty-state">Belum ada data skor</p>'}
          </div>
        </div>
      </div>

      <!-- Payment Status -->
      <div class="card">
        <h3>Status Pembayaran</h3>
        <div class="progress-info-row"><span class="text-muted">Total Transaksi</span><strong>${payments.length}</strong></div>
        <div class="progress-info-row"><span class="text-muted">Lunas</span><strong class="text-positive">${payments.filter(p=>p.status==='Lunas').length}</strong></div>
        <div class="progress-info-row"><span class="text-muted">Menunggak</span><strong class="text-negative">${payments.filter(p=>p.status==='Menunggak').length}</strong></div>
        <div class="progress-info-row"><span class="text-muted">Total Dibayar</span><strong>${formatRp(payments.filter(p=>p.status==='Lunas').reduce((a,p)=>a+Number(p.amount),0))}</strong></div>
      </div>
    </div>

    <!-- Notes History -->
    <div class="card" style="margin-top:16px;">
      <h3>Histori Catatan &amp; Evaluasi</h3>
      ${notes.length ? `<table class="dashboard-table">
        <thead><tr><th>Tanggal</th><th>Tipe</th><th>Skor</th><th>Catatan</th></tr></thead>
        <tbody>${notes.reverse().map(n=>`
          <tr>
            <td>${n.date}</td>
            <td><span class="role-badge">${n.type}</span></td>
            <td>${n.score ? `<span class="score-badge">${n.score}/10</span>` : '—'}</td>
            <td style="font-size:.85rem;">${n.content}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<p class="empty-state">Belum ada catatan untuk member ini.</p>'}
    </div>`;
}

// ══════════════════════════════════════════════
// LAPORAN (FR-08)
// ══════════════════════════════════════════════
function renderReports() {
  const month = thisMonthStr();
  const now   = new Date();
  const lastM = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMonthStr = `${lastM.getFullYear()}-${String(lastM.getMonth()+1).padStart(2,'0')}`;

  const pf = document.getElementById('rptPeriodFilter')?.value || '';
  let filtered = [...state.payments];
  if (pf === 'thisMonth')  filtered = filtered.filter(p => p.date.startsWith(month));
  else if (pf === 'lastMonth') filtered = filtered.filter(p => p.date.startsWith(lastMonthStr));
  else if (pf === 'thisYear')  filtered = filtered.filter(p => p.date.startsWith(now.getFullYear().toString()));

  // Coach filter
  const cf = document.getElementById('rptCoachFilter')?.value || '';
  const coachSel = document.getElementById('rptCoachFilter');
  if (coachSel && coachSel.options.length <= 1) {
    const coaches = [...new Set(state.schedules.map(s=>s.coach))];
    coaches.forEach(c => { const o=document.createElement('option'); o.value=c; o.textContent=c; coachSel.appendChild(o); });
  }

  // KPI
  const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  set('rptMembers',  state.members.filter(m=>m.status==='Aktif').length);
  set('rptSessions', state.schedules.length);
  set('rptRevenue',  formatRp(filtered.filter(p=>p.status==='Lunas').reduce((a,p)=>a+Number(p.amount),0)));
  set('rptOverdue',  filtered.filter(p=>p.status==='Menunggak').length);

  // Summary table
  const table = document.getElementById('reportSummaryTable');
  if (!table) return;

  // Group by member
  const summary = state.members.map(m => {
    const mp = filtered.filter(p => p.memberId === m.id);
    const lunas  = mp.filter(p=>p.status==='Lunas').reduce((a,p)=>a+Number(p.amount),0);
    const tunggak= mp.filter(p=>p.status==='Menunggak').length;
    const lastNote = state.notes.filter(n=>n.memberId===m.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
    return { ...m, lunas, tunggak, lastNote };
  }).filter(m => m.lunas > 0 || m.tunggak > 0);

  if (!summary.length) { table.innerHTML = '<p class="empty-state">Tidak ada data untuk periode ini.</p>'; return; }

  table.innerHTML = `<table class="dashboard-table">
    <thead><tr><th>Member</th><th>Lokasi</th><th>Paket</th><th>Total Bayar</th><th>Menunggak</th><th>Progress Terakhir</th></tr></thead>
    <tbody>${summary.map(m=>`<tr>
      <td><strong>${m.name}</strong></td>
      <td>${getLocationName(m.locationId)}</td>
      <td><span class="role-badge">${m.package}</span></td>
      <td class="text-positive"><strong>${formatRp(m.lunas)}</strong></td>
      <td>${m.tunggak > 0 ? `<span class="status-pill pending">${m.tunggak} tagihan</span>` : '<span class="status-pill completed">Lunas</span>'}</td>
      <td>${m.lastNote ? `<span class="score-badge">${m.lastNote.score||'—'}/10</span> <small class="text-muted">${m.lastNote.date}</small>` : '<small class="text-muted">—</small>'}</td>
    </tr>`).join('')}
    </tbody>
  </table>`;
}

function exportReportCSV() {
  const rows = state.members.map(m => {
    const mp = state.payments.filter(p=>p.memberId===m.id);
    const lunas = mp.filter(p=>p.status==='Lunas').reduce((a,p)=>a+Number(p.amount),0);
    const tunggak = mp.filter(p=>p.status==='Menunggak').length;
    return `"${m.name}","${getLocationName(m.locationId)}","${m.package}",${lunas},${tunggak},"${m.status}"`;
  });
  const h = 'Nama,Lokasi,Paket,Total Bayar,Menunggak,Status\n';
  const blob = new Blob([h+rows.join('\n')], {type:'text/csv'});
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'),{href:url,download:'twins-laporan.csv'}).click();
  URL.revokeObjectURL(url);
  showToast('CSV laporan diunduh');
}

function exportReportPDF() {
  const rows = state.members.map(m => {
    const mp = state.payments.filter(p=>p.memberId===m.id);
    const lunas = mp.filter(p=>p.status==='Lunas').reduce((a,p)=>a+Number(p.amount),0);
    const tunggak = mp.filter(p=>p.status==='Menunggak').length;
    return `<tr><td>${m.name}</td><td>${getLocationName(m.locationId)}</td><td>${m.package}</td>
      <td style="color:#16a34a">${formatRp(lunas)}</td>
      <td style="color:${tunggak>0?'#dc2626':'#16a34a'}">${tunggak>0?tunggak+' tagihan':'Lunas'}</td>
      <td>${m.status}</td></tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Laporan TWINS</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}
    h1{color:#1d6fc4;margin-bottom:4px}p.sub{color:#666;font-size:13px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#1d6fc4;color:#fff;padding:8px 12px;text-align:left}
    td{padding:8px 12px;border-bottom:1px solid #e5e7eb}tr:nth-child(even){background:#f0f6ff}
    </style></head><body>
    <h1>${state.config?.appName || 'TWINS Platform Pelatihan Renang'} — Laporan Member</h1>
    <p class="sub">Dicetak: ${new Date().toLocaleDateString('id-ID',{dateStyle:'long'})}</p>
    <table><thead><tr><th>Nama</th><th>Lokasi</th><th>Paket</th><th>Total Bayar</th><th>Status Bayar</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
  const w = window.open('','_blank');
  w.document.write(html); w.document.close();
  setTimeout(()=>w.print(), 400);
  showToast('PDF laporan siap dicetak');
}

// ══════════════════════════════════════════════
// NOTIFIKASI IN-APP (FR-10)
// ══════════════════════════════════════════════
function checkNotifications() {
  const overdue = state.payments.filter(p => p.status === 'Menunggak');
  const banner  = document.getElementById('notifBanner');
  const text    = document.getElementById('notifText');
  if (!banner || !text) return;
  if (overdue.length > 0) {
    const names = [...new Set(overdue.map(p => getMemberName(p.memberId)))].slice(0,3).join(', ');
    text.textContent = `⚠ ${overdue.length} tagihan menunggak: ${names}${overdue.length > 3 ? ' dan lainnya' : ''}`;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

// ══════════════════════════════════════════════
// STRUKTUR ORGANISASI
// ══════════════════════════════════════════════

function renderOrgChart() {
  const container = document.getElementById('orgChartContainer');
  if (!container) return;

  const members = Array.isArray(state.orgMembers) ? normalizeOrgMembers(state.orgMembers) : [];
  if (!members || !members.length) {
    container.innerHTML = '<p class="empty-state">Belum ada data organisasi. Klik "+ Tambah Anggota" untuk memulai.</p>';
    return;
  }

  const levelLabels = { head: 'Head Coach', senior: 'Senior Coach', coach: 'Coach / Trainer', staff: 'Staff' };
  const levelOrder  = ['head', 'senior', 'coach', 'staff'];
  const sortedMembers = [...members].sort((a, b) => {
    if ((a.parentId || 0) !== (b.parentId || 0)) return (a.parentId || 0) - (b.parentId || 0);
    return String(a.name || '').localeCompare(String(b.name || ''), 'id');
  });

  // Group by level
  const grouped = {};
  levelOrder.forEach(l => { grouped[l] = sortedMembers.filter(m => m.level === l); });

  let html = '<div class="org-tree">';

  levelOrder.forEach((level, li) => {
    const group = grouped[level];
    if (!group.length) return;

    html += `<div class="org-level">`;

    // Level label on left
    html += `<div class="org-level-label"><span>${levelLabels[level]}</span></div>`;

    html += `<div class="org-level-cards">`;
    group.forEach(m => {
      const parentName = m.parentId ? (sortedMembers.find(x => x.id === m.parentId)?.name || '') : '';
      const isAdmin    = currentUser?.role === 'Admin';
      html += `
        <div class="org-card org-card--${level}">
          <div class="org-card-avatar">${m.photo ? `<img src="${m.photo}" style="width:100%;height:100%;object-fit:cover" />` : m.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
          <div class="org-card-body">
            <p class="org-card-name">${m.name}</p>
            <p class="org-card-title">${m.title}</p>
            ${m.spec ? `<p class="org-card-spec">${m.spec}</p>` : ''}
            ${parentName ? `<p class="org-card-reports">Lapor ke: <em>${parentName.split(',')[0]}</em></p>` : ''}
            ${m.phone ? `<p class="org-card-phone">WA: ${m.phone}</p>` : ''}
          </div>
          ${isAdmin ? `
          <div class="org-card-actions">
            ${m.phone ? `<button class="mini-btn" onclick="chatMember('${(m.phone||'').replace(/'/g,'\\\'')}')">Chat WA</button>` : ''}
            <button class="mini-btn" onclick="editOrgMember(${m.id})">Edit</button>
            <button class="mini-btn danger-btn" onclick="deleteOrgMember(${m.id})">Hapus</button>
          </div>` : ''}
        </div>`;
    });
    html += `</div></div>`;

    // Connector line between levels
    if (li < levelOrder.filter(l => grouped[l].length).length - 1) {
      html += `<div class="org-connector"></div>`;
    }
  });

  html += '</div>';
  container.innerHTML = html;
}

const JABATAN_OPTIONS = ['Head Coach', 'Senior Coach', 'Co-Coach', 'Trainer', 'Manager', 'Staff Admin'];

function populateTitleRadios(selectedValue = '') {
  const tbody = document.getElementById('orgTitleTableBody');
  const input = document.getElementById('orgTitle');
  input.value = selectedValue;

  const selectedTrimmed = selectedValue.trim();
  const isCustom = selectedTrimmed && !JABATAN_OPTIONS.includes(selectedTrimmed);
  
  let html = '';
  JABATAN_OPTIONS.forEach((job, idx) => {
    const isChecked = selectedTrimmed === job;
    const bg = idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)';
    html += `
      <tr style="border-bottom:1px solid var(--border); background:${bg}; cursor:pointer;" onclick="document.getElementById('orgTitle').value='${job}'; document.getElementById('rbJob_${idx}').checked=true; document.getElementById('orgTitle').focus();">
        <td style="padding:8px; text-align:center;">
          <input type="radio" id="rbJob_${idx}" name="orgTitleRadio" value="${job}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px;" onclick="document.getElementById('orgTitle').value='${job}'; document.getElementById('orgTitle').focus(); event.stopPropagation();">
        </td>
        <td style="padding:8px;">${job}</td>
      </tr>
    `;
  });
  
  // Custom option row
  const bgCustom = JABATAN_OPTIONS.length % 2 === 0 ? 'var(--surface)' : 'var(--bg)';
  html += `
    <tr style="background:${bgCustom}; cursor:pointer;" onclick="document.getElementById('orgTitle').focus(); document.getElementById('rbJob_custom').checked=true;">
      <td style="padding:8px; text-align:center;">
        <input type="radio" id="rbJob_custom" name="orgTitleRadio" value="Lainnya" ${isCustom ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px;" onclick="document.getElementById('orgTitle').focus(); event.stopPropagation();">
      </td>
      <td style="padding:8px;"><em>Ketik Manual (Lainnya)</em></td>
    </tr>
  `;
  
  tbody.innerHTML = html;
  
  // Update custom radio when user types in input
  input.oninput = () => {
    const val = input.value.trim();
    const idx = JABATAN_OPTIONS.indexOf(val);
    if (idx !== -1) {
      document.getElementById('rbJob_' + idx).checked = true;
    } else {
      document.getElementById('rbJob_custom').checked = true;
    }
  };
}

function openOrgModal() {
  state.editingOrgId = null;
  ['orgName','orgSpec','orgPhone'].forEach(id => document.getElementById(id).value = '');
  populateTitleRadios('');
  document.getElementById('orgLevel').value = 'coach';
  populateOrgParentSelect(null);
  document.getElementById('orgModalTitle').textContent = 'Tambah Anggota';
  document.getElementById('orgModal').classList.remove('hidden');
}

function closeOrgModal() {
  document.getElementById('orgModal').classList.add('hidden');
}

function editOrgMember(id) {
  // Gunakan state.orgMembers apa adanya — jika kosong, tetap kosong
  if (!Array.isArray(state.orgMembers)) state.orgMembers = [];
  const members = state.orgMembers;
  const m = members.find(x => x.id === id);
  if (!m) return;
  state.editingOrgId = id;
  document.getElementById('orgName').value  = m.name;
  populateTitleRadios(m.title);
  document.getElementById('orgSpec').value  = m.spec || '';
  document.getElementById('orgPhone').value = m.phone || '';
  document.getElementById('orgLevel').value = m.level;
  populateOrgParentSelect(m.parentId, id);
  // Load foto jika ada
  const photoData = m.photo || '';
  document.getElementById('orgPhotoData').value = photoData;
  document.getElementById('orgPhotoInput').value = '';
  const prev = document.getElementById('orgPhotoPreview');
  if (prev) {
    if (photoData) {
      prev.innerHTML = `<img src="${photoData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
      prev.style.background = 'transparent';
    } else {
      const initChar = (m.name || '?').charAt(0).toUpperCase();
      prev.innerHTML = initChar;
      prev.style.background = 'linear-gradient(135deg,#1458a3,#2280e8)';
    }
  }
  document.getElementById('orgModalTitle').textContent = 'Edit Anggota';
  document.getElementById('orgModal').classList.remove('hidden');
}

function populateOrgParentSelect(selectedId, excludeId) {
  const sel = document.getElementById('orgParent');
  if (!sel) return;
  const members = Array.isArray(state.orgMembers) ? state.orgMembers : [];
  sel.innerHTML = '<option value="">— Tidak ada (posisi puncak) —</option>';
  members.filter(m => m.id !== excludeId).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name.split(',')[0]} — ${m.title}`;
    if (m.id == selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function saveOrgMember() {
  const name     = document.getElementById('orgName').value.trim();
  const title    = document.getElementById('orgTitle').value.trim();
  const spec     = document.getElementById('orgSpec').value.trim();
  const phone    = document.getElementById('orgPhone').value.trim();
  const level    = document.getElementById('orgLevel').value;
  const parentId = parseInt(document.getElementById('orgParent').value) || null;
  const photo    = document.getElementById('orgPhotoData').value || '';

  if (!name || !title) { showToast('Nama dan jabatan wajib diisi'); return; }

  // Jika state.orgMembers belum ada, inisialisasi dengan array kosong (tidak fallback ke default)
  if (!Array.isArray(state.orgMembers)) state.orgMembers = [];
  if (state.editingOrgId && parentId === state.editingOrgId) {
    showToast('Atasan tidak boleh memilih dirinya sendiri');
    return;
  }

  if (state.editingOrgId) {
    state.orgMembers = state.orgMembers.map(m =>
      m.id === state.editingOrgId ? { ...m, name, title, spec, phone, level, parentId, photo } : m
    );
    showToast('Data diperbarui');
  } else {
    state.orgMembers.push({ id: Date.now(), name, title, spec, phone, level, parentId, photo });
    showToast('Anggota ditambahkan');
  }
  saveState();
  closeOrgModal();
  renderOrgChart();
  renderLocations();
  populateOrgParentSelect(null);
}

// ── Preview & Clear foto profil coach ─────────────────────────────
function previewOrgPhoto(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('Foto terlalu besar! Maksimal 2MB');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    document.getElementById('orgPhotoData').value = dataUrl;
    const prev = document.getElementById('orgPhotoPreview');
    if (prev) {
      prev.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
      prev.style.background = 'transparent';
    }
  };
  reader.readAsDataURL(file);
}

function clearOrgPhoto() {
  document.getElementById('orgPhotoData').value = '';
  document.getElementById('orgPhotoInput').value = '';
  const prev = document.getElementById('orgPhotoPreview');
  if (prev) {
    const nameVal = document.getElementById('orgName')?.value || '?';
    prev.innerHTML = nameVal.charAt(0).toUpperCase() || '?';
    prev.style.background = 'linear-gradient(135deg,#1458a3,#2280e8)';
  }
  showToast('Foto dihapus');
}

async function deleteOrgMember(id) {
  // Jika state.orgMembers tidak ada, inisialisasi dengan array kosong
  if (!Array.isArray(state.orgMembers)) state.orgMembers = [];
  const m = state.orgMembers.find(x => x.id === id);
  if (!m) return;
  const ok = await showConfirm({
    title: 'Hapus Anggota',
    message: `"${m.name.split(',')[0]}" akan dihapus dari struktur organisasi.`,
    okLabel: 'Ya, Hapus'
  });
  if (!ok) return;
  state.orgMembers = state.orgMembers.filter(x => x.id !== id);
  saveState();
  renderOrgChart();
  showToast('Anggota dihapus');
}

// ══════════════════════════════════════════════
// MASTER RENDER & INIT
// ══════════════════════════════════════════════
function applyAppInfo() {
  const appName = state.config?.appName || 'TWINS Dashboard';
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) headerTitle.textContent = appName;
  document.title = appName;
}

function render(){
  applyAppInfo();
  renderDashboard();
  renderLocations();
  renderMembers();
  renderMembership();
  renderPayments();
  renderSchedules();
  renderNotes();
  renderSettings();
  renderOrgChart();
}

// Close modals on backdrop click
document.addEventListener('click', e => {
  const closeFns = {
    locationModal:  closeLocationModal,
    memberModal:    closeMemberModal,
    paymentModal:   closePaymentModal,
    scheduleModal:  closeScheduleModal,
    noteModal:      closeNoteModal,
    adminUserModal: closeAdminUserModal,
    packageModal:   closePackageModal,
    orgModal:       closeOrgModal,
    confirmOverlay: () => resolveConfirm(false)
  };
  if (closeFns[e.target.id]) closeFns[e.target.id]();
});

// ── Session Restoration saat Page Load ──
function restoreSessionFromStorage() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const user = JSON.parse(saved);
      if (user && user.email && user.id) {
        currentUser = user;
        return true;
      }
    }
  } catch (e) {
    console.warn('Failed to restore session', e);
  }
  return false;
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  loadState();
  await ensureHashedPasswords();

  // Cek sesi tersimpan — restore tanpa harus login ulang setelah refresh
  let sessionRestored = false;
  try {
    const savedUser = sessionStorage.getItem(SESSION_KEY);
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
      const loginPage2 = document.getElementById('loginPage');
      loginPage2.style.display       = 'none';
      loginPage2.style.pointerEvents = 'none';
      loginPage2.style.zIndex        = '-1';
      const appShell = document.getElementById('appShell');
      if (appShell) appShell.style.display = 'grid';
      applyRoleUI();
      applyTheme();
      render();
      checkNotifications();
      sessionRestored = true;
    }
  } catch(e) {
    console.warn('Session restore failed', e);
  }

  // Subscribe ke Firebase jika sudah login (untuk real-time sync)
  if (currentUser && !firebaseStateUnsubscribe) {
    subscribeToFirebaseChanges();
  }

  // Pastikan login page selalu tampil jika belum ada session
  // (tidak perlu nunggu Firebase untuk tampilkan UI login)
  if (!sessionRestored) {
    const loginPage3 = document.getElementById('loginPage');
    if (loginPage3) {
      loginPage3.style.display       = 'flex';
      loginPage3.style.pointerEvents = 'auto';
      loginPage3.style.zIndex        = '9999';
    }
    // Sync Firebase di background — loading overlay hanya muncul jika Firebase aktif
    hydrateSharedState().catch(() => {});
  } else {
    // Session ada — sync di background tanpa skeleton
    hydrateSharedState().catch(() => {});
  }

  subscribeSharedState();
  applyTheme();

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    loadState();
    if (document.readyState !== 'loading') {
      applyTheme();
      render();
      if (currentUser) applyRoleUI();
    }
      try { refreshAdminSyncStatus(); } catch(e){}
  });

  // Enter key on login
  ['loginEmail','loginPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });
});
