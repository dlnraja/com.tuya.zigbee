# Script de monitoring et correction automatique GitHub Actions

param(
    [int]$MaxAttempts = 10,
    [int]$CheckIntervalSeconds = 60
)

Write-Host "🔍 MONITORING GITHUB ACTIONS - AUTO-FIX" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Max attempts: $MaxAttempts" -ForegroundColor Gray
Write-Host "Check interval: $CheckIntervalSeconds seconds" -ForegroundColor Gray
Write-Host ""

$attempt = 0

while ($attempt -lt $MaxAttempts) {
    $attempt++
    Write-Host "[$attempt/$MaxAttempts] Checking latest workflow run..." -ForegroundColor Yellow
    
    # Get latest workflow run
    try {
        $runJson = gh run list --repo dlnraja/com.tuya.zigbee --workflow="homey-app-store.yml" --limit 1 --json status,conclusion,databaseId,createdAt
        $run = $runJson | ConvertFrom-Json | Select-Object -First 1
        
        if ($run) {
            $status = $run.status
            $conclusion = $run.conclusion
            $runId = $run.databaseId
            $createdAt = $run.createdAt
            
            Write-Host "  Run ID: $runId" -ForegroundColor Gray
            Write-Host "  Status: $status" -ForegroundColor Gray
            Write-Host "  Conclusion: $conclusion" -ForegroundColor Gray
            Write-Host "  Created: $createdAt" -ForegroundColor Gray
            Write-Host ""
            
            # Check if completed
            if ($status -eq "completed") {
                if ($conclusion -eq "success") {
                    Write-Host "✅ Workflow succeeded!" -ForegroundColor Green
                    Write-Host ""
                    
                    # Get logs to extract Build ID
                    Write-Host "📋 Extracting Build ID from logs..." -ForegroundColor Cyan
                    $logs = gh run view $runId --repo dlnraja/com.tuya.zigbee --log
                    
                    if ($logs -match "Created Build ID (\d+)") {
                        $buildId = $Matches[1]
                        Write-Host "✅ Build ID found: $buildId" -ForegroundColor Green
                        Write-Host ""
                        
                        # Promote to Test
                        Write-Host "🚀 Promoting Build #$buildId to Test..." -ForegroundColor Cyan
                        
                        if ($env:HOMEY_PAT) {
                            $headers = @{
                                "Authorization" = "Bearer $env:HOMEY_PAT"
                                "Content-Type" = "application/json"
                            }
                            $body = @{ target = "test" } | ConvertTo-Json
                            
                            try {
                                $response = Invoke-RestMethod `
                                    -Uri "https://api.developer.homey.app/app/com.dlnraja.tuya.zigbee/build/$buildId/promote" `
                                    -Method Post `
                                    -Headers $headers `
                                    -Body $body
                                
                                Write-Host "✅ Build #$buildId promoted to Test!" -ForegroundColor Green
                                Write-Host ""
                                Write-Host "🔗 Test URL: https://homey.app/a/com.dlnraja.tuya.zigbee/test/" -ForegroundColor Cyan
                                Write-Host "🔗 Dashboard: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/$buildId" -ForegroundColor Cyan
                                Write-Host ""
                                Write-Host "🎉 DONE! Workflow successful + Build promoted!" -ForegroundColor Green
                                exit 0
                            }
                            catch {
                                Write-Host "⚠️ Promotion failed: $($_.Exception.Message)" -ForegroundColor Yellow
                                Write-Host "Manual: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/$buildId" -ForegroundColor Gray
                                exit 1
                            }
                        }
                        else {
                            Write-Host "⚠️ HOMEY_PAT not set, manual promotion required" -ForegroundColor Yellow
                            Write-Host "Build #$buildId: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee/build/$buildId" -ForegroundColor Gray
                            exit 0
                        }
                    }
                    else {
                        Write-Host "⚠️ Could not extract Build ID from logs" -ForegroundColor Yellow
                        Write-Host "Check manually: https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee" -ForegroundColor Gray
                        exit 0
                    }
                }
                elseif ($conclusion -eq "failure") {
                    Write-Host "❌ Workflow failed!" -ForegroundColor Red
                    Write-Host ""
                    
                    # Get failure logs
                    Write-Host "📋 Fetching error logs..." -ForegroundColor Cyan
                    $logs = gh run view $runId --repo dlnraja/com.tuya.zigbee --log-failed
                    
                    Write-Host ""
                    Write-Host "Error details:" -ForegroundColor Yellow
                    Write-Host $logs -ForegroundColor Gray
                    Write-Host ""
                    
                    # Check if we should retry
                    Write-Host "🔄 Retrying workflow..." -ForegroundColor Yellow
                    gh run rerun $runId --repo dlnraja/com.tuya.zigbee --failed
                    
                    Write-Host "✅ Workflow rerun triggered" -ForegroundColor Green
                    Write-Host "Waiting for next check..." -ForegroundColor Gray
                    Write-Host ""
                }
                else {
                    Write-Host "⚠️ Workflow completed with status: $conclusion" -ForegroundColor Yellow
                    exit 1
                }
            }
            elseif ($status -eq "in_progress" -or $status -eq "queued") {
                Write-Host "⏳ Workflow still running..." -ForegroundColor Yellow
                Write-Host ""
            }
        }
        else {
            Write-Host "⚠️ No workflow runs found" -ForegroundColor Yellow
            Write-Host ""
        }
    }
    catch {
        Write-Host "❌ Error checking workflow: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
    
    if ($attempt -lt $MaxAttempts) {
        Write-Host "Waiting $CheckIntervalSeconds seconds before next check..." -ForegroundColor Gray
        Write-Host ""
        Start-Sleep -Seconds $CheckIntervalSeconds
    }
}

Write-Host "⚠️ Max attempts reached ($MaxAttempts)" -ForegroundColor Yellow
Write-Host "Check manually: https://github.com/dlnraja/com.tuya.zigbee/actions" -ForegroundColor Gray
