# ONE-CLICK.ps1
#
# Le user colle son token GitHub, le script fait TOUT:
#   - Push le commit
#   - Supprime les 1171 commentaires dlnraja sur Johan
#   - Vérifie
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File ONE-CLICK.ps1
#
# Ou avec token inline:
#   powershell -ExecutionPolicy Bypass -Command "$t='ghp_***'; & .\ONE-CLICK.ps1 -Token $t"

param([string]$Token = "")

$ErrorActionPreference = "Continue"
$node = "C:\Users\Dell\AppData\Local\OpenAI\Codex\runtimes\cua_node\ecfc0d9aa02807e3\bin\node.exe"
$repo = "C:\Users\Dell\Documents\homey\master"
Set-Location $repo
$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\Git\bin;" + $env:Path

# 1. Token
if (-not $Token) {
  Write-Host "Colle ton GH_TOKEN (scope public_repo ou repo):" -ForegroundColor Yellow
  $secure = Read-Host "Token" -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
}
if (-not $Token -or $Token.Length -lt 20) { Write-Host "❌ Token invalide"; exit 1 }
$env:GH_TOKEN = $Token
Write-Host "✓ Token: $($Token.Substring(0,7))***" -ForegroundColor Green

# 2. Push
Write-Host "`n=== PUSH ===" -ForegroundColor Cyan
git remote set-url origin "https://${Token}@github.com/dlnraja/com.tuya.zigbee.git" 2>&1 | Out-Null
$pushResult = git push origin master 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "  ✓ Push OK" -ForegroundColor Green
} else {
  Write-Host "  ⚠️  Push failed: $pushResult" -ForegroundColor Yellow
  Write-Host "  (on continue quand même avec la suppression)"
}

# 3. Delete
Write-Host "`n=== SUPPRESSION (1171 commentaires) ===" -ForegroundColor Cyan
Write-Host "  Démarrage dans 3 sec... (Ctrl+C = cancel)" -ForegroundColor Yellow
Start-Sleep 3
& $node tools/ci/delete-johan-all.js 2>&1
$exit = $LASTEXITCODE
if ($exit -eq 0) {
  Write-Host "`n✅ TERMINÉ" -ForegroundColor Green
} else {
  Write-Host "`n❌ Échec (exit $exit)" -ForegroundColor Red
}

# 4. Verify
Write-Host "`n=== VERIFY ===" -ForegroundColor Cyan
& $node tools/ci/collect-johan-comments-to-delete.js 2>&1 | Select-Object -First 8
