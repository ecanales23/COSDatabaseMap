// Initialize the map
let map;
let markers = [];
let allSystems = geothermalSystems;
let welcomeContent = ''; // Store original welcome content

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

// Extract state from location string (e.g., "Bismarck, North Dakota" -> "North Dakota")
function getStateFromLocation(location) {
    if (!location) return null;
    const parts = location.split(',');
    if (parts.length >= 2) {
        return parts[parts.length - 1].trim();
    }
    return null;
}

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    addMarkersToMap(allSystems);
    setupEventListeners();
    setupResizeHandle();
    // Store the original welcome content
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
    // Initialize the map centered on the continental US
    map = L.map('map', {
        zoomControl: true
    }).setView([39.8283, -98.5795], 4);

    // Use CartoDB Positron for a clean, minimal map style
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Add legend to map
    const legend = L.control({ position: 'bottomleft' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <div class="legend-title">System Types</div>
            <div class="legend-row"><span class="legend-dot" style="background:#10b981"></span> Individual GSHP</div>
            <div class="legend-row"><span class="legend-dot" style="background:#3b82f6"></span> 4th Gen District H&C</div>
            <div class="legend-row"><span class="legend-dot" style="background:#f59e0b"></span> 5th Gen District H&C</div>
        `;
        return div;
    };
    legend.addTo(map);
}

function addMarkersToMap(systems) {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // Add new markers
    systems.forEach(system => {
        const markerColor = getMarkerColor(system.systemType);

        // Create custom marker icon - clean, modern style
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-pin" style="
                background-color: ${markerColor};
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

        const marker = L.marker([system.lat, system.lng], { icon: customIcon })
            .addTo(map);

        // Add tooltip for hover (shows on mouse over)
        const tooltipContent = `
            <strong>${system.name}</strong><br>
            ${system.location}<br>
            <em>${getSystemTypeName(system.systemType)}</em>
        `;
        marker.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            offset: [0, -10]
        });

        // Add popup with basic info (shows on click)
        marker.bindPopup(tooltipContent);

        // Add click event to show details in info panel
        marker.on('click', function() {
            showSystemDetails(system);
        });

        markers.push(marker);
    });
}

function showSystemDetails(system) {
    const infoPanel = document.getElementById('info-panel');

    // Helper function to show field if not "Unknown"
    const showField = (value) => value && value !== 'Unknown' && value !== 'N/A';

    // Build sections conditionally
    let sectionsHtml = '';

    // Project Overview
    sectionsHtml += `
        <div class="detail-section">
            <h4>Project Overview</h4>
            <p><strong>Location:</strong> ${system.location}</p>
            <p><strong>Status:</strong> ${system.status}</p>
            ${showField(system.siteType) ? `<p><strong>Site Type:</strong> ${system.siteType}</p>` : ''}
            ${showField(system.capacity) ? `<p><strong>Capacity:</strong> ${system.capacity}</p>` : ''}
        </div>
    `;

    // State Decarbonization Goal
    const stateName = getStateFromLocation(system.location);
    const stateGoal = stateName ? stateDecarbGoals[stateName] : null;
    sectionsHtml += `
        <div class="detail-section state-goal-section">
            <h4>State Decarbonization Goal</h4>
            ${stateGoal
                ? `<p><strong>${stateName}</strong> has a <strong>${stateGoal.type.toLowerCase()}</strong> for <strong>${stateGoal.target}</strong> by <strong>${stateGoal.year}</strong>.</p>`
                : `<p>${stateName || 'This state'} does not currently have a 100% clean energy target.</p>`
            }
        </div>
    `;

    // Scale & Impact
    if (showField(system.buildings) || showField(system.households) || showField(system.population)) {
        sectionsHtml += `
            <div class="detail-section">
                <h4>Scale & Impact</h4>
                ${showField(system.buildings) ? `<p><strong>Buildings:</strong> ${system.buildings}</p>` : ''}
                ${showField(system.households) ? `<p><strong>Households:</strong> ${system.households}</p>` : ''}
                ${showField(system.population) ? `<p><strong>Population Served:</strong> ${system.population}</p>` : ''}
            </div>
        `;
    }

    // Benefits
    if (showField(system.emissionsBenefits) || showField(system.operationalSuccesses)) {
        sectionsHtml += `
            <div class="detail-section">
                <h4>Quantified Benefits</h4>
                ${showField(system.emissionsBenefits) ? `<p><strong>Emissions:</strong> ${system.emissionsBenefits}</p>` : ''}
                ${showField(system.operationalSuccesses) ? `<p><strong>Operational Successes:</strong> ${system.operationalSuccesses}</p>` : ''}
            </div>
        `;
    }

    // Technical Details - with explanatory context
    if (showField(system.heatPump) || showField(system.thermalResources) || showField(system.distribution)) {
        sectionsHtml += `
            <div class="detail-section">
                <h4>Technical Details</h4>
                <p class="section-explainer">How this system captures and distributes geothermal energy:</p>
                ${showField(system.heatPump) ? `
                    <div class="tech-item">
                        <p><strong>Heat Pump Type:</strong> ${system.heatPump}</p>
                        <p class="tech-explainer">${getHeatPumpExplanation(system.heatPump)}</p>
                    </div>
                ` : ''}
                ${showField(system.thermalResources) ? `
                    <div class="tech-item">
                        <p><strong>Underground Infrastructure:</strong> ${system.thermalResources}</p>
                        <p class="tech-explainer">These are the boreholes and underground loops that exchange heat with the earth's stable temperature.</p>
                    </div>
                ` : ''}
                ${showField(system.distribution) ? `
                    <div class="tech-item">
                        <p><strong>Distribution Network:</strong> ${system.distribution}</p>
                        <p class="tech-explainer">The pipe network that carries heated or cooled water to connected buildings.</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Financial Details
    if (showField(system.cost) || showField(system.funding) || showField(system.subscription)) {
        sectionsHtml += `
            <div class="detail-section">
                <h4>Financial Details</h4>
                ${showField(system.cost) ? `<p><strong>Total Cost:</strong> ${system.cost}</p>` : ''}
                ${showField(system.funding) ? `<p><strong>Funding:</strong> ${system.funding}</p>` : ''}
                ${showField(system.subscription) ? `<p><strong>Subscription Info:</strong> ${system.subscription}</p>` : ''}
            </div>
        `;
    }

    // Ownership
    if (showField(system.ownership)) {
        sectionsHtml += `
            <div class="detail-section">
                <h4>Ownership Model</h4>
                <p>${system.ownership}</p>
            </div>
        `;
    }

    // Additional Information
    if (showField(system.additionalInfo)) {
        sectionsHtml += `
            <div class="detail-section">
                <h4>Additional Information</h4>
                <p>${system.additionalInfo}</p>
            </div>
        `;
    }

    // Resources (sources only)
    if (showField(system.sources)) {
        sectionsHtml += `
            <div class="resources">
                <h4>Resources</h4>
                <p><strong>Sources:</strong> ${system.sources}</p>
            </div>
        `;
    }

    // Get system type explanation
    const systemExplanation = getSystemTypeExplanation(system.systemType);

    infoPanel.innerHTML = `
        <div class="project-details">
            <button class="back-button" onclick="showWelcome()">← Back to Overview</button>
            <h3>${system.name}</h3>
            <div class="system-type-info">
                <span class="system-badge ${system.systemType}">${getSystemTypeName(system.systemType)}</span>
                <p class="system-type-explainer">${systemExplanation.simple}</p>
            </div>
            ${sectionsHtml}
        </div>
    `;
}

// Function to show welcome/overview content
function showWelcome() {
    const infoPanel = document.getElementById('info-panel');
    infoPanel.innerHTML = welcomeContent;
}

function setupEventListeners() {
    // Filter by system type
    const systemTypeFilter = document.getElementById('system-type');
    systemTypeFilter.addEventListener('change', filterSystems);

    // Filter by status
    const statusFilter = document.getElementById('status-filter');
    statusFilter.addEventListener('change', filterSystems);

    // Search functionality
    const searchInput = document.getElementById('search');
    searchInput.addEventListener('input', filterSystems);
}

// Categorize a status string into a simple category
function getStatusCategory(status) {
    const s = status.toLowerCase();
    if (s.startsWith('operating')) return 'operating';
    if (s.startsWith('under construction') || s.startsWith('construction') || s.startsWith('designed')) return 'construction';
    if (s.startsWith('design phase')) return 'design';
    if (s.startsWith('pre construction') || s.includes('feasibility')) return 'feasibility';
    if (s.includes('decommissioned') || s.includes('decomissioned') || s.includes('no longer operating')) return 'decommissioned';
    return 'unknown';
}

function filterSystems() {
    const systemType = document.getElementById('system-type').value;
    const statusFilter = document.getElementById('status-filter').value;
    const searchTerm = document.getElementById('search').value.toLowerCase();

    let filteredSystems = allSystems;

    // Filter by system type
    if (systemType !== 'all') {
        filteredSystems = filteredSystems.filter(system => system.systemType === systemType);
    }

    // Filter by status
    if (statusFilter !== 'all') {
        filteredSystems = filteredSystems.filter(system => getStatusCategory(system.status) === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
        filteredSystems = filteredSystems.filter(system =>
            system.name.toLowerCase().includes(searchTerm) ||
            system.location.toLowerCase().includes(searchTerm) ||
            system.description.toLowerCase().includes(searchTerm)
        );
    }

    // Update markers on map
    addMarkersToMap(filteredSystems);

    // If only one result, show its details
    if (filteredSystems.length === 1) {
        showSystemDetails(filteredSystems[0]);
        map.setView([filteredSystems[0].lat, filteredSystems[0].lng], 10);
    }
}

function formatKey(key) {
    // Convert camelCase to Title Case
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
}

// Get plain-language explanation for heat pump types
function getHeatPumpExplanation(heatPumpType) {
    const type = heatPumpType.toLowerCase();

    if (type.includes('gshp') || type.includes('ground source')) {
        return 'Ground Source Heat Pumps use pipes buried underground to transfer heat. In winter, they extract warmth from the earth; in summer, they deposit heat back into the ground. They use 25-50% less electricity than conventional heating/cooling.';
    }
    if (type.includes('water source') || type.includes('wshp')) {
        return 'Water Source Heat Pumps connect to a shared water loop. They extract or reject heat to this common water system, allowing buildings to share thermal energy efficiently.';
    }
    if (type.includes('air source') || type.includes('ashp')) {
        return 'Air Source Heat Pumps extract heat from outdoor air. While less efficient than ground source in extreme temperatures, they are simpler to install.';
    }
    return 'Heat pumps move thermal energy between the building and an external source, providing both heating and cooling with high efficiency.';
}

// Get detailed explanation for system types
function getSystemTypeExplanation(systemType) {
    const explanations = {
        'gshp': {
            name: 'Individual Ground Source Heat Pump',
            simple: 'A single building uses underground pipes to heat and cool itself.',
            detail: 'This system serves one building with its own dedicated underground loop. Pipes are buried in the ground where temperatures stay constant year-round (around 50-55°F). The heat pump extracts warmth in winter and deposits excess heat in summer.'
        },
        '4gdhc': {
            name: '4th Generation District Heating & Cooling',
            simple: 'A central plant provides heating and cooling to multiple buildings through shared pipes.',
            detail: 'This district system uses a central energy station with large heat pumps that heat or cool water to moderate temperatures (around 120-160°F for heating). This water is distributed through underground pipes to serve multiple buildings, which is more efficient than each building having its own system.'
        },
        '5gdhc': {
            name: '5th Generation District Heating & Cooling',
            simple: 'Buildings share a common underground water loop and can exchange heat with each other.',
            detail: 'The most advanced district system: buildings connect to a shared ambient temperature water loop (60-80°F). Each building has its own heat pump to extract what it needs. The key innovation is that buildings can share thermal energy - a building needing cooling can send its excess heat to one that needs heating, dramatically improving overall efficiency.'
        }
    };
    return explanations[systemType] || { name: systemType, simple: '', detail: '' };
}
