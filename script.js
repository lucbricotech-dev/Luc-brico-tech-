(() => {
"use strict";
const CFG=window.LBT_CONFIG||{};
const hasCloud=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&window.supabase);
const sb=hasCloud?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
const DBKEY="lbt_v3_demo";

const schemas={
 sales:{title:"Nouvelle vente",fields:[
  ["customer","Client","text",true],["item","Article / service","text",true],["quantity","Quantité","number",true],["amount","Montant (FCFA)","number",true],["payment_method","Paiement","select",false,["cash","mobile_money","bank","credit"]],["status","Statut","select",false,["paid","pending","cancelled"]],["notes","Notes","textarea",false]
 ]},
 purchases:{title:"Nouvel achat",fields:[["supplier","Fournisseur","text",true],["item","Article","text",true],["quantity","Quantité","number",true],["amount","Montant (FCFA)","number",true],["status","Statut","select",false,["received","pending","cancelled"]],["notes","Notes","textarea",false]]},
 expenses:{title:"Nouvelle dépense",fields:[["category","Catégorie","text",true],["label","Libellé","text",true],["amount","Montant (FCFA)","number",true],["beneficiary","Bénéficiaire","text",false],["notes","Notes","textarea",false]]},
 activities:{title:"Nouvelle activité",fields:[["title","Titre","text",true],["category","Catégorie","text",false],["description","Description","textarea",false],["location","Lieu","text",false],["status","Statut","select",false,["open","in_progress","done","cancelled"]],["amount","Montant (FCFA)","number",false]]},
 projects:{title:"Nouveau projet",fields:[["name","Nom du projet","text",true],["client","Client","text",false],["description","Description","textarea",false],["status","Statut","select",false,["planned","active","completed","paused"]],["progress","Progression (%)","number",false],["budget","Budget (FCFA)","number",false]]},
 innovations:{title:"Nouvelle innovation",fields:[["title","Titre","text",true],["description","Description","textarea",false],["stage","Étape","select",false,["idea","prototype","test","production"]],["budget","Budget (FCFA)","number",false],["progress","Progression (%)","number",false]]},
 stock_items:{title:"Nouvel article de stock",fields:[["name","Article","text",true],["category","Catégorie","text",false],["unit","Unité","text",false],["quantity","Quantité","number",true],["min_quantity","Seuil minimum","number",false],["location","Emplacement","text",false]]}
};

const state={page:"dashboard",role:"admin",user:null,cloud:hasCloud,db:loadLocal()};
const TABLES=["profiles","sales","purchases","expenses","stock_items","stock_movements","activities","projects","innovations","audit_logs","settings"];

function loadLocal(){
 try{
  const d=JSON.parse(localStorage.getItem(DBKEY))||seed();
  TABLES.forEach(t=>{if(!Array.isArray(d[t]))d[t]=[]});
  return d;
 }catch{return seed()}
}

function saveLocal(){localStorage.setItem(DBKEY,JSON.stringify(state.db))}
function seed(){return {profiles:[{id:"demo-admin",full_name:"Lucien BESSAN",role:"admin",active:true}],sales:[],purchases:[],expenses:[],stock_items:[],stock_movements:[],activities:[],projects:[],innovations:[],audit_logs:[],settings:[]}}
function toast(s){const e=document.getElementById("toast");e.textContent=s;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2400)}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function money(n){return new Intl.NumberFormat("fr-FR").format(Number(n||0))+" FCFA"}
function uid(){return crypto.randomUUID?crypto.randomUUID():"demo-"+Date.now()+"-"+Math.random()}
function now(){return new Date().toISOString()}

async function cloudSession(){
 if(!sb)return null;
 const {data:{session}}=await sb.auth.getSession(); return session;
}

async function boot(){
 try{
 if(hasCloud){
  const session=await cloudSession();
  if(!session){ if(location.pathname.endsWith("login.html")) return; location.href="login.html"; return; }
  state.user=session.user;
  const {data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
  state.profile=p||{id:session.user.id,full_name:session.user.email,email:session.user.email,role:"employee",active:true};
  if(state.profile.active===false){
   await sb.auth.signOut();
   alert("Ce compte a été désactivé par l’administrateur.");
   location.href="login.html";
   return;
  }
  state.role=state.profile.role;
  await syncCloud();
  applyRoleNavigation();
 }else{
  state.user={id:"demo-admin",email:"demo@lucbricotech.local"};
  state.profile=state.db.profiles[0]; state.role="admin";
 }
 document.getElementById("userName").textContent=state.profile.full_name||state.user.email||"Utilisateur";
 document.getElementById("userRole").textContent=state.role.toUpperCase();
 document.getElementById("modeBadge").textContent=state.cloud?"SUPABASE":"MODE DÉMO";
 bind();
 render();
 }catch(err){
  console.error("Erreur de démarrage:",err);
  if(hasCloud){
   const content=document.getElementById("content");
   if(content)content.innerHTML=`<div class="card"><h3>Connexion sécurisée indisponible</h3><p class="muted">Impossible de charger les données Supabase. Aucun mode administrateur de démonstration n'est activé.</p><button class="primary" id="retryConnection">Réessayer</button><button class="secondary" id="goLogin" style="margin-left:8px">Retour à la connexion</button></div>`;
   document.getElementById("retryConnection")?.addEventListener("click",()=>location.reload());
   document.getElementById("goLogin")?.addEventListener("click",()=>location.href="login.html");
   toast("Erreur de connexion sécurisée à Supabase.");
   return;
  }
  state.cloud=false;
  state.user={id:"demo-admin",email:"demo@lucbricotech.local"};
  state.profile=state.db.profiles?.[0]||{id:"demo-admin",full_name:"Lucien BESSAN",role:"admin",active:true};
  state.role=state.profile.role||"admin";
  document.getElementById("userName").textContent=state.profile.full_name||"Utilisateur";
  document.getElementById("userRole").textContent=state.role.toUpperCase();
  document.getElementById("modeBadge").textContent="MODE DÉMO";
  bind();
  render();
  toast("Mode démo actif.");
 }
}

async function syncCloud(){
 for(const t of TABLES){
  const query=sb.from(t).select("*");
  const result=t==="settings"
    ? await query
    : await query.order("created_at",{ascending:false});
  const {data,error}=result;
  if(!error&&data)state.db[t]=data;
  else if(!Array.isArray(state.db[t]))state.db[t]=[];
 }
}

const TABLES_WITH_USER_ID=[
 "sales","purchases","expenses","stock_movements","activities","projects","innovations","audit_logs"
];

async function insert(table,payload){
 const hasUserId=TABLES_WITH_USER_ID.includes(table);
 if(!state.cloud){
  const x={id:uid(),created_at:now(),...payload};
  if(hasUserId)x.user_id=state.user.id;
  (state.db[table]??=[]).unshift(x);
  saveLocal();
  return x;
 }
 const x={...payload};
 if(hasUserId)x.user_id=state.user.id;
 const {data,error}=await sb.from(table).insert(x).select().single();
 if(error)throw error;
 state.db[table].unshift(data);
 return data;
}

async function update(table,id,payload){
 if(!state.cloud){
  const arr=state.db[table]||[];
  const i=arr.findIndex(x=>x.id===id);
  if(i>=0)arr[i]={...arr[i],...payload};
  saveLocal();
  return
 }
 const {data,error}=await sb.from(table).update(payload).eq("id",id).select().single();
 if(error)throw error;
 const arr=state.db[table]||[],i=arr.findIndex(x=>x.id===id);
 if(i>=0)arr[i]=data;
}

async function remove(table,id){
 if(!state.cloud){
  state.db[table]=(state.db[table]||[]).filter(x=>x.id!==id);
  saveLocal();
  return
 }
 const {error}=await sb.from(table).delete().eq("id",id);
 if(error)throw error;
 state.db[table]=(state.db[table]||[]).filter(x=>x.id!==id);
}

async function audit(action,entity,id,details={}){
 try{await insert("audit_logs",{action,entity,entity_id:id,details})}catch(e){console.warn(e)}
}

const ROLE_PAGES={
 admin:["dashboard","members","sales","purchases","expenses","stock","activities","projects","innovations","reports","audit","settings"],
 manager:["dashboard","members","sales","purchases","expenses","stock","activities","projects","innovations","reports"],
 employee:["dashboard","sales","purchases","expenses","stock","activities","projects","innovations","reports"]
};

function allowedPages(){return ROLE_PAGES[state.role]||ROLE_PAGES.employee}
function canManageStock(){return state.role==="admin"||state.role==="manager"}

function applyRoleNavigation(){
 const allowed=allowedPages();
 document.querySelectorAll("#nav button").forEach(b=>{
   const visible=allowed.includes(b.dataset.page);
   b.hidden=!visible;
   b.setAttribute("aria-hidden",String(!visible));
 });
 if(!allowed.includes(state.page))state.page="dashboard";
}

function bind(){
 applyRoleNavigation();

 document.querySelectorAll("#nav button:not([hidden])").forEach(b=>{
   b.onclick=function(e){
     e.preventDefault();
     const page=this.dataset.page;
     if(!allowedPages().includes(page))return;
     state.page=page;
     closeMenu();
     render();
   };
 });

 // MENU MOBILE
 const menuBtn=document.getElementById("menuBtn");
 const sidebar=document.getElementById("sidebar");

 if(menuBtn&&sidebar){
   menuBtn.onclick=null;
   menuBtn.addEventListener("click",function(e){
     e.preventDefault();
     e.stopPropagation();
     sidebar.classList.toggle("open");
     menuBtn.setAttribute("aria-expanded",String(sidebar.classList.contains("open")));
   });

   // Fermer le menu en cliquant hors du panneau
   if(!document.body.dataset.lbtOutsideMenu){
     document.body.dataset.lbtOutsideMenu="1";
     document.addEventListener("click",function(e){
       if(sidebar.classList.contains("open") &&
          !sidebar.contains(e.target) &&
          !menuBtn.contains(e.target)){
         closeMenu();
       }
     });
   }
 }

 const closeModalBtn=document.getElementById("closeModal");
 if(closeModalBtn)closeModalBtn.onclick=closeModal;

 const logoutBtn=document.getElementById("logoutBtn");
 if(logoutBtn)logoutBtn.onclick=logout;
}

function closeMenu(){
 const sidebar=document.getElementById("sidebar");
 const menuBtn=document.getElementById("menuBtn");
 if(sidebar)sidebar.classList.remove("open");
 if(menuBtn)menuBtn.setAttribute("aria-expanded","false");
}

async function logout(){
 if(sb)await sb.auth.signOut();
 location.href="login.html"
}

function setHeader(title,sub){
 document.getElementById("pageTitle").textContent=title;
 document.getElementById("pageSub").textContent=sub;
}

function render(){
 applyRoleNavigation();
 if(!allowedPages().includes(state.page))state.page="dashboard";
 document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===state.page));
 const map={
  dashboard:["Tableau de bord","Vue générale de l’activité."],
  members:["Membres","Utilisateurs et rôles."],
  sales:["Ventes","Suivi des ventes et encaissements."],
  purchases:["Achats","Achats auprès des fournisseurs."],
  expenses:["Dépenses","Charges et dépenses."],
  stock:["Stock & matériel","Articles, quantités et seuils."],
  activities:["Activités","Interventions et opérations réalisées."],
  projects:["Projets","Suivi des projets et chantiers."],
  innovations:["Innovations","Idées, prototypes et solutions."],
  reports:["Rapports","Synthèse financière et opérationnelle."],
  audit:["Journal","Traçabilité des actions."],
  settings:["Paramètres","Configuration de l’entreprise."]
 };
 setHeader(...map[state.page]);
 const fn={
  dashboard:dashboard,
  members:members,
  sales:tablePage,
  purchases:tablePage,
  expenses:tablePage,
  stock:stock,
  activities:tablePage,
  projects:tablePage,
  innovations:tablePage,
  reports:reports,
  audit:auditPage,
  settings:settings
 }[state.page];
 const out=fn(state.page);
 document.getElementById("content").innerHTML=out;
 bindPage();
}

function bindPage(){
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>openForm(b.dataset.add));
 document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>del(b.dataset.delete,b.dataset.id));
 document.querySelectorAll("[data-role]").forEach(s=>s.onchange=()=>changeRole(s.dataset.id,s.value));
 document.querySelectorAll("[data-create-employee]").forEach(b=>b.onclick=openEmployeeForm);
 document.querySelectorAll("[data-toggle-active]").forEach(s=>s.onchange=()=>toggleMember(s.dataset.id,s.checked));
 document.querySelectorAll("[data-edit-stock]").forEach(b=>b.onclick=()=>openForm("stock_items",b.dataset.editStock));
 document.getElementById("settingsForm")?.addEventListener("submit",saveSettings);
}

function dashboard(){
 const sum=t=>state.db[t].reduce((a,x)=>a+Number(x.amount||0),0);
 const stock=state.db.stock_items.reduce((a,x)=>a+Number(x.quantity||0),0);
 return `<section class="welcome-hero">
   <div class="hero-glow hero-glow-one"></div><div class="hero-glow hero-glow-two"></div>
   <div class="hero-copy">
     <span class="hero-kicker">ESPACE DE GESTION</span>
     <h2>Bienvenue chez<br><strong>LUC BRICO-TECH</strong></h2>
     <p>La technologie au service de vos projets.</p>
     <div class="hero-tags"><span>Électricité</span><span>Maintenance</span><span>Informatique</span><span>Innovation</span></div>
   </div>
   <div class="hero-logo"><img src="./logo-luc-bricotech.png" alt="Logo LUC BRICO-TECH"></div>
 </section>
 <div class="grid kpis">
 <div class="card kpi"><small>Ventes</small><strong>${money(sum("sales"))}</strong></div>
 <div class="card kpi"><small>Achats</small><strong>${money(sum("purchases"))}</strong></div>
 <div class="card kpi"><small>Dépenses</small><strong>${money(sum("expenses"))}</strong></div>
 <div class="card kpi"><small>Stock total</small><strong>${stock}</strong></div>
 </div>
 <div class="quick-strip">
   <div><strong>Votre besoin, notre solution.</strong><span>Centralisez les opérations et gardez une vision claire de l’activité.</span></div>
   <div class="quick-actions">
     <button class="primary" data-add="sales">+ Vente</button>
     <button class="secondary" data-add="activities">+ Activité</button>
     <button class="secondary" data-add="projects">+ Projet</button>
   </div>
 </div>
 <div class="grid cards" style="margin-top:16px">
 <div class="card"><h3>Activités récentes</h3>${recent("activities","title")}</div>
 <div class="card"><h3>Projets</h3>${recent("projects","name")}</div>
 <div class="card"><h3>Innovations</h3>${recent("innovations","title")}</div>
 </div>`;
}

function recent(t,key){
 const a=state.db[t].slice(0,5);
 return a.length
  ? a.map(x=>`<p><strong>${esc(x[key])}</strong><br><span class="muted">${new Date(x.created_at).toLocaleString("fr-FR")}</span></p>`).join("")
  : `<div class="empty">Aucun élément.</div>`
}

function tablePage(t){
 const labels={
  sales:["Client","Article","Montant","Statut"],
  purchases:["Fournisseur","Article","Montant","Statut"],
  expenses:["Catégorie","Libellé","Montant","Bénéficiaire"],
  activities:["Titre","Catégorie","Statut","Montant"],
  projects:["Nom","Client","Statut","Progression"],
  innovations:["Titre","Étape","Progression","Budget"]
 };
 const l=labels[t], arr=state.db[t]||[];
 let rows=arr.map(x=>{
  const vals=t==="sales"?[x.customer,x.item,money(x.amount),x.status]:
   t==="purchases"?[x.supplier,x.item,money(x.amount),x.status]:
   t==="expenses"?[x.category,x.label,money(x.amount),x.beneficiary]:
   t==="activities"?[x.title,x.category,x.status,money(x.amount)]:
   t==="projects"?[x.name,x.client,x.status,(x.progress||0)+" %"]:
   [x.title,x.stage,(x.progress||0)+" %",money(x.budget)];
  const action=state.role==="admin"?`<button class="danger" data-delete="${t}" data-id="${x.id}">Supprimer</button>`:"—";
 
