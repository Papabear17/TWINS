document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contentEditorForm');
  const status = document.getElementById('editorStatus');

  function loadValues() {
    const cfg = (window.state && window.state.webConfig) ? window.state.webConfig : {};
    form.elements['heroTitle'].value = cfg.heroTitle || '';
    form.elements['heroTagline'].value = cfg.tagline || '';
    form.elements['aboutText'].value = cfg.aboutText || '';
    form.elements['navLinks'].value = Array.isArray(cfg.navLinks) ? cfg.navLinks.join(',') : (cfg.navLinks || '');
  }

  function showStatus(msg, ok = true) {
    status.textContent = msg;
    status.style.color = ok ? 'green' : 'crimson';
    setTimeout(() => { status.textContent = ''; }, 2500);
  }

  loadValues();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const heroTitle = form.elements['heroTitle'].value.trim();
    const heroTagline = form.elements['heroTagline'].value.trim();
    const aboutText = form.elements['aboutText'].value.trim();
    const navLinksRaw = form.elements['navLinks'].value.trim();
    const navLinks = navLinksRaw ? navLinksRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (!window.state) window.state = {};
    if (!window.state.webConfig) window.state.webConfig = {};
    window.state.webConfig.heroTitle = heroTitle;
    window.state.webConfig.tagline = heroTagline;
    window.state.webConfig.aboutText = aboutText;
    window.state.webConfig.navLinks = navLinks;

    try {
      if (typeof saveState === 'function') {
        saveState();
        showStatus('Tersimpan dan disinkronkan');
      } else {
        // fallback: persist locally
        localStorage.setItem('twinsData_v3', JSON.stringify(window.state));
        showStatus('Disimpan secara lokal (saveState tidak tersedia)', false);
      }
    } catch (err) {
      console.error(err);
      showStatus('Gagal menyimpan: ' + err.message, false);
    }
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('Reset konten ini ke default?')) return;
    if (!window.state) window.state = {};
    window.state.webConfig = {};
    try { saveState(); showStatus('Direset dan disinkronkan'); } catch(e){ localStorage.removeItem('twinsData_v3'); showStatus('Direset secara lokal', false); }
    loadValues();
  });
});
