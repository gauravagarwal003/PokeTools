// Define threshold and color variables
const MIN_PERCENTAGE = 20;
const MAX_PERCENTAGE = 80;
const DARK_RED_HEX = "#FF0000";
const BRIGHT_GREEN_HEX = "#00AA00";

// Helper function to convert hex color to an RGB array
function hexToRGB(hex) {
  hex = hex.replace("#", "");
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16)
  ];
}

// Convert the hex colors to RGB arrays
const darkRedRGB = hexToRGB(DARK_RED_HEX);
const brightGreenRGB = hexToRGB(BRIGHT_GREEN_HEX);

// Create a date parser for the format in your CSV ("YYYY-MM-DD")
const parseDate = d3.timeParse("%Y-%m-%d");

function getReturnColor(percentage) {
  // If percentage is null, return a default color (black)
  if (percentage === null) return "black";

  // If the percentage is at or below the minimum, return the dark red hex
  if (percentage <= MIN_PERCENTAGE) return DARK_RED_HEX;

  // If the percentage is at or above the maximum, return the bright green hex
  if (percentage >= MAX_PERCENTAGE) return BRIGHT_GREEN_HEX;

  // Normalize the percentage between MIN_PERCENTAGE and MAX_PERCENTAGE
  let t = (percentage - MIN_PERCENTAGE) / (MAX_PERCENTAGE - MIN_PERCENTAGE);

  // Interpolate each RGB channel
  let r = Math.round((1 - t) * darkRedRGB[0] + t * brightGreenRGB[0]);
  let g = Math.round((1 - t) * darkRedRGB[1] + t * brightGreenRGB[1]);
  let b = Math.round((1 - t) * darkRedRGB[2] + t * brightGreenRGB[2]);

  // Convert each channel to a two-digit hex string
  let toHex = (c) => ("0" + c.toString(16)).slice(-2);
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

// Load all three CSVs concurrently: expected values, pack prices, and set info (for colors)
Promise.all([
  d3.csv("assets/sv_packs_expected_value.csv"),
  d3.csv("assets/sv_pack_prices.csv"),
  d3.csv("assets/set_info.csv")
]).then(function (files) {
  let evData = files[0];
  let priceData = files[1];
  let setInfoData = files[2];

  // Build a color map from assets/set_info.csv
  let colorMap = {};
  setInfoData.forEach(function (d) {
    // Trim any extra whitespace from the set name if needed
    colorMap[d.Set.trim()] = d.Color.trim();
  });

  // Convert the Date columns to Date objects in both datasets using parseDate
  evData.forEach(function (d) {
    d.Date = parseDate(d.Date);
  });
  priceData.forEach(function (d) {
    d.Date = parseDate(d.Date);
  });

  // Use the latest row for pack prices and expected values
  let latestPriceRow = priceData.reduce((prev, cur) => cur.Date > prev.Date ? cur : prev);
  let latestEVRow = evData.reduce((prev, cur) => cur.Date > prev.Date ? cur : prev);

  // Create an array to store the joined data for each set.
  let setData = [];
  Object.keys(latestEVRow).forEach(function (key) {
    if (key !== "Date") {
      let expectedValue = parseFloat(latestEVRow[key]);
      expectedValue = isNaN(expectedValue) ? null : expectedValue;

      let packPrice = latestPriceRow[key] ? parseFloat(latestPriceRow[key]) : null;
      packPrice = isNaN(packPrice) ? null : packPrice;

      let percentage = (packPrice && expectedValue !== null) ? (expectedValue / packPrice * 100) : null;
      setData.push({
        setName: key,
        expectedValue: expectedValue,
        packPrice: packPrice,
        percentage: percentage
      });
    }
  });

  // Sort setData by percentage (treat null as 0)
  setData.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

  // Build the info rows (each row has an image with text in one line under the image)
  let infoContainer = d3.select("#current_set_info");

  setData.forEach(function (d) {
    let row = infoContainer.append("div").attr("class", "set-row");

    // Append the image (centered by CSS)
    row.append("img")
      .attr("src", "assets/set_images/" + d.setName + ".png")
      .attr("alt", d.setName);

    let percentageText = d.percentage === null ? "N/A" : d.percentage.toFixed(0) + "%";
    let percentageColor = getReturnColor(d.percentage);

    // Append text info in one line (using a single paragraph)
    row.append("p").attr("class", "set-info").html(
      "Pack Price: $" + (d.packPrice !== null ? d.packPrice : "N/A") + " | " +
      "Expected Value: $" + (d.expectedValue !== null ? d.expectedValue : "N/A") + " | " +
      "Recovered: <span style='color:" + percentageColor + ";'>" + percentageText + "</span>"
    );
  });

  // ---------------- Create Expected Value Over Time Plot ----------------
  let setsEV = Object.keys(evData[0]).filter(key => key !== "Date");
  let tracesEV = setsEV.map(function (set) {
    return {
      x: evData.map(d => d.Date),
      y: evData.map(d => {
        let v = parseFloat(d[set]);
        return isNaN(v) ? null : v;
      }),
      mode: 'lines',
      name: set,
      line: {
        color: colorMap[set.trim()] || undefined
      },
      hovertemplate: '%{x|%Y-%m-%d}<br>' +
        set + ': $%{y:.2f}<extra></extra>'
    };
  });

  let layoutEV = {
    title: 'Expected Value Over Time',
    xaxis: {
      title: 'Date',
    },
    yaxis: {
      title: 'Expected Value per Pack ($)',
      tickprefix: '$',
    },
    plot_bgcolor: 'rgb(200,200,200)',
    paper_bgcolor: 'rgb(200,200,200)',
    height: 500,
    hovermode: 'closest',
    margin: {
      l: 50,
      r: 50,
      t: 80,
      b: 50
    }
  };

  Plotly.newPlot('chart-ev', tracesEV, layoutEV);

  // ---------------- Create Pack Prices Plot ----------------
  let setsPacks = Object.keys(priceData[0]).filter(key => key !== "Date");
  let tracesPacks = setsPacks.map(function (set) {
    return {
      x: priceData.map(d => d.Date),
      y: priceData.map(d => {
        let v = parseFloat(d[set]);
        return isNaN(v) ? null : v;
      }),
      mode: 'lines',
      name: set,
      line: {
        color: colorMap[set.trim()] || undefined
      },
      hovertemplate: '%{x|%Y-%m-%d}<br>' +
        set + ': $%{y:.2f}<extra></extra>'
    };
  });

  let layoutPacks = {
    title: 'Pack Prices Over Time',
    xaxis: {
      title: 'Date',
    },
    yaxis: {
      title: 'Price per Pack ($)',
      tickprefix: '$',
    },
    plot_bgcolor: 'rgb(200,200,200)',
    paper_bgcolor: 'rgb(200,200,200)',
    height: 500,
    hovermode: 'closest',
    margin: {
      l: 50,
      r: 50,
      t: 80,
      b: 50
    }
  };

  Plotly.newPlot('chart-pack-prices', tracesPacks, layoutPacks);

  // ---------------- Create Recovered Percentage Over Time Plot ----------------
  let setsPercent = Object.keys(evData[0]).filter(key => key !== "Date");
  let tracesPercent = setsPercent.map(function (set) {
    return {
      x: evData.map(d => d.Date),
      y: evData.map((d, i) => {
        let ev = parseFloat(d[set]);
        let packPrice = (priceData[i] && priceData[i][set] !== undefined) ? parseFloat(priceData[i][set]) : NaN;
        return (!isNaN(ev) && !isNaN(packPrice) && packPrice) ? (ev / packPrice * 100) : null;
      }),
      mode: 'lines',
      name: set,
      line: {
        color: colorMap[set.trim()] || undefined
      },
      hovertemplate: '%{x|%Y-%m-%d}<br>' +
        set + 'Percentage Recovered: %{y:.2f}%<extra></extra>'
    };
  });

  let layoutPercent = {
    title: 'Percentage Recovered Over Time',
    xaxis: {
      title: 'Date',
    },
    yaxis: {
      automargin: true,
      title: 'Percentage Recovered per Pack (%)',
      ticksuffix: '%',
    },
    plot_bgcolor: 'rgb(200,200,200)',
    paper_bgcolor: 'rgb(200,200,200)',
    height: 500,
    hovermode: 'closest',
    margin: {
      l: 50,
      r: 50,
      t: 80,
      b: 50
    }
  };

  Plotly.newPlot('chart-percent', tracesPercent, layoutPercent);
});

document.addEventListener("DOMContentLoaded", function () {
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

  policiesBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    policiesPopup.style.display = "block";
  });

  policiesCloseBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    policiesPopup.style.display = "none";
  });

  policiesPopup.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  document.addEventListener("click", function () {
    if (policiesPopup.style.display === "block") {
      policiesPopup.style.display = "none";
    }
  });

  // Tab functionality for policies popup.
  const tabLinks = policiesPopup.querySelectorAll(".tab-link");
  const tabContents = policiesPopup.querySelectorAll(".tab-content");

  tabLinks.forEach(tab => {
    tab.addEventListener("click", function () {
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
