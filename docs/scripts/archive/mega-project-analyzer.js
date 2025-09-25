#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class MegaProjectAnalyzer {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.analysis = {
      structure: {},
      files: {},
      drivers: {},
      scripts: {},
      sources: {},
      issues: [],
      recommendations: []
    };
  }

  async performMegaAnalysis() {
    console.log('🔍 MEGA PROJECT ANALYSIS - Compréhension Totale du Projet...\n');

    await this.generateProjectTree();
    await this.analyzeAllFiles();
    await this.analyzeDriverStructure();
    await this.analyzeScriptCapabilities();
    await this.identifyMissingComponents();
    await this.generateComprehensiveReport();

    console.log('\n✅ Analyse complète terminée - Compréhension totale du projet acquise!');
  }

  async generateProjectTree() {
    console.log('🌳 Génération de l\'arborescence complète...');

    const tree = await this.buildDirectoryTree(this.projectRoot);
    this.analysis.structure = tree;

    // Save tree to file for reference
    const treeOutput = this.formatTreeOutput(tree, '');
    await fs.writeFile(path.join(this.projectRoot, 'PROJECT_TREE.txt'), treeOutput);

    console.log('✅ Arborescence générée et sauvegardée dans PROJECT_TREE.txt');
  }

  async buildDirectoryTree(dirPath, level = 0) {
    const tree = {
      name: path.basename(dirPath),
      type: 'directory',
      path: dirPath,
      children: [],
      level: level
    };

    try {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        if (item.startsWith('.git') && level === 0) continue;
        if (item === 'node_modules') continue;

        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          const subTree = await this.buildDirectoryTree(itemPath, level + 1);
          tree.children.push(subTree);
        } else {
          tree.children.push({
            name: item,
            type: 'file',
            path: itemPath,
            size: stats.size,
            extension: path.extname(item),
            level: level + 1
          });
        }
      }
    } catch (error) {
      tree.error = error.message;
    }

    return tree;
  }

  formatTreeOutput(tree, prefix) {
    let output = `${prefix}${tree.name}\n`;

    if (tree.children) {
      tree.children.forEach((child, index) => {
        const isLast = index === tree.children.length - 1;
        const childPrefix = prefix + (isLast ? '└── ' : '├── ');
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');

        output += childPrefix + child.name;
        if (child.type === 'file' && child.size) {
          output += ` (${this.formatFileSize(child.size)})`;
        }
        output += '\n';

        if (child.children) {
          output += this.formatTreeOutput(child, nextPrefix);
        }
      });
    }

    return output;
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  }

  async analyzeAllFiles() {
    console.log('📄 Analyse de tous les fichiers...');

    await this.analyzeFilesByType('.js', 'JavaScript');
    await this.analyzeFilesByType('.json', 'JSON');
    await this.analyzeFilesByType('.md', 'Markdown');
    await this.analyzeFilesByType('.yml', 'YAML');

    console.log('✅ Analyse des fichiers terminée');
  }

  async analyzeFilesByType(extension, type) {
    const files = await this.findFilesByExtension(extension);
    this.analysis.files[type] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const analysis = {
          path: file,
          size: content.length,
          lines: content.split('\n').length,
          lastModified: (await fs.stat(file)).mtime
        };

        if (extension === '.js') {
          analysis.hasRequires = content.includes('require(');
          analysis.hasAsyncAwait = content.includes('async ') || content.includes('await ');
          analysis.hasErrorHandling = content.includes('try') && content.includes('catch');
          analysis.dependencies = this.extractDependencies(content);
          analysis.functions = this.extractFunctions(content);
        }

        if (extension === '.json') {
          try {
            JSON.parse(content);
            analysis.validJson = true;
          } catch (e) {
            analysis.validJson = false;
            analysis.jsonError = e.message;
            this.analysis.issues.push(`Invalid JSON in ${file}: ${e.message}`);
          }
        }

        this.analysis.files[type].push(analysis);
      } catch (error) {
        this.analysis.issues.push(`Cannot read ${file}: ${error.message}`);
      }
    }
  }

  async findFilesByExtension(extension) {
    const files = [];

    const findFiles = async (dir) => {
      try {
        const items = await fs.readdir(dir);

        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = await fs.stat(itemPath);

          if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            await findFiles(itemPath);
          } else if (stats.isFile() && item.endsWith(extension)) {
            files.push(itemPath);
          }
        }
      } catch (error) {
        // Continue if directory is not accessible
      }
    };

    await findFiles(this.projectRoot);
    return files;
  }

  extractDependencies(content) {
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    const dependencies = [];
    let match;

    while ((match = requireRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)];
  }

  extractFunctions(content) {
    const functionRegex = /(function\s+\w+|async\s+function\s+\w+|\w+\s*:\s*function|\w+\s*:\s*async\s+function)/g;
    const functions = [];
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }

    return functions;
  }

  async analyzeDriverStructure() {
    console.log('🚗 Analyse de la structure des drivers...');

    const driversDir = path.join(this.projectRoot, 'drivers');

    try {
      const drivers = await fs.readdir(driversDir);

      for (const driver of drivers) {
        if (driver.startsWith('_')) continue;

        const driverPath = path.join(driversDir, driver);
        const stats = await fs.stat(driverPath);

        if (stats.isDirectory()) {
          const analysis = await this.analyzeIndividualDriver(driverPath, driver);
          this.analysis.drivers[driver] = analysis;
        }
      }
    } catch (error) {
      this.analysis.issues.push(`Cannot analyze drivers: ${error.message}`);
    }

    console.log(`✅ ${Object.keys(this.analysis.drivers).length} drivers analysés`);
  }

  async analyzeIndividualDriver(driverPath, driverName) {
    const analysis = {
      name: driverName,
      hasDriverJs: false,
      hasDeviceJs: false,
      hasCompose: false,
      hasImages: false,
      imageCount: 0,
      hasAssets: false,
      capabilities: [],
      clusters: [],
      endpoints: {},
      issues: [],
      johanBenzStyle: false
    };

    try {
      const files = await fs.readdir(driverPath);

      for (const file of files) {
        const filePath = path.join(driverPath, file);
        const stats = await fs.stat(filePath);

        if (file === 'driver.js') {
          analysis.hasDriverJs = true;
          const content = await fs.readFile(filePath, 'utf8');
          analysis.capabilities = this.extractCapabilities(content);
        }

        if (file === 'device.js') {
          analysis.hasDeviceJs = true;
        }

        if (file === 'driver.compose.json') {
          analysis.hasCompose = true;
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const compose = JSON.parse(content);

            if (compose.capabilities) {
              analysis.capabilities = [...analysis.capabilities, ...compose.capabilities];
            }

            if (compose.zigbee && compose.zigbee.endpoints) {
              analysis.endpoints = compose.zigbee.endpoints;

              // Extract clusters from endpoints
              Object.values(compose.zigbee.endpoints).forEach(endpoint => {
                if (endpoint.clusters) {
                  analysis.clusters = [...analysis.clusters, ...endpoint.clusters];
                }
              });
            }
          } catch (e) {
            analysis.issues.push('Invalid driver.compose.json');
          }
        }

        if (file === 'assets' && stats.isDirectory()) {
          analysis.hasAssets = true;
          const assetsPath = path.join(filePath, 'images');

          try {
            const images = await fs.readdir(assetsPath);
            analysis.hasImages = images.length > 0;
            analysis.imageCount = images.length;

            // Check for Johan Benz style (SVG files with gradients)
            for (const image of images) {
              if (image.endsWith('.svg')) {
                const svgContent = await fs.readFile(path.join(assetsPath, image), 'utf8');
                if (svgContent.includes('linearGradient') || svgContent.includes('radialGradient')) {
                  analysis.johanBenzStyle = true;
                }
              }
            }
          } catch (e) {
            // No images directory
          }
        }
      }

      // Identify missing components
      if (!analysis.hasDriverJs) analysis.issues.push('Missing driver.js');
      if (!analysis.hasCompose) analysis.issues.push('Missing driver.compose.json');
      if (!analysis.hasImages) analysis.issues.push('Missing images');
      if (!analysis.johanBenzStyle) analysis.issues.push('Images not in Johan Benz style');

    } catch (error) {
      analysis.issues.push(`Analysis error: ${error.message}`);
    }

    return analysis;
  }

  extractCapabilities(content) {
    const capabilityRegex = /registerCapability\(['"]([^'"]+)['"]/g;
    const capabilities = [];
    let match;

    while ((match = capabilityRegex.exec(content)) !== null) {
      capabilities.push(match[1]);
    }

    return [...new Set(capabilities)];
  }

  async analyzeScriptCapabilities() {
    console.log('🔧 Analyse des capacités des scripts...');

    const scriptsDir = path.join(this.projectRoot, 'scripts');

    try {
      const scripts = await fs.readdir(scriptsDir);

      for (const script of scripts) {
        if (!script.endsWith('.js')) continue;

        const scriptPath = path.join(scriptsDir, script);
        const analysis = await this.analyzeScript(scriptPath);
        this.analysis.scripts[script] = analysis;
      }
    } catch (error) {
      this.analysis.issues.push(`Cannot analyze scripts: ${error.message}`);
    }

    console.log(`✅ ${Object.keys(this.analysis.scripts).length} scripts analysés`);
  }

  async analyzeScript(scriptPath) {
    const analysis = {
      path: scriptPath,
      canExecute: false,
      hasErrors: false,
      dependencies: [],
      functions: [],
      purpose: 'unknown',
      lastModified: null
    };

    try {
      const content = await fs.readFile(scriptPath, 'utf8');
      const stats = await fs.stat(scriptPath);

      analysis.lastModified = stats.mtime;
      analysis.dependencies = this.extractDependencies(content);
      analysis.functions = this.extractFunctions(content);

      // Determine purpose from filename and content
      const filename = path.basename(scriptPath);
      if (filename.includes('validate')) analysis.purpose = 'validation';
      else if (filename.includes('build')) analysis.purpose = 'build';
      else if (filename.includes('test')) analysis.purpose = 'testing';
      else if (filename.includes('enhance') || filename.includes('enrich')) analysis.purpose = 'enhancement';
      else if (filename.includes('harvest') || filename.includes('collect')) analysis.purpose = 'data-collection';
      else if (filename.includes('fix') || filename.includes('repair')) analysis.purpose = 'fixing';

      // Check if script can be executed
      analysis.canExecute = content.includes('if (require.main === module)') ||
        content.includes('#!/usr/bin/env node');

      // Check for potential issues
      const problemPatterns = [
        /require\(['"]axios['"]\)/,
        /require\(['"]cheerio['"]\)/,
        /require\(['"]natural['"]\)/,
        /process\.exit\(\)/
      ];

      for (const pattern of problemPatterns) {
        if (pattern.test(content)) {
          analysis.hasErrors = true;
          break;
        }
      }

    } catch (error) {
      analysis.hasErrors = true;
      analysis.error = error.message;
    }

    return analysis;
  }

  async identifyMissingComponents() {
    console.log('🔍 Identification des composants manquants...');

    const requiredFiles = [
      'package.json',
      'app.json',
      'README.md',
      'CHANGELOG.md',
      'LICENSE',
      '.gitignore'
    ];

    const requiredDirectories = [
      'drivers',
      'scripts',
      'matrices',
      'resources',
      '.github/workflows'
    ];

    // Check required files
    for (const file of requiredFiles) {
      const filePath = path.join(this.projectRoot, file);
      try {
        await fs.access(filePath);
      } catch (e) {
        this.analysis.issues.push(`Missing required file: ${file}`);
        this.analysis.recommendations.push(`Create ${file} with appropriate content`);
      }
    }

    // Check required directories
    for (const dir of requiredDirectories) {
      const dirPath = path.join(this.projectRoot, dir);
      try {
        await fs.access(dirPath);
      } catch (e) {
        this.analysis.issues.push(`Missing required directory: ${dir}`);
        this.analysis.recommendations.push(`Create ${dir} directory with proper structure`);
      }
    }

    // Check for critical matrices
    const matrices = ['DEVICE_MATRIX.csv', 'CLUSTER_MATRIX.csv', 'COMPATIBILITY_MATRIX.csv'];
    for (const matrix of matrices) {
      const matrixPath = path.join(this.projectRoot, 'matrices', matrix);
      try {
        await fs.access(matrixPath);
      } catch (e) {
        this.analysis.issues.push(`Missing matrix: ${matrix}`);
        this.analysis.recommendations.push(`Generate ${matrix} from community data`);
      }
    }

    console.log(`✅ ${this.analysis.issues.length} issues identifiés`);
  }

  async generateComprehensiveReport() {
    console.log('📊 Génération du rapport complet...');

    const report = {
      timestamp: new Date().toISOString(),
      project_overview: {
        total_files: this.countTotalFiles(),
        total_drivers: Object.keys(this.analysis.drivers).length,
        total_scripts: Object.keys(this.analysis.scripts).length,
        issues_count: this.analysis.issues.length,
        recommendations_count: this.analysis.recommendations.length
      },
      structure_analysis: this.analysis.structure,
      file_analysis: this.analysis.files,
      driver_analysis: this.analysis.drivers,
      script_analysis: this.analysis.scripts,
      issues_identified: this.analysis.issues,
      recommendations: this.analysis.recommendations,
      next_phase_priorities: this.generateNextPhasePriorities()
    };

    // Save comprehensive report
    const reportPath = path.join(this.projectRoot, 'analysis-results', 'mega-project-analysis-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate summary
    console.log('\n📋 RÉSUMÉ DE L\'ANALYSE MEGA:');
    console.log(`📁 Fichiers totaux: ${report.project_overview.total_files}`);
    console.log(`🚗 Drivers analysés: ${report.project_overview.total_drivers}`);
    console.log(`🔧 Scripts analysés: ${report.project_overview.total_scripts}`);
    console.log(`❌ Issues identifiés: ${report.project_overview.issues_count}`);
    console.log(`💡 Recommandations: ${report.project_overview.recommendations_count}`);
    console.log(`📄 Rapport complet: analysis-results/mega-project-analysis-report.json`);

    return report;
  }

  countTotalFiles() {
    let count = 0;

    const countFiles = (node) => {
      if (node.type === 'file') {
        count++;
      }
      if (node.children) {
        node.children.forEach(countFiles);
      }
    };

    countFiles(this.analysis.structure);
    return count;
  }

  generateNextPhasePriorities() {
    const priorities = [
      'Phase 2: Enhanced source harvesting with NLP analysis',
      'Phase 2: Update referentials and matrices with community data',
      'Phase 3: Recursive script execution and optimization',
      'Phase 3: Driver enrichment with Johan Benz style images',
      'Phase 3: Homey validation until zero red errors',
      'Phase 4: Final verification and publication'
    ];

    // Add specific priorities based on analysis
    if (this.analysis.issues.length > 0) {
      priorities.unshift('URGENT: Fix identified structural issues');
    }

    const incompleteDrivers = Object.values(this.analysis.drivers).filter(d => d.issues.length > 0);
    if (incompleteDrivers.length > 0) {
      priorities.splice(1, 0, `HIGH: Complete ${incompleteDrivers.length} incomplete drivers`);
    }

    const problematicScripts = Object.values(this.analysis.scripts).filter(s => s.hasErrors);
    if (problematicScripts.length > 0) {
      priorities.splice(2, 0, `HIGH: Fix ${problematicScripts.length} problematic scripts`);
    }

    return priorities;
  }
}

// Main execution
async function main() {
  const analyzer = new MegaProjectAnalyzer();
  await analyzer.performMegaAnalysis();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MegaProjectAnalyzer };
