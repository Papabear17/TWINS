/* ============================================================
   TWINS - Render, CRUD, and Feature UI Functions
   Sourced from android/app/src/main/assets/public/script.js
   Preserves membership renderers and approvePayment from the prior render.js
   Excludes helpers already defined in state.js, auth.js, app.js, and utils.js
   ============================================================ */

const DAY_ORDER=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];

const JABATAN_OPTIONS = ['Head Coach', 'Senior Coach', 'Co-Coach', 'Trainer', 'Manager', 'Staff Admin'];

function renderDashboard() {
  const activeMembers = window.__twinsState.state.members.filter(m=>m.status==='Aktif').length;
  const totalSlots    = window.__twinsState.state.locations.reduce((a,l)=>a+(l.capacity-getActualFilled(l.id)),0);
  const overdue       = window.__twinsState.state.payments.filter(p=>p.status==='Menunggak').length;
  const month         = thisMonthStr();
  const monthRevenue  = window.__twinsState.state.payments.filter(p=>p.status==='Lunas'&&p.date.startsWith(month)).reduce((a,p)=>a+Number(p.amount),0);

  const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  set('headerMemberCount', `${activeMembers} members`);
  set('headerActiveSlots',  `${totalSlots} slots`);

  // â”€â”€ Animasi 1: Counter angka stat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  animateCounter('statMembers',  activeMembers, 1200);
  animateCounter('statSlots',    totalSlots,    1000);
  animateCounter('statOverdue',  overdue,       800);
  animateRpCounter('statRevenue', monthRevenue, 1400);

  const rm = document.getElementById('recentMembers');
  if (rm) rm.innerHTML = [...window.__twinsState.state.members].slice(-4).reverse().map(m => `
    <div class="mini-item">
      <div class="mini-avatar">${m.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
      <div><strong style="font-size:.875rem">${m.name}</strong><br><small class="text-muted">${getLocationName(m.locationId)}  -  ${m.package}</small></div>
      <span class="status-pill ${m.status==='Aktif'?'completed':'pending'}">${m.status}</span>
    </div>`).join('') || '<p class="empty-state">Belum ada member</p>';

  const rp = document.getElementById('recentPayments');
  if (rp) rp.innerHTML = [...window.__twinsState.state.payments].slice(-4).reverse().map(p => `
    <div class="mini-item">
      <div class="mini-avatar pay-icon">${p.type==='Bulanan'?'+':'+'}</div>
      <div><strong style="font-size:.875rem">${getMemberName(p.memberId)}</strong><br><small class="text-muted">${p.type}  -  ${p.date}</small></div>
      <span class="mini-amount ${p.status==='Lunas'?'text-positive':'text-negative'}">${formatRp(p.amount)}</span>
    </div>`).join('') || '<p class="empty-state">Belum ada pembayaran</p>';

  const ss = document.getElementById('slotSummary');
  if (ss) ss.innerHTML = window.__twinsState.state.locations.map(l => {
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

  // â”€â”€ Animasi 2: Stagger cards masuk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

function renderDashboardCharts() {
  renderRevenueChart();
  renderPayStatusChart();
  renderProgressChart();
}

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
    revenues.push(window.__twinsState.state.payments.filter(p=>p.status==='Lunas'&&p.date.startsWith(key)).reduce((a,p)=>a+Number(p.amount),0));
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

  // Fixed size: always 160x160 regardless of layout timing
  const side = 160;
  canvas.style.width  = side + 'px';
  canvas.style.height = side + 'px';
  canvas.style.flexShrink = '0';
  const ctx = setCanvasHiDPI(canvas, side, side);
  const W = side, H = side;
  const month=thisMonthStr();
  const lunas   = window.__twinsState.state.payments.filter(p=>p.date.startsWith(month)&&p.status==='Lunas').length;
  const tunggak = window.__twinsState.state.payments.filter(p=>p.date.startsWith(month)&&p.status==='Menunggak').length;
  const total   = lunas+tunggak || 1;
  // radius proportional to fixed side
  const cx=W/2, cy=H/2, r=62, ir=38;
  const slices=[{v:lunas,c:'#1d6fc4',l:'Lunas'},{v:tunggak,c:'#ef4444',l:'Menunggak'}];

  // 3 - Donut draw animasi sweep
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
  const members = window.__twinsState.state.members.filter(m=>m.status==='Aktif').slice(0,5);
  if (!members.length) { ctx.fillStyle='#7fa3cc'; ctx.font='13px Inter,sans-serif'; ctx.textAlign='center'; ctx.fillText('Belum ada data progress',W/2,H/2); return; }

  const scores = members.map(m=>{
    const ns=window.__twinsState.state.notes.filter(n=>n.memberId===m.id&&n.score);
    return ns.length ? ns.reduce((a,n)=>a+n.score,0)/ns.length : 0;
  });
  const labels=members.map(m => {
    const firstName = m.name.split(' ')[0] || m.name;
    return firstName.length > 8 ? firstName.slice(0, 7) + '...' : firstName;
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

function renderLocations() {
  const list = document.getElementById('locationList'); if (!list) return;
  const search = (document.getElementById('locationSearch')?.value||'').toLowerCase();
  const filter = document.getElementById('locationFilter')?.value||'';
  const filtered = window.__twinsState.state.locations.filter(l => {
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

    const peserta  = window.__twinsState.state.members.filter(m => m.locationId === l.id);
    const memberIds = peserta.map(m => m.id);
    let explicitCoaches = l.coaches ? l.coaches.split(',').map(c=>c.trim()).filter(c=>c) : [];
    let scheduleCoaches = window.__twinsState.state.schedules.filter(s => memberIds.includes(s.memberId)).map(s => s.coach);
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
  const coaches = window.__twinsState.state.orgMembers.filter(m => m.level === 'coach');
  
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

function openLocationModal() { window.__twinsState.state.editingLocationId=null; ['locName','locAddress'].forEach(id=>document.getElementById(id).value=''); document.getElementById('locCapacity').value=''; document.getElementById('locStatus').value='Aktif'; populateCoachCheckboxes(''); document.getElementById('locationModalTitle').textContent='Tambah Lokasi'; document.getElementById('locationModal').classList.remove('hidden'); }

function closeLocationModal() { document.getElementById('locationModal').classList.add('hidden'); }

function editLocation(id) { const l=window.__twinsState.state.locations.find(x=>x.id===id); if(!l) return; window.__twinsState.state.editingLocationId=id; document.getElementById('locName').value=l.name; populateCoachCheckboxes(l.coaches||''); document.getElementById('locAddress').value=l.address; document.getElementById('locCapacity').value=l.capacity; document.getElementById('locStatus').value=l.status; document.getElementById('locationModalTitle').textContent='Edit Lokasi'; document.getElementById('locationModal').classList.remove('hidden'); }

function saveLocation() {
  const name=document.getElementById('locName').value.trim(); 
  const coaches = Array.from(document.querySelectorAll('input[name="locCoachCheckbox"]:checked')).map(cb => cb.value).join(', ');
  const address=document.getElementById('locAddress').value.trim(); const capacity=parseInt(document.getElementById('locCapacity').value)||0; const status=document.getElementById('locStatus').value;
  if(!name||!address||capacity<1){showToast('Nama, alamat, dan kapasitas wajib diisi');return;}
  if(window.__twinsState.state.editingLocationId){window.__twinsState.state.locations=window.__twinsState.state.locations.map(l=>l.id===window.__twinsState.state.editingLocationId?{...l,name,coaches,address,capacity,status}:l);showToast('Lokasi diperbarui');}
  else{window.__twinsState.state.locations.push({id:Date.now(),name,coaches,address,capacity,status});showToast('Lokasi ditambahkan');}
  window.__twinsState.saveState();closeLocationModal();render();
}

async function deleteLocation(id) { const l=window.__twinsState.state.locations.find(x=>x.id===id); if(!l) return; const ok=await showConfirm({title:'Hapus Lokasi',message:`"${l.name}" akan dihapus permanen.`,okLabel:'Ya, Hapus'}); if(!ok) return; window.__twinsState.state.locations=window.__twinsState.state.locations.filter(x=>x.id!==id); window.__twinsState.saveState();render();showToast('Lokasi dihapus'); }

function renderMembers() {
  const list=document.getElementById('memberList'); if(!list) return;
  const search=(document.getElementById('memberSearch')?.value||'').toLowerCase();
  const sf=document.getElementById('memberStatusFilter')?.value||'';
  const filtered=window.__twinsState.state.members
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
    const proofPayment = window.__twinsState.state.payments.find(p => p.memberId === m.id && p.proofImage);
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

function openMemberModal(){window.__twinsState.state.editingMemberId=null;['memName','memPhone','memEmail','memDob'].forEach(id=>document.getElementById(id).value='');populatePackageSelect('memPackage','Basic');document.getElementById('memStatus').value='Aktif';document.getElementById('memJoinDate').value=new Date().toISOString().slice(0,10);populateLocationSelect('memLocation',null);document.getElementById('memberModalTitle').textContent='Daftarkan Member Baru';document.getElementById('memberModal').classList.remove('hidden');}

function closeMemberModal(){document.getElementById('memberModal').classList.add('hidden');}

function editMember(id){const m=window.__twinsState.state.members.find(x=>x.id===id);if(!m)return;window.__twinsState.state.editingMemberId=id;document.getElementById('memName').value=m.name;document.getElementById('memPhone').value=m.phone;document.getElementById('memEmail').value=m.email;document.getElementById('memDob').value=m.dob;document.getElementById('memJoinDate').value=m.joinDate;populatePackageSelect('memPackage',m.package);document.getElementById('memStatus').value=m.status;populateLocationSelect('memLocation',m.locationId);document.getElementById('memberModalTitle').textContent='Edit Data Member';document.getElementById('memberModal').classList.remove('hidden');}

function saveMember(){
  const name=document.getElementById('memName').value.trim();const phone=document.getElementById('memPhone').value.trim();const email=document.getElementById('memEmail').value.trim();const dob=document.getElementById('memDob').value;const locationId=parseInt(document.getElementById('memLocation').value);const pkg=document.getElementById('memPackage').value;const joinDate=document.getElementById('memJoinDate').value;const status=document.getElementById('memStatus').value;
  if(!name||!phone||!locationId){showToast('Nama, HP, dan lokasi wajib diisi');return;}
  if(window.__twinsState.state.editingMemberId){window.__twinsState.state.members=window.__twinsState.state.members.map(m=>m.id===window.__twinsState.state.editingMemberId?{...m,name,phone,email,dob,locationId,package:pkg,joinDate,status}:m);showToast('Data member diperbarui');}
  else{window.__twinsState.state.members.push({id:Date.now(),name,phone,email,dob,locationId,package:pkg,joinDate,status});showToast('Member berhasil didaftarkan');}
  window.__twinsState.saveState();closeMemberModal();render();
}

async function deleteMember(id){const m=window.__twinsState.state.members.find(x=>x.id===id);if(!m)return;const ok=await showConfirm({title:'Hapus Member',message:`"${m.name}" beserta data terkait akan dihapus.`,okLabel:'Ya, Hapus'});if(!ok)return;
  window.__twinsState.state.members=window.__twinsState.state.members.filter(x=>x.id!==id);window.__twinsState.state.payments=window.__twinsState.state.payments.filter(x=>x.memberId!==id);window.__twinsState.state.schedules=window.__twinsState.state.schedules.filter(x=>x.memberId!==id);window.__twinsState.state.notes=window.__twinsState.state.notes.filter(x=>x.memberId!==id);window.__twinsState.saveState();render();showToast('Member dihapus');}

async function approveMember(id){
  const member = window.__twinsState.state.members.find(x => x.id === id);
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
  window.__twinsState.state.members = window.__twinsState.state.members.map(m => m.id === id ? { ...m, status: 'Aktif' } : m);
  window.__twinsState.state.payments = window.__twinsState.state.payments.map(p => {
    if (p.memberId === id && p.type === 'Pendaftaran' && p.status === 'Menunggak') {
      return { ...p, status: 'Lunas', note: `${p.note} | Disetujui Admin` };
    }
    return p;
  });
  window.__twinsState.saveState();
  render();
  showToast(`Member ${member.name} disetujui dan diaktifkan.`);
}

function renderMembership() {
  const state = window.__twinsState.state;
  const total=window.__twinsState.state.members.length; const aktif=window.__twinsState.state.members.filter(m=>m.status==='Aktif').length;
  const pending=window.__twinsState.state.members.filter(m=>m.status==='Menunggu Verifikasi'||m.status==='Menunggu Verifikasi Admin').length;
  const nonaktif=window.__twinsState.state.members.filter(m=>m.status==='Tidak Aktif').length;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('msTotal',total); set('msAktif',aktif); set('msPending',pending); set('msNonaktif',nonaktif);
  const packages = window.__twinsState.state.packages || [];
  const pkgSummary = document.getElementById('msPackageSummary');
  if (pkgSummary) {
    pkgSummary.innerHTML = packages.map(p => {
      const count = window.__twinsState.state.members.filter(m => m.package === p.name).length;
      return `<div class="card ms-package-card"><div class="ms-pkg-name">${p.name}</div><div class="ms-pkg-price">${formatRp(p.price)}<small>/bln</small></div><div class="ms-pkg-count">${count} member</div><div class="ms-pkg-bar"><div class="ms-pkg-bar-fill" style="width:${total?(count/total)*100:0}%"></div></div></div>`;
    }).join('');
  }
  renderMsStatusChart(aktif, pending, nonaktif);
  const locSummary = document.getElementById('msLocationSummary');
  if (locSummary) {
    locSummary.innerHTML = window.__twinsState.state.locations.map(l => {
      const count = window.__twinsState.state.members.filter(m => m.locationId === l.id).length;
      return `<div class="ms-loc-item"><strong>${l.name}</strong> <span class="status-pill completed">${count} member</span></div>`;
    }).join('');
  }
  renderMsMemberList();
}

function renderMsStatusChart(aktif, pending, nonaktif) {
  const canvas = document.getElementById('msStatusChart'); const legend = document.getElementById('msStatusLegend'); if (!canvas) return;
  const side = 150;
  canvas.style.width=side+'px'; canvas.style.height=side+'px'; canvas.style.flexShrink='0';
  const dpr = window.devicePixelRatio || 1;
  canvas.width=Math.round(side*dpr); canvas.height=Math.round(side*dpr);
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  const total = aktif+pending+nonaktif || 1;
  const cx=side/2,cy=side/2,r=58,ir=36;
  const slices=[{v:aktif,c:'#16a34a',l:'Aktif'},{v:pending,c:'#eab308',l:'Menunggu'},{v:nonaktif,c:'#ef4444',l:'Tidak Aktif'}].filter(s=>s.v>0);
  const startTime=performance.now(); const duration=700;
  function draw(now) {
    const progress=Math.min((now-startTime)/duration,1); const ease=1-Math.pow(1-progress,3);
    ctx.clearRect(0,0,side,side); let angle=-Math.PI/2;
    slices.forEach(s=>{
      const fullSweep=(s.v/total)*Math.PI*2; const sweep=fullSweep*ease;
      if(sweep<=0){angle+=fullSweep;return;}
      ctx.beginPath(); ctx.arc(cx,cy,r,angle,angle+sweep); ctx.lineTo(cx+Math.cos(angle+sweep)*ir,cy+Math.sin(angle+sweep)*ir);
      ctx.arc(cx,cy,ir,angle+sweep,angle,true); ctx.closePath(); ctx.fillStyle=s.c; ctx.fill(); angle+=fullSweep;
    });
    if(progress<1) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
  if(legend) legend.innerHTML=slices.map(s=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="width:10px;height:10px;border-radius:50%;background:${s.c};display:inline-block"></span><span>${s.l}: <strong>${s.v}</strong></span></div>`).join('');
}

function renderMsMemberList() {
  const state = window.__twinsState.state;
  const list = document.getElementById('msMemberList'); if (!list) return;
  const search=(document.getElementById('msSearch')?.value||'').toLowerCase();
  const sf=document.getElementById('msStatusFilter')?.value||'';
  const pf=document.getElementById('msPackageFilter')?.value||'';
  const pkgSel=document.getElementById('msPackageFilter');
  if(pkgSel&&pkgSel.options.length<=1){(window.__twinsState.state.packages||[]).forEach(p=>{const o=document.createElement('option');o.value=p.name;o.textContent=p.name;pkgSel.appendChild(o);});}
  const filtered=window.__twinsState.state.members.filter(m=>{const nm=!search||m.name.toLowerCase().includes(search)||(m.phone||'').includes(search);const sm=!sf||m.status===sf;const pm=!pf||m.package===pf;return nm&&sm&&pm;});
  if(!filtered.length){list.innerHTML='<p class="empty-state">Tidak ada member.</p>';return;}
  list.innerHTML=filtered.map(m=>{
    const initials=m.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const statusClass=m.status==='Aktif'?'completed':m.status==='Menunggu Verifikasi'||m.status==='Menunggu Verifikasi Admin'?'waiting':'pending';
    return `<div class="item-box"><div class="item-row">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
        <div class="user-avatar" style="flex-shrink:0">${initials}</div>
        <div style="min-width:0"><strong>${m.name}</strong>&nbsp;<span class="role-badge">${m.package}</span><br><small class="text-muted">${getLocationName(m.locationId)} &middot; ${m.phone}${m.email?' &middot; '+m.email:''}</small><br><small class="text-muted">Bergabung: ${m.joinDate}${m.dob?' &middot; Lahir: '+m.dob:''}</small></div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;align-items:center;flex-wrap:wrap">
        <span class="status-pill ${statusClass}">${m.status}</span>
        <button class="mini-btn" onclick="chatMember('${(m.phone||'').replace(/'/g,"\\'")}')">Chat</button>
      </div>
    </div></div>`;
  }).join('');
}

function renderPayments(){
  const month=thisMonthStr();
  const total=window.__twinsState.state.payments.filter(p=>p.status==='Lunas').reduce((a,p)=>a+Number(p.amount),0);
  const mRev=window.__twinsState.state.payments.filter(p=>p.status==='Lunas'&&p.date.startsWith(month)).reduce((a,p)=>a+Number(p.amount),0);
  const overdue=window.__twinsState.state.payments.filter(p=>p.status==='Menunggak').length;
  const newReg=window.__twinsState.state.payments.filter(p=>p.type==='Pendaftaran'&&p.date.startsWith(month)).length;
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('payStatTotal',formatRp(total));set('payStatMonth',formatRp(mRev));set('payStatOverdue',overdue);set('payStatNew',newReg);
  const list=document.getElementById('paymentList');if(!list)return;
  const tf=document.getElementById('payTypeFilter')?.value||'';const sf=document.getElementById('payStatusFilter')?.value||'';
  const filtered=window.__twinsState.state.payments.filter(p=>(!tf||p.type===tf)&&(!sf||p.status===sf)).sort((a,b)=>b.date.localeCompare(a.date));
  if(!filtered.length){list.innerHTML='<p class="empty-state">Tidak ada pembayaran.</p>';return;}
  list.innerHTML=`<table class="dashboard-table"><thead><tr><th>Member</th><th>Tipe</th><th>Jumlah</th><th>Tanggal</th><th>Status</th><th>Bukti</th><th>Catatan</th><th></th></tr></thead><tbody id="paymentTbody"></tbody></table>`;
  const tbody=document.getElementById('paymentTbody');
  filtered.forEach(p=>{const proofCell = p.proofImage ? `<button class="mini-btn" onclick="openProofPreview(${p.id})">Lihat</button>` : '-';
    const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${getMemberName(p.memberId)}</strong></td><td><span class="role-badge">${p.type}</span></td><td><strong>${formatRp(p.amount)}</strong></td><td>${p.date}</td><td><span class="status-pill ${p.status==='Lunas'?'completed':'pending'}">${p.status}</span></td><td>${proofCell}</td><td><small class="text-muted">${p.note||'-'}</small></td><td><div style="display:flex;gap:6px"><button class="mini-btn" onclick="editPayment(${p.id})">Edit</button><button class="mini-btn danger-btn" onclick="deletePayment(${p.id})">Hapus</button></div></td>`;tbody.appendChild(tr);});
}

async function approvePayment(paymentId) {
  const state = window.__twinsState.state;
  const p=window.__twinsState.state.payments.find(x=>x.id===paymentId); if(!p) return;
  if(p.status==='Lunas'){showToast('Pembayaran sudah dikonfirmasi.');return;}
  const ok=await showConfirm({title:'Konfirmasi Pembayaran',message:`Konfirmasi pembayaran untuk ${getMemberName(p.memberId)} sebesar ${formatRp(p.amount)}?`,okLabel:'Konfirmasi',type:'primary'}); if(!ok) return;
  window.__twinsState.state.payments=window.__twinsState.state.payments.map(x=>x.id===paymentId?{...x,status:'Lunas',note:(x.note||'')+' | Dikonfirmasi Admin'}:x);
  const member=window.__twinsState.state.members.find(m=>m.id===p.memberId); if(member) member.status='Aktif';
  window.__twinsState.saveState(); renderPayments(); renderDashboard(); showToast('Pembayaran dikonfirmasi dan member diaktifkan.');
}

function openPaymentModal(){window.__twinsState.state.editingPaymentId=null;populateMemberSelect('payMember',null);document.getElementById('payType').value='Bulanan';document.getElementById('payAmount').value='';document.getElementById('payDate').value=new Date().toISOString().slice(0,10);document.getElementById('payStatus').value='Lunas';document.getElementById('payNote').value='';document.getElementById('paymentModalTitle').textContent='Catat Pembayaran';document.getElementById('paymentModal').classList.remove('hidden');}

function openProofPreview(paymentId){
  const p = window.__twinsState.state.payments.find(x => x.id === paymentId);
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

function editPayment(id){const p=window.__twinsState.state.payments.find(x=>x.id===id);if(!p)return;window.__twinsState.state.editingPaymentId=id;populateMemberSelect('payMember',p.memberId);document.getElementById('payType').value=p.type;document.getElementById('payAmount').value=p.amount;document.getElementById('payDate').value=p.date;document.getElementById('payStatus').value=p.status;document.getElementById('payNote').value=p.note;document.getElementById('paymentModalTitle').textContent='Edit Pembayaran';document.getElementById('paymentModal').classList.remove('hidden');}

function savePayment(){
  const memberId=parseInt(document.getElementById('payMember').value);const type=document.getElementById('payType').value;const amount=parseInt(document.getElementById('payAmount').value)||0;const date=document.getElementById('payDate').value;const status=document.getElementById('payStatus').value;const note=document.getElementById('payNote').value.trim();
  if(!memberId||!amount||!date){showToast('Member, jumlah, dan tanggal wajib diisi');return;}
  if(window.__twinsState.state.editingPaymentId){window.__twinsState.state.payments=window.__twinsState.state.payments.map(p=>p.id===window.__twinsState.state.editingPaymentId?{...p,memberId,type,amount,date,status,note}:p);showToast('Pembayaran diperbarui');}
  else{window.__twinsState.state.payments.push({id:Date.now(),memberId,type,amount,date,status,note});showToast('Pembayaran dicatat');}
  window.__twinsState.saveState();closePaymentModal();renderPayments();renderDashboard();
}

async function deletePayment(id){const ok=await showConfirm({title:'Hapus Pembayaran',message:'Data pembayaran ini akan dihapus permanen.',okLabel:'Ya, Hapus'});if(!ok)return;window.__twinsState.state.payments=window.__twinsState.state.payments.filter(x=>x.id!==id);window.__twinsState.saveState();renderPayments();renderDashboard();showToast('Pembayaran dihapus');}

function exportPaymentCSV(){const h='Member,Tipe,Jumlah,Tanggal,Status,Catatan\n';const r=window.__twinsState.state.payments.map(p=>`"${getMemberName(p.memberId)}","${p.type}",${p.amount},"${p.date}","${p.status}","${p.note}"`).join('\n');const blob=new Blob([h+r],{type:'text/csv'});const url=URL.createObjectURL(blob);Object.assign(document.createElement('a'),{href:url,download:'twins-payments.csv'}).click();URL.revokeObjectURL(url);showToast('CSV diunduh');}

function exportPaymentPDF(){
  const rows=window.__twinsState.state.payments.map(p=>`
    <tr>
      <td>${getMemberName(p.memberId)}</td>
      <td>${p.type}</td>
      <td>${formatRp(p.amount)}</td>
      <td>${p.date}</td>
      <td>${p.status}</td>
      <td>${p.note||'-'}</td>
    </tr>`).join('');
  const total=window.__twinsState.state.payments.filter(p=>p.status==='Lunas').reduce((a,p)=>a+Number(p.amount),0);
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Laporan Pembayaran TWINS</title>
  <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{color:#1d6fc4;margin-bottom:4px}
  p.sub{color:#666;font-size:13px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#1d6fc4;color:#fff;padding:8px 12px;text-align:left}
  td{padding:8px 12px;border-bottom:1px solid #e5e7eb}
  tr:nth-child(even){background:#f0f6ff}
  .total{margin-top:16px;font-weight:bold;text-align:right;font-size:14px}
  </style></head><body>
  <h1>${window.__twinsState.state.config?.appName || 'TWINS Platform Pelatihan Renang'}</h1>
  <p class="sub">Laporan Pembayaran - Dicetak: ${new Date().toLocaleDateString('id-ID',{dateStyle:'long'})}</p>
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

function renderSchedules(){
  const list=document.getElementById('scheduleList');if(!list)return;
  const search=(document.getElementById('scheduleSearch')?.value||'').toLowerCase();
  const df=document.getElementById('scheduleDayFilter')?.value||'';
  const filtered=window.__twinsState.state.schedules.filter(s=>(!search||getMemberName(s.memberId).toLowerCase().includes(search))&&(!df||s.day===df)).sort((a,b)=>DAY_ORDER.indexOf(a.day)-DAY_ORDER.indexOf(b.day)||a.time.localeCompare(b.time));
  if(!filtered.length){list.innerHTML='<p class="empty-state">Tidak ada jadwal.</p>';return;}
  list.innerHTML='';
  filtered.forEach(s=>{const div=document.createElement('div');div.className='item-box';div.innerHTML=`<div class="item-row"><div style="display:flex;align-items:center;gap:12px;flex:1"><div class="schedule-day-badge">${s.day.slice(0,3)}</div><div><strong>${getMemberName(s.memberId)}</strong>&nbsp;<span class="role-badge">${s.type}</span><br><small class="text-muted">${s.time}  -  ${s.coach}</small></div></div><div style="display:flex;gap:6px;flex-shrink:0"><button class="mini-btn" onclick="editSchedule(${s.id})">Edit</button><button class="mini-btn danger-btn" onclick="deleteSchedule(${s.id})">Hapus</button></div></div>`;list.appendChild(div);});
}

function openScheduleModal(){window.__twinsState.state.editingScheduleId=null;populateMemberSelect('schMember',null);document.getElementById('schDay').value='Senin';document.getElementById('schTime').value='07:00';document.getElementById('schCoach').value='';document.getElementById('schType').value='Personal Training';document.getElementById('scheduleModalTitle').textContent='Tambah Jadwal';document.getElementById('scheduleModal').classList.remove('hidden');}

function closeScheduleModal(){document.getElementById('scheduleModal').classList.add('hidden');}

function editSchedule(id){const s=window.__twinsState.state.schedules.find(x=>x.id===id);if(!s)return;window.__twinsState.state.editingScheduleId=id;populateMemberSelect('schMember',s.memberId);document.getElementById('schDay').value=s.day;document.getElementById('schTime').value=s.time;document.getElementById('schCoach').value=s.coach;document.getElementById('schType').value=s.type;document.getElementById('scheduleModalTitle').textContent='Edit Jadwal';document.getElementById('scheduleModal').classList.remove('hidden');}

function saveSchedule(){
  const memberId=parseInt(document.getElementById('schMember').value);const day=document.getElementById('schDay').value;const time=document.getElementById('schTime').value;const coach=document.getElementById('schCoach').value.trim();const type=document.getElementById('schType').value;
  if(!memberId||!time||!coach){showToast('Member, waktu, dan coach wajib diisi');return;}
  if(window.__twinsState.state.editingScheduleId){window.__twinsState.state.schedules=window.__twinsState.state.schedules.map(s=>s.id===window.__twinsState.state.editingScheduleId?{...s,memberId,day,time,coach,type}:s);showToast('Jadwal diperbarui');}
  else{window.__twinsState.state.schedules.push({id:Date.now(),memberId,day,time,coach,type});showToast('Jadwal ditambahkan');}
  window.__twinsState.saveState();closeScheduleModal();renderSchedules();
}

async function deleteSchedule(id){const ok=await showConfirm({title:'Hapus Jadwal',message:'Jadwal latihan ini akan dihapus.',okLabel:'Ya, Hapus'});if(!ok)return;window.__twinsState.state.schedules=window.__twinsState.state.schedules.filter(x=>x.id!==id);window.__twinsState.saveState();renderSchedules();showToast('Jadwal dihapus');}

function renderNotes(){
  const list=document.getElementById('noteList');if(!list)return;
  const search=(document.getElementById('noteSearch')?.value||'').toLowerCase();
  const tf=document.getElementById('noteTypeFilter')?.value||'';
  const filtered=window.__twinsState.state.notes.filter(n=>(!search||getMemberName(n.memberId).toLowerCase().includes(search)||n.content.toLowerCase().includes(search))&&(!tf||n.type===tf)).sort((a,b)=>b.date.localeCompare(a.date));
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

function openNoteModal(){window.__twinsState.state.editingNoteId=null;populateMemberSelect('noteMember',null);document.getElementById('noteType').value='Catatan';document.getElementById('noteDate').value=new Date().toISOString().slice(0,10);document.getElementById('noteScore').value='';document.getElementById('noteContent').value='';document.getElementById('noteModalTitle').textContent='Tambah Catatan';document.getElementById('noteModal').classList.remove('hidden');}

function closeNoteModal(){document.getElementById('noteModal').classList.add('hidden');}

function editNote(id){const n=window.__twinsState.state.notes.find(x=>x.id===id);if(!n)return;window.__twinsState.state.editingNoteId=id;populateMemberSelect('noteMember',n.memberId);document.getElementById('noteType').value=n.type;document.getElementById('noteDate').value=n.date;document.getElementById('noteScore').value=n.score||'';document.getElementById('noteContent').value=n.content;document.getElementById('noteModalTitle').textContent='Edit Catatan';document.getElementById('noteModal').classList.remove('hidden');}

function saveNote(){
  const memberId=parseInt(document.getElementById('noteMember').value);const type=document.getElementById('noteType').value;const date=document.getElementById('noteDate').value;const score=parseInt(document.getElementById('noteScore').value)||null;const content=document.getElementById('noteContent').value.trim();
  if(!memberId||!date||!content){showToast('Member, tanggal, dan catatan wajib diisi');return;}
  if(window.__twinsState.state.editingNoteId){window.__twinsState.state.notes=window.__twinsState.state.notes.map(n=>n.id===window.__twinsState.state.editingNoteId?{...n,memberId,type,date,score,content}:n);showToast('Catatan diperbarui');}
  else{window.__twinsState.state.notes.push({id:Date.now(),memberId,type,date,score,content});showToast('Catatan disimpan');}
  window.__twinsState.saveState();closeNoteModal();renderNotes();
}

async function deleteNote(id){const ok=await showConfirm({title:'Hapus Catatan',message:'Catatan ini akan dihapus permanen.',okLabel:'Ya, Hapus'});if(!ok)return;window.__twinsState.state.notes=window.__twinsState.state.notes.filter(x=>x.id!==id);window.__twinsState.saveState();renderNotes();showToast('Catatan dihapus');}

function renderProgress() {
  const sel = document.getElementById('progressMemberFilter');
  const container = document.getElementById('progressContent');
  if (!container) return;

  // Populate dropdown
  if (sel) {
    const prev = sel.value;
    sel.innerHTML = '<option value="">- Pilih Member -</option>';
    window.__twinsState.state.members.forEach(m => {
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

  const member   = window.__twinsState.state.members.find(m => m.id === memberId);
  const notes    = window.__twinsState.state.notes.filter(n => n.memberId === memberId).sort((a,b)=>a.date.localeCompare(b.date));
  const schedules= window.__twinsState.state.schedules.filter(s => s.memberId === memberId);
  const payments = window.__twinsState.state.payments.filter(p => p.memberId === memberId);
  const scores   = notes.filter(n => n.score).map(n => n.score);
  const avgScore = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : '-';
  const lastScore= scores.length ? scores[scores.length-1] : null;
  const trend    = scores.length >= 2 ? (scores[scores.length-1] > scores[scores.length-2] ? 'â–²' : 'â–¼') : 'â†’';

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
            <td>${n.score ? `<span class="score-badge">${n.score}/10</span>` : '-'}</td>
            <td style="font-size:.85rem;">${n.content}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<p class="empty-state">Belum ada catatan untuk member ini.</p>'}
    </div>`;
}

function renderReports() {
  const month = thisMonthStr();
  const now   = new Date();
  const lastM = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMonthStr = `${lastM.getFullYear()}-${String(lastM.getMonth()+1).padStart(2,'0')}`;

  const pf = document.getElementById('rptPeriodFilter')?.value || '';
  let filtered = [...window.__twinsState.state.payments];
  if (pf === 'thisMonth')  filtered = filtered.filter(p => p.date.startsWith(month));
  else if (pf === 'lastMonth') filtered = filtered.filter(p => p.date.startsWith(lastMonthStr));
  else if (pf === 'thisYear')  filtered = filtered.filter(p => p.date.startsWith(now.getFullYear().toString()));

  // Coach filter
  const cf = document.getElementById('rptCoachFilter')?.value || '';
  const coachSel = document.getElementById('rptCoachFilter');
  if (coachSel && coachSel.options.length <= 1) {
    const coaches = [...new Set(window.__twinsState.state.schedules.map(s=>s.coach))];
    coaches.forEach(c => { const o=document.createElement('option'); o.value=c; o.textContent=c; coachSel.appendChild(o); });
  }

  // KPI
  const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  set('rptMembers',  window.__twinsState.state.members.filter(m=>m.status==='Aktif').length);
  set('rptSessions', window.__twinsState.state.schedules.length);
  set('rptRevenue',  formatRp(filtered.filter(p=>p.status==='Lunas').reduce((a,p)=>a+Number(p.amount),0)));
  set('rptOverdue',  filtered.filter(p=>p.status==='Menunggak').length);

  // Summary table
  const table = document.getElementById('reportSummaryTable');
  if (!table) return;

  // Group by member
  const summary = window.__twinsState.state.members.map(m => {
    const mp = filtered.filter(p => p.memberId === m.id);
    const lunas  = mp.filter(p=>p.status==='Lunas').reduce((a,p)=>a+Number(p.amount),0);
    const tunggak= mp.filter(p=>p.status==='Menunggak').length;
    const lastNote = window.__twinsState.state.notes.filter(n=>n.memberId===m.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
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
      <td>${m.lastNote ? `<span class="score-badge">${m.lastNote.score||'-'}/10</span> <small class="text-muted">${m.lastNote.date}</small>` : '<small class="text-muted">-</small>'}</td>
    </tr>`).join('')}
    </tbody>
  </table>`;
}

function exportReportCSV() {
  const rows = window.__twinsState.state.members.map(m => {
    const mp = window.__twinsState.state.payments.filter(p=>p.memberId===m.id);
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
  const rows = window.__twinsState.state.members.map(m => {
    const mp = window.__twinsState.state.payments.filter(p=>p.memberId===m.id);
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
    <h1>${window.__twinsState.state.config?.appName || 'TWINS Platform Pelatihan Renang'} - Laporan Member</h1>
    <p class="sub">Dicetak: ${new Date().toLocaleDateString('id-ID',{dateStyle:'long'})}</p>
    <table><thead><tr><th>Nama</th><th>Lokasi</th><th>Paket</th><th>Total Bayar</th><th>Status Bayar</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
  const w = window.open('','_blank');
  w.document.write(html); w.document.close();
  setTimeout(()=>w.print(), 400);
  showToast('PDF laporan siap dicetak');
}

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
    statLocations: '3',
    knpTitle: 'Halaman KNP TWINS',
    knpSubtitle: 'Konten KNP dimuat secara dinamis dari admin.',
    knpDescription: 'Gunakan panel admin untuk mengelola konten KNP. Semua perubahan akan tampil tanpa perlu mengedit HTML.',
    knpButtonLabel: 'Kembali ke Beranda',
  };
}

async function resetAllData() {
  const ok = await showConfirm({
    title: '⚠ Reset Semua Data',
    message: 'Ini akan menghapus SEMUA data (member, lokasi, pembayaran, jadwal, catatan, orgchart) dari Firebase dan browser.\n\nAkun admin login dan paket tidak ikut terhapus.\n\nTindakan ini TIDAK BISA DIBATALKAN.',
    okLabel: 'Ya, Hapus Semua',
    type: 'danger'
  });
  if (!ok) return;

  // Simpan data yang perlu dipertahankan
  const adminUsers = window.__twinsState.cloneStateData(window.__twinsState.state.adminUsers || window.__twinsState.DEMO_ACCOUNTS);
  const packages   = window.__twinsState.cloneStateData(window.__twinsState.state.packages   || window.__twinsState.defaultState.packages);
  const config     = window.__twinsState.cloneStateData(window.__twinsState.state.config     || window.__twinsState.defaultState.config);
  const paymentConfig = window.__twinsState.cloneStateData(window.__twinsState.state.paymentConfig || window.__twinsState.defaultState.paymentConfig);

  // Build state bersih
  const cleanState = {
    ...window.__twinsState.defaultState,
    adminUsers,
    packages,
    config,
    paymentConfig,
    locations:  [],
    members:    [],
    payments:   [],
    schedules:  [],
    notes:      [],
    orgMembers: [],
    webGallery: [],
    webConfig:  {},
    webMedia:   {},
    sharedUpdatedAt: Date.now()
  };

  // Terapkan ke state
  window.__twinsState.state = cleanState;

  // Hapus localStorage dan tulis ulang bersih
  try { localStorage.removeItem(window.__twinsState.STORAGE_KEY); } catch(e) {}
  window.__twinsState.persistLocalState();

  // Push ke Firebase
  const bridge = window.__twinsState.getFirebaseBridge();
  if (bridge) {
    try {
      const { adminUsers: _au, ...payload } = cleanState;
      await bridge.saveSharedState(payload);
    } catch(e) { console.warn('Reset Firebase failed', e); }
  }

  render();
  showToast('✅ Semua data berhasil direset. Admin dan paket tetap ada.');
}

function renderSettings(){
  renderAdminUsers();
  renderPackages();
  // Config Dashboard
  const cfg=window.__twinsState.state.config||{};
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
  set('cfgAppName',cfg.appName||'');set('cfgContact',cfg.contact||'');set('cfgRegFee',cfg.regFee||100000);set('cfgDueDay',cfg.dueDay||5);

  // Payment & WA config
  const pcfg = window.__twinsState.state.paymentConfig || {};
  set('cfgWaNumber',       pcfg.waNumber        || '');
  set('cfgReassuranceTitle',pcfg.reassuranceTitle|| '');
  set('cfgReassuranceText', pcfg.reassuranceText || '');
  set('cfgTrustPoints',     pcfg.trustPoints     || '');
  set('cfgTransferBank',    pcfg.transferBank    || '');
  set('cfgTransferAccount', pcfg.transferAccount || '');
  set('cfgTransferName',    pcfg.transferName    || '');
  set('cfgTransferNote',    pcfg.transferNote    || '');
  set('cfgQrisNote',        pcfg.qrisNote        || '');
  set('cfgWaTemplateTransfer', pcfg.waTemplateTransfer || '');
  set('cfgWaTemplateQris',     pcfg.waTemplateQris     || '');

  // Render QRIS preview
  _renderQrisPreview(pcfg.qrisImageBase64 || '');

  // Render QR Link Klien
  _renderInviteQr();

  // Web config
  renderWebSettings();

  // Pertahankan tab terakhir yang dibuka
  switchSettingsTab(window.__twinsState.state.settingsTab || 'dashboard');
}

function handleQrisUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('Ukuran gambar melebihi 2MB. Pilih gambar yang lebih kecil.');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    // Simpan langsung ke state
    if (!window.__twinsState.state.paymentConfig) window.__twinsState.state.paymentConfig = {};
    window.__twinsState.state.paymentConfig.qrisImageBase64 = base64;
    window.__twinsState.saveState();
    _renderQrisPreview(base64);
    showToast('Gambar QRIS berhasil diunggah!');
  };
  reader.readAsDataURL(file);
}

function removeQrisImage() {
  if (!window.__twinsState.state.paymentConfig) window.__twinsState.state.paymentConfig = {};
  window.__twinsState.state.paymentConfig.qrisImageBase64 = '';
  window.__twinsState.saveState();
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
  if (!window.__twinsState.state.paymentConfig) window.__twinsState.state.paymentConfig = {};
  const get = id => document.getElementById(id)?.value.trim() || '';
  window.__twinsState.state.paymentConfig.waNumber          = get('cfgWaNumber');
  window.__twinsState.state.paymentConfig.reassuranceTitle  = get('cfgReassuranceTitle');
  window.__twinsState.state.paymentConfig.reassuranceText   = get('cfgReassuranceText');
  window.__twinsState.state.paymentConfig.trustPoints       = get('cfgTrustPoints');
  window.__twinsState.state.paymentConfig.transferBank      = get('cfgTransferBank');
  window.__twinsState.state.paymentConfig.transferAccount   = get('cfgTransferAccount');
  window.__twinsState.state.paymentConfig.transferName      = get('cfgTransferName');
  window.__twinsState.state.paymentConfig.transferNote      = get('cfgTransferNote');
  window.__twinsState.state.paymentConfig.qrisNote          = get('cfgQrisNote');
  window.__twinsState.state.paymentConfig.waTemplateTransfer= get('cfgWaTemplateTransfer');
  window.__twinsState.state.paymentConfig.waTemplateQris    = get('cfgWaTemplateQris');
  // qrisImageBase64 sudah disimpan langsung saat upload, tidak perlu diambil lagi
  window.__twinsState.saveState();
  showToast('Pengaturan pembayaran & WA disimpan');
}

function switchSettingsTab(tab) {
  window.__twinsState.state.settingsTab = tab;
  document.querySelectorAll('.stab-btn').forEach(b => b.classList.toggle('active', b.dataset.stab === tab));
  document.getElementById('stabDashboard').style.display = tab === 'dashboard' ? 'block' : 'none';
  document.getElementById('stabWeb').style.display       = tab === 'web'       ? 'block' : 'none';
}

function saveWebConfig() {
  const defaults = getWebConfigDefaults();
  if (!window.__twinsState.state.webConfig) window.__twinsState.state.webConfig = {};
  const get = id => document.getElementById(id)?.value.trim() || '';
  window.__twinsState.state.webConfig.clubName      = get('webClubName')      || defaults.clubName;
  window.__twinsState.state.webConfig.foundedYear   = get('webFoundedYear')   || defaults.foundedYear;
  window.__twinsState.state.webConfig.tagline       = get('webTagline')       || defaults.tagline;
  window.__twinsState.state.webConfig.aboutText     = get('webAboutText')     || defaults.aboutText;
  window.__twinsState.state.webConfig.city          = get('webCity')          || defaults.city;
  window.__twinsState.state.webConfig.email         = get('webEmail')         || defaults.email;
  window.__twinsState.state.webConfig.instagram     = get('webInstagram')     || defaults.instagram;
  window.__twinsState.state.webConfig.tiktok        = get('webTiktok')        || defaults.tiktok;
  window.__twinsState.state.webConfig.statMembers   = get('webStatMembers')   || defaults.statMembers;
  window.__twinsState.state.webConfig.statCoaches   = get('webStatCoaches')   || defaults.statCoaches;
  window.__twinsState.state.webConfig.statLocations = get('webStatLocations') || defaults.statLocations;
  window.__twinsState.state.webConfig.knpTitle      = get('webKnpTitle')      || defaults.knpTitle;
  window.__twinsState.state.webConfig.knpSubtitle   = get('webKnpSubtitle')   || defaults.knpSubtitle;
  window.__twinsState.state.webConfig.knpDescription= get('webKnpDescription')|| defaults.knpDescription;
  window.__twinsState.state.webConfig.knpButtonLabel= get('webKnpButtonLabel')|| defaults.knpButtonLabel;
  window.__twinsState.saveState();
  renderWebSettings();
  showToast('Pengaturan web disimpan');
}

function renderWebSettings() {
  const cfg = { ...getWebConfigDefaults(), ...(window.__twinsState.state.webConfig || {}) };
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
  set('webKnpTitle',      cfg.knpTitle);
  set('webKnpSubtitle',   cfg.knpSubtitle);
  set('webKnpDescription',cfg.knpDescription);
  set('webKnpButtonLabel',cfg.knpButtonLabel);

  // Render media previews (foto)
  const mediaKeys = ['heroImg','aboutImg','prog1','prog2','prog3','knpImg'];
  mediaKeys.forEach(key => _renderWebMediaPreview(key, (window.__twinsState.state.webMedia || {})[key] || ''));

  // Render galeri admin
  renderGalleryAdmin();

  // Render testimonials admin
  renderTestimonialsAdmin();
}

function renderGalleryAdmin() {
  const grid = document.getElementById('galleryAdminGrid');
  const countEl = document.getElementById('galleryCount');
  const uploadLabel = document.getElementById('galleryUploadLabel');
  if (!grid) return;

  const gallery = window.__twinsState.state.webGallery || [];
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
          placeholder="Caption foto..."
          onchange="updateGalleryCaption(${idx}, this.value)" />
      </div>
      <button class="gallery-admin-del" onclick="deleteGalleryItem(${idx})" title="Hapus">x</button>
    `;
    grid.appendChild(div);
  });
}

/* ── Kompresi gambar via Canvas sebelum simpan ke base64 ────────────
   maxW/maxH : dimensi maksimum (aspect ratio dipertahankan)
   quality   : kualitas JPEG 0–1 (0.70 = hemat ~60% ukuran)
   callback  : dipanggil dengan string base64 hasil kompresi
──────────────────────────────────────────────────────────────── */
function compressImage(file, maxW, maxH, quality, callback) {
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;

      // Skala proporsional agar tidak melebihi batas
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      // Background putih agar PNG transparan tidak jadi hitam saat di-JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function handleGalleryUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;
  const gallery   = window.__twinsState.state.webGallery || [];
  const remaining = 10 - gallery.length;
  if (remaining <= 0) { showToast('Maksimum 10 foto galeri'); return; }

  const toProcess = files.slice(0, remaining).filter(f => f.type.startsWith('image/'));
  if (!toProcess.length) return;

  let processed = 0;
  showToast(`Mengkompresi ${toProcess.length} foto...`);

  toProcess.forEach(file => {
    // Kompresi: max 900×900 px, JPEG 70% — turunkan ukuran dari ~2-3MB ke ~80-150KB
    compressImage(file, 900, 900, 0.70, compressed => {
      if (!window.__twinsState.state.webGallery) window.__twinsState.state.webGallery = [];
      window.__twinsState.state.webGallery.push({ src: compressed, caption: '' });
      processed++;
      if (processed === toProcess.length) {
        window.__twinsState.saveState();
        renderGalleryAdmin();
        showToast(`${toProcess.length} foto berhasil diunggah & dikompresi!`);
      }
    });
  });

  event.target.value = '';
}

function updateGalleryCaption(idx, caption) {
  if (!window.__twinsState.state.webGallery || !window.__twinsState.state.webGallery[idx]) return;
  window.__twinsState.state.webGallery[idx].caption = caption;
  window.__twinsState.saveState();
}

function deleteGalleryItem(idx) {
  if (!window.__twinsState.state.webGallery) return;
  window.__twinsState.state.webGallery.splice(idx, 1);
  window.__twinsState.saveState();
  renderGalleryAdmin();
  showToast('Foto dihapus');
}

function handleWebMediaUpload(event, key) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('File harus berupa gambar'); event.target.value = ''; return; }

  // Kompresi: hero/about max 1200px, program/knp max 900px, JPEG 80%
  const isLarge = key === 'heroImg' || key === 'aboutImg';
  const maxPx   = isLarge ? 1200 : 900;
  showToast('Mengkompresi foto...');
  compressImage(file, maxPx, maxPx, 0.80, compressed => {
    if (!window.__twinsState.state.webMedia) window.__twinsState.state.webMedia = {};
    window.__twinsState.state.webMedia[key] = compressed;
    window.__twinsState.saveState();
    _renderWebMediaPreview(key, compressed);
    showToast('Foto berhasil diunggah & dikompresi!');
  });

  event.target.value = '';
}

function removeWebMedia(key) {
  if (!window.__twinsState.state.webMedia) return;
  window.__twinsState.state.webMedia[key] = '';
  window.__twinsState.saveState();
  _renderWebMediaPreview(key, '');
  const inputMap = { heroImg: 'heroImgInput', aboutImg: 'aboutImgInput', prog1: 'prog1Input', prog2: 'prog2Input', prog3: 'prog3Input', knpImg: 'knpImgInput' };
  const inp = document.getElementById(inputMap[key]);
  if (inp) inp.value = '';
  showToast('Media dihapus');
}

function _renderWebMediaPreview(key, base64) {
  const imgMap = { heroImg: 'heroImgPreviewImg', aboutImg: 'aboutImgPreviewImg', prog1: 'prog1Img', prog2: 'prog2Img', prog3: 'prog3Img', knpImg: 'knpImgPreviewImg' };
  const phMap  = { heroImg: 'heroImgPlaceholder', aboutImg: 'aboutImgPlaceholder', prog1: 'prog1Placeholder', prog2: 'prog2Placeholder', prog3: 'prog3Placeholder', knpImg: 'knpImgPlaceholder' };
  const rmMap  = { heroImg: 'heroImgRemoveBtn', aboutImg: 'aboutImgRemoveBtn', prog1: 'prog1RemoveBtn', prog2: 'prog2RemoveBtn', prog3: 'prog3RemoveBtn', knpImg: 'knpImgRemoveBtn' };

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
  (window.__twinsState.state.adminUsers||[]).forEach(u=>{
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

function openAdminUserModal(){window.__twinsState.state.editingAdminUserId=null;['auName','auEmail','auPassword'].forEach(id=>document.getElementById(id).value='');document.getElementById('auRole').value='Coach';document.getElementById('adminUserModalTitle').textContent='Tambah Akun';document.getElementById('adminUserModal').classList.remove('hidden');}

function closeAdminUserModal(){document.getElementById('adminUserModal').classList.add('hidden');}

function editAdminUser(id){const u=window.__twinsState.state.adminUsers.find(x=>x.id===id);if(!u)return;window.__twinsState.state.editingAdminUserId=id;document.getElementById('auName').value=u.name;document.getElementById('auEmail').value=u.email;document.getElementById('auPassword').value='';document.getElementById('auRole').value=u.role;document.getElementById('adminUserModalTitle').textContent='Edit Akun';document.getElementById('adminUserModal').classList.remove('hidden');}

async function saveAdminUser(){
  const name=document.getElementById('auName').value.trim();const email=document.getElementById('auEmail').value.trim();const password=document.getElementById('auPassword').value;const role=document.getElementById('auRole').value;
  if(!name||!email){showToast('Nama dan email wajib diisi');return;}
  if(!window.__twinsState.state.adminUsers) window.__twinsState.state.adminUsers=[];
  if(window.__twinsState.state.editingAdminUserId){
    const hashedPw = password ? await hashPassword(password) : window.__twinsState.state.adminUsers.find(u=>u.id===window.__twinsState.state.editingAdminUserId)?.password;
    window.__twinsState.state.adminUsers=window.__twinsState.state.adminUsers.map(u=>u.id===window.__twinsState.state.editingAdminUserId?{...u,name,email,password:hashedPw,role}:u);
    showToast('Akun diperbarui');
  } else {
    if(!password){showToast('Password wajib diisi untuk akun baru');return;}
    const hashedPw = await hashPassword(password);
    window.__twinsState.state.adminUsers.push({id:Date.now(),name,email,password:hashedPw,role});
    showToast('Akun ditambahkan');
  }
  window.__twinsState.saveState();closeAdminUserModal();renderAdminUsers();
}

async function deleteAdminUser(id){
  if(currentUser&&currentUser.id===id){showToast('Tidak bisa menghapus akun yang sedang aktif');return;}
  const ok=await showConfirm({title:'Hapus Akun',message:'Akun pengguna ini akan dihapus.',okLabel:'Ya, Hapus'});
  if(!ok)return;window.__twinsState.state.adminUsers=window.__twinsState.state.adminUsers.filter(x=>x.id!==id);window.__twinsState.saveState();renderAdminUsers();showToast('Akun dihapus');
}

function renderPackages(){
  const list=document.getElementById('packageList');if(!list)return;
  list.innerHTML='';
  (window.__twinsState.state.packages||[]).forEach(p=>{
    const div=document.createElement('div');div.className='item-box';
    div.innerHTML=`<div class="item-row">
      <div style="flex:1"><strong>${p.name}</strong>&nbsp;<strong class="text-positive">${formatRp(p.price)}/bln</strong><br><small class="text-muted">${p.desc||''}</small></div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="mini-btn" onclick="editPackage(${p.id})">Edit</button>
        <button class="mini-btn danger-btn" onclick="deletePackage(${p.id})">Hapus</button>
      </div>
    </div>`;
    list.appendChild(div);
  });
}

function openPackageModal(){window.__twinsState.state.editingPackageId=null;['pkgName','pkgDesc'].forEach(id=>document.getElementById(id).value='');document.getElementById('pkgPrice').value='';document.getElementById('packageModalTitle').textContent='Tambah Paket';document.getElementById('packageModal').classList.remove('hidden');}

function closePackageModal(){document.getElementById('packageModal').classList.add('hidden');}

function editPackage(id){const p=window.__twinsState.state.packages.find(x=>x.id===id);if(!p)return;window.__twinsState.state.editingPackageId=id;document.getElementById('pkgName').value=p.name;document.getElementById('pkgPrice').value=p.price;document.getElementById('pkgDesc').value=p.desc||'';document.getElementById('packageModalTitle').textContent='Edit Paket';document.getElementById('packageModal').classList.remove('hidden');}

function savePackage(){
  const name=document.getElementById('pkgName').value.trim();const price=parseInt(document.getElementById('pkgPrice').value)||0;const desc=document.getElementById('pkgDesc').value.trim();
  if(!name||!price){showToast('Nama dan harga wajib diisi');return;}
  if(!window.__twinsState.state.packages)window.__twinsState.state.packages=[];
  if(window.__twinsState.state.editingPackageId){window.__twinsState.state.packages=window.__twinsState.state.packages.map(p=>p.id===window.__twinsState.state.editingPackageId?{...p,name,price,desc}:p);showToast('Paket diperbarui');}
  else{window.__twinsState.state.packages.push({id:Date.now(),name,price,desc});showToast('Paket ditambahkan');}
  window.__twinsState.saveState();closePackageModal();renderPackages();
}

async function deletePackage(id){const ok=await showConfirm({title:'Hapus Paket',message:'Paket ini akan dihapus.',okLabel:'Ya, Hapus'});if(!ok)return;window.__twinsState.state.packages=window.__twinsState.state.packages.filter(x=>x.id!==id);window.__twinsState.saveState();renderPackages();showToast('Paket dihapus');}

function saveConfig(){
  if(!window.__twinsState.state.config)window.__twinsState.state.config={};
  window.__twinsState.state.config.appName=document.getElementById('cfgAppName').value.trim();
  window.__twinsState.state.config.contact=document.getElementById('cfgContact').value.trim();
  window.__twinsState.state.config.regFee=parseInt(document.getElementById('cfgRegFee').value)||100000;
  window.__twinsState.state.config.dueDay=parseInt(document.getElementById('cfgDueDay').value)||5;
  window.__twinsState.saveState();
  applyAppInfo();
  showToast('Konfigurasi disimpan');
}

function renderOrgChart() {
  const container = document.getElementById('orgChartContainer');
  if (!container) return;

  const members = normalizeOrgMembers(window.__twinsState.state.orgMembers || window.__twinsState.defaultState.orgMembers || []);
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
      const avatarContent = m.photo
        ? `<img class="org-card-avatar-img" src="${m.photo}" alt="${m.name}" />`
        : m.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      html += `
        <div class="org-card org-card--${level}">
          <div class="org-card-avatar">${avatarContent}</div>
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

function setOrgPhotoPreview(photoDataUrl) {
  const preview = document.getElementById('orgPhotoPreview');
  if (!preview) return;
  if (photoDataUrl) {
    preview.innerHTML = `<img src="${photoDataUrl}" alt="Preview foto" style="width:100%; height:100%; object-fit:cover; display:block;" />`;
  } else {
    preview.innerHTML = '<span style="padding:12px; text-align:center; color:#64748b;">Belum ada foto</span>';
  }
}

function handleOrgPhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;

  // Kompresi: foto profil coach cukup max 400×400 px, JPEG 80%
  compressImage(file, 400, 400, 0.80, compressed => {
    window.__twinsState.state.orgPhotoDraft = compressed;
    window.__twinsState.state.orgPhotoCleared = false;
    setOrgPhotoPreview(compressed);
    const removeButton = document.getElementById('orgPhotoRemoveButton');
    if (removeButton) removeButton.style.display = 'inline-flex';
  });
}

function openOrgModal() {
  window.__twinsState.state.editingOrgId = null;
  window.__twinsState.state.orgPhotoCleared = false;
  ['orgName','orgSpec','orgPhone'].forEach(id => document.getElementById(id).value = '');
  const photoInput = document.getElementById('orgPhoto');
  if (photoInput) photoInput.value = '';
  const removeButton = document.getElementById('orgPhotoRemoveButton');
  if (removeButton) removeButton.style.display = 'none';
  window.__twinsState.state.orgPhotoDraft = null;
  setOrgPhotoPreview(null);
  populateTitleRadios('');
  document.getElementById('orgLevel').value = 'coach';
  populateOrgParentSelect(null);
  document.getElementById('orgModalTitle').textContent = 'Tambah Anggota';
  document.getElementById('orgModal').classList.remove('hidden');
}

function closeOrgModal() {
  document.getElementById('orgModal').classList.add('hidden');
  window.__twinsState.state.orgPhotoDraft = null;
  window.__twinsState.state.orgPhotoCleared = false;
  const photoInput = document.getElementById('orgPhoto');
  if (photoInput) photoInput.value = '';
  const removeButton = document.getElementById('orgPhotoRemoveButton');
  if (removeButton) removeButton.style.display = 'none';
  setOrgPhotoPreview(null);
}

function editOrgMember(id) {
  // Pastikan window.__twinsState.state.orgMembers terisi dari data default jika belum ada
  if (!window.__twinsState.state.orgMembers) window.__twinsState.state.orgMembers = [...window.__twinsState.defaultState.orgMembers];
  const members = window.__twinsState.state.orgMembers;
  const m = members.find(x => x.id === id);
  if (!m) return;
  window.__twinsState.state.editingOrgId = id;
  document.getElementById('orgName').value  = m.name;
  populateTitleRadios(m.title);
  document.getElementById('orgSpec').value  = m.spec || '';
  document.getElementById('orgPhone').value = m.phone || '';
  document.getElementById('orgLevel').value = m.level;
  window.__twinsState.state.orgPhotoDraft = m.photo || null;
  window.__twinsState.state.orgPhotoCleared = false;
  setOrgPhotoPreview(m.photo || null);
  const photoInput = document.getElementById('orgPhoto');
  if (photoInput) photoInput.value = '';
  const removeButton = document.getElementById('orgPhotoRemoveButton');
  if (removeButton) removeButton.style.display = m.photo ? 'inline-flex' : 'none';
  populateOrgParentSelect(m.parentId, id);
  document.getElementById('orgModalTitle').textContent = 'Edit Anggota';
  document.getElementById('orgModal').classList.remove('hidden');
}

function populateOrgParentSelect(selectedId, excludeId) {
  const sel = document.getElementById('orgParent');
  if (!sel) return;
  const members = window.__twinsState.state.orgMembers || window.__twinsState.defaultState.orgMembers || [];
  sel.innerHTML = '<option value="">- Tidak ada (posisi puncak) -</option>';
  members.filter(m => m.id !== excludeId).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name.split(',')[0]} - ${m.title}`;
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
  const photo    = window.__twinsState.state.orgPhotoDraft || null;
  const removePhoto = window.__twinsState.state.orgPhotoCleared === true;

  if (!name || !title) { showToast('Nama dan jabatan wajib diisi'); return; }

  if (!window.__twinsState.state.orgMembers) window.__twinsState.state.orgMembers = normalizeOrgMembers(window.__twinsState.defaultState.orgMembers);
  if (window.__twinsState.state.editingOrgId && parentId === window.__twinsState.state.editingOrgId) {
    showToast('Atasan tidak boleh memilih dirinya sendiri');
    return;
  }

  if (window.__twinsState.state.editingOrgId) {
    window.__twinsState.state.orgMembers = window.__twinsState.state.orgMembers.map(m =>
      m.id === window.__twinsState.state.editingOrgId ? { ...m, name, title, spec, phone, level, parentId, photo: removePhoto ? null : (photo || m.photo) } : m
    );
    showToast('Data diperbarui');
  } else {
    window.__twinsState.state.orgMembers.push({ id: Date.now(), name, title, spec, phone, level, parentId, photo });
    showToast('Anggota ditambahkan');
  }
  window.__twinsState.saveState();
  closeOrgModal();
  renderOrgChart();
  renderLocations();
  populateOrgParentSelect(null);
}

function clearOrgPhoto() {
  window.__twinsState.state.orgPhotoDraft = null;
  window.__twinsState.state.orgPhotoCleared = true;
  setOrgPhotoPreview(null);
  const removeButton = document.getElementById('orgPhotoRemoveButton');
  if (removeButton) removeButton.style.display = 'none';
}

function confirmDeleteOrgMember() {
  if (!window.__twinsState.state.editingOrgId) return;
  deleteOrgMember(window.__twinsState.state.editingOrgId);
}

async function deleteOrgMember(id) {
  // Pastikan window.__twinsState.state.orgMembers terisi dari data default jika belum ada
  if (!window.__twinsState.state.orgMembers) window.__twinsState.state.orgMembers = [...window.__twinsState.defaultState.orgMembers];
  const m = window.__twinsState.state.orgMembers.find(x => x.id === id);
  if (!m) return;
  const ok = await showConfirm({
    title: 'Hapus Anggota',
    message: `"${m.name.split(',')[0]}" akan dihapus dari struktur organisasi.`,
    okLabel: 'Ya, Hapus'
  });
  if (!ok) return;
  window.__twinsState.state.orgMembers = window.__twinsState.state.orgMembers.filter(x => x.id !== id);
  window.__twinsState.saveState();
  renderOrgChart();
  showToast('Anggota dihapus');
}


/* ── Org Photo Preview ── */
function previewOrgPhoto(input) {
  const file = input.files && input.files[0]; if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('File harus berupa gambar'); input.value = ''; return; }
  // Kompresi: foto profil coach max 400×400 px, JPEG 80%
  compressImage(file, 400, 400, 0.80, compressed => {
    document.getElementById('orgPhotoData').value = compressed;
    const prev = document.getElementById('orgPhotoPreview');
    if (prev) { prev.innerHTML = `<img src="${compressed}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`; prev.style.background = 'transparent'; }
  });
}

/* ── Sync Status ── */
function updateSyncStatusAdmin(statusText) {
  const el = document.getElementById('syncStatus'); if (!el) return;
  el.textContent = statusText; el.title = `Sinkronisasi: ${statusText}`;
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
    if (last) { const ago = Math.round((Date.now()-last)/1000); updateSyncStatusAdmin('Tersinkron '+(ago<60?ago+'s':Math.round(ago/60)+'m')+' lalu'); }
    else { updateSyncStatusAdmin('Terhubung'); }
  } catch(e) { console.warn(e); }
}

/* ── Invite QR ── */
function _renderInviteQr() {
  const url = window.__twinsState.INVITE_LINK || 'https://wab-twins.vercel.app/';
  const img = document.getElementById('inviteQrImage');
  const placeholder = document.getElementById('inviteQrPlaceholder');
  const container = document.getElementById('inviteQrPreview');

  if (!container) return;

  if (typeof QRious !== 'undefined') {
    const oldCanvas = container.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();

    const canvas = document.createElement('canvas');
    canvas.id = 'inviteQrCanvas';
    canvas.style.cssText = 'display:block;margin:0 auto;border-radius:8px;max-width:180px;width:180px;height:180px;';
    container.insertBefore(canvas, img);

    new QRious({
      element: canvas,
      value: url,
      size: 180,
      backgroundAlpha: 1,
      foreground: '#000000',
      background: '#ffffff',
      level: 'H',
      padding: 6
    });

    if (img) img.style.display = 'none';
    if (placeholder) placeholder.style.display = 'none';
    return;
  }

  // Fallback: img + Google Charts
  if (img) {
    const qrUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(url) + '&chld=H|2';
    img.src = qrUrl;
    img.style.cssText = 'display:block;max-width:180px;margin:0 auto;border-radius:8px;';
    if (placeholder) placeholder.style.display = 'none';
    img.onerror = () => {
      img.style.display = 'none';
      if (placeholder) { placeholder.style.display = 'flex'; placeholder.textContent = 'Gagal memuat QR.'; }
    };
    return;
  }

  // Load QRious dinamis
  if (!document.getElementById('qrious-script')) {
    const script = document.createElement('script');
    script.id = 'qrious-script';
    script.src = 'https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js';
    script.onload = () => _renderInviteQr();
    document.head.appendChild(script);
    if (placeholder) placeholder.textContent = 'Memuat QR...';
  }
}

function copyInviteLink() {
  const value = window.__twinsState.INVITE_LINK || 'https://wab-twins.vercel.app/';
  navigator.clipboard.writeText(value).then(() => showToast('✅ Link undangan klien disalin')).catch(() => showToast('Gagal menyalin link.'));
}

function downloadInviteQr() {
  const url = window.__twinsState.INVITE_LINK || 'https://wab-twins.vercel.app/';

  // Buat QR besar (600px) khusus untuk download
  const exportSize = 600;
  const logoSize = exportSize * 0.22; // logo 22% dari QR
  const logoX = (exportSize - logoSize) / 2;
  const logoY = (exportSize - logoSize) / 2;

  // Generate QR ke canvas sementara
  const tempCanvas = document.createElement('canvas');
  if (typeof QRious === 'undefined') {
    showToast('QR library belum siap, coba lagi.');
    return;
  }

  new QRious({
    element: tempCanvas,
    value: url,
    size: exportSize,
    backgroundAlpha: 1,
    foreground: '#000000',
    background: '#ffffff',
    level: 'H',
    padding: 20
  });

  // Overlay logo di tengah canvas
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = exportSize;
  finalCanvas.height = exportSize;
  const ctx = finalCanvas.getContext('2d');

  // Gambar QR
  ctx.drawImage(tempCanvas, 0, 0);

  // Load logo lalu overlay
  const logoImg = new Image();
  logoImg.onload = () => {
    // Background putih bulat di belakang logo
    const pad = 10;
    const rx = logoX - pad;
    const ry = logoY - pad;
    const rw = logoSize + pad * 2;
    const rh = logoSize + pad * 2;
    const radius = rw / 2; // fully rounded (circle)

    ctx.save();
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    // Circle background
    ctx.beginPath();
    ctx.arc(rx + rw/2, ry + rh/2, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    // Gambar logo dalam circle clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(rx + rw/2, ry + rh/2, radius - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, rx + 4, ry + 4, rw - 8, rh - 8);
    ctx.restore();

    // Download
    const link = document.createElement('a');
    link.download = 'QR-TWINS-Swimming-Club.png';
    link.href = finalCanvas.toDataURL('image/png');
    link.click();
    showToast('✅ QR Code dengan logo diunduh');
  };

  logoImg.onerror = () => {
    // Download tanpa logo jika gagal load
    const link = document.createElement('a');
    link.download = 'QR-TWINS-Swimming-Club.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
    showToast('✅ QR Code diunduh');
  };

  logoImg.src = './logo.jpeg';
}

/* ── Notifications ── */
function checkNotifications() {
  const state = window.__twinsState.state;
  const overdue = state.payments.filter(p => p.status === 'Menunggak');
  const banner = document.getElementById('notifBanner'); const text = document.getElementById('notifText');
  if (!banner || !text) return;
  if (overdue.length > 0) {
    const names = [...new Set(overdue.map(p => getMemberName(p.memberId)))].slice(0,3).join(', ');
    text.textContent = `⚠ ${overdue.length} tagihan menunggak: ${names}${overdue.length > 3 ? ' dan lainnya' : ''}`;
    banner.style.display = 'flex';
  } else { banner.style.display = 'none'; }
}

/* ── Master Render ── */
function render() {
  if (typeof applyAppInfo === 'function') applyAppInfo();
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

window.__renderAll = render;
window.__app = { applyAppInfo, render };

/* ══════════════════════════════════
   TESTIMONIALS ADMIN
   ══════════════════════════════════ */
var _editingTestimonialId = null;

function renderTestimonialsAdmin() {
  const list = document.getElementById('testimonialsAdminList');
  const counter = document.getElementById('testimonialsCount');
  if (!list) return;

  const items = window.__twinsState.state.webTestimonials || [];
  if (counter) counter.textContent = items.length;

  if (!items.length) {
    list.innerHTML = '<p class="text-muted" style="font-size:.85rem">Belum ada testimonial. Klik "+ Tambah Testimonial" untuk menambahkan.</p>';
    return;
  }

  list.innerHTML = items.map((t, i) => {
    const stars = '★'.repeat(t.rating || 5) + '☆'.repeat(5 - (t.rating || 5));
    return `
    <div class="item-box" style="margin-bottom:10px;">
      <div class="item-row" style="align-items:flex-start;gap:12px;">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
            <div class="user-avatar" style="width:32px;height:32px;font-size:.75rem;flex-shrink:0">${(t.name||'?').charAt(0).toUpperCase()}</div>
            <strong style="font-size:.9rem">${t.name || '—'}</strong>
            <small class="text-muted">${t.role || ''}</small>
            ${t.featured ? '<span style="background:var(--primary,#1a6bc4);color:#fff;font-size:.7rem;padding:2px 8px;border-radius:99px;">Unggulan</span>' : ''}
          </div>
          <div style="color:#f59e0b;font-size:.85rem;margin-bottom:4px">${stars}</div>
          <p style="font-size:.85rem;color:var(--text-2,#94a3b8);margin:0;font-style:italic">"${t.text || ''}"</p>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="mini-btn" onclick="openTestimonialModal(${i})">Edit</button>
          <button class="mini-btn danger-btn" onclick="deleteTestimonial(${i})">Hapus</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openTestimonialModal(idx) {
  const modal = document.getElementById('testimonialModal');
  if (!modal) return;

  if (typeof idx === 'number') {
    _editingTestimonialId = idx;
    const t = (window.__twinsState.state.webTestimonials || [])[idx];
    if (t) {
      document.getElementById('tmnlName').value    = t.name || '';
      document.getElementById('tmnlRole').value    = t.role || '';
      document.getElementById('tmnlText').value    = t.text || '';
      document.getElementById('tmnlRating').value  = t.rating || 5;
      document.getElementById('tmnlFeatured').value = t.featured ? '1' : '0';
    }
    document.getElementById('testimonialModalTitle').textContent = 'Edit Testimonial';
  } else {
    _editingTestimonialId = null;
    ['tmnlName','tmnlRole','tmnlText'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('tmnlRating').value   = '5';
    document.getElementById('tmnlFeatured').value = '0';
    document.getElementById('testimonialModalTitle').textContent = 'Tambah Testimonial';
  }

  modal.style.display = 'flex';
}

function closeTestimonialModal() {
  const modal = document.getElementById('testimonialModal');
  if (modal) modal.style.display = 'none';
  _editingTestimonialId = null;
}

function saveTestimonial() {
  const name     = document.getElementById('tmnlName').value.trim();
  const role     = document.getElementById('tmnlRole').value.trim();
  const text     = document.getElementById('tmnlText').value.trim();
  const rating   = parseInt(document.getElementById('tmnlRating').value) || 5;
  const featured = document.getElementById('tmnlFeatured').value === '1';

  if (!name || !text) { showToast('Nama dan isi testimoni wajib diisi'); return; }

  if (!Array.isArray(window.__twinsState.state.webTestimonials)) {
    window.__twinsState.state.webTestimonials = [];
  }

  const payload = { name, role, text, rating, featured };
  if (_editingTestimonialId !== null) {
    window.__twinsState.state.webTestimonials[_editingTestimonialId] = payload;
    showToast('Testimonial diperbarui');
  } else {
    window.__twinsState.state.webTestimonials.push(payload);
    showToast('Testimonial ditambahkan');
  }

  window.__twinsState.state.webTestimonials = [...window.__twinsState.state.webTestimonials];
  window.__twinsState.state.sharedUpdatedAt = Date.now();
  window.__twinsState.saveState();
  closeTestimonialModal();
  renderTestimonialsAdmin();
}

async function deleteTestimonial(idx) {
  const ok = await showConfirm({ title: 'Hapus Testimonial', message: 'Testimonial ini akan dihapus dari landing page.', okLabel: 'Ya, Hapus' });
  if (!ok) return;
  (window.__twinsState.state.webTestimonials || []).splice(idx, 1);
  window.__twinsState.saveState();
  renderTestimonialsAdmin();
  showToast('Testimonial dihapus');
}
