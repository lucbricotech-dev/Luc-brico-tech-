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
function loadLocal(){try{return JSON.parse(localStorage.getItem(DBKEY))||seed()}catch{return seed()}}
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
}
async function syncCloud(){
 const tables=["profiles","sales","purchases","expenses","stock_items","stock_movements","activities","projects","innovations","audit_logs","settings"];
 for(const t of tables){
  const {data,error}=await sb.from(t).select("*").order("created_at",{ascending:false});
  if(!error&&data)state.db[t]=data;
 }
}
async function insert(table,payload){
 if(!state.cloud){const x={id:uid(),user_id:state.user.id,created_at:now(),...payload};(state.db[table]??=[]).unshift(x);saveLocal();return x}
 const x={user_id:state.user.id,...payload};
 const {data,error}=await sb.from(table).insert(x).select().single();
 if(error)throw error; state.db[table].unshift(data); return data;
}
async function update(table,id,payload){
 if(!state.cloud){const arr=state.db[table]||[];const i=arr.findIndex(x=>x.id===id);if(i>=0)arr[i]={...arr[i],...payload};saveLocal();return}
 const {data,error}=await sb.from(table).update(payload).eq("id",id).select().single();if(error)throw error;
 const arr=state.db[table]||[],i=arr.findIndex(x=>x.id===id);if(i>=0)arr[i]=data;
}
async function remove(table,id){
 if(!state.cloud){state.db[table]=(state.db[table]||[]).filter(x=>x.id!==id);saveLocal();return}
 const {error}=await sb.from(table).delete().eq("id",id);if(error)throw error;
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
 document.querySelectorAll("#nav button:not([hidden])").forEach(b=>b.onclick=()=>{
   if(!allowedPages().includes(b.dataset.page))return;
   state.page=b.dataset.page;closeMenu();render();
 });
 document.getElementById("menuBtn").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
 document.getElementById("closeModal").onclick=closeModal;
 document.getElementById("logoutBtn").onclick=logout;
}
function closeMenu(){document.getElementById("sidebar").classList.remove("open")}
async function logout(){if(sb)await sb.auth.signOut();location.href="login.html"}
function setHeader(title,sub){document.getElementById("pageTitle").textContent=title;document.getElementById("pageSub").textContent=sub}
function render(){
 applyRoleNavigation();
 if(!allowedPages().includes(state.page))state.page="dashboard";
 document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===state.page));
 const map={dashboard:["Tableau de bord","Vue générale de l’activité."],members:["Membres","Utilisateurs et rôles."],sales:["Ventes","Suivi des ventes et encaissements."],purchases:["Achats","Achats auprès des fournisseurs."],expenses:["Dépenses","Charges et dépenses."],stock:["Stock & matériel","Articles, quantités et seuils."],activities:["Activités","Interventions et opérations réalisées."],projects:["Projets","Suivi des projets et chantiers."],innovations:["Innovations","Idées, prototypes et solutions."],reports:["Rapports","Synthèse financière et opérationnelle."],audit:["Journal","Traçabilité des actions."],settings:["Paramètres","Configuration de l’entreprise."]};
 setHeader(...map[state.page]);
 const fn={dashboard:dashboard,members:members,sales:tablePage,purchases:tablePage,expenses:tablePage,stock:stock,activities:tablePage,projects:tablePage,innovations:tablePage,reports:reports,audit:auditPage,settings:settings}[state.page];
 const out=fn(state.page); document.getElementById("content").innerHTML=out;
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
   <div class="hero-logo"><img src="assets/logo-luc-bricotech.png" alt="Logo LUC BRICO-TECH"></div>
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
function recent(t,key){const a=state.db[t].slice(0,5);return a.length?a.map(x=>`<p><strong>${esc(x[key])}</strong><br><span class="muted">${new Date(x.created_at).toLocaleString("fr-FR")}</span></p>`).join(""):`<div class="empty">Aucun élément.</div>`}

function tablePage(t){
 const labels={sales:["Client","Article","Montant","Statut"],purchases:["Fournisseur","Article","Montant","Statut"],expenses:["Catégorie","Libellé","Montant","Bénéficiaire"],activities:["Titre","Catégorie","Statut","Montant"],projects:["Nom","Client","Statut","Progression"],innovations:["Titre","Étape","Progression","Budget"]};
 const l=labels[t], arr=state.db[t]||[];
 let rows=arr.map(x=>{
  const vals=t==="sales"?[x.customer,x.item,money(x.amount),x.status]:
   t==="purchases"?[x.supplier,x.item,money(x.amount),x.status]:
   t==="expenses"?[x.category,x.label,money(x.amount),x.beneficiary]:
   t==="activities"?[x.title,x.category,x.status,money(x.amount)]:
   t==="projects"?[x.name,x.client,x.status,(x.progress||0)+" %"]:
   [x.title,x.stage,(x.progress||0)+" %",money(x.budget)];
  const action=state.role==="admin"?`<button class="danger" data-delete="${t}" data-id="${x.id}">Supprimer</button>`:"—";
  return `<tr>${vals.map(v=>`<td>${esc(v)}</td>`).join("")}<td>${action}</td></tr>`;
 }).join("");
 return `<div class="toolbar"><div class="muted">${arr.length} enregistrement(s)</div><button class="primary" data-add="${t}">+ Ajouter</button></div>
 <div class="table-wrap"><table><thead><tr>${l.map(x=>`<th>${x}</th>`).join("")}<th>Action</th></tr></thead><tbody>${rows||`<tr><td colspan="${l.length+1}"><div class="empty">Aucun enregistrement.</div></td></tr>`}</tbody></table></div>`;
}

function stock(){
 const arr=state.db.stock_items||[];
 const action=state.role==="admin"?`<button class="danger" data-delete="stock_items" data-id="${x.id}">Supprimer</button>`:"—";
 const rows=arr.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${x.quantity} ${esc(x.unit||"")}</td><td>${x.min_quantity}</td><td>${esc(x.location)}</td><td>${Number(x.quantity)<=Number(x.min_quantity)?'<span class="badge warn">Stock faible</span>':'<span class="badge success">OK</span>'}</td><td>${action}</td></tr>`).join("");
 const add=canManageStock()?`<button class="primary" data-add="stock_items">+ Ajouter au stock</button>`:"";
 return `<div class="toolbar"><div class="muted">${arr.length} article(s)</div>${add}</div>
 <div class="table-wrap"><table><thead><tr><th>Article</th><th>Catégorie</th><th>Quantité</th><th>Seuil</th><th>Lieu</th><th>État</th><th>Action</th></tr></thead><tbody>${rows||`<tr><td colspan="7"><div class="empty">Stock vide.</div></td></tr>`}</tbody></table></div>`;
}

function members(){
 const arr=state.db.profiles||[];
 const rows=arr.map(x=>`<tr><td><b>${esc(x.full_name||"Sans nom")}</b></td><td>${esc(x.phone||"—")}</td><td>${state.role==="admin"?`<select data-role data-id="${x.id}">${["admin","manager","employee"].map(r=>`<option ${x.role===r?"selected":""}>${r}</option>`).join("")}</select>`:x.role}</td><td>${state.role==="admin"?`<label class="switch"><input type="checkbox" data-toggle-active data-id="${x.id}" ${x.active!==false?"checked":""}><span></span></label>`:(x.active!==false?"Actif":"Inactif")}</td></tr>`).join("");
 const create=state.role==="admin"?`<button class="primary" data-create-employee>+ Créer un compte employé</button>`:"";
 const intro=state.role==="admin"?"Créez les comptes de connexion et gérez les rôles des membres.":"Consultez les membres et leurs rôles. La gestion des comptes est réservée à l’administrateur.";
 return `<div class="card"><div class="toolbar"><div><h3 style="margin:0">Membres</h3><p class="muted" style="margin:.35rem 0 0">${intro}</p></div>${create}</div>
 <div class="table-wrap"><table><thead><tr><th>Nom</th><th>Téléphone</th><th>Rôle</th><th>État</th></tr></thead><tbody>${rows||`<tr><td colspan="4"><div class="empty">Aucun membre.</div></td></tr>`}</tbody></table></div></div>`;
}

function openEmployeeForm(){
 if(state.role!=="admin")return toast("Action réservée à l’administrateur.");
 document.getElementById("modalTitle").textContent="Créer un compte employé";
 document.getElementById("recordForm").innerHTML=`<div class="form-grid">
 <label>Nom complet<input name="full_name" required placeholder="Nom et prénom"></label>
 <label>Téléphone<input name="phone" type="tel" placeholder="01 XX XX XX XX"></label>
 <label class="full">E-mail de connexion<input name="email" type="email" required placeholder="employe@lucbricotech.com"></label>
 <label>Mot de passe initial<input name="password" type="password" minlength="8" required placeholder="8 caractères minimum"></label>
 <label>Confirmation<input name="password_confirm" type="password" minlength="8" required placeholder="Retaper le mot de passe"></label>
 <div class="full"><div class="hint">Le nouveau compte sera créé avec le rôle <b>Employé</b>. L’administrateur pourra ensuite modifier son rôle depuis la liste des membres.</div></div>
 <div class="full actions"><button type="button" class="secondary" id="cancelForm">Annuler</button><button class="primary">Créer le compte</button></div></div>`;
 document.getElementById("cancelForm").onclick=closeModal;
 document.getElementById("recordForm").onsubmit=createEmployee;
 document.getElementById("modal").classList.remove("hidden");
}

async function createEmployee(e){
 e.preventDefault();
 const p=Object.fromEntries(new FormData(e.target).entries());
 if(p.password!==p.password_confirm)return toast("Les deux mots de passe ne correspondent pas.");
 if(p.password.length<8)return toast("Le mot de passe doit contenir au moins 8 caractères.");
 try{
   if(!state.cloud){
     const exists=(state.db.profiles||[]).some(x=>(x.email||"").toLowerCase()===p.email.toLowerCase());
     if(exists)throw new Error("Cette adresse e-mail existe déjà dans le mode démo.");
     const x={id:uid(),full_name:p.full_name,phone:p.phone||"",email:p.email,role:"employee",active:true,created_at:now()};
     state.db.profiles.unshift(x);saveLocal();await audit("create_employee","profiles",x.id,{email:p.email,role:"employee"});
   }else{
     const {data,error}=await sb.functions.invoke("create-employee",{body:{full_name:p.full_name,email:p.email,password:p.password,phone:p.phone||""}});
     if(error)throw error;
     if(!data?.success)throw new Error(data?.error||"Impossible de créer le compte.");
     await syncCloud();
   }
   closeModal();render();toast("Compte employé créé avec succès.");
 }catch(err){console.error(err);toast(err.message||"Erreur lors de la création du compte.");}
}

async function toggleMember(id,active){
 if(state.role!=="admin")return toast("Action réservée à l’administrateur.");
 try{await update("profiles",id,{active});await audit(active?"activate_member":"deactivate_member","profiles",id,{active});toast(active?"Compte activé.":"Compte désactivé.");render()}catch(e){toast(e.message)}
}

async function changeRole(id,role){
 if(state.role!=="admin")return toast("Action réservée à l’administrateur.");
 try{await update("profiles",id,{role});await audit("update_role","profiles",id,{role});toast("Rôle mis à jour.");render()}catch(e){toast(e.message)}
}

function reports(){
 const sum=t=>state.db[t].reduce((a,x)=>a+Number(x.amount||0),0);
 return `<div class="grid cards">
 <div class="card"><h3>Chiffre des ventes</h3><strong>${money(sum("sales"))}</strong></div>
 <div class="card"><h3>Total achats</h3><strong>${money(sum("purchases"))}</strong></div>
 <div class="card"><h3>Total dépenses</h3><strong>${money(sum("expenses"))}</strong></div>
 </div>
 <div class="card" style="margin-top:16px"><h3>Résultat simplifié</h3><p>Ventes − achats − dépenses</p><strong>${money(sum("sales")-sum("purchases")-sum("expenses"))}</strong></div>
 <div class="toolbar" style="margin-top:16px"><button class="secondary" id="exportCsv">Exporter CSV</button><button class="secondary" id="backupBtn">Sauvegarder les données</button></div>`;
}
function auditPage(){
 const arr=state.db.audit_logs||[];
 return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Action</th><th>Entité</th><th>Détails</th></tr></thead><tbody>${arr.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString("fr-FR")}</td><td>${esc(x.action)}</td><td>${esc(x.entity)}</td><td>${esc(JSON.stringify(x.details||{}))}</td></tr>`).join("")||`<tr><td colspan="4"><div class="empty">Aucune action enregistrée.</div></td></tr>`}</tbody></table></div>`;
}
function settings(){
 const s=state.db.settings.find(x=>x.user_id===state.user.id)||{};
 return `<div class="card"><h3>Informations de l’entreprise</h3><form id="settingsForm" class="form-grid">
 <label>Nom<input name="company_name" value="${esc(s.company_name||"LUC BRICO-TECH")}"></label>
 <label>Adresse<input name="address" value="${esc(s.address||"Hévié Hounzévié, Abomey-Calavi")}"></label>
 <label>Téléphone<input name="phone" value="${esc(s.phone||"01 67 02 84 91")}"></label>
 <label>Email<input name="email" value="${esc(s.email||"")}"></label>
 <div class="full"><button class="primary">Enregistrer</button></div></form></div>`;
}
async function saveSettings(e){
 e.preventDefault();const f=new FormData(e.target), p=Object.fromEntries(f.entries());
 try{
  const existing=state.db.settings.find(x=>x.user_id===state.user.id);
  if(state.cloud){
   // settings est identifié de façon unique par user_id, pas par id.
   // On met donc à jour la ligne existante avec user_id pour éviter
   // l'erreur de contrainte unique settings_user_id_key.
   if(existing){
    const {data,error}=await sb.from("settings")
      .update({...p,updated_at:now()})
      .eq("user_id",state.user.id)
      .select()
      .single();
    if(error)throw error;
    const i=state.db.settings.findIndex(x=>x.user_id===state.user.id);
    if(i>=0)state.db.settings[i]=data;
   }else{
    const data=await insert("settings",p);
    if(!state.db.settings.some(x=>x.user_id===state.user.id))state.db.settings.unshift(data);
   }
  }else{
   if(existing){
    Object.assign(existing,p,{updated_at:now()});
    saveLocal();
   }else{
    await insert("settings",p);
   }
  }
  await audit("update","settings",state.user.id,p);
  toast("Paramètres enregistrés.");
  render();
 }catch(e){toast(e.message||"Impossible d'enregistrer les paramètres.")}
}

function openForm(table,id=null){
 const schema=schemas[table];if(!schema)return;
 const old=id?(state.db[table]||[]).find(x=>x.id===id):null;
 document.getElementById("modalTitle").textContent=id?"Modifier":schema.title;
 document.getElementById("recordForm").innerHTML=`<div class="form-grid">${schema.fields.map(f=>{
  const [name,label,type,req,opts]=f,v=old?.[name]??"";
  if(type==="textarea")return `<label class="full">${label}<textarea name="${name}">${esc(v)}</textarea></label>`;
  if(type==="select")return `<label>${label}<select name="${name}">${opts.map(o=>`<option ${v===o?"selected":""}>${o}</option>`).join("")}</select></label>`;
  return `<label>${label}<input name="${name}" type="${type}" value="${esc(v)}" ${req?"required":""}></label>`;
 }).join("")}<div class="full actions"><button type="button" class="secondary" id="cancelForm">Annuler</button><button class="primary">Enregistrer</button></div></div>`;
 document.getElementById("cancelForm").onclick=closeModal;
 document.getElementById("recordForm").onsubmit=async e=>{
  e.preventDefault();const p=Object.fromEntries(new FormData(e.target).entries());
  for(const f of schema.fields)if(f[2]==="number"&&p[f[0]]!=="")p[f[0]]=Number(p[f[0]]);
  try{if(id)await update(table,id,p);else await insert(table,p);await audit(id?"update":"insert",table,id||null,p);toast("Enregistré.");closeModal();render()}catch(err){toast(err.message)}
 };
 document.getElementById("modal").classList.remove("hidden");
}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
async function del(table,id){
 if(state.role!=="admin"){toast("La suppression est réservée à l’administrateur.");return}
 if(!confirm("Supprimer cet enregistrement ?"))return;
 try{await remove(table,id);await audit("delete",table,id);toast("Supprimé.");render()}catch(e){toast(e.message)}
}

document.addEventListener("click",e=>{
 if(e.target.id==="exportCsv"){const rows=state.db.sales||[];const csv=["Client,Article,Montant,Date",...rows.map(x=>`"${x.customer}","${x.item}",${x.amount},"${x.created_at}"`)].join("\n");download("ventes.csv",csv)}
 if(e.target.id==="backupBtn")download("luc-bricotech-backup.json",JSON.stringify(state.db,null,2))
});
function download(name,data){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:"text/plain"}));a.download=name;a.click();URL.revokeObjectURL(a.href)}

boot();
})();