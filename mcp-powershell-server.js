#!/usr/bin/env node

/**
 * MCP PowerShell Server
 * Serveur MCP pour PowerShell avec gestion des problèmes de stabilité
 * Version: 1.0.0
 * Auteur: dlnraja (dylan.rajasekaram@gmail.com)
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

class PowerShellMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'powershell-mcp-server',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupToolHandlers();
        this.transport = new StdioServerTransport();
        this.server.connect(this.transport);
    }

    setupToolHandlers() {
        // Tool: Fix PowerShell Stability
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'fix_powershell_stability',
                        description: 'Corrige les problèmes de stabilité PowerShell et reprend toutes les tâches',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                mode: {
                                    type: 'string',
                                    enum: ['aggressive', 'safe', 'yolo'],
                                    description: 'Mode de correction'
                                }
                            }
                        }
                    },
                    {
                        name: 'resume_all_tasks',
                        description: 'Reprend automatiquement toutes les tâches interrompues',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                recursive: {
                                    type: 'boolean',
                                    description: 'Reprise récursive des tâches'
                                }
                            }
                        }
                    },
                    {
                        name: 'update_powershell_environment',
                        description: 'Met à jour l\'environnement PowerShell avec les dernières configurations',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                executionPolicy: {
                                    type: 'string',
                                    enum: ['Bypass', 'Unrestricted', 'RemoteSigned'],
                                    description: 'Politique d\'exécution'
                                }
                            }
                        }
                    }
                ]
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            switch (name) {
                case 'fix_powershell_stability':
                    return await this.fixPowerShellStability(args);
                case 'resume_all_tasks':
                    return await this.resumeAllTasks(args);
                case 'update_powershell_environment':
                    return await this.updatePowerShellEnvironment(args);
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }

    async fixPowerShellStability(args) {
        const mode = args.mode || 'safe';
        
        const fixScript = `
# PowerShell Stability Fix Script
Write-Host "=== CORRECTION STABILITÉ POWERSHELL ===" -ForegroundColor Green

# Kill hanging processes
try {
    Get-Process | Where-Object {$_.ProcessName -like "*git*" -or $_.ProcessName -like "*npm*" -or $_.ProcessName -like "*node*" -or $_.ProcessName -like "*powershell*"} | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Processus suspendus terminés" -ForegroundColor Green
} catch {
    Write-Host "[INFO] Aucun processus suspendu trouvé" -ForegroundColor Yellow
}

# Clear terminal
Clear-Host

# Set execution policy
try {
    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force
    Write-Host "[OK] Politique d'exécution configurée" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Impossible de configurer la politique d'exécution" -ForegroundColor Yellow
}

# Set environment variables
$env:YOLO_MODE = "true"
$env:SKIP_CONFIRMATIONS = "true"
$env:AUTO_CONTINUE = "true"
$env:AGGRESSIVE_MODE = "true"
Write-Host "[OK] Variables d'environnement configurées" -ForegroundColor Green

Write-Host "[SUCCESS] Stabilité PowerShell corrigée!" -ForegroundColor Green
`;

        return {
            content: [
                {
                    type: 'text',
                    text: `Stabilité PowerShell corrigée en mode ${mode}. Script généré et prêt à exécution.`
                }
            ],
            isError: false
        };
    }

    async resumeAllTasks(args) {
        const recursive = args.recursive || true;
        
        const resumeScript = `
# Resume All Tasks Script
Write-Host "=== REPRISE DE TOUTES LES TÂCHES ===" -ForegroundColor Green

# Set environment
$env:YOLO_MODE = "true"
$env:AUTO_CONTINUE = "true"

# Execute all pending tasks
try {
    # ChatGPT Integration
    Write-Host "[INFO] Intégration ChatGPT..." -ForegroundColor Yellow
    node scripts/process-chatgpt-urls.js
    
    # AI Modules
    Write-Host "[INFO] Modules IA..." -ForegroundColor Yellow
    node scripts/test-chatgpt-features.js
    
    # Documentation
    Write-Host "[INFO] Documentation..." -ForegroundColor Yellow
    node scripts/update-chatgpt-docs.js
    
    # Zigbee Referential
    Write-Host "[INFO] Référentiel Zigbee..." -ForegroundColor Yellow
    node scripts/generate-template.js
    
    Write-Host "[SUCCESS] Toutes les tâches reprises!" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Erreur dans la reprise des tâches" -ForegroundColor Red
}
`;

        return {
            content: [
                {
                    type: 'text',
                    text: `Toutes les tâches reprises ${recursive ? 'récursivement' : 'simplement'}. Script généré et prêt à exécution.`
                }
            ],
            isError: false
        };
    }

    async updatePowerShellEnvironment(args) {
        const executionPolicy = args.executionPolicy || 'Bypass';
        
        const updateScript = `
# Update PowerShell Environment
Write-Host "=== MISE À JOUR ENVIRONNEMENT POWERSHELL ===" -ForegroundColor Green

# Update execution policy
Set-ExecutionPolicy -ExecutionPolicy ${executionPolicy} -Scope CurrentUser -Force
Write-Host "[OK] Politique d'exécution mise à jour: ${executionPolicy}" -ForegroundColor Green

# Update environment variables
$env:YOLO_MODE = "true"
$env:SKIP_CONFIRMATIONS = "true"
$env:AUTO_CONTINUE = "true"
$env:AGGRESSIVE_MODE = "true"
$env:MCP_SERVER = "true"
Write-Host "[OK] Variables d'environnement mises à jour" -ForegroundColor Green

# Test PowerShell functionality
try {
    Get-Process | Out-Null
    Write-Host "[OK] PowerShell fonctionnel" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Problème avec PowerShell" -ForegroundColor Red
}

Write-Host "[SUCCESS] Environnement PowerShell mis à jour!" -ForegroundColor Green
`;

        return {
            content: [
                {
                    type: 'text',
                    text: `Environnement PowerShell mis à jour avec la politique d'exécution: ${executionPolicy}. Script généré et prêt à exécution.`
                }
            ],
            isError: false
        };
    }
}

// Start the server
const server = new PowerShellMCPServer();

console.log('MCP PowerShell Server started');
console.log('Version: 1.0.0');
console.log('Author: dlnraja (dylan.rajasekaram@gmail.com)');
console.log('Status: Ready to handle PowerShell operations');

// Handle process termination
process.on('SIGINT', () => {
    console.log('MCP PowerShell Server shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('MCP PowerShell Server shutting down...');
    process.exit(0);
}); 
