// ================= GLOBAL STATE =================
let map = null;

let startMarker = null;
let endMarker = null;
let routeLine = null;

let startLatLng = null;
let endLatLng = null;

const EXISTING_BASE_FARE = 300;
let currentBaseFare = EXISTING_BASE_FARE;
let routeSelected = false;

// ================= CONSTANTS =================
const chennaiCenter = [13.0827, 80.2707];
const chennaiBounds = [[12.9, 80.1], [13.3, 80.4]];

// ================= DOM READY =================
document.addEventListener("DOMContentLoaded", setupRenewPass);

// ================= SETUP =================
function setupRenewPass() {

  // ---- Elements ----
  const changeRoute = document.getElementById("changeRoute");
  const routeSection = document.getElementById("routeSection");
  const drawRouteBtn = document.getElementById("drawRouteBtn");
  const startInput = document.getElementById("startInput");
  const endInput = document.getElementById("endInput");
  const routeInfo = document.getElementById("route-info");
  const fareInfo = document.getElementById("fare-info");
  const resetRenewal = document.getElementById("resetRenewal");
  const calculateRenewal = document.getElementById("calculateRenewal");
  const duration = document.getElementById("duration");
  const renewFare = document.getElementById("renewFare");
  const renewForm = document.getElementById("renewForm");

  // ---- Change Route ----
  changeRoute.addEventListener("change", () => {
    routeSection.style.display = changeRoute.checked ? "block" : "none";
    resetRenewal.style.display = changeRoute.checked ? "block" : "none";

    if (changeRoute.checked) {
      setTimeout(() => {
        initMapIfNeeded();
        map.invalidateSize();
        map.setView(chennaiCenter, 13);
      }, 200);
    } else {
      resetRoute();
    }
  });

  // ---- Show Route (Text Input) ----
  drawRouteBtn.addEventListener("click", async () => {
    initMapIfNeeded();

    const startText = startInput.value.trim();
    const endText = endInput.value.trim();

    if (!startText || !endText) {
      alert("Enter both start and end locations");
      return;
    }

    clearMapLayersOnly();

    const s = await getLatLngFromText(startText);
    const e = await getLatLngFromText(endText);

    if (!s || !e) {
      alert("Invalid Chennai locations");
      return;
    }

    startLatLng = s;
    endLatLng = e;

    startMarker = L.marker(s).addTo(map).bindPopup("Start").openPopup();
    endMarker = L.marker(e).addTo(map).bindPopup("End").openPopup();

    await drawRoute(s, e);

    const dist = calculateDistance(s.lat, s.lng, e.lat, e.lng);
    currentBaseFare = calculateFare(dist);
    routeSelected = true;

    routeInfo.innerText = `Distance: ${dist.toFixed(2)} km`;
    fareInfo.innerText = `Base Fare: ₹${currentBaseFare}`;
  });

  // ---- Renewal Calculation ----
  calculateRenewal.addEventListener("click", () => {

    if (!changeRoute.checked) {
      currentBaseFare = EXISTING_BASE_FARE;
      routeSelected = true;
    }

    if (changeRoute.checked && !routeSelected) {
      alert("Please select a route first");
      return;
    }

    const days = parseInt(duration.value, 10);
    const total = days === 90 ? currentBaseFare * 3 : currentBaseFare;

    renewFare.innerText = `Renewal Fare: ₹${total}`;
  });

  // ---- Reset ----
  resetRenewal.addEventListener("click", resetRoute);

  // ---- Submit ----
  renewForm.addEventListener("submit", (e) => {
    if (!renewFare.innerText) {
      e.preventDefault();
      alert("Calculate renewal fare before submitting");
    }
  });
}

// ================= MAP INIT =================
function initMapIfNeeded() {
  if (map) return;

  map = L.map("map", {
    center: chennaiCenter,
    zoom: 13,
    minZoom: 12,
    maxZoom: 18,
    maxBounds: chennaiBounds,
    maxBoundsViscosity: 1.0
  });

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    { attribution: "© OpenStreetMap © CARTO" }
  ).addTo(map);

  map.on("click", handleMapClick);
}

// ================= MAP CLICK =================
async function handleMapClick(e) {

  if (!startLatLng) {
    startLatLng = e.latlng;
    startMarker = L.marker(e.latlng).addTo(map).bindPopup("Start").openPopup();
    return;
  }

  if (!endLatLng) {
    endLatLng = e.latlng;
    endMarker = L.marker(e.latlng).addTo(map).bindPopup("End").openPopup();

    await drawRoute(startLatLng, endLatLng);

    const dist = calculateDistance(
      startLatLng.lat, startLatLng.lng,
      endLatLng.lat, endLatLng.lng
    );

    currentBaseFare = calculateFare(dist);
    routeSelected = true;
  }
}

// ================= HELPERS =================
function clearMapLayersOnly() {
  if (!map) return;

  if (startMarker) map.removeLayer(startMarker);
  if (endMarker) map.removeLayer(endMarker);
  if (routeLine) map.removeLayer(routeLine);

  startMarker = endMarker = routeLine = null;
  startLatLng = endLatLng = null;
  routeSelected = false;
}

function resetRoute() {
  clearMapLayersOnly();
  currentBaseFare = 0;

  document.getElementById("startInput").value = "";
  document.getElementById("endInput").value = "";
  document.getElementById("route-info").innerText = "";
  document.getElementById("fare-info").innerText = "";
  document.getElementById("renewFare").innerText = "";

  if (map) map.setView(chennaiCenter, 13);
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
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${place}, Chennai&limit=1`;
  const res = await fetch(url);
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
  map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
}
