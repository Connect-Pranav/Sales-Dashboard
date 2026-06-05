// ── CONFIG ───────────────────────────────────────────────────
const SHEET_CSV_URL = "YOUR_GOOGLE_SHEET_CSV_URL_HERE";

const COL={EMP:0,MGR:1,DOJ:2,DAYS:3,BKT:4,TAPR:5,AAPR:6,MPCT:7,JTGT:8,JACH:9,JPCT:10,
  AW1:11,AW2:12,AW3:13,AW4:14,AW5:15,MW1:16,MW2:17,MW3:18,MW4:19,JW1:20,JW2:21,JW3:22,JW4:23};

const MGRS  = ["Annesh","Mohan","Arun","Manoj C Y","Pranav"];
const MCLRS = ["#00d4e8","#e040fb","#00e676","#f8c04f","#ff7043"];
const MEDALS= ["🥇","🥈","🥉"];
const PAGE_TITLES={dashboard:"Dashboard",managers:"Manager Performance",
  leaderboard:"Leaderboard",zreport:"Z-Report",heatmap:"Weekly Heatmap",recovery:"Recovery Champions"};

let EX=[]; let dashMap=null; let mapCircles=[]; let mapLabels=[];
let currentMapView='data';

// BLR area data — 13 pincodes
const AREAS=[
  {pincode:560076,area:"Bannerghatta Rd",lat:12.8729,lng:77.5972,total_data:7093,paid_seller:193,gst_active:5040,sale_6m:52,conv_pct:0.73,meeting_pct:6.01},
  {pincode:560081,area:"Chandapura",lat:12.8161,lng:77.6701,total_data:163,paid_seller:7,gst_active:125,sale_6m:2,conv_pct:1.23,meeting_pct:12.27},
  {pincode:560083,area:"Bannerghatta",lat:12.8616,lng:77.5752,total_data:2185,paid_seller:105,gst_active:1660,sale_6m:34,conv_pct:1.56,meeting_pct:8.6},
  {pincode:560099,area:"Bommasandra",lat:12.8144,lng:77.681,total_data:3815,paid_seller:169,gst_active:2929,sale_6m:66,conv_pct:1.73,meeting_pct:16.17},
  {pincode:560100,area:"Electronics City",lat:12.8399,lng:77.6769,total_data:5438,paid_seller:139,gst_active:3648,sale_6m:42,conv_pct:0.77,meeting_pct:9.29},
  {pincode:560102,area:"HSR Layout",lat:12.9116,lng:77.6389,total_data:4890,paid_seller:89,gst_active:3739,sale_6m:31,conv_pct:0.63,meeting_pct:3.11},
  {pincode:560105,area:"Anekal taluk",lat:12.7908,lng:77.6962,total_data:2191,paid_seller:117,gst_active:1722,sale_6m:41,conv_pct:1.87,meeting_pct:13.74},
  {pincode:560108,area:"Anjanapura",lat:12.8465,lng:77.5526,total_data:135,paid_seller:9,gst_active:104,sale_6m:1,conv_pct:0.74,meeting_pct:9.63},
  {pincode:561229,area:"Ramanagra",lat:12.7167,lng:77.2833,total_data:20,paid_seller:0,gst_active:9,sale_6m:0,conv_pct:0.0,meeting_pct:5.0},
  {pincode:562106,area:"Anekal taluk II",lat:12.7762,lng:77.7201,total_data:1620,paid_seller:51,gst_active:1327,sale_6m:20,conv_pct:1.23,meeting_pct:12.04},
  {pincode:562107,area:"Attible",lat:12.8074,lng:77.7563,total_data:1610,paid_seller:57,gst_active:1283,sale_6m:17,conv_pct:1.06,meeting_pct:11.37},
  {pincode:562112,area:"Harohalli",lat:12.7108,lng:77.5558,total_data:591,paid_seller:10,gst_active:513,sale_6m:3,conv_pct:0.51,meeting_pct:5.41},
  {pincode:562125,area:"Sarjapura",lat:12.8876,lng:77.7862,total_data:1762,paid_seller:60,gst_active:1363,sale_6m:27,conv_pct:1.53,meeting_pct:11.24}
];

// Pastel area colors
const AREA_COLORS=['#809cce','#94b8d0','#b7e0d2','#d6eadf','#eac3d5',
  '#a8c8e8','#c8e8d8','#e8c8d8','#b8d4e8','#d8e8c8','#e8d8b8','#c8b8e8','#b8e8c8'];

// ── BOOT ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded",()=>{
  loadSavedLogo();
  loadData();
});

function uploadLogo(e){
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=ev=>{
    const url=ev.target.result;
    document.getElementById('lionImg').src=url;
    document.getElementById('lionImg').style.display='block';
    document.getElementById('lionFallback').style.display='none';
    try{localStorage.setItem('bomma_logo',url);}catch{}
  };
  r.readAsDataURL(file);
}
function loadSavedLogo(){
  try{const s=localStorage.getItem('bomma_logo');if(s){document.getElementById('lionImg').src=s;document.getElementById('lionImg').style.display='block';document.getElementById('lionFallback').style.display='none';}}catch{}
}

// ── NAV ──────────────────────────────────────────────────────
function nav(page,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('pg-'+page).classList.add('on');
  el.classList.add('active');
  document.getElementById('pageTitle').textContent=PAGE_TITLES[page]||page;
  if(page==='dashboard' && dashMap) setTimeout(()=>dashMap.invalidateSize(),100);
}

// ── DATA LOAD ────────────────────────────────────────────────
async function loadData(){
  document.getElementById('syncLbl').textContent='Syncing…';
  if(!SHEET_CSV_URL||SHEET_CSV_URL.includes('YOUR_GOOGLE')){demo();return;}
  try{const r=await fetch(SHEET_CSV_URL+'&t='+Date.now());if(!r.ok)throw 0;process(await r.text());}
  catch{demo();}
}

function process(txt){build(parseCSV(txt));renderAll();document.getElementById('syncLbl').textContent='Synced '+new Date().toLocaleTimeString('en-IN');}

function parseCSV(txt){
  return txt.trim().split('\n').map(line=>{
    const cells=[];let cur='',q=false;
    for(let i=0;i<line.length;i++){if(line[i]==='"'){q=!q;continue;}if(line[i]===','&&!q){cells.push(cur.trim());cur='';continue;}cur+=line[i];}
    cells.push(cur.trim());return cells;
  });
}

// ── BUILD ────────────────────────────────────────────────────
function build(rows){
  EX=[];
  const day=new Date().getDate(),mo=new Date().getMonth();
  let ja=0;if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  for(let r=2;r<rows.length;r++){
    const row=rows[r];const name=(row[COL.EMP]||'').trim();
    if(!name||!isNaN(+name))continue;
    const mgr=(row[COL.MGR]||'').trim();
    const jtgt=+row[COL.JTGT]||0,jach=+row[COL.JACH]||0;
    const jpct=jtgt>0?(jach/jtgt)*100:0;
    const mw=[COL.MW1,COL.MW2,COL.MW3,COL.MW4].map(c=>+row[c]||0);
    const jw=[COL.JW1,COL.JW2,COL.JW3,COL.JW4].map(c=>+row[c]||0);
    const aw=[COL.AW1,COL.AW2,COL.AW3,COL.AW4,COL.AW5].map(c=>+row[c]||0);
    const zv=[mw[3],...jw.slice(0,ja)];
    const zf=zflag(zv),streak=zstreak(zv),trend=ztrend(zv),rec=zrec(zv);
    const risk=zrisk(jpct,zf),score=zscore(jpct,rec,zv,streak);
    EX.push({name,mgr,jtgt,jach,jpct,aw,mw,jw,zv,ja,zf,streak,trend,rec,risk,score});
  }
}

function zflag(v){if(v.length<2)return null;if(v[v.length-2]===0&&v[v.length-1]>0)return'RECOVERY';let z=0;for(let i=v.length-1;i>=0;i--){if(v[i]===0)z++;else break;}return z>=4?'Z4':z>=3?'Z3':z>=2?'Z2':z===0?'OK':null;}
function zstreak(v){let s=0;for(let i=v.length-1;i>=0;i--){if(v[i]>0)s++;else break;}return s;}
function ztrend(v){if(v.length<2)return'→';return v[v.length-1]>v[v.length-2]?'▲':v[v.length-1]<v[v.length-2]?'▼':'→';}
function zrec(v){let c=0;for(let i=1;i<v.length;i++)if(v[i-1]===0&&v[i]>0)c++;return c;}
function zrisk(p,z){if(z==='Z3'||z==='Z4')return'CRITICAL';return p>=80?'GREEN':p>=50?'AMBER':'RED';}
function zscore(p,r,v,s){const nz=v.filter(x=>x>0).length,cons=v.length?(nz/v.length)*100:0;return Math.round(Math.min(p,100)*.4+cons*.2+Math.min(r*33,100)*.2+Math.min(s*25,100)*.2);}

// ── RENDER ALL ───────────────────────────────────────────────
function renderAll(){
  renderKPIs();
  initDashMap();
  renderMgrScoreCards();
  renderZSummary();
  renderTopTable();
  renderManagers();
  renderLeaderboard();
  renderZPage();
  renderHeatmap();
  renderRecovery();
}

// ── KPIs (tiny, 3 only) ──────────────────────────────────────
function renderKPIs(){
  const tgt=EX.reduce((a,e)=>a+e.jtgt,0);
  const ach=EX.reduce((a,e)=>a+e.jach,0);
  const pct=tgt>0?((ach/tgt)*100).toFixed(1):0;
  const zc=EX.filter(e=>['Z2','Z3','Z4'].includes(e.zf)).length;

  s('k-team',EX.length);
  sh('k-team-sub','Bommasandara Branch');
  s('k-ach',`${ach}/${tgt}`);
  sh('k-ach-pct',`${pct}% achievement`);
  s('k-z',zc);
  sh('k-z-sub',zc>0?'Action required':'All clear ✓');
}

// ── DASHBOARD MAP (Leaflet, replaces Statistics) ──────────────
function initDashMap(){
  if(dashMap){drawMapCircles();return;}
  const el=document.getElementById('dashMap');
  if(!el)return;

  dashMap=L.map('dashMap',{center:[12.83,77.62],zoom:10,zoomControl:true,attributionControl:false});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19}).addTo(dashMap);
  drawMapCircles();
}

function getMapVal(a){
  if(currentMapView==='data')return a.total_data;
  if(currentMapView==='paid')return a.paid_seller;
  if(currentMapView==='conv')return a.conv_pct*100;
  return a.total_data;
}

function getMapLabel(a){
  if(currentMapView==='data')return a.total_data.toLocaleString();
  if(currentMapView==='paid')return a.paid_seller;
  if(currentMapView==='conv')return a.conv_pct+'%';
  return a.total_data;
}

function drawMapCircles(){
  if(!dashMap)return;
  mapCircles.forEach(c=>dashMap.removeLayer(c));
  mapLabels.forEach(l=>dashMap.removeLayer(l));
  mapCircles=[];mapLabels=[];

  const vals=AREAS.map(a=>getMapVal(a));
  const maxVal=Math.max(...vals);

  AREAS.forEach((a,i)=>{
    const val=vals[i];
    const radius=8+(val/maxVal)*36;
    const color=AREA_COLORS[i%AREA_COLORS.length];
    const isHot=val>maxVal*0.5;

    const circle=L.circleMarker([a.lat,a.lng],{
      radius,fillColor:color,color:'rgba(255,255,255,0.6)',
      weight:isHot?2.5:1.5,opacity:1,fillOpacity:isHot?0.85:0.65
    }).addTo(dashMap);

    // Click popup
    circle.on('click',function(e){
      const popup=L.popup({className:'map-popup-custom',maxWidth:240,closeButton:true})
        .setLatLng([a.lat,a.lng])
        .setContent(`
          <div class="mp-inner">
            <div class="mp-name">📍 ${a.area}</div>
            <div class="mp-pin">Pincode: ${a.pincode}</div>
            <div class="mp-grid">
              <div class="mp-item"><div class="mp-val">${a.total_data.toLocaleString()}</div><div class="mp-lbl">Total Data</div></div>
              <div class="mp-item"><div class="mp-val" style="color:#eac3d5">${a.paid_seller}</div><div class="mp-lbl">Paid Sellers</div></div>
              <div class="mp-item"><div class="mp-val" style="color:#b7e0d2">${a.gst_active.toLocaleString()}</div><div class="mp-lbl">GST Active</div></div>
              <div class="mp-item"><div class="mp-val" style="color:#f8c04f">${a.sale_6m}</div><div class="mp-lbl">Sales 6M</div></div>
            </div>
            <div class="mp-conv">📈 Conv: <b>${a.conv_pct}%</b> &nbsp;|&nbsp; 🤝 Meet: <b>${a.meeting_pct}%</b></div>
          </div>`)
        .openOn(dashMap);
    });

    // Hover tooltip
    circle.bindTooltip(`<b>${a.area}</b><br>${getMapLabel(a)}`,{
      permanent:false,direction:'top',
      className:'',
      offset:[0,-radius]
    });

    mapCircles.push(circle);

    // Area name label
    const lbl=L.divIcon({
      className:'',
      html:`<div style="background:${color};color:#1e1b4b;font-size:8px;font-weight:900;font-family:Nunito,sans-serif;padding:2px 5px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);opacity:0.9">${a.area}</div>`,
      iconAnchor:[-radius-2,8]
    });
    const lm=L.marker([a.lat,a.lng],{icon:lbl,interactive:false}).addTo(dashMap);
    mapLabels.push(lm);
  });
}

function setMapView(v,btn){
  currentMapView=v;
  document.querySelectorAll('.mbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  drawMapCircles();
}

// ── MANAGER SCORECARDS ───────────────────────────────────────
function renderMgrScoreCards(){
  const map=mgrMap();
  sh('mgrScoreCards',Object.entries(map).filter(([,v])=>v.size>0).map(([name,m],i)=>{
    const pct=m.tgt>0?((m.ach/m.tgt)*100):0;
    const c=MCLRS[i%MCLRS.length];
    const pc=pct>=80?'#00e676':pct>=50?'#f8c04f':'#ff5252';
    const za=m.z4>0?`<span class="mgr-zalert" style="color:#ff1744">Z4:${m.z4}</span>`:
              m.z3>0?`<span class="mgr-zalert" style="color:#ff5252">Z3:${m.z3}</span>`:
              m.z2>0?`<span class="mgr-zalert" style="color:#ffab40">Z2:${m.z2}</span>`:
              `<span class="mgr-zalert" style="color:#00e676">✓ OK</span>`;
    return`<div class="mgr-score-row">
      <div class="mgr-av" style="background:${c}">${name[0]}</div>
      <div class="mgr-info">
        <div class="mgr-info-top"><div class="mgr-iname">${name}</div>${za}</div>
        <div class="mgr-bar"><div class="mgr-fill" style="width:${Math.min(pct,100)}%;background:${c}"></div></div>
      </div>
      <div class="mgr-right">
        <div class="mgr-pct" style="color:${pc}">${pct.toFixed(0)}%</div>
        <div class="mgr-meta">${m.ach}/${m.tgt}</div>
      </div>
    </div>`;
  }).join(''));
}

// ── Z SUMMARY ────────────────────────────────────────────────
function renderZSummary(){
  const z2=EX.filter(e=>e.zf==='Z2'),z3=EX.filter(e=>e.zf==='Z3'),z4=EX.filter(e=>e.zf==='Z4');
  sh('zSummary',[
    {lbl:'Z4 — Urgent',list:z4,c:'#ff1744'},
    {lbl:'Z3 — Review',list:z3,c:'#ff5252'},
    {lbl:'Z2 — Monitor',list:z2,c:'#ffab40'},
  ].map(g=>`
    <div class="z-row">
      <div>
        <div class="z-row-lbl" style="color:${g.c}">${g.lbl}</div>
        <div class="z-row-names">${g.list.map(e=>e.name.split(' ')[0]).join(', ')||'None'}</div>
      </div>
      <div class="z-row-count" style="color:${g.c}">${g.list.length}</div>
    </div>`).join(''));
}

// ── TOP TABLE — ALL EXECS, Ach/Tgt instead of Score ──────────
function renderTopTable(){
  const sorted=[...EX].sort((a,b)=>b.jpct-a.jpct);
  const pc=p=>p>=80?'#00e676':p>=50?'#f8c04f':'#ff5252';
  sh('topBody',sorted.map((e,i)=>`
    <tr>
      <td style="font-weight:${i<3?800:600}">
        ${i<3?MEDALS[i]+' ':''}<span style="font-size:${i<3?11:10}px">${e.name}</span>
      </td>
      <td style="color:rgba(255,255,255,0.35);font-size:9px">${e.mgr}</td>
      <td style="font-weight:800;color:${pc(e.jpct)}">${e.jpct.toFixed(0)}%</td>
      <td style="font-weight:800;color:rgba(255,255,255,0.7)">${e.jach}/${e.jtgt}</td>
    </tr>`).join(''));
}

// ── MANAGERS PAGE ────────────────────────────────────────────
function renderManagers(){
  const map=mgrMap();
  sh('mgrGrid',Object.entries(map).filter(([,v])=>v.size>0).map(([name,m],i)=>{
    const pct=m.tgt>0?((m.ach/m.tgt)*100):0;
    const c=MCLRS[i%MCLRS.length],pc=pct>=80?'#00e676':pct>=50?'#f8c04f':'#ff5252';
    const as=m.streaks.length?(m.streaks.reduce((a,b)=>a+b,0)/m.streaks.length).toFixed(1):0;
    return`<div class="mc">
      <div class="mc-accent" style="background:linear-gradient(90deg,${c},${c}44)"></div>
      <div class="mc-h">
        <div><div class="mc-name">${name}</div><div style="font-size:10px;color:rgba(255,255,255,0.35)">${m.size} executives</div></div>
        <div class="mc-pct" style="color:${pc}">${pct.toFixed(0)}%</div>
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:4px">Target: ${m.tgt} → Achieved: ${m.ach}</div>
      <div class="mc-prog"><div class="mc-fill" style="width:${Math.min(pct,100)}%;background:${c}"></div></div>
      <div class="mc-stats">
        <div class="mcs"><div class="mcs-v" style="color:${c}">${m.size}</div><div class="mcs-l">Team</div></div>
        <div class="mcs"><div class="mcs-v" style="color:${pc}">${pct.toFixed(0)}%</div><div class="mcs-l">Ach%</div></div>
        <div class="mcs"><div class="mcs-v" style="color:#00e676">${m.rec}</div><div class="mcs-l">Rec↑</div></div>
      </div>
      <div class="mc-zrow">
        <div class="mzc" style="background:rgba(255,171,64,.15);color:#ffab40">Z2:${m.z2}</div>
        <div class="mzc" style="background:rgba(255,82,82,.15);color:#ff5252">Z3:${m.z3}</div>
        <div class="mzc" style="background:rgba(255,23,68,.18);color:#ff1744">Z4:${m.z4}</div>
        <div class="mzc" style="background:rgba(0,212,232,.12);color:#00d4e8">Str:${as}w</div>
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
  if(!list.length){sh('zcGrid','<div class="card" style="text-align:center;padding:40px;color:#00e676;font-size:16px;font-weight:800">✅ No Z escalations this period!</div>');return;}
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
      <div class="zc-act">${act[e.zf]||''}</div>
    </div>`).join(''));
}

// ── HEATMAP ──────────────────────────────────────────────────
function renderHeatmap(){
  const sorted=[...EX].sort((a,b)=>b.jpct-a.jpct);
  const day=new Date().getDate(),mo=new Date().getMonth();
  let ja=0;if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  const wh=['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
  const hdr=`<tr><th style="text-align:left">Employee</th><th style="text-align:left">Mgr</th>
    ${wh.map((h,i)=>`<th class="${i===1?'hsep':''}">${h}</th>`).join('')}
    <th>Ach</th><th>Tgt</th><th>%</th><th>Z</th></tr>`;
  const rows=sorted.map(e=>{
    const aw=[e.mw[3],...e.jw];
    const wc=aw.map((v,wi)=>{const f=wi>0&&(wi-1)>=ja;return`<td class="${f?'hf':v>0?'hs':'hz'} ${wi===1?'hsep':''}">${f?'▪':v>0?v:'✗'}</td>`;}).join('');
    const pc=e.jpct>=80?'#00e676':e.jpct>=50?'#f8c04f':'#ff5252';
    const zc={Z4:'#ff1744',Z3:'#ff5252',Z2:'#ffab40',RECOVERY:'#00e676',OK:'#00e676'}[e.zf]||'rgba(255,255,255,0.3)';
    return`<tr><td class="hn">${e.name}</td><td class="hm">${e.mgr}</td>${wc}<td style="font-weight:800">${e.jach}</td><td style="color:rgba(255,255,255,0.3)">${e.jtgt}</td><td style="font-weight:800;color:${pc}">${e.jpct.toFixed(0)}%</td><td style="font-weight:800;color:${zc}">${e.zf||'—'}</td></tr>`;
  }).join('');
  sh('hmWrap',`<table class="hmtbl"><thead>${hdr}</thead><tbody>${rows}</tbody></table>`);
}

// ── RECOVERY ─────────────────────────────────────────────────
function renderRecovery(){
  const c=[...EX].filter(e=>e.rec>0).sort((a,b)=>b.rec-a.rec);
  const m=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];
  sh('champGrid',!c.length?'<div class="card" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)">No recoveries this period</div>':
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

// ── DEMO DATA ────────────────────────────────────────────────
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
  build(rows);renderAll();
  sh('syncLbl','<span>Demo • Paste CSV URL in app.js</span>');
}
