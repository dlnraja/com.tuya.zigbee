#!/usr/bin/env node
/**
 * NLP Content Analysis Script
 * Performs intelligent analysis of all content, files, and commit messages
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  projectDir: path.join(__dirname, '..'),
  outputDir: path.join(__dirname, '../nlp-analysis-results'),
  docsDir: path.join(__dirname, '../docs'),
  driversDir: path.join(__dirname, '../drivers'),
  scriptsDir: path.join(__dirname, '../scripts')
};

class NLPContentAnalyzer {
  constructor() {
    this.analysisReport = {
      timestamp: new Date().toISOString(),
      filesAnalyzed: 0,
      commitsAnalyzed: 0,
      keywordsExtracted: 0,
      sentimentScores: {},
      topicClusters: [],
      improvementSuggestions: [],
      contentInsights: {},
      errors: []
    };

    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their'
    ]);

    this.tuyaKeywords = new Set([
      'tuya', 'zigbee', 'device', 'driver', 'sensor', 'switch', 'light', 'bulb', 'plug', 'thermostat', 'temperature', 'humidity', 'battery', 'motion', 'door', 'window', 'water', 'leak', 'smoke', 'fire', 'alarm', 'climate', 'cover', 'blind', 'curtain', 'energy', 'power', 'voltage', 'current', 'cluster', 'endpoint', 'attribute', 'capability', 'onoff', 'dim', 'brightness', 'color', 'hue', 'saturation'
    ]);
  }

  async analyzeContent() {
    console.log('🤖 Starting NLP Content Analysis...');
    
    try {
      await this.ensureDirectories();
      
      // Analyze project files
      await this.analyzeProjectFiles();
      
      // Analyze commit messages
      await this.analyzeCommitMessages();
      
      // Extract topics and clusters
      await this.extractTopicClusters();
      
      // Generate improvement suggestions
      await this.generateImprovementSuggestions();
      
      // Perform sentiment analysis
      await this.performSentimentAnalysis();
      
      await this.generateReport();
      console.log('✅ NLP Content Analysis Complete!');
      
    } catch (error) {
      console.error('❌ NLP Analysis failed:', error);
      this.analysisReport.errors.push(error.message);
    }
  }

  async ensureDirectories() {
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
  }

  async analyzeProjectFiles() {
    console.log('📄 Analyzing project files...');
    
    const fileTypes = ['.md', '.js', '.json', '.txt', '.yml', '.yaml'];
    const filesToAnalyze = await this.findFilesToAnalyze(CONFIG.projectDir, fileTypes);
    
    this.analysisReport.contentInsights = {
      documentation: {},
      code: {},
      configuration: {},
      metadata: {}
    };

    for (const filePath of filesToAnalyze) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const relativePath = path.relative(CONFIG.projectDir, filePath);
        const fileType = this.categorizeFile(relativePath);
        
        const analysis = await this.analyzeFileContent(content, relativePath);
        this.analysisReport.contentInsights[fileType][relativePath] = analysis;
        
        this.analysisReport.filesAnalyzed++;
      } catch (error) {
        console.log(`Note: Could not analyze file ${filePath}`);
      }
    }
  }

  async findFilesToAnalyze(dir, extensions, files = []) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip certain directories
          if (!['node_modules', '.git', 'dist', 'build', '.backup-central'].includes(entry.name)) {
            await this.findFilesToAnalyze(fullPath, extensions, files);
          }
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    
    return files;
  }

  categorizeFile(relativePath) {
    if (relativePath.includes('docs/') || relativePath.endsWith('.md')) {
      return 'documentation';
    } else if (relativePath.endsWith('.js') || relativePath.includes('scripts/')) {
      return 'code';
    } else if (relativePath.endsWith('.json') || relativePath.endsWith('.yml') || relativePath.endsWith('.yaml')) {
      return 'configuration';
    }
    return 'metadata';
  }

  async analyzeFileContent(content, fileName) {
    const analysis = {
      wordCount: 0,
      lineCount: 0,
      keywords: [],
      complexity: 0,
      readability: 0,
      topics: [],
      sentiment: 'neutral',
      suggestions: []
    };

    try {
      const lines = content.split('\n');
      analysis.lineCount = lines.length;
      
      const words = this.extractWords(content);
      analysis.wordCount = words.length;
      
      // Extract keywords
      analysis.keywords = this.extractKeywords(words);
      this.analysisReport.keywordsExtracted += analysis.keywords.length;
      
      // Calculate complexity
      analysis.complexity = this.calculateComplexity(content, fileName);
      
      // Extract topics
      analysis.topics = this.extractTopics(words);
      
      // Basic sentiment analysis
      analysis.sentiment = this.analyzeSentiment(content);
      
      // Generate suggestions
      analysis.suggestions = this.generateFileSuggestions(content, fileName, analysis);
      
    } catch (error) {
      console.log(`Note: Could not fully analyze content for ${fileName}`);
    }

    return analysis;
  }

  extractWords(content) {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.has(word));
  }

  extractKeywords(words) {
    const frequency = {};
    
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
    
    // Sort by frequency and return top keywords
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, freq]) => ({ word, frequency: freq }));
  }

  calculateComplexity(content, fileName) {
    let complexity = 0;
    
    if (fileName.endsWith('.js')) {
      // JavaScript complexity
      const asyncCount = (content.match(/async\s+/g) || []).length;
      const promiseCount = (content.match(/\.then\(|\.catch\(|Promise\./g) || []).length;
      const classCount = (content.match(/class\s+\w+/g) || []).length;
      const functionCount = (content.match(/function\s+\w+|=>\s*{|\w+\s*\(/g) || []).length;
      
      complexity = asyncCount * 2 + promiseCount * 1.5 + classCount * 3 + functionCount * 1;
    } else if (fileName.endsWith('.json')) {
      // JSON complexity (nesting depth)
      const depth = this.calculateJSONDepth(content);
      complexity = depth * 2;
    } else {
      // General text complexity
      const sentences = content.split(/[.!?]+/).length;
      const words = content.split(/\s+/).length;
      complexity = words > 0 ? sentences / words * 100 : 0;
    }
    
    return Math.round(complexity);
  }

  calculateJSONDepth(jsonString) {
    try {
      const obj = JSON.parse(jsonString);
      return this.getObjectDepth(obj);
    } catch {
      return 0;
    }
  }

  getObjectDepth(obj) {
    if (typeof obj !== 'object' || obj === null) return 0;
    
    let maxDepth = 0;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const depth = this.getObjectDepth(obj[key]);
        maxDepth = Math.max(maxDepth, depth);
      }
    }
    return maxDepth + 1;
  }

  extractTopics(words) {
    const topics = [];
    
    // Device-related topics
    const deviceWords = words.filter(word => 
      ['sensor', 'switch', 'light', 'plug', 'thermostat', 'bulb', 'device'].includes(word)
    );
    if (deviceWords.length > 0) topics.push('devices');
    
    // Technical topics
    const techWords = words.filter(word => 
      ['zigbee', 'cluster', 'endpoint', 'attribute', 'capability', 'driver'].includes(word)
    );
    if (techWords.length > 0) topics.push('technical');
    
    // Configuration topics
    const configWords = words.filter(word => 
      ['config', 'settings', 'options', 'parameters', 'manifest'].includes(word)
    );
    if (configWords.length > 0) topics.push('configuration');
    
    return topics;
  }

  analyzeSentiment(content) {
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'amazing', 'successful', 'working', 'fixed', 'improved', 'enhanced', 'optimized'];
    const negativeWords = ['bad', 'error', 'failed', 'broken', 'issue', 'problem', 'bug', 'wrong', 'missing', 'deprecated'];
    
    const words = content.toLowerCase().split(/\s+/);
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const word of words) {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    }
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  generateFileSuggestions(content, fileName, analysis) {
    const suggestions = [];
    
    if (fileName.endsWith('.md')) {
      if (analysis.wordCount < 100) {
        suggestions.push('Consider expanding documentation with more details');
      }
      if (!content.includes('##')) {
        suggestions.push('Add section headers to improve structure');
      }
      if (!content.includes('```')) {
        suggestions.push('Include code examples for better clarity');
      }
    } else if (fileName.endsWith('.js')) {
      if (analysis.complexity > 50) {
        suggestions.push('Consider refactoring to reduce complexity');
      }
      if (!content.includes('/**')) {
        suggestions.push('Add JSDoc comments for better documentation');
      }
      if (content.includes('console.log') && !fileName.includes('test')) {
        suggestions.push('Replace console.log with proper logging');
      }
    } else if (fileName.endsWith('.json')) {
      if (analysis.complexity > 10) {
        suggestions.push('Consider breaking down complex JSON structure');
      }
    }
    
    // Tuya-specific suggestions
    if (content.includes('tuya') || content.includes('zigbee')) {
      if (!content.includes('manufacturerName')) {
        suggestions.push('Ensure manufacturer names are properly configured');
      }
      if (content.includes('_TZ') && !content.includes('capability')) {
        suggestions.push('Define device capabilities for Tuya devices');
      }
    }
    
    return suggestions;
  }

  async analyzeCommitMessages() {
    console.log('📝 Analyzing commit messages...');
    
    try {
      const gitLog = execSync('git log --oneline --no-merges -n 100', { 
        cwd: CONFIG.projectDir,
        encoding: 'utf8' 
      });
      
      const commits = gitLog.split('\n').filter(line => line.trim());
      this.analysisReport.commitsAnalyzed = commits.length;
      
      const commitAnalysis = {
        types: {},
        patterns: [],
        sentiment: {},
        topics: []
      };
      
      for (const commit of commits) {
        const message = commit.substring(8); // Remove hash
        
        // Extract commit type (conventional commits)
        const typeMatch = message.match(/^(feat|fix|docs|style|refactor|test|chore|perf)(\(.+\))?: /);
        if (typeMatch) {
          const type = typeMatch[1];
          commitAnalysis.types[type] = (commitAnalysis.types[type] || 0) + 1;
        }
        
        // Analyze sentiment
        const sentiment = this.analyzeSentiment(message);
        commitAnalysis.sentiment[sentiment] = (commitAnalysis.sentiment[sentiment] || 0) + 1;
        
        // Extract topics
        const words = this.extractWords(message);
        const topics = this.extractTopics(words);
        commitAnalysis.topics.push(...topics);
      }
      
      this.analysisReport.contentInsights.commits = commitAnalysis;
      
    } catch (error) {
      console.log('Note: Could not analyze git history');
    }
  }

  async extractTopicClusters() {
    console.log('🎯 Extracting topic clusters...');
    
    // Collect all keywords from all files
    const allKeywords = [];
    
    for (const category of Object.values(this.analysisReport.contentInsights)) {
      for (const fileAnalysis of Object.values(category)) {
        if (fileAnalysis.keywords) {
          allKeywords.push(...fileAnalysis.keywords.map(k => k.word));
        }
      }
    }
    
    // Group related keywords into clusters
    const clusters = this.clusterKeywords(allKeywords);
    this.analysisReport.topicClusters = clusters;
  }

  clusterKeywords(keywords) {
    const clusters = [];
    const frequency = {};
    
    // Count frequency
    for (const keyword of keywords) {
      frequency[keyword] = (frequency[keyword] || 0) + 1;
    }
    
    // Create clusters based on semantic similarity
    const deviceCluster = {
      name: 'Device Types',
      keywords: [],
      relevance: 0
    };
    
    const techCluster = {
      name: 'Technical Implementation',
      keywords: [],
      relevance: 0
    };
    
    const configCluster = {
      name: 'Configuration',
      keywords: [],
      relevance: 0
    };
    
    for (const [keyword, freq] of Object.entries(frequency)) {
      if (['sensor', 'switch', 'light', 'plug', 'thermostat', 'device', 'bulb'].includes(keyword)) {
        deviceCluster.keywords.push({ word: keyword, frequency: freq });
        deviceCluster.relevance += freq;
      } else if (['zigbee', 'cluster', 'endpoint', 'driver', 'capability', 'attribute'].includes(keyword)) {
        techCluster.keywords.push({ word: keyword, frequency: freq });
        techCluster.relevance += freq;
      } else if (['config', 'settings', 'manifest', 'json', 'compose'].includes(keyword)) {
        configCluster.keywords.push({ word: keyword, frequency: freq });
        configCluster.relevance += freq;
      }
    }
    
    // Sort keywords within clusters by frequency
    [deviceCluster, techCluster, configCluster].forEach(cluster => {
      cluster.keywords.sort((a, b) => b.frequency - a.frequency);
      cluster.keywords = cluster.keywords.slice(0, 10); // Top 10
    });
    
    return [deviceCluster, techCluster, configCluster]
      .filter(cluster => cluster.keywords.length > 0)
      .sort((a, b) => b.relevance - a.relevance);
  }

  async generateImprovementSuggestions() {
    console.log('💡 Generating improvement suggestions...');
    
    const suggestions = [];
    
    // Documentation improvements
    const docFiles = this.analysisReport.contentInsights.documentation || {};
    const docCount = Object.keys(docFiles).length;
    
    if (docCount < 5) {
      suggestions.push({
        category: 'Documentation',
        priority: 'high',
        suggestion: 'Expand documentation coverage - add more comprehensive guides',
        impact: 'Improves user adoption and developer experience'
      });
    }
    
    // Code quality improvements
    const codeFiles = this.analysisReport.contentInsights.code || {};
    let avgComplexity = 0;
    let complexityCount = 0;
    
    for (const analysis of Object.values(codeFiles)) {
      if (analysis.complexity) {
        avgComplexity += analysis.complexity;
        complexityCount++;
      }
    }
    
    if (complexityCount > 0) {
      avgComplexity /= complexityCount;
      if (avgComplexity > 30) {
        suggestions.push({
          category: 'Code Quality',
          priority: 'medium',
          suggestion: 'Refactor complex code sections for better maintainability',
          impact: 'Reduces bugs and improves development velocity'
        });
      }
    }
    
    // Configuration improvements
    const configFiles = this.analysisReport.contentInsights.configuration || {};
    let missingManufacturers = 0;
    
    for (const [fileName, analysis] of Object.entries(configFiles)) {
      if (fileName.includes('driver.compose.json') && analysis.suggestions) {
        if (analysis.suggestions.some(s => s.includes('manufacturer'))) {
          missingManufacturers++;
        }
      }
    }
    
    if (missingManufacturers > 0) {
      suggestions.push({
        category: 'Device Support',
        priority: 'high',
        suggestion: 'Complete manufacturer name configurations for all drivers',
        impact: 'Improves device detection and compatibility'
      });
    }
    
    // Tuya-specific improvements
    const tuyaKeywordCount = Object.values(this.analysisReport.contentInsights)
      .flat()
      .map(analysis => Object.values(analysis))
      .flat()
      .filter(analysis => analysis.keywords)
      .reduce((count, analysis) => {
        return count + analysis.keywords.filter(k => this.tuyaKeywords.has(k.word)).length;
      }, 0);
    
    if (tuyaKeywordCount > 50) {
      suggestions.push({
        category: 'Tuya Integration',
        priority: 'medium',
        suggestion: 'Enhance Tuya-specific features and documentation',
        impact: 'Better support for Tuya ecosystem devices'
      });
    }
    
    this.analysisReport.improvementSuggestions = suggestions;
  }

  async performSentimentAnalysis() {
    console.log('😊 Performing sentiment analysis...');
    
    const sentiments = { positive: 0, negative: 0, neutral: 0 };
    
    // Analyze all file sentiments
    for (const category of Object.values(this.analysisReport.contentInsights)) {
      for (const analysis of Object.values(category)) {
        if (analysis.sentiment) {
          sentiments[analysis.sentiment]++;
        }
      }
    }
    
    this.analysisReport.sentimentScores = sentiments;
  }

  async generateReport() {
    const reportPath = path.join(CONFIG.outputDir, 'nlp-content-analysis-report.json');
    
    // Calculate statistics
    const totalFiles = this.analysisReport.filesAnalyzed;
    const totalSuggestions = this.analysisReport.improvementSuggestions.length;
    const topCluster = this.analysisReport.topicClusters[0];
    
    // Add summary
    this.analysisReport.summary = {
      filesAnalyzed: totalFiles,
      commitsAnalyzed: this.analysisReport.commitsAnalyzed,
      keywordsExtracted: this.analysisReport.keywordsExtracted,
      improvementSuggestions: totalSuggestions,
      topTopic: topCluster ? topCluster.name : 'Unknown',
      overallSentiment: this.getOverallSentiment(),
      analysisDepth: this.calculateAnalysisDepth()
    };
    
    await fs.writeFile(reportPath, JSON.stringify(this.analysisReport, null, 2));
    
    console.log('\n=== NLP Content Analysis Summary ===');
    console.log(`📄 Files Analyzed: ${totalFiles}`);
    console.log(`📝 Commits Analyzed: ${this.analysisReport.commitsAnalyzed}`);
    console.log(`🔑 Keywords Extracted: ${this.analysisReport.keywordsExtracted}`);
    console.log(`💡 Improvement Suggestions: ${totalSuggestions}`);
    console.log(`🎯 Top Topic: ${topCluster ? topCluster.name : 'N/A'}`);
    console.log(`😊 Overall Sentiment: ${this.getOverallSentiment()}`);
    console.log(`📄 Report saved: ${reportPath}`);
  }

  getOverallSentiment() {
    const { positive, negative, neutral } = this.analysisReport.sentimentScores;
    const total = positive + negative + neutral;
    
    if (total === 0) return 'Unknown';
    
    const positiveRatio = positive / total;
    const negativeRatio = negative / total;
    
    if (positiveRatio > negativeRatio + 0.1) return 'Positive';
    if (negativeRatio > positiveRatio + 0.1) return 'Negative';
    return 'Neutral';
  }

  calculateAnalysisDepth() {
    const hasTopics = this.analysisReport.topicClusters.length > 0;
    const hasSuggestions = this.analysisReport.improvementSuggestions.length > 0;
    const hasCommitAnalysis = this.analysisReport.commitsAnalyzed > 0;
    const hasKeywords = this.analysisReport.keywordsExtracted > 0;
    
    const depth = [hasTopics, hasSuggestions, hasCommitAnalysis, hasKeywords]
      .filter(Boolean).length;
    
    return ['Shallow', 'Basic', 'Moderate', 'Deep'][depth] || 'Unknown';
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new NLPContentAnalyzer();
  analyzer.analyzeContent()
    .then(() => {
      console.log('🎉 NLP Content Analysis completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ NLP Content Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = NLPContentAnalyzer;
