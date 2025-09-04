const fs = require('fs');
const path = require('path');

const mapping = {
  // Move script files to scripts directory
  'mega_script.js': 'scripts',
  'cleanup.js': 'scripts',
  'project_enhancer.js': 'scripts',
  'mega_restructure.ps1': 'scripts',
  // Move documentation
  'README.md': 'docs',
  'CHANGELOG.md': 'docs',
  // Move directories
  'tools': 'scripts',
  'research': 'data',
  'analysis-results': 'data',
  'enriched': 'data',
  'evidence': 'data',
  'failover-test-results': 'data',
  'final-validation': 'data',
  'matrices': 'data',
  'ref': 'data',
  'references': 'data',
  'scan-results': 'data',
  'scraping-data': 'data',
  'script-consolidation': 'scripts',
  'script-conversion': 'scripts',
  'sync': 'scripts',
  'tests': 'test',
  'web-enriched': 'data',
};

Object.entries(mapping).forEach(([source, targetDir]) => {
  const sourcePath = path.resolve(source);
  const targetPath = path.resolve(targetDir, path.basename(source));

  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Check if source exists
  if (fs.existsSync(sourcePath)) {
    // Move the file/directory
    fs.renameSync(sourcePath, targetPath);
    console.log(`Moved ${source} to ${targetPath}`);
  } else {
    console.log(`Source ${source} does not exist`);
  }
});
