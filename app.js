// ═══════════════════════════════════════════════════
//  BOMMASANDARA PERFORMANCE TRACKER — app.js
//  Paste your Google Sheet CSV URL below
// ═══════════════════════════════════════════════════
const SHEET_CSV_URL = "YOUR_GOOGLE_SHEET_CSV_URL_HERE";

const COL={EMP:0,MGR:1,DOJ:2,DAYS:3,BKT:4,TAPR:5,AAPR:6,MPCT:7,JTGT:8,JACH:9,JPCT:10,
  AW1:11,AW2:12,AW3:13,AW4:14,AW5:15,MW1:16,MW2:17,MW3:18,MW4:19,JW1:20,JW2:21,JW3:22,JW4:23};

const MGRS  = ["Annesh","Mohan","Arun","Manoj C Y","Pranav"];
const MCLRS = ["#809cce","#94b8d0","#b7e0d2","#d6eadf","#eac3d5"]; // pastel
const MEDALS= ["🥇","🥈","🥉"];
const PTITLES= {dashboard:"Dashboard",managers:"Manager Performance",
  leaderboard:"Leaderboard",zreport:"Z-Report",heatmap:"Weekly Heatmap",recovery:"Recovery Champions"};

let EX=[], MAP=null, MCIRCLES=[], MLABELS=[], CURVIEW='data';
let DC={}; // chart instances

// ── BOOT ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded",()=>{loadLogo();loadData();});

// ── LOGO ─────────────────────────────────────────────────────
function uploadLogo(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=ev=>{
    const u=ev.target.result;
    const img=document.getElementById('lionImg');
    img.src=u; img.style.display='block';
    document.getElementById('lionFallback').style.display='none';
    try{localStorage.setItem('blogo',u);}catch{}
  };
  r.readAsDataURL(f);
}
function loadLogo(){
  try{
    const u=localStorage.getItem('blogo');
    if(u){
      const img=document.getElementById('lionImg');
      img.src=u; img.style.display='block';
      document.getElementById('lionFallback').style.display='none';
    }
  }catch{}
}

// ── NAV ──────────────────────────────────────────────────────
function navTo(pg,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('pg-'+pg).classList.add('active');
  el.classList.add('active');
  document.getElementById('pageTitle').textContent=PTITLES[pg]||pg;
  if(pg==='dashboard'&&MAP) setTimeout(()=>MAP.invalidateSize(),120);
}

// ── DATA LOAD ────────────────────────────────────────────────
async function loadData(){
  set('syncLbl','Syncing…');
  if(!SHEET_CSV_URL||SHEET_CSV_URL.includes('YOUR_GOOGLE')){
    loadDemo(); return;
  }
  try{
    const r=await fetch(SHEET_CSV_URL+'&t='+Date.now());
    if(!r.ok) throw new Error('HTTP '+r.status);
    const csv=await r.text();
    buildExecs(parseCSV(csv));
    renderAll();
    set('syncLbl','Synced '+new Date().toLocaleTimeString('en-IN'));
  }catch(err){
    console.warn('Sheet fetch failed:',err);
    loadDemo();
  }
}

function parseCSV(txt){
  return txt.trim().split('\n').map(line=>{
    const c=[]; let cur='',q=false;
    for(let i=0;i<line.length;i++){
      if(line[i]==='"'){q=!q;continue;}
      if(line[i]===','&&!q){c.push(cur.trim());cur='';continue;}
      cur+=line[i];
    }
    c.push(cur.trim()); return c;
  });
}

// ── BUILD EXECUTIVES ─────────────────────────────────────────
function buildExecs(rows){
  EX=[];
  const day=new Date().getDate(), mo=new Date().getMonth();
  let ja=0;
  if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}

  for(let r=2;r<rows.length;r++){
    const row=rows[r];
    const name=(row[COL.EMP]||'').trim();
    if(!name || !isNaN(+name)) continue;

    const mgr=(row[COL.MGR]||'').trim();
    const jtgt=+(row[COL.JTGT])||0;
    const jach=+(row[COL.JACH])||0;
    const jpct=jtgt>0?(jach/jtgt)*100:0;
    const mw=[COL.MW1,COL.MW2,COL.MW3,COL.MW4].map(c=>+(row[c])||0);
    const jw=[COL.JW1,COL.JW2,COL.JW3,COL.JW4].map(c=>+(row[c])||0);
    const aw=[COL.AW1,COL.AW2,COL.AW3,COL.AW4,COL.AW5].map(c=>+(row[c])||0);
    const zv=[mw[3],...jw.slice(0,ja)];

    const zf=calcZ(zv), streak=calcStreak(zv), trend=calcTrend(zv);
    const rec=calcRec(zv), risk=calcRisk(jpct,zf), score=calcScore(jpct,rec,zv,streak);

    EX.push({name,mgr,jtgt,jach,jpct,aw,mw,jw,zv,ja,zf,streak,trend,rec,risk,score});
  }
}

// ── LOGIC ────────────────────────────────────────────────────
function calcZ(v){
  if(v.length<2) return null;
  if(v[v.length-2]===0 && v[v.length-1]>0) return 'RECOVERY';
  let z=0; for(let i=v.length-1;i>=0;i--){if(v[i]===0)z++;else break;}
  return z>=4?'Z4':z>=3?'Z3':z>=2?'Z2':z===0?'OK':null;
}
function calcStreak(v){let s=0;for(let i=v.length-1;i>=0;i--){if(v[i]>0)s++;else break;}return s;}
function calcTrend(v){if(v.length<2)return'→';return v[v.length-1]>v[v.length-2]?'▲':v[v.length-1]<v[v.length-2]?'▼':'→';}
function calcRec(v){let c=0;for(let i=1;i<v.length;i++)if(v[i-1]===0&&v[i]>0)c++;return c;}
function calcRisk(p,z){if(z==='Z3'||z==='Z4')return'CRITICAL';return p>=80?'GREEN':p>=50?'AMBER':'RED';}
function calcScore(p,r,v,s){
  const nz=v.filter(x=>x>0).length, cons=v.length?(nz/v.length)*100:0;
  return Math.round(Math.min(p,100)*.4 + cons*.2 + Math.min(r*33,100)*.2 + Math.min(s*25,100)*.2);
}

// ── RENDER ALL ───────────────────────────────────────────────
function renderAll(){
  if(!EX.length){console.warn('No executive data to render');return;}
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
function renderKPIs(){
  const tgt=EX.reduce((a,e)=>a+e.jtgt,0);
  const ach=EX.reduce((a,e)=>a+e.jach,0);
  const pct=tgt>0?((ach/tgt)*100).toFixed(1):0;
  const zc=EX.filter(e=>['Z2','Z3','Z4'].includes(e.zf)).length;

  set('k-team', EX.length);
  set('k-team-s','Bommasandara Branch');
  set('k-ach', ach+'/'+tgt);
  set('k-ach-s', pct+'% achievement');
  set('k-z', zc);
  set('k-z-s', zc>0?'Action required':'All clear ✓');
}

// ── MANAGER STATS (row 1 right) ───────────────────────────────
function renderMgrStats(){
  const map=mgrMap();
  const html=Object.entries(map).filter(([,v])=>v.size>0).map(([name,m],i)=>{
    const pct=m.tgt>0?((m.ach/m.tgt)*100):0;
    const c=MCLRS[i%MCLRS.length];
    const pc=pct>=80?'#00e676':pct>=50?'#ffab40':'#ff5252';
    const za=m.z4>0?`<span class="msr-zchip" style="background:rgba(255,23,68,.2);color:#ff1744">Z4:${m.z4}</span>`:
              m.z3>0?`<span class="msr-zchip" style="background:rgba(255,82,82,.2);color:#ff5252">Z3:${m.z3}</span>`:
              m.z2>0?`<span class="msr-zchip" style="background:rgba(255,171,64,.2);color:#ffab40">Z2:${m.z2}</span>`:
              `<span class="msr-zchip" style="background:rgba(0,230,118,.15);color:#00e676">✓ OK</span>`;
    return`<div class="mgr-stat-row">
      <div class="msr-av" style="background:${c}">${name[0]}</div>
      <div class="msr-mid">
        <div class="msr-name">${name}</div>
        <div class="msr-info">
          <span>Team <b>${m.size}</b></span>
          <span>Tgt <b>${m.tgt}</b></span>
          <span>Ach <b>${m.ach}</b></span>
          <span>Rec <b style="color:#00e676">${m.rec}</b></span>
        </div>
        <div class="msr-bar"><div class="msr-fill" style="width:${Math.min(pct,100)}%;background:${c}"></div></div>
        <div class="msr-zt">${za}</div>
      </div>
      <div class="msr-right">
        <div class="msr-pct" style="color:${pc}">${pct.toFixed(0)}%</div>
      </div>
    </div>`;
  }).join('');
  setH('mgrStatRows', html || '<div style="color:rgba(255,255,255,0.3);padding:8px">No manager data</div>');
}

// ── MAP ───────────────────────────────────────────────────────
const AREAS=[
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

function getV(a){if(CURVIEW==='data')return a.td;if(CURVIEW==='paid')return a.ps;return a.cv*100;}
function getVL(a){if(CURVIEW==='data')return a.td.toLocaleString();if(CURVIEW==='paid')return a.ps;return a.cv+'%';}

function initMap(){
  if(MAP){drawCircles();return;}
  const el=document.getElementById('dashMap');
  if(!el){console.warn('dashMap element not found');return;}
  MAP=L.map('dashMap',{center:[12.83,77.62],zoom:10,zoomControl:true,attributionControl:false});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19}).addTo(MAP);
  drawCircles();
}

function drawCircles(){
  if(!MAP) return;
  MCIRCLES.forEach(c=>MAP.removeLayer(c));
  MLABELS.forEach(l=>MAP.removeLayer(l));
  MCIRCLES=[]; MLABELS=[];

  const vals=AREAS.map(a=>getV(a)), maxV=Math.max(...vals);

  AREAS.forEach((a,i)=>{
    const v=vals[i], radius=9+(v/maxV)*38;
    const color=MCLRS[i%MCLRS.length];

    const circle=L.circleMarker([a.lat,a.lng],{
      radius, fillColor:color, color:'rgba(255,255,255,0.65)',
      weight:v>maxV*0.4?2.5:1.5, opacity:1, fillOpacity:v>maxV*0.4?0.88:0.65
    }).addTo(MAP);

    circle.on('click',()=>{
      L.popup({className:'bpop',maxWidth:250})
        .setLatLng([a.lat,a.lng])
        .setContent(`<div class="pop-in">
          <div class="pop-name">📍 ${a.n}</div>
          <div class="pop-pin">Pincode: ${a.p}</div>
          <div class="pop-grid">
            <div class="pop-item"><div class="pop-val">${a.td.toLocaleString()}</div><div class="pop-lbl">Total Data</div></div>
            <div class="pop-item"><div class="pop-val" style="color:#eac3d5">${a.ps}</div><div class="pop-lbl">Paid Sellers</div></div>
            <div class="pop-item"><div class="pop-val" style="color:#b7e0d2">${a.ga.toLocaleString()}</div><div class="pop-lbl">GST Active</div></div>
            <div class="pop-item"><div class="pop-val" style="color:#f8c04f">${a.s6}</div><div class="pop-lbl">Sales 6M</div></div>
          </div>
          <div class="pop-foot">📈 Conv: <b>${a.cv}%</b> &nbsp;|&nbsp; 🤝 Meet: <b>${a.mp}%</b></div>
        </div>`)
        .openOn(MAP);
    });

    circle.bindTooltip(`<b>${a.n}</b><br>${getVL(a)}`,{direction:'top'});

    const lbl=L.divIcon({
      className:'',
      html:`<div style="background:${color};color:#1e1b4b;font-size:9px;font-weight:900;font-family:Nunito,sans-serif;padding:2px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.4)">${a.n}</div>`,
      iconAnchor:[-radius-2,8]
    });
    MLABELS.push(L.marker([a.lat,a.lng],{icon:lbl,interactive:false}).addTo(MAP));
    MCIRCLES.push(circle);
  });
}

function setView(v,btn){
  CURVIEW=v;
  document.querySelectorAll('.mb').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  drawCircles();
}

// ── EXECUTIVE TABLE ───────────────────────────────────────────
function renderExecTable(){
  if(!EX.length){
    setH('execBody','<tr><td colspan="6" style="text-align:center;color:rgba(255,255,255,0.3);padding:20px">No data loaded</td></tr>');
    return;
  }
  const sorted=[...EX].sort((a,b)=>b.jpct-a.jpct);
  const ZC={Z4:'#ff1744',Z3:'#ff5252',Z2:'#ffab40',RECOVERY:'#00e676',OK:'#00e676'};
  const ZB={Z4:'rgba(255,23,68,.15)',Z3:'rgba(255,82,82,.12)',Z2:'rgba(255,171,64,.12)',RECOVERY:'rgba(0,230,118,.1)',OK:'rgba(0,230,118,.08)'};
  setH('execBody', sorted.map((e,i)=>{
    const pc=e.jpct>=80?'#00e676':e.jpct>=50?'#ffab40':'#ff5252';
    const zc=ZC[e.zf]||'rgba(255,255,255,0.3)';
    const zb=ZB[e.zf]||'transparent';
    return`<tr>
      <td style="font-size:14px;width:28px">${i<3?MEDALS[i]:`<span style="color:rgba(255,255,255,.3);font-weight:800;font-size:12px">${i+1}</span>`}</td>
      <td style="font-weight:${i<3?800:700}">${e.name}</td>
      <td>${e.mgr}</td>
      <td style="font-weight:800">${e.jach}/${e.jtgt}</td>
      <td style="font-weight:800;color:${pc}">${e.jpct.toFixed(0)}%</td>
      <td><span class="zchip" style="background:${zb};color:${zc}">${e.zf||'—'}</span></td>
    </tr>`;
  }).join(''));
}

// ── DONUTS ────────────────────────────────────────────────────
function renderDonuts(){
  const totTD=AREAS.reduce((a,x)=>a+x.td,0);
  const totPS=AREAS.reduce((a,x)=>a+x.ps,0);
  const avgCV=(AREAS.reduce((a,x)=>a+x.cv,0)/AREAS.length).toFixed(1);

  function makeDonut(id,valId,data,colors,label){
    const ctx=document.getElementById(id);
    if(!ctx) return;
    if(DC[id]) DC[id].destroy();
    DC[id]=new Chart(ctx,{type:'doughnut',data:{
      datasets:[{data,backgroundColor:colors,borderWidth:0,cutout:'65%'}]
    },options:{responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}}}});
    set(valId,label);
  }

  // Data donut: paid vs rest
  const remTD=Math.max(0,totTD-totPS);
  makeDonut('d1','dv1',[totPS,remTD],['#809cce','rgba(128,156,206,0.2)'],totTD.toLocaleString());

  // Paid donut
  const annualPS=AREAS.reduce((a,x)=>a+(x.ps||0),0);
  makeDonut('d2','dv2',[annualPS,Math.max(0,totPS-annualPS)],['#b7e0d2','rgba(183,224,210,0.2)'],totPS);

  // Conv donut
  const convNum=parseFloat(avgCV);
  makeDonut('d3','dv3',[convNum,Math.max(0,5-convNum)],['#eac3d5','rgba(234,195,213,0.2)'],avgCV+'%');
}

// ── MANAGERS PAGE ─────────────────────────────────────────────
function renderManagersPage(){
  const map=mgrMap();
  setH('mgrGrid',Object.entries(map).filter(([,v])=>v.size>0).map(([name,m],i)=>{
    const pct=m.tgt>0?((m.ach/m.tgt)*100):0;
    const c=MCLRS[i%MCLRS.length], pc=pct>=80?'#00e676':pct>=50?'#ffab40':'#ff5252';
    const as=m.streaks.length?(m.streaks.reduce((a,b)=>a+b,0)/m.streaks.length).toFixed(1):0;
    return`<div class="mc">
      <div class="mc-top" style="background:linear-gradient(90deg,${c},${c}66)"></div>
      <div class="mc-h">
        <div><div class="mc-name">${name}</div><div class="mc-sz">${m.size} executives</div></div>
        <div class="mc-pct" style="color:${pc}">${pct.toFixed(0)}%</div>
      </div>
      <div class="mc-note">Target: ${m.tgt} → Achieved: ${m.ach}</div>
      <div class="mc-bar"><div class="mc-fill" style="width:${Math.min(pct,100)}%;background:${c}"></div></div>
      <div class="mc-stats">
        <div><div class="mcs-v" style="color:${c}">${m.size}</div><div class="mcs-l">Team</div></div>
        <div><div class="mcs-v" style="color:${pc}">${pct.toFixed(0)}%</div><div class="mcs-l">Ach%</div></div>
        <div><div class="mcs-v" style="color:#00e676">${m.rec}</div><div class="mcs-l">Rec↑</div></div>
      </div>
      <div class="mc-zrow">
        <div class="mzc" style="background:rgba(255,171,64,.15);color:#ffab40">Z2: ${m.z2}</div>
        <div class="mzc" style="background:rgba(255,82,82,.15);color:#ff5252">Z3: ${m.z3}</div>
        <div class="mzc" style="background:rgba(255,23,68,.18);color:#ff1744">Z4: ${m.z4}</div>
        <div class="mzc" style="background:rgba(0,212,232,.12);color:#00d4e8">Str: ${as}w</div>
      </div>
    </div>`;
  }).join(''));
}

// ── LEADERBOARD ──────────────────────────────────────────────
function renderLeaderboard(){
  const s=[...EX].sort((a,b)=>b.jpct-a.jpct);
  const pc=p=>p>=80?'pp-g':p>=50?'pp-a':'pp-r';
  const rc=r=>({GREEN:'rc-G',AMBER:'rc-A',RED:'rc-R',CRITICAL:'rc-C'}[r]||'rc-R');
  const tc=t=>t==='▲'?'tu':t==='▼'?'td':'ts';
  setH('lbBody',s.map((e,i)=>`
    <tr>
      <td>${i<3?MEDALS[i]:`<span style="color:rgba(255,255,255,.3);font-weight:800">${i+1}</span>`}</td>
      <td style="font-weight:800">${e.name}</td>
      <td style="color:rgba(255,255,255,.4)">${e.mgr}</td>
      <td style="color:rgba(255,255,255,.4)">${e.jtgt}</td>
      <td style="font-weight:800">${e.jach}</td>
      <td><span class="pp ${pc(e.jpct)}">${e.jpct.toFixed(1)}%</span></td>
      <td style="color:rgba(255,255,255,.4)">${e.streak}w</td>
      <td style="color:#809cce;font-weight:800">${e.score}</td>
      <td class="${tc(e.trend)}">${e.trend}</td>
      <td><span class="rc ${rc(e.risk)}">${e.risk}</span></td>
    </tr>`).join(''));
}

// ── Z PAGE ───────────────────────────────────────────────────
function renderZPage(){
  const zo={Z4:0,Z3:1,Z2:2};
  const list=EX.filter(e=>['Z2','Z3','Z4'].includes(e.zf)).sort((a,b)=>(zo[a.zf]??9)-(zo[b.zf]??9));
  const act={Z4:'🚨 Escalate to BM immediately',Z3:'⚠ Manager Review + PIP',Z2:'📋 Immediate 1:1 Coaching'};
  if(!list.length){setH('zcGrid','<div class="card" style="text-align:center;padding:48px;color:#00e676;font-size:18px;font-weight:800">✅ No Z escalations this period!</div>');return;}
  setH('zcGrid',list.map(e=>`
    <div class="zc ${e.zf.toLowerCase()}">
      <div class="zc-flag">${e.zf}</div>
      <div class="zc-name">${e.name}</div>
      <div class="zc-mgr">Manager: ${e.mgr}</div>
      <div class="zc-st">
        <div class="zcs"><div class="zcs-v">${e.jpct.toFixed(0)}%</div><div class="zcs-l">Jun Ach</div></div>
        <div class="zcs"><div class="zcs-v">${e.streak}w</div><div class="zcs-l">Streak</div></div>
        <div class="zcs"><div class="zcs-v">${e.score}</div><div class="zcs-l">Score</div></div>
        <div class="zcs"><div class="zcs-v">${e.trend}</div><div class="zcs-l">Trend</div></div>
      </div>
      <div class="zc-act">${act[e.zf]}</div>
    </div>`).join(''));
}

// ── HEATMAP ──────────────────────────────────────────────────
function renderHeatmap(){
  const s=[...EX].sort((a,b)=>b.jpct-a.jpct);
  const day=new Date().getDate(),mo=new Date().getMonth();
  let ja=0;if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  const wh=['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
  const hdr=`<tr><th style="text-align:left">Employee</th><th style="text-align:left">Manager</th>${wh.map((h,i)=>`<th class="${i===1?'hsep':''}">${h}</th>`).join('')}<th>Ach</th><th>Tgt</th><th>%</th><th>Z</th></tr>`;
  const rows=s.map(e=>{
    const aw=[e.mw[3],...e.jw];
    const wc=aw.map((v,wi)=>{const f=wi>0&&(wi-1)>=ja;return`<td class="${f?'hf':v>0?'hs':'hz'} ${wi===1?'hsep':''}">${f?'▪':v>0?v:'✗'}</td>`;}).join('');
    const pc=e.jpct>=80?'#00e676':e.jpct>=50?'#ffab40':'#ff5252';
    const zc={Z4:'#ff1744',Z3:'#ff5252',Z2:'#ffab40',RECOVERY:'#00e676',OK:'#00e676'}[e.zf]||'rgba(255,255,255,.3)';
    return`<tr><td class="hn">${e.name}</td><td class="hm">${e.mgr}</td>${wc}<td style="font-weight:800">${e.jach}</td><td style="color:rgba(255,255,255,.3)">${e.jtgt}</td><td style="font-weight:800;color:${pc}">${e.jpct.toFixed(0)}%</td><td style="font-weight:800;color:${zc}">${e.zf||'—'}</td></tr>`;
  }).join('');
  setH('hmWrap',`<table class="hmtbl"><thead>${hdr}</thead><tbody>${rows}</tbody></table>`);
}

// ── RECOVERY ─────────────────────────────────────────────────
function renderRecovery(){
  const c=[...EX].filter(e=>e.rec>0).sort((a,b)=>b.rec-a.rec);
  const m=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];
  setH('champGrid',!c.length
    ?'<div class="card" style="text-align:center;padding:48px;color:rgba(255,255,255,.3);font-size:15px">No recoveries this period</div>'
    :c.map((e,i)=>`<div class="cc"><div class="cc-med">${m[i]||'★'}</div><div class="cc-name">${e.name}</div><div class="cc-mgr">${e.mgr}</div><div class="cc-cnt">${e.rec}</div><div class="cc-lbl">Recoveries</div></div>`).join(''));
}

// ── HELPERS ──────────────────────────────────────────────────
function set(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
function setH(id,h){const el=document.getElementById(id);if(el)el.innerHTML=h;}

function mgrMap(){
  const map={};
  MGRS.forEach(m=>map[m]={size:0,tgt:0,ach:0,z2:0,z3:0,z4:0,streaks:[],rec:0});
  EX.forEach(e=>{
    const k=MGRS.find(m=>e.mgr===m||e.mgr.toLowerCase()===m.toLowerCase())||e.mgr;
    if(!map[k])map[k]={size:0,tgt:0,ach:0,z2:0,z3:0,z4:0,streaks:[],rec:0};
    map[k].size++;map[k].tgt+=e.jtgt;map[k].ach+=e.jach;
    if(e.zf==='Z2')map[k].z2++;if(e.zf==='Z3')map[k].z3++;if(e.zf==='Z4')map[k].z4++;
    map[k].streaks.push(e.streak);map[k].rec+=e.rec;
  });
  return map;
}

// ── DEMO DATA ─────────────────────────────────────────────────
function loadDemo(){
  const rows=[
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
    ['Shashank','Arun','','','',0,0,'',2,0,'',0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];
  buildExecs(rows);
  renderAll();
  set('syncLbl','Demo data • Paste CSV URL in app.js');
}
