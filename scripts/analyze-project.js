import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const reportPath = path.join(projectRoot, 'analysis-report.json');

async function analyzeProject() {
  const report = {
    timestamp: new Date().toISOString(),
    projectInfo: {
      name: 'Tuya Zigbee Project',
      version: '1.0.0',
      description: 'Homey app for Tuya Zigbee devices'
    },
    analysis: {
      drivers: await analyzeDrivers(),
      scripts: await analyzeScripts(),
      workflows: await analyzeWorkflows(),
      dependencies: await analyzeDependencies(),
      documentation: await analyzeDocumentation(),
      gitInfo: getGitInfo()
    },
    recommendations: []
  };

  // Generate recommendations
  report.recommendations = generateRecommendations(report.analysis);

  // Save report
  await fs.writeJson(reportPath, report, { spaces: 2 });
  console.log(`Analysis report generated at: ${reportPath}`);
  
  return report;
}

async function analyzeDrivers() {
  const driversPath = path.join(projectRoot, 'drivers');
  const drivers = [];
  
  try {
    const driverDirs = await fs.readdir(driversPath, { withFileTypes: true })
      .then(entries => entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('_'))
        .map(dir => dir.name));

    for (const driver of driverDirs) {
      const driverPath = path.join(driversPath, driver);
      const driverFiles = await fs.readdir(driverPath);
      
      const driverInfo = {
        name: driver,
        path: driverPath,
        files: driverFiles,
        hasDeviceJs: driverFiles.includes('device.js'),
        hasDriverJs: driverFiles.includes('driver.js'),
        hasComposeJson: driverFiles.includes('driver.compose.json'),
        hasReadme: driverFiles.some(f => f.toLowerCase().includes('readme')),
        hasTests: driverFiles.some(f => f.endsWith('.test.js')),
        stats: await fs.stat(driverPath)
      };
      
      drivers.push(driverInfo);
    }
  } catch (error) {
    console.error('Error analyzing drivers:', error);
  }
  
  return {
    count: drivers.length,
    drivers: drivers.sort((a, b) => a.name.localeCompare(b.name)),
    summary: {
      withDeviceJs: drivers.filter(d => d.hasDeviceJs).length,
      withDriverJs: drivers.filter(d => d.hasDriverJs).length,
      withComposeJson: drivers.filter(d => d.hasComposeJson).length,
      withTests: drivers.filter(d => d.hasTests).length,
      withReadme: drivers.filter(d => d.hasReadme).length
    }
  };
}

async function analyzeScripts() {
  const scriptsPath = path.join(projectRoot, 'scripts');
  const scripts = [];
  
  try {
    const scriptFiles = await fs.readdir(scriptsPath);
    
    for (const script of scriptFiles) {
      if (script.endsWith('.js') || script.endsWith('.mjs')) {
        const scriptPath = path.join(scriptsPath, script);
        const stats = await fs.stat(scriptPath);
        
        scripts.push({
          name: script,
          path: scriptPath,
          size: stats.size,
          modified: stats.mtime,
          type: script.endsWith('.mjs') ? 'module' : 'commonjs'
        });
      }
    }
  } catch (error) {
    console.error('Error analyzing scripts:', error);
  }
  
  return {
    count: scripts.length,
    scripts: scripts.sort((a, b) => a.name.localeCompare(b.name)),
    languages: scripts.reduce((acc, script) => {
      const lang = script.type === 'module' ? 'ES Modules' : 'CommonJS';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {})
  };
}

async function analyzeWorkflows() {
  const workflowsPath = path.join(projectRoot, '.github', 'workflows');
  const workflows = [];
  
  try {
    if (await fs.pathExists(workflowsPath)) {
      const workflowFiles = (await fs.readdir(workflowsPath))
        .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));
      
      for (const workflow of workflowFiles) {
        const workflowPath = path.join(workflowsPath, workflow);
        const content = await fs.readFile(workflowPath, 'utf8');
        const triggers = [];
        
        // Simple trigger detection
        if (content.includes('on:')) {
          const triggerSection = content.split('on:')[1].split('\n  ')[0].trim();
          if (triggerSection.includes('push:')) triggers.push('push');
          if (triggerSection.includes('pull_request:')) triggers.push('pull_request');
          if (triggerSection.includes('schedule:')) triggers.push('schedule');
          if (triggerSection.includes('workflow_dispatch:')) triggers.push('manual');
        }
        
        workflows.push({
          name: workflow,
          path: workflowPath,
          triggers,
          size: (await fs.stat(workflowPath)).size
        });
      }
    }
  } catch (error) {
    console.error('Error analyzing workflows:', error);
  }
  
  return {
    count: workflows.length,
    workflows: workflows.sort((a, b) => a.name.localeCompare(b.name))
  };
}

async function analyzeDependencies() {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  try {
    const pkg = await fs.readJson(packageJsonPath);
    
    return {
      nodeVersion: pkg.engines?.node || 'Not specified',
      dependencies: {
        count: Object.keys(pkg.dependencies || {}).length,
        list: Object.keys(pkg.dependencies || {})
      },
      devDependencies: {
        count: Object.keys(pkg.devDependencies || {}).length,
        list: Object.keys(pkg.devDependencies || {})
      },
      scripts: Object.keys(pkg.scripts || {})
    };
  } catch (error) {
    console.error('Error analyzing dependencies:', error);
    return { error: 'Could not analyze dependencies' };
  }
}

async function analyzeDocumentation() {
  const docsPath = path.join(projectRoot, 'docs');
  const readmePath = path.join(projectRoot, 'README.md');
  const docs = [];
  
  try {
    // Check README
    const hasReadme = await fs.pathExists(readmePath);
    let readmeSize = 0;
    
    if (hasReadme) {
      const stats = await fs.stat(readmePath);
      readmeSize = stats.size;
    }
    
    // Check docs directory
    let hasDocsDir = false;
    let docFiles = [];
    
    if (await fs.pathExists(docsPath)) {
      hasDocsDir = true;
      docFiles = (await fs.readdir(docsPath, { recursive: true }))
        .filter(file => 
          file.endsWith('.md') || 
          file.endsWith('.txt') || 
          file.endsWith('.html') ||
          file.endsWith('.pdf')
        )
        .map(file => ({
          name: path.basename(file),
          path: path.join('docs', file),
          type: path.extname(file).substring(1)
        }));
    }
    
    return {
      hasReadme,
      readmeSize,
      hasDocsDir,
      docFiles: docFiles.sort((a, b) => a.name.localeCompare(b.name)),
      docFileTypes: docFiles.reduce((acc, file) => {
        acc[file.type] = (acc[file.type] || 0) + 1;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error analyzing documentation:', error);
    return { error: 'Could not analyze documentation' };
  }
}

function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const commitHash = execSync('git rev-parse HEAD').toString().trim();
    const lastCommit = execSync('git log -1 --pretty=%B').toString().trim();
    const commitDate = execSync('git log -1 --format=%cd').toString().trim();
    
    return {
      branch,
      commitHash,
      lastCommit,
      commitDate,
      isClean: execSync('git status --porcelain').toString().trim() === ''
    };
  } catch (error) {
    console.error('Error getting git info:', error);
    return { error: 'Could not get git information' };
  }
}

function generateRecommendations(analysis) {
  const recommendations = [];
  
  // Driver recommendations
  if (analysis.drivers.summary.withTests === 0) {
    recommendations.push({
      id: 'add-tests',
      priority: 'high',
      title: 'Add unit tests for drivers',
      description: 'No test files found for any drivers. Consider adding test coverage.'
    });
  }
  
  if (analysis.drivers.summary.withReadme < analysis.drivers.count * 0.5) {
    recommendations.push({
      id: 'add-readmes',
      priority: 'medium',
      title: 'Add README files to drivers',
      description: `Only ${analysis.drivers.summary.withReadme} out of ${analysis.drivers.count} drivers have README files.`
    });
  }
  
  // Script recommendations
  if (analysis.scripts.count === 0) {
    recommendations.push({
      id: 'add-scripts',
      priority: 'high',
      title: 'Add automation scripts',
      description: 'No automation scripts found. Consider adding scripts for common tasks.'
    });
  }
  
  // Workflow recommendations
  if (analysis.workflows.count === 0) {
    recommendations.push({
      id: 'add-ci-cd',
      priority: 'high',
      title: 'Set up CI/CD pipeline',
      description: 'No GitHub Actions workflows found. Consider setting up CI/CD.'
    });
  }
  
  // Documentation recommendations
  if (!analysis.documentation.hasReadme) {
    recommendations.push({
      id: 'add-readme',
      priority: 'high',
      title: 'Add a README.md file',
      description: 'Project is missing a README.md file. This is essential for onboarding and documentation.'
    });
  }
  
  // Dependencies recommendations
  if (analysis.dependencies.dependencies.count === 0 && analysis.dependencies.devDependencies.count === 0) {
    recommendations.push({
      id: 'check-dependencies',
      priority: 'medium',
      title: 'Review project dependencies',
      description: 'No dependencies found in package.json. This might indicate a missing or incomplete setup.'
    });
  }
  
  return recommendations;
}

// Run analysis
analyzeProject().catch(console.error);
