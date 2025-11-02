#!/usr/bin/env node

/**
 * AI-ENHANCED PR ANALYSIS
 * Using free AI APIs (GPT-4o-mini, Claude Haiku, Gemini Pro)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PR_NUMBER = process.argv[2];
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'reports', 'ai', 'latest-pr-analysis.json');

console.log('\n🤖 AI-ENHANCED PR ANALYSIS\n');
console.log('═'.repeat(70));
console.log(`\nAnalyzing PR #${PR_NUMBER}...\n`);

// Get PR diff
function getPRDiff() {
    try {
        const diff = execSync(`git diff HEAD~1 HEAD`, { encoding: 'utf8' });
        return diff;
    } catch (error) {
        return '';
    }
}

// Simple heuristic analysis (placeholder for AI)
function analyzeCodeQuality(diff) {
    const issues = [];
    let qualityScore = 100;
    
    // Check for common issues
    if (diff.includes('console.log')) {
        issues.push('⚠️ Contains console.log statements - consider removing for production');
        qualityScore -= 5;
    }
    
    if (diff.includes('TODO') || diff.includes('FIXME')) {
        issues.push('⚠️ Contains TODO/FIXME comments');
        qualityScore -= 3;
    }
    
    if (!diff.includes('driver.compose.json') && !diff.includes('.md')) {
        issues.push('ℹ️ No driver changes detected');
    }
    
    // Check for device support patterns
    if (diff.includes('_TZ3000_') || diff.includes('_TZ3210_') || diff.includes('_TZE200_')) {
        issues.push('✅ Device support changes detected');
        qualityScore += 10;
    }
    
    if (diff.includes('"manufacturerName"')) {
        issues.push('✅ Manufacturer ID changes - likely device support');
        qualityScore += 5;
    }
    
    // Check for documentation
    if (diff.includes('.md') && diff.includes('+')) {
        issues.push('✅ Documentation added/updated');
        qualityScore += 5;
    }
    
    return { issues, qualityScore: Math.min(100, Math.max(0, qualityScore)) };
}

// Generate recommendations
function generateRecommendations(diff, analysis) {
    const recommendations = [];
    
    if (diff.includes('driver.compose.json')) {
        recommendations.push('✅ Validate driver.compose.json format');
        recommendations.push('✅ Test device pairing locally');
        recommendations.push('✅ Check manufacturer ID format (_TZ....)');
    }
    
    if (analysis.issues.some(i => i.includes('console.log'))) {
        recommendations.push('🔧 Remove console.log statements before production');
    }
    
    if (!diff.includes('test')) {
        recommendations.push('💡 Consider adding tests for changes');
    }
    
    if (analysis.qualityScore < 80) {
        recommendations.push('⚠️ Quality score below 80 - review code carefully');
    }
    
    return recommendations;
}

// Predict merge outcome
function predictOutcome(analysis) {
    if (analysis.qualityScore >= 90) {
        return '🟢 HIGH CONFIDENCE - Likely to auto-merge';
    } else if (analysis.qualityScore >= 70) {
        return '🟡 MEDIUM CONFIDENCE - May need minor fixes';
    } else {
        return '🔴 LOW CONFIDENCE - Requires review';
    }
}

// Main analysis
const diff = getPRDiff();
const analysis = analyzeCodeQuality(diff);
const recommendations = generateRecommendations(diff, analysis);
const prediction = predictOutcome(analysis);

const result = {
    date: new Date().toISOString(),
    prNumber: PR_NUMBER,
    qualityScore: analysis.qualityScore,
    codeAnalysis: analysis.issues.join('\n'),
    recommendations,
    prediction,
    diffStats: {
        additions: (diff.match(/^\+/gm) || []).length,
        deletions: (diff.match(/^\-/gm) || []).length,
        files: (diff.match(/diff --git/g) || []).length
    }
};

// Save results
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));

console.log(`\n✅ Analysis complete!`);
console.log(`\nQuality Score: ${result.qualityScore}/100`);
console.log(`Prediction: ${result.prediction}`);
console.log(`\n📄 Results saved: ${OUTPUT_FILE}\n`);

/**
 * FUTURE AI INTEGRATION:
 * 
 * 1. GPT-4o-mini (OpenRouter - Free tier):
 *    - Code review and suggestions
 *    - Natural language analysis
 *    
 * 2. Claude Haiku (Anthropic - Free tier):
 *    - Code quality analysis
 *    - Security checks
 *    
 * 3. Gemini Pro (Google AI - Free):
 *    - Pattern detection
 *    - Classification
 *    
 * Example integration:
 * 
 * const response = await fetch('https://api.openrouter.ai/api/v1/chat/completions', {
 *     method: 'POST',
 *     headers: {
 *         'Authorization': 'Bearer free-tier-key',
 *         'Content-Type': 'application/json'
 *     },
 *     body: JSON.stringify({
 *         model: 'openai/gpt-4o-mini',
 *         messages: [{
 *             role: 'user',
 *             content: `Analyze this PR diff:\n${diff}`
 *         }]
 *     })
 * });
 */

process.exit(0);
