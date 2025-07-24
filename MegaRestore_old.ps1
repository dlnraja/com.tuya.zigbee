<#
.SYNOPSIS
  Répare et automatise ton repo Tuya Zigbee.
.DESCRIPTION
  1. Nettoie les marqueurs de conflit dans package.json et app.json
  2. Sauvegarde ton travail, récupère le repo (ZIP ou git clone)
  3. Génère le manifest (.homeycompose/app.json → app.json)
  4. Met à jour workflows CI & Dependabot
  5. Nettoie package.json (champ main) et injecte badge + section Scripts Dev dans README.md
  6. Installe / regenère package-lock
  7. Valide Homey, lint & tests (sans bloquer)
  8. Commit & push en force sur master
.USAGE
  cd C:\Users\HP\Desktop\tuya-repair
  .\MegaRestore.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Variables
$ForkRepo  = 'https://github.com/dlnraja/com.tuya.zigbee'
$Branch    = 'master'
$WorkDir   = Resolve-Path .
$BackupZip = Join-Path $WorkDir 'repo_backup.zip'
$ZipUrl    = "$ForkRepo/archive/$Branch.zip"
$ZipFile   = Join-Path $WorkDir 'repo.zip'
$RepoDir   = Join-Path $WorkDir 'repo'

Write-Host "🧹 1) Nettoyage des marqueurs de conflit dans package.json & app.json" -ForegroundColor Cyan
if (Test-Path package.json) {
  $raw = Get-Content package.json -Raw
  $lines = $raw -split "`r?`n"
  $clean = $lines | Where-Object { $_ -notmatch '^(<<<<<<<|=======|>>>>>>>|@@)' }
  ($clean -join "`n") | Set-Content package.json -Encoding UTF8
}
if (Test-Path app.json) {
  $raw = Get-Content app.json -Raw
  $trim = $raw.TrimStart([char]0xFEFF)
  $trim | Set-Content app.json -Encoding UTF8
}

Write-Host "💾 2) Sauvegarde actuelle et récupération du repo" -ForegroundColor Cyan
if (Test-Path $RepoDir) {
  Compress-Archive -Path $RepoDir -DestinationPath $BackupZip -Force
  Remove-Item $RepoDir -Recurse -Force
}
try {
  Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipFile -UseBasicParsing -ErrorAction Stop
  Expand-Archive -Path $ZipFile -DestinationPath $WorkDir
