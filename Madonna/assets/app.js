/**
 * Minimal JS: demo auth, role simulation, search filtering
 * Replace these stubs with real authentication + Hubwise API calls later
 */

const demoUsers = {
  "president@madonna.local": { role: "president", name: "President User" },
  "staff@madonna.local":     { role: "staff",     name: "Staff User" },
  "guardian@madonna.local":  { role: "guardian",  name: "Guardian User" }
};


// Demo data (DB later)

const staff = [
  {
    id: "S-2001",
    name: "Taylor Smith",
    title: "Program Coordinator",
    email: "taylor.smith@madonna.local",
    phone: "(402) 555-0199",
    address: { street: "7197 Pine Street", city: "Omaha", state: "NE", zip: "68106" },
    headshotUrl: "assets/empty-headshot.jpg" // placeholder
  },
  {
    id: "S-2002",
    name: "Jordan Lee",
    title: "Program Coordinator",
    email: "jordan.lee@madonna.local",
    phone: "(402) 555-0108",
    address: { street: "123 Center Ave", city: "Omaha", state: "NE", zip: "68104" },
    headshotUrl: "assets/empty-headshot.jpg"
  },
  {
    id: "S-2003",
    name: "Avery Patel",
    title: "Program Coordinator",
    email: "avery.patel@madonna.local",
    phone: "(402) 555-0141",
    address: { street: "88 Maple Dr", city: "Omaha", state: "NE", zip: "68114" },
    headshotUrl: "assets/empty-headshot.jpg"
  }
];

// Client profiles (add programCoordinatorId)
const defaultProfiles = [
  { id:"P-1001", name:"Alex R.", group:"Adult Services", inGroup:true, mediaConsent:"Yes", tags:["ds", "se", "vr"], risks:["allergy", "sensory", "mobility"], updated:"2026-02-10", programCoordinatorId:"S-2001" },
  { id:"P-1002", name:"Jordan M.", group:"Special Education", inGroup:false, mediaConsent:"No", tags:["so", "se", "vr"], risks:["behavioral", "communication"], updated:"2026-01-28", programCoordinatorId:"S-2002" },
  { id:"P-1003", name:"Sam K.", group:"Athletics", inGroup:true, mediaConsent:"Yes", tags:["ds", "se", "so"], risks:["seizure", "medication"], updated:"2026-02-01", programCoordinatorId:"S-2001" },
];

let profiles = getStoredProfiles();

const tag_definitions = {
  so: { text: "SO", className: "tag-so", label: "Special Olympics" },
  e: { text: "E", className: "tag-e", label: "Elementary" },
  s: { text: "S", className: "tag-s", label: "Secondary" },
  ya: { text: "YA", className: "tag-ya", label: "Young Adult" },
  ds: { text: "DS", className: "tag-ds", label: "Day Services" },
  se: { text: "SE", className: "tag-se", label: "Supported Employment" },
  vr: { text: "VR", className: "tag-vr", label: "Voc Rehab" },
  sfl: { text: "SFL", className: "tag-sfl", label: "Supported Family Living" },
  il: { text: "IL", className: "tag-il", label: "Independent Living" },
  a: { text: "A", className: "tag-a", label: "Administrator" },
};

const risk_definitions = {
  allergy: { label: "Allergy" },
  seizure: { label: "Seizure" },
  fall: { label: "Fall Risk" },
  elopement: { label: "Elopement" },
  wheelchair: { label: "Wheelchair" },
  mobility: { label: "Mobility Support" },
  communication: { label: "Communication Support" },
  behavioral: { label: "Behavioral Support" },
  sensory: { label: "Sensory Support" },
  medication: { label: "Medication Alert" },
};

function renderTags(tagCodes = []) {
  if (!tagCodes.length) return '<span class="portal-muted">-</span>';

  return `
    <div class="profile-tags">
      ${tagCodes
        .map(code => {
          const tag = tag_definitions[code];
          if (!tag) return "";
          return `<span class="tags-form ${tag.className}" title="${tag.label}">${tag.text}</span>`;
        })
        .join("")}
    </div>
  `;
}

function renderTagCheckboxes(container, selectedTags = [], disabled = false) {
  if (!container) return;

  container.innerHTML = Object.entries(tag_definitions)
    .map(([code, tag]) => `
      <label class="tag-checkbox-item">
        <input
          type="checkbox"
          value="${code}"
          ${selectedTags.includes(code) ? "checked" : ""}
          ${disabled ? "disabled" : ""}
        />
        <span class="tag-checkbox-label">
          <span class="tags-form ${tag.className}" title="${tag.label}">${tag.text}</span>
          <span>${tag.label}</span>
        </span>
      </label>
    `)
    .join("");
}

function renderRiskBadges(riskCodes = []) {
  if (!riskCodes.length) return '<span class="portal-muted">-</span>';

  return `
    <div class="risk-badges">
      ${riskCodes
        .map(code => {
          const risk = risk_definitions[code];
          if (!risk) return "";
          return `<span class="risk-badge" title="${risk.label}">${risk.label}</span>`;
        })
        .join("")}
    </div>
  `;
}

function renderRiskCheckboxes(container, selectedRisks = [], disabled = false) {
  if (!container) return;

  container.innerHTML = Object.entries(risk_definitions)
    .map(([code, risk]) => `
      <label class="tag-checkbox-item">
        <input
          type="checkbox"
          value="${code}"
          ${selectedRisks.includes(code) ? "checked" : ""}
          ${disabled ? "disabled" : ""}
        />
        <span class="tag-checkbox-label">
          <span>${risk.label}</span>
        </span>
      </label>
    `)
    .join("");
}

// Lookups
function getStaffById(id) {
  return staff.find(s => s.id === id) || null;
}
function getProfileById(id) {
  return profiles.find(p => p.id === id) || null;
}

function getStoredProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem("maa_profiles") || "null");
    return Array.isArray(saved) ? saved : structuredClone(defaultProfiles);
  } catch {
    return structuredClone(defaultProfiles);
  }
}

function saveProfiles() {
  localStorage.setItem("maa_profiles", JSON.stringify(profiles));
}

// Session helpers
function setSession(session) {
  localStorage.setItem("maa_session", JSON.stringify(session));
}
function getSession() {
  try { return JSON.parse(localStorage.getItem("maa_session") || "null"); }
  catch { return null; }
}
function clearSession() {
  localStorage.removeItem("maa_session");
}

function requireAuth() {
  const s = getSession();
  if (!s) window.location.href = "portal.html";
  return s;
}


// Permissions
function canViewAll(role) {
  return role === "president";
}

function canSendBroadcast(role) {
  return role === "president" || role === "staff";
}

function canEditEmergency(role, inGroup) {
  if (role === "president") return true;
  if (role === "staff" && inGroup) return true;
  if (role === "guardian" && inGroup) return true;
  return false;
}

function getAccessibleProfiles(session) {
  return profiles.filter(p => canViewAll(session.role) ? true : p.inGroup);
}

// Header auth UI
function initNavAuthUI() {
  const s = getSession();
  const el = document.querySelector("[data-auth]");
  if (!el) return;

  if (!s) {
    // If login page doesn't want a button here, leave blank
    el.innerHTML = ``;
  } else {
    // "tab" links (might remove if they dont look good in header)
    const staffLink = `<a class="btn-maap blue" href="staff.html">Staff</a>`;

    el.innerHTML = `
      <span class="badge blue">${s.role.toUpperCase()}</span>
      ${staffLink}
      <button class="btn-maap orange" id="logoutBtn">Log out</button>
    `;

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      clearSession();
      window.location.href = "portal.html";
    });
  }
}

// Login
function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value; // demo only

    if (!demoUsers[email]) {
      alert("Demo login: use president@madonna.local, staff@madonna.local, or guardian@madonna.local (any password).");
      return;
    }
    setSession({ ...demoUsers[email], email });
    window.location.href = "dashboard.html";
  });
}


// Dashboard
function initDashboard() {
  const s = requireAuth();
  const accessibleProfiles = getAccessibleProfiles(s);

  const who = document.getElementById("whoami");
  if (who) who.textContent = `${s.name} • ${s.role}`;

  const tbody = document.getElementById("profilesBody");
  if (tbody) {
    tbody.innerHTML = "";
    accessibleProfiles.forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><a class="link" href="profile.html?id=${encodeURIComponent(p.id)}">${p.name}</a></td>
        <td>${renderTags(p.tags || [])}</td>
        <td>${renderRiskBadges(p.risks || [])}</td>
        <td>
          <span class="badge ${p.mediaConsent === "Yes" ? "blue" : "orange"}">
            ${p.mediaConsent}
            </span>
          </td>
          <td>${p.updated}</td>
        `;
        // If I later add a Coordinator column in the dashboard table, render here.
        tbody.appendChild(tr);
      });
  }

  // Search filter
  const search = document.getElementById("searchInput");
  if (search && tbody) {
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      [...tbody.querySelectorAll("tr")].forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }

  // Emergency broadcast role gate
  const broadcastBox = document.getElementById("broadcastBox");
  if (broadcastBox) {
    broadcastBox.style.display = canSendBroadcast(s.role) ? "block" : "none";
  }

  const broadcastHelp = document.getElementById("broadcastHelp");
  const broadcastRoleBadge = document.getElementById("broadcastRoleBadge");
  const scopeSel = document.getElementById("broadcastScope");
  const programWrap = document.getElementById("broadcastProgramWrap");
  const groupWrap = document.getElementById("broadcastGroupWrap");
  const programSel = document.getElementById("broadcastProgram");
  const groupSel = document.getElementById("broadcastGroup");

  const accessibleTagCodes = [...new Set(accessibleProfiles.flatMap(p => p.tags || []))]
    .filter(code => tag_definitions[code]);
  const accessibleGroups = [...new Set(accessibleProfiles.map(p => p.group).filter(Boolean))];

  if (broadcastRoleBadge) {
    broadcastRoleBadge.textContent = s.role === "president" ? "President" : "Staff";
    broadcastRoleBadge.className = `pill-label ${s.role === "president" ? "orange" : "blue"}`;
  }

  if (broadcastHelp) {
    broadcastHelp.textContent = s.role === "president"
      ? "President: send automated emergency messaging to everyone or targeted recipients."
      : "Staff: send alerts only to the people and guardians tied to profiles you can access.";
  }

  if (scopeSel) {
    scopeSel.options[0].text = s.role === "president" ? "Everyone" : "My assigned people";
  }

  if (programSel) {
    const defaultLabel = s.role === "president" ? "All accessible programs" : "All my programs";
    programSel.innerHTML = [
      `<option value="">${defaultLabel}</option>`,
      ...accessibleTagCodes.map(code => `<option value="${code}">${tag_definitions[code].label}</option>`)
    ].join("");
  }

  if (groupSel) {
    const defaultLabel = s.role === "president" ? "All accessible groups" : "All my groups";
    groupSel.innerHTML = [
      `<option value="">${defaultLabel}</option>`,
      ...accessibleGroups.map(group => `<option value="${group}">${group}</option>`)
    ].join("");
  }

  function syncScopeUI() {
    const scope = scopeSel?.value || "all";
    if (programWrap) programWrap.style.display = (scope === "program") ? "block" : "none";
    if (groupWrap) groupWrap.style.display = (scope === "group") ? "block" : "none";
  }

  scopeSel?.addEventListener("change", syncScopeUI);
  syncScopeUI();

  document.getElementById("sendBroadcast")?.addEventListener("click", () => {
    const msg = (document.getElementById("broadcastMsg")?.value || "").trim();
    if (!msg) return alert("Please enter a message.");
    if (!canSendBroadcast(s.role)) return alert("You do not have permission to send alerts.");

    const scope = scopeSel?.value || "all";
    const program = programSel?.value || "";
    const group = groupSel?.value || "";

    let targets = accessibleProfiles;
    let audienceLabel = s.role === "president" ? "Everyone" : "My assigned people and guardians";

    if (scope === "program" && program) {
      targets = accessibleProfiles.filter(p => (p.tags || []).includes(program));
      audienceLabel = `Program: ${tag_definitions[program]?.label || program}`;
    } else if (scope === "group" && group) {
      targets = accessibleProfiles.filter(p => p.group === group);
      audienceLabel = `Group: ${group}`;
    }

    if (!targets.length) {
      return alert("No eligible recipients were found for that selection.");
    }

    const recipientNames = targets.map(p => p.name).join(", ");
    alert(`Demo: would send emergency announcement to:\n${audienceLabel}\nRecipients: ${recipientNames}\n\nMessage:\n${msg}`);
  });
}


// Client Profile Page
function initProfilePage() {
  const s = requireAuth();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "P-1001";

// Demo profile data (later replace with DB read)
const profilesById = {
  "P-1001": { name: "Alex R.", coordinator: "Taylor Smith" },
  "P-1002": { name: "Jordan M.", coordinator: "Jordan Lee" },
  "P-1003": { name: "Sam K.", coordinator: "Taylor Smith" }
};

const profile = profilesById[id] || { name: `Profile ${id}` };

const title = document.getElementById("profileTitle");
if (title) title.textContent = profile.name;

const coordinatorEl = document.getElementById("coordinatorLink");

if (coordinatorEl && profile.coordinator) {
  coordinatorEl.innerHTML = `
    <a href="staff-profile.html?name=${encodeURIComponent(profile.coordinator)}"
       class="maap-link">
      ${profile.coordinator}
    </a>
  `;
}
  // RBAC demo access
  const inGroup = (id !== "P-1002");
  const canEdit = canEditEmergency(s.role, inGroup);

  const editNotice = document.getElementById("editNotice");
  if (editNotice) {
    editNotice.innerHTML = canEdit
      ? `<span class="badge blue">You can edit emergency info</span>`
      : `<span class="badge">Read-only</span>`;
  }

  // Coordinator link
  const prof = getProfileById(id);
  const coord = prof ? getStaffById(prof.programCoordinatorId) : null;
  const coordEl = document.getElementById("coordinatorLink");
  if (coordEl) {
    coordEl.innerHTML = coord
      ? `<a class="link" href="staff_profile.html?id=${encodeURIComponent(coord.id)}">${coord.name}</a>
         <div class="small">${coord.title}</div>`
      : `<span class="small">Unassigned</span>`;
  }

  // Lock/unlock emergency fields
  const fields = document.querySelectorAll("[data-emergency-field]");
  fields.forEach(f => {
    f.disabled = !canEdit;
  });

  const tagEditor = document.getElementById("profileTagsEditor");
  if (tagEditor && prof) {
    renderTagCheckboxes(tagEditor, prof.tags || [], !canEdit);
  }

  const riskEditor = document.getElementById("profileRisksEditor");
  if (riskEditor && prof) {
    renderRiskCheckboxes(riskEditor, prof.risks || [], !canEdit);
  }

  document.getElementById("saveEmergency")?.addEventListener("click", () => {
    if (!canEdit) return alert("You don’t have permission to edit this profile’s emergency info.");
    if (prof && tagEditor) {
      const selectedTags = [...tagEditor.querySelectorAll('input[type="checkbox"]:checked')]
        .map(cb => cb.value);

      prof.tags = selectedTags;
      prof.risks = riskEditor
        ? [...riskEditor.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value)
        : (prof.risks || []);
      prof.updated = new Date().toISOString().slice(0, 10);
      saveProfiles();
    }

    alert("Demo: would SAVE to Hubwise (add/edit).");
  });
}


// Staff Directory Page / Image fallback
function initStaffDirectory() {
  const s = requireAuth();

  const who = document.getElementById("whoami");
  if (who) who.textContent = `${s.name} • ${s.role}`;

  const list = document.getElementById("staffList");
  if (!list) return;

  list.innerHTML = "";
  staff.forEach(person => {
    const row = document.createElement("div");
    row.className = "staff-row";
    row.innerHTML = `
  <a class="staff-card" href="staff_profile.html?id=${encodeURIComponent(person.id)}">
    <div class="staff-avatar">
      <img
        src="${person.headshotUrl || 'assets/empty-headshot.jpg'}"
        alt="${person.name}"
      />
    </div>

    <div class="staff-body">
      <div class="staff-top">
        <div class="staff-name">${person.name}</div>
        <span class="staff-pill">${person.title}</span>
      </div>
      <div class="staff-meta">
        <div>${person.email}</div>
        <div>${person.phone}</div>
      </div>
    </div>
  </a>
`;
    list.appendChild(row);
  });

  const search = document.getElementById("staffSearch");
  if (search) {
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      [...list.querySelectorAll(".staff-row")].forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }
  const staffCount = document.getElementById("staffCount");
  if (staffCount) staffCount.textContent = `${staff.length} staff`;
}


// Staff Profile Page
function initStaffProfilePage() {
  const s = requireAuth();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "S-2001";

  const person = getStaffById(id);

  const title = document.getElementById("staffTitle");
  if (title) title.textContent = person ? person.name : `Staff ${id}`;

  const role = document.getElementById("staffRole");
  if (role) role.textContent = person ? person.title : "—";

  const img = document.getElementById("staffHeadshot");
  if (img && person) img.src = person.headshotUrl;

  const email = document.getElementById("staffEmail");
  if (email) email.textContent = person ? person.email : "—";

  const phone = document.getElementById("staffPhone");
  if (phone) phone.textContent = person ? person.phone : "—";

  const addr = document.getElementById("staffAddress");
  if (addr && person) {
    addr.textContent = `${person.address.street}, ${person.address.city}, ${person.address.state} ${person.address.zip}`;
  }
  // ---------- Personal notes (account-specific) ----------
const noteKey = `maap_note_${id}_${s.email}`;

const notesField = document.getElementById("personalNotes");
const saveNotesBtn = document.getElementById("saveNotes");

// load saved note
if (notesField) {
  notesField.value = localStorage.getItem(noteKey) || "";
}

// save note
saveNotesBtn?.addEventListener("click", () => {
  localStorage.setItem(noteKey, notesField.value.trim());
  alert("Personal note saved.");
});
}


// Boot
document.addEventListener("DOMContentLoaded", () => {
  initNavAuthUI();
  initLoginForm();

  if (document.body.dataset.page === "dashboard") initDashboard();
  if (document.body.dataset.page === "profile") initProfilePage();
  if (document.body.dataset.page === "staff") initStaffDirectory();
  if (document.body.dataset.page === "staff_profile") initStaffProfilePage();
});
