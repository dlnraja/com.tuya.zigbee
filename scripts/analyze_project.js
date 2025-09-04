const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, 'analysis-results'),
  driversDir: path.join(__dirname, 'drivers'),
  scriptsDir: path.join(__dirname, 'scripts'),
  workflowsDir: path.join(__dirname, '.github', 'workflows'),
  requiredDriverFiles: ['device.js', 'driver.js', 'driver.compose.json'],
  requiredProjectFiles: ['package.json', 'app.json', 'README.md']
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Analysis results
const analysis = {
  timestamp: new Date().toISOString(),
  projectInfo: {},
  drivers: {},
  scripts: {},
  workflows: {},
  issues: [],
  recommendations: []
};

// Helper functions
function getDirectories(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

function getFiles(dir, ext = '') {
  return fs.readdirSync(dir)
    .filter(file => file.endsWith(ext));
}

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

// Analyze project files
function analyzeProject() {
  console.log('Analyzing project structure...');
  
  // Check for required project files
  CONFIG.requiredProjectFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    analysis.projectInfo[file] = checkFileExists(filePath);
    
    if (!analysis.projectInfo[file]) {
      analysis.issues.push(`Missing required project file: ${file}`);
    }
  });
  
  // Get Node.js version
  try {
    analysis.projectInfo.nodeVersion = process.version;
  } catch (err) {
    analysis.issues.push('Could not determine Node.js version');
  }
  
  // Get npm version
  try {
    analysis.projectInfo.npmVersion = execSync('npm --version').toString().trim();
  } catch (err) {
    analysis.issues.push('Could not determine npm version');
  }
  
  // Get Git info if available
  try {
    analysis.projectInfo.gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    analysis.projectInfo.gitCommit = execSync('git rev-parse HEAD').toString().trim();
  } catch (err) {
    analysis.issues.push('Could not determine Git information');
  }
}

// Analyze drivers
function analyzeDrivers() {
  console.log('Analyzing drivers...');
  
  if (!checkFileExists(CONFIG.driversDir)) {
    analysis.issues.push('Drivers directory not found');
    return;
  }
  
  const driverDirs = getDirectories(CONFIG.driversDir);
  analysis.drivers.count = driverDirs.length;
  analysis.drivers.complete = 0;
  analysis.drivers.missingFiles = {};
  analysis.drivers.byType = {};
  
  CONFIG.requiredDriverFiles.forEach(file => {
    analysis.drivers.missingFiles[file] = 0;
  });
  
  driverDirs.forEach(dir => {
    const driverPath = path.join(CONFIG.driversDir, dir);
    const driverFiles = fs.readdirSync(driverPath);
    const driverType = dir.split('-')[0] || 'unknown';
    
    // Initialize driver type counter
    if (!analysis.drivers.byType[driverType]) {
      analysis.drivers.byType[driverType] = 0;
    }
    analysis.drivers.byType[driverType]++;
    
    // Check for required files
    let isComplete = true;
    CONFIG.requiredDriverFiles.forEach(file => {
      if (!driverFiles.includes(file)) {
        analysis.drivers.missingFiles[file]++;
        isComplete = false;
      }
    });
    
    if (isComplete) {
      analysis.drivers.complete++;
    }
  });
  
  // Calculate completion percentage
  analysis.drivers.completionRate = 
    Math.round((analysis.drivers.complete / analysis.drivers.count) * 100) || 0;
}

// Analyze scripts
function analyzeScripts() {
  console.log('Analyzing scripts...');
  
  if (!checkFileExists(CONFIG.scriptsDir)) {
    analysis.issues.push('Scripts directory not found');
    return;
  }
  
  try {
    const scriptFiles = getFiles(CONFIG.scriptsDir, '.js')
      .concat(getFiles(CONFIG.scriptsDir, '.mjs'))
      .concat(getFiles(CONFIG.scriptsDir, '.ps1'));
    
    analysis.scripts.count = scriptFiles.length;
    analysis.scripts.files = scriptFiles;
    
    // Check for required scripts
    const requiredScripts = ['analyze-drivers.js', 'fix-js.js'];
    analysis.scripts.missing = [];
    
    requiredScripts.forEach(script => {
      if (!scriptFiles.includes(script)) {
        analysis.scripts.missing.push(script);
      }
    });
    
    if (analysis.scripts.missing.length > 0) {
      analysis.issues.push(`Missing required scripts: ${analysis.scripts.missing.join(', ')}`);
    }
  } catch (err) {
    analysis.issues.push(`Error analyzing scripts: ${err.message}`);
  }
}

// Analyze workflows
function analyzeWorkflows() {
  console.log('Analyzing GitHub workflows...');
  
  if (!checkFileExists(CONFIG.workflowsDir)) {
    analysis.issues.push('Workflows directory not found');
    return;
  }
  
  try {
    const workflowFiles = getFiles(CONFIG.workflowsDir, '.yml')
      .concat(getFiles(CONFIG.workflowsDir, '.yaml'));
    
    analysis.workflows.count = workflowFiles.length;
    analysis.workflows.files = workflowFiles;
    
    // Check for required workflows
    const requiredWorkflows = ['ci.yml', 'release.yml'];
    analysis.workflows.missing = [];
    
    requiredWorkflows.forEach(workflow => {
      if (!workflowFiles.includes(workflow)) {
        analysis.workflows.missing.push(workflow);
      }
    });
    
    if (analysis.workflows.missing.length > 0) {
      analysis.issues.push(`Missing required workflows: ${analysis.workflows.missing.join(', ')}`);
    }
  } catch (err) {
    analysis.issues.push(`Error analyzing workflows: ${err.message}`);
  }
}

// Generate recommendations
function generateRecommendations() {
  // Driver recommendations
  if (analysis.drivers.completionRate < 100) {
    analysis.recommendations.push({
      priority: 'high',
      message: `Only ${analysis.drivers.completionRate}% of drivers are complete (${analysis.drivers.complete}/${analysis.drivers.count})`,
      action: 'Complete missing driver files (device.js, driver.js, driver.compose.json)'
    });
    
    Object.entries(analysis.drivers.missingFiles).forEach(([file, count]) => {
      if (count > 0) {
        analysis.recommendations.push({
          priority: 'high',
          message: `${count} drivers are missing ${file}`,
          action: `Add missing ${file} to incomplete drivers`
        });
      }
    });
  }
  
  // Script recommendations
  if (analysis.scripts.missing && analysis.scripts.missing.length > 0) {
    analysis.recommendations.push({
      priority: 'medium',
      message: `Missing ${analysis.scripts.missing.length} required scripts`,
      action: 'Create missing scripts for better project maintenance'
    });
  }
  
  // Workflow recommendations
  if (analysis.workflows.missing && analysis.workflows.missing.length > 0) {
    analysis.recommendations.push({
      priority: 'high',
      message: `Missing ${analysis.workflows.missing.length} required workflows`,
      action: 'Set up missing GitHub Actions workflows for CI/CD'
    });
  }
  
  // General recommendations
  if (analysis.issues.length > 0) {
    analysis.recommendations.push({
      priority: 'high',
      message: `Found ${analysis.issues.length} issues that need attention`,
      action: 'Review and fix the reported issues'
    });
  }
}

// Generate report
function generateReport() {
  const reportPath = path.join(CONFIG.outputDir, 'project-analysis.json');
  const markdownPath = path.join(CONFIG.outputDir, 'project-analysis.md');
  
  // Generate JSON report
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  
  // Generate Markdown report
  let markdown = `# Project Analysis Report
**Generated:** ${new Date().toLocaleString()}

## Project Information
`;
  
  // Project info
  markdown += `- **Node.js Version:** ${analysis.projectInfo.nodeVersion || 'N/A'}\n`;
  markdown += `- **npm Version:** ${analysis.projectInfo.npmVersion || 'N/A'}\n`;
  markdown += `- **Git Branch:** ${analysis.projectInfo.gitBranch || 'N/A'}\n`;
  markdown += `- **Git Commit:** ${analysis.projectInfo.gitCommit ? analysis.projectInfo.gitCommit.substring(0, 7) : 'N/A'}\n\n`;
  
  // Drivers section
  markdown += `## Drivers (${analysis.drivers.count || 0} total)\n`;
  markdown += `- **Complete Drivers:** ${analysis.drivers.complete || 0} (${analysis.drivers.completionRate || 0}%)\n`;
  
  if (analysis.drivers.missingFiles) {
    markdown += '\n### Missing Files\n';
    Object.entries(analysis.drivers.missingFiles).forEach(([file, count]) => {
      if (count > 0) {
        markdown += `- ${file}: ${count} missing\n`;
      }
    });
  }
  
  if (analysis.drivers.byType) {
    markdown += '\n### Driver Types\n';
    Object.entries(analysis.drivers.byType).forEach(([type, count]) => {
      markdown += `- ${type}: ${count}\n`;
    });
  }
  
  // Scripts section
  if (analysis.scripts) {
    markdown += `\n## Scripts (${analysis.scripts.count || 0} total)\n`;
    if (analysis.scripts.missing && analysis.scripts.missing.length > 0) {
      markdown += '\n### Missing Scripts\n';
      analysis.scripts.missing.forEach(script => {
        markdown += `- ${script}\n`;
      });
    }
  }
  
  // Workflows section
  if (analysis.workflows) {
    markdown += `\n## GitHub Workflows (${analysis.workflows.count || 0} total)\n`;
    if (analysis.workflows.missing && analysis.workflows.missing.length > 0) {
      markdown += '\n### Missing Workflows\n';
      analysis.workflows.missing.forEach(workflow => {
        markdown += `- ${workflow}\n`;
      });
    }
  }
  
  // Issues section
  if (analysis.issues.length > 0) {
    markdown += '\n## Issues\n';
    analysis.issues.forEach(issue => {
      markdown += `- ❌ ${issue}\n`;
    });
  }
  
  // Recommendations section
  if (analysis.recommendations.length > 0) {
    markdown += '\n## Recommendations\n';
    
    // Sort by priority
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    const sortedRecs = [...analysis.recommendations].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
    
    sortedRecs.forEach(rec => {
      const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟠' : '🟢';
      markdown += `\n### ${priorityIcon} ${rec.message}\n${rec.action}\n`;
    });
  }
  
  // Save markdown report
  fs.writeFileSync(markdownPath, markdown);
  
  console.log('\n=== Analysis Complete ===');
  console.log(`- JSON Report: ${reportPath}`);
  console.log(`- Markdown Report: ${markdownPath}`);
  
  // Print summary to console
  console.log('\n=== Quick Summary ===');
  console.log(`Total Drivers: ${analysis.drivers.count || 0}`);
  console.log(`Complete Drivers: ${analysis.drivers.complete || 0} (${analysis.drivers.completionRate || 0}%)`);
  
  if (analysis.issues.length > 0) {
    console.log(`\nFound ${analysis.issues.length} issues that need attention`);
  }
  
  if (analysis.recommendations.length > 0) {
    console.log(`\nTop recommendations:`);
    analysis.recommendations
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 3)
      .forEach((rec, i) => {
        console.log(`${i + 1}. ${rec.message}`);
      });
  }
}

// Priority order for sorting
const priorityOrder = { high: 1, medium: 2, low: 3 };

// Main function
async function main() {
  console.log('Starting project analysis...');
  
  try {
    analyzeProject();
    analyzeDrivers();
    analyzeScripts();
    analyzeWorkflows();
    generateRecommendations();
    generateReport();
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

// Run the analysis
main();
