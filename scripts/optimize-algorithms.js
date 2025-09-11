const fs = require('fs').promises;
const path = require('path');

class AlgorithmOptimizer {
  constructor() {
    this.driversDir = path.join(__dirname, '../drivers');
    this.optimizations = 0;
    this.complexityReductions = [];
  }

  async optimizeAllDrivers() {
    console.log('🚀 Starting algorithm optimization process...');
    
    try {
      const drivers = await this.findAllDrivers();
      
      for (const driverPath of drivers) {
        await this.optimizeDriver(driverPath);
      }
      
      await this.generateOptimizationReport();
      
      console.log(`✅ Optimization complete! Applied ${this.optimizations} optimizations`);
      
    } catch (error) {
      console.error('❌ Optimization failed:', error);
    }
  }

  async findAllDrivers() {
    const drivers = [];
    
    const scanDirectory = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.name === 'device.js' || entry.name === 'driver.js') {
          drivers.push(fullPath);
        }
      }
    };
    
    await scanDirectory(this.driversDir);
    return drivers;
  }

  async optimizeDriver(filePath) {
    console.log(`🔧 Optimizing: ${path.relative(this.driversDir, filePath)}`);
    
    try {
      let content = await fs.readFile(filePath, 'utf8');
      const originalContent = content;
      
      // Apply various optimizations
      content = this.optimizeAsyncAwait(content, filePath);
      content = this.optimizeErrorHandling(content, filePath);
      content = this.optimizeLogging(content, filePath);
      content = this.optimizeDataStructures(content, filePath);
      content = this.optimizeConditionals(content, filePath);
      content = this.optimizeLoops(content, filePath);
      content = this.optimizePromises(content, filePath);
      content = this.removeCodeDuplication(content, filePath);
      
      // Only write if changes were made
      if (content !== originalContent) {
        await fs.writeFile(filePath, content, 'utf8');
        this.optimizations++;
        console.log(`  ✓ Optimized ${path.basename(filePath)}`);
      }
      
    } catch (error) {
      console.error(`  ❌ Failed to optimize ${filePath}:`, error.message);
    }
  }

  optimizeAsyncAwait(content, filePath) {
    let optimized = content;
    
    // Replace Promise.resolve() with direct values where appropriate
    optimized = optimized.replace(
      /return\s+Promise\.resolve\(([^)]+)\);/g,
      'return $1;'
    );
    
    // Optimize unnecessary async/await chains
    optimized = optimized.replace(
      /const\s+(\w+)\s+=\s+await\s+Promise\.resolve\(([^)]+)\);/g,
      'const $1 = $2;'
    );
    
    // Simplify try/catch with direct returns
    optimized = optimized.replace(
      /try\s*{\s*return\s+await\s+([^;]+);\s*}\s*catch\s*\([^)]*\)\s*{\s*return\s+([^;]+);\s*}/g,
      'try { return await $1; } catch { return $2; }'
    );
    
    if (optimized !== content) {
      this.complexityReductions.push({
        file: filePath,
        type: 'async/await optimization',
        description: 'Simplified async patterns and removed unnecessary Promise wrappers'
      });
    }
    
    return optimized;
  }

  optimizeErrorHandling(content, filePath) {
    let optimized = content;
    
    // Consolidate similar error handlers
    optimized = optimized.replace(
      /}\s*catch\s*\([^)]*\)\s*{\s*this\.error\([^)]+\);\s*}\s*catch\s*\([^)]*\)\s*{\s*this\.error\([^)]+\);\s*}/g,
      '} catch (error) { this.error("Operation failed:", error); }'
    );
    
    // Optimize empty catch blocks
    optimized = optimized.replace(
      /}\s*catch\s*\([^)]*\)\s*{\s*\/\/[^\n]*\n\s*}/g,
      '} catch { /* ignore */ }'
    );
    
    // Simplify error logging patterns
    optimized = optimized.replace(
      /this\.error\(`([^`]+)`,\s*error\);/g,
      'this.error("$1", error);'
    );
    
    if (optimized !== content) {
      this.complexityReductions.push({
        file: filePath,
        type: 'error handling optimization',
        description: 'Consolidated error handlers and simplified error logging'
      });
    }
    
    return optimized;
  }

  optimizeLogging(content, filePath) {
    let optimized = content;
    
    // Remove excessive debug logging in production paths
    optimized = optimized.replace(
      /this\.log\(`Debug:\s*[^`]*`\);\s*\n/g,
      ''
    );
    
    // Consolidate similar log messages
    optimized = optimized.replace(
      /this\.log\('([^']+)'\);\s*\n\s*this\.log\('([^']+)'\);/g,
      'this.log("$1 - $2");'
    );
    
    // Optimize log message formatting
    optimized = optimized.replace(
      /this\.log\(`([^`]+\$\{[^}]+\}[^`]*)`\)/g,
      (match, msg) => {
        // Only optimize if it's a simple template
        if (msg.split('${').length <= 3) {
          return match.replace(/`([^`]+)`/, '"$1"');
        }
        return match;
      }
    );
    
    if (optimized !== content) {
      this.complexityReductions.push({
        file: filePath,
        type: 'logging optimization',
        description: 'Reduced excessive logging and consolidated log messages'
      });
    }
    
    return optimized;
  }

  optimizeDataStructures(content, filePath) {
    let optimized = content;
    
    // Replace Object.keys().length with direct checks where possible
    optimized = optimized.replace(
      /Object\.keys\(([^)]+)\)\.length\s*===\s*0/g,
      '!Object.keys($1).length'
    );
    
    // Optimize Map/Set usage
    optimized = optimized.replace(
      /new\s+Map\(\[\]\)/g,
      'new Map()'
    );
    
    optimized = optimized.replace(
      /new\s+Set\(\[\]\)/g,
      'new Set()'
    );
    
    // Replace Array.from() where unnecessary
    optimized = optimized.replace(
      /Array\.from\(([^)]+)\)\.forEach/g,
      '[...$1].forEach'
    );
    
    if (optimized !== content) {
      this.complexityReductions.push({
        file: filePath,
        type: 'data structure optimization',
        description: 'Optimized Map/Set usage and array operations'
      });
    }
    
    return optimized;
  }

  optimizeConditionals(content, filePath) {
    let optimized = content;
    
    // Simplify boolean checks
    optimized = optimized.replace(
      /if\s*\(([^)]+)\s*===\s*true\)/g,
      'if ($1)'
    );
    
    optimized = optimized.replace(
      /if\s*\(([^)]+)\s*===\s*false\)/g,
      'if (!$1)'
    );
    
    // Optimize ternary operators
    optimized = optimized.replace(
      /([^?]+)\?\s*true\s*:\s*false/g,
      'Boolean($1)'
    );
    
    // Simplify nested conditions
    optimized = optimized.replace(
      /if\s*\(([^)]+)\)\s*{\s*if\s*\(([^)]+)\)\s*{\s*([^}]+)\s*}\s*}/g,
      'if ($1 && $2) { $3 }'
    );
    
    if (optimized !== content) {
      this.complexityReductions.push({
        file: filePath,
        type: 'conditional optimization',
        description: 'Simplified boolean checks and nested conditions'
      });
    }
    
    return optimized;
  }

  optimizeLoops(content, filePath) {
    let optimized = content;
    
    // Replace forEach with for...of where appropriate
    optimized = optimized.replace(
      /([^.]+)\.forEach\(\s*([^)]+)\s*=>\s*{([^}]+)}\s*\);/g,
      (match, array, param, body) => {
        if (!body.includes('return') && !body.includes('break')) {
          return `for (const ${param} of ${array}) {${body}}`;
        }
        return match;
      }
    );
    
    // Optimize Object.entries() iterations
    optimized = optimized.replace(
      /Object\.entries\(([^)]+)\)\.forEach\(\s*\[\s*([^,]+),\s*([^]]+)\s*\]\s*=>\s*{([^}]+)}\s*\);/g,
      'for (const [$2, $3] of Object.entries($1)) {$4}'
    );
    
    if (optimized !== content) {
      this.complexityReductions.push({
        file: filePath,
        type: 'loop optimization',
        description: 'Converted forEach to more efficient for...of loops'
      });
    }
    
    return optimized;
  }

  optimizePromises(content, filePath) {
    let optimized = content;
    
    // Replace Promise.all([single]) with direct await
    optimized = optimized.replace(
      /await\s+Promise\.all\(\[\s*([^,\]]+)\s*\]\)/g,
      'await $1'
    );
    
    // Optimize promise chains
    optimized = optimized.replace(
      /\.then\(\s*\(\)\s*=>\s*([^)]+)\s*\)/g,
      '.then(() => $1)'
    );
    
    if (optimized !== content) {
      this.complexityReductions.push({
        file: filePath,
        type: 'promise optimization',
        description: 'Simplified promise patterns and chains'
      });
    }
    
    return optimized;
  }

  removeCodeDuplication(content, filePath) {
    let optimized = content;
    
    // Find and optimize repeated patterns
    const lines = optimized.split('\n');
    const duplicates = new Map();
    
    // Look for duplicate consecutive lines
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line && line === lines[i + 1].trim()) {
        duplicates.set(i, line);
      }
    }
    
    // Remove consecutive duplicates
    if (duplicates.size > 0) {
      const filteredLines = [];
      let skipNext = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (skipNext) {
          skipNext = false;
          continue;
        }
        
        if (duplicates.has(i)) {
          skipNext = true;
        }
        
        filteredLines.push(lines[i]);
      }
      
      optimized = filteredLines.join('\n');
      
      this.complexityReductions.push({
        file: filePath,
        type: 'duplication removal',
        description: `Removed ${duplicates.size} duplicate lines`
      });
    }
    
    return optimized;
  }

  async generateOptimizationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalOptimizations: this.optimizations,
      complexityReductions: this.complexityReductions,
      summary: {
        asyncAwaitOptimizations: this.complexityReductions.filter(r => r.type === 'async/await optimization').length,
        errorHandlingOptimizations: this.complexityReductions.filter(r => r.type === 'error handling optimization').length,
        loggingOptimizations: this.complexityReductions.filter(r => r.type === 'logging optimization').length,
        dataStructureOptimizations: this.complexityReductions.filter(r => r.type === 'data structure optimization').length,
        conditionalOptimizations: this.complexityReductions.filter(r => r.type === 'conditional optimization').length,
        loopOptimizations: this.complexityReductions.filter(r => r.type === 'loop optimization').length,
        promiseOptimizations: this.complexityReductions.filter(r => r.type === 'promise optimization').length,
        duplicationRemovals: this.complexityReductions.filter(r => r.type === 'duplication removal').length
      }
    };
    
    const reportPath = path.join(__dirname, '../algorithm-optimization-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    
    console.log('\n📊 Optimization Report Generated:');
    console.log(`  Total optimizations: ${report.totalOptimizations}`);
    console.log(`  Async/await improvements: ${report.summary.asyncAwaitOptimizations}`);
    console.log(`  Error handling improvements: ${report.summary.errorHandlingOptimizations}`);
    console.log(`  Logging optimizations: ${report.summary.loggingOptimizations}`);
    console.log(`  Data structure optimizations: ${report.summary.dataStructureOptimizations}`);
    console.log(`  Conditional simplifications: ${report.summary.conditionalOptimizations}`);
    console.log(`  Loop optimizations: ${report.summary.loopOptimizations}`);
    console.log(`  Promise optimizations: ${report.summary.promiseOptimizations}`);
    console.log(`  Duplication removals: ${report.summary.duplicationRemovals}`);
    console.log(`\n📄 Full report saved to: ${reportPath}`);
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new AlgorithmOptimizer();
  optimizer.optimizeAllDrivers().catch(console.error);
}

module.exports = AlgorithmOptimizer;
