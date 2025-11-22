# 🔴 LIVE MONITOR - Surveillance temps réel avec auto-diagnostic
# Pour Homey Cloud

Write-Host "`n🔴 LIVE MONITOR - Surveillance Temps Réel" -ForegroundColor Red
Write-Host "═"*80 -ForegroundColor Red
Write-Host ""

$logFile = Join-Path $PSScriptRoot "..\diagnostic-reports\live-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$errorFile = Join-Path $PSScriptRoot "..\diagnostic-reports\errors-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"

# Ensure directory exists
$null = New-Item -ItemType Directory -Force -Path (Split-Path $logFile)

Write-Host "📝 Log file: $logFile" -ForegroundColor Cyan
Write-Host "📝 Error file: $errorFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Démarrage de homey app run..." -ForegroundColor Yellow
Write-Host "   (Appuyez sur Ctrl+C pour arrêter et générer le rapport)" -ForegroundColor Gray
Write-Host ""
Write-Host "═"*80 -ForegroundColor Cyan
Write-Host ""

# Collecter les erreurs
$global:errors = @()
$global:devices = @{}
$global:startTime = Get-Date

# Patterns d'erreurs
$errorPatterns = @(
    @{Pattern = 'expected_cluster_id_number'; Severity = 'CRITICAL'; Category = 'CLUSTER_ID'},
    @{Pattern = 'Invalid Flow Card ID'; Severity = 'CRITICAL'; Category = 'FLOW_CARD'},
    @{Pattern = 'Does not exist.*Cluster'; Severity = 'HIGH'; Category = 'CLUSTER_MISSING'},
    @{Pattern = 'Zigbee est en cours de démarrage'; Severity = 'HIGH'; Category = 'TIMING'},
    @{Pattern = 'Could not read battery'; Severity = 'MEDIUM'; Category = 'BATTERY'},
    @{Pattern = 'reporting failed'; Severity = 'MEDIUM'; Category = 'REPORTING'},
    @{Pattern = 'MODULE_NOT_FOUND'; Severity = 'CRITICAL'; Category = 'MODULE'},
    @{Pattern = 'Timeout.*Expected Response'; Severity = 'MEDIUM'; Category = 'TIMEOUT'}
)

# Fonction pour analyser les lignes
function Analyze-Line {
    param([string]$Line)
    
    # Timestamp
    $timestamp = Get-Date -Format 'HH:mm:ss'
    $fullLine = "[$timestamp] $Line"
    
    # Save to log
    Add-Content -Path $logFile -Value $fullLine
    
    # Colorize output
    if ($Line -match '✅|SUCCESS') {
        Write-Host $fullLine -ForegroundColor Green
    }
    elseif ($Line -match '❌|ERROR') {
        Write-Host $fullLine -ForegroundColor Red
    }
    elseif ($Line -match '⚠️|WARN') {
        Write-Host $fullLine -ForegroundColor Yellow
    }
    elseif ($Line -match '🔍|DEBUG') {
        Write-Host $fullLine -ForegroundColor Cyan
    }
    else {
        Write-Host $fullLine
    }
    
    # Detect errors
    foreach ($pattern in $errorPatterns) {
        if ($Line -match $pattern.Pattern) {
            $error = @{
                Timestamp = (Get-Date).ToString('o')
                Severity = $pattern.Severity
                Category = $pattern.Category
                Message = $Line
            }
            $global:errors += $error
            
            # Alert
            Write-Host ""
            Write-Host ("⚠️ "*40) -ForegroundColor Yellow
            Write-Host "🚨 $($pattern.Severity) ERROR: $($pattern.Category)" -ForegroundColor Red
            Write-Host "📝 $Line" -ForegroundColor White
            Write-Host ("⚠️ "*40) -ForegroundColor Yellow
            Write-Host ""
            break
        }
    }
    
    # Extract device info
    if ($Line -match '\[(.*?)\]') {
        $deviceName = $Matches[1]
        if (-not $global:devices.ContainsKey($deviceName)) {
            $global:devices[$deviceName] = @{
                Name = $deviceName
                Events = @()
                Errors = 0
            }
        }
        $global:devices[$deviceName].Events += @{
            Time = (Get-Date).ToString('o')
            Message = $Line
        }
        if ($Line -match 'error|❌') {
            $global:devices[$deviceName].Errors++
        }
    }
}

# Fonction pour générer le rapport
function Generate-Report {
    $duration = (Get-Date) - $global:startTime
    
    Write-Host ""
    Write-Host "═"*80 -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 RAPPORT DIAGNOSTIC" -ForegroundColor Cyan
    Write-Host "═"*80 -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⏱️  Durée: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor White
    Write-Host "📊 Erreurs détectées: $($global:errors.Count)" -ForegroundColor White
    Write-Host "📱 Devices monitorés: $($global:devices.Count)" -ForegroundColor White
    Write-Host ""
    
    if ($global:errors.Count -gt 0) {
        # Group by category
        $grouped = $global:errors | Group-Object -Property Category | Sort-Object Count -Descending
        
        Write-Host "🔥 ERREURS PAR CATÉGORIE:" -ForegroundColor Red
        Write-Host ""
        foreach ($group in $grouped) {
            $severity = $group.Group[0].Severity
            $color = switch ($severity) {
                'CRITICAL' { 'Red' }
                'HIGH' { 'Yellow' }
                'MEDIUM' { 'Cyan' }
                default { 'Gray' }
            }
            Write-Host "  [$severity] $($group.Name): $($group.Count)x" -ForegroundColor $color
        }
        Write-Host ""
        
        # Save detailed report
        $report = @{
            Generated = (Get-Date).ToString('o')
            Duration = $duration.ToString()
            Summary = @{
                TotalErrors = $global:errors.Count
                TotalDevices = $global:devices.Count
                CriticalErrors = ($global:errors | Where-Object { $_.Severity -eq 'CRITICAL' }).Count
                HighErrors = ($global:errors | Where-Object { $_.Severity -eq 'HIGH' }).Count
                MediumErrors = ($global:errors | Where-Object { $_.Severity -eq 'MEDIUM' }).Count
            }
            Errors = $global:errors
            Devices = $global:devices
        }
        
        $report | ConvertTo-Json -Depth 10 | Set-Content -Path $errorFile
        Write-Host "💾 Rapport détaillé sauvegardé: $errorFile" -ForegroundColor Green
    }
    else {
        Write-Host "✅ Aucune erreur détectée!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "📝 Log complet: $logFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "═"*80 -ForegroundColor Cyan
    Write-Host ""
}

# Cleanup handler
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Generate-Report
}

try {
    # Start homey app run and process output
    $process = Start-Process -FilePath "homey" -ArgumentList "app", "run" `
        -WorkingDirectory (Join-Path $PSScriptRoot "..") `
        -NoNewWindow -PassThru `
        -RedirectStandardOutput (Join-Path $PSScriptRoot "temp-stdout.log") `
        -RedirectStandardError (Join-Path $PSScriptRoot "temp-stderr.log")
    
    # Monitor outputs
    $stdoutPath = Join-Path $PSScriptRoot "temp-stdout.log"
    $stderrPath = Join-Path $PSScriptRoot "temp-stderr.log"
    
    $lastStdoutPos = 0
    $lastStderrPos = 0
    
    while (-not $process.HasExited) {
        Start-Sleep -Milliseconds 500
        
        # Read stdout
        if (Test-Path $stdoutPath) {
            $content = Get-Content $stdoutPath -Raw -ErrorAction SilentlyContinue
            if ($content -and $content.Length -gt $lastStdoutPos) {
                $newContent = $content.Substring($lastStdoutPos)
                $lastStdoutPos = $content.Length
                $newContent -split "`n" | Where-Object { $_ } | ForEach-Object { Analyze-Line $_ }
            }
        }
        
        # Read stderr
        if (Test-Path $stderrPath) {
            $content = Get-Content $stderrPath -Raw -ErrorAction SilentlyContinue
            if ($content -and $content.Length -gt $lastStderrPos) {
                $newContent = $content.Substring($lastStderrPos)
                $lastStderrPos = $content.Length
                $newContent -split "`n" | Where-Object { $_ } | ForEach-Object { Analyze-Line $_ }
            }
        }
    }
    
    $process.WaitForExit()
}
catch {
    Write-Host "`n❌ Erreur: $_" -ForegroundColor Red
}
finally {
    Generate-Report
    
    # Cleanup temp files
    Remove-Item (Join-Path $PSScriptRoot "temp-*.log") -ErrorAction SilentlyContinue
}
