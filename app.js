const SHEET_URL = 'https://api.sheetbest.com/sheets/e1c7bffe-6d8c-4c06-b14d-d3ff2179e3d2';

// Fixed categories for your filter buttons
const TARGET_UNITS = ["Forwards", "Backlines", "Scrum-half", "Multi-role"];

let students = [];
let activeAgeFilters = new Set();
let activeUnitFilters = new Set();
let selectionState = JSON.parse(localStorage.getItem('studentApp_selections')) || {};

async function init() {
  try {
    const res = await fetch(SHEET_URL);
    const data = await res.json();
    
    students = data.map(s => {
      // UNIT NORMALIZATION
      let raw = s.unit ? String(s.unit).toLowerCase().trim() : "";
      let clean = "nounit";

      if (raw.includes("forward")) clean = "forwards";
      else if (raw.includes("back")) clean = "backlines";
      else if (raw.includes("scrum")) clean = "scrum-half";
      else if (raw.includes("multi")) clean = "multi-role";
      
      return {
        ...s,
        cleanUnit: clean,
        displayUnit: s.unit || "No Unit",
        umur: s.umur ? String(s.umur).trim() : "0"
      };
    });

    setupFilters();
    renderCards(); // This will automatically trigger the first updateBottomBar
  } catch (err) {
    console.error("Error:", err);
  }
}

function setupFilters() {
  // Age Filters
  const ageBox = document.getElementById('ageChips');
  const ages = [...new Set(students.map(s => s.umur))].filter(a => a !== "0").sort((a,b)=>a-b);
  ageBox.innerHTML = '';
  ages.forEach(age => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = age + 'Y';
    chip.onclick = () => {
      chip.classList.toggle('active');
      activeAgeFilters.has(age) ? activeAgeFilters.delete(age) : activeAgeFilters.add(age);
      renderCards();
    };
    ageBox.appendChild(chip);
  });

  // Unit Filters
  const unitBox = document.getElementById('unitChips');
  unitBox.innerHTML = '';
  TARGET_UNITS.forEach(label => {
    let key = label.toLowerCase();
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = label;
    chip.onclick = () => {
      chip.classList.toggle('active');
      activeUnitFilters.has(key) ? activeUnitFilters.delete(key) : activeUnitFilters.add(key);
      renderCards();
    };
    unitBox.appendChild(chip);
  });
}

function renderCards() {
  const container = document.getElementById('cardContainer');
  const search = document.getElementById('searchInput').value.toLowerCase();
  container.innerHTML = '';

  const filtered = students.filter(s => {
    const matchesSearch = s.nama_murid.toLowerCase().includes(search) || (s.nama_samaran || "").toLowerCase().includes(search);
    const matchesAge = activeAgeFilters.size === 0 || activeAgeFilters.has(s.umur);
    
    // Using cleanUnit to match the lowercase keys from TARGET_UNITS
    const matchesUnit = activeUnitFilters.size === 0 || activeUnitFilters.has(s.cleanUnit);
    
    return matchesSearch && matchesAge && matchesUnit;
  });

  // Update the Bottom Bar with the count of players matching current filters
  updateBottomBar(filtered.length); 
  
  filtered.forEach(s => {
    const card = document.createElement('div');
    const status = selectionState[s.nama_murid] || 'available';
    card.className = `student-card ${status}`;
    
    // IMAGE PATH LOGIC
    let imgPath = s.image ? s.image.trim() : "";
    let finalSrc = `https://ui-avatars.com/api/?name=${s.nama_murid}&background=random`;
    
    if (imgPath !== "") {
        finalSrc = (imgPath.startsWith('http') || imgPath.startsWith('assets/')) ? imgPath : `assets/${imgPath}`;
    }

    card.innerHTML = `
  <div class="sq-img-wrapper">
    <img src="${finalSrc}" onerror="this.src='https://via.placeholder.com/80'">
  </div>

  <div class="nickname">
    ${(s.nama_samaran || s.nama_murid.split(' ')[0]).toUpperCase()}
  </div>

  <div class="realname">
    ${s.nama_murid.toUpperCase()}
  </div>

  <div class="class-unit">
    ${s.displayUnit} • ${s.umur}YO
  </div>
`;


    card.onclick = () => {
      if(status === 'available') selectionState[s.nama_murid.toUpperCase()] = 'selected';
      else if(status === 'selected') selectionState[s.nama_murid.toUpperCase()] = 'reserved';
      else delete selectionState[s.nama_murid.toUpperCase()
      ];
      
      localStorage.setItem('studentApp_selections', JSON.stringify(selectionState));
      renderCards(); // Re-render to update counts and colors
    };
    container.appendChild(card);
  });
}

function updateBottomBar(filteredCount) {
  const vals = Object.values(selectionState);
  const sel = vals.filter(v => v === 'selected').length;
  const res = vals.filter(v => v === 'reserved').length;
  
  document.getElementById('countSelected').textContent = sel;
  document.getElementById('countReserved').textContent = res;
  
  // Available calculation is now relative to the filtered view
  const totalInView = (filteredCount !== undefined) ? filteredCount : students.length;
  document.getElementById('countAvailable').textContent = totalInView - (sel + res);
}

document.getElementById('searchInput').oninput = renderCards;

document.getElementById('btnResetIndex').onclick = () => {
  if(confirm("Reset all selections?")) {
    localStorage.removeItem('studentApp_selections');
    location.reload();
  }
};


init();
