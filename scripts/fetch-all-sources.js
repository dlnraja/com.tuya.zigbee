#!/usr/bin/env node
const path = require('path');
const fs = require('fs').promises;

// Import all source modules
const fetchZigbee2MQTT = require('./sources/fetch-zigbee2mqtt');
const fetchBlakadder = require('./sources/fetch-blakadder');
const analyzeForum = require('./sources/analyze-forum');
const { fetchGitHubData } = require('./sources/fetch-github-data');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '../resources'),
  sources: {
    zigbee2mqtt: {
      name: 'Zigbee2MQTT',
      enabled: true,
      module: fetchZigbee2MQTT,
      outputFile: 'zigbee2mqtt-devices.json'
    },
    blakadder: {
      name: 'Blakadder Zigbee',
      enabled: true,
      module: fetchBlakadder,
      outputFile: 'blakadder-devices.json'
    },
    forum: {
      name: 'Homey Forum Analysis',
      enabled: true,
      module: analyzeForum,
      outputFile: 'forum-analysis.json'
    },
    github: {
      name: 'GitHub Data',
      enabled: !!process.env.GITHUB_TOKEN,
      module: fetchGitHubData,
      outputFile: 'github/device-contributions.json',
      requiresAuth: true
    }
  }
};

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function runSource(sourceConfig) {
  const { name, module, outputFile, requiresAuth } = sourceConfig;
  const outputPath = path.join(CONFIG.outputDir, outputFile);
  
  try {
    if (requiresAuth && !process.env.GITHUB_TOKEN) {
      return {
        name,
        status: '⚠️  Skipped',
        details: 'Authentication required (set GITHUB_TOKEN environment variable)',
        outputFile: null,
        duration: '0s',
        success: false
      };
    }
    
    console.log(`🚀 Starting ${name}...`);
    const startTime = Date.now();
    
    // Ensure output directory exists
    await ensureDirectoryExists(path.dirname(outputPath));
    
    // Execute the module
    const result = await module();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Save the result if the module didn't save it already
    if (result && !fs.existsSync(outputPath)) {
      await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
    }
    
    return {
      name,
      status: '✅ Success',
      details: `Data saved to ${outputPath}`,
      outputFile: outputPath,
      duration: `${duration}s`,
      success: true
    };
  } catch (error) {
    console.error(`❌ Error in ${name}:`, error);
    return {
      name,
      status: '❌ Failed',
      details: error.message,
      outputFile: null,
      duration: 'N/A',
      success: false,
      error: error.stack
    };
  }
}

async function generateSummary(results) {
  const summary = {
    timestamp: new Date().toISOString(),
    totalSources: Object.keys(CONFIG.sources).length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results: results.map(({ success, error, ...rest }) => rest)
  };
  
  const summaryPath = path.join(CONFIG.outputDir, 'data-collection-summary.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  
  return summary;
}

async function writeSourcesDoc(results) {
  const lines = [];
  lines.push('# Data Sources');
  lines.push('');
  lines.push(`Last updated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('| Source | Status | Details |');
  lines.push('|--------|--------|---------|');
  for (const r of results) {
    lines.push(`| ${r.name} | ${r.status} | ${r.details?.replace(/\|/g, ' ')} |`);
  }
  const mdPath = path.join(CONFIG.outputDir, 'SOURCES.md');
  await fs.writeFile(mdPath, lines.join('\n'));
  return mdPath;
}

async function main() {
  console.log('🚀 Starting data collection from all sources...\n');
  
  // Run all enabled sources in parallel
  const results = await Promise.all(
    Object.entries(CONFIG.sources)
      .filter(([_, config]) => config.enabled)
      .map(([_, config]) => runSource(config))
  );
  
  // Generate and display summary
  const summary = await generateSummary(results);
  
  console.log('\n📊 Data Collection Summary');
  console.log('='.repeat(50));
  console.log(`Total sources: ${summary.totalSources}`);
  console.log(`✅ Successful: ${summary.successful}`);
  console.log(`❌ Failed: ${summary.failed}`);
  
  // Display detailed results
  console.log('\n📋 Detailed Results:');
  console.log('='.repeat(50));
  
  for (const result of summary.results) {
    console.log(`\n${result.name} (${result.status})`);
    console.log(`- Duration: ${result.duration}`);
    console.log(`- Details: ${result.details}`);
    if (result.outputFile) {
      console.log(`- Output: ${path.relative(process.cwd(), result.outputFile)}`);
    }
  }
  
  // Save summary to file
  const summaryPath = path.join(CONFIG.outputDir, 'data-collection-summary.json');
  console.log(`\n📄 Full summary saved to: ${path.relative(process.cwd(), summaryPath)}`);
  // Also write a human-readable SOURCES.md
  const sourcesDoc = await writeSourcesDoc(summary.results);
  console.log(`📚 Sources documentation: ${path.relative(process.cwd(), sourcesDoc)}`);
  
  // Exit with appropriate status code
  process.exit(summary.failed > 0 ? 1 : 0);
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error in data collection:', error);
    process.exit(1);
  });
}

module.exports = {
  runSource,
  generateSummary,
  config: CONFIG
};
