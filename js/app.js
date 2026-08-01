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

// ── Master Render ──
function render() {
  applyAppInfo();
  renderDashboard();
  renderLocations();
  renderMembers();
  renderMembership();
  renderPayments();
  renderSchedules();
  renderNotes();
  renderProgress();
  renderReports();
  renderSettings();
  renderOrgChart();
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  window.__twinsState.loadState();
  await window.__initAuth.ensureHashedPasswords();

  // Cek sesi tersimpan
  let sessionRestored = false;
  try {
    const savedUser = sessionStorage.getItem(window.__twinsState.SESSION_KEY);
    if (savedUser) {
      const user = JSON.parse(savedUser);
      window.__initAuth.setCurrentUser(user);
      const loginPage = document.getElementById('loginPage');
      loginPage.style.display = 'none';
      loginPage.style.pointerEvents = 'none';
      loginPage.style.zIndex = '-1';
      const appShell = document.getElementById('appShell');
      if (appShell) appShell.style.display = 'grid';
      window.__initAuth.applyRoleUI();
      window.__initAuth.applyTheme();
      render();
      window.__initAuth.checkNotifications();
      sessionRestored = true;
    }
  } catch (e) { console.warn('Session restore failed', e); }

  // Subscribe ke Firebase
  if (window.__initAuth.currentUser() && !window.__twinsState.firebaseStateUnsubscribe) {
    window.__initAuth.subscribeToFirebaseChanges();
  }

  if (!sessionRestored) {
    const loginPage = document.getElementById('loginPage');
    if (loginPage) {
      loginPage.style.display = 'flex';
      loginPage.style.pointerEvents = 'auto';
      loginPage.style.zIndex = '9999';
    }
    window.__initAuth.hydrateSharedState().catch(() => {});
  } else {
    window.__initAuth.hydrateSharedState().catch(() => {});
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
});

// ── Export untuk render global ──
window.__renderAll = render;
window.__app = {
  applyAppInfo,
  render
};
