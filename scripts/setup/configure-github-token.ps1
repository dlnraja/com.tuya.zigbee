# 🔑 CONFIGURATION AUTOMATIQUE GITHUB TOKEN
# Script PowerShell pour configurer rapidement le token GitHub

param(
  [Parameter(Mandatory = $true)]
  [string]$GitHubToken
)

Write-Host "🔑 CONFIGURATION GITHUB TOKEN MEGA-AUTOMATION" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# 1. Validation du token format
if (-not $GitHubToken.StartsWith("ghp_")) {
  Write-Host "❌ ERREUR: Le token doit commencer par 'ghp_'" -ForegroundColor Red
  Write-Host "Format attendu: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" -ForegroundColor Yellow
  exit 1
}

Write-Host "✅ Format token validé" -ForegroundColor Green

# 2. Configuration variable d'environnement PowerShell
$env:GITHUB_TOKEN = $GitHubToken
Write-Host "✅ Variable environnement PowerShell configurée" -ForegroundColor Green

# 3. Configuration fichier .env
$envPath = ".env"
$envContent = ""

if (Test-Path $envPath) {
  $envContent = Get-Content $envPath -Raw
}

# Ajouter ou mettre à jour GITHUB_TOKEN
if ($envContent -match "GITHUB_TOKEN=.*") {
  $envContent = $envContent -replace "GITHUB_TOKEN=.*", "GITHUB_TOKEN=$GitHubToken"
  Write-Host "✅ Token mis à jour dans .env" -ForegroundColor Green
}
else {
  $envContent += "`n# GitHub Token pour MEGA-Automation`nGITHUB_TOKEN=$GitHubToken`n"
  Write-Host "✅ Token ajouté à .env" -ForegroundColor Green
}

# Ajouter autres tokens si manquants
if (-not ($envContent -match "HOMEY_TOKEN=")) {
  $envContent += "`n# Homey Developer Token (à configurer)`n# HOMEY_TOKEN=your_homey_token_here`n"
}

Set-Content -Path $envPath -Value $envContent
Write-Host "📄 Fichier .env mis à jour: $((Get-Item $envPath).FullName)" -ForegroundColor Green

# 4. Vérifier .gitignore
$gitignorePath = ".gitignore"
$gitignoreContent = ""

if (Test-Path $gitignorePath) {
  $gitignoreContent = Get-Content $gitignorePath -Raw
}

if (-not ($gitignoreContent -match "\.env")) {
  $gitignoreContent += "`n# Environment variables - SÉCURITE`n.env`n.env.local`n"
  Set-Content -Path $gitignorePath -Value $gitignoreContent
  Write-Host "🔒 .env ajouté au .gitignore pour sécurité" -ForegroundColor Green
}

# 5. Test du token
Write-Host "`n🧪 TEST DE VALIDATION..." -ForegroundColor Yellow

try {
  $testResult = node "scripts/mega-automation/github-token-manager.js" verify 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Token validé avec succès !" -ForegroundColor Green
    Write-Host $testResult -ForegroundColor White
  }
  else {
    Write-Host "⚠️ Avertissement lors du test:" -ForegroundColor Yellow
    Write-Host $testResult -ForegroundColor White
  }
}
catch {
  Write-Host "⚠️ Impossible de tester automatiquement, mais token configuré" -ForegroundColor Yellow
}

# 6. Instructions GitHub Secrets
Write-Host "`n🚀 PROCHAINES ÉTAPES CRITIQUES:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "1. 🌐 Ouvrir GitHub.com dans votre navigateur" -ForegroundColor White
Write-Host "2. 📂 Aller sur votre repository: dlnraja/com.tuya.zigbee" -ForegroundColor White
Write-Host "3. ⚙️ Settings → Secrets and variables → Actions" -ForegroundColor White
Write-Host "4. 🆕 New repository secret" -ForegroundColor White
Write-Host "5. 🏷️ Name: GITHUB_TOKEN" -ForegroundColor White
Write-Host "6. 🔑 Secret: $($GitHubToken.Substring(0,8))***" -ForegroundColor White
Write-Host "7. ✅ Add secret" -ForegroundColor White

Write-Host "`n🎉 CONFIGURATION LOCALE TERMINÉE !" -ForegroundColor Green
Write-Host "Le système MEGA-Automation sera 100% opérationnel dès que" -ForegroundColor Green
Write-Host "le token sera ajouté aux GitHub Secrets (étapes ci-dessus)" -ForegroundColor Green

Write-Host "`n📊 CAPACITÉS ACTIVÉES:" -ForegroundColor Cyan
Write-Host "• 🔄 Veille automatique (648 manufacturer IDs)" -ForegroundColor White
Write-Host "• 🤖 Processing automatique PRs/Issues" -ForegroundColor White
Write-Host "• 📦 Publication automatique Homey App Store" -ForegroundColor White
Write-Host "• 🌍 Multi-source monitoring" -ForegroundColor White
Write-Host "• 🕰️ Orchestration hebdomadaire intelligente" -ForegroundColor White
