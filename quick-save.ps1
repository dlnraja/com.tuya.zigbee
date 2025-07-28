# Quick Save Script for Tuya Zigbee Project
# Performs git add, commit, and push operations

Write-Host "🚀 Starting quick save..." -ForegroundColor Green

# Get current timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "feat: Auto-save - $timestamp - Restore project structure and documentation - Update queue and tools - Reorganize documentation structure - Create GitHub Actions workflows - Generate compatibility matrix - Ensure tuya-light minimal philosophy"

try {
    # Add all changes
    Write-Host "📦 Adding files..." -ForegroundColor Blue
    git add .
    
    # Commit with timestamp
    Write-Host "💾 Committing changes..." -ForegroundColor Blue
    git commit -m $commitMessage
    
    # Push to remote
    Write-Host "🚀 Pushing to remote..." -ForegroundColor Blue
    git push origin master
    
    Write-Host "✅ Quick save completed successfully!" -ForegroundColor Green
    Write-Host "📊 Commit: $commitMessage" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Quick save failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "  " -ForegroundColor White 