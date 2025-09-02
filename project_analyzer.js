const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectAnalyzer {
  constructor() {
    this.rootDir = __dirname;
    this.report = {
      timestamp: new Date().toISOString(),
      environment: {},
      project: {},
      drivers: {},
      issues: [],
      recommendations: []
    };
  }

  // Check if a file or directory exists
  exists(path) {
    try {
      return fs.existsSync(path);
    } catch (error) {
      return false;
    }
  }

  // Get list of directories in a path
  getDirectories(path) {
    try {
      return fs.readdirSync(path, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    } catch (error) {
      return [];
    }
  }

  // Get list of files in a directory with specific extension
  getFiles(dir, ext = '') {
    try {
      return fs.readdirSync(dir)
        .filter(file => file.endsWith(ext));
    } catch (error) {
      return [];
    }
  }

  // Check environment
  checkEnvironment() {
    try {
      // Node.js and npm versions
      this.report.environment.nodeVersion = process.version;
      this.report.environment.npmVersion = execSync('npm --version').toString().trim();
      
      // OS information
      this.report.environment.platform = process.platform;
      this.report.environment.arch = process.arch;
      
      // Git information
      try {
        this.report.environment.gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
        this.report.environment.gitCommit = execSync('git rev-parse HEAD').toString().trim();
      } catch (e) {
        this.report.issues.push('Git repository not initialized or not a git repository');
      }
      
    } catch (error) {
      this.report.issues.push(`Error checking environment: ${error.message}`);
    }
  }

  // Analyze project structure
  analyzeProject() {
    try {
      // Check for required directories
      const requiredDirs = ['drivers', 'scripts', '.github/workflows'];
      this.report.project.missingDirs = [];
      
      requiredDirs.forEach(dir => {
        const fullPath = path.join(this.rootDir, dir);
        if (!this.exists(fullPath)) {
          this.report.project.missingDirs.push(dir);
        }
      });
      
      // Check for required files
      const requiredFiles = ['package.json', 'app.json', 'README.md'];
      this.report.project.missingFiles = [];
      
      requiredFiles.forEach(file => {
        if (!this.exists(path.join(this.rootDir, file))) {
          this.report.project.missingFiles.push(file);
        }
      });
      
      // Check package.json
      if (this.exists(path.join(this.rootDir, 'package.json'))) {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf8'));
          this.report.project.name = pkg.name || 'unknown';
          this.report.project.version = pkg.version || '0.0.0';
          this.report.project.scripts = Object.keys(pkg.scripts || {});
          
          // Check for required dependencies
          const requiredDeps = ['homey', 'homey-meshdriver'];
          this.report.project.missingDeps = requiredDeps.filter(
            dep => !((pkg.dependencies && pkg.dependencies[dep]) || (pkg.devDependencies && pkg.devDependencies[dep]))
          );
          
        } catch (e) {
          this.report.issues.push(`Error parsing package.json: ${e.message}`);
        }
      }
      
    } catch (error) {
      this.report.issues.push(`Error analyzing project: ${error.message}`);
    }
  }

  // Analyze drivers
  analyzeDrivers() {
    try {
      const driversDir = path.join(this.rootDir, 'drivers');
      
      if (!this.exists(driversDir)) {
        this.report.issues.push('Drivers directory not found');
        return;
      }
      
      const driverDirs = this.getDirectories(driversDir);
      this.report.drivers = {
        total: driverDirs.length,
        complete: 0,
        byType: {},
        missingFiles: {
          'device.js': 0,
          'driver.js': 0,
          'driver.compose.json': 0,
          'README.md': 0
        },
        drivers: {}
      };
      
      driverDirs.forEach(dir => {
        const driverPath = path.join(driversDir, dir);
        const files = this.getFiles(driverPath);
        const driverType = dir.split('-')[0] || 'unknown';
        
        // Count by type
        if (!this.report.drivers.byType[driverType]) {
          this.report.drivers.byType[driverType] = 0;
        }
        this.report.drivers.byType[driverType]++;
        
        // Check for required files
        const driverInfo = {
          path: dir,
          files: {},
          missingFiles: []
        };
        
        ['device.js', 'driver.js', 'driver.compose.json', 'README.md'].forEach(file => {
          const hasFile = files.includes(file);
          driverInfo.files[file] = hasFile;
          
          if (!hasFile) {
            this.report.drivers.missingFiles[file]++;
            driverInfo.missingFiles.push(file);
          }
        });
        
        // Check if driver is complete
        if (driverInfo.missingFiles.length === 0) {
          this.report.drivers.complete++;
        }
        
        this.report.drivers.drivers[dir] = driverInfo;
      });
      
      // Calculate completion percentage
      this.report.drivers.completionRate = 
        Math.round((this.report.drivers.complete / this.report.drivers.total) * 100) || 0;
      
    } catch (error) {
      this.report.issues.push(`Error analyzing drivers: ${error.message}`);
    }
  }

  // Generate recommendations
  generateRecommendations() {
    // Project structure recommendations
    if (this.report.project.missingDirs && this.report.project.missingDirs.length > 0) {
      this.report.recommendations.push({
        priority: 'high',
        message: 'Missing required directories',
        action: `Create missing directories: ${this.report.project.missingDirs.join(', ')}`
      });
    }
    
    if (this.report.project.missingFiles && this.report.project.missingFiles.length > 0) {
      this.report.recommendations.push({
        priority: 'high',
        message: 'Missing required files',
        action: `Create missing files: ${this.report.project.missingFiles.join(', ')}`
      });
    }
    
    if (this.report.project.missingDeps && this.report.project.missingDeps.length > 0) {
      this.report.recommendations.push({
        priority: 'high',
        message: 'Missing required dependencies',
        action: `Install missing dependencies: ${this.report.project.missingDeps.join(', ')}`
      });
    }
    
    // Driver recommendations
    if (this.report.drivers && this.report.drivers.completionRate < 100) {
      this.report.recommendations.push({
        priority: 'high',
        message: `Only ${this.report.drivers.completionRate}% of drivers are complete`,
        action: 'Complete missing driver files (device.js, driver.js, driver.compose.json, README.md)'
      });
      
      Object.entries(this.report.drivers.missingFiles).forEach(([file, count]) => {
        if (count > 0) {
          this.report.recommendations.push({
            priority: 'medium',
            message: `${count} drivers are missing ${file}`,
            action: `Add missing ${file} to incomplete drivers`
          });
        }
      });
    }
    
    // Sort recommendations by priority
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    this.report.recommendations.sort((a, b) => 
      (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
    );
  }

  // Generate reports
  generateReports() {
    try {
      const reportsDir = path.join(this.rootDir, 'analysis-results');
      
      // Create reports directory if it doesn't exist
      if (!this.exists(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Save JSON report
      const jsonReportPath = path.join(reportsDir, 'project-analysis.json');
      fs.writeFileSync(jsonReportPath, JSON.stringify(this.report, null, 2));
      
      // Generate markdown report
      this.generateMarkdownReport(reportsDir);
      
      console.log(`\n=== Analysis Complete ===`);
      console.log(`- JSON Report: ${jsonReportPath}`);
      console.log(`- Markdown Report: ${path.join(reportsDir, 'project-analysis.md')}`);
      
      // Print summary
      this.printSummary();
      
    } catch (error) {
      console.error('Error generating reports:', error);
    }
  }
  
  // Generate markdown report
  generateMarkdownReport(reportsDir) {
    try {
      let markdown = `# Project Analysis Report\n`;
      markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
      
      // Environment
      markdown += `## Environment\n`;
      markdown += `- **Node.js:** ${this.report.environment.nodeVersion || 'N/A'}\n`;
      markdown += `- **npm:** ${this.report.environment.npmVersion || 'N/A'}\n`;
      markdown += `- **Platform:** ${this.report.environment.platform || 'N/A'}\n`;
      markdown += `- **Architecture:** ${this.report.environment.arch || 'N/A'}\n`;
      
      if (this.report.environment.gitBranch) {
        markdown += `- **Git Branch:** ${this.report.environment.gitBranch}\n`;
        markdown += `- **Git Commit:** ${(this.report.environment.gitCommit || '').substring(0, 7) || 'N/A'}\n`;
      }
      
      // Project
      markdown += `\n## Project\n`;
      markdown += `- **Name:** ${this.report.project.name || 'N/A'}\n`;
      markdown += `- **Version:** ${this.report.project.version || 'N/A'}\n`;
      
      // Drivers
      if (this.report.drivers) {
        markdown += `\n## Drivers (${this.report.drivers.total || 0} total)\n`;
        markdown += `- **Complete:** ${this.report.drivers.complete || 0} (${this.report.drivers.completionRate || 0}%)\n`;
        
        // Missing files
        if (Object.values(this.report.drivers.missingFiles).some(count => count > 0)) {
          markdown += '\n### Missing Files\n';
          Object.entries(this.report.drivers.missingFiles).forEach(([file, count]) => {
            if (count > 0) {
              markdown += `- ${file}: ${count} missing\n`;
            }
          });
        }
        
        // Driver types
        if (Object.keys(this.report.drivers.byType).length > 0) {
          markdown += '\n### Driver Types\n';
          Object.entries(this.report.drivers.byType)
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, count]) => {
              markdown += `- ${type}: ${count}\n`;
            });
        }
      }
      
      // Issues
      if (this.report.issues && this.report.issues.length > 0) {
        markdown += '\n## Issues\n';
        this.report.issues.forEach(issue => {
          markdown += `- ❌ ${issue}\n`;
        });
      }
      
      // Recommendations
      if (this.report.recommendations && this.report.recommendations.length > 0) {
        markdown += '\n## Recommendations\n';
        this.report.recommendations.forEach(rec => {
          const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟠' : '🟢';
          markdown += `\n### ${priorityIcon} ${rec.message}\n${rec.action}\n`;
        });
      }
      
      // Save markdown report
      fs.writeFileSync(path.join(reportsDir, 'project-analysis.md'), markdown);
      
    } catch (error) {
      console.error('Error generating markdown report:', error);
    }
  }
  
  // Print summary to console
  printSummary() {
    console.log('\n=== Project Summary ===');
    console.log(`Name: ${this.report.project.name || 'N/A'}`);
    console.log(`Version: ${this.report.project.version || 'N/A'}`);
    
    if (this.report.drivers) {
      console.log(`\n=== Drivers ===`);
      console.log(`Total: ${this.report.drivers.total}`);
      console.log(`Complete: ${this.report.drivers.complete} (${this.report.drivers.completionRate}%)`);
      
      // Show top 3 driver types
      const topTypes = Object.entries(this.report.drivers.byType || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      if (topTypes.length > 0) {
        console.log('\nTop Driver Types:');
        topTypes.forEach(([type, count]) => {
          console.log(`- ${type}: ${count}`);
        });
      }
    }
    
    // Show issues count
    if (this.report.issues && this.report.issues.length > 0) {
      console.log(`\n=== Issues ===`);
      console.log(`Found ${this.report.issues.length} issues that need attention`);
    }
    
    // Show top recommendations
    if (this.report.recommendations && this.report.recommendations.length > 0) {
      console.log('\n=== Top Recommendations ===');
      this.report.recommendations
        .slice(0, 3)
        .forEach((rec, i) => {
          console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        });
      
      if (this.report.recommendations.length > 3) {
        console.log(`... and ${this.report.recommendations.length - 3} more recommendations`);
      }
    }
  }

  // Main analysis method
  analyze() {
    console.log('Starting project analysis...');
    
    try {
      this.checkEnvironment();
      this.analyzeProject();
      this.analyzeDrivers();
      this.generateRecommendations();
      this.generateReports();
      
      console.log('\nAnalysis completed successfully!');
      
    } catch (error) {
      console.error('Error during analysis:', error);
      process.exit(1);
    }
  }
}

// Run the analyzer
const analyzer = new ProjectAnalyzer();
analyzer.analyze();
