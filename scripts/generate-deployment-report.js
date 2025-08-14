#!/usr/bin/env node

/**
 * 📋 Generate Deployment Report - Universal Tuya Zigbee
 * Generates comprehensive deployment reports for GitHub Pages
 */

const fs = require('fs');
const path = require('path');

class DeploymentReportGenerator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.reportsPath = path.join(this.projectRoot, 'reports');
    this.dashboardPath = path.join(this.projectRoot, 'docs', 'pages');
    this.deploymentData = {
      timestamp: new Date().toISOString(),
      version: '3.4.0',
      environment: 'production',
      deployment: {
        status: 'pending',
        dashboard: { status: 'pending', details: {} },
        assets: { status: 'pending', details: {} },
        validation: { status: 'pending', details: {} }
      },
      summary: {
        total: 0,
        success: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  /**
   * Main report generation
   */
  async generateReport() {
    console.log('📋 Generating Deployment Report...\n');
    
    try {
      // Ensure reports directory exists
      if (!fs.existsSync(this.reportsPath)) {
        fs.mkdirSync(this.reportsPath, { recursive: true });
      }

      // Check deployment status
      await this.checkDeploymentStatus();
      
      // Generate summary
      this.generateSummary();
      
      // Save report
      await this.saveReport();
      
      // Display results
      this.displayResults();
      
      return true;
      
    } catch (error) {
      console.error('❌ Deployment report generation failed:', error);
      return false;
    }
  }

  /**
   * Check deployment status
   */
  async checkDeploymentStatus() {
    console.log('🔍 Checking Deployment Status...');
    
    // Check dashboard status
    await this.checkDashboardStatus();
    
    // Check assets status
    await this.checkAssetsStatus();
    
    // Check validation status
    await this.checkValidationStatus();
  }

  /**
   * Check dashboard status
   */
  async checkDashboardStatus() {
    console.log('  🏠 Checking dashboard...');
    
    try {
      let score = 0;
      const details = {};

      // Check if dashboard directory exists
      if (fs.existsSync(this.dashboardPath)) {
        score += 25;
        details.directory = 'present';
        
        // Check main dashboard file
        const mainDashboard = path.join(this.dashboardPath, 'index.html');
        if (fs.existsSync(mainDashboard)) {
          score += 25;
          details.mainPage = 'present';
        }
        
        // Check catalog page
        const catalogPage = path.join(this.dashboardPath, 'catalog.html');
        if (fs.existsSync(catalogPage)) {
          score += 25;
          details.catalogPage = 'present';
        }
        
        // Check statistics page
        const statsPage = path.join(this.dashboardPath, 'statistics.html');
        if (fs.existsSync(statsPage)) {
          score += 25;
          details.statsPage = 'present';
        }
      }

      this.deploymentData.deployment.dashboard = {
        status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
        score: score,
        details: details
      };

      console.log(`    ✅ Dashboard: ${score}/100`);
      
    } catch (error) {
      this.deploymentData.deployment.dashboard = {
        status: 'failed',
        score: 0,
        details: { error: error.message }
      };
      console.log('    ❌ Dashboard: Failed');
    }
  }

  /**
   * Check assets status
   */
  async checkAssetsStatus() {
    console.log('  🎨 Checking assets...');
    
    try {
      let score = 0;
      const details = {};

      // Check CSS directory
      const cssDir = path.join(this.dashboardPath, 'css');
      if (fs.existsSync(cssDir)) {
        score += 25;
        details.cssDirectory = 'present';
        
        // Check CSS file
        const cssFile = path.join(cssDir, 'dashboard.css');
        if (fs.existsSync(cssFile)) {
          score += 25;
          details.cssFile = 'present';
        }
      }
      
      // Check JavaScript directory
      const jsDir = path.join(this.dashboardPath, 'js');
      if (fs.existsSync(jsDir)) {
        score += 25;
        details.jsDirectory = 'present';
        
        // Check JavaScript file
        const jsFile = path.join(jsDir, 'dashboard.js');
        if (fs.existsSync(jsFile)) {
          score += 25;
          details.jsFile = 'present';
        }
      }

      this.deploymentData.deployment.assets = {
        status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
        score: score,
        details: details
      };

      console.log(`    ✅ Assets: ${score}/100`);
      
    } catch (error) {
      this.deploymentData.deployment.assets = {
        status: 'failed',
        score: 0,
        details: { error: error.message }
      };
      console.log('    ❌ Assets: Failed');
    }
  }

  /**
   * Check validation status
   */
  async checkValidationStatus() {
    console.log('  🔍 Checking validation...');
    
    try {
      let score = 0;
      const details = {};

      // Check if validation reports exist
      const reportsDir = path.join(this.projectRoot, 'reports');
      if (fs.existsSync(reportsDir)) {
        score += 25;
        details.reportsDirectory = 'present';
        
        // Check for recent reports
        const files = fs.readdirSync(reportsDir);
        const recentReports = files.filter(file => 
          file.includes('quality-report-') || 
          file.includes('test-report-') ||
          file.includes('validation-report-')
        );
        
        if (recentReports.length > 0) {
          score += 25;
          details.recentReports = recentReports.length;
        }
      }
      
      // Check if GitHub Actions workflows exist
      const workflowsDir = path.join(this.projectRoot, '.github', 'workflows');
      if (fs.existsSync(workflowsDir)) {
        score += 25;
        details.workflowsDirectory = 'present';
        
        // Check for key workflows
        const workflowFiles = fs.readdirSync(workflowsDir);
        const keyWorkflows = ['validate.yml', 'pages.yml'];
        const presentWorkflows = keyWorkflows.filter(wf => workflowFiles.includes(wf));
        
        if (presentWorkflows.length === keyWorkflows.length) {
          score += 25;
          details.keyWorkflows = 'complete';
        }
      }

      this.deploymentData.deployment.validation = {
        status: score >= 80 ? 'passed' : score >= 60 ? 'warning' : 'failed',
        score: score,
        details: details
      };

      console.log(`    ✅ Validation: ${score}/100`);
      
    } catch (error) {
      this.deploymentData.deployment.validation = {
        status: 'failed',
        score: 0,
        details: { error: error.message }
      };
      console.log('    ❌ Validation: Failed');
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    console.log('\n📊 Generating Summary...');
    
    let total = 0;
    let success = 0;
    let failed = 0;
    let warnings = 0;

    for (const deployment of Object.values(this.deploymentData.deployment)) {
      total++;
      switch (deployment.status) {
        case 'passed':
          success++;
          break;
        case 'failed':
          failed++;
          break;
        case 'warning':
          warnings++;
          break;
      }
    }

    this.deploymentData.summary = { total, success, failed, warnings };
    
    // Calculate overall deployment status
    if (failed === 0 && warnings === 0) {
      this.deploymentData.deployment.status = 'ready';
    } else if (failed === 0) {
      this.deploymentData.deployment.status = 'warning';
    } else {
      this.deploymentData.deployment.status = 'failed';
    }

    console.log('  ✅ Summary generated');
  }

  /**
   * Save report to file
   */
  async saveReport() {
    console.log('\n💾 Saving Report...');
    
    try {
      const reportPath = path.join(this.reportsPath, `deployment-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(this.deploymentData, null, 2));
      
      // Also save latest report
      const latestPath = path.join(this.reportsPath, 'deployment-report-latest.json');
      fs.writeFileSync(latestPath, JSON.stringify(this.deploymentData, null, 2));
      
      console.log(`  ✅ Report saved: ${reportPath}`);
      console.log(`  ✅ Latest report: ${latestPath}`);
      
    } catch (error) {
      throw new Error(`Failed to save deployment report: ${error.message}`);
    }
  }

  /**
   * Display results
   */
  displayResults() {
    console.log('\n📋 DEPLOYMENT REPORT SUMMARY');
    console.log('==============================');
    console.log(`🎯 Overall Status: ${this.deploymentData.deployment.status.toUpperCase()}`);
    console.log(`📅 Generated: ${new Date(this.deploymentData.timestamp).toLocaleString()}`);
    console.log(`🏷️  Version: ${this.deploymentData.version}`);
    console.log(`🌍 Environment: ${this.deploymentData.environment}`);
    console.log('');
    
    for (const [deploymentName, deployment] of Object.entries(this.deploymentData.deployment)) {
      if (deploymentName !== 'status') {
        const statusIcon = deployment.status === 'passed' ? '✅' : deployment.status === 'warning' ? '⚠️' : '❌';
        console.log(`${statusIcon} ${deploymentName.toUpperCase()}: ${deployment.score}/100 (${deployment.status})`);
      }
    }

    console.log('');
    console.log(`📊 Summary: ${this.deploymentData.summary.success}/${this.deploymentData.summary.total} successful`);
    
    if (this.deploymentData.summary.warnings > 0) {
      console.log(`⚠️  Warnings: ${this.deploymentData.summary.warnings}`);
    }
    
    if (this.deploymentData.summary.failed > 0) {
      console.log(`❌ Failed: ${this.deploymentData.summary.failed}`);
    }

    console.log('');
    if (this.deploymentData.deployment.status === 'ready') {
      console.log('🎉 Deployment is ready! All systems are operational.');
      console.log('🚀 Ready to deploy to GitHub Pages.');
    } else if (this.deploymentData.deployment.status === 'warning') {
      console.log('⚠️  Deployment has warnings. Review the details above.');
      console.log('🚀 Can proceed with deployment but review warnings first.');
    } else {
      console.log('❌ Deployment has failures. Fix the issues before proceeding.');
      console.log('🔧 Cannot deploy until all issues are resolved.');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new DeploymentReportGenerator();
  generator.generateReport()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = DeploymentReportGenerator;
