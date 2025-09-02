const fs = require('fs');
const path = require('path');

function listFiles(dir, outputFile, depth = 0, maxDepth = 2) {
  try {
    const files = fs.readdirSync(dir);
    let output = '';
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      const prefix = '  '.repeat(depth);
      
      if (stats.isDirectory()) {
        output += `${prefix}📁 ${file}/\n`;
        if (depth < maxDepth) {
          output += listFiles(fullPath, '', depth + 1, maxDepth);
        }
      } else {
        output += `${prefix}📄 ${file} (${(stats.size / 1024).toFixed(2)} KB)\n`;
      }
    });
    
    if (outputFile) {
      fs.writeFileSync(outputFile, output);
      console.log(`Output written to ${outputFile}`);
    }
    
    return output;
  } catch (error) {
    return `Error reading directory ${dir}: ${error.message}\n`;
  }
}

// Create analysis-results directory if it doesn't exist
const outputDir = path.join(__dirname, 'analysis-results');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate the directory listing
const outputFile = path.join(outputDir, 'directory_structure.txt');
console.log('Generating directory structure...');
listFiles(__dirname, outputFile);

// Create a simple project summary
const summary = {
  timestamp: new Date().toISOString(),
  directories: [],
  fileCount: 0,
  totalSize: 0,
  lastModified: null
};

// Count files and calculate total size
function analyzeDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      analyzeDir(fullPath);
    } else {
      summary.fileCount++;
      summary.totalSize += stats.size;
      
      if (!summary.lastModified || stats.mtime > summary.lastModified) {
        summary.lastModified = stats.mtime;
      }
    }
  });
}

try {
  analyzeDir(__dirname);
  
  // Save summary to file
  const summaryFile = path.join(outputDir, 'project_summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log('Project summary:');
  console.log(`- Total files: ${summary.fileCount}`);
  console.log(`- Total size: ${(summary.totalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`- Last modified: ${summary.lastModified}`);
  console.log(`\nAnalysis complete. Check ${outputDir} for detailed results.`);
  
} catch (error) {
  console.error('Error during analysis:', error.message);
}
