# ============================================================================
# MONITOR PUBLICATION - Suivi automatique GitHub Actions
# ============================================================================

param(
    [int]$Cycles = 20,
    [int]$IntervalSeconds = 30
)

$ErrorActionPreference = "Continue"

Write-Host "🔍 MONITOR PUBLICATION - DEBUT" -ForegroundColor Cyan
Write-Host "Surveillance: $Cycles cycles × $IntervalSeconds secondes`n" -ForegroundColor White

$repo = "dlnraja/com.tuya.zigbee"
$actionsUrl = "https://github.com/$repo/actions"
$apiUrl = "https://api.github.com/repos/$repo/actions/runs"

for ($i = 1; $i -le $Cycles; $i++) {
    Write-Host "[$i/$Cycles] " -NoNewline -ForegroundColor Cyan
    Write-Host "$(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
    
    try {
        # Récupérer les dernières exécutions
        $headers = @{
            "Accept" = "application/vnd.github+json"
            "User-Agent" = "PowerShell-Monitor"
        }
        
        $response = Invoke-RestMethod -Uri "$apiUrl?per_page=5" -Headers $headers -ErrorAction Stop
        
        if ($response.workflow_runs -and $response.workflow_runs.Count -gt 0) {
            $latestRun = $response.workflow_runs[0]
            
            $status = $latestRun.status
            $conclusion = $latestRun.conclusion
            $name = $latestRun.name
            $created = [DateTime]$latestRun.created_at
            $elapsed = (Get-Date) - $created
            
            Write-Host "  Workflow: " -NoNewline
            Write-Host "$name" -ForegroundColor White
            
            Write-Host "  Status: " -NoNewline
            switch ($status) {
                "completed" { 
                    Write-Host "COMPLETED" -ForegroundColor Green -NoNewline
                    Write-Host " ($conclusion)" -ForegroundColor $(if ($conclusion -eq "success") { "Green" } else { "Red" })
                }
                "in_progress" { Write-Host "IN PROGRESS" -ForegroundColor Yellow }
                "queued" { Write-Host "QUEUED" -ForegroundColor Cyan }
                default { Write-Host $status -ForegroundColor Gray }
            }
            
            Write-Host "  Duration: " -NoNewline
            Write-Host "$([int]$elapsed.TotalMinutes)m $($elapsed.Seconds)s" -ForegroundColor Gray
            
            # Si completed avec succès, arrêter
            if ($status -eq "completed" -and $conclusion -eq "success") {
                Write-Host "`n🎉 PUBLICATION REUSSIE!" -ForegroundColor Green
                Write-Host "✅ Workflow complete avec succes" -ForegroundColor Green
                Write-Host "🔗 $actionsUrl" -ForegroundColor Cyan
                exit 0
            }
            
            # Si completed avec échec
            if ($status -eq "completed" -and $conclusion -ne "success") {
                Write-Host "`n⚠️ Workflow termine avec: $conclusion" -ForegroundColor Yellow
                Write-Host "🔗 Details: $($latestRun.html_url)" -ForegroundColor Cyan
                
                # Continuer le monitoring au cas où un nouveau workflow démarre
            }
            
        } else {
            Write-Host "  Aucun workflow trouve" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "  ⚠️ Erreur API: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    if ($i -lt $Cycles) {
        Write-Host "  Prochain check dans ${IntervalSeconds}s...`n" -ForegroundColor Gray
        Start-Sleep -Seconds $IntervalSeconds
    }
}

Write-Host "`n📊 MONITORING TERMINE" -ForegroundColor Cyan
Write-Host "🔗 Verifiez manuellement: $actionsUrl" -ForegroundColor White
