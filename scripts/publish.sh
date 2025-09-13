#!/bin/bash
# Fixed publish script that handles changelog question properly

echo "🚀 Starting publish process..."

# Validate first
echo "📋 Validating app..."
homey app validate --level publish

if [ $? -ne 0 ]; then
    echo "❌ Validation failed"
    exit 1
fi

# Publish with automatic responses
echo "📤 Publishing app..."
{
    echo "n"  # Don't update version
    sleep 2
    echo "🎉 v1.0.8 COMPREHENSIVE CLEANUP - Fixed all undefined values, rebranded device names to be generic and professional, added working flow cards, and enhanced overall quality following Homey SDK v3 standards!"
    sleep 1
} | homey app publish

echo "✅ Publish process completed!"