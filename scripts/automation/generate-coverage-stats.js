#!/usr/bin/env node
'use strict';

/**
 * Generate Coverage Statistics
 * Creates detailed stats about device coverage and health
 */

const fs = require('fs');
const path = require('path');

console.log('Generating Coverage Statistics...\n');

// Load data
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

let categories = {};
try {
  const catData = fs.readFileSync('DRIVER_CATEGORIES.json', 'utf8');
  // Remove BOM if present
  const cleanData = String(catData).replace(/^\uFEFF/, '');
  categories = JSON.parse(cleanData).categories || {};
} catch (err) {
  console.log('Warning: Could not load DRIVER_CATEGORIES.json:', err.message);
}

// Count drivers
const driversPath = path.join(process.cwd(), 'drivers');
const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory());

const stats = {
  generated_at: new Date().toISOString(),
  app_version: appJson.version,
  total_drivers: driverDirs.length,
  device_variants: 0,
  categories: 0,
  brands: new Set(),
  power_sources: {},
  health_score: 0,
  by_category: {},
  manufacturer_coverage: {}
};

// Analyze drivers
const validDrivers = [];
driverDirs.forEach(driver => {
  const driverName = driver.name;
  const composePath = path.join(driversPath, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    return;
  }
  
  try {
    const driverData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const metadata = categories[driverName] || {};
    
    validDrivers.push(driverData);
    
    // Count variants (manufacturer IDs)
    if (driverData.zigbee && driverData.zigbee.manufacturerName) {
      stats.device_variants += driverData.zigbee.manufacturerName.length;
      
      // Track manufacturers
      driverData.zigbee.manufacturerName.forEach(mfr => {
        const prefix = mfr.substring(0, 8); // _TZ3000_, etc.
        stats.manufacturer_coverage[prefix] = (stats.manufacturer_coverage[prefix] || 0) + 1;
        
        // Extract brand from manufacturer DB or metadata
        if (mfr.includes('MOES')) stats.brands.add('MOES');
        if (mfr.includes('Nous')) stats.brands.add('Nous');
        if (mfr.includes('LSC')) stats.brands.add('LSC Smart Connect');
        if (mfr.includes('Nedis')) stats.brands.add('Nedis SmartLife');
        if (mfr.includes('Lidl')) stats.brands.add('Lidl Smart Home');
        if (mfr.includes('Silvercrest')) stats.brands.add('Silvercrest');
      });
    }
    
    // Count by category
    const category = metadata.category || 'uncategorized';
    stats.by_category[category] = (stats.by_category[category] || 0) + 1;
    
    // Count power sources
    const powerSource = metadata.power_source || 'unknown';
    stats.power_sources[powerSource] = (stats.power_sources[powerSource] || 0) + 1;
    
  } catch (err) {
    console.log(`Error processing ${driverName}: ${err.message}`);
  }
});

// Calculate health score (% of drivers with valid schema)
stats.health_score = Math.round((validDrivers.length / stats.total_drivers) * 100);

// Count unique categories
stats.categories = Object.keys(stats.by_category).length;

// Convert brands Set to Array
stats.brands = Array.from(stats.brands).sort();
stats.brand_count = stats.brands.length;

// Calculate coverage methodology
stats.coverage_methodology = {
  drivers: "Physical driver folders in /drivers/ directory",
  variants: "Sum of manufacturerName[] arrays across all drivers",
  brands: "Extracted from manufacturer IDs and device names",
  health: "Percentage of drivers with valid driver.compose.json schema",
  source: "Generated from actual codebase, not estimates"
};

// Save JSON
fs.writeFileSync('COVERAGE_STATS.json', JSON.stringify(stats, null, 2));
console.log('✅ Coverage stats saved: COVERAGE_STATS.json');

// Generate HTML Dashboard
const html = generateDashboard(stats);
fs.writeFileSync('coverage-dashboard.html', html);
console.log('✅ Dashboard saved: coverage-dashboard.html');

// Print summary
console.log('\n========================================');
console.log('  COVERAGE SUMMARY');
console.log('========================================\n');
console.log(`Total Drivers:      ${stats.total_drivers}`);
console.log(`Device Variants:    ${stats.device_variants}`);
console.log(`Categories:         ${stats.categories}`);
console.log(`Brands:             ${stats.brand_count}`);
console.log(`Health Score:       ${stats.health_score}%`);
console.log('\nTop Manufacturer Prefixes:');
Object.entries(stats.manufacturer_coverage)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .forEach(([prefix, count]) => {
    console.log(`  ${prefix}: ${count} drivers`);
  });

// Helper: Generate HTML Dashboard
function generateDashboard(stats) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Device Coverage Dashboard - Universal Tuya Zigbee</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
    }
    h1 { 
      font-size: 36px;
      margin-bottom: 10px;
      color: #667eea;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 42px;
      font-weight: bold;
      margin: 10px 0;
    }
    .stat-label {
      font-size: 14px;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .section {
      margin: 40px 0;
    }
    .section-title {
      font-size: 24px;
      margin-bottom: 20px;
      color: #667eea;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #667eea;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background: #e3f2fd;
      color: #1976d2;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Device Coverage Dashboard</h1>
    <div class="subtitle">
      Generated: ${new Date(stats.generated_at).toLocaleString()} | 
      App Version: ${stats.app_version}
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Drivers</div>
        <div class="stat-value">${stats.total_drivers}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Device Variants</div>
        <div class="stat-value">${stats.device_variants}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Categories</div>
        <div class="stat-value">${stats.categories}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Health Score</div>
        <div class="stat-value">${stats.health_score}%</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">📦 Drivers by Category</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Driver Count</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(stats.by_category)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => `
              <tr>
                <td>${cat}</td>
                <td><span class="badge">${count}</span></td>
                <td>${Math.round(count / stats.total_drivers * 100)}%</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">🏢 Supported Brands</h2>
      <p>${stats.brands.join(', ')}</p>
      <p style="margin-top: 10px; color: #666;">
        <strong>${stats.brand_count}</strong> major brands supported
      </p>
    </div>

    <div class="section">
      <h2 class="section-title">⚡ Power Source Distribution</h2>
      <table>
        <thead>
          <tr>
            <th>Power Source</th>
            <th>Count</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(stats.power_sources)
            .sort((a, b) => b[1] - a[1])
            .map(([source, count]) => `
              <tr>
                <td>${source}</td>
                <td><span class="badge">${count}</span></td>
                <td>${Math.round(count / stats.total_drivers * 100)}%</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">📖 Coverage Methodology</h2>
      <ul style="line-height: 1.8; color: #666;">
        <li><strong>Drivers:</strong> ${stats.coverage_methodology.drivers}</li>
        <li><strong>Variants:</strong> ${stats.coverage_methodology.variants}</li>
        <li><strong>Brands:</strong> ${stats.coverage_methodology.brands}</li>
        <li><strong>Health:</strong> ${stats.coverage_methodology.health}</li>
        <li><strong>Source:</strong> ${stats.coverage_methodology.source}</li>
      </ul>
    </div>

    <div class="footer">
      <p>Universal Tuya Zigbee App for Homey Pro</p>
      <p>100% Local Control | No Cloud Required | Zigbee 3.0</p>
    </div>
  </div>
</body>
</html>`;
}
