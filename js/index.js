document.addEventListener("DOMContentLoaded", function () {
  // ----- Map Initialization -----
  // Create a map centered on the U.S. with a zoom level of 4.
  const map = L.map('map').setView([37.8, -96], 4);

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

});
