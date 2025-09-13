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
  })
  .catch(error => console.error('Error loading GeoJSON:', error));

// ----- Enhanced Geolocation / "Find me" button -----
// Location permission constants
const LOCATION_PERMISSION_KEY = 'location_permission_granted';
const LOCATION_PERMISSION_DENIED_KEY = 'location_permission_denied';

// We'll keep track of the last location marker so we can remove it
let locateMarker = null;

// Check if user has previously granted permission
function hasLocationPermission() {
  return localStorage.getItem(LOCATION_PERMISSION_KEY) === 'true';
}

// Check if user has previously denied permission
function hasLocationPermissionDenied() {
  return localStorage.getItem(LOCATION_PERMISSION_DENIED_KEY) === 'true';
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

// Update location button status based on permissions
function updateLocationButtonStatus() {
  const locateBtn = document.getElementById('locate-btn');
  if (!locateBtn) return;
  
  const hasPermission = hasLocationPermission();
  const wasDenied = hasLocationPermissionDenied();
  
  if (hasPermission) {
    locateBtn.title = 'Find my location';
  } else if (wasDenied) {
    locateBtn.title = 'Location permission required - click to enable';
  } else {
    locateBtn.title = 'Find my location (permission will be requested)';
  }
}

// Enhanced locate button handler
const locateBtn = document.getElementById('locate-btn');
if (locateBtn) {
  let privacyAccepted = hasLocationPermission(); // Check stored preference
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

  function showPopup(isDeniedMessage = false) {
    // Update popup content based on context
    const popupText = popup.querySelector('.locate-privacy-text');
    const primaryBtn = popup.querySelector('.locate-popup-btn.primary');
    const secondaryBtn = popup.querySelector('.locate-popup-btn.secondary');
    
    if (isDeniedMessage) {
      popupText.textContent = 'Location access was denied. Enable it via the location icon in your browser bar or in site settings.';
      primaryBtn.textContent = 'Got it';
      primaryBtn.onclick = hidePopup;
      secondaryBtn.style.display = 'none';
    } else {
      popupText.textContent = 'Your location is only used temporarily and never stored.';
      primaryBtn.textContent = 'I understand';
      primaryBtn.onclick = handlePrivacyAccept;
      secondaryBtn.textContent = 'Cancel';
      secondaryBtn.onclick = hidePopup;
      secondaryBtn.style.display = 'block';
    }
    
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

  function handlePrivacyAccept() {
    privacyAccepted = true;
    localStorage.setItem(LOCATION_PERMISSION_KEY, 'true');
    // Remove any previous denial flag
    localStorage.removeItem(LOCATION_PERMISSION_DENIED_KEY);
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
    
    // If user previously denied and we haven't reset, show info message
    if (hasLocationPermissionDenied()) {
      showPopup(true); // Show "permission denied" message
      return;
    }
    
    // If user already accepted, start locating immediately
    if (privacyAccepted) {
      startLocate();
      return;
    }
    
    // Otherwise show privacy popup
    showPopup(false);
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
      localStorage.setItem(LOCATION_PERMISSION_DENIED_KEY, 'true');
      localStorage.removeItem(LOCATION_PERMISSION_KEY);
      updateLocationButtonStatus();
      console.log('Location permission denied by user');
      errorMessage = 'Location access denied. Please enable it in your browser settings to use this feature.';
      break;

    case 2: // POSITION_UNAVAILABLE
      console.log('Location information unavailable');
      errorMessage = 'Could not determine your location. Check your network or GPS and try again.';
      break;

    case 3: // TIMEOUT
      console.log('Location request timed out');
      errorMessage = 'Getting your location took too long. Please try again.';
      break;

    default:
      console.log('Unknown location error:', err);
      errorMessage = 'Could not get your location: ' + err.message;
      break;
  }

  // update popup UI
  const popup = document.querySelector('.locate-privacy-popup');
  const popupText = popup.querySelector('.locate-privacy-text');
  const primaryBtn = popup.querySelector('.locate-popup-btn.primary');
  const secondaryBtn = popup.querySelector('.locate-popup-btn.secondary');

  popupText.textContent = errorMessage;
  primaryBtn.textContent = 'OK';
  primaryBtn.onclick = () => popup.style.display = 'none';
  secondaryBtn.style.display = 'none';

  const rect = locateBtn.getBoundingClientRect();
  popup.style.left = 'auto';
  popup.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
  popup.style.top = rect.bottom + window.scrollY + 8 + 'px';
  popup.style.display = 'block';

  if (locateBtn) {
    locateBtn.textContent = 'Find me';
    locateBtn.disabled = false;
  }
});

// Optional: Add a way to reset permissions (for testing or user preference)
// You can call this function from the browser console: resetLocationPermissions()
function resetLocationPermissions() {
  localStorage.removeItem(LOCATION_PERMISSION_KEY);
  localStorage.removeItem(LOCATION_PERMISSION_DENIED_KEY);
  updateLocationButtonStatus();
  console.log('Location permissions reset');
}

// Clear any location data on page unload (extra security)
window.addEventListener('beforeunload', function() {
  // Clear any temporary location variables
  if (typeof locateMarker !== 'undefined' && locateMarker) {
    // Location marker will be cleared automatically, but you could add extra cleanup here
  }
});