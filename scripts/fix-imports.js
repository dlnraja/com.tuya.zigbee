const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const REPORT_FILE = path.join(PROJECT_ROOT, 'reports', 'import-issues.json');
const BACKUP_DIR = path.join(PROJECT_ROOT, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a backup of a file before making changes
 */
function backupFile(filePath) {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const backupPath = path.join(BACKUP_DIR, relativePath);
  const backupDir = path.dirname(backupPath);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  fs.copyFileSync(filePath, backupPath);
  console.log(`📦 Backup created: ${backupPath}`);
  return backupPath;
}

/**
 * Apply fixes to a file based on the issues report
 */
function fixFileIssues(filePath, issues) {
  // Sort issues by line number in descending order to avoid offset issues
  const sortedIssues = [...issues].sort((a, b) => b.line - a.line);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let changesMade = 0;
  
  // Process each issue
  for (const issue of sortedIssues) {
    const lineIndex = issue.line - 1; // Convert to 0-based index
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const originalLine = lines[lineIndex];
      
      // Apply the fix based on issue type
      switch (issue.type) {
        case 'legacy_import':
        case 'deprecated_import':
        case 'incorrect_cluster_import':
          // Replace the entire line with the suggested fix
          lines[lineIndex] = issue.fix;
          changesMade++;
          console.log(`🔄 Fixed ${issue.type} in ${filePath}:${issue.line}`);
          break;
          
        case 'missing_base_import':
          // Add the import at the top of the file if not already present
          if (!content.includes(issue.fix)) {
            // Find the first non-comment, non-import line
            let insertAt = 0;
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
                insertAt = i;
                break;
              }
            }
            
            // Insert the import
            lines.splice(insertAt, 0, issue.fix);
            changesMade++;
            console.log(`➕ Added missing import to ${filePath}`);
          }
          break;
      }
    }
  }
  
  // Write changes if any were made
  if (changesMade > 0) {
    // Backup the original file
    backupFile(filePath);
    
    // Write the updated content
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`✅ Applied ${changesMade} fixes to ${filePath}`);
    return true;
  }
  
  return false;
}

/**
 * Main function to fix import issues
 */
async function fixImports() {
  try {
    // Check if report exists
    if (!fs.existsSync(REPORT_FILE)) {
      console.error('❌ No import issues report found. Please run identify-import-issues.js first.');
      process.exit(1);
    }
    
    // Load the report
    const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
    
    if (report.issues.length === 0) {
      console.log('✅ No import issues to fix!');
      return;
    }
    
    console.log(`🔧 Found ${report.issues.length} import issues to fix`);
    
    // Group issues by file
    const issuesByFile = {};
    report.issues.forEach(issue => {
      if (!issuesByFile[issue.file]) {
        issuesByFile[issue.file] = [];
      }
      issuesByFile[issue.file].push(issue);
    });
    
    // Process each file
    let totalFixed = 0;
    for (const [relativePath, issues] of Object.entries(issuesByFile)) {
      const filePath = path.join(PROJECT_ROOT, relativePath);
      
      if (fs.existsSync(filePath)) {
        console.log(`\n🔍 Processing ${relativePath}...`);
        const fixed = fixFileIssues(filePath, issues);
        if (fixed) totalFixed++;
      } else {
        console.warn(`⚠️  File not found: ${filePath}`);
      }
    }
    
    console.log(`\n✨ Successfully fixed import issues in ${totalFixed} files`);
    console.log(`💾 Backups were saved to: ${BACKUP_DIR}`);
    
    // Run ESLint to fix any remaining style issues
    console.log('\n🔍 Running ESLint to fix any remaining style issues...');
    try {
      execSync('npx eslint --fix .', { stdio: 'inherit', cwd: PROJECT_ROOT });
      console.log('✅ ESLint fixes applied');
    } catch (error) {
      console.warn('⚠️  ESLint found some issues that could not be automatically fixed');
    }
    
  } catch (error) {
    console.error('❌ Error fixing imports:', error.message);
    process.exit(1);
  }
}

// Run the import fixer
fixImports().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
