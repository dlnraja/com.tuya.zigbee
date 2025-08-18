# tools\build.ps1
Param([switch]$Validate = $false)
$env:NO_COLOR="1"
$env:FORCE_COLOR="0"
$env:CI="1"
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\Users\HP\Desktop\tuya_repair"
if ($Validate) {
  Write-Host "Starting Homey validation..."
  npx --yes homey app validate -l debug
  if ($LASTEXITCODE -ne 0) { Write-Host "VALIDATE_FAIL"; exit 1 }
  Write-Host "VALIDATE_OK"
} else {
  Write-Host "Starting Homey build..."
  npx --yes homey app build
  if ($LASTEXITCODE -ne 0) { Write-Host "BUILD_FAIL"; exit 1 }
  Write-Host "BUILD_OK"
}
