#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.694Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Quick Save Script for Tuya Zigbee Project
# Performs git add, commit, and push operations

console.log "🚀 Starting quick save..." -ForegroundColor Green

# Get current timestamp
$timestamp = new Date() -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "feat: Auto-save - $timestamp - Restore project structure and documentation - Update queue and tools - Reorganize documentation structure - Create GitHub Actions workflows - Generate compatibility matrix - Ensure tuya-light minimal philosophy"

try {
    # Add all changes
    console.log "📦 Adding files..." -ForegroundColor Blue
    git add .
    
    # Commit with timestamp
    console.log "💾 Committing changes..." -ForegroundColor Blue
    git commit -m $commitMessage
    
    # Push to remote
    console.log "🚀 Pushing to remote..." -ForegroundColor Blue
    git push origin master
    
    console.log "✅ Quick save completed successfully!" -ForegroundColor Green
    console.log "📊 Commit: $commitMessage" -ForegroundColor Yellow
    
} catch {
    console.log "❌ Quick save failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

console.log "  " -ForegroundColor White 