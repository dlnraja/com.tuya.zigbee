#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Recherche mentions de Gledopto dans l'historique Git
    
.DESCRIPTION
    Cherche dans tous les commits, branches et tags pour trouver
    des mentions de Gledopto, GL-C-, GL-S-, ou autres LED controllers
    
.EXAMPLE
    .\search-gledopto-history.ps1
#>

Write-Host "`n🔍 RECHERCHE GLEDOPTO DANS L'HISTORIQUE GIT`n" -ForegroundColor Cyan

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $rootDir

Write-Host "📁 Répertoire: $rootDir`n" -ForegroundColor Gray

# ============================================================================
# 1. Recherche dans les commits
# ============================================================================

Write-Host "1️⃣  Recherche dans les commits...`n" -ForegroundColor Yellow

$searchTerms = @(
    "gledopto",
    "GL-C-",
    "GL-S-",
    "GL-B-",
    "led controller",
    "rgb controller",
    "led strip"
)

foreach ($term in $searchTerms) {
    Write-Host "   🔎 Searching for: $term" -ForegroundColor Gray
    
    $commits = git log --all --grep="$term" -i --oneline 2>$null
    
    if ($commits) {
        Write-Host "   ✅ Found matches:" -ForegroundColor Green
        $commits | ForEach-Object {
            Write-Host "      $_" -ForegroundColor White
        }
        Write-Host ""
    }
}

# ============================================================================
# 2. Recherche dans les diffs
# ============================================================================

Write-Host "`n2️⃣  Recherche dans les diffs (ajouts de fichiers)...`n" -ForegroundColor Yellow

foreach ($term in $searchTerms) {
    Write-Host "   🔎 Searching diffs for: $term" -ForegroundColor Gray
    
    $diffs = git log --all -S"$term" -i --oneline --name-only 2>$null
    
    if ($diffs) {
        Write-Host "   ✅ Found in diffs:" -ForegroundColor Green
        $diffs | ForEach-Object {
            if ($_ -ne "") {
                Write-Host "      $_" -ForegroundColor White
            }
        }
        Write-Host ""
    }
}

# ============================================================================
# 3. Recherche dans les fichiers actuels
# ============================================================================

Write-Host "`n3️⃣  Recherche dans les fichiers actuels...`n" -ForegroundColor Yellow

$patterns = @(
    "gledopto",
    "GL-C-",
    "GL-S-",
    "GLEDOPTO"
)

foreach ($pattern in $patterns) {
    Write-Host "   🔎 Searching files for: $pattern" -ForegroundColor Gray
    
    $files = Get-ChildItem -Path $rootDir -Recurse -File -Include "*.json","*.js","*.md" `
        -Exclude "node_modules","*.git*",".homeybuild" `
        2>$null | 
        Select-String -Pattern $pattern -CaseInsensitive | 
        Select-Object -First 10
    
    if ($files) {
        Write-Host "   ✅ Found in files:" -ForegroundColor Green
        $files | ForEach-Object {
            Write-Host "      $($_.Path):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor White
        }
        Write-Host ""
    }
}

# ============================================================================
# 4. Recherche des PRs/Issues mentionnant LED controllers
# ============================================================================

Write-Host "`n4️⃣  Recherche commits de dlnraja mentionnant LED...`n" -ForegroundColor Yellow

$ledCommits = git log --all --author="dlnraja" --grep="led" -i --oneline 2>$null

if ($ledCommits) {
    Write-Host "   ✅ Commits LED par dlnraja:" -ForegroundColor Green
    $ledCommits | ForEach-Object {
        Write-Host "      $_" -ForegroundColor White
    }
} else {
    Write-Host "   ℹ️  Aucun commit LED trouvé" -ForegroundColor Gray
}

# ============================================================================
# 5. Recherche dans les branches
# ============================================================================

Write-Host "`n5️⃣  Recherche dans les noms de branches...`n" -ForegroundColor Yellow

$branches = git branch -a | Select-String -Pattern "gledopto|led|rgb" -CaseInsensitive

if ($branches) {
    Write-Host "   ✅ Branches trouvées:" -ForegroundColor Green
    $branches | ForEach-Object {
        Write-Host "      $_" -ForegroundColor White
    }
} else {
    Write-Host "   ℹ️  Aucune branche correspondante" -ForegroundColor Gray
}

# ============================================================================
# 6. Recherche dans les tags
# ============================================================================

Write-Host "`n6️⃣  Recherche dans les tags...`n" -ForegroundColor Yellow

$tags = git tag | Select-String -Pattern "gledopto|led|rgb" -CaseInsensitive

if ($tags) {
    Write-Host "   ✅ Tags trouvés:" -ForegroundColor Green
    $tags | ForEach-Object {
        Write-Host "      $_" -ForegroundColor White
    }
} else {
    Write-Host "   ℹ️  Aucun tag correspondant" -ForegroundColor Gray
}

# ============================================================================
# Résumé
# ============================================================================

Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "RÉSUMÉ DE LA RECHERCHE" -ForegroundColor Cyan
Write-Host "="*60 + "`n" -ForegroundColor Cyan

Write-Host "Si aucun résultat trouvé, il est possible que:"
Write-Host "  1. Les commits Gledopto sont dans un autre repo"
Write-Host "  2. La marque a un nom différent (Girier, Gira, etc.)"
Write-Host "  3. Les PRs étaient sur le repo de Johan Bendz (pas local)"
Write-Host "  4. Les devices ont été ajoutés sous un autre nom"
Write-Host ""
Write-Host "Pour rechercher sur GitHub Johan Bendz:"
Write-Host "  https://github.com/JohanBendz/com.tuya.zigbee/pulls?q=author%3Adlnraja"
Write-Host "  https://github.com/JohanBendz/com.tuya.zigbee/issues?q=author%3Adlnraja"
Write-Host ""

Write-Host "✅ Recherche terminée!`n" -ForegroundColor Green
