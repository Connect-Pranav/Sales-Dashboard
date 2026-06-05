// ═══════════════════════════════════════
// BOMMASANDARA PERFORMANCE TRACKER
// Paste CSV URL below after publishing sheet
// ═══════════════════════════════════════
const SHEET_CSV_URL = "YOUR_GOOGLE_SHEET_CSV_URL_HERE";

const COL={EMP:0,MGR:1,DOJ:2,DAYS:3,BKT:4,TAPR:5,AAPR:6,MPCT:7,
  JTGT:8,JACH:9,JPCT:10,
  AW1:11,AW2:12,AW3:13,AW4:14,AW5:15,
  MW1:16,MW2:17,MW3:18,MW4:19,
  JW1:20,JW2:21,JW3:22,JW4:23};

const MGRS=["Annesh","Mohan","Arun","Manoj C Y","Pranav"];
const PC=["#819dcc","#95b7d0","#b8e1d3","#d6eadf","#eac3d5"]; // pastel
const MEDALS=["🥇","🥈","🥉"];
const PTITLES={dashboard:"Dashboard",managers:"Manager Performance",
  leaderboard:"Leaderboard",zreport:"Z-Report",heatmap:"Weekly Heatmap",recovery:"Recovery Champions"};

let EX=[], LMAP=null, CIRCLES=[], LABELS=[], CVIEW='data';
let DCHARTS={};

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
  loadLogo();
  loadData();
});

// ── LOGO ─────────────────────────────────────────────────────
function uploadLogo(e) {
  var f = e.target.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function(ev) {
    var u = ev.target.result;
    var img = document.getElementById('lionImg');
    if (img) { img.src = u; img.style.display = 'block'; }
    var fb = document.getElementById('lionFb');
    if (fb) fb.style.display = 'none';
    try { localStorage.setItem('blogo', u); } catch(e){}
  };
  r.readAsDataURL(f);
}
function loadLogo() {
  try {
    var u = localStorage.getItem('blogo');
    if (u) {
      var img = document.getElementById('lionImg');
      if (img) { img.src = u; img.style.display = 'block'; }
      var fb = document.getElementById('lionFb');
      if (fb) fb.style.display = 'none';
    }
  } catch(e) {}
}

// ── NAV ──────────────────────────────────────────────────────
function navTo(pg, el) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.ni').forEach(function(n){ n.classList.remove('active'); });
  var pgEl = document.getElementById('pg-' + pg);
  if (pgEl) pgEl.classList.add('active');
  if (el) el.classList.add('active');
  var ttl = document.getElementById('pageTitle');
  if (ttl) ttl.textContent = PTITLES[pg] || pg;
  if (pg === 'dashboard' && LMAP) {
    setTimeout(function(){ LMAP.invalidateSize(); }, 150);
  }
}

// ── LOAD DATA ────────────────────────────────────────────────
function loadData() {
  setSyncLbl('Syncing…');
  if (!SHEET_CSV_URL || SHEET_CSV_URL.indexOf('YOUR_GOOGLE') !== -1) {
    loadDemo();
    return;
  }
  fetch(SHEET_CSV_URL + '&t=' + Date.now())
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function(csv) {
      buildExecs(parseCSV(csv));
      renderAll();
      setSyncLbl('Synced ' + new Date().toLocaleTimeString('en-IN'));
    })
    .catch(function(err) {
      console.warn('Sheet failed:', err.message);
      loadDemo();
    });
}

function parseCSV(txt) {
  return txt.trim().split('\n').map(function(line) {
    var cells=[], cur='', q=false;
    for (var i=0; i<line.length; i++) {
      if (line[i]==='"') { q=!q; continue; }
      if (line[i]===',' && !q) { cells.push(cur.trim()); cur=''; continue; }
      cur += line[i];
    }
    cells.push(cur.trim());
    return cells;
  });
}

// ── BUILD EXECUTIVES ─────────────────────────────────────────
function buildExecs(rows) {
  EX = [];
  var day = new Date().getDate();
  var mo  = new Date().getMonth();
  var ja  = 0;
  if (mo >= 5) {
    if (day >= 1)  ja = 1;
    if (day >= 8)  ja = 2;
    if (day >= 15) ja = 3;
    if (day >= 22) ja = 4;
  }

  for (var r = 2; r < rows.length; r++) {
    var row  = rows[r];
    var name = (row[COL.EMP] || '').trim();
    if (!name || !isNaN(Number(name))) continue;

    var mgr  = (row[COL.MGR] || '').trim();
    var jtgt = Number(row[COL.JTGT]) || 0;
    var jach = Number(row[COL.JACH]) || 0;
    var jpct = jtgt > 0 ? (jach / jtgt) * 100 : 0;

    var mw = [COL.MW1,COL.MW2,COL.MW3,COL.MW4].map(function(c){ return Number(row[c])||0; });
    var jw = [COL.JW1,COL.JW2,COL.JW3,COL.JW4].map(function(c){ return Number(row[c])||0; });
    var aw = [COL.AW1,COL.AW2,COL.AW3,COL.AW4,COL.AW5].map(function(c){ return Number(row[c])||0; });
    var zv = [mw[3]].concat(jw.slice(0, ja));

    var zf     = calcZ(zv);
    var streak = calcStreak(zv);
    var trend  = calcTrend(zv);
    var rec    = calcRec(zv);
    var risk   = calcRisk(jpct, zf);
    var score  = calcScore(jpct, rec, zv, streak);

    EX.push({ name:name, mgr:mgr, jtgt:jtgt, jach:jach, jpct:jpct,
               aw:aw, mw:mw, jw:jw, zv:zv, ja:ja,
               zf:zf, streak:streak, trend:trend, rec:rec, risk:risk, score:score });
  }
}

// ── LOGIC ────────────────────────────────────────────────────
function calcZ(v) {
  if (v.length < 2) return null;
  if (v[v.length-2]===0 && v[v.length-1]>0) return 'RECOVERY';
  var z=0;
  for (var i=v.length-1; i>=0; i--) { if(v[i]===0) z++; else break; }
  if (z>=4) return 'Z4';
  if (z>=3) return 'Z3';
  if (z>=2) return 'Z2';
  if (z===0) return 'OK';
  return null;
}
function calcStreak(v) { var s=0; for(var i=v.length-1;i>=0;i--){if(v[i]>0)s++;else break;} return s; }
function calcTrend(v)  { if(v.length<2)return'→'; return v[v.length-1]>v[v.length-2]?'▲':v[v.length-1]<v[v.length-2]?'▼':'→'; }
function calcRec(v)    { var c=0; for(var i=1;i<v.length;i++) if(v[i-1]===0&&v[i]>0) c++; return c; }
function calcRisk(p,z) { if(z==='Z3'||z==='Z4') return 'CRITICAL'; return p>=80?'GREEN':p>=50?'AMBER':'RED'; }
function calcScore(p,r,v,s) {
  var nz=0; for(var i=0;i<v.length;i++) if(v[i]>0) nz++;
  var cons = v.length ? (nz/v.length)*100 : 0;
  return Math.round( Math.min(p,100)*0.4 + cons*0.2 + Math.min(r*33,100)*0.2 + Math.min(s*25,100)*0.2 );
}

// ── RENDER ALL ───────────────────────────────────────────────
function renderAll() {
  if (!EX || EX.length === 0) { console.warn('No executives to render'); return; }
  renderKPIs();
  renderMgrStats();
  initMap();
  renderExecTable();
  renderDonuts();
  renderManagersPage();
  renderLeaderboard();
  renderZPage();
  renderHeatmap();
  renderRecovery();
}

// ── KPIs ─────────────────────────────────────────────────────
function renderKPIs() {
  var tgt=0, ach=0, zc=0;
  EX.forEach(function(e){ tgt+=e.jtgt; ach+=e.jach; if(['Z2','Z3','Z4'].indexOf(e.zf)>=0) zc++; });
  var pct = tgt>0 ? ((ach/tgt)*100).toFixed(1) : 0;

  setText('k-team',  EX.length);
  setText('k-team-s','Bommasandara Branch');
  setText('k-ach',   ach + '/' + tgt);
  setText('k-ach-s', pct + '% achievement');
  setText('k-z',     zc);
  setText('k-z-s',   zc > 0 ? 'Action required' : 'All clear ✓');
}

// ── MANAGER STATS ─────────────────────────────────────────────
function renderMgrStats() {
  var map = mgrMap();
  var html = '';
  var entries = Object.entries(map).filter(function(x){ return x[1].size > 0; });
  entries.forEach(function(entry, i) {
    var nm = entry[0], m = entry[1];
    var pct = m.tgt > 0 ? (m.ach / m.tgt) * 100 : 0;
    var c   = PC[i % PC.length];
    var pc  = pct>=80 ? '#1a9e5c' : pct>=50 ? '#d97706' : '#e53e3e';
    var za  = m.z4>0 ? '<span class="mzc" style="background:rgba(185,28,28,.1);color:#b91c1c;border:1px solid rgba(185,28,28,.3)">Z4:'+m.z4+'</span>'
            : m.z3>0 ? '<span class="mzc" style="background:rgba(229,62,62,.1);color:#e53e3e;border:1px solid rgba(229,62,62,.3)">Z3:'+m.z3+'</span>'
            : m.z2>0 ? '<span class="mzc" style="background:rgba(217,119,6,.1);color:#d97706;border:1px solid rgba(217,119,6,.3)">Z2:'+m.z2+'</span>'
            : '<span class="mzc" style="background:rgba(26,158,92,.1);color:#1a9e5c;border:1px solid rgba(26,158,92,.3)">✓ OK</span>';
    html += '<div class="mgr-row">'
      + '<div class="mav" style="background:' + c + '">' + nm[0] + '</div>'
      + '<div class="mmid">'
        + '<div class="mname">' + nm + '</div>'
        + '<div class="minfo"><span>T<b>'+m.size+'</b></span><span>Tgt<b>'+m.tgt+'</b></span><span>Ach<b>'+m.ach+'</b></span><span>Rec<b style="color:#1a9e5c">'+m.rec+'</b></span></div>'
        + '<div class="mbar"><div class="mfill" style="width:'+Math.min(pct,100)+'%;background:'+c+'"></div></div>'
        + '<div style="margin-top:3px">' + za + '</div>'
      + '</div>'
      + '<div class="mpct" style="color:'+pc+'">' + pct.toFixed(0) + '%</div>'
      + '</div>';
  });
  setHTML('mgrStats', html || '<div style="color:var(--t3);padding:8px">No manager data</div>');
}

// ── MAP ───────────────────────────────────────────────────────
var AREAS=[
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

function getAV(a){ return CVIEW==='data'?a.td : CVIEW==='paid'?a.ps : a.cv*100; }
function getAL(a){ return CVIEW==='data'?a.td.toLocaleString() : CVIEW==='paid'?a.ps : a.cv+'%'; }

function initMap() {
  if (LMAP) { drawCircles(); return; }
  var el = document.getElementById('dashMap');
  if (!el) { console.warn('dashMap not found'); return; }
  LMAP = L.map('dashMap', {center:[12.83,77.62], zoom:10, zoomControl:true, attributionControl:false});
  // Light tile for light theme
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {subdomains:'abcd', maxZoom:19}).addTo(LMAP);
  drawCircles();
}

function drawCircles() {
  if (!LMAP) return;
  CIRCLES.forEach(function(c){ LMAP.removeLayer(c); });
  LABELS.forEach(function(l){ LMAP.removeLayer(l); });
  CIRCLES=[]; LABELS=[];

  var vals = AREAS.map(function(a){ return getAV(a); });
  var maxV = Math.max.apply(null, vals);

  AREAS.forEach(function(a, i) {
    var v = vals[i];
    var radius = 9 + (v / maxV) * 36;
    var color = PC[i % PC.length];
    var isHot = v > maxV * 0.4;

    var circle = L.circleMarker([a.lat, a.lng], {
      radius: radius,
      fillColor: color,
      color: '#fff',
      weight: isHot ? 2.5 : 1.5,
      opacity: 1,
      fillOpacity: isHot ? 0.88 : 0.70
    }).addTo(LMAP);

    (function(area, col){
      circle.on('click', function() {
        L.popup({className:'bpop', maxWidth:250, closeButton:true})
          .setLatLng([area.lat, area.lng])
          .setContent(
            '<div class="pin">'
            + '<div class="pname">📍 ' + area.n + '</div>'
            + '<div class="ppinc">Pincode: ' + area.p + '</div>'
            + '<div class="pgrid">'
            + '<div class="pi"><div class="pv">' + area.td.toLocaleString() + '</div><div class="pl">Total Data</div></div>'
            + '<div class="pi"><div class="pv" style="color:#c882a0">' + area.ps + '</div><div class="pl">Paid Sellers</div></div>'
            + '<div class="pi"><div class="pv" style="color:#5aaa8a">' + area.ga.toLocaleString() + '</div><div class="pl">GST Active</div></div>'
            + '<div class="pi"><div class="pv" style="color:#d97706">' + area.s6 + '</div><div class="pl">Sales 6M</div></div>'
            + '</div>'
            + '<div class="pfoot">📈 Conv: <b>' + area.cv + '%</b> &nbsp;|&nbsp; 🤝 Meet: <b>' + area.mp + '%</b></div>'
            + '</div>'
          )
          .openOn(LMAP);
      });
    })(a, color);

    circle.bindTooltip(
      '<b style="font-size:13px;color:#1a1a2e">' + a.n + '</b><br>'
      + '<span style="font-size:11px;color:#4a5568">' + getAL(a) + '</span>',
      { direction:'top', offset:[0,-radius] }
    );

    var lbl = L.divIcon({
      className:'',
      html: '<div style="background:' + color + ';color:#1a1a2e;font-size:9px;font-weight:900;font-family:Nunito,sans-serif;padding:2px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.2)">' + a.n + '</div>',
      iconAnchor: [-(radius+2), 8]
    });
    LABELS.push(L.marker([a.lat, a.lng], {icon:lbl, interactive:false}).addTo(LMAP));
    CIRCLES.push(circle);
  });
}

function setV(v, btn) {
  CVIEW = v;
  document.querySelectorAll('.mb').forEach(function(b){ b.classList.remove('act'); });
  btn.classList.add('act');
  drawCircles();
}

// ── EXEC TABLE ───────────────────────────────────────────────
function renderExecTable() {
  if (!EX || EX.length === 0) {
    setHTML('execBody','<tr><td colspan="6" class="loading">No data — check CSV URL in app.js</td></tr>');
    return;
  }
  var sorted = EX.slice().sort(function(a,b){ return b.jpct - a.jpct; });
  var ZC={Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
  var ZBG={Z4:'rgba(185,28,28,.1)',Z3:'rgba(229,62,62,.08)',Z2:'rgba(217,119,6,.08)',RECOVERY:'rgba(26,158,92,.08)',OK:'rgba(26,158,92,.06)'};
  var html = '';
  sorted.forEach(function(e, i) {
    var pc = e.jpct>=80?'#1a9e5c': e.jpct>=50?'#d97706':'#e53e3e';
    var zc = ZC[e.zf] || '#8892a4';
    var zb = ZBG[e.zf] || 'transparent';
    html += '<tr>'
      + '<td style="font-size:14px;width:26px">' + (i<3 ? MEDALS[i] : '<span style="color:#8892a4;font-weight:800;font-size:12px">'+(i+1)+'</span>') + '</td>'
      + '<td style="font-weight:'+(i<3?800:700)+'">' + e.name + '</td>'
      + '<td>' + e.mgr + '</td>'
      + '<td style="font-weight:800">' + e.jach + '/' + e.jtgt + '</td>'
      + '<td style="font-weight:800;color:'+pc+'">' + e.jpct.toFixed(0) + '%</td>'
      + '<td><span class="zch" style="background:'+zb+';color:'+zc+';border-color:'+zc+'">' + (e.zf||'—') + '</span></td>'
      + '</tr>';
  });
  setHTML('execBody', html);
}

// ── DONUTS ────────────────────────────────────────────────────
function renderDonuts() {
  var totTD = AREAS.reduce(function(a,x){ return a+x.td; }, 0);
  var totPS = AREAS.reduce(function(a,x){ return a+x.ps; }, 0);
  var avgCV = (AREAS.reduce(function(a,x){ return a+x.cv; },0) / AREAS.length).toFixed(1);

  function mkDonut(id, vidId, sidId, data, colors, valLabel, subLabel) {
    var ctx = document.getElementById(id);
    if (!ctx) return;
    if (DCHARTS[id]) DCHARTS[id].destroy();
    DCHARTS[id] = new Chart(ctx, {
      type:'doughnut',
      data:{ datasets:[{ data:data, backgroundColor:colors, borderWidth:0, cutout:'68%' }] },
      options:{ responsive:false, plugins:{ legend:{display:false}, tooltip:{enabled:false} } }
    });
    setText(vidId, valLabel);
    setText(sidId, subLabel);
  }

  mkDonut('d1','dv1','ds1', [totPS, Math.max(0,totTD-totPS)], ['#819dcc','rgba(129,157,204,0.2)'],
          totTD.toLocaleString(), 'Total listings');
  mkDonut('d2','dv2','ds2', [totPS, Math.max(0,totTD-totPS)], ['#b8e1d3','rgba(184,225,211,0.2)'],
          totPS, 'Paid sellers');
  mkDonut('d3','dv3','ds3', [parseFloat(avgCV), Math.max(0,5-parseFloat(avgCV))], ['#eac3d5','rgba(234,195,213,0.2)'],
          avgCV+'%', 'Avg conv rate');
}

// ── MANAGERS PAGE ─────────────────────────────────────────────
function renderManagersPage() {
  var map = mgrMap();
  var html = '';
  Object.entries(map).filter(function(x){ return x[1].size>0; }).forEach(function(entry, i) {
    var nm=entry[0], m=entry[1];
    var pct = m.tgt>0 ? (m.ach/m.tgt)*100 : 0;
    var c = PC[i%PC.length];
    var pc = pct>=80?'#1a9e5c':pct>=50?'#d97706':'#e53e3e';
    var as = m.streaks.length ? (m.streaks.reduce(function(a,b){return a+b;},0)/m.streaks.length).toFixed(1) : 0;
    html += '<div class="mc">'
      + '<div class="mct" style="background:linear-gradient(90deg,'+c+','+c+'88)"></div>'
      + '<div class="mch">'
        + '<div><div class="mcn">'+nm+'</div><div class="mcsz">'+m.size+' executives</div></div>'
        + '<div class="mcp" style="color:'+pc+'">'+pct.toFixed(0)+'%</div>'
      + '</div>'
      + '<div class="mcnote">Target: '+m.tgt+' → Achieved: '+m.ach+'</div>'
      + '<div class="mcbar"><div class="mcfill" style="width:'+Math.min(pct,100)+'%;background:'+c+'"></div></div>'
      + '<div class="mcst">'
        + '<div><div class="msv" style="color:'+c+'">'+m.size+'</div><div class="msl">Team</div></div>'
        + '<div><div class="msv" style="color:'+pc+'">'+pct.toFixed(0)+'%</div><div class="msl">Ach%</div></div>'
        + '<div><div class="msv" style="color:#1a9e5c">'+m.rec+'</div><div class="msl">Rec↑</div></div>'
      + '</div>'
      + '<div class="mczr">'
        + '<div class="mzcc" style="background:rgba(217,119,6,.1);color:#d97706">Z2: '+m.z2+'</div>'
        + '<div class="mzcc" style="background:rgba(229,62,62,.1);color:#e53e3e">Z3: '+m.z3+'</div>'
        + '<div class="mzcc" style="background:rgba(185,28,28,.1);color:#b91c1c">Z4: '+m.z4+'</div>'
        + '<div class="mzcc" style="background:rgba(129,157,204,.15);color:#819dcc">Str: '+as+'w</div>'
      + '</div>'
      + '</div>';
  });
  setHTML('mgrGrid', html);
}

// ── LEADERBOARD ──────────────────────────────────────────────
function renderLeaderboard() {
  var sorted = EX.slice().sort(function(a,b){ return b.jpct-a.jpct; });
  var html = '';
  sorted.forEach(function(e, i) {
    var pc = e.jpct>=80?'pp-g':e.jpct>=50?'pp-a':'pp-r';
    var rc = {GREEN:'rc-G',AMBER:'rc-A',RED:'rc-R',CRITICAL:'rc-C'}[e.risk]||'rc-R';
    var tc = e.trend==='▲'?'tu':e.trend==='▼'?'td':'ts';
    html += '<tr>'
      + '<td>'+(i<3?MEDALS[i]:'<span style="color:#8892a4;font-weight:800">'+(i+1)+'</span>')+'</td>'
      + '<td style="font-weight:800">'+e.name+'</td>'
      + '<td style="color:#8892a4">'+e.mgr+'</td>'
      + '<td style="color:#8892a4">'+e.jtgt+'</td>'
      + '<td style="font-weight:800">'+e.jach+'</td>'
      + '<td><span class="pp '+pc+'">'+e.jpct.toFixed(1)+'%</span></td>'
      + '<td style="color:#8892a4">'+e.streak+'w</td>'
      + '<td style="color:#819dcc;font-weight:800">'+e.score+'</td>'
      + '<td class="'+tc+'">'+e.trend+'</td>'
      + '<td><span class="rc '+rc+'">'+e.risk+'</span></td>'
      + '</tr>';
  });
  setHTML('lbBody', html);
}

// ── Z PAGE ───────────────────────────────────────────────────
function renderZPage() {
  var list = EX.filter(function(e){ return ['Z2','Z3','Z4'].indexOf(e.zf)>=0; })
    .sort(function(a,b){ return ({Z4:0,Z3:1,Z2:2}[a.zf]||9) - ({Z4:0,Z3:1,Z2:2}[b.zf]||9); });
  if (!list.length) {
    setHTML('zcGrid','<div class="card" style="text-align:center;padding:48px;color:#1a9e5c;font-size:18px;font-weight:800">✅ No Z escalations this period!</div>');
    return;
  }
  var act={Z4:'🚨 Escalate to BM immediately',Z3:'⚠ Manager Review + PIP',Z2:'📋 Immediate 1:1 Coaching'};
  var html='';
  list.forEach(function(e){
    html += '<div class="zc '+e.zf.toLowerCase()+'">'
      + '<div class="zflag">'+e.zf+'</div>'
      + '<div class="zname">'+e.name+'</div>'
      + '<div class="zmgr">Manager: '+e.mgr+'</div>'
      + '<div class="zst">'
        + '<div class="zcs"><div class="zcsv">'+e.jpct.toFixed(0)+'%</div><div class="zcsl">Jun Ach</div></div>'
        + '<div class="zcs"><div class="zcsv">'+e.streak+'w</div><div class="zcsl">Streak</div></div>'
        + '<div class="zcs"><div class="zcsv">'+e.score+'</div><div class="zcsl">Score</div></div>'
        + '<div class="zcs"><div class="zcsv">'+e.trend+'</div><div class="zcsl">Trend</div></div>'
      + '</div>'
      + '<div class="zact">'+(act[e.zf]||'')+'</div>'
      + '</div>';
  });
  setHTML('zcGrid', html);
}

// ── HEATMAP ──────────────────────────────────────────────────
function renderHeatmap() {
  var sorted = EX.slice().sort(function(a,b){ return b.jpct-a.jpct; });
  var day=new Date().getDate(), mo=new Date().getMonth();
  var ja=0; if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  var wh=['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
  var hdr='<tr><th style="text-align:left">Employee</th><th style="text-align:left">Mgr</th>'
    + wh.map(function(h,i){return '<th class="'+(i===1?'hsep':'')+'">'+h+'</th>';}).join('')
    + '<th>Ach</th><th>Tgt</th><th>%</th><th>Z</th></tr>';
  var rows='';
  sorted.forEach(function(e){
    var aw=[e.mw[3]].concat(e.jw);
    var wc=aw.map(function(v,wi){
      var f=wi>0&&(wi-1)>=ja;
      return '<td class="'+(f?'hf':v>0?'hs':'hz')+' '+(wi===1?'hsep':'')+'">'+(f?'▪':v>0?v:'✗')+'</td>';
    }).join('');
    var pc=e.jpct>=80?'#1a9e5c':e.jpct>=50?'#d97706':'#e53e3e';
    var zc={Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'}[e.zf]||'#8892a4';
    rows+='<tr><td class="hn">'+e.name+'</td><td class="hm2">'+e.mgr+'</td>'+wc
      +'<td style="font-weight:800">'+e.jach+'</td>'
      +'<td style="color:#8892a4">'+e.jtgt+'</td>'
      +'<td style="font-weight:800;color:'+pc+'">'+e.jpct.toFixed(0)+'%</td>'
      +'<td style="font-weight:800;color:'+zc+'">'+(e.zf||'—')+'</td></tr>';
  });
  setHTML('hmWrap','<table class="hmtbl"><thead>'+hdr+'</thead><tbody>'+rows+'</tbody></table>');
}

// ── RECOVERY ─────────────────────────────────────────────────
function renderRecovery() {
  var champs = EX.filter(function(e){ return e.rec>0; }).sort(function(a,b){ return b.rec-a.rec; });
  var meds=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];
  if (!champs.length) {
    setHTML('champGrid','<div class="card" style="text-align:center;padding:48px;color:#8892a4;font-size:15px">No recoveries this period</div>');
    return;
  }
  var html='';
  champs.forEach(function(e,i){
    html+='<div class="cc"><div class="ccmed">'+(meds[i]||'★')+'</div>'
      +'<div class="ccname">'+e.name+'</div><div class="ccmgr">'+e.mgr+'</div>'
      +'<div class="cccnt">'+e.rec+'</div><div class="cclbl">Recoveries</div></div>';
  });
  setHTML('champGrid', html);
}

// ── HELPERS ──────────────────────────────────────────────────
function setText(id, v) { var el=document.getElementById(id); if(el) el.textContent=v; }
function setHTML(id, h) { var el=document.getElementById(id); if(el) el.innerHTML=h; }
function setSyncLbl(t)  { setText('syncLbl', t); }

function mgrMap() {
  var map = {};
  MGRS.forEach(function(m){ map[m]={size:0,tgt:0,ach:0,z2:0,z3:0,z4:0,streaks:[],rec:0}; });
  EX.forEach(function(e) {
    var k = null;
    for (var i=0;i<MGRS.length;i++) {
      if (e.mgr===MGRS[i] || e.mgr.toLowerCase()===MGRS[i].toLowerCase()) { k=MGRS[i]; break; }
    }
    if (!k) k = e.mgr;
    if (!map[k]) map[k]={size:0,tgt:0,ach:0,z2:0,z3:0,z4:0,streaks:[],rec:0};
    map[k].size++; map[k].tgt+=e.jtgt; map[k].ach+=e.jach;
    if(e.zf==='Z2')map[k].z2++; if(e.zf==='Z3')map[k].z3++; if(e.zf==='Z4')map[k].z4++;
    map[k].streaks.push(e.streak); map[k].rec+=e.rec;
  });
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
  buildExecs(rows);
  renderAll();
  setSyncLbl('Demo data • Paste your CSV URL in app.js');
}
