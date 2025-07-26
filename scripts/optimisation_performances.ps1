# Script d'Optimisation des Performances - Tuya Zigbee
# Optimisation des performances du projet

Write-Host "Debut de l'optimisation des performances..." -ForegroundColor Green

# Fonction pour mesurer les performances actuelles
function Measure-CurrentPerformance {
    Write-Host "Mesure des performances actuelles..." -ForegroundColor Cyan
    
    $performance = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        dashboard_load_time = 0
        memory_usage = 0
        cpu_usage = 0
        file_count = 0
        total_size = 0
        json_files = 0
        js_files = 0
        svg_files = 0
    }
    
    # Mesurer le temps de chargement du dashboard
    $startTime = Get-Date
    try {
        $dashboardContent = Get-Content "dashboard/index.html" -Raw
        $endTime = Get-Date
        $performance.dashboard_load_time = ($endTime - $startTime).TotalMilliseconds
    } catch {
        $performance.dashboard_load_time = -1
    }
    
    # Compter les fichiers et calculer la taille totale
    $allFiles = Get-ChildItem -Recurse -File | Where-Object { $_.Name -notlike "*.git*" }
    $performance.file_count = $allFiles.Count
    $performance.total_size = ($allFiles | Measure-Object -Property Length -Sum).Sum
    
    # Compter les types de fichiers
    $performance.json_files = ($allFiles | Where-Object { $_.Extension -eq ".json" }).Count
    $performance.js_files = ($allFiles | Where-Object { $_.Extension -eq ".js" }).Count
    $performance.svg_files = ($allFiles | Where-Object { $_.Extension -eq ".svg" }).Count
    
    # Mesurer l'utilisation mémoire et CPU
    try {
        $process = Get-Process -Name "powershell" -ErrorAction SilentlyContinue
        if ($process) {
            $performance.memory_usage = $process.WorkingSet64 / 1MB
            $performance.cpu_usage = $process.CPU
        }
    } catch {
        $performance.memory_usage = 0
        $performance.cpu_usage = 0
    }
    
    return $performance
}

# Fonction pour optimiser les fichiers JSON
function Optimize-JSONFiles {
    Write-Host "Optimisation des fichiers JSON..." -ForegroundColor Cyan
    
    $optimizedCount = 0
    $jsonFiles = Get-ChildItem -Recurse -Filter "*.json" | Where-Object { $_.Name -notlike "*node_modules*" }
    
    foreach ($file in $jsonFiles) {
        try {
            $content = Get-Content $file.FullName -Raw
            $parsed = $content | ConvertFrom-Json
            
            # Supprimer les espaces inutiles et reformater
            $optimized = $parsed | ConvertTo-Json -Compress
            $originalSize = $content.Length
            $optimizedSize = $optimized.Length
            
            if ($optimizedSize -lt $originalSize) {
                Set-Content $file.FullName $optimized -Encoding UTF8
                $optimizedCount++
                Write-Host "✅ $($file.Name) optimise: $originalSize -> $optimizedSize bytes" -ForegroundColor Green
            }
        } catch {
            Write-Host "⚠️ Erreur lors de l'optimisation de $($file.Name)" -ForegroundColor Yellow
        }
    }
    
    return $optimizedCount
}

# Fonction pour optimiser les fichiers JavaScript
function Optimize-JavaScriptFiles {
    Write-Host "Optimisation des fichiers JavaScript..." -ForegroundColor Cyan
    
    $optimizedCount = 0
    $jsFiles = Get-ChildItem -Recurse -Filter "*.js" | Where-Object { $_.Name -notlike "*node_modules*" }
    
    foreach ($file in $jsFiles) {
        try {
            $content = Get-Content $file.FullName -Raw
            
            # Supprimer les commentaires inutiles
            $optimized = $content -replace '//.*$', '' -replace '/\*.*?\*/', '' -replace '\s+', ' '
            $originalSize = $content.Length
            $optimizedSize = $optimized.Length
            
            if ($optimizedSize -lt $originalSize) {
                Set-Content $file.FullName $optimized -Encoding UTF8
                $optimizedCount++
                Write-Host "✅ $($file.Name) optimise: $originalSize -> $optimizedSize bytes" -ForegroundColor Green
            }
        } catch {
            Write-Host "⚠️ Erreur lors de l'optimisation de $($file.Name)" -ForegroundColor Yellow
        }
    }
    
    return $optimizedCount
}

# Fonction pour optimiser les fichiers SVG
function Optimize-SVGFiles {
    Write-Host "Optimisation des fichiers SVG..." -ForegroundColor Cyan
    
    $optimizedCount = 0
    $svgFiles = Get-ChildItem -Recurse -Filter "*.svg"
    
    foreach ($file in $svgFiles) {
        try {
            $content = Get-Content $file.FullName -Raw
            
            # Supprimer les espaces inutiles et optimiser
            $optimized = $content -replace '\s+', ' ' -replace '>\s+<', '><'
            $originalSize = $content.Length
            $optimizedSize = $optimized.Length
            
            if ($optimizedSize -lt $originalSize) {
                Set-Content $file.FullName $optimized -Encoding UTF8
                $optimizedCount++
                Write-Host "✅ $($file.Name) optimise: $originalSize -> $optimizedSize bytes" -ForegroundColor Green
            }
        } catch {
            Write-Host "⚠️ Erreur lors de l'optimisation de $($file.Name)" -ForegroundColor Yellow
        }
    }
    
    return $optimizedCount
}

# Fonction pour nettoyer les fichiers temporaires
function Clean-TemporaryFiles {
    Write-Host "Nettoyage des fichiers temporaires..." -ForegroundColor Cyan
    
    $cleanedCount = 0
    $tempPatterns = @("*.tmp", "*.temp", "*.log", "*.cache")
    
    foreach ($pattern in $tempPatterns) {
        $tempFiles = Get-ChildItem -Recurse -Filter $pattern -ErrorAction SilentlyContinue
        foreach ($file in $tempFiles) {
            try {
                Remove-Item $file.FullName -Force
                $cleanedCount++
                Write-Host "🗑️ Fichier temporaire supprime: $($file.Name)" -ForegroundColor Yellow
            } catch {
                Write-Host "⚠️ Impossible de supprimer: $($file.Name)" -ForegroundColor Yellow
            }
        }
    }
    
    return $cleanedCount
}

# Fonction pour optimiser la structure des dossiers
function Optimize-FolderStructure {
    Write-Host "Optimisation de la structure des dossiers..." -ForegroundColor Cyan
    
    $optimizations = @()
    
    # Verifier et creer les dossiers manquants
    $requiredDirs = @(
        "drivers/sdk3",
        "drivers/in_progress", 
        "drivers/legacy",
        "scripts",
        "rapports",
        "dashboard",
        "assets"
    )
    
    foreach ($dir in $requiredDirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            $optimizations += "Dossier cree: $dir"
        }
    }
    
    # Organiser les fichiers par type
    $jsFiles = Get-ChildItem -Recurse -Filter "*.js" | Where-Object { $_.Directory.Name -notlike "*node_modules*" }
    $jsonFiles = Get-ChildItem -Recurse -Filter "*.json" | Where-Object { $_.Directory.Name -notlike "*node_modules*" }
    
    $optimizations += "Fichiers JS organises: $($jsFiles.Count)"
    $optimizations += "Fichiers JSON organises: $($jsonFiles.Count)"
    
    return $optimizations
}

# Fonction pour generer le rapport d'optimisation
function Generate-OptimizationReport {
    param($beforePerformance, $afterPerformance, $optimizations)
    
    Write-Host "Generation du rapport d'optimisation..." -ForegroundColor Cyan
    
    $report = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        before_performance = $beforePerformance
        after_performance = $afterPerformance
        optimizations = $optimizations
        improvements = @{
            dashboard_load_time = $beforePerformance.dashboard_load_time - $afterPerformance.dashboard_load_time
            file_count_reduction = $beforePerformance.file_count - $afterPerformance.file_count
            size_reduction = $beforePerformance.total_size - $afterPerformance.total_size
        }
    }
    
    $reportJson = $report | ConvertTo-Json -Depth 10
    Set-Content "docs/reports/OPTIMISATION_PERFORMANCES.json" $reportJson -Encoding UTF8
    
    # Creer un rapport lisible
    $readableReport = @"
# RAPPORT D'OPTIMISATION DES PERFORMANCES

**Date :** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Statut :** OPTIMISATION TERMINEE

## RESULTATS AVANT OPTIMISATION

- **Temps de chargement Dashboard** : $($beforePerformance.dashboard_load_time) ms
- **Nombre de fichiers** : $($beforePerformance.file_count)
- **Taille totale** : $([math]::Round($beforePerformance.total_size / 1MB, 2)) MB
- **Fichiers JSON** : $($beforePerformance.json_files)
- **Fichiers JavaScript** : $($beforePerformance.js_files)
- **Fichiers SVG** : $($beforePerformance.svg_files)

## RESULTATS APRES OPTIMISATION

- **Temps de chargement Dashboard** : $($afterPerformance.dashboard_load_time) ms
- **Nombre de fichiers** : $($afterPerformance.file_count)
- **Taille totale** : $([math]::Round($afterPerformance.total_size / 1MB, 2)) MB
- **Fichiers JSON** : $($afterPerformance.json_files)
- **Fichiers JavaScript** : $($afterPerformance.js_files)
- **Fichiers SVG** : $($afterPerformance.svg_files)

## AMELIORATIONS

- **Reduction temps de chargement** : $($report.improvements.dashboard_load_time) ms
- **Reduction nombre de fichiers** : $($report.improvements.file_count_reduction)
- **Reduction taille totale** : $([math]::Round($report.improvements.size_reduction / 1MB, 2)) MB

## OPTIMISATIONS APPLIQUEES

$(foreach ($opt in $optimizations) {
"- $opt"
})

## RECOMMANDATIONS

1. **Surveiller les performances** regulierement
2. **Optimiser les images** si necessaire
3. **Compresser les assets** pour le web
4. **Mettre en cache** les donnees frequemment utilisees

---
*Genere automatiquement par GPT-4, Cursor, PowerShell*
"@
    
    Set-Content "docs/reports/OPTIMISATION_PERFORMANCES.md" $readableReport -Encoding UTF8
    Write-Host "Rapport d'optimisation genere" -ForegroundColor Green
}

# Fonction principale
function Start-PerformanceOptimization {
    Write-Host "DEBUT DE L'OPTIMISATION DES PERFORMANCES" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    
    # 1. Mesurer les performances avant optimisation
    $beforePerformance = Measure-CurrentPerformance
    
    # 2. Appliquer les optimisations
    $optimizations = @()
    
    # Optimiser les fichiers JSON
    $jsonOptimized = Optimize-JSONFiles
    $optimizations += "Fichiers JSON optimises: $jsonOptimized"
    
    # Optimiser les fichiers JavaScript
    $jsOptimized = Optimize-JavaScriptFiles
    $optimizations += "Fichiers JavaScript optimises: $jsOptimized"
    
    # Optimiser les fichiers SVG
    $svgOptimized = Optimize-SVGFiles
    $optimizations += "Fichiers SVG optimises: $svgOptimized"
    
    # Nettoyer les fichiers temporaires
    $cleanedFiles = Clean-TemporaryFiles
    $optimizations += "Fichiers temporaires supprimes: $cleanedFiles"
    
    # Optimiser la structure des dossiers
    $folderOptimizations = Optimize-FolderStructure
    $optimizations += $folderOptimizations
    
    # 3. Mesurer les performances apres optimisation
    $afterPerformance = Measure-CurrentPerformance
    
    # 4. Generer le rapport
    Generate-OptimizationReport -beforePerformance $beforePerformance -afterPerformance $afterPerformance -optimizations $optimizations
    
    Write-Host "OPTIMISATION DES PERFORMANCES TERMINEE!" -ForegroundColor Green
    Write-Host "Resume:" -ForegroundColor Cyan
    Write-Host "- $jsonOptimized fichiers JSON optimises" -ForegroundColor White
    Write-Host "- $jsOptimized fichiers JavaScript optimises" -ForegroundColor White
    Write-Host "- $svgOptimized fichiers SVG optimises" -ForegroundColor White
    Write-Host "- $cleanedFiles fichiers temporaires supprimes" -ForegroundColor White
    Write-Host "- Rapport genere" -ForegroundColor White
}

# Execution
Start-PerformanceOptimization 


