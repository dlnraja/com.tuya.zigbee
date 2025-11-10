# Status Check Script for Homey App Publishing
Write-Host "🔍 HOMEY APP PUBLISH STATUS CHECK" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check app.json
Write-Host "📄 Checking app.json..." -ForegroundColor Yellow
if (Test-Path "app.json") {
    try {
        $appJson = Get-Content "app.json" | ConvertFrom-Json
        $version = $appJson.version
        $appId = $appJson.id
        Write-Host "✅ app.json valid" -ForegroundColor Green
        Write-Host "   ID: $appId" -ForegroundColor Gray
        Write-Host "   Version: $version" -ForegroundColor Gray
    } catch {
        Write-Host "❌ app.json invalid JSON!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ app.json not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check GitHub Actions
Write-Host "🔄 Checking GitHub Actions..." -ForegroundColor Yellow
try {
    $runs = gh run list --limit 5 --json conclusion,name,status,createdAt 2>&1 | ConvertFrom-Json
    
    if ($runs) {
        Write-Host "Recent workflow runs:" -ForegroundColor Gray
        foreach ($run in $runs) {
            $icon = switch ($run.conclusion) {
                "success" { "✅" }
                "failure" { "❌" }
                default { "🔄" }
            }
            $status = if ($run.status -eq "in_progress") { "(running)" } else { "($($run.conclusion))" }
            Write-Host "  $icon $($run.name) $status" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "⚠️  Could not check GitHub Actions (gh CLI needed)" -ForegroundColor Yellow
}

Write-Host ""

# Check Homey CLI
Write-Host "🔧 Checking Homey CLI..." -ForegroundColor Yellow
try {
    $homeyVersion = homey --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Homey CLI installed: $homeyVersion" -ForegroundColor Green
    } else {
        throw
    }
} catch {
    Write-Host "⚠️  Homey CLI not installed" -ForegroundColor Yellow
    Write-Host "   Install: npm install -g homey" -ForegroundColor Gray
}

Write-Host ""

# Check HOMEY_PAT secret
Write-Host "🔑 Checking HOMEY_PAT secret..." -ForegroundColor Yellow
try {
    $secrets = gh secret list 2>&1
    if ($secrets -match "HOMEY_PAT") {
        Write-Host "✅ HOMEY_PAT configured in GitHub" -ForegroundColor Green
    } else {
        Write-Host "❌ HOMEY_PAT not configured!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Configure HOMEY_PAT:" -ForegroundColor Yellow
        Write-Host "1. Get token: https://tools.developer.homey.app/api" -ForegroundColor Gray
        Write-Host "2. Add to GitHub: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions" -ForegroundColor Gray
        Write-Host "   Name: HOMEY_PAT" -ForegroundColor Gray
        Write-Host "   Value: (paste your token)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not check secrets (gh CLI needed)" -ForegroundColor Yellow
}

Write-Host ""

# Summary
Write-Host "📊 SUMMARY" -ForegroundColor Cyan
Write-Host "==========" -ForegroundColor Cyan
Write-Host "App: $appId v$version" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Ensure HOMEY_PAT is configured" -ForegroundColor Gray
Write-Host "2. Run publish workflow:" -ForegroundColor Gray
Write-Host "   gh workflow run MASTER-publish-v2.yml" -ForegroundColor Gray
Write-Host "3. Monitor: gh run watch" -ForegroundColor Gray
Write-Host "4. Check: https://tools.developer.homey.app" -ForegroundColor Gray
Write-Host ""
Write-Host "Workflow links:" -ForegroundColor Yellow
Write-Host "- https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/MASTER-publish-v2.yml" -ForegroundColor Gray
Write-Host "- https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/MASTER-cleanup-organize.yml" -ForegroundColor Gray
Write-Host "- https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/MASTER-auto-fix-monitor.yml" -ForegroundColor Gray
Write-Host ""
