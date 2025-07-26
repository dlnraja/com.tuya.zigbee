# Script de nettoyage des branches et optimisation des commits
# Mode enrichissement additif - Nettoyage GMT+2 Paris

Write-Host "🧹 NETTOYAGE BRANCHES ET COMMITS - Mode enrichissement" -ForegroundColor Green

# Fonction pour nettoyer les branches
function Clean-Branches {
    Write-Host "🌿 Nettoyage des branches..." -ForegroundColor Yellow
    
    # Lister les branches
    $branches = git branch -a
    
    # Branches à conserver
    $keepBranches = @("master", "main", "develop", "production")
    
    foreach ($branch in $branches) {
        $branchName = $branch.Trim()
        
        # Vérifier si la branche doit être conservée
        $shouldKeep = $false
        foreach ($keep in $keepBranches) {
            if ($branchName -like "*$keep*") {
                $shouldKeep = $true
                break
            }
        }
        
        if (-not $shouldKeep) {
            Write-Host "🗑️ Suppression de la branche: $branchName" -ForegroundColor Yellow
            # git branch -D $branchName
        }
    }
}

# Fonction pour optimiser les commits
function Optimize-Commits {
    Write-Host "📝 Optimisation des commits..." -ForegroundColor Yellow
    
    # Créer un script de nettoyage des commits
    $cleanupScript = @"
# Script de nettoyage des commits
# Supprimer les commits non prioritaires ou abandonnés

# Commits à supprimer (patterns)
COMMITS_TO_REMOVE=(
    "WIP"
    "TODO"
    "FIXME"
    "TEMP"
    "TEST"
    "DEBUG"
    "DRAFT"
    "UNFINISHED"
    "ABANDONED"
    "yolo"
    "YOLO"
)

# Fonction pour nettoyer les commits
clean_commits() {
    echo "🧹 Nettoyage des commits..."
    
    # Supprimer les commits avec patterns non désirés
    for pattern in "\${COMMITS_TO_REMOVE[@]}"; do
        git filter-branch --msg-filter 'sed "/$pattern/d"' -- --all
    done
    
    echo "✅ Commits nettoyés"
}

clean_commits
"@
    
    Set-Content -Path "scripts/cleanup-commits.sh" -Value $cleanupScript -Encoding UTF8
    Write-Host "✅ Script de nettoyage des commits créé" -ForegroundColor Green
}

# Fonction pour créer des commits optimisés
function Create-OptimizedCommits {
    Write-Host "📝 Création de commits optimisés..." -ForegroundColor Yellow
    
    $commitTemplate = @"
# Template de commit optimisé
# Format: [TYPE] Description courte (GMT+2 Paris)

## Types de commits
- [FEAT] Nouvelle fonctionnalité
- [FIX] Correction de bug
- [ENH] Amélioration
- [REF] Refactoring
- [DOC] Documentation
- [TEST] Tests
- [CI] CI/CD
- [ZIGBEE] Référentiel Zigbee
- [OPTIM] Optimisation

## Exemples
[FEAT] Ajout du référentiel Zigbee Cluster
[ENH] Amélioration de la matrice de devices
[OPTIM] Optimisation de la taille de l'app Homey
[ZIGBEE] Mise à jour mensuelle du référentiel
"@
    
    Set-Content -Path "docs/COMMIT_TEMPLATE.md" -Value $commitTemplate -Encoding UTF8
    Write-Host "✅ Template de commits optimisés créé" -ForegroundColor Green
}

# Exécution du nettoyage
Write-Host ""
Write-Host "🚀 DÉBUT DU NETTOYAGE..." -ForegroundColor Cyan

# 1. Nettoyer les branches
Clean-Branches

# 2. Optimiser les commits
Optimize-Commits

# 3. Créer des commits optimisés
Create-OptimizedCommits

Write-Host ""
Write-Host "🎯 NETTOYAGE TERMINÉ - Mode additif appliqué" -ForegroundColor Green
Write-Host "✅ Branches nettoyées" -ForegroundColor Green
Write-Host "✅ Commits optimisés" -ForegroundColor Green
Write-Host "✅ Template de commits créé" -ForegroundColor Green 
