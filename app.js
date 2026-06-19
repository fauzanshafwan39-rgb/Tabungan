// ===== KATEGORI =====
var KATEGORI = ['Makan & Minum','Transport','Belanja','Hiburan','Kesehatan','Pendidikan','Tagihan','Lainnya'];

// ===== STATE & STORAGE =====
var DB_KEY = 'tabunganku_v1';

function loadData() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || defaultData(); }
  catch(e) { return defaultData(); }
}
function defaultData() {
  return {
    wadah: [
      { id: 'w1', nama: 'Cash', icon: '💵', warna: '#22c55e', saldoAwal: 0 },
      { id: 'w2', nama: 'BCA', icon: '🏦', warna: '#3b82f6', saldoAwal: 0 },
    ],
    transaksi: [],
    hutangPiutang: [],
  };
}
function saveData() { localStorage.setItem(DB_KEY, JSON.stringify(state)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

var state = loadData();

// ===== DARK MODE =====
function initTheme() {
  var saved = localStorage.getItem('tabunganku_theme');
  if (saved === 'dark') { document.body.classList.add('dark'); document.body.classList.remove('light'); }
  else if (saved === 'light') { document.body.classList.add('light'); document.body.classList.remove('dark'); }
}
function toggleDark() {
  var isDark = document.body.classList.contains('dark');
  if (isDark) { document.body.classList.remove('dark'); document.body.classList.add('light'); localStorage.setItem('tabunganku_theme','light'); }
  else { document.body.classList.add('dark'); document.body.classList.remove('light'); localStorage.setItem('tabunganku_theme','dark'); }
}
initTheme();

// ===== NAVIGATION =====
var currentPage = 'dashboard';
function showPage(name) {
  currentPage = name;
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-btn,.bottom-nav-btn').forEach(function(b){ b.classList.remove('active'); });
  document.getElementById('page-'+name).classList.add('active');
  document.querySelectorAll('.nav-btn,.bottom-nav-btn').forEach(function(b){
    if (b.getAttribute('onclick') === "showPage('"+name+"')") b.classList.add('active');
  });
  renderPage(name);
}
function renderPage(name) {
  if (name==='dashboard') renderDashboard();
  else if (name==='wadah') renderWadah();
  else if (name==='transaksi') renderTransaksi();
  else if (name==='hutangpiutang') renderHutangPiutang();
  else if (name==='laporan') renderLaporan();
}

// ===== HELPERS =====
function formatRupiah(n) { return 'Rp '+Number(n||0).toLocaleString('id-ID'); }
function monthLabel(ym) {
  if (!ym) return '-';
  var p=ym.split('-'), names=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
  return names[parseInt(p[1])-1]+' '+p[0];
}
function currentYM() { var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function currentDate() { var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function formatTanggal(tgl) { if(!tgl) return '-'; var p=tgl.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function ymFromDate(tgl) { if(!tgl) return currentYM(); return tgl.slice(0,7); }
function allMonths() {
  var set=new Set(); set.add(currentYM());
  state.transaksi.forEach(function(t){ set.add(t.tanggal?ymFromDate(t.tanggal):(t.bulan||currentYM())); });
  state.hutangPiutang.forEach(function(h){ set.add(h.tanggal?ymFromDate(h.tanggal):(h.bulan||currentYM())); });
  return Array.from(set).sort().reverse();
}
function getWadahById(id) { return state.wadah.find(function(w){ return w.id===id; }); }

function saldoWadah(wadahId) {
  var w=getWadahById(wadahId);
  var total=w?(Number(w.saldoAwal)||0):0;
  state.transaksi.forEach(function(t){
    if(t.tipe==='masuk'&&t.wadahId===wadahId) total+=Number(t.jumlah);
    if(t.tipe==='keluar'&&t.wadahId===wadahId) total-=Number(t.jumlah);
    if(t.tipe==='transfer'&&t.wadahId===wadahId) total-=Number(t.jumlah);
    if(t.tipe==='transfer'&&t.wadahTujuanId===wadahId) total+=Number(t.jumlah);
  });
  state.hutangPiutang.forEach(function(h){
    if(h.tipe==='hutang'&&h.wadahId===wadahId) total+=Number(h.jumlah);
    if(h.tipe==='piutang'&&h.wadahId===wadahId) total-=Number(h.jumlah);
    if(h.pelunasan) h.pelunasan.forEach(function(p){
      if(h.tipe==='hutang'&&p.wadahId===wadahId) total-=Number(p.jumlah);
      if(h.tipe==='piutang'&&p.wadahId===wadahId) total+=Number(p.jumlah);
    });
  });
  return total;
}
function totalSaldo() { return state.wadah.reduce(function(s,w){ return s+saldoWadah(w.id); },0); }
function wadahOptions(selectedId) {
  return state.wadah.map(function(w){
    return '<option value="'+w.id+'"'+(w.id===selectedId?' selected':'')+'>'+w.icon+' '+w.nama+'</option>';
  }).join('');
}
function katOptions(selected) {
  return KATEGORI.map(function(k){
    return '<option value="'+k+'"'+(k===selected?' selected':'')+'>'+k+'</option>';
  }).join('');
}

// ===== MODAL =====
function openModal(title,body) {
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-body').innerHTML=body;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

// ===== DASHBOARD =====
function renderDashboard() {
  var ym=currentYM();
  var masukBulan=state.transaksi.filter(function(t){ return t.tipe==='masuk'&&ymFromDate(t.tanggal||t.bulan)===ym; }).reduce(function(s,t){ return s+Number(t.jumlah); },0);
  var keluarBulan=state.transaksi.filter(function(t){ return t.tipe==='keluar'&&ymFromDate(t.tanggal||t.bulan)===ym; }).reduce(function(s,t){ return s+Number(t.jumlah); },0);
  var hutangAktif=state.hutangPiutang.filter(function(h){ return h.tipe==='hutang'&&!h.lunas; });
  var piutangAktif=state.hutangPiutang.filter(function(h){ return h.tipe==='piutang'&&!h.lunas; });
  var totalHutang=hutangAktif.reduce(function(s,h){ return s+Number(h.jumlah); },0);
  var totalPiutang=piutangAktif.reduce(function(s,h){ return s+Number(h.jumlah); },0);
  var recent=[].concat(state.transaksi).sort(function(a,b){ return (b.tanggal||'').localeCompare(a.tanggal||'')||b.id.localeCompare(a.id); }).slice(0,5);
  var totSaldo=totalSaldo();
  var selisih=masukBulan-keluarBulan;

  var wadahBars=state.wadah.map(function(w){
    var s=saldoWadah(w.id);
    var pct=totSaldo>0?Math.max(0,Math.min(100,(s/totSaldo)*100)):0;
    return '<div style="margin-bottom:12px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'+
        '<span style="font-weight:600;font-size:0.875rem">'+w.icon+' '+w.nama+'</span>'+
        '<span style="font-weight:700;color:var(--primary);font-size:0.875rem">'+formatRupiah(s)+'</span>'+
      '</div>'+
      '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:'+pct.toFixed(1)+'%;background:'+w.warna+'"></div></div>'+
    '</div>';
  }).join('')||'<p style="color:var(--text-muted);font-size:0.875rem">Belum ada wadah</p>';

  var recentRows=recent.length?recent.map(function(t){
    var w=getWadahById(t.wadahId); var isIn=t.tipe==='masuk';
    return '<div class="recent-item">'+
      '<div class="ri-icon '+(isIn?'income':'expense')+'">'+(isIn?'⬆️':t.tipe==='transfer'?'↔️':'⬇️')+'</div>'+
      '<div class="ri-info">'+
        '<div class="ri-desc">'+(t.keterangan||(isIn?'Pemasukan':t.tipe==='transfer'?'Transfer':'Pengeluaran'))+'</div>'+
        '<div class="ri-meta">'+(w?w.icon+' '+w.nama:'?')+' · '+formatTanggal(t.tanggal)+(t.kategori?' · <span class="kat-chip">'+t.kategori+'</span>':'')+'</div>'+
      '</div>'+
      '<div class="ri-amount '+(isIn?'pos':'neg')+'">'+(isIn?'+':'-')+formatRupiah(t.jumlah)+'</div>'+
    '</div>';
  }).join(''):'<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada transaksi</p></div>';

  var hutangList=hutangAktif.slice(0,3).map(function(h){
    var sisa=Number(h.jumlah)-(h.pelunasan||[]).reduce(function(s,p){ return s+Number(p.jumlah); },0);
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.85rem">'+
      '<span>'+h.nama+(h.keterangan?' <small style="color:var(--text-muted)">('+h.keterangan+')</small>':'')+'</span>'+
      '<span style="font-weight:700;color:var(--danger)">'+formatRupiah(sisa)+'</span></div>';
  }).join('');
  var piutangList=piutangAktif.slice(0,3).map(function(h){
    var sisa=Number(h.jumlah)-(h.pelunasan||[]).reduce(function(s,p){ return s+Number(p.jumlah); },0);
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.85rem">'+
      '<span>'+h.nama+'</span>'+
      '<span style="font-weight:700;color:var(--success)">'+formatRupiah(sisa)+'</span></div>';
  }).join('');

  document.getElementById('page-dashboard').innerHTML=
    '<div class="page-header"><div><h2>Dashboard</h2><p>'+monthLabel(ym)+'</p></div></div>'+
    '<div class="grid-4 summary-section">'+
      '<div class="card"><div class="card-title">Total Saldo</div><div class="card-value purple">'+formatRupiah(totSaldo)+'</div></div>'+
      '<div class="card"><div class="card-title">Pemasukan Bulan Ini</div><div class="card-value green">'+formatRupiah(masukBulan)+'</div></div>'+
      '<div class="card"><div class="card-title">Pengeluaran Bulan Ini</div><div class="card-value red">'+formatRupiah(keluarBulan)+'</div></div>'+
      '<div class="card"><div class="card-title">Selisih Bulan Ini</div><div class="card-value '+(selisih>=0?'green':'red')+'">'+formatRupiah(selisih)+'</div></div>'+
    '</div>'+
    '<div class="grid-2 summary-section">'+
      '<div class="card"><div class="card-title">Hutangku Aktif ('+hutangAktif.length+')</div><div class="card-value red">'+formatRupiah(totalHutang)+'</div>'+(hutangList?'<div style="margin-top:10px">'+hutangList+'</div>':'')+'</div>'+
      '<div class="card"><div class="card-title">Piutangku Aktif ('+piutangAktif.length+')</div><div class="card-value green">'+formatRupiah(totalPiutang)+'</div>'+(piutangList?'<div style="margin-top:10px">'+piutangList+'</div>':'')+'</div>'+
    '</div>'+
    '<div class="grid-2">'+
      '<div class="card"><div class="section-title">Saldo per Wadah</div>'+wadahBars+'</div>'+
      '<div class="card"><div class="section-title">Transaksi Terakhir</div><div class="recent-list">'+recentRows+'</div></div>'+
    '</div>';
}

// ===== WADAH =====
function renderWadah() {
  var cards=state.wadah.map(function(w){
    var s=saldoWadah(w.id);
    return '<div class="wadah-card">'+
      '<div class="wadah-icon">'+w.icon+'</div>'+
      '<div class="wadah-name">'+w.nama+'</div>'+
      (w.saldoAwal?'<div class="wadah-saldo-awal">Saldo awal: '+formatRupiah(w.saldoAwal)+'</div>':'')+
      '<div class="wadah-balance">'+formatRupiah(s)+'</div>'+
      '<div class="wadah-actions">'+
        '<button class="btn btn-ghost btn-sm" onclick="editWadah(\''+w.id+'\')">✏️ Edit</button>'+
        '<button class="btn btn-danger btn-sm" onclick="hapusWadah(\''+w.id+'\')">🗑️</button>'+
      '</div>'+
    '</div>';
  }).join('');
  document.getElementById('page-wadah').innerHTML=
    '<div class="page-header"><div><h2>Wadah</h2><p>Bank, e-wallet, cash, dll</p></div></div>'+
    '<div class="wadah-grid">'+cards+
      '<div class="wadah-card-add" onclick="tambahWadah()"><div class="add-icon">➕</div><div style="font-size:0.875rem;font-weight:600">Tambah Wadah</div></div>'+
    '</div>';
}

function tambahWadah() {
  openModal('Tambah Wadah',
    '<div class="form-group"><label>Nama Wadah</label><input id="w-nama" placeholder="BCA, Dana, OVO, Cash..."/></div>'+
    '<div class="form-group"><label>Ikon (emoji)</label><input id="w-icon" placeholder="🏦" maxlength="2" value="🏦"/></div>'+
    '<div class="form-group"><label>Warna</label><input type="color" id="w-warna" value="#6c63ff"/></div>'+
    '<div class="form-group"><label>Saldo Awal (Rp)</label><input type="number" id="w-saldo" placeholder="0" min="0" value="0"/></div>'+
    '<div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="simpanWadah()">Simpan</button></div>'
  );
}
function simpanWadah() {
  var nama=document.getElementById('w-nama').value.trim();
  var icon=document.getElementById('w-icon').value.trim()||'🏦';
  var warna=document.getElementById('w-warna').value;
  var saldoAwal=parseFloat(document.getElementById('w-saldo').value)||0;
  if(!nama){ alert('Nama wadah wajib diisi!'); return; }
  state.wadah.push({ id:uid(), nama:nama, icon:icon, warna:warna, saldoAwal:saldoAwal });
  saveData(); closeModal(); renderWadah();
}
function editWadah(id) {
  var w=getWadahById(id); if(!w) return;
  openModal('Edit Wadah',
    '<div class="form-group"><label>Nama Wadah</label><input id="w-nama" value="'+w.nama+'"/></div>'+
    '<div class="form-group"><label>Ikon (emoji)</label><input id="w-icon" value="'+w.icon+'" maxlength="2"/></div>'+
    '<div class="form-group"><label>Warna</label><input type="color" id="w-warna" value="'+w.warna+'"/></div>'+
    '<div class="form-group"><label>Saldo Awal (Rp)</label><input type="number" id="w-saldo" value="'+(w.saldoAwal||0)+'" min="0"/></div>'+
    '<div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="updateWadah(\''+id+'\')">Simpan</button></div>'
  );
}
function updateWadah(id) {
  var w=getWadahById(id); if(!w) return;
  w.nama=document.getElementById('w-nama').value.trim()||w.nama;
  w.icon=document.getElementById('w-icon').value.trim()||w.icon;
  w.warna=document.getElementById('w-warna').value;
  w.saldoAwal=parseFloat(document.getElementById('w-saldo').value)||0;
  saveData(); closeModal(); renderWadah();
}
function hapusWadah(id) {
  var used=state.transaksi.some(function(t){ return t.wadahId===id||t.wadahTujuanId===id; });
  if(used){ alert('Wadah ini dipakai di transaksi, hapus transaksinya dulu.'); return; }
  if(!confirm('Hapus wadah ini?')) return;
  state.wadah=state.wadah.filter(function(w){ return w.id!==id; });
  saveData(); renderWadah();
}

// ===== TRANSAKSI =====
var filterBulanTransaksi=currentYM();

function renderTransaksi() {
  var months=allMonths();
  var filtered=state.transaksi
    .filter(function(t){ return !filterBulanTransaksi||ymFromDate(t.tanggal)===filterBulanTransaksi; })
    .sort(function(a,b){ return (b.tanggal||'').localeCompare(a.tanggal||'')||b.id.localeCompare(a.id); });
  var monthOpts=months.map(function(m){ return '<option value="'+m+'"'+(m===filterBulanTransaksi?' selected':'')+'>'+monthLabel(m)+'</option>'; }).join('');

  var rows=filtered.length?filtered.map(function(t){
    var w=getWadahById(t.wadahId), wT=getWadahById(t.wadahTujuanId);
    var badge=t.tipe==='masuk'?'<span class="badge badge-green">Masuk</span>':t.tipe==='keluar'?'<span class="badge badge-red">Keluar</span>':'<span class="badge badge-blue">Transfer</span>';
    var wadahInfo=t.tipe==='transfer'?(w?w.icon+' '+w.nama:'?')+' → '+(wT?wT.icon+' '+wT.nama:'?'):(w?w.icon+' '+w.nama:'?');
    var amtColor=t.tipe==='masuk'?'var(--success)':'var(--danger)';
    return '<tr>'+
      '<td>'+badge+'</td>'+
      '<td>'+(t.keterangan||'-')+(t.kategori?'<br><span class="kat-chip">'+t.kategori+'</span>':'')+'</td>'+
      '<td style="font-weight:700;color:'+amtColor+'">'+formatRupiah(t.jumlah)+'</td>'+
      '<td>'+wadahInfo+'</td>'+
      '<td>'+formatTanggal(t.tanggal)+'</td>'+
      '<td style="display:flex;gap:4px"><button class="btn btn-ghost btn-sm" onclick="editTransaksi(\''+t.id+'\')">✏️</button><button class="btn btn-danger btn-sm" onclick="hapusTransaksi(\''+t.id+'\')">🗑️</button></td>'+
    '</tr>';
  }).join(''):'<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada transaksi</p></div></td></tr>';

  var cards=filtered.length?filtered.map(function(t){
    var w=getWadahById(t.wadahId), wT=getWadahById(t.wadahTujuanId);
    var isIn=t.tipe==='masuk', isTr=t.tipe==='transfer';
    var amtColor=isIn?'var(--success)':'var(--danger)';
    var bgColor=isIn?'#dcfce7':isTr?'#dbeafe':'#fee2e2';
    var icon=isIn?'⬆️':isTr?'↔️':'⬇️';
    var wadahInfo=isTr?(w?w.icon+' '+w.nama:'?')+' → '+(wT?wT.icon+' '+wT.nama:'?'):(w?w.icon+' '+w.nama:'?');
    return '<div class="m-card">'+
      '<div class="m-card-left"><div class="m-card-icon" style="background:'+bgColor+'">'+icon+'</div></div>'+
      '<div class="m-card-body">'+
        '<div class="m-card-title">'+(t.keterangan||(isIn?'Pemasukan':isTr?'Transfer':'Pengeluaran'))+'</div>'+
        '<div class="m-card-sub">'+wadahInfo+' · '+formatTanggal(t.tanggal)+(t.kategori?' · '+t.kategori:'')+'</div>'+
      '</div>'+
      '<div class="m-card-right">'+
        '<div style="font-weight:700;color:'+amtColor+'">'+(isIn?'+':isTr?'':'-')+formatRupiah(t.jumlah)+'</div>'+
        '<div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end">'+
          '<button class="btn btn-ghost btn-sm" onclick="editTransaksi(\''+t.id+'\')">✏️</button>'+
          '<button class="btn btn-danger btn-sm" onclick="hapusTransaksi(\''+t.id+'\')">🗑️</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join(''):'<div class="empty-state"><div class="empty-icon">📭</div><p>Belum ada transaksi</p></div>';

  document.getElementById('page-transaksi').innerHTML=
    '<div class="page-header">'+
      '<div><h2>Transaksi</h2><p>Pemasukan, pengeluaran & transfer</p></div>'+
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
        '<select style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:0.875rem;background:var(--card);color:var(--text)" onchange="filterBulanTransaksi=this.value;renderTransaksi()">'+
          '<option value="">Semua Bulan</option>'+monthOpts+
        '</select>'+
        '<button class="btn btn-success" onclick="tambahTransaksi(\'masuk\')">+ Pemasukan</button>'+
        '<button class="btn btn-danger" onclick="tambahTransaksi(\'keluar\')">− Pengeluaran</button>'+
        '<button class="btn btn-primary" onclick="tambahTransaksi(\'transfer\')">↔ Transfer</button>'+
      '</div>'+
    '</div>'+
    '<div class="card desktop-only"><div class="table-wrap"><table>'+
      '<thead><tr><th>Tipe</th><th>Keterangan</th><th>Jumlah</th><th>Wadah</th><th>Tanggal</th><th>Aksi</th></tr></thead>'+
      '<tbody>'+rows+'</tbody></table></div></div>'+
    '<div class="mobile-only">'+cards+'</div>';
}

function formTransaksi(tipe, t) {
  var isEdit=!!t;
  var tujuanField=tipe==='transfer'?'<div class="form-group"><label>Ke Wadah</label><select id="t-wadah-tujuan">'+wadahOptions(t?t.wadahTujuanId:'')+'</select></div>':'';
  var katField=tipe!=='transfer'?'<div class="form-group"><label>Kategori</label><select id="t-kat"><option value="">-- Pilih Kategori --</option>'+katOptions(t?t.kategori:'')+'</select></div>':'';
  return '<div class="form-group"><label>Jumlah (Rp)</label><input type="number" id="t-jumlah" placeholder="0" min="0" value="'+(t?t.jumlah:'')+'"/></div>'+
    '<div class="form-group"><label>Keterangan</label><input id="t-ket" placeholder="Gaji, makan siang, dll..." value="'+(t?t.keterangan:'')+'"/></div>'+
    '<div class="form-group"><label>'+(tipe==='transfer'?'Dari Wadah':'Wadah')+'</label><select id="t-wadah">'+wadahOptions(t?t.wadahId:'')+'</select></div>'+
    tujuanField+katField+
    '<div class="form-group"><label>Tanggal</label><input type="date" id="t-tanggal" value="'+(t?t.tanggal:currentDate())+'"/></div>'+
    '<div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="'+(isEdit?'updateTransaksi(\''+t.id+'\',\''+tipe+'\')':'simpanTransaksi(\''+tipe+'\')')+'">Simpan</button></div>';
}

function tambahTransaksi(tipe) {
  var title=tipe==='masuk'?'+ Tambah Pemasukan':tipe==='keluar'?'− Tambah Pengeluaran':'↔ Transfer Antar Wadah';
  openModal(title, formTransaksi(tipe,null));
}
function editTransaksi(id) {
  var t=state.transaksi.find(function(x){ return x.id===id; }); if(!t) return;
  var title=t.tipe==='masuk'?'✏️ Edit Pemasukan':t.tipe==='keluar'?'✏️ Edit Pengeluaran':'✏️ Edit Transfer';
  openModal(title, formTransaksi(t.tipe,t));
}
function _getTransaksiValues(tipe) {
  return {
    jumlah: parseFloat(document.getElementById('t-jumlah').value),
    ket: document.getElementById('t-ket').value.trim(),
    wadahId: document.getElementById('t-wadah').value,
    tanggal: document.getElementById('t-tanggal').value,
    wadahTujuanId: tipe==='transfer'?document.getElementById('t-wadah-tujuan').value:null,
    kategori: tipe!=='transfer'&&document.getElementById('t-kat')?document.getElementById('t-kat').value:'',
  };
}
function simpanTransaksi(tipe) {
  var v=_getTransaksiValues(tipe);
  if(!v.jumlah||v.jumlah<=0){ alert('Jumlah harus lebih dari 0!'); return; }
  if(!v.wadahId){ alert('Pilih wadah!'); return; }
  if(!v.tanggal){ alert('Tanggal wajib diisi!'); return; }
  if(tipe==='transfer'&&v.wadahId===v.wadahTujuanId){ alert('Wadah asal dan tujuan tidak boleh sama!'); return; }
  state.transaksi.push({ id:uid(), tipe:tipe, jumlah:v.jumlah, keterangan:v.ket, wadahId:v.wadahId, wadahTujuanId:v.wadahTujuanId, tanggal:v.tanggal, bulan:ymFromDate(v.tanggal), kategori:v.kategori });
  saveData(); closeModal(); renderTransaksi();
}
function updateTransaksi(id, tipe) {
  var t=state.transaksi.find(function(x){ return x.id===id; }); if(!t) return;
  var v=_getTransaksiValues(tipe);
  if(!v.jumlah||v.jumlah<=0){ alert('Jumlah harus lebih dari 0!'); return; }
  if(!v.tanggal){ alert('Tanggal wajib diisi!'); return; }
  t.jumlah=v.jumlah; t.keterangan=v.ket; t.wadahId=v.wadahId; t.wadahTujuanId=v.wadahTujuanId;
  t.tanggal=v.tanggal; t.bulan=ymFromDate(v.tanggal); t.kategori=v.kategori;
  saveData(); closeModal(); renderTransaksi();
}
function hapusTransaksi(id) {
  if(!confirm('Hapus transaksi ini?')) return;
  state.transaksi=state.transaksi.filter(function(t){ return t.id!==id; });
  saveData(); renderTransaksi();
}

// ===== HUTANG PIUTANG =====
var filterBulanHP='';
function renderHutangPiutang() {
  var months=allMonths();
  var filtered=state.hutangPiutang
    .filter(function(h){ return !filterBulanHP||ymFromDate(h.tanggal||h.bulan)===filterBulanHP; })
    .sort(function(a,b){ return (b.tanggal||b.bulan||'').localeCompare(a.tanggal||a.bulan||'')||b.id.localeCompare(a.id); });
  var monthOpts=months.map(function(m){ return '<option value="'+m+'"'+(m===filterBulanHP?' selected':'')+'>'+monthLabel(m)+'</option>'; }).join('');

  var rows=filtered.length?filtered.map(function(h){
    var w=getWadahById(h.wadahId);
    var dibayar=(h.pelunasan||[]).reduce(function(s,p){ return s+Number(p.jumlah); },0);
    var sisa=Number(h.jumlah)-dibayar;
    var badge=h.tipe==='hutang'?'<span class="badge badge-red">Hutangku</span>':'<span class="badge badge-green">Piutangku</span>';
    var statusBadge=h.lunas?'<span class="badge badge-gray">Lunas</span>':'<span class="badge badge-yellow">Belum</span>';
    var bayarBtn=!h.lunas?'<button class="btn btn-warning btn-sm" onclick="bayarHP(\''+h.id+'\')">💸</button>':'';
    return '<tr>'+
      '<td>'+badge+'</td>'+
      '<td><b>'+h.nama+'</b>'+(h.keterangan?'<br><small style="color:var(--text-muted)">'+h.keterangan+'</small>':'')+'</td>'+
      '<td>'+formatRupiah(h.jumlah)+'</td>'+
      '<td style="color:var(--success)">'+formatRupiah(dibayar)+'</td>'+
      '<td style="font-weight:700;color:'+(sisa>0?'var(--danger)':'var(--success)')+'">'+formatRupiah(sisa)+'</td>'+
      '<td>'+(w?w.icon+' '+w.nama:'-')+'</td>'+
      '<td>'+formatTanggal(h.tanggal||h.bulan)+'</td>'+
      '<td>'+statusBadge+'</td>'+
      '<td style="display:flex;gap:4px">'+bayarBtn+'<button class="btn btn-danger btn-sm" onclick="hapusHP(\''+h.id+'\')">🗑️</button></td>'+
    '</tr>';
  }).join(''):'<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🤝</div><p>Belum ada catatan</p></div></td></tr>';

  var cards=filtered.length?filtered.map(function(h){
    var w=getWadahById(h.wadahId);
    var dibayar=(h.pelunasan||[]).reduce(function(s,p){ return s+Number(p.jumlah); },0);
    var sisa=Number(h.jumlah)-dibayar;
    var isHutang=h.tipe==='hutang';
    var statusBadge=h.lunas?'<span class="badge badge-gray">Lunas</span>':'<span class="badge badge-yellow">Belum Lunas</span>';
    var bayarBtn=!h.lunas?'<button class="btn btn-warning btn-sm" onclick="bayarHP(\''+h.id+'\')">💸 Bayar</button>':'';
    return '<div class="m-card">'+
      '<div class="m-card-left"><div class="m-card-icon" style="background:'+(isHutang?'#fee2e2':'#dcfce7')+'">'+(isHutang?'🔴':'🟢')+'</div></div>'+
      '<div class="m-card-body">'+
        '<div class="m-card-title"><b>'+h.nama+'</b> '+statusBadge+'</div>'+
        '<div class="m-card-sub">'+(w?w.icon+' '+w.nama:'')+' · '+formatTanggal(h.tanggal)+'</div>'+
        '<div style="margin-top:4px;font-size:0.78rem;color:var(--text-muted)">Total: <b style="color:var(--text)">'+formatRupiah(h.jumlah)+'</b> &nbsp;Dibayar: <span style="color:var(--success)">'+formatRupiah(dibayar)+'</span> &nbsp;Sisa: <span style="color:'+(sisa>0?'var(--danger)':'var(--success)')+'">'+formatRupiah(sisa)+'</span></div>'+
        '<div style="margin-top:8px;display:flex;gap:6px">'+bayarBtn+'<button class="btn btn-danger btn-sm" onclick="hapusHP(\''+h.id+'\')">🗑️</button></div>'+
      '</div>'+
    '</div>';
  }).join(''):'<div class="empty-state"><div class="empty-icon">🤝</div><p>Belum ada catatan hutang/piutang</p></div>';

  document.getElementById('page-hutangpiutang').innerHTML=
    '<div class="page-header">'+
      '<div><h2>Hutang & Piutang</h2><p>Pinjam meminjam</p></div>'+
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
        '<select style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:0.875rem;background:var(--card);color:var(--text)" onchange="filterBulanHP=this.value;renderHutangPiutang()">'+
          '<option value="">Semua</option>'+monthOpts+'</select>'+
        '<button class="btn btn-danger" onclick="tambahHP(\'hutang\')">🔴 Aku Hutang</button>'+
        '<button class="btn btn-success" onclick="tambahHP(\'piutang\')">🟢 Aku Piutangin</button>'+
      '</div>'+
    '</div>'+
    '<div class="card desktop-only"><div class="table-wrap"><table>'+
      '<thead><tr><th>Tipe</th><th>Nama</th><th>Jumlah</th><th>Dibayar</th><th>Sisa</th><th>Wadah</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead>'+
      '<tbody>'+rows+'</tbody></table></div></div>'+
    '<div class="mobile-only">'+cards+'</div>';
}

function tambahHP(tipe) {
  var title=tipe==='hutang'?'🔴 Tambah Hutangku':'🟢 Tambah Piutangku';
  var desc=tipe==='hutang'?'Kamu pinjam dari orang → uang masuk ke wadah':'Kamu piutangin orang → uang keluar dari wadah';
  openModal(title,
    '<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px">'+desc+'</p>'+
    '<div class="form-group"><label>Nama '+(tipe==='hutang'?'Yang Ngutangin':'Yang Dipiutangi')+'</label><input id="hp-nama" placeholder="Nama orang..."/></div>'+
    '<div class="form-group"><label>Jumlah (Rp)</label><input type="number" id="hp-jumlah" placeholder="0" min="0"/></div>'+
    '<div class="form-group"><label>Keterangan</label><input id="hp-ket" placeholder="Opsional..."/></div>'+
    '<div class="form-group"><label>Wadah</label><select id="hp-wadah">'+wadahOptions()+'</select></div>'+
    '<div class="form-group"><label>Tanggal</label><input type="date" id="hp-tanggal" value="'+currentDate()+'"/></div>'+
    '<div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="simpanHP(\''+tipe+'\')">Simpan</button></div>'
  );
}
function simpanHP(tipe) {
  var nama=document.getElementById('hp-nama').value.trim();
  var jumlah=parseFloat(document.getElementById('hp-jumlah').value);
  var ket=document.getElementById('hp-ket').value.trim();
  var wadahId=document.getElementById('hp-wadah').value;
  var tanggal=document.getElementById('hp-tanggal').value;
  if(!nama){ alert('Nama wajib diisi!'); return; }
  if(!jumlah||jumlah<=0){ alert('Jumlah harus lebih dari 0!'); return; }
  if(!tanggal){ alert('Tanggal wajib diisi!'); return; }
  state.hutangPiutang.push({ id:uid(), tipe:tipe, nama:nama, jumlah:jumlah, keterangan:ket, wadahId:wadahId, tanggal:tanggal, bulan:ymFromDate(tanggal), lunas:false, pelunasan:[] });
  saveData(); closeModal(); renderHutangPiutang();
}
function bayarHP(id) {
  var h=state.hutangPiutang.find(function(x){ return x.id===id; }); if(!h) return;
  var dibayar=(h.pelunasan||[]).reduce(function(s,p){ return s+Number(p.jumlah); },0);
  var sisa=Number(h.jumlah)-dibayar;
  openModal('💸 Catat Pembayaran',
    '<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px">Sisa: <b>'+formatRupiah(sisa)+'</b></p>'+
    '<div class="form-group"><label>Jumlah Dibayar (Rp)</label><input type="number" id="pay-jumlah" value="'+sisa+'" min="0"/></div>'+
    '<div class="form-group"><label>Wadah</label><select id="pay-wadah">'+wadahOptions(h.wadahId)+'</select></div>'+
    '<div class="form-group"><label>Tanggal Bayar</label><input type="date" id="pay-tanggal" value="'+currentDate()+'"/></div>'+
    '<div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-warning" onclick="simpanBayar(\''+id+'\')">Simpan</button></div>'
  );
}
function simpanBayar(id) {
  var h=state.hutangPiutang.find(function(x){ return x.id===id; }); if(!h) return;
  var jumlah=parseFloat(document.getElementById('pay-jumlah').value);
  var wadahId=document.getElementById('pay-wadah').value;
  var tanggal=document.getElementById('pay-tanggal').value;
  if(!jumlah||jumlah<=0){ alert('Jumlah harus lebih dari 0!'); return; }
  if(!h.pelunasan) h.pelunasan=[];
  h.pelunasan.push({ id:uid(), jumlah:jumlah, wadahId:wadahId, tanggal:tanggal });
  var dibayar=h.pelunasan.reduce(function(s,p){ return s+Number(p.jumlah); },0);
  if(dibayar>=Number(h.jumlah)) h.lunas=true;
  saveData(); closeModal(); renderHutangPiutang();
}
function hapusHP(id) {
  if(!confirm('Hapus catatan ini?')) return;
  state.hutangPiutang=state.hutangPiutang.filter(function(h){ return h.id!==id; });
  saveData(); renderHutangPiutang();
}

// ===== LAPORAN =====
var laporanBulan=currentYM();
function renderLaporan() {
  var months=allMonths(), ym=laporanBulan;
  var masukList=state.transaksi.filter(function(t){ return t.tipe==='masuk'&&ymFromDate(t.tanggal||t.bulan)===ym; });
  var keluarList=state.transaksi.filter(function(t){ return t.tipe==='keluar'&&ymFromDate(t.tanggal||t.bulan)===ym; });
  var hutangBulan=state.hutangPiutang.filter(function(h){ return h.tipe==='hutang'&&ymFromDate(h.tanggal||h.bulan)===ym; });
  var piutangBulan=state.hutangPiutang.filter(function(h){ return h.tipe==='piutang'&&ymFromDate(h.tanggal||h.bulan)===ym; });
  var totalMasuk=masukList.reduce(function(s,t){ return s+Number(t.jumlah); },0);
  var totalKeluar=keluarList.reduce(function(s,t){ return s+Number(t.jumlah); },0);
  var totalHutang=hutangBulan.reduce(function(s,h){ return s+Number(h.jumlah); },0);
  var totalPiutang=piutangBulan.reduce(function(s,h){ return s+Number(h.jumlah); },0);
  var selisih=totalMasuk-totalKeluar;

  // Kategori chart
  var katMap={};
  keluarList.forEach(function(t){ var k=t.kategori||'Lainnya'; katMap[k]=(katMap[k]||0)+Number(t.jumlah); });
  var katEntries=Object.keys(katMap).map(function(k){ return {k:k,v:katMap[k]}; }).sort(function(a,b){ return b.v-a.v; });
  var maxKat=katEntries.length?katEntries[0].v:1;
  var katChart=katEntries.length?katEntries.map(function(e){
    var pct=(e.v/maxKat*100).toFixed(1);
    return '<div class="chart-bar-row">'+
      '<div class="chart-bar-label">'+e.k+'</div>'+
      '<div class="chart-bar-track"><div class="chart-bar-fill" style="width:'+pct+'%"></div></div>'+
      '<div class="chart-bar-val">'+formatRupiah(e.v)+'</div>'+
    '</div>';
  }).join(''):'<p style="color:var(--text-muted);font-size:0.875rem">Belum ada data</p>';

  function txRows(list) {
    if(!list.length) return '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px">Tidak ada data</td></tr>';
    return list.sort(function(a,b){ return (b.tanggal||'').localeCompare(a.tanggal||''); }).map(function(t){
      var w=getWadahById(t.wadahId);
      return '<tr><td>'+formatTanggal(t.tanggal)+'</td><td>'+(t.keterangan||'-')+(t.kategori?'<br><span class="kat-chip">'+t.kategori+'</span>':'')+'</td><td>'+(w?w.icon+' '+w.nama:'-')+'</td><td style="font-weight:600">'+formatRupiah(t.jumlah)+'</td></tr>';
    }).join('');
  }
  function txCards(list,isIncome) {
    if(!list.length) return '<p style="color:var(--text-muted);font-size:0.875rem;padding:8px 0">Tidak ada data</p>';
    return list.sort(function(a,b){ return (b.tanggal||'').localeCompare(a.tanggal||''); }).map(function(t){
      var w=getWadahById(t.wadahId);
      return '<div class="m-card">'+
        '<div class="m-card-left"><div class="m-card-icon" style="background:'+(isIncome?'#dcfce7':'#fee2e2')+'">'+(isIncome?'⬆️':'⬇️')+'</div></div>'+
        '<div class="m-card-body">'+
          '<div class="m-card-title">'+(t.keterangan||'-')+(t.kategori?' <span class="kat-chip">'+t.kategori+'</span>':'')+'</div>'+
          '<div class="m-card-sub">'+(w?w.icon+' '+w.nama:'-')+' · '+formatTanggal(t.tanggal)+'</div>'+
        '</div>'+
        '<div class="m-card-right" style="font-weight:700;color:'+(isIncome?'var(--success)':'var(--danger)')+'">'+formatRupiah(t.jumlah)+'</div>'+
      '</div>';
    }).join('');
  }
  function hpRows(list) {
    if(!list.length) return '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px">Tidak ada data</td></tr>';
    return list.map(function(h){ var w=getWadahById(h.wadahId); var sb=h.lunas?'<span class="badge badge-gray">Lunas</span>':'<span class="badge badge-yellow">Belum</span>'; return '<tr><td>'+formatTanggal(h.tanggal)+'</td><td>'+h.nama+(h.keterangan?' <small>('+h.keterangan+')</small>':'')+'</td><td>'+(w?w.icon+' '+w.nama:'-')+'</td><td>'+formatRupiah(h.jumlah)+' '+sb+'</td></tr>'; }).join('');
  }
  function hpCards(list,isHutang) {
    if(!list.length) return '<p style="color:var(--text-muted);font-size:0.875rem;padding:8px 0">Tidak ada data</p>';
    return list.map(function(h){ var w=getWadahById(h.wadahId); var sb=h.lunas?'<span class="badge badge-gray">Lunas</span>':'<span class="badge badge-yellow">Belum</span>';
      return '<div class="m-card"><div class="m-card-left"><div class="m-card-icon" style="background:'+(isHutang?'#fee2e2':'#dcfce7')+'">'+(isHutang?'🔴':'🟢')+'</div></div><div class="m-card-body"><div class="m-card-title">'+h.nama+' '+sb+'</div><div class="m-card-sub">'+(w?w.icon+' '+w.nama:'')+' · '+formatTanggal(h.tanggal)+'</div></div><div class="m-card-right" style="font-weight:700;color:'+(isHutang?'var(--danger)':'var(--success)')+'">'+formatRupiah(h.jumlah)+'</div></div>';
    }).join('');
  }

  var monthOpts=months.map(function(m){ return '<option value="'+m+'"'+(m===ym?' selected':'')+'>'+monthLabel(m)+'</option>'; }).join('');
  var wadahSaldoRows=state.wadah.map(function(w){ return '<tr><td>'+w.icon+' '+w.nama+'</td><td style="font-weight:700;color:var(--primary)">'+formatRupiah(saldoWadah(w.id))+'</td></tr>'; }).join('')+'<tr style="font-weight:700;background:var(--bg)"><td>TOTAL</td><td>'+formatRupiah(totalSaldo())+'</td></tr>';

  document.getElementById('page-laporan').innerHTML=
    '<div class="page-header">'+
      '<div><h2>Laporan Bulanan</h2><p>Ringkasan keuangan per bulan</p></div>'+
      '<select style="padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:0.875rem;background:var(--card);color:var(--text)" onchange="laporanBulan=this.value;renderLaporan()">'+monthOpts+'</select>'+
    '</div>'+
    '<div class="grid-4 summary-section">'+
      '<div class="card"><div class="card-title">Total Pemasukan</div><div class="card-value green">'+formatRupiah(totalMasuk)+'</div></div>'+
      '<div class="card"><div class="card-title">Total Pengeluaran</div><div class="card-value red">'+formatRupiah(totalKeluar)+'</div></div>'+
      '<div class="card"><div class="card-title">Selisih</div><div class="card-value '+(selisih>=0?'green':'red')+'">'+formatRupiah(selisih)+'</div></div>'+
      '<div class="card"><div class="card-title">Total Saldo Wadah</div><div class="card-value purple">'+formatRupiah(totalSaldo())+'</div></div>'+
    '</div>'+
    '<div class="grid-2 summary-section">'+
      '<div class="card"><div class="section-title">Saldo per Wadah</div><div class="table-wrap"><table><thead><tr><th>Wadah</th><th>Saldo</th></tr></thead><tbody>'+wadahSaldoRows+'</tbody></table></div></div>'+
      '<div class="card"><div class="section-title">📊 Pengeluaran per Kategori</div><div class="chart-bar-wrap">'+katChart+'</div></div>'+
    '</div>'+
    '<div class="grid-2 summary-section">'+
      '<div class="card"><div class="section-title">📥 Pemasukan</div>'+
        '<div class="desktop-only table-wrap"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Wadah</th><th>Jumlah</th></tr></thead><tbody>'+txRows(masukList)+'</tbody>'+(masukList.length?'<tfoot><tr style="font-weight:700;background:var(--bg)"><td colspan="3">Total</td><td>'+formatRupiah(totalMasuk)+'</td></tr></tfoot>':'')+'</table></div>'+
        '<div class="mobile-only">'+txCards(masukList,true)+(masukList.length?'<div style="border-top:2px solid var(--border);margin-top:8px;padding-top:8px;font-weight:700;display:flex;justify-content:space-between"><span>Total</span><span style="color:var(--success)">'+formatRupiah(totalMasuk)+'</span></div>':'')+'</div>'+
      '</div>'+
      '<div class="card"><div class="section-title">📤 Pengeluaran</div>'+
        '<div class="desktop-only table-wrap"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Wadah</th><th>Jumlah</th></tr></thead><tbody>'+txRows(keluarList)+'</tbody>'+(keluarList.length?'<tfoot><tr style="font-weight:700;background:var(--bg)"><td colspan="3">Total</td><td>'+formatRupiah(totalKeluar)+'</td></tr></tfoot>':'')+'</table></div>'+
        '<div class="mobile-only">'+txCards(keluarList,false)+(keluarList.length?'<div style="border-top:2px solid var(--border);margin-top:8px;padding-top:8px;font-weight:700;display:flex;justify-content:space-between"><span>Total</span><span style="color:var(--danger)">'+formatRupiah(totalKeluar)+'</span></div>':'')+'</div>'+
      '</div>'+
    '</div>'+
    '<div class="grid-2 summary-section">'+
      '<div class="card"><div class="section-title">🔴 Hutangku Bulan Ini</div>'+
        '<div class="desktop-only table-wrap"><table><thead><tr><th>Tanggal</th><th>Nama</th><th>Wadah</th><th>Jumlah</th></tr></thead><tbody>'+hpRows(hutangBulan)+'</tbody>'+(hutangBulan.length?'<tfoot><tr style="font-weight:700;background:var(--bg)"><td colspan="3">Total</td><td>'+formatRupiah(totalHutang)+'</td></tr></tfoot>':'')+'</table></div>'+
        '<div class="mobile-only">'+hpCards(hutangBulan,true)+(hutangBulan.length?'<div style="border-top:2px solid var(--border);margin-top:8px;padding-top:8px;font-weight:700;display:flex;justify-content:space-between"><span>Total</span><span style="color:var(--danger)">'+formatRupiah(totalHutang)+'</span></div>':'')+'</div>'+
      '</div>'+
      '<div class="card"><div class="section-title">🟢 Piutangku Bulan Ini</div>'+
        '<div class="desktop-only table-wrap"><table><thead><tr><th>Tanggal</th><th>Nama</th><th>Wadah</th><th>Jumlah</th></tr></thead><tbody>'+hpRows(piutangBulan)+'</tbody>'+(piutangBulan.length?'<tfoot><tr style="font-weight:700;background:var(--bg)"><td colspan="3">Total</td><td>'+formatRupiah(totalPiutang)+'</td></tr></tfoot>':'')+'</table></div>'+
        '<div class="mobile-only">'+hpCards(piutangBulan,false)+(piutangBulan.length?'<div style="border-top:2px solid var(--border);margin-top:8px;padding-top:8px;font-weight:700;display:flex;justify-content:space-between"><span>Total</span><span style="color:var(--success)">'+formatRupiah(totalPiutang)+'</span></div>':'')+'</div>'+
      '</div>'+
    '</div>';
}

// ===== BACKUP & RESTORE =====
function showBackup() {
  openModal('💾 Backup & Restore',
    '<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px">Download data sebagai file JSON, atau upload file backup sebelumnya.</p>'+
    '<div style="display:flex;flex-direction:column;gap:10px">'+
      '<button class="btn btn-primary" onclick="downloadBackup()">⬇️ Download Backup</button>'+
      '<div class="form-group" style="margin:0"><label>Upload Restore File</label><input type="file" id="restore-file" accept=".json" style="padding:6px"/></div>'+
      '<button class="btn btn-warning" onclick="doRestore()">⬆️ Restore dari File</button>'+
    '</div>'
  );
}
function downloadBackup() {
  var data=JSON.stringify(state, null, 2);
  var blob=new Blob([data],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url; a.download='tabunganku_backup_'+currentDate()+'.json'; a.click();
  URL.revokeObjectURL(url);
}
function doRestore() {
  var file=document.getElementById('restore-file').files[0];
  if(!file){ alert('Pilih file backup dulu!'); return; }
  var reader=new FileReader();
  reader.onload=function(e){
    try {
      var data=JSON.parse(e.target.result);
      if(!data.wadah||!data.transaksi){ alert('File tidak valid!'); return; }
      if(!confirm('Data saat ini akan DIGANTI dengan data backup. Lanjutkan?')) return;
      state=data; saveData(); closeModal(); renderPage(currentPage);
      alert('Restore berhasil!');
    } catch(err) { alert('File tidak valid atau rusak!'); }
  };
  reader.readAsText(file);
}

// ===== INIT =====
renderPage('dashboard');
