/**
 * FORUM INTERVIEWS PROCESSOR
 * 
 * Traite les posts forum pour extraire device info et générer drivers automatiquement
 * Sources: Homey Community Forum posts avec diagnostics/device reports
 */

const fs = require('fs').promises;
const path = require('path');
const AutoDriverGenerator = require('./auto-driver-generator');

class ForumInterviewsProcessor {

  constructor() {
    this.inputPath = path.join(__dirname, '../../data/forum/interviews');
    this.outputPath = path.join(__dirname, '../../data/forum/processed');
    this.processedInterviews = [];
    this.generatedDrivers = [];
  }

  /**
   * Point d'entrée principal
   */
  async process() {
    console.log('🤖 Forum Interviews Processor - Starting...');
    
    try {
      // Créer dossiers
      await fs.mkdir(this.outputPath, { recursive: true });
      
      // 1. Charger interviews
      console.log('📥 Loading forum interviews...');
      const interviews = await this.loadInterviews();
      console.log(`✅ Found ${interviews.length} interviews`);
      
      // 2. Filtrer interviews avec device info
      console.log('🔍 Filtering valid device reports...');
      const validInterviews = this.filterValidInterviews(interviews);
      console.log(`✅ Found ${validInterviews.length} valid device reports`);
      
      // 3. Traiter chaque interview
      for (const interview of validInterviews) {
        console.log(`\n📋 Processing interview #${interview.id}...`);
        await this.processInterview(interview);
      }
      
      // 4. Générer rapport
      const report = await this.generateReport();
      console.log('✅ Report generated');
      
      return {
        success: true,
        processed: this.processedInterviews.length,
        drivers_generated: this.generatedDrivers.length,
        report
      };
      
    } catch (error) {
      console.error('❌ Processing failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Charger interviews depuis fichiers
   */
  async loadInterviews() {
    const interviews = [];
    
    try {
      const files = await fs.readdir(this.inputPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.inputPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const interview = JSON.parse(content);
          interviews.push(interview);
        }
      }
    } catch (error) {
      console.warn('Could not load interviews:', error.message);
    }
    
    return interviews;
  }

  /**
   * Filtrer interviews valides avec device info
   */
  filterValidInterviews(interviews) {
    return interviews.filter(interview => {
      // Doit contenir manufacturer ID ou model ID
      const hasManufacturerId = /"manufacturerName"\s*:\s*"([^"]+)"/i.test(interview.content);
      const hasModelId = /"modelId"\s*:\s*"([^"]+)"/i.test(interview.content);
      const hasClusters = /"inputClusters"\s*:\s*\[/i.test(interview.content);
      
      return (hasManufacturerId || hasModelId) && hasClusters;
    });
  }

  /**
   * Traiter une interview
   */
  async processInterview(interview) {
    try {
      // Préparer input pour generator
      const input = {
        type: 'forum',
        id: interview.id,
        url: interview.url,
        author: interview.author,
        date: interview.date,
        content: interview.content,
        title: interview.title
      };
      
      // Vérifier si driver existe déjà
      const existingDriver = await this.checkExistingDriver(input);
      if (existingDriver) {
        console.log(`⏭️  Driver already exists: ${existingDriver}`);
        this.processedInterviews.push({
          interview: interview.id,
          status: 'skipped',
          reason: 'driver_exists',
          existing_driver: existingDriver
        });
        return;
      }
      
      // Générer driver
      console.log('🔨 Generating driver...');
      const result = await AutoDriverGenerator.generateDriverFromInput(input);
      
      if (result.success) {
        console.log(`✅ Driver generated: ${result.driverPath}`);
        
        this.processedInterviews.push({
          interview: interview.id,
          status: 'success',
          driver_path: result.driverPath,
          device_info: result.deviceInfo
        });
        
        this.generatedDrivers.push({
          source: 'forum',
          interview_id: interview.id,
          interview_url: interview.url,
          author: interview.author,
          driver_path: result.driverPath,
          manufacturer_id: result.deviceInfo.manufacturerId,
          model_id: result.deviceInfo.modelId
        });
        
        // Sauvegarder metadata
        await this.saveDriverMetadata(result, interview);
        
      } else {
        console.log(`❌ Driver generation failed: ${result.error}`);
        
        this.processedInterviews.push({
          interview: interview.id,
          status: 'failed',
          error: result.error
        });
      }
      
    } catch (error) {
      console.error(`❌ Error processing interview ${interview.id}:`, error.message);
      
      this.processedInterviews.push({
        interview: interview.id,
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * Vérifier si driver existe déjà
   */
  async checkExistingDriver(input) {
    // Extraire manufacturer/model ID
    const mfrMatch = /"manufacturerName"\s*:\s*"([^"]+)"/i.exec(input.content);
    const modelMatch = /"modelId"\s*:\s*"([^"]+)"/i.exec(input.content);
    
    if (!mfrMatch && !modelMatch) return null;
    
    const manufacturerId = mfrMatch ? mfrMatch[1] : null;
    const modelId = modelMatch ? modelMatch[1] : null;
    
    // Chercher dans drivers existants
    const driversPath = path.join(__dirname, '../../drivers');
    
    try {
      const drivers = await fs.readdir(driversPath);
      
      for (const driver of drivers) {
        const composePath = path.join(driversPath, driver, 'driver.compose.json');
        
        try {
          const compose = JSON.parse(await fs.readFile(composePath, 'utf8'));
          
          // Vérifier manufacturer ID
          if (manufacturerId && compose.zigbee && compose.zigbee.manufacturerName) {
            if (compose.zigbee.manufacturerName.includes(manufacturerId)) {
              return driver;
            }
          }
          
          // Vérifier model ID dans nom
          if (modelId && driver.toLowerCase().includes(modelId.toLowerCase())) {
            return driver;
          }
          
        } catch (e) {
          // Driver compose not found, skip
        }
      }
    } catch (error) {
      console.warn('Could not check existing drivers:', error.message);
    }
    
    return null;
  }

  /**
   * Sauvegarder metadata driver
   */
  async saveDriverMetadata(result, interview) {
    const metadataPath = path.join(
      result.driverPath,
      'METADATA.json'
    );
    
    const metadata = {
      generated_from: 'forum_interview',
      interview_id: interview.id,
      interview_url: interview.url,
      interview_author: interview.author,
      interview_date: interview.date,
      generated_at: new Date().toISOString(),
      manufacturer_id: result.deviceInfo.manufacturerId,
      model_id: result.deviceInfo.modelId,
      device_type: result.deviceInfo.isTuyaDevice ? 'tuya_proprietary' : 'standard_zigbee',
      clusters: result.deviceInfo.clusters,
      capabilities: result.deviceInfo.capabilities
    };
    
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Générer rapport
   */
  async generateReport() {
    const report = {
      processed_at: new Date().toISOString(),
      total_interviews: this.processedInterviews.length,
      successful: this.processedInterviews.filter(p => p.status === 'success').length,
      failed: this.processedInterviews.filter(p => p.status === 'failed').length,
      skipped: this.processedInterviews.filter(p => p.status === 'skipped').length,
      drivers_generated: this.generatedDrivers.length,
      new_drivers: this.generatedDrivers.map(d => ({
        manufacturer_id: d.manufacturer_id,
        model_id: d.model_id,
        driver_path: d.driver_path,
        source_url: d.interview_url
      })),
      details: this.processedInterviews
    };
    
    // Sauvegarder rapport
    const reportPath = path.join(this.outputPath, 'processing-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Sauvegarder liste drivers générés
    const driversPath = path.join(this.outputPath, 'generated-drivers.json');
    await fs.writeFile(driversPath, JSON.stringify(this.generatedDrivers, null, 2));
    
    return report;
  }

}

// Run if called directly
if (require.main === module) {
  const processor = new ForumInterviewsProcessor();
  processor.process().then(result => {
    console.log('\n📊 Final Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = ForumInterviewsProcessor;
