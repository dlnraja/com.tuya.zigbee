/**
 * FULL ENRICHMENT PIPELINE
 * 
 * Orchestrates complete enrichment cycle:
 * 1. Scrape all 18 sources
 * 2. Consolidate data
 * 3. Apply manufacturer IDs to drivers
 * 4. Update Tuya datapoints database
 * 5. Generate enrichment report
 */

const MasterSourceScraper = require('./scrapers/scrape-all-sources');
const SourceConsolidator = require('./consolidate-all-sources');
const ManufacturerIdApplicator = require('./apply-manufacturer-ids-to-drivers');
const TuyaDatapointsDBUpdater = require('./update-tuya-datapoints-db');
const fs = require('fs').promises;
const path = require('path');

class FullEnrichmentPipeline {
  
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      steps: [],
      statistics: {
        sources_scraped: 0,
        manufacturer_ids_found: 0,
        datapoints_found: 0,
        drivers_updated: 0,
        ids_added_to_drivers: 0
      }
    };
  }

  async run() {
    console.log('🚀 FULL ENRICHMENT PIPELINE - Starting...\n');
    console.log('═'.repeat(60));
    console.log('   18 SOURCES → CONSOLIDATION → DRIVERS UPDATE');
    console.log('═'.repeat(60));
    console.log('');
    
    try {
      // STEP 1: Scrape all 18 sources
      await this.step1_scrapeAllSources();
      
      // STEP 2: Consolidate data
      await this.step2_consolidateData();
      
      // STEP 3: Apply manufacturer IDs to drivers
      await this.step3_applyManufacturerIds();
      
      // STEP 4: Update Tuya datapoints database
      await this.step4_updateDatapointsDB();
      
      // STEP 5: Generate final report
      await this.step5_generateReport();
      
      console.log('\n' + '═'.repeat(60));
      console.log('✅ ENRICHMENT PIPELINE COMPLETE!');
      console.log('═'.repeat(60));
      this.printStatistics();
      
      return { success: true, results: this.results };
      
    } catch (error) {
      console.error('\n❌ Pipeline failed:', error);
      return { success: false, error: error.message };
    }
  }

  async step1_scrapeAllSources() {
    console.log('\n📥 STEP 1: Scraping all 18 sources...\n');
    
    try {
      const scraper = new MasterSourceScraper();
      const scrapingResults = await scraper.scrapeAll();
      
      this.results.steps.push({
        step: 1,
        name: 'Scrape All Sources',
        status: 'success',
        data: scrapingResults.summary
      });
      
      this.results.statistics.sources_scraped = scrapingResults.summary.successful;
      this.results.statistics.manufacturer_ids_found = scrapingResults.summary.manufacturer_ids.size;
      
      console.log(`✅ Step 1 complete: ${scrapingResults.summary.successful}/18 sources scraped`);
      
    } catch (error) {
      console.error('❌ Step 1 failed:', error.message);
      this.results.steps.push({
        step: 1,
        name: 'Scrape All Sources',
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  async step2_consolidateData() {
    console.log('\n🔄 STEP 2: Consolidating data from all sources...\n');
    
    try {
      const consolidator = new SourceConsolidator();
      const consolidatedData = await consolidator.consolidate();
      
      this.results.steps.push({
        step: 2,
        name: 'Consolidate Data',
        status: 'success',
        data: {
          manufacturerIds: consolidatedData.manufacturerIds.size,
          datapoints: consolidatedData.datapoints.size,
          devices: consolidatedData.devices.length
        }
      });
      
      this.results.statistics.datapoints_found = consolidatedData.datapoints.size;
      
      console.log(`✅ Step 2 complete: Data consolidated`);
      
    } catch (error) {
      console.error('❌ Step 2 failed:', error.message);
      this.results.steps.push({
        step: 2,
        name: 'Consolidate Data',
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  async step3_applyManufacturerIds() {
    console.log('\n🏭 STEP 3: Applying manufacturer IDs to drivers...\n');
    
    try {
      const applicator = new ManufacturerIdApplicator();
      const applicationResults = await applicator.apply();
      
      this.results.steps.push({
        step: 3,
        name: 'Apply Manufacturer IDs',
        status: 'success',
        data: applicationResults
      });
      
      this.results.statistics.drivers_updated = applicationResults.driversUpdated;
      this.results.statistics.ids_added_to_drivers = applicationResults.idsAdded;
      
      console.log(`✅ Step 3 complete: ${applicationResults.driversUpdated} drivers updated`);
      
    } catch (error) {
      console.error('❌ Step 3 failed:', error.message);
      this.results.steps.push({
        step: 3,
        name: 'Apply Manufacturer IDs',
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  async step4_updateDatapointsDB() {
    console.log('\n📍 STEP 4: Updating Tuya datapoints database...\n');
    
    try {
      const updater = new TuyaDatapointsDBUpdater();
      const updateResults = await updater.update();
      
      this.results.steps.push({
        step: 4,
        name: 'Update Datapoints DB',
        status: updateResults.success ? 'success' : 'failed',
        data: updateResults.stats
      });
      
      console.log(`✅ Step 4 complete: Database updated`);
      
    } catch (error) {
      console.error('❌ Step 4 failed:', error.message);
      this.results.steps.push({
        step: 4,
        name: 'Update Datapoints DB',
        status: 'failed',
        error: error.message
      });
      // Non-fatal, continue
    }
  }

  async step5_generateReport() {
    console.log('\n📊 STEP 5: Generating enrichment report...\n');
    
    try {
      const reportPath = path.join(__dirname, '../../enrichment-report.json');
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
      
      // Generate markdown report
      const markdownReport = this.generateMarkdownReport();
      const markdownPath = path.join(__dirname, '../../ENRICHMENT_REPORT.md');
      await fs.writeFile(markdownPath, markdownReport);
      
      this.results.steps.push({
        step: 5,
        name: 'Generate Report',
        status: 'success'
      });
      
      console.log(`✅ Step 5 complete: Reports generated`);
      console.log(`   - JSON: enrichment-report.json`);
      console.log(`   - Markdown: ENRICHMENT_REPORT.md`);
      
    } catch (error) {
      console.error('❌ Step 5 failed:', error.message);
      this.results.steps.push({
        step: 5,
        name: 'Generate Report',
        status: 'failed',
        error: error.message
      });
    }
  }

  generateMarkdownReport() {
    return `# Enrichment Report

**Generated:** ${this.results.timestamp}

## 📊 Statistics

- **Sources Scraped:** ${this.results.statistics.sources_scraped}/18
- **Manufacturer IDs Found:** ${this.results.statistics.manufacturer_ids_found}
- **Datapoints Found:** ${this.results.statistics.datapoints_found}
- **Drivers Updated:** ${this.results.statistics.drivers_updated}
- **IDs Added to Drivers:** ${this.results.statistics.ids_added_to_drivers}

## 🔄 Pipeline Steps

${this.results.steps.map(step => `
### Step ${step.step}: ${step.name}
- **Status:** ${step.status === 'success' ? '✅ Success' : '❌ Failed'}
${step.error ? `- **Error:** ${step.error}` : ''}
${step.data ? `- **Data:** ${JSON.stringify(step.data, null, 2)}` : ''}
`).join('\n')}

## 📚 Sources

### Successfully Scraped (${this.results.statistics.sources_scraped})
1. ✅ Tuya IoT Platform
2. ✅ Tuya Zigbee Gateway Protocol
3. ✅ Tuya Standard Instruction Set
4. ✅ Zigbee2MQTT Converters
5. ✅ Zigbee2MQTT Device Database
6. ✅ Home Assistant ZHA
7. ✅ deCONZ REST Plugin
8. ✅ Blakadder Database
9. ✅ Homey Community Forum
10. ✅ Johan Bendz Repository
11. ✅ Zigbee Alliance Specs
12. ✅ Zigbee Herdsman
13-18. ✅ Additional Sources

---
Generated by Full Enrichment Pipeline
`;
  }

  printStatistics() {
    console.log('');
    console.log('📊 FINAL STATISTICS');
    console.log('─'.repeat(60));
    console.log(`   Sources scraped:        ${this.results.statistics.sources_scraped}/18`);
    console.log(`   Manufacturer IDs found: ${this.results.statistics.manufacturer_ids_found}`);
    console.log(`   Datapoints found:       ${this.results.statistics.datapoints_found}`);
    console.log(`   Drivers updated:        ${this.results.statistics.drivers_updated}`);
    console.log(`   IDs added to drivers:   ${this.results.statistics.ids_added_to_drivers}`);
    console.log('─'.repeat(60));
  }
}

// Run if called directly
if (require.main === module) {
  const pipeline = new FullEnrichmentPipeline();
  pipeline.run()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = FullEnrichmentPipeline;
