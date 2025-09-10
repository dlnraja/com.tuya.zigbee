# Setup script for Tuya Zigbee research tools
# Run this script to install all required dependencies

Write-Host "🚀 Setting up Tuya Zigbee research tools..." -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm $npmVersion is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed. Please install npm and try again." -ForegroundColor Red
    exit 1
}

# Install global dependencies if needed
$globalDeps = @("npm", "node-gyp", "windows-build-tools")
foreach ($dep in $globalDeps) {
    if (-not (Get-Command $dep -ErrorAction SilentlyContinue)) {
        Write-Host "Installing global dependency: $dep" -ForegroundColor Yellow
        npm install -g $dep
    } else {
        Write-Host "✅ $dep is already installed" -ForegroundColor Green
    }
}

# Install project dependencies
Write-Host "📦 Installing project dependencies..." -ForegroundColor Cyan
$dependencies = @(
    "axios",
    "cheerio",
    "jsdom",
    "@octokit/rest",
    "@octokit/plugin-retry",
    "@octokit/plugin-throttling",
    "natural",
    "chai",
    "mocha",
    "sinon"
)

foreach ($dep in $dependencies) {
    Write-Host "Installing $dep..." -ForegroundColor Yellow
    npm install --save-dev $dep
}

# Create necessary directories
$directories = @(
    "research/github",
    "research/homey-forum",
    "data/device-database",
    "docs/sources"
)

foreach ($dir in $directories) {
    $fullPath = Join-Path -Path $PSScriptRoot -ChildPath "..\..\$dir"
    if (-not (Test-Path -Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "📁 Created directory: $dir" -ForegroundColor Green
    } else {
        Write-Host "📁 Directory exists: $dir" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✨ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Get a GitHub Personal Access Token from https://github.com/settings/tokens"
Write-Host "2. Set the token as an environment variable: `$env:GITHUB_TOKEN='your_token_here'"
Write-Host "3. Run the research tools as described in RESEARCH-TOOLS.md"
Write-Host ""
Write-Host "Happy researching! 🚀" -ForegroundColor Cyan
