(() => {
"use strict";

const CFG = window.LBT_CONFIG || {};
const hasCloud = !!(
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

const schemas = {
  sales: {
    title: "Nouvelle vente",
    fields: [
      ["customer", "Client", "text", true],
      ["item", "Article / service", "text", true],
      ["quantity", "Quantité", "number", true],
      ["amount", "Montant (FCFA)", "number", true],
      [
        "payment_method",
        "Paiement",
        "select",
        false,
        ["cash", "mobile_money", "bank", "credit"]
      ],
      [
        "status",
        "Statut",
        "select",
        false,
        ["paid", "pending", "cancelled"]
      ],
      ["notes", "Notes", "textarea", false]
    ]
  },

  purchases: {
    title: "Nouvel achat",
    fields: [
      ["supplier", "Fournisseur", "text", true],
      ["item", "Article", "text", true],
      ["quantity", "Quantité", "number", true],
      ["amount", "Montant (FCFA)", "number", true],
      [
        "status",
        "Statut",
        "select",
        false,
        ["received", "pending", "cancelled"]
      ],
      ["notes", "Notes", "textarea", false]
    ]
  },

  expenses: {
    title: "Nouvelle dépense",
    fields: [
      ["category", "Catégorie", "text", true],
      ["label", "Libellé", "text", true],
      ["amount", "Montant (FCFA)", "number", true],
      ["beneficiary", "Bénéficiaire", "text", false],
      ["notes", "Notes", "textarea", false]
    ]
  },

  activities: {
    title: "Nouvelle activité",
    fields: [
      ["title", "Titre", "text", true],
      ["category", "Catégorie", "text", false],
      ["description", "Description", "textarea", false],
      ["location", "Lieu", "text", false],
      [
        "status",
        "Statut",
        "select",
        false,
        ["open", "in_progress", "done", "cancelled"]
      ],
      ["amount", "Montant (FCFA)", "number", false]
    ]
  },

  projects: {
    title: "Nouveau projet",
    fields: [
      ["name", "Nom du projet", "text", true],
      ["client", "Client", "text", false],
      ["description", "Description", "textarea", false],
      [
        "status",
        "Statut",
        "select",
        false,
        ["planned", "active", "completed", "paused"]
      ],
      ["progress", "Progression (%)", "number", false],
      ["budget", "Budget (FCFA)", "number", false]
    ]
  },

  innovations: {
    title: "Nouvelle innovation",
    fields: [
      ["title", "Titre", "text", true],
      ["description", "Description", "textarea", false],
      [
        "stage",
        "Étape",
        "select",
        false,
        ["idea", "prototype", "test", "production"]
      ],
      ["budget", "Budget (FCFA)", "number", false],
      ["progress", "Progression (%)", "number", false]
    ]
  },

  stock_items: {
    title: "Nouvel article de stock",
    fields: [
      ["name", "Article", "text", true],
      ["category", "Catégorie", "text", false],
      ["unit", "Unité", "text", false],
      ["quantity", "Quantité", "number", true],
      ["min_quantity", "Seuil minimum", "number", false],
      ["location", "Emplacement", "text", false]
    ]
  },

  clients: {
    title: "Nouveau client",
    fields: [
      ["full_name", "Nom complet", "text", true],
      ["company_name", "Entreprise / société", "text", false],
      ["phone", "Téléphone", "tel", false],
      ["email", "E-mail", "email", false],
      ["address", "Adresse", "text", false],
      ["city", "Ville", "text", false],
      ["notes", "Notes", "textarea", false]
    ]
  }
};

const state = {
  page: "dashboard",
  role: "admin",
  user: null,
  profile: null,
  cloud: hasCloud,
  db: loadLocal()
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

function seed() {
  return {
    profiles: [
      {
        id: "demo-admin",
        full_name: "Lucien BESSAN",
        role: "admin",
        active: true
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

function loadLocal() {
  try {
    const d = JSON.parse(localStorage.getItem(DBKEY)) || seed();

    TABLES.forEach(table => {
      if (!Array.isArray(d[table])) {
        d[table] = [];
      }
    });

    return d;
  } catch {
    return seed();
  }
}

function saveLocal() {
  localStorage.setItem(DBKEY, JSON.stringify(state.db));
}

function toast(message) {
  const element = document.getElementById("toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(window.__lbtToastTimer);

  window.__lbtToastTimer = setTimeout(() => {
    element.classList.remove("show");
  }, 2400);
}

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    char =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
  );
}

function money(value) {
  return (
    new Intl.NumberFormat("fr-FR").format(Number(value || 0)) +
    " FCFA"
  );
}

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : "demo-" +
        Date.now() +
        "-" +
        Math.random().toString(36).slice(2);
}

function now() {
  return new Date().toISOString();
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? "");
  }
}

function normalizeDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("fr-FR");
  } catch {
    return String(value);
  }
}

function formatDateTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return String(value);
  }
}

async function cloudSession() {
  if (!sb) return null;

  const {
    data: { session }
  } = await sb.auth.getSession();

  return session;
}

async function boot() {
  try {
    if (hasCloud) {
      const session = await cloudSession();

      if (!session) {
        if (location.pathname.endsWith("login.html")) {
          return;
        }

        location.href = "login.html";
        return;
      }

      state.user = session.user;

      const { data: profile, error: profileError } =
        await sb
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

      if (profileError) {
        console.warn(profileError);
      }

      state.profile =
        profile || {
          id: session.user.id,
          full_name: session.user.email,
          email: session.user.email,
          role: "employee",
          active: true
        };

      if (state.profile.active === false) {
        await sb.auth.signOut();

        alert(
          "Ce compte a été désactivé par l’administrateur."
        );

        location.href = "login.html";
        return;
      }

      state.role = state.profile.role || "employee";

      await syncCloud();

      applyRoleNavigation();
    } else {
      state.user = {
        id: "demo-admin",
        email: "demo@lucbricotech.local"
      };

      state.profile =
        state.db.profiles[0] || {
          id: "demo-admin",
          full_name: "Lucien BESSAN",
          role: "admin",
          active: true
        };

      state.role = state.profile.role || "admin";
    }

    const userName = document.getElementById("userName");
    const userRole = document.getElementById("userRole");
    const modeBadge = document.getElementById("modeBadge");

    if (userName) {
      userName.textContent =
        state.profile.full_name ||
        state.user.email ||
        "Utilisateur";
    }

    if (userRole) {
      userRole.textContent = state.role.toUpperCase();
    }

    if (modeBadge) {
      modeBadge.textContent = state.cloud
        ? "SUPABASE"
        : "MODE DÉMO";
    }

    bind();
    render();
  } catch (error) {
    console.error("Erreur de démarrage :", error);

    if (hasCloud) {
      const content = document.getElementById("content");

      if (content) {
        content.innerHTML = `
          <div class="card">
            <h3>Connexion sécurisée indisponible</h3>
            <p class="muted">
              Impossible de charger les données Supabase.
            </p>

            <button class="primary" id="retryConnection">
              Réessayer
            </button>

            <button
              class="secondary"
              id="goLogin"
              style="margin-left:8px"
            >
              Retour à la connexion
            </button>
          </div>
        `;
      }

      document
        .getElementById("retryConnection")
        ?.addEventListener("click", () =>
          location.reload()
        );

      document
        .getElementById("goLogin")
        ?.addEventListener("click", () =>
          (location.href = "login.html")
        );

      toast(
        "Erreur de connexion sécurisée à Supabase."
      );

      return;
    }

    state.cloud = false;

    state.user = {
      id: "demo-admin",
      email: "demo@lucbricotech.local"
    };

    state.profile =
      state.db.profiles?.[0] || {
        id: "demo-admin",
        full_name: "Lucien BESSAN",
        role: "admin",
        active: true
      };

    state.role = state.profile.role || "admin";

    const userName = document.getElementById("userName");
    const userRole = document.getElementById("userRole");
    const modeBadge = document.getElementById("modeBadge");

    if (userName) {
      userName.textContent =
        state.profile.full_name || "Utilisateur";
    }

    if (userRole) {
      userRole.textContent = state.role.toUpperCase();
    }

    if (modeBadge) {
      modeBadge.textContent = "MODE DÉMO";
    }

    bind();
    render();

    toast("Mode démo actif.");
  }
}

async function syncCloud() {
  for (const table of TABLES) {
    try {
      let query = sb.from(table).select("*");

      if (table !== "settings") {
        query = query.order("created_at", {
          ascending: false
        });
      }

      const { data, error } = await query;

      if (!error && data) {
        state.db[table] = data;
      } else {
        console.warn(
          `Impossible de charger ${table}:`,
          error
        );

        if (!Array.isArray(state.db[table])) {
          state.db[table] = [];
        }
      }
    } catch (error) {
      console.warn(
        `Erreur lors du chargement de ${table}:`,
        error
      );

      if (!Array.isArray(state.db[table])) {
        state.db[table] = [];
      }
    }
  }
}

async function insert(table, payload) {
  const hasUserId =
    TABLES_WITH_USER_ID.includes(table);

  if (!state.cloud) {
    const item = {
      id: uid(),
      created_at: now(),
      ...payload
    };

    if (hasUserId) {
      item.user_id = state.user.id;
    }

    if (!Array.isArray(state.db[table])) {
      state.db[table] = [];
    }

    state.db[table].unshift(item);
    saveLocal();

    return item;
  }

  const item = {
    ...payload
  };

  if (hasUserId) {
    item.user_id = state.user.id;
  }

  const {
    data,
    error
  } = await sb
    .from(table)
    .insert(item)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!Array.isArray(state.db[table])) {
    state.db[table] = [];
  }

  state.db[table].unshift(data);

  return data;
}

async function update(table, id, payload) {
  if (!state.cloud) {
    const array = state.db[table] || [];
    const index = array.findIndex(
      item => item.id === id
    );

    if (index >= 0) {
      array[index] = {
        ...array[index],
        ...payload
      };
    }

    saveLocal();
    return;
  }

  const {
    data,
    error
  } = await sb
    .from(table)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  const array = state.db[table] || [];
  const index = array.findIndex(
    item => item.id === id
  );

  if (index >= 0) {
    array[index] = data;
  }
}

async function remove(table, id) {
  if (!state.cloud) {
    state.db[table] = (
      state.db[table] || []
    ).filter(item => item.id !== id);

    saveLocal();
    return;
  }

  const { error } = await sb
    .from(table)
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  state.db[table] = (
    state.db[table] || []
  ).filter(item => item.id !== id);
}

async function audit(
  action,
  entity,
  id,
  details = {}
) {
  try {
    await insert("audit_logs", {
      action,
      entity,
      entity_id: id,
      details
    });
  } catch (error) {
    console.warn("Audit :", error);
  }
}

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
  const allowed = allowedPages();

  document
    .querySelectorAll("#nav button")
    .forEach(button => {
      const visible = allowed.includes(
        button.dataset.page
      );

      button.hidden = !visible;

      button.setAttribute(
        "aria-hidden",
        String(!visible)
      );
    });

  if (!allowed.includes(state.page)) {
    state.page = "dashboard";
  }
}

function bind() {
  applyRoleNavigation();

  document
    .querySelectorAll("#nav button:not([hidden])")
    .forEach(button => {
      button.onclick = function (event) {
        event.preventDefault();

        const page = this.dataset.page;

        if (!allowedPages().includes(page)) {
          return;
        }

        state.page = page;

        closeMenu();

        render();
      };
    });

  const menuButton =
    document.getElementById("menuBtn");

  const sidebar =
    document.getElementById("sidebar");

  if (menuButton && sidebar) {
    menuButton.onclick = null;

    menuButton.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();

        sidebar.classList.toggle("open");
      }
    );

    document.addEventListener(
      "click",
      event => {
        if (
          !sidebar.classList.contains("open")
        ) {
          return;
        }

        if (
          sidebar.contains(event.target) ||
          menuButton.contains(event.target)
        ) {
          return;
        }

        closeMenu();
      }
    );
  }

  const closeModalButton =
    document.getElementById("closeModal");

  if (closeModalButton) {
    closeModalButton.onclick = closeModal;
  }

  const modal =
    document.getElementById("modal");

  if (modal) {
    modal.addEventListener(
      "click",
      event => {
        if (event.target === modal) {
          closeModal();
        }
      }
    );
  }

  const logoutButton =
    document.getElementById("logoutBtn");

  if (logoutButton) {
    logoutButton.onclick = logout;
  }
}

function closeMenu() {
  document
    .getElementById("sidebar")
    ?.classList.remove("open");
}

async function logout() {
  try {
    if (state.cloud && sb) {
      await sb.auth.signOut();
    }
  } finally {
    location.href = "login.html";
  }
}

function setHeader(title, subtitle) {
  const titleElement =
    document.getElementById("pageTitle");

  const subtitleElement =
    document.getElementById("pageSub");

  if (titleElement) {
    titleElement.textContent = title;
  }

  if (subtitleElement) {
    subtitleElement.textContent = subtitle;
  }
}

function render() {
  applyRoleNavigation();

  const allowed = allowedPages();

  if (!allowed.includes(state.page)) {
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

  const headers = {
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
      "Facturation et suivi des règlements."
    ],

    payments: [
      "Paiements",
      "Enregistrement des règlements."
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

  const header =
    headers[state.page] ||
    headers.dashboard;

  setHeader(header[0], header[1]);

  const pageFunctions = {
    dashboard,
    members,
    clients: clientsPage,
    quotes: quotesPage,
    invoices: invoicesPage,
    payments: paymentsPage,
    sales: page => tablePage(page),
    purchases: page => tablePage(page),
    expenses: page => tablePage(page),
    stock,
    activities: page => tablePage(page),
    projects: page => tablePage(page),
    innovations: page => tablePage(page),
    reports,
    audit: auditPage,
    settings
  };

  let pageFunction =
    pageFunctions[state.page];

  if (typeof pageFunction !== "function") {
    state.page = "dashboard";
    setHeader(
      headers.dashboard[0],
      headers.dashboard[1]
    );
    pageFunction = dashboard;
  }

  const content =
    document.getElementById("content");

  if (!content) return;

  try {
    content.innerHTML = pageFunction(
      state.page
    );
  } catch (error) {
    console.error(
      "Erreur de rendu de la page :",
      error
    );

    content.innerHTML = `
      <div class="card">
        <h3>Erreur d’affichage</h3>
        <p class="muted">
          Une erreur est survenue lors du chargement de cette page.
        </p>
        <button
          class="primary"
          onclick="location.reload()"
        >
          Recharger
        </button>
      </div>
    `;

    toast(
      "Erreur d’affichage de la page."
    );

    return;
  }

  bindPage();
}

function dashboard() {
  const sum = table =>
    (state.db[table] || []).reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    );

  const stock = (
    state.db.stock_items || []
  ).reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  const lowStock = (
    state.db.stock_items || []
  ).filter(
    item =>
      Number(item.quantity || 0) <=
      Number(item.min_quantity || 0)
  ).length;

  const invoiceTotal = (
    state.db.invoices || []
  ).reduce(
    (total, invoice) =>
      total + Number(invoice.total || 0),
    0
  );

  const invoicePaid = (
    state.db.invoices || []
  ).reduce(
    (total, invoice) =>
      total +
      Number(
        invoice.amount_paid || 0
      ),
    0
  );

  const invoiceDue = Math.max(
    0,
    invoiceTotal - invoicePaid
  );

  const paymentsTotal = (
    state.db.payments || []
  ).reduce(
    (total, payment) =>
      total + Number(payment.amount || 0),
    0
  );

  const recentActivities = (
    state.db.activities || []
  )
    .slice(0, 5)
    .map(
      item => `
        <p>
          <strong>${esc(
            item.title || "Activité"
          )}</strong>
          <br>
          <span class="muted">
            ${formatDateTime(
              item.created_at
            )}
          </span>
        </p>
      `
    )
    .join("");

  const recentProjects = (
    state.db.projects || []
  )
    .slice(0, 5)
    .map(
      item => `
        <p>
          <strong>${esc(
            item.name || "Projet"
          )}</strong>
          <br>
          <span class="muted">
            ${esc(item.status || "")}
          </span>
        </p>
      `
    )
    .join("");

  const recentInnovations = (
    state.db.innovations || []
  )
    .slice(0, 5)
    .map(
      item => `
        <p>
          <strong>${esc(
            item.title || "Innovation"
          )}</strong>
          <br>
          <span class="muted">
            ${esc(item.stage || "")}
          </span>
        </p>
      `
    )
    .join("");

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
        <strong>${money(
          sum("sales")
        )}</strong>
      </div>

      <div class="card kpi">
        <small>Paiements reçus</small>
        <strong>${money(
          paymentsTotal
        )}</strong>
      </div>

      <div class="card kpi">
        <small>Factures à recevoir</small>
        <strong>${money(
          invoiceDue
        )}</strong>
      </div>

      <div class="card kpi">
        <small>Dépenses</small>
        <strong>${money(
          sum("expenses")
        )}</strong>
      </div>

      <div class="card kpi">
        <small>Stock total</small>
        <strong>${stock}</strong>
      </div>

      <div class="card kpi">
        <small>Alertes stock</small>
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
        <h3>Activités récentes</h3>

        ${
          recentActivities ||
          '<div class="empty">Aucune activité.</div>'
        }
      </div>

      <div class="card">
        <h3>Projets</h3>

        ${
          recentProjects ||
          '<div class="empty">Aucun projet.</div>'
        }
      </div>

      <div class="card">
        <h3>Innovations</h3>

        ${
          recentInnovations ||
          '<div class="empty">Aucune innovation.</div>'
        }
      </div>

    </div>
  `;
}

function recent(table, key) {
  const array = (
    state.db[table] || []
  ).slice(0, 5);

  if (!array.length) {
    return `
      <div class="empty">
        Aucun élément.
      </div>
    `;
  }

  return array
    .map(
      item => `
        <p>
          <strong>${esc(
            item[key]
          )}</strong>
          <br>
          <span class="muted">
            ${formatDateTime(
              item.created_at
            )}
          </span>
        </p>
      `
    )
    .join("");
}

function members() {
  const membersList =
    state.db.profiles || [];

  return `
    <div class="card">

      <div class="page-actions">
        <div>
          <h3>Membres</h3>
          <p class="muted">
            Gestion des utilisateurs et des rôles.
          </p>
        </div>

        ${
          state.role === "admin"
            ? `
              <button
                class="primary"
                id="createEmployeeBtn"
              >
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
              <th>Rôle</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            ${
              membersList.length
                ? membersList
                    .map(
                      member => `
                        <tr>
                          <td>
                            ${esc(
                              member.full_name ||
                                "—"
                            )}
                          </td>

                          <td>
                            ${esc(
                              member.email ||
                                ""
                            )}
                          </td>

                          <td>
                            ${
                              state.role ===
                              "admin"
                                ? `
                                  <select
                                    data-role="${member.id}"
                                  >
                                    <option
                                      value="admin"
                                      ${
                                        member.role ===
                                        "admin"
                                          ? "selected"
                                          : ""
                                      }
                                    >
                                      Admin
                                    </option>

                                    <option
                                      value="manager"
                                      ${
                                        member.role ===
                                        "manager"
                                          ? "selected"
                                          : ""
                                      }
                                    >
                                      Manager
                                    </option>

                                    <option
                                      value="employee"
                                      ${
                                        member.role ===
                                        "employee"
                                          ? "selected"
                                          : ""
                                      }
                                    >
                                      Employé
                                    </option>
                                  </select>
                                `
                                : esc(
                                    member.role ||
                                      ""
                                  )
                            }
                          </td>

                          <td>
                            <span
                              class="badge ${
                                member.active === false
                                  ? "danger"
                                  : "success"
                              }"
                            >
                              ${
                                member.active === false
                                  ? "Désactivé"
                                  : "Actif"
                              }
                            </span>
                          </td>

                          <td>
                            ${
                              state.role ===
                              "admin"
                                ? `
                                  <button
                                    class="secondary"
                                    data-toggle-active="${member.id}"
                                  >
                                    ${
                                      member.active ===
                                      false
                                        ? "Activer"
                                        : "Désactiver"
                                    }
                                  </button>
                                `
                                : "Lecture seule"
                            }
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : `
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

function clientsPage() {
  const clients =
    state.db.clients || [];

  return `
    <div class="card">

      <div class="page-actions">
        <div>
          <h3>Clients</h3>
          <p class="muted">
            Base clients de LUC BRICO-TECH.
          </p>
        </div>

        <button
          class="primary"
          data-add="clients"
        >
          + Nouveau client
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Entreprise</th>
              <th>Téléphone</th>
              <th>E-mail</th>
              <th>Ville</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              clients.length
                ? clients
                    .map(
                      client => `
                        <tr>
                          <td>
                            ${esc(
                              client.full_name
                            )}
                          </td>

                          <td>
                            ${esc(
                              client.company_name ||
                                "—"
                            )}
                          </td>

                          <td>
                            ${esc(
                              client.phone ||
                                "—"
                            )}
                          </td>

                          <td>
                            ${esc(
                              client.email ||
                                "—"
                            )}
                          </td>

                          <td>
                            ${esc(
                              client.city ||
                                "—"
                            )}
                          </td>

                          <td>
                            <button
                              class="secondary"
                              data-edit="clients"
                              data-id="${client.id}"
                            >
                              Modifier
                            </button>

                            ${
                              state.role ===
                              "admin"
                                ? `
                                  <button
                                    class="danger ghost"
                                    data-delete="clients"
                                    data-id="${client.id}"
                                  >
                                    Supprimer
                                  </button>
                                `
                                : ""
                            }
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : `
                  <tr>
                    <td colspan="6">
                      <div class="empty">
                        Aucun client enregistré.
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

function clientName(id) {
  const client = (
    state.db.clients || []
  ).find(item => item.id === id);

  if (!client) return "Client non renseigné";

  return (
    client.full_name ||
    client.company_name ||
    "Client"
  );
}

function statusLabel(status) {
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
    planned: "Planifié",
    active: "En cours",
    completed: "Terminé",
    paused: "En pause",
    open: "Ouverte",
    in_progress: "En cours",
    done: "Terminée"
  };

  return (
    labels[status] ||
    status ||
    "—"
  );
}

function invoiceDisplayStatus(invoice) {
  if (!invoice) return "draft";

  const total = Number(
    invoice.total || 0
  );

  const paid = Number(
    invoice.amount_paid || 0
  );

  if (
    invoice.status === "cancelled"
  ) {
    return "cancelled";
  }

  if (
    total > 0 &&
    paid >= total
  ) {
    return "paid";
  }

  if (
    paid > 0 &&
    paid < total
  ) {
    return "partial";
  }

  if (
    invoice.due_date &&
    new Date(invoice.due_date) <
      new Date() &&
    total > paid
  ) {
    return "overdue";
  }

  return invoice.status || "unpaid";
}

function invoiceStatusClass(status) {
  if (status === "paid") {
    return "success";
  }

  if (
    status === "partial" ||
    status === "sent"
  ) {
    return "warn";
  }

  if (
    status === "overdue" ||
    status === "cancelled" ||
    status === "rejected"
  ) {
    return "danger";
  }

  return "muted";
}

function quotesPage() {
  const quotes =
    state.db.quotes || [];

  return `
    <div class="card">

      <div class="page-actions">
        <div>
          <h3>Devis</h3>
          <p class="muted">
            Création et suivi des devis clients.
          </p>
        </div>

        <button
          class="primary"
          data-add="quotes"
        >
          + Nouveau devis
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>N° devis</th>
              <th>Client</th>
              <th>Date</th>
              <th>Validité</th>
              <th>Total</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              quotes.length
                ? quotes
                    .map(
                      quote => `
                        <tr>
                          <td>
                            <strong>
                              ${esc(
                                quote.quote_number ||
                                  "DEVIS"
                              )}
                            </strong>
                          </td>

                          <td>
                            ${esc(
                              clientName(
                                quote.client_id
                              )
                            )}
                          </td>

                          <td>
                            ${normalizeDate(
                              quote.issue_date
                            )}
                          </td>

                          <td>
                            ${normalizeDate(
                              quote.valid_until
                            )}
                          </td>

                          <td>
                            ${money(
                              quote.total
                            )}
                          </td>

                          <td>
                            <span
                              class="badge ${invoiceStatusClass(
                                quote.status
                              )}"
                            >
                              ${statusLabel(
                                quote.status
                              )}
                            </span>
                          </td>

                          <td>
                            <button
                              class="secondary"
                              data-details-document="quotes"
                              data-id="${quote.id}"
                            >
                              Détails
                            </button>

                            <button
                              class="secondary"
                              data-edit-document="quotes"
                              data-id="${quote.id}"
                            >
                              Modifier
                            </button>

                            ${
                              state.role ===
                              "admin"
                                ? `
                                  <button
                                    class="danger ghost"
                                    data-delete="quotes"
                                    data-id="${quote.id}"
                                  >
                                    Supprimer
                                  </button>
                                `
                                : ""
                            }
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : `
                  <tr>
                    <td colspan="7">
                      <div class="empty">
                        Aucun devis enregistré.
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

function invoicesPage() {
  const invoices =
    state.db.invoices || [];

  return `
    <div class="card">

      <div class="page-actions">
        <div>
          <h3>Factures</h3>
          <p class="muted">
            Suivi des factures et des règlements clients.
          </p>
        </div>

        <button
          class="primary"
          data-add="invoices"
        >
          + Nouvelle facture
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>N° facture</th>
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
              invoices.length
                ? invoices
                    .map(invoice => {
                      const displayStatus =
                        invoiceDisplayStatus(
                          invoice
                        );

                      const paid = Number(
                        invoice.amount_paid ||
                          0
                      );

                      const total = Number(
                        invoice.total ||
                          0
                      );

                      const due = Math.max(
                        0,
                        total - paid
                      );

                      return `
                        <tr>
                          <td>
                            <strong>
                              ${esc(
                                invoice.invoice_number ||
                                  "FACTURE"
                              )}
                            </strong>
                          </td>

                          <td>
                            ${esc(
                              clientName(
                                invoice.client_id
                              )
                            )}
                          </td>

                          <td>
                            ${normalizeDate(
                              invoice.issue_date
                            )}
                          </td>

                          <td>
                            ${normalizeDate(
                              invoice.due_date
                            )}
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
                              class="badge ${invoiceStatusClass(
                                displayStatus
                              )}"
                            >
                              ${statusLabel(
                                displayStatus
                              )}
                            </span>
                          </td>

                          <td>
                            <button
                              class="secondary"
                              data-details-document="invoices"
                              data-id="${invoice.id}"
                            >
                              Détails
                            </button>

                            <button
                              class="secondary"
                              data-edit-document="invoices"
                              data-id="${invoice.id}"
                            >
                              Modifier
                            </button>

                            <button
                              class="primary"
                              data-add-payment="${invoice.id}"
                            >
                              + Paiement
                            </button>

                            ${
                              state.role ===
                              "admin"
                                ? `
                                  <button
                                    class="danger ghost"
                                    data-delete="invoices"
                                    data-id="${invoice.id}"
                                  >
                                    Supprimer
                                  </button>
                                `
                                : ""
                            }
                          </td>
                        </tr>
                      `;
                    })
                    .join("")
                : `
                  <tr>
                    <td colspan="9">
                      <div class="empty">
                        Aucune facture enregistrée.
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

function paymentsPage() {
  const payments =
    state.db.payments || [];

  return `
    <div class="card">

      <div class="page-actions">
        <div>
          <h3>Paiements</h3>
          <p class="muted">
            Enregistrement comptable des règlements.
          </p>
        </div>

        <button
          class="primary"
          id="newPaymentBtn"
        >
          + Nouveau paiement
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
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              payments.length
                ? payments
                    .map(payment => {
                      const invoice =
                        (
                          state.db.invoices ||
                          []
                        ).find(
                          item =>
                            item.id ===
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
                            ${esc(
                              invoice
                                ? clientName(
                                    invoice.client_id
                                  )
                                : "—"
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
                            ${normalizeDate(
                              payment.payment_date
                            )}
                          </td>

                          <td>
                            ${esc(
                              payment.reference ||
                                "—"
                            )}
                          </td>

                          <td>
                            ${esc(
                              payment.notes ||
                                "—"
                            )}
                          </td>

                          <td>
                            ${
                              state.role ===
                              "admin"
                                ? `
                                  <button
                                    class="danger ghost"
                                    data-delete-payment="${payment.id}"
                                  >
                                    Supprimer
                                  </button>
                                `
                                : ""
                            }
                          </td>
                        </tr>
                      `;
                    })
                    .join("")
                : `
                  <tr>
                    <td colspan="8">
                      <div class="empty">
                        Aucun paiement enregistré.
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

function paymentMethodLabel(method) {
  const labels = {
    cash: "Espèces",
    mtn_momo: "MTN MoMo",
    moov_money: "Moov Money",
    celtiis_cash: "Celtiis Cash",
    bank_transfer: "Virement bancaire",
    card: "Carte bancaire",
    check: "Chèque bancaire",
    pi_spi: "PI-SPI",
    mobile_money: "Mobile Money",
    bank: "Banque",
    credit: "Crédit",
    other: "Autre"
  };

  return labels[method] || method || "—";
}

function tablePage(page) {
  const table = page;

  const labels = {
    sales: {
      title: "Ventes",
      add: "Nouvelle vente",
      columns: [
        ["customer", "Client"],
        ["item", "Article / service"],
        ["quantity", "Quantité"],
        ["amount", "Montant"],
        ["payment_method", "Paiement"],
        ["status", "Statut"]
      ]
    },

    purchases: {
      title: "Achats",
      add: "Nouvel achat",
      columns: [
        ["supplier", "Fournisseur"],
        ["item", "Article"],
        ["quantity", "Quantité"],
        ["amount", "Montant"],
        ["status", "Statut"]
      ]
    },

    expenses: {
      title: "Dépenses",
      add: "Nouvelle dépense",
      columns: [
        ["category", "Catégorie"],
        ["label", "Libellé"],
        ["amount", "Montant"],
        ["beneficiary", "Bénéficiaire"]
      ]
    },

    activities: {
      title: "Activités",
      add: "Nouvelle activité",
      columns: [
        ["title", "Titre"],
        ["category", "Catégorie"],
        ["location", "Lieu"],
        ["status", "Statut"],
        ["amount", "Montant"]
      ]
    },

    projects: {
      title: "Projets",
      add: "Nouveau projet",
      columns: [
        ["name", "Nom"],
        ["client", "Client"],
        ["status", "Statut"],
        ["progress", "Progression"],
        ["budget", "Budget"]
      ]
    },

    innovations: {
      title: "Innovations",
      add: "Nouvelle innovation",
      columns: [
        ["title", "Titre"],
        ["stage", "Étape"],
        ["progress", "Progression"],
        ["budget", "Budget"]
      ]
    }
  };

  const config = labels[table];

  if (!config) {
    return `
      <div class="card">
        <h3>Page indisponible</h3>
      </div>
    `;
  }

  const rows =
    state.db[table] || [];

  return `
    <div class="card">

      <div class="page-actions">
        <div>
          <h3>${config.title}</h3>
          <p class="muted">
            Gestion des opérations.
          </p>
        </div>

        <button
          class="primary"
          data-add="${table}"
        >
          + ${config.add}
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${config.columns
                .map(
                  column =>
                    `<th>${column[1]}</th>`
                )
                .join("")}

              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows.length
                ? rows
                    .map(
                      row => `
                        <tr>
                          ${config.columns
                            .map(
                              ([key]) => {
                                let value =
                                  row[key];

                                if (
                                  key ===
                                    "amount" ||
                                  key ===
                                    "budget"
                                ) {
                                  value =
                                    money(value);
                                }

                                if (
                                  key ===
                                  "payment_method"
                                ) {
                                  value =
                                    paymentMethodLabel(
                                      value
                                    );
                                }

                                if (
                                  key ===
                                  "status" ||
                                  key ===
                                  "stage"
                                ) {
                                  value =
                                    statusLabel(
                                      value
                                    );
                                }

                                if (
                                  key ===
                                  "progress"
                                ) {
                                  value =
                                    value == null
                                      ? "—"
                                      : `${value}%`;
                                }

                                return `<td>${esc(
                                  value ??
                                    "—"
                                )}</td>`;
                              }
                            )
                            .join("")}

                          <td>
                            <button
                              class="secondary"
                              data-edit="${table}"
                              data-id="${row.id}"
                            >
                              Modifier
                            </button>

                            ${
                              state.role ===
                              "admin"
                                ? `
                                  <button
                                    class="danger ghost"
                                    data-delete="${table}"
                                    data-id="${row.id}"
                                  >
                                    Supprimer
                                  </button>
                                `
                                : ""
                            }
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : `
                  <tr>
                    <td colspan="${
                      config.columns.length +
                      1
                    }">
                      <div class="empty">
                        Aucun enregistrement.
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

function stock() {
  const items =
    state.db.stock_items || [];

  return `
    <div class="card">

      <div class="page-actions">
        <div>
          <h3>Stock & matériel</h3>
          <p class="muted">
            Suivi des articles et du matériel.
          </p>
        </div>

        ${
          canManageStock()
            ? `
              <button
                class="primary"
                data-add="stock_items"
              >
                + Nouvel article
              </button>
            `
            : ""
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
              <th>État</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              items.length
                ? items
                    .map(item => {
                      const quantity =
                        Number(
                          item.quantity || 0
                        );

                      const minimum =
                        Number(
                          item.min_quantity ||
                            0
                        );

                      const low =
                        quantity <= minimum;

                      return `
                        <tr>
                          <td>
                            <strong>
                              ${esc(
                                item.name
                              )}
                            </strong>
                          </td>

                          <td>
                            ${esc(
                              item.category ||
                                "—"
                            )}
                          </td>

                          <td>
                            ${esc(
                              item.unit ||
                                "—"
                            )}
                          </td>

                          <td>
                            ${quantity}
                          </td>

                          <td>
                            ${minimum}
                          </td>

                          <td>
                            ${esc(
                              item.location ||
                                "—"
                            )}
                          </td>

                          <td>
                            <span
                              class="badge ${
                                low
                                  ? "danger"
                                  : "success"
                              }"
                            >
                              ${
                                low
                                  ? "Stock faible"
                                  : "Disponible"
                              }
                            </span>
                          </td>

                          <td>
                            ${
                              canManageStock()
                                ? `
                                  <button
                                    class="secondary"
                                    data-edit-stock="${item.id}"
                                  >
                                    Modifier
                                  </button>
                                `
                                : ""
                            }

                            <button
                              class="primary"
                              data-stock-move="${item.id}"
                            >
                              Mouvement
                            </button>

                            ${
                              state.role ===
                              "admin"
                                ? `
                                  <button
                                    class="danger ghost"
                                    data-delete="stock_items"
                                    data-id="${item.id}"
                                  >
                                    Supprimer
                                  </button>
                                `
                                : ""
                            }
                          </td>
                        </tr>
                      `;
                    })
                    .join("")
                : `
                  <tr>
                    <td colspan="8">
                      <div class="empty">
                        Aucun article en stock.
                      </div>
                    </td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>
    </div>

    <div
      class="card"
      style="margin-top:16px"
    >
      <h3>Historique des mouvements</h3>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Article</th>
              <th>Type</th>
              <th>Quantité</th>
              <th>Projet</th>
              <th>Responsable</th>
              <th>Notes</th>
            </tr>
          </thead>

          <tbody>
            ${stockMovementRows()}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function stockMovementRows() {
  const movements =
    state.db.stock_movements || [];

  if (!movements.length) {
    return `
      <tr>
        <td colspan="7">
          <div class="empty">
            Aucun mouvement enregistré.
          </div>
        </td>
      </tr>
    `;
  }

  return movements
    .slice(0, 50)
    .map(movement => {
      const item =
        (
          state.db.stock_items ||
          []
        ).find(
          x => x.id === movement.stock_item_id
        );

      const project =
        (
          state.db.projects ||
          []
        ).find(
          x => x.id === movement.project_id
        );

      const employee =
        (
          state.db.profiles ||
          []
        ).find(
          x => x.id === movement.employee_id
        );

      return `
        <tr>
          <td>
            ${formatDateTime(
              movement.created_at
            )}
          </td>

          <td>
            ${esc(
              item?.name || "—"
            )}
          </td>

          <td>
            ${esc(
              movement.type || "—"
            )}
          </td>

          <td>
            ${esc(
              movement.quantity ?? "—"
            )}
          </td>

          <td>
            ${esc(
              project?.name || "—"
            )}
          </td>

          <td>
            ${esc(
              employee?.full_name ||
                "—"
            )}
          </td>

          <td>
            ${esc(
              movement.notes || "—"
            )}
          </td>
        </tr>
      `;
    })
    .join("");
}

function reports() {
  const sales = (
    state.db.sales || []
  ).reduce(
    (sum, item) =>
      sum + Number(item.amount || 0),
    0
  );

  const purchases = (
    state.db.purchases || []
  ).reduce(
    (sum, item) =>
      sum + Number(item.amount || 0),
    0
  );

  const expenses = (
    state.db.expenses || []
  ).reduce(
    (sum, item) =>
      sum + Number(item.amount || 0),
    0
  );

  const payments = (
    state.db.payments || []
  ).reduce(
    (sum, item) =>
      sum + Number(item.amount || 0),
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
        <small>Paiements reçus</small>
        <strong>${money(payments)}</strong>
      </div>

      <div class="card kpi">
        <small>Résultat estimé</small>
        <strong>${money(result)}</strong>
      </div>

    </div>

    <div
      class="card"
      style="margin-top:16px"
    >
      <h3>Exports</h3>

      <div class="quick-actions">
        <button
          class="primary"
          id="exportSalesCsv"
        >
          Exporter les ventes
        </button>

        <button
          class="secondary"
          id="exportAllCsv"
        >
          Export complet
        </button>

        ${
          state.role === "admin"
            ? `
              <button
                class="secondary"
                id="backupBtn"
              >
                Sauvegarde JSON
              </button>
            `
            : ""
        }
      </div>
    </div>
  `;
}

function auditPage() {
  if (state.role !== "admin") {
    return `
      <div class="card">
        <h3>Accès refusé</h3>
        <p class="muted">
          Le journal est réservé à l’administrateur.
        </p>
      </div>
    `;
  }

  const logs =
    state.db.audit_logs || [];

  return `
    <div class="card">

      <div class="page-actions">
        <div>
          <h3>Journal d’activité</h3>
          <p class="muted">
            Traçabilité des opérations effectuées.
          </p>
        </div>

        <button
          class="secondary"
          id="exportAuditCsv"
        >
          Exporter
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
              logs.length
                ? logs
                    .slice(0, 100)
                    .map(
                      log => `
                        <tr>
                          <td>
                            ${formatDateTime(
                              log.created_at
                            )}
                          </td>

                          <td>
                            ${esc(
                              log.action
                            )}
                          </td>

                          <td>
                            ${esc(
                              log.entity
                            )}
                          </td>

                          <td>
                            ${esc(
                              safeJson(
                                log.details ||
                                  {}
                              )
                            )}
                          </td>
                        </tr>
                      `
                    )
                    .join("")
                : `
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
    </div>
  `;
}

function settings() {
  if (state.role !== "admin") {
    return `
      <div class="card">
        <h3>Accès refusé</h3>
        <p class="muted">
          Les paramètres sont réservés à l’administrateur.
        </p>
      </div>
    `;
  }

  const setting =
    (
      state.db.settings || []
    ).find(
      item =>
        item.user_id ===
        state.user.id
    ) || {};

  return `
    <div class="card">

      <h3>
        Informations de l’entreprise
      </h3>

      <form
        id="settingsForm"
        class="form-grid"
      >

        <label>
          Nom
          <input
            name="company_name"
            value="${esc(
              setting.company_name ||
                "LUC BRICO-TECH"
            )}"
          >
        </label>

        <label>
          Adresse
          <input
            name="address"
            value="${esc(
              setting.address ||
                "Hévié Hounzévié, Abomey-Calavi"
            )}"
          >
        </label>

        <label>
          Téléphone
          <input
            name="phone"
            value="${esc(
              setting.phone ||
                "01 67 02 84 91"
            )}"
          >
        </label>

        <label>
          Email
          <input
            name="email"
            value="${esc(
              setting.email || ""
            )}"
          >
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

async function saveSettings(event) {
  event.preventDefault();

  const formData =
    new FormData(event.target);

  const payload =
    Object.fromEntries(
      formData.entries()
    );

  try {
    if (!state.cloud) {
      const array =
        state.db.settings || [];

      const existing =
        array.find(
          item =>
            item.user_id ===
            state.user.id
        );

      if (existing) {
        Object.assign(
          existing,
          payload,
          {
            updated_at: now()
          }
        );
      } else {
        array.unshift({
          id: uid(),
          user_id: state.user.id,
          created_at: now(),
          updated_at: now(),
          ...payload
        });
      }

      state.db.settings = array;

      saveLocal();
    } else {
      const {
        data,
        error
      } = await sb
        .from("settings")
        .upsert(
          {
            user_id: state.user.id,
            ...payload,
            updated_at: now()
          },
          {
            onConflict: "user_id"
          }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      const array =
        state.db.settings || [];

      const index =
        array.findIndex(
          item =>
            item.user_id ===
            state.user.id
        );

      if (index >= 0) {
        array[index] = data;
      } else {
        array.unshift(data);
      }

      state.db.settings = array;
    }

    await audit(
      "update",
      "settings",
      state.user.id,
      payload
    );

    toast(
      "Paramètres enregistrés."
    );

    render();
  } catch (error) {
    console.error(error);

    toast(
      error.message ||
        "Erreur lors de l’enregistrement."
    );
  }
}

function openForm(table, id = null) {
  const schema =
    schemas[table];

  if (!schema) return;

  const old = id
    ? (
        state.db[table] || []
      ).find(
        item => item.id === id
      )
    : null;

  const modalTitle =
    document.getElementById(
      "modalTitle"
    );

  const recordForm =
    document.getElementById(
      "recordForm"
    );

  if (!modalTitle || !recordForm) {
    return;
  }

  modalTitle.textContent = id
    ? "Modifier"
    : schema.title;

  recordForm.innerHTML = `
    <div class="form-grid">

      ${schema.fields
        .map(field => {
          const [
            name,
            label,
            type,
            required,
            options
          ] = field;

          const value =
            old?.[name] ?? "";

          if (type === "textarea") {
            return `
              <label class="full">
                ${label}

                <textarea
                  name="${name}"
                >${esc(value)}</textarea>
              </label>
            `;
          }

          if (type === "select") {
            return `
              <label>
                ${label}

                <select
                  name="${name}"
                >
                  ${options
                    .map(
                      option => `
                        <option
                          value="${esc(
                            option
                          )}"
                          ${
                            value ===
                            option
                              ? "selected"
                              : ""
                          }
                        >
                          ${esc(
                            option
                          )}
                        </option>
                      `
                    )
                    .join("")}
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
                value="${esc(value)}"
                ${
                  required
                    ? "required"
                    : ""
                }
              >
            </label>
          `;
        })
        .join("")}

      <div class="full actions">

        <button
          type="button"
          class="secondary"
          id="cancelForm"
        >
          Annuler
        </button>

        <button
          class="primary"
        >
          Enregistrer
        </button>

      </div>
    </div>
  `;

  document.getElementById(
    "cancelForm"
  ).onclick = closeModal;

  recordForm.onsubmit =
    async event => {
      event.preventDefault();

      const payload =
        Object.fromEntries(
          new FormData(
            event.target
          ).entries()
        );

      for (const field of schema.fields) {
        if (
          field[2] === "number" &&
          payload[field[0]] !== ""
        ) {
          payload[field[0]] =
            Number(
              payload[field[0]]
            );
        }
      }

      try {
        if (id) {
          await update(
            table,
            id,
            payload
          );
        } else {
          await insert(
            table,
            payload
          );
        }

        await audit(
          id ? "update" : "insert",
          table,
          id || null,
          payload
        );

        toast("Enregistré.");

        closeModal();

        render();
      } catch (error) {
        console.error(error);

        toast(
          error.message ||
            "Erreur lors de l’enregistrement."
        );
      }
    };

  document
    .getElementById("modal")
    .classList.remove("hidden");
}

function closeModal() {
  document
    .getElementById("modal")
    ?.classList.add("hidden");
}

async function del(table, id) {
  if (state.role !== "admin") {
    toast(
      "La suppression est réservée à l’administrateur."
    );
    return;
  }

  if (
    !confirm(
      "Supprimer cet enregistrement ?"
    )
  ) {
    return;
  }

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

    toast("Supprimé.");

    render();
  } catch (error) {
    console.error(error);

    toast(
      error.message ||
        "Erreur lors de la suppression."
    );
  }
}

function openPaymentForm(
  invoiceId = null
) {
  const invoices =
    state.db.invoices || [];

  if (!invoices.length) {
    toast(
      "Aucune facture disponible."
    );
    return;
  }

  const selectedInvoice =
    invoices.find(
      invoice =>
        invoice.id ===
        invoiceId
    ) || invoices[0];

  const invoiceOptions =
    invoices
      .map(
        invoice => `
          <option
            value="${invoice.id}"
            ${
              invoice.id ===
              selectedInvoice.id
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
              clientName(
                invoice.client_id
              )
            )}
            — 
            ${money(
              invoice.total
            )}
          </option>
        `
      )
      .join("");

  const paymentDate =
    new Date()
      .toISOString()
      .slice(0, 10);

  document.getElementById(
    "modalTitle"
  ).textContent =
    "Nouveau paiement";

  document.getElementById(
    "recordForm"
  ).innerHTML = `
    <div class="form-grid">

      <label class="full">
        Facture

        <select
          name="invoice_id"
          id="paymentInvoice"
          required
        >
          ${invoiceOptions}
        </select>
      </label>

      <label>
        Montant (FCFA)

        <input
          name="amount"
          id="paymentAmount"
          type="number"
          min="0"
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
          value="${paymentDate}"
          required
        >
      </label>

      <label>
        Référence

        <input
          name="reference"
          type="text"
          placeholder="Ex : Momo, chèque, virement..."
        >
      </label>

      <label class="full">
        Notes

        <textarea
          name="notes"
          placeholder="Informations complémentaires"
        ></textarea>
      </label>

      <div class="full actions">

        <button
          type="button"
          class="secondary"
          id="cancelPayment"
        >
          Annuler
        </button>

        <button
          class="primary"
        >
          Enregistrer
        </button>

      </div>
    </div>
  `;

  document
    .getElementById("cancelPayment")
    .onclick = closeModal;

  document
    .getElementById("paymentInvoice")
    .addEventListener(
      "change",
      event => {
        const invoice =
          invoices.find(
            item =>
              item.id ===
              event.target.value
          );

        if (!invoice) return;

        const total =
          Number(
            invoice.total || 0
          );

        const paid =
          Number(
            invoice.amount_paid ||
              0
          );

        const remaining =
          Math.max(
            0,
            total - paid
          );

        const amountInput =
          document.getElementById(
            "paymentAmount"
          );

        if (amountInput) {
          amountInput.value =
            remaining || "";
        }
      }
    );

  const amountInput =
    document.getElementById(
      "paymentAmount"
    );

  const initialTotal =
    Number(
      selectedInvoice.total || 0
    );

  const initialPaid =
    Number(
      selectedInvoice.amount_paid ||
        0
    );

  const initialRemaining =
    Math.max(
      0,
      initialTotal -
        initialPaid
    );

  if (amountInput) {
    amountInput.value =
      initialRemaining || "";
  }

  document.getElementById(
    "recordForm"
  ).onsubmit =
    async event => {
      event.preventDefault();

      const formData =
        new FormData(
          event.target
        );

      const invoiceId =
        formData.get(
          "invoice_id"
        );

      const amount =
        Number(
          formData.get(
            "amount"
          ) || 0
        );

      if (!invoiceId) {
        toast(
          "Sélectionnez une facture."
        );
        return;
      }

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        toast(
          "Le montant du paiement doit être supérieur à zéro."
        );
        return;
      }

      const invoice =
        invoices.find(
          item =>
            item.id ===
            invoiceId
        );

      if (!invoice) {
        toast(
          "Facture introuvable."
        );
        return;
      }

      const total =
        Number(
          invoice.total || 0
        );

      const alreadyPaid =
        Number(
          invoice.amount_paid ||
            0
        );

      const remaining =
        Math.max(
          0,
          total -
            alreadyPaid
        );

      if (
        remaining > 0 &&
        amount > remaining
      ) {
        toast(
          `Le montant dépasse le reste à payer : ${money(
            remaining
          )}.`
        );
        return;
      }

      const payload = {
        invoice_id: invoiceId,
        amount,
        payment_method:
          formData.get(
            "payment_method"
          ),
        payment_date:
          formData.get(
            "payment_date"
          ),
        reference:
          String(
            formData.get(
              "reference"
            ) || ""
          ).trim(),
        notes:
          String(
            formData.get(
              "notes"
            ) || ""
          ).trim()
      };

      try {
        const payment =
          await insert(
            "payments",
            payload
          );

        const newPaid =
          alreadyPaid +
          amount;

        const newDue =
          Math.max(
            0,
            total -
              newPaid
          );

        let newStatus =
          invoice.status ||
          "unpaid";

        if (
          invoice.status !==
          "cancelled"
        ) {
          if (
            total > 0 &&
            newPaid >= total
          ) {
            newStatus =
              "paid";
          } else if (
            newPaid > 0
          ) {
            newStatus =
              "partial";
          } else if (
            invoice.due_date &&
            new Date(
              invoice.due_date
            ) < new Date()
          ) {
            newStatus =
              "overdue";
          } else {
            newStatus =
              "unpaid";
          }
        }

        await update(
          "invoices",
          invoiceId,
          {
            amount_paid:
              newPaid,
            amount_due:
              newDue,
            status:
              newStatus,
            updated_at:
              now()
          }
        );

        await audit(
          "insert",
          "payments",
          payment.id,
          payload
        );

        await audit(
          "update",
          "invoices",
          invoiceId,
          {
            amount_paid:
              newPaid,
            amount_due:
              newDue,
            status:
              newStatus
          }
        );

        toast(
          "Paiement enregistré."
        );

        closeModal();

        render();
      } catch (error) {
        console.error(
          "Erreur paiement :",
          error
        );

        toast(
          error.message ||
            "Impossible d’enregistrer le paiement."
        );
      }
    };

  document
    .getElementById("modal")
    .classList.remove("hidden");
}

async function deletePayment(id) {
  if (state.role !== "admin") {
    toast(
      "La suppression est réservée à l’administrateur."
    );
    return;
  }

  if (
    !confirm(
      "Supprimer ce paiement ?"
    )
  ) {
    return;
  }

  try {
    const payment =
      (
        state.db.payments ||
        []
      ).find(
        item => item.id === id
      );

    if (!payment) {
      return;
    }

    await remove(
      "payments",
      id
    );

    const invoice =
      (
        state.db.invoices ||
        []
      ).find(
        item =>
          item.id ===
          payment.invoice_id
      );

    if (invoice) {
      const total =
        Number(
          invoice.total || 0
        );

      const oldPaid =
        Number(
          invoice.amount_paid ||
            0
        );

      const newPaid =
        Math.max(
          0,
          oldPaid -
            Number(
              payment.amount || 0
            )
        );

      const newDue =
        Math.max(
          0,
          total -
            newPaid
        );

      let status =
        "unpaid";

      if (
        invoice.status ===
        "cancelled"
      ) {
        status =
          "cancelled";
      } else if (
        newPaid >= total &&
        total > 0
      ) {
        status =
          "paid";
      } else if (
        newPaid > 0
      ) {
        status =
          "partial";
      } else if (
        invoice.due_date &&
        new Date(
          invoice.due_date
        ) < new Date()
      ) {
        status =
          "overdue";
      }

      await update(
        "invoices",
        invoice.id,
        {
          amount_paid:
            newPaid,
          amount_due:
            newDue,
          status,
          updated_at:
            now()
        }
      );
    }

    await audit(
      "delete",
      "payments",
      id,
      payment
    );

    toast(
      "Paiement supprimé."
    );

    render();
  } catch (error) {
    console.error(error);

    toast(
      error.message ||
        "Impossible de supprimer le paiement."
    );
  }
}

function openStockMovementForm(
  stockItemId
) {
  const item =
    (
      state.db.stock_items ||
      []
    ).find(
      stockItem =>
        stockItem.id ===
        stockItemId
    );

  if (!item) {
    toast(
      "Article de stock introuvable."
    );
    return;
  }

  const projects =
    state.db.projects || [];

  const employees =
    state.db.profiles || [];

  const employeeOptions =
    employees
      .filter(
        employee =>
          employee.active !== false
      )
      .map(
        employee => `
          <option
            value="${employee.id}"
          >
            ${esc(
              employee.full_name ||
                employee.email ||
                "Utilisateur"
            )}
          </option>
        `
      )
      .join("");

  const projectOptions =
    projects
      .map(
        project => `
          <option
            value="${project.id}"
          >
            ${esc(
              project.name
            )}
          </option>
        `
      )
      .join("");

  const movementTypes =
    state.role === "employee"
      ? [
          ["use", "Utilisation"],
          ["return", "Retour"]
        ]
      : [
          ["entry", "Entrée"],
          ["exit", "Sortie"],
          ["use", "Utilisation"],
          ["return", "Retour"],
          ["adjustment", "Ajustement"]
        ];

  document.getElementById(
    "modalTitle"
  ).textContent =
    "Mouvement de stock";

  document.getElementById(
    "recordForm"
  ).innerHTML = `
    <div class="form-grid">

      <div class="card full">
        <strong>
          ${esc(item.name)}
        </strong>

        <p class="muted">
          Stock actuel :
          ${Number(
            item.quantity || 0
          )}
          ${esc(
            item.unit || ""
          )}
        </p>
      </div>

      <label>
        Type

        <select
          name="type"
          required
        >
          ${movementTypes
            .map(
              option => `
                <option
                  value="${option[0]}"
                >
                  ${option[1]}
                </option>
              `
            )
            .join("")}
        </select>
      </label>

      <label>
        Quantité

        <input
          name="quantity"
          type="number"
          min="0.01"
          step="0.01"
          required
        >
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
        Responsable

        <select
          name="employee_id"
        >
          <option value="">
            Sélectionner
          </option>

          ${employeeOptions}
        </select>
      </label>

      <label class="full">
        Notes

        <textarea
          name="notes"
        ></textarea>
      </label>

      <div class="full actions">

        <button
          type="button"
          class="secondary"
          id="cancelStockMovement"
        >
          Annuler
        </button>

        <button
          class="primary"
        >
          Enregistrer
        </button>

      </div>
    </div>
  `;

  document.getElementById(
    "cancelStockMovement"
  ).onclick = closeModal;

  document.getElementById(
    "recordForm"
  ).onsubmit =
    async event => {
      event.preventDefault();

      const formData =
        new FormData(
          event.target
        );

      const type =
        formData.get("type");

      const quantity =
        Number(
          formData.get(
            "quantity"
          ) || 0
        );

      if (
        !Number.isFinite(
          quantity
        ) ||
        quantity <= 0
      ) {
        toast(
          "La quantité doit être supérieure à zéro."
        );
        return;
      }

      const payload = {
        stock_item_id:
          stockItemId,
        type,
        quantity,
        project_id:
          formData.get(
            "project_id"
          ) || null,
        employee_id:
          formData.get(
            "employee_id"
          ) ||
          state.user.id,
        notes:
          String(
            formData.get(
              "notes"
            ) || ""
          ).trim()
      };

      try {
        if (
          state.cloud &&
          sb
        ) {
          const {
            data,
            error
          } = await sb.rpc(
            "create_stock_movement",
            {
              p_stock_item_id:
                stockItemId,
              p_type: type,
              p_quantity:
                quantity,
              p_project_id:
                payload.project_id,
              p_activity_id:
                null,
              p_employee_id:
                payload.employee_id,
              p_notes:
                payload.notes
            }
          );

          if (error) {
            throw error;
          }

          if (data) {
            await syncCloud();
          }
        } else {
          const current =
            Number(
              item.quantity || 0
            );

          let newQuantity =
            current;

          if (
            type ===
              "entry" ||
            type === "return"
          ) {
            newQuantity +=
              quantity;
          }

          if (
            type ===
              "exit" ||
            type === "use"
          ) {
            newQuantity -=
              quantity;
          }

          if (
            type ===
            "adjustment"
          ) {
            newQuantity =
              quantity;
          }

          if (
            newQuantity < 0
          ) {
            throw new Error(
              "Stock insuffisant."
            );
          }

          item.quantity =
            newQuantity;

          await insert(
            "stock_movements",
            payload
          );
        }

        await audit(
          "insert",
          "stock_movements",
          null,
          payload
        );

        toast(
          "Mouvement enregistré."
        );

        closeModal();

        render();
      } catch (error) {
        console.error(error);

        toast(
          error.message ||
            "Erreur lors du mouvement de stock."
        );
      }
    };

  document
    .getElementById("modal")
    .classList.remove("hidden");
}

function openDocumentForm(
  table,
  id = null,
  readonly = false
) {
  if (
    table !== "quotes" &&
    table !== "invoices"
  ) {
    return;
  }

  const existing =
    id
      ? (
          state.db[table] ||
          []
        ).find(
          item => item.id === id
        )
      : null;

  const isInvoice =
    table === "invoices";

  const title =
    readonly
      ? isInvoice
        ? "Détails de la facture"
        : "Détails du devis"
      : id
      ? isInvoice
        ? "Modifier la facture"
        : "Modifier le devis"
      : isInvoice
      ? "Nouvelle facture"
      : "Nouveau devis";

  document.getElementById(
    "modalTitle"
  ).textContent = title;

  const clients =
    state.db.clients || [];

  const clientOptions =
    clients
      .map(
        client => `
          <option
            value="${client.id}"
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
        `
      )
      .join("");

  const issueDate =
    existing?.issue_date ||
    new Date()
      .toISOString()
      .slice(0, 10);

  const dueDate =
    existing?.due_date ||
    new Date(
      Date.now() +
        30 * 86400000
    )
      .toISOString()
      .slice(0, 10);

  const validUntil =
    existing?.valid_until ||
    new Date(
      Date.now() +
        15 * 86400000
    )
      .toISOString()
      .slice(0, 10);

  const statuses = isInvoice
    ? [
        "draft",
        "unpaid",
        "partial",
        "paid",
        "cancelled",
        "overdue"
      ]
    : [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "converted"
      ];

  document.getElementById(
    "recordForm"
  ).innerHTML = `
    <div class="form-grid">

      <label>
        ${
          isInvoice
            ? "N° facture"
            : "N° devis"
        }

        <input
          name="${
            isInvoice
              ? "invoice_number"
              : "quote_number"
          }"
          value="${esc(
            existing?.[
              isInvoice
                ? "invoice_number"
                : "quote_number"
            ] ||
              ""
          )}"
          ${
            readonly
              ? "disabled"
              : ""
          }
        >
      </label>

      <label>
        Client

        <select
          name="client_id"
          ${
            readonly
              ? "disabled"
              : ""
          }
          required
        >
          <option value="">
            Sélectionner un client
          </option>

          ${clientOptions}
        </select>
      </label>

      <label>
        Date

        <input
          type="date"
          name="issue_date"
          value="${issueDate}"
          ${
            readonly
              ? "disabled"
              : ""
          }
          required
        >
      </label>

      <label>
        ${
          isInvoice
            ? "Échéance"
            : "Valable jusqu’au"
        }

        <input
          type="date"
          name="${
            isInvoice
              ? "due_date"
              : "valid_until"
          }"
          value="${
            isInvoice
              ? dueDate
              : validUntil
          }"
          ${
            readonly
              ? "disabled"
              : ""
          }
        >
      </label>

      <label class="full">
        Titre

        <input
          name="title"
          value="${esc(
            existing?.title ||
              ""
          )}"
          ${
            readonly
              ? "disabled"
              : ""
          }
        >
      </label>

      <label class="full">
        Description

        <textarea
          name="description"
          ${
            readonly
              ? "disabled"
              : ""
          }
        >${esc(
          existing?.description ||
            ""
        )}</textarea>
      </label>

      <label>
        Remise

        <input
          type="number"
          name="discount"
          min="0"
          step="0.01"
          value="${Number(
            existing?.discount ||
              0
          )}"
          ${
            readonly
              ? "disabled"
              : ""
          }
        >
      </label>

      <label>
        Taxe

        <input
          type="number"
          name="tax"
          min="0"
          step="0.01"
          value="${Number(
            existing?.tax ||
              0
          )}"
          ${
            readonly
              ? "disabled"
              : ""
          }
        >
      </label>

      <label>
        Statut

        <select
          name="status"
          ${
            readonly
              ? "disabled"
              : ""
          }
        >
          ${statuses
            .map(
              status => `
                <option
                  value="${status}"
                  ${
                    (
                      existing?.status ||
                      "draft"
                    ) === status
                      ? "selected"
                      : ""
                  }
                >
                  ${statusLabel(
                    status
                  )}
                </option>
              `
            )
            .join("")}
        </select>
      </label>

      ${
        isInvoice
          ? `
            <label>
              Montant payé

              <input
                type="number"
                name="amount_paid"
                min="0"
                step="0.01"
                value="${Number(
                  existing?.amount_paid ||
                    0
                )}"
                ${
                  readonly
                    ? "disabled"
                    : ""
                }
              >
            </label>
          `
          : ""
      }

      <div class="full">
        <h3>
          Lignes détaillées
        </h3>

        <div
          id="documentLines"
          class="document-lines"
        ></div>
      </div>

      <div class="full">
        <div
          id="documentSummary"
          class="card"
        ></div>
      </div>

      <label class="full">
        Notes

        <textarea
          name="notes"
          ${
            readonly
              ? "disabled"
              : ""
          }
        >${esc(
          existing?.notes ||
            ""
        )}</textarea>
      </label>

      <label class="full">
        Conditions

        <textarea
          name="terms"
          ${
            readonly
              ? "disabled"
              : ""
          }
        >${esc(
          existing?.terms ||
            ""
        )}</textarea>
      </label>

      ${
        readonly
          ? `
            <div class="full actions">
              <button
                type="button"
                class="secondary"
                id="closeDocumentDetails"
              >
                Fermer
              </button>
            </div>
          `
          : `
            <div class="full actions">

              <button
                type="button"
                class="secondary"
                id="cancelDocument"
              >
                Annuler
              </button>

              <button
                class="primary"
              >
                Enregistrer
              </button>

            </div>
          `
      }
    </div>
  `;

  const linesContainer =
    document.getElementById(
      "documentLines"
    );

  const existingLines =
    existing
      ? (
          state.db[
            isInvoice
              ? "invoice_items"
              : "quote_items"
          ] || []
        ).filter(
          line =>
            line[
              isInvoice
                ? "invoice_id"
                : "quote_id"
            ] === existing.id
        )
      : [];

  let lineDrafts =
    existingLines.length
      ? existingLines.map(
          line => ({
            id: line.id,
            description:
              line.description ||
              "",
            quantity:
              Number(
                line.quantity || 1
              ),
            unit_price:
              Number(
                line.unit_price ||
                  0
              ),
            amount:
              Number(
                line.amount ||
                  0
              )
          })
        )
      : [
          {
            description: "",
            quantity: 1,
            unit_price: 0,
            amount: 0
          }
        ];

  function renderLines() {
    if (!linesContainer) {
      return;
    }

    linesContainer.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Qté</th>
              <th>Prix unitaire</th>
              <th>Total</th>
              ${
                readonly
                  ? ""
                  : "<th></th>"
              }
            </tr>
          </thead>

          <tbody>
            ${lineDrafts
              .map(
                (line, index) => `
                  <tr>

                    <td>
                      <input
                        type="text"
                        data-line-description="${index}"
                        value="${esc(
                          line.description
                        )}"
                        ${
                          readonly
                            ? "disabled"
                            : ""
                        }
                      >
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        data-line-quantity="${index}"
                        value="${Number(
                          line.quantity ||
                            0
                        )}"
                        ${
                          readonly
                            ? "disabled"
                            : ""
                        }
                      >
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        data-line-price="${index}"
                        value="${Number(
                          line.unit_price ||
                            0
                        )}"
                        ${
                          readonly
                            ? "disabled"
                            : ""
                        }
                      >
                    </td>

                    <td>
                      <strong>
                        ${money(
                          Number(
                            line.quantity ||
                              0
                          ) *
                            Number(
                              line.unit_price ||
                                0
                            )
                        )}
                      </strong>
                    </td>

                    ${
                      readonly
                        ? ""
                        : `
                          <td>
                            <button
                              type="button"
                              class="danger ghost"
                              data-remove-line="${index}"
                            >
                              ×
                            </button>
                          </td>
                        `
                    }

                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      ${
        readonly
          ? ""
          : `
            <button
              type="button"
              class="secondary"
              id="addDocumentLine"
              style="margin-top:10px"
            >
              + Ajouter une ligne
            </button>
          `
      }
    `;

    updateSummary();
  }

  function updateSummary() {
    const subtotal =
      lineDrafts.reduce(
        (sum, line) =>
          sum +
          Number(
            line.quantity || 0
          ) *
            Number(
              line.unit_price ||
                0
            ),
        0
      );

    const discount =
      Number(
        document.querySelector(
          '[name="discount"]'
        )?.value || 0
      );

    const tax =
      Number(
        document.querySelector(
          '[name="tax"]'
        )?.value || 0
      );

    const total =
      Math.max(
        0,
        subtotal -
          discount +
          tax
      );

    const paid =
      Number(
        document.querySelector(
          '[name="amount_paid"]'
        )?.value || 0
      );

    const due =
      Math.max(
        0,
        total - paid
      );

    const summary =
      document.getElementById(
        "documentSummary"
      );

    if (!summary) return;

    summary.innerHTML = `
      <div class="grid kpis">

        <div class="kpi">
          <small>Sous-total</small>
          <strong>
            ${money(subtotal)}
          </strong>
        </div>

        <div class="kpi">
          <small>Remise</small>
          <strong>
            ${money(discount)}
          </strong>
        </div>

        <div class="kpi">
          <small>Taxe</small>
          <strong>
            ${money(tax)}
          </strong>
        </div>

        <div class="kpi">
          <small>Total</small>
          <strong>
            ${money(total)}
          </strong>
        </div>

        ${
          isInvoice
            ? `
              <div class="kpi">
                <small>Reste</small>
                <strong>
                  ${money(due)}
                </strong>
              </div>
            `
            : ""
        }

      </div>
    `;
  }

  renderLines();

  if (!readonly) {
    document.getElementById(
      "addDocumentLine"
    )?.addEventListener(
      "click",
      () => {
        lineDrafts.push({
          description: "",
          quantity: 1,
          unit_price: 0,
          amount: 0
        });

        renderLines();
      }
    );

    linesContainer?.addEventListener(
      "input",
      event => {
        const target =
          event.target;

        const descriptionIndex =
          target.dataset
            .lineDescription;

        const quantityIndex =
          target.dataset
            .lineQuantity;

        const priceIndex =
          target.dataset
            .linePrice;

        if (
          descriptionIndex !==
          undefined
        ) {
          lineDrafts[
            Number(
              descriptionIndex
            )
          ].description =
            target.value;
        }

        if (
          quantityIndex !==
          undefined
        ) {
          lineDrafts[
            Number(
              quantityIndex
            )
          ].quantity =
            Number(
              target.value || 0
            );
        }

        if (
          priceIndex !==
          undefined
        ) {
          lineDrafts[
            Number(
              priceIndex
            )
          ].unit_price =
            Number(
              target.value || 0
            );
        }

        renderLines();
      }
    );

    linesContainer?.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            "[data-remove-line]"
          );

        if (!button) return;

        const index =
          Number(
            button.dataset
              .removeLine
          );

        lineDrafts.splice(
          index,
          1
        );

        if (
          lineDrafts.length === 0
        ) {
          lineDrafts.push({
            description: "",
            quantity: 1,
            unit_price: 0,
            amount: 0
          });
        }

        renderLines();
      }
    );

    document
      .querySelector(
        '[name="discount"]'
      )
      ?.addEventListener(
        "input",
        updateSummary
      );

    document
      .querySelector(
        '[name="tax"]'
      )
      ?.addEventListener(
        "input",
        updateSummary
      );

    document
      .querySelector(
        '[name="amount_paid"]'
      )
      ?.addEventListener(
        "input",
        updateSummary
      );
  }

  const cancelButton =
    document.getElementById(
      "cancelDocument"
    );

  if (cancelButton) {
    cancelButton.onclick =
      closeModal;
  }

  const closeDetails =
    document.getElementById(
      "closeDocumentDetails"
    );

  if (closeDetails) {
    closeDetails.onclick =
      closeModal;
  }

  if (!readonly) {
    document.getElementById(
      "recordForm"
    ).onsubmit =
      async event => {
        event.preventDefault();

        const formData =
          new FormData(
            event.target
          );

        const subtotal =
          lineDrafts.reduce(
            (sum, line) =>
              sum +
              Number(
                line.quantity ||
                  0
              ) *
                Number(
                  line.unit_price ||
                    0
                ),
            0
          );

        const discount =
          Number(
            formData.get(
              "discount"
            ) || 0
          );

        const tax =
          Number(
            formData.get(
              "tax"
            ) || 0
          );

        const total =
          Math.max(
            0,
            subtotal -
              discount +
              tax
          );

        const amountPaid =
          isInvoice
            ? Number(
                formData.get(
                  "amount_paid"
                ) || 0
              )
            : 0;

        const amountDue =
          Math.max(
            0,
            total -
              amountPaid
          );

        let status =
          formData.get(
            "status"
          ) ||
          "draft";

        if (isInvoice) {
          if (
            status !==
            "cancelled"
          ) {
            if (
              total > 0 &&
              amountPaid >= total
            ) {
              status = "paid";
            } else if (
              amountPaid > 0
            ) {
              status = "partial";
            } else if (
              formData.get(
                "due_date"
              ) &&
              new Date(
                formData.get(
                  "due_date"
                )
              ) < new Date() &&
              total > amountPaid
            ) {
              status = "overdue";
            } else {
              status = "unpaid";
            }
          }
        }

        const payload = {
          client_id:
            formData.get(
              "client_id"
            ) || null,

          issue_date:
            formData.get(
              "issue_date"
            ),

          title:
            formData.get(
              "title"
            ),

          description:
            formData.get(
              "description"
            ),

          subtotal,
          discount,
          tax,
          total,

          status,

          notes:
            formData.get(
              "notes"
            ),

          terms:
            formData.get(
              "terms"
            ),

          updated_at:
            now()
        };

        if (isInvoice) {
          payload.invoice_number =
            formData.get(
              "invoice_number"
            );

          payload.due_date =
            formData.get(
              "due_date"
            );

          payload.amount_paid =
            amountPaid;

          payload.amount_due =
            amountDue;
        } else {
          payload.quote_number =
            formData.get(
              "quote_number"
            );

          payload.valid_until =
            formData.get(
              "valid_until"
            );
        }

        try {
          let documentId =
            id;

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

          const itemTable =
            isInvoice
              ? "invoice_items"
              : "quote_items";

          const foreignKey =
            isInvoice
              ? "invoice_id"
              : "quote_id";

          if (state.cloud) {
            const {
              error:
                deleteError
            } = await sb
              .from(itemTable)
              .delete()
              .eq(
                foreignKey,
                documentId
              );

            if (deleteError) {
              throw deleteError;
            }

            if (lineDrafts.length) {
              const items =
                lineDrafts
                  .filter(
                    line =>
                      String(
                        line.description ||
                          ""
                      ).trim() ||
                      Number(
                        line.quantity ||
                          0
                      ) > 0
                  )
                  .map(line => ({
                    [foreignKey]:
                      documentId,
                    description:
                      String(
                        line.description ||
                          ""
                      ).trim(),
                    quantity:
                      Number(
                        line.quantity ||
                          0
                      ),
                    unit_price:
                      Number(
                        line.unit_price ||
                          0
                      ),
                    amount:
                      Number(
                        line.quantity ||
                          0
                      ) *
                      Number(
                        line.unit_price ||
                          0
                      )
                  }));

              if (items.length) {
                const {
                  error:
                    insertError
                } = await sb
                  .from(itemTable)
                  .insert(items);

                if (insertError) {
                  throw insertError;
                }
              }
            }

            await syncCloud();
          } else {
            state.db[
              itemTable
            ] = (
              state.db[
                itemTable
              ] || []
            ).filter(
              item =>
                item[
                  foreignKey
                ] !== documentId
            );

            lineDrafts.forEach(
              line => {
                state.db[
                  itemTable
                ].push({
                  id: uid(),
                  [foreignKey]:
                    documentId,
                  description:
                    String(
                      line.description ||
                        ""
                    ).trim(),
                  quantity:
                    Number(
                      line.quantity ||
                        0
                    ),
                  unit_price:
                    Number(
                      line.unit_price ||
                        0
                    ),
                  amount:
                    Number(
                      line.quantity ||
                        0
                    ) *
                    Number(
                      line.unit_price ||
                        0
                    ),
                  created_at:
                    now()
                });
              }
            );

            saveLocal();
          }

          await audit(
            id
              ? "update"
              : "insert",
            table,
            documentId,
            {
              ...payload,
              line_count:
                lineDrafts.length
            }
          );

          toast(
            isInvoice
              ? "Facture enregistrée."
              : "Devis enregistré."
          );

          closeModal();

          render();
        } catch (error) {
          console.error(error);

          toast(
            error.message ||
              "Erreur lors de l’enregistrement."
          );
        }
      };
  }

  document
    .getElementById("modal")
    .classList.remove("hidden");
}

function bindPage() {
  document
    .querySelectorAll(
      "[data-add]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const table =
            button.dataset.add;

          if (
            table ===
            "quotes"
          ) {
            openDocumentForm(
              "quotes"
            );
            return;
          }

          if (
            table ===
            "invoices"
          ) {
            openDocumentForm(
              "invoices"
            );
            return;
          }

          openForm(table);
        }
      );
    });

  document
    .querySelectorAll(
      "[data-edit]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          openForm(
            button.dataset.edit,
            button.dataset.id
          );
        }
      );
    });

  document
    .querySelectorAll(
      "[data-delete]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          del(
            button.dataset.delete,
            button.dataset.id
          );
        }
      );
    });

  document
    .querySelectorAll(
      "[data-edit-document]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          openDocumentForm(
            button.dataset
              .editDocument,
            button.dataset.id,
            false
          );
        }
      );
    });

  document
    .querySelectorAll(
      "[data-details-document]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          openDocumentForm(
            button.dataset
              .detailsDocument,
            button.dataset.id,
            true
          );
        }
      );
    });

  document
    .querySelectorAll(
      "[data-add-payment]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          openPaymentForm(
            button.dataset
              .addPayment
          );
        }
      );
    });

  document
    .querySelectorAll(
      "[data-delete-payment]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          deletePayment(
            button.dataset
              .deletePayment
          );
        }
      );
    });

  document
    .querySelectorAll(
      "[data-stock-move]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          openStockMovementForm(
            button.dataset
              .stockMove
          );
        }
      );
    });

  document
    .querySelectorAll(
      "[data-edit-stock]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          openForm(
            "stock_items",
            button.dataset
              .editStock
          );
        }
      );
    });

  document
    .querySelectorAll(
      "[data-role]"
    )
    .forEach(select => {
      select.addEventListener(
        "change",
        async event => {
          if (
            state.role !==
            "admin"
          ) {
            return;
          }

          const userId =
            event.target.dataset
              .role;

          const role =
            event.target.value;

          try {
            await update(
              "profiles",
              userId,
              {
                role,
                updated_at:
                  now()
              }
            );

            await audit(
              "update",
              "profiles",
              userId,
              { role }
            );

            toast(
              "Rôle modifié."
            );

            if (
              userId ===
              state.user.id
            ) {
              state.role =
                role;
            }

            render();
          } catch (error) {
            console.error(
              error
            );

            toast(
              error.message ||
                "Impossible de modifier le rôle."
            );
          }
        }
      );
    });

  document
    .querySelectorAll(
      "[data-toggle-active]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          if (
            state.role !==
            "admin"
          ) {
            return;
          }

          const userId =
            button.dataset
              .toggleActive;

          const user =
            (
              state.db.profiles ||
              []
            ).find(
              profile =>
                profile.id ===
                userId
            );

          if (!user) {
            return;
          }

          try {
            await update(
              "profiles",
              userId,
              {
                active:
                  user.active ===
                  false
                    ? true
                    : false,
                updated_at:
                  now()
              }
            );

            await audit(
              "update",
              "profiles",
              userId,
              {
                active:
                  user.active ===
                  false
                    ? true
                    : false
              }
            );

            toast(
              "Statut du compte modifié."
            );

            render();
          } catch (error) {
            console.error(
              error
            );

            toast(
              error.message ||
                "Impossible de modifier le compte."
            );
          }
        }
      );
    });

  const createEmployeeButton =
    document.getElementById(
      "createEmployeeBtn"
    );

  if (createEmployeeButton) {
    createEmployeeButton.addEventListener(
      "click",
      openCreateEmployeeForm
    );
  }

  const newPaymentButton =
    document.getElementById(
      "newPaymentBtn"
    );

  if (newPaymentButton) {
    newPaymentButton.addEventListener(
      "click",
      () =>
        openPaymentForm()
    );
  }

  const settingsForm =
    document.getElementById(
      "settingsForm"
    );

  if (settingsForm) {
    settingsForm.addEventListener(
      "submit",
      saveSettings
    );
  }
}

function openCreateEmployeeForm() {
  if (state.role !== "admin") {
    toast(
      "Seul l’administrateur peut créer un compte employé."
    );
    return;
  }

  document.getElementById(
    "modalTitle"
  ).textContent =
    "Créer un compte employé";

  document.getElementById(
    "recordForm"
  ).innerHTML = `
    <div class="form-grid">

      <label>
        Nom complet

        <input
          name="full_name"
          required
        >
      </label>

      <label>
        Téléphone

        <input
          name="phone"
          type="tel"
        >
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
        Confirmation

        <input
          name="password_confirm"
          type="password"
          minlength="8"
          required
        >
      </label>

      <div class="full actions">

        <button
          type="button"
          class="secondary"
          id="cancelEmployee"
        >
          Annuler
        </button>

        <button
          class="primary"
        >
          Créer le compte
        </button>

      </div>
    </div>
  `;

  document.getElementById(
    "cancelEmployee"
  ).onclick = closeModal;

  document.getElementById(
    "recordForm"
  ).onsubmit =
    async event => {
      event.preventDefault();

      const formData =
        new FormData(
          event.target
        );

      const fullName =
        String(
          formData.get(
            "full_name"
          ) || ""
        ).trim();

      const phone =
        String(
          formData.get(
            "phone"
          ) || ""
        ).trim();

      const email =
        String(
          formData.get(
            "email"
          ) || ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          formData.get(
            "password"
          ) || ""
        );

      const confirmation =
        String(
          formData.get(
            "password_confirm"
          ) || ""
        );

      if (
        password !==
        confirmation
      ) {
        toast(
          "Les mots de passe ne correspondent pas."
        );
        return;
      }

      if (
        password.length < 8
      ) {
        toast(
          "Le mot de passe doit contenir au moins 8 caractères."
        );
        return;
      }

      try {
        if (
          !state.cloud ||
          !sb
        ) {
          const profile = {
            id: uid(),
            full_name:
              fullName,
            phone,
            email,
            role: "employee",
            active: true,
            created_at:
              now()
          };

          state.db.profiles.unshift(
            profile
          );

          saveLocal();

          await audit(
            "insert",
            "profiles",
            profile.id,
            {
              full_name:
                fullName,
              email
            }
          );

          toast(
            "Compte employé créé en mode démo."
          );

          closeModal();

          render();

          return;
        }

        const {
          data: sessionData
        } = await sb.auth.getSession();

        const accessToken =
          sessionData?.session
            ?.access_token;

        if (!accessToken) {
          throw new Error(
            "Session administrateur introuvable."
          );
        }

        const functionUrl =
          `${CFG.SUPABASE_URL}/functions/v1/create-employee`;

        const response =
          await fetch(
            functionUrl,
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
                apikey:
                  CFG.SUPABASE_ANON_KEY,
                "Content-Type":
                  "application/json"
              },
              body:
                JSON.stringify({
                  full_name:
                    fullName,
                  email,
                  password,
                  phone
                })
            }
          );

        const result =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              "Impossible de créer le compte employé."
          );
        }

        await syncCloud();

        await audit(
          "insert",
          "profiles",
          result.user?.id ||
            null,
          {
            full_name:
              fullName,
            email
          }
        );

        toast(
          "Compte employé créé."
        );

        closeModal();

        render();
      } catch (error) {
        console.error(
          "Création employé :",
          error
        );

        toast(
          error.message ||
            "Impossible de créer le compte."
        );
      }
    };

  document
    .getElementById("modal")
    .classList.remove("hidden");
}

function csvCell(value) {
  let text =
    value == null
      ? ""
      : typeof value ===
        "object"
      ? safeJson(value)
      : String(value);

  if (
    /^[=+\-@]/.test(text)
  ) {
    text = "'" + text;
  }

  return `"${text.replace(
    /"/g,
    '""'
  )}"`;
}

function rowsToCsv(
  headers,
  rows
) {
  return [
    headers
      .map(csvCell)
      .join(","),

    ...rows.map(row =>
      headers
        .map(header =>
          csvCell(
            row[header]
          )
        )
        .join(",")
    )
  ].join("\r\n");
}

function exportSalesCsv() {
  const rows = (
    state.db.sales || []
  ).map(item => ({
    Client:
      item.customer || "",

    Article:
      item.item || "",

    Quantité:
      item.quantity ?? "",

    Montant:
      item.amount ?? 0,

    Paiement:
      paymentMethodLabel(
        item.payment_method
      ),

    Statut:
      statusLabel(
        item.status
      ),

    Notes:
      item.notes || "",

    Date:
      item.created_at || ""
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

function exportAllCsv() {
  const sections = [];

  const add = (
    title,
    table,
    headers,
    map
  ) => {
    sections.push(
      `### ${title}`
    );

    sections.push(
      headers
        .map(csvCell)
        .join(",")
    );

    (
      state.db[table] || []
    ).forEach(item => {
      const row = map(item);

      sections.push(
        headers
          .map(header =>
            csvCell(
              row[header]
            )
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
    item => ({
      Client:
        item.customer || "",
      Article:
        item.item || "",
      Quantité:
        item.quantity ?? "",
      Montant:
        item.amount ?? 0,
      Paiement:
        paymentMethodLabel(
          item.payment_method
        ),
      Statut:
        statusLabel(
          item.status
        ),
      Notes:
        item.notes || "",
      Date:
        item.created_at || ""
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
    item => ({
      Fournisseur:
        item.supplier || "",
      Article:
        item.item || "",
      Quantité:
        item.quantity ?? "",
      Montant:
        item.amount ?? 0,
      Statut:
        statusLabel(
          item.status
        ),
      Notes:
        item.notes || "",
      Date:
        item.created_at || ""
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
    item => ({
      Catégorie:
        item.category || "",
      Libellé:
        item.label || "",
      Montant:
        item.amount ?? 0,
      Bénéficiaire:
        item.beneficiary ||
        "",
      Notes:
        item.notes || "",
      Date:
        item.created_at || ""
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
    item => ({
      Titre:
        item.title || "",
      Catégorie:
        item.category || "",
      Description:
        item.description ||
        "",
      Lieu:
        item.location || "",
      Statut:
        statusLabel(
          item.status
        ),
      Montant:
        item.amount ?? 0,
      Date:
        item.created_at || ""
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
    item => ({
      Nom:
        item.name || "",
      Client:
        item.client || "",
      Description:
        item.description ||
        "",
      Statut:
        statusLabel(
          item.status
        ),
      Progression:
        item.progress ?? "",
      Budget:
        item.budget ?? 0,
      Date:
        item.created_at || ""
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
    item => ({
      Titre:
        item.title || "",
      Description:
        item.description ||
        "",
      Étape:
        statusLabel(
          item.stage
        ),
      Budget:
        item.budget ?? 0,
      Progression:
        item.progress ?? "",
      Date:
        item.created_at || ""
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
    item => ({
      Article:
        item.name || "",
      Catégorie:
        item.category || "",
      Unité:
        item.unit || "",
      Quantité:
        item.quantity ?? "",
      "Seuil minimum":
        item.min_quantity ??
        "",
      Emplacement:
        item.location || "",
      Date:
        item.created_at || ""
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
    item => ({
      Nom:
        item.full_name || "",
      Entreprise:
        item.company_name ||
        "",
      Téléphone:
        item.phone || "",
      Email:
        item.email || "",
      Ville:
        item.city || "",
      Date:
        item.created_at || ""
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
    item => ({
      Numéro:
        item.invoice_number ||
        "",
      Client:
        clientName(
          item.client_id
        ),
      Date:
        item.issue_date || "",
      Échéance:
        item.due_date || "",
      Total:
        item.total ?? 0,
      Payé:
        item.amount_paid ??
        0,
      Reste:
        item.amount_due ??
        0,
      Statut:
        statusLabel(
          invoiceDisplayStatus(
            item
          )
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
      "Référence",
      "Notes"
    ],
    item => ({
      Facture:
        (
          state.db.invoices ||
          []
        ).find(
          invoice =>
            invoice.id ===
            item.invoice_id
        )?.invoice_number ||
        "",

      Montant:
        item.amount ?? 0,

      Mode:
        paymentMethodLabel(
          item.payment_method
        ),

      Date:
        item.payment_date ||
        "",

      Référence:
        item.reference ||
        "",

      Notes:
        item.notes || ""
    })
  );

  downloadFile(
    "luc-bricotech-export-complet.csv",
    sections.join("\r\n"),
    "text/csv;charset=utf-8"
  );
}

function exportAuditCsv() {
  if (state.role !== "admin") {
    toast(
      "Export du journal réservé à l’administrateur."
    );
    return;
  }

  const rows = (
    state.db.audit_logs ||
    []
  ).map(item => ({
    Date:
      item.created_at || "",
    Action:
      item.action || "",
    Entité:
      item.entity || "",
    "ID entité":
      item.entity_id || "",
    Détails:
      safeJson(
        item.details || {}
      )
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

function backupAllData() {
  downloadFile(
    "luc-bricotech-backup.json",
    JSON.stringify(
      {
        application:
          "LUC BRICO-TECH",
        exported_at: now(),
        role:
          state.role,
        user_id:
          state.user?.id ||
          null,
        data:
          state.db
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
  mime = "text/plain;charset=utf-8"
) {
  try {
    const content =
      String(data ?? "");

    const blob = new Blob(
      [
        "\uFEFF",
        content
      ],
      {
        type: mime
      }
    );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;
    link.download = name;
    link.rel = "noopener";
    link.style.display =
      "none";

    document.body.appendChild(
      link
    );

    link.click();

    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(
        url
      );
    }, 1500);

    toast(
      `Export terminé : ${name}`
    );
  } catch (error) {
    console.error(
      "Erreur export :",
      error
    );

    try {
      const dataUrl =
        "data:" +
        mime +
        "," +
        encodeURIComponent(
          "\uFEFF" +
            String(
              data ?? ""
            )
        );

      const link =
        document.createElement(
          "a"
        );

      link.href =
        dataUrl;

      link.download =
        name;

      link.target =
        "_blank";

      link.rel =
        "noopener";

      document.body.appendChild(
        link
      );

      link.click();

      setTimeout(
        () =>
          link.remove(),
        1000
      );

      toast(
        `Fichier prêt : ${name}`
      );
    } catch (
      fallbackError
    ) {
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
  event => {
    const button =
      event.target.closest?.(
        "#exportSalesCsv, #exportAllCsv, #exportAuditCsv, #backupBtn"
      );

    if (!button) return;

    if (
      button.id ===
      "exportSalesCsv"
    ) {
      exportSalesCsv();
    }

    if (
      button.id ===
      "exportAllCsv"
    ) {
      exportAllCsv();
    }

    if (
      button.id ===
      "exportAuditCsv"
    ) {
      exportAuditCsv();
    }

    if (
      button.id ===
      "backupBtn"
    ) {
      backupAllData();
    }
  }
);

if (
  !document.getElementById(
    "lbt-doc-status-style"
  )
) {
  const style =
    document.createElement(
      "style"
    );

  style.id =
    "lbt-doc-status-style";

  style.textContent = `
    .badge.success{
      background:#dcfce7;
      color:#166534
    }

    .badge.warn{
      background:#fef3c7;
      color:#92400e
    }

    .badge.danger{
      background:#fee2e2;
      color:#991b1b
    }

    .badge.muted{
      background:#e5e7eb;
      color:#374151
    }
  `;

  document.head.appendChild(
    style
  );
}

boot();

})();
