#!/bin/bash

# YOLO QUICK FIX - IMMEDIATE TERMINAL FIX
echo "🚀 YOLO MODE ACTIVATED - QUICK FIX"

# Fix terminal issues
pkill -f "git status" 2>/dev/null || true
pkill -f "npm" 2>/dev/null || true
pkill -f "homey" 2>/dev/null || true

# Update package.json versions
sed -i 's/"version": "1.0.6"/"version": "1.0.8"/' package.json
sed -i 's/"version": "1.0.5"/"version": "1.0.8"/' package.json

# Fix all appId references
find . -name "*.json" -type f -exec sed -i 's/"appId": "com.tuya.zigbee"/"appId": "com.universaltuyazigbee.device"/g' {} \;

# Fix GitHub URLs
find . -name "*.md" -type f -exec sed -i 's|https://github.com/dlnraja/com.tuya.zigbee|https://github.com/dlnraja/com.universaltuyazigbee.device|g' {} \;
find . -name "*.html" -type f -exec sed -i 's|https://github.com/dlnraja/com.tuya.zigbee|https://github.com/dlnraja/com.universaltuyazigbee.device|g' {} \;

echo "✅ YOLO QUICK FIX COMPLETED" 
