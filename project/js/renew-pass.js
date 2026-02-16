// ================= GLOBAL STATE =================
let map = null;
let startMarker = null;
let endMarker = null;
let routeLine = null;
let startLatLng = null;
let endLatLng = null;

let OLD_BASE_FARE = 0;
let NEW_BASE_FARE = 0;
let ROUTE_CHANGED = false;
let CALCULATED_FARE = 0;
let BUS_PASS_ID = null;

let REQUESTED_ROUTE = null;
let REQUESTED_DISTANCE = null;

// ================= CONSTANTS =================
const chennaiCenter = [13.0827, 80.2707];
const chennaiBounds = [[12.9, 80.1], [13.3, 80.4]];

// ================= DOM READY =================
document.addEventListener("DOMContentLoaded", () => {

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  if (!token) {
    alert("Please login again");
    window.location.href = "login.html";
    return;
  }

  fetch("http://127.0.0.1:5001/api/renewal/eligible", {
    headers: { Authorization: "Bearer " + token }
  })
    .then(res => {
      if (!res.ok) throw new Error("No approved pass");
      return res.json();
    })
    .then(data => {
      document.getElementById("userName").innerText = data.user_name;
      document.getElementById("currentRoute").innerText = data.route;
      document.getElementById("expiryDate").innerText = data.valid_to;

      OLD_BASE_FARE = Number(data.base_fare);
      BUS_PASS_ID = data.bus_pass_id;

      setupRenewPass();
    })
    .catch(() => {
      alert("No approved pass found for renewal");
    });
});

// ================= SETUP =================
function setupRenewPass() {

  const changeRoute = document.getElementById("changeRoute");
  const routeSection = document.getElementById("routeSection");
  const drawRouteBtn = document.getElementById("drawRouteBtn");
  const startInput = document.getElementById("startInput");
  const endInput = document.getElementById("endInput");
  const routeInfo = document.getElementById("route-info");
  const fareInfo = document.getElementById("fare-info");
  const duration = document.getElementById("duration");
  const renewFare = document.getElementById("renewFare");
  const renewForm = document.getElementById("renewForm");
  const calculateBtn = document.getElementById("calculateRenewal");
  const resetBtn = document.getElementById("resetRoute");

  // initial state
  routeSection.style.display = "none";
  resetBtn.style.display = "none";

  // ---- TOGGLE CHANGE ROUTE ----
  changeRoute.addEventListener("change", () => {
    ROUTE_CHANGED = changeRoute.checked;

    routeSection.style.display = ROUTE_CHANGED ? "block" : "none";
    resetBtn.style.display = ROUTE_CHANGED ? "inline-block" : "none";

    if (ROUTE_CHANGED) {
      initMapIfNeeded();
      setTimeout(() => map.invalidateSize(), 200);
    } else {
      resetRoute();
    }
  });

  // ---- DRAW NEW ROUTE ----
  drawRouteBtn.addEventListener("click", async () => {

    if (!ROUTE_CHANGED) return;

    const sText = startInput.value.trim();
    const eText = endInput.value.trim();

    if (!sText || !eText) {
      alert("Enter both start and end locations");
      return;
    }

    clearMap();

    const s = await getLatLngFromText(sText);
    const e = await getLatLngFromText(eText);

    if (!s || !e) {
      alert("Invalid locations");
      return;
    }

    startLatLng = s;
    endLatLng = e;

    startMarker = L.marker(s).addTo(map).bindPopup("Start").openPopup();
    endMarker = L.marker(e).addTo(map).bindPopup("End").openPopup();

    await drawRoute(s, e);

    const dist = calculateDistance(s.lat, s.lng, e.lat, e.lng);
    NEW_BASE_FARE = calculateFare(dist);

    REQUESTED_ROUTE = `${sText} → ${eText}`;
    REQUESTED_DISTANCE = dist.toFixed(2);

    routeInfo.innerText = `Distance: ${REQUESTED_DISTANCE} km`;
    fareInfo.innerText = `New Base Fare: ₹${NEW_BASE_FARE}`;
  });

  // ---- CALCULATE RENEWAL ----
  calculateBtn.addEventListener("click", () => {

    const months = Number(duration.value);
    if (!months) {
      alert("Select duration");
      return;
    }

    const baseFare = ROUTE_CHANGED ? NEW_BASE_FARE : OLD_BASE_FARE;

    if (ROUTE_CHANGED && baseFare === 0) {
      alert("Please select a new route first");
      return;
    }

    CALCULATED_FARE = baseFare * months;
    renewFare.innerText = `Renewal Fare: ₹${CALCULATED_FARE}`;
  });

  // ---- RESET ROUTE ----
  resetBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetRoute();
  });

  // ---- SUBMIT RENEWAL ----// ---- SUBMIT RENEWAL ----

renewForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!CALCULATED_FARE) {
    alert("Please calculate renewal fare first");
    return;
  }

  const months = Number(duration.value);
  if (![1, 3].includes(months)) {
    alert("Invalid duration selected");
    return;
  }

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  const payload = {
    bus_pass_id: BUS_PASS_ID,
    duration_months: months,            // ✅ 🔥 FIX
    renewal_fare: CALCULATED_FARE,
    route_changed: ROUTE_CHANGED,
    requested_route: ROUTE_CHANGED ? REQUESTED_ROUTE : null,
    requested_distance_km: ROUTE_CHANGED ? REQUESTED_DISTANCE : null
  };

  console.log("📤 Sending payload:", payload);

  const res = await fetch("http://127.0.0.1:5001/api/renewal/apply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    alert("❌ Error: " + (data.message || "Renewal failed"));
    return;
  }

  alert("✅ Renewal Applied Successfully!\n\nYour renewal application has been submitted.\nYou will receive an email confirmation shortly.\n\nAdmin will review and approve soon.");
  
  // Redirect to status page after 2 seconds
 
});

}
// ================= MAP HELPERS =================
function initMapIfNeeded() {
  if (map) return;

  map = L.map("map", {
    center: chennaiCenter,
    zoom: 13,
    maxBounds: chennaiBounds,
    maxBoundsViscosity: 1.0
  });

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
  ).addTo(map);
}

function clearMap() {
  if (!map) return;
  if (startMarker) map.removeLayer(startMarker);
  if (endMarker) map.removeLayer(endMarker);
  if (routeLine) map.removeLayer(routeLine);
  startMarker = endMarker = routeLine = null;
}

function resetRoute() {
  clearMap();
  NEW_BASE_FARE = 0;
  REQUESTED_ROUTE = null;
  REQUESTED_DISTANCE = null;

  document.getElementById("startInput").value = "";
  document.getElementById("endInput").value = "";
  document.getElementById("route-info").innerText = "";
  document.getElementById("fare-info").innerText = "";
  document.getElementById("renewFare").innerText = "";
}

// ================= UTILS =================
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function calculateFare(distance) {
  if (distance <= 5) return 150;
  if (distance <= 10) return 300;
  if (distance <= 20) return 500;
  return 700;
}

async function getLatLngFromText(place) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${place}, Chennai&limit=1`
  );
  const data = await res.json();
  return data.length ? { lat: +data[0].lat, lng: +data[0].lon } : null;
}

async function drawRoute(start, end) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();
  const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
  routeLine = L.polyline(coords, { color: "red", weight: 5 }).addTo(map);
}
