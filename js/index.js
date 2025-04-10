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
  
    // ----- Info Popup Functionality -----
    // Get references to the info button and popup elements.
    const infoBtn = document.getElementById("infoBtn");
    const infoPopup = document.getElementById("infoPopup");
    const closeBtn = document.querySelector(".infopopup .close");
    
    // Toggle the popup when the info button is clicked.
    infoBtn.addEventListener("click", function (event) {
      event.stopPropagation(); // Prevent the click from bubbling up to the document
      infoPopup.style.display = infoPopup.style.display === "block" ? "none" : "block";
    });
  
    // Hide the popup when the close button is clicked.
    closeBtn.addEventListener("click", function (event) {
      event.stopPropagation(); // Prevent the click from bubbling up to the document
      infoPopup.style.display = "none";
    });
  
    // Prevent clicks inside the popup from closing it.
    infoPopup.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  
    // Close the popup when clicking anywhere outside of it.
    document.addEventListener("click", function () {
      if (infoPopup.style.display === "block") {
        infoPopup.style.display = "none";
      }
    });
      // Policies popup event listeners.
  const policiesBtn = document.getElementById("policiesBtn");
  const policiesPopup = document.getElementById("policiesPopup");
  const policiesCloseBtn = policiesPopup.querySelector(".close");
  
  policiesBtn.addEventListener("click", function(event) {
    event.stopPropagation();
    policiesPopup.style.display = "block";
  });
  
  policiesCloseBtn.addEventListener("click", function(event) {
    event.stopPropagation();
    policiesPopup.style.display = "none";
  });
  
  policiesPopup.addEventListener("click", function(event) {
    event.stopPropagation();
  });
  
  document.addEventListener("click", function() {
    if (policiesPopup.style.display === "block") {
      policiesPopup.style.display = "none";
    }
  });
  
  // Tab functionality for policies popup.
  const tabLinks = policiesPopup.querySelectorAll(".tab-link");
  const tabContents = policiesPopup.querySelectorAll(".tab-content");
  
  tabLinks.forEach(tab => {
    tab.addEventListener("click", function() {
      tabLinks.forEach(t => t.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));
      this.classList.add("active");
      const tabName = this.getAttribute("data-tab");
      const activeContent = policiesPopup.querySelector(`#${tabName}`);
      if (activeContent) {
        activeContent.classList.add("active");
      }
    });
  });

  });
  