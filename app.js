const SHEET_URL = "https://raw.githubusercontent.com/waqiuddinazhad-cmd/AKRAM-players-database/refs/heads/main/data.json";
let students = [];
let activeAgeFilters = new Set();
let activeUnitFilters = new Set();
let selectionState = JSON.parse(localStorage.getItem('studentApp_selections')) || {};
let swiperInstance = null;

// --- INITIALIZATION ---
// --- INITIALIZATION ---
async function init() {
    try {
        const res = await fetch(SHEET_URL);
        const data = await res.json();
        
        // Map GitHub (English Keys) -> App (Malay Keys)
        students = data.map((item, index) => {
            // 1. Handle Key Variations (Case sensitivity)
            const name = item.name || item.Name || "Unknown";
            const nick = item.nickname || item.Nickname || "";
            const age = String(item.age || item.Age || "0");
            const rawUnit = String(item.unit || item.Unit || "").toLowerCase().trim();
            const pos = item.position || item.Position || "N/A";
            const img = item.image || item.Image || "";
            
            // 2. Unit Logic
            let clean = "nounit";
            if (rawUnit.includes("forward")) clean = "forwards";
            else if (rawUnit.includes("back")) clean = "backlines";
            else if (rawUnit.includes("scrum")) clean = "scrum-half";
            else if (rawUnit.includes("multi")) clean = "multi-role";

            // 3. Return object with YOUR APP'S expected keys
            return {
                id: item.id || `p-${index}`,
                nama_murid: name,           // Maps to s.nama_murid
                nama_samaran: nick,         // Maps to s.nama_samaran
                umur: age,                  // Maps to s.umur
                cleanUnit: clean,
                displayUnit: item.unit || item.Unit || "No Unit",
                position: pos,
                image: img,
                
                // Physical Stats mapping
                Weight: item.weight || item.Weight || "-",
                Height: item.height || item.Height || "-",
                '40m_sprint': item.sprint_40m || item['40m_sprint'] || "-",
                'T-test': item.t_test || item['T-test'] || "-",
                bodyweight_deadlift: item.deadlift || item.bodyweight_deadlift || "-",

                // Contact Info mapping
                nama_penjaga: item.guardian || item.nama_penjaga || "N/A",
                no_telefon_penjaga: item.guardian_phone || item.no_telefon_penjaga || "",
                alamat_rumah: item.address || item.alamat_rumah || ""
            };
        });

        setupFilters();
        renderCards();
    } catch (err) {
        console.error("Fetch Error:", err);
        document.getElementById('cardContainer').innerHTML = "<p>Failed to load data from GitHub.</p>";
    }
}
// --- FILTER SETUP ---
// --- UPDATED FILTER SETUP ---
function setupFilters() {
    // 1. Handle Age Chips
    const ageBox = document.getElementById('ageChips');
    const ages = [...new Set(students.map(s => s.umur))].filter(a => a !== "0").sort((a, b) => a - b);
    
    ageBox.innerHTML = '';
    ages.forEach(age => {
        const chip = document.createElement('div');
        // If this age is in our active set, give it the 'active' class immediately
        chip.className = `chip ${activeAgeFilters.has(age) ? 'active' : ''}`;
        chip.textContent = age + 'Y';
        
        chip.onclick = () => {
            // Update the Data
            if (activeAgeFilters.has(age)) activeAgeFilters.delete(age);
            else activeAgeFilters.add(age);
            
            // Re-draw EVERYTHING to ensure colors update
            setupFilters(); 
            renderCards();
        };
        ageBox.appendChild(chip);
    });

    // 2. Handle Unit Chips
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
        const matchesSearch = s.nama_murid.toLowerCase().includes(search) || (s.nama_samaran || "").toLowerCase().includes(search);
        const matchesAge = activeAgeFilters.size === 0 || activeAgeFilters.has(s.umur);
        const matchesUnit = activeUnitFilters.size === 0 || activeUnitFilters.has(s.cleanUnit);
        return matchesSearch && matchesAge && matchesUnit;
    });

    updateBottomBar(filtered.length);

    filtered.forEach(s => {
        const card = document.createElement('div');
        const status = selectionState[s.nama_murid.toUpperCase()] || 'available';
        card.className = `student-card ${status}`;
        let imgPath = s.image ? s.image.trim() : "";
        let finalSrc = imgPath !== "" ? (imgPath.startsWith('http') || imgPath.startsWith('assets/') ? imgPath : `assets/${imgPath}`) : `https://ui-avatars.com/api/?name=${s.nama_murid}&background=random`;

        card.innerHTML = `
            <div class="expand-btn" onclick="event.stopPropagation(); openProfile('${s.nama_murid}')">+</div>
            <img src="${finalSrc}" class="student-image" onerror="this.src='https://via.placeholder.com/150?text=No+Photo'">
            <div class="card-info">
                <div class="nickname">${(s.nama_samaran || s.nama_murid).toUpperCase()}</div>
                <div class="realname">${s.nama_murid.toUpperCase()}</div>
                <div class="class-unit">${s.displayUnit} • ${s.umur}YO</div>
            </div>
        `;

        card.onclick = () => {
            const currentStatus = selectionState[s.nama_murid.toUpperCase()] || 'available';
            if (currentStatus === 'available') selectionState[s.nama_murid.toUpperCase()] = 'selected';
            else if (currentStatus === 'selected') selectionState[s.nama_murid.toUpperCase()] = 'reserved';
            else delete selectionState[s.nama_murid.toUpperCase()];
            localStorage.setItem('studentApp_selections', JSON.stringify(selectionState));
            renderCards();
        };
        container.appendChild(card);
    });
}

// --- PROFILE EXPANSION (The Flexible Card) ---
window.openProfile = function(playerName) {
    const wrapper = document.getElementById('carouselWrapper');
    wrapper.innerHTML = ''; 
    const currentViewList = students.filter(s => {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const matchesSearch = s.nama_murid.toLowerCase().includes(search) || (s.nama_samaran || "").toLowerCase().includes(search);
        const matchesAge = activeAgeFilters.size === 0 || activeAgeFilters.has(s.umur);
        const matchesUnit = activeUnitFilters.size === 0 || activeUnitFilters.has(s.cleanUnit);
        return matchesSearch && matchesAge && matchesUnit;
    });

    currentViewList.forEach(s => {
        const w = parseFloat(s.Weight) || 0;
        const h = parseFloat(s.Height) / 100 || 0;
        const bmi = (w > 0 && h > 0) ? (w / (h * h)).toFixed(1) : "-";
        let rawPhone = String(s.no_telefon_penjaga || "").replace(/\D/g,'');
        if (rawPhone.startsWith('0')) rawPhone = '6' + rawPhone;
        const waLink = `https://wa.me/${rawPhone}?text=Salam,%20saya%20jurulatih%20ragbi%20${s.nama_murid}`;
        let imgPath = s.image ? s.image.trim() : "";
        let finalSrc = imgPath !== "" ? (imgPath.startsWith('http') || imgPath.startsWith('assets/') ? imgPath : `assets/${imgPath}`) : `https://ui-avatars.com/api/?name=${s.nama_murid}&background=random`;

        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        slide.innerHTML = `
            <div class="profile-card" onclick="event.stopPropagation()">
                <div class="profile-header-main">
                    <img src="${finalSrc}" onerror="this.src='https://via.placeholder.com/150?text=No+Photo'">
                    <div>
                        <h2 style="font-size: 1.8rem; margin:0;">${s.nama_murid.toUpperCase()}</h2>
                        <p style="color:#f59e0b; font-weight:800; font-size:1rem; margin-top:5px;">${(s.position || "N/A").toUpperCase()}</p>
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
                            <div class="data-item"><span class="data-val">${s['40m_sprint'] || '-'}s</span><span class="data-lbl">Sprint</span></div>
                            <div class="data-item"><span class="data-val">${s['T-test'] || '-'}s</span><span class="data-lbl">T-Test</span></div>
                            <div class="data-item"><span class="data-val">${s.bodyweight_deadlift || '-'}kg</span><span class="data-lbl">Deadlift</span></div>
                        </div>
                    </div>
                </div>
                <div class="guardian-info-section" style="background: #f8fafc; padding: 15px; border-radius: 12px;">
                    <div style="font-weight: 800; margin-bottom: 10px;">👤 ${s.nama_penjaga || 'N/A'}</div>
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
    swiperInstance = new Swiper(".mySwiper", {
        initialSlide: currentViewList.findIndex(p => p.nama_murid === playerName),
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
    if (confirm("Reset all?")) { localStorage.removeItem('studentApp_selections'); location.reload(); }
});

init();

