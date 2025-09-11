document.addEventListener("DOMContentLoaded", function () {
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

  // ----- Geolocation / "Find me" button -----
  // We'll keep track of the last location marker so we can remove it
  let locateMarker = null;

  const locateBtn = document.getElementById('locate-btn');
  if (locateBtn) {
    // Create a small privacy popup element (runtime only — not stored)
    let privacyAccepted = false; // runtime flag only

    const popup = document.createElement('div');
    popup.className = 'locate-privacy-popup';
    popup.style.display = 'none';
    popup.innerHTML = `
      <div class="locate-privacy-text">Your location is only used temporarily and never stored.</div>
      <button type="button" class="locate-popup-btn">I understand</button>
    `;
    document.body.appendChild(popup);

    // helper: position popup under the button
    function positionPopup() {
  const rect = locateBtn.getBoundingClientRect();
  // Align the popup so its right side is the same distance from the
  // right edge of the page as the locate button's right side.
  popup.style.left = 'auto';
  const rightDistance = Math.max(8, window.innerWidth - rect.right);
  popup.style.right = rightDistance + 'px';
  popup.style.top = rect.bottom + window.scrollY + 8 + 'px';
    }

    // Show the popup and attach handlers
    function showPopup() {
      positionPopup();
      popup.style.display = 'block';
      // close on outside click
      setTimeout(() => { // delay to avoid immediate trigger from same click
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

    const understandBtn = popup.querySelector('.locate-popup-btn');
    understandBtn.addEventListener('click', () => {
      privacyAccepted = true;
      hidePopup();
      // proceed with locating after acceptance
      startLocate();
    });

    // startLocate encapsulates the geolocation request and button UI
    function startLocate() {
      if (locateBtn) {
        // Request location. We don't auto setView here; we'll control zoom in the handler.
        map.locate({ setView: false, maxZoom: LOCATE_MAX_ZOOM, watch: false });
        locateBtn.textContent = 'Locating...';
        locateBtn.disabled = true;
      }
    }

    locateBtn.addEventListener('click', (e) => {
      // If user already accepted in this session, start locating immediately
      if (privacyAccepted) {
        startLocate();
        return;
      }

      // Otherwise show the popup (do not start locating until they click I understand)
      showPopup();
      // keep the click from triggering the outsideClick handler immediately
      e.stopPropagation();
    });
  }

  // On location found, show marker + accuracy circle and zoom to the area
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
    console.warn('Location error:', err.message);
    alert('Could not get your location: ' + err.message + '\nPlease enable location permission in your browser.');
    if (locateBtn) {
      locateBtn.textContent = 'Find me';
      locateBtn.disabled = false;
    }
  });

});
