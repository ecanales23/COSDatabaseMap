"""
Converts Census TIGER tract shapefiles (.zip) from Downloads into
lightweight GeoJSON files in the project's tracts/ folder.
Only the GEOID property is kept; coordinates are rounded to 4 decimal
places to reduce file size.
"""
import shapefile
import zipfile
import json
import io
from pathlib import Path

FIPS_TO_STATE = {
    '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT',
    '10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL',
    '18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD',
    '25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE',
    '32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND',
    '39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD',
    '47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV',
    '55':'WI','56':'WY',
}

def round_coords(c, p=4):
    if isinstance(c[0], (list, tuple)):
        return [round_coords(x, p) for x in c]
    return [round(c[0], p), round(c[1], p)]

downloads = Path("C:/Users/canal/Downloads")
out_dir = Path(__file__).parent / "tracts"
out_dir.mkdir(exist_ok=True)

converted, skipped, errors = [], [], []

for fips, state in sorted(FIPS_TO_STATE.items()):
    zip_path = downloads / f"tl_2025_{fips}_tract.zip"
    if not zip_path.exists():
        skipped.append(state)
        continue

    out_path = out_dir / f"{state}.geojson"
    if out_path.exists():
        print(f"  {state}: already exists, skipping")
        converted.append(state)
        continue

    print(f"Converting {state} ({fips})...", end=" ", flush=True)
    try:
        with zipfile.ZipFile(zip_path) as zf:
            names = zf.namelist()
            shp_name = next((n for n in names if n.endswith('.shp')), None)
            dbf_name = next((n for n in names if n.endswith('.dbf')), None)
            shx_name = next((n for n in names if n.endswith('.shx')), None)
            if not shp_name or not dbf_name:
                raise FileNotFoundError("Missing .shp or .dbf inside zip")

            sf = shapefile.Reader(
                shp=io.BytesIO(zf.read(shp_name)),
                dbf=io.BytesIO(zf.read(dbf_name)),
                shx=io.BytesIO(zf.read(shx_name)) if shx_name else None,
            )

            features = []
            for sr in sf.shapeRecords():
                geoid = str(sr.record['GEOID'])
                geom = sr.shape.__geo_interface__
                geom = dict(geom)
                geom['coordinates'] = round_coords(geom['coordinates'])
                features.append({
                    'type': 'Feature',
                    'properties': {'GEOID': geoid},
                    'geometry': geom,
                })

        geojson = {'type': 'FeatureCollection', 'features': features}
        with open(out_path, 'w') as f:
            json.dump(geojson, f, separators=(',', ':'))

        size_kb = out_path.stat().st_size // 1024
        print(f"{len(features)} tracts, {size_kb} KB")
        converted.append(state)

    except Exception as e:
        print(f"ERROR: {e}")
        errors.append(f"{state}: {e}")

print(f"\nDone. Converted: {len(converted)} states")
if skipped:
    print(f"No zip found for: {', '.join(skipped)}")
if errors:
    print(f"Errors: {'; '.join(errors)}")
