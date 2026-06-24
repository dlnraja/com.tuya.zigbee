#!/bin/bash
set -e -o pipefail

echo "TITAN v2 Pattern Check..."
FAIL=0

# 1. Raw setCapabilityValue in drivers
raw_set=$(grep -r "this\.setCapabilityValue(" drivers/ --include="device.js" -l 2>/dev/null | wc -l)
if [ "$raw_set" -gt 0 ]; then
  echo "Found $raw_set files with raw setCapabilityValue"
  FAIL=1
fi

# 2. console.log in drivers
console_log=$(grep -r "console\.\(log\|error\|warn\)(" drivers/ --include="device.js" -l 2>/dev/null | wc -l)
if [ "$console_log" -gt 0 ]; then
  echo "Found $console_log files with console.log in drivers/"
  FAIL=1
fi

# 6. UTF-16 JSON loading
utf16=$(grep -r "JSON\.parse(fs\.readFileSync.*'utf8'" lib/ --include="*.js" -l 2>/dev/null | wc -l)
if [ "$utf16" -gt 0 ]; then
  echo "Found $utf16 files with UTF-16/utf8 JSON loading"
  FAIL=1
fi

if [ "$FAIL" != "0" ]; then
  echo "TITAN v2 pattern check FAILED"
  exit 1
fi
echo "All TITAN v2 pattern checks passed"
