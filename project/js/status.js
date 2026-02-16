let STATUS_DATA = null;   // 🔥 GLOBAL STORE

document.addEventListener("DOMContentLoaded", async () => {

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  if (!token) {
    alert("Login required");
    return;
  }

  const res = await fetch("http://127.0.0.1:5001/api/status", {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Unable to load status");
    return;
  }

  // 🔥 STORE GLOBALLY
  STATUS_DATA = data;

  // ===== UPDATE UI =====
  document.getElementById("name").innerText = data.applicant_name;
  document.getElementById("type").innerText = data.pass_type;
  document.getElementById("route").innerText = data.route;
  document.getElementById("expiry").innerText = data.expiry_date;
  document.getElementById("fare").innerText = "₹" + data.fare;
  document.getElementById("approval").innerText = data.approval_status;
  document.getElementById("passStatus").innerText = data.pass_status;

  const daysRow = document.getElementById("daysRow");
  const daysLeftSpan = document.getElementById("daysLeft");

  if (data.pass_status === "ACTIVE" && data.days_left > 0) {
    daysRow.style.display = "block";
    daysLeftSpan.innerText = data.days_left + " days";
  } else {
    daysRow.style.display = "none";
  }

  const payBtn = document.getElementById("payBtn");

  if (data.can_pay) {
    payBtn.style.display = "block";
    payBtn.onclick = handlePayment;   // 🔥 attach handler
  } else {
    payBtn.style.display = "none";
  }
});


// ================= PAYMENT HANDLER =================
async function handlePayment() {
  if (!STATUS_DATA) {
    alert("Status data not loaded");
    return;
  }

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  if (!token) {
    alert("Login required");
    return;
  }

  try {
    // ===============================
    // 1️⃣ CREATE RAZORPAY ORDER
    // ===============================
    const res = await fetch(
      "http://127.0.0.1:5001/api/payment/create-order",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({
          amount: STATUS_DATA.fare   // backend converts to paise
        })
      }
    );

    const order = await res.json();

    if (!res.ok) {
      alert(order.message || "Unable to create payment order");
      return;
    }

    // ===============================
    // 2️⃣ RAZORPAY OPTIONS
    // ===============================
    const options = {
      key: order.key,              // Razorpay Test Key
      amount: order.amount,        // in paise
      currency: "INR",
      name: "Bus Pass",
      description: "Bus Pass Payment",
      order_id: order.order_id,

      handler: async function (response) {
        console.log("Razorpay response:", response);

        try {
          // ===============================
          // 3️⃣ VERIFY PAYMENT
          // ===============================
          const verifyRes = await fetch(
            "http://127.0.0.1:5001/api/payment/verify",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            }
          );

          const verifyData = await verifyRes.json();

          if (!verifyRes.ok) {
            alert(verifyData.message || "Payment verification failed");
            return;
          }

          alert("✅ Payment successful");
          window.location.reload();

        } catch (err) {
          console.error("❌ Verification error:", err);
          alert("Server error during payment verification");
        }
      },

      theme: {
        color: "#3399cc"
      }
    };

    // ===============================
    // 4️⃣ OPEN RAZORPAY
    // ===============================
    const rzp = new Razorpay(options);
    rzp.open();

  } catch (err) {
    console.error("❌ Payment error:", err);
    alert("Payment failed");
  }
}
