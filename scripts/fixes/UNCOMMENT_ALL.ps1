# UNCOMMENT_ALL.ps1
# Dé-commente et enrichit TOUS les drivers automatiquement

Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host "🔧 UNCOMMENT ALL COMMENTED CODE - Massive Fix" -ForegroundColor Yellow
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host ""

$driversPath = "drivers"
$filesFixed = 0
$linesUncommented = 0

# Trouver tous les device.js avec code commenté
Write-Host "🔍 Scanning for commented code..." -ForegroundColor Cyan
$deviceFiles = Get-ChildItem -Path $driversPath -Recurse -Filter "device.js" | Where-Object {
    $content = Get-Content $_.FullName -Raw
    $content -match "// this\.registerCapability"
}

Write-Host "📊 Found $($deviceFiles.Count) files with commented code`n" -ForegroundColor Green

foreach ($file in $deviceFiles) {
    Write-Host "📝 Fixing: $($file.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor Yellow
    
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # 1. Ajouter import CLUSTER si manquant
    if ($content -notmatch "require\('zigbee-clusters'\)") {
        Write-Host "  ✅ Adding CLUSTER import" -ForegroundColor Green
        $content = $content -replace "(const .+ = require\('.+'\);)", "`$1`nconst { CLUSTER } = require('zigbee-clusters');"
    }
    
    # 2. Dé-commenter // this.registerCapability
    $matches = [regex]::Matches($content, "// this\.registerCapability")
    if ($matches.Count -gt 0) {
        Write-Host "  ✅ Uncommenting $($matches.Count) registerCapability calls" -ForegroundColor Green
        $linesUncommented += $matches.Count
        $content = $content -replace "// (this\.registerCapability)", "`$1"
    }
    
    # 3. Dé-commenter les lignes de configuration
    $content = $content -replace "// (  endpoint:)", "`$1"
    $content = $content -replace "// (  get:)", "`$1"
    $content = $content -replace "// (  set:)", "`$1"
    $content = $content -replace "// (  setParser:)", "`$1"
    $content = $content -replace "// (  report:)", "`$1"
    $content = $content -replace "// (  reportParser:)", "`$1"
    $content = $content -replace "// (  reportOpts:)", "`$1"
    $content = $content -replace "// (  getOpts:)", "`$1"
    $content = $content -replace "// (    .+)", "`$1"
    $content = $content -replace "// (\}\);)", "`$1"
    
    # 4. Remplacer cluster IDs par CLUSTER objects
    $content = $content -replace "registerCapability\(([^,]+),\s*0,", "registerCapability(`$1, CLUSTER.BASIC,"
    $content = $content -replace "registerCapability\(([^,]+),\s*1,", "registerCapability(`$1, CLUSTER.POWER_CONFIGURATION,"
    $content = $content -replace "registerCapability\(([^,]+),\s*6,", "registerCapability(`$1, CLUSTER.ON_OFF,"
    $content = $content -replace "registerCapability\(([^,]+),\s*8,", "registerCapability(`$1, CLUSTER.LEVEL_CONTROL,"
    $content = $content -replace "registerCapability\(([^,]+),\s*768,", "registerCapability(`$1, CLUSTER.COLOR_CONTROL,"
    $content = $content -replace "registerCapability\(([^,]+),\s*1026,", "registerCapability(`$1, CLUSTER.TEMPERATURE_MEASUREMENT,"
    $content = $content -replace "registerCapability\(([^,]+),\s*2820,", "registerCapability(`$1, CLUSTER.ELECTRICAL_MEASUREMENT,"
    
    # 5. Supprimer commentaires REFACTOR
    $content = $content -replace "/\* REFACTOR:.+?\*/\s*", ""
    
    # 6. Sauvegarder si modifié
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesFixed++
        Write-Host "  ✅ File fixed and saved`n" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  No changes needed`n" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host "📊 SUMMARY:" -ForegroundColor Yellow
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host "  Files scanned:        $($deviceFiles.Count)"
Write-Host "  Files fixed:          $filesFixed"
Write-Host "  Lines uncommented:    $linesUncommented"
Write-Host "═" * 80 -ForegroundColor Cyan

if ($filesFixed -gt 0) {
    Write-Host "`n✅ SUCCESS! All files have been fixed." -ForegroundColor Green
    Write-Host "`n📝 Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Review: git diff"
    Write-Host "  2. Validate: homey app validate --level publish"
    Write-Host "  3. Commit: git add -A && git commit -m 'fix: Uncomment all registerCapability calls (88 drivers)'"
    Write-Host "  4. Push: git push origin master"
} else {
    Write-Host "`n⚠️  No changes were needed." -ForegroundColor Yellow
}

Write-Host ""
