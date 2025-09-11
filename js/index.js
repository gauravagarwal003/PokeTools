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
    locateBtn.addEventListener('click', () => {
      // Ask user for location (this will trigger the browser permission prompt)
  // Request location. We don't auto setView here; we'll control zoom in the handler.
  map.locate({ setView: false, maxZoom: LOCATE_MAX_ZOOM, watch: false });
      locateBtn.textContent = 'Locating...';
      locateBtn.disabled = true;
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
