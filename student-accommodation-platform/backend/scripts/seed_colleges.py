"""
Seeds the colleges table so the 'near my college' search has something to
measure from.

Run from the backend/ folder (so .env is found):

    python -m scripts.seed_colleges

Safe to run more than once — colleges that already exist are skipped.

Coordinates: CGC Landran is from Wikipedia's coordinates for the Chandigarh
Group of Colleges. Chandigarh University's is the centre of Gharuan village,
so it is approximate. For an exact pin, right-click the campus gate in Google
Maps and click the coordinates to copy them, then edit the list below. To add
a college, add another entry; keep the college's short name or abbreviation
in the name (e.g. "CGC", "CU") because that is what query matching uses.
"""
from geoalchemy2 import WKTElement

from app.db.session import SessionLocal
from app.models.college import College

COLLEGES = [
    {
        "name": "CGC Landran (Chandigarh Group of Colleges)",
        "city": "Mohali",
        "lat": 30.6865,
        "lng": 76.6647,
    },
    {
        "name": "Chandigarh University (CU), Gharuan",
        "city": "Mohali",
        "lat": 30.7715,
        "lng": 76.5589,
    },
]


def main() -> None:
    db = SessionLocal()
    try:
        for entry in COLLEGES:
            if db.query(College).filter(College.name == entry["name"]).first():
                print(f"skip   {entry['name']} (already exists)")
                continue
            db.add(
                College(
                    name=entry["name"],
                    city=entry["city"],
                    # WKT is (lng lat) — x first, y second
                    location=WKTElement(f"POINT({entry['lng']} {entry['lat']})", srid=4326),
                )
            )
            print(f"add    {entry['name']}")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
