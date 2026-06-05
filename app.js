// ── CONFIG ───────────────────────────────────────────────────
const SHEET_CSV_URL = "YOUR_GOOGLE_SHEET_CSV_URL_HERE";

const COL={EMP:0,MGR:1,DOJ:2,DAYS:3,BKT:4,TAPR:5,AAPR:6,MPCT:7,JTGT:8,JACH:9,JPCT:10,
  AW1:11,AW2:12,AW3:13,AW4:14,AW5:15,MW1:16,MW2:17,MW3:18,MW4:19,JW1:20,JW2:21,JW3:22,JW4:23};

const MGRS  = ["Annesh","Mohan","Arun","Manoj C Y","Pranav"];
const MCLRS = ["#00d4e8","#e040fb","#00e676","#f8c04f","#ff7043"];
const MEDALS = ["🥇","🥈","🥉"];
const PAGE_TITLES = {dashboard:"Dashboard",managers:"Manager Performance",
  leaderboard:"Leaderboard",zreport:"Z-Report",heatmap:"Weekly Heatmap",recovery:"Recovery Champions"};

let EX=[]; let charts={}; let currentStatType='ach';

// ── BOOT ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded",()=>{
  loadSavedLogo();
  loadData();
});

// ── LOGO UPLOAD ──────────────────────────────────────────────
function uploadLogo(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const url=ev.target.result;
    document.getElementById('lionImg').src=url;
    document.getElementById('lionImg').style.display='block';
    document.getElementById('lionFallback').style.display='none';
    try{localStorage.setItem('bomma_logo',url);}catch{}
  };
  reader.readAsDataURL(file);
}
function loadSavedLogo(){
  try{
    const saved=localStorage.getItem('bomma_logo');
    if(saved){
      document.getElementById('lionImg').src=saved;
      document.getElementById('lionImg').style.display='block';
      document.getElementById('lionFallback').style.display='none';
    }
  }catch{}
}

// ── NAV ──────────────────────────────────────────────────────
function nav(page,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('pg-'+page).classList.add('on');
  el.classList.add('active');
  document.getElementById('pageTitle').textContent=PAGE_TITLES[page]||page;
}

// ── DATA LOAD ────────────────────────────────────────────────
async function loadData(){
  document.getElementById('syncLbl').textContent='Syncing…';
  if(!SHEET_CSV_URL||SHEET_CSV_URL.includes('YOUR_GOOGLE')){demo();return;}
  try{
    const r=await fetch(SHEET_CSV_URL+'&t='+Date.now());
    if(!r.ok)throw 0;
    process(await r.text());
  }catch{demo();}
}

function process(txt){
  build(parseCSV(txt));renderAll();
  document.getElementById('syncLbl').textContent='Synced '+new Date().toLocaleTimeString('en-IN');
}

function parseCSV(txt){
  return txt.trim().split('\n').map(line=>{
    const cells=[];let cur='',q=false;
    for(let i=0;i<line.length;i++){
      if(line[i]==='"'){q=!q;continue;}
      if(line[i]===','&&!q){cells.push(cur.trim());cur='';continue;}
      cur+=line[i];
    }
    cells.push(cur.trim());return cells;
  });
}

// ── BUILD EXECS ──────────────────────────────────────────────
function build(rows){
  EX=[];
  const day=new Date().getDate(),mo=new Date().getMonth();
  let ja=0;if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  for(let r=2;r<rows.length;r++){
    const row=rows[r];
    const name=(row[COL.EMP]||'').trim();
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

// ── LOGIC ────────────────────────────────────────────────────
function zflag(v){
  if(v.length<2)return null;
  if(v[v.length-2]===0&&v[v.length-1]>0)return'RECOVERY';
  let z=0;for(let i=v.length-1;i>=0;i--){if(v[i]===0)z++;else break;}
  return z>=4?'Z4':z>=3?'Z3':z>=2?'Z2':z===0?'OK':null;
}
function zstreak(v){let s=0;for(let i=v.length-1;i>=0;i--){if(v[i]>0)s++;else break;}return s;}
function ztrend(v){if(v.length<2)return'→';return v[v.length-1]>v[v.length-2]?'▲':v[v.length-1]<v[v.length-2]?'▼':'→';}
function zrec(v){let c=0;for(let i=1;i<v.length;i++)if(v[i-1]===0&&v[i]>0)c++;return c;}
function zrisk(p,z){if(z==='Z3'||z==='Z4')return'CRITICAL';return p>=80?'GREEN':p>=50?'AMBER':'RED';}
function zscore(p,r,v,s){
  const nz=v.filter(x=>x>0).length,cons=v.length?(nz/v.length)*100:0;
  return Math.round(Math.min(p,100)*.4+cons*.2+Math.min(r*33,100)*.2+Math.min(s*25,100)*.2);
}

// ── RENDER ALL ───────────────────────────────────────────────
function renderAll(){
  renderKPIs();
  renderMainChart(currentStatType);
  renderMgrScoreCards();
  renderZSummary();
  renderTopTable();
  renderManagers();
  renderLeaderboard();
  renderZPage();
  renderHeatmap();
  renderRecovery();
}

// ── KPIs (compact) ───────────────────────────────────────────
function renderKPIs(){
  const tgt=EX.reduce((a,e)=>a+e.jtgt,0);
  const ach=EX.reduce((a,e)=>a+e.jach,0);
  const pct=tgt>0?((ach/tgt)*100).toFixed(1):0;
  const zc=EX.filter(e=>['Z2','Z3','Z4'].includes(e.zf)).length;
  const avgScore=EX.length?Math.round(EX.reduce((a,e)=>a+e.score,0)/EX.length):0;

  // Team
  set('k-team', EX.length);
  setHtml('k-team-sub','<span class="kpi-sm-sub neutral">Bommasandara Branch</span>');
  // Achievement
  set('k-ach', `${ach}/${tgt}`);
  setHtml('k-ach-pct',`<span class="kpi-sm-sub ${pct>=80?'up':'dn'}">${pct}% achievement</span>`);
  // Z flags
  set('k-z', zc);
  setHtml('k-z-sub',`<span class="kpi-sm-sub ${zc>3?'dn':zc>0?'dn':'up'}">${zc>0?'Action required':'All clear ✓'}</span>`);
  // Score
  set('k-score', avgScore+'/100');
  setHtml('k-score-sub',`<span class="kpi-sm-sub ${avgScore>=70?'up':avgScore>=50?'neutral':'dn'}">Team avg score</span>`);

  drawSpark('spark1', EX.map(e=>e.jach),'#00d4e8');
  drawSpark('spark2', EX.map(e=>e.jpct),'#e040fb');
  drawSpark('spark3', EX.map((_,i)=>EX.length-i),'#ff5252');
  drawSpark('spark4', EX.map(e=>e.score),'#f8c04f');
}

function set(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function setHtml(id,html){const el=document.getElementById(id);if(el)el.innerHTML=html;}

function drawSpark(id,data,color){
  const ctx=document.getElementById(id);if(!ctx)return;
  if(charts[id])charts[id].destroy();
  charts[id]=new Chart(ctx,{type:'line',data:{labels:data.map((_,i)=>i),datasets:[{data,borderColor:color,borderWidth:1.5,pointRadius:0,fill:false,tension:0.4}]},
    options:{responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}}}});
}

// ── MAIN CHART WITH CLICK POPUP ──────────────────────────────
function switchStat(type,el){
  currentStatType=type;
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('chartPopup').style.display='none';
  renderMainChart(type);
}

function renderMainChart(type){
  const ctx=document.getElementById('mainChart');if(!ctx)return;
  if(charts.main)charts.main.destroy();

  if(type==='ach'){
    const sorted=[...EX].sort((a,b)=>b.jpct-a.jpct);
    const labels=sorted.map(e=>e.name.split(' ')[0]);
    const tgts=sorted.map(e=>e.jtgt);
    const achs=sorted.map(e=>e.jach);
    charts.main=new Chart(ctx,{type:'bar',
      data:{labels,datasets:[
        {label:'Target',data:tgts,backgroundColor:'rgba(255,255,255,0.08)',borderColor:'rgba(255,255,255,0.2)',borderWidth:1,borderRadius:3,order:2},
        {label:'Achieved',data:achs,backgroundColor:achs.map((v,i)=>v>=tgts[i]?'rgba(0,230,118,0.75)':'rgba(0,212,232,0.75)'),borderWidth:0,borderRadius:3,order:1}
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{enabled:false}},
        scales:{
          x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'rgba(255,255,255,0.4)',font:{size:8},maxRotation:45}},
          y:{grid:{color:'rgba(255,255,255,0.06)',borderDash:[3,3]},ticks:{color:'rgba(255,255,255,0.35)',font:{size:8}},beginAtZero:true}
        },
        onClick(evt){
          const pts=charts.main.getElementsAtEventForMode(evt,'nearest',{intersect:true},false);
          if(!pts.length)return;
          const idx=pts[0].index;
          const exec=sorted[idx];
          showPopup(evt,exec,ctx.getBoundingClientRect(),ctx.parentElement);
        },
        onHover(evt,el){ctx.style.cursor=el.length?'pointer':'default';}
      }
    });
  }
  else if(type==='trend'){
    const labels=['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
    const teamData=labels.map((_,wi)=>EX.reduce((s,e)=>s+(wi===0?e.mw[3]:e.jw[wi-1]||0),0));
    const mgrDS=MGRS.map((m,mi)=>{
      const me=EX.filter(e=>e.mgr===m||e.mgr.toLowerCase()===m.toLowerCase());
      if(!me.length)return null;
      return{label:m,data:labels.map((_,wi)=>me.reduce((s,e)=>s+(wi===0?e.mw[3]:e.jw[wi-1]||0),0)),
        borderColor:MCLRS[mi],backgroundColor:'transparent',borderWidth:1.5,pointRadius:4,
        pointHitRadius:10,tension:0.4};
    }).filter(Boolean);
    charts.main=new Chart(ctx,{type:'line',
      data:{labels,datasets:[
        {label:'Team Total',data:teamData,borderColor:'#ffffff',backgroundColor:'rgba(255,255,255,0.05)',
         fill:true,borderWidth:2.5,pointRadius:5,pointBackgroundColor:'#fff',pointHitRadius:12,tension:0.4},
        ...mgrDS
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'bottom',labels:{color:'rgba(255,255,255,0.5)',font:{size:9},boxWidth:8,padding:6}},tooltip:{enabled:false}},
        scales:{
          x:{grid:{color:'rgba(255,255,255,0.05)',borderDash:[3,3]},ticks:{color:'rgba(255,255,255,0.4)',font:{size:9}}},
          y:{grid:{color:'rgba(255,255,255,0.06)',borderDash:[3,3]},ticks:{color:'rgba(255,255,255,0.35)',font:{size:9}},beginAtZero:true}
        },
        onClick(evt){
          // Show manager detail on click
          const pts=charts.main.getElementsAtEventForMode(evt,'nearest',{intersect:false},false);
          if(!pts.length)return;
          const dsIdx=pts[0].datasetIndex;
          if(dsIdx===0)return; // team total
          const mgrName=MGRS[dsIdx-1];
          showMgrPopup(evt,mgrName,ctx.parentElement);
        },
        onHover(evt,el){ctx.style.cursor=el.length?'pointer':'default';}
      }
    });
  }
  else if(type==='risk'){
    const map=mgrMap();
    const labels=Object.keys(map).filter(k=>map[k].size>0);
    const pcts=labels.map(k=>map[k].tgt>0?((map[k].ach/map[k].tgt)*100):0);
    charts.main=new Chart(ctx,{type:'bar',
      data:{labels,datasets:[{
        label:'Achievement %',data:pcts.map(p=>+p.toFixed(1)),
        backgroundColor:pcts.map(p=>p>=80?'rgba(0,230,118,0.75)':p>=50?'rgba(248,192,79,0.75)':'rgba(255,82,82,0.75)'),
        borderWidth:0,borderRadius:6
      }]},
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{enabled:false}},
        scales:{
          x:{grid:{display:false},ticks:{color:'rgba(255,255,255,0.5)',font:{size:11,weight:'bold'}}},
          y:{grid:{color:'rgba(255,255,255,0.06)',borderDash:[3,3]},ticks:{color:'rgba(255,255,255,0.35)',font:{size:9}},beginAtZero:true,max:120}
        },
        onClick(evt){
          const pts=charts.main.getElementsAtEventForMode(evt,'nearest',{intersect:true},false);
          if(!pts.length)return;
          const mgrName=labels[pts[0].index];
          showMgrPopup(evt,mgrName,ctx.parentElement);
        },
        onHover(evt,el){ctx.style.cursor=el.length?'pointer':'default';}
      }
    });
  }
}

// ── CLICK POPUP: EXECUTIVE ────────────────────────────────────
function showPopup(evt,exec,canvasRect,container){
  const popup=document.getElementById('chartPopup');
  const contRect=container.getBoundingClientRect();
  const x=evt.clientX-contRect.left;
  const y=evt.clientY-contRect.top;

  set('cp-name',exec.name);
  setHtml('cp-mgr',`<span style="color:rgba(255,255,255,0.4)">Manager: ${exec.mgr}</span>`);

  const pctColor=exec.jpct>=80?'#00e676':exec.jpct>=50?'#f8c04f':'#ff5252';
  const zColor={Z4:'#ff1744',Z3:'#ff5252',Z2:'#ffab40',RECOVERY:'#00e676',OK:'#00e676'}[exec.zf]||'rgba(255,255,255,0.4)';
  document.getElementById('cp-grid').innerHTML=`
    <div class="cp-item"><div class="cp-item-val">${exec.jach}/${exec.jtgt}</div><div class="cp-item-lbl">Jun Ach</div></div>
    <div class="cp-item"><div class="cp-item-val" style="color:${pctColor}">${exec.jpct.toFixed(0)}%</div><div class="cp-item-lbl">Jun %</div></div>
    <div class="cp-item"><div class="cp-item-val">${exec.streak}w</div><div class="cp-item-lbl">Streak</div></div>
    <div class="cp-item"><div class="cp-item-val" style="color:#f8c04f">${exec.score}</div><div class="cp-item-lbl">Score</div></div>
    <div class="cp-item"><div class="cp-item-val">${exec.trend}</div><div class="cp-item-lbl">Trend</div></div>
    <div class="cp-item"><div class="cp-item-val" style="color:${zColor}">${exec.zf||'OK'}</div><div class="cp-item-lbl">Z Flag</div></div>`;

  // Position popup near click, keep in bounds
  let px=x+10, py=y-10;
  if(px+240>container.offsetWidth) px=x-250;
  if(py+200>container.offsetHeight) py=y-210;
  popup.style.left=Math.max(0,px)+'px';
  popup.style.top=Math.max(0,py)+'px';
  popup.style.display='block';
}

// ── CLICK POPUP: MANAGER ──────────────────────────────────────
function showMgrPopup(evt,mgrName,container){
  const map=mgrMap();
  const m=map[mgrName];if(!m||!m.size)return;
  const pct=m.tgt>0?((m.ach/m.tgt)*100):0;
  const pctColor=pct>=80?'#00e676':pct>=50?'#f8c04f':'#ff5252';

  const popup=document.getElementById('chartPopup');
  const contRect=container.getBoundingClientRect();
  const x=evt.clientX-contRect.left, y=evt.clientY-contRect.top;

  set('cp-name',mgrName+' (Manager)');
  setHtml('cp-mgr',`<span style="color:rgba(255,255,255,0.4)">${m.size} executives</span>`);
  document.getElementById('cp-grid').innerHTML=`
    <div class="cp-item"><div class="cp-item-val">${m.ach}/${m.tgt}</div><div class="cp-item-lbl">Jun Ach</div></div>
    <div class="cp-item"><div class="cp-item-val" style="color:${pctColor}">${pct.toFixed(0)}%</div><div class="cp-item-lbl">Ach %</div></div>
    <div class="cp-item"><div class="cp-item-val" style="color:#ffab40">${m.z2}</div><div class="cp-item-lbl">Z2</div></div>
    <div class="cp-item"><div class="cp-item-val" style="color:#ff5252">${m.z3}</div><div class="cp-item-lbl">Z3</div></div>
    <div class="cp-item"><div class="cp-item-val" style="color:#00e676">${m.rec}</div><div class="cp-item-lbl">Recoveries</div></div>
    <div class="cp-item"><div class="cp-item-val" style="color:#00d4e8">${m.size}</div><div class="cp-item-lbl">Team Size</div></div>`;

  let px=x+10,py=y-10;
  if(px+240>container.offsetWidth)px=x-250;
  if(py+200>container.offsetHeight)py=y-210;
  popup.style.left=Math.max(0,px)+'px';
  popup.style.top=Math.max(0,py)+'px';
  popup.style.display='block';
}

// ── MANAGER SCORECARD PANEL ───────────────────────────────────
function renderMgrScoreCards(){
  const map=mgrMap();
  const html=Object.entries(map).filter(([,v])=>v.size>0).map(([name,m],i)=>{
    const pct=m.tgt>0?((m.ach/m.tgt)*100):0;
    const c=MCLRS[i%MCLRS.length];
    const pc=pct>=80?'#00e676':pct>=50?'#f8c04f':'#ff5252';
    const zAlert=m.z4>0?`<span style="color:#ff1744;font-size:9px">Z4:${m.z4}</span>`:
                 m.z3>0?`<span style="color:#ff5252;font-size:9px">Z3:${m.z3}</span>`:
                 m.z2>0?`<span style="color:#ffab40;font-size:9px">Z2:${m.z2}</span>`:
                 `<span style="color:#00e676;font-size:9px">✓ OK</span>`;
    return`<div class="mgr-score-row" onclick="showMgrDetail('${name}')">
      <div class="mgr-score-avatar" style="background:${c}">${name[0]}</div>
      <div class="mgr-score-info">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="mgr-score-name">${name}</div>
          ${zAlert}
        </div>
        <div class="mgr-score-bar">
          <div class="mgr-score-fill" style="width:${Math.min(pct,100)}%;background:${c}"></div>
        </div>
      </div>
      <div class="mgr-score-right">
        <div class="mgr-score-pct" style="color:${pc}">${pct.toFixed(0)}%</div>
        <div class="mgr-score-meta">${m.ach}/${m.tgt}</div>
      </div>
    </div>`;
  }).join('');
  setHtml('mgrScoreCards',html);
}

// ── Z SUMMARY ────────────────────────────────────────────────
function renderZSummary(){
  const z2=EX.filter(e=>e.zf==='Z2'),z3=EX.filter(e=>e.zf==='Z3'),z4=EX.filter(e=>e.zf==='Z4');
  setHtml('zSummary',[
    {lbl:'Z4 — Urgent',list:z4,c:'#ff1744'},
    {lbl:'Z3 — Review',list:z3,c:'#ff5252'},
    {lbl:'Z2 — Monitor',list:z2,c:'#ffab40'},
  ].map(g=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;border-radius:7px;background:rgba(255,255,255,0.04)">
      <div>
        <div style="font-size:10px;font-weight:800;color:${g.c}">${g.lbl}</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.35)">${g.list.map(e=>e.name.split(' ')[0]).join(', ')||'None'}</div>
      </div>
      <div style="font-size:20px;font-weight:900;color:${g.c}">${g.list.length}</div>
    </div>`).join(''));
}

// ── TOP TABLE ────────────────────────────────────────────────
function renderTopTable(){
  const top=[...EX].sort((a,b)=>b.jpct-a.jpct).slice(0,8);
  const pc=p=>p>=80?'#00e676':p>=50?'#f8c04f':'#ff5252';
  setHtml('topBody',top.map((e,i)=>`
    <tr>
      <td style="font-weight:800;color:rgba(255,255,255,0.85)">${i<3?MEDALS[i]+' ':''}<span style="font-size:${i<3?11:10}px">${e.name.split(' ')[0]}</span></td>
      <td style="color:rgba(255,255,255,0.35);font-size:9px">${e.mgr}</td>
      <td style="font-weight:800;color:${pc(e.jpct)}">${e.jpct.toFixed(0)}%</td>
      <td style="color:#00d4e8;font-weight:800">${e.score}</td>
    </tr>`).join(''));
}

// ── MGR DETAIL MODAL (from scorecard click) ──────────────────
function showMgrDetail(name){
  const map=mgrMap();
  const m=map[name];if(!m)return;
  const execs=EX.filter(e=>e.mgr===name||e.mgr.toLowerCase()===name.toLowerCase());
  // Show in Z-popup style at center
  const popup=document.getElementById('chartPopup');
  const container=document.querySelector('.stat-card');
  const pct=m.tgt>0?((m.ach/m.tgt)*100):0;
  const pc=pct>=80?'#00e676':pct>=50?'#f8c04f':'#ff5252';
  set('cp-name',name+' — Team Detail');
  setHtml('cp-mgr',`<span style="color:rgba(255,255,255,0.4)">${m.size} executives · ${pct.toFixed(0)}% ach</span>`);
  document.getElementById('cp-grid').innerHTML=execs.slice(0,6).map(e=>`
    <div class="cp-item">
      <div class="cp-item-val" style="color:${e.jpct>=80?'#00e676':e.jpct>=50?'#f8c04f':'#ff5252'};font-size:12px">${e.name.split(' ')[0]}</div>
      <div class="cp-item-lbl">${e.jpct.toFixed(0)}% · ${e.zf||'OK'}</div>
    </div>`).join('');
  popup.style.left='50%'; popup.style.top='30%';
  popup.style.transform='translate(-50%,0)';
  popup.style.display='block';
}

// ── MANAGERS PAGE ────────────────────────────────────────────
function renderManagers(){
  const map=mgrMap();
  setHtml('mgrGrid',Object.entries(map).filter(([,v])=>v.size>0).map(([name,m],i)=>{
    const pct=m.tgt>0?((m.ach/m.tgt)*100):0;
    const c=MCLRS[i%MCLRS.length];
    const pc=pct>=80?'#00e676':pct>=50?'#f8c04f':'#ff5252';
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
  const s=[...EX].sort((a,b)=>b.jpct-a.jpct);
  const pc=p=>p>=80?'pp-g':p>=50?'pp-a':'pp-r';
  const rc=r=>({GREEN:'rc-G',AMBER:'rc-A',RED:'rc-R',CRITICAL:'rc-C'}[r]||'rc-R');
  const tc=t=>t==='▲'?'tu':t==='▼'?'td':'ts';
  setHtml('lbBody',s.map((e,i)=>`
    <tr>
      <td>${i<3?MEDALS[i]:`<span style="color:rgba(255,255,255,0.3);font-weight:800">${i+1}</span>`}</td>
      <td style="font-weight:800;color:rgba(255,255,255,0.9)">${e.name}</td>
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
  if(!list.length){setHtml('zcGrid','<div class="card" style="text-align:center;padding:40px;color:#00e676;font-size:16px;font-weight:800">✅ No Z escalations this period!</div>');return;}
  setHtml('zcGrid',list.map(e=>`
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
  const s=[...EX].sort((a,b)=>b.jpct-a.jpct);
  const day=new Date().getDate(),mo=new Date().getMonth();
  let ja=0;if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  const wh=['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
  const hdr=`<tr><th style="text-align:left">Employee</th><th style="text-align:left">Mgr</th>
    ${wh.map((h,i)=>`<th class="${i===1?'hsep':''}">${h}</th>`).join('')}
    <th>Ach</th><th>Tgt</th><th>%</th><th>Z</th><th>Score</th></tr>`;
  const rows=s.map(e=>{
    const aw=[e.mw[3],...e.jw];
    const wc=aw.map((v,wi)=>{
      const f=wi>0&&(wi-1)>=ja;
      return`<td class="${f?'hf':v>0?'hs':'hz'} ${wi===1?'hsep':''}">${f?'▪':v>0?v:'✗'}</td>`;
    }).join('');
    const pc=e.jpct>=80?'#00e676':e.jpct>=50?'#f8c04f':'#ff5252';
    const zc={Z4:'#ff1744',Z3:'#ff5252',Z2:'#ffab40',RECOVERY:'#00e676',OK:'#00e676'}[e.zf]||'rgba(255,255,255,0.3)';
    return`<tr><td class="hn">${e.name}</td><td class="hm">${e.mgr}</td>${wc}
      <td style="font-weight:800">${e.jach}</td><td style="color:rgba(255,255,255,0.3)">${e.jtgt}</td>
      <td style="font-weight:800;color:${pc}">${e.jpct.toFixed(0)}%</td>
      <td style="font-weight:800;color:${zc}">${e.zf||'—'}</td>
      <td style="color:#00d4e8;font-weight:800">${e.score}</td></tr>`;
  }).join('');
  setHtml('hmWrap',`<table class="hmtbl"><thead>${hdr}</thead><tbody>${rows}</tbody></table>
    <div style="display:flex;gap:16px;margin-top:10px;font-size:10px;color:rgba(255,255,255,0.35);padding:4px">
      <span style="color:#00e676;font-weight:700">■ Sale</span>
      <span style="color:#ff5252;font-weight:700">■ No sale</span><span>▪ Future</span></div>`);
}

// ── RECOVERY ─────────────────────────────────────────────────
function renderRecovery(){
  const c=[...EX].filter(e=>e.rec>0).sort((a,b)=>b.rec-a.rec);
  const m=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];
  setHtml('champGrid',!c.length
    ?'<div class="card" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)">No recoveries this period</div>'
    :c.map((e,i)=>`<div class="cc"><div class="cc-med">${m[i]||'★'}</div>
      <div class="cc-name">${e.name}</div><div class="cc-mgr">${e.mgr}</div>
      <div class="cc-cnt">${e.rec}</div><div class="cc-lbl">Recoveries</div></div>`).join(''));
}

// ── MGR MAP ──────────────────────────────────────────────────
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
  setHtml('syncLbl','<span>Demo • Paste CSV URL in app.js</span>');
}

// Close popup when clicking outside
document.addEventListener('click',e=>{
  const popup=document.getElementById('chartPopup');
  if(popup&&!popup.contains(e.target)&&!e.target.closest('canvas')){
    popup.style.display='none';
    popup.style.transform='';
  }
});
