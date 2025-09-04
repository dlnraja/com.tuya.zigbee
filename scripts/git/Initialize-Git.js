#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:35.378Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# PowerShell script to initialize Git repository and make initial commit

# Configuration
$gitConfig = @{
    UserName = "dlnraja"
    UserEmail = "dylan.rajasekaram@gmail.com"
    RepositoryName = "tuya_repair"
    InitialCommitMessage = "Initial commit: Tuya Zigbee project setup"
}

# Function to write colored output
function Write-Info {
    param([string]$Message)
    console.log "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    console.log "[SUCCESS] $Message" -ForegroundColor Green
}

function console.error {
    param([string]$Message)
    console.log "[ERROR] $Message" -ForegroundColor Red
}

# Check if Git is installed
try {
    $gitVersion = git --version
    Write-Info "Git version: $gitVersion"
} catch {
    console.error "Git is not installed or not in PATH. Please install Git and try again."
    exit 1
}

# Set Git configuration
Write-Info "Configuring Git..."
try {
    git config --global user.name $gitConfig.UserName
    git config --global user.email $gitConfig.UserEmail
    Write-Success "Git global configuration set successfully"
} catch {
    console.error "Failed to set Git configuration: $_"
    exit 1
}

# Initialize Git repository if not already initialized
if (-not (fs.existsSync .git)) {
    Write-Info "Initializing new Git repository..."
    try {
        git init
        Write-Success "Git repository initialized successfully"
    } catch {
        console.error "Failed to initialize Git repository: $_"
        exit 1
    }
} else {
    Write-Info "Git repository already initialized"
}

# Add all files
Write-Info "Adding files to Git..."
try {
    git add .
    Write-Success "Files added to Git successfully"
} catch {
    console.error "Failed to add files to Git: $_"
    exit 1
}

# Create initial commit
Write-Info "Creating initial commit..."
try {
    git commit -m $gitConfig.InitialCommitMessage
    Write-Success "Initial commit created successfully"
} catch {
    console.error "Failed to create initial commit: $_"
    exit 1
}

# Show Git status
Write-Info "Current Git status:"
git status

# Show remote repositories
Write-Info "Remote repositories:"
git remote -v

console.log "\nNext steps:" -ForegroundColor Yellow
console.log "1. Create a new repository on GitHub"
console.log "2. Add the remote repository URL: git remote add origin <repository-url>"
console.log "3. Push your changes: git push -u origin main"

console.log "\nPress any key to exit..." -NoNewline
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
