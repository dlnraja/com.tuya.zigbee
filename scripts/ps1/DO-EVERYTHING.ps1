# DO-EVERYTHING.ps1
#
# One-click script: TU COLLES TON TOKEN, ÇA FAIT TOUT.
#
# Steps:
#   1. Demande le token GH
#   2. Configure git + gh
#   3. Commit tous les changements
#   4. Push vers GitHub
#   5. Supprime les 1171 commentaires dlnraja sur Johan

param(
  [switch]$SkipPush = $false,
  [switch]$SkipDelete = $false,
  [string]$Token = ""
)

$ErrorActionPreference = "Stop"
$node = "C:\Users\Dell\AppData\Local\OpenAI\Codex\runtimes\cua_node\ecfc0d9aa02807e3\bin\node.exe"
$git = "C:\Program Files\Git\cmd\git.exe"
$gh = "C:\Users\Dell\Tools\gh\bin\gh.exe"
$repo = "C:\Users\Dell\Documents\homey\master"

Set-Location $repo
$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\Git\bin;C:\Users\Dell\Tools\gh\bin;" + $env:Path

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Err($msg) { Write-Host "  ❌ $msg" -ForegroundColor Red }

# 1. Get token
if (-not $Token) {
  Write-Host "Colle ton GitHub Personal Access Token (scope: public_repo ou repo):" -ForegroundColor Yellow
  Write-Host "  (créé sur https://github.com/settings/tokens)" -ForegroundColor Gray
  $secure = Read-Host "Token" -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
}
if (-not $Token -or $Token.Length -lt 20) {
  Err "Token manquant ou trop court"
  exit 1
}
Ok "Token chargé (length: $($Token.Length))"
$env:GH_TOKEN = $Token

# 2. Configure git
Step "Configuration git"
& $git config --global user.name "Dylan Rajasekaram" 2>&1 | Out-Null
& $git config --global user.email "senetmarne@gmail.com" 2>&1 | Out-Null
& $git config --global init.defaultBranch master 2>&1 | Out-Null
& $git config --global core.autocrlf false 2>&1 | Out-Null
& $git config --global core.fileMode false 2>&1 | Out-Null
Ok "git config OK"

# 3. Stage all + commit
Step "Commit de tous les changements"
& $git add -A 2>&1 | Out-Null
$status = & $git status --short 2>&1
if (-not $status) {
  Ok "Rien à commit (working tree clean)"
} else {
  $count = ($status | Measure-Object).Count
  Write-Host "  $count fichiers à commit"
  & $git commit -m "feat: P11 carte blanche + door_sensor driver + workflow consolidation

- door_sensor: nouveau driver TS0203 (5 mfrs, design system coherent)
- 96 mfrs Johan integres dans canonical DB (1618 FPs)
- bidirectional-enricher: master (beta) + stable (functional)
- continuous-flow.yml: daily 03:00 UTC, 5 outils d'enrichissement
- e2e-dashboard-test.yml: daily 07:00 UTC, AggregateError + process errors
- upstream-guard.yml: workflow reutilisable (DELETE bloque par defaut)
- 13 workflows archives dans archive/ (README + reactivation checklist)
- audit-johan-references.js: 0 write interdit a JohanBendz
- delete-johan-comments.js: CARTE BLANCHE v2.0 (triple confirmation retiree)
- delete-johan-all.js: one-shot full execution 1171 commentaires
- secret-loader.js: SAFE secret loader avec masking

Generated with Mavis P0-P11" 2>&1 | Out-String -Stream | Select-Object -First 5
  if ($LASTEXITCODE -ne 0) { Err "git commit failed"; exit 1 }
  Ok "Commit créé"
}

# 4. Push
if (-not $SkipPush) {
  Step "Push vers GitHub"
  # Use token in URL to authenticate
  $remoteUrl = "https://${Token}@github.com/dlnraja/com.tuya.zigbee.git"
  & $git remote set-url origin $remoteUrl 2>&1 | Out-Null
  $pushOutput = & $git push origin master 2>&1
  if ($LASTEXITCODE -ne 0) {
    Err "git push failed"
    Write-Host ($pushOutput | Out-String) -ForegroundColor Red
    Warn "Tu peux push manuellement avec:"
    Write-Host "  git push https://${Token}@github.com/dlnraja/com.tuya.zigbee.git master"
    exit 1
  } else {
    Ok "Push OK"
  }
}

# 5. Delete 1171 comments
if (-not $SkipDelete) {
  Step "Suppression des 1171 commentaires dlnraja sur Johan"
  Write-Host "  Démarrage dans 3 secondes... (Ctrl+C pour annuler)" -ForegroundColor Yellow
  Start-Sleep -Seconds 3
  & $node tools/ci/delete-johan-all.js
  if ($LASTEXITCODE -ne 0) {
    Err "delete-johan-all.js a échoué"
    exit 1
  }
  Ok "Suppression terminée"
}

# 6. Verify
Step "Vérification"
& $node tools/ci/collect-johan-comments-to-delete.js 2>&1 | Out-String -Stream | Select-Object -First 10

Write-Host "`n=== ✅ TERMINÉ ===" -ForegroundColor Green
Write-Host "Si tu vois 'Total: 0', c'est que tout est supprimé." -ForegroundColor Green
