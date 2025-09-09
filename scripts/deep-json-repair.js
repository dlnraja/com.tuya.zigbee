const fs = require('fs');
const path = require('path');

/**
 * Deep JSON repair and validation script
 * Fixes all JSON issues in the project
 */
class DeepJsonRepair {
  constructor() {
    this.rootPath = path.join(__dirname, '..');
    this.issues = [];
    this.repaired = [];
    this.failed = [];
  }

  async execute() {
    console.log('🔧 Starting Deep JSON Repair Process...\n');
    
    // Scan entire project for JSON files
    const jsonFiles = await this.findAllJsonFiles(this.rootPath);
    console.log(`Found ${jsonFiles.length} JSON files to check\n`);
    
    // Process each file
    for (const file of jsonFiles) {
      await this.processJsonFile(file);
    }
    
    // Generate report
    this.generateReport();
  }
  
  async findAllJsonFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      
      // Skip node_modules and .git
      if (file === 'node_modules' || file === '.git') continue;
      
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        await this.findAllJsonFiles(filePath, fileList);
      } else if (file.endsWith('.json')) {
        fileList.push(filePath);
      }
    }
    
    return fileList;
  }
  
  async processJsonFile(filePath) {
    const relativePath = path.relative(this.rootPath, filePath);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Try to parse as-is
      try {
        JSON.parse(content);
        // File is valid
        return;
      } catch (parseError) {
        // File needs repair
        console.log(`⚠️  Repairing: ${relativePath}`);
        this.issues.push({
          file: relativePath,
          error: parseError.message
        });
        
        // Attempt repair
        const repaired = await this.repairJson(content, filePath);
        
        if (repaired) {
          // Validate repaired JSON
          try {
            const parsed = JSON.parse(repaired);
            
            // Write back formatted JSON
            fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2));
            this.repaired.push(relativePath);
            console.log(`   ✅ Repaired successfully`);
          } catch (stillBroken) {
            this.failed.push({
              file: relativePath,
              error: stillBroken.message
            });
            console.log(`   ❌ Could not auto-repair`);
          }
        }
      }
    } catch (readError) {
      console.error(`   ❌ Cannot read file: ${relativePath}`);
      this.failed.push({
        file: relativePath,
        error: readError.message
      });
    }
  }
  
  async repairJson(content, filePath) {
    let fixed = content;
    
    // 1. Remove BOM
    fixed = fixed.replace(/^\uFEFF/, '');
    
    // 2. Remove comments
    fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, ''); // Block comments
    fixed = fixed.replace(/\/\/.*$/gm, ''); // Line comments
    
    // 3. Fix trailing commas
    fixed = fixed.replace(/,\s*}/g, '}');
    fixed = fixed.replace(/,\s*]/g, ']');
    
    // 4. Fix quotes
    // Replace single quotes with double quotes (carefully)
    fixed = fixed.replace(/'/g, '"');
    
    // 5. Remove control characters
    fixed = fixed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // 6. Fix common Tuya-specific issues
    if (filePath.includes('driver.compose.json')) {
      fixed = this.fixDriverComposeIssues(fixed);
    }
    
    // 7. Fix duplicate keys
    fixed = this.removeDuplicateKeys(fixed);
    
    // 8. Fix unclosed strings
    fixed = this.fixUnclosedStrings(fixed);
    
    // 9. Ensure proper array/object structure
    fixed = this.fixStructure(fixed);
    
    return fixed;
  }
  
  fixDriverComposeIssues(content) {
    // Fix common driver.compose.json issues
    let fixed = content;
    
    // Ensure required fields
    try {
      let obj = JSON.parse(fixed);
      
      // Add missing required fields
      if (!obj.id) obj.id = 'unknown_driver';
      if (!obj.name) obj.name = { en: 'Unknown Device' };
      if (!obj.class) obj.class = 'socket';
      if (!obj.capabilities) obj.capabilities = [];
      if (!obj.zigbee) obj.zigbee = {};
      
      fixed = JSON.stringify(obj, null, 2);
    } catch (e) {
      // If can't parse, try pattern-based fixes
      
      // Ensure id field exists
      if (!fixed.includes('"id"')) {
        fixed = fixed.replace('{', '{\n  "id": "driver_id",');
      }
      
      // Ensure name field exists
      if (!fixed.includes('"name"')) {
        fixed = fixed.replace('"id"', '"id": "driver_id",\n  "name": { "en": "Device Name" },\n  "id"');
      }
    }
    
    return fixed;
  }
  
  removeDuplicateKeys(content) {
    // Simple duplicate key removal (keeps last occurrence)
    const lines = content.split('\n');
    const seen = new Set();
    const result = [];
    
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const keyMatch = line.match(/^\s*"([^"]+)"\s*:/);
      
      if (keyMatch) {
        const key = keyMatch[1];
        if (seen.has(key)) {
          continue; // Skip duplicate
        }
        seen.add(key);
      }
      
      result.unshift(line);
    }
    
    return result.join('\n');
  }
  
  fixUnclosedStrings(content) {
    // Fix unclosed strings
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let quoteCount = 0;
      let escaped = false;
      
      for (let j = 0; j < line.length; j++) {
        if (line[j] === '\\' && !escaped) {
          escaped = true;
          continue;
        }
        
        if (line[j] === '"' && !escaped) {
          quoteCount++;
        }
        
        escaped = false;
      }
      
      // If odd number of quotes, add closing quote
      if (quoteCount % 2 !== 0) {
        lines[i] = line + '"';
      }
    }
    
    return lines.join('\n');
  }
  
  fixStructure(content) {
    // Count brackets and braces
    let braceCount = 0;
    let bracketCount = 0;
    
    for (const char of content) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }
    
    // Add missing closing braces
    while (braceCount > 0) {
      content += '\n}';
      braceCount--;
    }
    
    // Add missing closing brackets
    while (bracketCount > 0) {
      content += '\n]';
      bracketCount--;
    }
    
    return content;
  }
  
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_files: this.issues.length + this.repaired.length,
        issues_found: this.issues.length,
        repaired: this.repaired.length,
        failed: this.failed.length
      },
      issues: this.issues,
      repaired: this.repaired,
      failed: this.failed
    };
    
    // Save report
    const reportPath = path.join(__dirname, '..', 'reports', 'json-repair-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 JSON Repair Summary:');
    console.log('='.repeat(60));
    console.log(`Total files checked: ${report.summary.total_files}`);
    console.log(`Issues found: ${report.summary.issues_found}`);
    console.log(`Successfully repaired: ${report.summary.repaired}`);
    console.log(`Failed to repair: ${report.summary.failed}`);
    console.log('\n✅ Report saved to: reports/json-repair-report.json');
  }
}

// Execute if run directly
if (require.main === module) {
  const repair = new DeepJsonRepair();
  repair.execute().catch(console.error);
}

module.exports = DeepJsonRepair;
