#!/bin/bash
# Universal Tuya Zigbee - Syntax Validation Script
# v1.0.0

echo "🔍 Initializing Global Syntax Audit..."
FAILED=0

# Validate Core Library
echo "--- Checking Core Libraries ---"
for file in lib/**/*.js; do
    node --check "$file" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "❌ Syntax Error: $file"
        FAILED=$((FAILED + 1))
    fi
done

# Validate Drivers
echo "--- Checking Drivers ---"
for file in drivers/**/*.js; do
    node --check "$file" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "❌ Syntax Error: $file"
        FAILED=$((FAILED + 1))
    fi
done

# Run Unit Tests
echo "--- Running Unit Tests ---"
npm test
if [ $? -ne 0 ]; then
    echo "❌ Unit Tests Failed"
    FAILED=$((FAILED + 1))
fi

if [ $FAILED -eq 0 ]; then
    echo "✅ SUCCESS: All files are syntactically valid."
    exit 0
else
    echo "❌ FAILURE: $FAILED files contain syntax errors."
    exit 1
fi
