const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_RETRIES = 5;
const RETRY_DELAY = 60000; // 1 minute

const scripts = [
  'tools/scraping/forum_scraper.js',
  'tools/scraping/github_scraper.js',
  'tools/scraping/db_scraper.js',
  'tools/processing/data_processor.js',
  'tools/processing/matrix_builder.js',
  'tools/ai/nlp_processor.js',
  'tools/ai/image_analyzer.js',
  'tools/ai/data_enricher.js',
  'tools/analysis/commit_analyzer.js',
  'tools/analysis/pattern_detector.js',
  'tools/analysis/trend_analyzer.js',
  'tools/generation/driver_generator.js',
  'tools/generation/docs_generator.js',
  'tools/generation/config_generator.js',
  'tools/validation/structure_validator.js',
  'tools/testing/performance_tester.js',
  'tools/testing/load_tester.js'
];

function runScript(scriptPath, retryCount = 0) {
  return new Promise((resolve, reject) => {
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error running ${scriptPath}: ${error.message}`);
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying ${scriptPath} in ${RETRY_DELAY/1000} seconds... (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(() => runScript(scriptPath, retryCount + 1).then(resolve).catch(reject), RETRY_DELAY);
        } else {
          reject(new Error(`Failed to run ${scriptPath} after ${MAX_RETRIES} retries`));
        }
      } else {
        console.log(`✅ Successfully ran ${scriptPath}`);
        console.log(stdout);
        if (stderr) console.error(stderr);
        resolve();
      }
    });
  });
}

async function runAllScripts() {
  for (const script of scripts) {
    if (fs.existsSync(script)) {
      try {
        await runScript(script);
      } catch (error) {
        console.error(`❌ Critical error: ${error.message}`);
        process.exit(1);
      }
    } else {
      console.warn(`⚠️ Script not found: ${script}`);
    }
  }
  console.log('🎉 All scripts executed successfully!');
}

runAllScripts();
