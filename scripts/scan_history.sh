#!/usr/bin/env bash
# Scan git history for key improvements

echo "🔍 Scanning git history for Tuya Zigbee improvements..."

# Create artifacts directory
mkdir -p .artifacts

# Fetch all history
git fetch --all 2>/dev/null

# Extract all commits with metadata
echo "📝 Extracting commit history..."
git log --pretty=format:"%H|%ad|%an|%s" --date=iso --reverse > .artifacts/git_commits.log

# Search for key improvements
echo "🔎 Searching for key topics..."

echo "=== BATTERY IMPROVEMENTS ===" > .artifacts/improvements_summary.txt
grep -iE "battery|power.*configuration|measure_battery" .artifacts/git_commits.log >> .artifacts/improvements_summary.txt

echo -e "\n=== USB OUTLET IMPROVEMENTS ===" >> .artifacts/improvements_summary.txt
grep -iE "usb|outlet|2-gang|TS011F|multigang" .artifacts/git_commits.log >> .artifacts/improvements_summary.txt

echo -e "\n=== PRESENCE/RADAR IMPROVEMENTS ===" >> .artifacts/improvements_summary.txt
grep -iE "presence|radar|motion|occupancy" .artifacts/git_commits.log >> .artifacts/improvements_summary.txt

echo -e "\n=== TUYA DP/EF00 IMPROVEMENTS ===" >> .artifacts/improvements_summary.txt
grep -iE "EF00|DP|TS0601|tuya.*specific" .artifacts/git_commits.log >> .artifacts/improvements_summary.txt

echo -e "\n=== SMART-ADAPT IMPROVEMENTS ===" >> .artifacts/improvements_summary.txt
grep -iE "smart.*adapt|capability.*detect|migration" .artifacts/git_commits.log >> .artifacts/improvements_summary.txt

echo -e "\n=== CRASH FIXES ===" >> .artifacts/improvements_summary.txt
grep -iE "crash|error|fix.*critical|hotfix" .artifacts/git_commits.log >> .artifacts/improvements_summary.txt

echo "✅ History scan complete!"
echo "📄 Results saved to .artifacts/improvements_summary.txt"
echo ""
echo "Key stats:"
echo "  Total commits: $(wc -l < .artifacts/git_commits.log)"
echo "  Battery-related: $(grep -ic "battery" .artifacts/git_commits.log)"
echo "  USB outlet-related: $(grep -ic "usb\|outlet" .artifacts/git_commits.log)"
echo "  Presence-related: $(grep -ic "presence\|radar" .artifacts/git_commits.log)"
echo "  Crash fixes: $(grep -ic "crash\|hotfix" .artifacts/git_commits.log)"
