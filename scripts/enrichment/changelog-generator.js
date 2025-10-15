/**
 * CHANGELOG GENERATOR - User-Friendly Messages
 * Transforme commits techniques en messages utilisateur professionnels
 */

const { sanitizeHomeyChangelog } = require('./sanitize.js');

/**
 * Mapping commits techniques → Messages utilisateur
 */
const CHANGELOG_PATTERNS = {
  // Features
  'feat:': {
    keywords: ['enrich', 'device', 'support', 'driver'],
    message: 'New device support and enhanced compatibility'
  },
  'feat: workflow': {
    keywords: ['workflow', 'automation', 'github'],
    message: 'Enhanced automation system for faster updates'
  },
  'feat: image': {
    keywords: ['image', 'icon', 'visual'],
    message: 'Updated device icons for better visual clarity'
  },
  'feat: sanitiz': {
    keywords: ['sanitiz', 'character', 'international'],
    message: 'Improved internationalization and special character support'
  },
  
  // Fixes
  'fix:': {
    keywords: ['bug', 'error', 'issue', 'problem'],
    message: 'Bug fixes and stability improvements'
  },
  'fix: image': {
    keywords: ['image', 'icon', 'visual', 'display'],
    message: 'Image optimization and visual improvements'
  },
  'fix: driver': {
    keywords: ['driver', 'device', 'capability'],
    message: 'Driver improvements and bug fixes'
  },
  
  // Chores
  'chore:': {
    keywords: ['workflow', 'build', 'publish', 'ci'],
    message: 'System optimization for improved performance'
  },
  'chore: version': {
    keywords: ['version', 'bump'],
    message: 'Version update with improvements'
  },
  
  // Docs
  'docs:': {
    keywords: ['doc', 'readme', 'guide'],
    message: 'Documentation improvements and enhanced user guides'
  },
  
  // Performance
  'perf:': {
    keywords: ['performance', 'speed', 'optimize'],
    message: 'Performance optimization for faster response'
  },
  
  // Refactor
  'refactor:': {
    keywords: ['refactor', 'clean', 'reorganize'],
    message: 'Code improvements and optimization'
  },
  
  // Tests
  'test:': {
    keywords: ['test', 'validation'],
    message: 'Enhanced testing and validation'
  }
};

/**
 * Détecte le type de changement et génère message user-friendly
 */
function generateUserFriendlyMessage(commitMessage) {
  const lowerMsg = commitMessage.toLowerCase();
  
  // Check each pattern
  for (const [pattern, config] of Object.entries(CHANGELOG_PATTERNS)) {
    if (lowerMsg.includes(pattern.toLowerCase())) {
      // Check keywords for more specific match
      const hasKeyword = config.keywords.some(kw => lowerMsg.includes(kw));
      if (hasKeyword) {
        return config.message;
      }
    }
  }
  
  // Fallback based on commit type prefix
  if (lowerMsg.startsWith('feat')) {
    return 'New features and improvements';
  }
  if (lowerMsg.startsWith('fix')) {
    return 'Bug fixes and stability improvements';
  }
  if (lowerMsg.startsWith('chore')) {
    return 'System optimization and performance improvements';
  }
  if (lowerMsg.startsWith('docs')) {
    return 'Documentation improvements';
  }
  
  // Generic fallback
  return 'Improvements and bug fixes';
}

/**
 * Génère changelog professionnel depuis liste de commits
 */
function generateChangelogFromCommits(commits) {
  if (!commits || commits.length === 0) {
    return 'Performance and stability improvements';
  }
  
  // Analyser les commits
  const messages = new Set();
  const categories = {
    features: [],
    fixes: [],
    improvements: [],
    docs: []
  };
  
  commits.forEach(commit => {
    const msg = commit.message || commit;
    const userMsg = generateUserFriendlyMessage(msg);
    
    // Catégoriser
    if (msg.toLowerCase().includes('feat')) {
      categories.features.push(userMsg);
    } else if (msg.toLowerCase().includes('fix')) {
      categories.fixes.push(userMsg);
    } else if (msg.toLowerCase().includes('doc')) {
      categories.docs.push(userMsg);
    } else {
      categories.improvements.push(userMsg);
    }
    
    messages.add(userMsg);
  });
  
  // Construire message final
  let changelog = '';
  
  if (categories.features.length > 0) {
    changelog += categories.features[0];
  } else if (categories.fixes.length > 0) {
    changelog += categories.fixes[0];
  } else if (categories.improvements.length > 0) {
    changelog += categories.improvements[0];
  } else {
    changelog = 'Performance and stability improvements';
  }
  
  // Sanitize pour Homey
  return sanitizeHomeyChangelog(changelog, 400);
}

/**
 * Génère changelog mensuel automatique
 */
function generateMonthlyChangelog() {
  const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  
  const changelog = `Monthly enrichment ${month}: Enhanced device database with latest definitions, improved compatibility, and updated manufacturer IDs`;
  
  return sanitizeHomeyChangelog(changelog, 400);
}

/**
 * Exemples de génération
 */
const EXAMPLES = {
  technical: [
    'feat: système sanitization universel pour caractères spéciaux',
    'fix: désactivation workflows obsolètes',
    'chore: bump version to v2.0.12'
  ],
  userFriendly: [
    'Improved internationalization and special character support',
    'System optimization for improved performance',
    'Version update with improvements'
  ]
};

module.exports = {
  generateUserFriendlyMessage,
  generateChangelogFromCommits,
  generateMonthlyChangelog,
  CHANGELOG_PATTERNS,
  EXAMPLES
};

// Test si exécuté directement
if (require.main === module) {
  console.log('🎨 CHANGELOG GENERATOR - Tests\n');
  
  EXAMPLES.technical.forEach((tech, i) => {
    console.log(`Technical: ${tech}`);
    console.log(`User-Friendly: ${generateUserFriendlyMessage(tech)}`);
    console.log(`Expected: ${EXAMPLES.userFriendly[i]}`);
    console.log('');
  });
  
  console.log('Monthly Changelog:');
  console.log(generateMonthlyChangelog());
}
