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
const profiles = [
  { id:"P-1001", name:"Alex R.",   group:"Adult Services",    inGroup:true,  risk:"High", updated:"2026-02-10", programCoordinatorId:"S-2001" },
  { id:"P-1002", name:"Jordan M.", group:"Special Education", inGroup:false, risk:"Med",  updated:"2026-01-28", programCoordinatorId:"S-2002" },
  { id:"P-1003", name:"Sam K.",    group:"Athletics",         inGroup:true,  risk:"Low",  updated:"2026-02-01", programCoordinatorId:"S-2001" },
];

// Lookups
function getStaffById(id) {
  return staff.find(s => s.id === id) || null;
}
function getProfileById(id) {
  return profiles.find(p => p.id === id) || null;
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
function canEditEmergency(role, inGroup) {
  if (role === "president") return true;
  if (role === "staff" && inGroup) return true;
  if (role === "guardian" && inGroup) return true;
  return false;
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

  const who = document.getElementById("whoami");
  if (who) who.textContent = `${s.name} • ${s.role}`;

  const tbody = document.getElementById("profilesBody");
  if (tbody) {
    tbody.innerHTML = "";
    profiles
      .filter(p => canViewAll(s.role) ? true : p.inGroup)
      .forEach(p => {
        const coord = getStaffById(p.programCoordinatorId);
        const coordinatorName = coord ? coord.name : "Unassigned";

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><a class="link" href="profile.html?id=${encodeURIComponent(p.id)}">${p.name}</a></td>
          <td>${p.group}</td>
          <td><span class="badge ${p.risk === "High" ? "orange" : p.risk === "Med" ? "" : "blue"}">${p.risk}</span></td>
          <td>${p.updated}</td>
        `;
        // If later add a Coordinator column in the dashboard table, render here.
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

  // Emergency broadcast role gate (prez only)
  const broadcastBox = document.getElementById("broadcastBox");
  if (broadcastBox) {
    broadcastBox.style.display = (s.role === "president") ? "block" : "none";
  }

  document.getElementById("sendBroadcast")?.addEventListener("click", () => {
    const msg = (document.getElementById("broadcastMsg")?.value || "").trim();
    if (!msg) return alert("Please enter a message.");
    alert("Demo: would trigger automated emergency messaging.\n\n" + msg);
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

  document.getElementById("saveEmergency")?.addEventListener("click", () => {
    if (!canEdit) return alert("You don’t have permission to edit this profile’s emergency info.");
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
