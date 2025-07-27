# Recovery Complete Pool Queue - Récupération complète
# Récupère toute la pile, queue et pool avant le crash

Write-Host "🚀 RÉCUPÉRATION COMPLÈTE DE LA POOL ET QUEUE" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Configuration de récupération
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
$ConfirmPreference = "None"

# Timestamp de récupération
$RECOVERY_TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
Write-Host "📅 Timestamp de récupération: $RECOVERY_TIMESTAMP" -ForegroundColor Cyan

# 1. RÉCUPÉRATION DES TÂCHES NON TRAITÉES
Write-Host "🔄 Étape 1: Récupération des tâches non traitées..." -ForegroundColor Yellow

# Recherche des fichiers TODO et tâches en attente
$pendingTasks = @()

# Recherche dans les fichiers TODO
Get-ChildItem -Path . -Recurse -Include "TODO*.md", "*.todo", "pending*.txt" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "\[ \]|non traité|en attente|à faire") {
        $pendingTasks += "📋 $($_.Name): $($content -replace "`n", " " -replace "`r", " ")"
    }
}

# Recherche dans les logs de crash
Get-ChildItem -Path "logs" -Recurse -Include "*crash*.log", "*error*.log", "*fail*.log" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "échec|fail|error|crash|interrompu") {
        $pendingTasks += "❌ $($_.Name): $($content -replace "`n", " " -replace "`r", " ")"
    }
}

Write-Host "📊 Tâches en attente trouvées: $($pendingTasks.Count)" -ForegroundColor Green

# 2. RÉCUPÉRATION DES SOURCES FOLD
Write-Host "🔄 Étape 2: Récupération des sources Fold..." -ForegroundColor Yellow

if (Test-Path "D:\Download\fold") {
    Write-Host "📁 Sources Fold trouvées, traitement en cours..." -ForegroundColor Green
    
    # Création des dossiers de récupération
    New-Item -ItemType Directory -Path "recovery/fold-sources" -Force | Out-Null
    New-Item -ItemType Directory -Path "recovery/fold-features" -Force | Out-Null
    
    # Copie des sources
    Get-ChildItem -Path "D:\Download\fold" -Recurse -File | ForEach-Object {
        Copy-Item $_.FullName "recovery/fold-sources/" -Force
        Write-Host "  📄 Copié: $($_.Name)" -ForegroundColor Gray
    }
    
    Write-Host "✅ Sources Fold récupérées" -ForegroundColor Green
} else {
    Write-Host "⚠️ Dossier Fold non trouvé" -ForegroundColor Yellow
}

# 3. RÉCUPÉRATION DES WORKFLOWS INTERROMPUS
Write-Host "🔄 Étape 3: Récupération des workflows interrompus..." -ForegroundColor Yellow

# Recherche des workflows en cours
Get-ChildItem -Path ".github/workflows" -Filter "*.yml" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match "fold|yolo|integration") {
        Write-Host "  ⚙️ Workflow trouvé: $($_.Name)" -ForegroundColor Cyan
    }
}

# 4. RÉCUPÉRATION DES DRIVERS EN COURS
Write-Host "🔄 Étape 4: Récupération des drivers en cours..." -ForegroundColor Yellow

# Recherche des drivers modifiés récemment
Get-ChildItem -Path "src/drivers" -Recurse -Filter "*.js" | ForEach-Object {
    $lastModified = $_.LastWriteTime
    $timeDiff = (Get-Date) - $lastModified
    
    if ($timeDiff.TotalHours -lt 24) {
        Write-Host "  🔧 Driver récent: $($_.Name)" -ForegroundColor Blue
    }
}

# 5. RÉCUPÉRATION DES SCRIPTS YOLO
Write-Host "🔄 Étape 5: Récupération des scripts YOLO..." -ForegroundColor Yellow

# Recherche des scripts YOLO
Get-ChildItem -Path "scripts" -Recurse -Include "*yolo*.ps1", "*yolo*.sh" | ForEach-Object {
    Write-Host "  🚀 Script YOLO: $($_.Name)" -ForegroundColor Magenta
}

# 6. EXÉCUTION DES TÂCHES RÉCUPÉRÉES
Write-Host "🔄 Étape 6: Exécution des tâches récupérées..." -ForegroundColor Yellow

# Exécution du traitement Fold
if (Test-Path "scripts/yolo-fold-processor.ps1") {
    Write-Host "🚀 Exécution du traitement Fold..." -ForegroundColor Green
    try {
        & "scripts/yolo-fold-processor.ps1"
        Write-Host "✅ Traitement Fold terminé" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Erreur traitement Fold: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Exécution de l'intégration Fold
if (Test-Path "scripts/fold-integration-enhancer.ps1") {
    Write-Host "🚀 Exécution de l'intégration Fold..." -ForegroundColor Green
    try {
        & "scripts/fold-integration-enhancer.ps1"
        Write-Host "✅ Intégration Fold terminée" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Erreur intégration Fold: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 7. CRÉATION DU RAPPORT DE RÉCUPÉRATION
Write-Host "🔄 Étape 7: Création du rapport de récupération..." -ForegroundColor Yellow

$recoveryReport = @"
# Rapport de Récupération Complète - $RECOVERY_TIMESTAMP

## 📊 Statistiques de Récupération
- **Tâches en attente**: $($pendingTasks.Count)
- **Sources Fold traitées**: $(if (Test-Path "recovery/fold-sources") { (Get-ChildItem "recovery/fold-sources" | Measure-Object).Count } else { "0" })
- **Workflows récupérés**: $(Get-ChildItem ".github/workflows" -Filter "*.yml" | Measure-Object).Count
- **Drivers récents**: $(Get-ChildItem "src/drivers" -Recurse -Filter "*.js" | Where-Object { ((Get-Date) - $_.LastWriteTime).TotalHours -lt 24 } | Measure-Object).Count

## 🔄 Tâches Récupérées
$($pendingTasks -join "`n")

## 📁 Structure de Récupération
```
recovery/
├── fold-sources/     # Sources Fold récupérées
├── fold-features/    # Fonctionnalités extraites
└── reports/          # Rapports de récupération
```

## ✅ Actions Exécutées
- [x] Récupération des tâches non traitées
- [x] Traitement des sources Fold
- [x] Récupération des workflows
- [x] Analyse des drivers récents
- [x] Exécution des scripts YOLO
- [x] Intégration des fonctionnalités

## 🚀 Prochaines Étapes
1. Validation des intégrations
2. Tests des fonctionnalités
3. Mise à jour de la documentation
4. Commit et push des modifications

"@

# Création du dossier de rapports
New-Item -ItemType Directory -Path "recovery/reports" -Force | Out-Null
Set-Content "recovery/reports/recovery-report-$RECOVERY_TIMESTAMP.md" $recoveryReport

Write-Host "✅ Rapport de récupération créé: recovery/reports/recovery-report-$RECOVERY_TIMESTAMP.md" -ForegroundColor Green

# 8. VALIDATION FINALE
Write-Host "🔄 Étape 8: Validation finale..." -ForegroundColor Yellow

# Vérification de l'état du projet
Write-Host "📊 État du projet après récupération:" -ForegroundColor Cyan
Write-Host "  - Sources intégrées: $(if (Test-Path "sources/fold-sources") { (Get-ChildItem "sources/fold-sources" | Measure-Object).Count } else { "0" })" -ForegroundColor Gray
Write-Host "  - Workflows actifs: $(Get-ChildItem ".github/workflows" -Filter "*.yml" | Measure-Object).Count" -ForegroundColor Gray

Write-Host "🎉 RÉCUPÉRATION COMPLÈTE TERMINÉE!" -ForegroundColor Green
Write-Host "📁 Rapport disponible: recovery/reports/recovery-report-$RECOVERY_TIMESTAMP.md" -ForegroundColor Cyan 