/*************************
 * ADMIN DASHBOARD SCRIPT
 *************************/

console.log("✅ ADMIN DASHBOARD JS LOADED");

// ================= AUTH CHECK =================
const token =
  localStorage.getItem("access_token") ||
  localStorage.getItem("token");

const role = localStorage.getItem("role");

if (!token || role !== "ADMIN") {
  alert("Unauthorized access. Please login as admin.");
  window.location.href = "login.html";
}

// ================= GLOBAL DOM REFERENCES =================
let passTableBody;
let renewTableBody;
let newPassDiv;
let renewPassDiv;

// ================= DOM READY =================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Admin dashboard initialized");

  passTableBody = document.getElementById("passTableBody");
  renewTableBody = document.getElementById("renewTableBody");
  newPassDiv = document.getElementById("newPass");
  renewPassDiv = document.getElementById("renewPass");

  if (!passTableBody || !renewTableBody) {
    console.error("❌ Required table elements not found in HTML");
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
      "http://127.0.0.1:5001/api/admin/passes/pending",
      { headers: { Authorization: "Bearer " + token } }
    );

    const data = await res.json();

    if (!res.ok) {
      passTableBody.innerHTML =
        `<tr><td colspan="7">${data.message || "Failed to load"}</td></tr>`;
      return;
    }

    renderNewPassTable(data);
  } catch (err) {
    console.error("❌ New pass fetch error:", err);
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
    passTableBody.innerHTML += `
      <tr>
        <td>${p.applicant_name}</td>
        <td>${p.route}</td>
        <td>${p.distance_km} km</td>
        <td>₹${p.fare}</td>
        <td>
          ${
            p.id_proof
              ? `<a href="http://127.0.0.1:5001/uploads/id_proofs/${p.id_proof}" target="_blank">View</a>`
              : "—"
          }
        </td>
        <td>${p.status}</td>
        <td>
          <button onclick="updateNewPass(${p.id}, 'approve')">Approve</button>
          <button onclick="updateNewPass(${p.id}, 'reject')">Reject</button>
        </td>
      </tr>
    `;
  });
}

window.updateNewPass = async function (id, action) {
  if (!confirm(`Are you sure you want to ${action}?`)) return;

  try {
    const res = await fetch(
      `http://127.0.0.1:5001/api/admin/pass/${id}/${action}`,
      {
        method: "PUT",
        headers: { Authorization: "Bearer " + token }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Action failed");
      return;
    }

    alert(data.message);
    loadNewPasses();

  } catch (err) {
    console.error("❌ Update new pass error:", err);
    alert("Server error");
  }
};

// =================================================
// ================= RENEW PASSES ==================
// =================================================

async function loadRenewPasses() {
  renewTableBody.innerHTML =
    `<tr><td colspan="7">Loading...</td></tr>`;

  try {
    const res = await fetch(
      "http://127.0.0.1:5001/api/admin/renewals",
      { headers: { Authorization: "Bearer " + token } }
    );

    const data = await res.json();

    if (!res.ok) {
      renewTableBody.innerHTML =
        `<tr><td colspan="7">${data.message || "Failed to load"}</td></tr>`;
      return;
    }

    renderRenewTable(data);
  } catch (err) {
    console.error("❌ Renewal fetch error:", err);
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
    renewTableBody.innerHTML += `
      <tr>
        <td>${r.user_name}</td>
        <td>${r.old_route}</td>
        <td>${r.requested_route}</td>
        <td>${r.route_changed ? "YES" : "NO"}</td>
        <td>₹${r.fare}</td>
        <td>${r.status}</td>
        <td>
          ${
            r.status === "PENDING"
              ? `
                <button onclick="updateRenewal(${r.id}, 'approve')">Approve</button>
                <button onclick="updateRenewal(${r.id}, 'reject')">Reject</button>
              `
              : "-"
          }
        </td>
      </tr>
    `;
  });
}

async function updateRenewal(renewalId, action) {
  console.log("🔥 Updating renewal:", renewalId, action);

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  if (!token) {
    alert("Admin token missing");
    return;
  }

  const url = `http://127.0.0.1:5001/api/admin/renewals/${renewalId}/${action}`;
  

  console.log("➡️ Calling:", url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const data = await res.json();
    console.log("⬅️ Response:", res.status, data);

    if (!res.ok) {
      alert(data.message || "Action failed");
      return;
    }

    alert(data.message);
    loadRenewPasses(); 

  } catch (err) {
    console.error("❌ UI fetch error:", err);
    alert("Network / JS error");
  }
}

