// ==================================================
// MAAP Frontend App Logic
// Handles auth, dashboard rendering, profile views,
// staff directory pages, localStorage persistence, and
// admin Excel import requests to the backend API.
// ==================================================

const ROLE_CONFIG = {
  director: {
    label: "Director",
    summary: "Full control across profiles, staff, imports, and emergency tools.",
    allProfiles: true,
    allStaff: true,
    fullEditAll: true,
    emergencyEditAll: true,
    canBroadcast: true,
    canImport: true
  },
  head_coordinator: {
    label: "Head Coordinator",
    summary: "Can edit site data across the portal, without director-level control.",
    allProfiles: true,
    allStaff: true,
    fullEditAll: true,
    emergencyEditAll: true,
    canBroadcast: true
  },
  program_coordinator: {
    label: "Program Coordinator",
    summary: "Scoped control over assigned students and families.",
    fullEditAssigned: true,
    emergencyEditAssigned: true,
    canBroadcast: true
  },
  staff: {
    label: "Staff",
    summary: "Can view assigned students and make minor emergency-related updates.",
    emergencyEditAssigned: true,
    canBroadcast: true
  },
  guardian: {
    label: "Guardian",
    summary: "Can view only their children and their coordinators, and edit emergency info.",
    emergencyEditAssigned: true
  },
  student: {
    label: "Student",
    summary: "Read-only access to the student's own profile."
  }
};

const LEGACY_ROLE_MAP = {
  president: "director"
};

const THEME_STORAGE_KEY = "maap_theme";
const CLIENT_PHOTO_STORAGE_KEY = "maap_client_photos";
const STAFF_PHOTO_STORAGE_KEY = "maap_staff_photos";

const portalUsers = {
  "director@madonna.local": { role: "director", name: "Drew Director" },
  "director@madonna.org": { role: "director", name: "Drew Director" },
  "head.coordinator@madonna.local": { role: "head_coordinator", name: "Harper Head Coordinator" },
  "head.coordinator@madonna.org": { role: "head_coordinator", name: "Harper Head Coordinator" },
  "coordinator@madonna.local": {
    role: "program_coordinator",
    name: "Taylor Program Coordinator",
    profileIds: ["P-1001", "P-1003"],
    staffIds: ["S-2001"]
  },
  "coordinator@madonna.org": {
    role: "program_coordinator",
    name: "Taylor Program Coordinator",
    profileIds: ["P-1001", "P-1003"],
    staffIds: ["S-2001"]
  },
  "staff@madonna.local": {
    role: "staff",
    name: "Avery Staff",
    profileIds: ["P-1001"],
    staffIds: ["S-3001"]
  },
  "staff@madonna.org": {
    role: "staff",
    name: "Avery Staff",
    profileIds: ["P-1001"],
    staffIds: ["S-3001"]
  },
  "guardian@madonna.local": {
    role: "guardian",
    name: "Jamie Guardian",
    profileIds: ["P-1001", "P-1003"]
  },
  "guardian@madonna.org": {
    role: "guardian",
    name: "Jamie Guardian",
    profileIds: ["P-1001", "P-1003"]
  },
  "student@madonna.local": {
    role: "student",
    name: "Jordan Student",
    profileIds: ["P-1002"]
  },
  "student@madonna.org": {
    role: "student",
    name: "Jordan Student",
    profileIds: ["P-1002"]
  }
};

const staff = [
  {
    id: "S-1000",
    name: "Drew Director",
    title: "Director",
    email: "director@madonna.local",
    phone: "(402) 555-0100",
    address: { street: "10 Alliance Way", city: "Omaha", state: "NE", zip: "68106" },
    headshotUrl: "assets/empty-headshot.jpg"
  },
  {
    id: "S-1100",
    name: "Harper Head Coordinator",
    title: "Head Coordinator",
    email: "head.coordinator@madonna.local",
    phone: "(402) 555-0101",
    address: { street: "12 Alliance Way", city: "Omaha", state: "NE", zip: "68106" },
    headshotUrl: "assets/empty-headshot.jpg"
  },
  {
    id: "S-2001",
    name: "Taylor Smith",
    title: "Program Coordinator",
    email: "coordinator@madonna.local",
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
    id: "S-3001",
    name: "Avery Patel",
    title: "Staff",
    email: "staff@madonna.local",
    phone: "(402) 555-0141",
    address: { street: "88 Maple Dr", city: "Omaha", state: "NE", zip: "68114" },
    headshotUrl: "assets/empty-headshot.jpg"
  }
];

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
    assignedStaffIds: ["S-3001"],
    guardianEmails: ["guardian@madonna.local"],
    studentEmail: "",
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
    inGroup: true,
    mediaConsent: "No",
    tags: ["so", "se", "vr"],
    risks: ["behavioral", "communication"],
    updated: "2026-01-28",
    programCoordinatorId: "S-2002",
    assignedStaffIds: [],
    guardianEmails: [],
    studentEmail: "student@madonna.local",
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
    assignedStaffIds: ["S-3001"],
    guardianEmails: ["guardian@madonna.local"],
    studentEmail: "",
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

const defaultAnnouncements = [
  {
    id: "ANN-1001",
    authorName: "Drew Director",
    authorRole: "Director",
    authorEmail: "director@madonna.local",
    body: "Special Olympics schedule is updated for next week. Please review transportation timing with your families.",
    tags: ["so"],
    attachments: [],
    createdAt: "2026-04-10T09:00:00.000Z",
    likes: ["guardian@madonna.local"],
    comments: [
      {
        id: "COM-1001",
        authorName: "Jamie Guardian",
        authorRole: "Guardian",
        authorEmail: "guardian@madonna.local",
        body: "Thanks. The reminder about transportation helps a lot.",
        createdAt: "2026-04-10T10:12:00.000Z"
      }
    ]
  },
  {
    id: "ANN-1002",
    authorName: "Taylor Program Coordinator",
    authorRole: "Program Coordinator",
    authorEmail: "coordinator@madonna.local",
    body: "Supported Employment check-ins are moving to Thursday afternoon this week.",
    tags: ["se"],
    attachments: [],
    createdAt: "2026-04-12T14:30:00.000Z",
    likes: [],
    comments: []
  }
];

// Load profiles from localStorage if available, otherwise use defaults
let profiles = getStoredProfiles();
let staffRecords = structuredClone(staff);
let announcements = getStoredAnnouncements();
let backendHydrated = false;

// Tag definitions used across the dashboard and profile editor
// These serve as defaults — admin overrides are loaded from localStorage at boot.
const DEFAULT_TAG_DEFINITIONS = {
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

const DEFAULT_RISK_DEFINITIONS = {
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

const DEFAULT_SPORT_DEFINITIONS = {
  powerlifting: { label: "Powerlifting (Traditional · Winter)" },
  swimming:     { label: "Swimming (Traditional · Spring)" },
  track:        { label: "Track (Traditional · Spring)" },
  basketball:    { label: "Basketball (Unified · Winter)" },
  bowling:       { label: "Bowling (Unified · Fall)" },
  cornhole:      { label: "Cornhole (Unified · Fall)" },
  esports:       { label: "E-Sports (Unified · Spring)" },
  flag_football: { label: "Flag Football (Unified · Fall)" },
  volleyball:    { label: "Volleyball (Unified · Spring)" }
};

const DEFAULT_SCHOOL_DEFINITIONS = {
  holy_name:           { label: "Holy Name" },
  st_pius_st_leo:      { label: "St. Pius X / St. Leo" },
  st_robert_bellarmine:{ label: "St. Robert Bellarmine Catholic Schools" }
};

// Live definitions — hydrated from localStorage (admin overrides) or defaults
function loadDefinitionsFromStorage(key, defaults) {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (_) { /* fall through */ }
  return structuredClone(defaults);
}

let tag_definitions = loadDefinitionsFromStorage("maap_tag_definitions", DEFAULT_TAG_DEFINITIONS);
let risk_definitions = loadDefinitionsFromStorage("maap_risk_definitions", DEFAULT_RISK_DEFINITIONS);
let sport_definitions = loadDefinitionsFromStorage("maap_sport_definitions", DEFAULT_SPORT_DEFINITIONS);
let school_definitions = loadDefinitionsFromStorage("maap_school_definitions", DEFAULT_SCHOOL_DEFINITIONS);

function getPreferredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch (_) {
    /* fall through */
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", String(nextTheme === "dark"));
    button.setAttribute("aria-label", `Switch to ${nextTheme === "dark" ? "light" : "dark"} mode`);
    button.setAttribute("title", `Switch to ${nextTheme === "dark" ? "light" : "dark"} mode`);
    const label = button.querySelector(".theme-toggle-text");
    if (label) label.textContent = nextTheme === "dark" ? "Dark" : "Light";
  });
}

function setTheme(theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (_) {
    /* Theme persistence is a convenience, so ignore storage failures. */
  }
}

function getThemeToggleMarkup() {
  const theme = document.documentElement.dataset.theme || getPreferredTheme();
  const pressed = theme === "dark";
  return `
    <button class="theme-toggle" type="button" data-theme-toggle aria-pressed="${pressed}" aria-label="Switch to ${pressed ? "light" : "dark"} mode" title="Switch to ${pressed ? "light" : "dark"} mode">
      <span class="theme-toggle-track" aria-hidden="true">
        <span class="theme-toggle-icon theme-toggle-sun">Sun</span>
        <span class="theme-toggle-icon theme-toggle-moon">Moon</span>
        <span class="theme-toggle-thumb"></span>
      </span>
      <span class="theme-toggle-text">${pressed ? "Dark" : "Light"}</span>
    </button>
  `;
}

function initThemeToggle() {
  applyTheme(document.documentElement.dataset.theme || getPreferredTheme());
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      setTheme(current === "dark" ? "light" : "dark");
    });
  });
}

applyTheme(getPreferredTheme());

function normalizeRole(role) {
  const normalized = LEGACY_ROLE_MAP[String(role || "").toLowerCase()] || String(role || "").toLowerCase();
  return ROLE_CONFIG[normalized] ? normalized : "student";
}

function getRoleConfig(role) {
  return ROLE_CONFIG[normalizeRole(role)];
}

function getRoleLabel(role) {
  return getRoleConfig(role).label;
}

function normalizeIdArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
}

function buildSession(user, email) {
  const role = normalizeRole(user?.role);

  return {
    role,
    roleLabel: getRoleLabel(role),
    name: user?.name || email,
    email,
    profileIds: normalizeIdArray(user?.profileIds),
    staffIds: normalizeIdArray(user?.staffIds)
  };
}

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

// Render editable tag checkboxes on the profile page (hides admin-hidden items unless already selected)
function renderTagCheckboxes(container, selectedTags = [], disabled = false) {
  if (!container) return;

  container.innerHTML = Object.entries(tag_definitions)
    .filter(([code, tag]) => !tag._hidden)
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

// Render editable risk/support checkboxes on the profile page (hides admin-hidden items unless already selected)
function renderRiskCheckboxes(container, selectedRisks = [], disabled = false) {
  if (!container) return;

  container.innerHTML = Object.entries(risk_definitions)
    .filter(([code, risk]) => !risk._hidden)
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

// Render editable Special Olympics sport checkboxes on the profile page (hides admin-hidden items unless already selected)
function renderSportCheckboxes(container, selectedSports = [], disabled = false) {
  if (!container) return;

  container.innerHTML = Object.entries(sport_definitions)
    .filter(([code, sport]) => !sport._hidden)
    .map(
      ([code, sport]) => `
      <label class="tag-checkbox-item">
        <input
          type="checkbox"
          value="${code}"
          ${selectedSports.includes(code) ? "checked" : ""}
          ${disabled ? "disabled" : ""}
        />
        <span class="tag-checkbox-label">
          <span>${sport.label}</span>
        </span>
      </label>
    `
    )
    .join("");
}

// Render editable Elementary partner-school checkboxes on the profile page (hides admin-hidden items unless already selected)
function renderSchoolCheckboxes(container, selectedSchools = [], disabled = false) {
  if (!container) return;

  container.innerHTML = Object.entries(school_definitions)
    .filter(([code, school]) => !school._hidden)
    .map(
      ([code, school]) => `
      <label class="tag-checkbox-item">
        <input
          type="checkbox"
          value="${code}"
          ${selectedSchools.includes(code) ? "checked" : ""}
          ${disabled ? "disabled" : ""}
        />
        <span class="tag-checkbox-label">
          <span>${school.label}</span>
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

function getStoredPhotoMap(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

function saveStoredPhoto(storageKey, id, dataUrl) {
  const saved = getStoredPhotoMap(storageKey);
  if (dataUrl) {
    saved[id] = dataUrl;
  } else {
    delete saved[id];
  }
  localStorage.setItem(storageKey, JSON.stringify(saved));
}

function applyStoredClientPhotos() {
  const saved = getStoredPhotoMap(CLIENT_PHOTO_STORAGE_KEY);
  profiles = profiles.map((profile) => ({
    ...profile,
    photoUrl: saved[profile.id] || profile.photoUrl || ""
  }));
}

function applyStoredStaffPhotos() {
  const saved = getStoredPhotoMap(STAFF_PHOTO_STORAGE_KEY);
  staffRecords = staffRecords.map((person) => ({
    ...person,
    headshotUrl: saved[person.id] || person.headshotUrl || "assets/empty-headshot.jpg"
  }));
}

function readImageAsDataUrl(file, maxSize = 720, quality = 0.86) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load that image."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function updatePhotoPreview(imgEl, placeholderEl, photoUrl) {
  if (imgEl) {
    imgEl.src = photoUrl || "";
    imgEl.style.display = photoUrl ? "block" : "none";
  }
  if (placeholderEl) {
    placeholderEl.style.display = photoUrl ? "none" : "";
  }
}

function initPhotoUpload({ inputEl, controlsEl, statusEl, imgEl, placeholderEl, canEdit, onSave }) {
  if (controlsEl) controlsEl.style.display = canEdit ? "" : "none";
  if (!inputEl || inputEl.dataset.bound === "true") return;

  inputEl.dataset.bound = "true";
  inputEl.addEventListener("change", async () => {
    const file = inputEl.files?.[0];
    if (!file) return;

    if (!canEdit) {
      inputEl.value = "";
      alert("You do not have permission to update this photo.");
      return;
    }

    if (statusEl) statusEl.textContent = "Saving photo...";

    try {
      const dataUrl = await readImageAsDataUrl(file);
      await onSave(dataUrl);
      updatePhotoPreview(imgEl, placeholderEl, dataUrl);
      if (statusEl) statusEl.textContent = "Photo saved.";
    } catch (err) {
      if (statusEl) statusEl.textContent = "";
      alert(err.message || "Could not save that photo.");
    } finally {
      inputEl.value = "";
    }
  });
}

// Read/write profile data from localStorage
function getStoredProfiles() {
  const savedPhotos = getStoredPhotoMap(CLIENT_PHOTO_STORAGE_KEY);
  try {
    const saved = JSON.parse(localStorage.getItem("maa_profiles") || "null");
    const storedProfiles = Array.isArray(saved) ? saved.map(normalizeClientFromApi) : structuredClone(defaultProfiles);
    return storedProfiles.map((profile) => ({
      ...profile,
      photoUrl: savedPhotos[profile.id] || profile.photoUrl || ""
    }));
  } catch {
    return structuredClone(defaultProfiles).map((profile) => ({
      ...profile,
      photoUrl: savedPhotos[profile.id] || profile.photoUrl || ""
    }));
  }
}

function saveProfiles() {
  localStorage.setItem("maa_profiles", JSON.stringify(profiles));
}

function getStoredAnnouncements() {
  try {
    const saved = JSON.parse(localStorage.getItem("maa_announcements") || "null");
    return Array.isArray(saved) ? saved : structuredClone(defaultAnnouncements);
  } catch {
    return structuredClone(defaultAnnouncements);
  }
}

function saveAnnouncements() {
  localStorage.setItem("maa_announcements", JSON.stringify(announcements));
}

// Backend hydration helpers
async function fetchJsonOrNull(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeClientFromApi(client) {
  return {
    id: client.id || "",
    name: client.name || "",
    photoUrl: client.photoUrl || client.photo_url || "",
    group: client.group || "",
    mediaConsent: client.mediaConsent || "No",
    tags: Array.isArray(client.tags) ? client.tags : [],
    risks: Array.isArray(client.risks) ? client.risks : [],
    updated: client.updated || "",
    programCoordinatorId: client.programCoordinatorId || "",
    assignedStaffIds: normalizeIdArray(client.assignedStaffIds),
    guardianEmails: normalizeIdArray(client.guardianEmails),
    studentEmail: client.studentEmail || "",
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

  const [clientsFromApi, staffFromApi, announcementsFromApi] = await Promise.all([
    fetchJsonOrNull("/api/clients"),
    fetchJsonOrNull("/api/staff"),
    fetchJsonOrNull("/api/announcements", {
      headers: buildSessionHeaders()
    })
  ]);

  if (Array.isArray(clientsFromApi) && clientsFromApi.length) {
    profiles = clientsFromApi.map(normalizeClientFromApi);
    applyStoredClientPhotos();
    saveProfiles();
  }

  if (Array.isArray(staffFromApi) && staffFromApi.length) {
    staffRecords = staffFromApi.map(normalizeStaffFromApi);
  }
  applyStoredStaffPhotos();

  if (Array.isArray(announcementsFromApi)) {
    announcements = announcementsFromApi;
    saveAnnouncements();
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
    assignedStaffIds: profile.assignedStaffIds || [],
    guardianEmails: profile.guardianEmails || [],
    studentEmail: profile.studentEmail || "",
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
      "Content-Type": "application/json",
      ...buildSessionHeaders()
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || "Failed to save profile");
  }

  return data;
}

async function deleteProfileFromBackend(profileId, session = getSession()) {
  const res = await fetch(`/api/clients/${encodeURIComponent(profileId)}`, {
    method: "DELETE",
    headers: buildSessionHeaders(session)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Failed to delete profile");
  }

  return data;
}

async function deleteStaffFromBackend(staffId, session = getSession()) {
  const res = await fetch(`/api/staff/${encodeURIComponent(staffId)}`, {
    method: "DELETE",
    headers: buildSessionHeaders(session)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Failed to delete staff profile");
  }

  return data;
}

// Session helpers for login state
function setSession(session) {
  localStorage.setItem("maa_session", JSON.stringify(buildSession(session, session.email)));
}

function getSession() {
  try {
    const stored = JSON.parse(localStorage.getItem("maa_session") || "null");
    if (!stored?.email) return null;
    return buildSession(stored, stored.email);
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

function buildSessionHeaders(session = getSession()) {
  if (!session) return {};

  return {
    "X-MAAP-Role": session.role,
    "X-MAAP-Email": session.email || "",
    "X-MAAP-Profile-Ids": (session.profileIds || []).join(","),
    "X-MAAP-Visible-Tags": getAccessibleTagCodes(session).join(",")
  };
}

function canViewAll(role) {
  return Boolean(getRoleConfig(role).allProfiles);
}

function canViewAllStaff(role) {
  return Boolean(getRoleConfig(role).allStaff);
}

function canSendBroadcast(role) {
  return Boolean(getRoleConfig(role).canBroadcast);
}

function canImportData(role) {
  return Boolean(getRoleConfig(role).canImport);
}

function canPostAnnouncements(role) {
  return ["director", "head_coordinator", "program_coordinator"].includes(normalizeRole(role));
}

function canDeleteRecords(role) {
  return ["director", "head_coordinator"].includes(normalizeRole(role));
}

function canAccessAdmin(role) {
  return ["director", "head_coordinator", "program_coordinator"].includes(normalizeRole(role));
}

function isAssignedToProfile(session, profile) {
  if (!session || !profile) return false;

  if ((session.profileIds || []).includes(profile.id)) return true;
  if (session.role === "guardian" && (profile.guardianEmails || []).includes(session.email)) return true;
  if (session.role === "student" && profile.studentEmail === session.email) return true;
  if (session.role === "program_coordinator" && (session.staffIds || []).includes(profile.programCoordinatorId)) {
    return true;
  }
  if (session.role === "staff") {
    return (profile.assignedStaffIds || []).some((staffId) => (session.staffIds || []).includes(staffId));
  }

  return false;
}

function canViewProfile(session, profile) {
  return canViewAll(session.role) || isAssignedToProfile(session, profile);
}

function canEditFullProfile(session, profile) {
  const config = getRoleConfig(session.role);
  return Boolean(config.fullEditAll || (config.fullEditAssigned && isAssignedToProfile(session, profile)));
}

function canEditEmergency(session, profile) {
  const config = getRoleConfig(session.role);
  return Boolean(config.emergencyEditAll || (config.emergencyEditAssigned && isAssignedToProfile(session, profile)));
}

function getAccessibleProfiles(session, profilesList = []) {
  return profilesList.filter((profile) =>
    canViewProfile(session, profile)
  );
}

function getAccessibleTagCodes(session) {
  if (canViewAll(session.role)) {
    return [...new Set(profiles.flatMap((profile) => profile.tags || []))].filter((code) => tag_definitions[code]);
  }

  return [...new Set(getAccessibleProfiles(session).flatMap((profile) => profile.tags || []))].filter(
    (code) => tag_definitions[code]
  );
}

function getAccessibleStaff(session) {
  if (canViewAllStaff(session.role)) return [...staffRecords];

  const allowedIds = new Set(session.staffIds || []);
  getAccessibleProfiles(session).forEach((profile) => {
    if (profile.programCoordinatorId) allowedIds.add(profile.programCoordinatorId);
  });

  return staffRecords.filter((person) => allowedIds.has(person.id));
}

function canViewStaffMember(session, person) {
  return getAccessibleStaff(session).some((member) => member.id === person.id);
}

function canEditStaffMember(session, person) {
  if (!session || !person) return false;
  const config = getRoleConfig(session.role);
  return Boolean(config.fullEditAll || (session.staffIds || []).includes(person.id));
}

function canViewAnnouncement(session, announcement) {
  if (!announcement) return false;
  if (canViewAll(session.role)) return true;

  const visibleTags = new Set(getAccessibleTagCodes(session));
  return (announcement.tags || []).some((tag) => visibleTags.has(tag));
}

function getVisibleAnnouncements(session) {
  return [...announcements]
    .filter((announcement) => canViewAnnouncement(session, announcement))
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function formatAnnouncementTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown time";
  return parsed.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / (1024 * 102.4)) / 10} MB`;
}

function normalizeAttachment(file) {
  return {
    id: file.id || `FILE-${Date.now()}`,
    name: file.name || "Attachment",
    type: file.type || "",
    size: Number(file.size || 0),
    url: file.url || "",
    dataUrl: file.dataUrl || "",
    isImage: Boolean(file.isImage || String(file.type || "").startsWith("image/"))
  };
}

async function readFilesAsAttachments(fileList) {
  const files = [...(fileList || [])];
  const readers = files.map(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve(
            normalizeAttachment({
              id: `FILE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: file.name,
              type: file.type,
              size: file.size,
              dataUrl: reader.result,
              isImage: file.type.startsWith("image/")
            })
          );
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      })
  );

  return Promise.all(readers);
}

// Build the header actions (role badge, staff link, import, logout)
function initNavAuthUI() {
  const s = getSession();
  const el = document.querySelector("[data-auth]");
  if (!el) return;

  if (!s) {
    el.innerHTML = getThemeToggleMarkup();
  } else {
    const announcementLink = `<a class="btn-maap blue" href="announcements.html">Announcements</a>`;
    const staffLink = `<a class="btn-maap blue" href="staff.html">Staff</a>`;
    const adminLink = canAccessAdmin(s.role) ? `<a class="btn-maap blue" href="admin.html">Admin</a>` : ``;

    el.innerHTML = `
      <span class="badge blue">${getRoleLabel(s.role).toUpperCase()}</span>
      ${announcementLink}
      ${staffLink}
      ${adminLink}
      ${getThemeToggleMarkup()}
      <button class="btn-maap orange" id="logoutBtn">Log Out</button>
    `;

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      clearSession();
      window.location.href = "portal.html";
    });

  }

  initThemeToggle();
}

// Handle login form submission
function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.email.value.trim().toLowerCase();

    if (!portalUsers[email]) {
      alert("We could not find an account for that email address.");
      return;
    }

    setSession(buildSession(portalUsers[email], email));
    window.location.href = "dashboard.html";
  });
}

// Director-only Excel upload that calls the backend import API
function initExcelUpload() {
  const session = getSession();
  if (!session || !canImportData(session.role)) return;

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

  // --------------------------------------------
  // Load profiles directly from backend
  // --------------------------------------------
  let accessibleProfiles = [];

  try {

    const res = await fetch("/api/clients", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders()
      }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Failed to load profiles");
    }

    // Normalize backend data into frontend shape
    accessibleProfiles = (data || []).map((p) => ({
      id: p.person_id,
      firstName: p.first_name || "",
      lastName: p.last_name || "",
      name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      stakeholderType: p.stakeholder_type || "",
      tags: Array.isArray(p.tags) ? p.tags : [],
      risks: Array.isArray(p.risks) ? p.risks : [],
      mediaConsent: p.media_consent ? "Yes" : "No",
      updated: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "",
      notes: p.notes || "",
      status: p.status || ""
    }));

  } catch (err) {
    console.error("dashboard_load_failed", err);

    const tbody = document.getElementById("profilesBody");

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            Failed to load profiles from backend.
          </td>
        </tr>
      `;
    }

    return;
  }

  // --------------------------------------------
  // Role-based filtering (frontend side)
  // --------------------------------------------
  accessibleProfiles = getAccessibleProfiles(s, accessibleProfiles);

  const who = document.getElementById("whoami");

  const accessRuleSummary = document.getElementById("accessRuleSummary");

  if (accessRuleSummary) {
    accessRuleSummary.textContent = getRoleConfig(s.role).summary;
  }

  const uploadTile = document.getElementById("uploadTile");

  if (uploadTile) {
    uploadTile.style.display = canImportData(s.role) ? "" : "none";
  }

  if (who) {
    who.textContent = `${s.name} | ${getRoleLabel(s.role)}`;
  }

  // --------------------------------------------
  // Render profiles table
  // --------------------------------------------
  const tbody = document.getElementById("profilesBody");

  if (tbody) {

    tbody.innerHTML = "";

    accessibleProfiles.forEach((p) => {

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>
          <a class="link" href="profile.html?id=${encodeURIComponent(p.id)}">
            ${p.name}
          </a>
        </td>

        <td>
          ${renderTags(p.tags || [])}
        </td>

        <td>
          ${renderRiskBadges(p.risks || [])}
        </td>

        <td>
          <span class="badge ${p.mediaConsent === "Yes" ? "blue" : "orange"}">
            ${p.mediaConsent}
          </span>
        </td>

        <td>
          ${p.updated}
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Empty state
    if (!accessibleProfiles.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            No accessible profiles found.
          </td>
        </tr>
      `;
    }
  }

  // --------------------------------------------
  // Search filtering
  // --------------------------------------------
  const search = document.getElementById("searchInput");

  if (search && tbody && search.dataset.bound !== "true") {

    search.dataset.bound = "true";

    search.addEventListener("input", () => {

      const q = search.value.trim().toLowerCase();

      [...tbody.querySelectorAll("tr")].forEach((tr) => {
        tr.style.display = tr.textContent.toLowerCase().includes(q)
          ? ""
          : "none";
      });

    });
  }

  // --------------------------------------------
  // Broadcast UI
  // --------------------------------------------
  const broadcastBox = document.getElementById("broadcastBox");

  if (broadcastBox) {
    broadcastBox.style.display = canSendBroadcast(s.role)
      ? "block"
      : "none";
  }

  const broadcastHelp = document.getElementById("broadcastHelp");
  const broadcastRoleBadge = document.getElementById("broadcastRoleBadge");
  const scopeSel = document.getElementById("broadcastScope");
  const programWrap = document.getElementById("broadcastProgramWrap");
  const groupWrap = document.getElementById("broadcastGroupWrap");
  const programSel = document.getElementById("broadcastProgram");
  const groupSel = document.getElementById("broadcastGroup");

  const accessibleTagCodes = [
    ...new Set(accessibleProfiles.flatMap((p) => p.tags || []))
  ].filter((code) => tag_definitions[code]);

  const accessibleGroups = [
    ...new Set(accessibleProfiles.map((p) => p.group).filter(Boolean))
  ];

  if (broadcastRoleBadge) {
    broadcastRoleBadge.textContent = getRoleLabel(s.role);
    broadcastRoleBadge.className =
      `pill-label ${canViewAll(s.role) ? "orange" : "blue"}`;
  }

  if (broadcastHelp) {
    broadcastHelp.textContent = canViewAll(s.role)
      ? `${getRoleLabel(s.role)}: can broadcast across the portal.`
      : `${getRoleLabel(s.role)}: can broadcast only to assigned people and families.`;
  }

  if (scopeSel) {
    scopeSel.options[0].text = canViewAll(s.role)
      ? "Everyone"
      : "My assigned people";
  }

  if (programSel) {

    const defaultLabel = canViewAll(s.role)
      ? "All accessible programs"
      : "All my programs";

    programSel.innerHTML = [
      `<option value="">${defaultLabel}</option>`,
      ...accessibleTagCodes.map(
        (code) =>
          `<option value="${code}">
            ${tag_definitions[code].label}
          </option>`
      )
    ].join("");
  }

  if (groupSel) {

    const defaultLabel = canViewAll(s.role)
      ? "All accessible groups"
      : "All my groups";

    groupSel.innerHTML = [
      `<option value="">${defaultLabel}</option>`,
      ...accessibleGroups.map(
        (group) => `<option value="${group}">${group}</option>`
      )
    ].join("");
  }

  function syncScopeUI() {

    const scope = scopeSel?.value || "all";

    if (programWrap) {
      programWrap.style.display =
        scope === "program" ? "block" : "none";
    }

    if (groupWrap) {
      groupWrap.style.display =
        scope === "group" ? "block" : "none";
    }
  }

  if (scopeSel && scopeSel.dataset.bound !== "true") {

    scopeSel.dataset.bound = "true";

    scopeSel.addEventListener("change", syncScopeUI);
  }

  syncScopeUI();

  // --------------------------------------------
  // Broadcast sending
  // --------------------------------------------
  const sendBtn = document.getElementById("sendBroadcast");

  if (sendBtn && sendBtn.dataset.bound !== "true") {

    sendBtn.dataset.bound = "true";

    sendBtn.addEventListener("click", () => {

      const msg =
        (document.getElementById("broadcastMsg")?.value || "").trim();

      if (!msg) {
        return alert("Please enter a message.");
      }

      if (!canSendBroadcast(s.role)) {
        return alert("You do not have permission to send alerts.");
      }

      const scope = scopeSel?.value || "all";
      const program = programSel?.value || "";
      const group = groupSel?.value || "";

      let targets = accessibleProfiles;

      let audienceLabel = canViewAll(s.role)
        ? "Everyone"
        : "My assigned people and guardians";

      if (scope === "program" && program) {

        targets = accessibleProfiles.filter(
          (p) => (p.tags || []).includes(program)
        );

        audienceLabel =
          `Program: ${tag_definitions[program]?.label || program}`;

      } else if (scope === "group" && group) {

        targets = accessibleProfiles.filter(
          (p) => p.group === group
        );

        audienceLabel = `Group: ${group}`;
      }

      if (!targets.length) {
        return alert(
          "No eligible recipients were found for that selection."
        );
      }

      const recipientNames =
        targets.map((p) => p.name).join(", ");

      alert(
        `Demo: would send emergency announcement to:\n` +
        `${audienceLabel}\n` +
        `Recipients: ${recipientNames}\n\n` +
        `Message:\n${msg}`
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
  if (!prof || !canViewProfile(s, prof)) {
    alert("You do not have permission to view that profile.");
    window.location.href = "dashboard.html";
    return;
  }

  const addressFields = document.querySelectorAll("[data-full-edit-field]");
  if (addressFields.length >= 4) {
    addressFields[0].value = prof.address?.street || "";
    addressFields[1].value = prof.address?.city || "";
    addressFields[2].value = prof.address?.state || "";
    addressFields[3].value = prof.address?.zip || "";
  }

  const emergencyInputs = document.querySelectorAll("input[data-emergency-field]");
  if (emergencyInputs.length >= 4) {
    emergencyInputs[0].value = prof.primaryContact?.name || "";
    emergencyInputs[1].value = prof.primaryContact?.phone || "";
    emergencyInputs[2].value = prof.secondaryContact?.name || "";
    emergencyInputs[3].value = prof.secondaryContact?.phone || "";
  }

  const textareas = document.querySelectorAll(".portal-textarea[data-emergency-field]");
  if (textareas.length >= 2) {
    textareas[0].value = prof.medicalNotes || "";
    textareas[1].value = prof.mobilityNotes || "";
  }

  const title = document.getElementById("profileTitle");
  if (title) {
    title.textContent = prof.name;
  }

  const canEditFull = canEditFullProfile(s, prof);
  const canEdit = canEditEmergency(s, prof);
  const canEditRisks = canEditFull || canEdit;
  const canEditPhoto = canEditFull || canEdit;

  const profilePhoto = document.getElementById("profilePhoto");
  const profilePhotoPlaceholder = document.getElementById("profilePhotoPlaceholder");
  updatePhotoPreview(profilePhoto, profilePhotoPlaceholder, prof.photoUrl || "");
  initPhotoUpload({
    inputEl: document.getElementById("profilePhotoUpload"),
    controlsEl: document.getElementById("profilePhotoControls"),
    statusEl: document.getElementById("profilePhotoStatus"),
    imgEl: profilePhoto,
    placeholderEl: profilePhotoPlaceholder,
    canEdit: canEditPhoto,
    onSave: async (dataUrl) => {
      prof.photoUrl = dataUrl;
      saveStoredPhoto(CLIENT_PHOTO_STORAGE_KEY, prof.id, dataUrl);
      saveProfiles();
    }
  });

  const editNotice = document.getElementById("editNotice");
  if (editNotice) {
    editNotice.innerHTML = canEditFull
      ? `<span class="badge blue">You can edit profile and emergency details</span>`
      : canEdit
        ? `<span class="badge blue">You can edit emergency info only</span>`
        : `<span class="badge">Read-only</span>`;
  }

  const accessSummary = document.getElementById("profileAccessSummary");
  if (accessSummary) {
    accessSummary.textContent = canEditFull
      ? `${getRoleLabel(s.role)}: full edit access for this profile.`
      : canEdit
        ? `${getRoleLabel(s.role)}: emergency-only editing for this profile.`
        : `${getRoleLabel(s.role)}: view-only access for this profile.`;
  }

  const coord = getStaffById(prof.programCoordinatorId);
  const coordEl = document.getElementById("coordinatorLink");
  if (coordEl) {
    coordEl.innerHTML = coord
      ? `<a class="link" href="staff_profile.html?id=${encodeURIComponent(coord.id)}">${coord.name}</a>
         <div class="small">${coord.title}</div>`
      : `<span class="small">Unassigned</span>`;
  }

  addressFields.forEach((field) => {
    field.disabled = !canEditFull;
  });

  const fields = document.querySelectorAll("[data-emergency-field]");
  fields.forEach((field) => {
    field.disabled = !canEdit;
  });

  const tagEditor = document.getElementById("profileTagsEditor");
  if (tagEditor) {
    renderTagCheckboxes(tagEditor, prof.tags || [], !canEditFull);
  }

  const riskEditor = document.getElementById("profileRisksEditor");
  if (riskEditor) {
    renderRiskCheckboxes(riskEditor, prof.risks || [], !canEditRisks);
  }

  // Sports picker — always mounted; visibility tracks the 'SO' tag in real time
  const sportCard = document.getElementById("profileSportsCard");
  const sportEditor = document.getElementById("profileSportsEditor");
  const sportKey = `maap_sports_${id}`;

  function ensureSportsRendered() {
    if (!sportEditor || sportEditor.dataset.rendered === "true") return;
    let storedSports = [];
    try {
      const raw = localStorage.getItem(sportKey);
      storedSports = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(storedSports)) storedSports = [];
    } catch {
      storedSports = [];
    }
    renderSportCheckboxes(sportEditor, storedSports, !canEditFull);
    sportEditor.dataset.rendered = "true";
  }

  function updateSportsCardVisibility(show) {
    if (!sportCard) return;
    sportCard.style.display = show ? "" : "none";
    if (show) ensureSportsRendered();
  }

  updateSportsCardVisibility(Array.isArray(prof.tags) && prof.tags.includes("so"));

  // Schools picker — always mounted; visibility tracks the 'E' (Elementary) tag in real time
  const schoolCard = document.getElementById("profileSchoolsCard");
  const schoolEditor = document.getElementById("profileSchoolsEditor");
  const schoolKey = `maap_schools_${id}`;

  function ensureSchoolsRendered() {
    if (!schoolEditor || schoolEditor.dataset.rendered === "true") return;
    let storedSchools = [];
    try {
      const raw = localStorage.getItem(schoolKey);
      storedSchools = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(storedSchools)) storedSchools = [];
    } catch {
      storedSchools = [];
    }
    renderSchoolCheckboxes(schoolEditor, storedSchools, !canEditFull);
    schoolEditor.dataset.rendered = "true";
  }

  function updateSchoolsCardVisibility(show) {
    if (!schoolCard) return;
    schoolCard.style.display = show ? "" : "none";
    if (show) ensureSchoolsRendered();
  }

  updateSchoolsCardVisibility(Array.isArray(prof.tags) && prof.tags.includes("e"));

  // Live toggle: react the moment the SO or E checkboxes flip in the tag editor
  if (tagEditor && tagEditor.dataset.conditionalListenerBound !== "true") {
    tagEditor.dataset.conditionalListenerBound = "true";
    tagEditor.addEventListener("change", (event) => {
      const target = event.target;
      if (!target || target.type !== "checkbox") return;
      if (target.value === "so") updateSportsCardVisibility(target.checked);
      if (target.value === "e") updateSchoolsCardVisibility(target.checked);
    });
  }

  const saveEmergencyBtn = document.getElementById("saveEmergency");
  if (saveEmergencyBtn) {
    saveEmergencyBtn.style.display = canEditFull || canEdit ? "" : "none";
  }

  const deleteProfileBtn = document.getElementById("deleteProfileBtn");
  if (deleteProfileBtn) {
    deleteProfileBtn.style.display = canDeleteRecords(s.role) ? "" : "none";
  }

  if (saveEmergencyBtn && saveEmergencyBtn.dataset.bound !== "true") {
    saveEmergencyBtn.dataset.bound = "true";
    saveEmergencyBtn.addEventListener("click", async () => {
      if (!canEdit) {
        return alert("You don’t have permission to edit this profile’s emergency info.");
      }

      if (!prof) {
        return alert("Profile not found.");
      }

      const visibleCheckedTags = canEditFull && tagEditor
        ? [...tagEditor.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value)
        : prof.tags || [];
      const hiddenTags = (prof.tags || []).filter(code => tag_definitions[code]?._hidden);
      const selectedTags = [...new Set([...visibleCheckedTags, ...hiddenTags])];

      const visibleCheckedRisks = canEditRisks && riskEditor
        ? [...riskEditor.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value)
        : prof.risks || [];
      const hiddenRisks = (prof.risks || []).filter(code => risk_definitions[code]?._hidden);
      const selectedRisks = [...new Set([...visibleCheckedRisks, ...hiddenRisks])];

      prof.tags = selectedTags;
      prof.risks = selectedRisks;
      prof.updated = new Date().toISOString().slice(0, 10);

      // Persist Special Olympics sports selection (local-only quick view)
      if (canEditFull && sportEditor && prof.tags.includes("so")) {
        const visibleCheckedSports = [...sportEditor.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value);
        const storedSports = JSON.parse(localStorage.getItem(sportKey) || "[]");
        const hiddenSports = storedSports.filter(code => sport_definitions[code]?._hidden);
        localStorage.setItem(sportKey, JSON.stringify([...new Set([...visibleCheckedSports, ...hiddenSports])]));
      } else if (!prof.tags.includes("so")) {
        localStorage.removeItem(sportKey);
      }

      // Persist Elementary schools selection (local-only quick view)
      if (canEditFull && schoolEditor && prof.tags.includes("e")) {
        const visibleCheckedSchools = [...schoolEditor.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value);
        const storedSchools = JSON.parse(localStorage.getItem(schoolKey) || "[]");
        const hiddenSchools = storedSchools.filter(code => school_definitions[code]?._hidden);
        localStorage.setItem(schoolKey, JSON.stringify([...new Set([...visibleCheckedSchools, ...hiddenSchools])]));
      } else if (!prof.tags.includes("e")) {
        localStorage.removeItem(schoolKey);
      }

      if (canEditFull && addressFields.length >= 4) {
        prof.address = {
          street: addressFields[0].value.trim(),
          city: addressFields[1].value.trim(),
          state: addressFields[2].value.trim(),
          zip: addressFields[3].value.trim()
        };
      }

      if (canEdit && emergencyInputs.length >= 4) {
        prof.primaryContact = {
          name: emergencyInputs[0].value.trim(),
          phone: emergencyInputs[1].value.trim()
        };
        prof.secondaryContact = {
          name: emergencyInputs[2].value.trim(),
          phone: emergencyInputs[3].value.trim()
        };
      }

      if (canEdit && textareas.length >= 2) {
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

  if (deleteProfileBtn && deleteProfileBtn.dataset.bound !== "true") {
    deleteProfileBtn.dataset.bound = "true";
    deleteProfileBtn.addEventListener("click", async () => {
      if (!canDeleteRecords(s.role)) {
        alert("Only Director and Head Coordinator can delete profiles.");
        return;
      }

      const confirmed = window.confirm(`Delete ${prof.name}'s profile? This cannot be undone.`);
      if (!confirmed) return;

      try {
        await deleteProfileFromBackend(prof.id, s);
        profiles = profiles.filter((profile) => profile.id !== prof.id);
        saveProfiles();
        backendHydrated = false;
        alert("Profile deleted successfully.");
        window.location.href = "dashboard.html";
      } catch (err) {
        alert(`Failed to delete profile: ${err.message}`);
      }
    });
  }
}

function renderAnnouncementTags(tagCodes = []) {
  if (!tagCodes.length) return '<span class="portal-muted">No audience tags</span>';

  return `
    <div class="announcement-tags">
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

function renderAnnouncementAttachments(attachments = []) {
  const normalized = attachments
    .map(normalizeAttachment)
    .filter((attachment) => attachment.dataUrl || attachment.url);
  if (!normalized.length) return "";

  const images = normalized.filter((attachment) => attachment.isImage);
  const files = normalized.filter((attachment) => !attachment.isImage);

  return `
    <div class="announcement-attachments">
      ${images.length
        ? `
          <div class="announcement-attachment-grid">
            ${images
              .map(
                (attachment) => `
                  <a href="${attachment.url || attachment.dataUrl}" download="${attachment.name}">
                    <img class="announcement-image" src="${attachment.url || attachment.dataUrl}" alt="${attachment.name}" />
                  </a>
                `
              )
              .join("")}
          </div>
        `
        : ""}
      ${files.length
        ? files
            .map(
              (attachment) => `
                <div class="announcement-file">
                  <a href="${attachment.url || attachment.dataUrl}" download="${attachment.name}">${attachment.name}</a>
                  <span class="portal-muted">${formatFileSize(attachment.size)}</span>
                </div>
              `
            )
            .join("")
        : ""}
    </div>
  `;
}

function renderAnnouncementList(session) {
  const container = document.getElementById("announcementList");
  const count = document.getElementById("announcementFeedCount");
  if (!container) return;

  const visibleAnnouncements = getVisibleAnnouncements(session);

  const now = new Date();
  const activeAnnouncements = visibleAnnouncements.filter((a) => {
    if (!a.expiresAt) return true;
    return new Date(a.expiresAt) > now;
  });

  if (count) {
    count.textContent = `${activeAnnouncements.length} visible post${activeAnnouncements.length === 1 ? "" : "s"}`;
  }

  if (!activeAnnouncements.length) {
    container.innerHTML = `
      <div class="announcement-empty">
        No announcements match the tags on the profiles you can access yet.
      </div>
    `;
    return;
  }

  container.innerHTML = activeAnnouncements
    .map((announcement) => {
      const liked = (announcement.likes || []).includes(session.email);
      const comments = Array.isArray(announcement.comments) ? announcement.comments : [];
      const importance = announcement.importance || "normal";
      const importanceBadge = importance === "urgent"
        ? '<span class="pill-label urgent">Urgent</span>'
        : importance === "high"
          ? '<span class="pill-label high">High</span>'
          : '';
      const expiresLabel = announcement.expiresAt
        ? `<span class="portal-muted" style="font-size:12px;">Expires ${formatAnnouncementTime(announcement.expiresAt)}</span>`
        : '';

      return `
        <article class="announcement-card" data-announcement-id="${announcement.id}">
          <div class="announcement-top">
            <div>
              <div class="announcement-author">${announcement.authorName}</div>
              <div class="announcement-meta">${announcement.authorRole} | ${formatAnnouncementTime(announcement.createdAt)}${expiresLabel ? ' | ' + expiresLabel : ''}</div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              ${importanceBadge}
              <span class="pill-label blue">${(announcement.tags || []).length} tag${(announcement.tags || []).length === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div class="announcement-body">${announcement.body}</div>
          ${renderAnnouncementAttachments(announcement.attachments || [])}
          ${renderAnnouncementTags(announcement.tags || [])}

          <div class="announcement-actions">
            <button class="announcement-btn ${liked ? "active" : ""}" type="button" data-action="like" data-announcement-id="${announcement.id}">
              ${liked ? "Liked" : "Like"} (${(announcement.likes || []).length})
            </button>
            <span class="portal-muted">${comments.length} comment${comments.length === 1 ? "" : "s"}</span>
          </div>

          <div class="announcement-comments">
            ${comments.length
              ? comments
                  .map(
                    (comment) => `
                      <div class="announcement-comment">
                        <div class="announcement-comment-meta">${comment.authorName} | ${comment.authorRole} | ${formatAnnouncementTime(comment.createdAt)}</div>
                        <div>${comment.body}</div>
                      </div>
                    `
                  )
                  .join("")
              : `<div class="portal-muted">No comments yet.</div>`}

            <div class="announcement-comment-form">
              <textarea class="portal-textarea" rows="2" data-comment-input="${announcement.id}" placeholder="Add a comment"></textarea>
              <div class="portal-actions">
                <button class="portal-btn-orange" type="button" data-action="comment" data-announcement-id="${announcement.id}">Comment</button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function createAnnouncementInBackend(session, announcement) {
  const res = await fetch("/api/announcements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildSessionHeaders(session)
    },
    body: JSON.stringify(announcement)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Failed to create announcement");
  }

  return data;
}

async function toggleAnnouncementLikeInBackend(session, announcementId) {
  const res = await fetch(`/api/announcements/${encodeURIComponent(announcementId)}/likes/toggle`, {
    method: "POST",
    headers: buildSessionHeaders(session)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Failed to toggle like");
  }

  return data;
}

async function addAnnouncementCommentInBackend(session, announcementId, comment) {
  const res = await fetch(`/api/announcements/${encodeURIComponent(announcementId)}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildSessionHeaders(session)
    },
    body: JSON.stringify(comment)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Failed to add comment");
  }

  return data;
}

function toggleAnnouncementLike(session, announcementId) {
  announcements = announcements.map((announcement) => {
    if (announcement.id !== announcementId) return announcement;

    const likes = new Set(announcement.likes || []);
    if (likes.has(session.email)) {
      likes.delete(session.email);
    } else {
      likes.add(session.email);
    }

    return {
      ...announcement,
      likes: [...likes]
    };
  });

  saveAnnouncements();
  return announcements.find((announcement) => announcement.id === announcementId) || null;
}

function addAnnouncementComment(session, announcementId, body) {
  announcements = announcements.map((announcement) => {
    if (announcement.id !== announcementId) return announcement;

    return {
      ...announcement,
      comments: [
        ...(announcement.comments || []),
        {
          id: `COM-${Date.now()}`,
          authorName: session.name,
          authorRole: getRoleLabel(session.role),
          authorEmail: session.email,
          body,
          createdAt: new Date().toISOString()
        }
      ]
    };
  });

  saveAnnouncements();
  return announcements.find((announcement) => announcement.id === announcementId) || null;
}

function createAnnouncement(session, body, tags, attachments = [], sports = [], schools = [], expiresIn = "", importance = "normal") {
  const now = new Date();
  let expiresAt = null;
  if (expiresIn) {
    const exp = new Date(now);
    exp.setDate(exp.getDate() + parseInt(expiresIn, 10));
    expiresAt = exp.toISOString();
  }

  const announcement = {
    id: `ANN-${Date.now()}`,
    authorName: session.name,
    authorRole: getRoleLabel(session.role),
    authorEmail: session.email,
    body,
    tags,
    sports,
    schools,
    attachments: attachments.map(normalizeAttachment),
    createdAt: now.toISOString(),
    expiresAt,
    importance,
    likes: [],
    comments: []
  };

  announcements.unshift(announcement);

  saveAnnouncements();
  return announcement;
}

async function initAnnouncementsPage() {
  const session = requireAuth();
  await hydrateDataFromBackend();

  const visibleTags = getAccessibleTagCodes(session);
  const canPost = canPostAnnouncements(session.role);
  let pendingAttachments = [];

  const composerCard = document.getElementById("announcementComposerCard");
  if (composerCard) composerCard.style.display = canPost ? "block" : "none";

  const composerHelp = document.getElementById("announcementComposerHelp");
  if (composerHelp) {
    composerHelp.textContent = canPost
      ? "Choose the profile tags that should be able to see this update."
      : "You can read, like, and comment on posts that match your visible profile tags.";
  }

  const accessSummary = document.getElementById("announcementAccessSummary");
  if (accessSummary) {
    accessSummary.textContent = canViewAll(session.role)
      ? `${getRoleLabel(session.role)} can view announcements across all tags.`
      : `${getRoleLabel(session.role)} can view posts that match tags on accessible profiles.`;
  }

  const visibleTagsEl = document.getElementById("announcementVisibleTags");
  if (visibleTagsEl) {
    visibleTagsEl.className = "announcement-visible-tags";
    visibleTagsEl.innerHTML = visibleTags.length ? renderAnnouncementTags(visibleTags) : '<span class="portal-muted">No visible tags.</span>';
  }

  const tagEditor = document.getElementById("announcementTagEditor");
  if (tagEditor) {
    renderTagCheckboxes(tagEditor, [], !canPost);
  }

  // Conditional Sports / Schools pickers inside the composer.
  // Same pattern as profile.html: always mounted, visibility toggles with SO/E tags.
  const composerSportsSection = document.getElementById("announcementSportsSection");
  const composerSportsEditor = document.getElementById("announcementSportsEditor");
  const composerSchoolsSection = document.getElementById("announcementSchoolsSection");
  const composerSchoolsEditor = document.getElementById("announcementSchoolsEditor");

  function renderComposerSports() {
    if (composerSportsEditor) renderSportCheckboxes(composerSportsEditor, [], !canPost);
  }
  function renderComposerSchools() {
    if (composerSchoolsEditor) renderSchoolCheckboxes(composerSchoolsEditor, [], !canPost);
  }

  function setComposerSportsVisibility(show) {
    if (!composerSportsSection) return;
    composerSportsSection.style.display = show ? "" : "none";
    if (show && composerSportsEditor && composerSportsEditor.dataset.rendered !== "true") {
      renderComposerSports();
      composerSportsEditor.dataset.rendered = "true";
    }
  }
  function setComposerSchoolsVisibility(show) {
    if (!composerSchoolsSection) return;
    composerSchoolsSection.style.display = show ? "" : "none";
    if (show && composerSchoolsEditor && composerSchoolsEditor.dataset.rendered !== "true") {
      renderComposerSchools();
      composerSchoolsEditor.dataset.rendered = "true";
    }
  }

  // Live toggle: react to SO / E flips in the audience-tag editor
  if (tagEditor && tagEditor.dataset.conditionalListenerBound !== "true") {
    tagEditor.dataset.conditionalListenerBound = "true";
    tagEditor.addEventListener("change", (event) => {
      const target = event.target;
      if (!target || target.type !== "checkbox") return;
      if (target.value === "so") setComposerSportsVisibility(target.checked);
      if (target.value === "e") setComposerSchoolsVisibility(target.checked);
    });
  }

  const attachmentInput = document.getElementById("announcementAttachments");
  const attachmentPreview = document.getElementById("announcementAttachmentPreview");
  if (attachmentInput && attachmentPreview && attachmentInput.dataset.bound !== "true") {
    attachmentInput.dataset.bound = "true";
    attachmentInput.addEventListener("change", async () => {
      const files = attachmentInput.files;
      if (!files?.length) {
        pendingAttachments = [];
        attachmentPreview.innerHTML = "Add images, PDFs, or common office files to the post.";
        return;
      }

      try {
        pendingAttachments = await readFilesAsAttachments(files);
        attachmentPreview.className = "announcement-attachment-preview";
        attachmentPreview.innerHTML = pendingAttachments
          .map((attachment) =>
            attachment.isImage
              ? `<div class="announcement-file"><span>${attachment.name}</span><span class="portal-muted">${formatFileSize(attachment.size)}</span></div>`
              : `<div class="announcement-file"><span>${attachment.name}</span><span class="portal-muted">${formatFileSize(attachment.size)}</span></div>`
          )
          .join("");
      } catch (error) {
        pendingAttachments = [];
        attachmentInput.value = "";
        attachmentPreview.className = "portal-footnote";
        attachmentPreview.textContent = `Attachment upload failed: ${error.message}`;
      }
    });
  }

  const postButton = document.getElementById("postAnnouncement");
  const messageField = document.getElementById("announcementMessage");
  if (postButton && messageField && postButton.dataset.bound !== "true") {
    postButton.dataset.bound = "true";
    postButton.addEventListener("click", async () => {
      if (!canPost) {
        alert("Only Director, Head Coordinator, and Program Coordinators can post announcements.");
        return;
      }

      const body = messageField.value.trim();
      if (!body) {
        alert("Please write an announcement.");
        return;
      }

      const selectedTags = tagEditor
        ? [...tagEditor.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value)
        : [];

      if (!selectedTags.length) {
        alert("Choose at least one audience tag.");
        return;
      }

      const selectedSports = composerSportsEditor && selectedTags.includes("so")
        ? [...composerSportsEditor.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value)
        : [];
      const selectedSchools = composerSchoolsEditor && selectedTags.includes("e")
        ? [...composerSchoolsEditor.querySelectorAll('input[type="checkbox"]:checked')].map((cb) => cb.value)
        : [];

      const expirationSelect = document.getElementById("announcementExpiration");
      const importanceSelect = document.getElementById("announcementImportance");
      const expiresIn = expirationSelect ? expirationSelect.value : "";
      const importance = importanceSelect ? importanceSelect.value : "normal";

      const localAnnouncement = createAnnouncement(session, body, selectedTags, pendingAttachments, selectedSports, selectedSchools, expiresIn, importance);

      try {
        await createAnnouncementInBackend(session, localAnnouncement);
        backendHydrated = false;
        await hydrateDataFromBackend();
      } catch {
        saveAnnouncements();
      }

      messageField.value = "";
      pendingAttachments = [];
      if (attachmentInput) attachmentInput.value = "";
      if (attachmentPreview) {
        attachmentPreview.className = "portal-footnote";
        attachmentPreview.textContent = "Add images, PDFs, or common office files to the post.";
      }
      if (expirationSelect) expirationSelect.value = "";
      if (importanceSelect) importanceSelect.value = "normal";
      renderTagCheckboxes(tagEditor, [], !canPost);
      // Reset + hide the conditional pickers so they match the cleared audience tags
      if (composerSportsEditor) {
        renderComposerSports();
        composerSportsEditor.dataset.rendered = "true";
      }
      if (composerSchoolsEditor) {
        renderComposerSchools();
        composerSchoolsEditor.dataset.rendered = "true";
      }
      setComposerSportsVisibility(false);
      setComposerSchoolsVisibility(false);
      renderAnnouncementList(session);
    });
  }

  const list = document.getElementById("announcementList");
  if (list && list.dataset.bound !== "true") {
    list.dataset.bound = "true";
    list.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const announcementId = button.dataset.announcementId;
      if (!announcementId) return;

      if (button.dataset.action === "like") {
        toggleAnnouncementLike(session, announcementId);
        try {
          await toggleAnnouncementLikeInBackend(session, announcementId);
          backendHydrated = false;
          await hydrateDataFromBackend();
        } catch {
          saveAnnouncements();
        }
        renderAnnouncementList(session);
      }

      if (button.dataset.action === "comment") {
        const input = list.querySelector(`[data-comment-input="${announcementId}"]`);
        const body = input?.value.trim() || "";
        if (!body) {
          alert("Write a comment before posting.");
          return;
        }

        const localComment = {
          id: `COM-${Date.now()}`,
          authorName: session.name,
          authorRole: getRoleLabel(session.role),
          authorEmail: session.email,
          body,
          createdAt: new Date().toISOString()
        };

        addAnnouncementComment(session, announcementId, body);
        try {
          await addAnnouncementCommentInBackend(session, announcementId, localComment);
          backendHydrated = false;
          await hydrateDataFromBackend();
        } catch {
          saveAnnouncements();
        }
        renderAnnouncementList(session);
      }
    });
  }

  renderAnnouncementList(session);
}

// Render the staff directory and support simple staff searching
async function initStaffDirectory() {
  const s = requireAuth();
  await hydrateDataFromBackend();

  const who = document.getElementById("whoami");
  if (who) who.textContent = `${s.name} • ${s.role}`;

  if (who) who.textContent = `${s.name} | ${getRoleLabel(s.role)}`;

  const list = document.getElementById("staffList");
  if (!list) return;

  const visibleStaff = getAccessibleStaff(s);
  list.innerHTML = "";
  visibleStaff.forEach((person) => {
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
  if (staffCount) staffCount.textContent = `${visibleStaff.length} visible staff`;
}

// Render a single staff member profile page
async function initStaffProfilePage() {
  const session = requireAuth();
  await hydrateDataFromBackend();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "S-2001";

  const person = getStaffById(id);
  if (!person || !canViewStaffMember(session, person)) {
    alert("You do not have permission to view that staff profile.");
    window.location.href = "staff.html";
    return;
  }

  const title = document.getElementById("staffTitle");
  if (title) title.textContent = person.name;

  const role = document.getElementById("staffRole");
  if (role) role.textContent = person ? person.title : "—";

  const img = document.getElementById("staffHeadshot");
  if (img) img.src = person.headshotUrl || "assets/empty-headshot.jpg";

  const canEditStaffPhoto = canEditStaffMember(session, person);
  initPhotoUpload({
    inputEl: document.getElementById("staffPhotoUpload"),
    controlsEl: document.getElementById("staffPhotoControls"),
    statusEl: document.getElementById("staffPhotoStatus"),
    imgEl: img,
    placeholderEl: null,
    canEdit: canEditStaffPhoto,
    onSave: async (dataUrl) => {
      person.headshotUrl = dataUrl;
      saveStoredPhoto(STAFF_PHOTO_STORAGE_KEY, person.id, dataUrl);
      staffRecords = staffRecords.map((member) => (member.id === person.id ? { ...member, headshotUrl: dataUrl } : member));
    }
  });

  const email = document.getElementById("staffEmail");
  if (email) email.textContent = person ? person.email : "—";

  const phone = document.getElementById("staffPhone");
  if (phone) phone.textContent = person ? person.phone : "—";

  const addr = document.getElementById("staffAddress");
  if (addr) {
    addr.textContent = `${person.address.street}, ${person.address.city}, ${person.address.state} ${person.address.zip}`;
  }

  const deleteStaffBtn = document.getElementById("deleteStaffBtn");
  if (deleteStaffBtn) {
    deleteStaffBtn.style.display = canDeleteRecords(session.role) ? "" : "none";
  }

  if (deleteStaffBtn && deleteStaffBtn.dataset.bound !== "true") {
    deleteStaffBtn.dataset.bound = "true";
    deleteStaffBtn.addEventListener("click", async () => {
      if (!canDeleteRecords(session.role)) {
        alert("Only Director and Head Coordinator can delete staff profiles.");
        return;
      }

      const confirmed = window.confirm(`Delete ${person.name}'s staff profile? This cannot be undone.`);
      if (!confirmed) return;

      try {
        await deleteStaffFromBackend(person.id, session);
        staffRecords = staffRecords.filter((member) => member.id !== person.id);
        profiles = profiles.map((profile) =>
          profile.programCoordinatorId === person.id
            ? { ...profile, programCoordinatorId: "" }
            : profile
        );
        saveProfiles();
        backendHydrated = false;
        alert("Staff profile deleted successfully.");
        window.location.href = "staff.html";
      } catch (err) {
        alert(`Failed to delete staff profile: ${err.message}`);
      }
    });
  }
}

// ==================================================
// Admin Control Page
// ==================================================

function saveAdminDefinitions(storageKey, defs) {
  localStorage.setItem(storageKey, JSON.stringify(defs));
}

// --- Render active (non-retired) items with a Retire button ---
function renderAdminList(containerId, defs, storageKey, labelField, rerender, retiredRerender) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const activeKeys = Object.keys(defs).filter(k => !defs[k]._hidden);

  container.innerHTML = activeKeys.map(key => {
    const item = defs[key];
    const display = labelField === "tag"
      ? `${item.text} — ${item.label}`
      : item.label;
    return `
      <div class="admin-option-item">
        <div>
          <span class="admin-option-label">${display}</span>
          <span class="admin-option-key">${key}</span>
        </div>
        <div class="admin-option-actions">
          <button class="admin-option-retire" data-key="${key}">Retire</button>
        </div>
      </div>`;
  }).join("");

  if (!activeKeys.length) {
    container.innerHTML = '<p class="admin-retired-empty">No active options. Check the Retired Options tab.</p>';
  }

  container.querySelectorAll(".admin-option-retire").forEach(btn => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.key;
      const item = defs[k];
      const name = item.label || item.text || k;
      if (!confirm(
        `Retire "${name}"?\n\nThis will hide it from all users and move it to the Retired Options tab. ` +
        `Existing records that reference this option will not be affected.`
      )) return;
      item._hidden = true;
      saveAdminDefinitions(storageKey, defs);
      rerender();
      if (retiredRerender) retiredRerender();
    });
  });
}

// --- Render retired (hidden) items with a Restore button ---
function renderRetiredList(containerId, emptyId, defs, storageKey, labelField, rerender, activeRerender) {
  const container = document.getElementById(containerId);
  const emptyMsg = document.getElementById(emptyId);
  if (!container) return;

  const retiredKeys = Object.keys(defs).filter(k => defs[k]._hidden === true);

  container.innerHTML = retiredKeys.map(key => {
    const item = defs[key];
    const display = labelField === "tag"
      ? `${item.text} — ${item.label}`
      : item.label;
    return `
      <div class="admin-option-item retired-item">
        <div>
          <span class="admin-option-label">${display}</span>
          <span class="admin-option-key">${key}</span>
        </div>
        <div class="admin-option-actions">
          <button class="admin-option-restore" data-key="${key}">Restore</button>
        </div>
      </div>`;
  }).join("");

  if (emptyMsg) emptyMsg.style.display = retiredKeys.length ? "none" : "block";

  container.querySelectorAll(".admin-option-restore").forEach(btn => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.key;
      const item = defs[k];
      const name = item.label || item.text || k;
      if (!confirm(`Restore "${name}"? It will become visible to users again.`)) return;
      item._hidden = false;
      delete item._deleted;
      saveAdminDefinitions(storageKey, defs);
      rerender();
      if (activeRerender) activeRerender();
    });
  });
}

// --- Live preview that mirrors input fields ---
function initAdminPreview(previewId, inputIds) {
  const preview = document.getElementById(previewId);
  if (!preview) return;

  const inputs = inputIds.map(id => document.getElementById(id)).filter(Boolean);
  const placeholder = '<span class="admin-preview-placeholder">Type below to preview...</span>';

  function update() {
    const vals = inputs.map(el => el.value.trim()).filter(Boolean);
    if (!vals.length) {
      preview.innerHTML = placeholder;
      return;
    }
    // For tags: show "TEXT — Label (key)"
    if (inputIds.length === 3) {
      const key = inputs[0].value.trim().toLowerCase().replace(/\s+/g, "_");
      const text = inputs[1].value.trim().toUpperCase();
      const label = inputs[2].value.trim();
      preview.innerHTML = `
        <span class="admin-preview-label">${text || "?"} — ${label || "?"}</span>
        <span class="admin-preview-key">${key || "?"}</span>`;
    } else {
      const key = inputs[0].value.trim().toLowerCase().replace(/\s+/g, "_");
      const label = inputs[1].value.trim();
      preview.innerHTML = `
        <span class="admin-preview-label">${label || "?"}</span>
        <span class="admin-preview-key">${key || "?"}</span>`;
    }
  }

  inputs.forEach(el => el.addEventListener("input", update));
  update();
}

// --- Add-option modal ---
function showAddModal(fields, onConfirm) {
  const backdrop = document.getElementById("adminAddModal");
  const fieldsEl = document.getElementById("adminAddModalFields");
  const visToggle = document.getElementById("adminAddModalVisToggle");
  const submitBtn = document.getElementById("adminAddModalSubmit");
  const cancelBtn = document.getElementById("adminAddModalCancel");

  let startVisible = false;
  visToggle.className = "admin-option-visibility is-hidden";
  visToggle.textContent = "Hidden";

  fieldsEl.innerHTML = fields.map(f =>
    `<div class="admin-modal-field">
       <div class="portal-label">${f.label}</div>
       <div class="admin-modal-value">${f.value}</div>
     </div>`
  ).join("");

  backdrop.style.display = "flex";

  function cleanup() {
    backdrop.style.display = "none";
    visToggle.replaceWith(visToggle.cloneNode(true));
    submitBtn.replaceWith(submitBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  }

  // Re-grab after clone to attach fresh listeners
  const visToggle2 = document.getElementById("adminAddModalVisToggle");
  const submitBtn2 = document.getElementById("adminAddModalSubmit");
  const cancelBtn2 = document.getElementById("adminAddModalCancel");

  visToggle2.addEventListener("click", () => {
    startVisible = !startVisible;
    visToggle2.className = startVisible
      ? "admin-option-visibility is-visible"
      : "admin-option-visibility is-hidden";
    visToggle2.textContent = startVisible ? "Visible" : "Hidden";
  });

  cancelBtn2.addEventListener("click", cleanup);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) cleanup(); });

  submitBtn2.addEventListener("click", () => {
    onConfirm(startVisible);
    cleanup();
  });
}

function initAdminPage() {
  const s = requireAuth();
  if (!canAccessAdmin(s.role)) {
    alert("You do not have permission to access the admin page.");
    window.location.href = "dashboard.html";
    return;
  }

  // --- Tabs ---
  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".admin-tab-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add("active");
    });
  });

  // --- Collapsible cards ---
  document.querySelectorAll(".admin-collapsible-head").forEach(head => {
    head.addEventListener("click", () => {
      head.classList.toggle("open");
      const body = head.nextElementSibling;
      if (body) body.classList.toggle("open");
    });
  });

  // --- Storage keys ---
  const SPORT_KEY = "maap_sport_definitions";
  const RISK_KEY = "maap_risk_definitions";
  const SCHOOL_KEY = "maap_school_definitions";
  const TAG_KEY = "maap_tag_definitions";

  // Rerender helpers — active and retired lists cross-update each other
  function rerenderRetiredSports() { renderRetiredList("retiredSportList", "retiredSportEmpty", sport_definitions, SPORT_KEY, "label", rerenderRetiredSports, rerenderSports); }
  function rerenderRetiredRisks() { renderRetiredList("retiredRiskList", "retiredRiskEmpty", risk_definitions, RISK_KEY, "label", rerenderRetiredRisks, rerenderRisks); }
  function rerenderRetiredSchools() { renderRetiredList("retiredSchoolList", "retiredSchoolEmpty", school_definitions, SCHOOL_KEY, "label", rerenderRetiredSchools, rerenderSchools); }
  function rerenderRetiredTags() { renderRetiredList("retiredTagList", "retiredTagEmpty", tag_definitions, TAG_KEY, "tag", rerenderRetiredTags, rerenderTags); }

  function rerenderSports() { renderAdminList("adminSportList", sport_definitions, SPORT_KEY, "label", rerenderSports, rerenderRetiredSports); }
  function rerenderRisks() { renderAdminList("adminRiskList", risk_definitions, RISK_KEY, "label", rerenderRisks, rerenderRetiredRisks); }
  function rerenderSchools() { renderAdminList("adminSchoolList", school_definitions, SCHOOL_KEY, "label", rerenderSchools, rerenderRetiredSchools); }
  function rerenderTags() { renderAdminList("adminTagList", tag_definitions, TAG_KEY, "tag", rerenderTags, rerenderRetiredTags); }

  // --- Initial render ---
  rerenderSports();
  rerenderRisks();
  rerenderSchools();
  rerenderTags();
  rerenderRetiredSports();
  rerenderRetiredRisks();
  rerenderRetiredSchools();
  rerenderRetiredTags();

  // --- Live previews ---
  initAdminPreview("adminSportPreview", ["adminSportKey", "adminSportLabel"]);
  initAdminPreview("adminRiskPreview", ["adminRiskKey", "adminRiskLabel"]);
  initAdminPreview("adminSchoolPreview", ["adminSchoolKey", "adminSchoolLabel"]);
  initAdminPreview("adminTagPreview", ["adminTagKey", "adminTagText", "adminTagLabel"]);

  // --- Add handlers (open modal) ---
  document.getElementById("addSportBtn")?.addEventListener("click", () => {
    const keyEl = document.getElementById("adminSportKey");
    const labelEl = document.getElementById("adminSportLabel");
    const key = keyEl.value.trim().toLowerCase().replace(/\s+/g, "_");
    const label = labelEl.value.trim();
    if (!key || !label) return;

    showAddModal(
      [{ label: "Key", value: key }, { label: "Label", value: label }],
      (visible) => {
        sport_definitions[key] = { label, _hidden: !visible };
        saveAdminDefinitions(SPORT_KEY, sport_definitions);
        rerenderSports();
        keyEl.value = "";
        labelEl.value = "";
        document.getElementById("adminSportPreview").innerHTML = '<span class="admin-preview-placeholder">Type below to preview...</span>';
      }
    );
  });

  document.getElementById("addRiskBtn")?.addEventListener("click", () => {
    const keyEl = document.getElementById("adminRiskKey");
    const labelEl = document.getElementById("adminRiskLabel");
    const key = keyEl.value.trim().toLowerCase().replace(/\s+/g, "_");
    const label = labelEl.value.trim();
    if (!key || !label) return;

    showAddModal(
      [{ label: "Key", value: key }, { label: "Label", value: label }],
      (visible) => {
        risk_definitions[key] = { label, _hidden: !visible };
        saveAdminDefinitions(RISK_KEY, risk_definitions);
        rerenderRisks();
        keyEl.value = "";
        labelEl.value = "";
        document.getElementById("adminRiskPreview").innerHTML = '<span class="admin-preview-placeholder">Type below to preview...</span>';
      }
    );
  });

  document.getElementById("addSchoolBtn")?.addEventListener("click", () => {
    const keyEl = document.getElementById("adminSchoolKey");
    const labelEl = document.getElementById("adminSchoolLabel");
    const key = keyEl.value.trim().toLowerCase().replace(/\s+/g, "_");
    const label = labelEl.value.trim();
    if (!key || !label) return;

    showAddModal(
      [{ label: "Key", value: key }, { label: "Label", value: label }],
      (visible) => {
        school_definitions[key] = { label, _hidden: !visible };
        saveAdminDefinitions(SCHOOL_KEY, school_definitions);
        rerenderSchools();
        keyEl.value = "";
        labelEl.value = "";
        document.getElementById("adminSchoolPreview").innerHTML = '<span class="admin-preview-placeholder">Type below to preview...</span>';
      }
    );
  });

  document.getElementById("addTagBtn")?.addEventListener("click", () => {
    const keyEl = document.getElementById("adminTagKey");
    const textEl = document.getElementById("adminTagText");
    const labelEl = document.getElementById("adminTagLabel");
    const key = keyEl.value.trim().toLowerCase().replace(/\s+/g, "_");
    const text = textEl.value.trim().toUpperCase();
    const label = labelEl.value.trim();
    if (!key || !text || !label) return;

    showAddModal(
      [{ label: "Key", value: key }, { label: "Short text", value: text }, { label: "Label", value: label }],
      (visible) => {
        tag_definitions[key] = { text, className: `tag-${key}`, label, _hidden: !visible };
        saveAdminDefinitions(TAG_KEY, tag_definitions);
        rerenderTags();
        keyEl.value = "";
        textEl.value = "";
        labelEl.value = "";
        document.getElementById("adminTagPreview").innerHTML = '<span class="admin-preview-placeholder">Type below to preview...</span>';
      }
    );
  });

  // --- Export / Import Data (director only) ---
  const exportCard = document.getElementById("adminExportCard");
  const importCard = document.getElementById("adminImportCard");
  const noAccessCard = document.getElementById("adminImportNoAccess");
  if (canImportData(s.role)) {
    if (exportCard) exportCard.style.display = "";
    if (importCard) importCard.style.display = "";
    if (noAccessCard) noAccessCard.style.display = "none";
    const fileInput = document.getElementById("adminExcelUpload");
    const status = document.getElementById("adminUploadStatus");

    fileInput?.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;

      status.textContent = `Uploading ${file.name}...`;
      const formData = new FormData();
      formData.append("file", file);

      try {
        const headers = buildSessionHeaders();
        const res = await fetch("/api/import/excel", {
          method: "POST",
          headers,
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Import failed");
        status.textContent = `Import complete — ${data.clients_inserted ?? 0} clients, ${data.staff_inserted ?? 0} staff inserted.`;
      } catch (err) {
        status.textContent = `Error: ${err.message}`;
      }
      fileInput.value = "";
    });
  }
}

// Boot the correct page logic after the DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  initThemeToggle();
  initNavAuthUI();
  initLoginForm();

  if (document.body.dataset.page === "dashboard") await initDashboard();
  if (document.body.dataset.page === "announcements") await initAnnouncementsPage();
  if (document.body.dataset.page === "profile") await initProfilePage();
  if (document.body.dataset.page === "staff") await initStaffDirectory();
  if (document.body.dataset.page === "staff_profile") await initStaffProfilePage();
  if (document.body.dataset.page === "admin") initAdminPage();

  initExcelUpload();
});
