const SHEET_CSV_URL = "YOUR_GOOGLE_SHEET_CSV_URL_HERE";
const COL={EMP:0,MGR:1,DOJ:2,DAYS:3,BKT:4,TAPR:5,AAPR:6,MPCT:7,JTGT:8,JACH:9,JPCT:10,
  AW1:11,AW2:12,AW3:13,AW4:14,AW5:15,MW1:16,MW2:17,MW3:18,MW4:19,JW1:20,JW2:21,JW3:22,JW4:23};
const MGRS=["Annesh","Mohan","Arun","Manoj C Y","Pranav"];
const MCLRS=["#809cce","#94b8d0","#b7e0d2","#d6eadf","#eac3d5"]; // PASTEL colors for managers
const MEDALS=["🥇","🥈","🥉"];
const PAGE_TITLES={dashboard:"Dashboard",managers:"Manager Performance",leaderboard:"Leaderboard",zreport:"Z-Report",heatmap:"Weekly Heatmap",recovery:"Recovery Champions"};

let EX=[]; let dashMap=null; let mapLayers=[]; let curMapView='data';

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

// ── BOOT ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded",()=>{loadSavedLogo();loadData();});

function uploadLogo(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=ev=>{
    const u=ev.target.result;
    document.getElementById('lionImg').src=u;
    document.getElementById('lionImg').style.display='block';
    document.getElementById('lionFallback').style.display='none';
    try{localStorage.setItem('blogo',u);}catch{}
  };r.readAsDataURL(f);
}
function loadSavedLogo(){
  try{const s=localStorage.getItem('blogo');if(s){document.getElementById('lionImg').src=s;document.getElementById('lionImg').style.display='block';document.getElementById('lionFallback').style.display='none';}}catch{}
}

function nav(pg,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('pg-'+pg).classList.add('on');
  el.classList.add('active');
  document.getElementById('pageTitle').textContent=PAGE_TITLES[pg]||pg;
  if(pg==='dashboard'&&dashMap)setTimeout(()=>dashMap.invalidateSize(),100);
}

async function loadData(){
  s('syncLbl','Syncing…');
  if(!SHEET_CSV_URL||SHEET_CSV_URL.includes('YOUR_GOOGLE')){demo();return;}
  try{const r=await fetch(SHEET_CSV_URL+'&t='+Date.now());if(!r.ok)throw 0;proc(await r.text());}
  catch{demo();}
}
function proc(txt){build(parseCSV(txt));renderAll();s('syncLbl','Synced '+new Date().toLocaleTimeString('en-IN'));}
function parseCSV(txt){
  return txt.trim().split('\n').map(line=>{
    const c=[];let cur='',q=false;
    for(let i=0;i<line.length;i++){if(line[i]==='"'){q=!q;continue;}if(line[i]===','&&!q){c.push(cur.trim());cur='';continue;}cur+=line[i];}
    c.push(cur.trim());return c;
  });
}

// ── BUILD ────────────────────────────────────────────────────
function build(rows){
  EX=[];
  const day=new Date().getDate(),mo=new Date().getMonth();
  let ja=0;if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  for(let r=2;r<rows.length;r++){
    const row=rows[r];const nm=(row[COL.EMP]||'').trim();
    if(!nm||!isNaN(+nm))continue;
    const mgr=(row[COL.MGR]||'').trim();
    const jtgt=+row[COL.JTGT]||0,jach=+row[COL.JACH]||0;
    const jpct=jtgt>0?(jach/jtgt)*100:0;
    const mw=[COL.MW1,COL.MW2,COL.MW3,COL.MW4].map(c=>+row[c]||0);
    const jw=[COL.JW1,COL.JW2,COL.JW3,COL.JW4].map(c=>+row[c]||0);
    const aw=[COL.AW1,COL.AW2,COL.AW3,COL.AW4,COL.AW5].map(c=>+row[c]||0);
    const zv=[mw[3],...jw.slice(0,ja)];
    const zf=zflag(zv),streak=zstreak(zv),trend=ztrend(zv),rec=zrec(zv);
    const risk=zrisk(jpct,zf),score=zscore(jpct,rec,zv,streak);
    EX.push({name:nm,mgr,jtgt,jach,jpct,aw,mw,jw,zv,ja,zf,streak,trend,rec,risk,score});
  }
}

function zflag(v){if(v.length<2)return null;if(v[v.length-2]===0&&v[v.length-1]>0)return'RECOVERY';let z=0;for(let i=v.length-1;i>=0;i--){if(v[i]===0)z++;else break;}return z>=4?'Z4':z>=3?'Z3':z>=2?'Z2':z===0?'OK':null;}
function zstreak(v){let s=0;for(let i=v.length-1;i>=0;i--){if(v[i]>0)s++;else break;}return s;}
function ztrend(v){if(v.length<2)return'→';return v[v.length-1]>v[v.length-2]?'▲':v[v.length-1]<v[v.length-2]?'▼':'→';}
function zrec(v){let c=0;for(let i=1;i<v.length;i++)if(v[i-1]===0&&v[i]>0)c++;return c;}
function zrisk(p,z){if(z==='Z3'||z==='Z4')return'CRITICAL';return p>=80?'GREEN':p>=50?'AMBER':'RED';}
function zscore(p,r,v,st){const nz=v.filter(x=>x>0).length,cons=v.length?(nz/v.length)*100:0;return Math.round(Math.min(p,100)*.4+cons*.2+Math.min(r*33,100)*.2+Math.min(st*25,100)*.2);}

// ── RENDER ───────────────────────────────────────────────────
function renderAll(){
  renderKPIs();
  renderMgrFullCards();
  initDashMap();
  renderExecTable();
  renderManagersPage();
  renderLeaderboard();
  renderZPage();
  renderHeatmap();
  renderRecovery();
}

// ── KPIs ─────────────────────────────────────────────────────
function renderKPIs(){
  const tgt=EX.reduce((a,e)=>a+e.jtgt,0),ach=EX.reduce((a,e)=>a+e.jach,0);
  const pct=tgt>0?((ach/tgt)*100).toFixed(1):0;
  const zc=EX.filter(e=>['Z2','Z3','Z4'].includes(e.zf)).length;
  s('k-team',EX.length);  s('k-team-sub','Bommasandara Branch');
  s('k-ach',`${ach}/${tgt}`);  s('k-ach-pct',`${pct}% achievement`);
  s('k-z',zc);  s('k-z-sub',zc>0?'Action required':'All clear ✓');
}

// ── MANAGER FULL CARDS (Row 1 right panel) ───────────────────
function renderMgrFullCards(){
  const map=mgrMap();
  sh('mgrFullCards',Object.entries(map).filter(([,v])=>v.size>0).map(([name,m],i)=>{
    const pct=m.tgt>0?((m.ach/m.tgt)*100):0;
    const c=MCLRS[i%MCLRS.length]; // pastel color
    const pc=pct>=80?'#00e676':pct>=50?'#ffab40':'#ff5252';
    const as=m.streaks.length?(m.streaks.reduce((a,b)=>a+b,0)/m.streaks.length).toFixed(1):0;
    const zAlert=m.z4>0?`<span class="mfr-zchip" style="background:rgba(255,23,68,.2);color:#ff1744">Z4:${m.z4}</span>`:
                 m.z3>0?`<span class="mfr-zchip" style="background:rgba(255,82,82,.2);color:#ff5252">Z3:${m.z3}</span>`:
                 m.z2>0?`<span class="mfr-zchip" style="background:rgba(255,171,64,.2);color:#ffab40">Z2:${m.z2}</span>`:
                 `<span class="mfr-zchip" style="background:rgba(0,230,118,.15);color:#00e676">✓ OK</span>`;
    return`<div class="mgr-full-row">
      <div class="mfr-av" style="background:${c};color:#1e1b4b">${name[0]}</div>
      <div class="mfr-center">
        <div class="mfr-name">${name}</div>
        <div class="mfr-stats">
          <div class="mfr-stat">Team <b>${m.size}</b></div>
          <div class="mfr-stat">Tgt <b>${m.tgt}</b></div>
          <div class="mfr-stat">Ach <b>${m.ach}</b></div>
          <div class="mfr-stat">Str <b>${as}w</b></div>
          <div class="mfr-stat">Rec <b style="color:#00e676">${m.rec}</b></div>
        </div>
        <div class="mfr-bar-wrap">
          <div class="mfr-bar"><div class="mfr-fill" style="width:${Math.min(pct,100)}%;background:${c}"></div></div>
        </div>
        <div class="mfr-z">${zAlert}</div>
      </div>
      <div class="mfr-right">
        <div class="mfr-pct" style="color:${pc}">${pct.toFixed(0)}%</div>
        <div class="mfr-sub">${m.ach}/${m.tgt}</div>
      </div>
    </div>`;
  }).join(''));
}

// ── DASHBOARD MAP ────────────────────────────────────────────
function initDashMap(){
  if(dashMap){drawCircles();return;}
  const el=document.getElementById('dashMap');if(!el)return;
  dashMap=L.map('dashMap',{center:[12.83,77.62],zoom:10,zoomControl:true,attributionControl:false});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19}).addTo(dashMap);
  drawCircles();
}

function getV(a){if(curMapView==='data')return a.td;if(curMapView==='paid')return a.ps;if(curMapView==='conv')return a.cv*100;return a.td;}
function getVLabel(a){if(curMapView==='data')return a.td.toLocaleString();if(curMapView==='paid')return a.ps;if(curMapView==='conv')return a.cv+'%';return a.td;}

function drawCircles(){
  if(!dashMap)return;
  mapLayers.forEach(l=>dashMap.removeLayer(l));mapLayers=[];
  const vals=AREAS.map(a=>getV(a)),maxV=Math.max(...vals);

  AREAS.forEach((a,i)=>{
    const v=vals[i],radius=9+(v/maxV)*38;
    const color=MCLRS[i%MCLRS.length]||'#94b8d0';
    const isHot=v>maxV*0.45;

    const circle=L.circleMarker([a.lat,a.lng],{
      radius,fillColor:color,color:'rgba(255,255,255,0.7)',
      weight:isHot?2.5:1.5,opacity:1,fillOpacity:isHot?0.88:0.65
    }).addTo(dashMap);

    circle.on('click',()=>{
      L.popup({className:'bmap-popup',maxWidth:250,closeButton:true})
        .setLatLng([a.lat,a.lng])
        .setContent(`<div class="mp-inner">
          <div class="mp-name">📍 ${a.n}</div>
          <div class="mp-pin">Pincode: ${a.p}</div>
          <div class="mp-grid">
            <div class="mp-item"><div class="mp-val">${a.td.toLocaleString()}</div><div class="mp-lbl">Total Data</div></div>
            <div class="mp-item"><div class="mp-val" style="color:#eac3d5">${a.ps}</div><div class="mp-lbl">Paid Sellers</div></div>
            <div class="mp-item"><div class="mp-val" style="color:#b7e0d2">${a.ga.toLocaleString()}</div><div class="mp-lbl">GST Active</div></div>
            <div class="mp-item"><div class="mp-val" style="color:#f8c04f">${a.s6}</div><div class="mp-lbl">Sales 6M</div></div>
          </div>
          <div class="mp-foot">📈 Conv: <b>${a.cv}%</b> &nbsp;|&nbsp; 🤝 Meeting: <b>${a.mp}%</b></div>
        </div>`)
        .openOn(dashMap);
    });

    circle.bindTooltip(`<b style="font-size:12px">${a.n}</b><br><span style="font-size:11px">${getVLabel(a)}</span>`,{permanent:false,direction:'top'});

    // Area label
    const lbl=L.divIcon({className:'',html:`<div style="background:${color};color:#1e1b4b;font-size:9px;font-weight:900;font-family:Nunito;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${a.n}</div>`,iconAnchor:[-radius-2,8]});
    const lm=L.marker([a.lat,a.lng],{icon:lbl,interactive:false}).addTo(dashMap);
    mapLayers.push(circle,lm);
  });
}

function setMapView(v,btn){
  curMapView=v;
  document.querySelectorAll('.mbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  drawCircles();
}

// ── EXECUTIVE PERFORMANCE TABLE ───────────────────────────────
function renderExecTable(){
  const sorted=[...EX].sort((a,b)=>b.jpct-a.jpct);
  const zColors={Z4:'#ff1744',Z3:'#ff5252',Z2:'#ffab40',RECOVERY:'#00e676',OK:'#00e676'};
  const zBgs={Z4:'rgba(255,23,68,.15)',Z3:'rgba(255,82,82,.12)',Z2:'rgba(255,171,64,.12)',RECOVERY:'rgba(0,230,118,.1)',OK:'rgba(0,230,118,.08)'};
  sh('execBody',sorted.map((e,i)=>{
    const pc=e.jpct>=80?'#00e676':e.jpct>=50?'#ffab40':'#ff5252';
    const zc=zColors[e.zf]||'rgba(255,255,255,0.3)';
    const zb=zBgs[e.zf]||'transparent';
    return`<tr>
      <td style="font-size:14px">${i<3?MEDALS[i]:`<span style="color:rgba(255,255,255,0.3);font-weight:800;font-size:12px">${i+1}</span>`}</td>
      <td style="font-weight:${i<3?800:700};font-size:${i<3?14:13}px">${e.name}</td>
      <td>${e.mgr}</td>
      <td>${e.jach}/${e.jtgt}</td>
      <td style="font-weight:800;color:${pc}">${e.jpct.toFixed(0)}%</td>
      <td><span class="zf-chip" style="background:${zb};color:${zc}">${e.zf||'—'}</span></td>
    </tr>`;
  }).join(''));
}

// ── MANAGERS FULL PAGE ────────────────────────────────────────
function renderManagersPage(){
  const map=mgrMap();
  sh('mgrGrid',Object.entries(map).filter(([,v])=>v.size>0).map(([name,m],i)=>{
    const pct=m.tgt>0?((m.ach/m.tgt)*100):0;
    const c=MCLRS[i%MCLRS.length],pc=pct>=80?'#00e676':pct>=50?'#ffab40':'#ff5252';
    const as=m.streaks.length?(m.streaks.reduce((a,b)=>a+b,0)/m.streaks.length).toFixed(1):0;
    return`<div class="mc">
      <div class="mc-accent" style="background:linear-gradient(90deg,${c},${c}66)"></div>
      <div class="mc-h">
        <div><div class="mc-name">${name}</div><div class="mc-team">${m.size} executives</div></div>
        <div class="mc-pct" style="color:${pc}">${pct.toFixed(0)}%</div>
      </div>
      <div class="mc-info">Target: ${m.tgt} → Achieved: ${m.ach}</div>
      <div class="mc-prog"><div class="mc-fill" style="width:${Math.min(pct,100)}%;background:${c}"></div></div>
      <div class="mc-stats">
        <div class="mcs"><div class="mcs-v" style="color:${c}">${m.size}</div><div class="mcs-l">Team</div></div>
        <div class="mcs"><div class="mcs-v" style="color:${pc}">${pct.toFixed(0)}%</div><div class="mcs-l">Ach%</div></div>
        <div class="mcs"><div class="mcs-v" style="color:#00e676">${m.rec}</div><div class="mcs-l">Rec↑</div></div>
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
  const sorted=[...EX].sort((a,b)=>b.jpct-a.jpct);
  const pc=p=>p>=80?'pp-g':p>=50?'pp-a':'pp-r';
  const rc=r=>({GREEN:'rc-G',AMBER:'rc-A',RED:'rc-R',CRITICAL:'rc-C'}[r]||'rc-R');
  const tc=t=>t==='▲'?'tu':t==='▼'?'td':'ts';
  sh('lbBody',sorted.map((e,i)=>`
    <tr>
      <td>${i<3?MEDALS[i]:`<span style="color:rgba(255,255,255,0.3);font-weight:800">${i+1}</span>`}</td>
      <td style="font-weight:800">${e.name}</td>
      <td style="color:rgba(255,255,255,0.4)">${e.mgr}</td>
      <td style="color:rgba(255,255,255,0.4)">${e.jtgt}</td>
      <td style="font-weight:800">${e.jach}</td>
      <td><span class="pp ${pc(e.jpct)}">${e.jpct.toFixed(1)}%</span></td>
      <td style="color:rgba(255,255,255,0.4)">${e.streak}w</td>
      <td style="color:#00d4e8;font-weight:800">${e.score}</td>
      <td class="${tc(e.trend)}">${e.trend}</td>
      <td><span class="rc ${rc(e.risk)}">${e.risk}</span></td>
    </tr>`).join(''));
}

// ── Z PAGE ───────────────────────────────────────────────────
function renderZPage(){
  const zo={Z4:0,Z3:1,Z2:2};
  const list=EX.filter(e=>['Z2','Z3','Z4'].includes(e.zf)).sort((a,b)=>(zo[a.zf]??9)-(zo[b.zf]??9));
  const act={Z4:'🚨 Escalate to BM immediately',Z3:'⚠ Manager Review + PIP',Z2:'📋 Immediate 1:1 Coaching'};
  if(!list.length){sh('zcGrid','<div class="card" style="text-align:center;padding:48px;color:#00e676;font-size:18px;font-weight:800">✅ No Z escalations this period!</div>');return;}
  sh('zcGrid',list.map(e=>`
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
  const sorted=[...EX].sort((a,b)=>b.jpct-a.jpct);
  const day=new Date().getDate(),mo=new Date().getMonth();
  let ja=0;if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  const wh=['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
  const hdr=`<tr><th style="text-align:left">Employee</th><th style="text-align:left">Manager</th>${wh.map((h,i)=>`<th class="${i===1?'hsep':''}">${h}</th>`).join('')}<th>Ach</th><th>Tgt</th><th>%</th><th>Z Flag</th></tr>`;
  const rows=sorted.map(e=>{
    const aw=[e.mw[3],...e.jw];
    const wc=aw.map((v,wi)=>{const f=wi>0&&(wi-1)>=ja;return`<td class="${f?'hf':v>0?'hs':'hz'} ${wi===1?'hsep':''}">${f?'▪':v>0?v:'✗'}</td>`;}).join('');
    const pc=e.jpct>=80?'#00e676':e.jpct>=50?'#ffab40':'#ff5252';
    const zc={Z4:'#ff1744',Z3:'#ff5252',Z2:'#ffab40',RECOVERY:'#00e676',OK:'#00e676'}[e.zf]||'rgba(255,255,255,0.3)';
    return`<tr><td class="hn">${e.name}</td><td class="hm">${e.mgr}</td>${wc}<td style="font-weight:800">${e.jach}</td><td style="color:rgba(255,255,255,0.3)">${e.jtgt}</td><td style="font-weight:800;color:${pc}">${e.jpct.toFixed(0)}%</td><td style="font-weight:800;color:${zc}">${e.zf||'—'}</td></tr>`;
  }).join('');
  sh('hmWrap',`<table class="hmtbl"><thead>${hdr}</thead><tbody>${rows}</tbody></table>`);
}

// ── RECOVERY ─────────────────────────────────────────────────
function renderRecovery(){
  const c=[...EX].filter(e=>e.rec>0).sort((a,b)=>b.rec-a.rec);
  const m=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];
  sh('champGrid',!c.length?'<div class="card" style="text-align:center;padding:48px;color:rgba(255,255,255,0.3);font-size:15px">No recoveries this period</div>':
    c.map((e,i)=>`<div class="cc"><div class="cc-med">${m[i]||'★'}</div><div class="cc-name">${e.name}</div><div class="cc-mgr">${e.mgr}</div><div class="cc-cnt">${e.rec}</div><div class="cc-lbl">Recoveries</div></div>`).join(''));
}

// ── HELPERS ──────────────────────────────────────────────────
function s(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
function sh(id,h){const el=document.getElementById(id);if(el)el.innerHTML=h;}
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

// ── DEMO ─────────────────────────────────────────────────────
function demo(){
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
  build(rows);renderAll();s('syncLbl','Demo • Paste CSV URL in app.js');
}
