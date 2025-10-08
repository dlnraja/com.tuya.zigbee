# WATCH LATEST RUN - PowerShell Real-Time Monitor
# Monitors the latest GitHub Actions run in real-time

Write-Host "🔴 LIVE - WATCHING LATEST WORKFLOW RUN" -ForegroundColor Red
Write-Host "═" * 60 -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date
$checkCount = 0

while ($true) {
    $checkCount++
    Clear-Host
    
    Write-Host "═" * 60 -ForegroundColor Cyan
    Write-Host "🔴 LIVE MONITORING - Check #$checkCount" -ForegroundColor Red
    $elapsed = (Get-Date) - $startTime
    Write-Host ("⏱️  Elapsed: {0:mm}m {0:ss}s" -f $elapsed) -ForegroundColor Yellow
    Write-Host ("🕐 Time: " + (Get-Date -Format "HH:mm:ss")) -ForegroundColor Green
    Write-Host "═" * 60 -ForegroundColor Cyan
    Write-Host ""
    
    try {
        # Get latest runs
        $runs = gh run list --limit 3 --json status,conclusion,name,databaseId,createdAt | ConvertFrom-Json
        
        if ($runs.Count -eq 0) {
            Write-Host "⚠️  No workflows found" -ForegroundColor Yellow
            break
        }
        
        $inProgress = 0
        $succeeded = 0
        $failed = 0
        
        foreach ($run in $runs) {
            $emoji = switch ($run.status) {
                "in_progress" { "⏳" }
                "queued" { "⏸️" }
                "completed" {
                    switch ($run.conclusion) {
                        "success" { "✅" }
                        "failure" { "❌" }
                        default { "❓" }
                    }
                }
                default { "❓" }
            }
            
            Write-Host "$emoji $($run.name)" -ForegroundColor White
            Write-Host "   ID: $($run.databaseId)" -ForegroundColor Gray
            Write-Host "   Status: $($run.status)" -ForegroundColor Cyan
            
            if ($run.conclusion) {
                $color = if ($run.conclusion -eq "success") { "Green" } else { "Red" }
                Write-Host "   Result: $($run.conclusion.ToUpper())" -ForegroundColor $color
            }
            
            if ($run.status -eq "in_progress" -or $run.status -eq "queued") {
                $inProgress++
            }
            elseif ($run.conclusion -eq "success") {
                $succeeded++
            }
            elseif ($run.conclusion -eq "failure") {
                $failed++
            }
            
            Write-Host ""
        }
        
        Write-Host "═" * 60 -ForegroundColor Cyan
        Write-Host "📊 SUMMARY: $succeeded succeeded, $inProgress in progress, $failed failed" -ForegroundColor White
        Write-Host "═" * 60 -ForegroundColor Cyan
        Write-Host ""
        
        # Check if all completed
        if ($inProgress -eq 0) {
            if ($failed -eq 0 -and $succeeded -gt 0) {
                Write-Host "🎉 SUCCESS - All workflows completed successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "✅ $succeeded workflow(s) succeeded" -ForegroundColor Green
                Write-Host ("⏱️  Total time: {0:mm}m {0:ss}s" -f $elapsed) -ForegroundColor Yellow
                
                # Save report
                $report = @{
                    timestamp = (Get-Date).ToString("o")
                    successCount = $succeeded
                    totalChecks = $checkCount
                    duration = [int]$elapsed.TotalSeconds
                    status = "SUCCESS"
                } | ConvertTo-Json
                
                $report | Out-File -FilePath "MONITORING_SUCCESS.json" -Encoding UTF8
                
                break
            }
            else {
                Write-Host "⚠️  All workflows completed but some failed" -ForegroundColor Yellow
                Write-Host ""
                
                foreach ($run in $runs) {
                    if ($run.conclusion -eq "failure") {
                        Write-Host "❌ Failed: $($run.name)" -ForegroundColor Red
                        Write-Host "   Run ID: $($run.databaseId)" -ForegroundColor Gray
                        Write-Host "   View logs: gh run view $($run.databaseId) --log-failed" -ForegroundColor Cyan
                        Write-Host ""
                    }
                }
                
                break
            }
        }
        
        Write-Host "⏳ Checking again in 15 seconds..." -ForegroundColor Yellow
        Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
        
    }
    catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        break
    }
    
    Start-Sleep -Seconds 15
}

Write-Host ""
Write-Host "Monitoring stopped." -ForegroundColor Gray
