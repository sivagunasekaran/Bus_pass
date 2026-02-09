// ==============================
// STATUS PAGE LOGIC
// ==============================

// 1. Get JWT token
const token = localStorage.getItem("token");

if (!token) {
  alert("Session expired. Please login again.");
  window.location.href = "login.html";
}

// DOM elements
const statusText = document.getElementById("renewalStatus");
const payBtn = document.getElementById("payBtn");

// ==============================
// 2. Fetch Renewal Status
// ==============================
fetch("http://127.0.0.1:5001/api/renewal/my-renewal", {
  headers: {
    "Authorization": "Bearer " + token
  }
})
.then(res => res.json())
.then(data => {
  console.log("Renewal data:", data);

  if (!data || !data.status) {
    statusText.innerText = "No renewal found";
    return;
  }

  // Show status
  statusText.innerText = "Renewal Status: " + data.status;

  // 🔴 Store renewal_id for payment
  localStorage.setItem("renewal_id", data.id);

  // Show Pay button ONLY if approved
  if (data.status === "APPROVED") {
    payBtn.style.display = "block";
  }
})
.catch(err => {
  console.error(err);
  alert("Failed to load renewal status");
});

// ==============================
// 3. Pay Button Click
// ==============================
payBtn.onclick = async function () {

  const renewalId = localStorage.getItem("renewal_id");

  if (!renewalId) {
    alert("Renewal ID missing");
    return;
  }

  // Create Razorpay order
  const res = await fetch(
    "http://127.0.0.1:5001/api/payment/renewal/create-order",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        renewal_id: renewalId
      })
    }
  );

  const order = await res.json();
  console.log("Order:", order);

  if (!res.ok) {
    alert(order.message || "Failed to create payment order");
    return;
  }

  // Razorpay configuration
  const options = {
    key: "rzp_test_xxxxx",   // 🔴 Replace with your Razorpay Key
    amount: order.amount,
    currency: "INR",
    order_id: order.id,
    handler: function (response) {

      // Verify payment in backend
      fetch("http://127.0.0.1:5001/api/payment/renewal/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(response)
      })
      .then(res => res.json())
      .then(data => {
        alert("Payment successful");
        location.reload();
      })
      .catch(err => {
        console.error(err);
        alert("Payment verification failed");
      });
    }
  };

  // Open Razorpay popup
  const rzp = new Razorpay(options);
  rzp.open();
};
