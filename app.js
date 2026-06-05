// ── CONFIG ───────────────────────────────────────────────────
const SHEET_CSV_URL = "YOUR_GOOGLE_SHEET_CSV_URL_HERE";

const COL={EMP:0,MGR:1,DOJ:2,DAYS:3,BKT:4,TAPR:5,AAPR:6,MPCT:7,JTGT:8,JACH:9,JPCT:10,
  AW1:11,AW2:12,AW3:13,AW4:14,AW5:15,MW1:16,MW2:17,MW3:18,MW4:19,JW1:20,JW2:21,JW3:22,JW4:23};

const MGRS  = ["Annesh","Mohan","Arun","Manoj C Y","Pranav"];
const MCLRS = ["#00d4e8","#e040fb","#00e676","#f8c04f","#ff7043"];
const MEDALS= ["🥇","🥈","🥉"];
const PAGE_TITLES = {dashboard:"Dashboard",managers:"Manager Performance",leaderboard:"Leaderboard",zreport:"Z-Report",heatmap:"Weekly Heatmap",recovery:"Recovery Champions"};

let EX=[]; let charts={};

// ── BOOT ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded",()=>{
  loadData();
  // Embed lion logo
  const li = document.getElementById('lionIcon');
  li.innerHTML = `<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" style="width:58px;height:58px">
    <defs>
      <radialGradient id="shield" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#1a3a6e"/>
        <stop offset="100%" stop-color="#0a1628"/>
      </radialGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f8c04f"/>
        <stop offset="100%" stop-color="#e8900a"/>
      </linearGradient>
    </defs>
    <!-- Shield -->
    <path d="M29 3 L52 12 L52 32 Q52 48 29 55 Q6 48 6 32 L6 12 Z" fill="url(#shield)" stroke="url(#gold)" stroke-width="2"/>
    <!-- Gold glow ring -->
    <circle cx="29" cy="28" r="16" fill="none" stroke="#f8c04f" stroke-width="0.5" opacity="0.4"/>
    <!-- Lion face text -->
    <text x="29" y="36" text-anchor="middle" font-size="22" font-family="serif">🦁</text>
  </svg>`;
});

// ── NAV ──────────────────────────────────────────────────────
function nav(page,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('pg-'+page).classList.add('on');
  el.classList.add('active');
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page]||page;
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

function process(txt){build(parseCSV(txt));renderAll();document.getElementById('syncLbl').textContent='Synced '+new Date().toLocaleTimeString('en-IN');}

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
function renderAll(){renderKPIs();renderMainChart('ach');renderRiskDonut();renderZSummary();renderTopTable();renderManagers();renderLeaderboard();renderZPage();renderHeatmap();renderRecovery();}

// ── KPIs ─────────────────────────────────────────────────────
function renderKPIs(){
  const tgt=EX.reduce((a,e)=>a+e.jtgt,0);
  const ach=EX.reduce((a,e)=>a+e.jach,0);
  const pct=tgt>0?((ach/tgt)*100).toFixed(1):0;
  const zc=EX.filter(e=>['Z2','Z3','Z4'].includes(e.zf)).length;

  document.getElementById('k-team').textContent=EX.length;
  document.getElementById('k-team-sub').innerHTML=`<span class="kpi-change up">Bommasandara Branch</span>`;

  document.getElementById('k-ach').textContent=ach+'/'+tgt;
  document.getElementById('k-ach-pct').innerHTML=`<span class="kpi-change ${pct>=80?'up':'dn'}">${pct>=80?'+':''}${pct}% achievement</span>`;

  document.getElementById('k-z').textContent=zc;
  document.getElementById('k-z-sub').innerHTML=`<span class="kpi-change ${zc>3?'dn':'up'}">${zc>0?'Action required':'All clear'}</span>`;

  // Sparklines
  drawSparkline('spark1',EX.map(e=>e.jach),'#00d4e8');
  drawSparkline('spark2',EX.map(e=>e.jpct),'#e040fb');
  drawSparkline('spark3',EX.map(e=>['Z2','Z3','Z4'].includes(e.zf)?1:0),'#ff5252');
}

function drawSparkline(id,data,color){
  const ctx=document.getElementById(id);if(!ctx)return;
  if(charts[id])charts[id].destroy();
  charts[id]=new Chart(ctx,{type:'line',data:{labels:data.map((_,i)=>i),datasets:[{data,borderColor:color,borderWidth:1.5,pointRadius:0,fill:false,tension:0.4}]},options:{responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}}}});
}

// ── MAIN CHART ───────────────────────────────────────────────
function switchStat(type,el){
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
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
    charts.main=new Chart(ctx,{type:'bar',data:{labels,datasets:[
      {label:'Target',data:tgts,backgroundColor:'rgba(255,255,255,0.1)',borderColor:'rgba(255,255,255,0.3)',borderWidth:1,borderRadius:4,order:2},
      {label:'Achieved',data:achs,backgroundColor:achs.map((_,i)=>achs[i]>=tgts[i]?'rgba(0,230,118,0.7)':'rgba(0,212,232,0.7)'),borderWidth:0,borderRadius:4,order:1}
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'rgba(255,255,255,0.4)',font:{size:8},maxRotation:45}},y:{grid:{color:'rgba(255,255,255,0.06)',borderDash:[3,3]},ticks:{color:'rgba(255,255,255,0.4)',font:{size:8}},beginAtZero:true}}}});
  }
  else if(type==='trend'){
    const labels=['May W4','Jun W1','Jun W2','Jun W3','Jun W4'];
    const teamData=labels.map((_,wi)=>EX.reduce((s,e)=>s+(wi===0?e.mw[3]:e.jw[wi-1]||0),0));
    const mgrDS=MGRS.map((m,mi)=>{
      const me=EX.filter(e=>e.mgr===m||e.mgr.toLowerCase()===m.toLowerCase());
      if(!me.length)return null;
      return{label:m,data:labels.map((_,wi)=>me.reduce((s,e)=>s+(wi===0?e.mw[3]:e.jw[wi-1]||0),0)),borderColor:MCLRS[mi],backgroundColor:'transparent',borderWidth:1.5,pointRadius:3,tension:0.4};
    }).filter(Boolean);
    charts.main=new Chart(ctx,{type:'line',data:{labels,datasets:[
      {label:'Team Total',data:teamData,borderColor:'#ffffff',backgroundColor:'rgba(255,255,255,0.05)',fill:true,borderWidth:2.5,pointRadius:5,pointBackgroundColor:'#fff',tension:0.4},
      ...mgrDS
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'rgba(255,255,255,0.5)',font:{size:9},boxWidth:8,padding:8}}},scales:{x:{grid:{color:'rgba(255,255,255,0.05)',borderDash:[3,3]},ticks:{color:'rgba(255,255,255,0.4)',font:{size:9}}},y:{grid:{color:'rgba(255,255,255,0.06)',borderDash:[3,3]},ticks:{color:'rgba(255,255,255,0.4)',font:{size:9}},beginAtZero:true}}}});
  }
  else if(type==='risk'){
    const map=mgrMap();
    const labels=Object.keys(map).filter(k=>map[k].size>0);
    const pcts=labels.map(k=>map[k].tgt>0?((map[k].ach/map[k].tgt)*100):0);
    charts.main=new Chart(ctx,{type:'bar',data:{labels,datasets:[{
      label:'Achievement %',
      data:pcts.map(p=>p.toFixed(1)),
      backgroundColor:pcts.map(p=>p>=80?'rgba(0,230,118,0.7)':p>=50?'rgba(248,192,79,0.7)':'rgba(255,82,82,0.7)'),
      borderWidth:0,borderRadius:6
    }]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'rgba(255,255,255,0.5)',font:{size:11,weight:'bold'}}},y:{grid:{color:'rgba(255,255,255,0.06)',borderDash:[3,3]},ticks:{color:'rgba(255,255,255,0.4)',font:{size:9}},beginAtZero:true,max:120}}}});
  }
}

// ── RISK DONUT ───────────────────────────────────────────────
function renderRiskDonut(){
  const ctx=document.getElementById('riskDonut');if(!ctx)return;
  if(charts.risk)charts.risk.destroy();
  const g=EX.filter(e=>e.risk==='GREEN').length;
  const a=EX.filter(e=>e.risk==='AMBER').length;
  const r=EX.filter(e=>e.risk==='RED').length;
  const c=EX.filter(e=>e.risk==='CRITICAL').length;
  charts.risk=new Chart(ctx,{type:'doughnut',data:{
    labels:['On Track','Watch','At Risk','Critical'],
    datasets:[{data:[g,a,r,c],backgroundColor:['#00e676','#f8c04f','#ff5252','#e040fb'],borderWidth:0,cutout:'65%'}]
  },options:{responsive:false,plugins:{legend:{display:false}}}});
  document.getElementById('riskLeg').innerHTML=[
    {l:'On Track',n:g,c:'#00e676'},{l:'Watch',n:a,c:'#f8c04f'},
    {l:'At Risk',n:r,c:'#ff5252'},{l:'Critical',n:c,c:'#e040fb'}
  ].map(x=>`<div class="tleg-row"><span><i class="tleg-dot" style="background:${x.c}"></i>${x.l}</span><span class="tleg-val">${x.n}</span></div>`).join('');
}

// ── Z SUMMARY ────────────────────────────────────────────────
function renderZSummary(){
  const z2=EX.filter(e=>e.zf==='Z2'),z3=EX.filter(e=>e.zf==='Z3'),z4=EX.filter(e=>e.zf==='Z4');
  document.getElementById('zSummary').innerHTML=[
    {lbl:'Z4 — Urgent',list:z4,c:'#ff1744'},
    {lbl:'Z3 — Review',list:z3,c:'#ff5252'},
    {lbl:'Z2 — Monitor',list:z2,c:'#ffab40'},
  ].map(g=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:7px;background:rgba(255,255,255,0.05)">
      <div>
        <div style="font-size:11px;font-weight:800;color:${g.c}">${g.lbl}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.4)">${g.list.map(e=>e.name.split(' ')[0]).join(', ')||'None'}</div>
      </div>
      <div style="font-size:22px;font-weight:900;color:${g.c}">${g.list.length}</div>
    </div>`).join('');
}

// ── TOP TABLE ────────────────────────────────────────────────
function renderTopTable(){
  const top=[...EX].sort((a,b)=>b.jpct-a.jpct).slice(0,7);
  const pctColor=p=>p>=80?'#00e676':p>=50?'#f8c04f':'#ff5252';
  document.getElementById('topBody').innerHTML=top.map((e,i)=>`
    <tr>
      <td style="font-weight:800;color:rgba(255,255,255,0.85)">${i<3?MEDALS[i]:''} ${e.name.split(' ')[0]}</td>
      <td style="color:rgba(255,255,255,0.4);font-size:10px">${e.mgr}</td>
      <td style="font-weight:800;color:${pctColor(e.jpct)}">${e.jpct.toFixed(0)}%</td>
      <td style="color:#00d4e8;font-weight:800">${e.score}</td>
    </tr>`).join('');
}

// ── MANAGERS PAGE ────────────────────────────────────────────
function renderManagers(){
  const map=mgrMap();
  document.getElementById('mgrGrid').innerHTML=Object.entries(map).filter(([,v])=>v.size>0).map(([name,m],i)=>{
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
  }).join('');
}

// ── LEADERBOARD ──────────────────────────────────────────────
function renderLeaderboard(){
  const s=[...EX].sort((a,b)=>b.jpct-a.jpct);
  const pc=p=>p>=80?'pp-g':p>=50?'pp-a':'pp-r';
  const rc=r=>({GREEN:'rc-G',AMBER:'rc-A',RED:'rc-R',CRITICAL:'rc-C'}[r]||'rc-R');
  const tc=t=>t==='▲'?'tu':t==='▼'?'td':'ts';
  document.getElementById('lbBody').innerHTML=s.map((e,i)=>`
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
    </tr>`).join('');
}

// ── Z PAGE ───────────────────────────────────────────────────
function renderZPage(){
  const zo={Z4:0,Z3:1,Z2:2};
  const list=EX.filter(e=>['Z2','Z3','Z4'].includes(e.zf)).sort((a,b)=>(zo[a.zf]??9)-(zo[b.zf]??9));
  const act={Z4:'🚨 Escalate to BM immediately',Z3:'⚠ Manager Review + PIP',Z2:'📋 Immediate 1:1 Coaching'};
  if(!list.length){document.getElementById('zcGrid').innerHTML='<div class="card" style="text-align:center;padding:40px;color:#00e676;font-size:16px;font-weight:800">✅ No Z escalations this period!</div>';return;}
  document.getElementById('zcGrid').innerHTML=list.map(e=>`
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
    </div>`).join('');
}

// ── HEATMAP ──────────────────────────────────────────────────
function renderHeatmap(){
  const s=[...EX].sort((a,b)=>b.jpct-a.jpct);
  const day=new Date().getDate(),mo=new Date().getMonth();
  let ja=0;if(mo>=5){if(day>=1)ja=1;if(day>=8)ja=2;if(day>=15)ja=3;if(day>=22)ja=4;}
  const wh=['May W4<br>25-30','Jun W1<br>01-07','Jun W2<br>08-14','Jun W3<br>15-21','Jun W4<br>22-30'];
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
  document.getElementById('hmWrap').innerHTML=`<table class="hmtbl"><thead>${hdr}</thead><tbody>${rows}</tbody></table>
    <div style="display:flex;gap:16px;margin-top:10px;font-size:10px;color:rgba(255,255,255,0.35);padding:4px">
      <span style="color:#00e676;font-weight:700">■ Sale</span>
      <span style="color:#ff5252;font-weight:700">■ No sale</span><span>▪ Future</span></div>`;
}

// ── RECOVERY ─────────────────────────────────────────────────
function renderRecovery(){
  const c=[...EX].filter(e=>e.rec>0).sort((a,b)=>b.rec-a.rec);
  const m=['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];
  document.getElementById('champGrid').innerHTML=!c.length
    ?'<div class="card" style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)">No recoveries this period</div>'
    :c.map((e,i)=>`<div class="cc"><div class="cc-med">${m[i]||'★'}</div>
      <div class="cc-name">${e.name}</div><div class="cc-mgr">${e.mgr}</div>
      <div class="cc-cnt">${e.rec}</div><div class="cc-lbl">Recoveries</div></div>`).join('');
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
  document.getElementById('syncLbl').textContent='Demo • Paste CSV URL in app.js';
}
