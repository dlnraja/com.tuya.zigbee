#!/usr/bin/env node

/**
 * 🧠 INTELLIGENT KNOWLEDGE EXTRACTOR v1.0.0
 *
 * Extraction intelligente de solutions depuis sources gratuites:
 * - Web scraping intelligent forums/docs
 * - Analyse automatique GitHub issues similaires
 * - Extraction knowledge base Zigbee2MQTT/ZHA
 * - Pattern matching solutions existantes
 * - Base de données solutions auto-updatable
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { Octokit } = require('@octokit/rest');

class IntelligentKnowledgeExtractor {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      request: { timeout: 30000 }
    });

    this.config = {
      knowledgeSources: {
        homeyForum: 'https://community.homey.app',
        zigbee2mqtt: 'https://www.zigbee2mqtt.io',
        zhaQuirks: 'https://github.com/zigpy/zha-device-handlers',
        blakadder: 'https://blakadder.com/zigbee',
        githubRepos: [
          'Koenkk/zigbee2mqtt',
          'zigpy/zha-device-handlers',
          'JohanBendz/com.tuya.zigbee',
          'dlnraja/com.tuya.zigbee'
        ]
      },
      solutionPatterns: {
        batteryFix: /battery.*report|power.*config|bind.*power/i,
        pairingFix: /pair|reset.*device|factory.*reset/i,
        driverFix: /driver.*update|manufacturerId|productId/i,
        configFix: /cluster|capability|endpoint/i
      },
      cacheFile: path.join(process.cwd(), 'project-data', 'KNOWLEDGE_CACHE.json'),
      solutionsFile: path.join(process.cwd(), 'project-data', 'AUTO_SOLUTIONS.json')
    };

    this.knowledgeCache = new Map();
    this.solutions = new Map();
  }

  /**
   * 🕷️ Extraire solutions depuis forums
   */
  async extractFromForums(problemKeywords) {
    try {
      console.log('🕷️ Extracting solutions from community forums...');

      const solutions = [];

      // Recherche Homey Community Forum
      const homeyResults = await this.searchHomeyCommunity(problemKeywords);
      solutions.push(...homeyResults);

      // Recherche Zigbee2MQTT docs/issues
      const z2mResults = await this.searchZigbee2MQTT(problemKeywords);
      solutions.push(...z2mResults);

      return solutions;

    } catch (error) {
      console.error('❌ Error extracting from forums:', error.message);
      return [];
    }
  }

  /**
   * 🏠 Recherche Homey Community
   */
  async searchHomeyCommunity(keywords) {
    try {
      const solutions = [];
      const searchUrl = `https://community.homey.app/search?q=${encodeURIComponent(keywords.join(' '))}`;

      const response = await axios.get(searchUrl, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HomeyBot/1.0)' }
      });

      const $ = cheerio.load(response.data);

      // Extraire discussions pertinentes
      $('.search-result').each((i, element) => {
        const title = $(element).find('.title').text().trim();
        const excerpt = $(element).find('.excerpt').text().trim();
        const link = $(element).find('a').attr('href');

        if (title && excerpt) {
          // Analyser si c'est une solution
          const isSolution = this.analyzeSolutionContent(title + ' ' + excerpt);
          if (isSolution.confidence > 0.6) {
            solutions.push({
              source: 'homey-community',
              title,
              excerpt,
              link: `https://community.homey.app${link}`,
              confidence: isSolution.confidence,
              category: isSolution.category,
              extractedAt: new Date().toISOString()
            });
          }
        }
      });

      return solutions.slice(0, 10); // Limiter à 10 résultats

    } catch (error) {
      console.log('⚠️ Homey Community search failed:', error.message);
      return [];
    }
  }

  /**
   * 📡 Recherche Zigbee2MQTT
   */
  async searchZigbee2MQTT(keywords) {
    try {
      const solutions = [];

      // Rechercher dans la DB devices Z2M
      const devicesUrl = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt/master/lib/devices.js';
      const response = await axios.get(devicesUrl, { timeout: 10000 });

      const deviceData = response.data;

      // Extraire configurations pour devices similaires
      for (const keyword of keywords) {
        const matches = [...deviceData.matchAll(new RegExp(`${keyword}[^}]+}`, 'gi'))];

        for (const match of matches.slice(0, 5)) {
          try {
            const deviceConfig = match[0];
            const solution = this.extractZ2MDeviceConfig(deviceConfig, keyword);
            if (solution) {
              solutions.push({
                source: 'zigbee2mqtt',
                device: keyword,
                config: solution,
                confidence: 0.8,
                category: 'deviceConfiguration',
                extractedAt: new Date().toISOString()
              });
            }
          } catch (error) {
            // Ignorer erreurs parsing individuel
          }
        }
      }

      return solutions;

    } catch (error) {
      console.log('⚠️ Zigbee2MQTT search failed:', error.message);
      return [];
    }
  }

  /**
   * 🔍 Analyser contenu solution
   */
  analyzeSolutionContent(content) {
    const analysis = {
      confidence: 0,
      category: 'unknown',
      indicators: []
    };

    // Indicateurs de solutions
    const solutionIndicators = [
      { pattern: /solved|fixed|solution|resolved/i, weight: 0.3, category: 'solution' },
      { pattern: /try.*this|do.*this|use.*this/i, weight: 0.2, category: 'instruction' },
      { pattern: /worked.*for.*me|success|thanks.*it.*work/i, weight: 0.25, category: 'confirmation' },
      { pattern: /driver.*update|new.*version/i, weight: 0.2, category: 'driverFix' },
      { pattern: /battery.*config|power.*report/i, weight: 0.25, category: 'batteryFix' },
      { pattern: /pair.*again|reset.*device/i, weight: 0.2, category: 'pairingFix' }
    ];

    for (const indicator of solutionIndicators) {
      if (indicator.pattern.test(content)) {
        analysis.confidence += indicator.weight;
        analysis.indicators.push(indicator.category);

        if (indicator.category !== 'solution' && indicator.category !== 'instruction' && indicator.category !== 'confirmation') {
          analysis.category = indicator.category;
        }
      }
    }

    // Pénalités pour contenu non-solution
    if (/help.*me|need.*help|problem|error.*still/i.test(content)) {
      analysis.confidence -= 0.2;
    }

    analysis.confidence = Math.max(0, Math.min(1, analysis.confidence));
    return analysis;
  }

  /**
   * 🔧 Extraire config Z2M device
   */
  extractZ2MDeviceConfig(deviceConfigString, deviceId) {
    try {
      // Pattern extraction basique config Z2M
      const config = {};

      // Extraire exposes
      const exposesMatch = deviceConfigString.match(/exposes:\s*\[([\s\S]*?)\]/);
      if (exposesMatch) {
        config.exposes = exposesMatch[1];
      }

      // Extraire configure function
      const configureMatch = deviceConfigString.match(/configure:\s*(async\s*)?\([^{]+\)\s*=>\s*{([\s\S]*?)}/);
      if (configureMatch) {
        config.configure = configureMatch[2];
      }

      // Extraire meta
      const metaMatch = deviceConfigString.match(/meta:\s*{([^}]+)}/);
      if (metaMatch) {
        config.meta = metaMatch[1];
      }

      return Object.keys(config).length > 0 ? config : null;

    } catch (error) {
      return null;
    }
  }

  /**
   * 📚 Recherche issues GitHub similaires
   */
  async findSimilarGitHubIssues(problemText, deviceId) {
    try {
      console.log('📚 Searching similar GitHub issues...');

      const allSolutions = [];

      for (const repoFullName of this.config.knowledgeSources.githubRepos) {
        const [owner, repo] = repoFullName.split('/');

        try {
          // Recherche issues fermées avec solutions
          const searchQuery = `repo:${repoFullName} is:issue is:closed ${deviceId || ''} ${problemText.slice(0, 50)}`;

          const { data: searchResults } = await this.octokit.rest.search.issuesAndPullRequests({
            q: searchQuery,
            per_page: 10
          });

          for (const issue of searchResults.items) {
            if (issue.comments > 0) {
              // Analyser commentaires pour solutions
              const solution = await this.extractSolutionFromIssue(owner, repo, issue.number);
              if (solution) {
                allSolutions.push({
                  source: 'github-issue',
                  repo: repoFullName,
                  issue: issue.number,
                  title: issue.title,
                  solution,
                  confidence: solution.confidence,
                  extractedAt: new Date().toISOString()
                });
              }
            }
          }

        } catch (error) {
          console.log(`⚠️ Error searching ${repoFullName}:`, error.message);
        }
      }

      return allSolutions.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('❌ Error finding similar GitHub issues:', error.message);
      return [];
    }
  }

  /**
   * 💬 Extraire solution depuis issue GitHub
   */
  async extractSolutionFromIssue(owner, repo, issueNumber) {
    try {
      const { data: comments } = await this.octokit.rest.issues.listComments({
        owner, repo, issue_number: issueNumber,
        per_page: 20
      });

      let bestSolution = null;
      let highestConfidence = 0;

      for (const comment of comments) {
        const analysis = this.analyzeSolutionContent(comment.body);

        if (analysis.confidence > highestConfidence) {
          highestConfidence = analysis.confidence;
          bestSolution = {
            confidence: analysis.confidence,
            category: analysis.category,
            text: comment.body,
            author: comment.user.login,
            date: comment.created_at
          };
        }
      }

      return bestSolution;

    } catch (error) {
      return null;
    }
  }

  /**
   * 🧩 Générer solution automatique
   */
  async generateAutomaticSolution(problemAnalysis, extractedKnowledge) {
    try {
      console.log('🧩 Generating automatic solution...');

      const solution = {
        category: problemAnalysis.category,
        confidence: 0,
        steps: [],
        codeChanges: [],
        userInstructions: [],
        sources: []
      };

      // Combiner knowledge sources
      const relevantKnowledge = extractedKnowledge
        .filter(k => k.confidence > 0.5)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      for (const knowledge of relevantKnowledge) {
        solution.sources.push({
          source: knowledge.source,
          confidence: knowledge.confidence,
          title: knowledge.title || knowledge.device
        });

        // Extraire étapes actionables
        if (knowledge.solution?.text) {
          const steps = this.extractActionableSteps(knowledge.solution.text);
          solution.steps.push(...steps);
        }

        if (knowledge.config) {
          // Convertir config Z2M en Homey
          const homeyChanges = this.convertZ2MToHomey(knowledge.config);
          solution.codeChanges.push(...homeyChanges);
        }
      }

      // Calculer confidence globale
      solution.confidence = relevantKnowledge.length > 0
        ? relevantKnowledge.reduce((sum, k) => sum + k.confidence, 0) / relevantKnowledge.length
        : 0;

      // Générer instructions utilisateur
      solution.userInstructions = this.generateUserInstructions(solution);

      return solution;

    } catch (error) {
      console.error('❌ Error generating automatic solution:', error.message);
      return null;
    }
  }

  /**
   * 📝 Extraire étapes actionables
   */
  extractActionableSteps(text) {
    const steps = [];
    const actionPatterns = [
      /try\s+(\w+ing\s+[^.!?]+)/gi,
      /you\s+(need\s+to|should|can)\s+([^.!?]+)/gi,
      /step\s*\d+[:\s]*([^.!?]+)/gi,
      /\d+\.\s*([^.!?]+)/gi
    ];

    for (const pattern of actionPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        if (match[1] && match[1].length > 10 && match[1].length < 200) {
          steps.push({
            action: match[1].trim(),
            source: 'extracted',
            confidence: 0.7
          });
        }
      }
    }

    return steps.slice(0, 5); // Limiter à 5 steps
  }

  /**
   * 🔄 Convertir config Z2M vers Homey
   */
  convertZ2MToHomey(z2mConfig) {
    const homeyChanges = [];

    if (z2mConfig.configure) {
      // Extraire bindings
      const bindingMatch = z2mConfig.configure.match(/bind\([^,]+,\s*[^,]+,\s*\[([^\]]+)\]/);
      if (bindingMatch) {
        const bindings = bindingMatch[1].split(',').map(b => b.trim().replace(/'/g, ''));
        homeyChanges.push({
          type: 'add_bindings',
          bindings: bindings,
          confidence: 0.8
        });
      }

      // Extraire configure reporting
      const reportingMatch = z2mConfig.configure.match(/configureReporting\([^,]+,\s*([^)]+)\)/);
      if (reportingMatch) {
        homeyChanges.push({
          type: 'add_reporting',
          config: reportingMatch[1],
          confidence: 0.7
        });
      }
    }

    return homeyChanges;
  }

  /**
   * 👤 Générer instructions utilisateur
   */
  generateUserInstructions(solution) {
    const instructions = [];

    if (solution.category === 'batteryFix') {
      instructions.push('Re-pair your device to apply new battery reporting configuration');
      instructions.push('Press a button on your device to wake it up and trigger battery reading');
    }

    if (solution.category === 'pairingFix') {
      instructions.push('Reset your device according to manufacturer instructions');
      instructions.push('Try pairing again in Homey');
    }

    if (solution.steps.length > 0) {
      instructions.push('Follow these additional steps:');
      instructions.push(...solution.steps.slice(0, 3).map(s => `- ${s.action}`));
    }

    return instructions;
  }

  /**
   * 💾 Sauvegarder knowledge cache
   */
  async saveKnowledgeCache() {
    try {
      const dataDir = path.dirname(this.config.cacheFile);
      await fs.mkdir(dataDir, { recursive: true });

      const cacheData = {
        lastUpdate: new Date().toISOString(),
        knowledge: Array.from(this.knowledgeCache.entries()),
        solutions: Array.from(this.solutions.entries())
      };

      await fs.writeFile(this.config.cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Knowledge cache saved to ${this.config.cacheFile}`);

    } catch (error) {
      console.error('❌ Error saving knowledge cache:', error.message);
    }
  }

  /**
   * 📖 Charger knowledge cache
   */
  async loadKnowledgeCache() {
    try {
      const cacheData = JSON.parse(await fs.readFile(this.config.cacheFile, 'utf8'));

      this.knowledgeCache = new Map(cacheData.knowledge || []);
      this.solutions = new Map(cacheData.solutions || []);

      console.log(`📖 Loaded ${this.knowledgeCache.size} cached knowledge entries`);

    } catch (error) {
      console.log('⚠️ No existing knowledge cache found, starting fresh');
    }
  }

  /**
   * 🚀 Exécution principale
   */
  async execute(problemText, deviceId = null) {
    try {
      console.log('🧠 INTELLIGENT KNOWLEDGE EXTRACTOR');
      console.log('===================================');

      await this.loadKnowledgeCache();

      // Extraire keywords du problème
      const keywords = problemText.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && !/^(and|the|for|with|this|that)$/.test(word))
        .slice(0, 5);

      if (deviceId) keywords.unshift(deviceId);

      console.log(`🔍 Searching for: ${keywords.join(', ')}`);

      // Recherches parallèles
      const [forumSolutions, githubSolutions] = await Promise.all([
        this.extractFromForums(keywords),
        this.findSimilarGitHubIssues(problemText, deviceId)
      ]);

      const allKnowledge = [...forumSolutions, ...githubSolutions];

      // Générer solution automatique
      const solution = await this.generateAutomaticSolution({ category: 'general' }, allKnowledge);

      // Sauvegarder cache
      this.knowledgeCache.set(keywords.join('_'), {
        knowledge: allKnowledge,
        solution,
        timestamp: new Date().toISOString()
      });

      await this.saveKnowledgeCache();

      console.log('\n📊 KNOWLEDGE EXTRACTION RESULTS');
      console.log('================================');
      console.log(`🕷️ Forum solutions found: ${forumSolutions.length}`);
      console.log(`📚 GitHub solutions found: ${githubSolutions.length}`);
      console.log(`🧩 Solution confidence: ${solution ? Math.round(solution.confidence * 100) : 0}%`);

      return {
        keywords,
        forumSolutions,
        githubSolutions,
        solution,
        totalKnowledge: allKnowledge.length
      };

    } catch (error) {
      console.error('❌ Knowledge extraction failed:', error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const extractor = new IntelligentKnowledgeExtractor();
  const problemText = process.argv[2] || 'battery not reporting device offline';
  const deviceId = process.argv[3] || null;

  extractor.execute(problemText, deviceId)
    .then(results => {
      console.log('🎉 Knowledge extraction completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Knowledge extraction failed:', error);
      process.exit(1);
    });
}

module.exports = IntelligentKnowledgeExtractor;
