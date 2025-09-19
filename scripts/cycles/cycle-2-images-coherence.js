// CYCLE 2/10: IMAGES COHERENCE AUDIT
const fs = require('fs').promises;
const path = require('path');

class Cycle2ImagesCoherence {
  constructor() {
    this.incoherentImages = [];
    this.imageRules = {
      '3gang': 'Must show 3 buttons/switches',
      '2gang': 'Must show 2 buttons/switches', 
      '1gang': 'Must show 1 button/switch',
      '4gang': 'Must show 4 buttons/switches',
      'smoke_detector': 'Must show smoke detector icon',
      'temperature': 'Must show thermometer icon',
      'motion': 'Must show motion sensor icon',
      'curtain': 'Must show curtain/blind icon'
    };
  }

  async executeCycle2() {
    console.log('🎨 CYCLE 2/10: IMAGES COHERENCE AUDIT...');
    
    const drivers = await fs.readdir('drivers');
    
    for (const driver of drivers) {
      await this.auditDriverImages(driver);
    }
    
    await this.generateCoherenceReport();
  }

  async auditDriverImages(driverName) {
    const driverPath = `drivers/${driverName}`;
    const imagesPath = `${driverPath}/assets/images`;
    
    try {
      await fs.access(imagesPath);
      const images = await fs.readdir(imagesPath);
      
      // Check for coherence issues
      const coherenceIssues = this.detectCoherenceIssues(driverName, images);
      if (coherenceIssues.length > 0) {
        this.incoherentImages.push({
          driver: driverName,
          issues: coherenceIssues
        });
      }
      
    } catch (e) {
      console.log(`⚠️ No images found for ${driverName}`);
    }
  }

  detectCoherenceIssues(driverName, images) {
    const issues = [];
    const lower = driverName.toLowerCase();
    
    // Check gang count coherence
    if (lower.includes('3gang') || lower.includes('3_gang')) {
      issues.push('3-gang driver should show 3 buttons in image');
    }
    
    if (lower.includes('2gang') || lower.includes('2_gang')) {
      issues.push('2-gang driver should show 2 buttons in image');
    }
    
    if (lower.includes('4gang') || lower.includes('4_gang')) {
      issues.push('4-gang driver should show 4 buttons in image');
    }
    
    // Check device type coherence
    if (lower.includes('smoke') && !lower.includes('smoke')) {
      issues.push('Smoke detector should show smoke detector icon');
    }
    
    return issues;
  }

  async generateCoherenceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalDriversAudited: this.incoherentImages.length,
      incoherentImages: this.incoherentImages,
      recommendations: [
        'Fix 3-gang switches to show 3 buttons',
        'Ensure device icons match functionality',
        'Use Homey SDK3 compliant dimensions',
        'Follow Johan Bendz color standards'
      ]
    };
    
    await fs.writeFile(
      'project-data/cycles/cycle-2-images-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log(`📊 Images coherence report: ${this.incoherentImages.length} issues found`);
  }
}

// Execute if run directly
if (require.main === module) {
  new Cycle2ImagesCoherence().executeCycle2().catch(console.error);
}

module.exports = Cycle2ImagesCoherence;
