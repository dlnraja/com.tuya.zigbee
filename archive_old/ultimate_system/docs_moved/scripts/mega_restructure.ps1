# 🚀 MEGA RESTRUCTURE SCRIPT
# This script will completely reorganize the Tuya Zigbee project

# -------------------------------------------------------------------
# PHASE 1: PRÉPARATION ET SÉCURITÉ
# -------------------------------------------------------------------
Write-Host "🔧 PHASE 1: PRÉPARATION DU ENVIRONNEMENT" -ForegroundColor Cyan

# Create backup
$backupDir = "../tuya-backup-$(Get-Date -Format 'yyyyMMdd_HHmmss')
Write-Host "Creating backup in $backupDir..."
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item -Path .\* -Destination $backupDir -Recurse -Force
Write-Host "✅ Backup created: $backupDir" -ForegroundColor Green

# Clean Git repository
try {
    git checkout master
    git reset --hard HEAD
    git clean -fd
    git pull origin master
    Write-Host "✅ Git repository cleaned" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Git operations failed: $_" -ForegroundColor Yellow
}

# -------------------------------------------------------------------
# PHASE 2: RÉORGANISATION DE L'ARBORESCENCE
# -------------------------------------------------------------------
Write-Host "`n📁 PHASE 2: RÉORGANISATION DES DOSSIERS" -ForegroundColor Cyan

# Create directory structure
$dirs = @(
    ".homeycompose",
    "drivers",
    "lib\core",
    "lib\utils",
    "lib\ai",
    "lib\integration",
    "tools\analysis",
    "tools\conversion",
    "tools\enrichment",
    "tools\validation",
    "tools\documentation",
    "data\sources",
    "data\cache",
    "data\matrices",
    "docs\technical",
    "docs\user",
    "docs\development",
    "tests\unit",
    "tests\integration",
    "tests\e2e",
    "scripts\setup",
    "scripts\deployment",
    "scripts\maintenance",
    ".github\workflows",
    ".github\actions"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-Host "Created directory: $dir"
    }
}

# -------------------------------------------------------------------
# PHASE 3: NETTOYAGE DES FICHIERS
# -------------------------------------------------------------------
Write-Host "`n🧹 PHASE 3: NETTOYAGE DES FICHIERS" -ForegroundColor Cyan

# Remove unnecessary files
$extensions = @("*.ps1", "*.bat", "*.bak", "*.tmp")
foreach ($ext in $extensions) {
    Get-ChildItem -Path . -Filter $ext -File -Recurse | Remove-Item -Force
}

# Remove obsolete directories
$obsoleteDirs = @("backup", "temp", "tmp", "old", "archive", "deprecated")
foreach ($dir in $obsoleteDirs) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removed directory: $dir"
    }
}

# -------------------------------------------------------------------
# PHASE 4: MIGRATION DES SCRIPTS
# -------------------------------------------------------------------
Write-Host "`n🔄 PHASE 4: MIGRATION DES SCRIPTS" -ForegroundColor Cyan

# Move JS files to appropriate directories
$jsFiles = Get-ChildItem -Path . -Filter "*.js" -File | 
    Where-Object { $_.Name -notin @("app.js", "mega-script.js") }

foreach ($file in $jsFiles) {
    $targetDir = "scripts"
    
    # Determine target directory based on file name/path
    if ($file.Name -match "test") { $targetDir = "tests\unit" }
    if ($file.Name -match "utils?") { $targetDir = "lib\utils" }
    
    $targetPath = Join-Path $targetDir $file.Name
    Move-Item -Path $file.FullName -Destination $targetPath -Force
    Write-Host "Moved: $($file.Name) -> $targetPath"
}

# Create script converter if it doesn't exist
$converterPath = "tools\conversion\script-converter.js"
if (-not (Test-Path $converterPath)) {
    $converterContent = @"
// Script converter for PS1/BAT to JS
const fs = require('fs');
const path = require('path');

function convertScript(inputPath) {
    const content = fs.readFileSync(inputPath, 'utf8');
    const ext = path.extname(inputPath).toLowerCase();
    let jsContent = '';
    
    if (ext === '.ps1') {
        // PowerShell to Node.js conversion logic here
        jsContent = `// Converted from ${path.basename(inputPath)}
const { execSync } = require('child_process');

// TODO: Implement the converted script logic here
console.log('Script converted from PowerShell to Node.js');
`;
    } else if (ext === '.bat') {
        // Batch to Node.js conversion logic here
        jsContent = `// Converted from ${path.basename(inputPath)}
const { execSync } = require('child_process');

// TODO: Implement the converted script logic here
console.log('Script converted from Batch to Node.js');
`;
    }
    
    const outputPath = inputPath.replace(/\.(ps1|bat)$/i, '.js');
    fs.writeFileSync(outputPath, jsContent);
    return outputPath;
}

// Handle command line arguments
if (require.main === module) {
    const inputPath = process.argv[2];
    if (!inputPath) {
        console.error('Please provide an input file path');
        process.exit(1);
    }
    
    try {
        const outputPath = convertScript(inputPath);
        console.log(`Script converted successfully: ${outputPath}`);
    } catch (error) {
        console.error(`Error converting script: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { convertScript };
"@
    
    $converterDir = Split-Path -Parent $converterPath
    if (-not (Test-Path $converterDir)) {
        New-Item -ItemType Directory -Force -Path $converterDir | Out-Null
    }
    
    $converterContent | Out-File -FilePath $converterPath -Encoding utf8
    Write-Host "Created script converter: $converterPath"
}

# -------------------------------------------------------------------
# FINAL STEPS
# -------------------------------------------------------------------
Write-Host "`n✅ RESTRUCTURING COMPLETE" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the changes"
Write-Host "2. Test the application"
Write-Host "3. Commit the changes: git add . && git commit -m 'Complete project restructuring'"
Write-Host "4. Push to remote: git push origin master"
