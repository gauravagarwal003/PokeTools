// Code runs immediately since script is injected after DOM is ready
// ----- Map Initialization -----
// Edit these constants to change initial behavior:
const DEFAULT_CENTER = [37.8, -96];
const DEFAULT_ZOOM = 4;            // change this value to set the initial zoom
const LOCATE_MAX_ZOOM = 12;       // how far to zoom when user location is found

// Create the map using the constants above.
const map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

// Add OpenStreetMap tiles.
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Define a custom icon for the markers.
const customIcon = L.icon({
  iconUrl: 'assets/pokeball.png',  // Replace with your image path
  iconSize: [20, 20],              // Adjust based on your image dimensions
  iconAnchor: [10, 10],            // The point of the icon corresponding to the marker's location
  popupAnchor: [0, -10]            // The point from which the popup should open relative to the iconAnchor
});

// Load GeoJSON data and add markers to the map.
fetch('assets/all_states.geojson')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, { icon: customIcon })
          .bindPopup(
            `<div style="text-align: center; margin-bottom: 2px;">${feature.properties.Retailer}</div> ${feature.properties.Address}`
          );
      }
    }).addTo(map);

    // Show total vending machine locations
    const count = data.features.length;
    const countDiv = document.getElementById('location-count-number');
    if (countDiv) {
      countDiv.textContent = `${count}`;
    }
  })
  .catch(error => console.error('Error loading GeoJSON:', error));

// ----- Enhanced Geolocation / "Find me" button -----
// Location confirmation flag
const LOCATION_CONFIRMATION_KEY = 'location_confirmation_approved';

// We'll keep track of the last location marker so we can remove it
let locateMarker = null;


// Check if user has previously approved confirmation
function hasLocationConfirmation() {
  return localStorage.getItem(LOCATION_CONFIRMATION_KEY) === 'true';
}

// Optional: Check browser permission status (if supported)
async function checkBrowserLocationPermission() {
  if ('permissions' in navigator) {
    try {
      const permission = await navigator.permissions.query({name: 'geolocation'});
      return permission.state; // 'granted', 'denied', or 'prompt'
    } catch (err) {
      console.log('Permission API not supported');
      return 'unknown';
    }
  }
  return 'unknown';
}

// Update location button status based on confirmation
function updateLocationButtonStatus() {
  const locateBtn = document.getElementById('locate-btn');
  if (!locateBtn) return;
  if (hasLocationConfirmation()) {
    locateBtn.title = 'Find my location';
  } else {
    locateBtn.title = 'Find my location (confirmation required)';
  }
}

// Enhanced locate button handler
const locateBtn = document.getElementById('locate-btn');
if (locateBtn) {
  const popup = document.querySelector('.locate-privacy-popup');

  // Initialize button status
  updateLocationButtonStatus();

  function positionPopup() {
    const rect = locateBtn.getBoundingClientRect();
    popup.style.left = 'auto';
    const rightDistance = Math.max(8, window.innerWidth - rect.right);
    popup.style.right = rightDistance + 'px';
    popup.style.top = rect.bottom + window.scrollY + 8 + 'px';
  }

  function showPopup() {
    // Update popup content
    const popupText = popup.querySelector('.locate-privacy-text');
    const primaryBtn = popup.querySelector('.locate-popup-btn.primary');
    const secondaryBtn = popup.querySelector('.locate-popup-btn.secondary');
    popupText.textContent = 'Your location is only used temporarily and never stored.';
    primaryBtn.textContent = 'I understand';
    primaryBtn.onclick = handleConfirmationAccept;
    secondaryBtn.textContent = 'Cancel';
    secondaryBtn.onclick = hidePopup;
    secondaryBtn.style.display = 'block';
    positionPopup();
    popup.style.display = 'block';
    setTimeout(() => {
      window.addEventListener('click', outsideClick);
      window.addEventListener('keydown', escClose);
      window.addEventListener('resize', positionPopup);
      window.addEventListener('scroll', positionPopup, { passive: true });
    }, 0);
  }

  function showErrorPopup(errorMessage) {
    const popupText = popup.querySelector('.locate-privacy-text');
    const primaryBtn = popup.querySelector('.locate-popup-btn.primary');
    const secondaryBtn = popup.querySelector('.locate-popup-btn.secondary');
    popupText.textContent = errorMessage;
    primaryBtn.textContent = 'OK';
    primaryBtn.onclick = hidePopup;
    secondaryBtn.style.display = 'none';
    positionPopup();
    popup.style.display = 'block';
    setTimeout(() => {
      window.addEventListener('click', outsideClick);
      window.addEventListener('keydown', escClose);
      window.addEventListener('resize', positionPopup);
      window.addEventListener('scroll', positionPopup, { passive: true });
    }, 0);
  }

  function hidePopup() {
    popup.style.display = 'none';
    window.removeEventListener('click', outsideClick);
    window.removeEventListener('keydown', escClose);
    window.removeEventListener('resize', positionPopup);
    window.removeEventListener('scroll', positionPopup, { passive: true });
  }

  function outsideClick(e) {
    if (!popup.contains(e.target) && e.target !== locateBtn) {
      hidePopup();
    }
  }

  function escClose(e) {
    if (e.key === 'Escape') hidePopup();
  }

  function handleConfirmationAccept() {
    localStorage.setItem(LOCATION_CONFIRMATION_KEY, 'true');
    updateLocationButtonStatus();
    hidePopup();
    startLocate();
  }

  function startLocate() {
    if (locateBtn) {
      map.locate({ setView: false, maxZoom: LOCATE_MAX_ZOOM, watch: false });
      locateBtn.textContent = 'Locating...';
      locateBtn.disabled = true;
    }
  }

  // Main click handler
  locateBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // If popup is already open, close it
    if (popup.style.display === 'block') {
      hidePopup();
      return;
    }
    // If user already approved confirmation, start locating immediately
    if (hasLocationConfirmation()) {
      startLocate();
      return;
    }
    // Otherwise show confirmation popup
    showPopup();
  });
}

// Enhanced location event handlers
map.on('locationfound', function (e) {
  // Remove previous marker
  if (locateMarker) map.removeLayer(locateMarker);

  // Add a single pinpoint marker (no accuracy circle)
  locateMarker = L.marker(e.latlng, { title: 'You are here' }).addTo(map);

  // Center the map on the marker and cap the zoom so we don't zoom in too far.
  map.setView(e.latlng, LOCATE_MAX_ZOOM);

  if (locateBtn) {
    locateBtn.textContent = 'Find me';
    locateBtn.disabled = false;
  }
});

map.on('locationerror', function (err) {
  console.warn('Location error:', err);

  let errorMessage;

  switch (err.code) {
    case 1: // PERMISSION_DENIED
      errorMessage = 'Location access denied. Please enable it in your browser settings to use this feature.';
      break;
    case 2: // POSITION_UNAVAILABLE
      errorMessage = 'Could not determine your location. Check your network or GPS and try again.';
      break;
    case 3: // TIMEOUT
      errorMessage = 'Getting your location took too long. Please try again.';
      break;
    default:
      errorMessage = 'Could not get your location: ' + err.message;
      break;
  }

  // Show error popup
  if (typeof showErrorPopup === 'function') {
    showErrorPopup(errorMessage);
  }

  if (locateBtn) {
    locateBtn.textContent = 'Find me';
    locateBtn.disabled = false;
  }
});

// Optional: Add a way to reset confirmation (for testing or user preference)
// You can call this function from the browser console: resetLocationConfirmation()
function resetLocationConfirmation() {
  localStorage.removeItem(LOCATION_CONFIRMATION_KEY);
  updateLocationButtonStatus();
  console.log('Location confirmation reset');
}

// Clear any location data on page unload (extra security)
window.addEventListener('beforeunload', function() {
  // Clear any temporary location variables
  if (typeof locateMarker !== 'undefined' && locateMarker) {
    // Location marker will be cleared automatically, but you could add extra cleanup here
  }
});