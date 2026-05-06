"""
Convert the community solar GeoJSON to JavaScript data format.
Coordinates are already present — no geocoding needed.
"""

import json
import re

def clean_text(value):
    """Clean and escape a value for JavaScript."""
    if value is None or str(value).strip() == '':
        return 'Unknown'
    text = str(value).strip()
    text = ' '.join(text.split())  # collapse whitespace
    text = text.replace("'", "\\'").replace('"', '\\"')
    return text

def parse_year(year_str):
    """Parse year strings like '2,015' → 2015."""
    if not year_str or year_str == 'Unknown':
        return None
    try:
        return int(str(year_str).replace(',', '').strip())
    except ValueError:
        return None

def determine_utility_type(utility_type, basic_structure):
    """Map utility type to a short category code used for filtering/coloring."""
    ut = (utility_type or '').lower()
    bs = (basic_structure or '').lower()

    if 'cooperative' in ut or 'cooperative' in bs or 'rural electric' in bs:
        return 'cooperative'
    if 'investor' in ut:
        return 'investor-owned'
    if 'municipal' in ut or 'publicly owned' in bs:
        return 'municipal'
    if 'political subdivision' in ut or 'consumer-owned' in bs:
        return 'consumer-owned'
    return 'other'

def size_category(mw_ac):
    """Bucket system size into small / medium / large."""
    if mw_ac is None:
        return 'unknown'
    if mw_ac < 1:
        return 'small'      # < 1 MW
    if mw_ac < 10:
        return 'medium'     # 1–10 MW
    return 'large'          # 10+ MW

def convert_geojson_to_js(geojson_path, output_path):
    with open(geojson_path, 'r', encoding='utf-8') as f:
        geojson = json.load(f)

    projects = []

    for idx, feature in enumerate(geojson['features'], start=1):
        props = feature['properties']
        coords = feature['geometry']['coordinates']  # [lng, lat]
        lng, lat = coords[0], coords[1]

        p = props  # shorthand

        name        = clean_text(p.get('j_Project Name', f'Project {idx}'))
        city        = clean_text(p.get('j_City') or p.get('town') or '')
        state       = clean_text(p.get('j_State') or p.get('state') or '')
        location    = f"{city}, {state}" if city != 'Unknown' else state

        utility_type   = clean_text(p.get('j_Utility Type', ''))
        basic_struct   = clean_text(p.get('j_Basic Structure', ''))
        utility_name   = clean_text(p.get('j_Utility', ''))
        utility_id     = clean_text(p.get('j_UtilityID', ''))
        size_mw_ac     = p.get('j_System Size (MW-AC)')
        size_mw_dc     = p.get('j_System Size (MW-DC)')
        year_raw       = p.get('j_Year of Interconnection')
        year           = parse_year(year_raw)
        address        = clean_text(p.get('formatted') or p.get('original_address') or '')

        project = {
            'id':            idx,
            'name':          name,
            'location':      location,
            'city':          city,
            'state':         state,
            'lat':           lat,
            'lng':           lng,
            'address':       address,
            'utilityType':   determine_utility_type(utility_type, basic_struct),
            'utilityTypeName': utility_type if utility_type != 'Unknown' else '',
            'basicStructure': basic_struct if basic_struct != 'Unknown' else '',
            'utility':       utility_name,
            'utilityId':     utility_id,
            'sizeMwAc':      size_mw_ac,
            'sizeMwDc':      size_mw_dc,
            'sizeCategory':  size_category(size_mw_ac),
            'yearOfInterconnection': year,
            'status':        f"Interconnected {year}" if year else 'Unknown',
        }

        projects.append(project)
        print(f"  {idx:3d}. {name} — {location} ({size_mw_ac} MW-AC, {year})")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('// Community solar project data — auto-generated from GeoJSON\n\n')
        f.write('const communitySolarProjects = ')
        f.write(json.dumps(projects, indent=2))
        f.write(';\n\n')

        f.write('''\
// Helper: display name for utility type code
function getUtilityTypeName(type) {
    const names = {
        'cooperative':    'Electric Cooperative',
        'investor-owned': 'Investor-Owned Utility',
        'municipal':      'Municipal Utility',
        'consumer-owned': 'Consumer-Owned Utility',
        'other':          'Other',
    };
    return names[type] || type;
}

// Helper: marker color for utility type
function getMarkerColor(type) {
    const colors = {
        'cooperative':    '#10b981',  // green
        'investor-owned': '#3b82f6',  // blue
        'municipal':      '#f59e0b',  // amber
        'consumer-owned': '#8b5cf6',  // purple
        'other':          '#6b7280',  // gray
    };
    return colors[type] || '#6b7280';
}
''')

    print(f"\nDone! Converted {len(projects)} projects → {output_path}")

if __name__ == '__main__':
    import sys
    geojson_file = sys.argv[1] if len(sys.argv) > 1 else '5_3_Project_Locations.geojson'
    output_file  = sys.argv[2] if len(sys.argv) > 2 else 'data.js'
    print(f"Converting {geojson_file} → {output_file}\n")
    convert_geojson_to_js(geojson_file, output_file)
