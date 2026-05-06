// Initialize the map
let map;
let markers = [];
let allProjects = communitySolarProjects;
let welcomeContent = '';

// State decarbonization goals (Source: CESA 100% Clean Energy Collaborative)
const stateDecarbGoals = {
    "California": { target: "100% carbon-free electricity", year: 2045, type: "Mandate" },
    "Colorado": { target: "100% carbon-free electricity (Xcel Energy)", year: 2050, type: "Mandate" },
    "Connecticut": { target: "100% carbon-free electricity", year: 2040, type: "Mandate" },
    "Delaware": { target: "100% GHG reduction", year: 2050, type: "Mandate" },
    "District of Columbia": { target: "100% renewable energy", year: 2032, type: "Mandate" },
    "Hawaii": { target: "100% renewable energy", year: 2045, type: "Mandate" },
    "Illinois": { target: "100% clean energy", year: 2050, type: "Mandate" },
    "Louisiana": { target: "Net-zero GHG emissions", year: 2050, type: "Goal" },
    "Maine": { target: "100% clean energy", year: 2050, type: "Mandate" },
    "Maryland": { target: "Net-zero GHG emissions", year: 2045, type: "Mandate" },
    "Massachusetts": { target: "Net-zero GHG emissions", year: 2050, type: "Mandate" },
    "Michigan": { target: "100% carbon-free electricity", year: 2040, type: "Mandate" },
    "Minnesota": { target: "100% carbon-free electricity", year: 2040, type: "Mandate" },
    "Nebraska": { target: "Net-zero carbon emissions", year: 2050, type: "Mandate" },
    "Nevada": { target: "100% carbon-free electricity", year: 2050, type: "Mandate" },
    "New Jersey": { target: "100% carbon-free electricity", year: 2035, type: "Mandate" },
    "New Mexico": { target: "100% carbon-free electricity", year: 2045, type: "Mandate" },
    "New York": { target: "100% carbon-free electricity", year: 2040, type: "Mandate" },
    "North Carolina": { target: "Carbon neutrality (electricity)", year: 2050, type: "Mandate" },
    "Oregon": { target: "100% GHG reduction below baseline", year: 2040, type: "Mandate" },
    "Rhode Island": { target: "100% renewable energy electricity", year: 2033, type: "Mandate" },
    "Vermont": { target: "100% renewable energy", year: 2035, type: "Mandate" },
    "Virginia": { target: "100% carbon-free electricity", year: 2050, type: "Mandate" },
    "Washington": { target: "100% zero-emissions electricity", year: 2045, type: "Mandate" },
    "Wisconsin": { target: "100% carbon-free electricity", year: 2050, type: "Goal" }
};

// US state abbreviation → full name lookup
const stateNames = {
    "AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California",
    "CO":"Colorado","CT":"Connecticut","DE":"Delaware","DC":"District of Columbia",
    "FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois",
    "IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana",
    "ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota",
    "MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada",
    "NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York",
    "NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon",
    "PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota",
    "TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia",
    "WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"
};

function getStateName(project) {
    // project.state may be a 2-letter code or a full name
    const s = project.state;
    if (!s || s === 'Unknown') return null;
    if (s.length === 2) return stateNames[s.toUpperCase()] || null;
    return s;
}

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    addMarkersToMap(allProjects);
    setupEventListeners();
    setupResizeHandle();
    welcomeContent = document.getElementById('info-panel').innerHTML;
});

// Draggable resize handle between map and info panel
function setupResizeHandle() {
    const handle = document.getElementById('resize-handle');
    const container = document.getElementById('main-content');
    let isDragging = false;

    handle.addEventListener('mousedown', function(e) {
        isDragging = true;
        handle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        const containerRect = container.getBoundingClientRect();
        const offsetX = e.clientX - containerRect.left;
        const totalWidth = containerRect.width;
        const minMap = 300;
        const minPanel = 250;
        if (offsetX < minMap || offsetX > totalWidth - minPanel) return;
        const mapFr = offsetX / totalWidth;
        const panelFr = 1 - mapFr;
        container.style.gridTemplateColumns = `${mapFr}fr 6px ${panelFr}fr`;
        map.invalidateSize();
    });

    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            handle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            map.invalidateSize();
        }
    });
}

function initMap() {
    map = L.map('map', { zoomControl: true }).setView([39.8283, -98.5795], 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Legend
    const legend = L.control({ position: 'bottomleft' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <div class="legend-title">Utility Type</div>
            <div class="legend-row"><span class="legend-dot" style="background:#10b981"></span> Electric Cooperative</div>
            <div class="legend-row"><span class="legend-dot" style="background:#3b82f6"></span> Investor-Owned Utility</div>
            <div class="legend-row"><span class="legend-dot" style="background:#f59e0b"></span> Municipal Utility</div>
            <div class="legend-row"><span class="legend-dot" style="background:#8b5cf6"></span> Consumer-Owned Utility</div>
            <div class="legend-row"><span class="legend-dot" style="background:#6b7280"></span> Other</div>
        `;
        return div;
    };
    legend.addTo(map);
}

function addMarkersToMap(projects) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    projects.forEach(project => {
        const color = getMarkerColor(project.utilityType);

        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-pin" style="
                background-color: ${color};
                width: 14px;
                height: 14px;
                border-radius: 50%;
                border: 2.5px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                transition: transform 0.2s ease;
            "></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        const marker = L.marker([project.lat, project.lng], { icon: customIcon }).addTo(map);

        const sizeMw = project.sizeMwAc != null
            ? `${project.sizeMwAc} MW-AC`
            : 'Size unknown';

        const tooltipContent = `
            <strong>${project.name}</strong><br>
            ${project.location}<br>
            <em>${getUtilityTypeName(project.utilityType)}</em><br>
            ${sizeMw}${project.yearOfInterconnection ? ' · ' + project.yearOfInterconnection : ''}
        `;

        marker.bindTooltip(tooltipContent, { permanent: false, direction: 'top', offset: [0, -10] });
        marker.bindPopup(tooltipContent);
        marker.on('click', function() { showProjectDetails(project); });

        markers.push(marker);
    });
}

function showProjectDetails(project) {
    const infoPanel = document.getElementById('info-panel');
    const show = (v) => v && v !== 'Unknown' && v !== '' && v !== null && v !== undefined;

    const stateName = getStateName(project);
    const stateGoal = stateName ? stateDecarbGoals[stateName] : null;

    let sectionsHtml = '';

    // Project Overview
    sectionsHtml += `
        <div class="detail-section">
            <h4>Project Overview</h4>
            <p><strong>Location:</strong> ${project.location}</p>
            ${show(project.address) ? `<p><strong>Address:</strong> ${project.address}</p>` : ''}
            ${show(project.yearOfInterconnection) ? `<p><strong>Year of Interconnection:</strong> ${project.yearOfInterconnection}</p>` : ''}
        </div>
    `;

    // Utility Information
    sectionsHtml += `
        <div class="detail-section">
            <h4>Utility Information</h4>
            ${show(project.utility) ? `<p><strong>Utility:</strong> ${project.utility}</p>` : ''}
            ${show(project.utilityTypeName) ? `<p><strong>Utility Type:</strong> ${project.utilityTypeName}</p>` : ''}
            ${show(project.basicStructure) ? `<p><strong>Basic Structure:</strong> ${project.basicStructure}</p>` : ''}
        </div>
    `;

    // System Size
    if (project.sizeMwAc != null || project.sizeMwDc != null) {
        sectionsHtml += `
            <div class="detail-section">
                <h4>System Size</h4>
                ${project.sizeMwAc != null ? `<p><strong>AC Capacity:</strong> ${project.sizeMwAc} MW-AC</p>` : ''}
                ${project.sizeMwDc != null ? `<p><strong>DC Capacity:</strong> ${project.sizeMwDc} MW-DC</p>` : ''}
                <p><strong>Scale:</strong> ${getSizeCategoryLabel(project.sizeCategory)}</p>
            </div>
        `;
    }

    // State Decarbonization Goal
    sectionsHtml += `
        <div class="detail-section state-goal-section">
            <h4>State Decarbonization Goal</h4>
            ${stateGoal
                ? `<p><strong>${stateName}</strong> has a <strong>${stateGoal.type.toLowerCase()}</strong> for <strong>${stateGoal.target}</strong> by <strong>${stateGoal.year}</strong>.</p>`
                : `<p>${stateName || 'This state'} does not currently have a tracked 100% clean energy target.</p>`
            }
        </div>
    `;

    infoPanel.innerHTML = `
        <div class="project-details">
            <button class="back-button" onclick="showWelcome()">← Back to Overview</button>
            <h3>${project.name}</h3>
            <div class="system-type-info">
                <span class="system-badge ${project.utilityType}">${getUtilityTypeName(project.utilityType)}</span>
                <p class="system-type-explainer">${getUtilityTypeExplanation(project.utilityType)}</p>
            </div>
            ${sectionsHtml}
        </div>
    `;
}

function showWelcome() {
    document.getElementById('info-panel').innerHTML = welcomeContent;
}

function setupEventListeners() {
    document.getElementById('utility-type').addEventListener('change', filterProjects);
    document.getElementById('size-filter').addEventListener('change', filterProjects);
    document.getElementById('year-filter').addEventListener('change', filterProjects);
    document.getElementById('search').addEventListener('input', filterProjects);
}

function filterProjects() {
    const utilityType = document.getElementById('utility-type').value;
    const sizeFilter  = document.getElementById('size-filter').value;
    const yearFilter  = document.getElementById('year-filter').value;
    const searchTerm  = document.getElementById('search').value.toLowerCase();

    let filtered = allProjects;

    if (utilityType !== 'all') {
        filtered = filtered.filter(p => p.utilityType === utilityType);
    }
    if (sizeFilter !== 'all') {
        filtered = filtered.filter(p => p.sizeCategory === sizeFilter);
    }
    if (yearFilter !== 'all') {
        const [from, to] = yearFilter.split('-').map(Number);
        filtered = filtered.filter(p => {
            const y = p.yearOfInterconnection;
            return y && y >= from && y <= (to || 9999);
        });
    }
    if (searchTerm) {
        filtered = filtered.filter(p =>
            (p.name     || '').toLowerCase().includes(searchTerm) ||
            (p.location || '').toLowerCase().includes(searchTerm) ||
            (p.utility  || '').toLowerCase().includes(searchTerm)
        );
    }

    addMarkersToMap(filtered);

    if (filtered.length === 1) {
        showProjectDetails(filtered[0]);
        map.setView([filtered[0].lat, filtered[0].lng], 10);
    }
}

// ── Helper functions ────────────────────────────────────────────────

function getSizeCategoryLabel(cat) {
    return { small: 'Small (< 1 MW)', medium: 'Medium (1–10 MW)', large: 'Large (10+ MW)', unknown: 'Unknown' }[cat] || cat;
}

function getUtilityTypeExplanation(type) {
    const explanations = {
        'cooperative':    'A member-owned electric cooperative — subscribers are often co-op members sharing the output of the solar project.',
        'investor-owned': 'A privately held, investor-owned utility that offers community solar subscriptions to customers in its service territory.',
        'municipal':      'A city- or county-owned utility providing locally governed community solar options to residents and businesses.',
        'consumer-owned': 'A consumer-owned utility (such as a public utility district) structured to serve its customers rather than outside investors.',
        'other':          'A utility or project structure that does not fit neatly into the standard categories above.',
    };
    return explanations[type] || '';
}
