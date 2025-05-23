let setsData = {};  // Global variable for sets data
let cardsDataOriginal = [];
let defaultSortColumn = 'ungraded';
let currentSortColumn = defaultSortColumn;
let currentSortOrder = 'default'; // Possible values: "default", "asc", "desc"

// Fetch assets/sets.json and then assets/sets_price_data.json
fetch('assets/sets.json')
  .then(response => response.json())
  .then(data => {
    setsData = data; // Store the sets data globally
    return fetch('assets/sets_price_data.json');
  })
  .then(response => response.json())
  .then(priceData => {
    cardsDataOriginal = processData(priceData, setsData);
    setupHeaderSorting();
    updateTable();
  })
  .catch(error => {
    console.error('Error loading JSON:', error);
  });

// Process JSON data into an array of card objects.
function processData(priceData, sets) {
  const cards = [];
  const setsDataObj = priceData.sets_data;
  for (let setId in setsDataObj) {
    const setDisplayName = sets[setId] || setId;
    for (let card in setsDataObj[setId]) {
      const data = setsDataObj[setId][card];
      const ungraded = parseFloat(data.ungraded);
      const grade9 = parseFloat(data.grade_9);
      const grade10 = parseFloat(data.grade_10);
      const grade9Diff = grade9 - ungraded;
      const grade10Diff = grade10 - ungraded;
      const percent9Diff = ((grade9 - ungraded) / ungraded) * 100;
      const percent10Diff = ((grade10 - ungraded) / ungraded) * 100;
      cards.push({
        set: setDisplayName,
        card: card,
        link: data.link,
        ungraded: ungraded,
        grade9: grade9,
        grade10: grade10,
        grade9Diff: grade9Diff,
        grade10Diff: grade10Diff,
        percent9Diff: percent9Diff,
        percent10Diff: percent10Diff
      });
    }
  }
  return cards;
}

// Render the table body given an array of card objects.
function renderTable(cards) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  cards.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.set}</td>
      <td><a href="${item.link}" target="_blank">${item.card}</a></td>
      <td>$${item.ungraded.toFixed(2)}</td>
      <td>$${item.grade9.toFixed(2)}</td>
      <td>$${item.grade10.toFixed(2)}</td>
      <td>$${item.grade9Diff.toFixed(2)}</td>
      <td>$${item.grade10Diff.toFixed(2)}</td>
      <td>${item.percent9Diff.toFixed(2)}%</td>
      <td>${item.percent10Diff.toFixed(2)}%</td>
    `;
    tbody.appendChild(row);
  });
}

// Update table based on current filter and sort settings.
function updateTable() {
  const minDiffVal = parseFloat(document.getElementById('minDiff').value) || 19;
  let filteredData = cardsDataOriginal.filter(item => item.grade9Diff >= minDiffVal);

  if (currentSortOrder === 'default') {
    filteredData.sort((a, b) => b[defaultSortColumn] - a[defaultSortColumn]);
  } else {
    filteredData.sort((a, b) => {
      let valA = a[currentSortColumn];
      let valB = b[currentSortColumn];
      if (typeof valA === 'string') {
        return currentSortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return currentSortOrder === 'asc'
          ? valA - valB
          : valB - valA;
      }
    });
  }
  renderTable(filteredData);
}

// Set up header click event listeners for tri-state sorting.
function setupHeaderSorting() {
  const headers = document.querySelectorAll('#cardsTable thead th');
  headers.forEach(th => {
    th.addEventListener('click', function () {
      const sortColumn = this.getAttribute('data-sort');
      if (currentSortColumn !== sortColumn) {
        currentSortColumn = sortColumn;
        currentSortOrder = 'asc';
      } else {
        if (currentSortOrder === 'asc') {
          currentSortOrder = 'desc';
        } else if (currentSortOrder === 'desc') {
          currentSortOrder = 'default';
        } else {
          currentSortOrder = 'asc';
        }
      }
      headers.forEach(header => header.classList.remove('sort-asc', 'sort-desc'));
      if (currentSortOrder !== 'default') {
        this.classList.add(currentSortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
      }
      updateTable();
    });
  });
}

// Event listener for filter input changes.
document.getElementById('minDiff').addEventListener('input', updateTable);

// DOMContentLoaded handler for popups and tab functionality.
document.addEventListener("DOMContentLoaded", function () {
  // Info popup event listeners.
  const infoBtn = document.getElementById("infoBtn");
  const infoPopup = document.getElementById("infoPopup");
  const infoCloseBtn = document.querySelector(".infopopup .close");

  infoBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    infoPopup.style.display = infoPopup.style.display === "block" ? "none" : "block";
  });

  infoCloseBtn.addEventListener("click", function (event) {
    event.stopPropagation();
    infoPopup.style.display = "none";
  });

  infoPopup.addEventListener("click", function (event) {
    event.stopPropagation();
  });

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
