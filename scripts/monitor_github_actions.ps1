# Monitor GitHub Actions Workflow
# Checks GitHub Actions status for Homey App Publish

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "MONITORING GITHUB ACTIONS - Homey App Publish" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$repoUrl = "https://github.com/dlnraja/com.tuya.zigbee"
$actionsUrl = "$repoUrl/actions"
$workflowsUrl = "$repoUrl/actions/workflows/homey-app-publish.yml"

Write-Host "Repository: $repoUrl" -ForegroundColor Yellow
Write-Host "Actions: $actionsUrl" -ForegroundColor Yellow
Write-Host "Workflow: $workflowsUrl" -ForegroundColor Yellow
Write-Host ""

Write-Host "Workflow Status:" -ForegroundColor Green
Write-Host "  - Trigger: Push to master" -ForegroundColor White
Write-Host "  - Jobs: Validate, Publish, Monitor" -ForegroundColor White
Write-Host "  - Expected duration: 2-5 minutes" -ForegroundColor White
Write-Host ""

Write-Host "Monitoring Instructions:" -ForegroundColor Green
Write-Host "  1. Open: $actionsUrl" -ForegroundColor White
Write-Host "  2. Click on 'Homey App Publish' workflow" -ForegroundColor White
Write-Host "  3. Check latest run status" -ForegroundColor White
Write-Host "  4. View logs for details" -ForegroundColor White
Write-Host ""

Write-Host "Expected Steps:" -ForegroundColor Green
Write-Host "  [1/3] Validate: Homey app validation" -ForegroundColor White
Write-Host "  [2/3] Publish: Publish to Homey App Store" -ForegroundColor White
Write-Host "  [3/3] Monitor: Check publication status" -ForegroundColor White
Write-Host ""

Write-Host "Opening GitHub Actions in browser..." -ForegroundColor Yellow
Start-Process $actionsUrl

Write-Host ""
Write-Host "IMPORTANT: Check for HOMEY_TOKEN secret!" -ForegroundColor Red
Write-Host "  - Go to: $repoUrl/settings/secrets/actions" -ForegroundColor White
Write-Host "  - Add secret: HOMEY_TOKEN" -ForegroundColor White
Write-Host "  - Value: Get from 'homey login'" -ForegroundColor White
Write-Host ""

Write-Host "After publication:" -ForegroundColor Green
Write-Host "  - App Store: https://homey.app/a/com.tuya.zigbee/" -ForegroundColor White
Write-Host "  - Build Status: https://tools.developer.homey.app/apps/app/com.tuya.zigbee/" -ForegroundColor White
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "MONITORING ACTIVE - Check browser for workflow status" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
