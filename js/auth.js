/* ============================================================
   TWINS — Authentication (Login, Logout, Session, Firebase)
   ============================================================ */

let currentUser = null;
let firebasePollingTimer = null;
const SYNC_POLL_INTERVAL = 5000;

// ── Login ──
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  const err   = document.getElementById('loginError');

  if (!email || !pass) {
    if (err) {
      err.textContent = 'Email dan password harus diisi.';
      err.classList.remove('hidden');
    }
    return;
  }

  const normalizedEmail = email.toLowerCase();
  const hashed = await hashPassword(pass);
  let user = window.__twinsState.state.adminUsers.find(u => String(u.email || '').toLowerCase() === normalizedEmail && u.password === hashed);
  if (!user) {
    user = window.__twinsState.state.adminUsers.find(u => String(u.email || '').toLowerCase() === normalizedEmail && u.password === pass);
    if (user && user.password.length !== 64) {
      user.password = hashed;
      window.__twinsState.persistLocalState();
    }
  }
  if (!user) {
    err.textContent = 'Email atau password salah.';
    err.classList.remove('hidden');
    return;
  }
  err.classList.add('hidden');
  currentUser = user;
  if (window.__twinsState && window.__twinsState.state) {
    window.__twinsState.state.isLoggedIn = true;
    window.__twinsState.persistLocalState();
  }

  try { sessionStorage.setItem(window.__twinsState.SESSION_KEY, JSON.stringify(user)); } catch(e) {}

  // Hanya tampilkan welcome overlay saat login manual, bukan saat restore session
  showLoginWelcome(user.name, user.role, () => {
    const loginPage = document.getElementById('loginPage');
    loginPage.style.display = 'none';
    loginPage.style.pointerEvents = 'none';
    loginPage.style.zIndex = '-1';
    document.getElementById('appShell').style.display = 'grid';
    applyRoleUI();
    applyTheme();

    // Tampilkan section dashboard
    document.querySelectorAll('.content-section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-section="dashboard"]')?.classList.add('active');
    const dashEl = document.getElementById('dashboardSection');
    if (dashEl) dashEl.style.display = 'block';

    // Render ulang
    if (window.__renderAll) window.__renderAll();

    // Subscribe Firebase
    if (!window.__twinsState.firebaseStateUnsubscribe) {
      subscribeToFirebaseChanges();
    }
  });
}

// ── Logout ──
function doLogout() {
  showConfirm({
    title: 'Keluar dari TWINS',
    message: 'Yakin ingin keluar? Sesi kamu akan berakhir.',
    okLabel: 'Ya, Keluar',
    type: 'warn'
  }).then(ok => {
    if (!ok) return;
    currentUser = null;
    if (window.__twinsState && window.__twinsState.state) {
      window.__twinsState.state.isLoggedIn = false;
      window.__twinsState.persistLocalState();
    }
    if (window.__twinsState.firebaseStateUnsubscribe) {
      window.__twinsState.firebaseStateUnsubscribe();
      window.__twinsState.firebaseStateUnsubscribe = null;
    }
    if (firebasePollingTimer) clearInterval(firebasePollingTimer);
    try { sessionStorage.removeItem(window.__twinsState.SESSION_KEY); } catch(e) {}
    document.getElementById('appShell').style.display = 'none';
    const loginPage = document.getElementById('loginPage');
    loginPage.style.display = 'flex';
    loginPage.style.pointerEvents = 'auto';
    loginPage.style.zIndex = '9999';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError')?.classList.add('hidden');
  });
}

// ── Welcome Overlay ──
function showLoginWelcome(userName, userRole, onDone) {
  const splash = document.createElement('div');
  splash.id = 'welcomeSplash';
  splash.innerHTML = `
    <div class="splash-orb splash-orb-1"></div>
    <div class="splash-orb splash-orb-2"></div>
    <div class="splash-orb splash-orb-3"></div>
    <div class="splash-ripple"></div>
    <div class="splash-ripple"></div>
    <div class="splash-ripple"></div>
    <div class="splash-ripple"></div>
    <div class="splash-content">
      <div class="splash-logo-wrap" id="si-logo">
        <img src="./logo.jpeg" alt="TWINS Logo" />
      </div>
      <div class="splash-brand" id="si-brand">TWINS</div>
      <div class="splash-tagline" id="si-tagline">Platform Pelatihan Renang</div>
      <div class="splash-divider" id="si-divider"></div>
      <div class="splash-welcome" id="si-welcome">
        <p class="splash-welcome-label">Selamat datang,</p>
        <p class="splash-welcome-name">${userName || 'Admin'}</p>
        <span class="splash-welcome-role">&#9679; ${userRole || 'Administrator'}</span>
      </div>
      <div class="splash-progress-wrap" id="si-progress">
        <div class="splash-progress-bar" id="splashProgressBar"></div>
      </div>
      <p class="splash-loading-text" id="si-hint">Memuat dashboard...</p>
    </div>
  `;
  document.body.appendChild(splash);

  // Pre-hint GPU compositing supaya animasi tidak patah saat start
  splash.style.willChange = 'opacity, transform';

  // ── Stagger entrance: setiap elemen muncul berurutan ──
  const items = [
    { id: 'si-logo',     delay: 120 },
    { id: 'si-brand',    delay: 260 },
    { id: 'si-tagline',  delay: 370 },
    { id: 'si-divider',  delay: 480 },
    { id: 'si-welcome',  delay: 580 },
    { id: 'si-progress', delay: 720 },
    { id: 'si-hint',     delay: 800 },
  ];
  items.forEach(({ id, delay }) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.classList.add('si');
    }, delay);
  });

  // ── Start progress bar ──
  setTimeout(() => {
    const bar = document.getElementById('splashProgressBar');
    if (bar) {
      bar.classList.add('running');
      // Double rAF: pastikan transisi diambil oleh browser
      requestAnimationFrame(() => requestAnimationFrame(() => {
        bar.style.width = '100%';
      }));
    }
  }, 760);

  // ── EXIT ──
  const SHOW_DURATION = 2800;   // berapa lama tampil sebelum exit
  const EXIT_DURATION = 700;    // harus cocok dengan duration di CSS

  setTimeout(() => {
    // Reset will-change sebelum exit agar GPU tidak over-composite
    splash.style.willChange = 'auto';
    // Beri satu frame sebelum addClass supaya browser sempat commit
    requestAnimationFrame(() => {
      splash.classList.add('splash-exit');
    });

    setTimeout(() => {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
      onDone();
    }, EXIT_DURATION + 80);
  }, SHOW_DURATION);
}

// ── Role UI ──
function applyRoleUI() {
  if (!currentUser) return;
  document.getElementById('sidebarRoleLabel').textContent = currentUser.role;
  document.getElementById('headerRolePill').textContent = currentUser.role;
  document.getElementById('userChipName').textContent = currentUser.name;
  document.getElementById('userChipAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
  const isAdmin = currentUser.role === 'Admin';
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
  const hiddenForUsers = ['payments', 'reports', 'settings'];
  hiddenForUsers.forEach(sec => {
    const btn = document.querySelector(`.nav-btn[data-section="${sec}"]`);
    if (btn) btn.style.display = isAdmin ? '' : 'none';
  });
  const membersBtn = document.querySelector('.nav-btn[data-section="members"]');
  if (membersBtn) membersBtn.style.display = currentUser.role === 'Coach' ? 'none' : '';
}

// ── Theme ──
function applyTheme() {
  const theme = window.__twinsState.state.theme || localStorage.getItem(window.__twinsState.THEME_KEY) || 'light';
  window.__twinsState.state.theme = theme;
  document.body.classList.toggle('dark', theme === 'dark');
  const sun = document.getElementById('themeIconSun');
  const moon = document.getElementById('themeIconMoon');
  if (sun) sun.style.display = theme === 'dark' ? '' : 'none';
  if (moon) moon.style.display = theme === 'dark' ? 'none' : '';
  try { localStorage.setItem(window.__twinsState.THEME_KEY, theme); } catch (e) {}
}

function toggleTheme() {
  window.__twinsState.state.theme = window.__twinsState.state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  window.__twinsState.saveState();
}

// ── Session Restoration ──
function restoreSessionFromStorage() {
  try {
    const saved = sessionStorage.getItem(window.__twinsState.SESSION_KEY);
    if (saved) {
      const user = JSON.parse(saved);
      if (user && user.email && user.id) {
        currentUser = user;
        return true;
      }
    }
  } catch (e) { console.warn('Failed to restore session', e); }
  return false;
}

// ── Hash passwords on init ──
async function ensureHashedPasswords() {
  if (!window.__twinsState.state.adminUsers) return;
  let changed = false;
  const users = window.__twinsState.cloneStateData(window.__twinsState.state.adminUsers);
  for (const u of users) {
    if (u.password && u.password.length !== 64) {
      u.password = await hashPassword(u.password);
      changed = true;
    }
  }
  if (changed) {
    window.__twinsState.state.adminUsers = users;
    window.__twinsState.persistLocalState();
  }
}

// ── Firebase Subscription ──
function subscribeToFirebaseChanges() {
  const bridge = window.__twinsState.getFirebaseBridge();
  if (!bridge) return;

  if (window.__twinsState.firebaseStateUnsubscribe) {
    window.__twinsState.firebaseStateUnsubscribe();
  }

  const unsubscribe = bridge.subscribeSharedState(
    (remoteState) => { _handleFirebaseUpdate(remoteState, 'realtime'); },
    (error) => { console.warn('Firebase realtime error:', error); }
  );

  if (firebasePollingTimer) {
    clearInterval(firebasePollingTimer);
    firebasePollingTimer = null;
  }

  if (typeof unsubscribe === 'function') {
    window.__twinsState.firebaseStateUnsubscribe = unsubscribe;
  } else {
    window.__twinsState.firebaseStateUnsubscribe = null;
    firebasePollingTimer = setInterval(() => {
      bridge.loadSharedState().then(remoteState => { _handleFirebaseUpdate(remoteState, 'poll'); }).catch(() => {});
    }, SYNC_POLL_INTERVAL);
  }
}

function _handleFirebaseUpdate(remoteState, source = 'realtime') {
  if (!remoteState) return;
  const remoteTs = window.__twinsState.getSharedUpdatedAt(remoteState);
  const localTs  = window.__twinsState.getSharedUpdatedAt(window.__twinsState.state);

  // Remote lebih lama dari local → push local ke Firebase, jangan overwrite
  if (remoteTs < localTs) {
    const bridge = window.__twinsState.getFirebaseBridge();
    if (bridge) bridge.saveSharedState(window.__twinsState.buildSharedStatePayload()).catch(() => {});
    return;
  }

  // Timestamp sama → ini kemungkinan echo dari save kita sendiri, abaikan
  if (remoteTs === localTs) return;

  // Remote lebih baru → update local state dengan data dari server
  const nextState = window.__twinsState.mergeRemoteStateWithLocal(remoteState);
  window.__twinsState.state = nextState;
  window.__twinsState.normalizeStateCollections();
  window.__twinsState.persistLocalState();

  if (currentUser) {
    if (window.__renderAll) window.__renderAll();
    checkNotifications();
    if (source === 'realtime') showToast('✅ Data tersinkron dari server');
    refreshAdminSyncStatus();
  }
}

async function hydrateSharedState() {
  if (!window.twinsFirebaseReady) return;
  const overlay = document.getElementById('firebaseLoadingOverlay');
  if (overlay) overlay.style.display = 'flex';
  const hideOverlay = () => {
    if (!overlay) return;
    overlay.style.transition = 'opacity 0.4s ease';
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; overlay.style.opacity = ''; }, 420);
  };
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000));

  try {
    await Promise.race([window.twinsFirebaseReady, timeoutPromise]);
    const bridge = window.__twinsState.getFirebaseBridge();
    if (!bridge) { hideOverlay(); return; }

    const remoteState = await Promise.race([bridge.loadSharedState(), timeoutPromise]);
    if (remoteState) {
      const remoteTs = window.__twinsState.getSharedUpdatedAt(remoteState);
      const localTs  = window.__twinsState.getSharedUpdatedAt(window.__twinsState.state);

      if (remoteTs > localTs) {
        // Firebase punya data lebih baru → gunakan Firebase, jangan campur dengan defaultState
        const nextState = window.__twinsState.mergeRemoteStateWithLocal(remoteState);
        window.__twinsState.state = nextState;
        window.__twinsState.normalizeStateCollections();
        window.__twinsState.persistLocalState();
      } else if (remoteTs < localTs) {
        // Local lebih baru → push ke Firebase
        window.__twinsState.saveState();
      }
      // remoteTs === localTs → sudah sync, tidak perlu apa-apa
    } else {
      // Firebase kosong → push state lokal ke Firebase (seed pertama kali)
      window.__twinsState.saveState();
    }
  } catch (error) {
    console.warn('Firebase sync unavailable:', error.message);
  } finally {
    hideOverlay();
  }
}

// ── Sync Status ──
function updateSyncStatusAdmin(statusText) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.textContent = statusText;
  el.title = `Sinkronisasi: ${statusText}`;
  el.classList.remove('sync-ok','sync-warn','sync-off');
  const t = (statusText||'').toLowerCase();
  if (t.includes('tersinkron') || t.includes('terhubung')) el.classList.add('sync-ok');
  else if (t.includes('connect')) el.classList.add('sync-warn');
  else if (t.includes('local')) el.classList.add('sync-off');
  else el.classList.add('sync-warn');
}

function refreshAdminSyncStatus() {
  try {
    const bridge = window.__twinsState.getFirebaseBridge();
    if (!bridge) { updateSyncStatusAdmin('Local only'); return; }
    if (!window.twinsFirebaseReady) { updateSyncStatusAdmin('Connecting...'); return; }
    const last = window.__twinsState.state.sharedUpdatedAt || 0;
    if (last) {
      const ago = Math.round((Date.now() - last) / 1000);
      updateSyncStatusAdmin('Tersinkron ' + (ago < 60 ? ago + 's' : Math.round(ago/60) + 'm') + ' lalu');
    } else {
      updateSyncStatusAdmin('Terhubung');
    }
  } catch (e) { console.warn(e); }
}

// ── Notification ──
function checkNotifications() {
  const overdue = window.__twinsState.state.payments.filter(p => p.status === 'Menunggak');
  const banner = document.getElementById('notifBanner');
  const text = document.getElementById('notifText');
  if (!banner || !text) return;
  if (overdue.length > 0) {
    const names = [...new Set(overdue.map(p => getMemberName(p.memberId)))].slice(0,3).join(', ');
    text.textContent = `⚠ ${overdue.length} tagihan menunggak: ${names}${overdue.length > 3 ? ' dan lainnya' : ''}`;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

// ── Navigation ──
let _currentSection = 'dashboard';

function showSection(section) {
  const map = {
    dashboard: 'dashboardSection', locations: 'locationsSection',
    members: 'membersSection', membership: 'membershipSection',
    payments: 'paymentsSection', schedule: 'scheduleSection',
    notes: 'notesSection', progress: 'progressSection',
    reports: 'reportsSection', settings: 'settingsSection',
    orgchart: 'orgchartSection'
  };

  const renderMap = {
    dashboard: () => { renderDashboard(); checkNotifications(); },
    locations: renderLocations, members: renderMembers,
    membership: renderMembership, payments: renderPayments,
    schedule: renderSchedules, notes: renderNotes,
    progress: renderProgress, reports: renderReports,
    settings: renderSettings, orgchart: renderOrgChart
  };

  if (section === _currentSection) return;

  const prevId = map[_currentSection];
  const nextId = map[section];
  const prevEl = document.getElementById(prevId);
  const nextEl = document.getElementById(nextId);
  if (!nextEl) return;

  const headerTitle = document.getElementById('headerTitle');
  const titleMap = {
    dashboard: 'TWINS Dashboard', locations: 'Lokasi & Slot',
    members: 'Pendaftaran Member', membership: 'Keanggotaan',
    payments: 'Pembayaran', schedule: 'Jadwal Latihan',
    notes: 'Catatan & Evaluasi', progress: 'Progress Member',
    reports: 'Laporan', settings: 'Pengaturan', orgchart: 'Struktur Organisasi'
  };
  if (headerTitle) {
    headerTitle.classList.add('changing');
    setTimeout(() => {
      headerTitle.textContent = titleMap[section] || 'TWINS Dashboard';
      headerTitle.classList.remove('changing');
    }, 200);
  }

  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-section') === section)
  );
  if (window.innerWidth <= 900) closeMobileSidebar();

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

  if (renderMap[section]) renderMap[section]();
  nextEl.style.display = 'block';
  nextEl.classList.remove('section-enter');
  void nextEl.offsetWidth;
  nextEl.classList.add('section-enter');
  setTimeout(() => nextEl.classList.remove('section-enter'), 350);

  _currentSection = section;

  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('active');
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.toggle('mobile-open');
  if (overlay) overlay.classList.toggle('active');
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('active');
}

// ── Open WhatsApp to member ──
function openWhatsAppToMember(paymentId) {
  const p = window.__twinsState.state.payments.find(x => x.id === paymentId);
  if (!p) { showToast('Data pembayaran tidak ditemukan.'); return; }
  const member = window.__twinsState.state.members.find(m => m.id === p.memberId);
  if (!member || !member.phone) { showToast('Nomor HP tidak tersedia.'); return; }
  const normalize = (ph) => ph.replace(/[^0-9+]/g, '').replace(/^0/, '62').replace(/^\+/, '');
  const phone = normalize(member.phone);
  const pad2 = n => String(n).padStart(2,'0');
  function formatDateTime(d) {
    try {
      const t = new Date(d);
      return `${pad2(t.getDate())} ${t.toLocaleString('id-ID',{month:'short'})} ${t.getFullYear()} ${pad2(t.getHours())}:${pad2(t.getMinutes())}`;
    } catch(e) { return String(d); }
  }
  const paymentDate = p.date || '';
  const now = formatDateTime(new Date());
  const pd = formatDateTime(paymentDate);
  const parts = [];
  parts.push(`Halo ${member.name || ''},`);
  parts.push(`Saya Admin TWINS. Kami melihat ada transaksi *${p.type}* untuk akun Anda.`);
  parts.push(`Jumlah: ${formatRp(p.amount)}; Tanggal transaksi: ${pd}`);
  parts.push(`ID Pembayaran: ${p.id}`);
  parts.push(`Pesan ini dikirim: ${now}`);
  parts.push(`Mohon konfirmasi atau kirim bukti transfer jika belum terunggah. Terima kasih.`);
  const text = encodeURIComponent(parts.join('\n'));
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
}

// ── Init Auth (dipanggil di DOMContentLoaded) ──
window.__initAuth = {
  currentUser: () => currentUser,
  setCurrentUser: (u) => { currentUser = u; },
  doLogin, doLogout, applyRoleUI, applyTheme, toggleTheme,
  restoreSessionFromStorage, ensureHashedPasswords,
  subscribeToFirebaseChanges, hydrateSharedState,
  refreshAdminSyncStatus, checkNotifications,
  showSection, _currentSection: () => _currentSection,
  toggleMobileSidebar, closeMobileSidebar,
  openWhatsAppToMember, updateSyncStatusAdmin
};
