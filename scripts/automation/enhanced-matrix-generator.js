#!/usr/bin/env node
'use strict';

/**
 * Enhanced Matrix Generator v3.0.0
 * Génère device matrix avec intégration DP Engine et AI metadata
 */

const fs = require('fs');
const path = require('path');

class EnhancedMatrixGenerator {
  constructor() {
    this.drivers = [];
    this.categories = {};
    this.dpEngine = null;
    this.aiMetadata = {};
  }

  async generate() {
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║  ENHANCED MATRIX GENERATOR v3.0.0                ║');
    console.log('║  With DP Engine & AI Integration                 ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    try {
      // Load data
      this.loadAppJson();
      this.loadCategories();
      this.loadDPEngine();
      this.loadAIMetadata();
      
      // Generate outputs
      this.generateMarkdown();
      this.generateCSV();
      this.generateJSON();
      this.generateEnhancedHTML();
      
      console.log('\n✅ Enhanced matrix generation complete!\n');
      
      return {
        drivers: this.drivers.length,
        categories: Object.keys(this.categories).length,
        dpEngineReady: this.dpEngine !== null
      };
      
    } catch (err) {
      console.error('❌ Generation error:', err.message);
      process.exit(1);
    }
  }

  loadAppJson() {
    console.log('→ Loading app.json...');
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    this.drivers = appJson.drivers || [];
    console.log(`  ✅ ${this.drivers.length} drivers loaded\n`);
  }

  loadCategories() {
    console.log('→ Loading categories...');
    try {
      const catData = fs.readFileSync('DRIVER_CATEGORIES.json', 'utf8');
      const cleanData = String(catData).replace(/^\uFEFF/, '');
      const parsed = JSON.parse(cleanData);
      this.categories = parsed.categories || {};
      console.log(`  ✅ ${Object.keys(this.categories).length} categorized\n`);
    } catch (err) {
      console.log('  ⚠️  Using defaults\n');
    }
  }

  loadDPEngine() {
    console.log('→ Loading DP Engine data...');
    try {
      const enginePath = 'lib/tuya-dp-engine';
      
      const profiles = JSON.parse(fs.readFileSync(path.join(enginePath, 'profiles.json'), 'utf8'));
      const fingerprints = JSON.parse(fs.readFileSync(path.join(enginePath, 'fingerprints.json'), 'utf8'));
      
      this.dpEngine = {
        profiles: profiles.profiles || {},
        fingerprints: fingerprints.fingerprints || []
      };
      
      console.log(`  ✅ ${Object.keys(this.dpEngine.profiles).length} profiles`);
      console.log(`  ✅ ${this.dpEngine.fingerprints.length} fingerprints\n`);
      
    } catch (err) {
      console.log('  ⚠️  DP Engine not available\n');
    }
  }

  loadAIMetadata() {
    console.log('→ Loading AI metadata...');
    try {
      // Check for AI-generated metadata
      if (fs.existsSync('ai-generated-metadata.json')) {
        this.aiMetadata = JSON.parse(fs.readFileSync('ai-generated-metadata.json', 'utf8'));
        console.log(`  ✅ ${Object.keys(this.aiMetadata).length} AI entries\n`);
      } else {
        console.log('  ℹ️  No AI metadata yet\n');
      }
    } catch (err) {
      console.log('  ⚠️  AI metadata unavailable\n');
    }
  }

  generateMarkdown() {
    console.log('→ Generating DEVICE_MATRIX.md...');
    
    let md = `# 📊 Device Support Matrix - v3.0.0

**Generated:** ${new Date().toISOString()}  
**Total Drivers:** ${this.drivers.length}  
**DP Engine Profiles:** ${this.dpEngine ? Object.keys(this.dpEngine.profiles).length : 'N/A'}  
**Categories:** ${Object.keys(this.categories).length}

---

## 🎯 Legend

| Symbol | Meaning |
|--------|---------|
| 🤖 | AI-Generated |
| 🔧 | DP Engine |
| ✅ | Validated |
| ⚡ | Energy Monitoring |
| 🔋 | Battery Powered |

---

## 📋 Full Device List

| Driver | Name | Class | Category | DP Engine | AI | Capabilities |
|--------|------|-------|----------|-----------|----|--------------|\n`;

    // Sort by category
    const categorized = this.groupByCategory();
    
    for (const [category, drivers] of Object.entries(categorized)) {
      md += `\n### ${this.formatCategory(category)}\n\n`;
      
      drivers.forEach(driver => {
        const info = this.getDriverInfo(driver);
        md += `| \`${driver.id}\` | ${driver.name?.en || driver.id} | ${driver.class} | ${info.category} | ${info.dpEngine} | ${info.ai} | ${info.capabilities} |\n`;
      });
    }
    
    md += `\n---

## 📊 Statistics by Category

| Category | Drivers | DP Engine | AI Generated |
|----------|---------|-----------|--------------|
`;

    for (const [category, drivers] of Object.entries(categorized)) {
      const dpCount = drivers.filter(d => this.isDPEngineDriver(d)).length;
      const aiCount = drivers.filter(d => this.isAIGenerated(d)).length;
      md += `| ${this.formatCategory(category)} | ${drivers.length} | ${dpCount} | ${aiCount} |\n`;
    }

    md += `\n---

## 🔗 Links

- **DP Engine Documentation:** [lib/tuya-dp-engine/README.md](lib/tuya-dp-engine/README.md)
- **AI System:** [scripts/ai/README.md](scripts/ai/README.md)
- **Local-First Philosophy:** [docs/LOCAL_FIRST.md](docs/LOCAL_FIRST.md)
- **Coverage Methodology:** [docs/COVERAGE_METHODOLOGY.md](docs/COVERAGE_METHODOLOGY.md)

---

*Generated by Enhanced Matrix Generator v3.0.0*
`;

    fs.writeFileSync('DEVICE_MATRIX.md', md);
    console.log('  ✅ DEVICE_MATRIX.md created\n');
  }

  generateCSV() {
    console.log('→ Generating device-matrix.csv...');
    
    let csv = 'ID,Name,Class,Category,DP_Engine,AI_Generated,Capabilities,Energy_Monitoring,Battery\n';
    
    this.drivers.forEach(driver => {
      const info = this.getDriverInfo(driver);
      const caps = (driver.capabilities || []).join(';');
      const hasEnergy = caps.includes('measure_power') || caps.includes('meter_power');
      const hasBattery = caps.includes('measure_battery');
      
      csv += `"${driver.id}","${driver.name?.en || driver.id}","${driver.class}","${info.category}",`;
      csv += `${this.isDPEngineDriver(driver) ? 'Yes' : 'No'},`;
      csv += `${this.isAIGenerated(driver) ? 'Yes' : 'No'},`;
      csv += `"${caps}",${hasEnergy ? 'Yes' : 'No'},${hasBattery ? 'Yes' : 'No'}\n`;
    });
    
    fs.writeFileSync('device-matrix.csv', csv);
    console.log('  ✅ device-matrix.csv created\n');
  }

  generateJSON() {
    console.log('→ Generating device-matrix.json...');
    
    const json = {
      version: '3.0.0',
      generated: new Date().toISOString(),
      statistics: {
        total_drivers: this.drivers.length,
        dp_engine_count: this.drivers.filter(d => this.isDPEngineDriver(d)).length,
        ai_generated_count: this.drivers.filter(d => this.isAIGenerated(d)).length,
        categories: Object.keys(this.groupByCategory()).length
      },
      drivers: this.drivers.map(driver => ({
        id: driver.id,
        name: driver.name?.en || driver.id,
        class: driver.class,
        category: this.getDriverInfo(driver).category,
        capabilities: driver.capabilities || [],
        dp_engine: this.isDPEngineDriver(driver),
        ai_generated: this.isAIGenerated(driver),
        energy_monitoring: (driver.capabilities || []).some(c => c.includes('power') || c.includes('energy')),
        battery_powered: (driver.capabilities || []).includes('measure_battery')
      }))
    };
    
    fs.writeFileSync('device-matrix.json', JSON.stringify(json, null, 2));
    console.log('  ✅ device-matrix.json created\n');
  }

  generateEnhancedHTML() {
    console.log('→ Generating device-matrix.html...');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Device Matrix - Universal Tuya Zigbee v3.0.0</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    header { background: linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px; }
    h1 { font-size: 2em; margin-bottom: 10px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
    .stat-card { background: #161b22; padding: 20px; border-radius: 8px; border: 1px solid #30363d; }
    .stat-value { font-size: 2.5em; font-weight: bold; color: #58a6ff; }
    .stat-label { color: #8b949e; margin-top: 5px; }
    .filters { background: #161b22; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    input, select { background: #0d1117; color: #c9d1d9; border: 1px solid #30363d; padding: 8px 12px; border-radius: 6px; }
    table { width: 100%; background: #161b22; border-radius: 8px; overflow: hidden; border-collapse: collapse; }
    thead { background: #1f2937; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #30363d; }
    th { color: #58a6ff; font-weight: 600; }
    tr:hover { background: #1c2128; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; margin-right: 4px; }
    .badge-dp { background: #3b82f6; color: white; }
    .badge-ai { background: #8b5cf6; color: white; }
    .badge-energy { background: #10b981; color: white; }
    .badge-battery { background: #f59e0b; color: white; }
    footer { text-align: center; margin-top: 40px; color: #8b949e; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Device Support Matrix</h1>
      <p>Universal Tuya Zigbee v3.0.0 - Complete Device Overview</p>
      <small>Generated: ${new Date().toLocaleString()}</small>
    </header>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${this.drivers.length}</div>
        <div class="stat-label">Total Drivers</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${this.drivers.filter(d => this.isDPEngineDriver(d)).length}</div>
        <div class="stat-label">DP Engine</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${this.drivers.filter(d => this.isAIGenerated(d)).length}</div>
        <div class="stat-label">AI Generated</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Object.keys(this.groupByCategory()).length}</div>
        <div class="stat-label">Categories</div>
      </div>
    </div>

    <div class="filters">
      <input type="text" id="search" placeholder="🔍 Search drivers..." style="width: 100%; margin-bottom: 10px;">
      <select id="categoryFilter">
        <option value="">All Categories</option>
        ${Object.keys(this.groupByCategory()).map(cat => `<option value="${cat}">${this.formatCategory(cat)}</option>`).join('')}
      </select>
    </div>

    <table id="deviceTable">
      <thead>
        <tr>
          <th>Driver ID</th>
          <th>Name</th>
          <th>Class</th>
          <th>Category</th>
          <th>Features</th>
          <th>Capabilities</th>
        </tr>
      </thead>
      <tbody>
        ${this.drivers.map(driver => this.generateTableRow(driver)).join('')}
      </tbody>
    </table>

    <footer>
      <p>Generated by Enhanced Matrix Generator v3.0.0</p>
      <p><a href="https://github.com/dlnraja/com.tuya.zigbee" style="color: #58a6ff;">Universal Tuya Zigbee on GitHub</a></p>
    </footer>
  </div>

  <script>
    const search = document.getElementById('search');
    const categoryFilter = document.getElementById('categoryFilter');
    const table = document.getElementById('deviceTable');
    
    function filterTable() {
      const searchTerm = search.value.toLowerCase();
      const category = categoryFilter.value;
      const rows = table.querySelectorAll('tbody tr');
      
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const rowCategory = row.dataset.category;
        const matchesSearch = text.includes(searchTerm);
        const matchesCategory = !category || rowCategory === category;
        row.style.display = matchesSearch && matchesCategory ? '' : 'none';
      });
    }
    
    search.addEventListener('input', filterTable);
    categoryFilter.addEventListener('change', filterTable);
  </script>
</body>
</html>`;
    
    fs.writeFileSync('device-matrix.html', html);
    console.log('  ✅ device-matrix.html created\n');
  }

  generateTableRow(driver) {
    const info = this.getDriverInfo(driver);
    const isDPEngine = this.isDPEngineDriver(driver);
    const isAI = this.isAIGenerated(driver);
    const hasEnergy = (driver.capabilities || []).some(c => c.includes('power') || c.includes('energy'));
    const hasBattery = (driver.capabilities || []).includes('measure_battery');
    
    let badges = '';
    if (isDPEngine) badges += '<span class="badge badge-dp">🔧 DP Engine</span>';
    if (isAI) badges += '<span class="badge badge-ai">🤖 AI</span>';
    if (hasEnergy) badges += '<span class="badge badge-energy">⚡ Energy</span>';
    if (hasBattery) badges += '<span class="badge badge-battery">🔋 Battery</span>';
    
    const caps = (driver.capabilities || []).slice(0, 5).join(', ') + ((driver.capabilities || []).length > 5 ? '...' : '');
    
    return `<tr data-category="${info.category}">
      <td><code>${driver.id}</code></td>
      <td>${driver.name?.en || driver.id}</td>
      <td>${driver.class}</td>
      <td>${this.formatCategory(info.category)}</td>
      <td>${badges || '-'}</td>
      <td>${caps || '-'}</td>
    </tr>`;
  }

  groupByCategory() {
    const grouped = {};
    
    this.drivers.forEach(driver => {
      const category = this.categories[driver.id]?.category || 'uncategorized';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(driver);
    });
    
    return grouped;
  }

  getDriverInfo(driver) {
    const category = this.categories[driver.id]?.category || 'uncategorized';
    const dpEngine = this.isDPEngineDriver(driver) ? '🔧' : '-';
    const ai = this.isAIGenerated(driver) ? '🤖' : '-';
    const capabilities = (driver.capabilities || []).slice(0, 3).join(', ');
    
    return { category, dpEngine, ai, capabilities };
  }

  isDPEngineDriver(driver) {
    // Check if driver uses DP Engine
    const driverPath = path.join('drivers', driver.id, 'device.js');
    if (fs.existsSync(driverPath)) {
      const code = fs.readFileSync(driverPath, 'utf8');
      return code.includes('TuyaDPEngine') || code.includes('tuya-dp-engine');
    }
    return false;
  }

  isAIGenerated(driver) {
    // Check AI metadata
    return this.aiMetadata[driver.id] !== undefined;
  }

  formatCategory(category) {
    return category.split('/').map(c => 
      c.charAt(0).toUpperCase() + c.slice(1)
    ).join(' > ');
  }
}

// Main execution
if (require.main === module) {
  const generator = new EnhancedMatrixGenerator();
  generator.generate().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = EnhancedMatrixGenerator;
