# ORGANISATION AUTOMATIQUE DU PROJET
# Créé: 16 Oct 2025

Set-Location "c:\Users\HP\Desktop\homey app\tuya_repair"

Write-Host "=== ORGANISATION PROJET ===" -ForegroundColor Cyan

# Créer structure de dossiers
Write-Host "Création structure dossiers..." -ForegroundColor Yellow
$null = New-Item -ItemType Directory -Force -Path "docs/fixes"
$null = New-Item -ItemType Directory -Force -Path "docs/workflow"
$null = New-Item -ItemType Directory -Force -Path "docs/community"
$null = New-Item -ItemType Directory -Force -Path "docs/forum"
$null = New-Item -ItemType Directory -Force -Path "scripts/fixes"
$null = New-Item -ItemType Directory -Force -Path "scripts/automation"
$null = New-Item -ItemType Directory -Force -Path "scripts/utils"

# DÉPLACER DOCUMENTATION FIXES
Write-Host "Déplacement docs fixes..." -ForegroundColor Yellow
Move-Item -Force "CRITICAL_FIX_SUMMARY_v2.15.130.md" "docs/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "PETER_IAS_ZONE_FIX_COMPLETE.md" "docs/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "PETER_INSTRUCTIONS_COURTES.md" "docs/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "EMAIL_CORRECTION_SUMMARY.md" "docs/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "STATUS_FINAL.md" "docs/fixes/" -ErrorAction SilentlyContinue

# DÉPLACER DOCUMENTATION WORKFLOW
Write-Host "Déplacement docs workflow..." -ForegroundColor Yellow
Move-Item -Force "WORKFLOW_GUIDE.md" "docs/workflow/" -ErrorAction SilentlyContinue
Move-Item -Force "QUICK_WORKFLOW.md" "docs/workflow/" -ErrorAction SilentlyContinue
Move-Item -Force "README_WORKFLOW.md" "docs/workflow/" -ErrorAction SilentlyContinue
Move-Item -Force "PUBLICATION_MANUELLE_REQUISE.md" "docs/workflow/" -ErrorAction SilentlyContinue
Move-Item -Force "PUBLICATION_SUCCESS.md" "docs/workflow/" -ErrorAction SilentlyContinue
Move-Item -Force "FORCE_PUBLISH.md" "docs/workflow/" -ErrorAction SilentlyContinue

# DÉPLACER DOCUMENTATION COMMUNITY
Write-Host "Déplacement docs community..." -ForegroundColor Yellow
Move-Item -Force "COMMUNITY_APPS_ANALYSIS.md" "docs/community/" -ErrorAction SilentlyContinue
Move-Item -Force "QUICK_IMPROVEMENTS.md" "docs/community/" -ErrorAction SilentlyContinue

# DÉPLACER DOCUMENTATION FORUM
Write-Host "Déplacement docs forum..." -ForegroundColor Yellow
Move-Item -Force "FORUM_POSTS_COPY_PASTE.txt" "docs/forum/" -ErrorAction SilentlyContinue
Move-Item -Force "FORUM_RESPONSE_PETER_DUTCHDUKE.md" "docs/forum/" -ErrorAction SilentlyContinue

# DÉPLACER SCRIPTS POWERSHELL
Write-Host "Déplacement scripts PowerShell..." -ForegroundColor Yellow
Move-Item -Force "commit-analysis.ps1" "scripts/automation/" -ErrorAction SilentlyContinue
Move-Item -Force "commit-critical-fixes.ps1" "scripts/automation/" -ErrorAction SilentlyContinue
Move-Item -Force "commit-email-fix.ps1" "scripts/automation/" -ErrorAction SilentlyContinue
Move-Item -Force "commit-push.ps1" "scripts/automation/" -ErrorAction SilentlyContinue
Move-Item -Force "commit-workflow-docs.ps1" "scripts/automation/" -ErrorAction SilentlyContinue
Move-Item -Force "fix-all-emails.ps1" "scripts/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "fix-git-email.ps1" "scripts/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "add-all-images.ps1" "scripts/utils/" -ErrorAction SilentlyContinue

# DÉPLACER SCRIPTS JAVASCRIPT UTILITAIRES
Write-Host "Déplacement scripts JS..." -ForegroundColor Yellow
Move-Item -Force "ADD_IMAGES_FORCE.js" "scripts/utils/" -ErrorAction SilentlyContinue
Move-Item -Force "CHECK_PUBLISH_STATUS.js" "scripts/utils/" -ErrorAction SilentlyContinue
Move-Item -Force "FINAL_CLEANUP.js" "scripts/utils/" -ErrorAction SilentlyContinue
Move-Item -Force "FIX_APP_IMAGES_FINAL.js" "scripts/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "FIX_DEVICE_FILES.js" "scripts/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "FIX_TITLEFORMATTED.js" "scripts/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "ORCHESTRATOR_FINAL.js" "scripts/utils/" -ErrorAction SilentlyContinue
Move-Item -Force "ULTIMATE_FIX_ALL.js" "scripts/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "ULTIMATE_ORCHESTRATOR.js" "scripts/utils/" -ErrorAction SilentlyContinue
Move-Item -Force "URGENT_FIX_COMPLETE.js" "scripts/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "auto-publish.js" "scripts/automation/" -ErrorAction SilentlyContinue
Move-Item -Force "add-images-declarations.js" "scripts/utils/" -ErrorAction SilentlyContinue
Move-Item -Force "create-app-images.js" "scripts/utils/" -ErrorAction SilentlyContinue
Move-Item -Force "final-images-fix.js" "scripts/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "fix-flows.js" "scripts/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "fix-images.js" "scripts/fixes/" -ErrorAction SilentlyContinue
Move-Item -Force "push-native.js" "scripts/automation/" -ErrorAction SilentlyContinue
Move-Item -Force "remove-driver-images.js" "scripts/utils/" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ Organisation terminée!" -ForegroundColor Green
Write-Host ""
Write-Host "STRUCTURE CRÉÉE:" -ForegroundColor Cyan
Write-Host "  docs/fixes/      - Documentation des corrections" -ForegroundColor White
Write-Host "  docs/workflow/   - Documentation workflow GitHub" -ForegroundColor White
Write-Host "  docs/community/  - Analyse apps communautaires" -ForegroundColor White
Write-Host "  docs/forum/      - Réponses forum" -ForegroundColor White
Write-Host "  scripts/fixes/   - Scripts de correction" -ForegroundColor White
Write-Host "  scripts/automation/ - Scripts automation Git/Publish" -ForegroundColor White
Write-Host "  scripts/utils/   - Scripts utilitaires" -ForegroundColor White
