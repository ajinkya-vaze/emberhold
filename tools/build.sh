#!/bin/sh
# Copies just the files the game needs into dist/ for hosting. Usage: sh tools/build.sh
set -e
cd "$(dirname "$0")/.."
python3 tools/check_sw.py
rm -rf dist
mkdir -p dist/icons
cp index.html manifest.webmanifest sw.js dist/
cp icons/apple-touch-icon.png icons/favicon-32.png icons/icon-192.png icons/icon-512.png dist/icons/
cp -R src dist/src
touch dist/.nojekyll   # GitHub Pages: serve files as-is
echo "Built dist/ ($(find dist -type f | wc -l | tr -d ' ') files)"
