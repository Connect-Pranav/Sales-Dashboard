// ═══════════════════════════════════════════════════
// BOMMASANDARA PERFORMANCE TRACKER — app.js
// ES5 ONLY — no Object.entries, no arrow functions
// ═══════════════════════════════════════════════════
var SHEET_CSV_URL = "YOUR_GOOGLE_SHEET_CSV_URL_HERE";

var COL = {EMP:0,MGR:1,DOJ:2,DAYS:3,BKT:4,TAPR:5,AAPR:6,MPCT:7,
  JTGT:8,JACH:9,JPCT:10,
  AW1:11,AW2:12,AW3:13,AW4:14,AW5:15,
  MW1:16,MW2:17,MW3:18,MW4:19,
  JW1:20,JW2:21,JW3:22,JW4:23};

var MGR_DONUTS = ["Annesh","Mohan","Arun","Manoj C Y"];
var MGRS_ALL   = ["Annesh","Mohan","Arun","Manoj C Y","Pranav"];
var PC = ["#819dcc","#95b7d0","#b8e1d3","#d6eadf","#eac3d5"];
var MEDALS = ["🥇","🥈","🥉"];

var EX = [];
var LMAP = null;
var CIRCLES = [];
var LABELS = [];
var CVIEW = 'data';
var DCHARTS = {};
var MDC_CHARTS = {};
var HM_OVERRIDES = {};
var CELL_CTX = null;
var CUR_MONTH = "Jun";

// ── BOOT ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
  loadLogo();
  loadHmOverrides();
  loadData();
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.mdrop-wrap')) {
      var d = document.getElementById('mDrop');
      if (d) d.style.display = 'none';
    }
    if (!e.target.closest('.sbox')) {
      var sd = document.getElementById('searchDrop');
      if (sd) sd.style.display = 'none';
    }
  });
});

// ── LOGO ─────────────────────────────────────────────────────
function uploadLogo(e) {
  var f = e.target.files[0];
  if (!f) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var u = ev.target.result;
    applyLogo(u);
    try { localStorage.setItem('blogo', u); } catch(err) {
      // If too large, compress to 150x150
      try {
        var canvas = document.createElement('canvas');
        var imgEl = new Image();
        imgEl.onload = function() {
          canvas.width = 150; canvas.height = 150;
          canvas.getContext('2d').drawImage(imgEl, 0, 0, 150, 150);
          var small = canvas.toDataURL('image/jpeg', 0.7);
          localStorage.setItem('blogo', small);
          applyLogo(small);
        };
        imgEl.src = u;
      } catch(e2) {}
    }
    // Clear so same file can be re-selected
    e.target.value = '';
  };
  reader.readAsDataURL(f);
}

function applyLogo(u) {
  var img = document.getElementById('lionImg');
  var fb  = document.getElementById('lionFb');
  if (img) {
    img.src = u;
    img.style.cssText = 'display:block;width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid #f8c04f;box-shadow:0 0 16px rgba(248,192,79,0.5)';
  }
  if (fb) fb.style.display = 'none';
}

function loadLogo() {
  try {
    var u = localStorage.getItem('blogo');
    if (u && u.length > 10) applyLogo(u);
  } catch(e) {}
}

// ── NAV ──────────────────────────────────────────────────────
function navTo(pg, el) {
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
  var nis = document.querySelectorAll('.ni');
  for (var i = 0; i < nis.length; i++) nis[i].classList.remove('active');
  var pgEl = document.getElementById('pg-' + pg);
  if (pgEl) pgEl.classList.add('active');
  if (el) el.classList.add('active');
  var titles = {dashboard:"Dashboard",managers:"Manager Performance",
    leaderboard:"Leaderboard",heatmap:"Weekly Heatmap",summary:"BI Summary"};
  var ttl = document.getElementById('pageTitle');
  if (ttl) ttl.textContent = titles[pg] || pg;
  if (pg === 'dashboard' && LMAP) {
    setTimeout(function() { LMAP.invalidateSize(); }, 200);
  }
  if (pg === 'heatmap') renderHeatmap();
  if (pg === 'summary') renderBI();
  if (pg === 'managers') renderManagersPage();
  if (pg === 'leaderboard') renderLeaderboard();
}

// ── MONTH DROPDOWN ────────────────────────────────────────────
function toggleMDrop() {
  var d = document.getElementById('mDrop');
  if (!d) return;
  d.style.display = (d.style.display === 'block') ? 'none' : 'block';
}
function setMonth(m, el) {
  CUR_MONTH = m;
  var labels = {Apr:"April 2026",May:"May 2026",Jun:"June 2026",Jul:"July 2026"};
  var btn = document.getElementById('mBtn');
  if (btn) btn.textContent = (labels[m] || m) + ' ▾';
  var items = document.querySelectorAll('#mDrop div');
  for (var i = 0; i < items.length; i++) items[i].classList.remove('sel');
  if (el) el.classList.add('sel');
  var d = document.getElementById('mDrop');
  if (d) d.style.display = 'none';
  renderAll();
}

// ── SEARCH ───────────────────────────────────────────────────
function doSearch(q) {
  var drop = document.getElementById('searchDrop');
  if (!drop) return;
  if (!q || q.length < 1) { drop.style.display = 'none'; return; }
  q = q.toLowerCase();
  var matches = [];
  for (var i = 0; i < EX.length; i++) {
    if (EX[i].name.toLowerCase().indexOf(q) >= 0 || EX[i].mgr.toLowerCase().indexOf(q) >= 0) {
      matches.push(EX[i]);
      if (matches.length >= 8) break;
    }
  }
  if (!matches.length) { drop.style.display = 'none'; return; }
  var html = '';
  for (var i = 0; i < matches.length; i++) {
    var e = matches[i];
    var pc = e.jpct >= 80 ? '#1a9e5c' : e.jpct >= 50 ? '#d97706' : '#e53e3e';
    var ZC = {Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
    var zc = ZC[e.zf] || '#8892a4';
    html += '<div class="sdrop-item" onclick="openSearchDetail(\'' + e.name.replace(/'/g,"\\'") + '\')">'
      + '<div class="sdrop-name">' + e.name + ' <span style="font-size:10px;color:' + zc + ';font-weight:800">' + (e.zf||'') + '</span></div>'
      + '<div class="sdrop-sub">' + e.mgr + ' · <span style="color:' + pc + ';font-weight:700">' + e.jpct.toFixed(0) + '% Jun</span> · ' + e.jach + '/' + e.jtgt + '</div>'
      + '</div>';
  }
  drop.innerHTML = html;
  drop.style.display = 'block';
}

function openSearchDetail(name) {
  var e = null;
  for (var i = 0; i < EX.length; i++) { if (EX[i].name === name) { e = EX[i]; break; } }
  if (!e) return;
  var sd = document.getElementById('searchDrop');
  if (sd) sd.style.display = 'none';
  var si = document.getElementById('searchInput');
  if (si) si.value = '';
  var pc = e.jpct >= 80 ? '#1a9e5c' : e.jpct >= 50 ? '#d97706' : '#e53e3e';
  var ZC = {Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
  var zc = ZC[e.zf] || '#8892a4';
  var wLabels = ['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
  var origWv = [e.mw[3]].concat(e.jw);
  var wv = [];
  for (var i = 0; i < origWv.length; i++) wv.push(getHmVal(e.name, i, origWv[i]));
  var whtml = '';
  for (var i = 0; i < wLabels.length; i++) {
    var v = wv[i];
    whtml += '<div style="text-align:center;padding:6px;background:' + (v>0?'rgba(26,158,92,.1)':'rgba(229,62,62,.06)') + ';border-radius:6px">'
      + '<div style="font-size:8px;color:var(--t3)">' + wLabels[i] + '</div>'
      + '<div style="font-size:16px;font-weight:900;color:' + (v>0?'#1a9e5c':'#e53e3e') + '">' + (v>0?v:'✗') + '</div></div>';
  }
  setHTML('searchPopBody',
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
    + '<div style="width:44px;height:44px;border-radius:50%;background:' + pc + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:900">' + e.name[0] + '</div>'
    + '<div><div style="font-family:Syne,sans-serif;font-size:16px;font-weight:800">' + e.name + '</div>'
    + '<div style="font-size:11px;color:var(--t3)">Manager: ' + e.mgr + '</div></div>'
    + '<div style="margin-left:auto;text-align:right"><div style="font-family:Syne,sans-serif;font-size:20px;font-weight:800;color:' + pc + '">' + e.jpct.toFixed(0) + '%</div>'
    + '<div style="font-size:10px;color:var(--t3)">' + e.jach + '/' + e.jtgt + '</div></div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:14px">' + whtml + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<div style="background:rgba(129,157,204,.1);padding:6px 10px;border-radius:7px;font-size:11px"><b>Z Status:</b> <span style="color:' + zc + ';font-weight:800">' + (e.zf||'OK') + '</span></div>'
    + '<div style="background:rgba(129,157,204,.1);padding:6px 10px;border-radius:7px;font-size:11px"><b>Streak:</b> ' + e.streak + 'w</div>'
    + '<div style="background:rgba(129,157,204,.1);padding:6px 10px;border-radius:7px;font-size:11px"><b>Recoveries:</b> ' + e.rec + '</div>'
    + '<div style="background:rgba(129,157,204,.1);padding:6px 10px;border-radius:7px;font-size:11px"><b>Score:</b> ' + e.score + '</div>'
    + '</div>'
  );
  var spt = document.getElementById('searchPopTitle');
  if (spt) spt.textContent = e.name + ' — Detail';
  openPop('searchPop');
}

// ── DATA LOAD ─────────────────────────────────────────────────
function loadData() {
  setText('syncLbl', 'Syncing…');
  if (!SHEET_CSV_URL || SHEET_CSV_URL.indexOf('YOUR_GOOGLE') >= 0) {
    loadDemo(); return;
  }
  fetch(SHEET_CSV_URL + '&t=' + Date.now())
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(function(csv) { buildExecs(parseCSV(csv), 2); renderAll(); setText('syncLbl', 'Synced ' + new Date().toLocaleTimeString('en-IN')); })
    .catch(function(err) { console.warn('Sheet failed:', err.message); loadDemo(); });
}

function parseCSV(txt) {
  var rows = [];
  var lines = txt.trim().split('\n');
  for (var li = 0; li < lines.length; li++) {
    var cells = [], cur = '', q = false;
    var line = lines[li];
    for (var ci = 0; ci < line.length; ci++) {
      if (line[ci] === '"') { q = !q; continue; }
      if (line[ci] === ',' && !q) { cells.push(cur.trim()); cur = ''; continue; }
      cur += line[ci];
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

// ── BUILD EXECUTIVES ──────────────────────────────────────────
function buildExecs(rows, startRow) {
  EX = [];
  var sr = (startRow !== undefined) ? startRow : 2;
  var day = new Date().getDate(), mo = new Date().getMonth(), ja = 0;
  if (mo >= 5) { if (day>=1) ja=1; if (day>=8) ja=2; if (day>=15) ja=3; if (day>=22) ja=4; }

  for (var r = sr; r < rows.length; r++) {
    var row = rows[r];
    var name = (row[COL.EMP] || '').trim();
    if (!name || !isNaN(Number(name))) continue;
    var mgr  = (row[COL.MGR] || '').trim();
    var jtgt = Number(row[COL.JTGT]) || 0;
    var jach = Number(row[COL.JACH]) || 0;
    var jpct = jtgt > 0 ? (jach / jtgt) * 100 : 0;
    var mw = [], jw = [], aw = [];
    var mwCols = [COL.MW1,COL.MW2,COL.MW3,COL.MW4];
    var jwCols = [COL.JW1,COL.JW2,COL.JW3,COL.JW4];
    var awCols = [COL.AW1,COL.AW2,COL.AW3,COL.AW4,COL.AW5];
    for (var i=0;i<mwCols.length;i++) mw.push(Number(row[mwCols[i]])||0);
    for (var i=0;i<jwCols.length;i++) jw.push(Number(row[jwCols[i]])||0);
    for (var i=0;i<awCols.length;i++) aw.push(Number(row[awCols[i]])||0);
    var mayTotal = 0; for (var i=0;i<mw.length;i++) mayTotal+=mw[i];
    var zv = [mw[3]]; for (var i=0;i<ja;i++) zv.push(jw[i]);
    var zf = calcZ(zv), streak = calcStreak(zv), trend = calcTrend(zv);
    var rec = calcRec(zv), risk = calcRisk(jpct,zf), score = calcScore(jpct,rec,zv,streak);
    EX.push({name:name,mgr:mgr,jtgt:jtgt,jach:jach,jpct:jpct,
             aw:aw,mw:mw,jw:jw,zv:zv,ja:ja,
             zf:zf,streak:streak,trend:trend,rec:rec,risk:risk,score:score,mayTotal:mayTotal});
  }
}

// ── Z LOGIC ──────────────────────────────────────────────────
function calcZ(v) {
  if (v.length < 2) return null;
  if (v[v.length-2] === 0 && v[v.length-1] > 0) return 'RECOVERY';
  var z = 0;
  for (var i = v.length-1; i >= 0; i--) { if (v[i]===0) z++; else break; }
  return z>=4?'Z4':z>=3?'Z3':z>=2?'Z2':z===0?'OK':null;
}
function calcStreak(v) { var s=0; for(var i=v.length-1;i>=0;i--){if(v[i]>0)s++;else break;} return s; }
function calcTrend(v)  { if(v.length<2)return'→'; return v[v.length-1]>v[v.length-2]?'▲':v[v.length-1]<v[v.length-2]?'▼':'→'; }
function calcRec(v)    { var c=0; for(var i=1;i<v.length;i++) if(v[i-1]===0&&v[i]>0) c++; return c; }
function calcRisk(p,z) { if(z==='Z3'||z==='Z4') return 'CRITICAL'; return p>=80?'GREEN':p>=50?'AMBER':'RED'; }
function calcScore(p,r,v,s) {
  var nz=0; for(var i=0;i<v.length;i++) if(v[i]>0) nz++;
  var cons = v.length ? (nz/v.length)*100 : 0;
  return Math.round(Math.min(p,100)*0.4 + cons*0.2 + Math.min(r*33,100)*0.2 + Math.min(s*25,100)*0.2);
}

// ── RENDER ALL ────────────────────────────────────────────────
function renderAll() {
  if (!EX || EX.length === 0) { console.warn('No exec data'); return; }
  renderKPIs();
  renderMgrDonuts();
  initMap();
  renderExecTable();
  renderDonuts();
  renderManagersPage();
  renderLeaderboard();
  renderHeatmap();
}

// ── KPIs ─────────────────────────────────────────────────────
function renderKPIs() {
  var tgt=0, ach=0, zc=0;
  for (var i=0; i<EX.length; i++) {
    tgt += EX[i].jtgt; ach += EX[i].jach;
    if (EX[i].zf==='Z2'||EX[i].zf==='Z3'||EX[i].zf==='Z4') zc++;
  }
  var pct = tgt>0 ? ((ach/tgt)*100).toFixed(1) : '0.0';

  // Leakage from HM_OVERRIDES
  var totalLeakage = 0;
  for (var i=0; i<EX.length; i++) {
    var lk = HM_OVERRIDES[EX[i].name+'_leak'];
    if (lk) totalLeakage += Number(lk)||0;
  }

  // COCA
  var totalCost = (40000*EX.length) + (50000*MGRS_ALL.length) + 100000 + 500000 + 100000;
  var cocaTxt = ach===0 ? 'No sales' : (totalCost/ach >= 1000 ? '₹'+Math.round(totalCost/ach/1000)+'K' : '₹'+Math.round(totalCost/ach));
  var idealNeeded = Math.ceil(totalCost/19000);

  setText('k-team',  EX.length);       setText('k-ts',    'Bommasandara Branch');
  setText('k-ach',   ach+'/'+tgt);     setText('k-as',    pct+'% achievement');
  setText('k-z',     zc);              setText('k-zs',    zc>0?'Click to view':'All clear ✓');
  setText('k-coca',  cocaTxt);         setText('k-coca-s','Ideal ₹19K · need '+idealNeeded+' sales');
  setText('k-leak',  totalLeakage>0?totalLeakage:'0');
  setText('k-lks',   totalLeakage>0?(totalLeakage+' cancelled sales'):'No cancellations ✓');
}

function calcCOCA() {
  var totalCost = (40000*EX.length) + (50000*MGRS_ALL.length) + 100000 + 500000 + 100000;
  var ach=0; for(var i=0;i<EX.length;i++) ach+=EX[i].jach;
  var coca = ach>0 ? Math.round(totalCost/ach) : 0;
  var txt = ach===0 ? 'No sales' : (coca>=1000 ? '₹'+Math.round(coca/1000)+'K' : '₹'+coca);
  setText('k-coca', txt);
}

// ── MANAGER DONUTS ────────────────────────────────────────────
function renderMgrDonuts() {
  var map = mgrMap();
  var row = document.getElementById('mgrDonuts');
  if (!row) return;
  var keys = Object.keys(MDC_CHARTS);
  for (var i=0; i<keys.length; i++) { if (MDC_CHARTS[keys[i]]) MDC_CHARTS[keys[i]].destroy(); }
  MDC_CHARTS = {};
  row.innerHTML = '';

  for (var idx=0; idx<MGR_DONUTS.length; idx++) {
    var name = MGR_DONUTS[idx];
    var m = map[name];
    if (!m || m.size === 0) continue;
    var pct = m.tgt > 0 ? (m.ach/m.tgt)*100 : 0;
    var c   = PC[idx % PC.length];
    var pc  = pct>=80?'#1a9e5c':pct>=50?'#d97706':'#e53e3e';
    var za  = m.z4>0?'<span class="mdc-z" style="background:rgba(185,28,28,.1);color:#b91c1c;border-color:#b91c1c">Z4:'+m.z4+'</span>'
            : m.z3>0?'<span class="mdc-z" style="background:rgba(229,62,62,.1);color:#e53e3e;border-color:#e53e3e">Z3:'+m.z3+'</span>'
            : m.z2>0?'<span class="mdc-z" style="background:rgba(217,119,6,.1);color:#d97706;border-color:#d97706">Z2:'+m.z2+'</span>'
            :'<span class="mdc-z" style="background:rgba(26,158,92,.1);color:#1a9e5c;border-color:#1a9e5c">✓ OK</span>';
    var cid = 'mdc_' + name.replace(/[^a-zA-Z0-9]/g,'_');

    var div = document.createElement('div');
    div.className = 'mdc';
    div.innerHTML = '<div style="position:absolute;top:0;left:0;right:0;height:3px;background:'+c+'"></div>'
      + '<div class="mdc-name">'+name+'</div>'
      + '<div class="mdc-wrap"><canvas id="'+cid+'" width="60" height="60"></canvas>'
      + '<div class="mdc-pct" style="color:'+pc+'">'+pct.toFixed(0)+'%</div></div>'
      + '<div class="mdc-st"><span>T<b>'+m.size+'</b></span><span>Ach<b>'+m.ach+'</b></span></div>'
      + za;

    (function(n){ div.onclick = function(){ openMgrPop(n); }; })(name);
    row.appendChild(div);

    (function(chartId, pctVal, color){
      setTimeout(function(){
        var ctx = document.getElementById(chartId);
        if (!ctx) return;
        MDC_CHARTS[chartId] = new Chart(ctx, {
          type:'doughnut',
          data:{ datasets:[{ data:[Math.min(pctVal,100), Math.max(0,100-pctVal)],
            backgroundColor:[color,'rgba(0,0,0,0.07)'], borderWidth:0, cutout:'72%' }] },
          options:{ responsive:false, plugins:{ legend:{display:false}, tooltip:{enabled:false} } }
        });
      }, 80);
    })(cid, pct, c);
  }
}

// ── POPUPS ───────────────────────────────────────────────────
function openZPop() {
  var list = [];
  for (var i=0; i<EX.length; i++) {
    if (EX[i].zf==='Z2'||EX[i].zf==='Z3'||EX[i].zf==='Z4') list.push(EX[i]);
  }
  list.sort(function(a,b){ var o={Z4:0,Z3:1,Z2:2}; return (o[a.zf]||9)-(o[b.zf]||9); });
  var ZC={Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706'};
  var act={Z4:'🚨 Escalate to BM immediately',Z3:'⚠ Manager Review + PIP',Z2:'📋 Immediate 1:1 coaching'};
  var html = '';
  if (!list.length) {
    html = '<div style="text-align:center;padding:30px;color:#1a9e5c;font-size:15px;font-weight:800">✅ No Z escalations — Team performing!</div>';
  } else {
    for (var i=0; i<list.length; i++) {
      var e=list[i], c=ZC[e.zf]||'#8892a4';
      html += '<div class="z-pop-row '+e.zf.toLowerCase()+'">'
        +'<div><div class="zpn">'+e.name+'</div><div class="zpm">Manager: '+e.mgr+' · '+e.jpct.toFixed(0)+'% Jun</div>'
        +'<div style="font-size:10px;color:var(--t3);margin-top:3px">'+(act[e.zf]||'')+'</div></div>'
        +'<span class="zpbdg" style="color:'+c+';border:1.5px solid '+c+'">'+e.zf+'</span>'
        +'</div>';
    }
  }
  setHTML('zPopBody', html);
  openPop('zPop');
}

function openMgrPop(name) {
  var map = mgrMap();
  var m = map[name];
  if (!m) return;
  var execs = [];
  for (var i=0; i<EX.length; i++) {
    if (EX[i].mgr===name || EX[i].mgr.toLowerCase()===name.toLowerCase()) execs.push(EX[i]);
  }
  execs.sort(function(a,b){ return b.jpct-a.jpct; });
  var pct = m.tgt>0 ? (m.ach/m.tgt)*100 : 0;
  var pc  = pct>=80?'#1a9e5c':pct>=50?'#d97706':'#e53e3e';
  var pps = m.size>0 ? (m.ach/m.size).toFixed(1) : 0;
  var summary = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">'
    +'<div style="background:var(--p1l);padding:8px 14px;border-radius:8px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">Team</div><div style="font-size:18px;font-weight:900;font-family:Syne,sans-serif;color:var(--p1)">'+m.size+'</div></div>'
    +'<div style="background:var(--p2l);padding:8px 14px;border-radius:8px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">Jun Ach%</div><div style="font-size:18px;font-weight:900;font-family:Syne,sans-serif;color:'+pc+'">'+pct.toFixed(0)+'%</div></div>'
    +'<div style="background:var(--p3l);padding:8px 14px;border-radius:8px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">PPS</div><div style="font-size:18px;font-weight:900;font-family:Syne,sans-serif;color:#5aaa8a">'+pps+'</div><div style="font-size:8px;color:var(--t3)">Per Person Sale</div></div>'
    +'<div style="background:var(--p5l);padding:8px 14px;border-radius:8px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">Z Flags</div><div style="font-size:18px;font-weight:900;font-family:Syne,sans-serif;color:#e53e3e">'+(m.z2+m.z3+m.z4)+'</div></div>'
    +'<div style="background:var(--p4l);padding:8px 14px;border-radius:8px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">Recoveries</div><div style="font-size:18px;font-weight:900;font-family:Syne,sans-serif;color:#1a9e5c">'+m.rec+'</div></div>'
    +'</div>';
  var ZC={Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
  var rows = '';
  for (var i=0; i<execs.length; i++) {
    var e=execs[i], xpc=e.jpct>=80?'#1a9e5c':e.jpct>=50?'#d97706':'#e53e3e', xzc=ZC[e.zf]||'#8892a4';
    rows += '<div class="mpr"><div><div class="mpn">'+(i<3?MEDALS[i]+' ':'')+e.name+'</div>'
      +'<div class="mpm">'+e.jach+'/'+e.jtgt+' · Z: <span style="color:'+xzc+';font-weight:800">'+(e.zf||'OK')+'</span> · May: '+e.mayTotal+'</div></div>'
      +'<div class="mpp" style="color:'+xpc+'">'+e.jpct.toFixed(0)+'%</div></div>';
  }
  setHTML('mgrPopBody', summary+rows);
  var mpt = document.getElementById('mgrPopTitle');
  if (mpt) mpt.textContent = name + ' — Team (' + execs.length + ' executives)';
  openPop('mgrPop');
}

function openLeakPop() {
  var leakList = [], total = 0;
  for (var i=0; i<EX.length; i++) {
    var lv = HM_OVERRIDES[EX[i].name+'_leak'];
    var lvn = lv ? Number(lv) : 0;
    if (lvn > 0) { total += lvn; leakList.push({name:EX[i].name, mgr:EX[i].mgr, val:lvn}); }
  }
  leakList.sort(function(a,b){ return b.val-a.val; });
  var html = '<div style="text-align:center;margin-bottom:16px;padding:16px;background:var(--p5l);border-radius:10px">'
    +'<div style="font-family:Syne,sans-serif;font-size:42px;font-weight:900;color:'+(total>0?'#e53e3e':'#1a9e5c')+'">'+total+'</div>'
    +'<div style="font-size:12px;color:var(--t3)">Total Cancelled Sales this Month</div>'
    +'<div style="font-size:11px;color:var(--t2);margin-top:6px">'
    +(total===0?'✅ Zero leakage — No cancelled sales recorded!':'⚠ '+total+' sales cancelled. Review with managers.')
    +'</div></div>'
    +(leakList.length===0
      ? '<div style="text-align:center;padding:16px;color:#1a9e5c;font-weight:700;background:var(--p3l);border-radius:8px">✅ Update in Heatmap tab → Leakage column</div>'
      : leakList.map(function(x){ return '<div class="lp-row"><span class="lp-name">'+x.name+'</span><span style="color:var(--t3);font-size:11px">'+x.mgr+'</span><span class="lp-val" style="color:#e53e3e;font-size:14px;font-weight:900">'+x.val+' cancelled</span></div>'; }).join(''))
    +'<div style="margin-top:12px;padding:10px;background:var(--p1l);border-radius:8px;font-size:11px;color:var(--t2)">💡 <b>How to update:</b> Go to Heatmap tab → click Leakage column for any executive → enter cancelled count</div>';
  setHTML('leakPopBody', html);
  openPop('leakPop');
}

// ── MAP ───────────────────────────────────────────────────────
var AREAS = [
  {p:560076,n:"Bannerghatta Rd",lat:12.8729,lng:77.5972,td:7093,ps:193,ga:5040,s6:52,cv:0.73,mp:6.01},
  {p:560081,n:"Chandapura",lat:12.8161,lng:77.6701,td:163,ps:7,ga:125,s6:2,cv:1.23,mp:12.27},
  {p:560083,n:"Bannerghatta",lat:12.8616,lng:77.5752,td:2185,ps:105,ga:1660,s6:34,cv:1.56,mp:8.6},
  {p:560099,n:"Bommasandra",lat:12.8144,lng:77.681,td:3815,ps:169,ga:2929,s6:66,cv:1.73,mp:16.17},
  {p:560100,n:"Electronics City",lat:12.8399,lng:77.6769,td:5438,ps:139,ga:3648,s6:42,cv:0.77,mp:9.29},
  {p:560102,n:"HSR Layout",lat:12.9116,lng:77.6389,td:4890,ps:89,ga:3739,s6:31,cv:0.63,mp:3.11},
  {p:560105,n:"Anekal",lat:12.7908,lng:77.6962,td:2191,ps:117,ga:1722,s6:41,cv:1.87,mp:13.74},
  {p:560108,n:"Anjanapura",lat:12.8465,lng:77.5526,td:135,ps:9,ga:104,s6:1,cv:0.74,mp:9.63},
  {p:561229,n:"Ramanagra",lat:12.7167,lng:77.2833,td:20,ps:0,ga:9,s6:0,cv:0.0,mp:5.0},
  {p:562106,n:"Anekal II",lat:12.7762,lng:77.7201,td:1620,ps:51,ga:1327,s6:20,cv:1.23,mp:12.04},
  {p:562107,n:"Attible",lat:12.8074,lng:77.7563,td:1610,ps:57,ga:1283,s6:17,cv:1.06,mp:11.37},
  {p:562112,n:"Harohalli",lat:12.7108,lng:77.5558,td:591,ps:10,ga:513,s6:3,cv:0.51,mp:5.41},
  {p:562125,n:"Sarjapura",lat:12.8876,lng:77.7862,td:1762,ps:60,ga:1363,s6:27,cv:1.53,mp:11.24}
];

function getAV(a){ return CVIEW==='data'?a.td:CVIEW==='paid'?a.ps:a.cv*100; }
function getAL(a){ return CVIEW==='data'?a.td.toLocaleString():CVIEW==='paid'?a.ps:a.cv+'%'; }

function initMap() {
  if (LMAP) { drawCircles(); return; }
  var el = document.getElementById('dashMap');
  if (!el) { console.warn('dashMap element not found'); return; }
  // Force minimum height so Leaflet can initialize
  el.style.minHeight = '300px';
  LMAP = L.map('dashMap', {center:[12.83,77.62], zoom:10, zoomControl:true, attributionControl:false});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {subdomains:'abcd', maxZoom:19}).addTo(LMAP);
  drawCircles();
}

function drawCircles() {
  if (!LMAP) return;
  for (var i=0; i<CIRCLES.length; i++) LMAP.removeLayer(CIRCLES[i]);
  for (var i=0; i<LABELS.length; i++)  LMAP.removeLayer(LABELS[i]);
  CIRCLES = []; LABELS = [];
  var vals = [], maxV = 0;
  for (var i=0; i<AREAS.length; i++) { var v=getAV(AREAS[i]); vals.push(v); if(v>maxV) maxV=v; }
  if (maxV === 0) maxV = 1;

  for (var i=0; i<AREAS.length; i++) {
    var a=AREAS[i], v=vals[i], radius=9+(v/maxV)*36, color=PC[i%PC.length];
    var circle = L.circleMarker([a.lat,a.lng], {
      radius:radius, fillColor:color, color:'rgba(255,255,255,0.8)',
      weight:v>maxV*0.4?2.5:1.5, opacity:1, fillOpacity:v>maxV*0.4?0.88:0.70
    }).addTo(LMAP);

    (function(area, r) {
      circle.on('click', function() {
        L.popup({className:'bpop', maxWidth:240, closeButton:true})
          .setLatLng([area.lat, area.lng])
          .setContent('<div class="pin"><div class="pname">📍 '+area.n+'</div><div class="ppinc">'+area.p+'</div>'
            +'<div class="pgrid">'
            +'<div class="pi"><div class="pv">'+area.td.toLocaleString()+'</div><div class="pl">Total Data</div></div>'
            +'<div class="pi"><div class="pv" style="color:#c882a0">'+area.ps+'</div><div class="pl">Paid Sellers</div></div>'
            +'<div class="pi"><div class="pv" style="color:#5aaa8a">'+area.ga.toLocaleString()+'</div><div class="pl">GST Active</div></div>'
            +'<div class="pi"><div class="pv" style="color:#d97706">'+area.s6+'</div><div class="pl">Sales 6M</div></div>'
            +'</div><div class="pfoot">Conv: <b>'+area.cv+'%</b> | Meet: <b>'+area.mp+'%</b></div></div>')
          .openOn(LMAP);
      });
      circle.bindTooltip('<b style="font-size:12px;color:#1a1a2e">'+area.n+'</b><br><span style="font-size:11px;color:#4a5568">'+getAL(area)+'</span>',
        {direction:'top', offset:[0,-r]});
    })(a, radius);

    var lbl = L.divIcon({className:'',
      html:'<div style="background:'+color+';color:#1a1a2e;font-size:9px;font-weight:900;font-family:Nunito,sans-serif;padding:2px 4px;border-radius:3px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.2)">'+a.n+'</div>',
      iconAnchor:[-(radius+2), 8]});
    LABELS.push(L.marker([a.lat,a.lng], {icon:lbl, interactive:false}).addTo(LMAP));
    CIRCLES.push(circle);
  }
}

function setV(v, btn) {
  CVIEW = v;
  var btns = document.querySelectorAll('.mb');
  for (var i=0; i<btns.length; i++) btns[i].classList.remove('act');
  btn.classList.add('act');
  drawCircles();
}

// ── EXEC TABLE ────────────────────────────────────────────────
function renderExecTable() {
  if (!EX || EX.length === 0) { setHTML('execBody','<tr><td colspan="6" class="lding">No data</td></tr>'); return; }
  var sorted = EX.slice().sort(function(a,b){ return b.jpct-a.jpct; });
  var ZC  = {Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
  var ZBG = {Z4:'rgba(185,28,28,.1)',Z3:'rgba(229,62,62,.08)',Z2:'rgba(217,119,6,.08)',RECOVERY:'rgba(26,158,92,.08)',OK:'rgba(26,158,92,.06)'};
  var html = '';
  for (var i=0; i<sorted.length; i++) {
    var e=sorted[i];
    var pc=e.jpct>=80?'#1a9e5c':e.jpct>=50?'#d97706':'#e53e3e';
    var zc=ZC[e.zf]||'#8892a4', zb=ZBG[e.zf]||'transparent';
    html += '<tr style="cursor:pointer" onclick="openSearchDetail(\'' + e.name.replace(/'/g,"\\'") + '\')">'
      +'<td style="font-size:13px;width:24px">'+(i<3?MEDALS[i]:'<span style="color:#8892a4;font-weight:800;font-size:11px">'+(i+1)+'</span>')+'</td>'
      +'<td style="font-weight:'+(i<3?800:700)+'">'+e.name+'</td>'
      +'<td>'+e.mgr+'</td>'
      +'<td style="font-weight:800">'+e.jach+'/'+e.jtgt+'</td>'
      +'<td style="font-weight:800;color:'+pc+'">'+e.jpct.toFixed(0)+'%</td>'
      +'<td><span class="zch" style="background:'+zb+';color:'+zc+';border-color:'+zc+'">'+(e.zf||'—')+'</span></td>'
      +'</tr>';
  }
  setHTML('execBody', html);
}

// ── DONUTS (middle col) ───────────────────────────────────────
function renderDonuts() {
  var totTD=0, totPS=0, cvSum=0;
  for(var i=0;i<AREAS.length;i++){totTD+=AREAS[i].td;totPS+=AREAS[i].ps;cvSum+=AREAS[i].cv;}
  var avgCV = (cvSum/AREAS.length).toFixed(1);

  function mkD(id, vid, sid, data, cols, val, sub) {
    var ctx = document.getElementById(id); if(!ctx) return;
    if (DCHARTS[id]) DCHARTS[id].destroy();
    DCHARTS[id] = new Chart(ctx, {type:'doughnut',
      data:{datasets:[{data:data, backgroundColor:cols, borderWidth:0, cutout:'68%'}]},
      options:{responsive:false, plugins:{legend:{display:false}, tooltip:{enabled:false}}}});
    setText(vid, val); setText(sid, sub);
  }
  mkD('d1','dv1','ds1',[totPS,Math.max(0,totTD-totPS)],['#819dcc','rgba(129,157,204,.2)'],totTD.toLocaleString(),'Total data');
  mkD('d2','dv2','ds2',[totPS,Math.max(0,totTD-totPS)],['#b8e1d3','rgba(184,225,211,.2)'],totPS,'Paid sellers');
  mkD('d3','dv3','ds3',[parseFloat(avgCV),Math.max(0,5-parseFloat(avgCV))],['#eac3d5','rgba(234,195,213,.2)'],avgCV+'%','Avg conv%');
}

// ── MANAGERS PAGE ─────────────────────────────────────────────
function renderManagersPage() {
  var map = mgrMap();
  var html = '';
  for (var ni=0; ni<MGRS_ALL.length; ni++) {
    var nm = MGRS_ALL[ni];
    var m  = map[nm];
    if (!m || m.size === 0) continue;
    var pct = m.tgt>0 ? (m.ach/m.tgt)*100 : 0;
    var c   = PC[ni%PC.length];
    var pc  = pct>=80?'#1a9e5c':pct>=50?'#d97706':'#e53e3e';
    var pps = m.size>0 ? (m.ach/m.size).toFixed(2) : 0;
    var zeroM = 0;
    for(var i=0;i<EX.length;i++) if((EX[i].mgr===nm||EX[i].mgr.toLowerCase()===nm.toLowerCase())&&EX[i].jach===0) zeroM++;
    var leakM = m.size>0 ? Math.round((zeroM/m.size)*100) : 0;
    var strSum = 0; for(var i=0;i<m.streaks.length;i++) strSum+=m.streaks[i];
    var as = m.streaks.length ? (strSum/m.streaks.length).toFixed(1) : 0;
    html += '<div class="mc">'
      +'<div class="mct" style="background:linear-gradient(90deg,'+c+','+c+'88)"></div>'
      +'<div class="mch"><div>'
        +'<div class="mcn" onclick="openMgrPop(\''+nm.replace(/'/g,"\\'")+'\')" style="cursor:pointer;text-decoration:underline;text-decoration-style:dotted">'+nm+' ↗</div>'
        +'<div class="mcsz">'+m.size+' executives</div>'
      +'</div><div class="mcp" style="color:'+pc+'">'+pct.toFixed(0)+'%</div></div>'
      +'<div class="mcnote">Target: '+m.tgt+' → Achieved: '+m.ach+'</div>'
      +'<div class="mcbar"><div class="mcfill" style="width:'+Math.min(pct,100)+'%;background:'+c+'"></div></div>'
      +'<div class="mcst">'
        +'<div><div class="msv" style="color:'+c+'">'+m.size+'</div><div class="msl">Team</div></div>'
        +'<div><div class="msv" style="color:'+pc+'">'+pct.toFixed(0)+'%</div><div class="msl">Ach%</div></div>'
        +'<div><div class="msv" style="color:#5aaa8a">'+pps+'</div><div class="msl">PPS</div></div>'
        +'<div><div class="msv" style="color:'+(leakM>40?'#e53e3e':'#d97706')+'">'+leakM+'%</div><div class="msl">Leakage</div></div>'
      +'</div>'
      +'<div class="mczr">'
        +'<div class="mzcc" style="background:rgba(217,119,6,.1);color:#d97706">Z2: '+m.z2+'</div>'
        +'<div class="mzcc" style="background:rgba(229,62,62,.1);color:#e53e3e">Z3: '+m.z3+'</div>'
        +'<div class="mzcc" style="background:rgba(185,28,28,.1);color:#b91c1c">Z4: '+m.z4+'</div>'
        +'<div class="mzcc" style="background:rgba(26,158,92,.1);color:#1a9e5c">Rec: '+m.rec+'</div>'
        +'<div class="mzcc" style="background:rgba(129,157,204,.1);color:#819dcc">Str: '+as+'w</div>'
      +'</div></div>';
  }
  setHTML('mgrGrid', html);
}

// ── LEADERBOARD ───────────────────────────────────────────────
function renderLeaderboard() {
  var sorted = EX.slice().sort(function(a,b){ return b.jpct-a.jpct; });
  var ZC  = {Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
  var ZBG = {Z4:'rgba(185,28,28,.1)',Z3:'rgba(229,62,62,.08)',Z2:'rgba(217,119,6,.08)',RECOVERY:'rgba(26,158,92,.08)',OK:'rgba(26,158,92,.06)'};
  var html = '';
  for (var i=0; i<sorted.length; i++) {
    var e=sorted[i];
    var pc=e.jpct>=80?'pp-g':e.jpct>=50?'pp-a':'pp-r';
    var zc=ZC[e.zf]||'#8892a4', zb=ZBG[e.zf]||'transparent';
    var recIcon = e.rec>0 ? '<span style="color:#819dcc;font-weight:800">★×'+e.rec+'</span>' : '<span style="color:#8892a4">—</span>';
    html += '<tr>'
      +'<td>'+(i<3?MEDALS[i]:'<span style="color:#8892a4;font-weight:800">'+(i+1)+'</span>')+'</td>'
      +'<td style="font-weight:800">'+e.name+'</td>'
      +'<td style="color:#8892a4">'+e.mgr+'</td>'
      +'<td style="color:#8892a4">'+e.jtgt+'</td>'
      +'<td style="font-weight:800">'+e.jach+'</td>'
      +'<td><span class="pp '+pc+'">'+e.jpct.toFixed(1)+'%</span></td>'
      +'<td><span style="background:'+zb+';color:'+zc+';font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;border:1px solid '+zc+'">'+(e.zf||'OK')+'</span></td>'
      +'<td style="font-weight:700;color:#819dcc">'+e.mayTotal+'</td>'
      +'<td>'+recIcon+'</td>'
      +'</tr>';
  }
  setHTML('lbBody', html);
}

// ── HEATMAP ───────────────────────────────────────────────────
function getHmVal(name, wi, orig) {
  var key = name+'_'+wi;
  return HM_OVERRIDES.hasOwnProperty(key) ? HM_OVERRIDES[key] : orig;
}
function saveHmOverrides() { try{localStorage.setItem('hm_ov',JSON.stringify(HM_OVERRIDES));}catch(e){} }
function loadHmOverrides() { try{var s=localStorage.getItem('hm_ov');if(s) HM_OVERRIDES=JSON.parse(s);}catch(e){} }

function renderHeatmap() {
  var sorted = EX.slice().sort(function(a,b){ return b.jpct-a.jpct; });
  var day=new Date().getDate(),mo=new Date().getMonth(),ja=0;
  if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  var wh=['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
  var hdr='<tr><th style="text-align:left">Executive</th><th style="text-align:left">Mgr</th>'
    +wh.map(function(h,i){return'<th class="'+(i===1?'hsep':'')+'">'+h+'</th>';}).join('')
    +'<th>Ach</th><th>Tgt</th><th>%</th><th>Z</th>'
    +'<th style="color:#e53e3e;border-left:2px solid rgba(229,62,62,.2)">Leakage<br><span style="font-size:7px;font-weight:400;color:#8892a4">click to edit</span></th>'
    +'<th>Status</th></tr>';

  var rows = '';
  for (var ri=0; ri<sorted.length; ri++) {
    var e = sorted[ri];
    var origWv = [e.mw[3]].concat(e.jw);
    var wv = [];
    for (var wi=0; wi<origWv.length; wi++) wv.push(getHmVal(e.name, wi, origWv[wi]));
    var isRecovery = false;
    for (var wi=1; wi<wv.length; wi++) if(wv[wi-1]===0&&wv[wi]>0){isRecovery=true;break;}
    var wc = '';
    for (var wi=0; wi<wv.length; wi++) {
      var v=wv[wi], f=wi>0&&(wi-1)>=ja;
      var cls = f?'hf': v>0?(wi>0&&wv[wi-1]===0?'hr':'hs'):'hz';
      var display = f?'▪': v>0?v:'✗';
      wc += '<td class="'+cls+(wi===1?' hsep':'')+' hm-cell" '
        +'data-name="'+e.name+'" data-wi="'+wi+'" data-orig="'+(f?-1:v)+'" '
        +'title="Click to edit">'
        +display+'</td>';
    }
    var pc=e.jpct>=80?'#1a9e5c':e.jpct>=50?'#d97706':'#e53e3e';
    var ZC={Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
    var zc=ZC[e.zf]||'#8892a4';
    var statusIcon = isRecovery
      ? '<span style="color:#819dcc;font-weight:800">★ Recovery</span>'
      : (e.zf&&e.zf!=='OK'&&e.zf!=='RECOVERY'?'<span style="color:'+zc+';font-weight:800">'+e.zf+'</span>':'<span style="color:#1a9e5c">✓ OK</span>');
    var leakVal = HM_OVERRIDES[e.name+'_leak'] ? Number(HM_OVERRIDES[e.name+'_leak']) : 0;
    var leakCell = '<td class="hm-cell hm-leak" '
      +'data-name="'+e.name+'" '
      +'style="border-left:2px solid rgba(229,62,62,.2);font-weight:800;cursor:pointer;'
      +(leakVal>0?'background:rgba(229,62,62,.1);color:#e53e3e;':'color:#8892a4;')+'" '
      +'title="Click to enter cancelled sales">'+(leakVal>0?leakVal:'—')+'</td>';
    rows += '<tr><td class="hn">'+e.name+'</td><td class="hm2">'+e.mgr+'</td>'
      +wc+'<td style="font-weight:800">'+e.jach+'</td><td style="color:#8892a4">'+e.jtgt+'</td>'
      +'<td style="font-weight:800;color:'+pc+'">'+e.jpct.toFixed(0)+'%</td>'
      +'<td style="font-weight:800;color:'+zc+'">'+(e.zf||'—')+'</td>'
      +leakCell+'<td>'+statusIcon+'</td></tr>';
  }
  setHTML('hmWrap', '<table class="hmtbl"><thead>'+hdr+'</thead><tbody>'+rows+'</tbody></table>');

  // Attach week cell clicks via event delegation
  var cells = document.querySelectorAll('.hm-cell:not(.hm-leak)');
  for (var ci=0; ci<cells.length; ci++) {
    (function(cell){
      cell.onclick = function() {
        var nm  = cell.getAttribute('data-name');
        var wi  = parseInt(cell.getAttribute('data-wi'));
        var orig= parseInt(cell.getAttribute('data-orig'));
        if (orig < 0) return; // future cell — don't edit
        openCellEdit(nm, wi, getHmVal(nm, wi, orig));
      };
    })(cells[ci]);
  }
  // Attach leakage cell clicks
  var leakCells = document.querySelectorAll('.hm-leak');
  for (var lci=0; lci<leakCells.length; lci++) {
    (function(cell){
      cell.onclick = function(){ openLeakCellEdit(cell.getAttribute('data-name')); };
    })(leakCells[lci]);
  }
}

function openCellEdit(name, wi, curVal) {
  CELL_CTX = {name:name, wi:wi};
  var wLabels=['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
  var cpt = document.getElementById('cellPopTitle');
  if (cpt) cpt.textContent = name + ' — ' + (wLabels[wi]||wi);
  var inp = document.getElementById('cellVal');
  if (inp) { inp.value = curVal||0; setTimeout(function(){inp.focus();inp.select();},100); }
  openPop('cellPop');
}

function openLeakCellEdit(name) {
  CELL_CTX = {name:name, wi:'leak'};
  var cpt = document.getElementById('cellPopTitle');
  if (cpt) cpt.textContent = name + ' — Leakage (cancelled sales)';
  var cur = HM_OVERRIDES[name+'_leak'] ? Number(HM_OVERRIDES[name+'_leak']) : 0;
  var inp = document.getElementById('cellVal');
  if (inp) { inp.value = cur; setTimeout(function(){inp.focus();inp.select();},100); }
  openPop('cellPop');
}

function saveCell() {
  if (!CELL_CTX) return;
  var v = parseInt(document.getElementById('cellVal').value) || 0;
  if (v < 0) v = 0;
  if (CELL_CTX.wi === 'leak') {
    HM_OVERRIDES[CELL_CTX.name+'_leak'] = v;
  } else {
    HM_OVERRIDES[CELL_CTX.name+'_'+CELL_CTX.wi] = v;
  }
  saveHmOverrides();
  closePop('cellPop');
  renderHeatmap();
  rebuildZFromOverrides();
}

function rebuildZFromOverrides() {
  var day=new Date().getDate(),mo=new Date().getMonth(),ja=0;
  if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  for (var i=0; i<EX.length; i++) {
    var e = EX[i];
    var newJw = [];
    for (var wi=0; wi<e.jw.length; wi++) newJw.push(getHmVal(e.name, wi+1, e.jw[wi]));
    var newJach=0;
    for (var wi=0; wi<ja; wi++) newJach += newJw[wi];
    e.jach  = newJach;
    e.jpct  = e.jtgt>0 ? (newJach/e.jtgt)*100 : 0;
    var wv  = [getHmVal(e.name,0,e.mw[3])].concat(newJw.slice(0,ja));
    e.zf    = calcZ(wv);
    e.rec   = calcRec(wv);
    e.streak= calcStreak(wv);
    e.trend = calcTrend(wv);
    e.risk  = calcRisk(e.jpct, e.zf);
    e.score = calcScore(e.jpct, e.rec, wv, e.streak);
  }
  renderKPIs();
  renderMgrDonuts();
  renderExecTable();
  renderLeaderboard();
  renderManagersPage();
}

function uploadHmCSV(event) {
  var file = event.target.files[0]; if(!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var lines = ev.target.result.trim().split('\n');
    for (var li=1; li<lines.length; li++) {
      var cols = lines[li].split(',');
      var name = (cols[0]||'').trim(); if(!name) continue;
      var wLabels=['MayW4','JunW1','JunW2','JunW3','JunW4'];
      for (var wi=0; wi<wLabels.length; wi++) {
        var v = parseInt(cols[wi+1]||0)||0;
        HM_OVERRIDES[name+'_'+wi] = v;
      }
    }
    saveHmOverrides(); renderHeatmap(); rebuildZFromOverrides();
    alert('CSV imported!');
  };
  reader.readAsText(file);
  event.target.value = '';
}

function exportHmCSV() {
  var sorted = EX.slice().sort(function(a,b){return b.jpct-a.jpct;});
  var lines = ['Name,MayW4,JunW1,JunW2,JunW3,JunW4'];
  for (var i=0; i<sorted.length; i++) {
    var e=sorted[i], origWv=[e.mw[3]].concat(e.jw), row=[e.name];
    for (var wi=0; wi<origWv.length; wi++) row.push(getHmVal(e.name,wi,origWv[wi]));
    lines.push(row.join(','));
  }
  var blob = new Blob([lines.join('\n')], {type:'text/csv'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'heatmap_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
}

// ── BI SUMMARY ────────────────────────────────────────────────
function renderBI() {
  if (!EX||EX.length===0) { setHTML('biWrap','<div style="text-align:center;padding:40px;color:var(--t3)">No data loaded</div>'); return; }
  var map=mgrMap(), tgt=0, ach=0, zc=0, recs=0, zeroSale=0;
  for(var i=0;i<EX.length;i++){
    tgt+=EX[i].jtgt; ach+=EX[i].jach;
    if(EX[i].zf==='Z2'||EX[i].zf==='Z3'||EX[i].zf==='Z4') zc++;
    if(EX[i].rec>0) recs++;
    if(EX[i].jach===0) zeroSale++;
  }
  var achPct=tgt>0?(ach/tgt)*100:0;
  var z2=0,z3=0,z4=0;
  for(var i=0;i<EX.length;i++){if(EX[i].zf==='Z2')z2++;if(EX[i].zf==='Z3')z3++;if(EX[i].zf==='Z4')z4++;}
  var totalCost=(40000*EX.length)+(50000*MGRS_ALL.length)+100000+500000+100000;
  var coca=ach>0?Math.round(totalCost/ach):0;
  var cocaDisplay=ach===0?'No sales':(coca>=1000?'₹'+Math.round(coca/1000)+'K':'₹'+coca);
  var totalLeakBI=0;
  for(var i=0;i<EX.length;i++){var lv=HM_OVERRIDES[EX[i].name+'_leak'];if(lv)totalLeakBI+=Number(lv)||0;}
  var topExec=EX.slice().sort(function(a,b){return b.jpct-a.jpct;})[0];
  var topMgr='', topMgrPct=0;
  var mgrKeys=Object.keys(map);
  for(var i=0;i<mgrKeys.length;i++){var nm=mgrKeys[i];var m=map[nm];var p=m.tgt>0?(m.ach/m.tgt)*100:0;if(p>topMgrPct){topMgrPct=p;topMgr=nm;}}
  var avgMay=0; for(var i=0;i<EX.length;i++) avgMay+=EX[i].mayTotal; avgMay=avgMay/EX.length;
  var scoreColor=achPct>=80?'#1a9e5c':achPct>=50?'#d97706':'#e53e3e';
  var goods=[],bads=[],warns=[],infos=[],actions=[];
  if(recs>0)goods.push({icon:'🔄',val:recs+' recoveries',lbl:'Recovery Champions',desc:recs+' executives converted 0→1. Resilient performers — recognize publicly.'});
  if(achPct>=50)goods.push({icon:'✅',val:achPct.toFixed(0)+'%',lbl:'Jun Achievement',desc:'Team crossed 50%. '+(topExec?topExec.name+' leads at '+topExec.jpct.toFixed(0)+'%':'')});
  if(topMgr)goods.push({icon:'🏆',val:topMgr,lbl:'Best Manager',desc:topMgr+' team at '+topMgrPct.toFixed(0)+'%. Share their approach with other managers.'});
  if(z4===0)goods.push({icon:'🛡',val:'No Z4',lbl:'No Critical Cases',desc:'Zero Z4 flags. No immediate BM escalation needed.'});
  if(zeroSale>EX.length*0.3)bads.push({icon:'🚨',val:zeroSale+' execs',lbl:'Zero Sale Executives',desc:zeroSale+' of '+EX.length+' have 0 Jun sales. Immediate intervention needed.'});
  if(z3+z4>0)bads.push({icon:'⚠',val:(z3+z4)+' cases',lbl:'Z3/Z4 Escalations',desc:z3+' Z3 and '+z4+' Z4 cases. Initiate PIP discussion.'});
  if(coca>19000)bads.push({icon:'💸',val:cocaDisplay,lbl:'High COCA',desc:'₹'+Math.round(totalCost/1000)+'K cost ÷ '+ach+' sales = '+cocaDisplay+'. Need 84 sales for ideal ₹19K COCA.'});
  if(z2>3)warns.push({icon:'📋',val:z2+' cases',lbl:'Z2 Watch List',desc:z2+' at Z2. Coach within 48 hours or they escalate to Z3.'});
  if(totalLeakBI>0)warns.push({icon:'🚫',val:totalLeakBI+' cancelled',lbl:'Sales Leakage',desc:totalLeakBI+' cancellations recorded. Each = COCA wasted. Review reason codes.'});
  infos.push({icon:'🧮',val:cocaDisplay,lbl:'COCA',desc:'₹'+Math.round(totalCost/1000)+'K branch cost. Ideal ₹19K needs 84 sales (currently '+ach+').'});
  infos.push({icon:'📅',val:avgMay.toFixed(1),lbl:'Avg May Sale',desc:'Average May sales/executive. Benchmark for Jun targeting.'});
  infos.push({icon:'🗺',val:'13 zones',lbl:'Territory',desc:'Electronics City: 5,438 data, 0.77% conv — biggest opportunity. Anekal: 1.87% conv — best rate.'});
  actions=[
    {pri:'🚨 Immediate',txt:'Coach all '+z2+' Z2 executives today. Prevent Z3 escalation.'},
    {pri:'📋 This Week', txt:(topMgr?topMgr+' team approach should be shared with all managers.':'Review top performer approach with all managers.')},
    {pri:'📊 This Month',txt:'Focus Electronics City territory — 5,438 data at 0.77% conv. 10x opportunity.'},
    {pri:'💰 COCA',      txt:'Need 84 total sales for ideal ₹19K COCA. Currently '+ach+' sales — '+(84-ach>0?(84-ach)+' more needed.':'TARGET ACHIEVED!')},
    {pri:'🔄 Recovery',  txt:recs>0?(recs+' recovery champions — recognize them publicly to motivate team.'):'Incentivize 0→1 conversions with spot recognition.'},
    {pri:'📉 Leakage',   txt:totalLeakBI>0?(totalLeakBI+' cancellations recorded. Review and address root causes.'):'No cancellations. Track carefully as month progresses.'},
  ];
  function mkCards(arr,cls){
    var h='';
    for(var i=0;i<arr.length;i++){var x=arr[i];
      h+='<div class="bi-card '+cls+'"><div class="bi-icon">'+x.icon+'</div><div class="bi-val">'+x.val+'</div><div class="bi-lbl">'+x.lbl+'</div><div class="bi-desc">'+x.desc+'</div></div>';
    }return h;
  }
  var html=
    '<div class="bi-sec" style="background:linear-gradient(135deg,var(--p1l),var(--p2l));border-left:5px solid var(--p1)">'
    +'<div style="display:flex;align-items:center;justify-content:space-between">'
    +'<div><div style="font-family:Syne,sans-serif;font-size:18px;font-weight:800;color:var(--t1)">Branch Health Score</div>'
    +'<div style="font-size:12px;color:var(--t2);margin-top:4px">Bommasandara · June 2026 · '+EX.length+' Executives</div></div>'
    +'<div style="text-align:center"><div style="font-family:Syne,sans-serif;font-size:48px;font-weight:900;color:'+scoreColor+'">'+achPct.toFixed(0)+'%</div>'
    +'<div style="font-size:12px;color:var(--t2)">Overall Achievement</div></div></div></div>'
    +(goods.length?'<div class="bi-sec"><div class="bi-sec-title">✅ What\'s Working</div><div class="bi-grid">'+mkCards(goods,'good')+'</div></div>':'')
    +(bads.length?'<div class="bi-sec"><div class="bi-sec-title">🚨 What Needs Fixing</div><div class="bi-grid">'+mkCards(bads,'bad')+'</div></div>':'')
    +(warns.length?'<div class="bi-sec"><div class="bi-sec-title">⚠ Watch Closely</div><div class="bi-grid">'+mkCards(warns,'warn')+'</div></div>':'')
    +'<div class="bi-sec"><div class="bi-sec-title">📊 Key Metrics</div><div class="bi-grid">'+mkCards(infos,'info')+'</div></div>'
    +'<div class="bi-sec"><div class="bi-sec-title">🎯 CEO Action Plan</div>'
    +actions.map(function(a,i){return'<div style="display:flex;gap:12px;padding:10px 12px;border-radius:8px;background:'+(i%2===0?'var(--p1l)':'var(--card2)')+';margin-bottom:6px"><div style="font-size:11px;font-weight:800;min-width:100px;color:var(--t1)">'+a.pri+'</div><div style="font-size:12px;color:var(--t2)">'+a.txt+'</div></div>';}).join('')
    +'</div>';
  setHTML('biWrap', html);
}

// ── POPUP HELPERS ─────────────────────────────────────────────
function openPop(id)  { var el=document.getElementById(id); if(el) el.classList.add('open'); }
function closePop(id) { var el=document.getElementById(id); if(el) el.classList.remove('open'); }
function bgClose(e,id){ if(e.target.id===id) closePop(id); }

// ── HELPERS ───────────────────────────────────────────────────
function setText(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
function setHTML(id,h){ var el=document.getElementById(id); if(el) el.innerHTML=h; }

function mgrMap() {
  var map = {};
  for (var i=0; i<MGRS_ALL.length; i++) map[MGRS_ALL[i]]={size:0,tgt:0,ach:0,z2:0,z3:0,z4:0,streaks:[],rec:0};
  for (var i=0; i<EX.length; i++) {
    var e=EX[i], k=null;
    for (var j=0; j<MGRS_ALL.length; j++) {
      if(e.mgr===MGRS_ALL[j]||e.mgr.toLowerCase()===MGRS_ALL[j].toLowerCase()){k=MGRS_ALL[j];break;}
    }
    if(!k) k=e.mgr;
    if(!map[k]) map[k]={size:0,tgt:0,ach:0,z2:0,z3:0,z4:0,streaks:[],rec:0};
    map[k].size++; map[k].tgt+=e.jtgt; map[k].ach+=e.jach;
    if(e.zf==='Z2')map[k].z2++; if(e.zf==='Z3')map[k].z3++; if(e.zf==='Z4')map[k].z4++;
    map[k].streaks.push(e.streak); map[k].rec+=e.rec;
  }
  return map;
}

// ── DEMO DATA ─────────────────────────────────────────────────
function loadDemo() {
  var rows = [
    ['Employee','Manager','','','','','','','JunTgt','JunAch','','AW1','AW2','AW3','AW4','AW5','MW1','MW2','MW3','MW4','JW1','JW2','JW3','JW4'],
    ['Maruti','Annesh','','','',4,4,1,5,1,'',0,1,1,1,0,1,1,1,1,1,0,0,0],
    ['Anand B','Mohan','','','',4,2,'',3,0,'',0,0,1,0,1,0,1,0,1,0,0,0,0],
    ['Suresh','Annesh','','','',4,3,'',4,0,'',0,1,0,1,1,1,0,0,2,0,0,0,0],
    ['Deepak R','Annesh','','','',6,6,1,6,1,'',0,2,0,1,0,1,0,3,2,1,0,0,0],
    ['Virendra MM','Annesh','','','',2,0,'',3,0,'',0,0,0,0,0,0,0,0,2,0,0,0,0],
    ['Sumith','Arun','','','',4,3,'',5,0,'',0,0,1,0,0,1,1,0,1,0,0,0,0],
    ['Govind Bagade','Annesh','','','',4,1,'',4,1,'',0,0,1,1,1,0,0,0,1,1,0,0,0],
    ['Yashassu N S','Arun','','','',6,2,'',6,0,'',0,1,1,0,1,0,0,1,1,0,0,0,0],
    ['Abhishek','Arun','','','',4,1,'',4,0,'',0,0,1,0,0,1,0,0,0,0,0,0,0],
    ['Ullas','Arun','','','',5,3,'',5,0,'',0,1,1,1,0,0,1,1,1,0,0,0,0],
    ['Abhishek SB','Mohan','','','',4,2,'',4,0,'',0,0,0,2,1,0,0,1,1,0,0,0,0],
    ['Naveen G','Mohan','','','',4,2,'',4,0,'',0,1,0,0,1,0,1,1,0,0,0,0,0],
    ['Varun','Pranav','','','',6,3,'',6,0,'',0,1,1,1,1,1,0,1,1,0,0,0,0],
    ['Sharankumar','Mohan','','','',4,4,1,5,0,'',0,0,1,1,0,1,1,1,1,0,0,0,0],
    ['Hemantha M','Mohan','','','',5,4,'',5,0,'',0,1,1,1,0,1,1,1,1,0,0,0,0],
    ['Shashank','Arun','','','',0,0,'',2,0,'',0,0,0,0,0,0,0,0,0,0,0,0,0]
  ];
  buildExecs(rows, 1);
  renderAll();
  setText('syncLbl', 'Demo • Paste CSV URL in app.js');
}
