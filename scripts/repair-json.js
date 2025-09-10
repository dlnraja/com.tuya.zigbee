const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

class JSONRepairTool {
  constructor() {
    this.repairedFiles = 0;
    this.skippedFiles = 0;
    this.errorFiles = 0;
    this.backupDir = path.join(process.cwd(), 'backup', 'json_backup_' + Date.now());
  }

  async repairProject() {
    console.log('🚀 Starting JSON repair process...\n');
    
    // Create backup directory
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    }

    // Process all JSON files in the project
    await this.processDirectory(process.cwd());

    // Print summary
    console.log('\n📊 Repair Summary:');
    console.log(`✅ Repaired files: ${this.repairedFiles}`);
    console.log(`ℹ️  Skipped (already valid): ${this.skippedFiles}`);
    console.log(`❌ Files with errors: ${this.errorFiles}`);
    console.log(`\n💾 Backups saved to: ${this.backupDir}`);
  }

  async processDirectory(directory) {
    try {
      const files = await readdir(directory);
      
      for (const file of files) {
        const fullPath = path.join(directory, file);
        const fileStat = await stat(fullPath);

        if (fileStat.isDirectory()) {
          // Skip node_modules and other non-essential directories
          if (['node_modules', '.git', 'dist', 'build', 'backup'].includes(file)) {
            continue;
          }
          await this.processDirectory(fullPath);
        } else if (file.endsWith('.json') || file.endsWith('.json5')) {
          await this.processFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing directory ${directory}:`, error.message);
    }
  }

  async processFile(filePath) {
    try {
      // Skip files in node_modules and other excluded directories
      if (filePath.includes('node_modules') || 
          filePath.includes('.git') ||
          filePath.includes('backup')) {
        return;
      }

      const relativePath = path.relative(process.cwd(), filePath);
      
      try {
        // Try to parse the file to check if it's valid JSON
        const content = await readFile(filePath, 'utf8');
        JSON.parse(content);
        this.skippedFiles++;
        console.log(`✓ ${relativePath} (valid)`);
        return; // File is valid, no need to repair
      } catch (parseError) {
        console.log(`⚠️  ${relativePath} (needs repair)`);
        
        // Create backup before making changes
        await this.createBackup(filePath);
        
        // Try to repair the file
        const repaired = await this.repairFile(filePath);
        
        if (repaired) {
          this.repairedFiles++;
          console.log(`   → Repaired: ${relativePath}`);
        } else {
          this.errorFiles++;
          console.error(`   ❌ Failed to repair: ${relativePath}`);
        }
      }
    } catch (error) {
      this.errorFiles++;
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  async createBackup(filePath) {
    try {
      const relativePath = path.relative(process.cwd(), filePath);
      const backupPath = path.join(this.backupDir, relativePath);
      const backupDir = path.dirname(backupPath);
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const content = await readFile(filePath, 'utf8');
      await writeFile(backupPath, content, 'utf8');
    } catch (error) {
      console.error(`   ⚠️  Failed to create backup for ${filePath}:`, error.message);
    }
  }

  async repairFile(filePath) {
    try {
      let content = await readFile(filePath, 'utf8');
      
      // Common JSON repair patterns
      const repairs = [
        // Remove BOM if present
        [/^\uFEFF/, ''],
        // Fix trailing commas in objects and arrays
        [/,(\s*[}\]])/g, '$1'],
        // Fix missing quotes around property names
        [/([{,{]\s*)([\w_][\w\d_]*)\s*:/g, '$1"$2":'],
        // Fix single quotes to double quotes
        [/'/g, '"'],
        // Fix unescaped quotes in strings
        [/([^\\])"([^"]*?)([^\\])"/g, '$1"$2\\"'],
        // Fix missing commas between properties
        [/([}"]\s*)([{"\w])/g, '$1,$2'],
        // Fix missing opening/closing braces
        [/^\s*([\[\{]?)\s*([\s\S]*?)\s*([\]\}]?)\s*$/, '{$2}'],
        // Fix comments (remove them as they're not valid in JSON)
        [/\/\*[\s\S]*?\*\//g, ''],
        [/\/\/.*$/gm, '']
      ];
      
      // Apply repairs
      let repaired = content;
      repairs.forEach(([pattern, replacement]) => {
        repaired = repaired.replace(pattern, replacement);
      });
      
      // Try to parse the repaired content
      JSON.parse(repaired);
      
      // If we get here, the JSON is valid - write it back
      await writeFile(filePath, JSON.stringify(JSON.parse(repaired), null, 2), 'utf8');
      return true;
      
    } catch (error) {
      console.error(`   Repair failed for ${filePath}:`, error.message);
      return false;
    }
  }
}

// Run the repair tool
const repairTool = new JSONRepairTool();
repairTool.repairProject().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
