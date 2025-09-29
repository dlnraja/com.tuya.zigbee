# Run-All Pipeline for Homey Tuya Zigbee Project
# Windows PowerShell script that prepares environment, installs deps, fetches sources,
# builds matrices, repairs JSON, validates, runs tests, and validates Homey app.

$ErrorActionPreference = "Stop"

function Write-Status {
  param(
    [string]$Message,
    [ValidateSet('INFO','SUCCESS','WARNING','ERROR')]
    [string]$Level = 'INFO'
  )
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $color = switch ($Level) {
    'SUCCESS' { 'Green' }
    'WARNING' { 'Yellow' }
    'ERROR'   { 'Red' }
    default   { 'Cyan' }
  }
  Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Invoke-WithRetry {
  param(
    [Parameter(Mandatory=$true)][scriptblock]$Script,
    [int]$Retries = 3,
    [int]$DelaySeconds = 3,
    [string]$Name = 'Task'
  )
  for ($i = 1; $i -le $Retries; $i++) {
    try {
      & $Script
      Write-Status "$Name succeeded" 'SUCCESS'
      return
    } catch {
      if ($i -lt $Retries) {
        Write-Status "$Name failed (attempt $i/$Retries): $($_.Exception.Message). Retrying in $DelaySeconds s..." 'WARNING'
        Start-Sleep -Seconds $DelaySeconds
      } else {
        Write-Status "$Name failed after $Retries attempts: $($_.Exception.Message)" 'ERROR'
        throw
      }
    }
  }
}

function Remove-PathIfExists {
  param([string]$Path)
  if (Test-Path $Path) {
    Remove-Item -Recurse -Force $Path
    Write-Status "Removed: $Path" 'INFO'
  }
}

# 1) Environment config
Write-Status 'Configuring npm registry and clearing proxies...'
& npm config set registry https://registry.npmjs.org/ | Out-Null
& npm config delete proxy | Out-Null
& npm config delete https-proxy | Out-Null
Write-Status 'Cleaning npm cache...'
& npm cache clean --force | Out-Null

# 2) Clean workspace
Write-Status 'Cleaning node_modules and lockfiles...'
Remove-PathIfExists 'node_modules'
if (Test-Path 'package-lock.json') { Remove-Item -Force 'package-lock.json'; Write-Status 'Removed: package-lock.json' 'INFO' }
Remove-PathIfExists 'scripts/node_modules'
if (Test-Path 'scripts/package-lock.json') { Remove-Item -Force 'scripts/package-lock.json'; Write-Status 'Removed: scripts/package-lock.json' 'INFO' }

# 3) Install dependencies with retry and optional strict-ssl fallback
Write-Status 'Installing npm dependencies...'
$installScript = {
  npm install
}
try {
  Invoke-WithRetry -Script $installScript -Retries 2 -DelaySeconds 4 -Name 'npm install'
} catch {
  Write-Status 'npm install failed, trying with strict-ssl=false (temporary workaround)' 'WARNING'
  & npm config set strict-ssl false | Out-Null
  try {
    Invoke-WithRetry -Script $installScript -Retries 2 -DelaySeconds 4 -Name 'npm install (strict-ssl=false)'
  } finally {
    & npm config set strict-ssl true | Out-Null
  }
}

# 4) Fetch all sources (Z2M, Blakadder, Forum, GitHub if token)
Write-Status 'Fetching all sources...'
$fetchScript = { node scripts/fetch-all-sources.js }
Invoke-WithRetry -Script $fetchScript -Retries 3 -DelaySeconds 5 -Name 'fetch-all-sources'

# 5) Build matrices
Write-Status 'Building matrices...'
node scripts/build-matrices.js

# 6) Repair JSON across repo
Write-Status 'Repairing JSON across repository...'
node scripts/repair-json.js

# 7) Enhanced validation
Write-Status 'Running enhanced validator...'
$validate = & npm run validate 2>&1
Write-Host $validate
if ($LASTEXITCODE -ne 0) { Write-Status 'Validator encountered errors' 'ERROR' } else { Write-Status 'Validator completed' 'SUCCESS' }

# 8) Tests
Write-Status 'Running unit tests...'
$tests = & npm test 2>&1
Write-Host $tests
if ($LASTEXITCODE -ne 0) { Write-Status 'Tests failed' 'ERROR' } else { Write-Status 'All tests passed' 'SUCCESS' }

# 9) Homey app validate
Write-Status 'Running Homey app validate...'
$homeyValidate = & homey app validate 2>&1
Write-Host $homeyValidate
if ($LASTEXITCODE -ne 0) { Write-Status 'Homey validation failed' 'ERROR' } else { Write-Status 'Homey validation OK' 'SUCCESS' }

Write-Status 'Pipeline complete.' 'SUCCESS'
