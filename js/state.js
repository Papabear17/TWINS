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
  locations: [],
  members:   [],
  payments:  [],
  schedules: [],
  notes:     [],
  adminUsers: [...DEMO_ACCOUNTS],
  packages: [
    { id: 1, name: 'Basic',    price: 250000, desc: '2x seminggu, akses kolam renang', status: 'none', popular: false },
    { id: 2, name: 'Standard', price: 400000, desc: '3x seminggu, akses kolam renang + kelas', status: 'recommended', popular: false },
    { id: 3, name: 'Premium',  price: 650000, desc: 'Unlimited, personal trainer', status: 'popular', popular: true }
  ],
  orgMembers: [],
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
  // Untuk array: jika parsed punya key tersebut (termasuk array kosong []),
  // SELALU pakai parsed. Default hanya dipakai jika key tidak ada sama sekali di parsed.
  const resolveArray = (key) => {
    if (parsed && Object.prototype.hasOwnProperty.call(parsed, key)) {
      return Array.isArray(parsed[key]) ? parsed[key] : [];
    }
    // Key tidak ada sama sekali di parsed → pakai default
    return base[key] || [];
  };

  return {
    ...base, ...parsed,
    // Arrays — parsed selalu menang, termasuk array kosong []
    // Default HANYA dipakai kalau key benar-benar tidak ada di parsed
    locations:  resolveArray('locations'),
    members:    resolveArray('members'),
    payments:   resolveArray('payments'),
    schedules:  resolveArray('schedules'),
    notes:      resolveArray('notes'),
    packages:   resolveArray('packages'),
    orgMembers: resolveArray('orgMembers'),
    webGallery: resolveArray('webGallery'),
    // Objects — merge dengan default sebagai fallback
    config:        { ...base.config,        ...(parsed.config        || {}) },
    paymentConfig: { ...base.paymentConfig, ...(parsed.paymentConfig || {}) },
    webConfig:     { ...(base.webConfig     || {}), ...(parsed.webConfig || {}) },
    webMedia:      { ...(base.webMedia      || {}), ...(parsed.webMedia || {}) },
    // adminUsers — pakai parsed jika ada dan tidak kosong, fallback ke default
    adminUsers: cloneStateData(
      Array.isArray(parsed.adminUsers) && parsed.adminUsers.length > 0
        ? parsed.adminUsers
        : base.adminUsers
    ),
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
    if (saved) {
      const parsed = JSON.parse(saved);
      state = mergeAppState(parsed);
    }
    // Jika localStorage kosong, state tetap pakai defaultState (sudah di-init di atas)
    // JANGAN fallback ke defaultState kalau localStorage kosong tapi Firebase ada data —
    // hydrateSharedState() akan mengisi dari Firebase setelah ini
  } catch (e) { console.warn('Failed to load saved state', e); }
  normalizeStateCollections();
  // TIDAK jalankan syncMemberStatusWithPayments di sini —
  // fungsi ini bisa corrupt status member saat data baru di-load dari Firebase
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
  get state() { return state; },
  set state(val) { state = val; },
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

