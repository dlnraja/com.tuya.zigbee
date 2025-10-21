#!/bin/bash

# Script to manually promote Build #24 to Test
# This is needed because the workflow failed after build creation

echo "🚀 Manual Promotion: Build #24 → Test"
echo ""

# Check if HOMEY_PAT is provided
if [ -z "$HOMEY_PAT" ]; then
    echo "❌ Error: HOMEY_PAT environment variable not set"
    echo ""
    echo "Usage:"
    echo "  export HOMEY_PAT='your_token_here'"
    echo "  bash scripts/promote_build_24.sh"
    exit 1
fi

echo "📋 Promoting Build #24 from Draft to Test..."
echo ""

# API call to promote build
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $HOMEY_PAT" \
  -H "Content-Type: application/json" \
  "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/24/promote" \
  -d '{"target": "test"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Build #24 promoted to Test successfully!"
    echo ""
    echo "🔗 Test URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/"
    echo "🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/24"
else
    echo "⚠️  Promotion may have failed"
    echo ""
    echo "Manual promotion:"
    echo "1. Visit: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/24"
    echo "2. Click 'Promote to Test'"
fi

echo ""
