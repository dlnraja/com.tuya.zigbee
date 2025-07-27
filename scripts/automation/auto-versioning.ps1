
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# Automatic Versioning System for Tuya Zigbee Project
# Système de versionning automatique pour le projet Tuya Zigbee
# Version: 1.0.0
# Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

param(
    [string]$VersionType = "auto", # auto, minor, major, patch
    [switch]$DryRun = $false,
    [switch]$Force = $false
)

# Configuration
$config = @{
    ProjectRoot = $PSScriptRoot | Split-Path -Parent | Split-Path -Parent
    VersionFiles = @(
        "package.json",
        "app.json",
        ".homeychangelog.json"
    )
    ChangelogFile = "CHANGELOG.md"
    VersionPattern = "^\d+\.\d+\.\d+$"
    CommitPatterns = @{
        Major = @("breaking", "major", "sdk.*update", "architecture.*change")
        Minor = @("feature", "enhancement", "new.*driver", "capability.*add")
        Patch = @("fix", "bug", "typo", "documentation")
    }
}

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    Write-Host $logMessage -ForegroundColor $Color
    
    $logFile = Join-Path "logs" "auto-versioning-$(Get-Date -Format 'yyyy-MM-dd').log"
    $logMessage | Out-File -FilePath $logFile -Append -Encoding UTF8
}

# Get current version from package.json
function Get-CurrentVersion {
    $packageJson = Join-Path $config.ProjectRoot "package.json"
    
    if (Test-Path $packageJson) {
        try {
            $package = Get-Content $packageJson -Raw | ConvertFrom-Json
            return $package.version
        }
        catch {
            Write-Log "❌ Erreur lors de la lecture de package.json" "ERROR" "Red"
            return "1.0.0"
        }
    }
    
    return "1.0.0"
}

# Analyze recent commits to determine version bump type
function Analyze-CommitHistory {
    Write-Log "🔍 Analyse de l'historique des commits..." "INFO" "Yellow"
    
    $commitAnalysis = @{
        MajorChanges = 0
        MinorChanges = 0
        PatchChanges = 0
        TotalCommits = 0
        SuggestedBump = "patch"
    }
    
    try {
        # Get recent commits (last 50)
        $recentCommits = git log --oneline -50
        
        foreach ($commit in $recentCommits) {
            $commitAnalysis.TotalCommits++
            $commitLower = $commit.ToLower()
            
            # Check for major changes
            foreach ($pattern in $config.CommitPatterns.Major) {
                if ($commitLower -match $pattern) {
                    $commitAnalysis.MajorChanges++
                    break
                }
            }
            
            # Check for minor changes
            foreach ($pattern in $config.CommitPatterns.Minor) {
                if ($commitLower -match $pattern) {
                    $commitAnalysis.MinorChanges++
                    break
                }
            }
            
            # Check for patch changes
            foreach ($pattern in $config.CommitPatterns.Patch) {
                if ($commitLower -match $pattern) {
                    $commitAnalysis.PatchChanges++
                    break
                }
            }
        }
        
        # Determine suggested bump type
        if ($commitAnalysis.MajorChanges -gt 0) {
            $commitAnalysis.SuggestedBump = "major"
        }
        elseif ($commitAnalysis.MinorChanges -gt 0) {
            $commitAnalysis.SuggestedBump = "minor"
        }
        else {
            $commitAnalysis.SuggestedBump = "patch"
        }
        
        Write-Log "📊 Analyse terminée: $($commitAnalysis.MajorChanges) major, $($commitAnalysis.MinorChanges) minor, $($commitAnalysis.PatchChanges) patch" "INFO" "Green"
        
        return $commitAnalysis
    }
    catch {
        Write-Log "❌ Erreur lors de l'analyse des commits: $($_.Exception.Message)" "ERROR" "Red"
        return $commitAnalysis
    }
}

# Calculate new version
function Calculate-NewVersion {
    param(
        [string]$CurrentVersion,
        [string]$BumpType
    )
    
    Write-Log "🧮 Calcul de la nouvelle version..." "INFO" "Yellow"
    
    if ($CurrentVersion -match $config.VersionPattern) {
        $parts = $CurrentVersion -split "\."
        $major = [int]$parts[0]
        $minor = [int]$parts[1]
        $patch = [int]$parts[2]
        
        switch ($BumpType.ToLower()) {
            "major" {
                $major++
                $minor = 0
                $patch = 0
            }
            "minor" {
                $minor++
                $patch = 0
            }
            "patch" {
                $patch++
            }
            default {
                $patch++
            }
        }
        
        $newVersion = "$major.$minor.$patch"
        Write-Log "✅ Nouvelle version calculée: $CurrentVersion -> $newVersion ($BumpType)" "INFO" "Green"
        
        return $newVersion
    }
    else {
        Write-Log "❌ Format de version invalide: $CurrentVersion" "ERROR" "Red"
        return $CurrentVersion
    }
}

# Update version in files
function Update-VersionInFiles {
    param(
        [string]$NewVersion
    )
    
    Write-Log "📝 Mise à jour de la version dans les fichiers..." "INFO" "Yellow"
    
    $updatedFiles = @()
    
    foreach ($file in $config.VersionFiles) {
        $filePath = Join-Path $config.ProjectRoot $file
        
        if (Test-Path $filePath) {
            try {
                $content = Get-Content $filePath -Raw
                $originalContent = $content
                
                # Update version based on file type
                switch ($file) {
                    "package.json" {
                        $package = $content | ConvertFrom-Json
                        $package.version = $NewVersion
                        $content = $package | ConvertTo-Json -Depth 10
                    }
                    "app.json" {
                        $app = $content | ConvertFrom-Json
                        $app.version = $NewVersion
                        $content = $app | ConvertTo-Json -Depth 10
                    }
                    ".homeychangelog.json" {
                        $changelog = $content | ConvertFrom-Json
                        $changelog.version = $NewVersion
                        $content = $changelog | ConvertTo-Json -Depth 10
                    }
                }
                
                if ($content -ne $originalContent) {
                    $content | Set-Content -Path $filePath -Encoding UTF8
                    $updatedFiles += $file
                    Write-Log "✅ Version mise à jour dans $file" "INFO" "Green"
                }
            }
            catch {
                Write-Log "❌ Erreur lors de la mise à jour de $file: $($_.Exception.Message)" "ERROR" "Red"
            }
        }
    }
    
    return $updatedFiles
}

# Generate changelog entry
function Generate-ChangelogEntry {
    param(
        [string]$NewVersion,
        [string]$BumpType,
        [hashtable]$CommitAnalysis
    )
    
    Write-Log "📋 Génération de l'entrée changelog..." "INFO" "Yellow"
    
    $changelogEntry = @"

## [$NewVersion] - $(Get-Date -Format "yyyy-MM-dd")

### 🚀 Version Bump Type: $BumpType

### 📊 Changes Summary
- **Major Changes:** $($CommitAnalysis.MajorChanges)
- **Minor Changes:** $($CommitAnalysis.MinorChanges)
- **Patch Changes:** $($CommitAnalysis.PatchChanges)
- **Total Commits Analyzed:** $($CommitAnalysis.TotalCommits)

### 🔧 What's Changed
$(if ($CommitAnalysis.MajorChanges -gt 0) { "- 🔥 **Breaking Changes:** $($CommitAnalysis.MajorChanges) major updates" })
$(if ($CommitAnalysis.MinorChanges -gt 0) { "- ✨ **New Features:** $($CommitAnalysis.MinorChanges) enhancements" })
$(if ($CommitAnalysis.PatchChanges -gt 0) { "- 🐛 **Bug Fixes:** $($CommitAnalysis.PatchChanges) fixes" })

### 📈 Project Status
- **Automatic Versioning:** Enabled
- **SDK Compatibility:** SDK3
- **Driver Count:** $(Get-ChildItem -Path "drivers/sdk3" -Directory | Measure-Object | Select-Object -ExpandProperty Count)
- **Last Updated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---
*Version bump generated automatically by the Tuya Zigbee Project versioning system*
"@

    return $changelogEntry
}

# Update changelog file
function Update-Changelog {
    param(
        [string]$ChangelogEntry
    )
    
    $changelogPath = Join-Path $config.ProjectRoot $config.ChangelogFile
    
    try {
        if (Test-Path $changelogPath) {
            $existingContent = Get-Content $changelogPath -Raw
            $newContent = $ChangelogEntry + "`n`n" + $existingContent
        }
        else {
            $newContent = "# 📋 Changelog - Tuya Zigbee Project`n`n" + $ChangelogEntry
        }
        
        $newContent | Set-Content -Path $changelogPath -Encoding UTF8
        Write-Log "✅ Changelog mis à jour" "INFO" "Green"
        
        return $true
    }
    catch {
        Write-Log "❌ Erreur lors de la mise à jour du changelog: $($_.Exception.Message)" "ERROR" "Red"
        return $false
    }
}

# Create version tag
function Create-VersionTag {
    param(
        [string]$NewVersion
    )
    
    Write-Log "🏷️ Création du tag de version..." "INFO" "Yellow"
    
    try {
        # Create and push tag
        git tag -a "v$NewVersion" -m "🚀 Release v$NewVersion - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git push origin "v$NewVersion"
        
        Write-Log "✅ Tag v$NewVersion créé et poussé" "INFO" "Green"
        return $true
    }
    catch {
        Write-Log "❌ Erreur lors de la création du tag: $($_.Exception.Message)" "ERROR" "Red"
        return $false
    }
}

# Main execution
function Start-AutoVersioning {
    Write-Log "🎯 Démarrage du versionning automatique..." "INFO" "Cyan"
    
    try {
        # Get current version
        $currentVersion = Get-CurrentVersion
        Write-Log "📋 Version actuelle: $currentVersion" "INFO" "Blue"
        
        # Analyze commits if auto mode
        if ($VersionType -eq "auto") {
            $commitAnalysis = Analyze-CommitHistory
            $bumpType = $commitAnalysis.SuggestedBump
        }
        else {
            $bumpType = $VersionType
        }
        
        Write-Log "🔧 Type de bump: $bumpType" "INFO" "Blue"
        
        # Calculate new version
        $newVersion = Calculate-NewVersion -CurrentVersion $currentVersion -BumpType $bumpType
        
        if ($newVersion -eq $currentVersion) {
            Write-Log "⚠️ Aucun changement de version nécessaire" "WARN" "Yellow"
            return $false
        }
        
        # Update files
        $updatedFiles = Update-VersionInFiles -NewVersion $newVersion
        
        # Generate changelog entry
        $changelogEntry = Generate-ChangelogEntry -NewVersion $newVersion -BumpType $bumpType -CommitAnalysis $commitAnalysis
        
        # Update changelog
        $changelogUpdated = Update-Changelog -ChangelogEntry $changelogEntry
        
        # Create tag
        $tagCreated = Create-VersionTag -NewVersion $newVersion
        
        # Commit changes
        if ($updatedFiles.Count -gt 0 -or $changelogUpdated) {
            git add .
            git commit -m "🚀 Version bump: $currentVersion -> $newVersion ($bumpType) - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            git push origin main
            Write-Log "✅ Changements commités et poussés" "INFO" "Green"
        }
        
        Write-Log "🎉 Versionning automatique terminé avec succès!" "INFO" "Green"
        Write-Log "📊 Résumé: $currentVersion -> $newVersion ($bumpType)" "INFO" "Green"
        
        return $true
    }
    catch {
        Write-Log "❌ Erreur lors du versionning automatique: $($_.Exception.Message)" "ERROR" "Red"
        return $false
    }
}

# Execute if run directly
if ($MyInvocation.InvocationName -eq $MyInvocation.MyCommand.Name) {
    $success = Start-AutoVersioning
    exit $(if ($success) { 0 } else { 1 })
} 


