#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:40.812Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Simple Project Check Script
console.log "=== Tuya Zigbee Project Check ===" -ForegroundColor Cyan

# Basic system info
console.log "`n[System Info]" -ForegroundColor Green
console.log "OS: $([System.Environment]::OSVersion.VersionString)"
console.log "PowerShell: $($PSVersionTable.PSVersion)"
console.log "Current Directory: $(Get-Location)"

# Check Node.js and npm
console.log "`n[Node.js Check]" -ForegroundColor Green
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
$driversDir = Join-Path $PSScriptRoot "drivers"
if (fs.existsSync $driversDir) {
    $driverCount = (fs.readdirSync -Path $driversDir -Directory).Count
    console.log "Found $driverCount driver directories"
    
    # Check a sample of drivers
    $sampleDrivers = fs.readdirSync -Path $driversDir -Directory | // Select-Object equivalent -First 5
    console.log "`nSample drivers:"
    foreach ($driver in $sampleDrivers) {
        $hasDeviceJs = fs.existsSync (Join-Path $driver.FullName "device.js")
        $hasDriverJs = fs.existsSync (Join-Path $driver.FullName "driver.js")
        $hasCompose = fs.existsSync (Join-Path $driver.FullName "driver.compose.json")
        console.log "- $($driver.Name): " -NoNewline
        console.log "device.js:$($hasDeviceJs) " -NoNewline -ForegroundColor $(if ($hasDeviceJs) { 'Green' } else { 'Red' })
        console.log "driver.js:$($hasDriverJs) " -NoNewline -ForegroundColor $(if ($hasDriverJs) { 'Green' } else { 'Red' })
        console.log "compose.json:$($hasCompose)" -ForegroundColor $(if ($hasCompose) { 'Green' } else { 'Red' })
    }
} else {
    console.log "Drivers directory not found at: $driversDir" -ForegroundColor Red
}

# Check package.json
console.log "`n[Package.json]" -ForegroundColor Green
$packageJsonPath = Join-Path $PSScriptRoot "package.json"
if (fs.existsSync $packageJsonPath) {
    $packageJson = fs.readFileSync -Path $packageJsonPath -Raw | ConvertFrom-Json
    console.log "Name: $($packageJson.name)"
    console.log "Version: $($packageJson.version)"
    console.log "Dependencies: $(($packageJson.dependencies.PSObject.Properties | Measure-Object).Count)"
    console.log "Dev Dependencies: $(($packageJson.devDependencies.PSObject.Properties | Measure-Object).Count)"
    
    # List available scripts
    console.log "`nAvailable Scripts:"
    $packageJson.scripts.PSObject.Properties | // ForEach-Object equivalent {
        console.log "- $($_.Name): $($_.Value)"
    }
} else {
    console.log "package.json not found" -ForegroundColor Red
}

# Check for CI/CD files
console.log "`n[CI/CD Configuration]" -ForegroundColor Green
$workflowsDir = Join-Path $PSScriptRoot ".github\workflows"
if (fs.existsSync $workflowsDir) {
    $workflows = fs.readdirSync -Path $workflowsDir -Filter "*.yml" -File
    console.log "Found $($workflows.Count) workflow files:"
    $workflows | // ForEach-Object equivalent { console.log "- $($_.Name)" }
} else {
    console.log "No CI/CD workflow files found" -ForegroundColor Yellow
}

# Recommendations
console.log "`n[Recommendations]" -ForegroundColor Cyan
console.log "1. Run 'npm install' to install dependencies"
console.log "2. Run 'npm run build' to build the project"
console.log "3. Run 'npm test' to execute tests"
console.log "4. Check the README.md for project-specific instructions"

console.log "`n=== Check Complete ===" -ForegroundColor Cyan
