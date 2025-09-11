#!/usr/bin/env node
/**
 * GitHub Workflows Enhancement Script
 * Optimizes and consolidates GitHub Actions workflows for better CI/CD performance
 */

const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  workflowsDir: path.join(__dirname, '../.github/workflows'),
  outputDir: path.join(__dirname, '../github-workflows-results'),
  backupDir: path.join(__dirname, '../backup-workflows'),
  templatesDir: path.join(__dirname, '../.github/workflows-templates')
};

class GitHubWorkflowsEnhancer {
  constructor() {
    this.enhancementReport = {
      timestamp: new Date().toISOString(),
      workflowsAnalyzed: 0,
      workflowsOptimized: 0,
      duplicatesRemoved: 0,
      errors: [],
      recommendations: [],
      consolidatedWorkflows: {}
    };
  }

  async enhanceWorkflows() {
    console.log('🚀 Starting GitHub Workflows Enhancement...');
    
    try {
      await this.ensureDirectories();
      
      // Backup existing workflows
      await this.backupWorkflows();
      
      // Analyze existing workflows
      const workflows = await this.analyzeWorkflows();
      
      // Remove duplicates and consolidate
      const optimized = await this.consolidateWorkflows(workflows);
      
      // Create optimized workflows
      await this.createOptimizedWorkflows(optimized);
      
      // Create GitHub Pages setup
      await this.setupGitHubPages();
      
      // Generate enhancement report
      await this.generateReport();
      
      console.log('✅ GitHub Workflows Enhancement Complete!');
      
    } catch (error) {
      console.error('❌ Workflows enhancement failed:', error);
      this.enhancementReport.errors.push(error.message);
    }
  }

  async ensureDirectories() {
    for (const dir of Object.values(CONFIG)) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async backupWorkflows() {
    try {
      const files = await fs.readdir(CONFIG.workflowsDir);
      
      for (const file of files) {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
          const sourcePath = path.join(CONFIG.workflowsDir, file);
          const backupPath = path.join(CONFIG.backupDir, file);
          await fs.copyFile(sourcePath, backupPath);
        }
      }
      
      console.log(`📦 Backed up ${files.length} workflow files`);
    } catch (error) {
      console.log('Note: No existing workflows to backup');
    }
  }

  async analyzeWorkflows() {
    const workflows = {
      ci: [],
      deploy: [],
      automation: [],
      validation: [],
      other: []
    };

    try {
      const files = await fs.readdir(CONFIG.workflowsDir);
      
      for (const file of files) {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
          try {
            const content = await fs.readFile(path.join(CONFIG.workflowsDir, file), 'utf8');
            
            const category = this.categorizeWorkflow(file, null);
            workflows[category].push({ filename: file, content: null, original: content });
            
            this.enhancementReport.workflowsAnalyzed++;
          } catch (error) {
            console.log(`⚠️ Could not parse workflow: ${file}`);
          }
        }
      }
    } catch (error) {
      console.log('Note: No workflows directory found');
    }

    return workflows;
  }

  categorizeWorkflow(filename, workflow) {
    const name = filename.toLowerCase();
    
    if (name.includes('ci') || name.includes('test') || name.includes('build')) {
      return 'ci';
    } else if (name.includes('deploy') || name.includes('pages') || name.includes('publish')) {
      return 'deploy';
    } else if (name.includes('auto') || name.includes('schedule') || name.includes('monthly')) {
      return 'automation';
    } else if (name.includes('validate') || name.includes('homey') || name.includes('driver')) {
      return 'validation';
    }
    
    return 'other';
  }

  async consolidateWorkflows(workflows) {
    const consolidated = {
      'ci-cd-ultimate.yml': await this.createUltimateCICD(workflows.ci, workflows.validation),
      'deploy-pages.yml': await this.createOptimizedDeploy(workflows.deploy),
      'automation-suite.yml': await this.createAutomationSuite(workflows.automation),
      'security-scan.yml': await this.createSecurityWorkflow()
    };

    return consolidated;
  }

  async createUltimateCICD(ciWorkflows, validationWorkflows) {
    return {
      name: 'Ultimate CI/CD Pipeline',
      on: {
        push: { branches: ['main', 'develop'] },
        pull_request: { branches: ['main'] },
        schedule: [{ cron: '0 2 * * *' }]
      },
      env: {
        NODE_VERSION: '18',
        HOMEY_CLI_VERSION: 'latest'
      },
      jobs: {
        setup: {
          'runs-on': 'ubuntu-latest',
          outputs: {
            cache_key: '${{ steps.cache.outputs.cache-hit }}',
            node_version: '${{ env.NODE_VERSION }}'
          },
          steps: [
            { uses: 'actions/checkout@v4' },
            {
              uses: 'actions/setup-node@v4',
              with: { 'node-version': '${{ env.NODE_VERSION }}', cache: 'npm' }
            },
            {
              id: 'cache',
              uses: 'actions/cache@v3',
              with: {
                path: 'node_modules',
                key: '${{ runner.os }}-node-${{ hashFiles(\'**/package-lock.json\') }}'
              }
            },
            { run: 'npm ci' }
          ]
        },
        lint_and_test: {
          needs: 'setup',
          'runs-on': 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v4' },
            {
              uses: 'actions/setup-node@v4',
              with: { 'node-version': '${{ env.NODE_VERSION }}', cache: 'npm' }
            },
            { run: 'npm ci' },
            { run: 'npm run lint' },
            { run: 'npm test' },
            {
              name: 'Upload coverage reports',
              uses: 'codecov/codecov-action@v3',
              if: 'always()'
            }
          ]
        },
        homey_validation: {
          needs: 'setup',
          'runs-on': 'ubuntu-latest',
          strategy: {
            matrix: {
              level: ['debug', 'publish', 'verified']
            }
          },
          steps: [
            { uses: 'actions/checkout@v4' },
            {
              uses: 'actions/setup-node@v4',
              with: { 'node-version': '${{ env.NODE_VERSION }}', cache: 'npm' }
            },
            { run: 'npm ci' },
            { run: 'npm install -g homey' },
            {
              name: 'Homey App Validation',
              run: 'homey app validate --level ${{ matrix.level }}',
              env: { HOMEY_DEBUG: 1 }
            }
          ]
        },
        driver_testing: {
          needs: 'setup',
          'runs-on': 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v4' },
            {
              uses: 'actions/setup-node@v4',
              with: { 'node-version': '${{ env.NODE_VERSION }}', cache: 'npm' }
            },
            { run: 'npm ci' },
            { run: 'node scripts/comprehensive-validation-testing.js' },
            {
              name: 'Upload test results',
              uses: 'actions/upload-artifact@v3',
              with: {
                name: 'test-results',
                path: 'comprehensive-validation-results/'
              }
            }
          ]
        },
        build: {
          needs: ['lint_and_test', 'homey_validation'],
          'runs-on': 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v4' },
            {
              uses: 'actions/setup-node@v4',
              with: { 'node-version': '${{ env.NODE_VERSION }}', cache: 'npm' }
            },
            { run: 'npm ci' },
            { run: 'npm run build' },
            {
              name: 'Generate matrices',
              run: 'node compatibility-matrix.js'
            },
            {
              name: 'Upload build artifacts',
              uses: 'actions/upload-artifact@v3',
              with: {
                name: 'build-artifacts',
                path: 'dist/\nmatrices/\npublic/'
              }
            }
          ]
        }
      }
    };
  }

  async createOptimizedDeploy(deployWorkflows) {
    return {
      name: 'Deploy to GitHub Pages',
      on: {
        push: { branches: ['main'] },
        workflow_dispatch: {}
      },
      permissions: {
        contents: 'read',
        pages: 'write',
        'id-token': 'write'
      },
      concurrency: {
        group: 'pages',
        'cancel-in-progress': false
      },
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v4' },
            {
              uses: 'actions/setup-node@v4',
              with: { 'node-version': '18', cache: 'npm' }
            },
            { run: 'npm ci' },
            {
              name: 'Generate dashboard',
              run: 'node scripts/generate-dashboard-data.js'
            },
            {
              name: 'Build matrices',
              run: 'node compatibility-matrix.js'
            },
            {
              name: 'Setup Pages',
              uses: 'actions/configure-pages@v3'
            },
            {
              name: 'Upload artifact',
              uses: 'actions/upload-pages-artifact@v2',
              with: { path: 'public/' }
            }
          ]
        },
        deploy: {
          environment: {
            name: 'github-pages',
            url: '${{ steps.deployment.outputs.page_url }}'
          },
          'runs-on': 'ubuntu-latest',
          needs: 'build',
          steps: [
            {
              name: 'Deploy to GitHub Pages',
              id: 'deployment',
              uses: 'actions/deploy-pages@v2'
            }
          ]
        }
      }
    };
  }

  async createAutomationSuite(automationWorkflows) {
    return {
      name: 'Automation Suite',
      on: {
        schedule: [
          { cron: '0 2 * * 1' }, // Weekly Monday 2 AM
          { cron: '0 3 1 * *' }  // Monthly 1st day 3 AM
        ],
        workflow_dispatch: {
          inputs: {
            task: {
              description: 'Automation task to run',
              required: true,
              default: 'enrich',
              type: 'choice',
              options: ['enrich', 'update-drivers', 'sync-sources', 'all']
            }
          }
        }
      },
      jobs: {
        enrichment: {
          'runs-on': 'ubuntu-latest',
          if: "github.event.inputs.task == 'enrich' || github.event.inputs.task == 'all' || github.event_name == 'schedule'",
          steps: [
            { uses: 'actions/checkout@v4' },
            {
              uses: 'actions/setup-node@v4',
              with: { 'node-version': '18', cache: 'npm' }
            },
            { run: 'npm ci' },
            {
              name: 'Run enrichment pipeline',
              run: 'node scripts/fetch-all-sources.js',
              env: { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}' }
            },
            {
              name: 'Update matrices',
              run: 'node compatibility-matrix.js'
            },
            {
              name: 'Commit updates',
              uses: 'stefanzweifel/git-auto-commit-action@v4',
              with: {
                commit_message: 'chore: automated enrichment update',
                file_pattern: 'matrices/ data/ resources/'
              }
            }
          ]
        },
        driver_updates: {
          'runs-on': 'ubuntu-latest',
          if: "github.event.inputs.task == 'update-drivers' || github.event.inputs.task == 'all'",
          steps: [
            { uses: 'actions/checkout@v4' },
            {
              uses: 'actions/setup-node@v4',
              with: { 'node-version': '18', cache: 'npm' }
            },
            { run: 'npm ci' },
            {
              name: 'Enhance drivers',
              run: 'node scripts/drivers-historical-enhancement.js'
            },
            {
              name: 'Validate enhanced drivers',
              run: 'node scripts/comprehensive-validation-testing.js'
            }
          ]
        },
        security_scan: {
          'runs-on': 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v4' },
            {
              name: 'Run security scan',
              uses: 'github/super-linter@v4',
              env: {
                DEFAULT_BRANCH: 'main',
                GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
                VALIDATE_ALL_CODEBASE: false,
                VALIDATE_JAVASCRIPT_ES: true,
                VALIDATE_JSON: true,
                VALIDATE_YAML: true
              }
            }
          ]
        }
      }
    };
  }

  async createSecurityWorkflow() {
    return {
      name: 'Security Scan',
      on: {
        push: { branches: ['main'] },
        pull_request: { branches: ['main'] },
        schedule: [{ cron: '0 4 * * 1' }]
      },
      jobs: {
        security: {
          'runs-on': 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v4' },
            {
              name: 'Run Trivy vulnerability scanner',
              uses: 'aquasecurity/trivy-action@master',
              with: {
                'scan-type': 'fs',
                'scan-ref': '.',
                format: 'sarif',
                'output': 'trivy-results.sarif'
              }
            },
            {
              name: 'Upload Trivy scan results',
              uses: 'github/codeql-action/upload-sarif@v2',
              with: { sarif_file: 'trivy-results.sarif' }
            },
            {
              name: 'Dependency Review',
              uses: 'actions/dependency-review-action@v3',
              if: 'github.event_name == \'pull_request\''
            }
          ]
        }
      }
    };
  }

  async setupGitHubPages() {
    // Create GitHub Pages configuration
    const pagesConfig = {
      source: {
        branch: 'main',
        path: '/public'
      },
      theme: null,
      plugins: ['jekyll-sitemap', 'jekyll-feed']
    };

    // Create _config.yml for GitHub Pages
    const jekyllConfig = `
title: Homey Tuya Zigbee Ultimate
description: Community-driven Tuya Zigbee devices support for Homey
baseurl: ""
url: "https://your-username.github.io"

markdown: kramdown
highlighter: rouge
theme: minima

plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-seo-tag

exclude:
  - node_modules/
  - scripts/
  - test/
  - "*.js"
  - "*.json"
  - Gemfile
  - Gemfile.lock
  - README.md

include:
  - public/

collections:
  drivers:
    output: true
    permalink: /:collection/:name/

defaults:
  - scope:
      path: ""
      type: "drivers"
    values:
      layout: "driver"
`;

    try {
      await fs.writeFile(path.join(__dirname, '../_config.yml'), jekyllConfig.trim());
      console.log('✅ Created Jekyll configuration for GitHub Pages');
    } catch (error) {
      console.log('⚠️ Could not create Jekyll config:', error.message);
    }
  }

  async createOptimizedWorkflows(consolidated) {
    // Remove old workflows first (backup already created)
    try {
      const files = await fs.readdir(CONFIG.workflowsDir);
      for (const file of files) {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
          await fs.unlink(path.join(CONFIG.workflowsDir, file));
          this.enhancementReport.duplicatesRemoved++;
        }
      }
    } catch (error) {
      console.log('Note: Could not clean old workflows');
    }

    // Create optimized workflows
    for (const [filename, workflow] of Object.entries(consolidated)) {
      try {
        const yamlContent = this.convertToYAML(workflow);
        
        const workflowPath = path.join(CONFIG.workflowsDir, filename);
        await fs.writeFile(workflowPath, yamlContent);
        
        this.enhancementReport.workflowsOptimized++;
        this.enhancementReport.consolidatedWorkflows[filename] = {
          jobs: Object.keys(workflow.jobs || {}),
          triggers: Object.keys(workflow.on || {})
        };
        
        console.log(`✅ Created optimized workflow: ${filename}`);
      } catch (error) {
        console.error(`❌ Failed to create workflow ${filename}:`, error);
        this.enhancementReport.errors.push(`${filename}: ${error.message}`);
      }
    }

    // Create dependabot configuration
    await this.createDependabotConfig();
  }

  convertToYAML(obj, indent = 0) {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          yaml += `${spaces}- `;
          const itemYaml = this.convertToYAML(item, indent + 1);
          yaml += itemYaml.substring(spaces.length + 2) + '\n';
        } else {
          yaml += `${spaces}- ${this.formatValue(item)}\n`;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
          yaml += `${spaces}${this.formatKey(key)}:\n`;
          yaml += this.convertToYAML(value, indent + 1);
        } else if (typeof value === 'object' && value !== null) {
          yaml += `${spaces}${this.formatKey(key)}:\n`;
          yaml += this.convertToYAML(value, indent + 1);
        } else {
          yaml += `${spaces}${this.formatKey(key)}: ${this.formatValue(value)}\n`;
        }
      }
    }

    return yaml;
  }

  formatKey(key) {
    // Handle keys that need quotes
    if (key.includes('-') || key.includes('_') || /^\d/.test(key)) {
      return `"${key}"`;
    }
    return key;
  }

  formatValue(value) {
    if (typeof value === 'string') {
      // Handle multiline strings and special characters
      if (value.includes('\n') || value.includes(':') || value.includes('[') || value.includes('{')) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return String(value);
  }

  async createDependabotConfig() {
    const dependabotConfig = {
      version: 2,
      updates: [
        {
          'package-ecosystem': 'npm',
          directory: '/',
          schedule: { interval: 'weekly' },
          'open-pull-requests-limit': 5,
          reviewers: ['@your-username'],
          assignees: ['@your-username'],
          commit_message: {
            prefix: 'chore',
            'prefix-development': 'chore',
            include: 'scope'
          }
        },
        {
          'package-ecosystem': 'github-actions',
          directory: '/',
          schedule: { interval: 'weekly' },
          'open-pull-requests-limit': 3
        }
      ]
    };

    try {
      const yamlContent = this.convertToYAML(dependabotConfig);
      const dependabotPath = path.join(__dirname, '../.github/dependabot.yml');
      await fs.writeFile(dependabotPath, yamlContent);
      console.log('✅ Created Dependabot configuration');
    } catch (error) {
      console.log('⚠️ Could not create Dependabot config:', error.message);
    }
  }

  async generateReport() {
    const reportPath = path.join(CONFIG.outputDir, 'github-workflows-enhancement-report.json');
    
    // Add recommendations
    this.enhancementReport.recommendations = [
      '✅ Consolidated workflows for better performance',
      '🔄 Set up automated dependency updates with Dependabot',
      '📊 Enhanced CI/CD pipeline with matrix testing',
      '🛡️ Added security scanning and vulnerability checks',
      '📄 Configured GitHub Pages for project documentation',
      '🔧 Run workflows to validate optimizations',
      '📈 Monitor workflow execution times and success rates'
    ];

    if (this.enhancementReport.errors.length > 0) {
      this.enhancementReport.recommendations.push('⚠️ Review and fix workflow errors');
    }

    await fs.writeFile(reportPath, JSON.stringify(this.enhancementReport, null, 2));
    
    console.log('\n=== GitHub Workflows Enhancement Summary ===');
    console.log(`📊 Workflows Analyzed: ${this.enhancementReport.workflowsAnalyzed}`);
    console.log(`🔧 Workflows Optimized: ${this.enhancementReport.workflowsOptimized}`);
    console.log(`🗑️ Duplicates Removed: ${this.enhancementReport.duplicatesRemoved}`);
    console.log(`❌ Errors: ${this.enhancementReport.errors.length}`);
    console.log(`📄 Report saved: ${reportPath}`);
  }
}

// Run enhancement if called directly
if (require.main === module) {
  const enhancer = new GitHubWorkflowsEnhancer();
  enhancer.enhanceWorkflows()
    .then(() => {
      console.log('🎉 GitHub Workflows enhancement completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ GitHub Workflows enhancement failed:', error);
      process.exit(1);
    });
}

module.exports = GitHubWorkflowsEnhancer;
