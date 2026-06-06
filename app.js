// ═══════════════════════════════════════════════════
// BOMMASANDARA PERFORMANCE TRACKER — Full Feature
// ═══════════════════════════════════════════════════
var SHEET_CSV_URL = "YOUR_GOOGLE_SHEET_CSV_URL_HERE";

var COL={EMP:0,MGR:1,DOJ:2,DAYS:3,BKT:4,TAPR:5,AAPR:6,MPCT:7,
  JTGT:8,JACH:9,JPCT:10,
  AW1:11,AW2:12,AW3:13,AW4:14,AW5:15,
  MW1:16,MW2:17,MW3:18,MW4:19,
  JW1:20,JW2:21,JW3:22,JW4:23};

// PRANAV NOT SHOWN IN DONUTS
var MGR_DONUTS = ["Annesh","Mohan","Arun","Manoj C Y"];
var MGRS_ALL   = ["Annesh","Mohan","Arun","Manoj C Y","Pranav"];
var PC = ["#819dcc","#95b7d0","#b8e1d3","#d6eadf","#eac3d5"];
var MEDALS = ["🥇","🥈","🥉"];
var PTITLES = {dashboard:"Dashboard",managers:"Manager Performance",
  leaderboard:"Leaderboard",heatmap:"Weekly Heatmap",summary:"BI Summary"};
var CUR_MONTH = "Jun";
var MONTH_LABELS = {Apr:"April 2026",May:"May 2026",Jun:"June 2026",Jul:"July 2026"};

var EX=[], LMAP=null, CIRCLES=[], LABELS=[], CVIEW='data';
var DCHARTS={}, MDC_CHARTS={};
// Heatmap manual overrides: key = "name_weekIdx", value = number
var HM_OVERRIDES = {};
// Current cell edit context
var CELL_CTX = null;

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
  loadLogo();
  loadHmOverrides();
  loadData();
  // Close dropdowns on outside click
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.mdrop-wrap')) closeDrop('mDrop');
    if (!e.target.closest('.sbox')) {
      var d = document.getElementById('searchDrop');
      if(d) d.style.display='none';
    }
  });
});

// ── LOGO ──────────────────────────────────────────────────────
function uploadLogo(e) {
  var f=e.target.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(ev){
    var u=ev.target.result;
    var img=document.getElementById('lionImg');
    if(img){img.src=u;img.style.display='block';}
    var fb=document.getElementById('lionFb');
    if(fb) fb.style.display='none';
    try{localStorage.setItem('blogo',u);}catch(e){}
  };
  r.readAsDataURL(f);
}
function loadLogo(){
  try{
    var u=localStorage.getItem('blogo');
    if(u){
      var img=document.getElementById('lionImg');
      if(img){img.src=u;img.style.display='block';}
      var fb=document.getElementById('lionFb');
      if(fb) fb.style.display='none';
    }
  }catch(e){}
}

// ── NAV ───────────────────────────────────────────────────────
function navTo(pg,el){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('active');});
  var pgEl=document.getElementById('pg-'+pg);
  if(pgEl) pgEl.classList.add('active');
  if(el) el.classList.add('active');
  var ttl=document.getElementById('pageTitle');
  if(ttl) ttl.textContent=PTITLES[pg]||pg;
  if(pg==='dashboard'&&LMAP) setTimeout(function(){LMAP.invalidateSize();},150);
  if(pg==='heatmap') renderHeatmap();
  if(pg==='summary') renderBI();
}

// ── MONTH DROPDOWN ────────────────────────────────────────────
function toggleMDrop(){
  var d=document.getElementById('mDrop');
  if(!d) return;
  d.style.display = d.style.display==='block'?'none':'block';
}
function closeDrop(id){
  var d=document.getElementById(id);
  if(d) d.style.display='none';
}
function setMonth(m,el){
  CUR_MONTH=m;
  var btn=document.getElementById('mBtn');
  if(btn) btn.textContent=(MONTH_LABELS[m]||m)+' ▾';
  document.querySelectorAll('#mDrop div').forEach(function(d){d.classList.remove('sel');});
  if(el) el.classList.add('sel');
  closeDrop('mDrop');
  renderAll();
}

// ── SEARCH (working) ──────────────────────────────────────────
function doSearch(q){
  var drop=document.getElementById('searchDrop');
  if(!drop) return;
  if(!q||q.length<1){drop.style.display='none';return;}
  q=q.toLowerCase();
  var matches=EX.filter(function(e){
    return e.name.toLowerCase().indexOf(q)>=0 || e.mgr.toLowerCase().indexOf(q)>=0;
  }).slice(0,8);
  if(!matches.length){drop.style.display='none';return;}
  drop.innerHTML=matches.map(function(e){
    var pc=e.jpct>=80?'#1a9e5c':e.jpct>=50?'#d97706':'#e53e3e';
    var zc={Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'}[e.zf]||'#8892a4';
    return '<div class="sdrop-item" onclick="openSearchDetail(\''+e.name+'\')">'
      +'<div class="sdrop-name">'+e.name+' <span style="font-size:10px;color:'+zc+';font-weight:800">'+(e.zf||'')+'</span></div>'
      +'<div class="sdrop-sub">'+e.mgr+' · <span style="color:'+pc+';font-weight:700">'+e.jpct.toFixed(0)+'% Jun</span> · Ach: '+e.jach+'/'+e.jtgt+'</div>'
      +'</div>';
  }).join('');
  drop.style.display='block';
}

function openSearchDetail(name){
  var e=null;
  for(var i=0;i<EX.length;i++){if(EX[i].name===name){e=EX[i];break;}}
  if(!e) return;
  document.getElementById('searchDrop').style.display='none';
  document.getElementById('searchInput').value='';
  var pc=e.jpct>=80?'#1a9e5c':e.jpct>=50?'#d97706':'#e53e3e';
  var ZC={Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
  var zc=ZC[e.zf]||'#8892a4';
  var wh=['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
  var wv=[e.mw[3]].concat(e.jw);
  var whtml=wh.map(function(w,i){
    var v=getHmVal(e.name,i,wv[i]);
    return '<div style="text-align:center;padding:6px;background:'+(v>0?'rgba(26,158,92,.1)':'rgba(229,62,62,.06)')+';border-radius:6px">'
      +'<div style="font-size:8px;color:var(--t3)">'+w+'</div>'
      +'<div style="font-size:16px;font-weight:900;color:'+(v>0?'#1a9e5c':'#e53e3e')+'">'+(v>0?v:'✗')+'</div></div>';
  }).join('');
  setHTML('searchPopBody',
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
    +'<div style="width:44px;height:44px;border-radius:50%;background:'+pc+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:900">'+e.name[0]+'</div>'
    +'<div><div style="font-family:Syne,sans-serif;font-size:16px;font-weight:800">'+e.name+'</div>'
    +'<div style="font-size:11px;color:var(--t3)">Manager: '+e.mgr+'</div></div>'
    +'<div style="margin-left:auto;text-align:right"><div style="font-family:Syne,sans-serif;font-size:20px;font-weight:800;color:'+pc+'">'+e.jpct.toFixed(0)+'%</div>'
    +'<div style="font-size:10px;color:var(--t3)">'+e.jach+'/'+e.jtgt+'</div></div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:14px">'+whtml+'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +'<div style="background:rgba(129,157,204,.1);padding:6px 10px;border-radius:7px;font-size:11px"><b>Z Status:</b> <span style="color:'+zc+';font-weight:800">'+(e.zf||'OK')+'</span></div>'
    +'<div style="background:rgba(129,157,204,.1);padding:6px 10px;border-radius:7px;font-size:11px"><b>Streak:</b> '+e.streak+'w</div>'
    +'<div style="background:rgba(129,157,204,.1);padding:6px 10px;border-radius:7px;font-size:11px"><b>Recoveries:</b> '+e.rec+'</div>'
    +'<div style="background:rgba(129,157,204,.1);padding:6px 10px;border-radius:7px;font-size:11px"><b>Score:</b> '+e.score+'</div>'
    +'</div>'
  );
  document.getElementById('searchPopTitle').textContent=e.name+' — Detail';
  openPop('searchPop');
}

// ── DATA LOAD ─────────────────────────────────────────────────
function loadData(){
  setText('syncLbl','Syncing…');
  if(!SHEET_CSV_URL||SHEET_CSV_URL.indexOf('YOUR_GOOGLE')>=0){loadDemo();return;}
  fetch(SHEET_CSV_URL+'&t='+Date.now())
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text();})
    .then(function(csv){buildExecs(parseCSV(csv));renderAll();setText('syncLbl','Synced '+new Date().toLocaleTimeString('en-IN'));})
    .catch(function(err){console.warn('Sheet failed:',err.message);loadDemo();});
}

function parseCSV(txt){
  return txt.trim().split('\n').map(function(line){
    var cells=[],cur='',q=false;
    for(var i=0;i<line.length;i++){
      if(line[i]==='"'){q=!q;continue;}
      if(line[i]===','&&!q){cells.push(cur.trim());cur='';continue;}
      cur+=line[i];
    }
    cells.push(cur.trim());return cells;
  });
}

// ── BUILD EXECUTIVES ──────────────────────────────────────────
function buildExecs(rows,startRow){
  EX=[];
  var sr = startRow||2;
  var day=new Date().getDate(),mo=new Date().getMonth(),ja=0;
  if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  for(var r=sr;r<rows.length;r++){
    var row=rows[r];
    var name=(row[COL.EMP]||'').trim();
    if(!name||!isNaN(Number(name)))continue;
    var mgr=(row[COL.MGR]||'').trim();
    var jtgt=Number(row[COL.JTGT])||0,jach=Number(row[COL.JACH])||0;
    var jpct=jtgt>0?(jach/jtgt)*100:0;
    var mw=[COL.MW1,COL.MW2,COL.MW3,COL.MW4].map(function(c){return Number(row[c])||0;});
    var jw=[COL.JW1,COL.JW2,COL.JW3,COL.JW4].map(function(c){return Number(row[c])||0;});
    var aw=[COL.AW1,COL.AW2,COL.AW3,COL.AW4,COL.AW5].map(function(c){return Number(row[c])||0;});
    var zv=[mw[3]].concat(jw.slice(0,ja));
    var zf=calcZ(zv),streak=calcStreak(zv),trend=calcTrend(zv);
    var rec=calcRec(zv),risk=calcRisk(jpct,zf),score=calcScore(jpct,rec,zv,streak);
    // May total = sum of may weeks
    var mayTotal=mw.reduce(function(a,b){return a+b;},0);
    EX.push({name:name,mgr:mgr,jtgt:jtgt,jach:jach,jpct:jpct,aw:aw,mw:mw,jw:jw,
      zv:zv,ja:ja,zf:zf,streak:streak,trend:trend,rec:rec,risk:risk,score:score,mayTotal:mayTotal});
  }
}

function calcZ(v){if(v.length<2)return null;if(v[v.length-2]===0&&v[v.length-1]>0)return'RECOVERY';var z=0;for(var i=v.length-1;i>=0;i--){if(v[i]===0)z++;else break;}return z>=4?'Z4':z>=3?'Z3':z>=2?'Z2':z===0?'OK':null;}
function calcStreak(v){var s=0;for(var i=v.length-1;i>=0;i--){if(v[i]>0)s++;else break;}return s;}
function calcTrend(v){if(v.length<2)return'→';return v[v.length-1]>v[v.length-2]?'▲':v[v.length-1]<v[v.length-2]?'▼':'→';}
function calcRec(v){var c=0;for(var i=1;i<v.length;i++)if(v[i-1]===0&&v[i]>0)c++;return c;}
function calcRisk(p,z){if(z==='Z3'||z==='Z4')return'CRITICAL';return p>=80?'GREEN':p>=50?'AMBER':'RED';}
function calcScore(p,r,v,s){var nz=0;for(var i=0;i<v.length;i++)if(v[i]>0)nz++;var cons=v.length?(nz/v.length)*100:0;return Math.round(Math.min(p,100)*0.4+cons*0.2+Math.min(r*33,100)*0.2+Math.min(s*25,100)*0.2);}

// ── RENDER ALL ────────────────────────────────────────────────
function renderAll(){
  if(!EX||EX.length===0){console.warn('No exec data');return;}
  renderKPIs();
  renderMgrDonuts();
  initMap();
  renderExecTable();
  renderDonuts();
  renderManagersPage();
  renderLeaderboard();
  renderHeatmap();
}

// ── KPIs ──────────────────────────────────────────────────────
function renderKPIs(){
  // totals
  var tgt=0, ach=0, zc=0;
  for(var i=0;i<EX.length;i++){
    tgt += EX[i].jtgt;
    ach += EX[i].jach;
    if(EX[i].zf==='Z2'||EX[i].zf==='Z3'||EX[i].zf==='Z4') zc++;
  }
  var pct = tgt>0 ? ((ach/tgt)*100).toFixed(1) : '0.0';

  // leakage = sum of cancelled sales entered manually in heatmap
  var totalLeakage = 0;
  for(var i=0; i<EX.length; i++){
    var lk = HM_OVERRIDES[EX[i].name + '_leak'];
    if(lk) totalLeakage += Number(lk)||0;
  }
  var leakPct = totalLeakage; // show as absolute count, not %
  var zeroCount = 0;
  for(var i=0; i<EX.length; i++){ if(EX[i].jach===0) zeroCount++; }

  // COCA
  var paidCount = 0;
  for(var i=0;i<EX.length;i++){ if(EX[i].jach>0) paidCount++; }
  var branchCostEl = document.getElementById('branchCost');
  var branchCost = branchCostEl ? (parseFloat(branchCostEl.value)||200000) : 200000;
  var coca = paidCount>0 ? Math.round(branchCost/paidCount) : 0;
  var cocaTxt = paidCount===0 ? 'No sales' : (coca>=1000 ? '₹'+(coca/1000).toFixed(0)+'K' : '₹'+coca);

  // Set all KPI values
  var kt = document.getElementById('k-team');   if(kt) kt.textContent = EX.length;
  var kts= document.getElementById('k-ts');     if(kts) kts.textContent = 'Bommasandara Branch';
  var ka = document.getElementById('k-ach');    if(ka) ka.textContent = ach+'/'+tgt;
  var kas= document.getElementById('k-as');     if(kas) kas.textContent = pct+'% achievement';
  var kz = document.getElementById('k-z');      if(kz) kz.textContent = zc;
  var kzs= document.getElementById('k-zs');     if(kzs) kzs.textContent = zc>0?'Click to view':'All clear ✓';
  var kc = document.getElementById('k-coca');   if(kc) kc.textContent = cocaTxt;
  var kcs= document.getElementById('k-coca-s'); if(kcs) kcs.textContent = paidCount+' paid clients';
  var kl = document.getElementById('k-leak');   if(kl) kl.textContent = leakPct+'%';
  var kls= document.getElementById('k-lks');    if(kls) kls.textContent = zeroCount+' zero-sale execs';
}

function calcCOCA(){
  // COCA = Total Branch Cost / Total Sales
  // Total Branch Cost = (40K × execs) + (50K × managers) + 100K (BM) + 5L (Ops) + 1L (Rent)
  var numExec = EX.length;
  var numMgr  = MGRS_ALL.length; // 5 managers
  var execCost   = 40000  * numExec;
  var mgrCost    = 50000  * numMgr;
  var bmCost     = 100000;  // 1 BM (fixed)
  var opsCost    = 500000;  // operations
  var rentCost   = 100000;  // branch rent
  var totalCost  = execCost + mgrCost + bmCost + opsCost + rentCost;

  // Total sales = sum of all executive achievements
  var totalSales = 0;
  for(var i=0; i<EX.length; i++) totalSales += EX[i].jach;

  var coca = totalSales > 0 ? Math.round(totalCost / totalSales) : 0;
  var txt  = totalSales === 0 ? 'No sales' : (coca >= 1000 ? '₹' + Math.round(coca/1000) + 'K' : '₹' + coca);
  var ideal_coca = 19000;
  var ideal_sales_needed = Math.ceil(totalCost / ideal_coca);
  var coca_vs_ideal = totalSales > 0 ? (coca <= ideal_coca ? '✓ At ideal' : 'Need ' + (ideal_sales_needed - totalSales) + ' more sales') : 'Need ' + ideal_sales_needed + ' sales';
  var sub  = 'Ideal ₹19K · ' + coca_vs_ideal;

  var kc  = document.getElementById('k-coca');   if(kc)  kc.textContent  = txt;
  var kcs = document.getElementById('k-coca-s'); if(kcs) kcs.textContent = sub;
}



// ── MANAGER DONUTS ────────────────────────────────────────────
function renderMgrDonuts(){
  var map=mgrMap();
  var row=document.getElementById('mgrDonuts');
  if(!row) return;
  var keys=Object.keys(MDC_CHARTS);
  for(var i=0;i<keys.length;i++){if(MDC_CHARTS[keys[i]])MDC_CHARTS[keys[i]].destroy();}
  MDC_CHARTS={};
  row.innerHTML='';
  MGR_DONUTS.forEach(function(name,idx){
    var m=map[name];
    if(!m||m.size===0) return;
    var pct=m.tgt>0?(m.ach/m.tgt)*100:0;
    var c=PC[idx%PC.length];
    var pc=pct>=80?'#1a9e5c':pct>=50?'#d97706':'#e53e3e';
    var za=m.z4>0?'<span class="mdc-z" style="background:rgba(185,28,28,.1);color:#b91c1c;border-color:#b91c1c">Z4:'+m.z4+'</span>'
          :m.z3>0?'<span class="mdc-z" style="background:rgba(229,62,62,.1);color:#e53e3e;border-color:#e53e3e">Z3:'+m.z3+'</span>'
          :m.z2>0?'<span class="mdc-z" style="background:rgba(217,119,6,.1);color:#d97706;border-color:#d97706">Z2:'+m.z2+'</span>'
          :'<span class="mdc-z" style="background:rgba(26,158,92,.1);color:#1a9e5c;border-color:#1a9e5c">✓ OK</span>';
    var cid='mdc_'+name.replace(/[^a-zA-Z0-9]/g,'_');
    var div=document.createElement('div');
    div.className='mdc';
    div.innerHTML='<div style="position:absolute;top:0;left:0;right:0;height:3px;background:'+c+'"></div>'
      +'<div class="mdc-name" style="color:var(--p1);text-decoration:underline;cursor:pointer">'+name+'</div>'
      +'<div class="mdc-wrap"><canvas id="'+cid+'" width="60" height="60"></canvas>'
      +'<div class="mdc-pct" style="color:'+pc+'">'+pct.toFixed(0)+'%</div></div>'
      +'<div class="mdc-st"><span>T<b>'+m.size+'</b></span><span>Ach<b>'+m.ach+'</b></span></div>'
      +za;
    div.querySelector('.mdc-name').onclick = (function(n){ return function(){openMgrPop(n);}; })(name);
    row.appendChild(div);
    (function(chartId,pctVal,color){
      setTimeout(function(){
        var ctx=document.getElementById(chartId);if(!ctx)return;
        MDC_CHARTS[chartId]=new Chart(ctx,{type:'doughnut',
          data:{datasets:[{data:[Math.min(pctVal,100),Math.max(0,100-pctVal)],backgroundColor:[color,'rgba(0,0,0,.07)'],borderWidth:0,cutout:'72%'}]},
          options:{responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}}}});
      },60);
    })(cid,pct,c);
  });
}

// ── Z POPUP ───────────────────────────────────────────────────
function openZPop(){
  var list=EX.filter(function(e){return['Z2','Z3','Z4'].indexOf(e.zf)>=0;});
  list.sort(function(a,b){return({Z4:0,Z3:1,Z2:2}[a.zf]||9)-({Z4:0,Z3:1,Z2:2}[b.zf]||9);});
  var ZC={Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706'};
  var ZBG={Z4:'rgba(185,28,28,.06)',Z3:'rgba(229,62,62,.06)',Z2:'rgba(217,119,6,.06)'};
  var act={Z4:'🚨 Escalate to BM immediately',Z3:'⚠ Manager Review + PIP discussion',Z2:'📋 Immediate 1:1 coaching required'};
  var html=list.length===0?'<div style="text-align:center;padding:30px;color:#1a9e5c;font-size:15px;font-weight:800">✅ No Z escalations — Team is performing!</div>'
    :list.map(function(e){
      var c=ZC[e.zf]||'#8892a4',bg=ZBG[e.zf]||'transparent';
      var pc=e.jpct>=80?'#1a9e5c':e.jpct>=50?'#d97706':'#e53e3e';
      return '<div class="z-pop-row '+e.zf.toLowerCase()+'">'
        +'<div><div class="zpn">'+e.name+'</div><div class="zpm">Manager: '+e.mgr+' · '+e.jpct.toFixed(0)+'% Jun</div>'
        +'<div style="font-size:10px;color:var(--t3);margin-top:3px">'+act[e.zf]+'</div></div>'
        +'<span class="zpbdg" style="background:'+bg+';color:'+c+';border:1.5px solid '+c+'">'+e.zf+'</span>'
        +'</div>';
    }).join('');
  setHTML('zPopBody',html);
  openPop('zPop');
}

// ── MANAGER TEAM POPUP ────────────────────────────────────────
function openMgrPop(name){
  var map=mgrMap();
  var m=map[name];
  if(!m) return;
  var execs=EX.filter(function(e){return e.mgr===name||e.mgr.toLowerCase()===name.toLowerCase();});
  execs.sort(function(a,b){return b.jpct-a.jpct;});
  var pct=m.tgt>0?(m.ach/m.tgt)*100:0;
  var pc=pct>=80?'#1a9e5c':pct>=50?'#d97706':'#e53e3e';
  var pps=m.size>0?(m.ach/m.size).toFixed(1):0;
  var summary='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">'
    +'<div style="background:var(--p1l);padding:8px 14px;border-radius:8px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">Team Size</div><div style="font-size:18px;font-weight:900;font-family:Syne,sans-serif;color:var(--p1)">'+m.size+'</div></div>'
    +'<div style="background:var(--p2l);padding:8px 14px;border-radius:8px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">Jun Ach%</div><div style="font-size:18px;font-weight:900;font-family:Syne,sans-serif;color:'+pc+'">'+pct.toFixed(0)+'%</div></div>'
    +'<div style="background:var(--p3l);padding:8px 14px;border-radius:8px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">PPS</div><div style="font-size:18px;font-weight:900;font-family:Syne,sans-serif;color:#5aaa8a">'+pps+'</div><div style="font-size:8px;color:var(--t3)">Per Person Sale</div></div>'
    +'<div style="background:var(--p5l);padding:8px 14px;border-radius:8px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">Z Flags</div><div style="font-size:18px;font-weight:900;font-family:Syne,sans-serif;color:#e53e3e">'+(m.z2+m.z3+m.z4)+'</div></div>'
    +'<div style="background:var(--p4l);padding:8px 14px;border-radius:8px"><div style="font-size:9px;color:var(--t3);text-transform:uppercase">Recoveries</div><div style="font-size:18px;font-weight:900;font-family:Syne,sans-serif;color:#1a9e5c">'+m.rec+'</div></div>'
    +'</div>';
  var ZC={Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
  var rows=execs.map(function(e,i){
    var xpc=e.jpct>=80?'#1a9e5c':e.jpct>=50?'#d97706':'#e53e3e';
    var xzc=ZC[e.zf]||'#8892a4';
    return '<div class="mpr">'
      +'<div><div class="mpn">'+(i<3?MEDALS[i]+' ':'')+e.name+'</div>'
      +'<div class="mpm">'+e.jach+'/'+e.jtgt+' · Z: <span style="color:'+xzc+';font-weight:800">'+(e.zf||'OK')+'</span> · May: '+e.mayTotal+'</div></div>'
      +'<div class="mpp" style="color:'+xpc+'">'+e.jpct.toFixed(0)+'%</div>'
      +'</div>';
  }).join('');
  setHTML('mgrPopBody',summary+rows);
  document.getElementById('mgrPopTitle').textContent=name+' — Team ('+execs.length+' executives)';
  openPop('mgrPop');
}

// ── LEAKAGE POPUP ─────────────────────────────────────────────
function openLeakPop(){
  var map=mgrMap();
  // Leakage = cancelled sales entered manually in heatmap
  var totalLeakage2=0;
  var leakList=[];
  for(var i=0;i<EX.length;i++){
    var lv=HM_OVERRIDES[EX[i].name+'_leak'];
    var lvn=lv?Number(lv):0;
    if(lvn>0){ totalLeakage2+=lvn; leakList.push({name:EX[i].name,mgr:EX[i].mgr,val:lvn}); }
  }
  var lpct=totalLeakage2;
  var html='<div style="text-align:center;margin-bottom:16px;padding:16px;background:var(--p5l);border-radius:10px">'
    +'<div style="font-family:Syne,sans-serif;font-size:42px;font-weight:900;color:'+(totalLeakage2>0?'#e53e3e':'#1a9e5c')+'">'+totalLeakage2+'</div>'
    +'<div style="font-size:12px;color:var(--t3)">Total Cancelled Sales this Month</div>'
    +'<div style="font-size:11px;color:var(--t2);margin-top:6px">'
    +(totalLeakage2===0?'✅ Zero leakage — No cancelled sales recorded!'
    :'⚠ '+totalLeakage2+' sales cancelled. Review reasons with managers.')
    +'</div></div>'
    +'<div style="font-size:10px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Executive-wise Leakage</div>'
    +(leakList.length===0
      ?'<div style="text-align:center;padding:16px;color:#1a9e5c;font-weight:700;background:var(--p3l);border-radius:8px">✅ No leakage entered — Update in Heatmap tab</div>'
      :leakList.sort(function(a,b){return b.val-a.val;}).map(function(x){
        return '<div class="lp-row">'
          +'<span class="lp-name">'+x.name+'</span>'
          +'<span style="color:var(--t3);font-size:11px">'+x.mgr+'</span>'
          +'<span class="lp-val" style="color:#e53e3e;font-size:14px;font-weight:900">'+x.val+' cancelled</span>'
          +'</div>';
      }).join(''))
    +'<div style="margin-top:12px;padding:10px;background:var(--p1l);border-radius:8px;font-size:11px;color:var(--t2)">'
    +'💡 <b>How to update:</b> Go to Heatmap tab → click the red Leakage column for any executive → enter cancelled sales count'
    +'</div>'
    +'<div style="font-size:10px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Manager-wise Leakage</div>'
    +Object.entries(map).filter(function(x){return x[1].size>0;}).map(function(entry){
      var nm=entry[0],m=entry[1];
      var mz=EX.filter(function(e){return (e.mgr===nm||e.mgr.toLowerCase()===nm.toLowerCase())&&e.jach===0;}).length;
      var mlp=m.size>0?((mz/m.size)*100).toFixed(0):0;
      var c=mlp>50?'#e53e3e':mlp>30?'#d97706':'#1a9e5c';
      return '<div class="lp-row"><span class="lp-name">'+nm+'</span><span style="font-size:11px;color:var(--t3)">'+mz+'/'+m.size+' zero-sale</span>'
        +'<span class="lp-val" style="color:'+c+'">'+mlp+'% leak</span></div>';
    }).join('');
  setHTML('leakPopBody',html);
  openPop('leakPop');
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
function getAV(a){return CVIEW==='data'?a.td:CVIEW==='paid'?a.ps:a.cv*100;}
function getAL(a){return CVIEW==='data'?a.td.toLocaleString():CVIEW==='paid'?a.ps:a.cv+'%';}

function initMap(){
  if(LMAP){drawCircles();return;}
  var el=document.getElementById('dashMap');
  if(!el){return;}
  LMAP=L.map('dashMap',{center:[12.83,77.62],zoom:10,zoomControl:true,attributionControl:false});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19}).addTo(LMAP);
  drawCircles();
}
function drawCircles(){
  if(!LMAP)return;
  CIRCLES.forEach(function(c){LMAP.removeLayer(c);});
  LABELS.forEach(function(l){LMAP.removeLayer(l);});
  CIRCLES=[];LABELS=[];
  var vals=AREAS.map(function(a){return getAV(a);}),maxV=Math.max.apply(null,vals);
  AREAS.forEach(function(a,i){
    var v=vals[i],radius=9+(v/maxV)*36,color=PC[i%PC.length];
    var circle=L.circleMarker([a.lat,a.lng],{radius:radius,fillColor:color,color:'#fff',weight:v>maxV*0.4?2.5:1.5,opacity:1,fillOpacity:v>maxV*0.4?0.88:0.70}).addTo(LMAP);
    (function(area){
      circle.on('click',function(){
        L.popup({className:'bpop',maxWidth:240,closeButton:true}).setLatLng([area.lat,area.lng])
          .setContent('<div class="pin"><div class="pname">📍 '+area.n+'</div><div class="ppinc">'+area.p+'</div>'
            +'<div class="pgrid">'
            +'<div class="pi"><div class="pv">'+area.td.toLocaleString()+'</div><div class="pl">Total Data</div></div>'
            +'<div class="pi"><div class="pv" style="color:#c882a0">'+area.ps+'</div><div class="pl">Paid Sellers</div></div>'
            +'<div class="pi"><div class="pv" style="color:#5aaa8a">'+area.ga.toLocaleString()+'</div><div class="pl">GST Active</div></div>'
            +'<div class="pi"><div class="pv" style="color:#d97706">'+area.s6+'</div><div class="pl">Sales 6M</div></div>'
            +'</div><div class="pfoot">Conv: <b>'+area.cv+'%</b> | Meet: <b>'+area.mp+'%</b></div></div>')
          .openOn(LMAP);
      });
    })(a);
    circle.bindTooltip('<b style="font-size:12px;color:#1a1a2e">'+a.n+'</b><br><span style="font-size:11px;color:#4a5568">'+getAL(a)+'</span>',{direction:'top',offset:[0,-radius]});
    var lbl=L.divIcon({className:'',html:'<div style="background:'+color+';color:#1a1a2e;font-size:9px;font-weight:900;font-family:Nunito,sans-serif;padding:2px 4px;border-radius:3px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.2)">'+a.n+'</div>',iconAnchor:[-(radius+2),8]});
    LABELS.push(L.marker([a.lat,a.lng],{icon:lbl,interactive:false}).addTo(LMAP));
    CIRCLES.push(circle);
  });
}
function setV(v,btn){CVIEW=v;document.querySelectorAll('.mb').forEach(function(b){b.classList.remove('act');});btn.classList.add('act');drawCircles();}

// ── EXEC TABLE ────────────────────────────────────────────────
function renderExecTable(){
  if(!EX||EX.length===0){setHTML('execBody','<tr><td colspan="6" class="lding">No data</td></tr>');return;}
  var sorted=EX.slice().sort(function(a,b){return b.jpct-a.jpct;});
  var ZC={Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
  var ZBG={Z4:'rgba(185,28,28,.1)',Z3:'rgba(229,62,62,.08)',Z2:'rgba(217,119,6,.08)',RECOVERY:'rgba(26,158,92,.08)',OK:'rgba(26,158,92,.06)'};
  var html='';
  sorted.forEach(function(e,i){
    var pc=e.jpct>=80?'#1a9e5c':e.jpct>=50?'#d97706':'#e53e3e';
    var zc=ZC[e.zf]||'#8892a4',zb=ZBG[e.zf]||'transparent';
    html+='<tr onclick="openSearchDetail(\''+e.name+'\')" style="cursor:pointer">'
      +'<td style="font-size:13px;width:24px">'+(i<3?MEDALS[i]:'<span style="color:#8892a4;font-weight:800;font-size:11px">'+(i+1)+'</span>')+'</td>'
      +'<td style="font-weight:'+(i<3?800:700)+'">'+e.name+'</td>'
      +'<td>'+e.mgr+'</td>'
      +'<td style="font-weight:800">'+e.jach+'/'+e.jtgt+'</td>'
      +'<td style="font-weight:800;color:'+pc+'">'+e.jpct.toFixed(0)+'%</td>'
      +'<td><span class="zch" style="background:'+zb+';color:'+zc+';border-color:'+zc+'">'+(e.zf||'—')+'</span></td>'
      +'</tr>';
  });
  setHTML('execBody',html);
}

// ── DONUTS ────────────────────────────────────────────────────
function renderDonuts(){
  var totTD=AREAS.reduce(function(a,x){return a+x.td;},0);
  var totPS=AREAS.reduce(function(a,x){return a+x.ps;},0);
  var avgCV=(AREAS.reduce(function(a,x){return a+x.cv;},0)/AREAS.length).toFixed(1);
  function mkD(id,vid,sid,data,cols,val,sub){
    var ctx=document.getElementById(id);if(!ctx)return;
    if(DCHARTS[id])DCHARTS[id].destroy();
    DCHARTS[id]=new Chart(ctx,{type:'doughnut',data:{datasets:[{data:data,backgroundColor:cols,borderWidth:0,cutout:'68%'}]},options:{responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}}}});
    setText(vid,val);setText(sid,sub);
  }
  mkD('d1','dv1','ds1',[totPS,Math.max(0,totTD-totPS)],['#819dcc','rgba(129,157,204,.2)'],totTD.toLocaleString(),'Total data');
  mkD('d2','dv2','ds2',[totPS,Math.max(0,totTD-totPS)],['#b8e1d3','rgba(184,225,211,.2)'],totPS,'Paid sellers');
  mkD('d3','dv3','ds3',[parseFloat(avgCV),Math.max(0,5-parseFloat(avgCV))],['#eac3d5','rgba(234,195,213,.2)'],avgCV+'%','Avg conv%');
}

// ── MANAGERS PAGE ─────────────────────────────────────────────
function renderManagersPage(){
  var map=mgrMap();
  var html='';
  Object.entries(map).filter(function(x){return x[1].size>0;}).forEach(function(entry,i){
    var nm=entry[0],m=entry[1];
    var pct=m.tgt>0?(m.ach/m.tgt)*100:0,c=PC[i%PC.length],pc=pct>=80?'#1a9e5c':pct>=50?'#d97706':'#e53e3e';
    var pps=m.size>0?(m.ach/m.size).toFixed(2):0;
    var zeroM=EX.filter(function(e){return (e.mgr===nm||e.mgr.toLowerCase()===nm.toLowerCase())&&e.jach===0;}).length;
    var leakM=m.size>0?((zeroM/m.size)*100).toFixed(0):0;
    var as=m.streaks.length?(m.streaks.reduce(function(a,b){return a+b;},0)/m.streaks.length).toFixed(1):0;
    html+='<div class="mc">'
      +'<div class="mct" style="background:linear-gradient(90deg,'+c+','+c+'88)"></div>'
      +'<div class="mch"><div>'
        +'<div class="mcn" onclick="openMgrPop(\''+nm+'\')">'+nm+' ↗</div>'
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
  });
  setHTML('mgrGrid',html);
}

// ── LEADERBOARD (Ach%, Z Status, Last Month Sale, Recovery) ──
function renderLeaderboard(){
  var sorted=EX.slice().sort(function(a,b){return b.jpct-a.jpct;});
  var html='';
  sorted.forEach(function(e,i){
    var pc=e.jpct>=80?'pp-g':e.jpct>=50?'pp-a':'pp-r';
    var ZC={Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
    var zc=ZC[e.zf]||'#8892a4';
    var ZBG={Z4:'rgba(185,28,28,.1)',Z3:'rgba(229,62,62,.08)',Z2:'rgba(217,119,6,.08)',RECOVERY:'rgba(26,158,92,.08)',OK:'rgba(26,158,92,.06)'};
    var zb=ZBG[e.zf]||'transparent';
    var recIcon=e.rec>0?'<span style="color:#819dcc;font-weight:800">★×'+e.rec+'</span>':'<span style="color:#8892a4">—</span>';
    html+='<tr>'
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
  });
  setHTML('lbBody',html);
}

// ── HEATMAP with manual edit + CSV upload ─────────────────────
function getHmVal(name,wi,orig){
  var key=name+'_'+wi;
  return HM_OVERRIDES.hasOwnProperty(key)?HM_OVERRIDES[key]:orig;
}
function saveHmOverrides(){try{localStorage.setItem('hm_ov',JSON.stringify(HM_OVERRIDES));}catch(e){}}
function loadHmOverrides(){try{var s=localStorage.getItem('hm_ov');if(s)HM_OVERRIDES=JSON.parse(s);}catch(e){}}

function renderHeatmap(){
  var sorted=EX.slice().sort(function(a,b){return b.jpct-a.jpct;});
  var day=new Date().getDate(),mo=new Date().getMonth(),ja=0;
  if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  var wh=['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
  var hdr='<tr>'
    +'<th style="text-align:left">Executive</th>'
    +'<th style="text-align:left">Mgr</th>'
    +wh.map(function(h,i){return'<th class="'+(i===1?'hsep':'')+'">'+(i===0?h:'<span style="color:var(--p1)">'+h+'</span>')+'</th>';}).join('')
    +'<th>Ach</th><th>Tgt</th><th>%</th><th>Z</th><th>Status</th>'
    +'</tr>';
  var rows='';
  sorted.forEach(function(e){
    var origWv=[e.mw[3]].concat(e.jw);
    var wv=origWv.map(function(v,wi){return getHmVal(e.name,wi,v);});
    // Detect recovery in overridden data
    var isRecovery=false;
    for(var i=1;i<wv.length;i++){if(wv[i-1]===0&&wv[i]>0){isRecovery=true;break;}}
    var wc=wv.map(function(v,wi){
      var f=wi>0&&(wi-1)>=ja;
      var cls=f?'hf':v>0?'hs':'hz';
      if(!f&&v>0&&wi>0&&wv[wi-1]===0) cls='hr'; // recovery highlight
      var display=f?'▪':v>0?v:'✗';
      return'<td class="'+cls+' '+(wi===1?'hsep':'')+' hm-cell" '
        +'onclick="openCellEdit(\''+e.name+'\','+wi+','+v+')" title="Click to edit">'+display+'</td>';
    }).join('');
    var pc=e.jpct>=80?'#1a9e5c':e.jpct>=50?'#d97706':'#e53e3e';
    var ZC={Z4:'#b91c1c',Z3:'#e53e3e',Z2:'#d97706',RECOVERY:'#1a9e5c',OK:'#1a9e5c'};
    var zc=ZC[e.zf]||'#8892a4';
    var statusIcon=isRecovery?'<span style="color:#819dcc;font-weight:800">★ Recovery</span>'
      :e.zf&&e.zf!=='OK'&&e.zf!=='RECOVERY'?'<span style="color:'+zc+';font-weight:800">'+e.zf+'</span>'
      :'<span style="color:#1a9e5c">✓ OK</span>';
    var leakVal = HM_OVERRIDES[e.name+'_leak'] ? Number(HM_OVERRIDES[e.name+'_leak']) : 0;
    var leakCell = '<td class="hm-cell" '
      +'style="border-left:2px solid rgba(229,62,62,.2);font-weight:800;cursor:pointer;'
      +(leakVal>0?'background:rgba(229,62,62,.1);color:#e53e3e':'color:#8892a4')+'" '
      +'onclick="openLeakCellEdit(''+e.name+'')" title="Click to enter cancelled sales">'
      +(leakVal>0?leakVal:'—')+'</td>';
    rows+='<tr><td class="hn">'+e.name+'</td><td class="hm2">'+e.mgr+'</td>'
      +wc
      +'<td style="font-weight:800">'+e.jach+'</td>'
      +'<td style="color:#8892a4">'+e.jtgt+'</td>'
      +'<td style="font-weight:800;color:'+pc+'">'+e.jpct.toFixed(0)+'%</td>'
      +'<td style="font-weight:800;color:'+zc+'">'+(e.zf||'—')+'</td>'
      +leakCell
      +'<td>'+statusIcon+'</td></tr>';
  });
  setHTML('hmWrap','<table class="hmtbl"><thead>'+hdr+'</thead><tbody>'+rows+'</tbody></table>');
}

function openCellEdit(name,wi,curVal){
  CELL_CTX={name:name,wi:wi};
  var wLabels=['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
  document.getElementById('cellPopTitle').textContent=name+' — '+wLabels[wi];
  var inp=document.getElementById('cellVal');
  if(inp){inp.value=getHmVal(name,wi,curVal);setTimeout(function(){inp.focus();inp.select();},100);}
  openPop('cellPop');
}
function saveCell(){
  if(!CELL_CTX) return;
  var v=parseInt(document.getElementById('cellVal').value)||0;
  if(CELL_CTX.wi==='leak'){
    HM_OVERRIDES[CELL_CTX.name+'_leak']=v;
  } else {
    HM_OVERRIDES[CELL_CTX.name+'_'+CELL_CTX.wi]=v;
  }
  saveHmOverrides();
  closePop('cellPop');
  renderHeatmap();
  rebuildZFromOverrides();
}

function openLeakCellEdit(name){
  CELL_CTX = {name:name, wi:'leak'};
  document.getElementById('cellPopTitle').textContent = name + ' — Leakage (cancelled sales)';
  var cur = HM_OVERRIDES[name+'_leak'] ? Number(HM_OVERRIDES[name+'_leak']) : 0;
  var inp = document.getElementById('cellVal');
  if(inp){ inp.value = cur; setTimeout(function(){inp.focus();inp.select();},100); }
  // Update hint text
  var hint = document.querySelector('#cellPop .pop-scroll div');
  if(hint) hint.textContent = 'Enter number of CANCELLED/leaked sales this month (0 = no leakage)';
  openPop('cellPop');
}
function rebuildZFromOverrides(){
  var day=new Date().getDate(),mo=new Date().getMonth(),ja=0;
  if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  EX.forEach(function(e){
    var wv=[e.mw[3]].concat(e.jw).map(function(v,wi){return getHmVal(e.name,wi,v);});
    var zv=wv.slice(0,ja+1);
    e.zf=calcZ(zv);
    e.rec=calcRec(zv);
  });
  renderKPIs();renderMgrDonuts();renderExecTable();renderLeaderboard();
}

function uploadHmCSV(event){
  var file=event.target.files[0];if(!file)return;
  var r=new FileReader();
  r.onload=function(ev){
    var lines=ev.target.result.trim().split('\n');
    var wLabels=['MayW4','JunW1','JunW2','JunW3','JunW4'];
    lines.slice(1).forEach(function(line){
      var cols=line.split(',');
      var name=(cols[0]||'').trim();
      if(!name)return;
      wLabels.forEach(function(lbl,wi){
        var v=parseInt(cols[wi+1]||0)||0;
        HM_OVERRIDES[name+'_'+wi]=v;
      });
    });
    saveHmOverrides();renderHeatmap();rebuildZFromOverrides();
    alert('CSV imported successfully!');
  };
  r.readAsText(file);
  event.target.value='';
}

function exportHmCSV(){
  var sorted=EX.slice().sort(function(a,b){return b.jpct-a.jpct;});
  var lines=['Name,MayW4,JunW1,JunW2,JunW3,JunW4'];
  sorted.forEach(function(e){
    var origWv=[e.mw[3]].concat(e.jw);
    var wv=origWv.map(function(v,wi){return getHmVal(e.name,wi,v);});
    lines.push([e.name].concat(wv).join(','));
  });
  var blob=new Blob([lines.join('\n')],{type:'text/csv'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='heatmap_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
}

// ── BI SUMMARY — CEO Intelligence ─────────────────────────────
function renderBI(){
  if(!EX||EX.length===0){setHTML('biWrap','<div style="text-align:center;padding:40px;color:var(--t3)">No data loaded</div>');return;}
  var map=mgrMap();
  var tgt=EX.reduce(function(a,e){return a+e.jtgt;},0);
  var ach=EX.reduce(function(a,e){return a+e.jach;},0);
  var achPct=tgt>0?((ach/tgt)*100):0;
  var z2=EX.filter(function(e){return e.zf==='Z2';}).length;
  var z3=EX.filter(function(e){return e.zf==='Z3';}).length;
  var z4=EX.filter(function(e){return e.zf==='Z4';}).length;
  var recs=EX.filter(function(e){return e.rec>0;}).length;
  var zeroSale=EX.filter(function(e){return e.jach===0;}).length;
  var leakPct=(zeroSale/EX.length*100).toFixed(0);
  // COCA: full branch cost formula
  var numExecBI = EX.length;
  var totalCostBI = (40000*numExecBI) + (50000*MGRS_ALL.length) + 100000 + 500000 + 100000;
  var totalSalesBI = 0;
  for(var i=0;i<EX.length;i++) totalSalesBI += EX[i].jach;
  var coca = totalSalesBI>0 ? Math.round(totalCostBI/totalSalesBI) : 0;
  var newPaid = 0;
  for(var i=0;i<EX.length;i++) if(EX[i].jach>0) newPaid++;
  // Leakage from heatmap
  var totalLeakBI=0;
  for(var i=0;i<EX.length;i++){var lv=HM_OVERRIDES[EX[i].name+'_leak'];if(lv)totalLeakBI+=Number(lv)||0;}
  var topExec=EX.slice().sort(function(a,b){return b.jpct-a.jpct;})[0];
  var worstExec=EX.slice().sort(function(a,b){return a.jpct-b.jpct;})[0];
  var topMgr=null,topMgrPct=0;
  Object.entries(map).forEach(function(entry){
    var m=entry[1];var p=m.tgt>0?(m.ach/m.tgt)*100:0;
    if(p>topMgrPct){topMgrPct=p;topMgr=entry[0];}
  });
  var avgMayTotal=EX.reduce(function(a,e){return a+e.mayTotal;},0)/EX.length;

  var goods=[], bads=[], warns=[], infos=[], actions=[];

  // GOODS
  if(recs>0) goods.push({icon:'🔄',val:recs+' recoveries',lbl:'Recovery Champions',desc:recs+' executives converted 0→1 this period. These are resilient performers.'});
  if(achPct>=50) goods.push({icon:'✅',val:achPct.toFixed(0)+'%',lbl:'Jun Achievement',desc:'Team crossed 50% target. '+topExec.name+' leads at '+topExec.jpct.toFixed(0)+'%.'});
  if(topMgr) goods.push({icon:'🏆',val:topMgr,lbl:'Best Manager',desc:topMgr+' team at '+topMgrPct.toFixed(0)+'%. Replicate their approach across other teams.'});
  if(z4===0) goods.push({icon:'🛡',val:'No Z4',lbl:'No Critical Escalation',desc:'Zero Z4 flags. No immediate BM escalation needed.'});

  // BADS
  if(zeroSale>EX.length*0.3) bads.push({icon:'🚨',val:zeroSale+' execs',lbl:'Zero Sale Executives',desc:zeroSale+' out of '+EX.length+' have 0 Jun sales. Immediate intervention needed. Check pitching quality & territory alignment.'});
  if(z3+z4>0) bads.push({icon:'⚠',val:(z3+z4)+' cases',lbl:'Z3/Z4 Escalations',desc:z3+' Z3 and '+z4+' Z4 cases. These executives may need PIP or role reassessment.'});
  var cocaDisplay2 = coca>=1000?'₹'+Math.round(coca/1000)+'K':'₹'+coca;
  if(coca>19000) bads.push({icon:'💸',val:cocaDisplay2,lbl:'High COCA',desc:'₹'+totalCostBI.toLocaleString()+' total branch cost ÷ '+totalSalesBI+' sales = '+cocaDisplay2+' per sale. Ideal: ₹19K (needs 84 sales). Currently '+totalSalesBI+' sales — need '+(84-totalSalesBI>0?(84-totalSalesBI)+' more':0+' — target achieved!')+' to hit ideal.'});
  if(totalLeakBI>0) warns.push({icon:'🚫',val:totalLeakBI+' cancelled',lbl:'Sales Leakage',desc:totalLeakBI+' sales cancelled this month. Each cancellation = COCA wasted. Review reason codes with managers.'});

  // WARNINGS
  if(z2>3) warns.push({icon:'📋',val:z2+' cases',lbl:'Z2 Watch List',desc:z2+' executives at Z2. Without intervention this week, they will escalate to Z3.'});
  if(leakPct>30) warns.push({icon:'📉',val:leakPct+'%',lbl:'Branch Leakage',desc:''+leakPct+'% of executives generated zero revenue. Review segment targeting and manager coaching frequency.'});
  if(achPct<30) warns.push({icon:'📊',val:achPct.toFixed(0)+'%',lbl:'Low Achievement',desc:'Overall achievement below 30%. Assess if targets are realistic or if there is a pitch/product fitment issue.'});
  if(worstExec&&worstExec.jpct===0) warns.push({icon:'👤',val:worstExec.name,lbl:'Zero Performer',desc:worstExec.name+' ('+worstExec.mgr+') has 0% achievement. Schedule immediate 1:1.'});

  // INFOS
  var cocaBI = totalSalesBI>0?Math.round(totalCostBI/totalSalesBI):0;
  var costBreak='Exec: ₹'+(40000*numExecBI/1000).toFixed(0)+'K + Mgr: ₹'+(50000*MGRS_ALL.length/1000).toFixed(0)+'K + BM: ₹1L + Ops: ₹5L + Rent: ₹1L';
  var idealSalesNeeded = 84; // ₹15.9L / ₹19K = 84 sales for ideal COCA
  infos.push({icon:'🧮',val:cocaDisplay2||'₹'+cocaBI.toLocaleString(),lbl:'COCA',desc:'Total cost ₹'+Math.round(totalCostBI/1000)+'K. Ideal ₹19K COCA needs '+idealSalesNeeded+' sales (currently '+totalSalesBI+'). '+costBreak+'.'});
  infos.push({icon:'📅',val:avgMayTotal.toFixed(1),lbl:'Avg May Sale',desc:'Average May sales per executive. Use as benchmark for Jun target-setting.'});
  infos.push({icon:'🗺',val:'13 zones',lbl:'BLR Territory Coverage',desc:'Bommasandara, Electronics City, HSR Layout are top 3 data-rich zones. Prioritize these for conversion push.'});

  // ACTION PLAN
  actions=[
    {pri:'🚨 Immediate',txt:'Call all '+z2+' Z2 executives today for coaching. Prevent escalation to Z3.'},
    {pri:'📋 This Week',txt:'Manager '+topMgr+' should share top-performer playbook with other managers.'},
    {pri:'📊 This Month',txt:'Focus territory push on Electronics City (5438 data, only 0.77% conv). 10x opportunity.'},
    {pri:'💰 COCA',txt:'Ideal COCA = ₹19K. Need 84 sales (currently '+totalSalesBI+'). '+(totalSalesBI>=84?'✅ Target achieved!':'Need '+(84-totalSalesBI)+' more sales. Each additional sale saves ₹'+Math.round(totalCostBI/Math.max(totalSalesBI+1,1)-totalCostBI/Math.max(totalSalesBI,1)).toLocaleString()+' in COCA.')},
    {pri:'🔄 Recovery',txt:recs>0?recs+' recovery champions — publicly recognize them to motivate team.':'No recoveries yet — incentivize 0→1 conversions with spot recognition.'},
    {pri:'📉 Leakage',txt:''+zeroSale+' zero-sale executives = 100% cost, 0% revenue. Schedule daily check-in until they close.'},
  ];

  function mkCards(arr,cls){
    return arr.map(function(x){
      return '<div class="bi-card '+cls+'"><div class="bi-icon">'+x.icon+'</div>'
        +'<div class="bi-val">'+x.val+'</div><div class="bi-lbl">'+x.lbl+'</div>'
        +'<div class="bi-desc">'+x.desc+'</div></div>';
    }).join('');
  }

  var scoreColor=achPct>=80?'#1a9e5c':achPct>=50?'#d97706':'#e53e3e';
  var html=
    '<div class="bi-sec" style="background:linear-gradient(135deg,var(--p1l),var(--p2l));border-left:5px solid var(--p1)">'
    +'<div style="display:flex;align-items:center;justify-content:space-between">'
    +'<div><div style="font-family:Syne,sans-serif;font-size:18px;font-weight:800;color:var(--t1)">Branch Health Score</div>'
    +'<div style="font-size:12px;color:var(--t2);margin-top:4px">Bommasandara · June 2026 · '+EX.length+' Executives</div></div>'
    +'<div style="text-align:center">'
    +'<div style="font-family:Syne,sans-serif;font-size:48px;font-weight:900;color:'+scoreColor+'">'+achPct.toFixed(0)+'%</div>'
    +'<div style="font-size:12px;color:var(--t2)">Overall Achievement</div></div></div></div>'

    +'<div class="bi-sec"><div class="bi-sec-title">✅ What\'s Working</div><div class="bi-grid">'+mkCards(goods,'good')+'</div></div>'
    +'<div class="bi-sec"><div class="bi-sec-title">🚨 What Needs Fixing</div><div class="bi-grid">'+mkCards(bads,'bad')+'</div></div>'
    +(warns.length?'<div class="bi-sec"><div class="bi-sec-title">⚠ Watch Closely</div><div class="bi-grid">'+mkCards(warns,'warn')+'</div></div>':'')
    +'<div class="bi-sec"><div class="bi-sec-title">📊 Key Metrics</div><div class="bi-grid">'+mkCards(infos,'info')+'</div></div>'
    +'<div class="bi-sec"><div class="bi-sec-title">🎯 CEO Action Plan — Prioritized</div>'
    +actions.map(function(a,i){
      return '<div style="display:flex;gap:12px;padding:10px 12px;border-radius:8px;background:'+(i%2===0?'var(--p1l)':'var(--card2)')+';margin-bottom:6px">'
        +'<div style="font-size:11px;font-weight:800;min-width:100px;color:var(--t1)">'+a.pri+'</div>'
        +'<div style="font-size:12px;color:var(--t2)">'+a.txt+'</div>'
        +'</div>';
    }).join('')
    +'</div>';
  setHTML('biWrap',html);
}

// ── POPUP HELPERS ─────────────────────────────────────────────
function openPop(id){var el=document.getElementById(id);if(el)el.classList.add('open');}
function closePop(id){var el=document.getElementById(id);if(el)el.classList.remove('open');}
function bgClose(e,id){if(e.target.id===id)closePop(id);}

// ── HELPERS ───────────────────────────────────────────────────
function setText(id,v){var el=document.getElementById(id);if(el)el.textContent=v;}
function setHTML(id,h){var el=document.getElementById(id);if(el)el.innerHTML=h;}

function mgrMap(){
  var map={};
  MGRS_ALL.forEach(function(m){map[m]={size:0,tgt:0,ach:0,z2:0,z3:0,z4:0,streaks:[],rec:0};});
  EX.forEach(function(e){
    var k=null;
    for(var i=0;i<MGRS_ALL.length;i++){if(e.mgr===MGRS_ALL[i]||e.mgr.toLowerCase()===MGRS_ALL[i].toLowerCase()){k=MGRS_ALL[i];break;}}
    if(!k)k=e.mgr;
    if(!map[k])map[k]={size:0,tgt:0,ach:0,z2:0,z3:0,z4:0,streaks:[],rec:0};
    map[k].size++;map[k].tgt+=e.jtgt;map[k].ach+=e.jach;
    if(e.zf==='Z2')map[k].z2++;if(e.zf==='Z3')map[k].z3++;if(e.zf==='Z4')map[k].z4++;
    map[k].streaks.push(e.streak);map[k].rec+=e.rec;
  });
  return map;
}

// ── DEMO ──────────────────────────────────────────────────────
function loadDemo(){
  var rows=[
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
  buildExecs(rows,1);renderAll();
  setText('syncLbl','Demo • Paste CSV URL in app.js');
}
