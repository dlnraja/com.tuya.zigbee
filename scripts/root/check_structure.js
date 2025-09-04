#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:37.293Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Check project structure and save to file
$outputFile = "$PSScriptRoot\project_structure.txt"

# Clear existing file
"Project Structure Report - Generated $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $outputFile
"==================================================" | Out-File -FilePath $outputFile -Append

# Check Node.js and npm versions
try {
    $nodeVersion = node --version 2>&1
    "Node.js Version: $nodeVersion" | Out-File -FilePath $outputFile -Append
} catch {
    "Node.js is not installed or not in PATH" | Out-File -FilePath $outputFile -Append
}

try {
    $npmVersion = npm --version 2>&1
    "npm Version: $npmVersion" | Out-File -FilePath $outputFile -Append
} catch {
    "npm is not installed or not in PATH" | Out-File -FilePath $outputFile -Append
}

"`nDirectory Structure:" | Out-File -FilePath $outputFile -Append
"-------------------" | Out-File -FilePath $outputFile -Append

# List top-level directories
fs.readdirSync -Directory | // ForEach-Object equivalent {
    $dir = $_.Name
    $itemCount = (fs.readdirSync -Path $_.FullName -Recurse -File -ErrorAction SilentlyContinue).Count
    $sizeMB = [math]::Round(((fs.readdirSync -Path $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB), 2)
    "- $dir ($itemCount files, $sizeMB MB)" | Out-File -FilePath $outputFile -Append
}

# Check for required files
"`nRequired Files Check:" | Out-File -FilePath $outputFile -Append
"-------------------" | Out-File -FilePath $outputFile -Append

$requiredFiles = @("package.json", "app.json", "README.md", "drivers")
foreach ($file in $requiredFiles) {
    $exists = fs.existsSync -Path $file
    $status = if ($exists) { "✅" } else { "❌" }
    "$status $file" | Out-File -FilePath $outputFile -Append
}

# Check drivers directory
"`nDrivers Directory:" | Out-File -FilePath $outputFile -Append
"-------------------" | Out-File -FilePath $outputFile -Append

if (fs.existsSync -Path "drivers") {
    $driverDirs = fs.readdirSync -Directory -Path "drivers"
    "Found $($driverDirs.Count) driver directories" | Out-File -FilePath $outputFile -Append
    
    # Sample first 5 drivers
    $sampleDrivers = $driverDirs | // Select-Object equivalent -First 5 | // ForEach-Object equivalent { $_.Name }
    "Sample drivers: $($sampleDrivers -join ', ')" | Out-File -FilePath $outputFile -Append
    
    # Check files in first driver (as sample)
    if ($driverDirs.Count -gt 0) {
        $sampleDriver = $driverDirs[0].FullName
        "`nSample driver files in $($driverDirs[0].Name):" | Out-File -FilePath $outputFile -Append
        fs.readdirSync -Path $sampleDriver -File | // Select-Object equivalent -ExpandProperty Name | // ForEach-Object equivalent {
            "- $_" | Out-File -FilePath $outputFile -Append
        }
    }
} else {
    "Drivers directory not found!" | Out-File -FilePath $outputFile -Append
}

# Check for package.json
if (fs.existsSync -Path "package.json") {
    try {
        $packageJson = fs.readFileSync -Path "package.json" -Raw | ConvertFrom-Json
        "`nPackage.json Analysis:" | Out-File -FilePath $outputFile -Append
        "-------------------" | Out-File -FilePath $outputFile -Append
        "Name: $($packageJson.name)" | Out-File -FilePath $outputFile -Append
        "Version: $($packageJson.version)" | Out-File -FilePath $outputFile -Append
        "Dependencies: $($packageJson.dependencies.PSObject.Properties.Count)" | Out-File -FilePath $outputFile -Append
        "Scripts: $($packageJson.scripts.PSObject.Properties.Count)" | Out-File -FilePath $outputFile -Append
    } catch {
        "Error reading package.json: $_" | Out-File -FilePath $outputFile -Append
    }
}

"`nReport saved to: $outputFile" | Out-File -FilePath $outputFile -Append
console.log "Project structure analysis complete. Report saved to: $outputFile"
