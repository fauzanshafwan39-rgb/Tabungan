// ===== STATE & STORAGE =====
const DB_KEY = 'tabunganku_v1';

function loadData() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || defaultData(); }
  catch { return defaultData(); }
}

function defaultData() {
  return {
    wadah: [
      { id: 'w1', nama: 'Cash', icon: '💵', warna: '#22c55e' },
      { id: 'w2', nama: 'BCA', icon: '🏦', warna: '#3b82f6' },
    ],
    transaksi: [],
    hutangPiutang: [],
  };
}

function saveData() { localStorage.setItem(DB_KEY, JSON.stringify(state)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

let state = loadData();

// ===== NAVIGATION =====
let currentPage = 'dashboard';

function showPage(name) {
  currentPage = name;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.getAttribute('onclick') === "showPage('" + name + "')") b.classList.add('active');
  });
  document.querySelectorAll('.bottom-nav-btn').forEach(b => {
    if (b.getAttribute('onclick') === "showPage('" + name + "')") b.classList.add('active');
  });
  renderPage(name);
}

function renderPage(name) {
  if (name === 'dashboard') renderDashboard();
  else if (name === 'wadah') renderWadah();
  else if (name === 'transaksi') renderTransaksi();
  else if (name === 'hutangpiutang') renderHutangPiutang();
  else if (name === 'laporan') renderLaporan();
}

// ===== HELPERS =====
function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function monthLabel(ym) {
  if (!ym) return '-';
  const parts = ym.split('-');
  const names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
  return names[parseInt(parts[1]) - 1] + ' ' + parts[0];
}

function currentYM() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function currentDate() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatTanggal(tgl) {
  if (!tgl) return '-';
  const parts = tgl.split('-');
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

function ymFromDate(tgl) {
  if (!tgl) return currentYM();
  return tgl.slice(0, 7);
}

function allMonths() {
  const set = new Set();
  set.add(currentYM());
  state.transaksi.forEach(t => set.add(t.tanggal ? ymFromDate(t.tanggal) : (t.bulan || currentYM())));
  state.hutangPiutang.forEach(h => set.add(h.tanggal ? ymFromDate(h.tanggal) : (h.bulan || currentYM())));
  return Array.from(set).sort().reverse();
}

function getWadahById(id) { return state.wadah.find(w => w.id === id); }

function saldoWadah(wadahId) {
  let total = 0;
  state.transaksi.forEach(t => {
    if (t.tipe === 'masuk' && t.wadahId === wadahId) total += Number(t.jumlah);
    if (t.tipe === 'keluar' && t.wadahId === wadahId) total -= Number(t.jumlah);
    if (t.tipe === 'transfer' && t.wadahId === wadahId) total -= Number(t.jumlah);
    if (t.tipe === 'transfer' && t.wadahTujuanId === wadahId) total += Number(t.jumlah);
  });
  state.hutangPiutang.forEach(h => {
    if (h.tipe === 'hutang' && h.wadahId === wadahId) total += Number(h.jumlah);
    if (h.tipe === 'piutang' && h.wadahId === wadahId) total -= Number(h.jumlah);
    if (h.pelunasan) h.pelunasan.forEach(p => {
      if (h.tipe === 'hutang' && p.wadahId === wadahId) total -= Number(p.jumlah);
      if (h.tipe === 'piutang' && p.wadahId === wadahId) total += Number(p.jumlah);
    });
  });
  return total;
}

function totalSaldo() { return state.wadah.reduce((s, w) => s + saldoWadah(w.id), 0); }

function wadahOptions(selectedId) {
  return state.wadah.map(w =>
    '<option value="' + w.id + '"' + (w.id === selectedId ? ' selected' : '') + '>' + w.icon + ' ' + w.nama + '</option>'
  ).join('');
}

// ===== MODAL =====
function openModal(title, bodyHtml) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

// ===== DASHBOARD =====
function renderDashboard() {
  const ym = currentYM();
  const masukBulan = state.transaksi.filter(t => t.tipe === 'masuk' && t.bulan === ym).reduce((s, t) => s + Number(t.jumlah), 0);
  const keluarBulan = state.transaksi.filter(t => t.tipe === 'keluar' && t.bulan === ym).reduce((s, t) => s + Number(t.jumlah), 0);
  const hutangAktif = state.hutangPiutang.filter(h => h.tipe === 'hutang' && !h.lunas).reduce((s, h) => s + Number(h.jumlah), 0);
  const piutangAktif = state.hutangPiutang.filter(h => h.tipe === 'piutang' && !h.lunas).reduce((s, h) => s + Number(h.jumlah), 0);
  const recent = [...state.transaksi].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);
  const totSaldo = totalSaldo();

  var wadahBars = state.wadah.map(function(w) {
    var s = saldoWadah(w.id);
    var pct = totSaldo > 0 ? Math.max(0, Math.min(100, (s / totSaldo) * 100)) : 0;
    return '<div style="margin-bottom:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
        '<span style="font-weight:600">' + w.icon + ' ' + w.nama + '</span>' +
        '<span style="font-weight:700;color:var(--primary)">' + formatRupiah(s) + '</span>' +
      '</div>' +
      '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + pct.toFixed(1) + '%;background:' + w.warna + '"></div></div>' +
    '</div>';
  }).join('') || '<p style="color:var(--text-muted);font-size:0.875rem">Belum ada wadah</p>';

  var recentRows = recent.length ? recent.map(function(t) {
    var w = getWadahById(t.wadahId);
    var isIn = t.tipe === 'masuk';
    var icon = isIn ? '⬆️' : t.tipe === 'transfer' ? '↔️' : '⬇️';
    var cls = isIn ? 'income' : 'expense';
    return '<div class="recent-item">' +
      '<div class="ri-icon ' + cls + '">' + icon + '</div>' +
      '<div class="ri-info">' +
        '<div class="ri-desc">' + (t.keterangan || (t.tipe === 'masuk' ? 'Pemasukan' : t.tipe === 'transfer' ? 'Transfer' : 'Pengeluaran')) + '</div>' +
        '<div class="ri-meta">' + (w ? w.icon + ' ' + w.nama : '?') + ' · ' + monthLabel(t.bulan) + '</div>' +
      '</div>' +
      '<div class="ri-amount ' + (isIn ? 'pos' : 'neg') + '">' + (isIn ? '+' : '-') + formatRupiah(t.jumlah) + '</div>' +
    '</div>';
  }).join('') : '<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada transaksi</p></div>';

  var selisih = masukBulan - keluarBulan;

  document.getElementById('page-dashboard').innerHTML =
    '<div class="page-header"><div><h2>Dashboard</h2><p>' + monthLabel(ym) + '</p></div></div>' +
    '<div class="grid-4 summary-section">' +
      '<div class="card"><div class="card-title">Total Saldo</div><div class="card-value purple">' + formatRupiah(totSaldo) + '</div></div>' +
      '<div class="card"><div class="card-title">Pemasukan Bulan Ini</div><div class="card-value green">' + formatRupiah(masukBulan) + '</div></div>' +
      '<div class="card"><div class="card-title">Pengeluaran Bulan Ini</div><div class="card-value red">' + formatRupiah(keluarBulan) + '</div></div>' +
      '<div class="card"><div class="card-title">Selisih Bulan Ini</div><div class="card-value ' + (selisih >= 0 ? 'green' : 'red') + '">' + formatRupiah(selisih) + '</div></div>' +
    '</div>' +
    '<div class="grid-2 summary-section">' +
      '<div class="card"><div class="card-title">Hutangku (belum lunas)</div><div class="card-value red">' + formatRupiah(hutangAktif) + '</div></div>' +
      '<div class="card"><div class="card-title">Piutangku (belum lunas)</div><div class="card-value green">' + formatRupiah(piutangAktif) + '</div></div>' +
    '</div>' +
    '<div class="grid-2">' +
      '<div class="card"><div class="section-title">Saldo per Wadah</div>' + wadahBars + '</div>' +
      '<div class="card"><div class="section-title">Transaksi Terakhir</div><div class="recent-list">' + recentRows + '</div></div>' +
    '</div>';
}

// ===== WADAH =====
function renderWadah() {
  var cards = state.wadah.map(function(w) {
    var s = saldoWadah(w.id);
    return '<div class="wadah-card">' +
      '<div class="wadah-icon">' + w.icon + '</div>' +
      '<div class="wadah-name">' + w.nama + '</div>' +
      '<div class="wadah-balance">' + formatRupiah(s) + '</div>' +
      '<div class="wadah-actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="editWadah(\'' + w.id + '\')">✏️ Edit</button>' +
        '<button class="btn btn-danger btn-sm" onclick="hapusWadah(\'' + w.id + '\')">🗑️</button>' +
      '</div>' +
    '</div>';
  }).join('');

  document.getElementById('page-wadah').innerHTML =
    '<div class="page-header"><div><h2>Wadah</h2><p>Bank, e-wallet, cash, dll</p></div></div>' +
    '<div class="wadah-grid">' + cards +
      '<div class="wadah-card-add" onclick="tambahWadah()">' +
        '<div class="add-icon">➕</div>' +
        '<div style="font-size:0.875rem;font-weight:600">Tambah Wadah</div>' +
      '</div>' +
    '</div>';
}

function tambahWadah() {
  openModal('Tambah Wadah',
    '<div class="form-group"><label>Nama Wadah</label><input id="w-nama" placeholder="BCA, Dana, OVO, Cash..."/></div>' +
    '<div class="form-group"><label>Ikon (emoji)</label><input id="w-icon" placeholder="🏦" maxlength="2" value="🏦"/></div>' +
    '<div class="form-group"><label>Warna</label><input type="color" id="w-warna" value="#6c63ff"/></div>' +
    '<div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="simpanWadah()">Simpan</button></div>'
  );
}

function simpanWadah() {
  var nama = document.getElementById('w-nama').value.trim();
  var icon = document.getElementById('w-icon').value.trim() || '🏦';
  var warna = document.getElementById('w-warna').value;
  if (!nama) { alert('Nama wadah wajib diisi!'); return; }
  state.wadah.push({ id: uid(), nama: nama, icon: icon, warna: warna });
  saveData(); closeModal(); renderWadah();
}

function editWadah(id) {
  var w = getWadahById(id);
  if (!w) return;
  openModal('Edit Wadah',
    '<div class="form-group"><label>Nama Wadah</label><input id="w-nama" value="' + w.nama + '"/></div>' +
    '<div class="form-group"><label>Ikon (emoji)</label><input id="w-icon" value="' + w.icon + '" maxlength="2"/></div>' +
    '<div class="form-group"><label>Warna</label><input type="color" id="w-warna" value="' + w.warna + '"/></div>' +
    '<div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="updateWadah(\'' + id + '\')">Simpan</button></div>'
  );
}

function updateWadah(id) {
  var w = getWadahById(id);
  if (!w) return;
  w.nama = document.getElementById('w-nama').value.trim() || w.nama;
  w.icon = document.getElementById('w-icon').value.trim() || w.icon;
  w.warna = document.getElementById('w-warna').value;
  saveData(); closeModal(); renderWadah();
}

function hapusWadah(id) {
  var used = state.transaksi.some(function(t) { return t.wadahId === id || t.wadahTujuanId === id; });
  if (used) { alert('Wadah ini sudah dipakai di transaksi, hapus transaksinya dulu.'); return; }
  if (!confirm('Hapus wadah ini?')) return;
  state.wadah = state.wadah.filter(function(w) { return w.id !== id; });
  saveData(); renderWadah();
}

// ===== TRANSAKSI =====
var filterBulanTransaksi = currentYM();

function renderTransaksi() {
  var months = allMonths();
  var filtered = state.transaksi
    .filter(function(t) { return !filterBulanTransaksi || ymFromDate(t.tanggal) === filterBulanTransaksi; })
    .sort(function(a, b) { return (b.tanggal || '').localeCompare(a.tanggal || '') || b.id.localeCompare(a.id); });

  var monthOpts = months.map(function(m) {
    return '<option value="' + m + '"' + (m === filterBulanTransaksi ? ' selected' : '') + '>' + monthLabel(m) + '</option>';
  }).join('');

  var rows = filtered.length ? filtered.map(function(t) {
    var w = getWadahById(t.wadahId);
    var wT = getWadahById(t.wadahTujuanId);
    var badge = t.tipe === 'masuk' ? '<span class="badge badge-green">Masuk</span>'
      : t.tipe === 'keluar' ? '<span class="badge badge-red">Keluar</span>'
      : '<span class="badge badge-blue">Transfer</span>';
    var wadahInfo = t.tipe === 'transfer'
      ? (w ? w.icon + ' ' + w.nama : '?') + ' → ' + (wT ? wT.icon + ' ' + wT.nama : '?')
      : (w ? w.icon + ' ' + w.nama : '?');
    var amtColor = t.tipe === 'masuk' ? 'var(--success)' : 'var(--danger)';
    return '<tr>' +
      '<td>' + badge + '</td>' +
      '<td>' + (t.keterangan || '-') + '</td>' +
      '<td style="font-weight:700;color:' + amtColor + '">' + formatRupiah(t.jumlah) + '</td>' +
      '<td>' + wadahInfo + '</td>' +
      '<td>' + formatTanggal(t.tanggal) + '</td>' +
      '<td><button class="btn btn-danger btn-sm" onclick="hapusTransaksi(\'' + t.id + '\')">🗑️</button></td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada transaksi</p></div></td></tr>';

  document.getElementById('page-transaksi').innerHTML =
    '<div class="page-header">' +
      '<div><h2>Transaksi</h2><p>Pemasukan, pengeluaran & transfer</p></div>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        '<select class="month-selector" style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:0.875rem" onchange="filterBulanTransaksi=this.value;renderTransaksi()">' +
          '<option value="">Semua Bulan</option>' + monthOpts +
        '</select>' +
        '<button class="btn btn-success" onclick="tambahTransaksi(\'masuk\')">+ Pemasukan</button>' +
        '<button class="btn btn-danger" onclick="tambahTransaksi(\'keluar\')">− Pengeluaran</button>' +
        '<button class="btn btn-primary" onclick="tambahTransaksi(\'transfer\')">↔ Transfer</button>' +
      '</div>' +
    '</div>' +
    '<div class="card"><div class="table-wrap"><table>' +
      '<thead><tr><th>Tipe</th><th>Keterangan</th><th>Jumlah</th><th>Wadah</th><th>Tanggal</th><th>Aksi</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table></div></div>';
}

function tambahTransaksi(tipe) {
  var title = tipe === 'masuk' ? '+ Tambah Pemasukan' : tipe === 'keluar' ? '− Tambah Pengeluaran' : '↔ Transfer Antar Wadah';
  var tujuanField = tipe === 'transfer'
    ? '<div class="form-group"><label>Ke Wadah</label><select id="t-wadah-tujuan">' + wadahOptions() + '</select></div>'
    : '';
  openModal(title,
    '<div class="form-group"><label>Jumlah (Rp)</label><input type="number" id="t-jumlah" placeholder="0" min="0"/></div>' +
    '<div class="form-group"><label>Keterangan</label><input id="t-ket" placeholder="Gaji, makan siang, dll..."/></div>' +
    '<div class="form-group"><label>' + (tipe === 'transfer' ? 'Dari Wadah' : 'Wadah') + '</label><select id="t-wadah">' + wadahOptions() + '</select></div>' +
    tujuanField +
    '<div class="form-group"><label>Tanggal</label><input type="date" id="t-tanggal" value="' + currentDate() + '"/></div>' +
    '<div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="simpanTransaksi(\'' + tipe + '\')">Simpan</button></div>'
  );
}

function simpanTransaksi(tipe) {
  var jumlah = parseFloat(document.getElementById('t-jumlah').value);
  var ket = document.getElementById('t-ket').value.trim();
  var wadahId = document.getElementById('t-wadah').value;
  var tanggal = document.getElementById('t-tanggal').value;
  var wadahTujuanId = tipe === 'transfer' ? document.getElementById('t-wadah-tujuan').value : null;
  if (!jumlah || jumlah <= 0) { alert('Jumlah harus lebih dari 0!'); return; }
  if (!wadahId) { alert('Pilih wadah!'); return; }
  if (!tanggal) { alert('Tanggal wajib diisi!'); return; }
  if (tipe === 'transfer' && wadahId === wadahTujuanId) { alert('Wadah asal dan tujuan tidak boleh sama!'); return; }
  state.transaksi.push({ id: uid(), tipe: tipe, jumlah: jumlah, keterangan: ket, wadahId: wadahId, wadahTujuanId: wadahTujuanId, tanggal: tanggal, bulan: ymFromDate(tanggal) });
  saveData(); closeModal(); renderTransaksi();
}

function hapusTransaksi(id) {
  if (!confirm('Hapus transaksi ini?')) return;
  state.transaksi = state.transaksi.filter(function(t) { return t.id !== id; });
  saveData(); renderTransaksi();
}

// ===== HUTANG PIUTANG =====
var filterBulanHP = '';

function renderHutangPiutang() {
  var months = allMonths();
  var filtered = state.hutangPiutang
    .filter(function(h) { return !filterBulanHP || ymFromDate(h.tanggal || h.bulan) === filterBulanHP; })
    .sort(function(a, b) { return (b.tanggal || b.bulan || '').localeCompare(a.tanggal || a.bulan || '') || b.id.localeCompare(a.id); });

  var monthOpts = months.map(function(m) {
    return '<option value="' + m + '"' + (m === filterBulanHP ? ' selected' : '') + '>' + monthLabel(m) + '</option>';
  }).join('');

  var rows = filtered.length ? filtered.map(function(h) {
    var w = getWadahById(h.wadahId);
    var dibayar = (h.pelunasan || []).reduce(function(s, p) { return s + Number(p.jumlah); }, 0);
    var sisa = Number(h.jumlah) - dibayar;
    var badge = h.tipe === 'hutang' ? '<span class="badge badge-red">Hutangku</span>' : '<span class="badge badge-green">Piutangku</span>';
    var statusBadge = h.lunas ? '<span class="badge badge-gray">Lunas</span>' : '<span class="badge badge-yellow">Belum Lunas</span>';
    var bayarBtn = !h.lunas ? '<button class="btn btn-warning btn-sm" onclick="bayarHP(\'' + h.id + '\')">💸 Bayar</button>' : '';
    return '<tr>' +
      '<td>' + badge + '</td>' +
      '<td><b>' + h.nama + '</b>' + (h.keterangan ? '<br><small style="color:var(--text-muted)">' + h.keterangan + '</small>' : '') + '</td>' +
      '<td>' + formatRupiah(h.jumlah) + '</td>' +
      '<td style="color:var(--success)">' + formatRupiah(dibayar) + '</td>' +
      '<td style="font-weight:700;color:' + (sisa > 0 ? 'var(--danger)' : 'var(--success)') + '">' + formatRupiah(sisa) + '</td>' +
      '<td>' + (w ? w.icon + ' ' + w.nama : '-') + '</td>' +
      '<td>' + formatTanggal(h.tanggal || h.bulan) + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td style="display:flex;gap:4px">' + bayarBtn + '<button class="btn btn-danger btn-sm" onclick="hapusHP(\'' + h.id + '\')">🗑️</button></td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🤝</div><p>Belum ada catatan hutang/piutang</p></div></td></tr>';

  document.getElementById('page-hutangpiutang').innerHTML =
    '<div class="page-header">' +
      '<div><h2>Hutang & Piutang</h2><p>Pinjam meminjam</p></div>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        '<select style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:0.875rem" onchange="filterBulanHP=this.value;renderHutangPiutang()">' +
          '<option value="">Semua</option>' + monthOpts +
        '</select>' +
        '<button class="btn btn-danger" onclick="tambahHP(\'hutang\')">🔴 Aku Hutang</button>' +
        '<button class="btn btn-success" onclick="tambahHP(\'piutang\')">🟢 Aku Piutangin</button>' +
      '</div>' +
    '</div>' +
    '<div class="card"><div class="table-wrap"><table>' +
      '<thead><tr><th>Tipe</th><th>Nama</th><th>Jumlah</th><th>Dibayar</th><th>Sisa</th><th>Wadah</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table></div></div>';
}

function tambahHP(tipe) {
  var title = tipe === 'hutang' ? '🔴 Tambah Hutangku' : '🟢 Tambah Piutangku';
  var desc = tipe === 'hutang' ? 'Kamu pinjam dari orang → uang masuk ke wadah' : 'Kamu piutangin orang → uang keluar dari wadah';
  openModal(title,
    '<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px">' + desc + '</p>' +
    '<div class="form-group"><label>Nama ' + (tipe === 'hutang' ? 'Yang Ngutangin' : 'Yang Dipiutangi') + '</label><input id="hp-nama" placeholder="Nama orang..."/></div>' +
    '<div class="form-group"><label>Jumlah (Rp)</label><input type="number" id="hp-jumlah" placeholder="0" min="0"/></div>' +
    '<div class="form-group"><label>Keterangan</label><input id="hp-ket" placeholder="Opsional..."/></div>' +
    '<div class="form-group"><label>Wadah</label><select id="hp-wadah">' + wadahOptions() + '</select></div>' +
    '<div class="form-group"><label>Tanggal</label><input type="date" id="hp-tanggal" value="' + currentDate() + '"/></div>' +
    '<div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="simpanHP(\'' + tipe + '\')">Simpan</button></div>'
  );
}

function simpanHP(tipe) {
  var nama = document.getElementById('hp-nama').value.trim();
  var jumlah = parseFloat(document.getElementById('hp-jumlah').value);
  var ket = document.getElementById('hp-ket').value.trim();
  var wadahId = document.getElementById('hp-wadah').value;
  var tanggal = document.getElementById('hp-tanggal').value;
  if (!nama) { alert('Nama wajib diisi!'); return; }
  if (!jumlah || jumlah <= 0) { alert('Jumlah harus lebih dari 0!'); return; }
  if (!tanggal) { alert('Tanggal wajib diisi!'); return; }
  state.hutangPiutang.push({ id: uid(), tipe: tipe, nama: nama, jumlah: jumlah, keterangan: ket, wadahId: wadahId, tanggal: tanggal, bulan: ymFromDate(tanggal), lunas: false, pelunasan: [] });
  saveData(); closeModal(); renderHutangPiutang();
}

function bayarHP(id) {
  var h = state.hutangPiutang.find(function(x) { return x.id === id; });
  if (!h) return;
  var dibayar = (h.pelunasan || []).reduce(function(s, p) { return s + Number(p.jumlah); }, 0);
  var sisa = Number(h.jumlah) - dibayar;
  openModal('💸 Catat Pembayaran',
    '<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px">Sisa: <b>' + formatRupiah(sisa) + '</b></p>' +
    '<div class="form-group"><label>Jumlah Dibayar (Rp)</label><input type="number" id="pay-jumlah" value="' + sisa + '" min="0"/></div>' +
    '<div class="form-group"><label>Wadah</label><select id="pay-wadah">' + wadahOptions(h.wadahId) + '</select></div>' +
    '<div class="form-group"><label>Tanggal Bayar</label><input type="date" id="pay-tanggal" value="' + currentDate() + '"/></div>' +
    '<div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-warning" onclick="simpanBayar(\'' + id + '\')">Simpan</button></div>'
  );
}

function simpanBayar(id) {
  var h = state.hutangPiutang.find(function(x) { return x.id === id; });
  if (!h) return;
  var jumlah = parseFloat(document.getElementById('pay-jumlah').value);
  var wadahId = document.getElementById('pay-wadah').value;
  var tanggal = document.getElementById('pay-tanggal').value;
  if (!jumlah || jumlah <= 0) { alert('Jumlah harus lebih dari 0!'); return; }
  if (!h.pelunasan) h.pelunasan = [];
  h.pelunasan.push({ id: uid(), jumlah: jumlah, wadahId: wadahId, tanggal: tanggal });
  var dibayar = h.pelunasan.reduce(function(s, p) { return s + Number(p.jumlah); }, 0);
  if (dibayar >= Number(h.jumlah)) h.lunas = true;
  saveData(); closeModal(); renderHutangPiutang();
}

function hapusHP(id) {
  if (!confirm('Hapus catatan ini?')) return;
  state.hutangPiutang = state.hutangPiutang.filter(function(h) { return h.id !== id; });
  saveData(); renderHutangPiutang();
}

// ===== LAPORAN =====
var laporanBulan = currentYM();

function renderLaporan() {
  var months = allMonths();
  var ym = laporanBulan;

  var masukList = state.transaksi.filter(function(t) { return t.tipe === 'masuk' && ymFromDate(t.tanggal || t.bulan) === ym; });
  var keluarList = state.transaksi.filter(function(t) { return t.tipe === 'keluar' && ymFromDate(t.tanggal || t.bulan) === ym; });
  var hutangBulan = state.hutangPiutang.filter(function(h) { return h.tipe === 'hutang' && ymFromDate(h.tanggal || h.bulan) === ym; });
  var piutangBulan = state.hutangPiutang.filter(function(h) { return h.tipe === 'piutang' && ymFromDate(h.tanggal || h.bulan) === ym; });

  var totalMasuk = masukList.reduce(function(s, t) { return s + Number(t.jumlah); }, 0);
  var totalKeluar = keluarList.reduce(function(s, t) { return s + Number(t.jumlah); }, 0);
  var totalHutang = hutangBulan.reduce(function(s, h) { return s + Number(h.jumlah); }, 0);
  var totalPiutang = piutangBulan.reduce(function(s, h) { return s + Number(h.jumlah); }, 0);
  var selisih = totalMasuk - totalKeluar;

  function txRows(list) {
    if (!list.length) return '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px">Tidak ada data</td></tr>';
    return list.sort(function(a,b){ return (b.tanggal||'').localeCompare(a.tanggal||''); }).map(function(t) {
      var w = getWadahById(t.wadahId);
      return '<tr><td>' + formatTanggal(t.tanggal) + '</td><td>' + (t.keterangan || '-') + '</td><td>' + (w ? w.icon + ' ' + w.nama : '-') + '</td><td style="font-weight:600">' + formatRupiah(t.jumlah) + '</td></tr>';
    }).join('');
  }

  function hpRows(list) {
    if (!list.length) return '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px">Tidak ada data</td></tr>';
    return list.map(function(h) {
      var w = getWadahById(h.wadahId);
      var statusBadge = h.lunas ? '<span class="badge badge-gray">Lunas</span>' : '<span class="badge badge-yellow">Belum</span>';
      return '<tr><td>' + formatTanggal(h.tanggal) + '</td><td>' + h.nama + (h.keterangan ? ' <small style="color:var(--text-muted)">(' + h.keterangan + ')</small>' : '') + '</td><td>' + (w ? w.icon + ' ' + w.nama : '-') + '</td><td>' + formatRupiah(h.jumlah) + ' ' + statusBadge + '</td></tr>';
    }).join('');
  }

  var monthOpts = months.map(function(m) {
    return '<option value="' + m + '"' + (m === ym ? ' selected' : '') + '>' + monthLabel(m) + '</option>';
  }).join('');

  var wadahSaldoRows = state.wadah.map(function(w) {
    return '<tr><td>' + w.icon + ' ' + w.nama + '</td><td style="font-weight:700;color:var(--primary)">' + formatRupiah(saldoWadah(w.id)) + '</td></tr>';
  }).join('') + '<tr style="background:#f5f3ff;font-weight:700"><td>TOTAL</td><td>' + formatRupiah(totalSaldo()) + '</td></tr>';

  document.getElementById('page-laporan').innerHTML =
    '<div class="page-header">' +
      '<div><h2>Laporan Bulanan</h2><p>Ringkasan keuangan per bulan</p></div>' +
      '<select style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:0.875rem" onchange="laporanBulan=this.value;renderLaporan()">' + monthOpts + '</select>' +
    '</div>' +
    '<div class="grid-4 summary-section">' +
      '<div class="card"><div class="card-title">Total Pemasukan</div><div class="card-value green">' + formatRupiah(totalMasuk) + '</div></div>' +
      '<div class="card"><div class="card-title">Total Pengeluaran</div><div class="card-value red">' + formatRupiah(totalKeluar) + '</div></div>' +
      '<div class="card"><div class="card-title">Selisih</div><div class="card-value ' + (selisih >= 0 ? 'green' : 'red') + '">' + formatRupiah(selisih) + '</div></div>' +
      '<div class="card"><div class="card-title">Total Saldo Semua Wadah</div><div class="card-value purple">' + formatRupiah(totalSaldo()) + '</div></div>' +
    '</div>' +
    '<div class="card summary-section">' +
      '<div class="section-title">Saldo per Wadah (kumulatif)</div>' +
      '<div class="table-wrap"><table><thead><tr><th>Wadah</th><th>Saldo</th></tr></thead><tbody>' + wadahSaldoRows + '</tbody></table></div>' +
    '</div>' +
    '<div class="grid-2 summary-section">' +
      '<div class="card"><div class="section-title">📥 Pemasukan Bulan Ini</div>' +
        '<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Wadah</th><th>Jumlah</th></tr></thead><tbody>' + txRows(masukList) + '</tbody>' +
        (masukList.length ? '<tfoot><tr style="font-weight:700;background:#f5f3ff"><td colspan="3">Total</td><td>' + formatRupiah(totalMasuk) + '</td></tr></tfoot>' : '') +
      '</table></div></div>' +
      '<div class="card"><div class="section-title">📤 Pengeluaran Bulan Ini</div>' +
        '<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Wadah</th><th>Jumlah</th></tr></thead><tbody>' + txRows(keluarList) + '</tbody>' +
        (keluarList.length ? '<tfoot><tr style="font-weight:700;background:#f5f3ff"><td colspan="3">Total</td><td>' + formatRupiah(totalKeluar) + '</td></tr></tfoot>' : '') +
      '</table></div></div>' +
    '</div>' +
    '<div class="grid-2 summary-section">' +
      '<div class="card"><div class="section-title">🔴 Hutangku Bulan Ini</div>' +
        '<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Nama</th><th>Wadah</th><th>Jumlah</th></tr></thead><tbody>' + hpRows(hutangBulan) + '</tbody>' +
        (hutangBulan.length ? '<tfoot><tr style="font-weight:700;background:#f5f3ff"><td colspan="3">Total</td><td>' + formatRupiah(totalHutang) + '</td></tr></tfoot>' : '') +
      '</table></div></div>' +
      '<div class="card"><div class="section-title">🟢 Piutangku Bulan Ini</div>' +
        '<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Nama</th><th>Wadah</th><th>Jumlah</th></tr></thead><tbody>' + hpRows(piutangBulan) + '</tbody>' +
        (piutangBulan.length ? '<tfoot><tr style="font-weight:700;background:#f5f3ff"><td colspan="3">Total</td><td>' + formatRupiah(totalPiutang) + '</td></tr></tfoot>' : '') +
      '</table></div></div>' +
    '</div>';
}

// ===== INIT =====
renderPage('dashboard');
