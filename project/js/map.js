// ==============================
// GLOBAL STATE (USED BY apply_pass.js)
// ==============================
window.selectedRoute = null;
window.routeSelected = false;
window.baseFare = null;

// ==============================
// MAP VARIABLES
// ==============================
let map;
let routeLayerGroup;
let startMarker = null;
let endMarker = null;
let routeLine = null;
let startLatLng = null;
let endLatLng = null;

// DOM elements
let startInput, endInput, routeInfo, fareInfo, resetRoute, drawRouteBtn;

// Chennai bounds
const chennaiCenter = [13.0827, 80.2707];
const chennaiBounds = [[12.9, 80.1], [13.3, 80.4]];

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

    await finalizeRoute("Map Start", "Map End");
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

    clearRouteVisuals();

    const s = await getLatLngFromText(sText);
    const e = await getLatLngFromText(eText);

    if (!s || !e) {
      alert("Invalid Chennai location");
      return;
    }

    startLatLng = s;
    endLatLng = e;

    startMarker = L.marker(s).addTo(routeLayerGroup).bindPopup("Start");
    endMarker   = L.marker(e).addTo(routeLayerGroup).bindPopup("End");

    await finalizeRoute(sText, eText);
  });
}

// ==============================
// FINALIZE ROUTE (🔥 CORE LOGIC)
// ==============================
async function finalizeRoute(startName, endName) {
  await drawRoute(startLatLng, endLatLng);

  const rawDistance = calculateDistance(
    startLatLng.lat, startLatLng.lng,
    endLatLng.lat, endLatLng.lng
  );

  const distanceKm = Number(rawDistance.toFixed(2));
  const calculatedFare = calculateFare(distanceKm);

  // 🔥 SINGLE SOURCE OF TRUTH
  window.selectedRoute = {
    start: startName,
    end: endName,
    distanceKm: distanceKm
  };

  window.baseFare = calculatedFare;
  window.routeSelected = true;

  routeInfo.innerText = `Distance: ${distanceKm} km`;
  fareInfo.innerText = `Base Fare (1 Month): ₹${calculatedFare}`;

  console.log("✅ ROUTE STORED:", window.selectedRoute);

  if (typeof window.onRouteCalculated === "function") {
    window.onRouteCalculated();
  }
}

// ==============================
// DRAW ROUTE (OSRM)
// ==============================
async function drawRoute(start, end) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes || !data.routes.length) {
    alert("No route found");
    return;
  }

  const coords = data.routes[0].geometry.coordinates.map(
    ([lng, lat]) => [lat, lng]
  );

  routeLine = L.polyline(coords, { color: "red", weight: 5 })
    .addTo(routeLayerGroup);

  map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
}

// ==============================
// RESET ROUTE
// ==============================
function clearRouteVisuals() {
  routeLayerGroup.clearLayers();
  startMarker = null;
  endMarker = null;
  routeLine = null;
  startLatLng = null;
  endLatLng = null;
}

function clearRoute() {
  clearRouteVisuals();

  window.selectedRoute = null;
  window.routeSelected = false;
  window.baseFare = null;

  startInput.value = "";
  endInput.value = "";
  routeInfo.innerText = "";
  fareInfo.innerText = "";
  document.getElementById("finalFare").innerText = "";

  document.getElementById("passType").value = "";
  document.getElementById("passDuration").value = "";

  map.setView(chennaiCenter, 13);

  if (typeof window.onRouteCalculated === "function") {
    window.onRouteCalculated();
  }
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
    `https://nominatim.openstreetmap.org/search?format=json&q=` +
    `${encodeURIComponent(place + ", Chennai")}&limit=1`;

  const res = await fetch(url);
  const data = await res.json();

  return data.length
    ? { lat: +data[0].lat, lng: +data[0].lon }
    : null;
}
