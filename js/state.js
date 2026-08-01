/* ============================================================
   TWINS — State Management & Persistence
   ============================================================ */

const STORAGE_KEY = 'twinsData_v3';
const THEME_KEY   = 'twinsTheme';
const SESSION_KEY = 'twinsUserSession';
const INVITE_LINK = 'https://wabsitetwins.vercel.app/';

// ── Demo Accounts ──
const DEMO_ACCOUNTS = [
  { id: 1, name: 'Admin TWINS', email: 'admin@twins.id',   password: 'admin123', role: 'Admin'   },
  { id: 2, name: 'Coach Rina',  email: 'rina@twins.id',    password: 'rina123',  role: 'Coach'   },
  { id: 3, name: 'Manager',     email: 'manager@twins.id', password: 'mgr123',   role: 'Manager' }
];

// ── Default State ──
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
    waNumber: '6281294708266',
    reassuranceTitle: 'Pembayaranmu Aman Bersama TWINS',
    reassuranceText: 'Twins Swimming Club platform resmi — setiap transaksi dikonfirmasi tim kami maksimal 1×24 jam.',
    trustPoints: 'Pembayaran ke rekening resmi Twins Swimming Club\nKonfirmasi cepat via WhatsApp\nData pribadi aman & rahasia',
    transferBank: 'BCA', transferAccount: '1234567890', transferName: 'Twins Swimming Club',
    transferNote: 'Pastikan nominal transfer sesuai. Simpan bukti transfer dan kirim ke WhatsApp admin.',
    qrisNote: 'Scan QRIS — pembayaran instan & aman', qrisImageBase64: '',
    waTemplateTransfer: 'Halo Admin Twins Swimming Club! 👋\n\nSaya ingin konfirmasi pembayaran pendaftaran:\n• Nama    : {nama}\n• Paket   : {paket}\n• Total   : {total}\n• Metode  : Transfer Bank {bank}\n• Rekening: {rekening} a.n {atasnama}\n• Ref/Bukti: {ref}\n\nMohon konfirmasi. Terima kasih! 🙏',
    waTemplateQris: 'Halo Admin Twins Swimming Club! 👋\n\nKonfirmasi pembayaran via QRIS:\n• Nama  : {nama}\n• Paket : {paket}\n• Total : {total}\n• Ref   : {ref}\n\nTerima kasih! 🙏'
  },
  webConfig: {},
  webMedia: {},
  webGallery: []
};

let state = JSON.parse(JSON.stringify(defaultState));

// ── Helpers ──
function cloneStateData(data) { return JSON.parse(JSON.stringify(data)); }

function mergeAppState(parsed = {}) {
  const base = cloneStateData(defaultState);
  return {
    ...base, ...parsed,
    config:        { ...base.config,        ...(parsed.config        || {}) },
    paymentConfig: { ...base.paymentConfig, ...(parsed.paymentConfig || {}) },
    webConfig:     { ...(base.webConfig     || {}), ...(parsed.webConfig || {}) },
    webMedia:      { ...(base.webMedia      || {}), ...(parsed.webMedia || {}) },
    webGallery:    Array.isArray(parsed.webGallery) ? parsed.webGallery : (base.webGallery || []),
    adminUsers: cloneStateData(
      Array.isArray(parsed.adminUsers) && parsed.adminUsers.length > 0 ? parsed.adminUsers : base.adminUsers
    ),
    orgMembers: Array.isArray(parsed.orgMembers) ? parsed.orgMembers : (base.orgMembers || [])
  };
}

function normalizeStateCollections() {
  if (!Array.isArray(state.orgMembers) || state.orgMembers.length === 0) {
    state.orgMembers = [];
  } else {
    state.orgMembers = normalizeOrgMembers(state.orgMembers);
  }
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

function syncMemberStatusWithPayments() {
  if (!Array.isArray(state.members) || !Array.isArray(state.payments)) return;
  state.members = state.members.map(member => {
    if (member.status !== 'Aktif') return member;
    const hasOverdue = state.payments.some(p => p.memberId === member.id && p.status === 'Menunggak');
    return hasOverdue ? { ...member, status: 'Tidak Aktif' } : member;
  });
}

// ── Firebase Bridge ──
function getFirebaseBridge() {
  return window.twinsFirebase && window.twinsFirebase.enabled ? window.twinsFirebase : null;
}

function getSharedUpdatedAt(source = {}) { return Number(source?.sharedUpdatedAt || 0); }
function touchSharedState(source = state) { source.sharedUpdatedAt = Date.now(); return source.sharedUpdatedAt; }

function buildSharedStatePayload() {
  const { adminUsers, ...safeState } = state;
  return safeState;
}

function mergeRemoteStateWithLocal(remoteState = {}) {
  const nextState = mergeAppState(remoteState);
  nextState.adminUsers = cloneStateData(
    Array.isArray(state.adminUsers) && state.adminUsers.length ? state.adminUsers : defaultState.adminUsers
  );
  return nextState;
}

function persistLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    firebaseStateSignature = JSON.stringify(state);
  } catch (e) { console.warn('Failed to save state', e); }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = mergeAppState(JSON.parse(saved));
  } catch (e) { console.warn('Failed to load saved state', e); }
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
    bridge.saveSharedState(buildSharedStatePayload()).catch(err => console.warn('Failed to sync state to Firebase', err));
  }
}

let firebaseStateUnsubscribe = null;
let firebaseStateSignature = '';

// ── Export untuk digunakan modul lain ──
window.__twinsState = {
  state,
  defaultState,
  STORAGE_KEY,
  THEME_KEY,
  SESSION_KEY,
  INVITE_LINK,
  DEMO_ACCOUNTS,
  cloneStateData,
  mergeAppState,
  normalizeStateCollections,
  normalizeOrgMembers,
  getFirebaseBridge,
  getSharedUpdatedAt,
  touchSharedState,
  buildSharedStatePayload,
  mergeRemoteStateWithLocal,
  persistLocalState,
  loadState,
  saveState,
  get firebaseStateUnsubscribe() { return firebaseStateUnsubscribe; },
  set firebaseStateUnsubscribe(val) { firebaseStateUnsubscribe = val; },
  get firebaseStateSignature() { return firebaseStateSignature; },
  set firebaseStateSignature(val) { firebaseStateSignature = val; }
};

