#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

class ComprehensiveProjectReviewer {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.reviewResults = {
      structure: {},
      quality: {},
      documentation: {},
      github: {},
      issues: [],
      recommendations: []
    };
  }

  async reviewEntireProject() {
    console.log('🔍 Comprehensive Project Review - Analyzing Everything...\n');
    
    await this.reviewProjectStructure();
    await this.reviewDocumentation();
    await this.reviewGitHubSetup();
    await this.reviewDriverQuality();
    await this.reviewTuyaLightSupport();
    await this.generateReviewReport();
    
    console.log('\n✅ Complete project review finished!');
  }

  async reviewProjectStructure() {
    console.log('📁 Reviewing project structure...');
    
    const requiredFiles = [
      'package.json',
      'app.json', 
      'README.md',
      'CHANGELOG.md',
      'LICENSE',
      '.gitignore',
      '.github/workflows/main.yml'
    ];

    const requiredDirs = [
      'drivers',
      'scripts', 
      'matrices',
      'resources',
      'docs',
      '.github'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.projectRoot, file);
      try {
        await fs.access(filePath);
        this.reviewResults.structure[file] = 'exists';
      } catch (e) {
        this.reviewResults.structure[file] = 'missing';
        this.reviewResults.issues.push(`Missing required file: ${file}`);
      }
    }

    for (const dir of requiredDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      try {
        await fs.access(dirPath);
        this.reviewResults.structure[dir] = 'exists';
      } catch (e) {
        this.reviewResults.structure[dir] = 'missing';
        this.reviewResults.issues.push(`Missing required directory: ${dir}`);
      }
    }

    console.log('✅ Project structure reviewed');
  }

  async reviewDocumentation() {
    console.log('📚 Reviewing documentation...');
    
    const docFiles = ['README.md', 'CHANGELOG.md', 'docs/'];
    
    // Check README.md
    try {
      const readmePath = path.join(this.projectRoot, 'README.md');
      const readme = await fs.readFile(readmePath, 'utf8');
      
      this.reviewResults.documentation.readme = {
        exists: true,
        hasDescription: readme.includes('# ') || readme.includes('## '),
        hasInstallation: readme.toLowerCase().includes('install'),
        hasUsage: readme.toLowerCase().includes('usage') || readme.toLowerCase().includes('how to'),
        hasBadges: readme.includes('!['),
        hasContributing: readme.toLowerCase().includes('contribut'),
        length: readme.length
      };

      if (readme.length < 1000) {
        this.reviewResults.issues.push('README.md is too short - needs more detailed documentation');
      }

    } catch (e) {
      this.reviewResults.documentation.readme = { exists: false };
      this.reviewResults.issues.push('README.md not found or unreadable');
    }

    // Check docs directory
    try {
      const docsPath = path.join(this.projectRoot, 'docs');
      const docs = await fs.readdir(docsPath);
      this.reviewResults.documentation.docs = {
        exists: true,
        count: docs.length,
        files: docs
      };
    } catch (e) {
      this.reviewResults.documentation.docs = { exists: false };
      this.reviewResults.recommendations.push('Create comprehensive docs/ directory');
    }

    console.log('✅ Documentation reviewed');
  }

  async reviewGitHubSetup() {
    console.log('🐙 Reviewing GitHub configuration...');
    
    // Check .github directory
    try {
      const githubPath = path.join(this.projectRoot, '.github');
      const githubItems = await fs.readdir(githubPath, { withFileTypes: true });
      
      this.reviewResults.github = {
        exists: true,
        workflows: githubItems.filter(item => item.isDirectory() && item.name === 'workflows').length > 0,
        issueTemplates: githubItems.filter(item => item.isDirectory() && item.name === 'ISSUE_TEMPLATE').length > 0,
        items: githubItems.map(item => item.name)
      };

      // Check workflows
      if (this.reviewResults.github.workflows) {
        const workflowsPath = path.join(githubPath, 'workflows');
        const workflows = await fs.readdir(workflowsPath);
        this.reviewResults.github.workflowFiles = workflows;
        
        if (workflows.length === 0) {
          this.reviewResults.issues.push('No GitHub Actions workflows found');
        }
      }

    } catch (e) {
      this.reviewResults.github = { exists: false };
      this.reviewResults.issues.push('.github directory missing - GitHub integration incomplete');
    }

    console.log('✅ GitHub configuration reviewed');
  }

  async reviewDriverQuality() {
    console.log('🚗 Reviewing driver quality...');
    
    const driversPath = path.join(this.projectRoot, 'drivers');
    
    try {
      const drivers = await fs.readdir(driversPath);
      let driverCount = 0;
      let completeDrivers = 0;
      let tuyaLightDrivers = 0;

      for (const driver of drivers) {
        if (driver.startsWith('_')) continue;
        
        const driverPath = path.join(driversPath, driver);
        const stat = await fs.stat(driverPath);
        if (!stat.isDirectory()) continue;
        
        driverCount++;
        
        const hasDriverJs = await this.fileExists(path.join(driverPath, 'driver.js'));
        const hasCompose = await this.fileExists(path.join(driverPath, 'driver.compose.json'));
        const hasImages = await this.fileExists(path.join(driverPath, 'assets', 'images', 'large.png'));
        
        if (hasDriverJs && hasCompose && hasImages) {
          completeDrivers++;
        }
        
        if (driver.toLowerCase().includes('light') || driver.toLowerCase().includes('bulb')) {
          tuyaLightDrivers++;
        }
      }

      this.reviewResults.quality.drivers = {
        total: driverCount,
        complete: completeDrivers,
        tuyaLights: tuyaLightDrivers,
        completionRate: Math.round((completeDrivers / driverCount) * 100)
      };

      if (tuyaLightDrivers < 3) {
        this.reviewResults.issues.push('Insufficient Tuya Light driver support - need more light devices');
      }

    } catch (e) {
      this.reviewResults.quality.drivers = { error: e.message };
      this.reviewResults.issues.push('Cannot analyze driver quality: ' + e.message);
    }

    console.log('✅ Driver quality reviewed');
  }

  async reviewTuyaLightSupport() {
    console.log('💡 Reviewing Tuya Light support...');
    
    const lightModels = [
      'TS0505B', // RGB+CCT bulb
      'TS0505A', // RGB+CCT bulb alternative
      'TS0502A', // CCT bulb
      'TS0501A', // Dimmable bulb
      'TS0502B', // CCT bulb v2
      'TS011F_plug_1' // Smart plug with lights
    ];

    let supportedLights = 0;
    const unsupportedLights = [];

    for (const model of lightModels) {
      const found = await this.findDriverForModel(model);
      if (found) {
        supportedLights++;
      } else {
        unsupportedLights.push(model);
      }
    }

    this.reviewResults.quality.tuyaLights = {
      modelsChecked: lightModels.length,
      supported: supportedLights,
      unsupported: unsupportedLights,
      supportRate: Math.round((supportedLights / lightModels.length) * 100)
    };

    if (supportedLights < lightModels.length) {
      this.reviewResults.recommendations.push(`Add drivers for unsupported Tuya lights: ${unsupportedLights.join(', ')}`);
    }

    console.log('✅ Tuya Light support reviewed');
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (e) {
      return false;
    }
  }

  async findDriverForModel(model) {
    const driversPath = path.join(this.projectRoot, 'drivers');
    
    try {
      const drivers = await fs.readdir(driversPath);
      
      for (const driver of drivers) {
        if (driver.toLowerCase().includes(model.toLowerCase()) || 
            driver.includes(model)) {
          return driver;
        }
        
        // Check in compose files
        const composePath = path.join(driversPath, driver, 'driver.compose.json');
        try {
          const compose = await fs.readFile(composePath, 'utf8');
          if (compose.includes(model)) {
            return driver;
          }
        } catch (e) {
          // Continue checking
        }
      }
    } catch (e) {
      // Directory doesn't exist
    }
    
    return null;
  }

  async generateReviewReport() {
    console.log('📊 Generating comprehensive review report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      projectHealth: this.calculateProjectHealth(),
      structure: this.reviewResults.structure,
      documentation: this.reviewResults.documentation,
      github: this.reviewResults.github,
      quality: this.reviewResults.quality,
      issues: this.reviewResults.issues,
      recommendations: this.reviewResults.recommendations,
      nextSteps: this.generateNextSteps()
    };

    const reportPath = path.join(this.projectRoot, 'analysis-results', 'comprehensive-review-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📋 Project Review Summary:');
    console.log(`🏥 Project Health: ${report.projectHealth}%`);
    console.log(`🚗 Drivers: ${this.reviewResults.quality.drivers?.total || 0} total, ${this.reviewResults.quality.drivers?.completionRate || 0}% complete`);
    console.log(`💡 Tuya Lights: ${this.reviewResults.quality.tuyaLights?.supportRate || 0}% supported`);
    console.log(`❌ Issues: ${this.reviewResults.issues.length}`);
    console.log(`💡 Recommendations: ${this.reviewResults.recommendations.length}`);
    console.log(`📁 Report saved to: analysis-results/comprehensive-review-report.json`);

    return report;
  }

  calculateProjectHealth() {
    let score = 0;
    let maxScore = 0;

    // Structure score (30%)
    const structureItems = Object.values(this.reviewResults.structure);
    const structureScore = structureItems.filter(s => s === 'exists').length / structureItems.length;
    score += structureScore * 30;
    maxScore += 30;

    // Documentation score (25%)
    const docScore = this.reviewResults.documentation.readme?.exists ? 25 : 0;
    score += docScore;
    maxScore += 25;

    // GitHub score (20%)
    const githubScore = this.reviewResults.github?.exists ? 20 : 0;
    score += githubScore;
    maxScore += 20;

    // Driver quality score (25%)
    const driverScore = (this.reviewResults.quality.drivers?.completionRate || 0) * 0.25;
    score += driverScore;
    maxScore += 25;

    return Math.round((score / maxScore) * 100);
  }

  generateNextSteps() {
    const steps = [];
    
    if (this.reviewResults.issues.length > 0) {
      steps.push('Fix identified issues');
    }
    
    if (!this.reviewResults.documentation.readme?.exists) {
      steps.push('Create comprehensive README.md');
    }
    
    if (!this.reviewResults.github?.workflows) {
      steps.push('Setup GitHub Actions workflows');
    }
    
    if ((this.reviewResults.quality.tuyaLights?.supportRate || 0) < 100) {
      steps.push('Add missing Tuya Light drivers');
    }
    
    steps.push('Create GitHub Pages dashboard');
    steps.push('Optimize project for publication');
    
    return steps;
  }
}

// Main execution
async function main() {
  const reviewer = new ComprehensiveProjectReviewer();
  await reviewer.reviewEntireProject();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ComprehensiveProjectReviewer };
