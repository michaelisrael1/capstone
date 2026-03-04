/**
 * Minimal JS: demo auth, role simulation, search filtering
 * gotta replace these stubs with real authentication + Hubwise API calls later
 */

const demoUsers = {
  "president@madonna.local": { role: "president", name: "President User" },
  "staff@madonna.local":     { role: "staff",     name: "Staff User" },
  "guardian@madonna.local":  { role: "guardian",  name: "Guardian User" }
};

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

function canViewAll(role) {
  return role === "president";
}

function canEditEmergency(role, inGroup) {
  // staff can edit emergency contact info when they are in that group
  if (role === "president") return true;
  if (role === "staff" && inGroup) return true;
  if (role === "guardian" && inGroup) return true; // guardian edits for their client (group membership = their client)
  return false;
}

function initNavAuthUI() {
  const s = getSession();
  const el = document.querySelector("[data-auth]");
  if (!el) return;

  if (!s) {
    el.innerHTML = `<a class="btn primary" href="portal.html">Alliance Portal</a>`;
  } else {
    el.innerHTML = `
      <span class="badge blue">${s.role.toUpperCase()}</span>
      <button class="btn" id="logoutBtn">Log out</button>
    `;
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      clearSession();
      window.location.href = "index.html";
    });
  }
}

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

function initDashboard() {
  const s = requireAuth();

  const who = document.getElementById("whoami");
  if (who) who.textContent = `${s.name} • ${s.role}`;

  // Demo data (replace with Hubwise read)
  const profiles = [
    { id:"P-1001", name:"Alex R.",   group:"Adult Services",   inGroup:true,  risk:"High",  updated:"2026-02-10" },
    { id:"P-1002", name:"Jordan M.", group:"Special Education",inGroup:false, risk:"Med",   updated:"2026-01-28" },
    { id:"P-1003", name:"Sam K.",    group:"Athletics",       inGroup:true,  risk:"Low",   updated:"2026-02-01" },
  ];

  const tbody = document.getElementById("profilesBody");
  if (tbody) {
    tbody.innerHTML = "";
    profiles
      .filter(p => canViewAll(s.role) ? true : p.inGroup) // simple “only what you have access to”
      .forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><a class="link" href="profile.html?id=${encodeURIComponent(p.id)}">${p.name}</a></td>
          <td>${p.group}</td>
          <td><span class="badge ${p.risk === "High" ? "orange" : p.risk === "Med" ? "" : "blue"}">${p.risk}</span></td>
          <td>${p.updated}</td>
        `;
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

  // Emergency broadcast role gate (president only)
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

function initProfilePage() {
  const s = requireAuth();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "P-1001";

  const title = document.getElementById("profileTitle");
  if (title) title.textContent = `Profile ${id}`;

  // Demo access: assume staff/guardian only for some profiles
  const inGroup = (id !== "P-1002"); // pretend P-1002 is not in group
  const canEdit = canEditEmergency(s.role, inGroup);

  const editNotice = document.getElementById("editNotice");
  if (editNotice) {
    editNotice.innerHTML = canEdit
      ? `<span class="badge blue">You can edit emergency info</span>`
      : `<span class="badge">Read-only</span>`;
  }

  // Lock/unlock fields
  const fields = document.querySelectorAll("[data-emergency-field]");
  fields.forEach(f => {
    f.disabled = !canEdit;
  });

  document.getElementById("saveEmergency")?.addEventListener("click", () => {
    if (!canEdit) return alert("You don’t have permission to edit this profile’s emergency info.");
    alert("Demo: would SAVE to Hubwise (add/edit).");
  });
}

function handleYesNoOlympics(choice) {
	const yes = document.getElementById('yes-olympics');
	const no = document.getElementById('no-olympics');
	const extra = document.getElementById('sport-options')

	if(choice == 'yes') {
		no.checked = false;
		extra.style.display = yes.checked ? 'block' : 'none';
	} else {
		yes.checked = false;
		extra.style.display = 'none';
	}

}

document.addEventListener("DOMContentLoaded", () => {
  initNavAuthUI();
  initLoginForm();
  if (document.body.dataset.page === "dashboard") initDashboard();
  if (document.body.dataset.page === "profile") initProfilePage();
});
