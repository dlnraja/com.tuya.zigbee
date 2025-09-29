#!/bin/bash
# Non-interactive publish script with automatic changelog
export CHANGELOG_TEXT="🔧 FLOW CARDS FIX! Added working triggers, actions, and conditions for comprehensive automation. Fixed compilation issue that prevented flow cards from appearing on app page. Professional automation now available!"

echo "Publishing v1.0.9 with fixed flow cards..."

# Use expect to handle interactive prompts
expect << EOF
spawn homey app publish
expect "Do you want to update your app's version number?"
send "n\r"
expect "What's new in Ultimate Zigbee Hub"
send "$CHANGELOG_TEXT\r"
expect eof
EOF
