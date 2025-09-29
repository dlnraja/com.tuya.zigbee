const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'reports', 'import-issues.json');

// Ensure output directory exists
const REPORT_DIR = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

/**
 * Find all JavaScript files in the drivers directory
 */
function findJavaScriptFiles(dir) {
  const files = [];
  
  function scanDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDirectory(dir);
  return files;
}

/**
 * Analyze a JavaScript file for import/require issues
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  const lines = content.split('\n');
  
  // Common patterns to identify
  const patterns = [
    // Legacy imports
    { 
      regex: /require\s*\(\s*['"]homey-meshdriver['"]\s*\)/g, 
      type: 'legacy_import',
      message: 'Using legacy homey-meshdriver, should be updated to homey-zigbeedriver',
      fix: 'const { ZigbeeDevice } = require("homey-zigbeedriver");'
    },
    {
      regex: /require\s*\(\s*['"]homey\.zigbeedriver['"]\s*\)/g,
      type: 'deprecated_import',
      message: 'Using deprecated homey.zigbeedriver, should be homey-zigbeedriver',
      fix: 'const { ZigbeeDevice } = require("homey-zigbeedriver");'
    },
    // Incorrect Zigbee clusters import
    {
      regex: /require\s*\(\s*['"]zigbee\-clusters['"]\s*\)/g,
      type: 'incorrect_cluster_import',
      message: 'Incorrect zigbee-clusters import, should use destructured imports',
      fix: 'const { Cluster, CLUSTER } = require("zigbee-clusters");'
    },
    // Missing imports
    {
      regex: /extends\s+[\w.]+ZigBeeDevice/g,
      type: 'missing_base_import',
      message: 'Extending ZigBeeDevice but may be missing proper import',
      fix: 'const { ZigbeeDevice } = require("homey-zigbeedriver");',
      requires: 'homey-zigbeedriver'
    }
  ];
  
  // Check each line for issues
  lines.forEach((line, index) => {
    patterns.forEach(pattern => {
      if (pattern.regex.test(line)) {
        issues.push({
          file: path.relative(PROJECT_ROOT, filePath),
          line: index + 1,
          code: line.trim(),
          type: pattern.type,
          message: pattern.message,
          fix: pattern.fix,
          requires: pattern.requires
        });
      }
    });
  });
  
  return issues;
}

/**
 * Generate a report of all import issues
 */
function generateReport(issues) {
  const report = {
    timestamp: new Date().toISOString(),
    totalIssues: issues.length,
    issuesByType: {},
    filesAffected: new Set(),
    issues: issues
  };
  
  // Group issues by type
  issues.forEach(issue => {
    if (!report.issuesByType[issue.type]) {
      report.issuesByType[issue.type] = 0;
    }
    report.issuesByType[issue.type]++;
    report.filesAffected.add(issue.file);
  });
  
  report.filesAffected = Array.from(report.filesAffected);
  
  return report;
}

/**
 * Save the report to a JSON file
 */
function saveReport(report) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`✅ Report saved to ${OUTPUT_FILE}`);
  
  // Also save a human-readable version
  const humanReadable = [
    `# Import Issues Report`,
    `Generated: ${new Date().toISOString()}`,
    `Total Issues: ${report.totalIssues}`,
    `Files Affected: ${report.filesAffected.length}`,
    '',
    '## Issues by Type',
    ...Object.entries(report.issuesByType).map(([type, count]) => 
      `- ${type}: ${count} issue${count !== 1 ? 's' : ''}`
    ),
    '',
    '## Detailed Issues',
    ...report.issues.map(issue => 
      `### ${issue.file}:${issue.line}\n` +
      `**Type:** ${issue.type}\n` +
      `**Message:** ${issue.message}\n` +
      `**Code:** \`${issue.code}\`\n` +
      `**Suggested Fix:** \`${issue.fix}\`\n`
    )
  ].join('\n');
  
  const mdPath = OUTPUT_FILE.replace(/\.json$/, '.md');
  fs.writeFileSync(mdPath, humanReadable);
  console.log(`📝 Human-readable report saved to ${mdPath}`);
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Searching for JavaScript files...');
  const files = findJavaScriptFiles(DRIVERS_DIR);
  console.log(`Found ${files.length} JavaScript files to analyze`);
  
  console.log('🔎 Analyzing files for import issues...');
  const allIssues = [];
  
  for (const file of files) {
    try {
      const issues = analyzeFile(file);
      if (issues.length > 0) {
        allIssues.push(...issues);
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${file}:`, error.message);
    }
  }
  
  console.log(`\nFound ${allIssues.length} potential import issues`);
  
  if (allIssues.length > 0) {
    const report = generateReport(allIssues);
    saveReport(report);
    
    // Generate a summary
    console.log('\n📊 Summary of Issues:');
    Object.entries(report.issuesByType).forEach(([type, count]) => {
      console.log(`- ${type}: ${count} issue${count !== 1 ? 's' : ''}`);
    });
    
    console.log(`\n💡 Review the full report at: ${OUTPUT_FILE}`);
  } else {
    console.log('✅ No import issues found!');
  }
}

// Run the analysis
main().catch(error => {
  console.error('❌ Error during analysis:', error);
  process.exit(1);
});
