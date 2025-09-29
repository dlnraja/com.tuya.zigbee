#!/bin/bash
echo "🚀 Publication Homey App v1.0.32"

# Nettoyage
rm -rf .homeycompose .homeybuild

# Publication avec réponses automatiques
expect << 'EOF'
spawn homey app publish
expect "uncommitted changes" { send "yes\r" }
expect "update your app's version" { send "yes\r" }
expect "Select the desired version" { send "\r" }
expect eof
EOF
