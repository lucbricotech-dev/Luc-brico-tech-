
(() => {
"use strict";

const CFG=window.LBT_CONFIG||{};
const hasCloud=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&window.supabase);
const sb=hasCloud?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;
const DBKEY="lbt_v3_demo";

const schemas={
 sales:{title:"Nouvelle vente",fields:[
  ["customer","Client","text",true],
  ["item","Article / service","text",true],
  ["quantity","Quantité","number",true],
  ["amount","Montant (FCFA)","number",true],
  ["payment_method","Paiement","select",false,["cash","mobile_money","bank","credit"]],
  ["status","Statut","select",false,["paid","pending","cancelled"]],
  ["notes","Notes","textarea",false]
 ]},

 purchases:{title:"Nouvel achat",fields:[
  ["supplier","Fournisseur","text",true],
  ["item","Article","text",true],
  ["quantity","Quantité","number",true],
  ["amount","Montant (FCFA)","number",true],
  ["status","Statut","select",false,["received","pending","cancelled"]],
  ["notes","Notes","textarea",false]
 ]},

 expenses:{title:"Nouvelle dépense",fields:[
  ["category","Catégorie","text",true],
  ["label","Libellé","text",true],
  ["amount","Montant (FCFA)","number",true],
  ["beneficiary","Bénéficiaire","text",false],
  ["notes","Notes","textarea",false]
 ]},

 activities:{title:"Nouvelle activité",fields:[
  ["title","Titre","text",true],
  ["category","Catégorie","text",false],
  ["description","Description","textarea",false],
  ["location","Lieu","text",false],
  ["status","Statut","select",false,["open","in_progress","done","cancelled"]],
  ["amount","Montant (FCFA)","number",false]
 ]},

 projects:{title:"Nouveau projet",fields:[
  ["name","Nom du projet","text",true],
  ["client","Client","text",false],
  ["description","Description","textarea",false],
  ["status","Statut","select",false,["planned","active","completed","paused"]],
  ["progress","Progression (%)","number",false],
  ["budget","Budget (FCFA)","number",false]
 ]},

 innovations:{title:"Nouvelle innovation",fields:[
  ["title","Titre","text",true],
  ["description","Description","textarea",false],
  ["stage","Étape","select",false,["idea","prototype","test","production"]],
  ["budget","Budget (FCFA)","number",false],
  ["progress","Progression (%)","number",false]
 ]},

 stock_items:{title:"Nouvel article de stock",fields:[
  ["name","Article","text",true],
  ["category","Catégorie","text",false],
  ["unit","Unité","text",false],
  ["quantity","Quantité","number",true],
  ["min_quantity","Seuil minimum","number",false],
  ["location","Emplacement","text",false]
 ]},

 clients:{title:"Nouveau client",fields:[
  ["full_name","Nom complet","text",true],
  ["company_name","Entreprise / société","text",false],
  ["phone","Téléphone","tel",false],
  ["email","E-mail","email",false],
  ["address","Adresse","text",false],
  ["city","Ville","text",false],
  ["notes","Notes","textarea",false]
 ]}
};

const state={
 page:"dashboard",
 role:"admin",
 user:null,
 cloud:hasCloud,
 db:loadLocal()
};

const TABLES=[
 "profiles",
 "sales",
 "purchases",
 "expenses",
 "stock_items",
 "stock_movements",
 "activities",
 "projects",
 "innovations",
 "audit_logs",
 "settings",
 "clients",
 "quotes",
 "quote_items",
 "invoices",
 "invoice_items",
 "payments"
];

function loadLocal(){
 try{
  const d=JSON.parse(localStorage.getItem(DBKEY))||seed();
  TABLES.forEach(t=>{
   if(!Array.isArray(d[t]))d[t]=[];
  });
  return d;
 }catch{
  return seed();
 }
}

function saveLocal(){
 localStorage.setItem(DBKEY,JSON.stringify(state.db));
}

function seed(){
 return {
  profiles:[
   {
    id:"demo-admin",
    full_name:"Lucien BESSAN",
    role:"admin",
    active:true
   }
  ],
  sales:[],
  purchases:[],
  expenses:[],
  stock_items:[],
  stock_movements:[],
  activities:[],
  projects:[],
  innovations:[],
  audit_logs:[],
  settings:[],
  clients:[],
  quotes:[],
  quote_items:[],
  invoices:[],
  invoice_items:[],
  payments:[]
 };
}

function toast(s){
 const e=document.getElementById("toast");
 if(!e)return;
 e.textContent=s;
 e.classList.add("show");
 setTimeout(()=>e.classList.remove("show"),2400);
}

function esc(v){
 return String(v??"").replace(
  /[&<>"']/g,
  m=>({
   "&":"&amp;",
   "<":"&lt;",
   ">":"&gt;",
   '"':"&quot;",
   "'":"&#039;"
  }[m])
 );
}

function money(n){
 return new Intl.NumberFormat("fr-FR").format(Number(n||0))+" FCFA";
}

function uid(){
 return crypto.randomUUID?
  crypto.randomUUID():
  "demo-"+Date.now()+"-"+Math.random();
}

function now(){
 return new Date().toISOString();
}

async function cloudSession(){
 if(!sb)return null;
 const {data:{session}}=await sb.auth.getSession();
 return session;
}

async function boot(){
 try{

  if(hasCloud){

   const session=await cloudSession();

   if(!session){
    if(location.pathname.endsWith("login.html"))return;
    location.href="login.html";
    return;
   }

   state.user=session.user;

   const {data:p}=await sb
    .from("profiles")
    .select("*")
    .eq("id",session.user.id)
    .single();

   state.profile=p||{
    id:session.user.id,
    full_name:session.user.email,
    email:session.user.email,
    role:"employee",
    active:true
   };

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

   state.user={
    id:"demo-admin",
    email:"demo@lucbricotech.local"
   };

   state.profile=state.db.profiles[0];
   state.role="admin";
  }

  const userName=document.getElementById("userName");
  const userRole=document.getElementById("userRole");
  const modeBadge=document.getElementById("modeBadge");

  if(userName){
   userName.textContent=
    state.profile.full_name||
    state.user.email||
    "Utilisateur";
  }

  if(userRole){
   userRole.textContent=state.role.toUpperCase();
  }

  if(modeBadge){
   modeBadge.textContent=
    state.cloud?
    "SUPABASE":
    "MODE DÉMO";
  }

  bind();
  render();

 }catch(err){

  console.error("Erreur de démarrage:",err);

  if(hasCloud){

   const content=document.getElementById("content");

   if(content){
    content.innerHTML=`
      <div class="card">
        <h3>Connexion sécurisée indisponible</h3>
        <p class="muted">
          Impossible de charger les données Supabase.
          Aucun mode administrateur de démonstration n'est activé.
        </p>
        <button class="primary" id="retryConnection">
          Réessayer
        </button>
        <button class="secondary" id="goLogin" style="margin-left:8px">
          Retour à la connexion
        </button>
      </div>
    `;
   }

   document.getElementById("retryConnection")
    ?.addEventListener("click",()=>location.reload());

   document.getElementById("goLogin")
    ?.addEventListener("click",()=>location.href="login.html");

   toast("Erreur de connexion sécurisée à Supabase.");
   return;
  }

  state.cloud=false;

  state.user={
   id:"demo-admin",
   email:"demo@lucbricotech.local"
  };

  state.profile=state.db.profiles?.[0]||{
   id:"demo-admin",
   full_name:"Lucien BESSAN",
   role:"admin",
   active:true
  };

  state.role=state.profile.role||"admin";

  document.getElementById("userName").textContent=
   state.profile.full_name||"Utilisateur";

  document.getElementById("userRole").textContent=
   state.role.toUpperCase();

  document.getElementById("modeBadge").textContent=
   "MODE DÉMO";

  bind();
  render();

  toast("Mode démo actif.");
 }
}

async function syncCloud(){

 for(const t of TABLES){

  const query=sb.from(t).select("*");

  const result=t==="settings"
   ?await query
   :await query.order("created_at",{ascending:false});

  const {data,error}=result;

  if(!error&&data){
   state.db[t]=data;
  }else if(!Array.isArray(state.db[t])){
   state.db[t]=[];
  }
 }
}

const TABLES_WITH_USER_ID=[
 "sales",
 "purchases",
 "expenses",
 "stock_movements",
 "activities",
 "projects",
 "innovations",
 "audit_logs",
 "clients",
 "quotes",
 "invoices",
 "payments"
];

async function insert(table,payload){

 if(!state.cloud){

  const x={
   id:uid(),
   created_at:now(),
   ...payload
  };

  if(TABLES_WITH_USER_ID.includes(table)){
   x.user_id=state.user.id;
  }

  (state.db[table]??=[]).unshift(x);

  saveLocal();

  return x;
 }

 const x={...payload};

 if(TABLES_WITH_USER_ID.includes(table)){
  x.user_id=state.user.id;
 }

 const {data,error}=await sb
  .from(table)
  .insert(x)
  .select()
  .single();

 if(error)throw error;

 state.db[table].unshift(data);

 return data;
}

async function update(table,id,payload){

 if(!state.cloud){

  const arr=state.db[table]||[];
  const i=arr.findIndex(x=>x.id===id);

  if(i>=0){
   arr[i]={
    ...arr[i],
    ...payload
   };
  }

  saveLocal();
  return;
 }

 const {data,error}=await sb
  .from(table)
  .update(payload)
  .eq("id",id)
  .select()
  .single();

 if(error)throw error;

 const arr=state.db[table]||[];
 const i=arr.findIndex(x=>x.id===id);

 if(i>=0){
  arr[i]=data;
 }
}

async function remove(table,id){

 if(!state.cloud){

  state.db[table]=(state.db[table]||[])
   .filter(x=>x.id!==id);

  saveLocal();

  return;
 }

 const {error}=await sb
  .from(table)
  .delete()
  .eq("id",id);

 if(error)throw error;

 state.db[table]=(state.db[table]||[])
  .filter(x=>x.id!==id);
}

async function audit(action,entity,id,details={}){

 try{
  await insert(
   "audit_logs",
   {
    action,
    entity,
    entity_id:id,
    details
   }
  );
 }catch(e){
  console.warn(e);
 }
}

const ROLE_PAGES={
 admin:[
  "dashboard",
  "members",
  "clients",
  "quotes",
  "invoices",
  "payments",
  "sales",
  "purchases",
  "expenses",
  "stock",
  "activities",
  "projects",
  "innovations",
  "reports",
  "audit",
  "settings"
 ],

 manager:[
  "dashboard",
  "members",
  "clients",
  "quotes",
  "invoices",
  "payments",
  "sales",
  "purchases",
  "expenses",
  "stock",
  "activities",
  "projects",
  "innovations",
  "reports"
 ],

 employee:[
  "dashboard",
  "clients",
  "quotes",
  "invoices",
  "payments",
  "sales",
  "purchases",
  "expenses",
  "stock",
  "activities",
  "projects",
  "innovations",
  "reports"
 ]
};

function allowedPages(){
 return ROLE_PAGES[state.role]||ROLE_PAGES.employee;
}

function canManageStock(){
 return state.role==="admin"||state.role==="manager";
}

function applyRoleNavigation(){

 const allowed=allowedPages();

 document.querySelectorAll("#nav button").forEach(b=>{

  const visible=allowed.includes(b.dataset.page);

  b.hidden=!visible;

  b.setAttribute(
   "aria-hidden",
   String(!visible)
  );
 });

 if(!allowed.includes(state.page)){
  state.page="dashboard";
 }
}

function bind(){

 applyRoleNavigation();

 document
  .querySelectorAll("#nav button:not([hidden])")
  .forEach(b=>{

   b.onclick=function(e){

    e.preventDefault();

    const page=this.dataset.page;

    if(!allowedPages().includes(page))return;

    state.page=page;

    closeMenu();

    render();
   };
  });

 const menuBtn=document.getElementById("menuBtn");
 const sidebar=document.getElementById("sidebar");

 if(menuBtn&&sidebar){

  menuBtn.onclick=null;

  menuBtn.addEventListener("click",function(e){

   e.preventDefault();
   e.stopPropagation();

   sidebar.classList.toggle("open");

   menuBtn.setAttribute(
    "aria-expanded",
    String(sidebar.classList.contains("open"))
   );
  });

  if(!document.body.dataset.lbtOutsideMenu){

   document.body.dataset.lbtOutsideMenu="1";

   document.addEventListener("click",function(e){

    if(
     sidebar.classList.contains("open")&&
     !sidebar.contains(e.target)&&
     !menuBtn.contains(e.target)
    ){
     closeMenu();
    }
   });
  }
 }

 const closeModalBtn=
  document.getElementById("closeModal");

 if(closeModalBtn){
  closeModalBtn.onclick=closeModal;
 }

 const logoutBtn=
  document.getElementById("logoutBtn");

 if(logoutBtn){
  logoutBtn.onclick=logout;
 }
}

function closeMenu(){

 const sidebar=
  document.getElementById("sidebar");

 const menuBtn=
  document.getElementById("menuBtn");

 if(sidebar){
  sidebar.classList.remove("open");
 }

 if(menuBtn){
  menuBtn.setAttribute(
   "aria-expanded",
   "false"
  );
 }
}

async function logout(){

 if(sb){
  await sb.auth.signOut();
 }

 location.href="login.html";
}

function setHeader(title,sub){

 document.getElementById("pageTitle").textContent=title;

 document.getElementById("pageSub").textContent=sub;
}

function render(){

 applyRoleNavigation();

 if(!allowedPages().includes(state.page)){
  state.page="dashboard";
 }

 document
  .querySelectorAll("#nav button")
  .forEach(b=>
   b.classList.toggle(
    "active",
    b.dataset.page===state.page
   )
  );

 const map={
  dashboard:[
   "Tableau de bord",
   "Vue générale de l’activité."
  ],

  members:[
   "Membres",
   "Utilisateurs et rôles."
  ],

  clients:[
   "Clients",
   "Gestion des clients."
  ],

  quotes:[
   "Devis",
   "Création et suivi des devis."
  ],

  invoices:[
   "Factures",
   "Création et suivi des factures."
  ],

  payments:[
   "Paiements",
   "Suivi des règlements clients."
  ],

  sales:[
   "Ventes",
   "Suivi des ventes et encaissements."
  ],

  purchases:[
   "Achats",
   "Achats auprès des fournisseurs."
  ],

  expenses:[
   "Dépenses",
   "Charges et dépenses."
  ],

  stock:[
   "Stock & matériel",
   "Articles, quantités et seuils."
  ],

  activities:[
   "Activités",
   "Interventions et opérations réalisées."
  ],

  projects:[
   "Projets",
   "Suivi des projets et chantiers."
  ],

  innovations:[
   "Innovations",
   "Idées, prototypes et solutions."
  ],

  reports:[
   "Rapports",
   "Synthèse financière et opérationnelle."
  ],

  audit:[
   "Journal",
   "Traçabilité des actions."
  ],

  settings:[
   "Paramètres",
   "Configuration de l’entreprise."
  ]
 };

 setHeader(...map[state.page]);

 const fn={
  dashboard:dashboard,
  members:members,
  clients:clientsPage,
  quotes:quotesPage,
  invoices:invoicesPage,
  payments:paymentsPage,
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

 if(typeof fn!=="function"){
  document.getElementById("content").innerHTML=
   `<div class="card">
     <h3>Page indisponible</h3>
     <p class="muted">Cette page n'est pas disponible.</p>
   </div>`;
  return;
 }

 const out=fn(state.page);

 document.getElementById("content").innerHTML=out;

 bindPage();
}

function bindPage(){

 document
  .querySelectorAll("[data-add]")
  .forEach(b=>
   b.onclick=()=>openForm(b.dataset.add)
  );

 document
  .querySelectorAll("[data-delete]")
  .forEach(b=>
   b.onclick=()=>del(
    b.dataset.delete,
    b.dataset.id
   )
  );

 document
  .querySelectorAll("[data-edit]")
  .forEach(b=>
   b.onclick=()=>openForm(
    b.dataset.edit,
    b.dataset.id
   )
  );

 document
  .querySelectorAll("[data-role]")
  .forEach(s=>
   s.onchange=()=>changeRole(
    s.dataset.id,
    s.value
   )
  );

 document
  .querySelectorAll("[data-create-employee]")
  .forEach(b=>
   b.onclick=openEmployeeForm
  );

 document
  .querySelectorAll("[data-toggle-active]")
  .forEach(s=>
   s.onchange=()=>toggleMember(
    s.dataset.id,
    s.checked
   )
  );

 document
  .querySelectorAll("[data-edit-stock]")
  .forEach(b=>
   b.onclick=()=>openForm(
    "stock_items",
    b.dataset.editStock
   )
  );

 document
  .querySelectorAll("[data-edit-document]")
  .forEach(b=>
   b.onclick=()=>openDocumentForm(
    b.dataset.editDocument,
    b.dataset.id
   )
  );

 document
  .querySelectorAll("[data-details-document]")
  .forEach(b=>
   b.onclick=()=>openDocumentForm(
    b.dataset.detailsDocument,
    b.dataset.id,
    true
   )
  );

 document
  .querySelectorAll("[data-add-document]")
  .forEach(b=>
   b.onclick=()=>openDocumentForm(
    b.dataset.addDocument
   )
  );

 document
  .querySelectorAll("[data-add-payment]")
  .forEach(b=>
   b.onclick=()=>openPaymentForm(
    b.dataset.addPayment
   )
  );

 document
  .querySelectorAll("[data-delete-payment]")
  .forEach(b=>
   b.onclick=()=>deletePayment(
    b.dataset.deletePayment
   )
  );

 document
  .getElementById("settingsForm")
  ?.addEventListener(
   "submit",
   saveSettings
  );
}

function dashboard(){

 const sum=t=>
  (state.db[t]||[])
   .reduce(
    (a,x)=>a+Number(x.amount||0),
    0
   );

 const stock=
  (state.db.stock_items||[])
   .reduce(
    (a,x)=>a+Number(x.quantity||0),
    0
   );

 const invoiceCount=
  (state.db.invoices||[]).length;

 const lowStock=
  (state.db.stock_items||[])
   .filter(x=>
    Number(x.quantity||0)<=
    Number(x.min_quantity||0)
   ).length;

 return `
 <section class="welcome-hero">

   <div class="hero-glow hero-glow-one"></div>
   <div class="hero-glow hero-glow-two"></div>

   <div class="hero-copy">

     <span class="hero-kicker">
       ESPACE DE GESTION
     </span>

     <h2>
       Bienvenue chez<br>
       <strong>LUC BRICO-TECH</strong>
     </h2>

     <p>
       La technologie au service de vos projets.
     </p>

     <div class="hero-tags">
       <span>Électricité</span>
       <span>Maintenance</span>
       <span>Informatique</span>
       <span>Innovation</span>
     </div>

   </div>

   <div class="hero-logo">
     <img
       src="./logo-luc-bricotech.png"
       alt="Logo LUC BRICO-TECH"
     >
   </div>

 </section>

 <div class="grid kpis">

   <div class="card kpi">
     <small>Ventes</small>
     <strong>${money(sum("sales"))}</strong>
   </div>

   <div class="card kpi">
     <small>Achats</small>
     <strong>${money(sum("purchases"))}</strong>
   </div>

   <div class="card kpi">
     <small>Dépenses</small>
     <strong>${money(sum("expenses"))}</strong>
   </div>

   <div class="card kpi">
     <small>Stock total</small>
     <strong>${stock}</strong>
   </div>

   <div class="card kpi">
     <small>Factures</small>
     <strong>${invoiceCount}</strong>
   </div>

   <div class="card kpi">
     <small>Stock faible</small>
     <strong>${lowStock}</strong>
   </div>

 </div>

 <div class="quick-strip">

   <div>
     <strong>
       Votre besoin, notre solution.
     </strong>

     <span>
       Centralisez les opérations et gardez une vision claire de l’activité.
     </span>
   </div>

   <div class="quick-actions">

     <button
       class="primary"
       data-add="sales">
       + Vente
     </button>

     <button
       class="secondary"
       data-add="activities">
       + Activité
     </button>

     <button
       class="secondary"
       data-add="projects">
       + Projet
     </button>

   </div>

 </div>

 <div
   class="grid cards"
   style="margin-top:16px">

   <div class="card">
     <h3>Activités récentes</h3>
     ${recent("activities","title")}
   </div>

   <div class="card">
     <h3>Projets</h3>
     ${recent("projects","name")}
   </div>

   <div class="card">
     <h3>Innovations</h3>
     ${recent("innovations","title")}
   </div>

 </div>`;
}

function recent(t,key){

 const a=(state.db[t]||[]).slice(0,5);

 return a.length?
  a.map(x=>`
   <p>
    <strong>${esc(x[key])}</strong>
    <br>
    <span class="muted">
      ${
       x.created_at?
       new Date(x.created_at)
        .toLocaleString("fr-FR"):
       ""
      }
    </span>
   </p>
  `).join(""):
  `<div class="empty">Aucun élément.</div>`;
}

function tablePage(t){

 const labels={
  sales:[
   "Client",
   "Article",
   "Montant",
   "Statut"
  ],

  purchases:[
   "Fournisseur",
   "Article",
   "Montant",
   "Statut"
  ],

  expenses:[
   "Catégorie",
   "Libellé",
   "Montant",
   "Bénéficiaire"
  ],

  activities:[
   "Titre",
   "Catégorie",
   "Statut",
   "Montant"
  ],

  projects:[
   "Nom",
   "Client",
   "Statut",
   "Progression"
  ],

  innovations:[
   "Titre",
   "Étape",
   "Progression",
   "Budget"
  ]
 };

 const l=labels[t];
 const arr=state.db[t]||[];

 let rows=arr.map(x=>{

  const vals=
   t==="sales"?
   [
    x.customer,
    x.item,
    money(x.amount),
    x.status
   ]:

   t==="purchases"?
   [
    x.supplier,
    x.item,
    money(x.amount),
    x.status
   ]:

   t==="expenses"?
   [
    x.category,
    x.label,
    money(x.amount),
    x.beneficiary
   ]:

   t==="activities"?
   [
    x.title,
    x.category,
    x.status,
    money(x.amount)
   ]:

   t==="projects"?
   [
    x.name,
    x.client,
    x.status,
    (x.progress||0)+" %"
   ]:

   [
    x.title,
    x.stage,
    (x.progress||0)+" %",
    money(x.budget)
   ];

  const action=
   state.role==="admin"?
   `<button
      class="danger"
      data-delete="${t}"
      data-id="${x.id}">
      Supprimer
    </button>`:
   "—";

  return `
   <tr>
    ${vals.map(v=>`<td>${esc(v)}</td>`).join("")}
    <td>${action}</td>
   </tr>
  `;
 }).join("");

 return `
 <div class="toolbar">
   <div class="muted">
     ${arr.length} enregistrement(s)
   </div>

   <button
     class="primary"
     data-add="${t}">
     + Ajouter
   </button>
 </div>

 <div class="table-wrap">
  <table>
   <thead>
    <tr>
     ${l.map(x=>`<th>${x}</th>`).join("")}
     <th>Actions</th>
    </tr>
   </thead>

   <tbody>
    ${
     rows||
     `<tr>
       <td
        colspan="${l.length+1}"
        class="empty">
        Aucun enregistrement.
       </td>
      </tr>`
    }
   </tbody>
  </table>
 </div>`;
}

function stock(){

 const arr=state.db.stock_items||[];

 const rows=arr.map(x=>{

  const low=
   Number(x.quantity||0)<=
   Number(x.min_quantity||0);

  return `
   <tr>
    <td><b>${esc(x.name)}</b></td>
    <td>${esc(x.category||"—")}</td>
    <td>${esc(x.unit||"—")}</td>
    <td>
      ${x.quantity??0}
      ${
       low?
       `<span class="badge danger">
         Faible
        </span>`:
       ""
      }
    </td>
    <td>${x.min_quantity??0}</td>
    <td>${esc(x.location||"—")}</td>
    <td>
      ${
       canManageStock()?
       `<button
         class="secondary"
         data-edit-stock="${x.id}">
         Modifier
        </button>`:
       "—"
      }
    </td>
   </tr>
  `;
 }).join("");

 return `
 <div class="toolbar">
  <div>
   <div class="muted">
    ${arr.length} article(s)
   </div>
  </div>

  ${
   canManageStock()?
   `<button
     class="primary"
     data-add="stock_items">
     + Ajouter un article
    </button>`:
   ""
  }
 </div>

 <div class="table-wrap">
  <table>
   <thead>
    <tr>
     <th>Article</th>
     <th>Catégorie</th>
     <th>Unité</th>
     <th>Quantité</th>
     <th>Seuil</th>
     <th>Emplacement</th>
     <th>Action</th>
    </tr>
   </thead>

   <tbody>
    ${
     rows||
     `<tr>
       <td colspan="7" class="empty">
        Aucun article de stock.
       </td>
      </tr>`
    }
   </tbody>
  </table>
 </div>`;
}

function members(){

 const arr=state.db.profiles||[];

 const rows=arr.map(x=>`
  <tr>
   <td>${esc(x.full_name||"—")}</td>
   <td>${esc(x.email||"—")}</td>

   <td>
    ${
     state.role==="admin"?
     `<select
       data-role
       data-id="${x.id}">
       <option value="admin" ${x.role==="admin"?"selected":""}>Admin</option>
       <option value="manager" ${x.role==="manager"?"selected":""}>Manager</option>
       <option value="employee" ${x.role==="employee"?"selected":""}>Employé</option>
      </select>`:
     `<span class="badge">
       ${esc(x.role)}
      </span>`
    }
   </td>

   <td>
    ${
     state.role==="admin"?
     `<label>
       <input
        type="checkbox"
        data-toggle-active
        data-id="${x.id}"
        ${x.active!==false?"checked":""}>
       Actif
      </label>`:
     (x.active!==false?"Actif":"Désactivé")
    }
   </td>
  </tr>
 `).join("");

 return `
 <div class="toolbar">

  <div class="muted">
   ${arr.length} membre(s)
  </div>

  ${
   state.role==="admin"?
   `<button
     class="primary"
     data-create-employee>
     + Créer un compte employé
    </button>`:
   ""
  }

 </div>

 <div class="table-wrap">
  <table>
   <thead>
    <tr>
     <th>Nom</th>
     <th>E-mail</th>
     <th>Rôle</th>
     <th>Statut</th>
    </tr>
   </thead>

   <tbody>
    ${
     rows||
     `<tr>
       <td colspan="4" class="empty">
        Aucun membre.
       </td>
      </tr>`
    }
   </tbody>
  </table>
 </div>`;
}

function openEmployeeForm(){

 document.getElementById("modalTitle").textContent=
  "Créer un compte employé";

 document.getElementById("recordForm").innerHTML=`
  <div class="form-grid">

   <label>
    Nom complet
    <input
     name="full_name"
     required>
   </label>

   <label>
    Téléphone
    <input
     name="phone"
     type="tel">
   </label>

   <label class="full">
    E-mail
    <input
     name="email"
     type="email"
     required>
   </label>

   <label>
    Mot de passe initial
    <input
     name="password"
     type="password"
     minlength="8"
     required>
   </label>

   <label>
    Confirmation
    <input
     name="password_confirm"
     type="password"
     minlength="8"
     required>
   </label>

   <div class="full actions">

    <button
     type="button"
     class="secondary"
     id="cancelForm">
     Annuler
    </button>

    <button class="primary">
     Créer le compte
    </button>

   </div>

  </div>
 `;

 document.getElementById("cancelForm").onclick=
  closeModal;

 document.getElementById("recordForm").onsubmit=
  createEmployee;

 document.getElementById("modal")
  .classList.remove("hidden");
}

async function createEmployee(e){

 e.preventDefault();

 if(state.role!=="admin"){
  toast("Action réservée à l’administrateur.");
  return;
 }

 const fd=new FormData(e.target);

 const full_name=String(fd.get("full_name")||"").trim();
 const phone=String(fd.get("phone")||"").trim();
 const email=String(fd.get("email")||"").trim().toLowerCase();
 const password=String(fd.get("password")||"");
 const password_confirm=String(fd.get("password_confirm")||"");

 if(password!==password_confirm){
  toast("Les mots de passe ne correspondent pas.");
  return;
 }

 if(password.length<8){
  toast("Le mot de passe doit contenir au moins 8 caractères.");
  return;
 }

 try{

  if(!state.cloud){
   const x={
    id:uid(),
    full_name,
    phone,
    email,
    role:"employee",
    active:true,
    created_at:now()
   };

   state.db.profiles.unshift(x);
   saveLocal();

   closeModal();
   render();

   toast("Compte employé créé en mode démo.");
   return;
  }

  const {data:{session}}=
   await sb.auth.getSession();

  if(!session){
   throw new Error("Session expirée.");
  }

  const {data,error}=await sb.functions.invoke(
   "create-employee",
   {
    body:{
     full_name,
     phone,
     email,
     password
    }
   }
  );

  if(error)throw error;

  if(data?.error){
   throw new Error(data.error);
  }

  await syncCloud();

  closeModal();
  render();

  toast("Compte employé créé avec succès.");

 }catch(err){

  console.error(err);

  toast(
   err?.message||
   "Impossible de créer le compte employé."
  );
 }
}

async function toggleMember(id,active){

 if(state.role!=="admin"){
  toast("Action réservée à l’administrateur.");
  return;
 }

 try{

  await update(
   "profiles",
   id,
   {active}
  );

  await audit(
   active?
   "activate_member":
   "deactivate_member",
   "profiles",
   id,
   {active}
  );

  toast(
   active?
   "Compte activé.":
   "Compte désactivé."
  );

  render();

 }catch(e){
  toast(e.message);
 }
}

async function changeRole(id,role){

 if(state.role!=="admin"){
  toast("Action réservée à l’administrateur.");
  return;
 }

 try{

  await update(
   "profiles",
   id,
   {role}
  );

  await audit(
   "update_role",
   "profiles",
   id,
   {role}
  );

  toast("Rôle mis à jour.");

  render();

 }catch(e){
  toast(e.message);
 }
}

function today(){
 return new Date()
  .toISOString()
  .slice(0,10);
}

function clientName(id){

 const c=(state.db.clients||[])
  .find(x=>x.id===id);

 return c?
  (
   c.company_name||
   c.full_name||
   "Client"
  ):
  "Client inconnu";
}

function statusLabel(s){

 const m={
  draft:"Brouillon",
  sent:"Envoyé",
  accepted:"Accepté",
  rejected:"Refusé",
  expired:"Expiré",
  converted:"Converti",
  unpaid:"Impayée",
  partial:"Partiellement payée",
  paid:"Payée",
  cancelled:"Annulée",
  overdue:"En retard"
 };

 return m[
  String(s||"").toLowerCase()
 ]||s||"—";
}

function statusClass(s){

 s=String(s||"").toLowerCase();

 if([
  "paid",
  "accepted",
  "converted"
 ].includes(s)){
  return "success";
 }

 if([
  "partial",
  "sent"
 ].includes(s)){
  return "warn";
 }

 if([
  "cancelled",
  "rejected",
  "overdue",
  "expired"
 ].includes(s)){
  return "danger";
 }

 return "muted";
}

function invoiceDisplayStatus(x){

 if(!x){
  return "unpaid";
 }

 if(x.status==="cancelled"){
  return "cancelled";
 }

 if(x.status==="draft"){
  return "draft";
 }

 const total=Number(x.total||0);
 const paid=Number(x.amount_paid||0);

 if(total>0&&paid>=total){
  return "paid";
 }

 if(paid>0&&paid<total){
  return "partial";
 }

 if(
  x.due_date&&
  x.due_date<today()
 ){
  return "overdue";
 }

 return "unpaid";
}

function linesSummary(type,id){

 const table=
  type==="quotes"?
  "quote_items":
  "invoice_items";

 const rows=
  (state.db[table]||[])
   .filter(
    x=>
     (
      type==="quotes"?
      x.quote_id:
      x.invoice_id
     )===id
   );

 return rows.length?
  `${rows.length} ligne(s)`:
  "0 ligne";
}

function clientsPage(){

 const arr=state.db.clients||[];

 const rows=arr.map(x=>`
  <tr>

   <td>
    <b>
     ${esc(
      x.company_name||
      x.full_name||
      "—"
     )}
    </b>

    ${
     x.company_name&&x.full_name?
     `<br>
      <span class="muted">
       ${esc(x.full_name)}
      </span>`:
     ""
    }
   </td>

   <td>${esc(x.phone||"—")}</td>

   <td>${esc(x.email||"—")}</td>

   <td>${esc(x.city||"—")}</td>

   <td>

    <button
     class="secondary"
     data-edit="clients"
     data-id="${x.id}">
     Modifier
    </button>

    ${
     state.role==="admin"?
     `<button
       class="danger"
       data-delete="clients"
       data-id="${x.id}">
       Supprimer
      </button>`:
     ""
    }

   </td>

  </tr>
 `).join("");

 return `
 <div class="toolbar">

  <div class="muted">
   ${arr.length} client(s)
  </div>

  <button
   class="primary"
   data-add="clients">
   + Nouveau client
  </button>

 </div>

 <div class="table-wrap">

  <table>

   <thead>
    <tr>
     <th>Client</th>
     <th>Téléphone</th>
     <th>E-mail</th>
     <th>Ville</th>
     <th>Actions</th>
    </tr>
   </thead>

   <tbody>
    ${
     rows||
     `<tr>
       <td colspan="5" class="empty">
        Aucun client.
       </td>
      </tr>`
    }
   </tbody>

  </table>

 </div>`;
}

function quotesPage(){

 const arr=state.db.quotes||[];

 const rows=arr.map(x=>`
  <tr>

   <td>
    <b>${esc(x.quote_number||"—")}</b>
    <br>
    <span class="muted">
     ${esc(x.title||"")}
    </span>
   </td>

   <td>
    ${esc(clientName(x.client_id))}
   </td>

   <td>${esc(x.issue_date||"—")}</td>

   <td>${esc(x.valid_until||"—")}</td>

   <td>${linesSummary("quotes",x.id)}</td>

   <td>${money(x.total)}</td>

   <td>
    <span class="badge ${statusClass(x.status)}">
     ${esc(statusLabel(x.status))}
    </span>
   </td>

   <td>

    <button
     class="secondary"
     data-details-document="quotes"
     data-id="${x.id}">
     Détails
    </button>

    <button
     class="secondary"
     data-edit-document="quotes"
     data-id="${x.id}">
     Modifier
    </button>

    ${
     state.role!=="employee"?
     `<button
       class="danger"
       data-delete="quotes"
       data-id="${x.id}">
       Supprimer
      </button>`:
     ""
    }

   </td>

  </tr>
 `).join("");

 return `
 <div class="toolbar">

  <div class="muted">
   ${arr.length} devis
  </div>

  <button
   class="primary"
   data-add-document="quotes">
   + Nouveau devis
  </button>

 </div>

 <div class="table-wrap">

  <table>

   <thead>
    <tr>
     <th>N° Devis</th>
     <th>Client</th>
     <th>Date</th>
     <th>Validité</th>
     <th>Lignes</th>
     <th>Total</th>
     <th>Statut</th>
     <th>Actions</th>
    </tr>
   </thead>

   <tbody>
    ${
     rows||
     `<tr>
       <td colspan="8" class="empty">
        Aucun devis.
       </td>
      </tr>`
    }
   </tbody>

  </table>

 </div>`;
}

function invoicesPage(){

 const arr=state.db.invoices||[];

 const rows=arr.map(x=>{

  const total=Number(x.total||0);
  const paid=Number(x.amount_paid||0);
  const due=Math.max(
   0,
   total-paid
  );

  const st=invoiceDisplayStatus(x);

  return `
   <tr>

    <td>
     <b>
      ${esc(x.invoice_number||"—")}
     </b>

     <br>

     <span class="muted">
      ${esc(x.title||"")}
     </span>
    </td>

    <td>
     ${esc(clientName(x.client_id))}
    </td>

    <td>
     ${esc(x.issue_date||"—")}
    </td>

    <td>
     ${esc(x.due_date||"—")}
    </td>

    <td>
     ${linesSummary("invoices",x.id)}
    </td>

    <td>
     ${money(total)}
    </td>

    <td>
     ${money(paid)}
    </td>

    <td>
     ${money(due)}
    </td>

    <td>
     <span
      class="badge ${statusClass(st)}">
      ${esc(statusLabel(st))}
     </span>
    </td>

    <td>

     <button
      class="secondary"
      data-details-document="invoices"
      data-id="${x.id}">
      Détails
     </button>

     <button
      class="secondary"
      data-edit-document="invoices"
      data-id="${x.id}">
      Modifier
     </button>

     ${
      state.role!=="employee"?
      `<button
        class="danger"
        data-delete="invoices"
        data-id="${x.id}">
        Supprimer
       </button>`:
      ""
     }

    </td>

   </tr>
  `;
 }).join("");

 return `
 <div class="toolbar">

  <div class="muted">
   ${arr.length} facture(s)
  </div>

  <button
   class="primary"
   data-add-document="invoices">
   + Nouvelle facture
  </button>

 </div>

 <div class="table-wrap">

  <table>

   <thead>
    <tr>
     <th>N° Facture</th>
     <th>Client</th>
     <th>Date</th>
     <th>Échéance</th>
     <th>Lignes</th>
     <th>Total</th>
     <th>Payé</th>
     <th>Reste</th>
     <th>Statut</th>
     <th>Actions</th>
    </tr>
   </thead>

   <tbody>
    ${
     rows||
     `<tr>
       <td colspan="10" class="empty">
        Aucune facture.
       </td>
      </tr>`
    }
   </tbody>

  </table>

 </div>`;
}

function paymentsPage(){

 const arr=state.db.payments||[];

 const rows=arr.map(x=>{

  const invoice=
   (state.db.invoices||[])
    .find(i=>i.id===x.invoice_id);

  const methods={
   cash:"Espèces",
   mtn_momo:"MTN MoMo",
   moov_money:"Moov Money",
   celtiis_cash:"Celtiis Cash",
   bank_transfer:"Virement bancaire",
   card:"Carte bancaire",
   check:"Chèque bancaire",
   pi_spi:"PI-SPI / paiement instantané",
   other:"Autre"
  };

  return `
   <tr>

    <td>
     ${esc(invoice?.invoice_number||"—")}
    </td>

    <td>
     ${esc(
      clientName(invoice?.client_id)
     )}
    </td>

    <td>
     ${money(x.amount)}
    </td>

    <td>
     ${esc(
      methods[x.payment_method]||
      x.payment_method||
      "—"
     )}
    </td>

    <td>
     ${esc(x.payment_date||"—")}
    </td>

    <td>
     ${esc(x.reference||"—")}
    </td>

    <td>

     ${
      state.role!=="employee"?
      `<button
        class="danger"
        data-delete-payment="${x.id}">
        Supprimer
       </button>`:
      "—"
     }

    </td>

   </tr>
  `;
 }).join("");

 return `
 <div class="toolbar">

  <div class="muted">
   ${arr.length} paiement(s)
  </div>

  <button
   class="primary"
   data-add-payment="">
   + Enregistrer un paiement
  </button>

 </div>

 <div class="table-wrap">

  <table>

   <thead>
    <tr>
     <th>Facture</th>
     <th>Client</th>
     <th>Montant</th>
     <th>Mode</th>
     <th>Date</th>
     <th>Référence</th>
     <th>Action</th>
    </tr>
   </thead>

   <tbody>
    ${
     rows||
     `<tr>
       <td colspan="7" class="empty">
        Aucun paiement.
       </td>
      </tr>`
    }
   </tbody>

  </table>

 </div>`;
}

function documentLines(type,id){

 const table=
  type==="quotes"?
  "quote_items":
  "invoice_items";

 const key=
  type==="quotes"?
  "quote_id":
  "invoice_id";

 return (state.db[table]||[])
  .filter(x=>x[key]===id);
}

function documentTotal(type,id){

 return documentLines(type,id)
  .reduce(
   (a,x)=>
    a+
    Number(
     x.amount??
     (
      Number(x.quantity||0)*
      Number(x.unit_price||0)
     )
    ),
   0
  );
}

function nextNumber(type){

 const year=new Date().getFullYear();

 const prefix=
  type==="quotes"?
  `DEV-${year}-`:
  `FAC-${year}-`;

 const arr=
  type==="quotes"?
  state.db.quotes||[]:
  state.db.invoices||[];

 let max=0;

 arr.forEach(x=>{

  const n=String(
   type==="quotes"?
   x.quote_number:
   x.invoice_number
  );

  const m=n.match(
   new RegExp(
    "^"+prefix+"(\\d+)$"
   )
  );

  if(m){
   max=Math.max(
    max,
    Number(m[1])
   );
  }
 });

 return prefix+
  String(max+1).padStart(4,"0");
}

function openDocumentForm(
 type,
 id=null,
 readonly=false
){

 const isInvoice=
  type==="invoices";

 const old=
  id?
  (state.db[type]||[])
   .find(x=>x.id===id):
  null;

 const number=
  old?
  (
   isInvoice?
   old.invoice_number:
   old.quote_number
  ):
  nextNumber(type);

 const statuses=
  isInvoice?
  [
   "draft",
   "unpaid",
   "partial",
   "paid",
   "cancelled",
   "overdue"
  ]:
  [
   "draft",
   "sent",
   "accepted",
   "rejected",
   "expired",
   "converted"
  ];

 const lines=
  old?
  documentLines(type,id):
  [];

 let draft=lines.map(x=>({
  description:x.description||"",
  unit:x.unit||"pièce",
  quantity:Number(x.quantity||0),
  unit_price:Number(x.unit_price||0),
  amount:Number(x.amount||0)
 }));

 const clientOptions=
  (state.db.clients||[])
   .map(c=>`
    <option
     value="${c.id}"
     ${
      old?.client_id===c.id?
      "selected":
      ""
     }>
     ${esc(
      c.company_name||
      c.full_name||
      "Client"
     )}
    </option>
   `)
   .join("");

 document.getElementById("modalTitle").textContent=
  readonly?
  (
   isInvoice?
   "Détails de la facture":
   "Détails du devis"
  ):
  id?
  "Modifier":
  (
   isInvoice?
   "Nouvelle facture":
   "Nouveau devis"
  );

 const renderLines=()=>draft.map(
  (l,i)=>`
   <tr>

    <td>
     <input
      data-line-desc="${i}"
      value="${esc(l.description)}"
      ${readonly?"disabled":""}>
    </td>

    <td>
     <select
      data-line-unit="${i}"
      ${readonly?"disabled":""}>

      ${[
       "pièce",
       "m",
       "kg",
       "h",
       "forfait",
       "lot",
       "service"
      ].map(u=>`
       <option
        value="${u}"
        ${l.unit===u?"selected":""}>
        ${u}
       </option>
      `).join("")}

     </select>
    </td>

    <td>
     <input
      type="number"
      min="0"
      step="0.01"
      data-line-qty="${i}"
      value="${l.quantity}"
      ${readonly?"disabled":""}>
    </td>

    <td>
     <input
      type="number"
      min="0"
      step="0.01"
      data-line-price="${i}"
      value="${l.unit_price}"
      ${readonly?"disabled":""}>
    </td>

    <td>
     ${money(l.amount)}
    </td>

    <td>
     ${
      readonly?
      "":
      `<button
        type="button"
        class="danger"
        data-remove-line="${i}">
        ✕
       </button>`
     }
    </td>

   </tr>
  `
 ).join("");

 const calc=()=>{

  draft.forEach(l=>{
   l.amount=
    Number(l.quantity||0)*
    Number(l.unit_price||0);
  });

  const subtotal=
   draft.reduce(
    (a,l)=>a+Number(l.amount||0),
    0
   );

  const discount=
   Number(
    document.querySelector(
     '[name="discount"]'
    )?.value||0
   );

  const tax=
   Number(
    document.querySelector(
     '[name="tax"]'
    )?.value||0
   );

  const total=Math.max(
   0,
   subtotal-discount+tax
  );

  return {
   subtotal,
   total
  };
 };

 document.getElementById("recordForm").innerHTML=`
  <div class="form-grid">

   <label>
    ${isInvoice?"Numéro de facture":"Numéro de devis"}
    <input
     name="document_number"
     value="${esc(number)}"
     readonly>
   </label>

   <label>
    Client

    <select
     name="client_id"
     ${readonly?"disabled":""}
     required>

     <option value="">
      Sélectionner
     </option>

     ${clientOptions}

    </select>

   </label>

   <label>
    Date

    <input
     type="date"
     name="issue_date"
     value="${esc(
      old?.issue_date||
      today()
     )}"
     ${readonly?"disabled":""}>
   </label>

   <label>
    ${
     isInvoice?
     "Échéance":
     "Valable jusqu'au"
    }

    <input
     type="date"
     name="${isInvoice?"due_date":"valid_until"}"
     value="${esc(
      old?.[
       isInvoice?
       "due_date":
       "valid_until"
      ]||
      today()
     )}"
     ${readonly?"disabled":""}>
   </label>

   <label>
    Titre

    <input
     name="title"
     value="${esc(old?.title||"")}"
     ${readonly?"disabled":""}>
   </label>

   <label>
    Statut

    <select
     name="status"
     ${readonly?"disabled":""}>

     ${statuses.map(s=>`
      <option
       value="${s}"
       ${
        (
         old?.status||
         (
          isInvoice?
          "unpaid":
          "draft"
         )
        )===s?
        "selected":
        ""
       }>
       ${statusLabel(s)}
      </option>
     `).join("")}

    </select>
   </label>

   <label class="full">
    Description

    <textarea
     name="description"
     ${readonly?"disabled":""}>${esc(
      old?.description||""
     )}</textarea>

   </label>

   <div class="full">

    <h3 style="margin:.4rem 0">
     Lignes détaillées
    </h3>

    <div class="table-wrap">

     <table>

      <thead>
       <tr>
        <th>Désignation</th>
        <th>Unité</th>
        <th>Qté</th>
        <th>Prix unitaire</th>
        <th>Total</th>
        <th></th>
       </tr>
      </thead>

      <tbody id="documentLinesBody">
       ${
        renderLines()||
        `<tr>
          <td
           colspan="6"
           class="empty">
           Aucune ligne.
          </td>
         </tr>`
       }
      </tbody>

     </table>

    </div>

    ${
     readonly?
     "":
     `<button
       type="button"
       class="secondary"
       id="addDocumentLine">
       + Ajouter une ligne
      </button>`
    }

   </div>

   <label>
    Remise

    <input
     type="number"
     step="0.01"
     name="discount"
     value="${old?.discount||0}"
     ${readonly?"disabled":""}>
   </label>

   <label>
    Taxe / frais

    <input
     type="number"
     step="0.01"
     name="tax"
     value="${old?.tax||0}"
     ${readonly?"disabled":""}>
   </label>

   ${
    isInvoice?
    `<label>
      Montant déjà payé

      <input
       type="number"
       step="0.01"
       name="amount_paid"
       value="${old?.amount_paid||0}"
       ${readonly?"disabled":""}>
     </label>`:
    ""
   }

   <div
    class="card full"
    style="padding:12px">

    <b>
     Sous-total :
     <span id="docSubtotal">
      0 FCFA
     </span>
    </b>

    <br>

    <b>
     Total :
     <span id="docTotal">
      0 FCFA
     </span>
    </b>

    ${
     isInvoice?
     `<br>
      <b>
       Reste :
       <span id="docDue">
        0 FCFA
       </span>
      </b>`:
     ""
    }

   </div>

   <label class="full">
    Notes

    <textarea
     name="notes"
     ${readonly?"disabled":""}>${esc(
      old?.notes||""
     )}</textarea>

   </label>

   <div class="full actions">

    <button
     type="button"
     class="secondary"
     id="cancelForm">
     Fermer
    </button>

    ${
     readonly?
     "":
     `<button class="primary">
       Enregistrer
      </button>`
    }

   </div>

  </div>
 `;

 const refresh=()=>{

  draft.forEach(l=>{
   l.amount=
    Number(l.quantity||0)*
    Number(l.unit_price||0);
  });

  const subtotal=
   draft.reduce(
    (a,l)=>a+Number(l.amount||0),
    0
   );

  const discount=
   Number(
    document.querySelector(
     '[name="discount"]'
    )?.value||0
   );

  const tax=
   Number(
    document.querySelector(
     '[name="tax"]'
    )?.value||0
   );

  const total=Math.max(
   0,
   subtotal-discount+tax
  );

  const paid=
   Number(
    document.querySelector(
     '[name="amount_paid"]'
    )?.value||0
   );

  document.getElementById(
   "docSubtotal"
  ).textContent=money(subtotal);

  document.getElementById(
   "docTotal"
  ).textContent=money(total);

  if(document.getElementById("docDue")){
   document.getElementById(
    "docDue"
   ).textContent=
    money(
     Math.max(
      0,
      total-paid
     )
    );
  }
 };

 document.getElementById("cancelForm").onclick=
  closeModal;

 if(!readonly){

  document.getElementById(
   "addDocumentLine"
  ).onclick=()=>{

   draft.push({
    description:"",
    unit:"pièce",
    quantity:1,
    unit_price:0,
    amount:0
   });

   document.getElementById(
    "documentLinesBody"
   ).innerHTML=renderLines();

   wire();
   refresh();
  };

  const wire=()=>{

   document
    .querySelectorAll("[data-remove-line]")
    .forEach(b=>
     b.onclick=()=>{

      draft.splice(
       Number(b.dataset.removeLine),
       1
      );

      document.getElementById(
       "documentLinesBody"
      ).innerHTML=renderLines();

      wire();
      refresh();
     }
    );

   document
    .querySelectorAll("[data-line-desc]")
    .forEach(i=>
     i.oninput=()=>
      draft[
       Number(i.dataset.lineDesc)
      ].description=i.value
    );

   document
    .querySelectorAll("[data-line-unit]")
    .forEach(i=>
     i.onchange=()=>
      draft[
       Number(i.dataset.lineUnit)
      ].unit=i.value
    );

   document
    .querySelectorAll("[data-line-qty]")
    .forEach(i=>
     i.oninput=()=>{

      draft[
       Number(i.dataset.lineQty)
      ].quantity=
       Number(i.value||0);

      refresh();
     }
    );

   document
    .querySelectorAll("[data-line-price]")
    .forEach(i=>
     i.oninput=()=>{

      draft[
       Number(i.dataset.linePrice)
      ].unit_price=
       Number(i.value||0);

      refresh();
     }
    );
  };

  wire();

  document
   .querySelector('[name="discount"]')
   .oninput=refresh;

  document
   .querySelector('[name="tax"]')
   .oninput=refresh;

  document
   .querySelector('[name="amount_paid"]')
   ?.addEventListener(
    "input",
    refresh
   );

  document.getElementById(
   "recordForm"
  ).onsubmit=async e=>{

   e.preventDefault();

   try{

    const fd=
     Object.fromEntries(
      new FormData(e.target).entries()
     );

    const {subtotal,total}=calc();

    let status=
     fd.status||
     (
      isInvoice?
      "unpaid":
      "draft"
     );

    const paid=
     isInvoice?
     Number(fd.amount_paid||0):
     0;

    if(
     isInvoice&&
     status!=="cancelled"&&
     status!=="draft"
    ){

     if(total>0&&paid>=total){
      status="paid";
     }
     else if(paid>0){
      status="partial";
     }
     else if(
      fd.due_date&&
      fd.due_date<today()
     ){
      status="overdue";
     }
     else{
      status="unpaid";
     }
    }

    const payload=
     isInvoice?
     {
      user_id:state.user.id,
      client_id:fd.client_id,
      invoice_number:number,
      issue_date:fd.issue_date,
      due_date:fd.due_date,
      status,
      title:fd.title,
      description:fd.description,
      subtotal,
      discount:Number(fd.discount||0),
      tax:Number(fd.tax||0),
      total,
      amount_paid:paid,
      amount_due:
       Math.max(
        0,
        total-paid
       ),
      notes:fd.notes
     }:
     {
      user_id:state.user.id,
      client_id:fd.client_id,
      quote_number:number,
      issue_date:fd.issue_date,
      valid_until:fd.valid_until,
      status,
      title:fd.title,
      description:fd.description,
      subtotal,
      discount:Number(fd.discount||0),
      tax:Number(fd.tax||0),
      total,
      notes:fd.notes
     };

    let saved;

    if(id){
     saved=
      await updateDocument(
       type,
       id,
       payload
      );
    }else{
     saved=
      await insert(
       type,
       payload
      );
    }

    await saveDocumentLines(
     type,
     saved.id,
     draft
    );

    await audit(
     id?
     "update":
     "insert",
     type,
     saved.id,
     {
      total,
      lines:draft.length
     }
    );

    closeModal();
    render();

    toast("Document enregistré.");

   }catch(err){

    console.error(err);

    toast(
     err.message||
     "Erreur d’enregistrement."
    );
   }
  };
 }

 refresh();

 document
  .getElementById("modal")
  .classList.remove("hidden");
}

async function updateDocument(
 type,
 id,
 payload
){

 if(!state.cloud){

  const arr=state.db[type]||[];

  const i=arr.findIndex(
   x=>x.id===id
  );

  if(i>=0){
   arr[i]={
    ...arr[i],
    ...payload,
    updated_at:now()
   };
  }

  saveLocal();

  return arr[i];
 }

 const {data,error}=await sb
  .from(type)
  .update(payload)
  .eq("id",id)
  .select()
  .single();

 if(error)throw error;

 const arr=state.db[type]||[];

 const i=arr.findIndex(
  x=>x.id===id
 );

 if(i>=0){
  arr[i]=data;
 }

 return data;
}

async function saveDocumentLines(
 type,
 id,
 lines
){

 const table=
  type==="quotes"?
  "quote_items":
  "invoice_items";

 const key=
  type==="quotes"?
  "quote_id":
  "invoice_id";

 if(!state.cloud){

  state.db[table]=
   (state.db[table]||[])
    .filter(x=>x[key]!==id);

  lines.forEach(l=>{

   state.db[table].push({
    id:uid(),
    [key]:id,
    description:l.description||"",
    unit:l.unit||"pièce",
    quantity:Number(l.quantity||0),
    unit_price:Number(l.unit_price||0),
    amount:Number(l.amount||0),
    created_at:now()
   });

  });

  saveLocal();

  return;
 }

 const {error:delErr}=await sb
  .from(table)
  .delete()
  .eq(key,id);

 if(delErr)throw delErr;

 if(lines.length){

  const payload=lines.map(l=>({
   [key]:id,
   description:l.description||"",
   quantity:Number(l.quantity||0),
   unit_price:Number(l.unit_price||0),
   amount:Number(l.amount||0)
  }));

  const {data,error}=await sb
   .from(table)
   .insert(payload)
   .select();

  if(error)throw error;

  state.db[table]=
   (state.db[table]||[])
    .filter(x=>x[key]!==id)
    .concat(data);

 }else{

  state.db[table]=
   (state.db[table]||[])
    .filter(x=>x[key]!==id);
 }
}

function openPaymentForm(invoiceId=""){

 const invoices=
  state.db.invoices||[];

 const methods={
  cash:"Espèces",
  mtn_momo:"MTN MoMo",
  moov_money:"Moov Money",
  celtiis_cash:"Celtiis Cash",
  bank_transfer:"Virement bancaire",
  card:"Carte bancaire",
  check:"Chèque bancaire",
  pi_spi:"PI-SPI / paiement instantané",
  other:"Autre"
 };

 document.getElementById(
  "modalTitle"
 ).textContent=
  "Enregistrer un paiement";

 document.getElementById(
  "recordForm"
 ).innerHTML=`
  <div class="form-grid">

   <label class="full">
    Facture

    <select
     name="invoice_id"
     required>

     <option value="">
      Sélectionner
     </option>

     ${invoices.map(i=>`
      <option
       value="${i.id}"
       ${
        invoiceId===i.id?
        "selected":
        ""
       }>
       ${esc(
        i.invoice_number||i.id
       )}
       —
       ${esc(
        clientName(i.client_id)
       )}
       —
       ${money(i.total)}
      </option>
     `).join("")}

    </select>
   </label>

   <label>
    Montant

    <input
     type="number"
     name="amount"
     min="0.01"
     step="0.01"
     required>
   </label>

   <label>
    Mode de paiement

    <select
     name="payment_method">

     ${Object.entries(methods)
      .map(([k,v])=>`
       <option value="${k}">
        ${v}
       </option>
      `).join("")}

    </select>
   </label>

   <label>
    Date

    <input
     type="date"
     name="payment_date"
     value="${today()}">
   </label>

   <label>
    Référence

    <input
     name="reference"
     placeholder="Référence transaction / chèque">
   </label>

   <label class="full">
    Notes

    <textarea
     name="notes"></textarea>
   </label>

   <div class="full actions">

    <button
     type="button"
     class="secondary"
     id="cancelForm">
     Annuler
    </button>

    <button class="primary">
     Enregistrer
    </button>

   </div>

  </div>
 `;

 document.getElementById(
  "cancelForm"
 ).onclick=closeModal;

 document.getElementById(
  "recordForm"
 ).onsubmit=async e=>{

  e.preventDefault();

  try{

   const p=
    Object.fromEntries(
     new FormData(e.target).entries()
    );

   p.amount=Number(p.amount);

   const x=
    await insert(
     "payments",
     p
    );

   await recalcInvoicePaid(
    p.invoice_id
   );

   await audit(
    "insert",
    "payments",
    x.id,
    p
   );

   closeModal();
   render();

   toast(
    "Paiement enregistré."
   );

  }catch(err){

   toast(err.message);
  }
 };

 document
  .getElementById("modal")
  .classList.remove("hidden");
}

async function recalcInvoicePaid(invoiceId){

 const inv=
  (state.db.invoices||[])
   .find(x=>x.id===invoiceId);

 if(!inv)return;

 const paid=
  (state.db.payments||[])
   .filter(
    x=>x.invoice_id===invoiceId
   )
   .reduce(
    (a,x)=>
     a+
     Number(x.amount||0),
    0
   );

 const total=
  Number(inv.total||0);

 let status=inv.status;

 if(
  status!=="cancelled"&&
  status!=="draft"
 ){

  if(
   total>0&&
   paid>=total
  ){
   status="paid";
  }
  else if(
   paid>0&&
   paid<total
  ){
   status="partial";
  }
  else if(
   inv.due_date&&
   inv.due_date<today()
  ){
   status="overdue";
  }
  else{
   status="unpaid";
  }
 }

 inv.amount_paid=paid;

 inv.amount_due=
  Math.max(
   0,
   total-paid
  );

 inv.status=status;

 if(state.cloud){

  const {error}=await sb
   .from("invoices")
   .update({
    amount_paid:paid,
    amount_due:Math.max(
     0,
     total-paid
    ),
    status
   })
   .eq("id",invoiceId);

  if(error)throw error;

 }else{

  saveLocal();
 }
}

async function deletePayment(id){

 if(!confirm(
  "Supprimer ce paiement ?"
 ))return;

 try{

  const p=
   (state.db.payments||[])
    .find(x=>x.id===id);

  await remove(
   "payments",
   id
  );

  if(p?.invoice_id){
   await recalcInvoicePaid(
    p.invoice_id
   );
  }

  await audit(
   "delete",
   "payments",
   id
  );

  render();

  toast(
   "Paiement supprimé."
  );

 }catch(e){

  toast(e.message);
 }
}

function reports(){

 const sum=t=>
  (state.db[t]||[])
   .reduce(
    (a,x)=>
     a+
     Number(x.amount||0),
    0
   );

 const sales=sum("sales");
 const purchases=sum("purchases");
 const expenses=sum("expenses");

 return `
 <div class="grid cards">

  <div class="card">
   <h3>Chiffre des ventes</h3>
   <strong>${money(sales)}</strong>
  </div>

  <div class="card">
   <h3>Total achats</h3>
   <strong>${money(purchases)}</strong>
  </div>

  <div class="card">
   <h3>Total dépenses</h3>
   <strong>${money(expenses)}</strong>
  </div>

 </div>

 <div
  class="card"
  style="margin-top:16px">

  <h3>Résultat simplifié</h3>

  <p>
   Ventes − achats − dépenses
  </p>

  <strong>
   ${money(
    sales-purchases-expenses
   )}
  </strong>

 </div>

 <div
  class="toolbar"
  style="margin-top:16px">

  <button
   class="secondary"
   id="exportSalesCsv">
   Exporter les ventes CSV
  </button>

  <button
   class="secondary"
   id="exportAllCsv">
   Exporter tout en CSV
  </button>

  <button
   class="secondary"
   id="backupBtn">
   Sauvegarder toutes les données
  </button>

 </div>`;
}

function auditPage(){

 const arr=
  state.db.audit_logs||[];

 const rows=arr.map(x=>`
  <tr>

   <td>
    ${esc(x.created_at||"")}
   </td>

   <td>
    ${esc(x.action||"")}
   </td>

   <td>
    ${esc(x.entity||"")}
   </td>

   <td>
    ${esc(
     safeJson(x.details||{})
    )}
   </td>

  </tr>
 `).join("");

 return `
 <div class="table-wrap">

  <table>

   <thead>
    <tr>
     <th>Date</th>
     <th>Action</th>
     <th>Entité</th>
     <th>Détails</th>
    </tr>
   </thead>

   <tbody>
    ${
     rows||
     `<tr>
       <td colspan="4">
        <div class="empty">
         Aucune action enregistrée.
        </div>
       </td>
      </tr>`
    }
   </tbody>

  </table>

 </div>`;
}

function settings(){

 const s=
  state.db.settings
   .find(
    x=>x.user_id===state.user.id
   )||{};

 return `
 <div class="card">

  <h3>
   Informations de l’entreprise
  </h3>

  <form
   id="settingsForm"
   class="form-grid">

   <label>
    Nom

    <input
     name="company_name"
     value="${esc(
      s.company_name||
      "LUC BRICO-TECH"
     )}">
   </label>

   <label>
    Adresse

    <input
     name="address"
     value="${esc(
      s.address||
      "Hévié Hounzévié, Abomey-Calavi"
     )}">
   </label>

   <label>
    Téléphone

    <input
     name="phone"
     value="${esc(
      s.phone||
      "01 67 02 84 91"
     )}">
   </label>

   <label>
    Email

    <input
     name="email"
     value="${esc(
      s.email||""
     )}">
   </label>

   <div class="full">

    <button class="primary">
     Enregistrer
    </button>

   </div>

  </form>

 </div>`;
}

async function saveSettings(e){

 e.preventDefault();

 const f=
  new FormData(e.target);

 const p=
  Object.fromEntries(
   f.entries()
  );

 try{

  if(!state.cloud){

   const arr=
    state.db.settings||[];

   const existing=
    arr.find(
     x=>x.user_id===state.user.id
    );

   if(existing){

    Object.assign(
     existing,
     p,
     {
      updated_at:now()
     }
    );

   }else{

    arr.unshift({
     id:uid(),
     user_id:state.user.id,
     created_at:now(),
     updated_at:now(),
     ...p
    });
   }

   state.db.settings=arr;

   saveLocal();

  }else{

   const {data,error}=await sb
    .from("settings")
    .upsert(
     {
      user_id:state.user.id,
      ...p,
      updated_at:now()
     },
     {
      onConflict:"user_id"
     }
    )
    .select()
    .single();

   if(error)throw error;

   const arr=
    state.db.settings||[];

   const i=
    arr.findIndex(
     x=>x.user_id===state.user.id
    );

   if(i>=0){
    arr[i]=data;
   }else{
    arr.unshift(data);
   }

   state.db.settings=arr;
  }

  await audit(
   "update",
   "settings",
   state.user.id,
   p
  );

  toast(
   "Paramètres enregistrés."
  );

  render();

 }catch(err){

  console.error(err);

  toast(
   err.message||
   "Erreur lors de l’enregistrement."
  );
 }
}

function openForm(
 table,
 id=null
){

 const schema=schemas[table];

 if(!schema)return;

 const old=
  id?
  (state.db[table]||[])
   .find(x=>x.id===id):
  null;

 document.getElementById(
  "modalTitle"
 ).textContent=
  id?
  "Modifier":
  schema.title;

 document.getElementById(
  "recordForm"
 ).innerHTML=`
  <div class="form-grid">

   ${schema.fields.map(f=>{

    const [
     name,
     label,
     type,
     req,
     opts
    ]=f;

    const v=
     old?.[name]??"";

    if(type==="textarea"){

     return `
      <label class="full">
       ${label}

       <textarea
        name="${name}">${esc(v)}</textarea>

      </label>
     `;
    }

    if(type==="select"){

     return `
      <label>
       ${label}

       <select
        name="${name}">

        ${opts.map(o=>`
         <option
          value="${o}"
          ${
           v===o?
           "selected":
           ""
          }>
          ${statusLabel(o)}
         </option>
        `).join("")}

       </select>

      </label>
     `;
    }

    return `
     <label>
      ${label}

      <input
       name="${name}"
       type="${type}"
       value="${esc(v)}"
       ${req?"required":""}>
     </label>
    `;

   }).join("")}

   <div class="full actions">

    <button
     type="button"
     class="secondary"
     id="cancelForm">
     Annuler
    </button>

    <button class="primary">
     Enregistrer
    </button>

   </div>

  </div>
 `;

 document.getElementById(
  "cancelForm"
 ).onclick=closeModal;

 document.getElementById(
  "recordForm"
 ).onsubmit=async e=>{

  e.preventDefault();

  const p=
   Object.fromEntries(
    new FormData(e.target).entries()
   );

  for(
   const f of schema.fields
  ){

   if(
    f[2]==="number"&&
    p[f[0]]!==""
   ){
    p[f[0]]=Number(
     p[f[0]]
    );
   }
  }

  try{

   if(id){

    await update(
     table,
     id,
     p
    );

   }else{

    await insert(
     table,
     p
    );
   }

   await audit(
    id?
    "update":
    "insert",
    table,
    id||null,
    p
   );

   toast("Enregistré.");

   closeModal();

   render();

  }catch(err){

   toast(
    err.message
   );
  }
 };

 document
  .getElementById("modal")
  .classList.remove("hidden");
}

function closeModal(){

 const modal=
  document.getElementById("modal");

 if(modal){
  modal.classList.add("hidden");
 }
}

async function del(
 table,
 id
){

 if(state.role!=="admin"){

  toast(
   "La suppression est réservée à l’administrateur."
  );

  return;
 }

 if(!confirm(
  "Supprimer cet enregistrement ?"
 ))return;

 try{

  await remove(
   table,
   id
  );

  await audit(
   "delete",
   table,
   id
  );

  toast("Supprimé.");

  render();

 }catch(e){

  toast(e.message);
 }
}

function safeJson(value){

 try{
  return JSON.stringify(value);
 }catch{
  return String(value??"");
 }
}

function csvCell(value){

 let text=
  value==null?
  "":
  (
   typeof value==="object"?
   safeJson(value):
   String(value)
  );

 if(
  /^[=+\-@]/.test(text)
 ){
  text="'"+text;
 }

 return `"${text.replace(
  /"/g,
  '""'
 )}"`;
}

function rowsToCsv(
 headers,
 rows
){

 return [
  headers
   .map(csvCell)
   .join(","),

  ...rows.map(
   r=>
    headers
     .map(
      h=>csvCell(r[h])
     )
     .join(",")
  )
 ].join("\r\n");
}

function exportSalesCsv(){

 const rows=
  (state.db.sales||[])
   .map(x=>({
    Client:x.customer||"",
    Article:x.item||"",
    Quantité:x.quantity??"",
    Montant:x.amount??0,
    Paiement:x.payment_method||"",
    Statut:x.status||"",
    Notes:x.notes||"",
    Date:x.created_at||""
   }));

 downloadFile(
  "luc-bricotech-ventes.csv",
  rowsToCsv(
   [
    "Client",
    "Article",
    "Quantité",
    "Montant",
    "Paiement",
    "Statut",
    "Notes",
    "Date"
   ],
   rows
  ),
  "text/csv;charset=utf-8"
 );
}

function exportAllCsv(){

 const sections=[];

 const add=(
  title,
  table,
  headers,
  map
 )=>{

  sections.push(
   `### ${title}`
  );

  sections.push(
   headers
    .map(csvCell)
    .join(",")
  );

  (state.db[table]||[])
   .forEach(x=>{

    const r=map(x);

    sections.push(
     headers
      .map(h=>csvCell(r[h]))
      .join(",")
    );
   });

  sections.push("");
 };

 add(
  "Ventes",
  "sales",
  [
   "Client",
   "Article",
   "Quantité",
   "Montant",
   "Paiement",
   "Statut",
   "Notes",
   "Date"
  ],
  x=>({
   Client:x.customer||"",
   Article:x.item||"",
   Quantité:x.quantity??"",
   Montant:x.amount??0,
   Paiement:x.payment_method||"",
   Statut:x.status||"",
   Notes:x.notes||"",
   Date:x.created_at||""
  })
 );

 add(
  "Achats",
  "purchases",
  [
   "Fournisseur",
   "Article",
   "Quantité",
   "Montant",
   "Statut",
   "Notes",
   "Date"
  ],
  x=>({
   Fournisseur:x.supplier||"",
   Article:x.item||"",
   Quantité:x.quantity??"",
   Montant:x.amount??0,
   Statut:x.status||"",
   Notes:x.notes||"",
   Date:x.created_at||""
  })
 );

 add(
  "Dépenses",
  "expenses",
  [
   "Catégorie",
   "Libellé",
   "Montant",
   "Bénéficiaire",
   "Notes",
   "Date"
  ],
  x=>({
   Catégorie:x.category||"",
   Libellé:x.label||"",
   Montant:x.amount??0,
   Bénéficiaire:x.beneficiary||"",
   Notes:x.notes||"",
   Date:x.created_at||""
  })
 );

 add(
  "Activités",
  "activities",
  [
   "Titre",
   "Catégorie",
   "Description",
   "Lieu",
   "Statut",
   "Montant",
   "Date"
  ],
  x=>({
   Titre:x.title||"",
   Catégorie:x.category||"",
   Description:x.description||"",
   Lieu:x.location||"",
   Statut:x.status||"",
   Montant:x.amount??0,
   Date:x.created_at||""
  })
 );

 add(
  "Projets",
  "projects",
  [
   "Nom",
   "Client",
   "Description",
   "Statut",
   "Progression",
   "Budget",
   "Date"
  ],
  x=>({
   Nom:x.name||"",
   Client:x.client||"",
   Description:x.description||"",
   Statut:x.status||"",
   Progression:x.progress??"",
   Budget:x.budget??0,
   Date:x.created_at||""
  })
 );

 add(
  "Innovations",
  "innovations",
  [
   "Titre",
   "Description",
   "Étape",
   "Budget",
   "Progression",
   "Date"
  ],
  x=>({
   Titre:x.title||"",
   Description:x.description||"",
   Étape:x.stage||"",
   Budget:x.budget??0,
   Progression:x.progress??"",
   Date:x.created_at||""
  })
 );

 add(
  "Stock",
  "stock_items",
  [
   "Article",
   "Catégorie",
   "Unité",
   "Quantité",
   "Seuil minimum",
   "Emplacement",
   "Date"
  ],
  x=>({
   Article:x.name||"",
   Catégorie:x.category||"",
   Unité:x.unit||"",
   Quantité:x.quantity??"",
   "Seuil minimum":x.min_quantity??"",
   Emplacement:x.location||"",
   Date:x.created_at||""
  })
 );

 add(
  "Clients",
  "clients",
  [
   "Nom",
   "Entreprise",
   "Téléphone",
   "Email",
   "Ville",
   "Date"
  ],
  x=>({
   Nom:x.full_name||"",
   Entreprise:x.company_name||"",
   Téléphone:x.phone||"",
   Email:x.email||"",
   Ville:x.city||"",
   Date:x.created_at||""
  })
 );

 add(
  "Factures",
  "invoices",
  [
   "Numéro",
   "Client",
   "Date",
   "Échéance",
   "Total",
   "Payé",
   "Reste",
   "Statut"
  ],
  x=>({
   Numéro:x.invoice_number||"",
   Client:clientName(x.client_id),
   Date:x.issue_date||"",
   Échéance:x.due_date||"",
   Total:x.total??0,
   Payé:x.amount_paid??0,
   Reste:x.amount_due??0,
   Statut:
    statusLabel(
     invoiceDisplayStatus(x)
    )
  })
 );

 add(
  "Paiements",
  "payments",
  [
   "Facture",
   "Montant",
   "Mode",
   "Date",
   "Référence"
  ],
  x=>({
   Facture:
    (
     state.db.invoices||[]
    ).find(
     i=>i.id===x.invoice_id
    )?.invoice_number||"",
   Montant:x.amount??0,
   Mode:x.payment_method||"",
   Date:x.payment_date||"",
   Référence:x.reference||""
  })
 );

 downloadFile(
  "luc-bricotech-export-complet.csv",
  sections.join("\r\n"),
  "text/csv;charset=utf-8"
 );
}

function exportAuditCsv(){

 if(state.role!=="admin"){

  return toast(
   "Export du journal réservé à l’administrateur."
  );
 }

 const rows=
  (state.db.audit_logs||[])
   .map(x=>({
    Date:x.created_at||"",
    Action:x.action||"",
    Entité:x.entity||"",
    "ID entité":x.entity_id||"",
    Détails:
     safeJson(x.details||{})
   }));

 downloadFile(
  "luc-bricotech-journal.csv",
  rowsToCsv(
   [
    "Date",
    "Action",
    "Entité",
    "ID entité",
    "Détails"
   ],
   rows
  ),
  "text/csv;charset=utf-8"
 );
}

function backupAllData(){

 downloadFile(
  "luc-bricotech-backup.json",
  JSON.stringify(
   {
    application:"LUC BRICO-TECH",
    exported_at:now(),
    role:state.role,
    user_id:
     state.user?.id||null,
    data:state.db
   },
   null,
   2
  ),
  "application/json;charset=utf-8"
 );
}

function downloadFile(
 name,
 data,
 mime="text/plain;charset=utf-8"
){

 try{

  const content=
   String(data??"");

  const blob=
   new Blob(
    [
     "\uFEFF",
     content
    ],
    {
     type:mime
    }
   );

  const url=
   URL.createObjectURL(blob);

  const a=
   document.createElement("a");

  a.href=url;
  a.download=name;
  a.rel="noopener";
  a.style.display="none";

  document.body.appendChild(a);

  a.click();

  setTimeout(()=>{
   a.remove();
   URL.revokeObjectURL(url);
  },1500);

  toast(
   `Export terminé : ${name}`
  );

 }catch(error){

  console.error(
   "Erreur export :",
   error
  );

  try{

   const dataUrl=
    "data:"+
    mime+
    ","+
    encodeURIComponent(
     "\uFEFF"+
     String(data??"")
    );

   const fallback=
    document.createElement("a");

   fallback.href=dataUrl;
   fallback.download=name;
   fallback.target="_blank";
   fallback.rel="noopener";

   document.body.appendChild(
    fallback
   );

   fallback.click();

   setTimeout(
    ()=>fallback.remove(),
    1000
   );

   toast(
    `Fichier prêt : ${name}`
   );

  }catch(fallbackError){

   console.error(
    "Erreur export fallback :",
    fallbackError
   );

   toast(
    "Impossible de préparer le téléchargement."
   );
  }
 }
}

document.addEventListener(
 "click",
 e=>{

  const button=
   e.target.closest?.(
    "#exportSalesCsv, #exportAllCsv, #exportAuditCsv, #backupBtn"
   );

  if(!button)return;

  if(
   button.id==="exportSalesCsv"
  ){
   exportSalesCsv();
  }
  else if(
   button.id==="exportAllCsv"
  ){
   exportAllCsv();
  }
  else if(
   button.id==="exportAuditCsv"
  ){
   exportAuditCsv();
  }
  else if(
   button.id==="backupBtn"
  ){
   backupAllData();
  }
 }
);

if(
 !document.getElementById(
  "lbt-doc-status-style"
 )
){

 const st=
  document.createElement("style");

 st.id=
  "lbt-doc-status-style";

 st.textContent=`
  .badge.success{
   background:#dcfce7;
   color:#166534;
  }

  .badge.warn{
   background:#fef3c7;
   color:#92400e;
  }

  .badge.danger{
   background:#fee2e2;
   color:#991b1b;
  }

  .badge.muted{
   background:#e5e7eb;
   color:#374151;
  }
 `;

 document.head.appendChild(st);
}

boot();

})();
