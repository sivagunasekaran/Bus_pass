document.getElementById("payBtn").addEventListener("click", function () {

  const amount = totalFare * 100; // Razorpay works in paise

  const options = {
    key: "rzp_test_SDgVduIj3WHinJ",   // 🔴 YOUR TEST KEY ID
    amount: amount,
    currency: "INR",
    name: "E-Bus Pass System",
    description: "Bus Pass Payment",
    image: "assets/bus.png",     // optional
    handler: function (response) {

      // PAYMENT SUCCESS
      document.getElementById("paymentStatus").innerText =
        "Payment Successful. Payment ID: " + response.razorpay_payment_id;

      // Store status for admin
      localStorage.setItem("paymentStatus", "PAID");
    },
    prefill: {
      name: "User Name",
      email: "user@example.com",
      contact: "9999999999"
    },
    theme: {
      color: "#1976d2"
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
});
