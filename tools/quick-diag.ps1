# 🚀 QUICK DIAGNOSTIC - Multi-Source Intelligence
# Collecte diagnostics de TOUTES les sources disponibles

param(
    [switch]$AutoFix
)

Write-Host "`n🧠 DIAGNOSTIC INTELLIGENT MULTI-SOURCE" -ForegroundColor Cyan
Write-Host "═"*80 -ForegroundColor Cyan

# 1. Vérifier l'état de Homey
Write-Host "`n📡 1. Connexion à Homey..." -ForegroundColor Yellow
try {
    $homeyInfo = homey --version 2>&1
    Write-Host "  ✅ Homey CLI: $homeyInfo" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Homey CLI non disponible" -ForegroundColor Red
    exit 1
}

# 2. Récupérer les diagnostics récents de l'app
Write-Host "`n📊 2. Récupération des diagnostics app..." -ForegroundColor Yellow
$diagDir = Join-Path $PSScriptRoot "..\diagnostic-reports"
if (Test-Path $diagDir) {
    $latestDiag = Get-ChildItem $diagDir -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestDiag) {
        Write-Host "  ✅ Dernier diagnostic: $($latestDiag.Name)" -ForegroundColor Green
        $diag = Get-Content $latestDiag.FullName | ConvertFrom-Json
        
        if ($diag.errors) {
            Write-Host "`n  🔥 ERREURS TROUVÉES:" -ForegroundColor Red
            $diag.errors | ForEach-Object {
                Write-Host "    [$($_.severity)] $($_.category) (${_}.count}x)" -ForegroundColor Red
                Write-Host "      💡 Fix: $($_.fix)" -ForegroundColor Yellow
            }
        }
    }
} else {
    Write-Host "  ℹ️  Aucun diagnostic trouvé" -ForegroundColor Gray
}

# 3. Vérifier les fichiers récemment modifiés (problèmes potentiels)
Write-Host "`n📂 3. Analyse des modifications récentes..." -ForegroundColor Yellow
$recentFiles = Get-ChildItem (Join-Path $PSScriptRoot "..\lib") -Recurse -File |
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-24) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 5

if ($recentFiles) {
    Write-Host "  ✅ Fichiers modifiés (24h):" -ForegroundColor Green
    $recentFiles | ForEach-Object {
        Write-Host "    - $($_.Name) ($($_.LastWriteTime.ToString('HH:mm')))" -ForegroundColor Gray
    }
}

# 4. Analyser app.json pour version actuelle
Write-Host "`n📦 4. Version de l'app..." -ForegroundColor Yellow
$appJson = Get-Content (Join-Path $PSScriptRoot "..\app.json") | ConvertFrom-Json
Write-Host "  ✅ Version: v$($appJson.version)" -ForegroundColor Green

# 5. Vérifier le statut Git
Write-Host "`n🔀 5. Statut Git..." -ForegroundColor Yellow
Push-Location (Join-Path $PSScriptRoot "..")
try {
    $gitStatus = git status --short 2>&1
    if ($gitStatus) {
        Write-Host "  ⚠️  Modifications non commitées:" -ForegroundColor Yellow
        $gitStatus | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    } else {
        Write-Host "  ✅ Working tree clean" -ForegroundColor Green
    }
    
    $lastCommit = git log -1 --oneline 2>&1
    Write-Host "  📝 Dernier commit: $lastCommit" -ForegroundColor Gray
} finally {
    Pop-Location
}

# 6. RECOMMENDATIONS INTELLIGENTES
Write-Host "`n💡 6. RECOMMANDATIONS" -ForegroundColor Cyan
Write-Host "═"*80 -ForegroundColor Cyan

$recommendations = @()

# Check if app needs validation
if ($gitStatus) {
    $recommendations += @{
        Priority = "MEDIUM"
        Action = "Commit modifications en attente"
        Command = "git add -A && git commit -m 'fix: ...'"
    }
}

# Check if running latest version on Homey
$recommendations += @{
    Priority = "HIGH"
    Action = "Installer v$($appJson.version) sur Homey pour test"
    Command = "homey app install"
}

# Check for recent errors
if ($diag -and $diag.errors.Count -gt 0) {
    $criticalErrors = $diag.errors | Where-Object { $_.severity -eq "CRITICAL" }
    if ($criticalErrors) {
        $recommendations += @{
            Priority = "CRITICAL"
            Action = "Corriger les erreurs CRITIQUES détectées"
            Command = "Voir diagnostic: $($latestDiag.FullName)"
        }
    }
}

if ($recommendations.Count -eq 0) {
    Write-Host "`n  ✅ Aucune action requise - Tout semble bon!" -ForegroundColor Green
} else {
    $recommendations | Sort-Object { 
        switch ($_.Priority) {
            "CRITICAL" { 0 }
            "HIGH" { 1 }
            "MEDIUM" { 2 }
            default { 3 }
        }
    } | ForEach-Object {
        $color = switch ($_.Priority) {
            "CRITICAL" { "Red" }
            "HIGH" { "Yellow" }
            "MEDIUM" { "Cyan" }
            default { "Gray" }
        }
        Write-Host "`n  [$($_.Priority)]" -ForegroundColor $color -NoNewline
        Write-Host " $($_.Action)" -ForegroundColor White
        Write-Host "    📝 $($_.Command)" -ForegroundColor Gray
    }
}

# 7. AUTO-FIX si demandé
if ($AutoFix) {
    Write-Host "`n🔧 7. AUTO-FIX ACTIVÉ" -ForegroundColor Green
    Write-Host "═"*80 -ForegroundColor Green
    
    # Implémenter les fixes automatiques ici
    Write-Host "  ℹ️  Auto-fix non implémenté pour le moment" -ForegroundColor Gray
}

Write-Host "`n═"*80 -ForegroundColor Cyan
Write-Host "🏁 Diagnostic terminé!" -ForegroundColor Green
Write-Host ""
