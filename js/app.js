/* ============================================================
   TWINS — App Shell, Navigation & Init
   ============================================================ */

// ── App Info ──
function applyAppInfo() {
  const appName = window.__twinsState.state.config?.appName || 'TWINS Dashboard';
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) headerTitle.textContent = appName;
  document.title = appName;
}

// ── Error Boundary Helper ──
// Jalankan fungsi render dengan aman: kalau error, tampilkan pesan di section-nya
// sehingga section lain tetap berfungsi (tidak blank seluruh halaman).
function safeRender(fn, sectionId) {
  try {
    fn();
  } catch (err) {
    console.error(`[TWINS] Error rendering ${sectionId || fn.name}:`, err);
    if (sectionId) {
      const el = document.getElementById(sectionId);
      if (el && !el.querySelector('.render-error')) {
        const errDiv = document.createElement('div');
        errDiv.className = 'render-error';
        errDiv.style.cssText = 'padding:16px;margin:12px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;color:#991b1b;font-size:.85rem;';
        errDiv.innerHTML = `⚠ Gagal memuat section ini. <button onclick="this.parentElement.remove();" style="margin-left:8px;padding:2px 8px;border:1px solid #991b1b;border-radius:4px;background:transparent;color:#991b1b;cursor:pointer;">Tutup</button>`;
        el.prepend(errDiv);
      }
    }
  }
}
window.safeRender = safeRender;

// ── Master Render ──
function render() {
  safeRender(applyAppInfo,           null);
  safeRender(renderDashboard,        'dashboardSection');
  safeRender(renderLocations,        'locationsSection');
  safeRender(renderMembers,          'membersSection');
  safeRender(renderMembership,       'membershipSection');
  safeRender(renderPayments,         'paymentsSection');
  safeRender(renderSchedules,        'schedulesSection');
  safeRender(renderNotes,            'notesSection');
  safeRender(renderProgress,         'progressSection');
  safeRender(renderReports,          'reportsSection');
  safeRender(renderSettings,         'settingsSection');
  safeRender(renderOrgChart,         'orgSection');
  safeRender(renderTestimonialsAdmin,'testimonialsSection');
}

// ── Global Error Handler — tangkap error JS yang tidak ter-catch ──
window.onerror = function(message, source, lineno, colno, error) {
  console.error('[TWINS] Uncaught error:', message, 'at', source, lineno);
  return false;
};
window.onunhandledrejection = function(event) {
  console.warn('[TWINS] Unhandled promise rejection:', event.reason);
};

// ── Init ──
async function __initApp() {
  window.__twinsState.loadState();
  await window.__initAuth.ensureHashedPasswords();

  // Cek sesi tersimpan
  let sessionRestored = false;
  try {
    const savedUser = sessionStorage.getItem(window.__twinsState.SESSION_KEY);
    if (savedUser) {
      const user = JSON.parse(savedUser);
      window.__initAuth.setCurrentUser(user);

      // Sembunyikan login, tampilkan app
      const loginPage = document.getElementById('loginPage');
      if (loginPage) {
        loginPage.style.display = 'none';
        loginPage.style.pointerEvents = 'none';
        loginPage.style.zIndex = '-1';
      }
      const appShell = document.getElementById('appShell');
      if (appShell) appShell.style.display = 'grid';

      // Pastikan dashboard section visible
      document.querySelectorAll('.content-section').forEach(el => el.style.display = 'none');
      const dashEl = document.getElementById('dashboardSection');
      if (dashEl) dashEl.style.display = 'block';
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('[data-section="dashboard"]')?.classList.add('active');

      window.__initAuth.applyRoleUI();
      window.__initAuth.applyTheme();
      render();
      window.__initAuth.checkNotifications();
      sessionRestored = true;
    }
  } catch (e) { console.warn('Session restore failed', e); }

  // Tunggu Firebase siap dulu, lalu subscribe dan hydrate
  const initFirebaseAndSync = async () => {
    // Tunggu event twinsFirebaseReady atau fallback polling
    if (!window.twinsFirebase) {
      await new Promise(resolve => {
        const handler = () => { window.removeEventListener('twinsFirebaseReady', handler); resolve(); };
        window.addEventListener('twinsFirebaseReady', handler);
        // Fallback timeout 8 detik
        setTimeout(resolve, 8000);
      });
    }

    // Tunggu anonymous auth selesai sebelum loadSharedState
    // (Firebase Rules auth != null akan reject jika auth belum siap)
    if (window.twinsFirebaseAuthReady) {
      try { await window.twinsFirebaseAuthReady; } catch(e) {}
    } else {
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Subscribe ke Firebase
    if (window.__initAuth.currentUser() && !window.__twinsState.firebaseStateUnsubscribe) {
      window.__initAuth.subscribeToFirebaseChanges();
    }

    // Hydrate state dari Firebase
    await window.__initAuth.hydrateSharedState().catch(() => {});

    // Re-render setelah dapat data Firebase
    if (window.__initAuth.currentUser()) {
      render();
      window.__initAuth.refreshAdminSyncStatus();
    }
  };

  initFirebaseAndSync();

  // Tampilkan login page jika session tidak ada
  if (!sessionRestored) {
    const loginPage = document.getElementById('loginPage');
    if (loginPage) {
      loginPage.style.display = 'flex';
      loginPage.style.pointerEvents = 'auto';
      loginPage.style.zIndex = '9999';
    }
  }

  window.__initAuth.applyTheme();

  window.addEventListener('storage', (event) => {
    if (event.key !== window.__twinsState.STORAGE_KEY) return;
    window.__twinsState.loadState();
    if (document.readyState !== 'loading') {
      window.__initAuth.applyTheme();
      render();
      if (window.__initAuth.currentUser()) window.__initAuth.applyRoleUI();
    }
  });

  // Enter key on login
  ['loginEmail', 'loginPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') window.__initAuth.doLogin(); });
  });

  // Close modals on backdrop click
  document.addEventListener('click', e => {
    const closeFns = {
      locationModal: closeLocationModal,
      memberModal: closeMemberModal,
      paymentModal: closePaymentModal,
      scheduleModal: closeScheduleModal,
      noteModal: closeNoteModal,
      adminUserModal: closeAdminUserModal,
      packageModal: closePackageModal,
      orgModal: closeOrgModal,
      confirmOverlay: () => resolveConfirm(false)
    };
    if (closeFns[e.target.id]) closeFns[e.target.id]();
  });
}

// ── Jalankan init: support DOMContentLoaded & inline DOM (script di akhir body) ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __initApp);
} else {
  // DOM sudah ready (script di akhir body / inline mode)
  __initApp();
}

// ── Export untuk render global ──
window.__renderAll = render;
window.__app = {
  applyAppInfo,
  render
};
