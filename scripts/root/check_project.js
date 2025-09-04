#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:37.057Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Check project structure and dependencies
console.log "=== Project Structure Check ===" -ForegroundColor Cyan

# Check Node.js and npm
console.log "`n[Node.js and npm]" -ForegroundColor Green
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    console.log "Node.js: $nodeVersion"
    console.log "npm: $npmVersion"
} catch {
    console.log "Node.js or npm not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check project structure
console.log "`n[Project Structure]" -ForegroundColor Green
$requiredDirs = @('drivers', 'scripts', '.github/workflows')
$missingDirs = @()

foreach ($dir in $requiredDirs) {
    $fullPath = Join-Path $PSScriptRoot $dir
    if (fs.existsSync $fullPath) {
        $itemCount = (fs.readdirSync -Path $fullPath -Recurse -File -ErrorAction SilentlyContinue).Count
        console.log "$dir/ : Found ($itemCount files)" -ForegroundColor Green
    } else {
        console.log "$dir/ : Missing" -ForegroundColor Red
        $missingDirs += $dir
    }
}

# Check package.json
console.log "`n[package.json]" -ForegroundColor Green
$packageJsonPath = Join-Path $PSScriptRoot "package.json"
if (fs.existsSync $packageJsonPath) {
    try {
        $packageJson = fs.readFileSync -Path $packageJsonPath -Raw | ConvertFrom-Json
        console.log "Name: $($packageJson.name)"
        console.log "Version: $($packageJson.version)"
        
        # Check scripts
        if ($packageJson.scripts) {
            console.log "`nAvailable Scripts:"
            $packageJson.scripts.PSObject.Properties | // ForEach-Object equivalent {
                console.log "- $($_.Name): $($_.Value)"
            }
        }
    } catch {
        console.log "Error parsing package.json: $_" -ForegroundColor Red
    }
} else {
    console.log "package.json not found" -ForegroundColor Red
}

# Check drivers
console.log "`n[Drivers]" -ForegroundColor Green
$driversPath = Join-Path $PSScriptRoot "drivers"
if (fs.existsSync $driversPath) {
    $driverDirs = fs.readdirSync -Path $driversPath -Directory
    console.log "Found $($driverDirs.Count) driver directories"
    
    # Check a sample of drivers
    $sampleDrivers = $driverDirs | // Select-Object equivalent -First 5
    console.log "`nSample drivers:"
    foreach ($driver in $sampleDrivers) {
        $hasDeviceJs = fs.existsSync (Join-Path $driver.FullName "device.js")
        $hasDriverJs = fs.existsSync (Join-Path $driver.FullName "driver.js")
        $hasCompose = fs.existsSync (Join-Path $driver.FullName "driver.compose.json")
        
        $status = @(
            "device.js:" + $(if ($hasDeviceJs) { "✅" } else { "❌" }),
            "driver.js:" + $(if ($hasDriverJs) { "✅" } else { "❌" }),
            "compose.json:" + $(if ($hasCompose) { "✅" } else { "❌" })
        ) -join " "
        
        console.log "- $($driver.Name): $status"
    }
} else {
    console.log "Drivers directory not found" -ForegroundColor Red
}

# Check CI/CD workflows
console.log "`n[CI/CD Workflows]" -ForegroundColor Green
$workflowsPath = Join-Path $PSScriptRoot ".github\workflows"
if (fs.existsSync $workflowsPath) {
    $workflowFiles = fs.readdirSync -Path $workflowsPath -Filter "*.yml"
    console.log "Found $($workflowFiles.Count) workflow files:"
    $workflowFiles | // ForEach-Object equivalent { console.log "- $($_.Name)" }
} else {
    console.log "No CI/CD workflow files found" -ForegroundColor Yellow
}

# Check for common issues
console.log "`n[Common Issues]" -ForegroundColor Green
$issues = @()

# Check for missing node_modules
$nodeModulesPath = Join-Path $PSScriptRoot "node_modules"
if (-not (fs.existsSync $nodeModulesPath)) {
    $issues += "node_modules/ directory is missing. Run 'npm install' to install dependencies."
}

# Check for build directory
$buildPath = Join-Path $PSScriptRoot "dist"
if (-not (fs.existsSync $buildPath)) {
    $issues += "dist/ directory not found. Run 'npm run build' to build the project."
}

# Check for test directory
$testPath = Join-Path $PSScriptRoot "test"
if (-not (fs.existsSync $testPath)) {
    $issues += "test/ directory not found. Consider adding tests for better code quality."
}

# Display issues
if ($issues.Count -gt 0) {
    console.log "`nFound $($issues.Count) potential issues:" -ForegroundColor Yellow
    $issues | // ForEach-Object equivalent { console.log "- $_" }
} else {
    console.log "No common issues found." -ForegroundColor Green
}

# Recommendations
console.log "`n[Recommendations]" -ForegroundColor Cyan
$recommendations = @()

if ($missingDirs.Count -gt 0) {
    $recommendations += "Create missing directories: $($missingDirs -join ', ')"
}

if (-not (fs.existsSync $nodeModulesPath)) {
    $recommendations += "Run 'npm install' to install project dependencies"
}

if (-not (fs.existsSync $buildPath)) {
    $recommendations += "Run 'npm run build' to build the project"
}

if ($packageJson.scripts.test) {
    $recommendations += "Run 'npm test' to execute tests"
}

if ($recommendations.Count -gt 0) {
    $recommendations | // ForEach-Object equivalent { console.log "- $_" }
} else {
    console.log "No specific recommendations. Project structure looks good!" -ForegroundColor Green
}

console.log "`n=== Check Complete ===" -ForegroundColor Cyan
