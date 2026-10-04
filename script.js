(() => {
"use strict";

/* =========================================================
   LUC BRICO-TECH — SCRIPT.JS COMPLET
   Gestion • Supervision • Clients • Devis • Factures
   Paiements • Stock • Membres • Rapports • Cartes QR
   ========================================================= */

const CFG = window.LBT_CONFIG || {};

const hasCloud =
  !!(
    CFG.SUPABASE_URL &&
    CFG.SUPABASE_ANON_KEY &&
    window.supabase
  );

const sb = hasCloud
  ? window.supabase.createClient(
      CFG.SUPABASE_URL,
      CFG.SUPABASE_ANON_KEY
    )
  : null;

const DBKEY = "lbt_v3_demo";

/* =========================================================
   SCHÉMAS
   ========================================================= */

const schemas = {

sales: {
  title: "Nouvelle vente",
  fields: [
    ["customer","Client","text",true],
    ["item","Article / service","text",true],
    ["quantity","Quantité","number",true],
    ["amount","Montant (FCFA)","number",true],
    ["payment_method","Paiement","select",false,
      ["cash","mobile_money","bank","credit"]
    ],
    ["status","Statut","select",false,
      ["paid","pending","cancelled"]
    ],
    ["notes","Notes","textarea",false]
  ]
},

purchases: {
  title: "Nouvel achat",
  fields: [
    ["supplier","Fournisseur","text",true],
    ["item","Article / service","text",true],
    ["quantity","Quantité","number",true],
    ["amount","Montant (FCFA)","number",true],
    ["status","Statut","select",false,
      ["paid","pending","cancelled"]
    ],
    ["notes","Notes","textarea",false]
  ]
},

expenses: {
  title: "Nouvelle dépense",
  fields: [
    ["category","Catégorie","text",true],
    ["description","Description","text",true],
    ["amount","Montant (FCFA)","number",true],
    ["payment_method","Mode de paiement","select",false,
      ["cash","mobile_money","bank","other"]
    ],
    ["notes","Notes","textarea",false]
  ]
},

activities: {
  title: "Nouvelle activité",
  fields: [
    ["title","Titre","text",true],
    ["description","Description","textarea",false],
    ["status","Statut","select",false,
      ["planned","in_progress","completed","cancelled"]
    ],
    ["amount","Montant (FCFA)","number",false],
    ["notes","Notes","textarea",false]
  ]
},

projects: {
  title: "Nouveau projet",
  fields: [
    ["name","Nom du projet","text",true],
    ["client","Client","text",false],
    ["description","Description","textarea",false],
    ["status","Statut","select",false,
      ["planned","in_progress","completed","cancelled"]
    ],
    ["budget","Budget (FCFA)","number",false],
    ["notes","Notes","textarea",false]
  ]
},

innovations: {
  title: "Nouvelle innovation",
  fields: [
    ["title","Titre","text",true],
    ["description","Description","textarea",false],
    ["status","Statut","select",false,
      ["idea","prototype","testing","deployed","rejected"]
    ],
    ["budget","Budget (FCFA)","number",false],
    ["notes","Notes","textarea",false]
  ]
},

stock_items: {
  title: "Nouvel article de stock",
  fields: [
    ["name","Article","text",true],
    ["sku","Référence","text",false],
    ["quantity","Quantité initiale","number",true],
    ["min_quantity","Seuil minimum","number",false],
    ["unit","Unité","text",false],
    ["location","Emplacement","text",false],
    ["notes","Notes","textarea",false]
  ]
},

clients: {
  title: "Nouveau client",
  fields: [
    ["full_name","Nom complet","text",true],
    ["company_name","Entreprise","text",false],
    ["phone","Téléphone","text",false],
    ["email","E-mail","email",false],
    ["address","Adresse","text",false],
    ["city","Ville","text",false],
    ["notes","Notes","textarea",false]
  ]
}

};

/* =========================================================
   ÉTAT
   ========================================================= */

const state = {
  page: "dashboard",
  role: "admin",
  user: null,
  profile: null,
  cloud: hasCloud,
  db: loadLocal()
};

/* =========================================================
   TABLES
   ========================================================= */

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

/* =========================================================
   LOCAL DATABASE
   ========================================================= */

function loadLocal() {
  try {
    const raw = localStorage.getItem(DBKEY);

    if (raw) {
      const parsed = JSON.parse(raw);

      TABLES.forEach(table => {
        if (!Array.isArray(parsed[table])) {
          parsed[table] = [];
        }
      });

      return parsed;
    }
  } catch (e) {
    console.warn("Local database:", e);
  }

  return seed();
}

function saveLocal() {
  localStorage.setItem(
    DBKEY,
    JSON.stringify(state.db)
  );
}

function seed() {
  return {
    profiles: [
      {
        id: "demo-admin",
        full_name: "Lucien BESSAN",
        email: "demo@lucbricotech.local",
        phone: "",
        role: "admin",
        active: true,
        created_at: new Date().toISOString()
      }
    ],
    sales: [],
    purchases: [],
    expenses: [],
    stock_items: [],
    stock_movements: [],
    activities: [],
    projects: [],
    innovations: [],
    audit_logs: [],
    settings: [],
    clients: [],
    quotes: [],
    quote_items: [],
    invoices: [],
    invoice_items: [],
    payments: []
  };
}

/* =========================================================
   UTILITAIRES
   ========================================================= */

function toast(message) {
  const el = document.getElementById("toast");

  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 3500);
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function money(value) {
  return Number(value || 0)
    .toLocaleString("fr-FR") + " FCFA";
}

function uid() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
    .replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x"
        ? r
        : (r & 3 | 8);

      return v.toString(16);
    });
}

function now() {
  return new Date().toISOString();
}

function today() {
  return new Date()
    .toISOString()
    .slice(0,10);
}

/* =========================================================
   SUPABASE AUTH
   ========================================================= */

async function cloudSession() {

  if (!sb) return null;

  const {
    data,
    error
  } = await sb.auth.getSession();

  if (error) throw error;

  return data.session;
}

/* =========================================================
   BOOT
   ========================================================= */

async function boot() {

  try {

    if (hasCloud) {

      const session = await cloudSession();

      if (!session) {

        if (
          location.pathname.endsWith("login.html")
        ) {
          return;
        }

        location.href = "login.html";
        return;
      }

      state.user = session.user;

      const {
        data: profile,
        error
      } = await sb
        .from("profiles")
        .select("*")
        .eq("id",session.user.id)
        .single();

      if (
        error &&
        error.code !== "PGRST116"
      ) {
        throw error;
      }

      state.profile =
        profile ||
        {
          id: session.user.id,
          full_name:
            session.user.email || "Utilisateur",
          email: session.user.email || "",
          role: "employee",
          active: true
        };

      if (state.profile.active === false) {

        toast("Compte désactivé.");

        await sb.auth.signOut();

        location.href = "login.html";

        return;
      }

      state.role =
        state.profile.role || "employee";

      await syncCloud();

    } else {

      state.user = {
        id: "demo-admin",
        email: "demo@lucbricotech.local"
      };

      state.profile =
        state.db.profiles[0];

      state.role = "admin";
    }

    const userName =
      document.getElementById("userName");

    const userRole =
      document.getElementById("userRole");

    const modeBadge =
      document.getElementById("modeBadge");

    if (userName) {
      userName.textContent =
        state.profile.full_name ||
        state.user.email ||
        "Utilisateur";
    }

    if (userRole) {
      userRole.textContent =
        String(state.role).toUpperCase();
    }

    if (modeBadge) {
      modeBadge.textContent =
        state.cloud
          ? "SUPABASE"
          : "MODE DÉMO";
    }

    bind();
    applyRoleNavigation();
    render();

  } catch (err) {

    console.error("BOOT ERROR:",err);

    const content =
      document.getElementById("content");

    if (content) {

      content.innerHTML = `
        <div class="card">
          <h2>Erreur de connexion</h2>
          <p>${esc(
            err?.message ||
            "Une erreur est survenue."
          )}</p>
        </div>
      `;
    }
  }
}

/* =========================================================
   SYNCHRONISATION SUPABASE
   ========================================================= */

async function syncCloud() {

  for (const table of TABLES) {

    let query =
      sb
        .from(table)
        .select("*");

    if (table !== "settings") {

      query = query.order(
        "created_at",
        { ascending:false }
      );
    }

    const {
      data,
      error
    } = await query;

    if (!error && data) {

      state.db[table] = data;

    } else if (
      !Array.isArray(state.db[table])
    ) {

      state.db[table] = [];
    }
  }
}

/* =========================================================
   CRUD
   ========================================================= */

async function insert(table,payload) {

  const record = {
    ...payload,
    id: payload.id || uid()
  };

  if (
    TABLES_WITH_USER_ID.includes(table) &&
    state.user?.id
  ) {
    record.user_id = state.user.id;
  }

  if (!record.created_at) {
    record.created_at = now();
  }

  if (state.cloud) {

    const {
      data,
      error
    } = await sb
      .from(table)
      .insert(record)
      .select()
      .single();

    if (error) throw error;

    if (!Array.isArray(state.db[table])) {
      state.db[table] = [];
    }

    state.db[table].unshift(data);

    return data;
  }

  if (!Array.isArray(state.db[table])) {
    state.db[table] = [];
  }

  state.db[table].unshift(record);

  saveLocal();

  return record;
}

async function update(table,id,payload) {

  if (state.cloud) {

    const {
      data,
      error
    } = await sb
      .from(table)
      .update({
        ...payload,
        updated_at: now()
      })
      .eq("id",id)
      .select()
      .single();

    if (error) throw error;

    state.db[table] =
      (state.db[table] || [])
      .map(x =>
        x.id === id
          ? data
          : x
      );

    return data;
  }

  state.db[table] =
    (state.db[table] || [])
    .map(x =>
      x.id === id
        ? {
            ...x,
            ...payload,
            updated_at: now()
          }
        : x
    );

  saveLocal();

  return state.db[table]
    .find(x => x.id === id);
}

async function remove(table,id) {

  if (state.cloud) {

    const {
      error
    } = await sb
      .from(table)
      .delete()
      .eq("id",id);

    if (error) throw error;
  }

  state.db[table] =
    (state.db[table] || [])
    .filter(x => x.id !== id);

  if (!state.cloud) {
    saveLocal();
  }
}

/* =========================================================
   AUDIT
   ========================================================= */

async function audit(
  action,
  table,
  recordId,
  details=""
) {

  try {

    await insert("audit_logs",{
      action,
      table_name: table,
      record_id: recordId,
      details
    });

  } catch (error) {

    console.warn(
      "Audit log:",
      error
    );
  }
}

/* =========================================================
   RÔLES
   ========================================================= */

const ROLE_PAGES = {

  admin: [
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

  manager: [
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

  employee: [
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

function allowedPages() {
  return (
    ROLE_PAGES[state.role] ||
    ROLE_PAGES.employee
  );
}

function canManageStock() {
  return (
    state.role === "admin" ||
    state.role === "manager"
  );
}

function applyRoleNavigation() {

  document
    .querySelectorAll("#nav button")
    .forEach(button => {

      button.style.display =
        allowedPages()
          .includes(button.dataset.page)
          ? ""
          : "none";
    });
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function bind() {

  const nav =
    document.getElementById("nav");

  if (nav) {

    nav.onclick = event => {

      const button =
        event.target.closest(
          "button[data-page]"
        );

      if (!button) return;

      const page =
        button.dataset.page;

      if (!allowedPages().includes(page)) {

        toast("Accès non autorisé.");

        return;
      }

      state.page = page;

      closeMenu();

      render();
    };
  }

  const menuBtn =
    document.getElementById("menuBtn");

  if (menuBtn) {

    menuBtn.onclick = () => {

      document
        .getElementById("sidebar")
        ?.classList.toggle("open");
    };
  }

  document.addEventListener(
    "click",
    event => {

      const sidebar =
        document.getElementById("sidebar");

      const menu =
        document.getElementById("menuBtn");

      if (
        sidebar &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !menu?.contains(event.target)
      ) {
        sidebar.classList.remove("open");
      }
    }
  );

  document
    .getElementById("logoutBtn")
    ?.addEventListener(
      "click",
      logout
    );

  document
    .getElementById("closeModal")
    ?.addEventListener(
      "click",
      closeModal
    );
}

function closeMenu() {

  document
    .getElementById("sidebar")
    ?.classList.remove("open");
}

async function logout() {

  if (state.cloud && sb) {
    await sb.auth.signOut();
  }

  location.href = "login.html";
}

function setHeader(title,sub) {

  const titleEl =
    document.getElementById("pageTitle");

  const subEl =
    document.getElementById("pageSub");

  if (titleEl) {
    titleEl.textContent = title;
  }

  if (subEl) {
    subEl.textContent = sub;
  }
}

/* =========================================================
   RENDER PRINCIPAL
   ========================================================= */

function render() {

  applyRoleNavigation();

  if (
    !allowedPages()
      .includes(state.page)
  ) {
    state.page = "dashboard";
  }

  document
    .querySelectorAll("#nav button")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === state.page
      );
    });

  const map = {

    dashboard: [
      "Tableau de bord",
      "Vue générale de l’activité."
    ],

    members: [
      "Membres",
      "Utilisateurs et rôles."
    ],

    clients: [
      "Clients",
      "Gestion de la clientèle."
    ],

    quotes: [
      "Devis",
      "Préparation et suivi des devis."
    ],

    invoices: [
      "Factures",
      "Facturation et suivi des créances."
    ],

    payments: [
      "Paiements",
      "Suivi des règlements reçus."
    ],

    sales: [
      "Ventes",
      "Suivi des ventes et encaissements."
    ],

    purchases: [
      "Achats",
      "Achats auprès des fournisseurs."
    ],

    expenses: [
      "Dépenses",
      "Charges et dépenses."
    ],

    stock: [
      "Stock & matériel",
      "Articles, quantités et seuils."
    ],

    activities: [
      "Activités",
      "Interventions et opérations réalisées."
    ],

    projects: [
      "Projets",
      "Suivi des projets et chantiers."
    ],

    innovations: [
      "Innovations",
      "Idées, prototypes et solutions."
    ],

    reports: [
      "Rapports",
      "Synthèse financière et opérationnelle."
    ],

    audit: [
      "Journal",
      "Traçabilité des actions."
    ],

    settings: [
      "Paramètres",
      "Configuration de l’entreprise."
    ]

  };

  setHeader(
    ...(map[state.page] || map.dashboard)
  );

  const functions = {

    dashboard,
    members,
    clients: clientsPage,
    quotes: quotesPage,
    invoices: invoicesPage,
    payments: paymentsPage,
    sales: tablePage,
    purchases: tablePage,
    expenses: tablePage,
    stock,
    activities: tablePage,
    projects: tablePage,
    innovations: tablePage,
    reports,
    audit: auditPage,
    settings

  };

  const fn =
    functions[state.page] ||
    dashboard;

  try {

    const content =
      document.getElementById("content");

    if (!content) return;

    content.innerHTML =
      fn(state.page);

    bindPage();

  } catch (error) {

    console.error(
      "Erreur render:",
      error
    );

    const content =
      document.getElementById("content");

    if (content) {

      content.innerHTML = `
        <div class="card">
          <h2>Erreur d'affichage</h2>
          <p>${esc(
            error.message ||
            "Erreur inconnue."
          )}</p>
        </div>
      `;
    }
  }
}

/* =========================================================
   TABLEAU DE BORD — CORRIGÉ
   ========================================================= */

function dashboard() {

  const sum = table =>
    (state.db[table] || [])
      .reduce(
        (total,row) =>
          total +
          Number(
            row.amount ||
            row.total ||
            0
          ),
        0
      );

  const stock =
    (state.db.stock_items || [])
      .reduce(
        (total,row) =>
          total +
          Number(row.quantity || 0),
        0
      );

  const lowStock =
    (state.db.stock_items || [])
      .filter(row =>
        Number(row.quantity || 0) <=
        Number(row.min_quantity || 0)
      ).length;

  const sales =
    sum("sales");

  const purchases =
    sum("purchases");

  const expenses =
    sum("expenses");

  const payments =
    sum("payments");

  const receivables =
    (state.db.invoices || [])
      .reduce(
        (total,row) =>
          total +
          Number(row.amount_due || 0),
        0
      );

  const clients =
    (state.db.clients || []).length;

  const invoices =
    (state.db.invoices || []).length;

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
    <strong>${money(sales)}</strong>
  </div>

  <div class="card kpi">
    <small>Achats</small>
    <strong>${money(purchases)}</strong>
  </div>

  <div class="card kpi">
    <small>Dépenses</small>
    <strong>${money(expenses)}</strong>
  </div>

  <div class="card kpi">
    <small>Stock total</small>
    <strong>${stock}</strong>
  </div>

</div>

<div
  class="grid kpis"
  style="margin-top:16px"
>

  <div class="card kpi">
    <small>Paiements reçus</small>
    <strong>${money(payments)}</strong>
  </div>

  <div class="card kpi">
    <small>Créances clients</small>
    <strong>${money(receivables)}</strong>
  </div>

  <div class="card kpi">
    <small>Alertes stock</small>
    <strong>${lowStock}</strong>
  </div>

  <div class="card kpi">
    <small>Clients</small>
    <strong>${clients}</strong>
  </div>

</div>

<div class="quick-strip">

  <div>

    <strong>
      Votre besoin, notre solution.
    </strong>

    <span>
      Centralisez les opérations et gardez
      une vision claire de l’activité.
    </span>

  </div>

  <div class="quick-actions">

    <button
      class="primary"
      data-add="sales"
    >
      + Vente
    </button>

    <button
      class="secondary"
      data-add="activities"
    >
      + Activité
    </button>

    <button
      class="secondary"
      data-add="projects"
    >
      + Projet
    </button>

  </div>

</div>

<div
  class="grid cards"
  style="margin-top:16px"
>

  <div class="card">

    <h3>
      Activités récentes
    </h3>

    ${recent(
      "activities",
      "title"
    )}

  </div>

  <div class="card">

    <h3>
      Projets
    </h3>

    ${recent(
      "projects",
      "name"
    )}

  </div>

  <div class="card">

    <h3>
      Innovations
    </h3>

    ${recent(
      "innovations",
      "title"
    )}

  </div>

</div>

<div
  class="grid cards"
  style="margin-top:16px"
>

  <div class="card">

    <h3>
      Situation financière
    </h3>

    <p>
      <strong>Ventes :</strong>
      ${money(sales)}
    </p>

    <p>
      <strong>Achats :</strong>
      ${money(purchases)}
    </p>

    <p>
      <strong>Dépenses :</strong>
      ${money(expenses)}
    </p>

    <p>
      <strong>Paiements reçus :</strong>
      ${money(payments)}
    </p>

  </div>

  <div class="card">

    <h3>
      Factures
    </h3>

    <p>
      <strong>${invoices}</strong>
      facture(s) enregistrée(s).
    </p>

    <p>
      <strong>${money(receivables)}</strong>
      à recouvrer.
    </p>

  </div>

  <div class="card">

    <h3>
      Stock
    </h3>

    <p>
      <strong>${stock}</strong>
      unité(s) enregistrée(s).
    </p>

    <p>
      <strong>${lowStock}</strong>
      article(s) sous le seuil.
    </p>

  </div>

</div>

`;
}

function recent(table,key) {

  const rows =
    (state.db[table] || [])
      .slice(0,5);

  if (!rows.length) {
    return `
      <div class="empty">
        Aucun élément.
      </div>
    `;
  }

  return rows
    .map(row => `

      <p>

        <strong>
          ${esc(
            row[key] ||
            "Sans titre"
          )}
        </strong>

        <br>

        <span class="muted">

          ${
            row.created_at
              ? new Date(
                  row.created_at
                ).toLocaleString("fr-FR")
              : ""
          }

        </span>

      </p>

    `)
    .join("");
}

/* =========================================================
   TABLEAUX
   ========================================================= */

function tablePage(table) {

  const configs = {

    sales: [
      "Ventes",
      "customer",
      "Client",
      "item",
      "Article / service"
    ],

    purchases: [
      "Achats",
      "supplier",
      "Fournisseur",
      "item",
      "Article / service"
    ],

    expenses: [
      "Dépenses",
      "category",
      "Catégorie",
      "description",
      "Description"
    ],

    activities: [
      "Activités",
      "title",
      "Titre",
      "description",
      "Description"
    ],

    projects: [
      "Projets",
      "name",
      "Nom",
      "description",
      "Description"
    ],

    innovations: [
      "Innovations",
      "title",
      "Titre",
      "description",
      "Description"
    ]

  };

  const cfg = configs[table];

  if (!cfg) {

    return `
      <div class="card">
        <p>
          Module indisponible.
        </p>
      </div>
    `;
  }

  const rows =
    state.db[table] || [];

  return `

<div class="page-actions">

  <button
    class="primary"
    data-add="${table}"
  >
    + Ajouter
  </button>

</div>

<div class="card table-card">

  <div class="table-wrap">

    <table>

      <thead>

        <tr>

          <th>
            ${esc(cfg[2])}
          </th>

          <th>
            ${esc(cfg[4])}
          </th>

          <th>
            Montant
          </th>

          <th>
            Statut
          </th>

          <th>
            Actions
          </th>

        </tr>

      </thead>

      <tbody>

        ${
          rows.length

          ?

          rows.map(row => `

            <tr>

              <td>
                ${esc(row[cfg[1]])}
              </td>

              <td>
                ${esc(row[cfg[3]])}
              </td>

              <td>
                ${money(
                  row.amount ||
                  row.budget ||
                  row.total ||
                  0
                )}
              </td>

              <td>
                ${esc(
                  row.status ||
                  "—"
                )}
              </td>

              <td>

                <button
                  class="secondary small"
                  data-edit="${table}:${row.id}"
                >
                  Modifier
                </button>

                <button
                  class="danger ghost small"
                  data-delete="${table}:${row.id}"
                >
                  Supprimer
                </button>

              </td>

            </tr>

          `).join("")

          :

          `
          <tr>
            <td colspan="5">
              <div class="empty">
                Aucune donnée.
              </div>
            </td>
          </tr>
          `
        }

      </tbody>

    </table>

  </div>

</div>

`;
}

/* =========================================================
   MEMBRES
   ========================================================= */

function members() {

  const rows =
    state.db.profiles || [];

  return `

<div class="page-actions">

  ${
    state.role === "admin"

      ?

      `
      <button
        class="primary"
        id="createEmployeeBtn"
      >
        + Créer un compte
      </button>
      `

      :

      ""
  }

</div>

<div class="card table-card">

  <div class="table-wrap">

    <table>

      <thead>

        <tr>
          <th>Nom</th>
          <th>Rôle</th>
          <th>Téléphone</th>
          <th>Statut</th>
          <th>Actions</th>
        </tr>

      </thead>

      <tbody>

        ${
          rows.length

          ?

          rows.map(profile => `

            <tr>

              <td>

                <strong>
                  ${esc(
                    profile.full_name ||
                    "Sans nom"
                  )}
                </strong>

              </td>

              <td>

                <span class="badge">

                  ${esc(
                    String(
                      profile.role ||
                      "employee"
                    ).toUpperCase()
                  )}

                </span>

              </td>

              <td>
                ${esc(
                  profile.phone ||
                  "—"
                )}
              </td>

              <td>

                <span
                  class="
                    badge
                    ${
                      profile.active === false
                        ? "danger"
                        : "success"
                    }
                  "
                >

                  ${
                    profile.active === false
                      ? "Inactif"
                      : "Actif"
                  }

                </span>

              </td>

              <td>

                <button
                  class="secondary small"
                  data-employee-card="${esc(profile.id)}"
                >
                  🪪 Carte
                </button>

                ${
                  state.role === "admin"

                    ?

                    `
                    <button
                      class="secondary small"
                      data-role="${esc(profile.id)}"
                    >
                      Rôle
                    </button>

                    <button
                      class="secondary small"
                      data-toggle-active="${esc(profile.id)}"
                    >
                      ${
                        profile.active === false
                          ? "Activer"
                          : "Désactiver"
                      }
                    </button>
                    `

                    :

                    ""
                }

              </td>

            </tr>

          `).join("")

          :

          `
          <tr>
            <td colspan="5">
              <div class="empty">
                Aucun membre.
              </div>
            </td>
          </tr>
          `
        }

      </tbody>

    </table>

  </div>

</div>

`;
}

/* =========================================================
   CLIENTS
   ========================================================= */

function clientsPage() {

  const rows =
    state.db.clients || [];

  return `

<div class="page-actions">

  <button
    class="primary"
    data-add="clients"
  >
    + Nouveau client
  </button>

</div>

<div class="grid cards">

  ${
    rows.length

      ?

      rows.map(client => `

        <div class="card">

          <h3>
            ${esc(
              client.full_name ||
              "Client"
            )}
          </h3>

          <p>
            ${esc(
              client.company_name ||
              ""
            )}
          </p>

          <p>
            ${esc(
              client.phone ||
              ""
            )}
          </p>

          <p>
            ${esc(
              client.email ||
              ""
            )}
          </p>

          <div class="card-actions">

            <button
              class="secondary small"
              data-edit="clients:${client.id}"
            >
              Modifier
            </button>

            <button
              class="danger ghost small"
              data-delete="clients:${client.id}"
            >
              Supprimer
            </button>

          </div>

        </div>

      `).join("")

      :

      `
      <div class="card">
        <div class="empty">
          Aucun client.
        </div>
      </div>
      `
  }

</div>

`;
}

/* =========================================================
   DEVIS
   ========================================================= */

function quotesPage() {

  const rows =
    state.db.quotes || [];

  return documentPageList(
    "Devis",
    "quotes",
    rows,
    "quote_number",
    "client_id"
  );
}

/* =========================================================
   FACTURES
   ========================================================= */

function invoicesPage() {

  const rows =
    state.db.invoices || [];

  return documentPageList(
    "Factures",
    "invoices",
    rows,
    "invoice_number",
    "client_id"
  );
}

function documentPageStatus(status) {

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
    overdue: "En retard"

  };

  return (
    labels[status] ||
    status ||
    "—"
  );
}

function documentPageList(
  title,
  table,
  rows,
  numberKey,
  clientKey
) {

  return `

<div class="page-actions">

  <button
    class="primary"
    data-add="${table}"
  >
    + ${
      title === "Devis"
        ? "Nouveau devis"
        : "Nouvelle facture"
    }
  </button>

</div>

<div class="card table-card">

  <div class="table-wrap">

    <table>

      <thead>

        <tr>
          <th>N°</th>
          <th>Client</th>
          <th>Date</th>
          <th>Total</th>
          <th>Statut</th>
          <th>Actions</th>
        </tr>

      </thead>

      <tbody>

        ${
          rows.length

          ?

          rows.map(row => {

            const client =
              (state.db.clients || [])
                .find(
                  c =>
                    c.id ===
                    row[clientKey]
                );

            return `

              <tr>

                <td>
                  <strong>
                    ${esc(
                      row[numberKey] ||
                      "—"
                    )}
                  </strong>
                </td>

                <td>
                  ${esc(
                    client?.full_name ||
                    client?.company_name ||
                    "Client"
                  )}
                </td>

                <td>
                  ${esc(
                    row.issue_date ||
                    "—"
                  )}
                </td>

                <td>
                  ${money(
                    row.total || 0
                  )}
                </td>

                <td>

                  <span
                    class="
                      badge
                      ${
                        row.status === "paid"
                          ? "success"
                          : row.status === "overdue"
                            ? "danger"
                            : row.status === "partial"
                              ? "warn"
                              : ""
                      }
                    "
                  >
                    ${esc(
                      documentPageStatus(
                        row.status
                      )
                    )}
                  </span>

                </td>

                <td>

                  <button
                    class="secondary small"
                    data-details-document="${table}:${row.id}"
                  >
                    Détails
                  </button>

                  <button
                    class="secondary small"
                    data-edit-document="${table}:${row.id}"
                  >
                    Modifier
                  </button>

                  ${
                    table === "invoices"

                      ?

                      `
                      <button
                        class="primary small"
                        data-add-payment="${row.id}"
                      >
                        + Paiement
                      </button>
                      `

                      :

                      ""
                  }

                  <button
                    class="danger ghost small"
                    data-delete="${table}:${row.id}"
                  >
                    Supprimer
                  </button>

                </td>

              </tr>

            `;
          }).join("")

          :

          `
          <tr>
            <td colspan="6">
              <div class="empty">
                Aucun document.
              </div>
            </td>
          </tr>
          `
        }

      </tbody>

    </table>

  </div>

</div>

`;
}

/* =========================================================
   PAIEMENTS
   ========================================================= */

function paymentsPage() {

  const rows =
    state.db.payments || [];

  return `

<div class="page-actions">

  <button
    class="primary"
    id="addPaymentPageBtn"
  >
    + Nouveau paiement
  </button>

</div>

<div class="card table-card">

  <div class="table-wrap">

    <table>

      <thead>

        <tr>
          <th>Facture</th>
          <th>Montant</th>
          <th>Mode</th>
          <th>Date</th>
          <th>Référence</th>
          <th>Actions</th>
        </tr>

      </thead>

      <tbody>

        ${
          rows.length

          ?

          rows.map(payment => {

            const invoice =
              (state.db.invoices || [])
                .find(
                  invoice =>
                    invoice.id ===
                    payment.invoice_id
                );

            return `

              <tr>

                <td>
                  ${esc(
                    invoice?.invoice_number ||
                    "—"
                  )}
                </td>

                <td>
                  ${money(
                    payment.amount
                  )}
                </td>

                <td>
                  ${esc(
                    paymentMethodLabel(
                      payment.payment_method
                    )
                  )}
                </td>

                <td>
                  ${esc(
                    payment.payment_date ||
                    "—"
                  )}
                </td>

                <td>
                  ${esc(
                    payment.reference ||
                    "—"
                  )}
                </td>

                <td>

                  <button
                    class="danger ghost small"
                    data-delete-payment="${payment.id}"
                  >
                    Supprimer
                  </button>

                </td>

              </tr>

            `;
          }).join("")

          :

          `
          <tr>
            <td colspan="6">
              <div class="empty">
                Aucun paiement.
              </div>
            </td>
          </tr>
          `
        }

      </tbody>

    </table>

  </div>

</div>

`;
}

function paymentMethodLabel(value) {

  return {

    cash: "Espèces",
    mtn_momo: "MTN MoMo",
    moov_money: "Moov Money",
    celtiis_cash: "Celtiis Cash",
    bank_transfer: "Virement bancaire",
    card: "Carte bancaire",
    check: "Chèque bancaire",
    pi_spi: "PI-SPI",
    other: "Autre",

    mobile_money: "Mobile Money",
    bank: "Virement bancaire",
    credit: "Crédit"

  }[value] || value || "—";
}

/* =========================================================
   RAPPORTS
   ========================================================= */

function reports() {

  const sales =
    (state.db.sales || [])
      .reduce(
        (a,x) =>
          a + Number(x.amount || 0),
        0
      );

  const purchases =
    (state.db.purchases || [])
      .reduce(
        (a,x) =>
          a + Number(x.amount || 0),
        0
      );

  const expenses =
    (state.db.expenses || [])
      .reduce(
        (a,x) =>
          a + Number(x.amount || 0),
        0
      );

  const payments =
    (state.db.payments || [])
      .reduce(
        (a,x) =>
          a + Number(x.amount || 0),
        0
      );

  const result =
    sales -
    purchases -
    expenses;

  return `

<div class="grid kpis">

  <div class="card kpi">
    <small>Ventes</small>
    <strong>
      ${money(sales)}
    </strong>
  </div>

  <div class="card kpi">
    <small>Achats</small>
    <strong>
      ${money(purchases)}
    </strong>
  </div>

  <div class="card kpi">
    <small>Dépenses</small>
    <strong>
      ${money(expenses)}
    </strong>
  </div>

  <div class="card kpi">
    <small>Paiements reçus</small>
    <strong>
      ${money(payments)}
    </strong>
  </div>

</div>

<div class="card">

  <h3>
    Résultat estimatif
  </h3>

  <strong>
    ${money(result)}
  </strong>

</div>

`;
}

/* =========================================================
   AUDIT
   ========================================================= */

function auditPage() {

  const rows =
    state.db.audit_logs || [];

  return `

<div class="card table-card">

  <div class="table-wrap">

    <table>

      <thead>

        <tr>
          <th>Date</th>
          <th>Action</th>
          <th>Table</th>
          <th>Détails</th>
        </tr>

      </thead>

      <tbody>

        ${
          rows.length

          ?

          rows
            .slice(0,100)
            .map(row => `

              <tr>

                <td>
                  ${esc(
                    row.created_at ||
                    ""
                  )}
                </td>

                <td>
                  ${esc(
                    row.action ||
                    ""
                  )}
                </td>

                <td>
                  ${esc(
                    row.table_name ||
                    ""
                  )}
                </td>

                <td>
                  ${esc(
                    row.details ||
                    ""
                  )}
                </td>

              </tr>

            `)
            .join("")

          :

          `
          <tr>
            <td colspan="4">
              <div class="empty">
                Aucune action.
              </div>
            </td>
          </tr>
          `
        }

      </tbody>

    </table>

  </div>

</div>

`;
}

/* =========================================================
   PARAMÈTRES
   ========================================================= */

function settings() {

  const current =
    (state.db.settings || [])
      .find(
        x =>
          x.user_id ===
          state.user?.id
      ) || {};

  return `

<div class="card">

  <h3>
    Paramètres
  </h3>

  <form id="settingsForm">

    <label>
      Nom de l'entreprise

      <input
        name="company_name"
        value="${esc(
          current.company_name ||
          "LUC BRICO-TECH"
        )}"
      >

    </label>

    <label>
      Téléphone

      <input
        name="phone"
        value="${esc(
          current.phone ||
          ""
        )}"
      >

    </label>

    <label>
      Adresse

      <input
        name="address"
        value="${esc(
          current.address ||
          "Hévié Hounzévié, Abomey-Calavi"
        )}"
      >

    </label>

    <button
      class="primary"
      type="submit"
    >
      Enregistrer
    </button>

  </form>

</div>

`;
}

/* =========================================================
   BIND PAGE
   ========================================================= */

function bindPage() {

  document
    .querySelectorAll("[data-add]")
    .forEach(button => {

      button.onclick = () => {

        const table =
          button.dataset.add;

        if (
          table === "quotes" ||
          table === "invoices"
        ) {

          openDocumentForm(table);

          return;
        }

        openForm(table);
      };
    });

  document
    .querySelectorAll("[data-edit]")
    .forEach(button => {

      button.onclick = () => {

        const parts =
          button.dataset.edit
            .split(":");

        openForm(
          parts[0],
          parts[1]
        );
      };
    });

  document
    .querySelectorAll("[data-delete]")
    .forEach(button => {

      button.onclick = async () => {

        const parts =
          button.dataset.delete
            .split(":");

        const table = parts[0];
        const id = parts[1];

        if (
          !confirm(
            "Supprimer cet élément ?"
          )
        ) return;

        try {

          await remove(
            table,
            id
          );

          await audit(
            "delete",
            table,
            id
          );

          toast(
            "Élément supprimé."
          );

          render();

        } catch (error) {

          toast(
            error.message ||
            "Erreur."
          );
        }
      };
    });

  document
    .querySelectorAll("[data-employee-card]")
    .forEach(button => {

      button.onclick = () => {

        openEmployeeCard(
          button.dataset.employeeCard
        );
      };
    });

  document
    .querySelectorAll("[data-role]")
    .forEach(button => {

      button.onclick = async () => {

        const profile =
          findMemberProfile(
            button.dataset.role
          );

        if (!profile) return;

        const role =
          prompt(
            "Rôle : admin, manager ou employee",
            profile.role ||
            "employee"
          );

        if (
          ![
            "admin",
            "manager",
            "employee"
          ].includes(role)
        ) {
          return;
        }

        try {

          await update(
            "profiles",
            profile.id,
            { role }
          );

          await audit(
            "role_change",
            "profiles",
            profile.id,
            role
          );

          toast(
            "Rôle modifié."
          );

          render();

        } catch (error) {

          toast(
            error.message ||
            "Erreur."
          );
        }
      };
    });

  document
    .querySelectorAll(
      "[data-toggle-active]"
    )
    .forEach(button => {

      button.onclick = async () => {

        const profile =
          findMemberProfile(
            button.dataset.toggleActive
          );

        if (!profile) return;

        try {

          await update(
            "profiles",
            profile.id,
            {
              active:
                profile.active === false
            }
          );

          toast(
            "Statut modifié."
          );

          render();

        } catch (error) {

          toast(
            error.message ||
            "Erreur."
          );
        }
      };
    });

  document
    .querySelectorAll(
      "[data-edit-document]"
    )
    .forEach(button => {

      button.onclick = () => {

        const parts =
          button.dataset.editDocument
            .split(":");

        openDocumentForm(
          parts[0],
          parts[1]
        );
      };
    });

  document
    .querySelectorAll(
      "[data-details-document]"
    )
    .forEach(button => {

      button.onclick = () => {

        const parts =
          button.dataset.detailsDocument
            .split(":");

        openDocumentDetails(
          parts[0],
          parts[1]
        );
      };
    });

  document
    .querySelectorAll(
      "[data-add-payment]"
    )
    .forEach(button => {

      button.onclick = () => {

        openPaymentForm(
          button.dataset.addPayment
        );
      };
    });

  document
    .getElementById(
      "addPaymentPageBtn"
    )
    ?.addEventListener(
      "click",
      () => openPaymentForm()
    );

  document
    .querySelectorAll(
      "[data-delete-payment]"
    )
    .forEach(button => {

      button.onclick = async () => {

        if (
          !confirm(
            "Supprimer ce paiement ?"
          )
        ) return;

        try {

          await remove(
            "payments",
            button.dataset.deletePayment
          );

          toast(
            "Paiement supprimé."
          );

          render();

        } catch (error) {

          toast(
            error.message ||
            "Erreur."
          );
        }
      };
    });

  document
    .getElementById(
      "createEmployeeBtn"
    )
    ?.addEventListener(
      "click",
      openEmployeeForm
    );

  document
    .getElementById(
      "settingsForm"
    )
    ?.addEventListener(
      "submit",
      saveSettings
    );

  bindEmployeeCardButtons();
}

/* =========================================================
   MODALE
   ========================================================= */

function openModal(title,html) {

  const titleEl =
    document.getElementById(
      "modalTitle"
    );

  const form =
    document.getElementById(
      "recordForm"
    );

  const modal =
    document.getElementById(
      "modal"
    );

  if (!form || !modal) return;

  if (titleEl) {
    titleEl.textContent =
      title;
  }

  form.innerHTML =
    html;

  modal.classList.remove(
    "hidden"
  );
}

function closeModal() {

  document
    .getElementById("modal")
    ?.classList.add("hidden");
}

/* =========================================================
   CHAMPS
   ========================================================= */

function fieldHtml(
  field,
  value=""
) {

  const [
    name,
    label,
    type,
    required,
    options
  ] = field;

  if (type === "textarea") {

    return `

      <label>

        ${esc(label)}

        <textarea
          name="${esc(name)}"
          ${required ? "required" : ""}
        >${esc(value)}</textarea>

      </label>

    `;
  }

  if (type === "select") {

    return `

      <label>

        ${esc(label)}

        <select
          name="${esc(name)}"
        >

          <option value="">
            — Sélectionner —
          </option>

          ${(options || [])
            .map(option => `

              <option
                value="${esc(option)}"
                ${
                  String(value) ===
                  String(option)
                    ? "selected"
                    : ""
                }
              >
                ${
                  name ===
                  "payment_method"

                    ? paymentMethodLabel(
                        option
                      )

                    : esc(option)
                }
              </option>

            `)
            .join("")}

        </select>

      </label>

    `;
  }

  return `

    <label>

      ${esc(label)}

      <input
        type="${esc(type)}"
        name="${esc(name)}"
        value="${esc(value)}"
        ${required ? "required" : ""}
      >

    </label>

  `;
}

/* =========================================================
   FORMULAIRE GÉNÉRIQUE
   ========================================================= */

function openForm(
  table,
  id=null
) {

  const schema =
    schemas[table];

  if (!schema) return;

  const existing =
    id
      ? (state.db[table] || [])
          .find(
            x => x.id === id
          )
      : null;

  const html = `

    ${
      schema.fields
        .map(field =>
          fieldHtml(
            field,
            existing?.[field[0]] || ""
          )
        )
        .join("")
    }

    <div class="form-actions">

      <button
        type="button"
        class="secondary"
        id="cancelForm"
      >
        Annuler
      </button>

      <button
        type="submit"
        class="primary"
      >
        Enregistrer
      </button>

    </div>

  `;

  openModal(
    existing
      ? `Modifier — ${schema.title}`
      : schema.title,
    html
  );

  document
    .getElementById(
      "cancelForm"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .getElementById(
      "recordForm"
    )
    .onsubmit = async event => {

      event.preventDefault();

      const fd =
        new FormData(
          event.target
        );

      const payload = {};

      schema.fields
        .forEach(field => {

          const [
            name,
            ,
            type
          ] = field;

          let value =
            fd.get(name);

          if (type === "number") {

            value =
              value === ""
                ? 0
                : Number(value);
          }

          payload[name] =
            value;
        });

      try {

        if (id) {

          await update(
            table,
            id,
            payload
          );

          await audit(
            "update",
            table,
            id
          );

        } else {

          const created =
            await insert(
              table,
              payload
            );

          await audit(
            "create",
            table,
            created.id
          );
        }

        toast(
          "Enregistrement effectué."
        );

        closeModal();

        render();

      } catch (error) {

        console.error(error);

        toast(
          error.message ||
          "Erreur d'enregistrement."
        );
      }
    };
}

/* =========================================================
   CRÉATION EMPLOYÉ
   ========================================================= */

async function openEmployeeForm() {

  if (state.role !== "admin") {

    toast(
      "Seul l'administrateur peut créer un compte."
    );

    return;
  }

  openModal(
    "Créer un compte employé",
    `

      <label>
        Nom complet
        <input
          name="full_name"
          required
        >
      </label>

      <label>
        Téléphone
        <input name="phone">
      </label>

      <label>
        E-mail
        <input
          name="email"
          type="email"
          required
        >
      </label>

      <label>
        Mot de passe initial
        <input
          name="password"
          type="password"
          minlength="8"
          required
        >
      </label>

      <label>
        Confirmer le mot de passe
        <input
          name="password2"
          type="password"
          minlength="8"
          required
        >
      </label>

      <div class="form-actions">

        <button
          type="button"
          class="secondary"
          id="cancelForm"
        >
          Annuler
        </button>

        <button
          type="submit"
          class="primary"
        >
          Créer le compte
        </button>

      </div>

    `
  );

  document
    .getElementById(
      "cancelForm"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .getElementById(
      "recordForm"
    )
    .onsubmit = async event => {

      event.preventDefault();

      const fd =
        new FormData(
          event.target
        );

      const full_name =
        String(
          fd.get("full_name") || ""
        ).trim();

      const phone =
        String(
          fd.get("phone") || ""
        ).trim();

      const email =
        String(
          fd.get("email") || ""
        ).trim()
        .toLowerCase();

      const password =
        String(
          fd.get("password") || ""
        );

      const password2 =
        String(
          fd.get("password2") || ""
        );

      if (password !== password2) {

        toast(
          "Les mots de passe ne correspondent pas."
        );

        return;
      }

      if (password.length < 8) {

        toast(
          "Le mot de passe doit contenir au moins 8 caractères."
        );

        return;
      }

      try {

        if (state.cloud) {

          const session =
            await cloudSession();

          if (!session) {
            throw new Error(
              "Session expirée."
            );
          }

          const response =
            await fetch(
              `${CFG.SUPABASE_URL}/functions/v1/create-employee`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  "Authorization":
                    `Bearer ${session.access_token}`,
                  "apikey":
                    CFG.SUPABASE_ANON_KEY
                },
                body:
                  JSON.stringify({
                    full_name,
                    phone,
                    email,
                    password
                  })
              }
            );

          const result =
            await response.json();

          if (!response.ok) {

            throw new Error(
              result.error ||
              "Impossible de créer le compte."
            );
          }

          await syncCloud();

        } else {

          await insert(
            "profiles",
            {
              full_name,
              phone,
              email,
              role: "employee",
              active: true
            }
          );
        }

        toast(
          "Compte employé créé."
        );

        closeModal();

        render();

      } catch (error) {

        console.error(error);

        toast(
          error.message ||
          "Erreur de création."
        );
      }
    };
}

/* =========================================================
   DOCUMENTS — DEVIS / FACTURES
   ========================================================= */

function openDocumentForm(
  table,
  id=null
) {

  const isQuote =
    table === "quotes";

  const existing =
    id
      ? (state.db[table] || [])
          .find(
            x => x.id === id
          )
      : null;

  const clientOptions =
    (state.db.clients || [])
      .map(client => `

        <option
          value="${esc(client.id)}"
          ${
            existing?.client_id ===
            client.id
              ? "selected"
              : ""
          }
        >
          ${esc(
            client.full_name ||
            client.company_name ||
            "Client"
          )}
        </option>

      `)
      .join("");

  const itemsTable =
    isQuote
      ? "quote_items"
      : "invoice_items";

  const foreignKey =
    isQuote
      ? "quote_id"
      : "invoice_id";

  const lines =
    (state.db[itemsTable] || [])
      .filter(
        item =>
          item[foreignKey] === id
      );

  openModal(

    existing
      ? `Modifier ${
          isQuote
            ? "le devis"
            : "la facture"
        }`
      : `Nouveau ${
          isQuote
            ? "devis"
            : "facture"
        }`,

    `

      <label>

        Numéro

        <input
          name="document_number"
          value="${esc(
            existing?.[
              isQuote
                ? "quote_number"
                : "invoice_number"
            ] ||
            generateDocumentNumber(
              isQuote
                ? "quote"
                : "invoice"
            )
          )}"
          required
        >

      </label>

      <label>

        Client

        <select
          name="client_id"
          required
        >

          <option value="">
            — Sélectionner —
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
            existing?.issue_date ||
            today()
          )}"
          required
        >

      </label>

      <label>

        ${
          isQuote
            ? "Valable jusqu'au"
            : "Échéance"
        }

        <input
          type="date"
          name="${
            isQuote
              ? "valid_until"
              : "due_date"
          }"
          value="${esc(
            existing?.[
              isQuote
                ? "valid_until"
                : "due_date"
            ] || ""
          )}"
        >

      </label>

      <label>

        Statut

        <select name="status">

          ${
            (
              isQuote
                ? [
                    "draft",
                    "sent",
                    "accepted",
                    "rejected",
                    "expired",
                    "converted"
                  ]
                : [
                    "draft",
                    "unpaid",
                    "partial",
                    "paid",
                    "cancelled",
                    "overdue"
                  ]
            )
            .map(status => `

              <option
                value="${status}"
                ${
                  existing?.status === status
                    ? "selected"
                    : ""
                }
              >
                ${documentPageStatus(status)}
              </option>

            `)
            .join("")
          }

        </select>

      </label>

      <label>

        Titre

        <input
          name="title"
          value="${esc(
            existing?.title ||
            ""
          )}"
        >

      </label>

      <label>

        Description

        <textarea
          name="description"
        >${esc(
          existing?.description ||
          ""
        )}</textarea>

      </label>

      <div
        id="documentLinesEditor"
      ></div>

      <label>

        Remise

        <input
          type="number"
          name="discount"
          value="${Number(
            existing?.discount || 0
          )}"
          min="0"
        >

      </label>

      <label>

        Taxe

        <input
          type="number"
          name="tax"
          value="${Number(
            existing?.tax || 0
          )}"
          min="0"
        >

      </label>

      ${
        !isQuote
          ? `

            <label>

              Montant déjà payé

              <input
                type="number"
                name="amount_paid"
                value="${Number(
                  existing?.amount_paid || 0
                )}"
                min="0"
              >

            </label>

          `
          : ""
      }

      <label>

        Notes

        <textarea
          name="notes"
        >${esc(
          existing?.notes ||
          ""
        )}</textarea>

      </label>

      <div class="form-actions">

        <button
          type="button"
          class="secondary"
          id="cancelForm"
        >
          Annuler
        </button>

        <button
          type="submit"
          class="primary"
        >
          Enregistrer
        </button>

      </div>

    `
  );

  document
    .getElementById(
      "cancelForm"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  renderDocumentLines(
    document.getElementById(
      "documentLinesEditor"
    ),
    lines
  );

  document
    .getElementById(
      "recordForm"
    )
    .onsubmit = async event => {

      event.preventDefault();

      const fd =
        new FormData(
          event.target
        );

      const lineDraft =
        [
          ...document
            .querySelectorAll(
              ".document-line-row"
            )
        ]
        .map(row => ({

          description:
            row.querySelector(
              "[data-line-description]"
            )?.value || "",

          quantity:
            Number(
              row.querySelector(
                "[data-line-quantity]"
              )?.value || 0
            ),

          unit_price:
            Number(
              row.querySelector(
                "[data-line-price]"
              )?.value || 0
            )

        }))
        .filter(
          line =>
            line.description.trim()
        );

      const subtotal =
        lineDraft.reduce(
          (total,line) =>
            total +
            (
              line.quantity *
              line.unit_price
            ),
          0
        );

      const discount =
        Number(
          fd.get("discount") || 0
        );

      const tax =
        Number(
          fd.get("tax") || 0
        );

      const total =
        Math.max(
          0,
          subtotal -
          discount +
          tax
        );

      const payload = {

        client_id:
          fd.get("client_id"),

        [
          isQuote
            ? "quote_number"
            : "invoice_number"
        ]:
          fd.get("document_number"),

        issue_date:
          fd.get("issue_date"),

        [
          isQuote
            ? "valid_until"
            : "due_date"
        ]:
          fd.get(
            isQuote
              ? "valid_until"
              : "due_date"
          ) || null,

        status:
          fd.get("status"),

        title:
          fd.get("title"),

        description:
          fd.get("description"),

        subtotal,
        discount,
        tax,
        total,

        notes:
          fd.get("notes")
      };

      if (!isQuote) {

        const paid =
          Number(
            fd.get(
              "amount_paid"
            ) || 0
          );

        payload.amount_paid =
          paid;

        payload.amount_due =
          Math.max(
            0,
            total - paid
          );

        if (
          paid <= 0 &&
          payload.status === "paid"
        ) {
          payload.status =
            "unpaid";
        }

        if (
          paid > 0 &&
          paid < total
        ) {
          payload.status =
            "partial";
        }

        if (
          paid >= total &&
          total > 0
        ) {
          payload.status =
            "paid";
        }
      }

      try {

        let documentId = id;

        if (id) {

          await update(
            table,
            id,
            payload
          );

        } else {

          const created =
            await insert(
              table,
              payload
            );

          documentId =
            created.id;
        }

        if (state.cloud) {

          const {
            error
          } = await sb
            .from(itemsTable)
            .delete()
            .eq(
              foreignKey,
              documentId
            );

          if (error) {
            throw error;
          }
        }

        state.db[itemsTable] =
          (state.db[itemsTable] || [])
            .filter(
              item =>
                item[foreignKey] !==
                documentId
            );

        for (const line of lineDraft) {

          const item = {

            [foreignKey]:
              documentId,

            description:
              line.description,

            quantity:
              line.quantity,

            unit_price:
              line.unit_price,

            amount:
              line.quantity *
              line.unit_price,

            created_at:
              now()
          };

          if (state.cloud) {

            const {
              data,
              error
            } = await sb
              .from(itemsTable)
              .insert(item)
              .select()
              .single();

            if (error) {
              throw error;
            }

            state.db[
              itemsTable
            ].push(data);

          } else {

            item.id =
              uid();

            state.db[
              itemsTable
            ].push(item);
          }
        }

        if (!state.cloud) {
          saveLocal();
        }

        await audit(
          id
            ? "update"
            : "create",
          table,
          documentId,
          `${lineDraft.length} ligne(s)`
        );

        toast(
          "Document enregistré."
        );

        closeModal();

        render();

      } catch (error) {

        console.error(error);

        toast(
          error.message ||
          "Erreur d'enregistrement."
        );
      }
    };
}

function generateDocumentNumber(type) {

  const year =
    new Date()
      .getFullYear();

  const prefix =
    type === "quote"
      ? "DEV"
      : "FAC";

  const rows =
    type === "quote"
      ? (
          state.db.quotes ||
          []
        )
      : (
          state.db.invoices ||
          []
        );

  let max = 0;

  rows.forEach(row => {

    const number =
      row[
        type === "quote"
          ? "quote_number"
          : "invoice_number"
      ] || "";

    const match =
      String(number)
        .match(/(\d+)$/);

    if (match) {

      max =
        Math.max(
          max,
          Number(match[1])
        );
    }
  });

  return `${prefix}-${year}-${String(
    max + 1
  ).padStart(4,"0")}`;
}

/* =========================================================
   LIGNES DEVIS / FACTURES
   ========================================================= */

function renderDocumentLines(
  container,
  lines=[]
) {

  if (!container) return;

  container.innerHTML = `

    <div class="card">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px
        "
      >

        <h3>
          Lignes détaillées
        </h3>

        <button
          type="button"
          class="secondary small"
          id="addDocumentLine"
        >
          + Ligne
        </button>

      </div>

      <div id="documentLineRows"></div>

      <div
        style="
          margin-top:12px;
          text-align:right
        "
      >

        <strong>

          Sous-total :

          <span id="documentSubtotal">
            0 FCFA
          </span>

        </strong>

      </div>

    </div>

  `;

  const rows =
    container.querySelector(
      "#documentLineRows"
    );

  function addLine(line={}) {

    const row =
      document.createElement(
        "div"
      );

    row.className =
      "document-line-row";

    row.style.display =
      "grid";

    row.style.gridTemplateColumns =
      "1fr 80px 120px 120px 40px";

    row.style.gap =
      "8px";

    row.style.marginTop =
      "8px";

    row.innerHTML = `

      <input
        data-line-description
        placeholder="Désignation"
        value="${esc(
          line.description ||
          ""
        )}"
      >

      <input
        data-line-quantity
        type="number"
        min="0"
        step="0.01"
        placeholder="Qté"
        value="${Number(
          line.quantity ||
          1
        )}"
      >

      <input
        data-line-price
        type="number"
        min="0"
        step="0.01"
        placeholder="Prix unitaire"
        value="${Number(
          line.unit_price ||
          0
        )}"
      >

      <input
        data-line-total
        type="text"
        readonly
        value="${money(
          Number(
            line.quantity || 0
          ) *
          Number(
            line.unit_price || 0
          )
        )}"
      >

      <button
        type="button"
        class="danger ghost"
        data-remove-line
      >
        ×
      </button>

    `;

    rows.appendChild(
      row
    );

    const recalc = () => {

      const quantity =
        Number(
          row.querySelector(
            "[data-line-quantity]"
          )?.value || 0
        );

      const price =
        Number(
          row.querySelector(
            "[data-line-price]"
          )?.value || 0
        );

      row.querySelector(
        "[data-line-total]"
      ).value =
        money(
          quantity *
          price
        );

      let subtotal = 0;

      rows
        .querySelectorAll(
          ".document-line-row"
        )
        .forEach(currentRow => {

          subtotal +=
            Number(
              currentRow.querySelector(
                "[data-line-quantity]"
              )?.value || 0
            ) *
            Number(
              currentRow.querySelector(
                "[data-line-price]"
              )?.value || 0
            );
        });

      const subtotalEl =
        container.querySelector(
          "#documentSubtotal"
        );

      if (subtotalEl) {
        subtotalEl.textContent =
          money(subtotal);
      }
    };

    row
      .querySelectorAll("input")
      .forEach(input => {

        input.addEventListener(
          "input",
          recalc
        );
      });

    row.querySelector(
      "[data-remove-line]"
    ).onclick = () => {

      row.remove();

      recalc();
    };

    recalc();
  }

  (
    lines.length
      ? lines
      : [{}]
  ).forEach(addLine);

  container.querySelector(
    "#addDocumentLine"
  ).onclick = () =>
    addLine({});
}

/* =========================================================
   DÉTAIL DOCUMENT
   ========================================================= */

function openDocumentDetails(
  table,
  id
) {

  const row =
    (state.db[table] || [])
      .find(
        x => x.id === id
      );

  if (!row) return;

  const isQuote =
    table === "quotes";

  const items =
    state.db[
      isQuote
        ? "quote_items"
        : "invoice_items"
    ] || [];

  const lines =
    items.filter(
      item =>
        item[
          isQuote
            ? "quote_id"
            : "invoice_id"
        ] === id
    );

  const client =
    (state.db.clients || [])
      .find(
        x =>
          x.id ===
          row.client_id
      );

  openModal(

    `${
      isQuote
        ? "Devis"
        : "Facture"
    } ${
      row[
        isQuote
          ? "quote_number"
          : "invoice_number"
      ] || ""
    }`,

    `

      <div class="card">

        <h3>
          ${esc(
            row.title ||
            "Document"
          )}
        </h3>

        <p>
          <strong>
            Client :
          </strong>

          ${esc(
            client?.full_name ||
            client?.company_name ||
            "—"
          )}
        </p>

        <p>
          <strong>
            Date :
          </strong>

          ${esc(
            row.issue_date ||
            "—"
          )}
        </p>

        <p>
          <strong>
            Statut :
          </strong>

          ${esc(
            documentPageStatus(
              row.status
            )
          )}
        </p>

        <hr>

        ${
          lines.length

            ?

            lines.map(line => `

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  padding:8px 0;
                  border-bottom:1px solid #eee
                "
              >

                <span>
                  ${esc(
                    line.description
                  )}
                </span>

                <strong>
                  ${money(
                    line.amount
                  )}
                </strong>

              </div>

            `).join("")

            :

            `
            <div class="empty">
              Aucune ligne.
            </div>
            `
        }

        <hr>

        <p>
          <strong>
            Sous-total :
          </strong>

          ${money(
            row.subtotal
          )}
        </p>

        <p>
          <strong>
            Remise :
          </strong>

          ${money(
            row.discount
          )}
        </p>

        <p>
          <strong>
            Taxe :
          </strong>

          ${money(
            row.tax
          )}
        </p>

        <h3>
          Total :
          ${money(
            row.total
          )}
        </h3>

        ${
          !isQuote

            ?

            `

              <p>
                <strong>
                  Payé :
                </strong>

                ${money(
                  row.amount_paid ||
                  0
                )}
              </p>

              <p>
                <strong>
                  Reste :
                </strong>

                ${money(
                  row.amount_due ||
                  0
                )}
              </p>

            `

            :

            ""
        }

        <p>
          ${esc(
            row.notes ||
            ""
          )}
        </p>

      </div>

      <div class="form-actions">

        <button
          type="button"
          class="primary"
          id="closeDetails"
        >
          Fermer
        </button>

      </div>

    `
  );

  document
    .getElementById(
      "closeDetails"
    )
    ?.addEventListener(
      "click",
      closeModal
    );
}

/* =========================================================
   PAIEMENT
   ========================================================= */

function openPaymentForm(
  invoiceId=null
) {

  const invoices =
    state.db.invoices || [];

  const html = `

    <label>

      Facture

      <select
        name="invoice_id"
        required
      >

        <option value="">
          — Sélectionner —
        </option>

        ${
          invoices.map(
            invoice => `

              <option
                value="${esc(
                  invoice.id
                )}"
                ${
                  invoice.id ===
                  invoiceId
                    ? "selected"
                    : ""
                }
              >

                ${esc(
                  invoice.invoice_number ||
                  "Facture"
                )}

                —

                ${esc(
                  (
                    state.db.clients || []
                  )
                  .find(
                    client =>
                      client.id ===
                      invoice.client_id
                  )?.full_name ||
                  "Client"
                )}

                —

                ${money(
                  invoice.total
                )}

              </option>

            `
          ).join("")
        }

      </select>

    </label>

    <label>

      Montant

      <input
        name="amount"
        type="number"
        min="1"
        step="0.01"
        required
      >

    </label>

    <label>

      Mode de paiement

      <select
        name="payment_method"
        required
      >

        <option value="">
          — Sélectionner —
        </option>

        <option value="cash">
          Espèces
        </option>

        <option value="mtn_momo">
          MTN MoMo
        </option>

        <option value="moov_money">
          Moov Money
        </option>

        <option value="celtiis_cash">
          Celtiis Cash
        </option>

        <option value="bank_transfer">
          Virement bancaire
        </option>

        <option value="card">
          Carte bancaire
        </option>

        <option value="check">
          Chèque bancaire
        </option>

        <option value="pi_spi">
          PI-SPI
        </option>

        <option value="other">
          Autre
        </option>

      </select>

    </label>

    <label>

      Date

      <input
        name="payment_date"
        type="date"
        value="${today()}"
        required
      >

    </label>

    <label>

      Référence

      <input
        name="reference"
      >

    </label>

    <label>

      Notes

      <textarea
        name="notes"
      ></textarea>

    </label>

    <div class="form-actions">

      <button
        type="button"
        class="secondary"
        id="cancelForm"
      >
        Annuler
      </button>

      <button
        type="submit"
        class="primary"
      >
        Enregistrer
      </button>

    </div>

  `;

  openModal(
    "Nouveau paiement",
    html
  );

  document
    .getElementById(
      "cancelForm"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .getElementById(
      "recordForm"
    )
    .onsubmit = async event => {

      event.preventDefault();

      const fd =
        new FormData(
          event.target
        );

      const selectedInvoice =
        fd.get(
          "invoice_id"
        );

      const amount =
        Number(
          fd.get("amount") || 0
        );

      if (
        !selectedInvoice ||
        amount <= 0
      ) {

        toast(
          "Facture et montant obligatoires."
        );

        return;
      }

      try {

        const payment =
          await insert(
            "payments",
            {
              invoice_id:
                selectedInvoice,

              amount,

              payment_method:
                fd.get(
                  "payment_method"
                ),

              payment_date:
                fd.get(
                  "payment_date"
                ),

              reference:
                fd.get(
                  "reference"
                ),

              notes:
                fd.get(
                  "notes"
                )
            }
          );

        const invoice =
          (state.db.invoices || [])
            .find(
              item =>
                item.id ===
                selectedInvoice
            );

        if (invoice) {

          const paid =
            (state.db.payments || [])
              .filter(
                payment =>
                  payment.invoice_id ===
                  selectedInvoice
              )
              .reduce(
                (total,payment) =>
                  total +
                  Number(
                    payment.amount ||
                    0
                  ),
                0
              );

          const total =
            Number(
              invoice.total ||
              0
            );

          const amountDue =
            Math.max(
              0,
              total - paid
            );

          let status =
            "unpaid";

          if (
            paid >= total &&
            total > 0
          ) {
            status = "paid";

          } else if (
            paid > 0
          ) {
            status = "partial";
          }

          await update(
            "invoices",
            selectedInvoice,
            {
              amount_paid:
                paid,

              amount_due:
                amountDue,

              status
            }
          );
        }

        await audit(
          "create",
          "payments",
          payment.id
        );

        toast(
          "Paiement enregistré."
        );

        closeModal();

        render();

      } catch (error) {

        console.error(error);

        toast(
          error.message ||
          "Erreur d'enregistrement."
        );
      }
    };
}

/* =========================================================
   PARAMÈTRES — UPSERT CORRIGÉ
   ========================================================= */

async function saveSettings(event) {

  event.preventDefault();

  if (state.role !== "admin") {

    toast(
      "Accès réservé à l'administrateur."
    );

    return;
  }

  const fd =
    new FormData(
      event.target
    );

  const payload = {

    user_id:
      state.user.id,

    company_name:
      fd.get(
        "company_name"
      ),

    phone:
      fd.get(
        "phone"
      ),

    address:
      fd.get(
        "address"
      ),

    updated_at:
      now()
  };

  try {

    if (state.cloud) {

      const {
        data,
        error
      } = await sb
        .from("settings")
        .upsert(
          payload,
          {
            onConflict:
              "user_id"
          }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      state.db.settings =
        [
          ...(state.db.settings || [])
            .filter(
              row =>
                row.user_id !==
                state.user.id
            ),
          data
        ];

    } else {

      const existing =
        (state.db.settings || [])
          .find(
            row =>
              row.user_id ===
              state.user.id
          );

      if (existing) {

        Object.assign(
          existing,
          payload
        );

      } else {

        state.db.settings.push({
          id: uid(),
          ...payload
        });
      }

      saveLocal();
    }

    await audit(
      "update",
      "settings",
      state.user.id
    );

    toast(
      "Paramètres enregistrés."
    );

    render();

  } catch (error) {

    console.error(error);

    toast(
      error.message ||
      "Erreur."
    );
  }
}

/* =========================================================
   CARTES PROFESSIONNELLES + QR CODE
   ========================================================= */

function findMemberProfile(id) {

  return (
    state.db.profiles || []
  ).find(
    profile =>
      String(profile.id) ===
      String(id)
  );
}

function employeeCardData(
  profile
) {

  const role =
    String(
      profile?.role ||
      "employee"
    ).toLowerCase();

  const roleLabel = {

    admin:
      "ADMINISTRATEUR",

    manager:
      "MANAGER",

    employee:
      "EMPLOYÉ"

  }[role] || "EMPLOYÉ";

  const employeeCode =
    profile?.employee_code ||
    profile?.code ||
    `LBT-${String(
      profile?.id || ""
    )
      .slice(0,8)
      .toUpperCase()}`;

  return {

    id:
      profile?.id || "",

    name:
      profile?.full_name ||
      "Membre LUC BRICO-TECH",

    role,

    roleLabel,

    code:
      employeeCode,

    phone:
      profile?.phone ||
      "Non renseigné",

    email:
      profile?.email ||
      "Non renseigné",

    department:
      profile?.department ||
      "Gestion & supervision",

    position:
      profile?.position ||
      roleLabel,

    address:
      profile?.address ||
      "Hévié Hounzévié, Abomey-Calavi",

    city:
      profile?.city ||
      "Abomey-Calavi",

    active:
      profile?.active !== false,

    photo:
      profile?.photo_url ||
      profile?.avatar_url ||
      "",

    createdAt:
      profile?.created_at ||
      now()
  };
}

function employeeQrText(
  profile
) {

  const data =
    employeeCardData(
      profile
    );

  return JSON.stringify({

    type:
      "LBT_EMPLOYEE_CARD",

    version:
      1,

    id:
      data.id,

    code:
      data.code,

    name:
      data.name,

    role:
      data.role

  });
}

function qrImageUrl(
  text,
  size=180
) {

  return (
    "https://api.qrserver.com/v1/create-qr-code/" +
    "?size=" +
    encodeURIComponent(
      `${size}x${size}`
    ) +
    "&data=" +
    encodeURIComponent(
      text
    )
  );
}

function employeeCardHtml(
  profile
) {

  const data =
    employeeCardData(
      profile
    );

  const qr =
    qrImageUrl(
      employeeQrText(
        profile
      ),
      180
    );

  const initials =
    data.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0,2)
      .map(
        value =>
          value[0]
      )
      .join("")
      .toUpperCase();

  return `

<div class="lbt-id-card">

  <div class="lbt-id-head">

    <div class="lbt-id-brand">

      <img
        src="./logo-luc-bricotech.png"
        alt="LUC BRICO-TECH"
      >

      <div>

        <strong>
          LUC BRICO-TECH
        </strong>

        <small>
          Gestion & supervision
        </small>

      </div>

    </div>

    <div
      class="lbt-id-role ${esc(
        data.role
      )}"
    >
      ${esc(
        data.roleLabel
      )}
    </div>

  </div>

  <div class="lbt-id-body">

    <div class="lbt-id-person">

      <div class="lbt-photo-wrap">

        ${
          data.photo

            ?

            `
            <img
              src="${esc(
                data.photo
              )}"
              alt="${esc(
                data.name
              )}"
              class="lbt-card-photo"
            >
            `

            :

            `
            <div
              class="lbt-photo-fallback"
            >
              ${esc(initials)}
            </div>
            `
        }

      </div>

      <div class="lbt-id-name">

        ${esc(
          data.name
        )}

      </div>

      <div class="lbt-id-code">

        ${esc(
          data.code
        )}

      </div>

    </div>

    <div class="lbt-id-info">

      <div>

        <span>
          Fonction
        </span>

        <strong>
          ${esc(
            data.position
          )}
        </strong>

      </div>

      <div>

        <span>
          Téléphone
        </span>

        <strong>
          ${esc(
            data.phone
          )}
        </strong>

      </div>

      <div>

        <span>
          E-mail
        </span>

        <strong>
          ${esc(
            data.email
          )}
        </strong>

      </div>

      <div>

        <span>
          Adresse
        </span>

        <strong>
          ${esc(
            data.address
          )}
        </strong>

      </div>

      <div>

        <span>
          Statut
        </span>

        <strong
          class="${
            data.active
              ? "active"
              : "inactive"
          }"
        >
          ${
            data.active
              ? "ACTIF"
              : "INACTIF"
          }
        </strong>

      </div>

    </div>

    <div class="lbt-id-qr">

      <img
        src="${qr}"
        alt="QR Code ${esc(
          data.name
        )}"
      >

      <small>
        Scanner pour identifier la carte
      </small>

    </div>

  </div>

  <div class="lbt-id-footer">

    <span>
      Innovation • Fiabilité • Performance
    </span>

    <span>
      La technologie au service de vos projets
    </span>

  </div>

</div>

`;
}

/* =========================================================
   OUVRIR CARTE
   ========================================================= */

function openEmployeeCard(id) {

  const profile =
    findMemberProfile(id);

  if (!profile) {

    toast(
      "Membre introuvable."
    );

    return;
  }

  const canView =
    state.role === "admin" ||
    state.role === "manager" ||
    String(
      state.user?.id
    ) ===
    String(id);

  if (!canView) {

    toast(
      "Vous ne pouvez pas consulter cette carte."
    );

    return;
  }

  openModal(
    "Carte professionnelle",
    `

      <div class="lbt-card-modal-body">

        ${employeeCardHtml(
          profile
        )}

        <div
          class="lbt-card-actions"
        >

          <button
            type="button"
            class="secondary"
            id="closeCardBtn"
          >
            Fermer
          </button>

          <button
            type="button"
            class="secondary"
            id="printCardBtn"
          >
            🖨️ Imprimer
          </button>

        </div>

      </div>

    `
  );

  document
    .getElementById(
      "closeCardBtn"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .getElementById(
      "printCardBtn"
    )
    ?.addEventListener(
      "click",
      () =>
        printEmployeeCard(
          profile
        )
    );
}

/* =========================================================
   IMPRESSION CARTE
   ========================================================= */

function printEmployeeCard(
  profile
) {

  const data =
    employeeCardData(
      profile
    );

  const win =
    window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

  if (!win) {

    toast(
      "Autorisez les fenêtres pop-up pour imprimer la carte."
    );

    return;
  }

  const styles = `

*{
  box-sizing:border-box;
}

body{

  margin:0;

  background:#eef2f7;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  display:flex;

  justify-content:center;

  padding:30px;
}

.lbt-id-card{

  width:820px;

  max-width:100%;

  background:#fff;

  border-radius:24px;

  overflow:hidden;

  border:1px solid #dbe2ea;

  color:#102033;
}

.lbt-id-head{

  padding:22px 28px;

  display:flex;

  justify-content:space-between;

  align-items:center;

  background:
    linear-gradient(
      135deg,
      #07111f,
      #12304d
    );

  color:#fff;
}

.lbt-id-brand{

  display:flex;

  align-items:center;

  gap:12px;
}

.lbt-id-brand img{

  width:58px;

  height:58px;

  object-fit:contain;

  background:#fff;

  border-radius:14px;

  padding:5px;
}

.lbt-id-brand strong{

  display:block;

  font-size:19px;
}

.lbt-id-brand small{

  display:block;

  opacity:.75;

  margin-top:4px;
}

.lbt-id-role{

  padding:9px 13px;

  border-radius:999px;

  font-weight:800;

  font-size:11px;
}

.lbt-id-role.admin{

  background:#f59e0b;

  color:#fff;
}

.lbt-id-role.manager{

  background:#2563eb;

  color:#fff;
}

.lbt-id-role.employee{

  background:#16a34a;

  color:#fff;
}

.lbt-id-body{

  padding:28px;

  display:grid;

  grid-template-columns:
    180px
    1fr
    180px;

  gap:28px;

  align-items:center;
}

.lbt-id-person{

  text-align:center;
}

.lbt-photo-wrap{

  width:140px;

  height:140px;

  margin:auto;

  border-radius:20px;

  overflow:hidden;

  background:#e7edf5;

  display:flex;

  align-items:center;

  justify-content:center;
}

.lbt-card-photo{

  width:100%;

  height:100%;

  object-fit:cover;
}

.lbt-photo-fallback{

  width:100%;

  height:100%;

  display:flex;

  align-items:center;

  justify-content:center;

  font-size:44px;

  font-weight:800;

  color:#12304d;

  background:#dbe7f3;
}

.lbt-id-name{

  font-size:21px;

  font-weight:800;

  margin-top:13px;
}

.lbt-id-code{

  font-size:12px;

  font-weight:700;

  letter-spacing:1px;

  color:#64748b;

  margin-top:5px;
}

.lbt-id-info{

  display:grid;

  gap:13px;
}

.lbt-id-info div{

  border-bottom:
    1px solid #e7ebf0;

  padding-bottom:9px;
}

.lbt-id-info span{

  display:block;

  color:#64748b;

  font-size:11px;

  text-transform:uppercase;
}

.lbt-id-info strong{

  display:block;

  margin-top:3px;

  font-size:14px;
}

.lbt-id-info strong.active{

  color:#16a34a;
}

.lbt-id-info strong.inactive{

  color:#dc2626;
}

.lbt-id-qr{

  text-align:center;
}

.lbt-id-qr img{

  width:155px;

  height:155px;

  display:block;

  margin:auto;

  border:8px solid #fff;
}

.lbt-id-qr small{

  display:block;

  color:#64748b;

  font-size:10px;

  margin-top:8px;
}

.lbt-id-footer{

  display:flex;

  justify-content:space-between;

  gap:20px;

  padding:13px 28px;

  background:#f5f7fa;

  color:#64748b;

  font-size:10px;
}

.lbt-id-footer span:last-child{

  text-align:right;
}

@media(max-width:650px){

  .lbt-id-body{

    grid-template-columns:1fr;
  }

  .lbt-id-qr{

    order:3;
  }

  .lbt-id-footer{

    display:block;
  }

  .lbt-id-footer span{

    display:block;

    margin:3px 0;
  }

  .lbt-id-footer span:last-child{

    text-align:left;
  }

}

`;

  win.document.write(`

<!doctype html>

<html lang="fr">

<head>

<meta charset="utf-8">

<title>
Carte ${esc(
  data.name
)}
</title>

<style>
${styles}
</style>

</head>

<body>

${employeeCardHtml(
  profile
)}

</body>

</html>

`);

  win.document.close();

  setTimeout(
    () => {

      win.focus();

      win.print();

    },
    700
  );
}

/* =========================================================
   BOUTONS CARTES
   ========================================================= */

function bindEmployeeCardButtons() {

  document
    .querySelectorAll(
      "[data-employee-card]"
    )
    .forEach(button => {

      if (
        button.dataset.cardBound ===
        "1"
      ) {
        return;
      }

      button.dataset.cardBound =
        "1";

      button.onclick = () => {

        openEmployeeCard(
          button.dataset.employeeCard
        );
      };
    });
}

/* =========================================================
   STYLE CARTES
   ========================================================= */

function injectEmployeeCardStyles() {

  if (
    document.getElementById(
      "lbt-employee-card-style"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "lbt-employee-card-style";

  style.textContent = `

.lbt-card-modal-body{
  padding:4px 0;
}

.lbt-id-card{

  width:100%;

  background:#fff;

  border:
    1px solid #dbe2ea;

  border-radius:22px;

  overflow:hidden;

  box-shadow:
    0 14px 36px
    rgba(
      15,
      23,
      42,
      .12
    );

  color:#102033;
}

.lbt-id-head{

  padding:18px 20px;

  display:flex;

  justify-content:space-between;

  align-items:center;

  background:
    linear-gradient(
      135deg,
      #07111f,
      #12304d
    );

  color:#fff;
}

.lbt-id-brand{

  display:flex;

  align-items:center;

  gap:10px;
}

.lbt-id-brand img{

  width:48px;

  height:48px;

  object-fit:contain;

  background:#fff;

  border-radius:12px;

  padding:4px;
}

.lbt-id-brand strong{

  display:block;

  font-size:15px;
}

.lbt-id-brand small{

  display:block;

  opacity:.72;

  font-size:10px;

  margin-top:3px;
}

.lbt-id-role{

  padding:7px 10px;

  border-radius:999px;

  font-size:9px;

  font-weight:800;
}

.lbt-id-role.admin{

  background:#f59e0b;

  color:#fff;
}

.lbt-id-role.manager{

  background:#2563eb;

  color:#fff;
}

.lbt-id-role.employee{

  background:#16a34a;

  color:#fff;
}

.lbt-id-body{

  padding:20px;

  display:grid;

  grid-template-columns:
    125px
    1fr
    125px;

  gap:18px;

  align-items:center;
}

.lbt-id-person{

  text-align:center;
}

.lbt-photo-wrap{

  width:100px;

  height:100px;

  margin:auto;

  border-radius:16px;

  overflow:hidden;

  background:#e7edf5;

  display:flex;

  align-items:center;

  justify-content:center;
}

.lbt-card-photo{

  width:100%;

  height:100%;

  object-fit:cover;
}

.lbt-photo-fallback{

  width:100%;

  height:100%;

  display:flex;

  align-items:center;

  justify-content:center;

  font-size:32px;

  font-weight:800;

  color:#12304d;

  background:#dbe7f3;
}

.lbt-id-name{

  font-size:15px;

  font-weight:800;

  margin-top:9px;
}

.lbt-id-code{

  font-size:9px;

  font-weight:700;

  letter-spacing:.7px;

  color:#64748b;

  margin-top:4px;
}

.lbt-id-info{

  display:grid;

  gap:9px;
}

.lbt-id-info div{

  border-bottom:
    1px solid #e7ebf0;

  padding-bottom:6px;
}

.lbt-id-info span{

  display:block;

  color:#64748b;

  font-size:8px;

  text-transform:uppercase;
}

.lbt-id-info strong{

  display:block;

  margin-top:2px;

  font-size:11px;

  word-break:break-word;
}

.lbt-id-info strong.active{

  color:#16a34a;
}

.lbt-id-info strong.inactive{

  color:#dc2626;
}

.lbt-id-qr{

  text-align:center;
}

.lbt-id-qr img{

  width:105px;

  height:105px;

  display:block;

  margin:auto;

  border:6px solid #fff;
}

.lbt-id-qr small{

  display:block;

  color:#64748b;

  font-size:8px;

  margin-top:6px;
}

.lbt-id-footer{

  display:flex;

  justify-content:space-between;

  gap:10px;

  padding:9px 20px;

  background:#f5f7fa;

  color:#64748b;

  font-size:8px;
}

.lbt-id-footer span:last-child{

  text-align:right;
}

.lbt-card-actions{

  display:flex;

  justify-content:flex-end;

  gap:8px;

  margin-top:14px;
}

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

@media(max-width:650px){

  .lbt-id-body{

    grid-template-columns:1fr;
  }

  .lbt-id-qr{

    order:3;
  }

  .lbt-id-footer{

    display:block;
  }

  .lbt-id-footer span{

    display:block;

    margin:3px 0;
  }

  .lbt-id-footer
  span:last-child{

    text-align:left;
  }

}

`;

  document.head.appendChild(
    style
  );
}

injectEmployeeCardStyles();

/* =========================================================
   API CARTES
   ========================================================= */

window.LBT_EMPLOYEE_CARD = {

  open:
    openEmployeeCard,

  print:
    printEmployeeCard,

  data:
    employeeCardData,

  qr:
    employeeQrText

};

/* =========================================================
   DÉMARRAGE
   ========================================================= */

boot();

})();
