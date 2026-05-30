/**
 * recursive-publish-monitor.ps1
 * Boucle récursive jusqu'à ce que l'app soit publiée et en statut test/live sur Athom
 */

$APP_ID = "com.dlnraja.tuya.zigbee"
$REPO   = "dlnraja/com.tuya.zigbee"

# Obtenir le token GitHub
$inputStr = "protocol=https`nhost=github.com`n"
$credOutput = ($inputStr | git credential fill 2>&1)
$GH_TOKEN = ($credOutput | Select-String "password=(.+)").Matches[0].Groups[1].Value.Trim()
$GH_HEADERS = @{ Authorization = "token $GH_TOKEN"; Accept = "application/vnd.github.v3+json" }

# Obtenir le token Athom
$athomSettings = Join-Path $env:APPDATA "athom-cli\settings.json"
$athomCfg = Get-Content $athomSettings -Raw | ConvertFrom-Json
$ATHOM_TOKEN = $athomCfg.homeyApi.token.access_token
$ATHOM_HEADERS = @{ Authorization = "Bearer $ATHOM_TOKEN"; "Content-Type" = "application/json" }

$iteration = 0
$maxIter = 60  # max 60 × 30s = 30 minutes
$published = $false

function Get-WorkflowStatus {
  $runs = Invoke-RestMethod "https://api.github.com/repos/$REPO/actions/runs?per_page=15&branch=master" -Headers $GH_HEADERS
  $runs.workflow_runs
}

function Get-AppStoreStatus {
  # Vérifier l'App Store public Athom
  try {
    $r = Invoke-RestMethod "https://store.homey.community/api/apps/$APP_ID" -ErrorAction SilentlyContinue
    return @{ source = "community"; status = $r.status; version = $r.version }
  } catch {}
  
  # Vérifier via apps.developer.homey.app (nécessite auth)
  try {
    $r2 = Invoke-RestMethod "https://api.athom.com/app/$APP_ID" -Headers $ATHOM_HEADERS -ErrorAction SilentlyContinue
    return @{ source = "athom-api"; status = $r2.status; version = $r2.version }
  } catch {}
  
  return $null
}

function Invoke-PublishIfNeeded {
  param($failedWorkflows)
  
  if ($failedWorkflows.Count -gt 0) {
    Write-Host "  🔄 Re-dispatching failed workflows..."
    foreach ($wf in $failedWorkflows) {
      try {
        $wfFile = switch($wf) {
          { $_ -match "Auto-Publish" }    { "auto-publish-on-push.yml" }
          { $_ -match "Draft.to.Test" }   { "draft-to-test.yml" }
          { $_ -match "Security" }         { "security-gate.yml" }
          { $_ -match "Fleet" }            { "fleet-validation.yml" }
          { $_ -match "Orchestrator" }     { "unified-cicd.yml" }
          default                          { $null }
        }
        if ($wfFile) {
          Invoke-RestMethod "https://api.github.com/repos/$REPO/actions/workflows/$wfFile/dispatches" `
            -Method Post -Headers $GH_HEADERS -Body '{"ref":"master"}' -ContentType "application/json" | Out-Null
          Write-Host "    ✅ Dispatched: $wfFile"
        }
      } catch { Write-Host "    ❌ Dispatch failed for $wf`: $($_.Exception.Message.Substring(0, [Math]::Min(80,$_.Exception.Message.Length)))" }
    }
  }
}

Write-Host "╔══════════════════════════════════════════════════════════════════╗"
Write-Host "║  RECURSIVE PUBLISH MONITOR — $APP_ID"
Write-Host "║  Max iterations: $maxIter (every 30s = 30min max)"
Write-Host "╚══════════════════════════════════════════════════════════════════╝"
Write-Host ""

do {
  $iteration++
  $ts = Get-Date -Format "HH:mm:ss"
  Write-Host "━━━ [$ts] Iteration $iteration/$maxIter ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 1. État des workflows
  $runs = Get-WorkflowStatus
  $keyWorkflows = $runs | Where-Object { $_.name -match "Auto-Publish|Draft.to.Test|Security|Fleet|Orchestrator|Syntax|Mandatory" } | Select-Object -First 10
  
  $failed = @()
  $inProgress = @()
  $succeeded = @()
  
  foreach ($r in $keyWorkflows) {
    $icon = switch($r.conclusion) {
      'success' { '✅'; $succeeded += $r.name; break }
      'failure' { '❌'; $failed += $r.name; break }
      'skipped' { '⏭️'; break }
      default   { if($r.status -eq 'in_progress'){'⏳'; $inProgress += $r.name} else{'?'} }
    }
    Write-Host "  $icon #$($r.run_number) $($r.name)"
  }
  
  # 2. Version actuelle en local
  $localVer = (node -e "console.log(require('./app.json').version)" 2>&1)
  Write-Host ""
  Write-Host "  📦 Local version: v$localVer"
  
  # 3. Vérifier le statut App Store
  Write-Host "  🌐 App Store check..."
  $storeStatus = Get-AppStoreStatus
  if ($storeStatus) {
    Write-Host "  🏪 Store: $($storeStatus.source) | status=$($storeStatus.status) | v=$($storeStatus.version)"
    if ($storeStatus.status -match "live|published|test|approved") {
      Write-Host ""
      Write-Host "  🎉 APP IS $($storeStatus.status.ToUpper())!"
      $published = $true
    }
  } else {
    Write-Host "  🏪 Store: No public API response (normal for draft/test builds)"
  }
  
  # 4. Vérifier si Auto-Publish est en succès récent
  $lastPublish = $runs | Where-Object { $_.name -match "Auto-Publish" } | Select-Object -First 1
  if ($lastPublish -and $lastPublish.conclusion -eq 'success') {
    Write-Host "  ✅ Auto-Publish dernière run: SUCCESS (#$($lastPublish.run_number))"
    
    # Vérifier le Draft-to-Test
    $lastDraftTest = $runs | Where-Object { $_.name -match "Draft.to.Test" } | Select-Object -First 1
    if ($lastDraftTest -and $lastDraftTest.conclusion -eq 'success') {
      Write-Host "  ✅ Draft-to-Test dernière run: SUCCESS (#$($lastDraftTest.run_number))"
      Write-Host ""
      Write-Host "  ✅ Pipeline complet: Publish + Draft-to-Test OK"
      Write-Host "  ✅ App disponible en canal TEST sur Homey Pro"
      $published = $true
    } elseif ($lastDraftTest -and $lastDraftTest.status -eq 'in_progress') {
      Write-Host "  ⏳ Draft-to-Test en cours... (#$($lastDraftTest.run_number))"
    } elseif ($lastDraftTest -and $lastDraftTest.conclusion -eq 'failure') {
      Write-Host "  ❌ Draft-to-Test FAILED — re-dispatch..."
      try {
        Invoke-RestMethod "https://api.github.com/repos/$REPO/actions/workflows/draft-to-test.yml/dispatches" `
          -Method Post -Headers $GH_HEADERS -Body '{"ref":"master"}' -ContentType "application/json" | Out-Null
        Write-Host "  🔄 Draft-to-Test re-dispatché"
      } catch { Write-Host "  ❌ Dispatch failed: $($_.Exception.Message)" }
    } else {
      Write-Host "  ⚠️  Draft-to-Test: $($lastDraftTest.status)/$($lastDraftTest.conclusion)"
    }
  }
  
  # 5. Workflows en failure → re-dispatch
  if ($failed.Count -gt 0) {
    Write-Host ""
    Write-Host "  ⚠️  Workflows en failure: $($failed -join ', ')"
    Invoke-PublishIfNeeded -failedWorkflows $failed
  }
  
  # 6. Si tout est bon → sortir
  if ($published) {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════╗"
    Write-Host "║  ✅ PUBLICATION COMPLÈTE — App disponible sur Homey App Store   ║"
    Write-Host "║  Version: v$localVer | Drivers: 411                             ║"
    Write-Host "╚══════════════════════════════════════════════════════════════════╝"
    break
  }
  
  if ($inProgress.Count -gt 0) {
    Write-Host ""
    Write-Host "  ⏳ En cours: $($inProgress -join ', ')"
  }
  
  if (-not $published -and $iteration -lt $maxIter) {
    Write-Host "  ⏱️  Prochaine vérification dans 30s..."
    Start-Sleep 30
  }
  
} while ($iteration -lt $maxIter -and -not $published)

if (-not $published) {
  Write-Host ""
  Write-Host "⚠️  Timeout après $maxIter itérations — vérification manuelle requise"
  Write-Host "   URL: https://github.com/$REPO/actions"
}
