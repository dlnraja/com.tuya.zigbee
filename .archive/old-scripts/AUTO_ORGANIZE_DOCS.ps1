#!/usr/bin/env pwsh
# AUTO_ORGANIZE_DOCS.ps1
# Organise automatiquement tous les fichiers MD à la racine

Write-Host "🗂️  Auto-organizing documentation files..." -ForegroundColor Cyan

$rootPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $rootPath

# Créer dossiers si nécessaire
$null = New-Item -ItemType Directory -Path "docs/reports" -Force
$null = New-Item -ItemType Directory -Path "docs/forum" -Force
$null = New-Item -ItemType Directory -Path "docs/analysis" -Force
$null = New-Item -ItemType Directory -Path "docs/guides" -Force

# Mapping des patterns vers destinations
$filePatterns = @{
    "*DIAGNOSTIC*.md" = "docs/analysis/"
    "*ANALYSIS*.md" = "docs/analysis/"
    "*FORUM*.md" = "docs/forum/"
    "*RESPONSE*.md" = "docs/forum/"
    "*REPORT*.md" = "docs/reports/"
    "*RECOMMENDATIONS*.md" = "docs/reports/"
    "*SESSION*.md" = "docs/reports/"
    "*GUIDE*.md" = "docs/guides/"
}

$moved = 0

# Parcourir fichiers à la racine
Get-ChildItem -Path $rootPath -Filter "*.md" -File | Where-Object {
    $_.Name -notmatch "^(README|CHANGELOG|LICENSE|CONTRIBUTING)" 
} | ForEach-Object {
    $file = $_
    $matched = $false
    
    foreach ($pattern in $filePatterns.Keys) {
        if ($file.Name -like $pattern) {
            $dest = Join-Path $rootPath $filePatterns[$pattern]
            Move-Item $file.FullName -Destination $dest -Force
            Write-Host "  ✅ Moved: $($file.Name) → $($filePatterns[$pattern])" -ForegroundColor Green
            $moved++
            $matched = $true
            break
        }
    }
    
    if (-not $matched) {
        # Fallback: déplacer vers docs/ générique
        Move-Item $file.FullName -Destination "docs/" -Force
        Write-Host "  📁 Moved: $($file.Name) → docs/" -ForegroundColor Yellow
        $moved++
    }
}

if ($moved -eq 0) {
    Write-Host "  ✅ Already organized - no files to move" -ForegroundColor Gray
} else {
    Write-Host "`n✅ Organized $moved file(s)" -ForegroundColor Green
}
