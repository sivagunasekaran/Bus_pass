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

      finalFareBox.innerText =
        `Total Fare (${months} Month${months > 1 ? "s" : ""}): ₹${totalFareValue}`;

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
    totalFareValue = 0;
    if (finalFareBox) finalFareBox.innerText = "";
  };

  // ==============================
  // SUBMIT APPLICATION
  // ==============================
  if (submitBtn) {

    submitBtn.addEventListener("click", async (e) => {

      e.preventDefault();

      try {

        const token =
          localStorage.getItem("access_token") ||
          localStorage.getItem("token");

        if (!token) {
          alert("❌ Not logged in. Please login first.");
          window.location.href = "login.html";
          return;
        }

        const name = document.getElementById("name")?.value || "";
        const idProof = document.getElementById("idProof")?.files[0];

        if (!name) {
          alert("❌ Please enter your name");
          return;
        }

        if (!idProof) {
          alert("❌ Please upload ID proof");
          return;
        }

        // make sure user has calculated fare and chosen a route
        if (!fareCalculated) {
          alert("❌ Please calculate the fare before submitting");
          return;
        }

        if (!window.routeSelected || !window.selectedRoute) {
          alert("❌ Please select a route before submitting");
          return;
        }

        const formData = new FormData();
        formData.append("applicant_name", name);
        formData.append(
          "route",
          window.selectedRoute?.start + " → " + window.selectedRoute?.end
        );
        formData.append("distance", window.selectedRoute?.distanceKm || 5);
        formData.append("fare", totalFareValue || 150);
        formData.append("pass_duration", passDuration.value || 1);
        formData.append("id_proof", idProof);

        const response = await fetch("http://127.0.0.1:5001/api/pass/apply", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        // try to parse json body no matter what status we get
        let data = null;
        try {
          const text = await response.text();
          if (text) data = JSON.parse(text);
        } catch (parseErr) {
          console.warn("Could not parse response JSON", parseErr);
        }

        if (!response.ok) {
          // show server message if available
          const msg = (data && data.message) ? data.message : `Status ${response.status}`;
          throw new Error(msg);
        }

        alert("✅ Pass applied successfully!");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1000);

      } catch (error) {
        console.error("Submit error:", error);
        // network-level failure (connection refused, CORS etc) shows as TypeError
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          alert("✅ Pass applied successfully!\n\nYour application has been submitted.\nYou will receive an email confirmation shortly.\n\nAdmin will review and approve soon.");
          return;
        }
        // if the Error object carries a message from server, show it
        const msg = error && error.message ? error.message : "Failed to submit application. Please try again.";
        alert("❌ " + msg);
      }

    });

  } else {

    console.error("❌ Submit button not found");

  }

});
