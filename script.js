(() => {
  "use strict";

  const cfg = window.LBT_CONFIG || {};
  const hasCloud =
    !!window.supabase &&
    !!cfg.SUPABASE_URL &&
    !!cfg.SUPABASE_ANON_KEY;

  const sb = hasCloud
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  const state = {
    user: null,
    profile: null,
    db: {},
    cloud: hasCloud,
    page: "dashboard",
    modal: null,
    lineDraft: [],
    selectedDocument: null
  };

  const TABLES = [
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

  const TABLES_WITH_USER_ID = [
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

  const ROLE_PAGES = {
    admin: [
      "dashboard","members","clients","quotes","invoices","payments",
      "sales","purchases","expenses","stock","activities","projects",
      "innovations","reports","audit","settings"
    ],
    manager: [
      "dashboard","members","clients","quotes","invoices","payments",
      "sales","purchases","expenses","stock","activities","projects",
      "innovations","reports"
    ],
    employee: [
      "dashboard","clients","quotes","invoices","payments",
      "sales","purchases","expenses","stock","activities","projects",
      "innovations","reports"
    ]
  };

  const schemas = {
    clients: {
      title: "Clients",
      fields: [
        ["full_name","Nom complet","text",true],
        ["company_name","Entreprise","text",false],
        ["phone","Téléphone","text",false],
        ["email","E-mail","email",false],
        ["address","Adresse","text",false],
        ["city","Ville","text",false],
        ["notes","Notes","textarea",false],
        ["active","Actif","checkbox",false]
      ]
    },

    quotes: {
      title: "Devis",
      fields: [
        ["quote_number","N° devis","text",false],
        ["client_id","Client","client",true],
        ["issue_date","Date","date",true],
        ["valid_until","Valable jusqu'au","date",false],
        ["status","Statut","select",false,
          ["draft","sent","accepted","rejected","expired","converted"]],
        ["title","Objet","text",false],
        ["description","Description","textarea",false],
        ["discount","Remise","number",false],
        ["tax","Taxe","number",false],
        ["notes","Notes","textarea",false],
        ["terms","Conditions","textarea",false]
      ]
    },

    invoices: {
      title: "Factures",
      fields: [
        ["invoice_number","N° facture","text",false],
        ["client_id","Client","client",true],
        ["quote_id","Devis lié","quote",false],
        ["issue_date","Date","date",true],
        ["due_date","Échéance","date",false],
        ["status","Statut","invoice_status",false],
        ["title","Objet","text",false],
        ["description","Description","textarea",false],
        ["discount","Remise","number",false],
        ["tax","Taxe","number",false],
        ["amount_paid","Montant payé","number",false],
        ["notes","Notes","textarea",false],
        ["terms","Conditions","textarea",false]
      ]
    },

    sales: {
      title: "Ventes",
      fields: [
        ["date","Date","date",true],
        ["description","Description","text",true],
        ["amount","Montant","number",true],
        ["payment_method","Paiement","payment_method",false],
        ["client_id","Client","client",false],
        ["notes","Notes","textarea",false]
      ]
    },

    purchases: {
      title: "Achats",
      fields: [
        ["date","Date","date",true],
        ["description","Description","text",true],
        ["amount","Montant","number",true],
        ["supplier","Fournisseur","text",false],
        ["notes","Notes","textarea",false]
      ]
    },

    expenses: {
      title: "Dépenses",
      fields: [
        ["date","Date","date",true],
        ["category","Catégorie","text",true],
        ["description","Description","text",true],
        ["amount","Montant","number",true],
        ["payment_method","Paiement","payment_method",false],
        ["notes","Notes","textarea",false]
      ]
    },

    stock_items: {
      title: "Stock",
      fields: [
        ["name","Désignation","text",true],
        ["sku","Référence","text",false],
        ["quantity","Quantité","number",true],
        ["min_quantity","Seuil minimum","number",false],
        ["unit","Unité","text",false],
        ["location","Emplacement","text",false],
        ["notes","Notes","textarea",false]
      ]
    },

    activities: {
      title: "Activités",
      fields: [
        ["date","Date","date",true],
        ["title","Activité","text",true],
        ["description","Description","textarea",false],
        ["status","Statut","text",false]
      ]
    },

    projects: {
      title: "Projets",
      fields: [
        ["name","Projet","text",true],
        ["client_id","Client","client",false],
        ["start_date","Début","date",false],
        ["end_date","Fin","date",false],
        ["status","Statut","text",false],
        ["description","Description","textarea",false]
      ]
    },

    innovations: {
      title: "Innovations",
      fields: [
        ["title","Titre","text",true],
        ["description","Description","textarea",true],
        ["status","Statut","text",false]
      ]
    }
  };

  const paymentMethods = [
    ["cash","Espèces"],
    ["mobile_money","Mobile Money"],
    ["mtn_momo","MTN MoMo"],
    ["moov_money","Moov Money"],
    ["celtiis_cash","Celtiis Cash"],
    ["bank_transfer","Virement bancaire"],
    ["card","Carte bancaire"],
    ["check","Chèque bancaire"],
    ["pi_spi","PI-SPI"],
    ["other","Autre"],
    ["credit","Crédit"]
  ];

  const labels = {
    draft: "Brouillon",
    sent: "Envoyé",
    accepted: "Accepté",
    rejected: "Refusé",
    expired: "Expiré",
    converted: "Converti",

    unpaid: "Impayée",
    partial: "Partiellement payée",
    paid: "Payée",
    cancelled: "Annulée",
    overdue: "En retard",

    cash: "Espèces",
    mobile_money: "Mobile Money",
    mtn_momo: "MTN MoMo",
    moov_money: "Moov Money",
    celtiis_cash: "Celtiis Cash",
    bank_transfer: "Virement bancaire",
    card: "Carte bancaire",
    check: "Chèque bancaire",
    pi_spi: "PI-SPI",
    other: "Autre",
    credit: "Crédit"
  };

  const esc = value =>
    String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");

  const money = value =>
    `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;

  const today = () => new Date().toISOString().slice(0,10);
  const now = () => new Date().toISOString();

  function toast(message, type = "info") {
    let box = document.getElementById("toast");

    if (!box) {
      box = document.createElement("div");
      box.id = "toast";
      box.style.cssText =
        "position:fixed;right:18px;bottom:18px;z-index:99999;max-width:360px;padding:13px 16px;border-radius:12px;background:#111827;color:white;box-shadow:0 10px 30px rgba(0,0,0,.2);font-size:14px;";
      document.body.appendChild(box);
    }

    box.textContent = message;
    box.dataset.type = type;

    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.remove(),3500);
  }

  function role() {
    return state.profile?.role || "employee";
  }

  function isAdmin() {
    return role() === "admin";
  }

  function isManagerOrAdmin() {
    return ["admin","manager"].includes(role());
  }

  function canSee(page) {
    return (ROLE_PAGES[role()] || ROLE_PAGES.employee).includes(page);
  }

  function userId() {
    return state.user?.id || null;
  }

  function seed() {
    const result = {};
    TABLES.forEach(t => result[t] = []);
    return result;
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem("lbt_pro_v2");
      state.db = raw ? JSON.parse(raw) : seed();
    } catch {
      state.db = seed();
    }

    TABLES.forEach(t => {
      if (!Array.isArray(state.db[t])) state.db[t] = [];
    });
  }

  function saveLocal() {
    localStorage.setItem("lbt_pro_v2",JSON.stringify(state.db));
  }

  async function secureBoot() {
    if (!hasCloud) {
      loadLocal();

      state.cloud = false;
      state.profile = {
        id:"demo-admin",
        full_name:"Administrateur",
        role:"admin",
        active:true
      };

      render();
      return;
    }

    const { data,error } = await sb.auth.getSession();

    if (error) {
      document.body.innerHTML =
        `<div style="padding:40px;font-family:Arial">
          <h2>Erreur de connexion</h2>
          <p>${esc(error.message)}</p>
        </div>`;
      return;
    }

    if (!data.session) {
      window.location.href = "./login.html";
      return;
    }

    state.user = data.session.user;

    const profileResult = await sb
      .from("profiles")
      .select("*")
      .eq("id",state.user.id)
      .single();

    if (profileResult.error || !profileResult.data) {
      document.body.innerHTML =
        `<div style="padding:40px;font-family:Arial">
          <h2>Profil introuvable</h2>
          <p>Le compte est authentifié mais aucun profil actif n'a été trouvé.</p>
        </div>`;
      return;
    }

    state.profile = profileResult.data;

    if (state.profile.active === false) {
      await sb.auth.signOut();
      window.location.href = "./login.html";
      return;
    }

    await syncCloud();
    applyRoleNavigation();
    render();
  }

  async function syncCloud() {
    if (!hasCloud) return;

    for (const table of TABLES) {
      let query = sb.from(table).select("*");

      if (table === "settings") {
        query = query.eq("user_id",userId());
      } else if (table === "profiles") {
        query = query.order("created_at",{ascending:true});
      } else if (table === "audit_logs") {
        query = query.order("created_at",{ascending:false});
      } else if (
        [
          "sales","purchases","expenses","activities","projects",
          "innovations","clients","quotes","quote_items",
          "invoices","invoice_items","payments","stock_items",
          "stock_movements"
        ].includes(table)
      ) {
        if (
          [
            "sales","purchases","expenses","activities",
            "quotes","invoices","payments"
          ].includes(table)
        ) {
          query = query.order("created_at",{ascending:false});
        } else {
          query = query.order("created_at",{ascending:true});
        }
      }

      const { data,error } = await query;

      if (!error && data) {
        state.db[table] = data;
      } else if (!Array.isArray(state.db[table])) {
        state.db[table] = [];
      }
    }
  }

  async function insert(table,payload) {
    const data = {...payload};

    if (TABLES_WITH_USER_ID.includes(table) && !data.user_id) {
      data.user_id = userId();
    }

    if (!hasCloud) {
      data.id ||= crypto.randomUUID();
      data.created_at ||= now();
      data.updated_at ||= now();

      state.db[table].push(data);
      saveLocal();

      return data;
    }

    const { data:row,error } = await sb
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    state.db[table].push(row);

    return row;
  }

  async function update(table,id,payload) {
    if (!hasCloud) {
      const index = state.db[table].findIndex(x => x.id === id);

      if (index >= 0) {
        state.db[table][index] = {
          ...state.db[table][index],
          ...payload,
          updated_at:now()
        };
      }

      saveLocal();
      return state.db[table][index];
    }

    const { data,error } = await sb
      .from(table)
      .update({
        ...payload,
        updated_at:now()
      })
      .eq("id",id)
      .select()
      .single();

    if (error) throw error;

    const index = state.db[table].findIndex(x => x.id === id);

    if (index >= 0) {
      state.db[table][index] = data;
    }

    return data;
  }

  async function remove(table,id) {
    if (!hasCloud) {
      state.db[table] =
        state.db[table].filter(x => x.id !== id);

      saveLocal();
      return;
    }

    const { error } = await sb
      .from(table)
      .delete()
      .eq("id",id);

    if (error) throw error;

    state.db[table] =
      state.db[table].filter(x => x.id !== id);
  }

  async function audit(action,table,recordId = null,details = {}) {
    try {
      await insert("audit_logs",{
        action,
        table_name:table,
        record_id:recordId,
        details
      });
    } catch (error) {
      console.warn("Audit non enregistré:",error);
    }
  }

  function applyRoleNavigation() {
    const allowed =
      ROLE_PAGES[role()] || ROLE_PAGES.employee;

    document.querySelectorAll("[data-page]").forEach(button => {
      const page = button.dataset.page;
      button.style.display =
        allowed.includes(page) ? "" : "none";
    });

    document.body.dataset.role = role();
  }

  function closeMobileMenu() {
    document.querySelector(".sidebar")?.classList.remove("open");
    document.querySelector(".mobile-overlay")?.classList.remove("open");
  }

  function toggleMobileMenu() {
    document.querySelector(".sidebar")?.classList.toggle("open");
    document.querySelector(".mobile-overlay")?.classList.toggle("open");
  }

  function openModal(html) {
    let modal = document.getElementById("lbt-modal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "lbt-modal";

      modal.innerHTML =
        `<div class="lbt-modal-backdrop"></div>
         <div class="lbt-modal-box"></div>`;

      document.body.appendChild(modal);

      modal.querySelector(".lbt-modal-backdrop").onclick =
        closeModal;
    }

    modal.querySelector(".lbt-modal-box").innerHTML = html;
    modal.style.display = "flex";
  }

  function closeModal() {
    const modal = document.getElementById("lbt-modal");

    if (modal) {
      modal.style.display = "none";
    }

    state.modal = null;
  }

  function render() {
    const content = document.getElementById("content");

    if (!content) return;

    applyRoleNavigation();

    if (!canSee(state.page)) {
      state.page = "dashboard";
    }

    const pages = {
      dashboard:dashboardPage,
      members:membersPage,
      clients:() => tablePage("clients"),
      quotes:quotesPage,
      invoices:invoicesPage,
      payments:paymentsPage,
      sales:() => tablePage("sales"),
      purchases:() => tablePage("purchases"),
      expenses:() => tablePage("expenses"),
      stock:stockPage,
      activities:() => tablePage("activities"),
      projects:() => tablePage("projects"),
      innovations:() => tablePage("innovations"),
      reports:reportsPage,
      audit:auditPage,
      settings:settingsPage
    };

    content.innerHTML =
      pages[state.page]
        ? pages[state.page]()
        : dashboardPage();

    bindPage();
  }

  function dashboardPage() {
    const sales =
      state.db.sales.reduce(
        (a,x) => a + Number(x.amount || 0),
        0
      );

    const purchases =
      state.db.purchases.reduce(
        (a,x) => a + Number(x.amount || 0),
        0
      );

    const expenses =
      state.db.expenses.reduce(
        (a,x) => a + Number(x.amount || 0),
        0
      );

    const invoices = state.db.invoices || [];

    const unpaid = invoices
      .map(invoiceStatus)
      .filter(s => ["unpaid","partial","overdue"].includes(s))
      .length;

    const lowStock =
      (state.db.stock_items || []).filter(
        x =>
          Number(x.quantity || 0) <=
          Number(x.min_quantity || 0)
      ).length;

    return `
      <div class="page-head">
        <div>
          <h1>Bienvenue ${esc(state.profile?.full_name || "")}</h1>
          <p>Supervision de l'activité de LUC BRICO-TECH.</p>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span>Ventes</span>
          <strong>${money(sales)}</strong>
        </div>

        <div class="kpi-card">
          <span>Achats</span>
          <strong>${money(purchases)}</strong>
        </div>

        <div class="kpi-card">
          <span>Dépenses</span>
          <strong>${money(expenses)}</strong>
        </div>

        <div class="kpi-card">
          <span>Factures à suivre</span>
          <strong>${unpaid}</strong>
        </div>

        <div class="kpi-card">
          <span>Stock faible</span>
          <strong>${lowStock}</strong>
        </div>
      </div>

      <div class="dashboard-grid">
        <section class="card">
          <h3>Accès rapide</h3>

          <div class="quick-actions">
            ${canSee("clients")
              ? `<button data-action="add" data-table="clients">+ Client</button>`
              : ""}

            ${canSee("quotes")
              ? `<button data-action="add" data-table="quotes">+ Devis</button>`
              : ""}

            ${canSee("invoices")
              ? `<button data-action="add" data-table="invoices">+ Facture</button>`
              : ""}

            ${canSee("sales")
              ? `<button data-action="add" data-table="sales">+ Vente</button>`
              : ""}

            ${canSee("stock")
              ? `<button data-action="add" data-table="stock_items">+ Article</button>`
              : ""}
          </div>
        </section>

        <section class="card">
          <h3>Dernières activités</h3>

          ${
            (state.db.activities || [])
              .slice(0,5)
              .map(x => `
                <div class="list-row">
                  <span>${esc(x.title || x.description || "Activité")}</span>
                  <small>${esc(x.date || "")}</small>
                </div>
              `)
              .join("")
            || "<p>Aucune activité.</p>"
          }
        </section>
      </div>
    `;
  }

  function tablePage(table) {
    const schema = schemas[table];
    const rows = state.db[table] || [];

    return `
      <div class="page-head">
        <div>
          <h1>${esc(schema.title)}</h1>
          <p>${rows.length} élément(s)</p>
        </div>

        <button
          data-action="add"
          data-table="${table}"
          class="primary">
          + Ajouter
        </button>
      </div>

      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              ${schema.fields
                .slice(0,5)
                .map(f => `<th>${esc(f[1])}</th>`)
                .join("")}
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows.map(row => `
                <tr>
                  ${schema.fields
                    .slice(0,5)
                    .map(f => `<td>${displayField(f,row)}</td>`)
                    .join("")}

                  <td>
                    <button
                      data-action="edit"
                      data-table="${table}"
                      data-id="${row.id}">
                      Modifier
                    </button>

                    <button
                      data-action="delete"
                      data-table="${table}"
                      data-id="${row.id}">
                      Supprimer
                    </button>
                  </td>
                </tr>
              `)
              .join("")
              || `<tr><td colspan="10">Aucune donnée.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  }

  function displayField(field,row) {
    const [key] = field;
    const value = row[key];

    if (key === "client_id") {
      const client =
        (state.db.clients || []).find(
          x => x.id === value
        );

      return esc(
        client?.company_name ||
        client?.full_name ||
        "—"
      );
    }

    if (key === "quote_id") {
      const quote =
        (state.db.quotes || []).find(
          x => x.id === value
        );

      return esc(
        quote?.quote_number || "—"
      );
    }

    if (
      key === "amount" ||
      key === "total" ||
      key === "amount_paid" ||
      key === "amount_due"
    ) {
      return money(value);
    }

    if (key === "status") {
      return `<span class="badge">
        ${esc(labels[value] || value || "—")}
      </span>`;
    }

    if (key === "payment_method") {
      return esc(
        labels[value] ||
        value ||
        "—"
      );
    }

    if (typeof value === "boolean") {
      return value ? "Oui" : "Non";
    }

    return esc(value || "—");
  }

  function quotesPage() {
    const rows = state.db.quotes || [];

    return `
      <div class="page-head">
        <div>
          <h1>Devis</h1>
          <p>${rows.length} devis</p>
        </div>

        <button
          data-action="add"
          data-table="quotes"
          class="primary">
          + Nouveau devis
        </button>
      </div>

      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Client</th>
              <th>Date</th>
              <th>Total</th>
              <th>Statut</th>
              <th>Lignes</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows.map(q => {
                const client =
                  (state.db.clients || []).find(
                    c => c.id === q.client_id
                  );

                const lines =
                  (state.db.quote_items || []).filter(
                    x => x.quote_id === q.id
                  );

                return `
                  <tr>
                    <td>${esc(q.quote_number || "—")}</td>

                    <td>
                      ${esc(
                        client?.company_name ||
                        client?.full_name ||
                        "—"
                      )}
                    </td>

                    <td>${esc(q.issue_date || "—")}</td>

                    <td>${money(q.total)}</td>

                    <td>
                      <span class="badge">
                        ${esc(
                          labels[q.status] ||
                          q.status ||
                          "Brouillon"
                        )}
                      </span>
                    </td>

                    <td>${lines.length}</td>

                    <td>
                      <button
                        data-action="details"
                        data-table="quotes"
                        data-id="${q.id}">
                        Détails
                      </button>

                      <button
                        data-action="edit"
                        data-table="quotes"
                        data-id="${q.id}">
                        Modifier
                      </button>

                      <button
                        data-action="delete"
                        data-table="quotes"
                        data-id="${q.id}">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                `;
              })
              .join("")
              || `<tr><td colspan="7">Aucun devis.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  }

  function invoiceStatus(inv) {
    if (!inv) return "unpaid";

    if (inv.status === "cancelled") {
      return "cancelled";
    }

    const total = Number(inv.total || 0);
    const paid = Number(inv.amount_paid || 0);

    if (total > 0 && paid >= total) {
      return "paid";
    }

    if (paid > 0) {
      return "partial";
    }

    if (
      inv.due_date &&
      inv.due_date < today() &&
      !["paid","cancelled"].includes(inv.status)
    ) {
      return "overdue";
    }

    return inv.status || "unpaid";
  }

  function invoicesPage() {
    const rows = state.db.invoices || [];

    return `
      <div class="page-head">
        <div>
          <h1>Factures</h1>
          <p>${rows.length} facture(s)</p>
        </div>

        <button
          data-action="add"
          data-table="invoices"
          class="primary">
          + Nouvelle facture
        </button>
      </div>

      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Client</th>
              <th>Date</th>
              <th>Échéance</th>
              <th>Total</th>
              <th>Payé</th>
              <th>Reste</th>
              <th>Statut</th>
              <th>Lignes</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows.map(inv => {
                const client =
                  (state.db.clients || []).find(
                    c => c.id === inv.client_id
                  );

                const lines =
                  (state.db.invoice_items || []).filter(
                    x => x.invoice_id === inv.id
                  );

                const status = invoiceStatus(inv);
                const total = Number(inv.total || 0);
                const paid = Number(inv.amount_paid || 0);
                const due = Math.max(0,total-paid);

                return `
                  <tr>
                    <td>${esc(inv.invoice_number || "—")}</td>

                    <td>
                      ${esc(
                        client?.company_name ||
                        client?.full_name ||
                        "—"
                      )}
                    </td>

                    <td>${esc(inv.issue_date || "—")}</td>
                    <td>${esc(inv.due_date || "—")}</td>

                    <td>${money(total)}</td>
                    <td>${money(paid)}</td>
                    <td>${money(due)}</td>

                    <td>
                      <span class="badge status-${esc(status)}">
                        ${esc(labels[status] || status)}
                      </span>
                    </td>

                    <td>${lines.length}</td>

                    <td>
                      <button
                        data-action="details"
                        data-table="invoices"
                        data-id="${inv.id}">
                        Détails
                      </button>

                      <button
                        data-action="payment"
                        data-id="${inv.id}">
                        Paiement
                      </button>

                      <button
                        data-action="edit"
                        data-table="invoices"
                        data-id="${inv.id}">
                        Modifier
                      </button>

                      <button
                        data-action="delete"
                        data-table="invoices"
                        data-id="${inv.id}">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                `;
              })
              .join("")
              || `<tr><td colspan="10">Aucune facture.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  }

  function paymentsPage() {
    const rows = state.db.payments || [];

    return `
      <div class="page-head">
        <div>
          <h1>Paiements</h1>
          <p>${rows.length} paiement(s)</p>
        </div>
      </div>

      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Facture</th>
              <th>Montant</th>
              <th>Mode</th>
              <th>Référence</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows.map(p => {
                const inv =
                  (state.db.invoices || []).find(
                    x => x.id === p.invoice_id
                  );

                return `
                  <tr>
                    <td>${esc(p.payment_date || "—")}</td>
                    <td>${esc(inv?.invoice_number || "—")}</td>
                    <td>${money(p.amount)}</td>
                    <td>${esc(labels[p.payment_method] || p.payment_method || "—")}</td>
                    <td>${esc(p.reference || "—")}</td>
                    <td>
                      <button
                        data-action="delete-payment"
                        data-id="${p.id}">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                `;
              })
              .join("")
              || `<tr><td colspan="6">Aucun paiement.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  }

  function membersPage() {
    const rows = state.db.profiles || [];

    return `
      <div class="page-head">
        <div>
          <h1>Membres</h1>
          <p>Gestion des utilisateurs et des rôles.</p>
        </div>

        ${
          isAdmin()
            ? `<button data-action="create-employee" class="primary">
                + Créer un compte employé
              </button>`
            : ""
        }
      </div>

      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>E-mail</th>
              <th>Téléphone</th>
              <th>Rôle</th>
              <th>Actif</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows.map(p => `
                <tr>
                  <td>${esc(p.full_name || "—")}</td>
                  <td>${esc(p.email || "—")}</td>
                  <td>${esc(p.phone || "—")}</td>
                  <td>${esc(p.role || "employee")}</td>
                  <td>${p.active === false ? "Non" : "Oui"}</td>

                  <td>
                    ${
                      isAdmin()
                        ? `
                          <button
                            data-action="change-role"
                            data-id="${p.id}">
                            Rôle
                          </button>

                          <button
                            data-action="toggle-member"
                            data-id="${p.id}">
                            ${p.active === false ? "Activer" : "Désactiver"}
                          </button>
                        `
                        : "Lecture seule"
                    }
                  </td>
                </tr>
              `)
              .join("")
              || `<tr><td colspan="6">Aucun membre.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  }

  function stockPage() {
    const rows = state.db.stock_items || [];

    const low = rows.filter(
      x =>
        Number(x.quantity || 0) <=
        Number(x.min_quantity || 0)
    );

    return `
      <div class="page-head">
        <div>
          <h1>Stock & matériel</h1>
          <p>
            ${rows.length} article(s) ·
            ${low.length} niveau(x) faible(s)
          </p>
        </div>

        ${
          isManagerOrAdmin()
            ? `<button
                data-action="add"
                data-table="stock_items"
                class="primary">
                + Article
              </button>`
            : ""
        }
      </div>

      ${
        low.length
          ? `<div class="alert-box">
              ⚠️ ${low.length}
              article(s) atteignent leur seuil minimum.
            </div>`
          : ""
      }

      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Référence</th>
              <th>Quantité</th>
              <th>Seuil</th>
              <th>Unité</th>
              <th>Emplacement</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows.map(x => `
                <tr>
                  <td>${esc(x.name)}</td>
                  <td>${esc(x.sku || "—")}</td>
                  <td>${esc(x.quantity ?? 0)}</td>
                  <td>${esc(x.min_quantity ?? 0)}</td>
                  <td>${esc(x.unit || "—")}</td>
                  <td>${esc(x.location || "—")}</td>

                  <td>
                    <button
                      data-action="stock-movement"
                      data-id="${x.id}">
                      Mouvement
                    </button>

                    ${
                      isManagerOrAdmin()
                        ? `<button
                            data-action="edit"
                            data-table="stock_items"
                            data-id="${x.id}">
                            Modifier
                          </button>`
                        : ""
                    }
                  </td>
                </tr>
              `)
              .join("")
              || `<tr><td colspan="7">Aucun article.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  }

  function reportsPage() {
    const sales =
      state.db.sales.reduce(
        (a,x) => a + Number(x.amount || 0),
        0
      );

    const purchases =
      state.db.purchases.reduce(
        (a,x) => a + Number(x.amount || 0),
        0
      );

    const expenses =
      state.db.expenses.reduce(
        (a,x) => a + Number(x.amount || 0),
        0
      );

    const invoices = state.db.invoices || [];

    const invoiceTotal =
      invoices.reduce(
        (a,x) => a + Number(x.total || 0),
        0
      );

    const invoicePaid =
      invoices.reduce(
        (a,x) => a + Number(x.amount_paid || 0),
        0
      );

    return `
      <div class="page-head">
        <div>
          <h1>Rapports</h1>
          <p>Synthèse de l'activité.</p>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span>Ventes</span>
          <strong>${money(sales)}</strong>
        </div>

        <div class="kpi-card">
          <span>Achats</span>
          <strong>${money(purchases)}</strong>
        </div>

        <div class="kpi-card">
          <span>Dépenses</span>
          <strong>${money(expenses)}</strong>
        </div>

        <div class="kpi-card">
          <span>Factures</span>
          <strong>${money(invoiceTotal)}</strong>
        </div>

        <div class="kpi-card">
          <span>Factures encaissées</span>
          <strong>${money(invoicePaid)}</strong>
        </div>
      </div>

      <div class="card">
        <h3>Exports</h3>

        <div class="quick-actions">
          <button data-action="export-all">
            Exporter les données CSV
          </button>

          <button data-action="backup">
            Sauvegarde JSON
          </button>

          ${
            isAdmin()
              ? `<button data-action="export-audit">
                  Exporter l'audit
                </button>`
              : ""
          }
        </div>
      </div>
    `;
  }

  function auditPage() {
    const rows = state.db.audit_logs || [];

    return `
      <div class="page-head">
        <div>
          <h1>Journal d'audit</h1>
          <p>Traçabilité des opérations.</p>
        </div>

        <button data-action="export-audit">
          Exporter
        </button>
      </div>

      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Table</th>
              <th>Utilisateur</th>
              <th>Détails</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows.map(x => {
                const p =
                  (state.db.profiles || []).find(
                    u => u.id === x.user_id
                  );

                return `
                  <tr>
                    <td>${esc(x.created_at || "—")}</td>
                    <td>${esc(x.action || "—")}</td>
                    <td>${esc(x.table_name || "—")}</td>
                    <td>${esc(p?.full_name || x.user_id || "—")}</td>
                    <td>${esc(JSON.stringify(x.details || {}))}</td>
                  </tr>
                `;
              })
              .join("")
              || `<tr><td colspan="5">Aucune opération enregistrée.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  }

  function settingsPage() {
    const current =
      (state.db.settings || []).find(
        x => x.user_id === userId()
      ) || {};

    return `
      <div class="page-head">
        <div>
          <h1>Paramètres</h1>
          <p>Configuration de votre espace.</p>
        </div>
      </div>

      <div class="card">
        <form id="settings-form">
          <label>
            Nom de l'entreprise
            <input
              name="company_name"
              value="${esc(current.company_name || "LUC BRICO-TECH")}"
            >
          </label>

          <label>
            Adresse
            <input
              name="company_address"
              value="${esc(current.company_address || "Hévié Hounzévié, Abomey-Calavi")}"
            >
          </label>

          <label>
            Téléphone
            <input
              name="company_phone"
              value="${esc(current.company_phone || "01 67 02 84 91 / 01 41 56 02 24 / 01 58 38 46 72")}"
            >
          </label>

          <button class="primary" type="submit">
            Enregistrer
          </button>
        </form>
      </div>
    `;
  }

  function fieldInput(field,value) {
    const [key,label,type,required,options] = field;
    const v = value ?? "";

    if (type === "textarea") {
      return `
        <label>
          ${esc(label)}
          <textarea
            name="${esc(key)}"
            ${required ? "required" : ""}
          >${esc(v)}</textarea>
        </label>
      `;
    }

    if (type === "checkbox") {
      return `
        <label class="check-row">
          <input
            type="checkbox"
            name="${esc(key)}"
            ${v ? "checked" : ""}
          >
          ${esc(label)}
        </label>
      `;
    }

    if (type === "client") {
      return `
        <label>
          ${esc(label)}
          <select
            name="${esc(key)}"
            ${required ? "required" : ""}
          >
            <option value="">Sélectionner</option>

            ${(state.db.clients || []).map(c => `
              <option
                value="${c.id}"
                ${c.id === v ? "selected" : ""}
              >
                ${esc(c.company_name || c.full_name)}
              </option>
            `).join("")}
          </select>
        </label>
      `;
    }

    if (type === "quote") {
      return `
        <label>
          ${esc(label)}
          <select name="${esc(key)}">
            <option value="">Aucun</option>

            ${(state.db.quotes || []).map(q => `
              <option
                value="${q.id}"
                ${q.id === v ? "selected" : ""}
              >
                ${esc(q.quote_number || q.id)}
              </option>
            `).join("")}
          </select>
        </label>
      `;
    }

    if (type === "invoice_status") {
      const opts = [
        "unpaid",
        "partial",
        "paid",
        "cancelled",
        "overdue"
      ];

      return `
        <label>
          ${esc(label)}
          <select name="${esc(key)}">
            ${opts.map(o => `
              <option
                value="${o}"
                ${o === v ? "selected" : ""}
              >
                ${esc(labels[o])}
              </option>
            `).join("")}
          </select>
        </label>
      `;
    }

    if (type === "payment_method") {
      return `
        <label>
          ${esc(label)}
          <select name="${esc(key)}">
            <option value="">Sélectionner</option>

            ${paymentMethods.map(([k,l]) => `
              <option
                value="${k}"
                ${k === v ? "selected" : ""}
              >
                ${esc(l)}
              </option>
            `).join("")}
          </select>
        </label>
      `;
    }

    if (type === "select") {
      return `
        <label>
          ${esc(label)}
          <select
            name="${esc(key)}"
            ${required ? "required" : ""}
          >
            ${options.map(o => `
              <option
                value="${esc(o)}"
                ${o === v ? "selected" : ""}
              >
                ${esc(labels[o] || o)}
              </option>
            `).join("")}
          </select>
        </label>
      `;
    }

    return `
      <label>
        ${esc(label)}
        <input
          type="${esc(type)}"
          name="${esc(key)}"
          value="${esc(v)}"
          ${required ? "required" : ""}
        >
      </label>
    `;
  }

  async function openForm(table,id = null) {
    if (["quotes","invoices"].includes(table)) {
      return openDocumentForm(table,id);
    }

    const schema = schemas[table];
    if (!schema) return;

    const existing = id
      ? (state.db[table] || []).find(x => x.id === id)
      : {};

    openModal(`
      <div class="modal-header">
        <h2>
          ${id ? "Modifier" : "Ajouter"}
          — ${esc(schema.title)}
        </h2>

        <button data-action="close-modal">×</button>
      </div>

      <form id="generic-form">
        ${schema.fields
          .map(f => fieldInput(f,existing[f[0]]))
          .join("")}

        <div class="modal-actions">
          <button
            type="button"
            data-action="close-modal">
            Annuler
          </button>

          <button
            type="submit"
            class="primary">
            Enregistrer
          </button>
        </div>
      </form>
    `);

    const form =
      document.getElementById("generic-form");

    form.onsubmit = async e => {
      e.preventDefault();

      const fd = new FormData(form);
      const payload = {};

      schema.fields.forEach(f => {
        const key = f[0];
        const type = f[2];

        if (type === "checkbox") {
          payload[key] = fd.has(key);
        } else if (type === "number") {
          payload[key] = Number(fd.get(key) || 0);
        } else {
          payload[key] = fd.get(key) || null;
        }
      });

      try {
        if (id) {
          await update(table,id,payload);
          await audit("update",table,id,payload);
        } else {
          const row =
            await insert(table,payload);

          await audit(
            "insert",
            table,
            row.id,
            payload
          );
        }

        closeModal();
        await syncCloud();
        render();

        toast(
          "Enregistrement effectué.",
          "success"
        );
      } catch (error) {
        toast(
          error.message ||
          "Erreur d'enregistrement.",
          "error"
        );
      }
    };
  }

  function documentLineRows() {
    return state.lineDraft.map((line,index) => `
      <tr>
        <td>
          <input
            data-line="${index}"
            data-field="description"
            value="${esc(line.description || "")}"
            placeholder="Désignation"
          >
        </td>

        <td>
          <input
            data-line="${index}"
            data-field="quantity"
            type="number"
            min="0"
            step="0.01"
            value="${Number(line.quantity || 1)}"
          >
        </td>

        <td>
          <select
            data-line="${index}"
            data-field="unit">
            ${
              ["pièce","m","kg","h","forfait","lot","service"]
                .map(u => `
                  <option
                    value="${u}"
                    ${u === (line.unit || "pièce") ? "selected" : ""}
                  >
                    ${u}
                  </option>
                `)
                .join("")
            }
          </select>
        </td>

        <td>
          <input
            data-line="${index}"
            data-field="unit_price"
            type="number"
            min="0"
            step="1"
            value="${Number(line.unit_price || 0)}"
          >
        </td>

        <td class="line-total">
          ${money(
            Number(line.quantity || 0) *
            Number(line.unit_price || 0)
          )}
        </td>

        <td>
          <button
            type="button"
            data-remove-line="${index}">
            ×
          </button>
        </td>
      </tr>
    `).join("");
  }

  function calculateLines() {
    return state.lineDraft.reduce(
      (sum,line) =>
        sum +
        Number(line.quantity || 0) *
        Number(line.unit_price || 0),
      0
    );
  }

  function documentTotals(discount,tax) {
    const subtotal = calculateLines();
    const d = Number(discount || 0);
    const t = Number(tax || 0);
    const base = Math.max(0,subtotal-d);

    return {
      subtotal,
      discount:d,
      tax:t,
      total:base+t
    };
  }

  async function openDocumentForm(table,id = null) {
    const schema = schemas[table];

    const existing = id
      ? (state.db[table] || []).find(x => x.id === id)
      : {};

    const isInvoice = table === "invoices";

    state.selectedDocument = {
      table,
      id
    };

    if (id) {
      const itemTable =
        isInvoice
          ? "invoice_items"
          : "quote_items";

      const foreignKey =
        isInvoice
          ? "invoice_id"
          : "quote_id";

      state.lineDraft =
        (state.db[itemTable] || [])
          .filter(x => x[foreignKey] === id)
          .map(x => ({
            description:x.description || "",
            quantity:Number(x.quantity || 1),
            unit:x.unit || "pièce",
            unit_price:Number(x.unit_price || 0)
          }));
    } else {
      state.lineDraft = [];
    }

    const status =
      isInvoice
        ? invoiceStatus(existing)
        : (existing.status || "draft");

    const defaultData = {
      ...existing,
      issue_date:existing.issue_date || today(),
      status
    };

    openModal(`
      <div class="modal-header">
        <h2>
          ${id ? "Modifier" : "Créer"}
          — ${isInvoice ? "Facture" : "Devis"}
        </h2>

        <button data-action="close-modal">×</button>
      </div>

      <form id="document-form">
        <div class="form-grid">
          ${schema.fields
            .map(f => fieldInput(f,defaultData[f[0]]))
            .join("")}
        </div>

        <hr>

        <h3>Lignes détaillées</h3>

        <div class="table-wrap">
          <table class="document-lines">
            <thead>
              <tr>
                <th>Désignation</th>
                <th>Qté</th>
                <th>Unité</th>
                <th>Prix unitaire</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>

            <tbody id="document-lines-body">
              ${documentLineRows()}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          id="add-document-line">
          + Ajouter une ligne
        </button>

        <div class="document-totals">
          <div>
            Sous-total :
            <strong id="doc-subtotal">
              ${money(existing.subtotal || 0)}
            </strong>
          </div>

          <div>
            Remise :
            <strong id="doc-discount">
              ${money(existing.discount || 0)}
            </strong>
          </div>

          <div>
            Taxe :
            <strong id="doc-tax">
              ${money(existing.tax || 0)}
            </strong>
          </div>

          <div>
            Total :
            <strong id="doc-total">
              ${money(existing.total || 0)}
            </strong>
          </div>

          ${
            isInvoice
              ? `
                <div>
                  Déjà payé :
                  <strong id="doc-paid">
                    ${money(existing.amount_paid || 0)}
                  </strong>
                </div>

                <div>
                  Reste dû :
                  <strong id="doc-due">
                    ${money(
                      Math.max(
                        0,
                        Number(existing.total || 0) -
                        Number(existing.amount_paid || 0)
                      )
                    )}
                  </strong>
                </div>
              `
              : ""
          }
        </div>

        <div class="modal-actions">
          <button
            type="button"
            data-action="close-modal">
            Annuler
          </button>

          <button
            type="submit"
            class="primary">
            Enregistrer
          </button>
        </div>
      </form>
    `);

    const form =
      document.getElementById("document-form");

    const body =
      document.getElementById("document-lines-body");

    function refreshLineUI() {
      body.innerHTML = documentLineRows();

      const discount =
        form.elements.discount?.value || 0;

      const tax =
        form.elements.tax?.value || 0;

      const totals =
        documentTotals(discount,tax);

      document.getElementById("doc-subtotal")
        .textContent = money(totals.subtotal);

      document.getElementById("doc-discount")
        .textContent = money(totals.discount);

      document.getElementById("doc-tax")
        .textContent = money(totals.tax);

      document.getElementById("doc-total")
        .textContent = money(totals.total);

      if (isInvoice) {
        const paid =
          Number(
            form.elements.amount_paid?.value || 0
          );

        document.getElementById("doc-paid")
          .textContent = money(paid);

        document.getElementById("doc-due")
          .textContent =
            money(
              Math.max(0,totals.total-paid)
            );
      }

      body.querySelectorAll("[data-line]")
        .forEach(input => {
          input.oninput = () => {
            const index =
              Number(input.dataset.line);

            const field =
              input.dataset.field;

            state.lineDraft[index][field] =
              field === "quantity" ||
              field === "unit_price"
                ? Number(input.value || 0)
                : input.value;

            refreshLineUI();
          };

          input.onchange = input.oninput;
        });

      body.querySelectorAll("[data-remove-line]")
        .forEach(button => {
          button.onclick = () => {
            state.lineDraft.splice(
              Number(button.dataset.removeLine),
              1
            );

            refreshLineUI();
          };
        });
    }

    document.getElementById("add-document-line").onclick = () => {
      state.lineDraft.push({
        description:"",
        quantity:1,
        unit:"pièce",
        unit_price:0
      });

      refreshLineUI();
    };

    form.elements.discount?.addEventListener(
      "input",
      refreshLineUI
    );

    form.elements.tax?.addEventListener(
      "input",
      refreshLineUI
    );

    form.elements.amount_paid?.addEventListener(
      "input",
      refreshLineUI
    );

    refreshLineUI();

    form.onsubmit = async e => {
      e.preventDefault();

      const fd = new FormData(form);
      const payload = {};

      schema.fields.forEach(f => {
        const key = f[0];
        const type = f[2];

        if (type === "checkbox") {
          payload[key] = fd.has(key);
        } else if (type === "number") {
          payload[key] =
            Number(fd.get(key) || 0);
        } else {
          payload[key] =
            fd.get(key) || null;
        }
      });

      const totals =
        documentTotals(
          payload.discount,
          payload.tax
        );

      payload.subtotal = totals.subtotal;
      payload.discount = totals.discount;
      payload.tax = totals.tax;
      payload.total = totals.total;

      if (!payload.quote_number && table === "quotes") {
        payload.quote_number =
          `DEV-${Date.now()}`;
      }

      if (!payload.invoice_number && table === "invoices") {
        payload.invoice_number =
          `FAC-${Date.now()}`;
      }

      if (isInvoice) {
        const paid =
          Number(payload.amount_paid || 0);

        if (payload.status === "cancelled") {
          payload.amount_due = 0;
        } else if (
          paid >= totals.total &&
          totals.total > 0
        ) {
          payload.status = "paid";
          payload.amount_due = 0;
        } else if (paid > 0) {
          payload.status = "partial";
          payload.amount_due =
            Math.max(0,totals.total-paid);
        } else if (
          payload.due_date &&
          payload.due_date < today()
        ) {
          payload.status = "overdue";
          payload.amount_due = totals.total;
        } else {
          payload.status = "unpaid";
          payload.amount_due = totals.total;
        }
      }

      try {
        let row;

        if (id) {
          row =
            await update(table,id,payload);
        } else {
          row =
            await insert(table,payload);
        }

        await saveDocumentLines(
          table,
          row.id,
          state.lineDraft
        );

        await audit(
          id ? "update" : "insert",
          table,
          row.id,
          {
            ...payload,
            lines:state.lineDraft
          }
        );

        closeModal();

        await syncCloud();

        render();

        toast(
          `${isInvoice ? "Facture" : "Devis"} enregistré(e).`,
          "success"
        );
      } catch (error) {
        console.error(error);

        toast(
          error.message ||
          "Erreur lors de l'enregistrement.",
          "error"
        );
      }
    };
  }

  async function saveDocumentLines(table,id,lines) {
    const itemTable =
      table === "invoices"
        ? "invoice_items"
        : "quote_items";

    const foreignKey =
      table === "invoices"
        ? "invoice_id"
        : "quote_id";

    if (!hasCloud) {
      state.db[itemTable] =
        state.db[itemTable].filter(
          x => x[foreignKey] !== id
        );

      lines.forEach(line => {
        state.db[itemTable].push({
          id:crypto.randomUUID(),
          [foreignKey]:id,
          description:line.description,
          quantity:Number(line.quantity || 0),
          unit:line.unit || "pièce",
          unit_price:Number(line.unit_price || 0),
          amount:
            Number(line.quantity || 0) *
            Number(line.unit_price || 0),
          created_at:now()
        });
      });

      saveLocal();
      return;
    }

    const del =
      await sb
        .from(itemTable)
        .delete()
        .eq(foreignKey,id);

    if (del.error) throw del.error;

    if (!lines.length) return;

    const rows = lines.map(line => ({
      [foreignKey]:id,
      description:line.description,
      quantity:Number(line.quantity || 0),
      unit:line.unit || "pièce",
      unit_price:Number(line.unit_price || 0),
      amount:
        Number(line.quantity || 0) *
        Number(line.unit_price || 0)
    }));

    const ins =
      await sb
        .from(itemTable)
        .insert(rows);

    if (ins.error) throw ins.error;

    await syncCloud();
  }

  async function openPaymentForm(invoiceId) {
    const invoice =
      (state.db.invoices || []).find(
        x => x.id === invoiceId
      );

    if (!invoice) return;

    openModal(`
      <div class="modal-header">
        <h2>Enregistrer un paiement</h2>
        <button data-action="close-modal">×</button>
      </div>

      <p>
        Facture :
        <strong>
          ${esc(invoice.invoice_number || "—")}
        </strong>
      </p>

      <p>
        Total :
        <strong>${money(invoice.total)}</strong>
      </p>

      <form id="payment-form">
        <label>
          Montant
          <input
            type="number"
            name="amount"
            min="1"
            required
          >
        </label>

        <label>
          Mode de paiement
          <select
            name="payment_method"
            required>
            ${paymentMethods.map(([k,l]) => `
              <option value="${k}">
                ${esc(l)}
              </option>
            `).join("")}
          </select>
        </label>

        <label>
          Date
          <input
            type="date"
            name="payment_date"
            value="${today()}"
            required
          >
        </label>

        <label>
          Référence
          <input
            name="reference"
            placeholder="Référence transaction / chèque / virement"
          >
        </label>

        <label>
          Notes
          <textarea name="notes"></textarea>
        </label>

        <div class="modal-actions">
          <button
            type="button"
            data-action="close-modal">
            Annuler
          </button>

          <button
            type="submit"
            class="primary">
            Enregistrer le paiement
          </button>
        </div>
      </form>
    `);

    document.getElementById("payment-form").onsubmit =
      async e => {
        e.preventDefault();

        const fd =
          new FormData(e.currentTarget);

        const payload = {
          invoice_id:invoiceId,
          amount:Number(fd.get("amount") || 0),
          payment_method:fd.get("payment_method"),
          payment_date:fd.get("payment_date"),
          reference:fd.get("reference") || null,
          notes:fd.get("notes") || null
        };

        if (payload.amount <= 0) {
          toast(
            "Le montant doit être supérieur à zéro.",
            "error"
          );
          return;
        }

        try {
          const row =
            await insert("payments",payload);

          await audit(
            "insert",
            "payments",
            row.id,
            payload
          );

          await recalcInvoicePaid(invoiceId);

          closeModal();

          await syncCloud();

          render();

          toast(
            "Paiement enregistré.",
            "success"
          );
        } catch (error) {
          toast(
            error.message || "Erreur paiement.",
            "error"
          );
        }
      };
  }

  async function recalcInvoicePaid(invoiceId) {
    const invoice =
      (state.db.invoices || []).find(
        x => x.id === invoiceId
      );

    if (!invoice) return;

    const paid =
      (state.db.payments || [])
        .filter(x => x.invoice_id === invoiceId)
        .reduce(
          (a,x) =>
            a + Number(x.amount || 0),
          0
        );

    const total =
      Number(invoice.total || 0);

    let status;

    if (invoice.status === "cancelled") {
      status = "cancelled";
    } else if (
      paid >= total &&
      total > 0
    ) {
      status = "paid";
    } else if (paid > 0) {
      status = "partial";
    } else if (
      invoice.due_date &&
      invoice.due_date < today()
    ) {
      status = "overdue";
    } else {
      status = "unpaid";
    }

    await update(
      "invoices",
      invoiceId,
      {
        amount_paid:paid,
        amount_due:Math.max(0,total-paid),
        status
      }
    );
  }

  async function deletePayment(id) {
    const payment =
      (state.db.payments || []).find(
        x => x.id === id
      );

    if (!payment) return;

    if (!confirm("Supprimer ce paiement ?")) {
      return;
    }

    try {
      await remove("payments",id);

      await recalcInvoicePaid(
        payment.invoice_id
      );

      await audit(
        "delete",
        "payments",
        id,
        payment
      );

      await syncCloud();

      render();

      toast(
        "Paiement supprimé.",
        "success"
      );
    } catch (error) {
      toast(
        error.message || "Erreur.",
        "error"
      );
    }
  }

  async function stockMovement(stockId) {
    const item =
      (state.db.stock_items || []).find(
        x => x.id === stockId
      );

    if (!item) return;

    const types =
      role() === "employee"
        ? [
            ["use","Utilisation"],
            ["return","Retour"]
          ]
        : [
            ["entry","Entrée"],
            ["exit","Sortie"],
            ["use","Utilisation"],
            ["return","Retour"],
            ["adjustment","Ajustement"]
          ];

    openModal(`
      <div class="modal-header">
        <h2>
          Mouvement — ${esc(item.name)}
        </h2>

        <button data-action="close-modal">×</button>
      </div>

      <form id="stock-movement-form">
        <label>
          Type
          <select name="movement_type">
            ${types.map(([k,l]) => `
              <option value="${k}">
                ${l}
              </option>
            `).join("")}
          </select>
        </label>

        <label>
          Quantité
          <input
            type="number"
            name="quantity"
            min="0.01"
            step="0.01"
            required
          >
        </label>

        <label>
          Notes
          <textarea name="notes"></textarea>
        </label>

        <div class="modal-actions">
          <button
            type="button"
            data-action="close-modal">
            Annuler
          </button>

          <button
            type="submit"
            class="primary">
            Enregistrer
          </button>
        </div>
      </form>
    `);

    document.getElementById(
      "stock-movement-form"
    ).onsubmit = async e => {
      e.preventDefault();

      const fd =
        new FormData(e.currentTarget);

      const payload = {
        stock_item_id:stockId,
        movement_type:fd.get("movement_type"),
        quantity:Number(
          fd.get("quantity") || 0
        ),
        notes:fd.get("notes") || null
      };

      try {
        if (hasCloud) {
          const { error } =
            await sb.rpc(
              "create_stock_movement",
              {
                p_stock_item_id:stockId,
                p_movement_type:payload.movement_type,
                p_quantity:payload.quantity,
                p_project_id:null,
                p_activity_id:null,
                p_employee_id:userId(),
                p_notes:payload.notes
              }
            );

          if (error) throw error;
        } else {
          const itemIndex =
            state.db.stock_items.findIndex(
              x => x.id === stockId
            );

          const current =
            Number(
              state.db.stock_items[itemIndex].quantity || 0
            );

          let next = current;

          if (
            ["entry","return"].includes(
              payload.movement_type
            )
          ) {
            next += payload.quantity;
          } else if (
            ["exit","use"].includes(
              payload.movement_type
            )
          ) {
            next -= payload.quantity;
          } else {
            next = payload.quantity;
          }

          state.db.stock_items[itemIndex].quantity =
            Math.max(0,next);

          state.db.stock_movements.push({
            id:crypto.randomUUID(),
            ...payload,
            user_id:userId(),
            created_at:now()
          });

          saveLocal();
        }

        await syncCloud();

        closeModal();
        render();

        toast(
          "Mouvement enregistré.",
          "success"
        );
      } catch (error) {
        toast(
          error.message ||
          "Erreur de mouvement.",
          "error"
        );
      }
    };
  }

  async function createEmployee() {
    if (!isAdmin()) return;

    openModal(`
      <div class="modal-header">
        <h2>Créer un compte employé</h2>
        <button data-action="close-modal">×</button>
      </div>

      <form id="employee-form">
        <label>
          Nom complet
          <input name="full_name" required>
        </label>

        <label>
          Téléphone
          <input name="phone">
        </label>

        <label>
          E-mail
          <input
            type="email"
            name="email"
            required
          >
        </label>

        <label>
          Mot de passe initial
          <input
            type="password"
            name="password"
            minlength="8"
            required
          >
        </label>

        <label>
          Confirmation
          <input
            type="password"
            name="password2"
            minlength="8"
            required
          >
        </label>

        <div class="modal-actions">
          <button
            type="button"
            data-action="close-modal">
            Annuler
          </button>

          <button
            type="submit"
            class="primary">
            Créer le compte
          </button>
        </div>
      </form>
    `);

    document.getElementById(
      "employee-form"
    ).onsubmit = async e => {
      e.preventDefault();

      const fd =
        new FormData(e.currentTarget);

      const password =
        fd.get("password");

      const password2 =
        fd.get("password2");

      if (password !== password2) {
        toast(
          "Les mots de passe ne correspondent pas.",
          "error"
        );
        return;
      }

      if (!hasCloud) {
        toast(
          "La création réelle de comptes nécessite Supabase.",
          "error"
        );
        return;
      }

      try {
        const session =
          await sb.auth.getSession();

        const token =
          session.data.session?.access_token;

        const response =
          await fetch(
            `${cfg.SUPABASE_URL}/functions/v1/create-employee`,
            {
              method:"POST",
              headers:{
                "Authorization":`Bearer ${token}`,
                "Content-Type":"application/json",
                "apikey":cfg.SUPABASE_ANON_KEY
              },
              body:JSON.stringify({
                full_name:fd.get("full_name"),
                phone:fd.get("phone"),
                email:fd.get("email"),
                password
              })
            }
          );

        const result =
          await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
            "Création du compte impossible."
          );
        }

        await syncCloud();

        closeModal();
        render();

        toast(
          "Compte employé créé.",
          "success"
        );
      } catch (error) {
        toast(
          error.message || "Erreur.",
          "error"
        );
      }
    };
  }

  async function changeRole(id) {
    if (!isAdmin()) return;

    if (id === userId()) {
      toast(
        "Vous ne pouvez pas modifier votre propre rôle ici.",
        "error"
      );
      return;
    }

    const member =
      (state.db.profiles || []).find(
        x => x.id === id
      );

    if (!member) return;

    const selected =
      prompt(
        "Nouveau rôle : admin, manager ou employee",
        member.role || "employee"
      );

    if (
      !selected ||
      !["admin","manager","employee"].includes(selected)
    ) {
      return;
    }

    try {
      await update(
        "profiles",
        id,
        {role:selected}
      );

      await audit(
        "update",
        "profiles",
        id,
        {role:selected}
      );

      await syncCloud();
      render();

      toast(
        "Rôle modifié.",
        "success"
      );
    } catch (error) {
      toast(
        error.message || "Erreur.",
        "error"
      );
    }
  }

  async function toggleMember(id) {
    if (!isAdmin()) return;

    if (id === userId()) {
      toast(
        "Vous ne pouvez pas désactiver votre propre compte.",
        "error"
      );
      return;
    }

    const member =
      (state.db.profiles || []).find(
        x => x.id === id
      );

    if (!member) return;

    try {
      await update(
        "profiles",
        id,
        {
          active:member.active === false
        }
      );

      await audit(
        "update",
        "profiles",
        id,
        {
          active:member.active === false
        }
      );

      await syncCloud();
      render();
    } catch (error) {
      toast(
        error.message || "Erreur.",
        "error"
      );
    }
  }

  async function deleteRecord(table,id) {
    if (!confirm(
      "Supprimer définitivement cet élément ?"
    )) {
      return;
    }

    try {
      const old =
        (state.db[table] || []).find(
          x => x.id === id
        );

      await remove(table,id);

      await audit(
        "delete",
        table,
        id,
        old || {}
      );

      await syncCloud();
      render();

      toast(
        "Élément supprimé.",
        "success"
      );
    } catch (error) {
      toast(
        error.message ||
        "Suppression impossible.",
        "error"
      );
    }
  }

  function detailsDocument(table,id) {
    const isInvoice =
      table === "invoices";

    const parent =
      (state.db[table] || []).find(
        x => x.id === id
      );

    if (!parent) return;

    const itemTable =
      isInvoice
        ? "invoice_items"
        : "quote_items";

    const key =
      isInvoice
        ? "invoice_id"
        : "quote_id";

    const lines =
      (state.db[itemTable] || []).filter(
        x => x[key] === id
      );

    const client =
      (state.db.clients || []).find(
        x => x.id === parent.client_id
      );

    const status =
      isInvoice
        ? invoiceStatus(parent)
        : parent.status;

    openModal(`
      <div class="modal-header">
        <h2>
          ${isInvoice ? "Facture" : "Devis"}
          ${esc(
            parent.invoice_number ||
            parent.quote_number ||
            ""
          )}
        </h2>

        <button data-action="close-modal">×</button>
      </div>

      <p>
        <strong>Client :</strong>
        ${esc(
          client?.company_name ||
          client?.full_name ||
          "—"
        )}
      </p>

      <p>
        <strong>Date :</strong>
        ${esc(parent.issue_date || "—")}
      </p>

      ${
        isInvoice
          ? `
            <p>
              <strong>Échéance :</strong>
              ${esc(parent.due_date || "—")}
            </p>
          `
          : ""
      }

      <p>
        <strong>Statut :</strong>
        ${esc(labels[status] || status || "—")}
      </p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Qté</th>
              <th>Unité</th>
              <th>PU</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            ${
              lines.map(line => `
                <tr>
                  <td>${esc(line.description || "—")}</td>
                  <td>${esc(line.quantity)}</td>
                  <td>${esc(line.unit || "pièce")}</td>
                  <td>${money(line.unit_price)}</td>
                  <td>${money(line.amount)}</td>
                </tr>
              `)
              .join("")
              || `<tr><td colspan="5">Aucune ligne.</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="document-totals">
        <div>
          Sous-total :
          <strong>${money(parent.subtotal)}</strong>
        </div>

        <div>
          Remise :
          <strong>${money(parent.discount)}</strong>
        </div>

        <div>
          Taxe :
          <strong>${money(parent.tax)}</strong>
        </div>

        <div>
          Total :
          <strong>${money(parent.total)}</strong>
        </div>

        ${
          isInvoice
            ? `
              <div>
                Payé :
                <strong>${money(parent.amount_paid)}</strong>
              </div>

              <div>
                Reste :
                <strong>
                  ${money(
                    Math.max(
                      0,
                      Number(parent.total || 0) -
                      Number(parent.amount_paid || 0)
                    )
                  )}
                </strong>
              </div>
            `
            : ""
        }
      </div>

      <div class="modal-actions">
        <button data-action="close-modal">
          Fermer
        </button>

        <button
          data-action="edit"
          data-table="${table}"
          data-id="${id}">
          Modifier
        </button>
      </div>
    `);
  }

  function handleAction(e) {
    const el = e.currentTarget;

    const action =
      el.dataset.action;

    const table =
      el.dataset.table;

    const id =
      el.dataset.id;

    if (action === "close-modal") {
      return closeModal();
    }

    if (action === "add") {
      return openForm(table);
    }

    if (action === "edit") {
      return openForm(table,id);
    }

    if (action === "delete") {
      return deleteRecord(table,id);
    }

    if (action === "details") {
      return detailsDocument(table,id);
    }

    if (action === "payment") {
      return openPaymentForm(id);
    }

    if (action === "delete-payment") {
      return deletePayment(id);
    }

    if (action === "create-employee") {
      return createEmployee();
    }

    if (action === "change-role") {
      return changeRole(id);
    }

    if (action === "toggle-member") {
      return toggleMember(id);
    }

    if (action === "stock-movement") {
      return stockMovement(id);
    }

    if (action === "export-all") {
      return exportAllCsv();
    }

    if (action === "export-audit") {
      return exportAuditCsv();
    }

    if (action === "backup") {
      return backupAllData();
    }
  }

  function csvCell(value) {
    let text =
      value == null
        ? ""
        : String(value);

    if (typeof value === "object") {
      try {
        text = JSON.stringify(value);
      } catch {
        text = String(value);
      }
    }

    return `"${text.replaceAll('"','""')}"`;
  }

  function rowsToCsv(rows,columns) {
    const header =
      columns
        .map(c => csvCell(c.label))
        .join(";");

    const body =
      rows.map(row =>
        columns
          .map(c => csvCell(row[c.key]))
          .join(";")
      );

    return "\uFEFF" +
      [header,...body].join("\r\n");
  }

  function downloadFile(
    filename,
    content,
    type = "text/plain;charset=utf-8"
  ) {
    const blob =
      new Blob([content],{type});

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  function exportAllCsv() {
    const sections = [];

    const configs = {
      clients:[
        "id","full_name","company_name",
        "phone","email","address","city","active"
      ],

      quotes:[
        "id","quote_number","client_id",
        "issue_date","valid_until","status",
        "subtotal","discount","tax","total"
      ],

      invoices:[
        "id","invoice_number","client_id",
        "quote_id","issue_date","due_date",
        "status","subtotal","discount",
        "tax","total","amount_paid","amount_due"
      ],

      payments:[
        "id","invoice_id","amount",
        "payment_method","payment_date",
        "reference","notes"
      ],

      sales:[
        "id","date","description",
        "amount","payment_method",
        "client_id","notes"
      ],

      purchases:[
        "id","date","description",
        "amount","supplier","notes"
      ],

      expenses:[
        "id","date","category",
        "description","amount",
        "payment_method","notes"
      ],

      stock_items:[
        "id","name","sku","quantity",
        "min_quantity","unit",
        "location","notes"
      ],

      activities:[
        "id","date","title",
        "description","status"
      ],

      projects:[
        "id","name","client_id",
        "start_date","end_date",
        "status","description"
      ],

      innovations:[
        "id","title",
        "description","status"
      ]
    };

    Object.entries(configs).forEach(
      ([table,keys]) => {
        const rows =
          state.db[table] || [];

        if (!rows.length) return;

        sections.push(
          `\r\n### ${table.toUpperCase()}\r\n`
        );

        sections.push(
          rowsToCsv(
            rows,
            keys.map(key => ({
              key,
              label:key
            }))
          )
        );
      }
    );

    downloadFile(
      `luc-bricotech-export-${today()}.csv`,
      sections.join("\r\n"),
      "text/csv;charset=utf-8"
    );

    toast(
      "Export CSV généré.",
      "success"
    );
  }

  function exportAuditCsv() {
    const rows =
      state.db.audit_logs || [];

    const columns = [
      {key:"created_at",label:"Date"},
      {key:"user_id",label:"Utilisateur"},
      {key:"action",label:"Action"},
      {key:"table_name",label:"Table"},
      {key:"record_id",label:"ID"},
      {key:"details",label:"Détails"}
    ];

    downloadFile(
      `luc-bricotech-audit-${today()}.csv`,
      rowsToCsv(rows,columns),
      "text/csv;charset=utf-8"
    );
  }

  function backupAllData() {
    const content =
      JSON.stringify(
        {
          exported_at:now(),
          company:"LUC BRICO-TECH",
          data:state.db
        },
        null,
        2
      );

    downloadFile(
      `luc-bricotech-backup-${today()}.json`,
      content,
      "application/json;charset=utf-8"
    );

    toast(
      "Sauvegarde JSON générée.",
      "success"
    );
  }

  async function saveSettings() {
    const form =
      document.getElementById(
        "settings-form"
      );

    if (!form) return;

    const fd =
      new FormData(form);

    const payload = {
      company_name:
        fd.get("company_name") || "",

      company_address:
        fd.get("company_address") || "",

      company_phone:
        fd.get("company_phone") || ""
    };

    try {
      if (!hasCloud) {
        const current =
          state.db.settings.find(
            x => x.user_id === userId()
          );

        if (current) {
          Object.assign(
            current,
            payload,
            {updated_at:now()}
          );
        } else {
          state.db.settings.push({
            id:crypto.randomUUID(),
            user_id:userId(),
            ...payload,
            updated_at:now()
          });
        }

        saveLocal();
      } else {
        const { data,error } =
          await sb
            .from("settings")
            .upsert(
              {
                user_id:userId(),
                ...payload,
                updated_at:now()
              },
              {
                onConflict:"user_id"
              }
            )
            .select()
            .single();

        if (error) throw error;

        state.db.settings =
          state.db.settings.filter(
            x => x.user_id !== userId()
          );

        state.db.settings.push(data);
      }

      await audit(
        "update",
        "settings",
        null,
        payload
      );

      toast(
        "Paramètres enregistrés.",
        "success"
      );

      render();
    } catch (error) {
      toast(
        error.message ||
        "Erreur lors de l'enregistrement.",
        "error"
      );
    }
  }

  async function logout() {
    if (hasCloud) {
      await sb.auth.signOut();
    }

    window.location.href =
      "./login.html";
  }

  function bindPage() {
    document.querySelectorAll(
      "[data-page]"
    ).forEach(button => {
      button.onclick = () => {
        const page =
          button.dataset.page;

        if (!canSee(page)) return;

        state.page = page;

        closeMobileMenu();

        render();
      };
    });

    document.querySelectorAll(
      "[data-action]"
    ).forEach(el => {
      el.onclick = handleAction;
    });

    const menuBtn =
      document.getElementById(
        "menuBtn"
      );

    if (menuBtn) {
      menuBtn.onclick =
        toggleMobileMenu;
    }

    const overlay =
      document.querySelector(
        ".mobile-overlay"
      );

    if (overlay) {
      overlay.onclick =
        closeMobileMenu;
    }

    const logoutBtn =
      document.getElementById(
        "logoutBtn"
      );

    if (logoutBtn) {
      logoutBtn.onclick =
        logout;
    }

    const settingsForm =
      document.getElementById(
        "settings-form"
      );

    if (settingsForm) {
      settingsForm.onsubmit =
        e => {
          e.preventDefault();
          saveSettings();
        };
    }
  }

  function boot() {
    secureBoot()
      .then(() => {
        bindPage();
      })
      .catch(error => {
        console.error(error);

        if (!hasCloud) {
          loadLocal();
          render();
          bindPage();
        } else {
          document.body.innerHTML =
            `<div style="padding:40px;font-family:Arial">
              <h2>Erreur de démarrage</h2>
              <p>${esc(error.message || error)}</p>
            </div>`;
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      boot
    );
  } else {
    boot();
  }

})();
