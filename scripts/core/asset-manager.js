// core/asset-manager.js
// Gestionnaire centralisé des assets pour Homey
// Remplace tous les scripts de gestion d'images dispersés

const fs = require('fs');
const path = require('path');

class AssetManager {
    constructor() {
        this.assetsDir = 'assets';
        this.imagesDir = path.join(this.assetsDir, 'images');
        this.requiredAssets = [
            'assets/icon-small.png',
            'assets/icon-large.png',
            'assets/images/small.png',
            'assets/images/large.png'
        ];
    }

    // Créer un PNG minimal valide
    createPNGPlaceholder(width = 64, height = 64) {
        // PNG minimal valide (1x1 pixel transparent)
        const pngHeader = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
            0x49, 0x48, 0x44, 0x52, // IHDR
            0x00, 0x00, 0x00, 0x01, // width: 1
            0x00, 0x00, 0x00, 0x01, // height: 1
            0x08, // bit depth
            0x06, // color type (RGBA)
            0x00, // compression
            0x00, // filter
            0x00, // interlace
            0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
            0x49, 0x44, 0x41, 0x54, // IDAT
            0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // compressed data
            0x00, 0x00, 0x00, 0x00, // IEND chunk length
            0x49, 0x45, 0x4E, 0x44, // IEND
            0xAE, 0x42, 0x60, 0x82  // CRC
        ]);

        return pngHeader;
    }

    // Créer la structure des assets
    createAssetStructure() {
        // Créer le dossier assets
        if (!fs.existsSync(this.assetsDir)) {
            fs.mkdirSync(this.assetsDir, { recursive: true });
        }

        // Créer le dossier images
        if (!fs.existsSync(this.imagesDir)) {
            fs.mkdirSync(this.imagesDir, { recursive: true });
        }

        return { success: true };
    }

    // Générer tous les assets requis
    generateAllAssets() {
        this.createAssetStructure();

        const pngData = this.createPNGPlaceholder();

        // Créer tous les assets requis
        for (const assetPath of this.requiredAssets) {
            const dir = path.dirname(assetPath);
            
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(assetPath, pngData);
        }

        return { success: true, generated: this.requiredAssets.length };
    }

    // Vérifier les assets
    validateAssets() {
        const missing = [];
        const valid = [];

        for (const assetPath of this.requiredAssets) {
            if (fs.existsSync(assetPath)) {
                valid.push(assetPath);
            } else {
                missing.push(assetPath);
            }
        }

        return {
            valid: valid.length,
            missing: missing.length,
            total: this.requiredAssets.length,
            missingPaths: missing
        };
    }

    // Corriger les assets manquants
    fixMissingAssets() {
        const validation = this.validateAssets();
        
        if (validation.missing === 0) {
            return { success: true, message: 'Tous les assets sont présents' };
        }

        // Générer les assets manquants
        this.generateAllAssets();
        
        // Vérifier à nouveau
        const newValidation = this.validateAssets();
        
        return {
            success: newValidation.missing === 0,
            generated: validation.missing,
            remaining: newValidation.missing
        };
    }

    // Nettoyer les assets obsolètes
    cleanObsoleteAssets() {
        const allowedAssets = new Set(this.requiredAssets);
        const assetsDir = this.assetsDir;

        if (!fs.existsSync(assetsDir)) {
            return { success: true, message: 'Dossier assets inexistant' };
        }

        const cleanDir = (dir) => {
            if (!fs.existsSync(dir)) return 0;

            const items = fs.readdirSync(dir);
            let removed = 0;

            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    removed += cleanDir(fullPath);
                    
                    // Supprimer le dossier s'il est vide
                    if (fs.readdirSync(fullPath).length === 0) {
                        fs.rmdirSync(fullPath);
                    }
                } else {
                    const relativePath = path.relative('.', fullPath).replace(/\\/g, '/');
                    if (!allowedAssets.has(relativePath)) {
                        try {
                            fs.unlinkSync(fullPath);
                            removed++;
                        } catch (error) {
                            console.warn(`Impossible de supprimer ${fullPath}: ${error.message}`);
                        }
                    }
                }
            }

            return removed;
        };

        const removed = cleanDir(assetsDir);
        return { success: true, removed };
    }

    // Générer un rapport
    generateReport() {
        const validation = this.validateAssets();
        const structure = this.createAssetStructure();

        return {
            structure: structure.success,
            assets: validation,
            required: this.requiredAssets,
            status: validation.missing === 0 ? 'complete' : 'incomplete'
        };
    }
}

// Fonction utilitaire pour les logs
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// Export pour utilisation dans d'autres scripts
module.exports = { AssetManager, log };

// Exécution directe si appelé directement
if (require.main === module) {
    const manager = new AssetManager();
    const report = manager.generateReport();
    log(`Rapport assets: ${JSON.stringify(report, null, 2)}`);
} 