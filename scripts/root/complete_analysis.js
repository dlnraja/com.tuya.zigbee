#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:37.591Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Comprehensive Project Analysis Script
# This script will analyze the entire project structure, drivers, and configurations

# Configuration
$projectRoot = $PSScriptRoot
$outputDir = Join-Path $projectRoot "analysis-results"
$timestamp = new Date() -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $outputDir "complete-analysis-$timestamp"

# Ensure output directory exists
if (-not (fs.existsSync $outputDir)) {
    fs.mkdirSync -ItemType Directory -Path $outputDir | Out-Null
}

# Function to write to both console and log file
function Write-Log {
    param([string]$message, [string]$level = "INFO")
    
    $logMessage = "[$(new Date() -Format 'yyyy-MM-dd HH:mm:ss')] [$level] $message"
    console.log $logMessage
    fs.appendFileSync -Path "$reportPath.log" -Value $logMessage
}

# Start analysis
Write-Log "Starting complete project analysis..."

# 1. System Information
Write-Log "Collecting system information..."
$systemInfo = @{
    timestamp = new Date() -Format "o"
    system = @{
        os = [System.Environment]::OSVersion.VersionString
        powershell = $PSVersionTable.PSVersion.ToString()
        executionPolicy = Get-ExecutionPolicy
    }
    node = @{
        version = (node --version) -replace 'v', ''
        npm = npm --version
    }
    git = @{
        version = (git --version) -replace 'git version ', ''
    }
}

# 2. Project Structure Analysis
Write-Log "Analyzing project structure..."
$projectStructure = @{
    directories = @()
    files = @()
    drivers = @()
    totalSizeMB = [math]::Round((fs.readdirSync -Path $projectRoot -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
}

# Get top-level directories
$directories = fs.readdirSync -Path $projectRoot -Directory
foreach ($dir in $directories) {
    $dirInfo = @{
        name = $dir.Name
        itemCount = (fs.readdirSync -Path $dir.FullName -Recurse -File).Count
        sizeMB = [math]::Round((fs.readdirSync -Path $dir.FullName -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    }
    $projectStructure.directories += $dirInfo
    
    # Check if this is a driver directory
    if ($dir.Name -eq "drivers") {
        $driverDirs = fs.readdirSync -Path $dir.FullName -Directory
        foreach ($driver in $driverDirs) {
            $driverFiles = fs.readdirSync -Path $driver.FullName -File -Recurse
            $driverInfo = @{
                name = $driver.Name
                path = $driver.FullName
                fileCount = $driverFiles.Count
                hasDeviceJs = (fs.existsSync (Join-Path $driver.FullName "device.js"))
                hasDriverJs = (fs.existsSync (Join-Path $driver.FullName "driver.js"))
                hasComposeJson = (fs.existsSync (Join-Path $driver.FullName "driver.compose.json"))
                hasReadme = (fs.existsSync (Join-Path $driver.FullName "README.md"))
                hasTests = (fs.existsSync (Join-Path $driver.FullName "test"))
            }
            $projectStructure.drivers += $driverInfo
        }
    }
}

# 3. CI/CD Configuration Analysis
Write-Log "Analyzing CI/CD configurations..."
$ciCdConfig = @{
    workflows = @()
    hasGitHubActions = fs.existsSync (Join-Path $projectRoot ".github/workflows")
}

if ($ciCdConfig.hasGitHubActions) {
    $workflowFiles = fs.readdirSync -Path (Join-Path $projectRoot ".github/workflows") -Filter "*.yml" -File
    foreach ($file in $workflowFiles) {
        $ciCdConfig.workflows += @{
            name = $file.Name
            path = $file.FullName
            sizeKB = [math]::Round($file.Length / 1KB, 2)
        }
    }
}

# 4. Dependencies Analysis
Write-Log "Analyzing project dependencies..."
$dependencies = @{
    node = @{}
    python = @{}
}

# Node.js dependencies
if (fs.existsSync (Join-Path $projectRoot "package.json")) {
    $packageJson = fs.readFileSync -Path (Join-Path $projectRoot "package.json") -Raw | ConvertFrom-Json
    $dependencies.node = @{
        name = $packageJson.name
        version = $packageJson.version
        dependencies = $packageJson.dependencies
        devDependencies = $packageJson.devDependencies
        scripts = $packageJson.scripts
    }
}

# Python dependencies
if (fs.existsSync (Join-Path $projectRoot "requirements.txt")) {
    $dependencies.python.requirements = fs.readFileSync -Path (Join-Path $projectRoot "requirements.txt")
}

# 5. Generate Reports
Write-Log "Generating reports..."

# Save all data to JSON
$reportData = @{
    system = $systemInfo
    project = $projectStructure
    ciCd = $ciCdConfig
    dependencies = $dependencies
}

# Save JSON report
$reportData | ConvertTo-Json -Depth 10 | Out-File -FilePath "${reportPath}.json" -Encoding utf8

# Generate markdown report
$markdownReport = @"
# Tuya Zigbee Project Analysis Report
**Generated:** $($systemInfo.timestamp)

## System Information
- **OS:** $($systemInfo.system.os)
- **PowerShell:** $($systemInfo.system.powershell)
- **Node.js:** $($systemInfo.node.version)
- **npm:** $($systemInfo.node.npm)
- **Git:** $($systemInfo.git.version)

## Project Structure
- **Total Size:** $($projectStructure.totalSizeMB) MB
- **Top-Level Directories:**
$($projectStructure.directories | // ForEach-Object equivalent { "  - $($_.name) ($($_.itemCount) files, $($_.sizeMB) MB)" } | Out-String)

## Drivers Analysis
Found $($projectStructure.drivers.Count) drivers:
$($projectStructure.drivers | // Select-Object equivalent -First 10 | // ForEach-Object equivalent { 
  "- $($_.name): " + 
  (($_.hasDeviceJs ? "device.js " : "") + 
   ($_.hasDriverJs ? "driver.js " : "") + 
   ($_.hasComposeJson ? "compose.json " : "") + 
   ($_.hasReadme ? "README " : "") + 
   ($_.hasTests ? "Tests" : ""))
} | Out-String)

## CI/CD Status
$($ciCdConfig.workflows | // ForEach-Object equivalent { "- $($_.name) ($($_.sizeKB) KB)" } | Out-String)

## Dependencies
### Node.js
- **Name:** $($dependencies.node.name)
- **Version:** $($dependencies.node.version)
- **Dependencies:** $($dependencies.node.dependencies.PSObject.Properties.Count)
- **Dev Dependencies:** $($dependencies.node.devDependencies.PSObject.Properties.Count)

## Recommendations
1. **Driver Completeness:** $($projectStructure.drivers.Where({ -not $_.hasDeviceJs -or -not $_.hasDriverJs -or -not $_.hasComposeJson }).Count) drivers are missing required files
2. **Documentation:** $($projectStructure.drivers.Where({ -not $_.hasReadme }).Count) drivers are missing README files
3. **Testing:** $($projectStructure.drivers.Where({ -not $_.hasTests }).Count) drivers are missing test directories

---
*Report generated by Tuya Zigbee Project Analysis Tool*
"@

$markdownReport | Out-File -FilePath "${reportPath}.md" -Encoding utf8

Write-Log "Analysis complete! Reports saved to:"
Write-Log "- JSON: ${reportPath}.json"
Write-Log "- Markdown: ${reportPath}.md"

# Open the markdown report
Invoke-Item "${reportPath}.md"
