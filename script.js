/* =========================================================
   CORRECTION UNIQUEMENT — STATUT DES FACTURES
   Garde tout le reste de ton ancien script.js tel quel.
   ========================================================= */


/* =========================================================
   1. AJOUTER CES FONCTIONS
   ========================================================= */

function invoiceStatusLabel(status){
  const labels = {
    draft: "Brouillon",
    unpaid: "Impayée",
    partial: "Partiellement payée",
    paid: "Payée",
    cancelled: "Annulée",
    overdue: "En retard"
  };

  return labels[String(status || "").toLowerCase()] || "Impayée";
}


function invoiceStatusClass(status){
  const s = String(status || "unpaid").toLowerCase();

  if(s === "paid") return "success";
  if(s === "partial") return "warn";
  if(s === "overdue") return "danger";
  if(s === "cancelled") return "danger";
  if(s === "draft") return "muted";

  return "warn";
}


function invoiceDisplayStatus(invoice){

  if(!invoice){
    return "unpaid";
  }

  const current = String(invoice.status || "").toLowerCase();

  if(current === "cancelled"){
    return "cancelled";
  }

  if(current === "draft"){
    return "draft";
  }

  const total = Number(invoice.total || 0);
  const paid = Number(invoice.amount_paid || 0);

  if(total > 0 && paid >= total){
    return "paid";
  }

  if(paid > 0 && paid < total){
    return "partial";
  }

  if(
    invoice.due_date &&
    invoice.due_date < today()
  ){
    return "overdue";
  }

  return "unpaid";
}


/* =========================================================
   2. REMPLACER UNIQUEMENT invoicesPage()
   ========================================================= */

function invoicesPage(){

  const arr = state.db.invoices || [];

  const rows = arr.map(x => {

    const total = Number(x.total || 0);
    const paid = Number(x.amount_paid || 0);
    const remaining = Math.max(0,total-paid);

    const status = invoiceDisplayStatus(x);

    return `
      <tr>

        <td>
          <b>${esc(x.invoice_number || "—")}</b>
          ${x.title ? `<br><span class="muted">${esc(x.title)}</span>` : ""}
        </td>

        <td>
          ${esc(clientName(x.client_id))}
        </td>

        <td>
          ${esc(x.issue_date || "—")}
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
          ${money(remaining)}
        </td>

        <td>
          <span class="badge ${invoiceStatusClass(status)}">
            ${esc(invoiceStatusLabel(status))}
          </span>
        </td>

        <td>

          <button
            class="secondary"
            data-view-document="invoices"
            data-id="${x.id}">
            Détails
          </button>

          <button
            class="secondary"
            data-edit-invoice="${x.id}">
            Modifier
          </button>

          ${
            state.role === "admin"
            ? `
              <button
                class="danger"
                data-delete="invoices"
                data-id="${x.id}">
                Supprimer
              </button>
            `
            : ""
          }

        </td>

      </tr>
    `;

  }).join("");

  return `

    <div class="toolbar">

      <div>
        <div class="muted">
          <b>${arr.length}</b> facture(s)
        </div>
      </div>

      <button
        class="primary"
        data-add="invoices">
        + Nouvelle facture
      </button>

    </div>

    <div class="table-wrap">

      <table>

        <thead>

          <tr>
            <th>Facture</th>
            <th>Client</th>
            <th>Date</th>
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
            rows ||
            `
              <tr>
                <td colspan="9">
                  <div class="empty">
                    Aucune facture.
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


/* =========================================================
   3. REMPLACER UNIQUEMENT recalcInvoicePaid()
   ========================================================= */

async function recalcInvoicePaid(invoiceId){

  const invoice =
    (state.db.invoices || []).find(
      x => x.id === invoiceId
    );

  if(!invoice){
    return;
  }

  const paid =
    (state.db.payments || [])
      .filter(x => x.invoice_id === invoiceId)
      .reduce(
        (sum,x) => sum + Number(x.amount || 0),
        0
      );

  const total =
    Number(invoice.total || 0);

  let status = "unpaid";


  /* Facture annulée */
  if(invoice.status === "cancelled"){

    status = "cancelled";

  }

  /* Facture totalement payée */
  else if(
    total > 0 &&
    paid >= total
  ){

    status = "paid";

  }

  /* Paiement partiel */
  else if(paid > 0){

    status = "partial";

  }

  /* Facture en retard */
  else if(
    invoice.due_date &&
    invoice.due_date < today() &&
    invoice.status !== "draft"
  ){

    status = "overdue";

  }

  /* Facture non payée */
  else{

    status = "unpaid";

  }


  invoice.amount_paid = paid;

  invoice.amount_due =
    Math.max(0,total-paid);

  invoice.status = status;


  await update(
    "invoices",
    invoiceId,
    {
      amount_paid: paid,
      amount_due: Math.max(0,total-paid),
      status: status
    }
  );
}


/* =========================================================
   4. AJOUTER CE PETIT BLOC CSS À LA FIN DE TON script.js
   ========================================================= */

if(!document.getElementById("lbt-invoice-status-style")){

  const style =
    document.createElement("style");

  style.id =
    "lbt-invoice-status-style";

  style.textContent = `

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

  document.head.appendChild(style);
}


/* =========================================================
   5. IMPORTANT
   NE PAS AJOUTER :
   
   window.boot = async function(){...}

   NE PAS REMPLACER dashboard()
   NE PAS REMPLACER dashboardPage()
   NE PAS AJOUTER UNE DEUXIÈME FONCTION boot()
   NE PAS AJOUTER UNE DEUXIÈME FONCTION render()

   TON ANCIEN TABLEAU DE BORD RESTE INTACT.
   ========================================================= */
