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
 clients:{title:"Nouveau client",fields:[["full_name","Nom complet","text",true],["company_name","Entreprise","text",false],["phone","Téléphone","tel",false],["email","E-mail","email",false],["address","Adresse","text",false],["city","Ville","text",false],["notes","Notes","textarea",false]]},
 quotes:{title:"Nouveau devis",fields:[["client_id","Client","select",true,"clients"],["quote_number","Numéro du devis","text",true],["issue_date","Date d’émission","date",true],["valid_until","Valable jusqu’au","date",false],["title","Objet","text",true],["description","Description","textarea",false],["subtotal","Sous-total (FCFA)","number",true],["discount","Remise (FCFA)","number",false],["tax","Taxe (FCFA)","number",false],["total","Total (FCFA)","number",true],["status","Statut","select",false,["draft","sent","accepted","rejected","expired","converted"]],["notes","Notes","textarea",false]]},
 invoices:{title:"Nouvelle facture",fields:[["client_id","Client","select",true,"clients"],["invoice_number","Numéro de facture","text",true],["issue_date","Date d’émission","date",true],["due_date","Date d’échéance","date",false],["title","Objet","text",true],["description","Description","textarea",false],["subtotal","Sous-total (FCFA)","number",true],["discount","Remise (FCFA)","number",false],["tax","Taxe (FCFA)","number",false],["total","Total (FCFA)","number",true],["amount_paid","Montant payé (FCFA)","number",false],["status","Statut","select",false,["draft","unpaid","partial","paid","cancelled","overdue"]],["notes","Notes","textarea",false]]},
 payments:{title:"Nouveau paiement",fields:[["invoice_id","Facture","select",true,"invoices"],["amount","Montant (FCFA)","number",true],["payment_method","Mode de paiement","select",true,["cash","mobile_money","bank_transfer","card","other"]],["payment_date","Date","date",true],["reference","Référence","text",false],["notes","Notes","textarea",false]]},
 stock_items:{title:"Nouvel article de stock",fields:[["name","Article","text",true],["category","Catégorie","text",false],["unit","Unité","text",false],["quantity","Quantité","number",true],["min_quantity","Seuil minimum","number",false],["location","Emplacement","text",false]]}
};

const state={page:"dashboard",role:"admin",user:null,cloud:hasCloud,db:loadLocal()};
const TABLES=["profiles","sales","purchases","expenses","stock_items","stock_movements","activities","projects","innovations","audit_logs","settings","clients","quotes","quote_items","invoices","invoice_items","payments"];
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
 admin:["dashboard","members","clients","quotes","invoices","payments","sales","purchases","expenses","stock","activities","projects","innovations","reports","audit","settings"],
 manager:["dashboard","members","clients","quotes","invoices","payments","sales","purchases","expenses","stock","activities","projects","innovations","reports"],
 employee:["dashboard","clients","quotes","invoices","payments","sales","purchases","expenses","stock","activities","projects","innovations","reports"]
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
 const map={dashboard:["Tableau de bord","Vue générale de l’activité."],members:["Membres","Utilisateurs et rôles."],clients:["Clients","Carnet clients et coordonnées."],quotes:["Devis","Préparation et suivi des devis."],invoices:["Factures","Facturation et suivi des soldes."],payments:["Paiements","Encaissements et références."],sales:["Ventes","Suivi des ventes et encaissements."],purchases:["Achats","Achats auprès des fournisseurs."],expenses:["Dépenses","Charges et dépenses."],stock:["Stock & matériel","Articles, quantités et seuils."],activities:["Activités","Interventions et opérations réalisées."],projects:["Projets","Suivi des projets et chantiers."],innovations:["Innovations","Idées, prototypes et solutions."],reports:["Rapports","Synthèse financière et opérationnelle."],audit:["Journal","Traçabilité des actions."],settings:["Paramètres","Configuration de l’entreprise."],stockHistory:["Historique du stock","Mouvements et traçabilité du matériel."]};
 setHeader(...map[state.page]);
 const fn={dashboard:dashboard,members:members,clients:clientsPage,quotes:quotesPage,invoices:invoicesPage,payments:paymentsPage,sales:tablePage,purchases:tablePage,expenses:tablePage,stock:stock,stockHistory:stockHistory,activities:tablePage,projects:tablePage,innovations:tablePage,reports:reports,audit:auditPage,settings:settings}[state.page];
 const out=fn(state.page); document.getElementById("content").innerHTML=out;
 bindPage();
}
function bindPage(){
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>((b.dataset.add==="quotes"||b.dataset.add==="invoices")?openDocumentForm(b.dataset.add):(b.dataset.add==="payments"?openPaymentForm():openForm(b.dataset.add))));
 document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>del(b.dataset.delete,b.dataset.id));
 document.querySelectorAll("[data-role]").forEach(s=>s.onchange=()=>changeRole(s.dataset.id,s.value));
 document.querySelectorAll("[data-create-employee]").forEach(b=>b.onclick=openEmployeeForm);
 document.querySelectorAll("[data-toggle-active]").forEach(s=>s.onchange=()=>toggleMember(s.dataset.id,s.checked));
 document.querySelectorAll("[data-edit-stock]").forEach(b=>b.onclick=()=>openForm("stock_items",b.dataset.editStock));
 document.querySelectorAll("[data-edit-client]").forEach(b=>b.onclick=()=>openForm("clients",b.dataset.editClient));
 document.querySelectorAll("[data-edit-quote]").forEach(b=>b.onclick=()=>openDocumentForm("quotes",b.dataset.editQuote));
 document.querySelectorAll("[data-edit-invoice]").forEach(b=>b.onclick=()=>openDocumentForm("invoices",b.dataset.editInvoice));
 document.querySelectorAll("[data-view-document]").forEach(b=>b.onclick=()=>openDocumentForm(b.dataset.viewDocument,b.dataset.id));
 document.querySelectorAll("[data-stock-move]").forEach(b=>b.onclick=()=>stockMovementForm(b.dataset.stockMove));
 document.getElementById("stockHistoryBtn")?.addEventListener("click",()=>{state.page="stockHistory";render();});
 document.getElementById("backToStock")?.addEventListener("click",()=>{state.page="stock";render();});
 document.getElementById("settingsForm")?.addEventListener("submit",saveSettings);
}

function clientName(id){const c=(state.db.clients||[]).find(x=>x.id===id);return c?.company_name||c?.full_name||"Client inconnu"}
function invoiceNumber(id){const x=(state.db.invoices||[]).find(i=>i.id===id);return x?.invoice_number||"Facture"}
function clientsPage(){
 const arr=state.db.clients||[];
 const rows=arr.map(x=>`<tr><td><b>${esc(x.full_name)}</b>${x.company_name?`<br><span class="muted">${esc(x.company_name)}</span>`:""}</td><td>${esc(x.phone||"—")}</td><td>${esc(x.email||"—")}</td><td>${esc(x.city||"—")}</td><td><button class="secondary" data-edit-client="${x.id}">Modifier</button> ${state.role==="admin"?`<button class="danger" data-delete="clients" data-id="${x.id}">Supprimer</button>`:""}</td></tr>`).join("");
 return `<div class="toolbar"><div class="muted"><b>${arr.length}</b> client(s)</div><button class="primary" data-add="clients">+ Nouveau client</button></div><div class="table-wrap"><table><thead><tr><th>Client</th><th>Téléphone</th><th>E-mail</th><th>Ville</th><th>Actions</th></tr></thead><tbody>${rows||`<tr><td colspan="5"><div class="empty">Aucun client enregistré.</div></td></tr>`}</tbody></table></div>`;
}
function documentLines(table,id){
 const lineTable=table==="quotes"?"quote_items":"invoice_items";
 const key=table==="quotes"?"quote_id":"invoice_id";
 return (state.db[lineTable]||[]).filter(x=>x[key]===id);
}
function linesSummary(table,id){
 const lines=documentLines(table,id);
 return lines.length?`${lines.length} ligne${lines.length>1?"s":""}`:"Aucune ligne";
}
function quotesPage(){
 const arr=state.db.quotes||[];
 const rows=arr.map(x=>`<tr><td><b>${esc(x.quote_number||"—")}</b><br><span class="muted">${esc(x.title||"")}</span></td><td>${esc(clientName(x.client_id))}</td><td>${esc(x.issue_date||"—")}</td><td>${linesSummary("quotes",x.id)}</td><td>${money(x.total)}</td><td><span class="badge">${esc(x.status||"draft")}</span></td><td><button class="secondary" data-view-document="quotes" data-id="${x.id}">Détails</button> <button class="secondary" data-edit-quote="${x.id}">Modifier</button> ${state.role==="admin"?`<button class="danger" data-delete="quotes" data-id="${x.id}">Supprimer</button>`:""}</td></tr>`).join("");
 return `<div class="toolbar"><div class="muted"><b>${arr.length}</b> devis</div><button class="primary" data-add="quotes">+ Nouveau devis</button></div><div class="table-wrap"><table><thead><tr><th>Devis</th><th>Client</th><th>Date</th><th>Lignes</th><th>Total</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${rows||`<tr><td colspan="7"><div class="empty">Aucun devis.</div></td></tr>`}</tbody></table></div>`;
}
function invoicesPage(){
 const arr=state.db.invoices||[];
 const rows=arr.map(x=>`<tr><td><b>${esc(x.invoice_number||"—")}</b><br><span class="muted">${esc(x.title||"")}</span></td><td>${esc(clientName(x.client_id))}</td><td>${esc(x.issue_date||"—")}</td><td>${linesSummary("invoices",x.id)}</td><td>${money(x.total)}</td><td>${money(x.amount_paid||0)}</td><td>${money(Math.max(0,Number(x.total||0)-Number(x.amount_paid||0)))}</td><td><span class="badge">${esc(x.status||"unpaid")}</span></td><td><button class="secondary" data-view-document="invoices" data-id="${x.id}">Détails</button> <button class="secondary" data-edit-invoice="${x.id}">Modifier</button> ${state.role==="admin"?`<button class="danger" data-delete="invoices" data-id="${x.id}">Supprimer</button>`:""}</td></tr>`).join("");
 return `<div class="toolbar"><div class="muted"><b>${arr.length}</b> facture(s)</div><button class="primary" data-add="invoices">+ Nouvelle facture</button></div><div class="table-wrap"><table><thead><tr><th>Facture</th><th>Client</th><th>Date</th><th>Lignes</th><th>Total</th><th>Payé</th><th>Reste</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${rows||`<tr><td colspan="9"><div class="empty">Aucune facture.</div></td></tr>`}</tbody></table></div>`;
}
function paymentLabel(x){
 const map={cash:"Espèces",mobile_money:"Mobile Money",bank_transfer:"Virement bancaire",card:"Carte bancaire",check:"Chèque",other:"Autre"};
 const base=map[x.payment_method]||x.payment_method||"—";
 if(x.payment_method==="mobile_money" && x.payment_network)return `${base} — ${x.payment_network}`;
 if(x.payment_method==="bank_transfer" && x.bank_name)return `${base} — ${x.bank_name}`;
 return base;
}
function paymentsPage(){
 const arr=state.db.payments||[];
 const rows=arr.map(x=>`<tr><td>${esc(invoiceNumber(x.invoice_id))}</td><td>${money(x.amount)}</td><td>${esc(paymentLabel(x))}</td><td>${esc(x.payment_date||"—")}</td><td>${esc(x.reference||"—")}</td><td>${state.role==="admin"?`<button class="danger" data-delete="payments" data-id="${x.id}">Supprimer</button>`:"—"}</td></tr>`).join("");
 const total=arr.reduce((a,x)=>a+Number(x.amount||0),0);
 return `<div class="grid cards"><div class="card kpi"><small>Total encaissé</small><strong>${money(total)}</strong></div><div class="card kpi"><small>Paiements enregistrés</small><strong>${arr.length}</strong></div></div><div class="toolbar" style="margin-top:16px"><div class="muted">Historique des encaissements</div><button class="primary" data-add="payments">+ Enregistrer un paiement</button></div><div class="table-wrap"><table><thead><tr><th>Facture</th><th>Montant</th><th>Mode / réseau</th><th>Date</th><th>Référence</th><th>Action</th></tr></thead><tbody>${rows||`<tr><td colspan="6"><div class="empty">Aucun paiement.</div></td></tr>`}</tbody></table></div>`;
}
function openPaymentForm(id=null){
 const old=id?(state.db.payments||[]).find(x=>x.id===id):null;
 const invoices=(state.db.invoices||[]);
 document.getElementById("modalTitle").textContent=id?"Modifier le paiement":"Enregistrer un paiement";
 document.getElementById("recordForm").innerHTML=`<div class="form-grid">
 <label class="full">Facture<select name="invoice_id" required>${invoices.map(o=>`<option value="${esc(o.id)}" ${old?.invoice_id===o.id?"selected":""}>${esc(o.invoice_number||"Facture")} — ${esc(clientName(o.client_id))} — ${money(o.total)}</option>`).join("")}</select></label>
 <label>Montant payé (FCFA)<input name="amount" type="number" min="1" step="1" required value="${esc(old?.amount??"")}"></label>
 <label>Date du paiement<input name="payment_date" type="date" required value="${esc(old?.payment_date||new Date().toISOString().slice(0,10))}"></label>
 <label>Mode de paiement<select name="payment_method" id="paymentMethod" required><option value="cash">Espèces</option><option value="mobile_money">Mobile Money</option><option value="bank_transfer">Virement bancaire</option><option value="card">Carte bancaire</option><option value="check">Chèque bancaire</option><option value="other">Autre</option></select></label>
 <label id="paymentNetworkWrap" style="display:none">Réseau Mobile Money<select name="payment_network" id="paymentNetwork"><option value="">Choisir</option><option value="MTN MoMo">MTN MoMo</option><option value="Moov Money">Moov Money</option><option value="Celtiis Cash">Celtiis Cash</option></select></label>
 <label id="bankNameWrap" style="display:none">Banque<input name="bank_name" type="text" placeholder="Nom de la banque" value="${esc(old?.bank_name||"")}"></label>
 <label>Référence / N° transaction<input name="reference" type="text" placeholder="Référence du paiement" value="${esc(old?.reference||"")}"></label>
 <label class="full">Notes<textarea name="notes">${esc(old?.notes||"")}</textarea></label>
 <div class="full hint">Une facture peut recevoir plusieurs paiements. Les paiements mixtes sont donc possibles.</div>
 <div class="full actions"><button type="button" class="secondary" id="cancelForm">Annuler</button><button class="primary">Enregistrer le paiement</button></div></div>`;
 const method=document.getElementById("paymentMethod"), net=document.getElementById("paymentNetworkWrap"), bank=document.getElementById("bankNameWrap");
 function refresh(){net.style.display=method.value==="mobile_money"?"block":"none";bank.style.display=method.value==="bank_transfer"?"block":"none";}
 method.value=old?.payment_method||"cash"; if(old?.payment_network)document.getElementById("paymentNetwork").value=old.payment_network; refresh(); method.onchange=refresh;
 document.getElementById("cancelForm").onclick=closeModal;
 document.getElementById("recordForm").onsubmit=async e=>{
  e.preventDefault(); const p=Object.fromEntries(new FormData(e.target).entries()); p.amount=Number(p.amount||0);
  if(p.payment_method!=="mobile_money")p.payment_network="";
  if(p.payment_method!=="bank_transfer")p.bank_name="";
  try{
   if(id){ const previous=(state.db.payments||[]).find(x=>x.id===id); await update("payments",id,p); if(previous?.invoice_id && previous.invoice_id!==p.invoice_id)await recalcInvoicePaid(previous.invoice_id); await recalcInvoicePaid(p.invoice_id); }
   else { const saved=await insert("payments",p); await recalcInvoicePaid(saved.invoice_id); }
   await audit(id?"update":"insert","payments",id||null,p); toast("Paiement enregistré."); closeModal(); render();
  }catch(err){console.error(err);toast(err.message||"Erreur lors de l’enregistrement.");}
 };
 document.getElementById("modal").classList.remove("hidden");
}
async function recalcInvoicePaid(invoiceId){
 const inv=(state.db.invoices||[]).find(x=>x.id===invoiceId); if(!inv)return;
 const paid=(state.db.payments||[]).filter(x=>x.invoice_id===invoiceId).reduce((a,x)=>a+Number(x.amount||0),0);
 const total=Number(inv.total||0); const status=paid>=total&&total>0?"paid":paid>0?"partial":"unpaid";
 await update("invoices",invoiceId,{amount_paid:paid,status});
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
 const rows=arr.map(x=>{
  const manage=canManageStock();
  const actions=`<div class="actions-inline">
    <button class="secondary" data-stock-move="${x.id}">Mouvement</button>
    ${manage?`<button class="secondary" data-edit-stock="${x.id}">Modifier</button>`:""}
    ${state.role==="admin"?`<button class="danger" data-delete="stock_items" data-id="${x.id}">Supprimer</button>`:""}
  </div>`;
  return `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.category)}</td><td>${Number(x.quantity||0)} ${esc(x.unit||"")}</td><td>${Number(x.min_quantity||0)}</td><td>${esc(x.location)}</td><td>${Number(x.quantity)<=Number(x.min_quantity)?'<span class="badge warn">Stock faible</span>':'<span class="badge success">OK</span>'}</td><td>${actions}</td></tr>`;
 }).join("");
 const add=canManageStock()?`<button class="primary" data-add="stock_items">+ Ajouter un article</button>`:"";
 return `<div class="toolbar"><div><b>${arr.length}</b> article(s) · <span class="muted">Les mouvements mettent automatiquement les quantités à jour.</span></div><div class="actions-inline">${add}<button class="secondary" id="stockHistoryBtn">Historique des mouvements</button></div></div>
 <div class="table-wrap"><table><thead><tr><th>Article</th><th>Catégorie</th><th>Quantité</th><th>Seuil</th><th>Lieu</th><th>État</th><th>Actions</th></tr></thead><tbody>${rows||`<tr><td colspan="7"><div class="empty">Stock vide.</div></td></tr>`}</tbody></table></div>`;
}

function stockMovementForm(stockId){
 const item=(state.db.stock_items||[]).find(x=>x.id===stockId);
 if(!item)return toast("Article de stock introuvable.");
 const isEmployee=state.role==="employee";
 const projects=state.db.projects||[];
 const activities=state.db.activities||[];
 const members=(state.db.profiles||[]).filter(x=>x.active!==false);
 const typeOptions=isEmployee?["use","return"]:["entry","exit","use","return","adjustment"];
 document.getElementById("modalTitle").textContent=`Mouvement — ${item.name}`;
 document.getElementById("recordForm").innerHTML=`<div class="form-grid">
 <div class="full hint"><b>Stock actuel :</b> ${Number(item.quantity||0)} ${esc(item.unit||"")}</div>
 <label>Type de mouvement<select name="movement_type">${typeOptions.map(v=>`<option value="${v}">${movementLabel(v)}</option>`).join("")}</select></label>
 <label>Quantité<input name="quantity" type="number" min="0.01" step="0.01" required></label>
 <label>Projet<select name="project_id"><option value="">— Aucun —</option>${projects.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></label>
 <label>Activité<select name="activity_id"><option value="">— Aucune —</option>${activities.map(x=>`<option value="${x.id}">${esc(x.title)}</option>`).join("")}</select></label>
 ${isEmployee?`<input type="hidden" name="employee_id" value="${esc(state.user.id)}">`:`<label>Responsable<select name="employee_id"><option value="">— Non précisé —</option>${members.map(x=>`<option value="${x.id}">${esc(x.full_name||x.email||"Utilisateur")}</option>`).join("")}</select></label>`}
 <label class="full">Motif<textarea name="reason" placeholder="Pourquoi ce mouvement ?"></textarea></label>
 <label class="full">Notes<textarea name="notes" placeholder="Précisions complémentaires"></textarea></label>
 <div class="full actions"><button type="button" class="secondary" id="cancelForm">Annuler</button><button class="primary">Enregistrer le mouvement</button></div></div>`;
 document.getElementById("cancelForm").onclick=closeModal;
 document.getElementById("recordForm").onsubmit=async e=>{
  e.preventDefault();
  const p=Object.fromEntries(new FormData(e.target).entries());
  const qty=Number(p.quantity);
  if(!Number.isFinite(qty)||qty<=0)return toast("La quantité doit être supérieure à zéro.");
  try{
   if(!state.cloud){
    const current=Number(item.quantity||0);
    let next=current;
    if(["entry","return"].includes(p.movement_type))next=current+qty;
    else if(["exit","use"].includes(p.movement_type)){if(current<qty)throw new Error("Stock insuffisant.");next=current-qty;}
    else next=qty;
    item.quantity=next;
    item.updated_at=now();
    const movement={id:uid(),stock_item_id:item.id,user_id:state.user.id,movement_type:p.movement_type,quantity:qty,reason:p.reason||null,project_id:p.project_id||null,activity_id:p.activity_id||null,employee_id:p.employee_id||null,notes:p.notes||null,created_at:now()};
    state.db.stock_movements.unshift(movement);
    saveLocal();
    await audit("stock_movement","stock_movements",movement.id,{stock_item_id:item.id,movement_type:p.movement_type,quantity:qty});
   }else{
    const {data,error}=await sb.rpc("create_stock_movement",{
      p_stock_item_id:item.id,
      p_movement_type:p.movement_type,
      p_quantity:qty,
      p_reason:p.reason||null,
      p_project_id:p.project_id||null,
      p_activity_id:p.activity_id||null,
      p_employee_id:p.employee_id||null,
      p_notes:p.notes||null
    });
    if(error)throw error;
    await syncCloud();
    await audit("stock_movement","stock_movements",data,{stock_item_id:item.id,movement_type:p.movement_type,quantity:qty});
   }
   closeModal();render();toast("Mouvement enregistré. Stock mis à jour.");
  }catch(err){console.error(err);toast(err.message||"Erreur lors du mouvement.");}
 };
 document.getElementById("modal").classList.remove("hidden");
}

function movementLabel(v){
 return ({entry:"Entrée en stock",exit:"Sortie de stock",use:"Utilisation",return:"Retour matériel",adjustment:"Ajustement"})[v]||v;
}

function stockHistory(){
 const arr=state.db.stock_movements||[];
 const names=Object.fromEntries((state.db.stock_items||[]).map(x=>[x.id,x.name]));
 const people=Object.fromEntries((state.db.profiles||[]).map(x=>[x.id,x.full_name||x.email||"Utilisateur"]));
 const projects=Object.fromEntries((state.db.projects||[]).map(x=>[x.id,x.name]));
 const activities=Object.fromEntries((state.db.activities||[]).map(x=>[x.id,x.title]));
 const rows=arr.map(x=>`<tr><td>${x.created_at?new Date(x.created_at).toLocaleString("fr-FR"):""}</td><td><b>${esc(names[x.stock_item_id]||"Article supprimé")}</b></td><td>${movementLabel(x.movement_type)}</td><td>${x.quantity}</td><td>${esc(people[x.employee_id]||"—")}</td><td>${esc(projects[x.project_id]||"—")}</td><td>${esc(activities[x.activity_id]||"—")}</td><td>${esc(x.reason||"—")}</td></tr>`).join("");
 return `<div class="toolbar"><div><b>${arr.length}</b> mouvement(s)</div><button class="secondary" id="backToStock">← Retour au stock</button></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Article</th><th>Type</th><th>Qté</th><th>Responsable</th><th>Projet</th><th>Activité</th><th>Motif</th></tr></thead><tbody>${rows||`<tr><td colspan="8"><div class="empty">Aucun mouvement enregistré.</div></td></tr>`}</tbody></table></div>`;
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
 const sum=t=>(state.db[t]||[]).reduce((a,x)=>a+Number(x.amount||0),0);
 const sales=sum("sales"), purchases=sum("purchases"), expenses=sum("expenses");
 return `<div class="grid cards"><div class="card"><h3>Chiffre des ventes</h3><strong>${money(sales)}</strong></div><div class="card"><h3>Total achats</h3><strong>${money(purchases)}</strong></div><div class="card"><h3>Total dépenses</h3><strong>${money(expenses)}</strong></div></div><div class="card" style="margin-top:16px"><h3>Résultat simplifié</h3><p>Ventes − achats − dépenses</p><strong>${money(sales-purchases-expenses)}</strong></div><div class="toolbar" style="margin-top:16px"><button class="secondary" id="exportSalesCsv">Exporter les ventes CSV</button><button class="secondary" id="exportAllCsv">Exporter tout en CSV</button><button class="secondary" id="backupBtn">Sauvegarder toutes les données</button></div>`;
}

function auditPage(){
 if(state.role!=="admin")return `<div class="card"><h3>Accès réservé</h3><p class="muted">Le journal des actions est réservé à l’administrateur.</p></div>`;
 const arr=state.db.audit_logs||[];
 return `<div class="toolbar"><div class="muted">${arr.length} action(s) enregistrée(s)</div><button class="secondary" id="exportAuditCsv">Exporter le journal CSV</button></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Action</th><th>Entité</th><th>Détails</th></tr></thead><tbody>${arr.map(x=>`<tr><td>${x.created_at?new Date(x.created_at).toLocaleString("fr-FR"):""}</td><td>${esc(x.action)}</td><td>${esc(x.entity)}</td><td>${esc(safeJson(x.details||{}))}</td></tr>`).join("")||`<tr><td colspan="4"><div class="empty">Aucune action enregistrée.</div></td></tr>`}</tbody></table></div>`;
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
 e.preventDefault();
 const f=new FormData(e.target), p=Object.fromEntries(f.entries());
 try{
  if(!state.cloud){
   const arr=state.db.settings||[];
   const existing=arr.find(x=>x.user_id===state.user.id);
   if(existing) Object.assign(existing,p,{updated_at:now()});
   else arr.unshift({id:uid(),user_id:state.user.id,created_at:now(),updated_at:now(),...p});
   state.db.settings=arr;
   saveLocal();
  }else{
   const {data,error}=await sb.from("settings")
     .upsert({user_id:state.user.id,...p,updated_at:now()},{onConflict:"user_id"})
     .select()
     .single();
   if(error)throw error;
   const arr=state.db.settings||[];
   const i=arr.findIndex(x=>x.user_id===state.user.id);
   if(i>=0)arr[i]=data; else arr.unshift(data);
   state.db.settings=arr;
  }
  await audit("update","settings",state.user.id,p);
  toast("Paramètres enregistrés.");
  render();
 }catch(err){console.error(err);toast(err.message||"Erreur lors de l’enregistrement.")}
}

function openForm(table,id=null){
 const schema=schemas[table];if(!schema)return;
 const old=id?(state.db[table]||[]).find(x=>x.id===id):null;
 document.getElementById("modalTitle").textContent=id?"Modifier":schema.title;
 document.getElementById("recordForm").innerHTML=`<div class="form-grid">${schema.fields.map(f=>{
  const [name,label,type,req,opts]=f,v=old?.[name]??"";
  if(type==="textarea")return `<label class="full">${label}<textarea name="${name}">${esc(v)}</textarea></label>`;
  if(type==="select"){let options=opts;if(opts==="clients")options=(state.db.clients||[]).map(o=>o.id+"|"+(o.company_name||o.full_name||"Client"));if(opts==="invoices")options=(state.db.invoices||[]).map(o=>o.id+"|"+(o.invoice_number||"Facture"));return `<label>${label}<select name="${name}">${options.map(o=>{const [val,...rest]=String(o).split("|");return `<option value="${esc(val)}" ${v===val?"selected":""}>${esc(rest.join("|"))}</option>`}).join("")}</select></label>`;}
  return `<label>${label}<input name="${name}" type="${type}" value="${esc(v)}" ${req?"required":""}></label>`;
 }).join("")}<div class="full actions"><button type="button" class="secondary" id="cancelForm">Annuler</button><button class="primary">Enregistrer</button></div></div>`;
 document.getElementById("cancelForm").onclick=closeModal;
 document.getElementById("recordForm").onsubmit=async e=>{
  e.preventDefault();const p=Object.fromEntries(new FormData(e.target).entries());
  for(const f of schema.fields)if(f[2]==="number"&&p[f[0]]!=="")p[f[0]]=Number(p[f[0]]);
  if(table==="quotes")p.total=Math.max(0,Number(p.subtotal||0)-Number(p.discount||0)+Number(p.tax||0));
  if(table==="invoices"){p.total=Math.max(0,Number(p.subtotal||0)-Number(p.discount||0)+Number(p.tax||0));p.amount_paid=Number(p.amount_paid||0);if(p.amount_paid>=p.total&&p.total>0)p.status="paid";else if(p.amount_paid>0)p.status="partial";else if(p.status==="paid"||p.status==="partial")p.status="unpaid";}
  
  try{if(id)await update(table,id,p);else await insert(table,p);await audit(id?"update":"insert",table,id||null,p);toast("Enregistré.");closeModal();render()}catch(err){toast(err.message)}
 };
 document.getElementById("modal").classList.remove("hidden");
}
let documentLineDraft=[];
let documentLineTable="";
let documentLineParentId=null;

function lineAmount(line){return Math.max(0,Number(line.quantity||0)*Number(line.unit_price||0));}
function documentLinesEditor(){
 return `<div class="full document-lines-box">
   <div class="document-lines-head"><div><h3>Lignes détaillées</h3><span class="muted">Ajoutez les produits, matériaux, services et main-d'œuvre.</span></div><button type="button" class="secondary" id="addDocumentLine">+ Ajouter une ligne</button></div>
   <div class="document-lines-table-wrap"><table class="document-lines-table"><thead><tr><th>Désignation</th><th>Description</th><th>Qté</th><th>Unité</th><th>Prix unitaire</th><th>Total</th><th></th></tr></thead><tbody id="documentLinesBody"></tbody></table></div>
   <div class="document-totals"><div><span>Sous-total</span><strong id="documentSubtotal">0 FCFA</strong></div><div><span>Remise</span><strong id="documentDiscount">0 FCFA</strong></div><div><span>Taxe</span><strong id="documentTax">0 FCFA</strong></div><div class="grand"><span>Total</span><strong id="documentGrandTotal">0 FCFA</strong></div></div>
 </div>`;
}
function renderDocumentLines(){
 const body=document.getElementById("documentLinesBody"); if(!body)return;
 body.innerHTML=documentLineDraft.map((line,i)=>`<tr>
  <td><input data-line="description" data-index="${i}" value="${esc(line.description)}" placeholder="Ex. Câble électrique"></td>
  <td><input data-line="details" data-index="${i}" value="${esc(line.details||"")}" placeholder="Optionnel"></td>
  <td><input data-line="quantity" data-index="${i}" type="number" min="0" step="0.01" value="${esc(line.quantity)}"></td>
  <td><select data-line="unit" data-index="${i}">${["pièce","m","kg","h","forfait","lot","service"].map(u=>`<option ${line.unit===u?"selected":""}>${u}</option>`).join("")}</select></td>
  <td><input data-line="unit_price" data-index="${i}" type="number" min="0" step="1" value="${esc(line.unit_price)}"></td>
  <td><strong data-line-total="${i}">${money(lineAmount(line))}</strong></td>
  <td><button type="button" class="danger ghost" data-remove-line="${i}">✕</button></td>
 </tr>`).join("");
 document.querySelectorAll("[data-line]").forEach(el=>el.oninput=()=>{const i=Number(el.dataset.index);documentLineDraft[i][el.dataset.line]=el.type==="number"?Number(el.value||0):el.value;updateDocumentTotals();});
 document.querySelectorAll("[data-remove-line]").forEach(b=>b.onclick=()=>{documentLineDraft.splice(Number(b.dataset.removeLine),1);if(!documentLineDraft.length)documentLineDraft.push({description:"",details:"",quantity:1,unit:"pièce",unit_price:0});renderDocumentLines();});
 updateDocumentTotals();
}
function updateDocumentTotals(){
 const subtotal=documentLineDraft.reduce((a,l)=>a+lineAmount(l),0);
 const discount=Number(document.querySelector('[name="discount"]')?.value||0);
 const tax=Number(document.querySelector('[name="tax"]')?.value||0);
 const total=Math.max(0,subtotal-discount+tax);
 const s=document.querySelector('[name="subtotal"]');const t=document.querySelector('[name="total"]');
 if(s)s.value=Math.round(subtotal); if(t)t.value=Math.round(total);
 document.getElementById("documentSubtotal")?.replaceChildren(document.createTextNode(money(subtotal)));
 document.getElementById("documentDiscount")?.replaceChildren(document.createTextNode(money(discount)));
 document.getElementById("documentTax")?.replaceChildren(document.createTextNode(money(tax)));
 document.getElementById("documentGrandTotal")?.replaceChildren(document.createTextNode(money(total)));
 documentLineDraft.forEach((l,i)=>document.querySelector(`[data-line-total="${i}"]`)?.replaceChildren(document.createTextNode(money(lineAmount(l)))));
}
async function saveDocumentLines(table,parentId){
 const lineTable=table==="quotes"?"quote_items":"invoice_items";
 const key=table==="quotes"?"quote_id":"invoice_id";
 if(state.cloud){
   const {error:delError}=await sb.from(lineTable).delete().eq(key,parentId); if(delError)throw delError;
   const rows=documentLineDraft.filter(l=>String(l.description||"").trim()).map(l=>({[key]:parentId,description:String(l.description).trim(),quantity:Number(l.quantity||0),unit:l.unit||"pièce",unit_price:Number(l.unit_price||0),amount:lineAmount(l)}));
   if(rows.length){const {data,error}=await sb.from(lineTable).insert(rows).select();if(error)throw error;state.db[lineTable]=(state.db[lineTable]||[]).filter(x=>x[key]!==parentId).concat(data||[]);}
 }else{
   state.db[lineTable]=(state.db[lineTable]||[]).filter(x=>x[key]!==parentId);
   documentLineDraft.filter(l=>String(l.description||"").trim()).forEach(l=>state.db[lineTable].push({id:uid(),[key]:parentId,description:String(l.description).trim(),quantity:Number(l.quantity||0),unit:l.unit||"pièce",unit_price:Number(l.unit_price||0),amount:lineAmount(l),details:l.details||"",created_at:now()}));
   saveLocal();
 }
}
function openDocumentForm(table,id=null){
 const schema=schemas[table]; if(!schema)return;
 const old=id?(state.db[table]||[]).find(x=>x.id===id):null;
 documentLineTable=table;documentLineParentId=id;documentLineDraft=id?documentLines(table,id).map(x=>({description:x.description||"",details:x.details||"",quantity:Number(x.quantity||1),unit:x.unit||"pièce",unit_price:Number(x.unit_price||0)})):[{description:"",details:"",quantity:1,unit:"pièce",unit_price:0}];
 document.getElementById("modalTitle").textContent=id?`Modifier ${table==="quotes"?"le devis":"la facture"}`:`Nouveau ${table==="quotes"?"devis":"facture"}`;
 const normalFields=schema.fields.filter(f=>!["subtotal","total"].includes(f[0]));
 document.getElementById("recordForm").innerHTML=`<div class="form-grid">${normalFields.map(f=>{const [name,label,type,req,opts]=f,v=old?.[name]??(name==="issue_date"?new Date().toISOString().slice(0,10):"");if(type==="textarea")return `<label class="full">${label}<textarea name="${name}">${esc(v)}</textarea></label>`;if(type==="select"){let options=opts;if(opts==="clients")options=(state.db.clients||[]).map(o=>o.id+"|"+(o.company_name||o.full_name||"Client"));return `<label>${label}<select name="${name}">${options.map(o=>{const [val,...rest]=String(o).split("|");return `<option value="${esc(val)}" ${v===val?"selected":""}>${esc(rest.join("|"))}</option>`}).join("")}</select></label>`;}return `<label>${label}<input name="${name}" type="${type}" value="${esc(v)}" ${req?"required":""}></label>`;}).join("")}
 <label>Remise (FCFA)<input name="discount" type="number" min="0" value="${esc(old?.discount??0)}"></label>
 <label>Taxe (FCFA)<input name="tax" type="number" min="0" value="${esc(old?.tax??0)}"></label>
 ${table==="invoices"?`<label>Montant déjà payé (FCFA)<input name="amount_paid" type="number" min="0" value="${esc(old?.amount_paid??0)}"></label>`:""}
 ${documentLinesEditor()}
 <label class="full">Notes<textarea name="notes">${esc(old?.notes||"")}</textarea></label>
 <div class="full actions"><button type="button" class="secondary" id="cancelForm">Annuler</button><button class="primary">Enregistrer le ${table==="quotes"?"devis":"la facture"}</button></div></div>`;
 document.getElementById("cancelForm").onclick=closeModal;
 document.getElementById("addDocumentLine").onclick=()=>{documentLineDraft.push({description:"",details:"",quantity:1,unit:"pièce",unit_price:0});renderDocumentLines();};
 document.querySelector('[name="discount"]')?.addEventListener("input",updateDocumentTotals);document.querySelector('[name="tax"]')?.addEventListener("input",updateDocumentTotals);
 renderDocumentLines();
 document.getElementById("recordForm").onsubmit=async e=>{e.preventDefault();const p=Object.fromEntries(new FormData(e.target).entries());p.subtotal=Math.round(documentLineDraft.reduce((a,l)=>a+lineAmount(l),0));p.discount=Number(p.discount||0);p.tax=Number(p.tax||0);p.total=Math.max(0,p.subtotal-p.discount+p.tax);if(table==="invoices"){p.amount_paid=Number(p.amount_paid||0);p.status=p.amount_paid>=p.total&&p.total>0?"paid":p.amount_paid>0?"partial":(p.status||"unpaid");}
 try{let saved;if(id){await update(table,id,p);saved=(state.db[table]||[]).find(x=>x.id===id);}else{saved=await insert(table,p);}await saveDocumentLines(table,saved.id);await audit(id?"update":"insert",table,saved.id,{...p,lines:documentLineDraft});toast("Document et lignes enregistrés.");closeModal();render();}catch(err){console.error(err);toast(err.message||"Erreur lors de l’enregistrement.");}};
 document.getElementById("modal").classList.remove("hidden");
}

function closeModal(){document.getElementById("modal").classList.add("hidden")}
async function del(table,id){
 if(state.role!=="admin"){toast("La suppression est réservée à l’administrateur.");return}
 if(!confirm("Supprimer cet enregistrement ?"))return;
 try{const before=table==="payments"?(state.db.payments||[]).find(x=>x.id===id):null;await remove(table,id);if(before?.invoice_id)await recalcInvoicePaid(before.invoice_id);await audit("delete",table,id);toast("Supprimé.");render()}catch(e){toast(e.message)}
}

function safeJson(value){try{return JSON.stringify(value);}catch{return String(value??"");}}
function csvCell(value){let text=value==null?"":(typeof value==="object"?safeJson(value):String(value));if(/^[=+\-@]/.test(text))text="'"+text;return `"${text.replace(/"/g,'""')}"`;}
function rowsToCsv(headers,rows){return [headers.map(csvCell).join(","),...rows.map(r=>headers.map(h=>csvCell(r[h])).join(","))].join("\r\n");}
function exportSalesCsv(){const rows=(state.db.sales||[]).map(x=>({Client:x.customer||"",Article:x.item||"",Quantité:x.quantity??"",Montant:x.amount??0,Paiement:x.payment_method||"",Statut:x.status||"",Notes:x.notes||"",Date:x.created_at||""}));downloadFile("luc-bricotech-ventes.csv",rowsToCsv(["Client","Article","Quantité","Montant","Paiement","Statut","Notes","Date"],rows),"text/csv;charset=utf-8");}
function exportAllCsv(){const sections=[];const add=(title,table,headers,map)=>{sections.push(`### ${title}`);sections.push(headers.map(csvCell).join(","));(state.db[table]||[]).forEach(x=>{const r=map(x);sections.push(headers.map(h=>csvCell(r[h])).join(","));});sections.push("");};add("Ventes","sales",["Client","Article","Quantité","Montant","Paiement","Statut","Notes","Date"],x=>({Client:x.customer||"",Article:x.item||"",Quantité:x.quantity??"",Montant:x.amount??0,Paiement:x.payment_method||"",Statut:x.status||"",Notes:x.notes||"",Date:x.created_at||""}));add("Achats","purchases",["Fournisseur","Article","Quantité","Montant","Statut","Notes","Date"],x=>({Fournisseur:x.supplier||"",Article:x.item||"",Quantité:x.quantity??"",Montant:x.amount??0,Statut:x.status||"",Notes:x.notes||"",Date:x.created_at||""}));add("Dépenses","expenses",["Catégorie","Libellé","Montant","Bénéficiaire","Notes","Date"],x=>({Catégorie:x.category||"",Libellé:x.label||"",Montant:x.amount??0,Bénéficiaire:x.beneficiary||"",Notes:x.notes||"",Date:x.created_at||""}));add("Activités","activities",["Titre","Catégorie","Description","Lieu","Statut","Montant","Date"],x=>({Titre:x.title||"",Catégorie:x.category||"",Description:x.description||"",Lieu:x.location||"",Statut:x.status||"",Montant:x.amount??0,Date:x.created_at||""}));add("Projets","projects",["Nom","Client","Description","Statut","Progression","Budget","Date"],x=>({Nom:x.name||"",Client:x.client||"",Description:x.description||"",Statut:x.status||"",Progression:x.progress??"",Budget:x.budget??0,Date:x.created_at||""}));add("Innovations","innovations",["Titre","Description","Étape","Budget","Progression","Date"],x=>({Titre:x.title||"",Description:x.description||"",Étape:x.stage||"",Budget:x.budget??0,Progression:x.progress??"",Date:x.created_at||""}));add("Stock","stock_items",["Article","Catégorie","Unité","Quantité","Seuil minimum","Emplacement","Date"],x=>({Article:x.name||"",Catégorie:x.category||"",Unité:x.unit||"",Quantité:x.quantity??"","Seuil minimum":x.min_quantity??"",Emplacement:x.location||"",Date:x.created_at||""}));downloadFile("luc-bricotech-export-complet.csv",sections.join("\\r\\n"),"text/csv;charset=utf-8");}
function exportAuditCsv(){if(state.role!=="admin")return toast("Export du journal réservé à l’administrateur.");const rows=(state.db.audit_logs||[]).map(x=>({Date:x.created_at||"",Action:x.action||"",Entité:x.entity||"","ID entité":x.entity_id||"",Détails:safeJson(x.details||{})}));downloadFile("luc-bricotech-journal.csv",rowsToCsv(["Date","Action","Entité","ID entité","Détails"],rows),"text/csv;charset=utf-8");}
function backupAllData(){downloadFile("luc-bricotech-backup.json",JSON.stringify({application:"LUC BRICO-TECH",exported_at:now(),role:state.role,user_id:state.user?.id||null,data:state.db},null,2),"application/json;charset=utf-8");}
function downloadFile(name,data,mime="text/plain;charset=utf-8"){try{const blob=new Blob([data],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.style.display="none";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`Export terminé : ${name}`);}catch(error){console.error("Erreur export :",error);toast("Erreur pendant la génération du fichier.");}}
document.addEventListener("click",e=>{const button=e.target.closest?.("#exportSalesCsv, #exportAllCsv, #exportAuditCsv, #backupBtn");if(!button)return;if(button.id==="exportSalesCsv")exportSalesCsv();else if(button.id==="exportAllCsv")exportAllCsv();else if(button.id==="exportAuditCsv")exportAuditCsv();else if(button.id==="backupBtn")backupAllData();});

boot();
})();