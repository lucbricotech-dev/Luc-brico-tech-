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
 return String(v??"").replace(/[&<>"']/g,m=>({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#039;"
 }[m]));
}

function money(n){
 return new Intl.NumberFormat("fr-FR").format(Number(n||0))+" FCFA";
}

function uid(){
 return crypto.randomUUID
  ?crypto.randomUUID()
  :"demo-"+Date.now()+"-"+Math.random();
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
   await refreshInvoiceStatuses();

   applyRoleNavigation();

  }else{

   state.user={
    id:"demo-admin",
    email:"demo@lucbricotech.local"
   };

   state.profile=state.db.profiles[0];
   state.role="admin";
  }

  document.getElementById("userName").textContent=
   state.profile.full_name||state.user.email||"Utilisateur";

  document.getElementById("userRole").textContent=
   state.role.toUpperCase();

  document.getElementById("modeBadge").textContent=
   state.cloud?"SUPABASE":"MODE DÉMO";

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

  state.profile=
   state.db.profiles?.[0]||{
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

 const hasUserId=TABLES_WITH_USER_ID.includes(table);

 if(!state.cloud){

  const x={
   id:uid(),
   created_at:now(),
   ...payload
  };

  if(hasUserId)x.user_id=state.user.id;

  (state.db[table]??=[]).unshift(x);

  saveLocal();

  return x;
 }

 const x={...payload};

 if(hasUserId)x.user_id=state.user.id;

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

 if(i>=0)arr[i]=data;
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
  await insert("audit_logs",{
   action,
   entity,
   entity_id:id,
   details
  });
 }catch(e){
  console.warn(e);
 }
}

const ROLE_PAGES={
 admin:[
  "dashboard",
  "members",
  "clients",
  "sales",
  "quotes",
  "invoices",
  "payments",
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
  "sales",
  "quotes",
  "invoices",
  "payments",
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
  "sales",
  "quotes",
  "invoices",
  "payments",
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

 const closeModalBtn=document.getElementById("closeModal");

 if(closeModalBtn){
  closeModalBtn.onclick=closeModal;
 }

 const logoutBtn=document.getElementById("logoutBtn");

 if(logoutBtn){
  logoutBtn.onclick=logout;
 }
}

function closeMenu(){

 const sidebar=document.getElementById("sidebar");
 const menuBtn=document.getElementById("menuBtn");

 if(sidebar)sidebar.classList.remove("open");

 if(menuBtn){
  menuBtn.setAttribute("aria-expanded","false");
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
  .forEach(b=>{
   b.classList.toggle(
    "active",
    b.dataset.page===state.page
   );
  });

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
   "Gestion de votre clientèle."
  ],

  sales:[
   "Ventes",
   "Suivi des ventes et encaissements."
  ],

  quotes:[
   "Devis",
   "Création et suivi des devis clients."
  ],

  invoices:[
   "Factures",
   "Création et suivi des factures clients."
  ],

  payments:[
   "Paiements",
   "Suivi des règlements et modes de paiement."
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
  sales:tablePage,
  quotes:quotesPage,
  invoices:invoicesPage,
  payments:paymentsPage,
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

 document
  .querySelectorAll("[data-add]")
  .forEach(b=>{
   b.onclick=()=>openForm(b.dataset.add);
  });

 document
  .querySelectorAll("[data-delete]")
  .forEach(b=>{
   b.onclick=()=>del(
    b.dataset.delete,
    b.dataset.id
   );
  });

 document
  .querySelectorAll("[data-edit]")
  .forEach(b=>{
   b.onclick=()=>openForm(
    b.dataset.edit,
    b.dataset.id
   );
  });

 document
  .querySelectorAll("[data-role]")
  .forEach(s=>{
   s.onchange=()=>changeRole(
    s.dataset.id,
    s.value
   );
  });

 document
  .querySelectorAll("[data-create-employee]")
  .forEach(b=>{
   b.onclick=openEmployeeForm;
  });

 document
  .querySelectorAll("[data-toggle-active]")
  .forEach(s=>{
   s.onchange=()=>toggleMember(
    s.dataset.id,
    s.checked
   );
  });

 document
  .querySelectorAll("[data-edit-stock]")
  .forEach(b=>{
   b.onclick=()=>openForm(
    "stock_items",
    b.dataset.editStock
   );
  });

 document
  .querySelectorAll("[data-edit-document]")
  .forEach(b=>{
   b.onclick=()=>openDocumentForm(
    b.dataset.editDocument,
    b.dataset.id
   );
  });

 document
  .querySelectorAll("[data-details-document]")
  .forEach(b=>{
   b.onclick=()=>openDocumentForm(
    b.dataset.detailsDocument,
    b.dataset.id,
    true
   );
  });

 document
  .querySelectorAll("[data-add-document]")
  .forEach(b=>{
   b.onclick=()=>openDocumentForm(
    b.dataset.addDocument
   );
  });

 document
  .querySelectorAll("[data-add-payment]")
  .forEach(b=>{
   b.onclick=()=>openPaymentForm(
    b.dataset.addPayment
   );
  });

 document
  .querySelectorAll("[data-delete-payment]")
  .forEach(b=>{
   b.onclick=()=>deletePayment(
    b.dataset.deletePayment
   );
  });

 document
  .getElementById("settingsForm")
  ?.addEventListener(
   "submit",
   saveSettings
  );
}

function dashboard(){

 const sum=t=>
  state.db[t].reduce(
   (a,x)=>a+Number(x.amount||0),
   0
  );

 const stock=
  state.db.stock_items.reduce(
   (a,x)=>a+Number(x.quantity||0),
   0
  );

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

 </div>
 `;
}

function recent(t,key){

 const a=state.db[t].slice(0,5);

 return a.length
  ?a.map(x=>`
   <p>
    <strong>${esc(x[key])}</strong>
    <br>
    <span class="muted">
     ${new Date(x.created_at).toLocaleString("fr-FR")}
    </span>
   </p>
  `).join("")
  :`<div class="empty">Aucun élément.</div>`;
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
   t==="sales"
    ?[
      x.customer,
      x.item,
      money(x.amount),
      x.status
     ]

  :t==="purchases"
    ?[
      x.supplier,
      x.item,
      money(x.amount),
      x.status
     ]

  :t==="expenses"
    ?[
      x.category,
      x.label,
      money(x.amount),
      x.beneficiary
     ]

  :t==="activities"
    ?[
      x.title,
      x.category,
      x.status,
      money(x.amount)
     ]

  :t==="projects"
    ?[
      x.name,
      x.client,
      x.status,
      (x.progress||0)+" %"
     ]

  :[
    x.title,
    x.stage,
    (x.progress||0)+" %",
    money(x.budget)
   ];

  const action=
   state.role==="admin"
    ?`<button
       class="danger"
       data-delete="${t}"
       data-id="${x.id}">
       Supprimer
      </button>`
    :"—";

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
     <th>Action</th>
    </tr>
   </thead>

   <tbody>

    ${
     rows||
     `<tr>
       <td colspan="${l.length+1}">
        <div class="empty">
         Aucun enregistrement.
        </div>
       </td>
      </tr>`
    }

   </tbody>

  </table>

 </div>
 `;
}

function stock(){

 const arr=state.db.stock_items||[];

 const rows=arr.map(x=>{

  const action=
   state.role==="admin"
    ?`<button
       class="danger"
       data-delete="stock_items"
       data-id="${x.id}">
       Supprimer
      </button>`
    :"—";

  return `
   <tr>
    <td>${esc(x.name)}</td>
    <td>${esc(x.category)}</td>
    <td>${x.quantity} ${esc(x.unit||"")}</td>
    <td>${x.min_quantity}</td>
    <td>${esc(x.location)}</td>
    <td>
     ${
      Number(x.quantity)<=Number(x.min_quantity)
       ?'<span class="badge warn">Stock faible</span>'
       :'<span class="badge success">OK</span>'
     }
    </td>
    <td>${action}</td>
   </tr>
  `;
 }).join("");

 const add=
  canManageStock()
   ?`<button
      class="primary"
      data-add="stock_items">
      + Ajouter au stock
     </button>`
   :"";

 return `
 <div class="toolbar">

  <div class="muted">
   ${arr.length} article(s)
  </div>

  ${add}

 </div>

 <div class="table-wrap">

  <table>

   <thead>
    <tr>
     <th>Article</th>
     <th>Catégorie</th>
     <th>Quantité</th>
     <th>Seuil</th>
     <th>Lieu</th>
     <th>État</th>
     <th>Action</th>
    </tr>
   </thead>

   <tbody>

    ${
     rows||
     `<tr>
      <td colspan="7">
       <div class="empty">
        Stock vide.
       </div>
      </td>
     </tr>`
    }

   </tbody>

  </table>

 </div>
 `;
}

function members(){

 const arr=state.db.profiles||[];

 const rows=arr.map(x=>`

  <tr>

   <td>
    <b>${esc(x.full_name||"Sans nom")}</b>
   </td>

   <td>
    ${esc(x.phone||"—")}
   </td>

   <td>

    ${
     state.role==="admin"
      ?`<select
         data-role
         data-id="${x.id}">
         ${
          ["admin","manager","employee"]
           .map(r=>
            `<option ${
             x.role===r?"selected":""
            }>${r}</option>`
           ).join("")
         }
        </select>`
      :x.role
    }

   </td>

   <td>

    ${
     state.role==="admin"

      ?`<label class="switch">
         <input
          type="checkbox"
          data-toggle-active
          data-id="${x.id}"
          ${x.active!==false?"checked":""}
         >
         <span></span>
        </label>`

      :(x.active!==false
        ?"Actif"
        :"Inactif")
    }

   </td>

  </tr>

 `).join("");

 const create=
  state.role==="admin"
   ?`<button
      class="primary"
      data-create-employee>
      + Créer un compte employé
     </button>`
   :"";

 const intro=
  state.role==="admin"
   ?"Créez les comptes de connexion et gérez les rôles des membres."
   :"Consultez les membres et leurs rôles. La gestion des comptes est réservée à l’administrateur.";

 return `
 <div class="card">

  <div class="toolbar">

   <div>

    <h3 style="margin:0">
     Membres
    </h3>

    <p
     class="muted"
     style="margin:.35rem 0 0">
     ${intro}
    </p>

   </div>

   ${create}

  </div>

  <div class="table-wrap">

   <table>

    <thead>
     <tr>
      <th>Nom</th>
      <th>Téléphone</th>
      <th>Rôle</th>
      <th>État</th>
     </tr>
    </thead>

    <tbody>

     ${
      rows||
      `<tr>
       <td colspan="4">
        <div class="empty">
         Aucun membre.
        </div>
       </td>
      </tr>`
     }

    </tbody>

   </table>

  </div>

 </div>
 `;
}

function openEmployeeForm(){

 if(state.role!=="admin"){
  return toast(
   "Action réservée à l’administrateur."
  );
 }

 document.getElementById("modalTitle")
  .textContent="Créer un compte employé";

 document.getElementById("recordForm")
  .innerHTML=`
   <div class="form-grid">

    <label>
     Nom complet
     <input
      name="full_name"
      required
      placeholder="Nom et prénom">
    </label>

    <label>
     Téléphone
     <input
      name="phone"
      type="tel"
      placeholder="01 XX XX XX XX">
    </label>

    <label class="full">
     E-mail de connexion
     <input
      name="email"
      type="email"
      required
      placeholder="employe@lucbricotech.com">
    </label>

    <label>
     Mot de passe initial
     <input
      name="password"
      type="password"
      minlength="8"
      required
      placeholder="8 caractères minimum">
    </label>

    <label>
     Confirmation
     <input
      name="password_confirm"
      type="password"
      minlength="8"
      required
      placeholder="Retaper le mot de passe">
    </label>

    <div class="full">
     <div class="hint">
      Le nouveau compte sera créé avec le rôle
      <b>Employé</b>.
     </div>
    </div>

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

 document.getElementById("cancelForm")
  .onclick=closeModal;

 document.getElementById("recordForm")
  .onsubmit=createEmployee;

 document.getElementById("modal")
  .classList.remove("hidden");
}

async function createEmployee(e){

 e.preventDefault();

 const p=
  Object.fromEntries(
   new FormData(e.target).entries()
  );

 if(p.password!==p.password_confirm){
  return toast(
   "Les deux mots de passe ne correspondent pas."
  );
 }

 if(p.password.length<8){
  return toast(
   "Le mot de passe doit contenir au moins 8 caractères."
  );
 }

 try{

  if(!state.cloud){

   const exists=
    (state.db.profiles||[])
     .some(
      x=>
       (x.email||"").toLowerCase()===
       p.email.toLowerCase()
     );

   if(exists){
    throw new Error(
     "Cette adresse e-mail existe déjà dans le mode démo."
    );
   }

   const x={
    id:uid(),
    full_name:p.full_name,
    phone:p.phone||"",
    email:p.email,
    role:"employee",
    active:true,
    created_at:now()
   };

   state.db.profiles.unshift(x);

   saveLocal();

   await audit(
    "create_employee",
    "profiles",
    x.id,
    {
     email:p.email,
     role:"employee"
    }
   );

  }else{

   const {data,error}=
    await sb.functions.invoke(
     "create-employee",
     {
      body:{
       full_name:p.full_name,
       email:p.email,
       password:p.password,
       phone:p.phone||""
      }
     }
    );

   if(error)throw error;

   if(!data?.success){
    throw new Error(
     data?.error||
     "Impossible de créer le compte."
    );
   }

   await syncCloud();
  }

  closeModal();
  render();

  toast(
   "Compte employé créé avec succès."
  );

 }catch(err){

  console.error(err);

  toast(
   err.message||
   "Erreur lors de la création du compte."
  );
 }
}

async function toggleMember(id,active){

 if(state.role!=="admin"){
  return toast(
   "Action réservée à l’administrateur."
  );
 }

 try{

  await update(
   "profiles",
   id,
   {active}
  );

  await audit(
   active
    ?"activate_member"
    :"deactivate_member",
   "profiles",
   id,
   {active}
  );

  toast(
   active
    ?"Compte activé."
    :"Compte désactivé."
  );

  render();

 }catch(e){
  toast(e.message);
 }
}

async function changeRole(id,role){

 if(state.role!=="admin"){
  return toast(
   "Action réservée à l’administrateur."
  );
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

 const c=
  (state.db.clients||[])
   .find(x=>x.id===id);

 return c
  ?(c.company_name||c.full_name||"Client")
  :"Client inconnu";
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

 if(
  ["paid","accepted","converted"]
   .includes(s)
 ){
  return "success";
 }

 if(
  ["partial","sent"]
   .includes(s)
 ){
  return "warn";
 }

 if(
  [
   "cancelled",
   "rejected",
   "overdue",
   "expired"
  ].includes(s)
 ){
  return "danger";
 }

 return "muted";
}

function invoiceDisplayStatus(x){

 if(!x)return"unpaid";

 if(x.status==="cancelled"){
  return"cancelled";
 }

 if(x.status==="draft"){
  return"draft";
 }

 const total=Number(x.total||0);
 const paid=Number(x.amount_paid||0);

 if(
  total>0&&
  paid>=total
 ){
  return"paid";
 }

 if(paid>0){
  return"partial";
 }

 if(
  x.due_date&&
  x.due_date<today()
 ){
  return"overdue";
 }

 return"unpaid";
}

function linesSummary(type,id){

 const table=
  type==="quotes"
   ?"quote_items"
   :"invoice_items";

 const rows=
  (state.db[table]||[])
   .filter(
    x=>
     (
      type==="quotes"
       ?x.quote_id
       :x.invoice_id
     )===id
   );

 return rows.length
  ?`${rows.length} ligne(s)`
  :"0 ligne";
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
     x.company_name&&x.full_name
      ?`<br>
        <span class="muted">
         ${esc(x.full_name)}
        </span>`
      :""
    }

   </td>

   <td>
    ${esc(x.phone||"—")}
   </td>

   <td>
    ${esc(x.email||"—")}
   </td>

   <td>
    ${esc(x.city||"—")}
   </td>

   <td>

    <button
     class="secondary"
     data-edit="clients"
     data-id="${x.id}">
     Modifier
    </button>

    ${
     state.role==="admin"
      ?`<button
         class="danger"
         data-delete="clients"
         data-id="${x.id}">
         Supprimer
        </button>`
      :""
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
     <th>Client / Société</th>
     <th>Téléphone</th>
     <th>Email</th>
     <th>Ville</th>
     <th>Actions</th>
    </tr>
   </thead>

   <tbody>

    ${
     rows||
     `<tr>
      <td colspan="5">
       <div class="empty">
        Aucun client enregistré.
       </div>
      </td>
     </tr>`
    }

   </tbody>

  </table>

 </div>
 `;
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

   <td>
    ${esc(x.issue_date||"—")}
   </td>

   <td>
    ${esc(x.valid_until||"—")}
   </td>

   <td>
    ${linesSummary("quotes",x.id)}
   </td>

   <td>
    ${money(x.total)}
   </td>

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
     state.role!=="employee"
      ?`<button
         class="danger"
         data-delete="quotes"
         data-id="${x.id}">
         Supprimer
        </button>`
      :""
    }

   </td>

  </tr>

 `).join("");

 return `
 <div class="toolbar">

  <
