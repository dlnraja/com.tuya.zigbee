# Script d'optimisation de l'app Homey
# Mode enrichissement additif - Optimisation taille

Write-Host "🏠 OPTIMISATION APP HOMEY - Mode enrichissement" -ForegroundColor Green

# Créer .homeyignore
$homeyignore = @"
# Fichiers de développement
*.log
*.tmp
*.temp
node_modules/
.git/
.github/
.vscode/
.idea/

# Documentation de développement
docs/development/
docs/internal/
cursor-dev/

# Scripts de développement
scripts/dev/
scripts/test/
scripts/debug/

# Données de développement
data/dev/
data/test/
data/debug/

# Rapports temporaires
reports/temp/
logs/temp/

# Fichiers de sauvegarde
*.bak
*.backup
*.old

# Fichiers de configuration de développement
.env
.env.local
.env.development

# Fichiers de cache
.cache/
.temp/
tmp/

# Fichiers de build de développement
build/dev/
dist/dev/

# Fichiers de test
test/
tests/
__tests__/

# Fichiers de documentation de développement
*.dev.md
*.test.md
*.debug.md
"@

Set-Content -Path ".homeyignore" -Value $homeyignore -Encoding UTF8

# Optimiser app.json
$appJson = Get-Content "app.json" | ConvertFrom-Json
$appJson | Add-Member -NotePropertyName "optimized" -NotePropertyValue $true -Force
$appJson | Add-Member -NotePropertyName "sizeOptimized" -NotePropertyValue $true -Force
$appJson | Add-Member -NotePropertyName "homeyignore" -NotePropertyValue $true -Force
$appJson | ConvertTo-Json -Depth 10 | Set-Content "app.json"

Write-Host "✅ App Homey optimisée avec .homeyignore" -ForegroundColor Green 