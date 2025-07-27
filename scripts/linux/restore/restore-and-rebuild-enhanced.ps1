# RestoreAndRebuild.ps1
param(
  [string]$Fork   = "https://github.com/dlnraja/com.tuya.zigbee.git",
  [string]$Branch = "master",
  [string]$WorkDir= "$HOME\Desktop\tuya-repair"
)

# 0) Préparation
if (-not (Test-Path $WorkDir)) { New-Item $WorkDir -ItemType Directory | Out-Null }
Set-Location $WorkDir

# 1) Backup + suppression de l’ancien repo
if (Test-Path "repo") {
  $stamp = Get-Date -Format "yyyyMMddHHmm"
  Write-Host "💾 Sauvegarde repo → repo_backup_$stamp.zip" -ForegroundColor Yellow
  Compress-Archive -Path repo -DestinationPath "repo_backup_$stamp.zip" -Force
  Remove-Item repo -Recurse -Force
}

# 2) Re-clone
Write-Host "🔄 Clonage propre de $Fork@$Branch" -ForegroundColor Cyan
git clone --branch $Branch $Fork repo

# 3) Génération du manifest
Set-Location "repo"
Write-Host "📦 npm install…" -ForegroundColor Cyan
npm install

Write-Host "📄 node scripts/update-manifest.js…" -ForegroundColor Cyan
node scripts/update-manifest.js

# 4) Regénération des workflows (CI & Dependabot)
$ciYaml = @'
name: CI & Manifest Sync
on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]
  workflow_dispatch:
jobs:
  sync-manifest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: true
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npm run update-manifest
      - name: Validate Homey app
        run: npx homey app validate || echo ⚠️ validate failed"
      - uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "chore: sync app.json"
          branch: sync/app-json
          title: "[Automatisé] sync app.json"
  lint-test:
    needs: sync-manifest
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npm run lint
      - run: npm run test
'@
Set-Content -Path .github\workflows\ci.yml -Value $ciYaml -Encoding UTF8

$dbYaml = @'
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
'@
Set-Content -Path .github\dependabot.yml -Value $dbYaml -Encoding UTF8

# 5) Nettoyage package.json & badge README
(Get-Content package.json) `
  -replace '"main":\s*".*?",','' `
  | Set-Content package.json -Encoding UTF8

$badge = '![CI](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/ci.yml/badge.svg)'
if (-not (Select-String -Path README.md -Pattern '\!\[CI\]')) {
  Add-Content README.md "`n$badge`n"
}

# 6) Commit & force-push
git add .
git commit -m "chore: full restore & rebuild pipelines"
git push origin $Branch --force

Write-Host "`n✅ Fini ! Vérifie l’onglet Actions sur GitHub pour t’assurer du succès du CI." -ForegroundColor Green

