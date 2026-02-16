document.addEventListener("DOMContentLoaded", () => {

  // ==============================
  // ELEMENT REFERENCES
  // ==============================
  const passType = document.getElementById("passType");
  const passDuration = document.getElementById("passDuration");
  const calculateBtn = document.getElementById("calculateFareBtn");
  const finalFareBox = document.getElementById("finalFare");
  const submitBtn = document.getElementById("submitBtn");

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
  // CALCULATE FARE BUTTON
  // ==============================
  if (calculateBtn) {
    calculateBtn.addEventListener("click", () => {

      if (!window.routeSelected || !window.selectedRoute || window.baseFare == null) {
        alert("❌ Please select route first");
        return;
      }

      if (!passType.value || !passDuration.value) {
        alert("❌ Select pass type and duration");
        return;
      }

      const discountedFare = applyDiscount(window.baseFare, passType.value);
      const months = parseInt(passDuration.value, 10);
      totalFareValue = discountedFare * months;

      finalFareBox.innerText = `Total Fare (${months} Month${months > 1 ? "s" : ""}): ₹${totalFareValue}`;
      fareCalculated = true;
    });
  } else {
    console.error("❌ Calculate button not found");
  }

  // ==============================
  // RESET WHEN ROUTE CHANGES
  // ==============================
  window.onRouteCalculated = function () {
    fareCalculated = false;
    totalFareValue = null;
    if (finalFareBox) finalFareBox.innerText = "";
  };

  // ==============================
  // SUBMIT APPLICATION
  // ==============================
  if (submitBtn) {
    submitBtn.addEventListener("click", async (e) => {
      
      // Show alert immediately
      alert("Application is submitted! You will receive an email once it's processed.");

      try {
        const token = localStorage.getItem("access_token") || localStorage.getItem("token");
        
        if (!token) {
          alert("❌ Not logged in. Please login first.");
          window.location.href = "login.html";
          return;
        }

        // Get form values
        const name = document.getElementById("name")?.value || "";
        const idProof = document.getElementById("idProof")?.files[0];

        if (!name) {
          alert("❌ Please enter your name");
          return;
        }

        if (!idProof) {
          alert("❌ Please select ID proof file");
          return;
        }

        // Build FormData
        const formData = new FormData();
        formData.append("applicant_name", name);
        formData.append("route", window.selectedRoute?.start + " → " + window.selectedRoute?.end || "Test Route");
        formData.append("distance", window.selectedRoute?.distanceKm || 5);
        formData.append("fare", totalFareValue || 150);
        formData.append("pass_duration", passDuration.value || 1);
        formData.append("id_proof", idProof);

        const res = await fetch("http://127.0.0.1:5001/api/pass/apply", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData
        });

        const data = await res.json();

        if (res.ok) {
          alert("✅ Pass applied successfully!\n\nEmail will be sent to you.");
          setTimeout(() => {
            window.location.href = "index.html";
          }, 1000);
        } else {
          alert("❌ Error: " + (data.message || "Failed"));
        }

      } catch (err) {
        console.error("Error:", err);
        alert("❌ Error: " + err.message);
      }
    });
  } else {
    console.error("❌ Submit button not found");
  }
});
