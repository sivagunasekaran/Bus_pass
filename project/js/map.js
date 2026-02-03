// ==============================
// DOM ELEMENT REFERENCES
// ==============================
const startInput   = document.getElementById("startInput");
const endInput     = document.getElementById("endInput");
const routeInfo    = document.getElementById("route-info");
const fareInfo     = document.getElementById("fare-info");
const resetRoute   = document.getElementById("resetRoute");
const drawRouteBtn = document.getElementById("drawRouteBtn");

console.log("drawRouteBtn:", drawRouteBtn);

// ==============================
// GLOBAL STATE (MAP MODULE)
// ==============================
let map;
let startMarker = null;
let endMarker = null;
let routeLine = null;

let startLatLng = null;
let endLatLng = null;

window.baseFare = 0;
window.routeSelected = false;

// ==============================
// CHENNAI MAP SETUP
// ==============================
const chennaiCenter = [13.0827, 80.2707];
const chennaiBounds = [[12.9, 80.1], [13.3, 80.4]];

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  bindTextRoute();
  bindReset();
});

// ==============================
// MAP INIT
// ==============================
function initMap() {
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

// ==============================
// DISTANCE & FARE
// ==============================
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

// ==============================
// GEOCODING
// ==============================
async function getLatLngFromText(place) {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&q=${place}, Chennai&limit=1`;
  const res = await fetch(url);
  const data = await res.json();
  return data.length ? { lat: +data[0].lat, lng: +data[0].lon } : null;
}

// ==============================
// ROAD ROUTE
// ==============================
async function drawRoute(start, end) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();

  if (routeLine) map.removeLayer(routeLine);

  const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
  routeLine = L.polyline(coords, { color: "red", weight: 5 }).addTo(map);
  map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
}

// ==============================
// MAP CLICK ROUTE
// ==============================
async function handleMapClick(e) {
  if (!startLatLng) {
    startLatLng = e.latlng;
    startMarker = L.marker(e.latlng).addTo(map).bindPopup("Start").openPopup();
    return;
  }

  if (!endLatLng) {
    endLatLng = e.latlng;
    endMarker = L.marker(e.latlng).addTo(map).bindPopup("End").openPopup();
    await finalizeRoute();
  }
}

// ==============================
// TEXT ROUTE
// ==============================
function bindTextRoute() {
  drawRouteBtn.addEventListener("click", async () => {

    const sText = startInput.value.trim();
    const eText = endInput.value.trim();

    if (!sText || !eText) {
      alert("Enter both locations");
      return;
    }

    clearRoute();

    const s = await getLatLngFromText(sText);
    const e = await getLatLngFromText(eText);

    if (!s || !e) {
      alert("Invalid Chennai location");
      return;
    }

    startLatLng = s;
    endLatLng = e;

    startMarker = L.marker(s).addTo(map).bindPopup("Start").openPopup();
    endMarker = L.marker(e).addTo(map).bindPopup("End").openPopup();

    await finalizeRoute();
  });
}

// ==============================
// FINALIZE ROUTE
// ==============================
async function finalizeRoute() {
  await drawRoute(startLatLng, endLatLng);

  const distance = calculateDistance(
    startLatLng.lat, startLatLng.lng,
    endLatLng.lat, endLatLng.lng
  );

  window.baseFare = calculateFare(distance);
  window.routeSelected = true;

  routeInfo.innerText = `Distance: ${distance.toFixed(2)} km`;
  fareInfo.innerText = `Base Fare: ₹${window.baseFare}`;

  // 🔴 notify apply-pass.js
  if (window.onRouteCalculated) {
    window.onRouteCalculated();
  }
}

// ==============================
// RESET
// ==============================
function clearRoute() {
  if (startMarker) map.removeLayer(startMarker);
  if (endMarker) map.removeLayer(endMarker);
  if (routeLine) map.removeLayer(routeLine);

  startMarker = endMarker = routeLine = null;
  startLatLng = endLatLng = null;

  window.baseFare = 0;
  window.routeSelected = false;

  routeInfo.innerText = "";
  fareInfo.innerText = "";
}

function bindReset() {
  resetRoute.addEventListener("click", () => {
    clearRoute();
    map.setView(chennaiCenter, 13);
  });
}
