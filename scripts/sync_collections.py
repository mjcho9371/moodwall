#!/usr/bin/env python3
"""
Pulls curated photos from the Unsplash Collections listed in curation/collections.json
and writes curation/manifest.json, which the distributed app fetches at runtime.

Curation workflow:
  1. On unsplash.com, create one Collection per mood and add photos to it by hand.
  2. Put each Collection's ID into curation/collections.json.
  3. Run this script whenever you've updated a collection:
       UNSPLASH_ACCESS_KEY=your_key python3 scripts/sync_collections.py
  4. Commit + push curation/manifest.json. Every installed app picks up the change
     next time it fetches the manifest -- no app update needed.

The Access Key never goes into the manifest or into the app -- it's only used here,
on your own machine, to talk to the Unsplash API while curating.
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COLLECTIONS_FILE = ROOT / "curation" / "collections.json"
MANIFEST_FILE = ROOT / "curation" / "manifest.json"

MAX_PHOTOS_PER_MOOD = int(os.environ.get("MAX_PHOTOS_PER_MOOD", "60"))
PER_PAGE = 30


def fetch_json(url: str, access_key: str):
    request = urllib.request.Request(url, headers={"Authorization": f"Client-ID {access_key}"})
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_collection_photos(collection_id: str, access_key: str):
    photos = []
    page = 1
    while len(photos) < MAX_PHOTOS_PER_MOOD:
        url = (
            f"https://api.unsplash.com/collections/{collection_id}/photos"
            f"?page={page}&per_page={PER_PAGE}"
        )
        batch = fetch_json(url, access_key)
        if not batch:
            break
        photos.extend(batch)
        if len(batch) < PER_PAGE:
            break
        page += 1
    return photos[:MAX_PHOTOS_PER_MOOD]


def to_curated_photo(photo: dict) -> dict:
    raw_url = photo["urls"]["raw"]
    return {
        "id": photo["id"],
        "imageURL": f"{raw_url}&w=3840&q=80&fm=jpg&fit=max",
        "photographer": photo["user"]["name"],
        "photographerURL": photo["user"]["links"]["html"],
        "unsplashURL": photo["links"]["html"],
        "downloadLocation": photo["links"]["download_location"],
    }


def main():
    access_key = os.environ.get("UNSPLASH_ACCESS_KEY")
    if not access_key:
        print("Set UNSPLASH_ACCESS_KEY in your environment before running this script.", file=sys.stderr)
        sys.exit(1)

    collections = json.loads(COLLECTIONS_FILE.read_text())

    manifest_moods = {}
    for mood, collection_id in collections.items():
        if collection_id.startswith("REPLACE_WITH"):
            print(f"Skipping '{mood}': no collection ID set yet.")
            continue

        print(f"Fetching '{mood}' from collection {collection_id}...")
        photos = fetch_collection_photos(collection_id, access_key)
        manifest_moods[mood] = [to_curated_photo(p) for p in photos]
        print(f"  -> {len(photos)} photos")

    manifest = {
        "updatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "moods": manifest_moods,
    }

    MANIFEST_FILE.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f"Wrote {MANIFEST_FILE}")


if __name__ == "__main__":
    main()
