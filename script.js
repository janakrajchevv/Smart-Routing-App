const API_KEY = "1a79a06f0f8848f7a877fcd9c8286df7";
const DEFAULT_CENTER = [41.6086, 21.7453];
const DEFAULT_ZOOM = 8;

let map;
let routeLayer = null;
let fromMarker = null;
let toMarker = null;

const routeForm = document.getElementById("route-form");
const searchButton = document.getElementById("search-button");
const resultsArea = document.getElementById("results-area");
const fromInput = document.getElementById("from-input");
const toInput = document.getElementById("to-input");
const dateInput = document.getElementById("date-input");

window.addEventListener("DOMContentLoaded", () => {
    initMap();
    setMinimumDate();
    routeForm.addEventListener("submit", searchTrip);
});

function initMap() {
    map = L.map("map", {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map);
}

function setMinimumDate() {
    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;
    dateInput.value = today;
}

function showMapLoader() {
    document.getElementById("map-loader-overlay").classList.remove("hidden-loader");
    document.getElementById("map").classList.add("map-blur");
    searchButton.disabled = true;
    searchButton.textContent = "Searching...";
}

function hideMapLoader() {
    document.getElementById("map-loader-overlay").classList.add("hidden-loader");
    document.getElementById("map").classList.remove("map-blur");
    searchButton.disabled = false;
    searchButton.textContent = "Search Buses";
}

function showError(message) {
    resultsArea.innerHTML = `<p class="error-message">${message}</p>`;
}

async function getCoordinates(place) {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(place)}&limit=1&apiKey=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Could not connect to the location service.");
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
        throw new Error(`Location not found: ${place}`);
    }

    const result = data.features[0];
    const [lon, lat] = result.geometry.coordinates;

    return {
        lon,
        lat,
        name: result.properties.formatted || place
    };
}

async function getRoute(fromCoords, toCoords) {
    const waypoints = `${fromCoords.lat},${fromCoords.lon}|${toCoords.lat},${toCoords.lon}`;
    const url = `https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive&apiKey=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Could not calculate this route.");
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
        throw new Error("Route not found.");
    }

    return data;
}

function clearMap() {
    [routeLayer, fromMarker, toMarker].forEach((layer) => {
        if (layer) map.removeLayer(layer);
    });

    routeLayer = null;
    fromMarker = null;
    toMarker = null;
}

function drawRoute(routeData, fromCoords, toCoords) {
    clearMap();

    routeLayer = L.geoJSON(routeData, {
        style: {
            color: "#002d63",
            weight: 6,
            opacity: 0.9
        }
    }).addTo(map);

    fromMarker = L.marker([fromCoords.lat, fromCoords.lon])
        .addTo(map)
        .bindPopup(`<strong>From:</strong><br>${fromCoords.name}`);

    toMarker = L.marker([toCoords.lat, toCoords.lon])
        .addTo(map)
        .bindPopup(`<strong>To:</strong><br>${toCoords.name}`);

    map.fitBounds(routeLayer.getBounds(), { padding: [35, 35] });
}

function formatDistance(meters) {
    return `${(meters / 1000).toFixed(1)} km`;
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes} min`;
}

function calculateTicketPrice(distanceMeters) {
    const distanceKm = distanceMeters / 1000;
    return Math.round(distanceKm * 8 + 80);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function searchTrip(event) {
    event.preventDefault();

    const fromValue = fromInput.value.trim();
    const toValue = toInput.value.trim();

    if (!fromValue || !toValue) {
        showError("Please enter both From and To locations.");
        return;
    }

    if (fromValue.toLowerCase() === toValue.toLowerCase()) {
        showError("From and To locations must be different.");
        return;
    }

    resultsArea.innerHTML = "<h2>Searching...</h2><p>Please wait while we find your route.</p>";
    showMapLoader();

    try {
        const [fromCoords, toCoords] = await Promise.all([
            getCoordinates(fromValue),
            getCoordinates(toValue)
        ]);

        const routeData = await getRoute(fromCoords, toCoords);
        drawRoute(routeData, fromCoords, toCoords);

        const routeInfo = routeData.features[0].properties;
        const distance = routeInfo.distance;
        const time = routeInfo.time;
        const price = calculateTicketPrice(distance);
        const travelDate = dateInput.value || "Not selected";

        resultsArea.innerHTML = `
            <h3>Bus Trip Found</h3>
            <p><strong>From:</strong> ${escapeHtml(fromCoords.name)}</p>
            <p><strong>To:</strong> ${escapeHtml(toCoords.name)}</p>
            <p><strong>Date:</strong> ${escapeHtml(travelDate)}</p>
            <p><strong>Distance:</strong> ${formatDistance(distance)}</p>
            <p><strong>Estimated time:</strong> ${formatTime(time)}</p>
            <p><strong>Ticket price:</strong> ${price} MKD</p>
            <button class="buy-btn" type="button">Buy Ticket</button>
        `;
    } catch (error) {
        showError(error.message || "Something went wrong. Please try again.");
    } finally {
        hideMapLoader();
    }
}
