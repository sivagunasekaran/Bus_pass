/*************************
 * ADMIN DASHBOARD SCRIPT
 *************************/

// ================= CONFIG =================
const API_BASE = "http://127.0.0.1:5001";

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getAuthHeaders() {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  if (!token) {
    alert("Session expired. Please login again.");
    window.location.href = "login.html";
    throw new Error("Missing token");
  }

  return {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json"
  };
}

// ================= AUTH CHECK =================
const role = localStorage.getItem("role");
if (role !== "ADMIN") {
  alert("Unauthorized access");
  window.location.href = "login.html";
}

// ================= GLOBAL DOM =================
let passTableBody;
let renewTableBody;
let newPassDiv;
let renewPassDiv;

// ================= DOM READY =================
document.addEventListener("DOMContentLoaded", () => {
  passTableBody = document.getElementById("passTableBody");
  renewTableBody = document.getElementById("renewTableBody");
  newPassDiv = document.getElementById("newPass");
  renewPassDiv = document.getElementById("renewPass");

  if (!passTableBody || !renewTableBody) {
    return;
  }

  showTab("newPass");
});

// ================= TAB SWITCH =================
window.showTab = function (tabId) {
  newPassDiv.style.display = tabId === "newPass" ? "block" : "none";
  renewPassDiv.style.display = tabId === "renewPass" ? "block" : "none";

  if (tabId === "newPass") loadNewPasses();
  if (tabId === "renewPass") loadRenewPasses();
};

// =================================================
// ================= NEW PASSES =====================
// =================================================

async function loadNewPasses() {
  passTableBody.innerHTML =
    `<tr><td colspan="7">Loading...</td></tr>`;

  try {
    const res = await fetch(
      `${API_BASE}/api/admin/passes/pending`,
      { headers: getAuthHeaders() }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to load passes");
    }

    renderNewPassTable(data);

  } catch (err) {
    console.error(err);
    passTableBody.innerHTML =
      `<tr><td colspan="7">Server error</td></tr>`;
  }
}

function renderNewPassTable(passes) {
  passTableBody.innerHTML = "";

  if (!passes || passes.length === 0) {
    passTableBody.innerHTML =
      `<tr><td colspan="7">No new applications</td></tr>`;
    return;
  }

  passes.forEach(p => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHTML(p.applicant_name)}</td>
      <td>${escapeHTML(p.route)}</td>
      <td>${p.distance_km} km</td>
      <td>₹${p.fare}</td>
      <td>
        ${
          p.id_proof
            ? `<a href="${API_BASE}/uploads/id_proofs/${p.id_proof}" target="_blank">View</a>`
            : "—"
        }
      </td>
      <td>${p.status}</td>
      <td></td>
    `;

    const actionTd = tr.lastElementChild;

    const approveBtn = document.createElement("button");
    approveBtn.textContent = "Approve";
    approveBtn.onclick = () => updateNewPass(p.id, "approve");

    const rejectBtn = document.createElement("button");
    rejectBtn.textContent = "Reject";
    rejectBtn.onclick = () => updateNewPass(p.id, "reject");

    actionTd.appendChild(approveBtn);
    actionTd.appendChild(rejectBtn);

    passTableBody.appendChild(tr);
  });
}

async function updateNewPass(id, action) {
  if (!confirm(`Are you sure you want to ${action}?`)) return;

  try {
    const res = await fetch(
      `${API_BASE}/api/admin/pass/${id}/${action}`,
      {
        method: "PUT",
        headers: getAuthHeaders()
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Action failed");
    }

    alert(data.message);
    loadNewPasses();

  } catch (err) {
    alert(err.message || "Server error");
  }
}

// =================================================
// ================= RENEW PASSES ==================
// =================================================

async function loadRenewPasses() {
  renewTableBody.innerHTML =
    `<tr><td colspan="7">Loading...</td></tr>`;
  try {
    const res = await fetch(
      `${API_BASE}/api/admin/renewals?_=${Date.now()}`,
      {
        method: "GET",
        headers: getAuthHeaders()
      }
    );

    const text = await res.text();

    if (!res.ok) {
      throw new Error("Backend returned error");
    }

    const data = JSON.parse(text);
    renderRenewTable(data);

  } catch (err) {
    renewTableBody.innerHTML =
      `<tr><td colspan="7">Server error</td></tr>`;
  }
}
function renderRenewTable(renewals) {
  renewTableBody.innerHTML = "";

  if (!renewals || renewals.length === 0) {
    renewTableBody.innerHTML =
      `<tr><td colspan="7">No renewal requests</td></tr>`;
    return;
  }

  renewals.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHTML(r.user_name)}</td>
      <td>${escapeHTML(r.old_route)}</td>
      <td>${escapeHTML(r.requested_route)}</td>
      <td>${r.route_changed ? "YES" : "NO"}</td>
      <td>₹${r.fare}</td>
      <td>${r.status}</td>
      <td></td>
    `;

    const actionTd = tr.lastElementChild;

    const approveBtn = document.createElement("button");
    approveBtn.textContent = "Approve";
    approveBtn.onclick = () => updateRenewal(r.id, "approve");

    const rejectBtn = document.createElement("button");
    rejectBtn.textContent = "Reject";
    rejectBtn.onclick = () => updateRenewal(r.id, "reject");

    actionTd.appendChild(approveBtn);
    actionTd.appendChild(rejectBtn);

    renewTableBody.appendChild(tr);
  });
}

async function updateRenewal(renewalId, action) {
  if (!confirm(`Are you sure you want to ${action}?`)) return;

  try {
    const res = await fetch(
      `${API_BASE}/api/admin/renewals/${renewalId}/${action}`,
      {
        method: "POST",
        headers: getAuthHeaders()
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Action failed");
    }

    alert(data.message);
    loadRenewPasses();

  } catch (err) {
    alert(err.message || "Server error");
  }
}
