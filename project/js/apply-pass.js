// ==============================
// DOM REFERENCES
// ==============================
const passType        = document.getElementById("passType");
const passDuration    = document.getElementById("passDuration");
const calculateBtn    = document.getElementById("calculateFareBtn");
const finalFareBox    = document.getElementById("finalFare");
const applyForm       = document.getElementById("applyForm");

// ==============================
// STATE
// ==============================
let fareCalculated = false;

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
calculateBtn.addEventListener("click", () => {

  // 1️⃣ Route check
  if (!window.routeSelected || !window.baseFare) {
    alert("Please select route first");
    return;
  }

  // 2️⃣ Pass type check
  if (!passType.value) {
    alert("Please select pass type");
    return;
  }

  // 3️⃣ Duration check
  if (!passDuration.value) {
    alert("Please select pass duration");
    return;
  }

  // 4️⃣ Discount
  const discountedFare = applyDiscount(window.baseFare, passType.value);

  // 5️⃣ Duration multiplier
  const months = parseInt(passDuration.value, 10);
  const totalFare = discountedFare * months;

  // 6️⃣ Display
  finalFareBox.innerText =
    `Total Fare (${months} Month${months === 3 ? "s" : ""}): ₹${totalFare}`;

  fareCalculated = true;
});

// ==============================
// RESET WHEN ROUTE CHANGES
// ==============================
window.onRouteCalculated = function () {
  fareCalculated = false;
  document.getElementById("finalFare").innerText = "";
};


// ==============================
// FORM SUBMIT VALIDATION
// ==============================
applyForm.addEventListener("submit", e => {

  if (!window.routeSelected) {
    e.preventDefault();
    alert("Please select route");
    return;
  }

  if (!fareCalculated) {
    e.preventDefault();
    alert("Please calculate fare before submitting");
    return;
  }
});
