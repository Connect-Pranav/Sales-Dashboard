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

var MGR_DONUTS = ["Annesh","Mohan","Arun"];
var MGRS_ALL   = ["Annesh","Mohan","Arun","Pranav"];
var PC = ["#3a8ee6","#e03e3e","#00c875","#F5B642","#9b59b6","#e67e22"];
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
    leaderboard:"Leaderboard",matrix:"Performance Matrix",heatmap:"Weekly Heatmap",summary:"BI Summary"};
  var ttl = document.getElementById('pageTitle');
  if (ttl) ttl.textContent = titles[pg] || pg;
  if (pg === 'dashboard' && LMAP) {
    setTimeout(function() { LMAP.invalidateSize(); }, 200);
  }
  if (pg === 'heatmap') renderHeatmap();
  if (pg === 'summary') renderBI();
  if (pg === 'managers') renderManagersPage();
  if (pg === 'leaderboard') renderLeaderboard();
  if (pg === 'matrix') renderMatrix();
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
    .then(function(csv) {
      buildExecs(parseCSV(csv), 2);
      _applyOverridesToEX(); // apply saved edits to loaded data
      renderAll();
      setText('syncLbl', 'Synced ' + new Date().toLocaleTimeString('en-IN'));
    })
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
  // CRITICAL: Apply all saved heatmap overrides to EX[] FIRST
  // This ensures every page reads from the same updated master data
  _applyOverridesToEX();
  renderKPIs();
  renderMgrDonuts();
  initMap();
  renderExecTable();
  renderDonuts();
  renderManagersPage();
  renderLeaderboard();
  renderHeatmap();
  renderMgrBar();
  renderPieCluster();
  renderWeeklyBar();
  renderZDonuts();
  var matrixPage = document.getElementById('pg-matrix');
  if (matrixPage && matrixPage.classList.contains('active')) renderMatrix();
}

// ── SINGLE SOURCE OF TRUTH — applies HM_OVERRIDES into EX[] master store ──
function _applyOverridesToEX() {
  var day=new Date().getDate(), mo=new Date().getMonth(), ja=0;
  if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  for (var i=0; i<EX.length; i++) {
    var e = EX[i];
    // Read each Jun week with override fallback
    var newJw = [];
    for (var wi=0; wi<e.jw.length; wi++) {
      newJw.push(getHmVal(e.name, wi+1, e.jw[wi]));
    }
    // Also apply May W4 override (wi=0)
    var mayW4 = getHmVal(e.name, 0, e.mw[3]);
    // Recalculate achievement from active weeks only
    var newJach = 0;
    for (var wi=0; wi<ja; wi++) newJach += newJw[wi];
    e.jach   = newJach;
    e.jpct   = e.jtgt > 0 ? (newJach / e.jtgt) * 100 : 0;
    // Recalculate Z from rolling 5-week window
    var wv = [mayW4].concat(newJw.slice(0, ja));
    e.zf     = calcZ(wv);
    e.rec    = calcRec(wv);
    e.streak = calcStreak(wv);
    e.trend  = calcTrend(wv);
    e.risk   = calcRisk(e.jpct, e.zf);
    e.score  = calcScore(e.jpct, e.rec, wv, e.streak);
  }
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
    var lkey = EX[i].name+'_leak';
    if (HM_OVERRIDES.hasOwnProperty(lkey)) {
      var lkv = Number(HM_OVERRIDES[lkey]);
      if (lkv > 0) totalLeakage += lkv;
    }
  }

  // COCA
  var totalCost = (40000*EX.length) + (50000*MGRS_ALL.length) + 100000 + 500000 + 100000;
  var cocaRaw = ach>0 ? Math.round(totalCost/ach) : 0;
  var cocaTxt = ach===0 ? 'No sales' : '₹'+Math.round(cocaRaw/1000)+'K';
  var idealNeeded = Math.ceil(totalCost/19000);

  setText('k-team',  EX.length);       setText('k-ts',    'Bommasandara Branch');
  setText('k-ach',   ach+'/'+tgt);     setText('k-as',    pct+'% of target');
  setText('k-z',     zc);              setText('k-zs',    zc>0?'Click to view':'All clear ✓');
  setText('k-coca',  cocaTxt);         setText('k-coca-s','₹19K ideal · '+idealNeeded+' sales');
  setText('k-leak',  totalLeakage>0?totalLeakage:'0');
  setText('k-lks',   totalLeakage>0?(totalLeakage+' cancelled'):'None ✓');
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
    var za  = m.z4>0?'<span class="mdc-z" style="background:rgba(192,57,43,.1);color:#c0392b;border-color:#c0392b">Z4:'+m.z4+'</span>'
            : m.z3>0?'<span class="mdc-z" style="background:rgba(192,57,43,.08);color:#c0392b;border-color:#c0392b">Z3:'+m.z3+'</span>'
            : m.z2>0?'<span class="mdc-z" style="background:rgba(232,184,0,.1);color:#9a7800;border-color:#e8b800">Z2:'+m.z2+'</span>'
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
    var lpkey = EX[i].name+'_leak';
    if (HM_OVERRIDES.hasOwnProperty(lpkey)) {
      var lpv = Number(HM_OVERRIDES[lpkey]);
      if (lpv > 0) { total += lpv; leakList.push({name:EX[i].name, mgr:EX[i].mgr, val:lpv}); }
    }
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
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {subdomains:'abcd', maxZoom:19}).addTo(LMAP);
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

  // Build area→exec mapping for achievement-based coloring
  var areaAchMap = {};
  // Map exec names/areas — use conversion rate as proxy for area health
  // Color by area conv% performance vs branch average
  var avgCV = 0; for (var i=0;i<AREAS.length;i++) avgCV += AREAS[i].cv; avgCV /= AREAS.length;

  for (var i=0; i<AREAS.length; i++) {
    var a=AREAS[i], v=vals[i];
    var radius = 9 + (v/maxV)*38;

    // Achievement-based color logic per PDF spec:
    // >80% conv or high sales = Green, 50-80% = Blue, 25-50% = Orange, <25% = Red
    var achPct = a.cv / (avgCV * 2) * 100; // normalize conv% to 0-100 scale
    var color, borderColor, labelColor;
    if (a.cv >= avgCV * 1.3) {
      color = '#27ae60'; borderColor = '#1a9e5c'; labelColor = '#0a4a28'; // Green — High performer
    } else if (a.cv >= avgCV * 0.8) {
      color = '#2872c8'; borderColor = '#1a5aa0'; labelColor = '#0a2a5c'; // Blue — Average
    } else if (a.cv >= avgCV * 0.4) {
      color = '#e67e22'; borderColor = '#c96a12'; labelColor = '#6b3000'; // Orange — At risk
    } else {
      color = '#c0392b'; borderColor = '#9b1e15'; labelColor = '#5a0000'; // Red — Critical
    }

    // Status label for tooltip
    var statusLabel = a.cv >= avgCV*1.3 ? '🟢 High Performer' : a.cv >= avgCV*0.8 ? '🔵 Average' : a.cv >= avgCV*0.4 ? '🟠 At Risk' : '🔴 Critical';

    var circle = L.circleMarker([a.lat,a.lng], {
      radius:radius, fillColor:color, color:borderColor,
      weight:2, opacity:1, fillOpacity:0.82
    }).addTo(LMAP);

    (function(area, r, sc, slbl) {
      circle.on('click', function() {
        L.popup({className:'bpop', maxWidth:250, closeButton:true})
          .setLatLng([area.lat, area.lng])
          .setContent('<div class="pin"><div class="pname">📍 '+area.n+'</div><div class="ppinc">PIN: '+area.p+' · '+slbl+'</div>'
            +'<div class="pgrid">'
            +'<div class="pi"><div class="pv">'+area.td.toLocaleString()+'</div><div class="pl">Total Data</div></div>'
            +'<div class="pi"><div class="pv" style="color:#8e44ad">'+area.ps+'</div><div class="pl">Paid Sellers</div></div>'
            +'<div class="pi"><div class="pv" style="color:#27ae60">'+area.ga.toLocaleString()+'</div><div class="pl">GST Active</div></div>'
            +'<div class="pi"><div class="pv" style="color:#e67e22">'+area.s6+'</div><div class="pl">Sales 6M</div></div>'
            +'</div>'
            +'<div class="pgrid">'
            +'<div class="pi"><div class="pv" style="color:'+sc+'">'+area.cv+'%</div><div class="pl">Conv Rate</div></div>'
            +'<div class="pi"><div class="pv" style="color:#2872c8">'+area.mp+'%</div><div class="pl">Meet%</div></div>'
            +'</div>'
            +'<div class="pfoot">Bubble size = '+getAL(area)+' · Conv drives color</div></div>')
          .openOn(LMAP);
      });
      circle.bindTooltip(
        '<div style="font-size:11px;font-weight:800;color:#1a1a2e">'+area.n+'</div>'+
        '<div style="font-size:10px;color:#4a5568">'+getAL(area)+'</div>'+
        '<div style="font-size:9px;color:'+sc+';font-weight:700">'+slbl+'</div>',
        {direction:'top', offset:[0,-r]});
    })(a, radius, color, statusLabel);

    var lbl = L.divIcon({className:'',
      html:'<div style="background:'+color+';color:#fff;font-size:8.5px;font-weight:900;font-family:Nunito,sans-serif;padding:2px 5px;border-radius:3px;white-space:nowrap;box-shadow:0 1px 5px rgba(0,0,0,.3);border:1px solid '+borderColor+'">'+a.n+'</div>',
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
  var ZC  = {Z4:'#c0392b',Z3:'#c0392b',Z2:'#9a7800',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
  var ZBG = {Z4:'rgba(192,57,43,.1)',Z3:'rgba(192,57,43,.08)',Z2:'rgba(232,184,0,.1)',RECOVERY:'rgba(26,158,92,.08)',OK:'rgba(26,158,92,.06)'};
  var html = '';
  for (var i=0; i<sorted.length; i++) {
    var e=sorted[i];
    var pc=e.jpct>=80?'#1a9e5c':e.jpct>=50?'#9a7800':'#c0392b';
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
  mkD('d1','dv1','ds1',[totPS,Math.max(0,totTD-totPS)],['#2872c8','rgba(40,114,200,.2)'],totTD.toLocaleString(),'Total data');
  mkD('d2','dv2','ds2',[totPS,Math.max(0,totTD-totPS)],['#27ae60','rgba(39,174,96,.2)'],totPS,'Paid sellers');
  mkD('d3','dv3','ds3',[parseFloat(avgCV),Math.max(0,5-parseFloat(avgCV))],['#8e44ad','rgba(142,68,173,.2)'],avgCV+'%','Avg conv%');
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
    var leakM = 0;
    for(var i=0;i<EX.length;i++){
      if(EX[i].mgr===nm||EX[i].mgr.toLowerCase()===nm.toLowerCase()){
        var mlk=EX[i].name+'_leak';
        if(HM_OVERRIDES.hasOwnProperty(mlk)) leakM+=Number(HM_OVERRIDES[mlk])||0;
      }
    }
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
        +'<div><div class="msv" style="color:'+(leakM>0?'#e53e3e':'#1a9e5c')+'">'+leakM+'</div><div class="msl">Leakage</div></div>'
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
    var leakKey = e.name+'_leak'; var leakVal = HM_OVERRIDES.hasOwnProperty(leakKey) ? (Number(HM_OVERRIDES[leakKey])||0) : 0;
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

// ── TOAST NOTIFICATION ───────────────────────────────────────
function showToast(msg, color) {
  var t = document.getElementById('syncToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'syncToast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:10px 18px;border-radius:8px;font-family:Nunito,sans-serif;font-size:13px;font-weight:700;color:#fff;box-shadow:0 4px 20px rgba(0,0,0,.5);transition:opacity .3s;pointer-events:none;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = color || '#00c875';
  t.style.opacity = '1';
  clearTimeout(t._tid);
  t._tid = setTimeout(function(){ t.style.opacity='0'; }, 2500);
}

function saveCell() {
  if (!CELL_CTX) return;
  var raw = document.getElementById('cellVal').value;
  var v = raw === '' ? 0 : (parseInt(raw, 10) || 0);
  if (v < 0) v = 0;

  var key = CELL_CTX.wi === 'leak'
    ? CELL_CTX.name + '_leak'
    : CELL_CTX.name + '_' + CELL_CTX.wi;

  HM_OVERRIDES[key] = v;

  // 1. Persist to localStorage
  saveHmOverrides();

  // 2. Close popup
  closePop('cellPop');

  // 3. Apply overrides to master EX[] data store
  _applyOverridesToEX();

  // 4. Re-render heatmap with new values
  renderHeatmap();

  // 5. Re-render ALL other pages immediately
  renderKPIs();
  renderMgrDonuts();
  renderExecTable();
  renderLeaderboard();
  renderManagersPage();
  renderMgrBar();
  renderPieCluster();
  renderWeeklyBar();
  renderZDonuts();
  drawCircles();
  var mp = document.getElementById('pg-matrix');
  if (mp && mp.classList.contains('active')) renderMatrix();
  var bp = document.getElementById('pg-summary');
  if (bp && bp.classList.contains('active')) renderBI();

  // 6. Visual feedback
  showAutoSave();
  showToast('✓ Saved & synced to all pages', '#00c875');
}

function showAutoSave() {
  var dot = document.getElementById('asDot');
  var lbl = document.getElementById('asLbl');
  if (dot) dot.className = 'as-dot saving';
  if (lbl) lbl.textContent = 'Saving…';
  setTimeout(function() {
    if (dot) dot.className = 'as-dot';
    if (lbl) lbl.textContent = 'Saved ✓';
    setTimeout(function() {
      if (lbl) lbl.textContent = 'Auto-save on';
    }, 1500);
  }, 400);
}

function rebuildZFromOverrides() {
  // Apply overrides to master EX[] data store
  _applyOverridesToEX();
  // Re-render every page that displays exec data
  renderKPIs();
  renderMgrDonuts();
  renderExecTable();
  renderLeaderboard();
  renderManagersPage();
  renderMgrBar();
  renderPieCluster();
  renderWeeklyBar();
  renderZDonuts();
  drawCircles();
  var mp = document.getElementById('pg-matrix');
  if (mp && mp.classList.contains('active')) renderMatrix();
  var bp = document.getElementById('pg-summary');
  if (bp && bp.classList.contains('active')) renderBI();
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
  for(var i=0;i<EX.length;i++){var blk=EX[i].name+'_leak';if(HM_OVERRIDES.hasOwnProperty(blk)){var blv=Number(HM_OVERRIDES[blk]);if(blv>0)totalLeakBI+=blv;}}
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

// ── MGR BAR CHART (horizontal) ────────────────────────────────
var _MGRBAR_CHARTS = {};
function renderMgrBar() {
  var wrap = document.getElementById('mgrBarWrap');
  if (!wrap || !EX.length) return;
  var map = mgrMap();
  var html = '';
  var colors = ['#2872c8','#c0392b','#27ae60','#8e44ad'];
  var maxPct = 0;
  var mgrs = [], pcts = [], achs = [], tgts = [];
  for (var i=0; i<MGRS_ALL.length; i++) {
    var nm = MGRS_ALL[i];
    var m = map[nm];
    if (!m || m.size===0) continue;
    var pct = m.tgt>0 ? (m.ach/m.tgt)*100 : 0;
    if (pct>maxPct) maxPct=pct;
    mgrs.push(nm); pcts.push(pct); achs.push(m.ach); tgts.push(m.tgt);
  }
  if (maxPct===0) maxPct=100;
  for (var i=0; i<mgrs.length; i++) {
    var pct=pcts[i], c=colors[i%colors.length];
    var barW = Math.min((pct/maxPct)*100, 100);
    var fc = pct>=80?'#27ae60':pct>=50?'#e8b800':'#c0392b';
    html += '<div class="bar-row">'
      +'<div class="bar-lbl">'+mgrs[i]+'</div>'
      +'<div class="bar-track"><div class="bar-fill" style="width:'+barW+'%;background:'+c+'"></div></div>'
      +'<div class="bar-val" style="color:'+fc+'">'+achs[i]+'/'+tgts[i]+'</div>'
      +'</div>';
  }
  wrap.innerHTML = html;
}

// ── PIE CLUSTER ───────────────────────────────────────────────
var _PIE_CHARTS = {};
function renderPieCluster() {
  var wrap = document.getElementById('pieCluster');
  if (!wrap || !EX.length) return;
  var ok=0,z2=0,z3=0,z4=0,rec=0;
  for (var i=0;i<EX.length;i++){
    var z=EX[i].zf;
    if(z==='RECOVERY') rec++;
    else if(z==='Z4') z4++;
    else if(z==='Z3') z3++;
    else if(z==='Z2') z2++;
    else ok++;
  }
  var highAch=0,lowAch=0;
  for (var i=0;i<EX.length;i++) { if(EX[i].jpct>=50) highAch++; else lowAch++; }

  function mkPie(id, pid, pvid, pct, data, colors, label, val) {
    var existing = _PIE_CHARTS[id];
    if (existing) { existing.destroy(); delete _PIE_CHARTS[id]; }
    var ctx = document.getElementById(id); if (!ctx) return;
    _PIE_CHARTS[id] = new Chart(ctx, {
      type:'doughnut',
      data:{datasets:[{data:data, backgroundColor:colors, borderWidth:1.5, borderColor:'#fff', cutout:'68%'}]},
      options:{responsive:false, plugins:{legend:{display:false}, tooltip:{enabled:false}}}
    });
    var pp=document.getElementById(pid); if(pp) pp.textContent=pct+'%';
    var pv=document.getElementById(pvid); if(pv) pv.textContent=val;
  }

  wrap.innerHTML =
    '<div class="pie-mini"><div class="pie-wrap"><canvas id="pc1" width="58" height="58"></canvas><div class="pie-pct" id="pc1p"></div></div><div class="pie-lbl">On Track</div><div class="pie-val" id="pc1v"></div></div>'
   +'<div class="pie-mini"><div class="pie-wrap"><canvas id="pc2" width="58" height="58"></canvas><div class="pie-pct" id="pc2p"></div></div><div class="pie-lbl">Z Flags</div><div class="pie-val" id="pc2v"></div></div>'
   +'<div class="pie-mini"><div class="pie-wrap"><canvas id="pc3" width="58" height="58"></canvas><div class="pie-pct" id="pc3p"></div></div><div class="pie-lbl">Ach≥50%</div><div class="pie-val" id="pc3v"></div></div>'
   +'<div class="pie-mini"><div class="pie-wrap"><canvas id="pc4" width="58" height="58"></canvas><div class="pie-pct" id="pc4p"></div></div><div class="pie-lbl">Recovery</div><div class="pie-val" id="pc4v"></div></div>';

  var total = EX.length || 1;
  setTimeout(function(){
    mkPie('pc1','pc1p','pc1v', Math.round(ok/total*100), [ok,total-ok], ['#27ae60','rgba(39,174,96,.18)'], 'On Track', ok+'ex');
    mkPie('pc2','pc2p','pc2v', Math.round((z2+z3+z4)/total*100), [z2+z3+z4,total-(z2+z3+z4)], ['#c0392b','rgba(192,57,43,.15)'], 'Z Flags', (z2+z3+z4)+'ex');
    mkPie('pc3','pc3p','pc3v', Math.round(highAch/total*100), [highAch,total-highAch], ['#2872c8','rgba(40,114,200,.15)'], 'Ach≥50%', highAch+'ex');
    mkPie('pc4','pc4p','pc4v', Math.round(rec/total*100), [rec,Math.max(0,total-rec)], ['#8e44ad','rgba(142,68,173,.15)'], 'Recovery', rec+'ex');
  }, 60);
}

// ── WEEKLY BAR CHART (column) ─────────────────────────────────
var _WEEKLY_CHART = null;
function renderWeeklyBar() {
  var ctx = document.getElementById('weeklyBar');
  if (!ctx || !EX.length) return;
  if (_WEEKLY_CHART) { _WEEKLY_CHART.destroy(); _WEEKLY_CHART = null; }
  var wLabels = ['May W1','May W2','May W3','May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
  var totals = [0,0,0,0, 0,0,0,0];
  for (var i=0; i<EX.length; i++) {
    var e = EX[i];
    for (var wi=0; wi<4; wi++) totals[wi] += (e.mw[wi]||0);
    for (var wi=0; wi<4; wi++) totals[wi+4] += getHmVal(e.name, wi+1, e.jw[wi]||0);
  }
  var colors = totals.map(function(v,i){ return i<4?'rgba(58,142,230,0.8)':'rgba(0,200,117,0.8)'; });
  _WEEKLY_CHART = new Chart(ctx, {
    type:'bar',
    data:{
      labels:wLabels,
      datasets:[{
        data:totals,
        backgroundColor:colors,
        borderRadius:4,
        borderSkipped:false
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return c.raw+' sales';}}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{size:8,family:'Nunito'},color:'#4a6080',maxRotation:35}},
        y:{grid:{color:'rgba(255,255,255,0.05)'},ticks:{font:{size:8},color:'#4a6080'},beginAtZero:true}
      }
    }
  });
}

// ── Z STATUS RING DONUTS ──────────────────────────────────────
var _Z_DONUTS = {};
function renderZDonuts() {
  if (!EX.length) return;
  var ok=0,warn=0,crit=0,rec=0;
  for (var i=0;i<EX.length;i++){
    var z=EX[i].zf;
    if(z==='RECOVERY') rec++;
    else if(z==='Z4'||z==='Z3') crit++;
    else if(z==='Z2') warn++;
    else ok++;
  }
  var total=EX.length||1;
  function mkZ(id,pid,vid,v,col) {
    var ex=_Z_DONUTS[id]; if(ex){ex.destroy();delete _Z_DONUTS[id];}
    var ctx=document.getElementById(id); if(!ctx) return;
    _Z_DONUTS[id]=new Chart(ctx,{type:'doughnut',
      data:{datasets:[{data:[v,Math.max(0,total-v)],backgroundColor:[col,'rgba(0,0,0,0.07)'],borderWidth:0,cutout:'74%'}]},
      options:{responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}}}
    });
    var p=document.getElementById(pid); if(p) p.textContent=Math.round(v/total*100)+'%';
    var vl=document.getElementById(vid); if(vl) vl.textContent=v;
  }
  setTimeout(function(){
    mkZ('zDonut1','zd1p','zd1v', ok,'#27ae60');
    mkZ('zDonut2','zd2p','zd2v', warn+crit,'#c0392b');
    mkZ('zDonut3','zd3p','zd3v', rec,'#8e44ad');
  },80);
}

// ── PERFORMANCE MATRIX ───────────────────────────────────────
function renderMatrix() {
  if (!EX || EX.length === 0) {
    setHTML('pmGrid', '<div style="text-align:center;padding:40px;color:var(--t3);grid-column:1/-1">No data loaded</div>');
    return;
  }
  var sorted = EX.slice().sort(function(a,b){ return b.score-a.score; });
  var ZC = {Z4:'#f05252',Z3:'#f05252',Z2:'#f5c842',RECOVERY:'#2dd87e',OK:'#2dd87e'};

  // ── Quadrant: High Ach / Low Z risk vs Low Ach / High Z risk
  var q1=[],q2=[],q3=[],q4=[];
  for (var i=0; i<EX.length; i++) {
    var e=EX[i];
    var highAch = e.jpct >= 50;
    var highRisk = (e.zf==='Z3'||e.zf==='Z4'||e.zf==='Z2');
    if (highAch && !highRisk) q1.push(e);
    else if (highAch && highRisk) q2.push(e);
    else if (!highAch && !highRisk) q3.push(e);
    else q4.push(e);
  }

  function qNames(arr) {
    var s = '';
    for (var i=0;i<arr.length;i++) s += '<div>'+arr[i].name+' <span style="opacity:.6">'+arr[i].jpct.toFixed(0)+'%</span></div>';
    return s || '<div style="color:var(--t3);font-style:italic">None</div>';
  }

  // ── Scorecard table
  var scoreHtml = '<table class="rtbl" style="width:100%"><thead><tr><th>#</th><th>Executive</th><th>Mgr</th><th>Score</th><th>Ach%</th><th>Z</th><th>Streak</th><th>Trend</th></tr></thead><tbody>';
  for (var i=0;i<sorted.length;i++) {
    var e=sorted[i];
    var sc=e.score;
    var scColor=sc>=70?'#2dd87e':sc>=40?'#f5c842':'#f05252';
    var pc=e.jpct>=80?'#2dd87e':e.jpct>=50?'#f5c842':'#f05252';
    var zc=ZC[e.zf]||'#5a6d88';
    scoreHtml += '<tr>'
      +'<td style="color:var(--t3);font-weight:700">'+(i+1)+'</td>'
      +'<td style="font-weight:800">'+e.name+'</td>'
      +'<td style="color:var(--t3)">'+e.mgr+'</td>'
      +'<td><div class="sbar-wrap"><div class="sbar"><div class="sbar-fill" style="width:'+sc+'%;background:'+scColor+'"></div></div><span style="font-size:11px;font-weight:800;color:'+scColor+'">'+sc+'</span></div></td>'
      +'<td style="font-weight:800;color:'+pc+'">'+e.jpct.toFixed(0)+'%</td>'
      +'<td style="font-size:10px;font-weight:800;color:'+zc+'">'+(e.zf||'OK')+'</td>'
      +'<td style="font-weight:700;color:var(--p1)">'+e.streak+'w</td>'
      +'<td style="font-size:14px">'+(e.trend||'→')+'</td>'
      +'</tr>';
  }
  scoreHtml += '</tbody></table>';

  // ── Weekly sparkline (trend viz)
  var sparkHtml = '';
  var sparks = EX.slice().sort(function(a,b){return b.jpct-a.jpct;});
  var wLabels = ['MayW4','JW1','JW2','JW3','JW4'];
  for (var i=0;i<sparks.length;i++) {
    var e=sparks[i];
    var origWv = [e.mw[3]].concat(e.jw);
    var wv=[];
    for(var wi=0;wi<origWv.length;wi++) wv.push(getHmVal(e.name,wi,origWv[wi]));
    var maxW=0; for(var wi=0;wi<wv.length;wi++) if(wv[wi]>maxW) maxW=wv[wi];
    var dots='';
    for(var wi=0;wi<wv.length;wi++){
      var day2=new Date().getDate(),mo2=new Date().getMonth(),ja2=0;
      if(mo2>=5){if(day2>=1)ja2=1;if(day2>=8)ja2=2;if(day2>=15)ja2=3;if(day2>=22)ja2=4;}
      var isFuture=wi>0&&(wi-1)>=ja2;
      var v=wv[wi];
      var bg=isFuture?'rgba(255,255,255,.04)':v>0?'rgba(45,216,126,.25)':'rgba(240,82,82,.18)';
      var fc=isFuture?'var(--t3)':v>0?'#2dd87e':'#f05252';
      dots+='<div class="spark-dot" style="background:'+bg+';color:'+fc+'">'+(isFuture?'·':v>0?v:'✗')+'</div>';
    }
    var pc=e.jpct>=80?'#2dd87e':e.jpct>=50?'#f5c842':'#f05252';
    sparkHtml+='<div class="spark-row"><div class="spark-name">'+e.name+'</div><div class="spark-dots">'+dots+'</div><div class="spark-pct" style="color:'+pc+'">'+e.jpct.toFixed(0)+'%</div></div>';
  }

  // ── Z-risk matrix
  var zRows='';
  var zSorted=EX.slice().sort(function(a,b){
    var o={Z4:0,Z3:1,Z2:2,RECOVERY:3,OK:4};
    return (o[a.zf]||5)-(o[b.zf]||5);
  });
  var wh2=['MayW4','JW1','JW2','JW3','JW4'];
  for(var i=0;i<zSorted.length;i++){
    var e=zSorted[i];
    var origWv=[e.mw[3]].concat(e.jw);
    var wv2=[]; for(var wi=0;wi<origWv.length;wi++) wv2.push(getHmVal(e.name,wi,origWv[wi]));
    var cells='';
    for(var wi=0;wi<wv2.length;wi++){
      var day3=new Date().getDate(),mo3=new Date().getMonth(),ja3=0;
      if(mo3>=5){if(day3>=1)ja3=1;if(day3>=8)ja3=2;if(day3>=15)ja3=3;if(day3>=22)ja3=4;}
      var isFut=wi>0&&(wi-1)>=ja3;
      var v=wv2[wi];
      var bg=isFut?'rgba(255,255,255,.04)':v>0?'rgba(45,216,126,.3)':'rgba(240,82,82,.3)';
      var fc=isFut?'var(--t3)':v>0?'#2dd87e':'#f05252';
      cells+='<div class="z-cell" style="background:'+bg+';color:'+fc+'">'+(isFut?'':v>0?v:'✗')+'</div>';
    }
    var zc2=ZC[e.zf]||'#5a6d88';
    zRows+='<div class="z-row"><div class="z-name">'+e.name+'</div>'+cells+'<span style="margin-left:4px;font-size:9px;font-weight:800;color:'+zc2+'">'+(e.zf||'OK')+'</span></div>';
  }

  var html =
    // ROW 1: Quadrant + Score table
    '<div class="pm-card" style="grid-column:1">'
      +'<div class="pm-card-title">📊 Performance Quadrant</div>'
      +'<div style="font-size:9px;color:var(--t3);margin-bottom:8px;display:grid;grid-template-columns:1fr 1fr;gap:3px;text-align:center"><div>High Ach% →</div><div></div><div></div><div>← Low Z Risk</div></div>'
      +'<div class="quad-wrap">'
        +'<div class="quad q1"><div class="quad-label">⭐ Stars (High Ach, Safe)</div><div class="quad-names">'+qNames(q1)+'</div><div class="quad-count">'+q1.length+'</div></div>'
        +'<div class="quad q2"><div class="quad-label">⚠ At Risk (High Ach, Z-Flag)</div><div class="quad-names">'+qNames(q2)+'</div><div class="quad-count">'+q2.length+'</div></div>'
        +'<div class="quad q3"><div class="quad-label">📈 Developing (Low Ach, Safe)</div><div class="quad-names">'+qNames(q3)+'</div><div class="quad-count">'+q3.length+'</div></div>'
        +'<div class="quad q4"><div class="quad-label">🚨 Critical (Low Ach + Z-Flag)</div><div class="quad-names">'+qNames(q4)+'</div><div class="quad-count">'+q4.length+'</div></div>'
      +'</div>'
    +'</div>'
    // Scorecard
    +'<div class="pm-card" style="grid-column:2;overflow-y:auto">'
      +'<div class="pm-card-title">🏅 Performance Scorecard</div>'
      +scoreHtml
    +'</div>'
    // Weekly Sparkline
    +'<div class="pm-card" style="grid-column:1;overflow-y:auto">'
      +'<div class="pm-card-title">⚡ Weekly Activity Trend</div>'
      +'<div style="display:flex;gap:4px;margin-bottom:8px;padding:0 0 0 100px">'
        +wh2.map(function(h){return'<div style="flex:1;font-size:8px;color:var(--t3);text-align:center;font-weight:700">'+h+'</div>';}).join('')
        +'<div style="width:38px"></div>'
      +'</div>'
      +sparkHtml
    +'</div>'
    // Z Risk Matrix
    +'<div class="pm-card" style="grid-column:2;overflow-y:auto">'
      +'<div class="pm-card-title">🔥 Z-Risk Tracker</div>'
      +'<div style="display:flex;gap:4px;margin-bottom:6px;padding:0 0 0 94px">'
        +wh2.map(function(h){return'<div style="flex:1;font-size:8px;color:var(--t3);text-align:center;font-weight:700">'+h+'</div>';}).join('')
        +'<div style="width:44px"></div>'
      +'</div>'
      +'<div class="z-matrix">'+zRows+'</div>'
    +'</div>';

  setHTML('pmGrid', html);
}

// ── EXCEL UPLOAD ─────────────────────────────────────────────
function uploadExcel(event) {
  var file = event.target.files[0];
  if (!file) return;
  event.target.value = '';
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = new Uint8Array(ev.target.result);
      var wb;
      if (file.name.toLowerCase().endsWith('.csv')) {
        // CSV path
        var text = new TextDecoder('utf-8').decode(data);
        wb = XLSX.read(text, {type:'string'});
      } else {
        wb = XLSX.read(data, {type:'array'});
      }
      var sheetName = wb.SheetNames[0];
      var ws = wb.Sheets[sheetName];
      var rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});

      if (!rows || rows.length < 2) {
        alert('Excel file appears empty or has no data rows.');
        return;
      }

      // Auto-detect headers row (look for Employee/Name column)
      var headerRow = 0;
      for (var r=0; r<Math.min(rows.length,5); r++) {
        var rowStr = rows[r].join(',').toLowerCase();
        if (rowStr.indexOf('employee')>=0 || rowStr.indexOf('name')>=0 || rowStr.indexOf('exec')>=0) {
          headerRow = r; break;
        }
      }
      var headers = rows[headerRow];

      // Map columns by header name
      function findCol(names) {
        for (var ni=0; ni<names.length; ni++) {
          for (var ci=0; ci<headers.length; ci++) {
            if ((headers[ci]+'').toLowerCase().indexOf(names[ni].toLowerCase()) >= 0) return ci;
          }
        }
        return -1;
      }
      var cEmp  = findCol(['employee','exec','name']);
      var cMgr  = findCol(['manager','mgr']);
      var cJTgt = findCol(['jun tgt','jtgt','target','tgt']);
      var cJAch = findCol(['jun ach','jach','achieve']);
      var cMW1  = findCol(['mw1','may w1','may_w1']);
      var cMW2  = findCol(['mw2','may w2','may_w2']);
      var cMW3  = findCol(['mw3','may w3','may_w3']);
      var cMW4  = findCol(['mw4','may w4','may_w4']);
      var cJW1  = findCol(['jw1','jun w1','jun_w1']);
      var cJW2  = findCol(['jw2','jun w2','jun_w2']);
      var cJW3  = findCol(['jw3','jun w3','jun_w3']);
      var cJW4  = findCol(['jw4','jun w4','jun_w4']);

      if (cEmp < 0) {
        alert('Could not detect Employee/Name column in this file.\n\nExpected columns like: Employee, Manager, JunTgt, JunAch, MW1-MW4, JW1-JW4\n\nSheets found: ' + wb.SheetNames.join(', '));
        return;
      }

      // Build rows in the format buildExecs expects
      var mapped = [headers]; // header row
      for (var r=headerRow+1; r<rows.length; r++) {
        var row = rows[r];
        var name = (row[cEmp]+'').trim();
        if (!name) continue;
        var newRow = new Array(24).fill('');
        newRow[COL.EMP]  = name;
        newRow[COL.MGR]  = cMgr>=0  ? (row[cMgr]+'').trim() : '';
        newRow[COL.JTGT] = cJTgt>=0 ? row[cJTgt] : 0;
        newRow[COL.JACH] = cJAch>=0 ? row[cJAch] : 0;
        newRow[COL.MW1]  = cMW1>=0  ? row[cMW1] : 0;
        newRow[COL.MW2]  = cMW2>=0  ? row[cMW2] : 0;
        newRow[COL.MW3]  = cMW3>=0  ? row[cMW3] : 0;
        newRow[COL.MW4]  = cMW4>=0  ? row[cMW4] : 0;
        newRow[COL.JW1]  = cJW1>=0  ? row[cJW1] : 0;
        newRow[COL.JW2]  = cJW2>=0  ? row[cJW2] : 0;
        newRow[COL.JW3]  = cJW3>=0  ? row[cJW3] : 0;
        newRow[COL.JW4]  = cJW4>=0  ? row[cJW4] : 0;
        mapped.push(newRow);
      }

      // Show preview popup
      var previewHtml = '<div style="margin-bottom:14px;padding:12px;background:var(--p3l);border-radius:8px;border-left:4px solid var(--p3)">'
        +'<div style="font-size:13px;font-weight:800;color:var(--t1)">✅ '+(mapped.length-1)+' executives detected from <em>'+sheetName+'</em></div>'
        +'<div style="font-size:11px;color:var(--t3);margin-top:4px">File: '+file.name+'</div>'
        +'</div>'
        +'<div style="overflow-x:auto;margin-bottom:14px">'
        +'<table style="border-collapse:collapse;font-size:11px;width:100%">'
        +'<thead><tr style="background:var(--card2)">'
        +'<th style="padding:6px 10px;color:var(--t3);font-size:9px;text-transform:uppercase;border-bottom:1.5px solid var(--bdr);text-align:left">Name</th>'
        +'<th style="padding:6px 10px;color:var(--t3);font-size:9px;text-transform:uppercase;border-bottom:1.5px solid var(--bdr);text-align:left">Manager</th>'
        +'<th style="padding:6px 10px;color:var(--t3);font-size:9px;text-transform:uppercase;border-bottom:1.5px solid var(--bdr)">Tgt</th>'
        +'<th style="padding:6px 10px;color:var(--t3);font-size:9px;text-transform:uppercase;border-bottom:1.5px solid var(--bdr)">Ach</th>'
        +'<th style="padding:6px 10px;color:var(--t3);font-size:9px;text-transform:uppercase;border-bottom:1.5px solid var(--bdr)">JW1-JW4</th>'
        +'</tr></thead><tbody>';
      for (var i=1; i<Math.min(mapped.length, 8); i++) {
        var nr = mapped[i];
        var jws = [nr[COL.JW1],nr[COL.JW2],nr[COL.JW3],nr[COL.JW4]].join(' / ');
        previewHtml += '<tr style="border-bottom:1px solid var(--bdr2)">'
          +'<td style="padding:5px 10px;font-weight:700;color:var(--t1)">'+nr[COL.EMP]+'</td>'
          +'<td style="padding:5px 10px;color:var(--t2)">'+nr[COL.MGR]+'</td>'
          +'<td style="padding:5px 10px;text-align:center;font-weight:700;color:var(--p2)">'+nr[COL.JTGT]+'</td>'
          +'<td style="padding:5px 10px;text-align:center;font-weight:700;color:var(--p3)">'+nr[COL.JACH]+'</td>'
          +'<td style="padding:5px 10px;text-align:center;color:var(--t2)">'+jws+'</td>'
          +'</tr>';
      }
      if (mapped.length-1 > 7) previewHtml += '<tr><td colspan="5" style="text-align:center;padding:8px;color:var(--t3);font-style:italic">… and '+(mapped.length-8)+' more executives</td></tr>';
      previewHtml += '</tbody></table></div>';
      previewHtml += '<div class="pop-btns">'
        +'<button class="pbtn-p" onclick="confirmExcelLoad()">✓ Load Data</button>'
        +'<button class="pbtn-s" onclick="closePop(\'xlPop\')">Cancel</button>'
        +'</div>';

      window._xlMapped = mapped;
      setHTML('xlPopBody', previewHtml);
      openPop('xlPop');

    } catch(err) {
      alert('Error reading file: ' + err.message + '\n\nMake sure it is a valid Excel (.xlsx) or CSV file.');
    }
  };
  if (file.name.toLowerCase().endsWith('.csv')) {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
}

function confirmExcelLoad() {
  if (!window._xlMapped || window._xlMapped.length < 2) return;
  buildExecs(window._xlMapped, 1);
  renderAll();
  setText('syncLbl', 'Excel • '+new Date().toLocaleTimeString('en-IN'));
  closePop('xlPop');
  window._xlMapped = null;
  alert('Data loaded from Excel! ' + EX.length + ' executives imported.');
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
  // CRITICAL: apply saved heatmap overrides into EX[] before first render
  _applyOverridesToEX();
  renderAll();
  setText('syncLbl', 'Demo • Paste CSV URL in app.js');
}
