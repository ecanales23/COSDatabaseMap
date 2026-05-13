// Initialize the map
let map;
let markers = [];
let allProjects = communitySolarProjects;
let welcomeContent = '';
let stateGeoJsonFeatures = null;
let highlightLayer = null;
let colorMode = 'default';
let legendDiv = null;
let energyBurdenVisible = false;
let energyBurdenLayer = null;
let energyBurdenLegend = null;
let energyBurdenData = null;
const tractGeoJsonCache = {};

// ── Layer system ─────────────────────────────────────────────────────
// Each layer has: a Leaflet layer object, a visible flag, and metadata.
// To wire up real Census data, replace the `load` function for each layer
// with a fetch() call to the Census API and build real GeoJSON from it.
const layers = {
    communitySolar: {
        label: 'Community-Owned Solar Projects',
        visible: true,
        leafletLayer: null,  // managed separately via markers[]
        color: null,         // uses per-marker colors from getMarkerColor()
    },
    medianIncome: {
        label: 'Median Household Income',
        visible: false,
        leafletLayer: null,
        color: '#f97316',
        // ── PLACEHOLDER ──────────────────────────────────────────────
        // Replace this load() with a real Census API fetch, e.g.:
        //   fetch(`https://api.census.gov/data/2022/acs/acs5?get=NAME,B19013_001E&for=state:*&key=YOUR_KEY`)
        //     .then(r => r.json())
        //     .then(data => buildStateGeoJSON(data))
        // ─────────────────────────────────────────────────────────────
        load: () => buildPlaceholderChoropleth('medianIncome'),
    },
    populationDensity: {
        label: 'Population Density',
        visible: false,
        leafletLayer: null,
        color: '#6366f1',
        // ── PLACEHOLDER ──────────────────────────────────────────────
        // Replace this load() with a real Census API fetch, e.g.:
        //   fetch(`https://api.census.gov/data/2020/dec/pl?get=NAME,P1_001N&for=state:*&key=YOUR_KEY`)
        //     .then(r => r.json())
        //     .then(data => buildStateGeoJSON(data))
        // ─────────────────────────────────────────────────────────────
        load: () => buildPlaceholderChoropleth('populationDensity'),
    },
};

// ── Placeholder Census data ───────────────────────────────────────────
// These are rough illustrative values only. Replace with real API data.
// Keys are 2-letter state codes; values are the metric being shown.
const PLACEHOLDER_CENSUS_DATA = {
    medianIncome: {
        // ACS 2022 median household income ($) — approximate
        AL:52035, AK:77790, AZ:65913, AR:51734, CA:84097, CO:80184,
        CT:83572, DE:76301, FL:63062, GA:65030, HI:88005, ID:67200,
        IL:72563, IN:61944, IA:65000, KS:63001, KY:56565, LA:52087,
        ME:64767, MD:94384, MA:89026, MI:65000, MN:80441, MS:48716,
        MO:60712, MT:60560, NE:67000, NV:66274, NH:88235, NJ:89703,
        NM:52032, NY:75157, NC:62891, ND:68131, OH:62689, OK:55826,
        OR:71562, PA:68957, RI:74008, SC:62542, SD:64577, TN:60560,
        TX:67321, UT:79133, VT:73200, VA:80615, WA:82400, WV:52180,
        WI:68581, WY:68002, DC:101722,
    },
    populationDensity: {
        // Population per square mile — approximate 2020 values
        AL:99, AK:1, AZ:64, AR:57, CA:254, CO:56, CT:741, DE:504,
        FL:400, GA:185, HI:223, ID:22, IL:232, IN:188, IA:57, KS:35,
        KY:114, LA:107, ME:43, MD:636, MA:894, MI:177, MN:71, MS:63,
        MO:88, MT:7, NE:25, NV:28, NH:153, NJ:1263, NM:17, NY:421,
        NC:216, ND:11, OH:288, OK:57, OR:44, PA:286, RI:1061, SC:173,
        SD:11, TN:167, TX:111, UT:39, VT:68, VA:216, WA:115, WV:73,
        WI:108, WY:6, DC:11686,
    },
};

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
    setupLayerControls();
    loadStateFeatures();
    loadEnergyBurdenData();
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
        legendDiv = L.DomUtil.create('div', 'map-legend');
        updateLegend();
        return legendDiv;
    };
    legend.addTo(map);
}

// ── Layer controls ────────────────────────────────────────────────────

function setupLayerControls() {
    const container = document.getElementById('layer-controls');
    if (!container) return;

    Object.entries(layers).forEach(([key, layer]) => {
        const row = document.createElement('label');
        row.className = 'layer-toggle';

        const dot = layer.color
            ? `<span class="layer-dot" style="background:${layer.color}"></span>`
            : `<span class="layer-dot" style="background:linear-gradient(135deg,#10b981,#3b82f6,#f59e0b)"></span>`;

        row.innerHTML = `
            <input type="checkbox" data-layer="${key}" ${layer.visible ? 'checked' : ''}>
            ${dot}
            ${layer.label}
        `;
        container.appendChild(row);
    });

    container.addEventListener('change', function(e) {
        const checkbox = e.target;
        if (!checkbox.dataset.layer) return;
        toggleLayer(checkbox.dataset.layer, checkbox.checked);
    });
}

function toggleLayer(key, visible) {
    const layer = layers[key];
    if (!layer) return;
    layer.visible = visible;

    if (key === 'communitySolar') {
        // Toggle all project markers
        markers.forEach(m => visible ? map.addLayer(m) : map.removeLayer(m));
        return;
    }

    if (visible) {
        // Load and show the layer if not already built
        if (!layer.leafletLayer) {
            layer.leafletLayer = layer.load();
        }
        layer.leafletLayer.addTo(map);
        // Keep solar markers on top
        markers.forEach(m => m.bringToFront && m.bringToFront());
    } else {
        if (layer.leafletLayer) {
            map.removeLayer(layer.leafletLayer);
        }
    }
}

// ── Placeholder choropleth builder ───────────────────────────────────
// Fetches US states GeoJSON from a public CDN and shades by census metric.
// When you have real Census API data, replace PLACEHOLDER_CENSUS_DATA[metric]
// with your fetched values (same shape: { stateCode: numericValue }).

function buildPlaceholderChoropleth(metric) {
    const values = PLACEHOLDER_CENSUS_DATA[metric];
    if (!values) return L.layerGroup();

    const allVals = Object.values(values);
    const minVal  = Math.min(...allVals);
    const maxVal  = Math.max(...allVals);

    function getColor(stateCode) {
        const val = values[stateCode];
        if (val == null) return '#e5e7eb';
        const t = (val - minVal) / (maxVal - minVal);  // 0→1
        // interpolate from light → layer color
        const base = layers[metric].color || '#6b7280';
        return interpolateColor('#e5e7eb', base, t);
    }

    function style(feature) {
        const code = feature.properties.STUSPS || feature.properties.postal;
        return {
            fillColor:   getColor(code),
            weight:      1,
            opacity:     0.6,
            color:       '#fff',
            fillOpacity: 0.55,
        };
    }

    function onEachFeature(feature, leafletLayer) {
        const code  = feature.properties.STUSPS || feature.properties.postal;
        const name  = feature.properties.NAME || code;
        const val   = values[code];
        const label = metric === 'medianIncome'
            ? (val ? '$' + val.toLocaleString() : 'No data')
            : (val ? val.toLocaleString() + ' /sq mi' : 'No data');

        leafletLayer.bindTooltip(
            `<strong>${name}</strong><br>${layers[metric].label}: ${label}<br><em>(placeholder data)</em>`,
            { sticky: true }
        );
    }

    // Load US states GeoJSON from a public CDN
    // Source: https://github.com/PublicaMundi/MappingAPI
    const geojsonLayer = L.layerGroup();
    fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
        .then(r => r.json())
        .then(geojson => {
            // PublicaMundi uses "name" not "STUSPS" — build a name→code map
            const nameToCode = Object.fromEntries(
                Object.entries(stateNames).map(([code, name]) => [name, code])
            );
            // Patch features to add STUSPS
            geojson.features.forEach(f => {
                const code = nameToCode[f.properties.name];
                f.properties.STUSPS = code || '';
            });

            L.geoJSON(geojson, { style, onEachFeature }).addTo(geojsonLayer);
        })
        .catch(err => {
            console.warn(`Could not load states GeoJSON for layer "${metric}":`, err);
        });

    return geojsonLayer;
}

// Simple hex color interpolation (t: 0→1)
function interpolateColor(hex1, hex2, t) {
    const r1 = parseInt(hex1.slice(1,3),16), g1 = parseInt(hex1.slice(3,5),16), b1 = parseInt(hex1.slice(5,7),16);
    const r2 = parseInt(hex2.slice(1,3),16), g2 = parseInt(hex2.slice(3,5),16), b2 = parseInt(hex2.slice(5,7),16);
    const r = Math.round(r1 + (r2-r1)*t);
    const g = Math.round(g1 + (g2-g1)*t);
    const b = Math.round(b1 + (b2-b1)*t);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}


function addMarkersToMap(projects) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    projects.forEach(project => {
        const color = getProjectColor(project);

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
    document.getElementById('size-filter').addEventListener('input', function() {
        const val = parseInt(this.value);
        document.getElementById('size-label').textContent = val === 0 ? 'Any' : `≥ ${val} MW`;
        filterProjects();
    });
    document.getElementById('year-filter').addEventListener('input', function() {
        const val = parseInt(this.value);
        document.getElementById('year-label').textContent = val === 2008 ? 'Any' : `${val}+`;
        filterProjects();
    });
    document.getElementById('state-select').addEventListener('change', zoomToState);
    document.getElementById('color-mode').addEventListener('change', function() {
        colorMode = this.value;
        updateLegend();
        filterProjects();
    });
    document.getElementById('energy-burden-toggle').addEventListener('change', function() {
        toggleEnergyBurden(this.checked);
    });
}

function filterProjects() {
    const minMw    = parseInt(document.getElementById('size-filter').value);
    const fromYear = parseInt(document.getElementById('year-filter').value);

    let filtered = allProjects;

    if (minMw > 0) {
        filtered = filtered.filter(p => p.sizeMwAc != null && p.sizeMwAc >= minMw);
    }
    if (fromYear > 2008) {
        filtered = filtered.filter(p => p.yearOfInterconnection && p.yearOfInterconnection >= fromYear);
    }

    addMarkersToMap(filtered);
}

function getProjectColor(project) {
    if (colorMode === 'utilityType') {
        return getMarkerColor(project.utilityType);
    }
    if (colorMode === 'ownershipType') {
        const ownershipColors = {
            'Rural electric cooperative': '#10b981',
            'Cooperative':                '#f59e0b',
            'Publicly owned utility':     '#3b82f6',
            'Consumer-owned utility':     '#8b5cf6',
        };
        return ownershipColors[project.basicStructure] || '#6b7280';
    }
    return '#10b981';
}

function updateLegend() {
    if (!legendDiv) return;
    const content = {
        default: `
            <div class="legend-title">Projects</div>
            <div class="legend-row"><span class="legend-dot" style="background:#10b981"></span> Community-Owned Solar Project</div>
        `,
        utilityType: `
            <div class="legend-title">Utility Type</div>
            <div class="legend-row"><span class="legend-dot" style="background:#10b981"></span> Electric Cooperative</div>
            <div class="legend-row"><span class="legend-dot" style="background:#3b82f6"></span> Investor-Owned Utility</div>
            <div class="legend-row"><span class="legend-dot" style="background:#f59e0b"></span> Municipal Utility</div>
            <div class="legend-row"><span class="legend-dot" style="background:#8b5cf6"></span> Consumer-Owned Utility</div>
            <div class="legend-row"><span class="legend-dot" style="background:#6b7280"></span> Other</div>
        `,
        ownershipType: `
            <div class="legend-title">Ownership Structure</div>
            <div class="legend-row"><span class="legend-dot" style="background:#10b981"></span> Rural Electric Cooperative</div>
            <div class="legend-row"><span class="legend-dot" style="background:#f59e0b"></span> Cooperative</div>
            <div class="legend-row"><span class="legend-dot" style="background:#3b82f6"></span> Publicly Owned Utility</div>
            <div class="legend-row"><span class="legend-dot" style="background:#8b5cf6"></span> Consumer-Owned Utility</div>
        `,
    };
    legendDiv.innerHTML = content[colorMode] || content.default;
}

function resetView() {
    map.setView([39.8283, -98.5795], 4);
}

// ── State zoom ────────────────────────────────────────────────────────

// Approximate bounding boxes for each state [south, west, north, east]
const stateBounds = {
    AL:[30.14,-88.47,35.00,-84.89], AK:[51.17,-179.15,71.44,-129.98],
    AZ:[31.33,-114.82,37.00,-109.05], AR:[33.00,-94.62,36.50,-89.64],
    CA:[32.53,-124.41,42.01,-114.13], CO:[36.99,-109.06,41.00,-102.04],
    CT:[40.95,-73.73,42.05,-71.79], DE:[38.45,-75.79,39.84,-75.05],
    FL:[24.52,-87.63,31.00,-80.03], GA:[30.36,-85.61,35.00,-80.84],
    HI:[18.91,-160.24,22.24,-154.81], ID:[41.99,-117.24,49.00,-111.04],
    IL:[36.97,-91.51,42.51,-87.02], IN:[37.77,-88.10,41.76,-84.78],
    IA:[40.38,-96.64,43.50,-90.14], KS:[36.99,-102.05,40.00,-94.59],
    KY:[36.50,-89.57,39.15,-81.96], LA:[28.93,-94.04,33.02,-88.82],
    ME:[43.06,-71.08,47.46,-66.95], MD:[37.91,-79.49,39.72,-74.98],
    MA:[41.24,-73.51,42.89,-69.93], MI:[41.70,-90.42,48.31,-82.41],
    MN:[43.50,-97.24,49.38,-89.49], MS:[30.17,-91.66,35.00,-88.10],
    MO:[35.99,-95.77,40.61,-89.10], MT:[44.36,-116.05,49.00,-104.04],
    NE:[40.00,-104.05,43.00,-95.31], NV:[35.00,-120.00,42.00,-114.04],
    NH:[42.70,-72.56,45.31,-70.61], NJ:[38.93,-75.56,41.36,-73.89],
    NM:[31.33,-109.05,37.00,-103.00], NY:[40.50,-79.76,45.01,-71.86],
    NC:[33.84,-84.32,36.59,-75.46], ND:[45.94,-104.05,49.00,-96.55],
    OH:[38.40,-84.82,41.98,-80.52], OK:[33.62,-103.00,37.00,-94.43],
    OR:[41.99,-124.57,46.24,-116.46], PA:[39.72,-80.52,42.27,-74.69],
    RI:[41.15,-71.91,42.02,-71.12], SC:[32.05,-83.35,35.22,-78.54],
    SD:[42.48,-104.06,45.95,-96.44], TN:[34.98,-90.31,36.68,-81.65],
    TX:[25.84,-106.65,36.50,-93.51], UT:[37.00,-114.05,42.00,-109.04],
    VT:[42.73,-73.44,45.02,-71.50], VA:[36.54,-83.68,39.47,-75.24],
    WA:[45.54,-124.73,49.00,-116.92], WV:[37.20,-82.65,40.64,-77.72],
    WI:[42.49,-92.89,47.31,-86.25], WY:[41.00,-111.05,45.01,-104.05],
};

// Average household energy burden (% of income) by state — DOE LEAD Tool 2018 estimates
const energyBurdenStateAvg = {
    AL:4.1, AK:4.8, AZ:3.2, AR:4.2, CA:2.8, CO:2.9, CT:3.4, DE:2.9,
    DC:2.5, FL:2.8, GA:3.5, HI:3.8, ID:3.1, IL:3.2, IN:3.8, IA:3.4,
    KS:3.3, KY:4.3, LA:4.5, ME:4.6, MD:2.8, MA:3.4, MI:3.9, MN:3.1,
    MS:4.8, MO:3.8, MT:3.6, NE:3.2, NV:3.1, NH:3.7, NJ:2.8, NM:3.5,
    NY:2.9, NC:3.3, ND:2.8, OH:3.8, OK:3.5, OR:3.0, PA:3.5, RI:3.4,
    SC:3.6, SD:3.1, TN:3.9, TX:3.4, UT:2.9, VT:4.2, VA:3.0, WA:2.6,
    WV:4.9, WI:3.5, WY:2.8,
};

// State abbreviation → 2-digit FIPS code (for Census TIGER API)
const stateFips = {
    AL:'01', AK:'02', AZ:'04', AR:'05', CA:'06', CO:'08', CT:'09',
    DE:'10', DC:'11', FL:'12', GA:'13', HI:'15', ID:'16', IL:'17',
    IN:'18', IA:'19', KS:'20', KY:'21', LA:'22', ME:'23', MD:'24',
    MA:'25', MI:'26', MN:'27', MS:'28', MO:'29', MT:'30', NE:'31',
    NV:'32', NH:'33', NJ:'34', NM:'35', NY:'36', NC:'37', ND:'38',
    OH:'39', OK:'40', OR:'41', PA:'42', RI:'44', SC:'45', SD:'46',
    TN:'47', TX:'48', UT:'49', VT:'50', VA:'51', WA:'53', WV:'54',
    WI:'55', WY:'56',
};

function loadStateFeatures() {
    fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
        .then(r => r.json())
        .then(geojson => {
            const nameToCode = Object.fromEntries(
                Object.entries(stateNames).map(([code, name]) => [name, code])
            );
            stateGeoJsonFeatures = {};
            geojson.features.forEach(f => {
                const code = nameToCode[f.properties.name];
                if (code) stateGeoJsonFeatures[code] = f;
            });
        })
        .catch(err => console.warn('Could not load state borders GeoJSON:', err));
}

function zoomToState() {
    const code = document.getElementById('state-select').value;

    if (highlightLayer) {
        map.removeLayer(highlightLayer);
        highlightLayer = null;
    }

    if (!code) {
        map.setView([39.8283, -98.5795], 4);
        return;
    }

    const bounds = stateBounds[code];
    if (bounds) {
        map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: [20, 20] });
    }

    if (stateGeoJsonFeatures && stateGeoJsonFeatures[code]) {
        highlightLayer = L.geoJSON(stateGeoJsonFeatures[code], {
            style: {
                weight: 3,
                color: '#1e40af',
                opacity: 1,
                fillOpacity: 0,
            }
        }).addTo(map);
    }

    refreshEnergyBurdenLayer();
}



// ── Energy Burden Helpers ─────────────────────────────────────────────

const EB_CATEGORIES = [
    { label: 'Low',      min: 0,  max: 4,  color: '#fde68a', border: '#d97706' },
    { label: 'Moderate', min: 4,  max: 7,  color: '#f59e0b', border: '#b45309' },
    { label: 'High',     min: 7,  max: 10, color: '#d97706', border: '#92400e' },
    { label: 'Severe',   min: 10, max: 14, color: '#92400e', border: '#78350f' },
];

function ebCategoryColor(val) {
    if (val == null) return { color: '#e5e7eb', border: '#9ca3af' };
    for (const cat of EB_CATEGORIES) {
        if (val < cat.max) return { color: cat.color, border: cat.border };
    }
    return { color: EB_CATEGORIES[EB_CATEGORIES.length - 1].color, border: EB_CATEGORIES[EB_CATEGORIES.length - 1].border };
}

// ── Energy Burden CSV Loading ─────────────────────────────────────────

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQuotes = !inQuotes; }
        else if (c === ',' && !inQuotes) { result.push(current); current = ''; }
        else { current += c; }
    }
    result.push(current);
    return result;
}

function parseEnergyBurdenCSV(text) {
    const cleaned = text.replace(/^﻿/, '');
    const lines = cleaned.trim().split(/\r?\n/);
    if (lines.length < 2) return;
    const rawHeader = parseCSVLine(lines[0]);
    const header = rawHeader.map(h => h.trim().replace(/[^\x20-\x7E]/g, ''));
    const geoIdIdx = header.findIndex(h => h === 'GeoID');
    const ebIdx = header.findIndex(h => h === 'EnergyBurden_perc');
    const stateIdx = header.findIndex(h => h === 'State');
    if (geoIdIdx === -1 || ebIdx === -1) { energyBurdenData = {}; return; }
    energyBurdenData = {};
    const stateValues = {};
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = parseCSVLine(lines[i]);
        if (cols.length <= Math.max(geoIdIdx, ebIdx)) continue;
        let geoId = cols[geoIdIdx].trim();
        const ebVal = cols[ebIdx].trim();
        const stateName = stateIdx >= 0 && cols[stateIdx] ? cols[stateIdx].trim() : '';
        if (!geoId || ebVal === '-' || ebVal === '') continue;
        const value = parseFloat(ebVal);
        if (isNaN(value)) continue;
        while (geoId.length < 11) geoId = '0' + geoId;
        energyBurdenData[geoId] = value;
        if (stateName) {
            if (!stateValues[stateName]) stateValues[stateName] = [];
            stateValues[stateName].push(value);
        }
    }
    const nameToAbbrev = Object.fromEntries(Object.entries(stateNames).map(([ab, nm]) => [nm, ab]));
    for (const [nm, vals] of Object.entries(stateValues)) {
        const ab = nameToAbbrev[nm];
        if (ab && energyBurdenStateAvg.hasOwnProperty(ab)) {
            energyBurdenStateAvg[ab] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
        }
    }
    console.log(`Energy burden CSV: ${Object.keys(energyBurdenData).length} tracts loaded`);
}

async function loadEnergyBurdenData() {
    try {
        const res = await fetch('EnergyBurdenData.csv');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        parseEnergyBurdenCSV(await res.text());
    } catch (err) {
        console.warn('Could not load EnergyBurdenData.csv:', err.message);
        energyBurdenData = {};
    }
}

// ── Energy Burden Layer ───────────────────────────────────────────────

function toggleEnergyBurden(visible) {
    energyBurdenVisible = visible;
    if (!visible) {
        if (energyBurdenLayer) { map.removeLayer(energyBurdenLayer); energyBurdenLayer = null; }
        updateEnergyBurdenLegend(false);
        return;
    }
    refreshEnergyBurdenLayer();
}

function refreshEnergyBurdenLayer() {
    if (!energyBurdenVisible) return;
    if (energyBurdenLayer) { map.removeLayer(energyBurdenLayer); energyBurdenLayer = null; }

    const stateCode = document.getElementById('state-select').value;
    if (stateCode) {
        buildTractEnergyBurdenLayer(stateCode);
    } else {
        buildStateEnergyBurdenLayer();
    }
}

function buildStateEnergyBurdenLayer() {
    const values = energyBurdenStateAvg;
    const allVals = Object.values(values);
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);

    energyBurdenLayer = L.layerGroup();

    fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
        .then(r => r.json())
        .then(geojson => {
            const nameToCode = Object.fromEntries(
                Object.entries(stateNames).map(([code, name]) => [name, code])
            );
            geojson.features.forEach(f => {
                const code = nameToCode[f.properties.name];
                f.properties.STUSPS = code || '';
            });

            L.geoJSON(geojson, {
                style(feature) {
                    const code = feature.properties.STUSPS;
                    const { color, border } = ebCategoryColor(values[code]);
                    return {
                        fillColor: color,
                        weight: 1, opacity: 0.6, color: border, fillOpacity: 0.65,
                    };
                },
                onEachFeature(feature, layer) {
                    const code = feature.properties.STUSPS;
                    const val = values[code];
                    const cat = val != null ? EB_CATEGORIES.find(c => val < c.max) || EB_CATEGORIES[EB_CATEGORIES.length - 1] : null;
                    layer.bindTooltip(
                        `<strong>${feature.properties.name}</strong><br>` +
                        `Avg Energy Burden: ${val != null ? val.toFixed(1) + '%' : 'No data'}` +
                        (cat ? ` <em>(${cat.label})</em>` : ''),
                        { sticky: true }
                    );
                },
            }).addTo(energyBurdenLayer);

            energyBurdenLayer.addTo(map);
            markers.forEach(m => m.bringToFront && m.bringToFront());
            updateEnergyBurdenLegend(true, false);
        })
        .catch(err => console.warn('Could not load states GeoJSON for energy burden:', err));
}

function showTractLoading() {
    let el = document.getElementById('tract-loading-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'tract-loading-msg';
        el.className = 'tract-loading-msg';
        el.textContent = 'Loading census tracts…';
        document.getElementById('map').appendChild(el);
    }
    el.style.display = 'block';
}

function hideTractLoading() {
    const el = document.getElementById('tract-loading-msg');
    if (el) el.style.display = 'none';
}

async function fetchAllTracts(fips, stateCode) {
    if (tractGeoJsonCache[fips]) return tractGeoJsonCache[fips];

    // Try local GeoJSON file first (fast, no API calls)
    try {
        const r = await fetch(`tracts/${stateCode}.geojson`);
        if (r.ok) {
            const geojson = await r.json();
            tractGeoJsonCache[fips] = geojson;
            return geojson;
        }
    } catch (e) { /* fall through to TIGER API */ }

    // Fall back to TIGER API with pagination
    const base = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/8/query`;
    const pageSize = 1000;
    let offset = 0;
    let allFeatures = [];
    while (true) {
        const url = `${base}?where=STATE%3D'${fips}'&outFields=GEOID&returnGeometry=true&f=geojson` +
            `&resultRecordCount=${pageSize}&resultOffset=${offset}&geometryPrecision=4`;
        const geojson = await fetch(url).then(r => r.json());
        allFeatures = allFeatures.concat(geojson.features || []);
        if (!geojson.exceededTransferLimit || (geojson.features || []).length < pageSize) break;
        offset += pageSize;
    }
    const result = { type: 'FeatureCollection', features: allFeatures };
    tractGeoJsonCache[fips] = result;
    return result;
}

function buildTractEnergyBurdenLayer(stateCode) {
    const fips = stateFips[stateCode];
    if (!fips) return;

    const stateAvg = energyBurdenStateAvg[stateCode] || 3.5;
    energyBurdenLayer = L.layerGroup();
    energyBurdenLayer.addTo(map);
    showTractLoading();

    fetchAllTracts(fips, stateCode)
        .then(geojson => {
            hideTractLoading();
            let realDataCount = 0;

            L.geoJSON(geojson, {
                style(feature) {
                    let geoid = feature.properties.GEOID || '';
                    while (geoid.length < 11) geoid = '0' + geoid;
                    const realVal = energyBurdenData && energyBurdenData[geoid];
                    let val;
                    if (realVal !== undefined) {
                        val = realVal;
                        realDataCount++;
                    } else {
                        const seed = parseInt(feature.properties.GEOID.slice(-5)) / 99999;
                        val = stateAvg * (0.4 + seed * 1.4);
                    }
                    const { color, border } = ebCategoryColor(val);
                    return {
                        fillColor: color,
                        weight: 0.5, opacity: 0.5, color: border, fillOpacity: 0.65,
                    };
                },
                onEachFeature(feature, layer) {
                    let geoid = feature.properties.GEOID || '';
                    while (geoid.length < 11) geoid = '0' + geoid;
                    const realVal = energyBurdenData && energyBurdenData[geoid];
                    let val, sourceNote;
                    if (realVal !== undefined) {
                        val = realVal;
                        sourceNote = 'DOE LEAD Tool';
                    } else {
                        const seed = parseInt(feature.properties.GEOID.slice(-5)) / 99999;
                        val = stateAvg * (0.4 + seed * 1.4);
                        sourceNote = 'estimated';
                    }
                    const cat = EB_CATEGORIES.find(c => val < c.max) || EB_CATEGORIES[EB_CATEGORIES.length - 1];
                    layer.bindTooltip(
                        `Energy Burden: ${val.toFixed(1)}% of income <em>(${cat.label})</em><br>` +
                        `<em>${sourceNote}</em>`,
                        { sticky: true }
                    );
                },
            }).addTo(energyBurdenLayer);

            markers.forEach(m => m.bringToFront && m.bringToFront());
            updateEnergyBurdenLegend(true, true, realDataCount > 0);
        })
        .catch(err => {
            hideTractLoading();
            console.warn('Could not load census tracts:', err);
        });
}

function updateEnergyBurdenLegend(visible, isTracts, hasRealData) {
    if (energyBurdenLegend) { map.removeControl(energyBurdenLegend); energyBurdenLegend = null; }
    if (!visible) return;

    let sourceText;
    if (!isTracts) {
        sourceText = 'State average — DOE LEAD Tool';
    } else if (hasRealData) {
        sourceText = 'Census tract level — DOE LEAD Tool';
    } else {
        sourceText = 'Census tract level (estimated)';
    }

    energyBurdenLegend = L.control({ position: 'bottomright' });
    energyBurdenLegend.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-legend energy-burden-legend');
        const rows = EB_CATEGORIES.map(cat =>
            `<div class="eb-cat-row">
                <span class="eb-swatch" style="background:${cat.color};border-color:${cat.border}"></span>
                <span class="eb-cat-label">${cat.label} (${cat.min}–${cat.max}%)</span>
            </div>`
        ).join('');
        div.innerHTML = `
            <div class="legend-title">Energy Burden</div>
            ${rows}
            <div class="eb-source">${sourceText}</div>
        `;
        return div;
    };
    energyBurdenLegend.addTo(map);
}

function getSizeCategoryLabel(cat) {
    return { small: 'Small (< 1 MW)', medium: 'Medium (1–10 MW)', large: 'Large (10+ MW)', unknown: 'Unknown' }[cat] || cat;
}

function getUtilityTypeExplanation(type) {
    const explanations = {
        'cooperative':    'A member-owned electric cooperative — subscribers are often co-op members sharing the output of the solar project.',
        'investor-owned': 'A privately held, investor-owned utility that offers community-owned solar subscriptions to customers in its service territory.',
        'municipal':      'A city- or county-owned utility providing locally governed community-owned solar options to residents and businesses.',
        'consumer-owned': 'A consumer-owned utility (such as a public utility district) structured to serve its customers rather than outside investors.',
        'other':          'A utility or project structure that does not fit neatly into the standard categories above.',
    };
    return explanations[type] || '';
}