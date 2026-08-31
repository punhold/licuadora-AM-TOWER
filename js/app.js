const API = "https://licuadora-at.duckdns.org";
const SVG_NS = "http://www.w3.org/2000/svg";

// DOM refs
const btnAuth     = document.getElementById("btnAuth");
const authStatus  = document.getElementById("authStatus");
const authText    = document.getElementById("authText");
const btnProcesar = document.getElementById("btnProcesar");
const fechaDesde  = document.getElementById("fechaDesde");
const fechaHasta  = document.getElementById("fechaHasta");
const loading     = document.getElementById("loading");
const contador    = document.getElementById("contador");
const resultados  = document.getElementById("resultados");
const filtroCI    = document.getElementById("filtroCI");
const btnExport   = document.getElementById("btnExport");

const demorasContainer    = document.getElementById("demorasContainer");
const reiteradosContainer = document.getElementById("reiteradosContainer");
const impactoContainer    = document.getElementById("impactoContainer");
const cerradosContainer   = document.getElementById("cerradosContainer");
const demorasBadge    = document.getElementById("demorasBadge");
const reiteradosBadge = document.getElementById("reiteradosBadge");
const impactoBadge    = document.getElementById("impactoBadge");
const cerradosBadge   = document.getElementById("cerradosBadge");
const kpiDemoras    = document.getElementById("kpiDemoras");
const kpiReiterados = document.getElementById("kpiReiterados");
const kpiImpacto    = document.getElementById("kpiImpacto");
const kpiCerrados   = document.getElementById("kpiCerrados");

// Fechas por defecto
(function(){
  const hoy = new Date();
  const hace30 = new Date(hoy.getTime() - 30*86400000);
  fechaHasta.value = hoy.toISOString().slice(0,10);
  fechaDesde.value = hace30.toISOString().slice(0,10);
})();

let authorized = false;
let lastData   = null;

function applyAuth(ok){
  authorized = ok;
  if(ok){
    authStatus.className = "authStatus ok";
    authText.textContent = "Gmail conectado ✓";
    btnAuth.classList.add("hidden");
    btnProcesar.disabled = false;
  } else {
    authStatus.className = "authStatus error";
    authText.textContent = "Gmail no conectado";
    btnAuth.classList.remove("hidden");
    btnProcesar.disabled = true;
  }
}

async function checkAuth(){
  try{
    const r = await fetch(`${API}/auth/status`);
    const d = await r.json();
    applyAuth(d.authorized);
  } catch {
    authStatus.className = "authStatus error";
    authText.textContent = "No se puede contactar al servidor";
    btnAuth.classList.remove("hidden");
  }
}

// Esperar splash — usa el resultado real que ya trajo el splash
// Si por alguna razón splashDone ya se disparó antes de que app.js cargara, hacemos checkAuth directo
if(window._splashDone) {
  applyAuth(window._splashAuthOk || false);
} else {
  window.addEventListener("splashDone", () => {
    applyAuth(window._splashAuthOk || false);
  });
}

btnAuth.addEventListener("click", () => {
  const popup = window.open(`${API}/auth/google`, "oauth", "width=520,height=640");
  const t = setInterval(() => {
    if(popup.closed){ clearInterval(t); checkAuth(); }
  }, 800);
});

// =====================
// ANIMACIÓN LICUADORA
// =====================
const bsvg     = document.getElementById("bsvg");
const bitemsG  = document.getElementById("bitemsG");
const blid     = document.getElementById("blid");
const bliq     = document.getElementById("bliq");
const bbubbles = document.getElementById("bbubbles");
const bblades  = document.getElementById("bblades");
const bphrase  = document.getElementById("blender-phrase");

function setPhrase(txt){
  bphrase.style.opacity = 0;
  setTimeout(()=>{ bphrase.textContent = txt; bphrase.style.opacity = 1; }, 220);
}
function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

function makeMail(x, fallEnd, delay, sc, vc){
  const g = document.createElementNS(SVG_NS,"g");
  g.style.setProperty("--fall-end", fallEnd+"px");
  g.style.opacity="0";
  const rect = document.createElementNS(SVG_NS,"rect");
  rect.setAttribute("x",x-17); rect.setAttribute("y",22);
  rect.setAttribute("width","34"); rect.setAttribute("height","23"); rect.setAttribute("rx","3");
  rect.setAttribute("fill","#f1f5f9"); rect.setAttribute("stroke",sc); rect.setAttribute("stroke-width","1.2");
  const env = document.createElementNS(SVG_NS,"path");
  env.setAttribute("d",`M${x-17} 24 L${x} 35 L${x+17} 24`);
  env.setAttribute("fill","none"); env.setAttribute("stroke",vc); env.setAttribute("stroke-width","1.4");
  const l1 = document.createElementNS(SVG_NS,"line");
  l1.setAttribute("x1",x-11);l1.setAttribute("y1","37");l1.setAttribute("x2",x+11);l1.setAttribute("y2","37");
  l1.setAttribute("stroke","#94a3b8");l1.setAttribute("stroke-width","1.2");
  const l2 = document.createElementNS(SVG_NS,"line");
  l2.setAttribute("x1",x-11);l2.setAttribute("y1","41");l2.setAttribute("x2",x+4);l2.setAttribute("y2","41");
  l2.setAttribute("stroke","#94a3b8");l2.setAttribute("stroke-width","1.2");
  g.appendChild(rect);g.appendChild(env);g.appendChild(l1);g.appendChild(l2);
  bitemsG.appendChild(g);
  setTimeout(()=>{ g.style.animation="itemFall 1.15s cubic-bezier(.4,0,.6,1) forwards"; }, delay);
  return g;
}

function doSplash(x,y){
  const c = document.createElementNS(SVG_NS,"circle");
  c.setAttribute("cx",x);c.setAttribute("cy",y);c.setAttribute("r","7");
  c.setAttribute("fill","none");c.setAttribute("stroke","#4ade80");c.setAttribute("stroke-width","1.5");
  c.style.transformOrigin=`${x}px ${y}px`;
  c.style.animation="splashIn2 .45s ease forwards";
  bitemsG.appendChild(c);
  setTimeout(()=>c.remove(),500);
}

function getLiq(){ return { h:parseFloat(bliq.getAttribute("height")||0), y:parseFloat(bliq.getAttribute("y")||244) }; }
function setLiq(h,y){ bliq.setAttribute("height",Math.round(h)); bliq.setAttribute("y",Math.round(y)); }

let bladeAngle=0, bladeInt=null;
function startBlades(){ if(bladeInt)return; bladeInt=setInterval(()=>{ bladeAngle+=24; bblades.style.transform=`rotate(${bladeAngle}deg)`; },16); }
function stopBlades(){ clearInterval(bladeInt); bladeInt=null; }

let wiggleInt=null;
function startWiggle(){ if(wiggleInt)return; wiggleInt=setInterval(()=>{ const dx=(Math.random()-.5)*3.5,dy=(Math.random()-.5)*2,dr=(Math.random()-.5)*2.5; bsvg.style.transform=`translate(${dx}px,${dy}px) rotate(${dr}deg)`; },55); }
function stopWiggle(){ clearInterval(wiggleInt);wiggleInt=null;bsvg.style.transform=""; }

const mailsData = [
  {x:148,fe:110,d:0,   sc:"#bae6fd",vc:"#38bdf8"},
  {x:172,fe:128,d:280, sc:"#bbf7d0",vc:"#22c55e"},
  {x:155,fe:145,d:560, sc:"#ddd6fe",vc:"#818cf8"},
  {x:178,fe:135,d:840, sc:"#fed7aa",vc:"#fb923c"},
  {x:143,fe:155,d:1120,sc:"#fde68a",vc:"#f59e0b"},
  {x:165,fe:125,d:1400,sc:"#bae6fd",vc:"#0ea5e9"},
  {x:170,fe:148,d:1680,sc:"#f9a8d4",vc:"#ec4899"},
];

let blenderRunning = false;

async function runBlender(){
  blenderRunning = true;
  setPhrase("Preparando...");
  setLiq(0,244);
  bbubbles.style.opacity="0";
  bitemsG.innerHTML="";
  blid.style.opacity="0";
  blid.style.transform="translateY(-28px)";
  stopBlades(); stopWiggle();

  await wait(400);
  setPhrase("Recibiendo mails...");

  for(const m of mailsData){
    makeMail(m.x,m.fe,m.d,m.sc,m.vc);
    setTimeout(()=>{
      doSplash(m.x,205);
      const {h,y}=getLiq(); setLiq(h+15,y-15);
    }, m.d+900);
  }

  await wait(mailsData[mailsData.length-1].d+1300);
  setPhrase("Cerrando la tapa...");
  blid.style.opacity="1"; blid.style.transform="translateY(0)";
  await wait(800);

  setPhrase("Licuando a máxima potencia 🧃");
  startBlades(); startWiggle(); bbubbles.style.opacity="1";

  const {h:h0,y:y0}=getLiq();
  const targetH=118; let curH=h0,curY=y0; const delta=targetH-curH;
  const steps=40; let step=0;
  const riseInt=setInterval(()=>{ step++; curH+=delta/steps; curY-=delta/steps; setLiq(curH,curY); if(step>=steps)clearInterval(riseInt); },45);

  // si llega un resultado, detener la animación
  await wait(8000);
  if(blenderRunning){ stopBlades();stopWiggle();bbubbles.style.opacity="0"; runBlender(); }
}

function stopBlender(){
  blenderRunning = false;
  stopBlades(); stopWiggle();
  bbubbles.style.opacity="0";
}

// =====================
// PROCESAR
// =====================
btnProcesar.addEventListener("click", async () => {
  const desde = fechaDesde.value;
  const hasta  = fechaHasta.value;
  if(!desde||!hasta){ alert("Seleccioná ambas fechas."); return; }
  if(desde>hasta){ alert("La fecha de inicio debe ser anterior al fin."); return; }

  btnProcesar.disabled=true; btnProcesar.textContent="Licuando...";
  resultados.classList.add("hidden");
  loading.classList.remove("hidden");
  contador.textContent="";

  runBlender();

  try{
    const resp = await fetch(`${API}/procesar`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({fecha_desde:desde,fecha_hasta:hasta}),
    });
    if(!resp.ok){ const e=await resp.json().catch(()=>({error:resp.statusText})); throw new Error(e.error||resp.statusText); }
    const data = await resp.json();
    lastData = data;

    stopBlender();
    setPhrase("Jugo listo ✓");
    contador.textContent=`Mails: ${data.totalEmails.toLocaleString()} · Casos: ${data.totalCases.toLocaleString()}`;

    renderAll(data);

    setTimeout(()=>{
      loading.classList.add("hidden");
      resultados.classList.remove("hidden");
      btnProcesar.disabled=false;
      btnProcesar.textContent="Procesar";
    }, 700);

  } catch(e){
    stopBlender();
    alert("Error: "+e.message);
    loading.classList.add("hidden");
    btnProcesar.disabled=false;
    btnProcesar.textContent="Procesar";
    if(e.message.includes("utorizado")) checkAuth();
  }
});

// =====================
// RENDERS
// =====================
function renderAll(data){
  const totalImpacto=(data.impacto||[]).reduce((a,g)=>a+g.impacts.length,0);
  kpiDemoras.querySelector(".kpiNum").textContent    = data.demoras?.length    || 0;
  kpiReiterados.querySelector(".kpiNum").textContent = data.reiterados?.length || 0;
  kpiImpacto.querySelector(".kpiNum").textContent    = totalImpacto;
  kpiCerrados.querySelector(".kpiNum").textContent   = data.cerrados7?.length  || 0;
  renderDemoras(data.demoras||[]);
  renderReiterados(data.reiterados||[]);
  renderImpacto(data.impacto||[]);
  renderCerrados7(data.cerrados7||[]);
}

function renderDemoras(demoras){
  demorasContainer.innerHTML=""; demorasBadge.textContent=String(demoras.length);
  if(!demoras.length){ demorasContainer.innerHTML=`<div class="empty">No se detectaron casos abiertos.</div>`; return; }
  for(const it of demoras){
    const tag=it.dias>=10?"sla10":it.dias>=7?"sla7":it.dias>=3?"sla3":"";
    const tagText=it.dias>=10?"≥ 10 días":it.dias>=7?"≥ 7 días":it.dias>=3?"≥ 3 días":"< 3 días";
    const div=document.createElement("div"); div.className="row"; div.dataset.ci=(it.ci||"").toLowerCase();
    div.innerHTML=`<div><strong>${escapeHtml(it.cs)}</strong><div class="meta"><span>CI: ${escapeHtml(it.ci||"-")}</span><span>Abierto: ${fmt(it.openDate)}</span></div></div><div style="text-align:right"><div style="font-weight:900;font-size:1.1rem">${it.dias}d</div><div class="tag ${tag}">${tagText}</div></div>`;
    demorasContainer.appendChild(div);
  }
}

function renderReiterados(reiterados){
  reiteradosContainer.innerHTML=""; reiteradosBadge.textContent=String(reiterados.length);
  if(!reiterados.length){ reiteradosContainer.innerHTML=`<div class="empty">No se detectaron reiterados en los últimos 30 días.</div>`; return; }
  for(const g of reiterados){
    const box=document.createElement("div"); box.className="group"; box.dataset.ci=g.ci.toLowerCase();
    const head=document.createElement("div"); head.className="groupHead";
    head.innerHTML=`<div class="groupTitle">${escapeHtml(g.ci)}</div><div class="meta"><span class="tag">x${g.items.length}</span></div>`;
    const body=document.createElement("div"); body.className="groupBody";
    body.innerHTML=g.items.map(it=>`<div class="row" style="margin-top:10px"><div><strong>${escapeHtml(it.cs)}</strong><div class="meta"><span>Apertura: ${fmt(it.date)}</span></div></div><div class="tag">OPEN</div></div>`).join("");
    head.addEventListener("click",()=>box.classList.toggle("open"));
    box.appendChild(head); box.appendChild(body); reiteradosContainer.appendChild(box);
  }
}

function renderImpacto(groups){
  impactoContainer.innerHTML="";
  const total=groups.reduce((a,g)=>a+g.impacts.length,0); impactoBadge.textContent=String(total);
  if(!groups.length){ impactoContainer.innerHTML=`<div class="empty">No se detectaron impactos post reparación.</div>`; return; }
  for(const g of groups){
    const box=document.createElement("div"); box.className="group open"; box.dataset.ci=(g.closeCI||"").toLowerCase();
    const head=document.createElement("div"); head.className="groupHead";
    head.innerHTML=`<div><div class="groupTitle">Luego del cierre <strong>${escapeHtml(g.cs)}</strong></div><div class="meta"><span>Cerrado: ${fmt(g.closeDate)}</span><span>CI reparado: ${escapeHtml(g.closeCI||"-")}</span></div></div><div class="meta"><span class="tag">+${g.impacts.length}</span></div>`;
    const body=document.createElement("div"); body.className="groupBody";
    body.innerHTML=g.impacts.map(it=>`<div class="row"><div><strong>${escapeHtml(it.cs)}</strong><div class="meta"><span>CI impactado: ${escapeHtml(it.openCI||"-")}</span><span>Apertura: ${fmt(it.openDate)}</span></div></div><div style="text-align:right"><div class="tag">${it.hours} hs</div><div class="tag" style="margin-top:6px">${it.isClosed?"CERRADO":"ABIERTO"}</div></div></div>`).join("");
    head.addEventListener("click",()=>box.classList.toggle("open"));
    box.appendChild(head); box.appendChild(body); impactoContainer.appendChild(box);
  }
}

function renderCerrados7(cerrados){
  cerradosContainer.innerHTML=""; cerradosBadge.textContent=String(cerrados.length);
  if(!cerrados.length){ cerradosContainer.innerHTML=`<div class="empty">No se detectaron cierres en los últimos 7 días.</div>`; return; }
  for(const it of cerrados){
    const dur=(it.openDate&&it.closeDate)?`${Math.max(0,daysBetween(new Date(it.openDate),new Date(it.closeDate)))}d`:"-";
    const div=document.createElement("div"); div.className="row"; div.dataset.ci=(it.ci||"").toLowerCase();
    div.innerHTML=`<div><strong>${escapeHtml(it.cs)}</strong><div class="meta"><span>CI: ${escapeHtml(it.ci||"-")}</span><span>Cierre: ${fmt(it.closeDate)}</span><span>Duración: ${dur}</span></div></div><div class="tag">CERRADO</div>`;
    cerradosContainer.appendChild(div);
  }
}

// =====================
// FILTRO + EXPORT
// =====================
filtroCI.addEventListener("input",()=>{
  const q=filtroCI.value.toLowerCase().trim();
  document.querySelectorAll(".row[data-ci],.group[data-ci]").forEach(el=>{
    el.classList.toggle("filtered-out",!(!q||(el.dataset.ci||"").includes(q)));
  });
});

btnExport.addEventListener("click",()=>{
  if(!lastData)return;
  const rows=[["Sección","CS","CI","Fecha apertura","Fecha cierre","Días","Estado"]];
  (lastData.demoras||[]).forEach(it=>rows.push(["Demora",it.cs,it.ci||"",fmt(it.openDate),"",it.dias,"ABIERTO"]));
  (lastData.reiterados||[]).forEach(g=>g.items.forEach(it=>rows.push(["Reiterado",it.cs,g.ci,fmt(it.date),"","","OPEN"])));
  (lastData.impacto||[]).forEach(g=>g.impacts.forEach(it=>rows.push(["Impacto post-rep.",it.cs,it.openCI||"",fmt(it.openDate),"","",it.isClosed?"CERRADO":"ABIERTO"])));
  (lastData.cerrados7||[]).forEach(it=>rows.push(["Cerrado 7d",it.cs,it.ci||"",fmt(it.openDate),fmt(it.closeDate),(it.openDate&&it.closeDate)?daysBetween(new Date(it.openDate),new Date(it.closeDate)):"","CERRADO"]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=`licuadora_${fechaDesde.value}_${fechaHasta.value}.csv`; a.click();
  URL.revokeObjectURL(url);
});

// =====================
// HELPERS
// =====================
function fmt(d){
  if(!d)return"-"; const dt=d instanceof Date?d:new Date(d); if(isNaN(dt))return"-";
  const p=n=>String(n).padStart(2,"0");
  return `${p(dt.getDate())}/${p(dt.getMonth()+1)}/${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}
function daysBetween(a,b){ return Math.floor((b-a)/86400000); }
function escapeHtml(s){ return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
