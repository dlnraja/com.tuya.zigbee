# Publication automatique Homey
Write-Host "Publication automatique v2.0.0"

# Nettoyer
Remove-Item .homeybuild -Recurse -Force -ErrorAction SilentlyContinue

# Valider
homey app validate

# Version 2.0.0
homey app version 2.0.0 --commit --changelog.en "v2.0.0 - Major update with 164 drivers"

# Push
git push origin master
git push origin --tags

# Build
homey app build

Write-Host "Publication terminee"
Write-Host "Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.ultimate.zigbee.hub"
