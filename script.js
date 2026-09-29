(() => {
  "use strict";

  const CFG = window.LBT_CONFIG || {};

  const cloudConfigured = !!(
    CFG.SUPABASE_URL &&
    CFG.SUPABASE_ANON_KEY
  );

  const hasCloud = cloudConfigured && !!window.supabase;

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
    "stock_movements",
    "activities",
    "projects",
    "innovations",
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

  function loadLocal() {
    try {
      const saved = localStorage.getItem(DBKEY);
      const data = saved ? JSON.parse(saved) : seed();

      TABLES.forEach(table => {
        if (!Array.isArray(data[table])) {
          data[table] = [];
        }
      });

      return data;
    } catch {
      return seed();
    }
  }

  function saveLocal() {
    localStorage.setItem(DBKEY, JSON.stringify(state.db));
  }

  function uid() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return (
      "lbt-" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2)
    );
  }

  function now() {
    return new Date().toISOString();
  }

  function esc(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      char => ({
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

  function toast(message) {
    const element = document.getElementById("toast");

    if (!element) {
      alert(message);
      return;
    }

    element.textContent = message;
    element.classList.add("show");

    setTimeout(() => {
      element.classList.remove("show");
    }, 2400);
  }

  function safeJson(value) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value ?? "");
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
      if (cloudConfigured && !window.supabase) {
        throw new Error(
          "La bibliothèque Supabase n'est pas chargée."
        );
      }

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

        const {
          data: profile,
          error: profileError
        } = await sb
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
            "Ce compte a été désactivé par l'administrateur."
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
          state.db.profiles[0] ||
          {
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

      if (cloudConfigured) {
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

        toast("Erreur de connexion à Supabase.");
        return;
      }

      state.cloud = false;
      state.user = {
        id: "demo-admin",
        email: "demo@lucbricotech.local"
      };

      state.profile =
        state.db.profiles[0] ||
        {
          id: "demo-admin",
          full_name: "Lucien BESSAN",
          role: "admin",
          active: true
        };

      state.role = state.profile.role || "admin";

      bind();
      render();

      toast("Mode démo actif.");
    }
  }

  async function syncCloud() {
    for (const table of TABLES) {
      let query = sb.from(table).select("*");

      if (table !== "settings") {
        query = query.order("created_at", {
          ascending: false
        });
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      state.db[table] = data || [];
    }
  }

  async function insert(table, payload) {
    if (!state.cloud) {
      const record = {
        id: uid(),
        created_at: now(),
        ...payload
      };

      if (TABLES_WITH_USER_ID.includes(table)) {
        record.user_id = state.user.id;
      }

      if (!Array.isArray(state.db[table])) {
        state.db[table] = [];
      }

      state.db[table].unshift(record);
      saveLocal();

      return record;
    }

    const record = {
      ...payload
    };

    if (TABLES_WITH_USER_ID.includes(table)) {
      record.user_id = state.user.id;
    }

    const {
      data,
      error
    } = await sb
      .from(table)
      .insert(record)
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
      const index = array.findIndex(item => item.id === id);

      if (index >= 0) {
        array[index] = {
          ...array[index],
          ...payload
        };
      }

      saveLocal();
      return array[index];
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
    const index = array.findIndex(item => item.id === id);

    if (index >= 0) {
      array[index] = data;
    }

    return data;
  }

  async function remove(table, id) {
    if (!state.cloud) {
      state.db[table] = (state.db[table] || []).filter(
        item => item.id !== id
      );

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

    state.db[table] = (state.db[table] || []).filter(
      item => item.id !== id
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
      console.warn("Audit :", error);
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

    const header = pages[state.page];

    if (header) {
      setHeader(header[0], header[1]);
    }

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

    const content = document.getElementById("content");

    if (!content) return;

    const pageFunction = functions[state.page];

    content.innerHTML = pageFunction
      ? pageFunction(state.page)
      : "";
    
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
            Centralisez les opérations et gardez une
            vision claire de l’activité.
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

    const columns = labels[table] || [];
    const array = state.db[table] || [];

    const rows = array
      .map(item => {
        let values;

        if (table === "sales") {
          values = [
            item.customer,
            item.item,
            money(item.amount),
            item.status
          ];
        } else if (table === "purchases") {
          values = [
            item.supplier,
            item.item,
            money(item.amount),
            item.status
          ];
        } else if (table === "expenses") {
          values = [
            item.category,
            item.label,
            money(item.amount),
            item.beneficiary
          ];
        } else if (table === "activities") {
          values = [
            item.title,
            item.category,
            item.status,
            money(item.amount)
          ];
        } else if (table === "projects") {
          values = [
            item.name,
            item.client,
            item.status,
            `${item.progress || 0} %`
          ];
        } else {
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
              .map(
                value =>
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
          ${array.length} enregistrement(s)
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
                .map(
                  column =>
                    `<th>${column}</th>`
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
    const array = state.db.stock_items || [];

    const rows = array
      .map(item => {
        const action =
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
            : "—";

        const low =
          Number(item.quantity || 0) <=
          Number(item.min_quantity || 0);

        return `
          <tr>

            <td>${esc(item.name)}</td>

            <td>${esc(item.category)}</td>

            <td>
              ${item.quantity || 0}
              ${esc(item.unit || "")}
            </td>

            <td>
              ${item.min_quantity || 0}
            </td>

            <td>
              ${esc(item.location)}
            </td>

            <td>
              ${
                low
                  ? `<span class="badge warn">Stock faible</span>`
                  : `<span class="badge success">OK</span>`
              }
            </td>

            <td>${action}</td>

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
          + Ajouter au stock
        </button>
      `
      : "";

    return `
      <div class="toolbar">

        <div class="muted">
          ${array.length} article(s)
        </div>

        ${addButton}

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
    const array = state.db.profiles || [];

    const rows = array
      .map(item => `
        <tr>

          <td>
            <b>
              ${esc(
                item.full_name || "Sans nom"
              )}
            </b>
          </td>

          <td>
            ${esc(item.phone || "—")}
          </td>

          <td>
            ${
              state.role === "admin"
                ? `
                  <select
                    data-role
                    data-id="${item.id}"
                  >
                    ${[
                      "admin",
                      "manager",
                      "employee"
                    ]
                      .map(
                        role => `
                          <option
                            value="${role}"
                            ${
                              item.role === role
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
                : esc(item.role)
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
                      }
                    >
                    <span></span>
                  </label>
                `
                : item.active !== false
                ? "Actif"
                : "Inactif"
            }
          </td>

        </tr>
      `)
      .join("");

    const createButton =
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
              ${
                state.role === "admin"
                  ? "Créez les comptes et gérez les rôles des membres."
                  : "Consultez les membres et leurs rôles."
              }
            </p>
          </div>

          ${createButton}

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

    document.getElementById("modalTitle").textContent =
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

    document.getElementById(
      "cancelForm"
    ).onclick = closeModal;

    document.getElementById(
      "recordForm"
    ).onsubmit = createEmployee;

    document
      .getElementById("modal")
      ?.classList.remove("hidden");
  }

  async function createEmployee(event) {
    event.preventDefault();

    const data = Object.fromEntries(
      new FormData(event.target).entries()
    );

    if (data.password !== data.password_confirm) {
      toast(
        "Les deux mots de passe ne correspondent pas."
      );
      return;
    }

    if (data.password.length < 8) {
      toast(
        "Le mot de passe doit contenir au moins 8 caractères."
      );
      return;
    }

    try {
      if (!state.cloud) {
        const exists = (
          state.db.profiles || []
        ).some(
          item =>
            (item.email || "").toLowerCase() ===
            data.email.toLowerCase()
        );

        if (exists) {
          throw new Error(
            "Cette adresse e-mail existe déjà."
          );
        }

        const employee = {
          id: uid(),
          full_name: data.full_name,
          phone: data.phone || "",
          email: data.email,
          role: "employee",
          active: true,
          created_at: now()
        };

        state.db.profiles.unshift(employee);
        saveLocal();

        await audit(
          "create_employee",
          "profiles",
          employee.id,
          {
            email: data.email,
            role: "employee"
          }
        );
      } else {
        const {
          data: response,
          error
        } = await sb.functions.invoke(
          "create-employee",
          {
            body: {
              full_name: data.full_name,
              email: data.email,
              password: data.password,
              phone: data.phone || ""
            }
          }
        );

        if (error) {
          throw error;
        }

        if (!response?.success) {
          throw new Error(
            response?.error ||
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
    } catch (error) {
      console.error(error);

      toast(
        error.message ||
        "Erreur lors de la création du compte."
      );
    }
  }

  async function toggleMember(id, active) {
    if (state.role !== "admin") {
      toast(
        "Action réservée à l’administrateur."
      );
      return;
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
    } catch (error) {
      toast(error.message);
    }
  }

  async function changeRole(id, role) {
    if (state.role !== "admin") {
      toast(
        "Action réservée à l’administrateur."
      );
      return;
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
    } catch (error) {
      toast(error.message);
    }
  }

  function reports() {
    const sum = table =>
      (state.db[table] || []).reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0
      );

    const sales = sum("sales");
    const purchases = sum("purchases");
    const expenses = sum("expenses");

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
        style="margin-top:16px"
      >
        <h3>Résultat simplifié</h3>

        <p>
          Ventes − achats − dépenses
        </p>

        <strong>
          ${money(
            sales -
            purchases -
            expenses
          )}
        </strong>
      </div>

      <div
        class="toolbar"
        style="margin-top:16px"
      >

        <button
          class="secondary"
          id="exportSalesCsv"
        >
          Exporter les ventes CSV
        </button>

        <button
          class="secondary"
          id="exportAllCsv"
        >
          Exporter tout en CSV
        </button>

        <button
          class="secondary"
          id="backupBtn"
        >
          Sauvegarder toutes les données
        </button>

      </div>
    `;
  }

  function auditPage() {
    if (state.role !== "admin") {
      return `
        <div class="card">
          <h3>Accès réservé</h3>
          <p class="muted">
            Le journal est réservé à l’administrateur.
          </p>
        </div>
      `;
    }

    const array = state.db.audit_logs || [];

    return `
      <div class="toolbar">

        <div class="muted">
          ${array.length} action(s) enregistrée(s)
        </div>

        <button
          class="secondary"
          id="exportAuditCsv"
        >
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
              array
                .map(
                  item => `
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
                          safeJson(
                            item.details || {}
                          )
                        )}
                      </td>

                    </tr>
                  `
                )
                .join("") ||
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
    const setting =
      (state.db.settings || []).find(
        item =>
          item.user_id === state.user.id
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

    const formData = new FormData(
      event.target
    );

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
    const schema = schemas[table];

    if (!schema) return;

    const old = id
      ? (state.db[table] || []).find(
          item => item.id === id
        )
      : null;

    document.getElementById(
      "modalTitle"
    ).textContent = id
      ? "Modifier"
      : schema.title;

    document.getElementById(
      "recordForm"
    ).innerHTML = `
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

                  <select name="${name}">

                    ${options
                      .map(
                        option => `
                          <option
                            value="${option}"
                            ${
                              value === option
                                ? "selected"
                                : ""
                            }
                          >
                            ${option}
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

          <button class="primary">
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
    ).onsubmit = async event => {
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
            Number(payload[field[0]]);
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
      ?.classList.remove("hidden");
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
      await remove(table, id);

      await audit(
        "delete",
        table,
        id
      );

      toast("Supprimé.");

      render();
    } catch (error) {
      console.error(error);
      toast(error.message);
    }
  }

  function csvCell(value) {
    let text =
      value == null
        ? ""
        : typeof value === "object"
        ? safeJson(value)
        : String(value);

    if (/^[=+\-@]/.test(text)) {
      text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  }

  function rowsToCsv(headers, rows) {
    return [
      headers.map(csvCell).join(","),
      ...rows.map(row =>
        headers
          .map(header =>
            csvCell(row[header])
          )
          .join(",")
      )
    ].join("\r\n");
  }

  function exportSalesCsv() {
    const rows =
      (state.db.sales || []).map(
        item => ({
          Client: item.customer || "",
          Article: item.item || "",
          Quantité:
            item.quantity ?? "",
          Montant:
            item.amount ?? 0,
          Paiement:
            item.payment_method || "",
          Statut:
            item.status || "",
          Notes:
            item.notes || "",
          Date:
            item.created_at || ""
        })
      );

    const headers = [
      "Client",
      "Article",
      "Quantité",
      "Montant",
      "Paiement",
      "Statut",
      "Notes",
      "Date"
    ];

    downloadFile(
      "luc-bricotech-ventes.csv",
      rowsToCsv(headers, rows),
      "text/csv;charset=utf-8"
    );
  }

  function exportAllCsv() {
    const sections = [];

    function addSection(
      title,
      table,
      headers,
      mapper
    ) {
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
        const row = mapper(item);

        sections.push(
          headers
            .map(
              header =>
                csvCell(
                  row[header]
                )
            )
            .join(",")
        );
      });

      sections.push("");
    }

    addSection(
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
          item.payment_method || "",
        Statut:
          item.status || "",
        Notes:
          item.notes || "",
        Date:
          item.created_at || ""
      })
    );

    addSection(
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
          item.status || "",
        Notes:
          item.notes || "",
        Date:
          item.created_at || ""
      })
    );

    addSection(
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
          item.beneficiary || "",
        Notes:
          item.notes || "",
        Date:
          item.created_at || ""
      })
    );

    addSection(
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
          item.description || "",
        Lieu:
          item.location || "",
        Statut:
          item.status || "",
        Montant:
          item.amount ?? 0,
        Date:
          item.created_at || ""
      })
    );

    addSection(
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
          item.description || "",
        Statut:
          item.status || "",
        Progression:
          item.progress ?? "",
        Budget:
          item.budget ?? 0,
        Date:
          item.created_at || ""
      })
    );

    addSection(
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
          item.description || "",
        Étape:
          item.stage || "",
        Budget:
          item.budget ?? 0,
        Progression:
          item.progress ?? "",
        Date:
          item.created_at || ""
      })
    );

    addSection(
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
          item.min_quantity ?? "",
        Emplacement:
          item.location || "",
        Date:
          item.created_at || ""
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

    const rows =
      (state.db.audit_logs || [])
        .map(item => ({
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

    const headers = [
      "Date",
      "Action",
      "Entité",
      "ID entité",
      "Détails"
    ];

    downloadFile(
      "luc-bricotech-journal.csv",
      rowsToCsv(headers, rows),
      "text/csv;charset=utf-8"
    );
  }

  function backupAllData() {
    downloadFile(
      "luc-bricotech-backup.json",
      JSON.stringify(
        {
          application: "LUC BRICO-TECH",
          exported_at: now(),
          role: state.role,
          user_id:
            state.user?.id || null,
          data: state.db
        },
        null,
        2
      ),
      "application/json;charset=utf-8"
    );
  }

  function downloadFile(
    filename,
    data,
    mime = "text/plain;charset=utf-8"
  ) {
    try {
      const blob = new Blob(
        [data],
        { type: mime }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(
        () => URL.revokeObjectURL(url),
        1000
      );

      toast(
        `Export terminé : ${filename}`
      );
    } catch (error) {
      console.error(
        "Erreur export :",
        error
      );

      toast(
        "Erreur pendant la génération du fichier."
      );
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

  boot();
})();
