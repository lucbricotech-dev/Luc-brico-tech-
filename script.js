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

 stock_items:{
  title:"Nouvel article de stock",
  fields:[
   ["name","Article","text",true],
   ["category","Catégorie","text",false],
   ["unit","Unité","text",false],
   ["quantity","Quantité initiale","number",true],
   ["min_quantity","Seuil minimum","number",false],
   ["location","Emplacement","text",false]
  ]
 }
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
 "settings"
];

const TABLES_WITH_USER_ID=[
 "sales",
 "purchases",
 "expenses",
 "stock_movements",
 "activities",
 "projects",
 "innovations",
 "audit_logs"
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
  settings:[]
 };
}

function toast(message){
 const e=document.getElementById("toast");
 if(!e)return;
 e.textContent=message;
 e.classList.add("show");
 setTimeout(()=>e.classList.remove("show"),2400);
}

function esc(value){
 return String(value??"").replace(/[&<>"']/g,m=>({
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
  ? crypto.randomUUID()
  : "demo-"+Date.now()+"-"+Math.random();
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

   const {data:p,error:pError}=await sb
    .from("profiles")
    .select("*")
    .eq("id",session.user.id)
    .single();

   if(pError)throw pError;

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

   state.role=state.profile.role||"employee";

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

  if(userName)
   userName.textContent=state.profile.full_name||state.user.email||"Utilisateur";

  if(userRole)
   userRole.textContent=state.role.toUpperCase();

  if(modeBadge)
   modeBadge.textContent=state.cloud?"SUPABASE":"MODE DÉMO";

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

   document
    .getElementById("retryConnection")
    ?.addEventListener("click",()=>location.reload());

   document
    .getElementById("goLogin")
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
   state.db.profiles?.[0]||
   {
    id:"demo-admin",
    full_name:"Lucien BESSAN",
    role:"admin",
    active:true
   };

  state.role=state.profile.role||"admin";

  bind();
  render();

  toast("Mode démo actif.");
 }
}

async function syncCloud(){

 for(const table of TABLES){

  const query=sb.from(table).select("*");

  const result=
   table==="settings"
    ? await query
    : await query.order("created_at",{ascending:false});

  const {data,error}=result;

  if(error)throw error;

  state.db[table]=data||[];
 }
}

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
  console.warn("Audit:",e);
 }
}

const ROLE_PAGES={
 admin:[
  "dashboard",
  "members",
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

function canCreateStockMovement(){
 return state.role==="admin"||
        state.role==="manager"||
        state.role==="employee";
}

function applyRoleNavigation(){

 const allowed=allowedPages();

 document
  .querySelectorAll("#nav button")
  .forEach(b=>{
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

   b.onclick=()=>{

    if(!allowedPages().includes(b.dataset.page))
     return;

    state.page=b.dataset.page;

    closeMenu();

    render();
   };
  });

 document
  .getElementById("menuBtn")
  ?.addEventListener(
   "click",
   ()=>document
    .getElementById("sidebar")
    ?.classList.toggle("open")
  );

 document
  .getElementById("closeModal")
  ?.addEventListener("click",closeModal);

 document
  .getElementById("logoutBtn")
  ?.addEventListener("click",logout);
}

function closeMenu(){
 document
  .getElementById("sidebar")
  ?.classList.remove("open");
}

async function logout(){

 if(sb){
  await sb.auth.signOut();
 }

 location.href="login.html";
}

function setHeader(title,sub){

 const pageTitle=document.getElementById("pageTitle");
 const pageSub=document.getElementById("pageSub");

 if(pageTitle)pageTitle.textContent=title;
 if(pageSub)pageSub.textContent=sub;
}

function render(){

 applyRoleNavigation();

 if(!allowedPages().includes(state.page))
  state.page="dashboard";

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
   "Articles, quantités et mouvements."
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

 const content=document.getElementById("content");

 if(content){
  content.innerHTML=fn(state.page);
 }

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
  .querySelectorAll("[data-stock-movement]")
  .forEach(b=>{
   b.onclick=()=>openStockMovementForm(
    b.dataset.stockMovement
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
 `;
}

function tablePage(table){

 const configs={
  sales:{
   title:"Ventes",
   add:"Ajouter une vente",
   columns:[
    ["customer","Client"],
    ["item","Article"],
    ["quantity","Qté"],
    ["amount","Montant"],
    ["status","Statut"]
   ]
  },

  purchases:{
   title:"Achats",
   add:"Ajouter un achat",
   columns:[
    ["supplier","Fournisseur"],
    ["item","Article"],
    ["quantity","Qté"],
    ["amount","Montant"],
    ["status","Statut"]
   ]
  },

  expenses:{
   title:"Dépenses",
   add:"Ajouter une dépense",
   columns:[
    ["category","Catégorie"],
    ["label","Libellé"],
    ["amount","Montant"],
    ["beneficiary","Bénéficiaire"]
   ]
  },

  activities:{
   title:"Activités",
   add:"Ajouter une activité",
   columns:[
    ["title","Titre"],
    ["category","Catégorie"],
    ["status","Statut"],
    ["amount","Montant"]
   ]
  },

  projects:{
   title:"Projets",
   add:"Ajouter un projet",
   columns:[
    ["name","Projet"],
    ["client","Client"],
    ["status","Statut"],
    ["progress","Progression"],
    ["budget","Budget"]
   ]
  },

  innovations:{
   title:"Innovations",
   add:"Ajouter une innovation",
   columns:[
    ["title","Titre"],
    ["stage","Étape"],
    ["progress","Progression"],
    ["budget","Budget"]
   ]
  }
 };

 const cfg=configs[table];

 if(!cfg)return "";

 const arr=state.db[table]||[];

 return `
 <div class="toolbar">

  <div>
   <h3>${cfg.title}</h3>
   <span class="muted">
    ${arr.length} élément(s)
   </span>
  </div>

  <button
   class="primary"
   data-add="${table}">
   ${cfg.add}
  </button>

 </div>

 <div class="table-wrap">

  <table>

   <thead>
    <tr>
     ${cfg.columns
      .map(c=>`<th>${c[1]}</th>`)
      .join("")}
     <th>Actions</th>
    </tr>
   </thead>

   <tbody>

    ${
     arr.map(x=>`
      <tr>
       ${
        cfg.columns
         .map(([key])=>`
          <td>
           ${
            key==="amount"||key==="budget"
             ? money(x[key])
             : esc(x[key]??"")
           }
          </td>
         `)
         .join("")
       }

       <td>
        <button
         class="secondary"
         data-delete="${table}"
         data-id="${x.id}">
         Supprimer
        </button>
       </td>

      </tr>
     `).join("")
     ||
     `<tr>
       <td colspan="${cfg.columns.length+1}">
        <div class="empty">
         Aucun élément.
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

 const low=arr.filter(
  x=>Number(x.quantity||0)<=Number(x.min_quantity||0)
 );

 return `
 <div class="toolbar">

  <div>
   <h3>Stock & matériel</h3>

   <span class="muted">
    ${arr.length} article(s)
   </span>

   ${
    low.length
     ? `<span class="badge danger" style="margin-left:8px">
         ${low.length} stock(s) faible(s)
        </span>`
     : ""
   }

  </div>

  ${
   canManageStock()
    ? `<button
        class="primary"
        data-add="stock_items">
        + Ajouter un article
       </button>`
    : ""
  }

 </div>

 ${
  low.length
   ? `<div class="card" style="margin-bottom:16px">
       <h3>⚠️ Stock faible</h3>
       <p class="muted">
        ${low.map(x=>`
         <strong>${esc(x.name)}</strong>
         : ${Number(x.quantity||0)}
         / seuil ${Number(x.min_quantity||0)}
        `).join(" • ")}
       </p>
      </div>`
   : ""
 }

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
     <th>État</th>
     <th>Actions</th>
    </tr>
   </thead>

   <tbody>

    ${
     arr.map(x=>{

      const quantity=Number(x.quantity||0);
      const min=Number(x.min_quantity||0);
      const isLow=quantity<=min;

      return `
       <tr>

        <td>
         <strong>${esc(x.name)}</strong>
        </td>

        <td>${esc(x.category||"")}</td>

        <td>${esc(x.unit||"")}</td>

        <td>
         <strong>${quantity}</strong>
        </td>

        <td>${min}</td>

        <td>${esc(x.location||"")}</td>

        <td>
         ${
          isLow
           ? `<span class="badge danger">Stock faible</span>`
           : `<span class="badge success">Normal</span>`
         }
        </td>

        <td>

         <div style="display:flex;gap:6px;flex-wrap:wrap">

          <button
           class="primary"
           data-stock-movement="${x.id}">
           Mouvement
          </button>

          ${
           canManageStock()
            ? `
             <button
              class="secondary"
              data-edit-stock="${x.id}">
              Modifier
             </button>

             <button
              class="secondary"
              data-delete="stock_items"
              data-id="${x.id}">
              Supprimer
             </button>
            `
            : ""
          }

         </div>

        </td>

       </tr>
      `;

     }).join("")
     ||
     `<tr>
       <td colspan="8">
        <div class="empty">
         Aucun article de stock.
        </div>
       </td>
      </tr>`
    }

   </tbody>

  </table>

 </div>

 <div class="card" style="margin-top:16px">

  <div class="toolbar">

   <div>
    <h3>Historique des mouvements</h3>
    <p class="muted">
     Entrées, sorties, utilisations et retours.
    </p>
   </div>

  </div>

  ${stockMovementHistory()}

 </div>
 `;
}

function stockMovementHistory(){

 const movements=[...(state.db.stock_movements||[])]
  .sort(
   (a,b)=>
    new Date(b.created_at||0)-
    new Date(a.created_at||0)
  );

 if(!movements.length){
  return `
   <div class="empty">
    Aucun mouvement enregistré.
   </div>
  `;
 }

 return `
 <div class="table-wrap">

  <table>

   <thead>
    <tr>
     <th>Date</th>
     <th>Article</th>
     <th>Mouvement</th>
     <th>Quantité</th>
     <th>Motif</th>
     <th>Employé</th>
     <th>Projet</th>
    </tr>
   </thead>

   <tbody>

    ${
     movements.map(m=>{

      const item=(state.db.stock_items||[])
       .find(x=>x.id===m.stock_item_id);

      const employee=(state.db.profiles||[])
       .find(x=>x.id===m.employee_id);

      const project=(state.db.projects||[])
       .find(x=>x.id===m.project_id);

      const labels={
       entry:"Entrée",
       exit:"Sortie",
       use:"Utilisation",
       return:"Retour",
       adjustment:"Ajustement"
      };

      return `
       <tr>

        <td>
         ${
          m.created_at
           ? new Date(m.created_at)
              .toLocaleString("fr-FR")
           : ""
         }
        </td>

        <td>
         ${esc(item?.name||"Article supprimé")}
        </td>

        <td>
         <strong>
          ${esc(labels[m.movement_type]||m.movement_type)}
         </strong>
        </td>

        <td>${Number(m.quantity||0)}</td>

        <td>${esc(m.reason||"")}</td>

        <td>${esc(employee?.full_name||"")}</td>

        <td>${esc(project?.name||"")}</td>

       </tr>
      `;

     }).join("")
    }

   </tbody>

  </table>

 </div>
 `;
}

function openStockMovementForm(stockItemId){

 const item=(state.db.stock_items||[])
  .find(x=>x.id===stockItemId);

 if(!item){
  toast("Article introuvable.");
  return;
 }

 const employeeOptions=
  (state.db.profiles||[])
   .filter(x=>x.active!==false)
   .map(x=>`
    <option
     value="${x.id}"
     ${x.id===state.user.id?"selected":""}>
     ${esc(x.full_name||x.email||x.id)}
    </option>
   `)
   .join("");

 const projectOptions=
  (state.db.projects||[])
   .map(x=>`
    <option value="${x.id}">
     ${esc(x.name)}
    </option>
   `)
   .join("");

 document.getElementById("modalTitle").textContent=
  "Mouvement — "+item.name;

 document.getElementById("recordForm").innerHTML=`

  <div class="form-grid">

   <div class="card full" style="padding:12px">

    <strong>${esc(item.name)}</strong>

    <div class="muted">
     Stock actuel :
     <strong>${Number(item.quantity||0)}</strong>
     ${esc(item.unit||"")}
    </div>

   </div>

   <label>
    Type de mouvement

    <select
     name="movement_type"
     id="movementType"
     required>

     ${
      state.role==="employee"
       ? `
        <option value="use">
         Utilisation
        </option>

        <option value="return">
         Retour
        </option>
       `
       : `
        <option value="entry">
         Entrée
        </option>

        <option value="exit">
         Sortie
        </option>

        <option value="use">
         Utilisation
        </option>

        <option value="return">
         Retour
        </option>

        <option value="adjustment">
         Ajustement
        </option>
       `
     }

    </select>

   </label>

   <label>
    Quantité

    <input
     name="quantity"
     type="number"
     min="0.01"
     step="0.01"
     required>
   </label>

   <label>
    Employé responsable

    <select name="employee_id">

     ${
      state.role==="employee"
       ? `
        <option value="${state.user.id}">
         ${esc(
          state.profile.full_name||
          state.user.email
         )}
        </option>
       `
       : `
        <option value="">
         Non précisé
        </option>
        ${employeeOptions}
       `
     }

    </select>

   </label>

   <label>
    Projet

    <select name="project_id">

     <option value="">
      Aucun projet
     </option>

     ${projectOptions}

    </select>

   </label>

   <label>
    Motif

    <input
     name="reason"
     type="text"
     placeholder="Ex : intervention client">
   </label>

   <label class="full">
    Notes

    <textarea
     name="notes"
     placeholder="Informations complémentaires"></textarea>

   </label>

   <div class="full actions">

    <button
     type="button"
     class="secondary"
     id="cancelForm">
     Annuler
    </button>

    <button
     class="primary">
     Enregistrer le mouvement
    </button>

   </div>

  </div>
 `;

 document
  .getElementById("cancelForm")
  .onclick=closeModal;

 document
  .getElementById("recordForm")
  .onsubmit=async e=>{

   e.preventDefault();

   const form=
    Object.fromEntries(
     new FormData(e.target).entries()
    );

   const quantity=Number(form.quantity);

   if(!quantity||quantity<=0){
    toast("La quantité doit être supérieure à zéro.");
    return;
   }

   try{

    if(state.cloud){

     const {data,error}=await sb.rpc(
      "create_stock_movement",
      {
       p_stock_item_id:stockItemId,
       p_movement_type:form.movement_type,
       p_quantity:quantity,
       p_reason:form.reason||null,
       p_project_id:form.project_id||null,
       p_activity_id:null,
       p_employee_id:
        form.employee_id||null,
       p_notes:form.notes||null
      }
     );

     if(error)throw error;

     await syncCloud();

     await audit(
      "stock_movement",
      "stock_movements",
      data,
      {
       stock_item_id:stockItemId,
       movement_type:form.movement_type,
       quantity
      }
     );

    }else{

     const current=Number(item.quantity||0);

     let next=current;

     if(
      form.movement_type==="entry"||
      form.movement_type==="return"
     ){
      next=current+quantity;
     }

     if(
      form.movement_type==="exit"||
      form.movement_type==="use"
     ){
      if(current<quantity){
       throw new Error(
        `Stock insuffisant. Disponible : ${current}`
       );
      }

      next=current-quantity;
     }

     if(form.movement_type==="adjustment"){
      next=quantity;
     }

     item.quantity=next;
     item.updated_at=now();

     const movement={
      id:uid(),
      stock_item_id:stockItemId,
      user_id:state.user.id,
      movement_type:form.movement_type,
      quantity,
      reason:form.reason||"",
      project_id:form.project_id||null,
      activity_id:null,
      employee_id:
       form.employee_id||state.user.id,
      notes:form.notes||"",
      created_at:now()
     };

     state.db.stock_movements.unshift(movement);

     saveLocal();

     await audit(
      "stock_movement",
      "stock_movements",
      movement.id,
      movement
     );
    }

    closeModal();

    render();

    toast("Mouvement de stock enregistré.");

   }catch(err){

    console.error(err);

    toast(
     err.message||
     "Erreur lors du mouvement de stock."
    );
   }
  };

 document
  .getElementById("modal")
  .classList.remove("hidden");
}

function members(){

 const arr=state.db.profiles||[];

 return `
 <div class="toolbar">

  <div>
   <h3>Membres</h3>
   <span class="muted">
    ${arr.length} compte(s)
   </span>
  </div>

  ${
   state.role==="admin"
    ? `
     <button
      class="primary"
      data-create-employee>
      + Créer un compte employé
     </button>
    `
    : ""
  }

 </div>

 <div class="table-wrap">

  <table>

   <thead>
    <tr>
     <th>Nom</th>
     <th>E-mail</th>
     <th>Téléphone</th>
     <th>Rôle</th>
     <th>Actif</th>
    </tr>
   </thead>

   <tbody>

    ${
     arr.map(x=>`

      <tr>

       <td>${esc(x.full_name||"")}</td>

       <td>${esc(x.email||"")}</td>

       <td>${esc(x.phone||"")}</td>

       <td>

        ${
         state.role==="admin"
          ? `
           <select
            data-role
            data-id="${x.id}">

            ${["admin","manager","employee"]
             .map(r=>`
              <option
               value="${r}"
               ${x.role===r?"selected":""}>
               ${r}
              </option>
             `)
             .join("")}

           </select>
          `
          : esc(x.role||"")
        }

       </td>

       <td>

        ${
         state.role==="admin"
          ? `
           <input
            type="checkbox"
            data-toggle-active
            data-id="${x.id}"
            ${x.active!==false?"checked":""}>
          `
          : (
             x.active!==false
              ? "Oui"
              : "Non"
            )
        }

       </td>

      </tr>

     `).join("")
    }

   </tbody>

  </table>

 </div>
 `;
}

function openEmployeeForm(){

 if(state.role!=="admin"){
  toast("Action réservée à l’administrateur.");
  return;
 }

 document.getElementById("modalTitle").textContent=
  "Créer un compte employé";

 document.getElementById("recordForm").innerHTML=`

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
    Le compte sera créé avec le rôle
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

 document
  .getElementById("cancelForm")
  .onclick=closeModal;

 document
  .getElementById("recordForm")
  .onsubmit=createEmployee;

 document
  .getElementById("modal")
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

   if(exists)
    throw new Error(
     "Cette adresse e-mail existe déjà."
    );

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

 if(state.role!=="admin")
  return toast(
   "Action réservée à l’administrateur."
  );

 try{

  await update(
   "profiles",
   id,
   {active}
  );

  await audit(
   active
    ? "activate_member"
    : "deactivate_member",
   "profiles",
   id,
   {active}
  );

  toast(
   active
    ? "Compte activé."
    : "Compte désactivé."
  );

  render();

 }catch(e){
  toast(e.message);
 }
}

async function changeRole(id,role){

 if(state.role!=="admin")
  return toast(
   "Action réservée à l’administrateur."
  );

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

function reports(){

 const sum=t=>
  (state.db[t]||[])
   .reduce(
    (a,x)=>a+Number(x.amount||0),
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
   ${money(sales-purchases-expenses)}
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

 </div>
 `;
}

function auditPage(){

 if(state.role!=="admin")
  return `
   <div class="card">
    <h3>Accès réservé</h3>
    <p class="muted">
     Le journal des actions est réservé à l’administrateur.
    </p>
   </div>
  `;

 const arr=state.db.audit_logs||[];

 return `
 <div class="toolbar">

  <div class="muted">
   ${arr.length} action(s) enregistrée(s)
  </div>

  <button
   class="secondary"
   id="exportAuditCsv">
   Exporter le journal CSV
  </button>

 </div>

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
     arr.map(x=>`
      <tr>

       <td>
        ${
         x.created_at
          ? new Date(x.created_at)
             .toLocaleString("fr-FR")
          : ""
        }
       </td>

       <td>${esc(x.action)}</td>

       <td>${esc(x.entity)}</td>

       <td>
        ${esc(
         safeJson(x.details||{})
        )}
       </td>

      </tr>
     `).join("")
     ||
     `
      <tr>
       <td colspan="4">
        <div class="empty">
         Aucune action enregistrée.
        </div>
       </td>
      </tr>
     `
    }

   </tbody>

  </table>

 </div>
 `;
}

function settings(){

 const s=
  state.db.settings
   .find(x=>x.user_id===state.user.id)||
  {};

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

 </div>
 `;
}

async function saveSettings(e){

 e.preventDefault();

 const f=new FormData(e.target);
 const p=Object.fromEntries(f.entries());

 try{

  if(!state.cloud){

   const arr=state.db.settings||[];

   const existing=
    arr.find(
     x=>x.user_id===state.user.id
    );

   if(existing){

    Object.assign(
     existing,
     p,
     {updated_at:now()}
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

   const {data,error}=
    await sb
     .from("settings")
     .upsert(
      {
       user_id:state.user.id,
       ...p,
       updated_at:now()
      },
      {onConflict:"user_id"}
     )
     .select()
     .single();

   if(error)throw error;

   const arr=state.db.settings||[];

   const i=
    arr.findIndex(
     x=>x.user_id===state.user.id
    );

   if(i>=0)
    arr[i]=data;
   else
    arr.unshift(data);

   state.db.settings=arr;
  }

  await audit(
   "update",
   "settings",
   state.user.id,
   p
  );

  toast("Paramètres enregistrés.");

  render();

 }catch(err){

  console.error(err);

  toast(
   err.message||
   "Erreur lors de l’enregistrement."
  );
 }
}

function openForm(table,id=null){

 if(table==="stock_items"&&!canManageStock()){
  toast(
   "Seuls les administrateurs et managers peuvent gérer les articles."
  );
  return;
 }

 const schema=schemas[table];

 if(!schema)return;

 const old=
  id
   ? (state.db[table]||[])
      .find(x=>x.id===id)
   : null;

 document.getElementById("modalTitle").textContent=
  id
   ? "Modifier"
   : schema.title;

 document.getElementById("recordForm").innerHTML=`

 <div class="form-grid">

  ${
   schema.fields.map(f=>{

    const [
     name,
     label,
     type,
     req,
     opts
    ]=f;

    const v=old?.[name]??"";

    if(type==="textarea")
     return `
      <label class="full">
       ${label}
       <textarea
        name="${name}">
        ${esc(v)}
       </textarea>
      </label>
     `;

    if(type==="select")
     return `
      <label>
       ${label}

       <select name="${name}">

        ${
         opts.map(o=>`
          <option
           value="${esc(o)}"
           ${v===o?"selected":""}>
           ${esc(o)}
          </option>
         `).join("")
        }

       </select>

      </label>
     `;

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

   }).join("")
  }

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

 document
  .getElementById("cancelForm")
  .onclick=closeModal;

 document
  .getElementById("recordForm")
  .onsubmit=async e=>{

   e.preventDefault();

   const p=
    Object.fromEntries(
     new FormData(e.target).entries()
    );

   for(const f of schema.fields){

    if(
     f[2]==="number"&&
     p[f[0]]!==""
    ){
     p[f[0]]=Number(p[f[0]]);
    }
   }

   try{

    if(id)
     await update(table,id,p);
    else
     await insert(table,p);

    await audit(
     id?"update":"insert",
     table,
     id||null,
     p
    );

    toast("Enregistré.");

    closeModal();

    render();

   }catch(err){

    console.error(err);

    toast(
     err.message||
     "Erreur."
    );
   }
 };

 document
  .getElementById("modal")
  .classList.remove("hidden");
}

function closeModal(){

 document
  .getElementById("modal")
  ?.classList.add("hidden");
}

async function del(table,id){

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

  await remove(table,id);

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
  value==null
   ? ""
   : (
      typeof value==="object"
       ? safeJson(value)
       : String(value)
     );

 if(/^[=+\-@]/.test(text))
  text="'"+text;

 return `"${text.replace(/"/g,'""')}"`;
}

function rowsToCsv(headers,rows){

 return [
  headers.map(csvCell).join(","),
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

  sections.push(`### ${title}`);

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
      .map(
       h=>csvCell(r[h])
      )
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
  "Mouvements de stock",
  "stock_movements",
  [
   "Article ID",
   "Type",
   "Quantité",
   "Motif",
   "Projet ID",
   "Employé ID",
   "Notes",
   "Date"
  ],
  x=>({
   "Article ID":x.stock_item_id||"",
   Type:x.movement_type||"",
   Quantité:x.quantity??"",
   Motif:x.reason||"",
   "Projet ID":x.project_id||"",
   "Employé ID":x.employee_id||"",
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

 downloadFile(
  "luc-bricotech-export-complet.csv",
  sections.join("\r\n"),
  "text/csv;charset=utf-8"
 );
}

function exportAuditCsv(){

 if(state.role!=="admin")
  return toast(
   "Export du journal réservé à l’administrateur."
  );

 const rows=
  (state.db.audit_logs||[])
   .map(x=>({
    Date:x.created_at||"",
    Action:x.action||"",
    Entité:x.entity||"",
    "ID entité":x.entity_id||"",
    Détails:safeJson(x.details||{})
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
    user_id:state.user?.id||null,
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

  const content="\uFEFF"+String(data??"");

  const dataUrl=
   "data:"+
   mime+
   ","+
   encodeURIComponent(content);

  const link=
   document.createElement("a");

  link.href=dataUrl;
  link.download=name;
  link.target="_blank";
  link.rel="noopener";

  link.style.display="none";

  document.body.appendChild(link);

  link.click();

  setTimeout(()=>{
   link.remove();
  },1000);

  toast(
   "Fichier prêt : "+name
  );

 }catch(error){

  console.error(
   "Erreur téléchargement :",
   error
  );

  toast(
   "Impossible de préparer le téléchargement."
  );
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

  if(button.id==="exportSalesCsv")
   exportSalesCsv();

  else if(button.id==="exportAllCsv")
   exportAllCsv();

  else if(button.id==="exportAuditCsv")
   exportAuditCsv();

  else if(button.id==="backupBtn")
   backupAllData();
 }
);

boot();

})();
