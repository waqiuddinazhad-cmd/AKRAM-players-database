const SHEET_URL = 'https://api.sheetbest.com/sheets/e1c7bffe-6d8c-4c06-b14d-d3ff2179e3d2';

// State for Long-Press Selection
let selectionMode = false;
let selectedForDeletion = new Set();
let pressTimer;

async function init() {
    const res = await fetch(SHEET_URL);
    const data = await res.json();
    
    // 1. Clean up data
    const students = data.map(s => {
        let raw = s.unit ? String(s.unit).toLowerCase() : "";
        let clean = "unknown";
        if (raw.includes("forward")) clean = "forwards";
        else if (raw.includes("back")) clean = "backlines";
        else if (raw.includes("scrum")) clean = "scrum-half";
        else if (raw.includes("multi")) clean = "multi-role";
        return { ...s, cleanUnit: clean, umur: s.umur ? String(s.umur).trim() : "0" };
    });

    // 2. Get selection state from LocalStorage
    const state = JSON.parse(localStorage.getItem('studentApp_selections')) || {};
    const selected = students.filter(s => state[s.nama_murid.toUpperCase()] === 'selected');
    const reserved = students.filter(s => state[s.nama_murid.toUpperCase()] === 'reserved');

    // 3. Render all UI components
    renderDashboard(selected, reserved);
    renderAgeBreakdown(students, state);
    renderPlayerTable(students, state); // This is what was missing!

    document.getElementById('generatePdfBtn').onclick = () => generatePDF([...selected, ...reserved]);
}

function renderDashboard(sel, res) {
    const container = document.getElementById('statsContainer');
    const counts = { "forwards":0, "backlines":0, "scrum-half":0, "multi-role":0 };
    sel.forEach(s => { if(counts.hasOwnProperty(s.cleanUnit)) counts[s.cleanUnit]++; });

    container.innerHTML = `
        <div class="stats-grid-2-col">
            <div class="stat-box" style="border-top-color:#10b981"><span class="stat-number">${sel.length}</span><span class="stat-label">Selected</span></div>
            <div class="stat-box" style="border-top-color:#f59e0b"><span class="stat-number">${res.length}</span><span class="stat-label">Reserved</span></div>
        </div>
        <div class="stats-grid-4-col">
            <div class="stat-box mini"><small>FWD</small><br><span>${counts["forwards"]}</span></div>
            <div class="stat-box mini"><small>BACKS</small><br><span>${counts["backlines"]}</span></div>
            <div class="stat-box mini"><small>SCRUM-HALF</small><br><span>${counts["scrum-half"]}</span></div>
            <div class="stat-box mini"><small>MULTI-ROLE</small><br><span>${counts["multi-role"]}</span></div>
        </div>
    `;
}

function renderPlayerTable(allStudents, selectionState) {
    const tableOutput = document.getElementById('tableOutput');
    if (!tableOutput) return;

    // Filter list: only show those selected or reserved
    let list = allStudents.filter(s => 
        selectionState[s.nama_murid.toUpperCase()] === 'selected' || 
        selectionState[s.nama_murid.toUpperCase()] === 'reserved'
    );

    // Sort: Selected first, Reserved last
    list.sort((a, b) => {
        const statusA = selectionState[a.nama_murid.toUpperCase()];
        const statusB = selectionState[b.nama_murid.toUpperCase()];
        return statusA === 'selected' ? -1 : 1;
    });

    let tableHTML = `
        <div class="table-container">
            <p class="table-hint">${selectionMode ? '<b>Selection Mode Active</b>' : 'Long-press to select'}</p>
            <table class="selection-table">
                <thead>
                    <tr>
                        ${selectionMode ? '<th></th>' : ''}
                        <th>#</th>
                        <th>Full Name</th>
                        <th>Class</th>
                    </tr>
                </thead>
                <tbody>
    `;

    list.forEach((s, index) => {
        const displayClass = `${(s.tingkatan || "").replace('FORM ', '')} ${s.kelas || ""}`;
        const isChecked = selectedForDeletion.has(s.nama_murid.toUpperCase());
        const status = selectionState[s.nama_murid.toUpperCase()];

        tableHTML += `
            <tr class="${status} ${isChecked ? 'row-checked' : ''}" 
                onmousedown="startPress('${s.nama_murid.toUpperCase()}')" onmouseup="endPress()" 
                ontouchstart="startPress('${s.nama_murid.toUpperCase()}')" ontouchend="endPress()"
                onclick="handleRowClick('${s.nama_murid.toUpperCase()}')">
                
                ${selectionMode ? `<td><input type="checkbox" ${isChecked ? 'checked' : ''} readonly></td>` : ''}
                <td>${index + 1}</td>
                <td>
                    <strong>${s.nama_murid.toUpperCase()}</strong><br>
                    <small style="color:#64748b">${s.no_kad_pengenalan_murid || "-"}</small>
                </td>
                <td>${displayClass}</td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table></div>
    <div id="deleteActionBar" class="delete-bar ${selectionMode ? 'active' : ''}">
        <span>${selectedForDeletion.size} Selected</span>
        <div style="display:flex; gap:10px;">
            <button class="btn-cancel" onclick="exitSelectionMode()">Cancel</button>
            <button class="btn-bulk-delete" onclick="bulkDelete()">Remove</button>
        </div>
    </div>`;

    tableOutput.innerHTML = tableHTML;
}

// --- LOGIC FOR LONG PRESS SELECTION ---

window.startPress = function(name) {
    pressTimer = window.setTimeout(() => {
        selectionMode = true;
        selectedForDeletion.add(name);
        init(); // Re-render
    }, 600);
};

window.endPress = function() {
    clearTimeout(pressTimer);
};

window.handleRowClick = function(name) {
    if (selectionMode) {
        if (selectedForDeletion.has(name)) {
            selectedForDeletion.delete(name);
            if (selectedForDeletion.size === 0) exitSelectionMode();
        } else {
            selectedForDeletion.add(name);
        }
        init();
    }
};

window.exitSelectionMode = function() {
    selectionMode = false;
    selectedForDeletion.clear();
    init();
};

window.bulkDelete = function() {
    if (confirm(`Remove ${selectedForDeletion.size} players?`)) {
        const state = JSON.parse(localStorage.getItem('studentApp_selections')) || {};
        selectedForDeletion.forEach(name => delete state[name]);
        localStorage.setItem('studentApp_selections', JSON.stringify(state));
        exitSelectionMode();
    }
};

// --- PDF & AGE BREAKDOWN (UNCHANGED) ---

function renderAgeBreakdown(allStudents, selectionState) {
    const container = document.getElementById('ageBreakdownContainer');
    if (!container) return;
    container.innerHTML = '';
    const counts = {};
    allStudents.forEach(s => {
        if (selectionState[s.nama_murid.toUpperCase()] === 'selected') {
            const formLabel = s.tingkatan || "N/A";
            counts[formLabel] = (counts[formLabel] || 0) + 1;
        }
    });
    Object.keys(counts).sort().forEach(form => {
        const count = counts[form];
        const widthPercent = Math.min(count * 10, 100); 
        const barWrapper = document.createElement('div');
        barWrapper.className = 'breakdown-item';
        barWrapper.innerHTML = `
            <div class="label" style="width: 45px; font-weight: 800; font-size: 0.8rem;">${form.replace(/FORM\s+/i, 'F')}</div>
            <div class="bar-bg" style="flex-grow: 1; background: #f1f5f9; height: 12px; border-radius: 6px; overflow: hidden; margin-left: 10px;">
                <div class="bar-fill" style="width: ${widthPercent}%; background: #0f172a; height: 100%;"></div>
            </div>
            <span style="margin-left:10px; font-size:0.8rem; font-weight:bold;">${count}</span>
        `;
        container.appendChild(barWrapper);
    });
}

async function generatePDF(players) {
    if (players.length === 0) return alert("Please select players first.");
    const btn = document.getElementById('generatePdfBtn');
    btn.textContent = "Processing PDF...";

    // 1. Capture user inputs (Make sure these IDs exist in your HTML!)
    const tourney = {
        name: document.getElementById('tName')?.value || "KEJOHANAN RAGBI",
        date: document.getElementById('tDate')?.value || "TIADA TARIKH",
        venue: document.getElementById('tVenue')?.value || "TIADA VENUE"
    };

    // 2. Fetch the HTML template
    let templateHtml;
    try {
        const response = await fetch('consent.html');
        templateHtml = await response.text();
    } catch (e) {
        console.error("Template fetch failed", e);
        return alert("Error: Could not load consent.html");
    }
    
    // 3. Create the Player Table HTML
    let playerTableRows = players.map((p, i) => `
        <tr>
            <td style="text-align:center">${i + 1}</td>
            <td>${p.nama_murid.toUpperCase()}</td>
            <td>${p.no_kad_pengenalan_murid || '-'}</td>
            <td style="text-align:center">${p.tingkatan || ''} ${p.kelas || ''}</td>
        </tr>
    `).join('');

    const playerTableHtml = `
        <table class="pdf-table">
            <thead>
                <tr>
                    <th style="width: 30px">#</th>
                    <th>Nama Penuh</th>
                    <th>No. KP</th>
                    <th>Kelas</th>
                </tr>
            </thead>
            <tbody>
                ${playerTableRows}
            </tbody>
        </table>
    `;

    // 4. Inject all data into the template
    let finalHtml = templateHtml
        .replace(/{{Nama Kejohanan}}/g, tourney.name)
        .replace(/{{Tarikh Kejohanan}}/g, tourney.date)
        .replace(/{{Venue Kejohanan}}/g, tourney.venue)
        .replace(/{{PlayerTable}}/g, playerTableHtml);

    // 5. Create temporary container (IMPORTANT: Must be visible momentarily for the engine)
    const workerContainer = document.createElement('div');
    workerContainer.style.position = 'absolute';
    workerContainer.style.left = '-9999px';
    workerContainer.style.top = '0';
    workerContainer.innerHTML = finalHtml;
    document.body.appendChild(workerContainer);

    // 6. PDF Options
    const opt = {
        margin: 0, // Margin is handled by your CSS .page padding
        filename: `${tourney.name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 6, 
            useCORS: true, 
            allowTaint: true,
            letterRendering: true 
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 7. Generate and Clean Up
    try {
        // We use 'from' on the inner .page div specifically
        const element = workerContainer.querySelector('.page');
        await html2pdf().set(opt).from(element).save();
    } catch (err) {
        console.error("PDF Generation Error:", err);
        alert("Failed to generate PDF. Check console for details.");
    } finally {
        document.body.removeChild(workerContainer);
        btn.textContent = "Download PDF Forms";
    }
}

init();
// --- RESET ALL SELECTIONS ---
document.getElementById('resetBtn').onclick = function() {
    // 1. Ask for confirmation so users don't accidentally delete their work
    if (confirm("Adakah anda pasti mahu memadam semua pilihan pemain? Tindakan ini tidak boleh dibatalkan.")) {
        
        // 2. Remove the specific key from LocalStorage
        localStorage.removeItem('studentApp_selections');
        
        // 3. Clear current memory state
        selectedForDeletion.clear();
        selectionMode = false;

        // 4. Re-run init to refresh the UI (this will show 0 players)
        init();
        
        alert("Semua data telah dikosongkan.");
    }
};