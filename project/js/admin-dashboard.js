const renewals = [
  {
    id: 1,
    user: "Siva",
    currentRoute: "Tambaram → Guindy",
    newRoute: "Tambaram → Adyar",
    duration: "1 Month",
    fare: 300,
    status: "Pending"
  },
  {
    id: 2,
    user: "Arun",
    currentRoute: "Avadi → CMBT",
    newRoute: "Same",
    duration: "3 Months",
    fare: 900,
    status: "Pending"
  }
];

const table = document.getElementById("renewalTable");

function renderTable() {
  table.innerHTML = "";

  renewals.forEach(req => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${req.user}</td>
      <td>${req.currentRoute}</td>
      <td>${req.newRoute}</td>
      <td>${req.duration}</td>
      <td>₹${req.fare}</td>
      <td class="status-${req.status.toLowerCase()}">${req.status}</td>
      <td>
        ${req.status === "Pending" ? `
          <button class="approve-btn" onclick="approve(${req.id})">Approve</button>
          <button class="reject-btn" onclick="reject(${req.id})">Reject</button>
        ` : "-"}
      </td>
    `;

    table.appendChild(row);
  });
}

function approve(id) {
  const req = renewals.find(r => r.id === id);
  req.status = "Approved";
  renderTable();
}

function reject(id) {
  const req = renewals.find(r => r.id === id);
  req.status = "Rejected";
  renderTable();
}

renderTable();
