const SHEET_URL = "https://raw.githubusercontent.com/waqiuddinazhad-cmd/AKRAM-players-database/refs/heads/main/data.json";

let students = [];
let activeAgeFilters = new Set();
let activeUnitFilters = new Set();
let selectionState = JSON.parse(localStorage.getItem('studentApp_selections')) || {};
let swiperInstance = null;
const TARGET_UNITS = ["Forwards", "Backlines", "Scrum-half", "Multi-role"];

// --- INITIALIZATION ---
async function init() {
    try {
        const res = await fetch(SHEET_URL);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        students = data.map((s, index) => {
            let raw = s.unit ? String(s.unit).toLowerCase().trim() : "";
            let clean = "nounit";
            if (raw.includes("forward")) clean = "forwards";
            else if (raw.includes("back")) clean = "backlines";
            else if (raw.includes("scrum")) clean = "scrum-half";
            else if (raw.includes("multi")) clean = "multi-role";
            
            return {
                ...s,
                id: s.id || `p-${index}`,
                cleanUnit: clean,
                displayUnit: s.unit || "No Unit",
                umur: s.umur ? String(s.umur).trim() : "0"
            };
        });

        setupFilters();
        renderCards();

    } catch (err) {
        console.error("Fetch Error:", err);
        document.getElementById('cardContainer').innerHTML = `<p style="color:red; text-align:center;">Failed to load players.</p>`;
    }
}

// --- MAIN RENDER ---
function renderCards() {
    const container = document.getElementById('cardContainer');
    const search = document.getElementById('searchInput').value.toLowerCase();
    container.innerHTML = '';

    const filtered = students.filter(s => {
        const matchesSearch = (s.nama_murid || "").toLowerCase().includes(search) || (s.nama_samaran || "").toLowerCase().includes(search);
        const matchesAge = activeAgeFilters.size === 0 || activeAgeFilters.has(s.umur);
        const matchesUnit = activeUnitFilters.size === 0 || activeUnitFilters.has(s.cleanUnit);
        return matchesSearch && matchesAge && matchesUnit;
    });

    updateBottomBar(filtered.length);

    filtered.forEach(s => {
        const card = document.createElement('div');
        const nameKey = (s.nama_murid || "UNKNOWN").toUpperCase();
        const status = selectionState[nameKey] || 'available';
        card.className = `student-card ${status}`;
        
        let imgPath = s.image ? String(s.image).trim() : "";
        let finalSrc = imgPath !== "" ? (imgPath.startsWith('http') || imgPath.startsWith('assets/') ? imgPath : `assets/${imgPath}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(s.nama_murid)}&background=random`;

        card.innerHTML = `
            <div class="expand-btn" onclick="event.stopPropagation(); openProfile('${s.nama_murid.replace(/'/g, "\\'")}')">+</div>
            <img src="${finalSrc}" class="student-image" onerror="this.src='https://via.placeholder.com/150?text=No+Photo'">
            <div class="card-info">
                <div class="nickname">${(s.nama_samaran || s.nama_murid).toUpperCase()}</div>
                <div class="realname">${nameKey}</div>
                <div class="class-unit">${s.displayUnit} • ${s.umur}YO</div>
            </div>
        `;

        card.onclick = () => {
            if (status === 'available') selectionState[nameKey] = 'selected';
            else if (status === 'selected') selectionState[nameKey] = 'reserved';
            else delete selectionState[nameKey];
            
            localStorage.setItem('studentApp_selections', JSON.stringify(selectionState));
            renderCards();
        };
        container.appendChild(card);
    });
}

// --- SUMMARY PAGE LOGIC ---
window.openSummary = function() {
    const summaryList = document.getElementById('summaryList');
    summaryList.innerHTML = '';
    
    // Filter students who are marked 'selected' or 'reserved' in selectionState
    const selectedPlayers = students.filter(s => {
        const status = selectionState[(s.nama_murid || "").toUpperCase()];
        return status === 'selected' || status === 'reserved';
    });

    if (selectedPlayers.length === 0) {
        summaryList.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">No players selected yet.</div>`;
    } else {
        selectedPlayers.forEach(s => {
            const status = selectionState[s.nama_murid.toUpperCase()];
            const item = document.createElement('div');
            item.className = 'summary-item';
            item.style.borderLeft = status === 'selected' ? '5px solid #22c55e' : '5px solid #f59e0b';
            
            item.innerHTML = `
                <div style="flex:1">
                    <div style="font-weight:800; font-size:0.9rem;">${s.nama_murid.toUpperCase()}</div>
                    <div style="font-size:0.7rem; color:#64748b;">${s.displayUnit} • ${status.toUpperCase()}</div>
                </div>
                <button onclick="removeSelection('${s.nama_murid.replace(/'/g, "\\'")}')" style="background:none; border:none; color:#ef4444; font-size:1.2rem; cursor:pointer;">✕</button>
            `;
            summaryList.appendChild(item);
        });
    }

    // Update the counts specifically for the Summary Modal
    const selCount = selectedPlayers.filter(s => selectionState[s.nama_murid.toUpperCase()] === 'selected').length;
    const resCount = selectedPlayers.filter(s => selectionState[s.nama_murid.toUpperCase()] === 'reserved').length;
    
    // Update labels inside the Summary Modal
    if(document.getElementById('sumSel')) document.getElementById('sumSel').textContent = selCount;
    if(document.getElementById('sumRes')) document.getElementById('sumRes').textContent = resCount;

    document.getElementById('summaryModal').style.display = 'flex';
};

window.removeSelection = function(name) {
    delete selectionState[name.toUpperCase()];
    localStorage.setItem('studentApp_selections', JSON.stringify(selectionState));
    renderCards();   // Update main UI
    openSummary();   // Refresh summary list
};

// --- UTILITIES ---
function updateBottomBar(filteredCount) {
    const vals = Object.values(selectionState);
    const sel = vals.filter(v => v === 'selected').length;
    const res = vals.filter(v => v === 'reserved').length;
    
    document.getElementById('countSelected').textContent = sel;
    document.getElementById('countReserved').textContent = res;
    document.getElementById('countAvailable').textContent = (filteredCount || 0) - (sel + res);
}

function setupFilters() {
    const ageBox = document.getElementById('ageChips');
    const ages = [...new Set(students.map(s => s.umur))].filter(a => a !== "0").sort((a, b) => a - b);
    ageBox.innerHTML = '';
    ages.forEach(age => {
        const chip = document.createElement('div');
        chip.className = `chip ${activeAgeFilters.has(age) ? 'active' : ''}`;
        chip.textContent = age + 'Y';
        chip.onclick = () => {
            activeAgeFilters.has(age) ? activeAgeFilters.delete(age) : activeAgeFilters.add(age);
            setupFilters(); renderCards();
        };
        ageBox.appendChild(chip);
    });

    const unitBox = document.getElementById('unitChips');
    unitBox.innerHTML = '';
    TARGET_UNITS.forEach(label => {
        let key = label.toLowerCase();
        const chip = document.createElement('div');
        chip.className = `chip ${activeUnitFilters.has(key) ? 'active' : ''}`;
        chip.textContent = label;
        chip.onclick = () => {
            activeUnitFilters.has(key) ? activeUnitFilters.delete(key) : activeUnitFilters.add(key);
            setupFilters(); renderCards();
        };
        unitBox.appendChild(chip);
    });
}

// Ensure Profile and Modal functions are global
window.closeSummary = () => document.getElementById('summaryModal').style.display = 'none';

// --- REMAINING UTILS (Profile, Copy, etc.) ---
// [Include the openProfile, copyToClipboard, and closeProfile functions from the previous working code]

init();
