/* ============================================================
   TWINS — Utility Functions
   ============================================================ */

// ── Formatting ──
const formatRp = n => 'Rp ' + Number(n).toLocaleString('id-ID');
const thisMonthStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };

const getMemberName = id => { const m = window.__twinsState.state.members.find(m => m.id === id); return m ? m.name : '—'; };
const getLocationName = id => { const l = window.__twinsState.state.locations.find(l => l.id === id); return l ? l.name : '—'; };
const getActualFilled = id => window.__twinsState.state.members.filter(m => m.locationId === id && m.status === 'Aktif').length;

const normalizeWhatsAppNumber = phone => {
  if (!phone) return '';
  let num = String(phone).replace(/[^0-9+]/g, '');
  if (num.startsWith('+')) num = num.slice(1);
  if (num.startsWith('0')) num = '62' + num.slice(1);
  return num;
};

function chatMember(phone) {
  const waPhone = normalizeWhatsAppNumber(phone);
  if (!waPhone) { showToast('Nomor WhatsApp member tidak valid.'); return; }
  window.open(`https://wa.me/${waPhone}`, '_blank', 'noopener');
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"').replace(/'/g,'&#39;');
}

// ── Toast ──
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden'); t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.classList.remove('show'); t.classList.add('hidden'); }, 2200);
}

// ── Confirm ──
let _confirmResolve = null;
function showConfirm({ title = 'Konfirmasi', message = 'Yakin?', okLabel = 'Hapus', type = 'danger' } = {}) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOkBtn').textContent = okLabel;
    const wrap = document.getElementById('confirmIconWrap');
    const ok = document.getElementById('confirmOkBtn');
    wrap.className = 'confirm-icon-wrap' + (type === 'warn' ? ' warn' : '');
    ok.className = 'confirm-btn-ok' + (type === 'primary' ? ' primary' : '');
    document.getElementById('confirmOverlay').classList.remove('hidden');
  });
}
function resolveConfirm(r) {
  document.getElementById('confirmOverlay').classList.add('hidden');
  if (_confirmResolve) { _confirmResolve(r); _confirmResolve = null; }
}

// ── Password Hashing ──
async function hashPassword(plain) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(plain));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Populate helpers ──
function populateLocationSelect(selectId, selectedId) {
  const sel = document.getElementById(selectId); if (!sel) return;
  sel.innerHTML = '<option value="">— Pilih Lokasi —</option>';
  const s = window.__twinsState.state;
  s.locations.forEach(l => {
    const filled = getActualFilled(l.id);
    const avail = l.capacity - filled;
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
  window.__twinsState.state.members.forEach(m => {
    const o = document.createElement('option');
    o.value = m.id; o.textContent = `${m.name} (${m.phone})`;
    if (m.id == selectedId) o.selected = true;
    sel.appendChild(o);
  });
}

function populatePackageSelect(selectId, selectedVal) {
  const sel = document.getElementById(selectId); if (!sel) return;
  const pkgs = window.__twinsState.state.packages || [];
  sel.innerHTML = '';
  pkgs.forEach(p => {
    const o = document.createElement('option');
    o.value = p.name;
    o.textContent = `${p.name} — ${formatRp(p.price)}/bln`;
    if (p.name === selectedVal) o.selected = true;
    sel.appendChild(o);
  });
}

// ── Counter animation ──
function animateCounter(elId, target, duration) {
  const el = document.getElementById(elId);
  if (!el) return;
  const start = 0;
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * ease);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

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

// ── HiDPI Canvas ──
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

