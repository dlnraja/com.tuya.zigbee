#!/usr/bin/env node

/**
 * Script to generate a detailed test coverage report for Tuya Zigbee drivers
 * Analyzes test coverage and generates a markdown report
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const chalk = require('chalk');
const table = require('markdown-table');
const glob = require('glob');
const { promisify: p } = require('util');

const readFile = p(fs.readFile);
const writeFile = p(fs.writeFile);
const readdir = p(fs.readdir);
const stat = p(fs.stat);
const globPromise = p(glob);
const execPromise = p(exec);

// Configuration
const COVERAGE_DIR = path.join(__dirname, '..', 'coverage');
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const REPORT_PATH = path.join(COVERAGE_DIR, 'COVERAGE-REPORT.md');
const IGNORE_PATTERNS = ['**/node_modules/**', '**/test/**', '**/*.test.js', '**/*.spec.js'];

// Coverage thresholds
const COVERAGE_THRESHOLDS = {
  statements: 80,
  branches: 70,
  functions: 75,
  lines: 80
};

// Color thresholds
const COLOR_THRESHOLDS = {
  high: 90,   // Green
  medium: 70, // Yellow
  low: 0      // Red
};

// Helper functions
const formatPercentage = (value, type = 'statements') => {
  const percentage = Math.round((value || 0) * 100) / 100;
  const threshold = COVERAGE_THRESHOLDS[type] || COVERAGE_THRESHOLDS.statements;
  
  if (percentage >= threshold * 1.1) {
    return { 
      formatted: chalk.green.bold(`${percentage}%`),
      raw: percentage,
      status: 'excellent'
    };
  } else if (percentage >= threshold) {
    return { 
      formatted: chalk.green(`${percentage}%`),
      raw: percentage,
      status: 'good'
    };
  } else if (percentage >= threshold * 0.8) {
    return { 
      formatted: chalk.yellow(`${percentage}%`),
      raw: percentage,
      status: 'needs_improvement'
    };
  }
  return { 
    formatted: chalk.red.bold(`${percentage}%`),
    raw: percentage,
    status: 'poor'
  };
};

const getStatusEmoji = (status) => {
  const emojis = {
    excellent: '✅',
    good: '✓',
    needs_improvement: '⚠️',
    poor: '❌'
  };
  return emojis[status] || '';
};

const getDriverName = (filePath) => {
  const parts = filePath.split(path.sep);
  const driverName = parts[parts.length - 1].replace(/\.js$/, '');
  return driverName.replace(/([A-Z])/g, ' $1').trim();
};

const getFileSize = async (filePath) => {
  try {
    const stats = await stat(filePath);
    return stats.size;
  } catch (err) {
    return 0;
  }
};

const getFileCoverage = async (filePath) => {
  try {
    const content = await readFile(filePath, 'utf8');
    const coverageData = JSON.parse(content);
    
    return Object.entries(coverageData).reduce((acc, [file, data]) => {
      if (file === 'total') return acc;
      
      const summary = data.summary;
      acc[file] = {
        statements: summary.statements.pct,
        branches: summary.branches.pct,
        functions: summary.functions.pct,
        lines: summary.lines.pct,
        filePath: file
      };
      
      return acc;
    }, {});
  } catch (err) {
    console.error(chalk.red(`Error reading coverage file: ${filePath}`), err);
    return {};
  }
};

const generateDriverCoverageTable = async (coverageData) => {
  // Group by driver
  const driverData = {};
  
  for (const [filePath, data] of Object.entries(coverageData)) {
    const driverName = getDriverName(filePath);
    
    if (!driverData[driverName]) {
      driverData[driverName] = {
        files: [],
        statements: [],
        branches: [],
        functions: [],
        lines: []
      };
    }
    
    driverData[driverName].files.push(filePath);
    driverData[driverName].statements.push(data.statements || 0);
    driverData[driverName].branches.push(data.branches || 0);
    driverData[driverName].functions.push(data.functions || 0);
    driverData[driverName].lines.push(data.lines || 0);
  }

  // Calculate averages for each driver
  const driverRows = [
    [
      'Driver',
      'Files',
      'Statements',
      'Branches',
      'Functions',
      'Lines',
      'Status'
    ]
  ];

  for (const [driverName, data] of Object.entries(driverData)) {
    const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
    
    const statements = avg(data.statements);
    const branches = avg(data.branches);
    const functions = avg(data.functions);
    const lines = avg(data.lines);
    
    const minCoverage = Math.min(statements, branches, functions, lines);
    const status = minCoverage >= COVERAGE_THRESHOLDS.statements
      ? '✅ Passed'
      : minCoverage >= COVERAGE_THRESHOLDS.statements * 0.8
        ? '⚠️ Needs Improvement'
        : '❌ Needs Work';

    driverRows.push([
      `**${driverName}**`,
      data.files.length,
      formatPercentage(statements).formatted,
      formatPercentage(branches).formatted,
      formatPercentage(functions).formatted,
      formatPercentage(lines).formatted,
      status
    ]);
  }

  return table(driverRows, {
    align: ['l', 'c', 'c', 'c', 'c', 'c', 'c'],
    stringLength: (str) => chalk.stripColor(str).length
  });
};

const generateFileCoverageTable = (coverageData) => {
  // Sort files by lowest coverage
  const files = Object.entries(coverageData)
    .sort(([, a], [, b]) => {
      const aMin = Math.min(a.statements, a.branches, a.functions, a.lines);
      const bMin = Math.min(b.statements, b.branches, b.functions, b.lines);
      return aMin - bMin;
    });

  // Generate table rows
  const rows = [
    [
      'File',
      'Statements',
      'Branches',
      'Functions',
      'Lines',
      'Status'
    ]
  ];

  for (const [file, data] of files) {
    const stmtCov = formatPercentage(data.statements, 'statements');
    const branchCov = formatPercentage(data.branches, 'branches');
    const funcCov = formatPercentage(data.functions, 'functions');
    const lineCov = formatPercentage(data.lines, 'lines');
    
    const minCoverage = Math.min(
      stmtCov.raw,
      branchCov.raw,
      funcCov.raw,
      lineCov.raw
    );

    const status = minCoverage >= COVERAGE_THRESHOLDS.statements
      ? '✅ Passed'
      : minCoverage >= COVERAGE_THRESHOLDS.statements * 0.8
        ? '⚠️ Needs Improvement'
        : '❌ Needs Work';

    rows.push([
      `\`${file}\``,
      stmtCov.formatted,
      branchCov.formatted,
      funcCov.formatted,
      lineCov.formatted,
      status
    ]);
  }

  return table(rows, {
    align: ['l', 'r', 'r', 'r', 'r', 'c'],
    stringLength: (str) => chalk.stripColor(str).length
  });
};

const generateSummary = (coverageData) => {
  const fileCount = Object.keys(coverageData).length;
  const stats = {
    statements: { total: 0, covered: 0 },
    branches: { total: 0, covered: 0 },
    functions: { total: 0, covered: 0 },
    lines: { total: 0, covered: 0 },
  };

  // Calculate totals
  Object.values(coverageData).forEach((fileData) => {
    stats.statements.covered += fileData.statements || 0;
    stats.branches.covered += fileData.branches || 0;
    stats.functions.covered += fileData.functions || 0;
    stats.lines.covered += fileData.lines || 0;
    
    stats.statements.total += 100;
    stats.branches.total += 100;
    stats.functions.total += 100;
    stats.lines.total += 100;
  });

  // Calculate percentages
  const summary = {
    statements: (stats.statements.covered / (stats.statements.total || 1)) * 100,
    branches: (stats.branches.covered / (stats.branches.total || 1)) * 100,
    functions: (stats.functions.covered / (stats.functions.total || 1)) * 100,
    lines: (stats.lines.covered / (stats.lines.total || 1)) * 100,
  };

  // Generate summary table with emoji indicators
  const stmtCov = formatPercentage(summary.statements, 'statements');
  const branchCov = formatPercentage(summary.branches, 'branches');
  const funcCov = formatPercentage(summary.functions, 'functions');
  const lineCov = formatPercentage(summary.lines, 'lines');

  const summaryTable = table([
    ['Category', 'Coverage', 'Status', 'Target'],
    [
      'Statements',
      stmtCov.formatted,
      getStatusEmoji(stmtCov.status),
      `${COVERAGE_THRESHOLDS.statements}%`
    ],
    [
      'Branches',
      branchCov.formatted,
      getStatusEmoji(branchCov.status),
      `${COVERAGE_THRESHOLDS.branches}%`
    ],
    [
      'Functions',
      funcCov.formatted,
      getStatusEmoji(funcCov.status),
      `${COVERAGE_THRESHOLDS.functions}%`
    ],
    [
      'Lines',
      lineCov.formatted,
      getStatusEmoji(lineCov.status),
      `${COVERAGE_THRESHOLDS.lines}%`
    ]
  ], {
    align: ['l', 'r', 'c', 'c']
  });

  return {
    summary,
    markdown: `## 📊 Test Coverage Summary (${fileCount} files)\n\n${summaryTable}\n`
  };
};

const getUntestedFiles = async (coverageData) => {
  const allJsFiles = await globPromise('**/*.js', { 
    cwd: process.cwd(),
    ignore: IGNORE_PATTERNS,
    nodir: true
  });
  
  const coveredFiles = new Set(Object.keys(coverageData));
  const untestedFiles = allJsFiles.filter(file => !coveredFiles.has(file));
  
  // Get file sizes for untested files
  const untestedFilesWithSize = await Promise.all(
    untestedFiles.map(async (file) => {
      const size = await getFileSize(file);
      return { file, size };
    })
  );
  
  // Sort by size (largest first)
  return untestedFilesWithSize.sort((a, b) => b.size - a.size);
};

const generateReport = async () => {
  console.log(chalk.blue('\n🔍 Generating test coverage report...\n'));

  try {
    // Ensure coverage directory exists
    if (!fs.existsSync(COVERAGE_DIR)) {
      console.log(chalk.yellow('Coverage directory not found. Running tests first...'));
      await execPromise('npm run test:coverage');
    }

    // Find coverage file
    const coverageFile = path.join(COVERAGE_DIR, 'coverage-summary.json');
    if (!fs.existsSync(coverageFile)) {
      throw new Error('Coverage file not found. Run tests with coverage first.');
    }

    // Get coverage data
    const coverageData = await getFileCoverage(coverageFile);
    const fileCount = Object.keys(coverageData).length;
    
    if (fileCount === 0) {
      throw new Error('No coverage data found.');
    }

    // Generate report sections
    const { summary, markdown: summaryMarkdown } = generateSummary(coverageData);
    const driverCoverageTable = await generateDriverCoverageTable(coverageData);
    const fileCoverageTable = generateFileCoverageTable(coverageData);
    
    // Get untested files
    const untestedFiles = await getUntestedFiles(coverageData);
    const untestedFilesList = untestedFiles
      .map(({ file, size }) => `- \`${file}\` (${(size / 1024).toFixed(2)} KB)`)
      .join('\n');

    // Calculate quality metrics
    const totalFiles = fileCount + untestedFiles.length;
    const testCoveragePercentage = Math.round((fileCount / totalFiles) * 100);
    
    // Generate quality badges
    const coverageBadge = `![Coverage](https://img.shields.io/badge/Coverage-${testCoveragePercentage}%25-${testCoveragePercentage >= 80 ? 'brightgreen' : testCoveragePercentage >= 50 ? 'yellow' : 'red'})`;
    const qualityBadge = `![Quality](https://img.shields.io/badge/Quality-${summary.lines >= 80 ? 'A' : summary.lines >= 60 ? 'B' : 'C'}%2B-${summary.lines >= 80 ? 'brightgreen' : summary.lines >= 60 ? 'yellow' : 'red'})`;

    // Generate report markdown
    const report = `# 🧪 Tuya Zigbee Drivers Test Coverage Report

${coverageBadge} ${qualityBadge}

*Generated at: ${new Date().toISOString()}*  
*Coverage Thresholds: Statements ${COVERAGE_THRESHOLDS.statements}%, Branches ${COVERAGE_THRESHOLDS.branches}%, Functions ${COVERAGE_THRESHOLDS.functions}%, Lines ${COVERAGE_THRESHOLDS.lines}%*

## 📋 Summary

${summaryMarkdown}

## 📊 Driver Coverage

This section shows coverage aggregated by driver.

${driverCoverageTable}

## 📑 File Coverage

This section shows coverage for each individual file.

${fileCoverageTable}

## 📦 Untested Files

The following ${untestedFiles.length} files have no test coverage:

${untestedFilesList || 'All files have test coverage! 🎉'}

## 📈 Next Steps

- **❌ Red items** need immediate attention
- **⚠️ Yellow items** could use improvement
- **✓ Green items** meet the minimum coverage requirements
- **✅ Excellent coverage** exceeds 110% of the minimum threshold

## 🎯 Recommendations

1. Focus on files with the lowest coverage first
2. Add unit tests for untested files
3. Improve branch coverage by adding test cases for all code paths
4. Consider adding integration tests for critical paths

## 📝 Notes

- This report is generated automatically by the test coverage script
- To update this report, run: \`npm run test:coverage\`
- Coverage is measured using [Istanbul/nyc](https://istanbul.js.org/)
`;

    // Write report to file
    await writeFile(REPORT_PATH, report);
    
    console.log(chalk.green(`\n✅ Coverage report generated: ${REPORT_PATH}`));
    
    // Check if coverage meets thresholds
    const meetsThresholds = 
      summary.statements >= COVERAGE_THRESHOLDS.statements &&
      summary.branches >= COVERAGE_THRESHOLDS.branches &&
      summary.functions >= COVERAGE_THRESHOLDS.functions &&
      summary.lines >= COVERAGE_THRESHOLDS.lines;
    
    if (!meetsThresholds) {
      console.log(chalk.yellow('\n⚠️  Warning: Some coverage metrics are below the defined thresholds.\n'));
      process.exit(1);
    }
    
    return report;
  } catch (err) {
    console.error(chalk.red('\n❌ Error generating coverage report:'), err.message);
    process.exit(1);
  }
};

// Run the report generation
generateReport();
