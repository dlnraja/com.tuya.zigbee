// analyze_homey_versions.js
// Analyzes downloaded Homey app versions to find reporting issues
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import glob from 'glob';

const zipFolder = 'D:\\Download'; // Your browser downloads folder
const outputReport = './analysis_report.md';

function extractZips() {
  console.log('🔍 Searching for Homey app ZIPs in:', zipFolder);
  const zips = glob.sync(path.join(zipFolder, 'com.dlnraja.tuya.zigbee*.zip'));
  const extracted = [];

  console.log(`📦 Found ${zips.length} ZIP files`);

  for (const zipPath of zips) {
    const name = path.basename(zipPath, '.zip');
    const outDir = path.join(zipFolder, 'extracted', name);
    
    if (!fs.existsSync(outDir)) {
      console.log(`  📂 Extracting: ${name}`);
      fs.mkdirSync(outDir, { recursive: true });
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(outDir, true);
      extracted.push(outDir);
    } else {
      console.log(`  ✓ Already extracted: ${name}`);
      extracted.push(outDir);
    }
  }
  return extracted;
}

function scanDriverData(dir) {
  const result = [];
  const files = glob.sync(path.join(dir, '**', 'driver.compose.json'));

  console.log(`  📋 Found ${files.length} drivers in ${path.basename(dir)}`);

  for (const file of files) {
    const folder = path.dirname(file);
    try {
      const content = JSON.parse(fs.readFileSync(file, 'utf8'));
      const { id, name, capabilities, zigbee, capabilitiesOptions } = content;
      
      result.push({
        driverId: id || path.basename(folder),
        name,
        capabilities,
        capabilitiesOptions,
        zigbeeModel: zigbee?.productId || zigbee?.zigbeeModel || [],
        manufacturerName: zigbee?.manufacturerName || [],
        clusters: zigbee?.endpoints || {},
        hasBattery: capabilities?.includes('measure_battery'),
        hasReporting: JSON.stringify(content).includes('configureReporting')
      });
    } catch (err) {
      result.push({ error: `Parse error: ${file}` });
    }
  }
  return result;
}

function findDriverIssues(dir) {
  const results = [];
  const files = glob.sync(path.join(dir, '**', 'driver.js'));
  
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    const issues = [];
    
    if (!/onNodeInit|onInit/.test(code)) {
      issues.push('⚠️ Missing onNodeInit/onInit');
    }
    if (!/configureReporting/.test(code)) {
      issues.push('⚠️ No configureReporting calls');
    }
    if (!/reportListener|attrReport/.test(code)) {
      issues.push('⚠️ No attribute reporting registered');
    }
    if (!/bindCluster|bind/.test(code)) {
      issues.push('⚠️ Missing cluster binding');
    }
    if (/measure_battery/.test(code) && /AC|mains|powered/.test(code)) {
      issues.push('🔴 CRITICAL: measure_battery on AC powered device!');
    }
    
    if (issues.length > 0) {
      results.push({ 
        file: path.relative(dir, file), 
        issues 
      });
    }
  }
  return results;
}

function analyzeAppManifest(dir) {
  const appJson = path.join(dir, 'app.json');
  if (!fs.existsSync(appJson)) return null;
  
  try {
    const data = JSON.parse(fs.readFileSync(appJson, 'utf8'));
    return {
      version: data.version,
      sdk: data.sdk,
      compatibility: data.compatibility
    };
  } catch (err) {
    return null;
  }
}

function generateReport(data) {
  let md = `# 🧠 Homey App Analysis Report - com.dlnraja.tuya.zigbee\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `**Purpose:** Find why data reporting stopped working\n\n`;
  md += `---\n\n`;

  // Sort by version
  data.sort((a, b) => {
    const vA = a.manifest?.version || '0.0.0';
    const vB = b.manifest?.version || '0.0.0';
    return vB.localeCompare(vA, undefined, { numeric: true });
  });

  for (const entry of data) {
    const version = entry.manifest?.version || path.basename(entry.dir);
    md += `## 📦 Version: ${version}\n\n`;
    
    if (entry.manifest) {
      md += `- **SDK:** ${entry.manifest.sdk}\n`;
      md += `- **Compatibility:** ${entry.manifest.compatibility}\n\n`;
    }

    md += `### 📊 Statistics\n`;
    md += `- **Total Drivers:** ${entry.drivers.length}\n`;
    md += `- **Drivers with Reporting:** ${entry.drivers.filter(d => d.hasReporting).length}\n`;
    md += `- **Drivers with Battery:** ${entry.drivers.filter(d => d.hasBattery).length}\n\n`;

    // Sample drivers
    md += `### 🔍 Sample Drivers (first 5)\n`;
    entry.drivers.slice(0, 5).forEach(d => {
      md += `#### ${d.name || d.driverId}\n`;
      md += `- **Driver ID:** ${d.driverId}\n`;
      md += `- **Zigbee Model:** ${Array.isArray(d.zigbeeModel) ? d.zigbeeModel.join(', ') : d.zigbeeModel}\n`;
      md += `- **Manufacturer:** ${Array.isArray(d.manufacturerName) ? d.manufacturerName.slice(0, 3).join(', ') : d.manufacturerName}${Array.isArray(d.manufacturerName) && d.manufacturerName.length > 3 ? ` ... (+${d.manufacturerName.length - 3} more)` : ''}\n`;
      md += `- **Capabilities:** ${d.capabilities?.join(', ') || 'N/A'}\n`;
      md += `- **Has Reporting:** ${d.hasReporting ? '✅' : '❌'}\n`;
      md += `- **Has Battery:** ${d.hasBattery ? '🔋' : '⚡'}\n\n`;
    });

    if (entry.drivers.length > 5) {
      md += `*... and ${entry.drivers.length - 5} more drivers*\n\n`;
    }

    if (entry.issues.length > 0) {
      md += `### 🔴 Potential Issues (${entry.issues.length})\n`;
      entry.issues.forEach(i => {
        md += `#### ${i.file}\n`;
        i.issues.forEach(issue => {
          md += `- ${issue}\n`;
        });
        md += `\n`;
      });
    } else {
      md += `### ✅ No major issues detected\n\n`;
    }
    
    md += `---\n\n`;
  }

  // Summary comparison
  md += `## 📈 Version Comparison\n\n`;
  md += `| Version | SDK | Drivers | With Reporting | With Battery | Issues |\n`;
  md += `|---------|-----|---------|----------------|--------------|--------|\n`;
  data.forEach(e => {
    const v = e.manifest?.version || 'unknown';
    const sdk = e.manifest?.sdk || '?';
    const total = e.drivers.length;
    const reporting = e.drivers.filter(d => d.hasReporting).length;
    const battery = e.drivers.filter(d => d.hasBattery).length;
    const issues = e.issues.length;
    md += `| ${v} | ${sdk} | ${total} | ${reporting} | ${battery} | ${issues} |\n`;
  });
  md += `\n`;

  fs.writeFileSync(outputReport, md);
  console.log(`\n✅ Analysis complete → ${path.resolve(outputReport)}`);
}

console.log('🚀 Starting Homey App Analysis...\n');

const dirs = extractZips();
const results = [];

for (const dir of dirs) {
  console.log(`\n📂 Analyzing: ${path.basename(dir)}`);
  const manifest = analyzeAppManifest(dir);
  const drivers = scanDriverData(dir);
  const issues = findDriverIssues(dir);
  results.push({ dir, manifest, drivers, issues });
}

console.log('\n📝 Generating report...');
generateReport(results);
console.log('\n🎉 Done! Check analysis_report.md for results.');
