const SHEET_URL = 'https://api.sheetbest.com/sheets/e1c7bffe-6d8c-4c06-b14d-d3ff2179e3d2';

// State for Long-Press Selection
let selectionMode = false;
let selectedForDeletion = new Set();
let pressTimer;

// --- INITIALIZATION ---
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
    renderPlayerTable(students, state);
}

// --- RENDERING FUNCTIONS ---
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

    let list = allStudents.filter(s => 
        selectionState[s.nama_murid.toUpperCase()] === 'selected' || 
        selectionState[s.nama_murid.toUpperCase()] === 'reserved'
    );

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
                <td class="copyable-cell">
                    <strong class="copy-text" onclick="copyToClipboard('${s.nama_murid.toUpperCase()}', this)">
                        ${s.nama_murid.toUpperCase()}
                    </strong><br>
                    <small class="copy-text" style="color:#64748b" onclick="copyToClipboard('${s.no_kad_pengenalan_murid || ""}', this)">
                        ${s.no_kad_pengenalan_murid || "-"}
                    </small>
                </td>
                <td><div class="class-rhs">${displayClass}</div></td>
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

// --- INTERACTION LOGIC (LONG PRESS, COPY, RESET) ---

window.startPress = function(name) {
    pressTimer = window.setTimeout(() => {
        selectionMode = true;
        selectedForDeletion.add(name);
        init(); 
    }, 600);
};

window.endPress = function() { clearTimeout(pressTimer); };

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

window.copyToClipboard = function(text, element) {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text).then(() => {
        const originalColor = element.style.color;
        element.style.color = "#10b981"; 
        const feedback = document.createElement('span');
        feedback.innerText = " ✓";
        feedback.style.fontSize = "10px";
        element.appendChild(feedback);
        setTimeout(() => {
            element.style.color = originalColor;
            feedback.remove();
        }, 1000);
    }).catch(err => console.error('Failed to copy: ', err));
};

document.getElementById('resetBtn').onclick = function() {
    if (confirm("Adakah anda pasti mahu memadam semua pilihan pemain?")) {
        localStorage.removeItem('studentApp_selections');
        selectedForDeletion.clear();
        selectionMode = false;
        init();
        alert("Semua data telah dikosongkan.");
    }
};

// --- BUTTON WIRING ---

// Document 1: Players List
document.getElementById('btnPlayersList').onclick = () => {
    const state = JSON.parse(localStorage.getItem('studentApp_selections')) || {};
    fetch(SHEET_URL).then(res => res.json()).then(data => {
        const selected = data.filter(s => state[s.nama_murid.toUpperCase()] === 'selected');
        const reserved = data.filter(s => state[s.nama_murid.toUpperCase()] === 'reserved');
        generatePDF([...selected, ...reserved]); 
    });
};

// Document 2: Parental Consent
document.getElementById('btnParentalConsent').onclick = () => {
    generateParentalConsentPDF(); 
};

// Document 3: Media Consent
document.getElementById('btnMediaConsent').onclick = () => {
    alert("Media Consent Form logic coming soon!");
};

// Document 4: M01
document.getElementById('btnM01').onclick = () => {
    alert("M01 Form logic coming soon!");
};


// --- DOCUMENT 1 GENERATION (html2pdf) ---

async function generatePDF(players) {
    if (players.length === 0) return alert("Please select players first.");
    const btn = document.getElementById('btnPlayersList');
    const originalText = btn.innerHTML;
    btn.innerHTML = "Processing...";

    const tourney = {
        name: document.getElementById('tName')?.value || "KEJOHANAN RAGBI",
        date: document.getElementById('tDate')?.value || "TIADA TARIKH",
        venue: document.getElementById('tVenue')?.value || "TIADA VENUE"
    };

    let templateHtml;
    try {
        const response = await fetch('consent.html');
        templateHtml = await response.text();
    } catch (e) {
        return alert("Error: Could not load consent.html");
    }
    
    let playerTableRows = players.map((p, i) => `
        <tr>
            <td style="text-align:center">${i + 1}</td>
            <td>${p.nama_murid.toUpperCase()}</td>
            <td>${p.no_kad_pengenalan_murid || '-'}</td>
            <td style="text-align:center; white-space: nowrap;">${(p.tingkatan || "").replace('FORM ', '')} ${p.kelas || ''}</td>
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
            <tbody>${playerTableRows}</tbody>
        </table>
    `;

    let finalHtml = templateHtml
        .replace(/{{Nama Kejohanan}}/g, tourney.name)
        .replace(/{{Tarikh Kejohanan}}/g, tourney.date)
        .replace(/{{Venue Kejohanan}}/g, tourney.venue)
        .replace(/{{PlayerTable}}/g, playerTableHtml);

    const workerContainer = document.createElement('div');
    workerContainer.style.position = 'absolute';
    workerContainer.style.left = '-9999px';
    workerContainer.style.top = '0';
    workerContainer.innerHTML = finalHtml;
    document.body.appendChild(workerContainer);

    const opt = {
        margin: 0,
        filename: `${tourney.name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 6, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        const element = workerContainer.querySelector('.page');
        await html2pdf().set(opt).from(element).save();
    } catch (err) {
        console.error("PDF Error:", err);
        alert("Failed to generate PDF.");
    } finally {
        document.body.removeChild(workerContainer);
        btn.innerHTML = originalText;
    }
}

// --- DOCUMENT 2 GENERATION (pdfMake) ---

// --- DOCUMENT 2: PARENTAL CONSENT (CRASH-PROOF VERSION) ---

// Helper: Tries to load image, returns null if missing (doesn't crash)
async function getBase64Image(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("File not found");
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn(`Warning: Image ${url} not found. PDF will generate without it.`);
        return null; // Returns null instead of crashing
    }
}

async function generateParentalConsentPDF() {
    const btn = document.getElementById('btnParentalConsent');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = "Generating...";
    btn.style.opacity = "0.7";

    try {
        const tourney = {
            name: document.getElementById('tName').value || "....................................",
            date: document.getElementById('tDate').value || "....................................",
            time: document.getElementById('tMasa').value || "....................................",
            venue: document.getElementById('tVenue').value || "...................................."
        };

        const todayDate = new Date().toLocaleDateString('ms-MY');
        const imgJata = await getBase64Image('jata-negara.png');
        const imgSchool = await getBase64Image('logosmktm.png');

        const state = JSON.parse(localStorage.getItem('studentApp_selections')) || {};
        const res = await fetch(SHEET_URL);
        const allStudents = await res.json();
        
        const selectedPlayers = allStudents.filter(s => 
            state[s.nama_murid.toUpperCase()] === 'selected' || 
            state[s.nama_murid.toUpperCase()] === 'reserved'
        );

        if (selectedPlayers.length === 0) {
            alert("No players selected!");
            throw new Error("No players");
        }

        // 5. Define PDF Styles & Global Settings
const docDefinition = {
    // TAMBAHKAN INI: Mengurangi margin halaman (Kiri, Atas, Kanan, Bawah)
    pageMargins: [35, 25, 35, 25], 

    content: [],
    styles: {
        headerTitle: { fontSize: 13, bold: true },
        headerSub: { fontSize: 8, italic: true },
        
        // SESUAIKAN INI: Gunakan lineHeight yang lebih kecil (misal 1.1 atau 1.15)
        bodyText: { 
            fontSize: 11, 
            lineHeight: 1.3  // Ini akan menghemat banyak ruang vertikal
        }, 
        
        tableHeader: { fontSize: 9, bold: true, fillColor: '#f3f4f6', alignment: 'center' },
        tableCell: { fontSize: 9, alignment: 'center' },
        cutLine: { fontSize: 8, alignment: 'center' }
    }
};

        selectedPlayers.forEach((p, index) => {
            const displayClass = `${(p.tingkatan || "").replace('FORM ', '')} ${p.kelas || ""}`;
            
            // SMART MAPPING: Handles 'alamat', 'Alamat', or 'alamat_rumah'
            const parentName = p.nama_penjaga || p.Nama_Penjaga || '...........................................'.toUpperCase();
            const parentAddress = p.alamat_rumah || p.alamat || p.Alamat || '...........................................'.toUpperCase();
            const parentPhone = p.no_telefon_penjaga || p.no_tel || p.no_tel_penjaga || '...........................................'.toUpperCase();

            const page = [
                // 1. HEADER (Corrected Centering & Alignment)
                {
                    columns: [
                        { 
                            image: imgJata, 
                            width: 100, // Adjusted for better balance
                            alignment: 'left' 
                        },
                        {
                            stack: [
                                { text: 'SEKOLAH MENENGAH KEBANGSAAN TELOK MAS,', style: 'headerTitle', alignment: 'center' },
                                { text: 'TELOK MAS, 75460 MELAKA.', style: 'headerTitle', alignment: 'center' },
                                { text: 'Tel: 06-2615292  Faks: 0626194122  Email: mea-2098@yahoo.com', style: 'headerSub', alignment: 'center', margin: [0, 5, 0, 0] }
                            ],
                            width: '*',
                            margin: [-30, 15, 0, 0] // Pulls text left towards Jata without moving the Jata
                        },
                        { 
                            image: imgSchool, 
                            width: 50, 
                            alignment: 'right',
                            margin: [0, 0, 0, 0] 
                        }
                    ],
                    margin: [0, 0, 0, 10] 
                },
                
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5 }], margin: [0, 0, 0, 15] },

                // 2. RECIPIENT & DATE
                {
                    columns: [
                        {
                            stack: [
                                { text: 'Kepada,', style: 'bodyText' },
                                { text: `${parentName}`, bold: true, style: 'bodyText' },
                            ]
                        },
                        { text: `Tarikh: ${todayDate}`, alignment: 'right', style: 'bodyText' }
                    ]
                },

                { text: '\nTuan/Puan,', style: 'bodyText' },
                { text: 'PENYERTAAN PELAJAR DALAM PERTANDINGAN / LAWATAN AKTIVITI KOKURIKULUM.', bold: true, margin: [0, 5, 0, 5], style: 'bodyText' },
                
                {
                    text: [
                        'Berhubung dengan perkara di atas adalah dimaklumkan bahawa anak jagaan tuan/puan yang bernama ',
                        { text: p.nama_murid.toUpperCase(), bold: true },
                        ' (Tingkatan ',
                        { text: displayClass, bold: true },
                        ') telah terpilih untuk mengambil bahagian dalam aktiviti berikut:'
                    ],
                    style: 'bodyText', alignment: 'justify'
                },

                // 5. TOURNAMENT TABLE
                {
                    margin: [0, 10, 0, 10],
                    table: {
                        widths: ['auto', 'auto', '*', 'auto'],
                        headerRows: 1,
                        body: [
                            [
                                { text: 'TARIKH', style: 'tableHeader' },
                                { text: 'MASA', style: 'tableHeader' },
                                { text: 'NAMA AKTIVITI', style: 'tableHeader' },
                                { text: 'TEMPAT', style: 'tableHeader' }
                            ],
                            [
                                { text: tourney.date, style: 'tableCell' },
                                { text: tourney.time, style: 'tableCell' },
                                { text: tourney.name, style: 'tableCell' },
                                { text: tourney.venue, style: 'tableCell' }
                            ]
                        ]
                    }
                },

                { text: 'Guru Pengiring: HASMOL WATAN BIN SHAMSOL BAHRIN', style: 'bodyText', bold: true, margin: [0, -5, 0, 15] },
                { text: '2. Para pelajar dikehendaki mematuhi peraturan yang telah ditetapkan oleh pihak sekolah.', style: 'bodyText' },
                { text: '3. Pihak sekolah akan mengambil langkah-langkah keselamatan yang sewajarnya sebelum, semasa dan selepas aktiviti/program.', style: 'bodyText' },
                { text: '4. Sila penuhkan dan kembalikan keratan jawapan yang berkenaan.', style: 'bodyText' },
                { text: '\nSekian, terima kasih.', style: 'bodyText' },
                { text: '\n\n...........................................', style: 'bodyText' },
                { text: '(PENGETUA)', fontSize: 8, bold: true },

                // 8. FULL WIDTH CUT LINE
                {
                    margin: [0, 30, 0, 20],
                    stack: [
                        {
                            canvas: [{
                                type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1,
                                dash: { length: 5, space: 2 }
                            }]
                        },
                        { 
                            text: 'POTONG DI SINI', 
                            style: 'cutLine', 
                            margin: [0, -6, 0, 0],
                            background: 'white'
                        }
                    ]
                },

                // 9. BOTTOM REPLY SECTION
                {
                    columns: [
                        { width: 60, text: 'Nama:', style: 'bodyText' },
                        { width: '*', text: parentName, style: 'bodyText', bold: true }
                    ], margin: [0, 2, 0, 2]
                },
                {
                    columns: [
                        { width: 60, text: 'Alamat:', style: 'bodyText' },
                        { width: '*', text: parentAddress, style: 'bodyText' }
                    ], margin: [0, 2, 0, 2]
                },
                {
                    columns: [
                        { width: 60, text: 'No. Tel:', style: 'bodyText' },
                        { width: '*', text: parentPhone, style: 'bodyText' }
                    ], margin: [0, 2, 0, 15]
                },
                
                {
                    text: [
                        'Saya ', { text: parentName, bold: true },
                        ' ibu/bapa/penjaga kepada pelajar ', { text: p.nama_murid.toUpperCase(), bold: true },
                        ` dari tingkatan ${displayClass}. \n`,
                        'Membenarkan / Tidak Membenarkan anak jagaan saya menghadiri aktiviti ',
                        { text: tourney.name, bold: true }, ` pada tarikh ${tourney.date} dan memahami syarat-syarat yang dinyatakan.`
                    ],
                    style: 'bodyText', alignment: 'justify'
                },

                { text: '\nYang benar,', style: 'bodyText', margin: [0, 10, 0, 30] },
                { text: '...........................................', style: 'bodyText' },
                { text: `(${parentName})`, bold: true, style: 'bodyText' },
                { text: `Tarikh: ${todayDate}`, style: 'bodyText', fontSize: 9 }
            ];

            docDefinition.content.push(page);
            if (index < selectedPlayers.length - 1) {
                docDefinition.content.push({ text: '', pageBreak: 'after' });
            }
        });

const pdfDoc = pdfMake.createPdf(docDefinition);

// Check if the user is on mobile
if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
    pdfDoc.open(); // Opens in a new tab for native saving
} else {
    pdfDoc.download(`Consent_Forms_${tourney.name}.pdf`); // Standard download for PC
}
    } catch (err) {
        console.error("PDF Gen Error:", err);
        alert("An error occurred. Check the console for details.");
    } finally {
        btn.innerHTML = originalText;
        btn.style.opacity = "1";
    }
}
// Start the app
init();

