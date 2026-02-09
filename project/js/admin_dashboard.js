/*************************
 * ADMIN DASHBOARD SCRIPT
 *************************/

console.log("✅ ADMIN DASHBOARD JS LOADED");

// ================= AUTH CHECK =================
const token =
  localStorage.getItem("token") ||
  localStorage.getItem("access_token");

const role = localStorage.getItem("role");

if (!token || role !== "ADMIN") {
  alert("Unauthorized access. Please login as admin.");
  window.location.href = "login.html";
}

// ================= ELEMENTS =================
const passTable = document.getElementById("passTable");
const renewTable = document.getElementById("renewTable");
const newPassDiv = document.getElementById("newPass");
const renewPassDiv = document.getElementById("renewPass");

// ================= TAB SWITCH (GLOBAL) =================
window.showTab = function (tabId) {
  console.log("🔁 Switching tab:", tabId);

  if (newPassDiv)
    newPassDiv.style.display = tabId === "newPass" ? "block" : "none";

  if (renewPassDiv)
    renewPassDiv.style.display = tabId === "renewPass" ? "block" : "none";

  if (tabId === "newPass") loadNewPasses();
  if (tabId === "renewPass") loadRenewPasses();
};

// ================= LOAD NEW PASSES =================
async function loadNewPasses() {
  console.log("📥 Loading new applied passes");

  passTable.innerHTML =
    `<tr><td colspan="5">Loading...</td></tr>`;

  try {
    const res = await fetch(
      "http://127.0.0.1:5001/api/admin/passes/pending",
      {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        }
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ API Error:", res.status, text);
      passTable.innerHTML =
        `<tr><td colspan="5">Failed to load data</td></tr>`;
      return;
    }

    const data = await res.json();
    renderPassTable(data);

  } catch (err) {
    console.error("❌ Fetch error:", err);
    passTable.innerHTML =
      `<tr><td colspan="5">Server not reachable</td></tr>`;
  }
}

// ================= RENDER NEW PASSES =================
function renderPassTable(passes) {
  passTable.innerHTML = "";

  if (!passes || passes.length === 0) {
    passTable.innerHTML =
      `<tr><td colspan="5">No new applications</td></tr>`;
    return;
  }

  passes.forEach(p => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>User #${p.user_id}</td>
      <td>${p.route}</td>
      <td>
        <a href="http://127.0.0.1:5001/uploads/id_proofs/${p.id_proof}"
           target="_blank">View</a>
      </td>
      <td>${p.status}</td>
      <td>
        <button onclick="approvePass(${p.id})">Approve</button>
        <button onclick="rejectPass(${p.id})">Reject</button>
      </td>
    `;

    passTable.appendChild(tr);
  });
}

// ================= APPROVE / REJECT PASS =================
async function approvePass(id) {
  await updateStatus(
    `http://127.0.0.1:5001/api/admin/pass/${id}/approve`,
    loadNewPasses
  );
}

async function rejectPass(id) {
  await updateStatus(
    `http://127.0.0.1:5001/api/admin/pass/${id}/reject`,
    loadNewPasses
  );
}

// ================= LOAD RENEW PASSES =================
async function loadRenewPasses() {
  console.log("📥 Loading renew passes");

  renewTable.innerHTML =
    `<tr><td colspan="4">Loading...</td></tr>`;

  try {
    const res = await fetch(
      "http://127.0.0.1:5001/api/admin/renewals",
      {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        }
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Renew API Error:", res.status, text);
      renewTable.innerHTML =
        `<tr><td colspan="4">Failed to load renewals</td></tr>`;
      return;
    }

    const data = await res.json();
    renderRenewTable(data);

  } catch (err) {
    console.error("❌ Renew fetch error:", err);
    renewTable.innerHTML =
      `<tr><td colspan="4">Server error</td></tr>`;
  }
}

// ================= RENDER RENEW PASSES =================
function renderRenewTable(renewals) {
  renewTable.innerHTML = "";

  if (!renewals || renewals.length === 0) {
    renewTable.innerHTML =
      `<tr><td colspan="4">No renewal requests</td></tr>`;
    return;
  }

  renewals.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>User #${r.user_id}</td>
      <td>₹${r.renewal_fare}</td>
      <td>${r.status}</td>
      <td>
        <button onclick="approveRenew(${r.id})">Approve</button>
        <button onclick="rejectRenew(${r.id})">Reject</button>
      </td>
    `;

    renewTable.appendChild(tr);
  });
}

// ================= APPROVE / REJECT RENEW =================
async function approveRenew(id) {
  await updateStatus(
    `http://127.0.0.1:5001/api/admin/renewal/${id}/approve`,
    loadRenewPasses
  );
}

async function rejectRenew(id) {
  await updateStatus(
    `http://127.0.0.1:5001/api/admin/renewal/${id}/reject`,
    loadRenewPasses
  );
}

// ================= COMMON UPDATE HANDLER =================
async function updateStatus(url, reloadFn) {
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      console.error("❌ Update failed:", await res.text());
      return;
    }

    reloadFn();
  } catch (err) {
    console.error("❌ Update error:", err);
  }
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Admin dashboard initialized");
  showTab("newPass"); // default tab
});
