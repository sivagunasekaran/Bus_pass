console.log("apply_pass.js LOADED - PORT 5001 VERSION");

document.addEventListener("DOMContentLoaded", () => {

  // ==============================
  // ELEMENT REFERENCES
  // ==============================
  const passType     = document.getElementById("passType");
  const passDuration = document.getElementById("passDuration"); // 🔥 FIX
  const calculateBtn = document.getElementById("calculateFareBtn");
  const finalFareBox = document.getElementById("finalFare");
  const submitBtn    = document.getElementById("submitBtn");

  let fareCalculated = false;
  let totalFareValue = 0;

  // ==============================
  // DISCOUNT LOGIC
  // ==============================
  function applyDiscount(baseFare, type) {
    if (type === "elder") return Math.round(baseFare * 0.7);
    if (type === "student") return Math.round(baseFare * 0.8);
    return baseFare;
  }

  // ==============================
  // CALCULATE FARE
  // ==============================
  calculateBtn.addEventListener("click", () => {

    if (!window.routeSelected || !window.selectedRoute || window.baseFare == null) {
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
  // SUBMIT APPLICATION
  // ==============================
  submitBtn.addEventListener("click", async () => {

    if (!fareCalculated) {
      alert("Please calculate fare before submitting");
      return;
    }

    if (!window.selectedRoute) {
      alert("Route not selected properly");
      return;
    }

    const applicantNameInput = document.getElementById("name");
    if (!applicantNameInput) {
      alert("Applicant name field not found");
      return;
    }

    const applicantName = applicantNameInput.value.trim();
    if (!applicantName) {
      alert("Please enter applicant name");
      return;
    }

    // ==============================
    // JWT TOKEN CHECK
    // ==============================
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token");

    if (!token || token.split(".").length !== 3) {
      alert("Invalid session. Please login again.");
      localStorage.clear();
      window.location.href = "login.html";
      return;
    }

    // ==============================
    // BUILD FORM DATA
    // ==============================
    const formData = new FormData();

    formData.append("applicant_name", applicantName);
    formData.append(
      "route",
      `${window.selectedRoute.start} → ${window.selectedRoute.end}`
    );
    formData.append("distance", window.selectedRoute.distanceKm);
    formData.append("fare", totalFareValue);

    // 🔥 CRITICAL FIX — SEND PASS DURATION
    formData.append("pass_duration", passDuration.value);

    // Optional ID proof
    const fileInput = document.getElementById("idProof");
    if (fileInput && fileInput.files.length > 0) {
      formData.append("id_proof", fileInput.files[0]);
    }

    // ==============================
    // SEND TO BACKEND
    // ==============================
    try {
      const res = await fetch("http://127.0.0.1:5001/api/pass/apply", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || data.msg || "Submission failed");
        return;
      }

      alert(data.message || "✅ Pass applied successfully");

    } catch (err) {
      console.error("Network / server error:", err);
      alert("Unable to reach server. Make sure Flask is running on port 5001.");
    }
  });

});
