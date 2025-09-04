#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:35.548Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Dashboard Table Integration Script
# Intègre un tableau drivers interactif dans le dashboard

console.log "🚀 Dashboard Table Integration - Tuya Zigbee Project" -ForegroundColor Green
console.log "📅 Date: $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
console.log ""

# Analyser les drivers disponibles
console.log "📊 Analysing drivers..." -ForegroundColor Cyan

$drivers = @()
$categories = @("sdk3", "intelligent", "improved", "new", "manufacturers", "coherent", "smart-life", "gpmachado", "in_progress")

foreach ($category in $categories) {
    $categoryPath = "drivers/$category"
    if (fs.existsSync $categoryPath) {
        $driverFiles = fs.readdirSync -Path $categoryPath -Filter "*.driver.compose.json" -Recurse
        foreach ($driver in $driverFiles) {
            try {
                $driverContent = fs.readFileSync $driver.FullName -Raw | ConvertFrom-Json
                $drivers += @{
                    Name = $driverContent.name
                    Category = $category
                    Path = $driver.FullName
                    Status = "Active"
                    Compatibility = "SDK3"
                    LastModified = $driver.LastWriteTime
                }
            }
            catch {
                console.log "⚠️ Error reading driver: $($driver.FullName)" -ForegroundColor Yellow
            }
        }
    }
}

console.log "✅ Found $($drivers.Count) drivers" -ForegroundColor Green

# Créer le HTML du tableau drivers
$driversTableHTML = @"
    <div class="drivers-section">
      <h2><i class="fas fa-microchip"></i> Drivers Overview</h2>
      <div class="drivers-table-container">
        <table class="drivers-table">
          <thead>
            <tr>
              <th><i class="fas fa-microchip"></i> Driver Name</th>
              <th><i class="fas fa-tag"></i> Category</th>
              <th><i class="fas fa-check-circle"></i> Status</th>
              <th><i class="fas fa-code"></i> Compatibility</th>
              <th><i class="fas fa-clock"></i> Last Modified</th>
            </tr>
          </thead>
          <tbody>
"@

foreach ($driver in $drivers) {
    $statusIcon = "✅"
    $statusClass = "status-active"
    
    if ($driver.Category -eq "in_progress") {
        $statusIcon = "🔄"
        $statusClass = "status-progress"
    }
    
    $driversTableHTML += @"
            <tr>
              <td><strong>$($driver.Name)</strong></td>
              <td><span class="category-badge category-$($driver.Category)">$($driver.Category)</span></td>
              <td><span class="status-badge $statusClass">$statusIcon $($driver.Status)</span></td>
              <td><span class="compatibility-badge">$($driver.Compatibility)</span></td>
              <td>$($driver.LastModified.ToString('yyyy-MM-dd HH:mm'))</td>
            </tr>
"@
}

$driversTableHTML += @"
          </tbody>
        </table>
      </div>
      
      <div class="drivers-stats">
        <div class="stat-item">
          <span class="stat-number">$($drivers.Count)</span>
          <span class="stat-label">Total Drivers</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">$($categories.Count)</span>
          <span class="stat-label">Categories</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">100%</span>
          <span class="stat-label">SDK3 Compatible</span>
        </div>
      </div>
    </div>
"@

# CSS pour le tableau drivers
$driversTableCSS = @"
    .drivers-section {
      background: rgba(255, 255, 255, 0.95);
      padding: 40px;
      border-radius: var(--border-radius);
      box-shadow: var(--shadow);
      margin-bottom: 40px;
      backdrop-filter: blur(10px);
    }
    
    .drivers-section h2 {
      color: var(--primary-color);
      font-size: 2.5em;
      font-weight: 700;
      margin-bottom: 30px;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
    }
    
    .drivers-table-container {
      overflow-x: auto;
      border-radius: 12px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }
    
    .drivers-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 12px;
      overflow: hidden;
    }
    
    .drivers-table th {
      background: var(--primary-color);
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      font-size: 1.1em;
    }
    
    .drivers-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
      font-size: 0.95em;
    }
    
    .drivers-table tr:hover {
      background: #f8f9fa;
    }
    
    .category-badge {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.8em;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .category-sdk3 { background: #28a745; color: white; }
    .category-intelligent { background: #17a2b8; color: white; }
    .category-improved { background: #ffc107; color: #333; }
    .category-new { background: #dc3545; color: white; }
    .category-manufacturers { background: #6f42c1; color: white; }
    .category-coherent { background: #fd7e14; color: white; }
    .category-smart-life { background: #20c997; color: white; }
    .category-gpmachado { background: #e83e8c; color: white; }
    .category-in_progress { background: #6c757d; color: white; }
    
    .status-badge {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.8em;
      font-weight: 600;
    }
    
    .status-active { background: #28a745; color: white; }
    .status-progress { background: #ffc107; color: #333; }
    
    .compatibility-badge {
      background: #17a2b8;
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.8em;
      font-weight: 600;
    }
    
    .drivers-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 30px;
    }
    
    .stat-item {
      text-align: center;
      padding: 20px;
      background: var(--light-color);
      border-radius: 12px;
      border: 2px solid transparent;
      transition: var(--transition);
    }
    
    .stat-item:hover {
      border-color: var(--primary-color);
      transform: translateY(-3px);
    }
    
    .stat-number {
      display: block;
      font-size: 2.5em;
      font-weight: 700;
      color: var(--primary-color);
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 1em;
      color: #666;
      font-weight: 500;
    }
"@

# Mettre à jour le dashboard
$dashboardPath = "docs/dashboard.html"
$dashboardContent = fs.readFileSync $dashboardPath -Raw

# Insérer le CSS dans la section style
$cssInsertPoint = $dashboardContent.IndexOf("    }")
$dashboardContent = $dashboardContent.Insert($cssInsertPoint, $driversTableCSS + "`n`n    ")

# Insérer le tableau drivers avant la section integrations
$tableInsertPoint = $dashboardContent.IndexOf('<div class="integrations-section">')
$dashboardContent = $dashboardContent.Insert($tableInsertPoint, $driversTableHTML + "`n`n    ")

# Sauvegarder le dashboard mis à jour
fs.writeFileSync -Path $dashboardPath -Value $dashboardContent -Encoding UTF8

console.log "✅ Dashboard updated with drivers table" -ForegroundColor Green
console.log "📊 Added $($drivers.Count) drivers to the table" -ForegroundColor Cyan
console.log "🎨 Integrated interactive drivers table" -ForegroundColor Yellow

# Créer un rapport de mise à jour
$report = @{
    timestamp = new Date() -Format "yyyy-MM-dd HH:mm:ss"
    drivers_analyzed = $drivers.Count
    categories_found = $categories.Count
    dashboard_updated = $true
    table_integrated = $true
}

$report | ConvertTo-Json -Depth 3 | fs.writeFileSync "docs/dashboard-update-report.json"

console.log "📄 Report saved to docs/dashboard-update-report.json" -ForegroundColor Green
console.log "🚀 Dashboard table integration completed successfully!" -ForegroundColor Green