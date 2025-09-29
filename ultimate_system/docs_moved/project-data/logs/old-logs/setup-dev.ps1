# Setup Development Environment Script
# This script will help set up the development environment for the Tuya Zigbee project

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Cyan
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "Node.js is not installed or not in PATH. Please install Node.js 18 or later from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green

# Check npm version
Write-Host "`nChecking npm version..." -ForegroundColor Cyan
$npmVersion = npm --version 2>$null
if (-not $npmVersion) {
    Write-Host "npm is not installed or not in PATH. Please install Node.js which includes npm." -ForegroundColor Red
    exit 1
}
Write-Host "npm version: $npmVersion" -ForegroundColor Green

# Install project dependencies
Write-Host "`nInstalling project dependencies..." -ForegroundColor Cyan
npm install

# Install Homey CLI if not installed
Write-Host "`nChecking Homey CLI installation..." -ForegroundColor Cyan
$homeyCliVersion = homey --version 2>$null
if (-not $homeyCliVersion) {
    Write-Host "Homey CLI is not installed. Installing globally..." -ForegroundColor Yellow
    npm install -g homey
    $homeyCliVersion = homey --version 2>$null
    if (-not $homeyCliVersion) {
        Write-Host "Failed to install Homey CLI. Please install it manually with: npm install -g homey" -ForegroundColor Red
    } else {
        Write-Host "Homey CLI installed successfully. Version: $homeyCliVersion" -ForegroundColor Green
    }
} else {
    Write-Host "Homey CLI version: $homeyCliVersion" -ForegroundColor Green
}

# Install development dependencies
Write-Host "`nInstalling development dependencies..." -ForegroundColor Cyan
npm install --save-dev eslint eslint-config-homey-app babel-eslint prettier

# Initialize ESLint if not already configured
if (-not (Test-Path .eslintrc.js)) {
    Write-Host "`nInitializing ESLint configuration..." -ForegroundColor Cyan
    npx eslint --init --config .eslintrc.js
}

# Run linting
Write-Host "`nRunning ESLint to check for issues..." -ForegroundColor Cyan
npx eslint . --fix

# Run tests
Write-Host "`nRunning tests..." -ForegroundColor Cyan
npm test

Write-Host "`nSetup completed! You can now run 'homey app run' to start the development server." -ForegroundColor Green
