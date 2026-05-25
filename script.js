const API_KEY = "1a79a06f0f8848f7a877fcd9c8286df7";

let map;
let routeLayer = null;
let fromMarker = null;
let toMarker = null;

const modalContent = {
  about: {
    title: "ABOUT US",
    text: "Bus Station is a new innovative platform created to help passengers from all around the world plan their trips more easily. You can search your route, see the expected travel time, and quickly estimate the cost of your bus ticket before you travel."
  },
  schedules: {
    title: "SCHEDULES",
    text: "Select where your trip begins, choose your final destination, and add your travel date. The system will show you the path you will take, the estimated duration of the trip, and useful ticket information."
  },
  tickets: {
    title: "TICKETS",
    text: "Please purchase your ticket before your trip to make your journey easier and more comfortable."
  },
  services: {
    title: "SERVICES",
    text: "We offer route searching, ticket price estimation, real-time travel mapping, customer support, mobile access, and simplified travel planning."
  },
  contact: {
    title: "CONTACT US",
    text: "Email: support@busstation.com\nPhone: +389 70 123 456\nAvailable 24/7 for customer support."
  }
};

window.onload = function () {
  initMap();
};

function initMap() {
  map = L.map("map").setView([41.9981, 21.4254], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);
}

function toggleMenu() {
  document.getElementById("navLinks").classList.toggle("show");
}

function closeMenu() {
  document.getElementById("navLinks").classList.remove("show");
}

function openInfoCard(type) {
  const modal = document.getElementById("infoModal");
  const title = document.getElementById("modalTitle");
  const text = document.getElementById("modalText");

  title.textContent = modalContent[type].title;
  text.innerText = modalContent[type].text;

  modal.classList.add("show");
  closeMenu();
}

function closeInfoCard() {
  document.getElementById("infoModal").classList.remove("show");
}

function buyTicket() {
  document.getElementById("purchaseModal").classList.add("show");

  setTimeout(() => {
    location.reload();
  }, 3000);
}

function closePurchaseModal() {
  document.getElementById("purchaseModal").classList.remove("show");
  location.reload();
}

document.addEventListener("click", function (event) {
  const infoModal = document.getElementById("infoModal");
  const purchaseModal = document.getElementById("purchaseModal");

  if (event.target === infoModal) {
    closeInfoCard();
  }

  if (event.target === purchaseModal) {
    closePurchaseModal();
  }
});

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
  const dateValue = document.getElementById("date-input").value;
  const resultsArea = document.getElementById("results-area");

  if (!fromValue || !toValue) {
    resultsArea.innerHTML = `
      <p style="color:#b11706; font-weight:bold;">
        Please enter both From and To locations.
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
      <p><strong>Date:</strong> ${dateValue || "Not selected"}</p>
      <p><strong>Distance:</strong> ${formatDistance(distance)}</p>
      <p><strong>Estimated time:</strong> ${formatTime(time)}</p>
      <p><strong>Ticket price:</strong> ${price} MKD</p>
      <button class="buy-btn" onclick="buyTicket()">Buy Ticket</button>
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
