# Run from project root: c:\Users\HP\Desktop\tuya_repair
$ErrorActionPreference = 'Stop'
Set-Location "$PSScriptRoot\.."

Write-Host "=== Phase 0: Préparation ==="
node -v
npm -v
homey --version

git fetch --all
git pull --rebase

if (Test-Path .homeybuild) { Remove-Item -Recurse -Force .homeybuild }

Write-Host "=== Phase 0.5: Orchestrateur v37 (BDU + normalize) ==="
if (!(Test-Path tools\v37_orchestrator.js)) {
  throw "tools\\v37_orchestrator.js missing. Abort."
}
node tools\v37_orchestrator.js

Write-Host "=== Phase 3: Commit des corrections ==="
try {
  git add -A
  git commit -m "V37.0 Deep Modification: auto-fix manifests via orchestrator, BDU v37 generated" | Out-Null
} catch {
  Write-Host "Aucune modification à committer ou commit déjà effectué."
}

Write-Host "=== Phase 4: Compose + Validate (publish) + Push, avec récursion (max 5) ==="
$max=5; $ok=$false
if (!(Test-Path project-data)) { New-Item -ItemType Directory -Force project-data | Out-Null }
for ($i=1; $i -le $max; $i++) {
  Write-Host "=== Tentative $i/$max ==="
  try {
    homey app compose 2>&1 | Tee-Object -FilePath project-data\compose-output.log
    homey app validate --level publish 2>&1 | Tee-Object -FilePath project-data\validate-output.log

    if ($LASTEXITCODE -eq 0) {
      git add -A
      git commit -m "V37.0 Deep Modification, Tri Critique, Validation Totale, et Injection Finale du Code" | Out-Null
      git push origin master
      $ok = $true
      break
    } else {
      throw "Validation échouée"
    }
  } catch {
    Write-Host "Validation/push échoué → Rebase, nettoyage cache, ré-exécution orchestrateur"
    git fetch --all
    git pull --rebase
    if (Test-Path .homeybuild) { Remove-Item -Recurse -Force .homeybuild }
    node tools\v37_orchestrator.js
    Start-Sleep -Seconds 3
  }
}
if (-not $ok) { throw "Echec après $max tentatives." }

Write-Host "=== Exécution v37.0 terminée avec succès ==="
