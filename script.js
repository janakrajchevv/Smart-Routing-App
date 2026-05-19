const API_KEY = "1a79a06f0f8848f7a877fcd9c8286df7";

let map;
let routeLayer = null;
let fromMarker = null;
let toMarker = null;

window.addEventListener("load", function () {
  initMap();
});

function initMap() {
  map = L.map("map").setView([41.9981, 21.4254], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);
}

function showMapLoader() {
  document.getElementById("map-loader-overlay").classList.remove("hidden-loader");
  document.getElementById("map").classList.add("map-blur");
}

function hideMapLoader() {
  document.getElementById("map-loader-overlay").classList.add("hidden-loader");
  document.getElementById("map").classList.remove("map-blur");
}

async function getCoordinates(place) {
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(place)}&apiKey=${API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error(`Location not found: ${place}`);
  }

  const coords = data.features[0].geometry.coordinates;

  return {
    lon: coords[0],
    lat: coords[1],
    name: data.features[0].properties.formatted
  };
}

async function getRoute(fromCoords, toCoords) {
  const url = `https://api.geoapify.com/v1/routing?waypoints=${fromCoords.lat},${fromCoords.lon}|${toCoords.lat},${toCoords.lon}&mode=drive&apiKey=${API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error("Route not found.");
  }

  return data;
}

function drawRoute(routeData, fromCoords, toCoords) {
  if (routeLayer) map.removeLayer(routeLayer);
  if (fromMarker) map.removeLayer(fromMarker);
  if (toMarker) map.removeLayer(toMarker);

  routeLayer = L.geoJSON(routeData, {
    style: {
      color: "#002d63",
      weight: 6,
      opacity: 0.9
    }
  }).addTo(map);

  fromMarker = L.marker([fromCoords.lat, fromCoords.lon])
    .addTo(map)
    .bindPopup("From: " + fromCoords.name);

  toMarker = L.marker([toCoords.lat, toCoords.lon])
    .addTo(map)
    .bindPopup("To: " + toCoords.name);

  map.fitBounds(routeLayer.getBounds(), {
    padding: [30, 30]
  });
}

function formatDistance(meters) {
  return (meters / 1000).toFixed(1) + " km";
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} min`;
}

function calculateTicketPrice(distanceMeters) {
  const distanceKm = distanceMeters / 1000;
  return Math.round(distanceKm * 8 + 80);
}

async function searchTrip() {
  const fromValue = document.getElementById("from-input").value.trim();
  const toValue = document.getElementById("to-input").value.trim();
  const resultsArea = document.getElementById("results-area");

  if (!fromValue || !toValue) {
    resultsArea.innerHTML = `
      <p style="color:#b11706; font-weight:bold;">
        Please enter both From and To locations.
      </p>
    `;
    return;
  }

  if (API_KEY === "YOUR_GEOAPIFY_API_KEY_HERE") {
    resultsArea.innerHTML = `
      <p style="color:#b11706; font-weight:bold;">
        Please add your Geoapify API key in script.js.
      </p>
    `;
    return;
  }

  resultsArea.innerHTML = "";
  showMapLoader();

  try {
    const fromCoords = await getCoordinates(fromValue);
    const toCoords = await getCoordinates(toValue);

    const routeData = await getRoute(fromCoords, toCoords);

    hideMapLoader();
    drawRoute(routeData, fromCoords, toCoords);

    const routeInfo = routeData.features[0].properties;
    const distance = routeInfo.distance;
    const time = routeInfo.time;
    const price = calculateTicketPrice(distance);

    resultsArea.innerHTML = `
      <h3 style="color:#002d63; margin-bottom:10px;">Bus Trip Found</h3>

      <p><strong>From:</strong> ${fromCoords.name}</p>
      <p><strong>To:</strong> ${toCoords.name}</p>
      <p><strong>Distance:</strong> ${formatDistance(distance)}</p>
      <p><strong>Estimated time:</strong> ${formatTime(time)}</p>
      <p><strong>Ticket price:</strong> ${price} MKD</p>

      <button class="buy-btn">Buy Ticket</button>
    `;

  } catch (error) {
    hideMapLoader();

    resultsArea.innerHTML = `
      <p style="color:#b11706; font-weight:bold;">
        ${error.message}
      </p>
    `;
  }
}
