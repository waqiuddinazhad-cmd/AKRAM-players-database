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
        console.log("Attempting to fetch from GitHub:", SHEET_URL);
        const res = await fetch(SHEET_URL);
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log("Data successfully received:", data);

        // Map the data EXACTLY as it comes from your JSON (Malay keys intact)
        students = data.map((s, index) => {
            let raw = s.unit ? String(s.unit).toLowerCase().trim() : "";
            let clean = "nounit";
            if (raw.includes("forward")) clean = "forwards";
            else if (raw.includes("back")) clean = "backlines";
            else if (raw.includes("scrum")) clean = "scrum-half";
            else if (raw.includes("multi")) clean = "multi-role";
            
            return {
                ...s, // This keeps ALL your original columns perfectly intact!
                id: s.id || `p-${index}`,
                cleanUnit: clean,
                displayUnit: s.unit || "No Unit",
                umur: s.umur ? String(s.umur).trim() : "0"
            };
        });

        setupFilters();
        renderCards();

    } catch (err) {
        console.error("DETAILED ERROR:", err);
        document.getElementById('cardContainer').innerHTML = `
            <div style="text-align:center; padding:20px; color:red;">
                <p>⚠️ Failed to load data from GitHub.</p>
                <small>${err.message}</small>
            </div>`;
    }
}

// --- FILTER SETUP ---
function setupFilters() {
    const ageBox = document.getElementById('ageChips');
    const ages = [...new Set(students.map(s => s.umur))].filter(a => a !== "0").sort((a, b) => a - b);
    
    ageBox.innerHTML = '';
    ages.forEach(age => {
        const chip = document.createElement('div');
        chip.className = `chip ${activeAgeFilters.has(age) ? 'active' : ''}`;
        chip.textContent = age + 'Y';
        
        chip.onclick = () => {
            if (activeAgeFilters.has(age)) activeAgeFilters.delete(age);
            else activeAgeFilters.add(age);
            setupFilters(); 
            renderCards();
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
            if (activeUnitFilters.has(key)) activeUnitFilters.delete(key);
            else activeUnitFilters.add(key);
            setupFilters(); 
            renderCards();
        };
        unitBox.appendChild(chip);
    });
}

// --- RENDER MAIN CARDS ---
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
        const safeNamaMurid = s.nama_murid || "UNKNOWN";
        const safeNamaSamaran = s.nama_samaran || safeNamaMurid;
        
        const status = selectionState[safeNamaMurid.toUpperCase()] || 'available';
        card.className = `student-card ${status}`;
        
        let imgPath = s.image ? String(s.image).trim() : "";
        let finalSrc = imgPath !== "" ? (imgPath.startsWith('http') || imgPath.startsWith('assets/') ? imgPath : `assets/${imgPath}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(safeNamaMurid)}&background=random`;

        card.innerHTML = `
            <div class="expand-btn" onclick="event.stopPropagation(); openProfile('${safeNamaMurid.replace(/'/g, "\\'")}')">+</div>
            <img src="${finalSrc}" class="student-image" onerror="this.src='https://via.placeholder.com/150?text=No+Photo'">
            <div class="card-info">
                <div class="nickname">${safeNamaSamaran.toUpperCase()}</div>
                <div class="realname">${safeNamaMurid.toUpperCase()}</div>
                <div class="class-unit">${s.displayUnit} • ${s.umur}YO</div>
            </div>
        `;

        card.onclick = () => {
            const currentStatus = selectionState[safeNamaMurid.toUpperCase()] || 'available';
            if (currentStatus === 'available') selectionState[safeNamaMurid.toUpperCase()] = 'selected';
            else if (currentStatus === 'selected') selectionState[safeNamaMurid.toUpperCase()] = 'reserved';
            else delete selectionState[safeNamaMurid.toUpperCase()];
            
            localStorage.setItem('studentApp_selections', JSON.stringify(selectionState));
            renderCards();
        };
        container.appendChild(card);
    });
}

// --- PROFILE EXPANSION ---
window.openProfile = function(playerName) {
    const wrapper = document.getElementById('carouselWrapper');
    wrapper.innerHTML = ''; 
    
    const currentViewList = students.filter(s => {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const matchesSearch = (s.nama_murid || "").toLowerCase().includes(search) || (s.nama_samaran || "").toLowerCase().includes(search);
        const matchesAge = activeAgeFilters.size === 0 || activeAgeFilters.has(s.umur);
        const matchesUnit = activeUnitFilters.size === 0 || activeUnitFilters.has(s.cleanUnit);
        return matchesSearch && matchesAge && matchesUnit;
    });

    currentViewList.forEach(s => {
        const safeNamaMurid = s.nama_murid || "UNKNOWN";
        const w = parseFloat(s.Weight) || 0;
        const h = parseFloat(s.Height) / 100 || 0;
        const bmi = (w > 0 && h > 0) ? (w / (h * h)).toFixed(1) : "-";
        
        let rawPhone = String(s.no_telefon_penjaga || "").replace(/\D/g,'');
        if (rawPhone.startsWith('0')) rawPhone = '6' + rawPhone;
        const waLink = `https://wa.me/${rawPhone}?text=Salam,%20saya%20jurulatih%20ragbi%20${encodeURIComponent(safeNamaMurid)}`;
        
        let imgPath = s.image ? String(s.image).trim() : "";
        let finalSrc = imgPath !== "" ? (imgPath.startsWith('http') || imgPath.startsWith('assets/') ? imgPath : `assets/${imgPath}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(safeNamaMurid)}&background=random`;

        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        slide.innerHTML = `
            <div class="profile-card" onclick="event.stopPropagation()">
                <div class="profile-header-main">
                    <img src="${finalSrc}" onerror="this.src='https://via.placeholder.com/150?text=No+Photo'">
                    <div>
                        <h2 style="font-size: 1.8rem; margin:0;">${safeNamaMurid.toUpperCase()}</h2>
                        <p style="color:#f59e0b; font-weight:800; font-size:1rem; margin-top:5px;">${(s.position || s.Position || "N/A").toUpperCase()}</p>
                    </div>
                </div>
                <div class="stats-container">
                    <div class="profile-section">
                        <div class="section-label">Physical Stats</div>
                        <div class="data-grid-3">
                            <div class="data-item"><span class="data-val">${s.Weight || '-'}kg</span><span class="data-lbl">Weight</span></div>
                            <div class="data-item"><span class="data-val">${s.Height || '-'}cm</span><span class="data-lbl">Height</span></div>
                            <div class="data-item"><span class="data-val">${bmi}</span><span class="data-lbl">BMI</span></div>
                        </div>
                    </div>
                    <div class="profile-section">
                        <div class="section-label">Performance Metrics</div>
                        <div class="data-grid-3">
                            <div class="data-item"><span class="data-val">${s['40m_sprint'] || s.sprint_40m || '-'}s</span><span class="data-lbl">Sprint</span></div>
                            <div class="data-item"><span class="data-val">${s['T-test'] || s.t_test || '-'}s</span><span class="data-lbl">T-Test</span></div>
                            <div class="data-item"><span class="data-val">${s.bodyweight_deadlift || s.deadlift || '-'}kg</span><span class="data-lbl">Deadlift</span></div>
                        </div>
                    </div>
                </div>
                <div class="guardian-info-section" style="background: #f8fafc; padding: 15px; border-radius: 12px;">
                    <div style="font-weight: 800; margin-bottom: 10px;">👤 ${s.nama_penjaga || s.guardian || 'N/A'}</div>
                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <a href="tel:${s.no_telefon_penjaga}" class="btn-summary" style="flex:1; text-align:center; text-decoration:none;">📞 Call</a>
                        <a href="${waLink}" target="_blank" class="btn-summary" style="flex:1; text-align:center; background:#25d366; text-decoration:none;">💬 WhatsApp</a>
                    </div>
                    <div style="text-align:center;">
                        <div class="copy-badge" style="width:100%; box-sizing:border-box;" onclick="copyToClipboard('${s.no_telefon_penjaga}', 'Phone')">📱 ${s.no_telefon_penjaga || 'N/A'}</div>
                        <div class="address-text" style="margin-top:10px;" onclick="copyToClipboard('${(s.alamat_rumah || "").toUpperCase()}', 'Address')">📍 ${(s.alamat_rumah || 'NO ADDRESS').toUpperCase()}</div>
                    </div>
                </div>
            </div>`;
        wrapper.appendChild(slide);
    });

    document.getElementById('profileModal').style.display = 'flex';
    if (swiperInstance) swiperInstance.destroy();
    
    const index = currentViewList.findIndex(p => p.nama_murid === playerName);
    swiperInstance = new Swiper(".mySwiper", {
        initialSlide: index !== -1 ? index : 0,
        spaceBetween: 20,
        pagination: { el: ".swiper-pagination", clickable: true },
    });
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

window.copyToClipboard = function(text, label) {
    if (!text || text === 'undefined' || text === '') return;
    const el = event.currentTarget; 
    const originalHTML = el.innerHTML;
    navigator.clipboard.writeText(text).then(() => {
        el.innerHTML = "✅ COPIED";
        el.style.color = "#16a34a";
        setTimeout(() => { el.innerHTML = originalHTML; el.style.color = ""; }, 1500);
    });
};

window.closeProfile = function() {
    document.getElementById('profileModal').style.display = 'none';
    if (swiperInstance) { swiperInstance.destroy(); swiperInstance = null; }
};

window.closeProfileOnBackground = function(event) {
    if (event.target.id === 'profileModal' || event.target.classList.contains('swiper-wrapper')) closeProfile();
};

// --- EVENT LISTENERS ---
document.getElementById('searchInput').addEventListener('input', renderCards);
document.getElementById('btnResetIndex').addEventListener('click', () => {
    if (confirm("Reset all selections?")) { 
        localStorage.removeItem('studentApp_selections'); 
        location.reload(); 
    }
});

// Start the App
init();
