/* =========================================================
   COMPLÉMENT FACTURES — AFFICHAGE ET GESTION DU STATUT
   À AJOUTER À LA FIN DE TON script.js
   Ne remplace pas ton code principal.
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

  return labels[status] || "Impayée";
}

function invoiceStatusClass(status){
  const classes = {
    draft: "draft",
    unpaid: "unpaid",
    partial: "partial",
    paid: "paid",
    cancelled: "cancelled",
    overdue: "overdue"
  };

  return classes[status] || "unpaid";
}

function getInvoiceDisplayStatus(invoice){
  if(!invoice) return "unpaid";

  if(invoice.status === "cancelled"){
    return "cancelled";
  }

  const total = Number(invoice.total || 0);
  const paid = Number(invoice.amount_paid || 0);

  if(total > 0 && paid >= total){
    return "paid";
  }

  if(paid > 0 && paid < total){
    return "partial";
  }

  if(invoice.status === "overdue"){
    return "overdue";
  }

  if(invoice.status === "draft"){
    return "draft";
  }

  return "unpaid";
}


/* =========================================================
   REMPLACEMENT AUTOMATIQUE DE L'AFFICHAGE DES FACTURES
   ========================================================= */

function invoicesPage(){
  const rows = state.db.invoices || [];

  return `
    <div class="page-head">
      <div>
        <h1>Factures</h1>
        <p>Gestion et suivi des factures clients.</p>
      </div>

      <button class="btn primary" data-action="add" data-table="invoices">
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
            <th>Total</th>
            <th>Payé</th>
            <th>Reste</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          ${
            rows.length
            ? rows.map(x => {

                const status = getInvoiceDisplayStatus(x);

                const total = Number(x.total || 0);
                const paid = Number(x.amount_paid || 0);
                const due = Math.max(0, total - paid);

                const client =
                  (state.db.clients || []).find(
                    c => c.id === x.client_id
                  );

                const clientName =
                  client?.company_name ||
                  client?.full_name ||
                  "Client inconnu";

                return `
                  <tr>

                    <td>
                      <strong>${esc(x.invoice_number || "—")}</strong>
                    </td>

                    <td>
                      ${esc(clientName)}
                    </td>

                    <td>
                      ${esc(x.issue_date || "—")}
                    </td>

                    <td>
                      ${esc(x.due_date || "—")}
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
                      <span class="badge invoice-status ${invoiceStatusClass(status)}">
                        ${esc(invoiceStatusLabel(status))}
                      </span>
                    </td>

                    <td>
                      <div class="actions">

                        <button
                          class="btn small"
                          data-action="edit"
                          data-table="invoices"
                          data-id="${x.id}">
                          Modifier
                        </button>

                        <button
                          class="btn small"
                          data-action="details"
                          data-table="invoices"
                          data-id="${x.id}">
                          Détails
                        </button>

                      </div>
                    </td>

                  </tr>
                `;
              }).join("")
            : `
              <tr>
                <td colspan="9" class="empty">
                  Aucune facture enregistrée.
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
   RECALCUL DU STATUT APRÈS PAIEMENT
   ========================================================= */

async function recalcInvoicePaid(invoiceId){

  const inv = (state.db.invoices || []).find(
    x => x.id === invoiceId
  );

  if(!inv) return;

  const payments = (state.db.payments || []).filter(
    x => x.invoice_id === invoiceId
  );

  const paid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const total = Number(inv.total || 0);

  let status = "unpaid";

  /* Une facture annulée reste annulée */
  if(inv.status === "cancelled"){

    status = "cancelled";

  }
  /* Facture totalement payée */
  else if(total > 0 && paid >= total){

    status = "paid";

  }
  /* Paiement partiel */
  else if(paid > 0 && paid < total){

    status = "partial";

  }
  /* Facture arrivée à échéance */
  else if(
    inv.due_date &&
    new Date(inv.due_date + "T23:59:59") < new Date()
  ){

    status = "overdue";

  }
  /* Aucun paiement */
  else {

    status = "unpaid";

  }

  inv.amount_paid = paid;
  inv.amount_due = Math.max(0, total - paid);
  inv.status = status;

  if(cloudConfigured && sb){

    await update(
      "invoices",
      invoiceId,
      {
        amount_paid: paid,
        amount_due: Math.max(0, total - paid),
        status
      }
    );

  }

  render();
}


/* =========================================================
   ACTUALISATION DES STATUTS SELON LES ÉCHÉANCES
   ========================================================= */

async function refreshInvoiceStatuses(){

  const invoices = state.db.invoices || [];

  const today = new Date();

  today.setHours(0,0,0,0);

  for(const invoice of invoices){

    if(invoice.status === "cancelled") continue;

    const total = Number(invoice.total || 0);
    const paid = Number(invoice.amount_paid || 0);

    let newStatus = invoice.status || "unpaid";

    if(total > 0 && paid >= total){

      newStatus = "paid";

    }
    else if(paid > 0 && paid < total){

      newStatus = "partial";

    }
    else if(
      invoice.due_date &&
      new Date(invoice.due_date + "T23:59:59") < today
    ){

      newStatus = "overdue";

    }
    else if(newStatus !== "draft"){

      newStatus = "unpaid";

    }

    if(invoice.status !== newStatus){

      invoice.status = newStatus;

      if(cloudConfigured && sb){

        await update(
          "invoices",
          invoice.id,
          {
            status: newStatus
          }
        );

      }
    }
  }

  render();
}


/* =========================================================
   STYLE MINIMAL POUR LES STATUTS
   ========================================================= */

if(!document.getElementById("invoice-status-extra-style")){

  const style = document.createElement("style");

  style.id = "invoice-status-extra-style";

  style.textContent = `
    .invoice-status{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:5px 10px;
      border-radius:999px;
      font-size:12px;
      font-weight:700;
      white-space:nowrap;
    }

    .invoice-status.paid{
      background:#dcfce7;
      color:#166534;
    }

    .invoice-status.partial{
      background:#fef3c7;
      color:#92400e;
    }

    .invoice-status.unpaid{
      background:#fee2e2;
      color:#991b1b;
    }

    .invoice-status.overdue{
      background:#ffedd5;
      color:#9a3412;
    }

    .invoice-status.cancelled{
      background:#e5e7eb;
      color:#374151;
    }

    .invoice-status.draft{
      background:#e0e7ff;
      color:#3730a3;
    }
  `;

  document.head.appendChild(style);
}


/* =========================================================
   MISE À JOUR DES STATUTS APRÈS CHARGEMENT
   ========================================================= */

const originalBootForInvoiceStatus = window.boot;

if(typeof originalBootForInvoiceStatus === "function"){

  window.boot = async function(){

    await originalBootForInvoiceStatus();

    try{
      await refreshInvoiceStatuses();
    }catch(error){
      console.warn(
        "Actualisation des statuts de factures impossible :",
        error
      );
    }

  };

    }
