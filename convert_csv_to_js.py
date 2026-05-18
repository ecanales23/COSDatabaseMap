#!/usr/bin/env python3
"""
Convert the geothermal systems CSV to JavaScript data format.
This script will also attempt to geocode locations.
"""

import csv
import json
import time
from urllib.parse import quote
from urllib.request import urlopen

def geocode_location(city, state):
    """
    Geocode a location using OpenStreetMap's Nominatim API (free, no API key needed).
    Returns (lat, lng) tuple or (None, None) if not found.
    """
    if not city or not state:
        return None, None

    try:
        # Clean up the location string
        query = f"{city}, {state}, USA"
        url = f"https://nominatim.openstreetmap.org/search?q={quote(query)}&format=json&limit=1"

        # Be polite to the API - add delay and user agent
        time.sleep(1)  # Rate limiting

        req = urlopen(url)
        data = json.loads(req.read().decode())

        if data and len(data) > 0:
            return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"Error geocoding {city}, {state}: {e}")

    return None, None

def clean_text(text):
    """Clean and escape text for JavaScript."""
    if not text or text.strip() == '':
        return 'Unknown'
    # Remove extra whitespace and escape quotes
    text = ' '.join(text.strip().split())
    text = text.replace("'", "\\'").replace('"', '\\"')
    return text

def determine_system_type(type_str):
    """Determine the system type code from the CSV type string."""
    if not type_str:
        return 'gshp'

    type_lower = type_str.lower()
    if '5g' in type_lower or '5th' in type_lower or 'fifth' in type_lower:
        return '5gdhc'
    elif '4g' in type_lower or '4th' in type_lower or 'fourth' in type_lower:
        return '4gdhc'
    else:
        return 'gshp'

def convert_csv_to_js(csv_file_path, output_file_path):
    """Convert CSV to JavaScript data file."""

    projects = []

    with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)

        for idx, row in enumerate(reader, start=1):
            city = clean_text(row.get('City ', ''))  # Note trailing spaces in column names
            state = clean_text(row.get('State/Province ', ''))

            # Skip if no location data
            if city == 'Unknown' or state == 'Unknown':
                print(f"Skipping row {idx}: No location data")
                continue

            print(f"Processing {idx}: {row.get('Project Name', 'Unknown')} - {city}, {state}")

            # Geocode the location
            lat, lng = geocode_location(city, state)

            if lat is None or lng is None:
                print(f"  Warning: Could not geocode {city}, {state}")
                continue

            # Extract and clean data
            project = {
                'id': idx,
                'name': clean_text(row.get('Project Name', f'{city} Project')),
                'location': f"{city}, {state}",
                'lat': lat,
                'lng': lng,
                'systemType': determine_system_type(row.get('Type of Geothermal System ', '')),
                'status': clean_text(row.get('Project Status ', '')),
                'description': clean_text(row.get('Site Type ', '')),
                'siteType': clean_text(row.get('Site Type ', '')),
                'capacity': clean_text(row.get('Size/Capacity', '')),
                'buildings': clean_text(row.get('Buildings Connected ', '')),
                'households': clean_text(row.get('# of Households Served', '')),
                'population': clean_text(row.get('# of Population Served', '')),
                'emissionsBenefits': clean_text(row.get('Emissions Savings (GHG) ', '')),
                'operationalSuccesses': clean_text(row.get('Operational Successes ', '')),
                'cost': clean_text(row.get('$ Cost ', '')),
                'funding': clean_text(row.get('Funding Sources', '')),
                'ownership': clean_text(row.get('Ownership Model', '')),
                'subscription': clean_text(row.get('Subscription Information (Hookups, fees, rates) ', '')),
                'thermalResources': clean_text(row.get('Thermal Resources Details: ', '')),
                'distribution': clean_text(row.get('Distribution System Details: ', '')),
                'heatPump': clean_text(row.get('Heat Pump/Heat Exchanger Unit ', '')),
                'additionalInfo': clean_text(row.get('Additional Information', '')),
                'contact': clean_text(row.get('Site Contact', '')),
                'sources': clean_text(row.get('Referenced Sources', ''))
            }

            projects.append(project)

    # Write to JavaScript file
    with open(output_file_path, 'w', encoding='utf-8') as jsfile:
        jsfile.write('// Geothermal systems data - Auto-generated from CSV\n\n')
        jsfile.write('const geothermalSystems = ')
        jsfile.write(json.dumps(projects, indent=2))
        jsfile.write(';\n\n')

        # Add helper functions
        jsfile.write('''
// Helper function to get system type display name
function getSystemTypeName(type) {
    const types = {
        'gshp': 'Individual GSHP',
        '4gdhc': '4th Gen District H&C',
        '5gdhc': '5th Gen District H&C'
    };
    return types[type] || type;
}

// Helper function to get marker color
function getMarkerColor(type) {
    const colors = {
        'gshp': '#4CAF50',
        '4gdhc': '#2196F3',
        '5gdhc': '#FF9800'
    };
    return colors[type] || '#666';
}
''')

    print(f"\nSuccessfully converted {len(projects)} projects to {output_file_path}")
    return len(projects)

if __name__ == '__main__':
    csv_file = 'Keegan of IAP 2026_ Geothermal Systems Database - Geothermal Systems Database.csv'
    output_file = 'data.js'

    print("Starting CSV to JavaScript conversion...")
    print("This will take some time due to geocoding rate limits.\n")

    count = convert_csv_to_js(csv_file, output_file)

    print(f"\nDone! Converted {count} projects.")
    print(f"Output written to: {output_file}")
