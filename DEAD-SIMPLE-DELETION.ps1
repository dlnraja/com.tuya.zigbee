# DEAD-SIMPLE-DELETION.ps1
#
# Le user met son token où il veut (fichier, env var, prompt, clipboard)
# et le script fait TOUT: push + delete.
#
# 4 ways to provide the token (first found wins):
#   1. C:\Users\Dell\gh_token.txt          (file - just paste and save)
#   2. $env:GH_TOKEN (env var)
#   3. Clipboard (auto-detected)
#   4. Interactive prompt (last resort)

$ErrorActionPreference = "Continue"
$node = "C:\Users\Dell\AppData\Local\OpenAI\Codex\runtimes\cua_node\ecfc0d9aa02807e3\bin\node.exe"
$repo = "C:\Users\Dell\Documents\homey\master"
Set-Location $repo
$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\Git\bin;" + $env:Path

# 1. Find token
$Token = $null
$candidates = @(
  "C:\Users\Dell\gh_token.txt",
  "C:\Users\Dell\.gh_token",
  "C:\Users\Dell\Documents\homey\master\.gh_token"
)
foreach ($f in $candidates) {
  if (Test-Path $f) {
    $t = Get-Content $f -Raw -ErrorAction SilentlyContinue
    if ($t -and $t.Length -gt 20) {
      $Token = $t.Trim()
      Write-Host "✓ Token from file: $f" -ForegroundColor Green
      break
    }
  }
}
if (-not $Token -and $env:GH_TOKEN) {
  $Token = $env:GH_TOKEN
  Write-Host "✓ Token from env: GH_TOKEN" -ForegroundColor Green
}
if (-not $Token) {
  Write-Host "Trying clipboard..." -ForegroundColor Yellow
  try {
    $clip = Get-Clipboard -Raw -ErrorAction SilentlyContinue
    if ($clip -and $clip.Length -gt 20 -and ($clip -match "^ghp_|^github_pat_|^ghs_|^gho_")) {
      $Token = $clip.Trim()
      Write-Host "✓ Token from clipboard" -ForegroundColor Green
    }
  } catch {}
}
if (-not $Token) {
  Write-Host "`nColle ton GH_TOKEN (scope: public_repo):" -ForegroundColor Yellow
  Write-Host "  (token: https://github.com/settings/tokens)" -ForegroundColor Gray
  $secure = Read-Host "Token" -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
}
if (-not $Token -or $Token.Length -lt 20) {
  Write-Host "❌ Token invalide" -ForegroundColor Red
  exit 1
}
$env:GH_TOKEN = $Token
Write-Host "`n✓ Token: $($Token.Substring(0,7))*** (length $($Token.Length))" -ForegroundColor Green

# 2. Configure gh + git
Write-Host "`n=== CONFIG ===" -ForegroundColor Cyan
& "C:\Users\Dell\Tools\gh\bin\gh.exe" auth login --with-token $Token 2>&1 | Out-String -Stream | Select-Object -First 3
& git config --global user.name "Dylan Rajasekaram" 2>&1 | Out-Null
& git config --global user.email "senetmarne@gmail.com" 2>&1 | Out-Null
Write-Host "  ✓ git + gh configured" -ForegroundColor Green

# 3. Push
Write-Host "`n=== PUSH ===" -ForegroundColor Cyan
git remote set-url origin "https://${Token}@github.com/dlnraja/com.tuya.zigbee.git" 2>&1 | Out-Null
$pushOut = git push origin master 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "  ✓ Push OK" -ForegroundColor Green
} else {
  Write-Host "  ⚠️  Push: $pushOut" -ForegroundColor Yellow
  Write-Host "  (on continue avec la suppression quand même)" -ForegroundColor Yellow
}

# 4. Delete 1171
Write-Host "`n=== SUPPRESSION (1171 commentaires) ===" -ForegroundColor Cyan
Write-Host "  3 sec avant de commencer (Ctrl+C = cancel)..." -ForegroundColor Yellow
Start-Sleep 3
& $node tools/ci/delete-johan-all.js 2>&1
$exit = $LASTEXITCODE

# 5. Verify
Write-Host "`n=== VERIFY ===" -ForegroundColor Cyan
& $node tools/ci/collect-johan-comments-to-delete.js 2>&1 | Select-Object -First 8

# Done
if ($exit -eq 0) {
  Write-Host "`n✅ TERMINÉ" -ForegroundColor Green
} else {
  Write-Host "`n⚠️  Exit code: $exit" -ForegroundColor Yellow
}
