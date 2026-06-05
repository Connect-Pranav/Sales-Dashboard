// ============================================================
//  SALES PERFORMANCE DASHBOARD — app.js
//  Bommasandara Branch 2026
//  Paste your Google Sheet CSV URL below
// ============================================================

const SHEET_CSV_URL = "YOUR_GOOGLE_SHEET_CSV_URL_HERE";
// File → Share → Publish to web → Sheet: New Structure → CSV → Publish → Copy URL

// ── EXACT COLUMN MAP (0-indexed) ────────────────────────────
const COL = {
  EMPLOYEE:0, MANAGER:1, DOJ:2, DAYS:3, BUCKET:4,
  TGT_APR:5, ACH_APR:6, MAY_PCT:7,
  JUN_TGT:8, JUN_ACH:9, JUN_PCT:10,
  APR_W1:11,APR_W2:12,APR_W3:13,APR_W4:14,APR_W5:15,
  MAY_W1:16,MAY_W2:17,MAY_W3:18,MAY_W4:19,
  JUN_W1:20,JUN_W2:21,JUN_W3:22,JUN_W4:23,
  Z_RPT:24,STREAK:25,TREND:26,RISK:27,ACTION:28
};

const MANAGERS = ["Annesh","Mohan","Arun","Manoj C Y","Pranav"];
const MGR_COLORS = ["#7c6ef7","#f472b6","#34d399","#fbbf24","#60a5fa"];
const MEDALS = ["🥇","🥈","🥉","4","5","6","7","8","9","10"];

let executives = [];

// ── INIT ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  // Animate progress bars after render
  setTimeout(() => {
    document.querySelectorAll('[data-width]').forEach(el => {
      el.style.width = el.dataset.width;
    });
  }, 300);
});

// ── PAGE NAV ─────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelector(`[data-page="${name}"]`).classList.add('active');
}

// ── LOAD DATA ────────────────────────────────────────────────
async function loadData() {
  document.getElementById("syncTime").textContent = "Syncing…";
  if (!SHEET_CSV_URL || SHEET_CSV_URL.includes("YOUR_GOOGLE")) {
    loadDemo(); return;
  }
  try {
    const res = await fetch(SHEET_CSV_URL + "&t=" + Date.now());
    if (!res.ok) throw new Error(res.status);
    const csv = await res.text();
    processCSV(csv);
  } catch(e) {
    console.warn("Sheet fetch failed:", e);
    loadDemo();
  }
}

function processCSV(text) {
  const rows = parseCSV(text);
  buildExecs(rows);
  renderAll();
  document.getElementById("syncTime").textContent = "Synced " + new Date().toLocaleTimeString("en-IN");
}

function parseCSV(text) {
  return text.trim().split("\n").map(line => {
    const cells=[]; let cur="",inQ=false;
    for(let i=0;i<line.length;i++){
      if(line[i]==='"'){inQ=!inQ;continue;}
      if(line[i]===','&&!inQ){cells.push(cur.trim());cur="";continue;}
      cur+=line[i];
    }
    cells.push(cur.trim());
    return cells;
  });
}

// ── BUILD EXECUTIVES ─────────────────────────────────────────
function buildExecs(rows) {
  executives = [];
  const day=new Date().getDate(),month=new Date().getMonth();
  let junActive=0;
  if(month>=5){if(day>=1)junActive=1;if(day>=8)junActive=2;if(day>=15)junActive=3;if(day>=22)junActive=4;}

  for(let r=2;r<rows.length;r++){
    const row=rows[r];
    const name=(row[COL.EMPLOYEE]||"").trim();
    if(!name||!isNaN(Number(name)))continue;

    const manager=(row[COL.MANAGER]||"").trim();
    const junTgt=parseFloat(row[COL.JUN_TGT])||0;
    const junAch=parseFloat(row[COL.JUN_ACH])||0;
    const junPct=junTgt>0?(junAch/junTgt)*100:0;
    const mayPct=parseFloat(row[COL.MAY_PCT])||0;

    const mayWeeks=[COL.MAY_W1,COL.MAY_W2,COL.MAY_W3,COL.MAY_W4].map(c=>parseFloat(row[c])||0);
    const junWeeks=[COL.JUN_W1,COL.JUN_W2,COL.JUN_W3,COL.JUN_W4].map(c=>parseFloat(row[c])||0);
    const aprWeeks=[COL.APR_W1,COL.APR_W2,COL.APR_W3,COL.APR_W4,COL.APR_W5].map(c=>parseFloat(row[c])||0);

    // Z logic: May W4 + active June weeks
    const zVals=[mayWeeks[3],...junWeeks.slice(0,junActive)];

    const zFlag=calcZFlag(zVals);
    const streak=calcStreak(zVals);
    const trend=calcTrend(zVals);
    const recoveries=calcRecoveries(zVals);
    const risk=calcRisk(junPct,zFlag);
    const score=calcScore(junPct,recoveries,zVals,streak);

    executives.push({name,manager,junTgt,junAch,junPct,mayPct,
      aprWeeks,mayWeeks,junWeeks,zVals,junActive,
      zFlag,streak,trend,recoveries,risk,score});
  }
}

// ── LOGIC ────────────────────────────────────────────────────
function calcZFlag(v){
  if(v.length<2)return null;
  if(v[v.length-2]===0&&v[v.length-1]>0)return"RECOVERY";
  let z=0;for(let i=v.length-1;i>=0;i--){if(v[i]===0)z++;else break;}
  if(z>=4)return"Z4";if(z>=3)return"Z3";if(z>=2)return"Z2";
  if(z===0)return"OK";return null;
}
function calcStreak(v){let s=0;for(let i=v.length-1;i>=0;i--){if(v[i]>0)s++;else break;}return s;}
function calcTrend(v){if(v.length<2)return"→";const a=v[v.length-2],b=v[v.length-1];return b>a?"▲":b<a?"▼":"→";}
function calcRecoveries(v){let c=0;for(let i=1;i<v.length;i++)if(v[i-1]===0&&v[i]>0)c++;return c;}
function calcRisk(pct,z){
  if(z==="Z3"||z==="Z4")return"CRITICAL";
  if(pct>=80)return"GREEN";if(pct>=50)return"AMBER";return"RED";
}
function calcScore(pct,rec,v,streak){
  const nz=v.filter(x=>x>0).length;
  const cons=v.length>0?(nz/v.length)*100:0;
  return Math.round(Math.min(pct,100)*0.4+cons*0.2+Math.min(rec*33,100)*0.2+Math.min(streak*25,100)*0.2);
}

// ── RENDER ALL ────────────────────────────────────────────────
function renderAll(){
  renderTopStats();
  renderAchievementChart();
  renderRatioDonut();
  renderWeeklyTrend();
  renderRiskDonut();
  renderZBreakdown();
  renderMgrMini();
  renderManagersPage();
  renderLeaderboard();
  renderZReport();
  renderHeatmap();
  renderRecovery();
}

// ── TOP STATS ─────────────────────────────────────────────────
function renderTopStats(){
  const totTgt=executives.reduce((a,e)=>a+e.junTgt,0);
  const totAch=executives.reduce((a,e)=>a+e.junAch,0);
  const avgScore=executives.length?Math.round(executives.reduce((a,e)=>a+e.score,0)/executives.length):0;
  const zCount=executives.filter(e=>["Z2","Z3","Z4"].includes(e.zFlag)).length;
  const recCount=executives.filter(e=>e.zFlag==="RECOVERY").length;
  document.getElementById("totTgt").textContent=totTgt;
  document.getElementById("totAch").textContent=totAch;
  document.getElementById("avgScore").textContent=avgScore;
  document.getElementById("teamSize").textContent=executives.length;
  document.getElementById("zCount").textContent=zCount;
  document.getElementById("recCount").textContent=recCount;
}

// ── ACHIEVEMENT BAR CHART ─────────────────────────────────────
function renderAchievementChart(){
  const ctx=document.getElementById("achievementChart").getContext("2d");
  if(window._achChart)window._achChart.destroy();
  const labels=executives.map(e=>e.name.split(" ")[0]);
  const targets=executives.map(e=>e.junTgt);
  const achieved=executives.map(e=>e.junAch);
  window._achChart=new Chart(ctx,{
    type:"bar",
    data:{
      labels,
      datasets:[
        {label:"Target",data:targets,backgroundColor:"rgba(124,110,247,0.25)",borderColor:"rgba(124,110,247,0.6)",borderWidth:1.5,borderRadius:4,order:2},
        {label:"Achieved",data:achieved,backgroundColor:achieved.map((v,i)=>v>=targets[i]?"rgba(52,211,153,0.7)":"rgba(244,114,182,0.7)"),borderWidth:0,borderRadius:4,order:1},
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.parsed.y}`}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{size:9},color:"#9ca3af"}},
        y:{grid:{color:"rgba(124,110,247,0.06)"},ticks:{font:{size:9},color:"#9ca3af"},beginAtZero:true}
      }
    }
  });
}

// ── RATIO DONUT ───────────────────────────────────────────────
function renderRatioDonut(){
  const ctx=document.getElementById("ratioDonut").getContext("2d");
  if(window._ratioChart)window._ratioChart.destroy();
  const totTgt=executives.reduce((a,e)=>a+e.junTgt,0);
  const totAch=executives.reduce((a,e)=>a+e.junAch,0);
  const pct=totTgt>0?Math.round((totAch/totTgt)*100):0;
  document.getElementById("ratioPct").textContent=pct+"%";
  window._ratioChart=new Chart(ctx,{
    type:"doughnut",
    data:{
      datasets:[{
        data:[totAch,Math.max(0,totTgt-totAch)],
        backgroundColor:["rgba(124,110,247,0.85)","rgba(244,114,182,0.3)"],
        borderWidth:0,cutout:"72%"
      }]
    },
    options:{responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}}}
  });
}

// ── WEEKLY TREND LINE ─────────────────────────────────────────
function renderWeeklyTrend(){
  const ctx=document.getElementById("weeklyTrend").getContext("2d");
  if(window._trendChart)window._trendChart.destroy();
  const labels=["May W4","Jun W1","Jun W2","Jun W3","Jun W4"];
  const weekData=labels.map((_,wi)=>{
    return executives.reduce((sum,e)=>{
      const val=wi===0?e.mayWeeks[3]:e.junWeeks[wi-1];
      return sum+(val||0);
    },0);
  });
  // Per manager lines
  const mgrDatasets=MANAGERS.map((m,mi)=>{
    const mExecs=executives.filter(e=>e.manager===m||e.manager.toLowerCase()===m.toLowerCase());
    if(!mExecs.length)return null;
    return{
      label:m,
      data:labels.map((_,wi)=>mExecs.reduce((s,e)=>s+(wi===0?e.mayWeeks[3]:e.junWeeks[wi-1]||0),0)),
      borderColor:MGR_COLORS[mi],backgroundColor:"transparent",
      borderWidth:2,pointRadius:3,pointBackgroundColor:MGR_COLORS[mi],tension:0.4
    };
  }).filter(Boolean);

  window._trendChart=new Chart(ctx,{
    type:"line",
    data:{labels,datasets:[
      {label:"Team Total",data:weekData,borderColor:"rgba(124,110,247,0.9)",
       backgroundColor:"rgba(124,110,247,0.08)",fill:true,borderWidth:2.5,
       pointRadius:4,pointBackgroundColor:"#7c6ef7",tension:0.4},
      ...mgrDatasets
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:"bottom",labels:{font:{size:9},boxWidth:10,padding:8}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{size:9},color:"#9ca3af"}},
        y:{grid:{color:"rgba(124,110,247,0.06)"},ticks:{font:{size:9},color:"#9ca3af"},beginAtZero:true}
      }
    }
  });
}

// ── RISK DONUT ────────────────────────────────────────────────
function renderRiskDonut(){
  const ctx=document.getElementById("riskDonut").getContext("2d");
  if(window._riskChart)window._riskChart.destroy();
  const green=executives.filter(e=>e.risk==="GREEN").length;
  const amber=executives.filter(e=>e.risk==="AMBER").length;
  const red=executives.filter(e=>e.risk==="RED").length;
  const crit=executives.filter(e=>e.risk==="CRITICAL").length;
  const pct=executives.length?Math.round((crit/executives.length)*100):0;
  document.getElementById("riskCritPct").textContent=crit+"🚨";
  window._riskChart=new Chart(ctx,{
    type:"doughnut",
    data:{
      labels:["On Track","Watch","At Risk","Critical"],
      datasets:[{
        data:[green,amber,red,crit],
        backgroundColor:["rgba(52,211,153,0.8)","rgba(251,191,36,0.8)","rgba(248,113,113,0.8)","rgba(153,27,27,0.8)"],
        borderWidth:0,cutout:"68%"
      }]
    },
    options:{responsive:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${c.parsed}`}}}}
  });
  // Legend
  const legends=[
    {label:"On Track",count:green,color:"#34d399"},
    {label:"Watch",count:amber,color:"#fbbf24"},
    {label:"At Risk",count:red,color:"#f87171"},
    {label:"Critical",count:crit,color:"#991b1b"},
  ];
  document.getElementById("riskLegend").innerHTML=legends.map(l=>`
    <div class="risk-leg-item">
      <div><span class="risk-leg-dot" style="background:${l.color}"></span>${l.label}</div>
      <strong>${l.count}</strong>
    </div>`).join("");
}

// ── Z BREAKDOWN ───────────────────────────────────────────────
function renderZBreakdown(){
  const z2=executives.filter(e=>e.zFlag==="Z2").length;
  const z3=executives.filter(e=>e.zFlag==="Z3").length;
  const z4=executives.filter(e=>e.zFlag==="Z4").length;
  document.getElementById("zBreakdown").innerHTML=`
    <div class="z-pill z2"><div>${z2}</div><div class="z-label">Z2</div></div>
    <div class="z-pill z3"><div>${z3}</div><div class="z-label">Z3</div></div>
    <div class="z-pill z4"><div>${z4}</div><div class="z-label">Z4</div></div>`;
  const zList=executives.filter(e=>["Z2","Z3","Z4"].includes(e.zFlag))
    .sort((a,b)=>({Z4:0,Z3:1,Z2:2}[a.zFlag]??9)-({Z4:0,Z3:1,Z2:2}[b.zFlag]??9));
  document.getElementById("zMiniList").innerHTML=zList.map(e=>`
    <div class="z-mini-item">
      <span class="z-mini-name">${e.name.split(" ")[0]}</span>
      <span class="z-mini-flag flag-${e.zFlag.toLowerCase()}">${e.zFlag}</span>
    </div>`).join("");
}

// ── MGR MINI LIST ─────────────────────────────────────────────
function renderMgrMini(){
  const map=buildMgrMap();
  document.getElementById("mgrMiniList").innerHTML=Object.entries(map).filter(([,v])=>v.size>0).map(([name,m],i)=>{
    const pct=m.tgt>0?Math.round((m.ach/m.tgt)*100):0;
    const color=MGR_COLORS[i%MGR_COLORS.length];
    const fill=Math.min(pct,100);
    return`<div class="mgr-mini-item">
      <div class="mgr-mini-avatar" style="background:${color}">${name[0]}</div>
      <div class="mgr-mini-info">
        <div class="mgr-mini-name">${name}</div>
        <div class="mgr-mini-bar"><div class="mgr-mini-fill" style="width:0%;background:${color}" data-width="${fill}%"></div></div>
      </div>
      <div class="mgr-mini-pct">${pct}%</div>
    </div>`;
  }).join("");
  setTimeout(()=>document.querySelectorAll('[data-width]').forEach(el=>el.style.width=el.dataset.width),100);
}

// ── MANAGERS PAGE ─────────────────────────────────────────────
function renderManagersPage(){
  const map=buildMgrMap();
  document.getElementById("mgrCardsGrid").innerHTML=Object.entries(map).filter(([,v])=>v.size>0).map(([name,m],i)=>{
    const pct=m.tgt>0?((m.ach/m.tgt)*100):0;
    const color=MGR_COLORS[i%MGR_COLORS.length];
    const fill=Math.min(pct,100);
    const pctColor=pct>=80?"#059669":pct>=50?"#d97706":"#dc2626";
    const avgStr=m.streaks.length?(m.streaks.reduce((a,b)=>a+b,0)/m.streaks.length).toFixed(1):0;
    return`<div class="mgr-card">
      <div class="mgr-card-accent" style="background:linear-gradient(90deg,${color},${color}88)"></div>
      <div class="mgr-card-header">
        <div>
          <div class="mgr-card-name">${name}</div>
          <div style="font-size:11px;color:var(--text3)">${m.size} executives</div>
        </div>
        <div class="mgr-card-badge" style="color:${pctColor}">${pct.toFixed(0)}%</div>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Target: ${m.tgt} → Achieved: ${m.ach}</div>
      <div class="mgr-prog-bar">
        <div class="mgr-prog-fill" style="width:0%;background:${color}" data-width="${fill}%"></div>
      </div>
      <div class="mgr-stats-grid">
        <div class="mgr-stat"><div class="mgr-stat-val" style="color:${color}">${m.size}</div><div class="mgr-stat-lbl">Team</div></div>
        <div class="mgr-stat"><div class="mgr-stat-val" style="color:${pctColor}">${pct.toFixed(0)}%</div><div class="mgr-stat-lbl">Ach%</div></div>
        <div class="mgr-stat"><div class="mgr-stat-val" style="color:#34d399">${m.rec}</div><div class="mgr-stat-lbl">Rec↑</div></div>
      </div>
      <div class="mgr-z-row">
        <div class="mgr-z-chip" style="background:rgba(251,191,36,0.15);color:#d97706">Z2: ${m.z2}</div>
        <div class="mgr-z-chip" style="background:rgba(248,113,113,0.15);color:#dc2626">Z3: ${m.z3}</div>
        <div class="mgr-z-chip" style="background:rgba(127,29,29,0.2);color:#991b1b">Z4: ${m.z4}</div>
        <div class="mgr-z-chip" style="background:rgba(96,165,250,0.15);color:#2563eb">Streak: ${avgStr}w</div>
      </div>
    </div>`;
  }).join("");
  setTimeout(()=>document.querySelectorAll('[data-width]').forEach(el=>el.style.width=el.dataset.width),100);
}

// ── LEADERBOARD PAGE ──────────────────────────────────────────
function renderLeaderboard(){
  const sorted=[...executives].sort((a,b)=>b.junPct-a.junPct);
  const pctCls=p=>p>=80?"pct-green":p>=50?"pct-amber":"pct-red";
  const riskCls=r=>({GREEN:"risk-G",AMBER:"risk-A",RED:"risk-R",CRITICAL:"risk-C"}[r]||"risk-R");
  const trendCls=t=>t==="▲"?"trend-up":t==="▼"?"trend-dn":"trend-flat";
  document.getElementById("lbBody").innerHTML=sorted.map((e,i)=>`
    <tr>
      <td class="rank-medal">${i<3?MEDALS[i]:`<span style="color:var(--text3);font-weight:800">${i+1}</span>`}</td>
      <td><strong>${e.name}</strong></td>
      <td style="color:var(--text3)">${e.manager}</td>
      <td style="color:var(--text3)">${e.junTgt}</td>
      <td><strong>${e.junAch}</strong></td>
      <td><span class="pct-pill ${pctCls(e.junPct)}">${e.junPct.toFixed(1)}%</span></td>
      <td style="color:var(--text2)">${e.streak}w</td>
      <td style="color:var(--purple);font-weight:800">${e.score}</td>
      <td class="${trendCls(e.trend)}">${e.trend}</td>
      <td><span class="risk-chip ${riskCls(e.risk)}">${e.risk}</span></td>
    </tr>`).join("");
}

// ── Z-REPORT PAGE ─────────────────────────────────────────────
function renderZReport(){
  const zOrder={Z4:0,Z3:1,Z2:2};
  const list=executives.filter(e=>["Z2","Z3","Z4"].includes(e.zFlag))
    .sort((a,b)=>(zOrder[a.zFlag]??9)-(zOrder[b.zFlag]??9));
  const actions={Z4:"🚨 Escalate to BM immediately",Z3:"⚠ Manager Review + PIP",Z2:"📋 Immediate 1:1 Coaching"};
  if(!list.length){
    document.getElementById("zCardsGrid").innerHTML=`<div class="card" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--green);font-size:18px;font-weight:800">✅ No Z escalations this period!</div>`;
    return;
  }
  document.getElementById("zCardsGrid").innerHTML=list.map(e=>`
    <div class="z-card ${e.zFlag.toLowerCase()}">
      <div class="z-card-flag">${e.zFlag}</div>
      <div class="z-card-name">${e.name}</div>
      <div class="z-card-mgr">Manager: ${e.manager}</div>
      <div class="z-card-stats">
        <div class="z-card-stat"><div class="z-card-stat-val">${e.junPct.toFixed(0)}%</div><div class="z-card-stat-lbl">Jun Ach</div></div>
        <div class="z-card-stat"><div class="z-card-stat-val">${e.streak}w</div><div class="z-card-stat-lbl">Streak</div></div>
        <div class="z-card-stat"><div class="z-card-stat-val">${e.score}</div><div class="z-card-stat-lbl">Score</div></div>
        <div class="z-card-stat"><div class="z-card-stat-val">${e.trend}</div><div class="z-card-stat-lbl">Trend</div></div>
      </div>
      <div class="z-card-action">${actions[e.zFlag]||""}</div>
    </div>`).join("");
}

// ── HEATMAP PAGE ──────────────────────────────────────────────
function renderHeatmap(){
  const sorted=[...executives].sort((a,b)=>b.junPct-a.junPct);
  const day=new Date().getDate(),month=new Date().getMonth();
  let junActive=0;
  if(month>=5){if(day>=1)junActive=1;if(day>=8)junActive=2;if(day>=15)junActive=3;if(day>=22)junActive=4;}

  const weekHdrs=["May W4<br>25-30","Jun W1<br>01-07","Jun W2<br>08-14","Jun W3<br>15-21","Jun W4<br>22-30"];
  const header=`<tr>
    <th style="text-align:left">Employee</th>
    <th style="text-align:left">Mgr</th>
    ${weekHdrs.map((h,i)=>`<th class="${i===1?'hm-sep':''}">${h}</th>`).join("")}
    <th>Ach</th><th>Tgt</th><th>%</th><th>Z</th><th>Score</th>
  </tr>`;

  const rows=sorted.map(e=>{
    const allW=[e.mayWeeks[3],...e.junWeeks];
    const wCells=allW.map((v,wi)=>{
      const isFut=wi>0&&(wi-1)>=junActive;
      const cls=isFut?"hm-future":v>0?"hm-sale":"hm-zero";
      const sep=wi===1?"hm-sep":"";
      return`<td class="${cls} ${sep}">${isFut?"▪":v>0?v:"✗"}</td>`;
    }).join("");
    const pctColor=e.junPct>=80?"#059669":e.junPct>=50?"#d97706":"#dc2626";
    const zColor={Z4:"#991b1b",Z3:"#dc2626",Z2:"#d97706",RECOVERY:"#059669",OK:"#059669"}[e.zFlag]||"#9ca3af";
    return`<tr>
      <td class="hm-name">${e.name}</td>
      <td class="hm-mgr">${e.manager}</td>
      ${wCells}
      <td><strong>${e.junAch}</strong></td>
      <td style="color:var(--text3)">${e.junTgt}</td>
      <td style="font-weight:800;color:${pctColor}">${e.junPct.toFixed(0)}%</td>
      <td style="font-weight:800;color:${zColor}">${e.zFlag||"—"}</td>
      <td style="color:var(--purple);font-weight:800">${e.score}</td>
    </tr>`;
  }).join("");

  document.getElementById("heatmapWrap").innerHTML=`
    <table class="hm-table"><thead>${header}</thead><tbody>${rows}</tbody></table>
    <div style="display:flex;gap:20px;margin-top:12px;font-size:11px;color:var(--text3);padding:0 4px">
      <span style="color:#059669;font-weight:700">■ Sale achieved</span>
      <span style="color:#dc2626;font-weight:700">■ No sale</span>
      <span>▪ Future week</span>
      <span style="border-left:2px solid rgba(124,110,247,0.4);padding-left:12px">Blue line = May/Jun boundary</span>
    </div>`;
}

// ── RECOVERY PAGE ─────────────────────────────────────────────
function renderRecovery(){
  const champs=[...executives].filter(e=>e.recoveries>0).sort((a,b)=>b.recoveries-a.recoveries);
  const medals2=["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
  if(!champs.length){
    document.getElementById("champGrid").innerHTML=`<div class="card" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3)">No recoveries recorded in this period (May W4 → June)</div>`;
    return;
  }
  document.getElementById("champGrid").innerHTML=champs.map((e,i)=>`
    <div class="champ-card">
      <div class="champ-medal">${medals2[i]||"★"}</div>
      <div class="champ-name">${e.name}</div>
      <div class="champ-mgr">${e.manager}</div>
      <div class="champ-count">${e.recoveries}</div>
      <div class="champ-lbl">Recoveries</div>
    </div>`).join("");
}

// ── MGR MAP HELPER ────────────────────────────────────────────
function buildMgrMap(){
  const map={};
  MANAGERS.forEach(m=>map[m]={size:0,tgt:0,ach:0,z2:0,z3:0,z4:0,streaks:[],rec:0});
  executives.forEach(e=>{
    const k=MANAGERS.find(m=>e.manager===m||e.manager.toLowerCase()===m.toLowerCase())||e.manager;
    if(!map[k])map[k]={size:0,tgt:0,ach:0,z2:0,z3:0,z4:0,streaks:[],rec:0};
    map[k].size++;map[k].tgt+=e.junTgt;map[k].ach+=e.junAch;
    if(e.zFlag==="Z2")map[k].z2++;if(e.zFlag==="Z3")map[k].z3++;if(e.zFlag==="Z4")map[k].z4++;
    map[k].streaks.push(e.streak);map[k].rec+=e.recoveries;
  });
  return map;
}

// ── DEMO DATA ─────────────────────────────────────────────────
function loadDemo(){
  const rows=[
    ["Employee Name","Manager","DOJ","Days","Bucket","TgtApr","AchApr","MayPct","JunTgt","JunAch","JunPct","AW1","AW2","AW3","AW4","AW5","MW1","MW2","MW3","MW4","JW1","JW2","JW3","JW4"],
    ["Maruti","Annesh","","179","91-180",4,4,1,5,1,0.2,0,1,1,1,0,1,1,1,1,1,0,0,0],
    ["Anand B","Mohan","","186","91-180",4,2,0.5,3,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0],
    ["Suresh","Annesh","","172","91-180",4,3,0.75,4,0,0,0,1,0,1,1,1,0,0,2,0,0,0,0],
    ["Deepak R","Annesh","","459","271+",6,6,1,6,1,0.17,0,2,0,1,0,1,0,3,2,1,0,0,0],
    ["Virendra MM","Annesh","","25","0-90",2,0,0,3,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0],
    ["Sumith","Arun","","186","91-180",4,3,0.75,5,0,0,0,0,1,0,0,1,1,0,1,0,0,0,0],
    ["Govind Bagade","Annesh","","172","91-180",4,1,0.25,4,1,0.25,0,0,1,1,1,0,0,0,1,1,0,0,0],
    ["Yashassu N S","Arun","","459","271+",6,2,0.33,6,0,0,0,1,1,0,1,0,0,1,1,0,0,0,0],
    ["Abhishek","Arun","","186","91-180",4,1,0.25,4,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0],
    ["Ullas","Arun","","249","180-270",5,3,0.6,5,0,0,0,1,1,1,0,0,1,1,1,0,0,0,0],
    ["Abhishek SB","Mohan","","179","91-180",4,2,0.5,4,0,0,0,0,0,2,1,0,0,1,1,0,0,0,0],
    ["Naveen G","Mohan","","136","91-180",4,2,0.5,4,0,0,0,1,0,0,1,0,1,1,0,0,0,0,0],
    ["Varun","Pranav","","577","271+",6,3,0.5,6,0,0,0,1,1,1,1,1,0,1,1,0,0,0,0],
    ["Sharankumar","Mohan","","200","91-180",4,4,1,5,0,0,0,0,1,1,0,1,1,1,1,0,0,0,0],
    ["Hemantha M","Mohan","","242","180-270",5,4,0.8,5,0,0,0,1,1,1,0,1,1,1,1,0,0,0,0],
    ["Shashank","Arun","","18","0-90",0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];
  buildExecs(rows);
  renderAll();
  document.getElementById("syncTime").textContent="Demo data • Connect your sheet in app.js";
}
