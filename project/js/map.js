// ==============================
// GLOBAL VARIABLES
// ==============================
let map;
let routeLayerGroup;

let startMarker = null;
let endMarker = null;
let routeLine = null;

let startLatLng = null;
let endLatLng = null;

let startInput, endInput, routeInfo, fareInfo, resetRoute, drawRouteBtn;

// Chennai setup
const chennaiCenter = [13.0827, 80.2707];
const chennaiBounds = [[12.9, 80.1], [13.3, 80.4]];

window.baseFare = 0;
window.routeSelected = false;

// ==============================
// DOM READY
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  startInput   = document.getElementById("startInput");
  endInput     = document.getElementById("endInput");
  routeInfo    = document.getElementById("route-info");
  fareInfo     = document.getElementById("fare-info");
  resetRoute   = document.getElementById("resetRoute");
  drawRouteBtn = document.getElementById("drawRouteBtn");

  initMap();
  bindTextRoute();
  bindReset();
});

// ==============================
// MAP INITIALIZATION
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

  // All route-related layers go here
  routeLayerGroup = L.layerGroup().addTo(map);

  map.on("click", handleMapClick);
}

// ==============================
// MAP CLICK HANDLER
// ==============================
async function handleMapClick(e) {
  if (!startLatLng) {
    startLatLng = e.latlng;
    startMarker = L.marker(e.latlng)
      .addTo(routeLayerGroup)
      .bindPopup("Start")
      .openPopup();
    return;
  }

  if (!endLatLng) {
    endLatLng = e.latlng;
    endMarker = L.marker(e.latlng)
      .addTo(routeLayerGroup)
      .bindPopup("End")
      .openPopup();
    await finalizeRoute();
  }
}

// ==============================
// TEXT ROUTE BUTTON
// ==============================
function bindTextRoute() {
  drawRouteBtn.addEventListener("click", async () => {

    const sText = startInput.value.trim();
    const eText = endInput.value.trim();

    if (!sText || !eText) {
      alert("Enter both locations");
      return;
    }

    // ❌ DO NOT clear here

    const s = await getLatLngFromText(sText);
    const e = await getLatLngFromText(eText);

    if (!s || !e) {
      alert("Invalid Chennai location");
      return;
    }

    // If a route already exists, clear it ONCE
    if (window.routeSelected) {
      clearRoute();
    }

    startLatLng = s;
    endLatLng = e;

    startMarker = L.marker(s)
      .addTo(routeLayerGroup)
      .bindPopup("Start")
      .openPopup();

    endMarker = L.marker(e)
      .addTo(routeLayerGroup)
      .bindPopup("End")
      .openPopup();

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
}

// ==============================
// DRAW ROAD ROUTE (OSRM)
// ==============================
async function drawRoute(start, end) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes || data.routes.length === 0) {
    alert("No road route found between selected points");
    return;
  }

  const coords = data.routes[0].geometry.coordinates.map(
    ([lng, lat]) => [lat, lng]
  );

  routeLine = L.polyline(coords, {
    color: "red",
    weight: 5
  }).addTo(routeLayerGroup);

  map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
}


// ==============================
// RESET ROUTE (FIXED)
// ==============================
function clearRoute() {
  // Clear all map layers (start, end, route)
  routeLayerGroup.clearLayers();

  // Reset state
  startMarker = null;
  endMarker = null;
  routeLine = null;
  startLatLng = null;
  endLatLng = null;

  window.baseFare = 0;
  window.routeSelected = false;

  // ✅ CLEAR TEXT INPUTS (THIS WAS MISSING)
  startInput.value = "";
  endInput.value = "";

  // Clear UI text
  routeInfo.innerText = "";
  fareInfo.innerText = "";
  document.getElementById("finalFare").innerText = "";

  // Reset dropdowns
  document.getElementById("passType").value = "";
  document.getElementById("passDuration").value = "";

  // Reset map view
  map.setView(chennaiCenter, 13);
}

// ==============================
// RESET BUTTON
// ==============================
function bindReset() {
  resetRoute.addEventListener("click", clearRoute);
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
// GEOCODING (NOMINATIM)
// ==============================
async function getLatLngFromText(place) {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&q=${place}, Chennai&limit=1`;
  const res = await fetch(url);
  const data = await res.json();

  return data.length
    ? { lat: +data[0].lat, lng: +data[0].lon }
    : null;
}
