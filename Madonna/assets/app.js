// ==================================================
// MAAP Frontend App Logic
// Handles demo auth, dashboard rendering, profile views,
// staff directory pages, localStorage persistence, and
// admin Excel import requests to the backend API.
// ==================================================

// Demo accounts used for local login simulation
const demoUsers = {
  "president@madonna.local": { role: "president", name: "President User" },
  "staff@madonna.local": { role: "staff", name: "Staff User" },
  "guardian@madonna.local": { role: "guardian", name: "Guardian User" }
};

// Demo staff records (used as fallback if backend data is unavailable)
const staff = [
  {
    id: "S-2001",
    name: "Taylor Smith",
    title: "Program Coordinator",
    email: "taylor.smith@madonna.local",
    phone: "(402) 555-0199",
    address: { street: "7197 Pine Street", city: "Omaha", state: "NE", zip: "68106" },
    headshotUrl: "assets/empty-headshot.jpg"
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

// Demo client profile records (used as fallback if backend data is unavailable)
const defaultProfiles = [
  {
    id: "P-1001",
    name: "Alex R.",
    group: "Adult Services",
    inGroup: true,
    mediaConsent: "Yes",
    tags: ["ds", "se", "vr"],
    risks: ["allergy", "sensory", "mobility"],
    updated: "2026-02-10",
    programCoordinatorId: "S-2001",
    address: {
      street: "123 Main Street",
      city: "Omaha",
      state: "NE",
      zip: "68106"
    },
    primaryContact: {
      name: "Jamie R.",
      phone: "(402) 555-0123"
    },
    secondaryContact: {
      name: "Casey R.",
      phone: "(402) 555-0456"
    },
    medicalNotes: "Peanut allergy. Carry epipen. Anxiety triggers: loud alarms.",
    mobilityNotes: "Prefers short instructions; uses noise-canceling headphones; needs wheelchair access."
  },
  {
    id: "P-1002",
    name: "Jordan M.",
    group: "Special Education",
    inGroup: false,
    mediaConsent: "No",
    tags: ["so", "se", "vr"],
    risks: ["behavioral", "communication"],
    updated: "2026-01-28",
    programCoordinatorId: "S-2002",
    address: {
      street: "456 Oak Avenue",
      city: "Omaha",
      state: "NE",
      zip: "68104"
    },
    primaryContact: {
      name: "Morgan M.",
      phone: "(402) 555-0170"
    },
    secondaryContact: {
      name: "Parker M.",
      phone: "(402) 555-0171"
    },
    medicalNotes: "",
    mobilityNotes: ""
  },
  {
    id: "P-1003",
    name: "Sam K.",
    group: "Athletics",
    inGroup: true,
    mediaConsent: "Yes",
    tags: ["ds", "se", "so"],
    risks: ["seizure", "medication"],
    updated: "2026-02-01",
    programCoordinatorId: "S-2001",
    address: {
      street: "789 Maple Drive",
      city: "Omaha",
      state: "NE",
      zip: "68114"
    },
    primaryContact: {
      name: "Taylor K.",
      phone: "(402) 555-0222"
    },
    secondaryContact: {
      name: "Riley K.",
      phone: "(402) 555-0223"
    },
    medicalNotes: "",
    mobilityNotes: ""
  }
];

// Load profiles from localStorage if available, otherwise use defaults
let profiles = getStoredProfiles();
let staffRecords = structuredClone(staff);
let backendHydrated = false;

// Tag definitions used across the dashboard and profile editor
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
  a: { text: "A", className: "tag-a", label: "Administrator" }
};

// Risk / support definitions used for badges and profile editing
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
  medication: { label: "Medication Alert" }
};

// Render program / service tags as styled badges
function renderTags(tagCodes = []) {
  if (!tagCodes.length) return '<span class="portal-muted">-</span>';

  return `
    <div class="profile-tags">
      ${tagCodes
        .map((code) => {
          const tag = tag_definitions[code];
          if (!tag) return "";
          return `<span class="tags-form ${tag.className}" title="${tag.label}">${tag.text}</span>`;
        })
        .join("")}
    </div>
  `;
}

// Render editable tag checkboxes on the profile page
function renderTagCheckboxes(container, selectedTags = [], disabled = false) {
  if (!container) return;

  container.innerHTML = Object.entries(tag_definitions)
    .map(
      ([code, tag]) => `
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
    `
    )
    .join("");
}

// Render risk/support items as styled badges
function renderRiskBadges(riskCodes = []) {
  if (!riskCodes.length) return '<span class="portal-muted">-</span>';

  return `
    <div class="risk-badges">
      ${riskCodes
        .map((code) => {
          const risk = risk_definitions[code];
          if (!risk) return "";
          return `<span class="risk-badge" title="${risk.label}">${risk.label}</span>`;
        })
        .join("")}
    </div>
  `;
}

// Render editable risk/support checkboxes on the profile page
function renderRiskCheckboxes(container, selectedRisks = [], disabled = false) {
  if (!container) return;

  container.innerHTML = Object.entries(risk_definitions)
    .map(
      ([code, risk]) => `
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
    `
    )
    .join("");
}

// Simple lookup helpers
function getStaffById(id) {
  return staffRecords.find((s) => s.id === id) || null;
}

function getProfileById(id) {
  return profiles.find((p) => p.id === id) || null;
}

// Read/write profile data from localStorage for demo persistence
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

// Backend hydration helpers
async function fetchJsonOrNull(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeClientFromApi(client) {
  return {
    ...client,
    id: client.id || "",
    name: client.name || "",
    group: client.group || "",
    mediaConsent: client.mediaConsent || "No",
    tags: Array.isArray(client.tags) ? client.tags : [],
    risks: Array.isArray(client.risks) ? client.risks : [],
    updated: client.updated || "",
    programCoordinatorId: client.programCoordinatorId || "",
    address: {
      street: client.address?.street || "",
      city: client.address?.city || "",
      state: client.address?.state || "",
      zip: client.address?.zip || ""
    },
    primaryContact: {
      name: client.primaryContact?.name || "",
      phone: client.primaryContact?.phone || ""
    },
    secondaryContact: {
      name: client.secondaryContact?.name || "",
      phone: client.secondaryContact?.phone || ""
    },
    notes: client.notes || "",
    medicalNotes: client.medicalNotes || "",
    mobilityNotes: client.mobilityNotes || "",
    inGroup: client.inGroup !== false
  };
}

function normalizeStaffFromApi(person) {
  return {
    id: person.id || "",
    name: person.name || "",
    title: person.title || "Staff",
    email: person.email || "",
    phone: person.phone || "",
    headshotUrl: person.headshotUrl || "assets/empty-headshot.jpg",
    address: {
      street: person.address?.street || "",
      city: person.address?.city || "",
      state: person.address?.state || "",
      zip: person.address?.zip || ""
    }
  };
}

async function hydrateDataFromBackend() {
  if (backendHydrated) return;

  const [clientsFromApi, staffFromApi] = await Promise.all([
    fetchJsonOrNull("/api/clients"),
    fetchJsonOrNull("/api/staff")
  ]);

  if (Array.isArray(clientsFromApi) && clientsFromApi.length) {
    profiles = clientsFromApi.map(normalizeClientFromApi);
    saveProfiles();
  }

  if (Array.isArray(staffFromApi) && staffFromApi.length) {
    staffRecords = staffFromApi.map(normalizeStaffFromApi);
  }

  backendHydrated = true;
}

// Save a profile edit to the backend
async function saveProfileToBackend(profile) {
  const payload = {
    id: profile.id,
    name: profile.name,
    group: profile.group,
    mediaConsent: profile.mediaConsent,
    tags: profile.tags || [],
    risks: profile.risks || [],
    updated: profile.updated,
    programCoordinatorId: profile.programCoordinatorId || "",
    address: {
      street: profile.address?.street || "",
      city: profile.address?.city || "",
      state: profile.address?.state || "",
      zip: profile.address?.zip || ""
    },
    primaryContact: {
      name: profile.primaryContact?.name || "",
      phone: profile.primaryContact?.phone || ""
    },
    secondaryContact: {
      name: profile.secondaryContact?.name || "",
      phone: profile.secondaryContact?.phone || ""
    },
    notes: profile.notes || "",
    medicalNotes: profile.medicalNotes || "",
    mobilityNotes: profile.mobilityNotes || ""
  };

  const res = await fetch(`/api/clients/${encodeURIComponent(profile.id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || "Failed to save profile");
  }

  return data;
}

// Session helpers for demo login state
function setSession(session) {
  localStorage.setItem("maa_session", JSON.stringify(session));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem("maa_session") || "null");
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem("maa_session");
}

// Redirect to the portal login page if no session exists
function requireAuth() {
  const s = getSession();
  if (!s) window.location.href = "portal.html";
  return s;
}

// Permission helpers based on the logged-in role
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
  return profiles.filter((p) => (canViewAll(session.role) ? true : p.inGroup));
}

// Build the header actions (role badge, staff link, import, logout)
function initNavAuthUI() {
  const s = getSession();
  const el = document.querySelector("[data-auth]");
  if (!el) return;

  if (!s) {
    el.innerHTML = ``;
  } else {
    const staffLink = `<a class="btn-maap blue" href="staff.html">Staff</a>`;
    const importButton =
      s.role === "president"
        ? `<button class="btn-maap orange" id="uploadBtn">Import Data</button>`
        : ``;

    el.innerHTML = `
      <span class="badge blue">${s.role.toUpperCase()}</span>
      ${staffLink}
      ${importButton}
      <button class="btn-maap orange" id="logoutBtn">Log Out</button>
    `;

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      clearSession();
      window.location.href = "portal.html";
    });

    document.getElementById("uploadBtn")?.addEventListener("click", () => {
      document.getElementById("excelUpload")?.click();
    });
  }
}

// Handle demo login form submission
function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.email.value.trim().toLowerCase();

    if (!demoUsers[email]) {
      alert(
        "Demo login: use president@madonna.local, staff@madonna.local, or guardian@madonna.local (any password)."
      );
      return;
    }

    setSession({ ...demoUsers[email], email });
    window.location.href = "dashboard.html";
  });
}

// President-only Excel upload that calls the backend import API
function initExcelUpload() {
  const session = getSession();
  if (!session || session.role !== "president") return;

  let input = document.getElementById("excelUpload");
  const status = document.getElementById("uploadStatus");

  if (!input) {
    input = document.createElement("input");
    input.type = "file";
    input.id = "excelUpload";
    input.accept = ".xlsx,.xls,.csv";
    input.style.display = "none";
    document.body.appendChild(input);
  }

  if (input.dataset.bound === "true") return;
  input.dataset.bound = "true";

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      if (status) status.textContent = "Uploading and importing file...";

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/excel", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Import failed");
      }

      backendHydrated = false;
      await hydrateDataFromBackend();

      if (status) {
        status.textContent = `Import complete: ${data.rows_inserted ?? 0} client rows inserted, ${data.rows_skipped ?? 0} skipped.`;
      }

      alert(
        `Import complete: ${data.rows_inserted ?? 0} rows inserted, ${data.rows_skipped ?? 0} skipped.`
      );
    } catch (err) {
      if (status) status.textContent = `Upload failed: ${err.message}`;
      alert(`Upload failed: ${err.message}`);
    } finally {
      input.value = "";
    }
  });
}

// Render the dashboard, filters, and emergency broadcast tools
async function initDashboard() {
  const s = requireAuth();
  await hydrateDataFromBackend();

  const accessibleProfiles = getAccessibleProfiles(s);

  const who = document.getElementById("whoami");
  if (who) who.textContent = `${s.name} • ${s.role}`;

  const tbody = document.getElementById("profilesBody");
  if (tbody) {
    tbody.innerHTML = "";
    accessibleProfiles.forEach((p) => {
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
      tbody.appendChild(tr);
    });
  }

  const search = document.getElementById("searchInput");
  if (search && tbody && search.dataset.bound !== "true") {
    search.dataset.bound = "true";
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      [...tbody.querySelectorAll("tr")].forEach((tr) => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }

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

  const accessibleTagCodes = [...new Set(accessibleProfiles.flatMap((p) => p.tags || []))].filter(
    (code) => tag_definitions[code]
  );
  const accessibleGroups = [...new Set(accessibleProfiles.map((p) => p.group).filter(Boolean))];

  if (broadcastRoleBadge) {
    broadcastRoleBadge.textContent = s.role === "president" ? "President" : "Staff";
    broadcastRoleBadge.className = `pill-label ${s.role === "president" ? "orange" : "blue"}`;
  }

  if (broadcastHelp) {
    broadcastHelp.textContent =
      s.role === "president"
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
      ...accessibleTagCodes.map(
        (code) => `<option value="${code}">${tag_definitions[code].label}</option>`
      )
    ].join("");
  }

  if (groupSel) {
    const defaultLabel = s.role === "president" ? "All accessible groups" : "All my groups";
    groupSel.innerHTML = [
      `<option value="">${defaultLabel}</option>`,
      ...accessibleGroups.map((group) => `<option value="${group}">${group}</option>`)
    ].join("");
  }

  function syncScopeUI() {
    const scope = scopeSel?.value || "all";
    if (programWrap) programWrap.style.display = scope === "program" ? "block" : "none";
    if (groupWrap) groupWrap.style.display = scope === "group" ? "block" : "none";
  }

  if (scopeSel && scopeSel.dataset.bound !== "true") {
    scopeSel.dataset.bound = "true";
    scopeSel.addEventListener("change", syncScopeUI);
  }
  syncScopeUI();

  const sendBtn = document.getElementById("sendBroadcast");
  if (sendBtn && sendBtn.dataset.bound !== "true") {
    sendBtn.dataset.bound = "true";
    sendBtn.addEventListener("click", () => {
      const msg = (document.getElementById("broadcastMsg")?.value || "").trim();
      if (!msg) return alert("Please enter a message.");
      if (!canSendBroadcast(s.role)) return alert("You do not have permission to send alerts.");

      const scope = scopeSel?.value || "all";
      const program = programSel?.value || "";
      const group = groupSel?.value || "";

      let targets = accessibleProfiles;
      let audienceLabel = s.role === "president" ? "Everyone" : "My assigned people and guardians";

      if (scope === "program" && program) {
        targets = accessibleProfiles.filter((p) => (p.tags || []).includes(program));
        audienceLabel = `Program: ${tag_definitions[program]?.label || program}`;
      } else if (scope === "group" && group) {
        targets = accessibleProfiles.filter((p) => p.group === group);
        audienceLabel = `Group: ${group}`;
      }

      if (!targets.length) {
        return alert("No eligible recipients were found for that selection.");
      }

      const recipientNames = targets.map((p) => p.name).join(", ");
      alert(
        `Demo: would send emergency announcement to:\n${audienceLabel}\nRecipients: ${recipientNames}\n\nMessage:\n${msg}`
      );
    });
  }
}

// Render a client profile page, permissions, tags/risks, and personal notes
async function initProfilePage() {
  const s = requireAuth();
  await hydrateDataFromBackend();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "P-1001";

  const prof = getProfileById(id);

  const addressFields = document.querySelectorAll(".profile-address .portal-input");
  if (prof && addressFields.length >= 4) {
    addressFields[0].value = prof.address?.street || "";
    addressFields[1].value = prof.address?.city || "";
    addressFields[2].value = prof.address?.state || "";
    addressFields[3].value = prof.address?.zip || "";
  }

  const emergencyInputs = document.querySelectorAll("[data-emergency-field]");
  if (prof && emergencyInputs.length >= 4) {
    emergencyInputs[0].value = prof.primaryContact?.name || "";
    emergencyInputs[1].value = prof.primaryContact?.phone || "";
    emergencyInputs[2].value = prof.secondaryContact?.name || "";
    emergencyInputs[3].value = prof.secondaryContact?.phone || "";
  }

  const textareas = document.querySelectorAll(".portal-textarea[data-emergency-field]");
  if (prof && textareas.length >= 2) {
    textareas[0].value = prof.medicalNotes || "";
    textareas[1].value = prof.mobilityNotes || "";
  }

  const title = document.getElementById("profileTitle");
  if (title) {
    title.textContent = prof ? prof.name : `Profile ${id}`;
  }

  const inGroup = prof ? prof.inGroup !== false : false;
  const canEdit = canEditEmergency(s.role, inGroup);

  const editNotice = document.getElementById("editNotice");
  if (editNotice) {
    editNotice.innerHTML = canEdit
      ? `<span class="badge blue">You can edit emergency info</span>`
      : `<span class="badge">Read-only</span>`;
  }

  const coord = prof ? getStaffById(prof.programCoordinatorId) : null;
  const coordEl = document.getElementById("coordinatorLink");
  if (coordEl) {
    coordEl.innerHTML = coord
      ? `<a class="link" href="staff_profile.html?id=${encodeURIComponent(coord.id)}">${coord.name}</a>
         <div class="small">${coord.title}</div>`
      : `<span class="small">Unassigned</span>`;
  }

  // Lock shared profile fields when the current account is read-only
  const fields = document.querySelectorAll("[data-emergency-field]");
  fields.forEach((f) => {
    f.disabled = !canEdit;
  });

  const addressInputs = document.querySelectorAll(".profile-address .portal-input");
  addressInputs.forEach((f) => {
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

  const saveEmergencyBtn = document.getElementById("saveEmergency");
  if (saveEmergencyBtn && saveEmergencyBtn.dataset.bound !== "true") {
    saveEmergencyBtn.dataset.bound = "true";
    saveEmergencyBtn.addEventListener("click", async () => {
      if (!canEdit) {
        return alert("You don’t have permission to edit this profile’s emergency info.");
      }

      if (!prof) {
        return alert("Profile not found.");
      }

      const selectedTags = tagEditor
        ? [...tagEditor.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value)
        : prof.tags || [];

      const selectedRisks = riskEditor
        ? [...riskEditor.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value)
        : prof.risks || [];

      prof.tags = selectedTags;
      prof.risks = selectedRisks;
      prof.updated = new Date().toISOString().slice(0, 10);

      if (addressFields.length >= 4) {
        prof.address = {
          street: addressFields[0].value.trim(),
          city: addressFields[1].value.trim(),
          state: addressFields[2].value.trim(),
          zip: addressFields[3].value.trim()
        };
      }

      if (emergencyInputs.length >= 4) {
        prof.primaryContact = {
          name: emergencyInputs[0].value.trim(),
          phone: emergencyInputs[1].value.trim()
        };
        prof.secondaryContact = {
          name: emergencyInputs[2].value.trim(),
          phone: emergencyInputs[3].value.trim()
        };
      }

      if (textareas.length >= 2) {
        prof.medicalNotes = textareas[0].value.trim();
        prof.mobilityNotes = textareas[1].value.trim();
      }

      // Keep local copy in sync too
      saveProfiles();

      try {
        await saveProfileToBackend(prof);
        backendHydrated = false;
        await hydrateDataFromBackend();
        alert("Profile saved successfully.");
      } catch (err) {
        alert(`Failed to save profile: ${err.message}`);
      }
    });
  }

  // Account-specific private notes stored locally per profile
  const noteKey = `maap_note_${id}_${s.email}`;
  const notesField = document.getElementById("personalNotes");
  const saveNotesBtn = document.getElementById("saveNotes");

  if (notesField) {
    notesField.value = localStorage.getItem(noteKey) || "";
  }

  if (saveNotesBtn && saveNotesBtn.dataset.bound !== "true") {
    saveNotesBtn.dataset.bound = "true";
    saveNotesBtn.addEventListener("click", () => {
      localStorage.setItem(noteKey, (notesField?.value || "").trim());
      alert("Personal note saved.");
    });
  }
}

// Render the staff directory and support simple staff searching
async function initStaffDirectory() {
  const s = requireAuth();
  await hydrateDataFromBackend();

  const who = document.getElementById("whoami");
  if (who) who.textContent = `${s.name} • ${s.role}`;

  const list = document.getElementById("staffList");
  if (!list) return;

  list.innerHTML = "";
  staffRecords.forEach((person) => {
    const row = document.createElement("div");
    row.className = "staff-row";
    row.innerHTML = `
      <a class="staff-card" href="staff_profile.html?id=${encodeURIComponent(person.id)}">
        <div class="staff-avatar">
          <img
            src="${person.headshotUrl || "assets/empty-headshot.jpg"}"
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
  if (search && search.dataset.bound !== "true") {
    search.dataset.bound = "true";
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      [...list.querySelectorAll(".staff-row")].forEach((row) => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }

  const staffCount = document.getElementById("staffCount");
  if (staffCount) staffCount.textContent = `${staffRecords.length} staff`;
}

// Render a single staff member profile page
async function initStaffProfilePage() {
  requireAuth();
  await hydrateDataFromBackend();

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
}

// Boot the correct page logic after the DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  initNavAuthUI();
  initLoginForm();

  if (document.body.dataset.page === "dashboard") await initDashboard();
  if (document.body.dataset.page === "profile") await initProfilePage();
  if (document.body.dataset.page === "staff") await initStaffDirectory();
  if (document.body.dataset.page === "staff_profile") await initStaffProfilePage();

  initExcelUpload();
});
