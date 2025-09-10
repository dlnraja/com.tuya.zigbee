#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

async function analyzeProjectStructure() {
  console.log('🔍 Deep Project Analysis - Understanding Structure and Content...\n');
  
  const analysis = {
    timestamp: new Date().toISOString(),
    structure: {},
    drivers: {},
    scripts: {},
    issues: [],
    recommendations: []
  };
  
  try {
    // 1. Analyze drivers directory structure
    console.log('📁 Analyzing drivers structure...');
    const driversDir = path.join(__dirname, '../drivers');
    const drivers = await fs.readdir(driversDir);
    
    for (const driver of drivers) {
      const driverPath = path.join(driversDir, driver);
      const stat = await fs.stat(driverPath);
      if (!stat.isDirectory()) continue;
      
      const driverAnalysis = {
        name: driver,
        hasDriverJs: false,
        hasComposeJson: false,
        hasImages: false,
        hasDevice: false,
        imageCount: 0,
        capabilities: [],
        zigbeeConfig: null,
        issues: []
      };
      
      // Check for required files
      const files = await fs.readdir(driverPath);
      
      for (const file of files) {
        const filePath = path.join(driverPath, file);
        const fileStat = await fs.stat(filePath);
        
        if (file === 'driver.js') {
          driverAnalysis.hasDriverJs = true;
          // Analyze driver.js content
          try {
            const content = await fs.readFile(filePath, 'utf8');
            if (content.includes('ZigBeeDevice')) {
              driverAnalysis.capabilities.push('zigbee');
            }
            if (content.includes('onoff')) {
              driverAnalysis.capabilities.push('onoff');
            }
            if (content.includes('dim')) {
              driverAnalysis.capabilities.push('dim');
            }
          } catch (e) {
            driverAnalysis.issues.push('Cannot read driver.js');
          }
        }
        
        if (file === 'driver.compose.json') {
          driverAnalysis.hasComposeJson = true;
          // Analyze compose configuration
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const compose = JSON.parse(content);
            if (compose.zigbee) {
              driverAnalysis.zigbeeConfig = compose.zigbee;
            }
            if (compose.capabilities) {
              driverAnalysis.capabilities = [...driverAnalysis.capabilities, ...compose.capabilities];
            }
          } catch (e) {
            driverAnalysis.issues.push('Invalid driver.compose.json');
          }
        }
        
        if (file === 'device.js') {
          driverAnalysis.hasDevice = true;
        }
        
        if (file === 'assets' && fileStat.isDirectory()) {
          const imagesPath = path.join(filePath, 'images');
          try {
            const images = await fs.readdir(imagesPath);
            driverAnalysis.hasImages = true;
            driverAnalysis.imageCount = images.length;
          } catch (e) {
            // No images directory
          }
        }
      }
      
      // Identify issues
      if (!driverAnalysis.hasDriverJs) {
        driverAnalysis.issues.push('Missing driver.js');
      }
      if (!driverAnalysis.hasComposeJson) {
        driverAnalysis.issues.push('Missing driver.compose.json');
      }
      if (!driverAnalysis.hasImages) {
        driverAnalysis.issues.push('Missing images');
      }
      
      analysis.drivers[driver] = driverAnalysis;
    }
    
    // 2. Analyze scripts directory
    console.log('🔧 Analyzing scripts structure...');
    const scriptsDir = path.join(__dirname, '../scripts');
    const scripts = await fs.readdir(scriptsDir);
    
    for (const script of scripts) {
      const scriptPath = path.join(scriptsDir, script);
      const stat = await fs.stat(scriptPath);
      
      if (stat.isFile() && script.endsWith('.js')) {
        const scriptAnalysis = {
          name: script,
          size: stat.size,
          lastModified: stat.mtime,
          hasRequiredDeps: false,
          issues: []
        };
        
        try {
          const content = await fs.readFile(scriptPath, 'utf8');
          
          // Check for common dependency issues
          if (content.includes('require(\'axios\')')) {
            scriptAnalysis.issues.push('Requires axios (may not be installed)');
          }
          if (content.includes('require(\'cheerio\')')) {
            scriptAnalysis.issues.push('Requires cheerio (may not be installed)');
          }
          if (content.includes('require(\'natural\')')) {
            scriptAnalysis.issues.push('Requires natural (may not be installed)');
          }
          
        } catch (e) {
          scriptAnalysis.issues.push('Cannot read script file');
        }
        
        analysis.scripts[script] = scriptAnalysis;
      }
    }
    
    // 3. Check for required project files
    console.log('📋 Checking project files...');
    const requiredFiles = [
      'package.json',
      'app.json',
      'CHANGELOG.md',
      'README.md'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, '..', file);
      try {
        await fs.access(filePath);
        console.log(`✅ ${file} exists`);
      } catch (e) {
        analysis.issues.push(`Missing required file: ${file}`);
      }
    }
    
    // 4. Generate recommendations
    const driverIssues = Object.values(analysis.drivers).reduce((acc, driver) => acc + driver.issues.length, 0);
    const scriptIssues = Object.values(analysis.scripts).reduce((acc, script) => acc + script.issues.length, 0);
    
    if (driverIssues > 0) {
      analysis.recommendations.push(`Fix ${driverIssues} driver issues found`);
    }
    if (scriptIssues > 0) {
      analysis.recommendations.push(`Resolve ${scriptIssues} script dependency issues`);
    }
    
    // 5. Save analysis results
    const analysisPath = path.join(__dirname, '../analysis-results/deep-project-analysis.json');
    await fs.mkdir(path.dirname(analysisPath), { recursive: true });
    await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2));
    
    // 6. Generate summary report
    console.log('\n📊 Project Analysis Summary');
    console.log('='.repeat(50));
    console.log(`Total Drivers: ${Object.keys(analysis.drivers).length}`);
    console.log(`Drivers with Issues: ${Object.values(analysis.drivers).filter(d => d.issues.length > 0).length}`);
    console.log(`Total Scripts: ${Object.keys(analysis.scripts).length}`);
    console.log(`Scripts with Issues: ${Object.values(analysis.scripts).filter(s => s.issues.length > 0).length}`);
    console.log(`Project Issues: ${analysis.issues.length}`);
    
    if (analysis.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      analysis.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
    
    console.log(`\n📄 Full analysis saved to: analysis-results/deep-project-analysis.json`);
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error in project analysis:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  analyzeProjectStructure().catch(console.error);
}

module.exports = { analyzeProjectStructure };
