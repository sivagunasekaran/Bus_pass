console.log("apply_pass.js LOADED - PORT 5001 VERSION");

document.addEventListener("DOMContentLoaded", () => {

  const passType     = document.getElementById("passType");
  const passDuration = document.getElementById("passDuration");
  const calculateBtn = document.getElementById("calculateFareBtn");
  const finalFareBox = document.getElementById("finalFare");
  const applyForm    = document.getElementById("applyForm");
  const submitBtn    = document.getElementById("submitBtn");

  let fareCalculated = false;
  let totalFareValue = null;

  function applyDiscount(baseFare, type) {
    if (type === "elder") return Math.round(baseFare * 0.7);
    if (type === "student") return Math.round(baseFare * 0.8);
    return baseFare;
  }

  // ==============================
  // CALCULATE FARE
  // ==============================
  calculateBtn.addEventListener("click", () => {

    if (!window.routeSelected || window.baseFare === null) {
      alert("Please select route first");
      return;
    }

    if (!passType.value || !passDuration.value) {
      alert("Select pass type and duration");
      return;
    }

    const discountedFare = applyDiscount(window.baseFare, passType.value);
    const months = parseInt(passDuration.value, 10);
    totalFareValue = discountedFare * months;

    finalFareBox.innerText =
      `Total Fare (${months} Month${months > 1 ? "s" : ""}): ₹${totalFareValue}`;

    fareCalculated = true;
  });

  // ==============================
  // RESET WHEN ROUTE CHANGES
  // ==============================
  window.onRouteCalculated = function () {
    fareCalculated = false;
    totalFareValue = null;
    finalFareBox.innerText = "";
  };

  // ==============================
  // SUBMIT APPLICATION (🔥 FIXED)
  submitBtn.addEventListener("click", async () => {

  if (!fareCalculated) {
    alert("Please calculate fare before submitting");
    return;
  }

  // 🔐 JWT
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  if (!token || token.split(".").length !== 3) {
    alert("Invalid session. Please login again.");
    localStorage.clear();
    window.location.href = "login.html";
    return;
  }

  // ✅ BUILD FORMDATA (THIS WAS MISSING)
  const formData = new FormData();

  // Route info (from map.js)
  const routeInfoText = document.getElementById("route-info").innerText;

  // File input (ID proof)
  const fileInput = document.querySelector('input[type="file"]');

  formData.append("route", routeInfoText);
  formData.append("fare", totalFareValue);

  if (fileInput && fileInput.files.length > 0) {
    formData.append("id_proof", fileInput.files[0]);
  }

  try {
    const res = await fetch("http://127.0.0.1:5001/api/pass/apply", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
        // ❌ DO NOT set Content-Type
      },
      body: formData
    });

    if (res.status === 401 || res.status === 422) {
      alert("Session expired. Please login again.");
      localStorage.clear();
      window.location.href = "login.html";
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.message || data.msg || "Submission failed");
      return;
    }

    alert(data.message || "Pass applied successfully");

  } catch (err) {
    console.error("Network / server error:", err);
    alert("Unable to reach server. Make sure Flask is running on port 5001.");
  }
});

  });
;
