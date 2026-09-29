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
  "settings"
];

const TABLES_WITH_USER_ID = [
  "sales",
  "purchases",
  "expenses",
  "activities",
  "projects",
  "innovations",
  "stock_movements",
  "audit_logs"
];

const schemas = {
  sales: {
    title: "Nouvelle vente",
    fields: [
      ["customer", "Client", "text", true],
      ["item", "Article / service", "text", true],
      ["quantity", "Quantité", "number", true],
      ["amount", "Montant (FCFA)", "number", true],
      ["payment_method", "Paiement", "select", false, ["cash", "mobile_money", "bank", "credit"]],
      ["status", "Statut", "select", false, ["paid", "pending", "cancelled"]],
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
      ["status", "Statut", "select", false, ["received", "pending", "cancelled"]],
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
      ["status", "Statut", "select", false, ["open", "in_progress", "done", "cancelled"]],
      ["amount", "Montant (FCFA)", "number", false]
    ]
  },

  projects: {
    title: "Nouveau projet",
    fields: [
      ["name", "Nom du projet", "text", true],
      ["client", "Client", "text", false],
      ["description", "Description", "textarea", false],
      ["status", "Statut", "select", false, ["planned", "active", "completed", "paused"]],
      ["progress", "Progression (%)", "number", false],
      ["budget", "Budget (FCFA)", "number", false]
    ]
  },

  innovations: {
    title: "Nouvelle innovation",
    fields: [
      ["title", "Titre", "text", true],
      ["description", "Description", "textarea", false],
      ["stage", "Étape", "select", false, ["idea", "prototype", "test", "production"]],
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
      ["quantity", "Quantité initiale", "number", true],
      ["min_quantity", "Seuil minimum", "number", false],
      ["location", "Emplacement", "text", false]
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

function loadLocal() {
  try {
    const d = JSON.parse(localStorage.getItem(DBKEY)) || seed();

    TABLES.forEach(table => {
      if (!Array.isArray(d[table])) d[table] = [];
    });

    return d;
  } catch {
    return seed();
  }
}

function seed() {
  return {
    profiles: [
      {
        id: "demo-admin",
        full_name: "Lucien BESSAN",
        email: "demo@lucbricotech.local",
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
    settings: []
  };
}

function saveLocal() {
  localStorage.setItem(DBKEY, JSON.stringify(state.db));
}

function toast(message) {
  const e = document.getElementById("toast");
  if (!e) return;

  e.textContent = message;
  e.classList.add("show");

  setTimeout(() => {
    e.classList.remove("show");
  }, 2400);
}

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
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
    : "demo-" + Date.now() + "-" + Math.random();
}

function now() {
  return new Date().toISOString();
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
        if (location.pathname.endsWith("login.html")) return;
        location.href = "login.html";
        return;
      }

      state.user = session.user;

      const {
        data: profile,
        error: profileError
      } = await sb
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;

      state.profile = profile || {
        id: session.user.id,
        full_name: session.user.email,
        email: session.user.email,
        role: "employee",
        active: true
      };

      if (state.profile.active === false) {
        await sb.auth.signOut();
        alert("Ce compte a été désactivé par l’administrateur.");
        location.href = "login.html";
        return;
      }

      state.role = state.profile.role;

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
            <button class="secondary" id="goLogin" style="margin-left:8px">
              Retour à la connexion
            </button>
          </div>
        `;
      }

      document
        .getElementById("retryConnection")
        ?.addEventListener("click", () => location.reload());

      document
        .getElementById("goLogin")
        ?.addEventListener(
          "click",
          () => (location.href = "login.html")
        );

      toast("Erreur de connexion sécurisée à Supabase.");
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

    bind();
    render();
  }
}

async function syncCloud() {
  for (const table of TABLES) {
    let query = sb.from(table).select("*");

    if (table !== "settings" && table !== "profiles") {
      query = query.order("created_at", {
        ascending: false
      });
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Erreur table ${table}:`, error);
      throw error;
    }

    state.db[table] = Array.isArray(data) ? data : [];
  }
}

async function insert(table, payload = {}) {
  if (!state.cloud) {
    const item = {
      id: uid(),
      ...(TABLES_WITH_USER_ID.includes(table)
        ? { user_id: state.user.id }
        : {}),
      created_at: now(),
      ...payload
    };

    state.db[table] ??= [];
    state.db[table].unshift(item);

    saveLocal();

    return item;
  }

  const item = {
    ...payload
  };

  if (TABLES_WITH_USER_ID.includes(table)) {
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

  if (error) throw error;

  state.db[table] ??= [];
  state.db[table].unshift(data);

  return data;
}

async function update(table, id, payload) {
  if (!state.cloud) {
    const arr = state.db[table] || [];
    const index = arr.findIndex(x => x.id === id);

    if (index >= 0) {
      arr[index] = {
        ...arr[index],
        ...payload
      };
    }

    saveLocal();
    return arr[index];
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

  if (error) throw error;

  const arr = state.db[table] || [];
  const index = arr.findIndex(x => x.id === id);

  if (index >= 0) {
    arr[index] = data;
  }

  return data;
}

async function remove(table, id) {
  if (!state.cloud) {
    state.db[table] = (state.db[table] || []).filter(
      x => x.id !== id
    );

    saveLocal();
    return;
  }

  const { error } = await sb
    .from(table)
    .delete()
    .eq("id", id);

  if (error) throw error;

  state.db[table] = (state.db[table] || []).filter(
    x => x.id !== id
  );
}

async function audit(action, entity, id, details = {}) {
  try {
    await insert("audit_logs", {
      action,
      entity,
      entity_id: id,
      details
    });
  } catch (error) {
    console.warn("Audit non enregistré :", error);
  }
}

const ROLE_PAGES = {
  admin: [
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

  manager: [
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

  employee: [
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

function allowedPages() {
  return ROLE_PAGES[state.role] || ROLE_PAGES.employee;
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
      button.onclick = () => {
        if (
          !allowedPages().includes(
            button.dataset.page
          )
        ) {
          return;
        }

        state.page = button.dataset.page;
        closeMenu();
        render();
      };
    });

  document.getElementById("menuBtn")?.addEventListener(
    "click",
    () => {
      document
        .getElementById("sidebar")
        ?.classList.toggle("open");
    }
  );

  document
    .getElementById("closeModal")
    ?.addEventListener("click", closeModal);

  document
    .getElementById("logoutBtn")
    ?.addEventListener("click", logout);
}

function closeMenu() {
  document
    .getElementById("sidebar")
    ?.classList.remove("open");
}

async function logout() {
  if (sb) {
    await sb.auth.signOut();
  }

  location.href = "login.html";
}

function setHeader(title, subtitle) {
  const titleElement =
    document.getElementById("pageTitle");

  const subElement =
    document.getElementById("pageSub");

  if (titleElement) {
    titleElement.textContent = title;
  }

  if (subElement) {
    subElement.textContent = subtitle;
  }
}

function render() {
  applyRoleNavigation();

  if (!allowedPages().includes(state.page)) {
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

  const pages = {
    dashboard: [
      "Tableau de bord",
      "Vue générale de l’activité."
    ],

    members: [
      "Membres",
      "Utilisateurs et rôles."
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
      "Articles, quantités et mouvements."
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
    ],

    stockHistory: [
      "Historique du stock",
      "Mouvements et traçabilité du matériel."
    ]
  };

  const current = pages[state.page] || pages.dashboard;

  setHeader(current[0], current[1]);

  const functions = {
    dashboard,
    members,
    sales: tablePage,
    purchases: tablePage,
    expenses: tablePage,
    stock,
    stockHistory,
    activities: tablePage,
    projects: tablePage,
    innovations: tablePage,
    reports,
    audit: auditPage,
    settings
  };

  const renderer =
    functions[state.page] || dashboard;

  const content = document.getElementById("content");

  if (content) {
    content.innerHTML = renderer(state.page);
  }

  bindPage();
}

function bindPage() {
  document
    .querySelectorAll("[data-add]")
    .forEach(button => {
      button.onclick = () =>
        openForm(button.dataset.add);
    });

  document
    .querySelectorAll("[data-delete]")
    .forEach(button => {
      button.onclick = () =>
        del(
          button.dataset.delete,
          button.dataset.id
        );
    });

  document
    .querySelectorAll("[data-role]")
    .forEach(select => {
      select.onchange = () =>
        changeRole(
          select.dataset.id,
          select.value
        );
    });

  document
    .querySelectorAll("[data-create-employee]")
    .forEach(button => {
      button.onclick = openEmployeeForm;
    });

  document
    .querySelectorAll("[data-toggle-active]")
    .forEach(input => {
      input.onchange = () =>
        toggleMember(
          input.dataset.id,
          input.checked
        );
    });

  document
    .querySelectorAll("[data-edit-stock]")
    .forEach(button => {
      button.onclick = () =>
        openForm(
          "stock_items",
          button.dataset.editStock
        );
    });

  document
    .querySelectorAll("[data-stock-move]")
    .forEach(button => {
      button.onclick = () =>
        stockMovementForm(
          button.dataset.stockMove
        );
    });

  document
    .getElementById("stockHistoryBtn")
    ?.addEventListener("click", () => {
      state.page = "stockHistory";
      render();
    });

  document
    .getElementById("backToStock")
    ?.addEventListener("click", () => {
      state.page = "stock";
      render();
    });

  document
    .getElementById("settingsForm")
    ?.addEventListener("submit", saveSettings);
}

function dashboard() {
  const sum = table =>
    (state.db[table] || []).reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    );

  const stock = (state.db.stock_items || [])
    .reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
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
          Centralisez les opérations et gardez
          une vision claire de l’activité.
        </span>
      </div>

      <div class="quick-actions">
        <button class="primary" data-add="sales">
          + Vente
        </button>

        <button class="secondary" data-add="activities">
          + Activité
        </button>

        <button class="secondary" data-add="projects">
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
        ${recent("activities", "title")}
      </div>

      <div class="card">
        <h3>Projets</h3>
        ${recent("projects", "name")}
      </div>

      <div class="card">
        <h3>Innovations</h3>
        ${recent("innovations", "title")}
      </div>

    </div>
  `;
}

function recent(table, key) {
  const arr = (state.db[table] || []).slice(0, 5);

  if (!arr.length) {
    return `<div class="empty">Aucun élément.</div>`;
  }

  return arr
    .map(item => `
      <p>
        <strong>${esc(item[key])}</strong>
        <br>
        <span class="muted">
          ${
            item.created_at
              ? new Date(item.created_at)
                  .toLocaleString("fr-FR")
              : ""
          }
        </span>
      </p>
    `)
    .join("");
}

function tablePage(table) {
  const labels = {
    sales: [
      "Client",
      "Article",
      "Montant",
      "Statut"
    ],

    purchases: [
      "Fournisseur",
      "Article",
      "Montant",
      "Statut"
    ],

    expenses: [
      "Catégorie",
      "Libellé",
      "Montant",
      "Bénéficiaire"
    ],

    activities: [
      "Titre",
      "Catégorie",
      "Statut",
      "Montant"
    ],

    projects: [
      "Nom",
      "Client",
      "Statut",
      "Progression"
    ],

    innovations: [
      "Titre",
      "Étape",
      "Progression",
      "Budget"
    ]
  };

  const columns = labels[table] || [];
  const arr = state.db[table] || [];

  const rows = arr
    .map(item => {
      let values;

      if (table === "sales") {
        values = [
          item.customer,
          item.item,
          money(item.amount),
          item.status
        ];
      }

      if (table === "purchases") {
        values = [
          item.supplier,
          item.item,
          money(item.amount),
          item.status
        ];
      }

      if (table === "expenses") {
        values = [
          item.category,
          item.label,
          money(item.amount),
          item.beneficiary
        ];
      }

      if (table === "activities") {
        values = [
          item.title,
          item.category,
          item.status,
          money(item.amount)
        ];
      }

      if (table === "projects") {
        values = [
          item.name,
          item.client,
          item.status,
          `${item.progress || 0} %`
        ];
      }

      if (table === "innovations") {
        values = [
          item.title,
          item.stage,
          `${item.progress || 0} %`,
          money(item.budget)
        ];
      }

      const action =
        state.role === "admin"
          ? `
            <button
              class="danger"
              data-delete="${table}"
              data-id="${item.id}"
            >
              Supprimer
            </button>
          `
          : "—";

      return `
        <tr>
          ${values
            .map(value => `<td>${esc(value)}</td>`)
            .join("")}

          <td>${action}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="toolbar">
      <div class="muted">
        ${arr.length} enregistrement(s)
      </div>

      <button
        class="primary"
        data-add="${table}"
      >
        + Ajouter
      </button>
    </div>

    <div class="table-wrap">
      <table>

        <thead>
          <tr>
            ${columns
              .map(column => `<th>${column}</th>`)
              .join("")}

            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          ${
            rows ||
            `
              <tr>
                <td colspan="${columns.length + 1}">
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
  `;
}

function stock() {
  const arr = state.db.stock_items || [];

  const rows = arr
    .map(item => {
      const manage = canManageStock();

      const actions = `
        <div class="actions-inline">

          <button
            class="secondary"
            data-stock-move="${item.id}"
          >
            Mouvement
          </button>

          ${
            manage
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

          ${
            state.role === "admin"
              ? `
                <button
                  class="danger"
                  data-delete="stock_items"
                  data-id="${item.id}"
                >
                  Supprimer
                </button>
              `
              : ""
          }

        </div>
      `;

      const quantity = Number(
        item.quantity || 0
      );

      const minimum = Number(
        item.min_quantity || 0
      );

      return `
        <tr>

          <td>
            <b>${esc(item.name)}</b>
          </td>

          <td>${esc(item.category)}</td>

          <td>
            ${quantity}
            ${esc(item.unit || "")}
          </td>

          <td>${minimum}</td>

          <td>${esc(item.location)}</td>

          <td>
            ${
              quantity <= minimum
                ? `
                  <span class="badge warn">
                    Stock faible
                  </span>
                `
                : `
                  <span class="badge success">
                    OK
                  </span>
                `
            }
          </td>

          <td>${actions}</td>

        </tr>
      `;
    })
    .join("");

  const addButton = canManageStock()
    ? `
      <button
        class="primary"
        data-add="stock_items"
      >
        + Ajouter un article
      </button>
    `
    : "";

  return `
    <div class="toolbar">

      <div>
        <b>${arr.length}</b> article(s)
        ·
        <span class="muted">
          Les mouvements mettent automatiquement
          les quantités à jour.
        </span>
      </div>

      <div class="actions-inline">

        ${addButton}

        <button
          class="secondary"
          id="stockHistoryBtn"
        >
          Historique des mouvements
        </button>

      </div>
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
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>

          ${
            rows ||
            `
              <tr>
                <td colspan="7">
                  <div class="empty">
                    Stock vide.
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

function stockMovementForm(stockId) {
  const item = (
    state.db.stock_items || []
  ).find(x => x.id === stockId);

  if (!item) {
    toast("Article de stock introuvable.");
    return;
  }

  const isEmployee =
    state.role === "employee";

  const projects =
    state.db.projects || [];

  const activities =
    state.db.activities || [];

  const members =
    (state.db.profiles || [])
      .filter(
        x => x.active !== false
      );

  const types = isEmployee
    ? ["use", "return"]
    : [
        "entry",
        "exit",
        "use",
        "return",
        "adjustment"
      ];

  const modalTitle =
    document.getElementById("modalTitle");

  const form =
    document.getElementById("recordForm");

  if (!modalTitle || !form) return;

  modalTitle.textContent =
    `Mouvement — ${item.name}`;

  form.innerHTML = `
    <div class="form-grid">

      <div class="full hint">
        <b>Stock actuel :</b>
        ${Number(item.quantity || 0)}
        ${esc(item.unit || "")}
      </div>

      <label>
        Type de mouvement

        <select name="movement_type">
          ${types
            .map(
              type => `
                <option value="${type}">
                  ${movementLabel(type)}
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
            — Aucun —
          </option>

          ${projects
            .map(
              project => `
                <option value="${project.id}">
                  ${esc(project.name)}
                </option>
              `
            )
            .join("")}
        </select>
      </label>

      <label>
        Activité

        <select name="activity_id">
          <option value="">
            — Aucune —
          </option>

          ${activities
            .map(
              activity => `
                <option value="${activity.id}">
                  ${esc(activity.title)}
                </option>
              `
            )
            .join("")}
        </select>
      </label>

      ${
        isEmployee
          ? `
            <input
              type="hidden"
              name="employee_id"
              value="${esc(state.user.id)}"
            >
          `
          : `
            <label>
              Responsable

              <select name="employee_id">

                <option value="">
                  — Non précisé —
                </option>

                ${members
                  .map(
                    member => `
                      <option value="${member.id}">
                        ${esc(
                          member.full_name ||
                          member.email ||
                          "Utilisateur"
                        )}
                      </option>
                    `
                  )
                  .join("")}

              </select>
            </label>
          `
      }

      <label class="full">
        Motif

        <textarea
          name="reason"
          placeholder="Pourquoi ce mouvement ?"
        ></textarea>
      </label>

      <label class="full">
        Notes

        <textarea
          name="notes"
          placeholder="Précisions complémentaires"
        ></textarea>
      </label>

      <div class="full actions">

        <button
          type="button"
          class="secondary"
          id="cancelForm"
        >
          Annuler
        </button>

        <button class="primary">
          Enregistrer le mouvement
        </button>

      </div>

    </div>
  `;

  document
    .getElementById("cancelForm")
    ?.addEventListener(
      "click",
      closeModal
    );

  form.onsubmit = async event => {
    event.preventDefault();

    const data = Object.fromEntries(
      new FormData(form).entries()
    );

    const quantity = Number(
      data.quantity
    );

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      toast(
        "La quantité doit être supérieure à zéro."
      );
      return;
    }

    try {
      if (!state.cloud) {
        const current = Number(
          item.quantity || 0
        );

        let next = current;

        if (
          data.movement_type === "entry" ||
          data.movement_type === "return"
        ) {
          next = current + quantity;
        }

        if (
          data.movement_type === "exit" ||
          data.movement_type === "use"
        ) {
          if (current < quantity) {
            throw new Error(
              "Stock insuffisant."
            );
          }

          next = current - quantity;
        }

        if (
          data.movement_type ===
          "adjustment"
        ) {
          next = quantity;
        }

        item.quantity = next;
        item.updated_at = now();

        const movement = {
          id: uid(),
          stock_item_id: item.id,
          user_id: state.user.id,
          movement_type:
            data.movement_type,
          quantity,
          reason:
            data.reason || null,
          project_id:
            data.project_id || null,
          activity_id:
            data.activity_id || null,
          employee_id:
            data.employee_id || null,
          notes:
            data.notes || null,
          created_at: now()
        };

        state.db.stock_movements.unshift(
          movement
        );

        saveLocal();

        await audit(
          "stock_movement",
          "stock_movements",
          movement.id,
          {
            stock_item_id: item.id,
            movement_type:
              data.movement_type,
            quantity,
            project_id:
              data.project_id || null,
            activity_id:
              data.activity_id || null,
            employee_id:
              data.employee_id || null
          }
        );
      } else {
        const {
          data: result,
          error
        } = await sb.rpc(
          "create_stock_movement",
          {
            p_stock_item_id: item.id,
            p_movement_type:
              data.movement_type,
            p_quantity: quantity,
            p_reason:
              data.reason || null,
            p_project_id:
              data.project_id || null,
            p_activity_id:
              data.activity_id || null,
            p_employee_id:
              data.employee_id || null,
            p_notes:
              data.notes || null
          }
        );

        if (error) throw error;

        await syncCloud();

        await audit(
          "stock_movement",
          "stock_movements",
          result,
          {
            stock_item_id: item.id,
            movement_type:
              data.movement_type,
            quantity,
            project_id:
              data.project_id || null,
            activity_id:
              data.activity_id || null,
            employee_id:
              data.employee_id || null
          }
        );
      }

      closeModal();
      render();

      toast(
        "Mouvement enregistré. Stock mis à jour."
      );
    } catch (error) {
      console.error(
        "Erreur mouvement stock :",
        error
      );

      toast(
        error.message ||
        "Erreur lors du mouvement."
      );
    }
  };

  document
    .getElementById("modal")
    ?.classList.remove("hidden");
}

function movementLabel(type) {
  return (
    {
      entry: "Entrée en stock",
      exit: "Sortie de stock",
      use: "Utilisation",
      return: "Retour matériel",
      adjustment: "Ajustement"
    }[type] || type
  );
}

function stockHistory() {
  const movements =
    state.db.stock_movements || [];

  const names = Object.fromEntries(
    (state.db.stock_items || []).map(
      item => [item.id, item.name]
    )
  );

  const people = Object.fromEntries(
    (state.db.profiles || []).map(
      person => [
        person.id,
        person.full_name ||
          person.email ||
          "Utilisateur"
      ]
    )
  );

  const projects = Object.fromEntries(
    (state.db.projects || []).map(
      project => [
        project.id,
        project.name
      ]
    )
  );

  const activities = Object.fromEntries(
    (state.db.activities || []).map(
      activity => [
        activity.id,
        activity.title
      ]
    )
  );

  const rows = movements
    .map(
      movement => `
        <tr>

          <td>
            ${
              movement.created_at
                ? new Date(
                    movement.created_at
                  ).toLocaleString("fr-FR")
                : ""
            }
          </td>

          <td>
            <b>
              ${esc(
                names[
                  movement.stock_item_id
                ] ||
                "Article supprimé"
              )}
            </b>
          </td>

          <td>
            ${movementLabel(
              movement.movement_type
            )}
          </td>

          <td>
            ${esc(movement.quantity)}
          </td>

          <td>
            ${esc(
              people[
                movement.employee_id
              ] || "—"
            )}
          </td>

          <td>
            ${esc(
              projects[
                movement.project_id
              ] || "—"
            )}
          </td>

          <td>
            ${esc(
              activities[
                movement.activity_id
              ] || "—"
            )}
          </td>

          <td>
            ${esc(
              movement.reason || "—"
            )}
          </td>

        </tr>
      `
    )
    .join("");

  return `
    <div class="toolbar">

      <div>
        <b>${movements.length}</b>
        mouvement(s)
      </div>

      <button
        class="secondary"
        id="backToStock"
      >
        ← Retour au stock
      </button>

    </div>

    <div class="table-wrap">
      <table>

        <thead>
          <tr>
            <th>Date</th>
            <th>Article</th>
            <th>Type</th>
            <th>Qté</th>
            <th>Responsable</th>
            <th>Projet</th>
            <th>Activité</th>
            <th>Motif</th>
          </tr>
        </thead>

        <tbody>

          ${
            rows ||
            `
              <tr>
                <td colspan="8">
                  <div class="empty">
                    Aucun mouvement enregistré.
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

function members() {
  const arr =
    state.db.profiles || [];

  const rows = arr
    .map(
      member => `
        <tr>

          <td>
            <b>
              ${esc(
                member.full_name ||
                "Sans nom"
              )}
            </b>
          </td>

          <td>
            ${esc(
              member.phone || "—"
            )}
          </td>

          <td>

            ${
              state.role === "admin"
                ? `
                  <select
                    data-role
                    data-id="${member.id}"
                  >

                    ${[
                      "admin",
                      "manager",
                      "employee"
                    ]
                      .map(
                        role => `
                          <option
                            ${
                              member.role ===
                              role
                                ? "selected"
                                : ""
                            }
                          >
                            ${role}
                          </option>
                        `
                      )
                      .join("")}

                  </select>
                `
                : esc(member.role)
            }

          </td>

          <td>

            ${
              state.role === "admin"
                ? `
                  <label class="switch">

                    <input
                      type="checkbox"
                      data-toggle-active
                      data-id="${member.id}"
                      ${
                        member.active !== false
                          ? "checked"
                          : ""
                      }
                    >

                    <span></span>

                  </label>
                `
                : member.active !== false
                ? "Actif"
                : "Inactif"
            }

          </td>

        </tr>
      `
    )
    .join("");

  const create =
    state.role === "admin"
      ? `
        <button
          class="primary"
          data-create-employee
        >
          + Créer un compte employé
        </button>
      `
      : "";

  return `
    <div class="card">

      <div class="toolbar">

        <div>
          <h3 style="margin:0">
            Membres
          </h3>

          <p
            class="muted"
            style="margin:.35rem 0 0"
          >
            Gestion des utilisateurs et
            des rôles.
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
              rows ||
              `
                <tr>
                  <td colspan="4">
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

function openEmployeeForm() {
  if (state.role !== "admin") {
    toast(
      "Action réservée à l’administrateur."
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
          placeholder="Nom et prénom"
        >
      </label>

      <label>
        Téléphone

        <input
          name="phone"
          type="tel"
          placeholder="01 XX XX XX XX"
        >
      </label>

      <label class="full">
        E-mail de connexion

        <input
          name="email"
          type="email"
          required
          placeholder="employe@lucbricotech.com"
        >
      </label>

      <label>
        Mot de passe initial

        <input
          name="password"
          type="password"
          minlength="8"
          required
          placeholder="8 caractères minimum"
        >
      </label>

      <label>
        Confirmation

        <input
          name="password_confirm"
          type="password"
          minlength="8"
          required
          placeholder="Retaper le mot de passe"
        >
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
          id="cancelForm"
        >
          Annuler
        </button>

        <button class="primary">
          Créer le compte
        </button>

      </div>

    </div>
  `;

  document
