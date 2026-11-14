"""Checks that sw.js precaches every file the game needs. Usage: python3 tools/check_sw.py"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sw = open(os.path.join(ROOT, "sw.js")).read()
listed = set(re.findall(r"'\./([^']+)'", sw))

needed = {"index.html", "manifest.webmanifest"}
for folder in ("src",):
    for dirpath, _, files in os.walk(os.path.join(ROOT, folder)):
        for f in files:
            if f.endswith(".js"):
                needed.add(os.path.relpath(os.path.join(dirpath, f), ROOT))
for f in ("apple-touch-icon.png", "favicon-32.png", "icon-192.png", "icon-512.png"):
    needed.add("icons/" + f)

missing = sorted(needed - listed)
stale = sorted(p for p in listed if not os.path.exists(os.path.join(ROOT, p)))
if missing or stale:
    print("missing from sw.js:", missing)
    print("listed but not on disk:", stale)
    sys.exit(1)
print(f"sw.js OK ({len(listed)} files)")
