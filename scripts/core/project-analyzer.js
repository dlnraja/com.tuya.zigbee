#!/usr/bin/env node

/**
 * PROJECT DEEP ANALYZER
 * Analyze entire project structure, scripts, and patterns
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'reports', 'PROJECT_ANALYSIS.md');

console.log('\n🔍 DEEP PROJECT ANALYSIS\n');
console.log('═'.repeat(70));

const analysis = {
    date: new Date().toISOString(),
    structure: {},
    scripts: {
        total: 0,
        byCategory: {},
        deprecated: [],
        active: [],
        needsUpdate: []
    },
    drivers: {
        total: 0,
        withDevices: 0,
        totalManufacturerIds: 0,
        byFamily: {}
    },
    workflows: {
        total: 0,
        active: [],
        scheduled: []
    },
    documentation: {
        total: 0,
        guides: [],
        references: []
    }
};

// Analyze directory structure
function analyzeStructure(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    const stats = { files: 0, dirs: 0, size: 0 };
    
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (!item.startsWith('.') && item !== 'node_modules') {
                stats.dirs++;
                const subStats = analyzeStructure(fullPath, prefix + '  ');
                stats.size += subStats.size;
            }
        } else {
            stats.files++;
            stats.size += stat.size;
        }
    });
    
    return stats;
}

// Analyze scripts
function analyzeScripts() {
    console.log('\n📦 Analyzing scripts...');
    
    const scriptsDir = path.join(PROJECT_ROOT, 'scripts');
    
    function scanScriptsDir(dir, category = '') {
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanScriptsDir(fullPath, item);
            } else if (item.endsWith('.js')) {
                analysis.scripts.total++;
                
                // Categorize
                const cat = category || 'root';
                if (!analysis.scripts.byCategory[cat]) {
                    analysis.scripts.byCategory[cat] = [];
                }
                analysis.scripts.byCategory[cat].push(item);
                
                // Check if deprecated
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    
                    if (content.includes('@deprecated') || 
                        content.includes('DEPRECATED') ||
                        item.includes('OLD_') ||
                        item.includes('LEGACY_')) {
                        analysis.scripts.deprecated.push(path.relative(PROJECT_ROOT, fullPath));
                    } else {
                        analysis.scripts.active.push(path.relative(PROJECT_ROOT, fullPath));
                    }
                    
                    // Check if needs update (old patterns)
                    if (content.includes('require(\'../../lib/BaseHybridDevice\')') ||
                        content.includes('CLUSTER.') ||
                        content.includes('execSync(\'git\')') && !content.includes('try')) {
                        analysis.scripts.needsUpdate.push(path.relative(PROJECT_ROOT, fullPath));
                    }
                } catch (error) {
                    // Ignore read errors
                }
            }
        });
    }
    
    scanScriptsDir(scriptsDir);
    console.log(`   ✅ ${analysis.scripts.total} scripts found`);
}

// Analyze drivers
function analyzeDrivers() {
    console.log('\n🚗 Analyzing drivers...');
    
    const driversDir = path.join(PROJECT_ROOT, 'drivers');
    
    if (!fs.existsSync(driversDir)) return;
    
    const drivers = fs.readdirSync(driversDir).filter(d => {
        return fs.statSync(path.join(driversDir, d)).isDirectory();
    });
    
    analysis.drivers.total = drivers.length;
    
    drivers.forEach(driver => {
        const composePath = path.join(driversDir, driver, 'driver.compose.json');
        
        if (fs.existsSync(composePath)) {
            try {
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                
                if (compose.zigbee && compose.zigbee.manufacturerName) {
                    const count = compose.zigbee.manufacturerName.length;
                    analysis.drivers.withDevices++;
                    analysis.drivers.totalManufacturerIds += count;
                    
                    // Categorize by family
                    const family = driver.split('_')[0];
                    if (!analysis.drivers.byFamily[family]) {
                        analysis.drivers.byFamily[family] = {
                            count: 0,
                            devices: 0
                        };
                    }
                    analysis.drivers.byFamily[family].count++;
                    analysis.drivers.byFamily[family].devices += count;
                }
            } catch (error) {
                // Ignore
            }
        }
    });
    
    console.log(`   ✅ ${analysis.drivers.total} drivers analyzed`);
}

// Analyze workflows
function analyzeWorkflows() {
    console.log('\n⚙️  Analyzing workflows...');
    
    const workflowsDir = path.join(PROJECT_ROOT, '.github', 'workflows');
    
    if (!fs.existsSync(workflowsDir)) return;
    
    const workflows = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    
    analysis.workflows.total = workflows.length;
    
    workflows.forEach(workflow => {
        const fullPath = path.join(workflowsDir, workflow);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        analysis.workflows.active.push(workflow);
        
        if (content.includes('schedule:') && content.includes('cron:')) {
            analysis.workflows.scheduled.push(workflow);
        }
    });
    
    console.log(`   ✅ ${analysis.workflows.total} workflows found`);
}

// Analyze documentation
function analyzeDocs() {
    console.log('\n📚 Analyzing documentation...');
    
    const docsDir = path.join(PROJECT_ROOT, 'docs');
    
    if (!fs.existsSync(docsDir)) return;
    
    function scanDocs(dir) {
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDocs(fullPath);
            } else if (item.endsWith('.md')) {
                analysis.documentation.total++;
                
                const relativePath = path.relative(PROJECT_ROOT, fullPath);
                
                if (item.includes('GUIDE') || item.includes('TUTORIAL')) {
                    analysis.documentation.guides.push(relativePath);
                } else {
                    analysis.documentation.references.push(relativePath);
                }
            }
        });
    }
    
    scanDocs(docsDir);
    
    // Also check root docs
    const rootDocs = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE'];
    rootDocs.forEach(doc => {
        if (fs.existsSync(path.join(PROJECT_ROOT, doc))) {
            analysis.documentation.total++;
            analysis.documentation.references.push(doc);
        }
    });
    
    console.log(`   ✅ ${analysis.documentation.total} documentation files found`);
}

// Generate recommendations
function generateRecommendations() {
    const recommendations = [];
    
    // Scripts recommendations
    if (analysis.scripts.deprecated.length > 0) {
        recommendations.push({
            category: 'Scripts',
            priority: 'High',
            action: `Remove ${analysis.scripts.deprecated.length} deprecated scripts`,
            details: analysis.scripts.deprecated.slice(0, 5)
        });
    }
    
    if (analysis.scripts.needsUpdate.length > 0) {
        recommendations.push({
            category: 'Scripts',
            priority: 'Medium',
            action: `Update ${analysis.scripts.needsUpdate.length} scripts with old patterns`,
            details: analysis.scripts.needsUpdate.slice(0, 5)
        });
    }
    
    // Drivers recommendations
    const emptyDrivers = analysis.drivers.total - analysis.drivers.withDevices;
    if (emptyDrivers > 0) {
        recommendations.push({
            category: 'Drivers',
            priority: 'Low',
            action: `${emptyDrivers} drivers without devices - consider removing or enriching`,
            details: []
        });
    }
    
    // Workflows recommendations
    if (analysis.workflows.total < 5) {
        recommendations.push({
            category: 'Workflows',
            priority: 'Low',
            action: 'Consider adding more automation workflows',
            details: ['metrics-collector', 'ai-enhanced-automation', 'auto-version']
        });
    }
    
    return recommendations;
}

// Generate report
function generateReport() {
    const recommendations = generateRecommendations();
    
    const report = `# 📊 PROJECT ANALYSIS REPORT

**Generated**: ${new Date().toLocaleString()}  
**Project**: Tuya Zigbee App for Homey  
**Version**: v4.9.260+

---

## 📁 PROJECT STRUCTURE

### Overview

| Component | Count | Notes |
|-----------|-------|-------|
| **Scripts** | ${analysis.scripts.total} | ${Object.keys(analysis.scripts.byCategory).length} categories |
| **Drivers** | ${analysis.drivers.total} | ${analysis.drivers.withDevices} with devices |
| **Workflows** | ${analysis.workflows.total} | ${analysis.workflows.scheduled.length} scheduled |
| **Documentation** | ${analysis.documentation.total} | ${analysis.documentation.guides.length} guides |

### Drivers Statistics

\`\`\`
Total Drivers:              ${analysis.drivers.total}
Drivers with Devices:       ${analysis.drivers.withDevices}
Total Manufacturer IDs:     ${analysis.drivers.totalManufacturerIds}
Average IDs per Driver:     ${(analysis.drivers.totalManufacturerIds / analysis.drivers.withDevices).toFixed(1)}
\`\`\`

### Driver Families

${Object.entries(analysis.drivers.byFamily)
    .sort((a, b) => b[1].devices - a[1].devices)
    .slice(0, 10)
    .map(([family, stats]) => 
        `- **${family}**: ${stats.count} drivers, ${stats.devices} devices`
    ).join('\n')}

---

## 🗂️ SCRIPTS ANALYSIS

### By Category

${Object.entries(analysis.scripts.byCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([cat, scripts]) => 
        `- **${cat}**: ${scripts.length} scripts`
    ).join('\n')}

### Status

\`\`\`
Active Scripts:             ${analysis.scripts.active.length}
Deprecated Scripts:         ${analysis.scripts.deprecated.length}
Scripts Needing Update:     ${analysis.scripts.needsUpdate.length}
\`\`\`

${analysis.scripts.deprecated.length > 0 ? `
### ⚠️ Deprecated Scripts

${analysis.scripts.deprecated.slice(0, 10).map(s => `- \`${s}\``).join('\n')}
${analysis.scripts.deprecated.length > 10 ? `\n...and ${analysis.scripts.deprecated.length - 10} more` : ''}
` : ''}

${analysis.scripts.needsUpdate.length > 0 ? `
### 🔧 Scripts Needing Update

${analysis.scripts.needsUpdate.slice(0, 10).map(s => `- \`${s}\``).join('\n')}
${analysis.scripts.needsUpdate.length > 10 ? `\n...and ${analysis.scripts.needsUpdate.length - 10} more` : ''}
` : ''}

---

## ⚙️ WORKFLOWS

### Active Workflows

${analysis.workflows.active.map(w => `- \`${w}\``).join('\n')}

### Scheduled Workflows

${analysis.workflows.scheduled.length > 0 ? 
    analysis.workflows.scheduled.map(w => `- \`${w}\``).join('\n') :
    'None scheduled'
}

---

## 📚 DOCUMENTATION

### Guides (${analysis.documentation.guides.length})

${analysis.documentation.guides.map(g => `- \`${g}\``).join('\n')}

### References (${analysis.documentation.references.length})

${analysis.documentation.references.slice(0, 15).map(r => `- \`${r}\``).join('\n')}
${analysis.documentation.references.length > 15 ? `\n...and ${analysis.documentation.references.length - 15} more` : ''}

---

## 💡 RECOMMENDATIONS

${recommendations.length > 0 ? recommendations.map((rec, i) => `
### ${i + 1}. ${rec.category} - Priority: ${rec.priority}

**Action**: ${rec.action}

${rec.details.length > 0 ? `
**Affected Files**:
${rec.details.map(d => `- \`${d}\``).join('\n')}
` : ''}
`).join('\n') : 'No recommendations at this time.'}

---

## 🎯 NEXT STEPS

### Immediate Actions

1. **Script Cleanup**
   - Remove deprecated scripts
   - Update scripts with old patterns
   - Consolidate duplicate functionality

2. **Driver Optimization**
   - Enrich empty drivers or remove them
   - Validate all driver.compose.json files
   - Update manufacturer ID formats

3. **Workflow Enhancement**
   - Add metrics collection
   - Implement AI analysis
   - Auto-version updates

### Long-term Improvements

1. **Centralized Script System**
   - Create unified script runner
   - Standardize error handling
   - Add comprehensive logging

2. **Enhanced Automation**
   - AI-powered code review
   - Automatic conflict resolution
   - Smart version bumping

3. **Documentation**
   - Keep docs up to date
   - Add more examples
   - Create video tutorials

---

**Analysis Complete**: ${new Date().toLocaleString()}  
**Status**: ${recommendations.filter(r => r.priority === 'High').length === 0 ? '✅ HEALTHY' : '⚠️ NEEDS ATTENTION'}
`;

    return report;
}

// Main execution
console.log('\n🔍 Starting deep analysis...\n');

analyzeScripts();
analyzeDrivers();
analyzeWorkflows();
analyzeDocs();

const report = generateReport();

// Save report
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, report);

console.log('\n' + '═'.repeat(70));
console.log('\n📊 ANALYSIS SUMMARY\n');
console.log(`Scripts:        ${analysis.scripts.total} (${analysis.scripts.deprecated.length} deprecated)`);
console.log(`Drivers:        ${analysis.drivers.total} (${analysis.drivers.totalManufacturerIds} devices)`);
console.log(`Workflows:      ${analysis.workflows.total}`);
console.log(`Documentation:  ${analysis.documentation.total}`);
console.log(`\n📄 Report saved: ${OUTPUT_FILE}`);
console.log('\n✅ ANALYSIS COMPLETE!\n');

process.exit(0);
