(() => {
"use strict";

const CFG = window.LBT_CONFIG || {};
const hasCloud = !!(
  CFG.SUPABASE_URL &&
  CFG.SUPABASE_ANON_KEY &&
  window.supabase
);

const sb = hasCloud
  ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY)
  : null;

const DBKEY = "lbt_v3_demo";

const schemas = {
  sales: {
    title: "Nouvelle vente",
    fields: [
      ["customer","Client","text",true],
      ["item","Article / service","text",true],
      ["quantity","Quantité","number",true],
      ["amount","Montant (FCFA)","number",true],
      ["payment_method","Paiement","select",false,["cash","mobile_money","bank","credit"]],
      ["status","Statut","select",false,["paid","pending","cancelled"]],
      ["notes","Notes","textarea",false]
    ]
  },

  purchases: {
    title: "Nouvel achat",
    fields: [
      ["supplier","Fournisseur","text",true],
      ["item","Article","text",true],
      ["quantity","Quantité","number",true],
      ["amount","Montant (FCFA)","number",true],
      ["status","Statut","select",false,["received","pending","cancelled"]],
      ["notes","Notes","textarea",false]
    ]
  },

  expenses: {
    title: "Nouvelle dépense",
    fields: [
      ["category","Catégorie","text",true],
      ["label","Libellé","text",true],
      ["amount","Montant (FCFA)","number",true],
      ["beneficiary","Bénéficiaire","text",false],
      ["notes","Notes","textarea",false]
    ]
  },

  activities: {
    title: "Nouvelle activité",
    fields: [
      ["title","Titre","text",true],
      ["category","Catégorie","text",false],
      ["description","Description","textarea",false],
      ["location","Lieu","text",false],
      ["status","Statut","select",false,["open","in_progress","done","cancelled"]],
      ["amount","Montant (FCFA)","number",false]
    ]
  },

  projects: {
    title: "Nouveau projet",
    fields: [
      ["name","Nom du projet","text",true],
      ["client","Client","text",false],
      ["description","Description","textarea",false],
      ["status","Statut","select",false,["planned","active","completed","paused"]],
      ["progress","Progression (%)","number",false],
      ["budget","Budget (FCFA)","number",false]
    ]
  },

  innovations: {
    title: "Nouvelle innovation",
    fields: [
      ["title","Titre","text",true],
      ["description","Description","textarea",false],
      ["stage","Étape","select",false,["idea","prototype","test","production"]],
      ["budget","Budget (FCFA)","number",false],
      ["progress","Progression (%)","number",false]
    ]
  },

  stock_items: {
    title: "Nouvel article de stock",
    fields: [
      ["name","Article","text",true],
      ["category","Catégorie","text",false],
      ["unit","Unité","text",false],
      ["quantity","Quantité","number",true],
      ["min_quantity","Seuil minimum","number",false],
      ["location","Emplacement","text",false]
    ]
  }
};

const state = {
  page: "dashboard",
  role: "admin",
  user: null,
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
  "settings"
];

function loadLocal() {
  try {
    const d = JSON.parse(localStorage.getItem(DBKEY)) || seed();

    TABLES.forEach(t => {
      if (!Array.isArray(d[t])) d[t] = [];
    });

    return d;
  } catch {
    return seed();
  }
}

function saveLocal() {
  localStorage.setItem(DBKEY, JSON.stringify(state.db));
}

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
    settings: []
  };
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

function money(n) {
  return new Intl.NumberFormat("fr-FR").format(
    Number(n || 0)
  ) + " FCFA";
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

      const { data: profile, error: profileError } =
        await sb
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      state.profile = profile;

      if (state.profile.active === false) {
        await sb.auth.signOut();

        alert(
          "Ce compte a été désactivé par l’administrateur."
        );

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

      state.role = "admin";
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
      userRole.textContent =
        state.role.toUpperCase();
    }

    if (modeBadge) {
      modeBadge.textContent =
        state.cloud ? "SUPABASE" : "MODE DÉMO";
    }

    bind();
    render();

  } catch (err) {
    console.error("Erreur de démarrage :", err);

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

    state.role =
      state.profile.role || "admin";

    const userName = document.getElementById("userName");
    const userRole = document.getElementById("userRole");
    const modeBadge = document.getElementById("modeBadge");

    if (userName) {
      userName.textContent =
        state.profile.full_name || "Utilisateur";
    }

    if (userRole) {
      userRole.textContent =
        state.role.toUpperCase();
    }

    if (modeBadge) {
      modeBadge.textContent = "MODE DÉMO";
    }

    bind();
    render();

    toast(
      "Le site a rencontré un problème de connexion. Mode démo activé."
    );
  }
}

async function syncCloud() {
  for (const table of TABLES) {
    let query = sb.from(table).select("*");

    /*
      IMPORTANT :
      settings n'a pas besoin de tri created_at.
      Certaines autres tables possèdent created_at.
    */
    if (table !== "settings") {
      query = query.order(
        "created_at",
        { ascending: false }
      );
    }

    const { data, error } = await query;

    if (!error && data) {
      state.db[table] = data;
    } else if (!Array.isArray(state.db[table])) {
      state.db[table] = [];
    }
  }
}

async function insert(table, payload) {
  if (!state.cloud) {
    const item = {
      id: uid(),
      user_id: state.user.id,
      created_at: now(),
      ...payload
    };

    if (!state.db[table]) {
      state.db[table] = [];
    }

    state.db[table].unshift(item);
    saveLocal();

    return item;
  }

  const item = {
    user_id: state.user.id,
    ...payload
  };

  const {
    data,
    error
  } = await sb
    .from(table)
    .insert(item)
    .select()
    .single();

  if (error) throw error;

  if (!state.db[table]) {
    state.db[table] = [];
  }

  state.db[table].unshift(data);

  return data;
}

async function update(table, id, payload) {
  if (!state.cloud) {
    const arr = state.db[table] || [];
    const index = arr.findIndex(
      x => x.id === id
    );

    if (index >= 0) {
      arr[index] = {
        ...arr[index],
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

  if (error) throw error;

  const arr = state.db[table] || [];
  const index = arr.findIndex(
    x => x.id === id
  );

  if (index >= 0) {
    arr[index] = data;
  }
}

async function remove(table, id) {
  if (!state.cloud) {
    state.db[table] =
      (state.db[table] || [])
        .filter(x => x.id !== id);

    saveLocal();
    return;
  }

  const { error } =
    await sb
      .from(table)
      .delete()
      .eq("id", id);

  if (error) throw error;

  state.db[table] =
    (state.db[table] || [])
      .filter(x => x.id !== id);
}

async function audit(
  action,
  entity,
  id,
  details = {}
) {
  try {
    await insert(
      "audit_logs",
      {
        action,
        entity,
        entity_id: id,
        details
      }
    );
  } catch (e) {
    console.warn(e);
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
      const visible =
        allowed.includes(
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

        state.page =
          button.dataset.page;

        closeMenu();
        render();
      };
    });

  const menuBtn =
    document.getElementById("menuBtn");

  if (menuBtn) {
    menuBtn.onclick = () => {
      document
        .getElementById("sidebar")
        .classList.toggle("open");
    };
  }

  const closeModalButton =
    document.getElementById("closeModal");

  if (closeModalButton) {
    closeModalButton.onclick =
      closeModal;
  }

  const logoutBtn =
    document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.onclick = logout;
  }
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
  const pageTitle =
    document.getElementById("pageTitle");

  const pageSub =
    document.getElementById("pageSub");

  if (pageTitle) {
    pageTitle.textContent = title;
  }

  if (pageSub) {
    pageSub.textContent = subtitle;
  }
}

function render() {
  applyRoleNavigation();

  if (
    !allowedPages().includes(
      state.page
    )
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

  setHeader(...map[state.page]);

  const functions = {
    dashboard,
    members,
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

  const output =
    functions[state.page](state.page);

  document.getElementById(
    "content"
  ).innerHTML = output;

  bindPage();
}

function bindPage() {
  document
    .querySelectorAll("[data-add]")
    .forEach(button => {
      button.onclick = () =>
        openForm(
          button.dataset.add
        );
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
      button.onclick =
        openEmployeeForm;
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
    .getElementById("settingsForm")
    ?.addEventListener(
      "submit",
      saveSettings
    );
}

function dashboard() {
  const sum = table =>
    (state.db[table] || []).reduce(
      (total, item) =>
        total +
        Number(item.amount || 0),
      0
    );

  const stock =
    (state.db.stock_items || [])
      .reduce(
        (total, item) =>
          total +
          Number(item.quantity || 0),
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
      src="assets/logo-luc-bricotech.png"
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

</div>`;
}

function recent(table, key) {
  const arr =
    (state.db[table] || [])
      .slice(0, 5);

  if (!arr.length) {
    return `
      <div class="empty">
        Aucun élément.
      </div>
    `;
  }

  return arr
    .map(item => `
      <p>
        <strong>
          ${esc(item[key])}
        </strong>
        <br>
        <span class="muted">
          ${
            item.created_at
              ? new Date(
                  item.created_at
                ).toLocaleString("fr-FR")
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

  const headers =
    labels[table];

  const arr =
    state.db[table] || [];

  let rows = arr
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

      else if (table === "purchases") {
        values = [
          item.supplier,
          item.item,
          money(item.amount),
          item.status
        ];
      }

      else if (table === "expenses") {
        values = [
          item.category,
          item.label,
          money(item.amount),
          item.beneficiary
        ];
      }

      else if (table === "activities") {
        values = [
          item.title,
          item.category,
          item.status,
          money(item.amount)
        ];
      }

      else if (table === "projects") {
        values = [
          item.name,
          item.client,
          item.status,
          (item.progress || 0) + " %"
        ];
      }

      else {
        values = [
          item.title,
          item.stage,
          (item.progress || 0) + " %",
          money(item.budget)
        ];
      }

      const action =
        state.role === "admin"
          ? `
            <button
              class="danger"
              data-delete="${table}"
              data-id="${item.id}">
              Supprimer
            </button>
          `
          : "—";

      return `
        <tr>
          ${values
            .map(value =>
              `<td>${esc(value)}</td>`
            )
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
        data-add="${table}">
        + Ajouter
      </button>
    </div>

    <div class="table-wrap">

      <table>

        <thead>
          <tr>
            ${headers
              .map(header =>
                `<th>${header}</th>`
              )
              .join("")}

            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          ${
            rows ||
            `
              <tr>
                <td colspan="${headers.length + 1}">
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
  const arr =
    state.db.stock_items || [];

  const rows = arr
    .map(item => {

      const action =
        state.role === "admin"
          ? `
            <button
              class="danger"
              data-delete="stock_items"
              data-id="${item.id}">
              Supprimer
            </button>
          `
          : "—";

      return `
        <tr>

          <td>${esc(item.name)}</td>
          <td>${esc(item.category)}</td>
          <td>
            ${item.quantity}
            ${esc(item.unit || "")}
          </td>
          <td>${item.min_quantity}</td>
          <td>${esc(item.location)}</td>

          <td>
            ${
              Number(item.quantity) <=
              Number(item.min_quantity)
                ? '<span class="badge warn">Stock faible</span>'
                : '<span class="badge success">OK</span>'
            }
          </td>

          <td>${action}</td>

        </tr>
      `;
    })
    .join("");

  const add =
    canManageStock()
      ? `
        <button
          class="primary"
          data-add="stock_items">
          + Ajouter au stock
        </button>
      `
      : "";

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

function members() {
  const arr =
    state.db.profiles || [];

  const rows = arr
    .map(item => `
      <tr>

        <td>
          <b>
            ${esc(
              item.full_name ||
              "Sans nom"
            )}
          </b>
        </td>

        <td>
          ${esc(
            item.phone || "—"
          )}
        </td>

        <td>
          ${
            state.role === "admin"
              ? `
                <select
                  data-role
                  data-id="${item.id}">

                  ${
                    [
                      "admin",
                      "manager",
                      "employee"
                    ]
                    .map(role => `
                      <option
                        ${
                          item.role === role
                            ? "selected"
                            : ""
                        }>
                        ${role}
                      </option>
                    `)
                    .join("")
                  }

                </select>
              `
              : item.role
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
                    data-id="${item.id}"
                    ${
                      item.active !== false
                        ? "checked"
                        : ""
                    }>

                  <span></span>

                </label>
              `
              : (
                item.active !== false
                  ? "Actif"
                  : "Inactif"
              )
          }
        </td>

      </tr>
    `)
    .join("");

  const create =
    state.role === "admin"
      ? `
        <button
          class="primary"
          data-create-employee>
          + Créer un compte employé
        </button>
      `
      : "";

  const intro =
    state.role === "admin"
      ? "Créez les comptes de connexion et gérez les rôles des membres."
      : "Consultez les membres et leurs rôles. La gestion des comptes est réservée à l’administrateur.";

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
    return toast(
      "Action réservée à l’administrateur."
    );
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

        <button
          class="primary">
          Créer le compte
        </button>

      </div>

    </div>
  `;

  document.getElementById(
    "cancelForm"
  ).onclick = closeModal;

  document.getElementById(
    "recordForm"
  ).onsubmit = createEmployee;

  document.getElementById(
    "modal"
  ).classList.remove("hidden");
}

async function createEmployee(e) {
  e.preventDefault();

  const p =
    Object.fromEntries(
      new FormData(e.target).entries()
    );

  if (
    p.password !==
    p.password_confirm
  ) {
    return toast(
      "Les deux mots de passe ne correspondent pas."
    );
  }

  if (p.password.length < 8) {
    return toast(
      "Le mot de passe doit contenir au moins 8 caractères."
    );
  }

  try {

    if (!state.cloud) {

      const exists =
        (state.db.profiles || [])
          .some(
            x =>
              (x.email || "")
                .toLowerCase() ===
              p.email.toLowerCase()
          );

      if (exists) {
        throw new Error(
          "Cette adresse e-mail existe déjà dans le mode démo."
        );
      }

      const item = {
        id: uid(),
        full_name: p.full_name,
        phone: p.phone || "",
        email: p.email,
        role: "employee",
        active: true,
        created_at: now()
      };

      state.db.profiles.unshift(item);

      saveLocal();

      await audit(
        "create_employee",
        "profiles",
        item.id,
        {
          email: p.email,
          role: "employee"
        }
      );

    } else {

      const {
        data,
        error
      } = await sb.functions.invoke(
        "create-employee",
        {
          body: {
            full_name: p.full_name,
            email: p.email,
            password: p.password,
            phone: p.phone || ""
          }
        }
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error(
          data?.error ||
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

  } catch (err) {

    console.error(err);

    toast(
      err.message ||
      "Erreur lors de la création du compte."
    );
  }
}

async function toggleMember(id, active) {
  if (state.role !== "admin") {
    return toast(
      "Action réservée à l’administrateur."
    );
  }

  try {

    await update(
      "profiles",
      id,
      { active }
    );

    await audit(
      active
        ? "activate_member"
        : "deactivate_member",
      "profiles",
      id,
      { active }
    );

    toast(
      active
        ? "Compte activé."
        : "Compte désactivé."
    );

    render();

  } catch (e) {
    toast(e.message);
  }
}

async function changeRole(id, role) {
  if (state.role !== "admin") {
    return toast(
      "Action réservée à l’administrateur."
    );
  }

  try {

    await update(
      "profiles",
      id,
      { role }
    );

    await audit(
      "update_role",
      "profiles",
      id,
      { role }
    );

    toast("Rôle mis à jour.");

    render();

  } catch (e) {
    toast(e.message);
  }
}

function reports() {
  const sum = table =>
    (state.db[table] || [])
      .reduce(
        (total, item) =>
          total +
          Number(item.amount || 0),
        0
      );

  return `
    <div class="grid cards">

      <div class="card">
        <h3>Chiffre des ventes</h3>
        <strong>
          ${money(sum("sales"))}
        </strong>
      </div>

      <div class="card">
        <h3>Total achats</h3>
        <strong>
          ${money(sum("purchases"))}
        </strong>
      </div>

      <div class="card">
        <h3>Total dépenses</h3>
        <strong>
          ${money(sum("expenses"))}
        </strong>
      </div>

    </div>

    <div
      class="card"
      style="margin-top:16px">

      <h3>
        Résultat simplifié
      </h3>

      <p>
        Ventes − achats − dépenses
      </p>

      <strong>
        ${
          money(
            sum("sales") -
            sum("purchases") -
            sum("expenses")
          )
        }
      </strong>

    </div>

    <div
      class="toolbar"
      style="margin-top:16px">

      <button
        class="secondary"
        id="exportCsv">
        Exporter CSV
      </button>

      <button
        class="secondary"
        id="backupBtn">
        Sauvegarder les données
      </button>

    </div>
  `;
}

function auditPage() {
  const arr =
    state.db.audit_logs || [];

  return `
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
            arr
              .map(item => `
                <tr>

                  <td>
                    ${
                      item.created_at
                        ? new Date(
                            item.created_at
                          ).toLocaleString(
                            "fr-FR"
                          )
                        : ""
                    }
                  </td>

                  <td>
                    ${esc(item.action)}
                  </td>

                  <td>
                    ${esc(item.entity)}
                  </td>

                  <td>
                    ${esc(
                      JSON.stringify(
                        item.details || {}
                      )
                    )}
                  </td>

                </tr>
              `)
              .join("")
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

function settings() {
  const settingsList =
    state.db.settings || [];

  const current =
    settingsList.find(
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
        class="form-grid">

        <label>
          Nom

          <input
            name="company_name"
            value="${esc(
              current.company_name ||
              "LUC BRICO-TECH"
            )}">
        </label>

        <label>
          Adresse

          <input
            name="address"
            value="${esc(
              current.address ||
              "Hévié Hounzévié, Abomey-Calavi"
            )}">
        </label>

        <label>
          Téléphone

          <input
            name="phone"
            value="${esc(
              current.phone ||
              "01 67 02 84 91"
            )}">
        </label>

        <label>
          Email

          <input
            name="email"
            value="${esc(
              current.email || ""
            )}">
        </label>

        <div class="full">

          <button
            class="primary"
            type="submit">
            Enregistrer
          </button>

        </div>

      </form>

    </div>
  `;
}

async function saveSettings(e) {
  e.preventDefault();

  const formData =
    new FormData(e.target);

  const payload =
    Object.fromEntries(
      formData.entries()
    );

  try {

    if (!state.cloud) {

      const arr =
        state.db.settings || [];

      const existing =
        arr.find(
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

        arr.unshift({
          id: uid(),
          user_id: state.user.id,
          created_at: now(),
          updated_at: now(),
          ...payload
        });

      }

      state.db.settings = arr;

      saveLocal();

    } else {

      /*
       * IMPORTANT :
       * user_id est UNIQUE dans la table settings.
       * On utilise donc upsert avec onConflict=user_id
       * pour modifier la ligne existante au lieu d'en
       * créer une deuxième.
       */

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

      const arr =
        state.db.settings || [];

      const index =
        arr.findIndex(
          item =>
            item.user_id ===
            state.user.id
        );

      if (index >= 0) {
        arr[index] = data;
      } else {
        arr.unshift(data);
      }

      state.db.settings = arr;
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

  } catch (err) {

    console.error(
      "Erreur paramètres :",
      err
    );

    toast(
      err.message ||
      "Erreur lors de l’enregistrement."
    );
  }
}

function openForm(table, id = null) {
  const schema =
    schemas[table];

  if (!schema) return;

  const old =
    id
      ? (state.db[table] || [])
          .find(
            item =>
              item.id === id
          )
      : null;

  document.getElementById(
    "modalTitle"
  ).textContent =
    id
      ? "Modifier"
      : schema.title;

  document.getElementById(
    "recordForm"
  ).innerHTML = `
    <div class="form-grid">

      ${
        schema.fields
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
                    name="${name}">${esc(
                      value
                    )}</textarea>
                </label>
              `;
            }

            if (type === "select") {
              return `
                <label>
                  ${label}

                  <select
                    name="${name}">

                    ${
                      options
                        .map(option => `
                          <option
                            ${
                              value === option
                                ? "selected"
                                : ""
                            }>
                            ${option}
                          </option>
                        `)
                        .join("")
                    }

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
                  }>
              </label>
            `;
          })
          .join("")
      }

      <div class="full actions">

        <button
          type="button"
          class="secondary"
          id="cancelForm">
          Annuler
        </button>

        <button
          class="primary"
          type="submit">
          Enregistrer
        </button>

      </div>

    </div>
  `;

  document.getElementById(
    "cancelForm"
  ).onclick = closeModal;

  document.getElementById(
    "recordForm"
  ).onsubmit = async e => {

    e.preventDefault();

    const payload =
      Object.fromEntries(
        new FormData(
          e.target
        ).entries()
      );

    for (
      const field of schema.fields
    ) {

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
        id
          ? "update"
          : "insert",
        table,
        id || null,
        payload
      );

      toast("Enregistré.");

      closeModal();
      render();

    } catch (err) {

      console.error(err);

      toast(
        err.message ||
        "Erreur."
      );
    }
  };

  document.getElementById(
    "modal"
  ).classList.remove("hidden");
}

function closeModal() {
  document.getElementById(
    "modal"
  )?.classList.add("hidden");
}

async function del(table, id) {
  if (state.role !== "admin") {
    return toast(
      "La suppression est réservée à l’administrateur."
    );
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

  } catch (e) {
    toast(e.message);
  }
}

document.addEventListener(
  "click",
  e => {

    if (
      e.target.id ===
      "exportCsv"
    ) {

      const rows =
        state.db.sales || [];

      const csv = [
        "Client,Article,Montant,Date",
        ...rows.map(
          item =>
            `"${item.customer}","${item.item}",${item.amount},"${item.created_at}"`
        )
      ].join("\n");

      download(
        "ventes.csv",
        csv
      );
    }

    if (
      e.target.id ===
      "backupBtn"
    ) {

      download(
        "luc-bricotech-backup.json",
        JSON.stringify(
          state.db,
          null,
          2
        )
      );
    }
  }
);

function download(
  name,
  data
) {

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(
      new Blob(
        [data],
        {
          type:
            "text/plain"
        }
      )
    );

  a.download = name;

  a.click();

  URL.revokeObjectURL(
    a.href
  );
}

boot();

})();
