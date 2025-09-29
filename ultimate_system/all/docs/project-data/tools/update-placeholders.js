const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Configuration
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const REPLACEMENTS_FILE = path.join(__dirname, '..', 'references', 'replacements.json');
const REPORT_FILE = path.join(__dirname, '..', 'placeholder-update-report.md');

// Common replacements
const DEFAULT_REPLACEMENTS = {
  // Text placeholders
  'PLACEHOLDER': 'REPLACED',
  'TODO': 'IMPLEMENTED',
  'FIXME': 'FIXED',
  'XXX': 'COMPLETED',
  
  // Image placeholders
  'placeholder.png': 'device-image.png',
  'placeholder.svg': 'device-image.svg',
  
  // Author information
  'AUTHOR_NAME': 'Tuya Zigbee Community',
  'AUTHOR_EMAIL': 'tuya-zigbee@example.com',
  
  // License information
  'YEAR': new Date().getFullYear().toString(),
  'LICENSE_HOLDER': 'Tuya Zigbee Contributors'
};

async function loadReplacements() {
  try {
    if (fs.existsSync(REPLACEMENTS_FILE)) {
      const content = await readFile(REPLACEMENTS_FILE, 'utf8');
      return { ...DEFAULT_REPLACEMENTS, ...JSON.parse(content) };
    }
    return DEFAULT_REPLACEMENTS;
  } catch (error) {
    console.warn('Could not load custom replacements, using defaults:', error.message);
    return DEFAULT_REPLACEMENTS;
  }
}

async function updatePlaceholders() {
  try {
    const replacements = await loadReplacements();
    const report = {
      timestamp: new Date().toISOString(),
      updatedFiles: [],
      skippedFiles: [],
      errors: []
    };

    // Process all JavaScript files in the drivers directory
    await processDirectory(DRIVERS_DIR, replacements, report);
    
    // Process assets directory if it exists
    if (fs.existsSync(ASSETS_DIR)) {
      await processDirectory(ASSETS_DIR, replacements, report);
    }

    // Generate and save the report
    await generateReport(report);
    
    console.log(`\nPlaceholder update complete. Report saved to ${REPORT_FILE}`);
    console.log(`Updated ${report.updatedFiles.length} files`);
    if (report.errors.length > 0) {
      console.warn(`Encountered ${report.errors.length} errors`);
    }
    
    return report;
  } catch (error) {
    console.error('Error updating placeholders:', error);
    throw error;
  }
}

async function processDirectory(directory, replacements, report) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    try {
      if (entry.isDirectory()) {
        // Skip node_modules and other non-relevant directories
        if (['node_modules', '.git', 'coverage', 'dist'].includes(entry.name)) {
          continue;
        }
        await processDirectory(fullPath, replacements, report);
      } else if (entry.isFile()) {
        // Only process certain file types
        const ext = path.extname(entry.name).toLowerCase();
        if (['.js', '.json', '.md', '.html', '.css', '.svg'].includes(ext)) {
          await processFile(fullPath, replacements, report);
        }
      }
    } catch (error) {
      report.errors.push({
        file: fullPath,
        error: error.message
      });
      console.error(`Error processing ${fullPath}:`, error.message);
    }
  }
}

async function processFile(filePath, replacements, report) {
  try {
    // Skip binary files
    const isBinary = await isBinaryFile(filePath);
    if (isBinary) {
      report.skippedFiles.push({
        file: filePath,
        reason: 'Binary file'
      });
      return;
    }

    // Read the file content
    let content = await readFile(filePath, 'utf8');
    let updated = false;
    
    // Apply replacements
    for (const [placeholder, replacement] of Object.entries(replacements)) {
      if (content.includes(placeholder)) {
        content = content.replace(new RegExp(escapeRegExp(placeholder), 'g'), replacement);
        updated = true;
      }
    }

    // Write the updated content back to the file if changes were made
    if (updated) {
      await writeFile(filePath, content, 'utf8');
      report.updatedFiles.push(filePath);
    } else {
      report.skippedFiles.push({
        file: filePath,
        reason: 'No placeholders found'
      });
    }
  } catch (error) {
    throw new Error(`Failed to process file: ${error.message}`);
  }
}

async function isBinaryFile(filePath) {
  const buffer = Buffer.alloc(512);
  const fd = await fs.promises.open(filePath, 'r');
  try {
    const { bytesRead } = await fd.read(buffer, 0, 512, 0);
    // Check for null bytes which typically indicate a binary file
    return buffer.includes(0, 0, bytesRead);
  } finally {
    await fd.close();
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function generateReport(report) {
  let markdown = `# Placeholder Update Report\n\n`;
  markdown += `**Generated at:** ${new Date(report.timestamp).toLocaleString()}\n\n`;
  
  // Summary
  markdown += '## 📊 Summary\n\n';
  markdown += `- **Files Updated:** ${report.updatedFiles.length}\n`;
  markdown += `- **Files Skipped:** ${report.skippedFiles.length}\n`;
  markdown += `- **Errors:** ${report.errors.length}\n\n`;
  
  // Updated files
  if (report.updatedFiles.length > 0) {
    markdown += '## ✅ Updated Files\n\n';
    for (const file of report.updatedFiles) {
      markdown += `- ${file}\n`;
    }
    markdown += '\n';
  }
  
  // Skipped files
  if (report.skippedFiles.length > 0) {
    markdown += '## ⏭️ Skipped Files\n\n';
    markdown += '| File | Reason |\n';
    markdown += '|------|--------|\n';
    for (const { file, reason } of report.skippedFiles) {
      markdown += `| ${file} | ${reason} |\n`;
    }
    markdown += '\n';
  }
  
  // Errors
  if (report.errors.length > 0) {
    markdown += '## ❌ Errors\n\n';
    markdown += '| File | Error |\n';
    markdown += '|------|-------|\n';
    for (const { file, error } of report.errors) {
      markdown += `| ${file} | ${error} |\n`;
    }
  }
  
  // Save the report
  await writeFile(REPORT_FILE, markdown);
}

// Run the placeholder update
updatePlaceholders().catch(console.error);
