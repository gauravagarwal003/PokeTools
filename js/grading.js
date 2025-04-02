let setsData = {};  // Global variable for sets data
let cardsDataOriginal = [];
let defaultSortColumn = 'ungraded';
let currentSortColumn = defaultSortColumn;
let currentSortOrder = 'default'; // Possible values: "default", "asc", "desc"

// Fetch assets/sets.json and then price_data_cache.json
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
  const setsData = priceData.sets_data;
  for (let setId in setsData) {
    // Map the raw set id to the friendly display name.
    const setDisplayName = sets[setId] || setId;
    for (let card in setsData[setId]) {
      const data = setsData[setId][card];
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
  // Filter based on minimum PSA9 difference.
  let filteredData = cardsDataOriginal.filter(item => item.grade9Diff >= minDiffVal);
  
  // Sort the filtered data.
  if (currentSortOrder === 'default') {
    // Default sorting: sort by ungraded in descending order.
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
    th.addEventListener('click', function() {
      const sortColumn = this.getAttribute('data-sort');
      if (currentSortColumn !== sortColumn) {
        // Switch to a new column: start with ascending.
        currentSortColumn = sortColumn;
        currentSortOrder = 'asc';
      } else {
        // Cycle through asc -> desc -> default -> asc ...
        if (currentSortOrder === 'asc') {
          currentSortOrder = 'desc';
        } else if (currentSortOrder === 'desc') {
          currentSortOrder = 'default';
        } else { // currentSortOrder is "default"
          currentSortOrder = 'asc';
        }
      }
      
      // Clear sorting classes on all headers.
      headers.forEach(header => header.classList.remove('sort-asc', 'sort-desc'));
      // Only add sort class if not in default state.
      if (currentSortOrder !== 'default') {
        this.classList.add(currentSortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
      }
      updateTable();
    });
  });
}

// Event listener for filter input changes.
document.getElementById('minDiff').addEventListener('input', updateTable);
