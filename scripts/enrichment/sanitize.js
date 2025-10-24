/**
 * SANITIZE.JS - Utilitaires de sanitization
 * Convertit texte avec caractères spéciaux en texte safe pour CLI/API/Git
 */

/**
 * Sanitize pour GitHub Actions Output
 * @param {string} input - Texte à sanitizer
 * @returns {string} Texte safe pour GitHub Actions
 */
function sanitizeGitHubOutput(input) {
    if (!input) return '';
    
    return String(input)
        .replace(/["'`$\\]/g, '')  // Supprimer guillemets et caractères spéciaux
        .replace(/[\x00-\x1F\x7F-\xFF]/g, '')  // Supprimer caractères de contrôle
        .trim();
}

/**
 * Sanitize pour Homey Changelog
 * Format: une ligne, max 500 chars, pas de caractères spéciaux
 * @param {string} input - Changelog brut
 * @param {number} maxLength - Longueur max (défaut: 500)
 * @returns {string} Changelog sanitizé
 */
function sanitizeHomeyChangelog(input, maxLength = 500) {
    if (!input) return 'Bug fixes and improvements';
    
    return String(input)
        // Supprimer tirets initiaux de chaque ligne
        .split('\n')
        .map(line => String(line).replace(/^[- ]*/, '').trim())
        .filter(line => line.length > 0)
        .join('; ')  // Joindre avec point-virgule
        // Nettoyer caractères problématiques
        .replace(/["`$\\]/g, '')
        .replace(/\s+/g, ' ')  // Normaliser espaces
        .trim()
        .substring(0, maxLength)  // Limiter longueur
        .replace(/;$/, '');  // Supprimer point-virgule final
}

/**
 * Sanitize pour Git commit message
 * @param {string} input - Message commit
 * @returns {string} Message safe
 */
function sanitizeGitCommit(input) {
    if (!input) return 'Update';
    
    return String(input)
        .replace(/\n/g, ' ')  // Une seule ligne
        .replace(/["`]/g, "'")  // Remplacer guillemets
        .replace(/[$\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200);
}

/**
 * Sanitize pour nom de fichier
 * @param {string} input - Nom fichier
 * @returns {string} Nom safe
 */
function sanitizeFilename(input) {
    if (!input) return 'file';
    
    return String(input)
        .replace(/[<>:"/\\|?*]/g, '-')  // Caractères interdits Windows
        .replace(/\s+/g, '_')  // Espaces en underscores
        .toLowerCase()
        .replace(/^[.-]+/, '')  // Pas de point/tiret au début
        .substring(0, 100);
}

/**
 * Sanitize pour URL
 * @param {string} input - Texte URL
 * @returns {string} URL encodée
 */
function sanitizeURL(input) {
    if (!input) return '';
    
    return encodeURIComponent(String(input));
}

/**
 * Sanitize pour JSON
 * @param {string} input - Texte JSON
 * @returns {string} Texte safe pour JSON
 */
function sanitizeJSON(input) {
    if (!input) return '';
    
    return String(input)
        .replace(/\\/g, '\\\\')  // Échapper backslashes
        .replace(/"/g, '\\"')  // Échapper guillemets
        .replace(/\t/g, '\\t')  // Échapper tabs
        .replace(/\n/g, '\\n')  // Échapper newlines
        .replace(/\r/g, '\\r')  // Échapper carriage returns
        .replace(/[\x00-\x1F]/g, '');  // Supprimer contrôle
}

/**
 * Sanitize logs (supprime couleurs ANSI)
 * @param {string} input - Log brut
 * @returns {string} Log nettoyé
 */
function sanitizeLog(input) {
    if (!input) return '';
    
    return String(input)
        // eslint-disable-next-line no-control-regex
        .replace(/\x1b\[[0-9;]*m/g, '')  // Supprimer couleurs ANSI
        .replace(/[\x00-\x1F\x7F]/g, '');  // Supprimer contrôle
}

/**
 * Sanitize pour argument CLI
 * Usage général pour passer texte à CLI
 * @param {string} input - Argument
 * @returns {string} Argument safe
 */
function sanitizeCLIArg(input) {
    if (!input) return '';
    
    return String(input)
        .replace(/^-+/, '')  // Pas de tirets au début (options)
        .replace(/[`$\\"]/g, '')  // Caractères dangereux
        .replace(/\n/g, ' ')  // Une ligne
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 300);
}

/**
 * Vérifier si string est safe
 * @param {string} input - Texte à vérifier
 * @returns {boolean} True si safe
 */
function isSafeString(input) {
    if (!input) return true;
    
    const dangerousChars = /[\x00-\x1F\x7F`$\\"]/;
    return !dangerousChars.test(String(input));
}

/**
 * Sanitize array de commits
 * @param {Array<string>} commits - Liste commits
 * @param {number} max - Nombre max commits
 * @returns {string} Commits formatés
 */
function sanitizeCommitList(commits, max = 10) {
    if (!Array.isArray(commits) || commits.length === 0) {
        return 'Bug fixes and improvements';
    }
    
    return commits
        .slice(0, max)
        .map(commit => sanitizeCLIArg(commit))
        .filter(commit => commit.length > 0)
        .join('; ')
        .substring(0, 500);
}

/**
 * Sanitize pour Step Summary GitHub
 * @param {string} input - Texte markdown
 * @returns {string} Markdown safe
 */
function sanitizeStepSummary(input) {
    if (!input) return '';
    
    // Garder markdown basique mais supprimer scripts
    return String(input)
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
}

// Export pour Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sanitizeGitHubOutput,
        sanitizeHomeyChangelog,
        sanitizeGitCommit,
        sanitizeFilename,
        sanitizeURL,
        sanitizeJSON,
        sanitizeLog,
        sanitizeCLIArg,
        isSafeString,
        sanitizeCommitList,
        sanitizeStepSummary
    };
}

// Tests si exécuté directement
if (require.main === module) {
    console.log('🧪 SANITIZE.JS - Tests\n');
    
    const testInput = '- feat: test d\'une fonctionnalité avec des "guillemets" et $variables';
    
    console.log('Input:', testInput);
    console.log('');
    console.log('GitHub Output:', sanitizeGitHubOutput(testInput));
    console.log('Homey Changelog:', sanitizeHomeyChangelog(testInput));
    console.log('Git Commit:', sanitizeGitCommit(testInput));
    console.log('Filename:', sanitizeFilename(testInput));
    console.log('CLI Arg:', sanitizeCLIArg(testInput));
    console.log('');
    console.log('Is Safe?', isSafeString(testInput) ? '✅ Yes' : '⚠️ No');
    
    // Test commit list
    const commits = [
        'feat: nouvelle fonctionnalité',
        'fix: correction bug',
        'docs: mise à jour README'
    ];
    console.log('\nCommit List:', sanitizeCommitList(commits));
}
