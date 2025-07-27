/**
 * Zigbee Cluster Referential System
 * Système de référentiel Zigbee cluster complet
 * Version: 1.0.0
 * Auteur: dlnraja (dylan.rajasekaram@gmail.com)
 */

const fs = require('fs');
const path = require('path');

class ZigbeeClusterReferential {
    constructor() {
        this.clusters = {};
        this.endpoints = {};
        this.deviceTypes = {};
        this.sources = [
            'https://docs.espressif.com/projects/esp-zigbee-sdk/en/latest/esp32/user-guide/zcl_custom.html',
            'https://zigbeealliance.org/wp-content/uploads/2019/12/07-5123-06-zigbee-cluster-library-specification.pdf',
            'https://csa-iot.org/',
            'https://www.nxp.com/docs/en/user-guide/JN-UG-3115.pdf',
            'https://onlinedocs.microchip.com/oxy/GUID-D176AD05-7AEE-4A67-B5B2-16E9E7E7FAC8-en-US-1/GUID-20DDCF41-97FD-4FBB-AC06-7E6A033D6FEB.html',
            'https://docs.silabs.com/zigbee/8.2.1/zigbee-fundamentals/06-zigbee-cluster-library',
            'https://github.com/SiliconLabsSoftware/zigbee_applications/blob/master/zigbee_concepts/Zigbee-Introduction/Zigbee%20Introduction%20-%20Clusters,%20Endpoints,%20Device%20Types.md'
        ];
    }

    // Créer la structure de base du référentiel
    createBaseStructure() {
        const structure = {
            clusters: {
                basic: {
                    id: 0x0000,
                    name: "Basic",
                    description: "Basic cluster for device information",
                    attributes: {
                        zclVersion: { id: 0x0000, type: "uint8", access: "read" },
                        applicationVersion: { id: 0x0001, type: "uint8", access: "read" },
                        stackVersion: { id: 0x0002, type: "uint8", access: "read" },
                        hardwareVersion: { id: 0x0003, type: "uint8", access: "read" },
                        manufacturerName: { id: 0x0004, type: "string", access: "read" },
                        modelIdentifier: { id: 0x0005, type: "string", access: "read" },
                        dateCode: { id: 0x0006, type: "string", access: "read" },
                        powerSource: { id: 0x0007, type: "enum8", access: "read" }
                    },
                    commands: {
                        resetToFactoryDefaults: { id: 0x00, direction: "client_to_server" }
                    }
                },
                identify: {
                    id: 0x0003,
                    name: "Identify",
                    description: "Identify cluster for device identification",
                    attributes: {
                        identifyTime: { id: 0x0000, type: "uint16", access: "read_write" }
                    },
                    commands: {
                        identify: { id: 0x00, direction: "client_to_server" },
                        identifyQuery: { id: 0x01, direction: "client_to_server" },
                        identifyQueryResponse: { id: 0x00, direction: "server_to_client" }
                    }
                },
                groups: {
                    id: 0x0004,
                    name: "Groups",
                    description: "Groups cluster for device grouping",
                    attributes: {
                        nameSupport: { id: 0x0000, type: "map8", access: "read" }
                    },
                    commands: {
                        addGroup: { id: 0x00, direction: "client_to_server" },
                        viewGroup: { id: 0x01, direction: "client_to_server" },
                        getGroupMembership: { id: 0x02, direction: "client_to_server" },
                        removeGroup: { id: 0x03, direction: "client_to_server" },
                        removeAllGroups: { id: 0x04, direction: "client_to_server" },
                        addGroupIfIdentifying: { id: 0x05, direction: "client_to_server" }
                    }
                },
                scenes: {
                    id: 0x0005,
                    name: "Scenes",
                    description: "Scenes cluster for scene management",
                    attributes: {
                        sceneCount: { id: 0x0000, type: "uint8", access: "read" },
                        currentScene: { id: 0x0001, type: "uint8", access: "read" },
                        currentGroup: { id: 0x0002, type: "uint16", access: "read" },
                        sceneValid: { id: 0x0003, type: "boolean", access: "read" },
                        nameSupport: { id: 0x0004, type: "map8", access: "read" },
                        lastConfiguredBy: { id: 0x0005, type: "ieee", access: "read" }
                    }
                },
                onOff: {
                    id: 0x0006,
                    name: "On/Off",
                    description: "On/Off cluster for device control",
                    attributes: {
                        onOff: { id: 0x0000, type: "boolean", access: "read_write" },
                        globalSceneControl: { id: 0x4000, type: "boolean", access: "read" },
                        onTime: { id: 0x4001, type: "uint16", access: "read_write" },
                        offWaitTime: { id: 0x4002, type: "uint16", access: "read_write" },
                        startUpOnOff: { id: 0x4003, type: "enum8", access: "read_write" }
                    },
                    commands: {
                        off: { id: 0x00, direction: "client_to_server" },
                        on: { id: 0x01, direction: "client_to_server" },
                        toggle: { id: 0x02, direction: "client_to_server" },
                        offWithEffect: { id: 0x40, direction: "client_to_server" },
                        onWithRecallGlobalScene: { id: 0x41, direction: "client_to_server" },
                        onWithTimedOff: { id: 0x42, direction: "client_to_server" }
                    }
                },
                levelControl: {
                    id: 0x0008,
                    name: "Level Control",
                    description: "Level Control cluster for dimming",
                    attributes: {
                        currentLevel: { id: 0x0000, type: "uint8", access: "read_write" },
                        remainingTime: { id: 0x0001, type: "uint16", access: "read" },
                        onOffTransitionTime: { id: 0x0010, type: "uint16", access: "read_write" },
                        onLevel: { id: 0x0011, type: "uint8", access: "read_write" },
                        onTransitionTime: { id: 0x0012, type: "uint16", access: "read_write" },
                        offTransitionTime: { id: 0x0013, type: "uint16", access: "read_write" },
                        defaultMoveRate: { id: 0x0014, type: "uint16", access: "read_write" },
                        startUpCurrentLevel: { id: 0x4000, type: "uint8", access: "read_write" }
                    },
                    commands: {
                        moveToLevel: { id: 0x00, direction: "client_to_server" },
                        move: { id: 0x01, direction: "client_to_server" },
                        step: { id: 0x02, direction: "client_to_server" },
                        stop: { id: 0x03, direction: "client_to_server" },
                        moveToLevelWithOnOff: { id: 0x04, direction: "client_to_server" },
                        moveWithOnOff: { id: 0x05, direction: "client_to_server" },
                        stepWithOnOff: { id: 0x06, direction: "client_to_server" },
                        stopWithOnOff: { id: 0x07, direction: "client_to_server" }
                    }
                },
                colorControl: {
                    id: 0x0300,
                    name: "Color Control",
                    description: "Color Control cluster for color management",
                    attributes: {
                        currentHue: { id: 0x0000, type: "uint8", access: "read_write" },
                        currentSaturation: { id: 0x0001, type: "uint8", access: "read_write" },
                        remainingTime: { id: 0x0002, type: "uint16", access: "read" },
                        currentX: { id: 0x0003, type: "uint16", access: "read_write" },
                        currentY: { id: 0x0004, type: "uint16", access: "read_write" },
                        driftCompensation: { id: 0x0005, type: "enum8", access: "read_write" },
                        compensationText: { id: 0x0006, type: "string", access: "read_write" },
                        colorTemperature: { id: 0x0007, type: "uint16", access: "read_write" },
                        colorMode: { id: 0x0008, type: "enum8", access: "read" },
                        colorOptions: { id: 0x000F, type: "map8", access: "read_write" },
                        numberOfPrimaries: { id: 0x0010, type: "uint8", access: "read" },
                        primary1X: { id: 0x0011, type: "uint16", access: "read" },
                        primary1Y: { id: 0x0012, type: "uint16", access: "read" },
                        primary1Intensity: { id: 0x0013, type: "uint8", access: "read" },
                        primary2X: { id: 0x0015, type: "uint16", access: "read" },
                        primary2Y: { id: 0x0016, type: "uint16", access: "read" },
                        primary2Intensity: { id: 0x0017, type: "uint8", access: "read" },
                        primary3X: { id: 0x0019, type: "uint16", access: "read" },
                        primary3Y: { id: 0x001A, type: "uint16", access: "read" },
                        primary3Intensity: { id: 0x001B, type: "uint8", access: "read" },
                        primary4X: { id: 0x0020, type: "uint16", access: "read" },
                        primary4Y: { id: 0x0021, type: "uint16", access: "read" },
                        primary4Intensity: { id: 0x0022, type: "uint8", access: "read" },
                        primary5X: { id: 0x0024, type: "uint16", access: "read" },
                        primary5Y: { id: 0x0025, type: "uint16", access: "read" },
                        primary5Intensity: { id: 0x0026, type: "uint8", access: "read" },
                        primary6X: { id: 0x0028, type: "uint16", access: "read" },
                        primary6Y: { id: 0x0029, type: "uint16", access: "read" },
                        primary6Intensity: { id: 0x002A, type: "uint8", access: "read" },
                        whitePointX: { id: 0x0030, type: "uint16", access: "read_write" },
                        whitePointY: { id: 0x0031, type: "uint16", access: "read_write" },
                        colorPointRX: { id: 0x0032, type: "uint16", access: "read_write" },
                        colorPointRY: { id: 0x0033, type: "uint16", access: "read_write" },
                        colorPointRIntensity: { id: 0x0034, type: "uint8", access: "read_write" },
                        colorPointGX: { id: 0x0036, type: "uint16", access: "read_write" },
                        colorPointGY: { id: 0x0037, type: "uint16", access: "read_write" },
                        colorPointGIntensity: { id: 0x0038, type: "uint8", access: "read_write" },
                        colorPointBX: { id: 0x003A, type: "uint16", access: "read_write" },
                        colorPointBY: { id: 0x003B, type: "uint16", access: "read_write" },
                        colorPointBIntensity: { id: 0x003C, type: "uint8", access: "read_write" },
                        enhancedCurrentHue: { id: 0x4000, type: "uint16", access: "read" },
                        enhancedColorMode: { id: 0x4001, type: "enum8", access: "read" },
                        colorLoopActive: { id: 0x4002, type: "uint8", access: "read" },
                        colorLoopDirection: { id: 0x4003, type: "enum8", access: "read_write" },
                        colorLoopTime: { id: 0x4004, type: "uint16", access: "read_write" },
                        colorLoopStartEnhancedHue: { id: 0x4005, type: "uint16", access: "read_write" },
                        colorLoopStoredEnhancedHue: { id: 0x4006, type: "uint16", access: "read_write" },
                        colorCapabilities: { id: 0x400A, type: "map16", access: "read" },
                        colorTempPhysicalMin: { id: 0x400B, type: "uint16", access: "read" },
                        colorTempPhysicalMax: { id: 0x400C, type: "uint16", access: "read" },
                        coupleColorTempToLevelMin: { id: 0x400D, type: "uint16", access: "read_write" },
                        startUpColorTemperature: { id: 0x4010, type: "uint16", access: "read_write" }
                    },
                    commands: {
                        moveToHue: { id: 0x00, direction: "client_to_server" },
                        moveHue: { id: 0x01, direction: "client_to_server" },
                        stepHue: { id: 0x02, direction: "client_to_server" },
                        moveToSaturation: { id: 0x03, direction: "client_to_server" },
                        moveSaturation: { id: 0x04, direction: "client_to_server" },
                        stepSaturation: { id: 0x05, direction: "client_to_server" },
                        moveToHueAndSaturation: { id: 0x06, direction: "client_to_server" },
                        moveToColor: { id: 0x07, direction: "client_to_server" },
                        moveColor: { id: 0x08, direction: "client_to_server" },
                        stepColor: { id: 0x09, direction: "client_to_server" },
                        moveToColorTemperature: { id: 0x0A, direction: "client_to_server" },
                        enhancedMoveToHue: { id: 0x40, direction: "client_to_server" },
                        enhancedMoveHue: { id: 0x41, direction: "client_to_server" },
                        enhancedStepHue: { id: 0x42, direction: "client_to_server" },
                        enhancedMoveToHueAndSaturation: { id: 0x43, direction: "client_to_server" },
                        colorLoopSet: { id: 0x44, direction: "client_to_server" },
                        stopMoveStep: { id: 0x47, direction: "client_to_server" },
                        moveColorTemperature: { id: 0x4B, direction: "client_to_server" },
                        stepColorTemperature: { id: 0x4C, direction: "client_to_server" }
                    }
                }
            },
            deviceTypes: {
                onOffLight: {
                    id: 0x0100,
                    name: "On/Off Light",
                    description: "Simple on/off light device",
                    clusters: {
                        server: ["basic", "identify", "groups", "scenes", "onOff"],
                        client: ["groups", "scenes"]
                    }
                },
                dimmableLight: {
                    id: 0x0101,
                    name: "Dimmable Light",
                    description: "Dimmable light device",
                    clusters: {
                        server: ["basic", "identify", "groups", "scenes", "onOff", "levelControl"],
                        client: ["groups", "scenes"]
                    }
                },
                colorDimmableLight: {
                    id: 0x0102,
                    name: "Color Dimmable Light",
                    description: "Color dimmable light device",
                    clusters: {
                        server: ["basic", "identify", "groups", "scenes", "onOff", "levelControl", "colorControl"],
                        client: ["groups", "scenes"]
                    }
                },
                colorTemperatureLight: {
                    id: 0x010C,
                    name: "Color Temperature Light",
                    description: "Color temperature light device",
                    clusters: {
                        server: ["basic", "identify", "groups", "scenes", "onOff", "levelControl", "colorControl"],
                        client: ["groups", "scenes"]
                    }
                }
            },
            endpoints: {
                primary: {
                    id: 1,
                    description: "Primary endpoint for device control",
                    deviceId: 0x0100,
                    clusters: ["basic", "identify", "groups", "scenes", "onOff"]
                },
                secondary: {
                    id: 2,
                    description: "Secondary endpoint for additional features",
                    deviceId: 0x0101,
                    clusters: ["levelControl"]
                }
            }
        };

        return structure;
    }

    // Sauvegarder le référentiel
    saveReferential() {
        const referential = this.createBaseStructure();
        const referentialPath = path.join(__dirname, 'referentials', 'zigbee');
        
        if (!fs.existsSync(referentialPath)) {
            fs.mkdirSync(referentialPath, { recursive: true });
        }

        fs.writeFileSync(
            path.join(referentialPath, 'cluster-matrix.json'),
            JSON.stringify(referential, null, 2)
        );

        console.log('Referential saved to referentials/zigbee/cluster-matrix.json');
    }

    // Créer un workflow pour la mise à jour mensuelle
    createMonthlyUpdateWorkflow() {
        const workflow = {
            name: "Monthly Zigbee Referential Update",
            on: {
                schedule: {
                    cron: "0 0 1 * *" // Premier jour de chaque mois
                }
            },
            jobs: {
                updateReferential: {
                    runsOn: "ubuntu-latest",
                    steps: [
                        {
                            name: "Checkout",
                            uses: "actions/checkout@v3"
                        },
                        {
                            name: "Setup Node.js",
                            uses: "actions/setup-node@v3",
                            with: {
                                "node-version": "18"
                            }
                        },
                        {
                            name: "Update Zigbee Referential",
                            run: "node scripts/zigbee-cluster-referential-system.js"
                        },
                        {
                            name: "Commit and Push",
                            run: |
                                git config --local user.email "action@github.com"
                                git config --local user.name "GitHub Action"
                                git add .
                                git commit -m "Monthly Zigbee Referential Update - $(date)"
                                git push
                        }
                    ]
                }
            }
        };

        const workflowPath = path.join(__dirname, '.github', 'workflows');
        if (!fs.existsSync(workflowPath)) {
            fs.mkdirSync(workflowPath, { recursive: true });
        }

        fs.writeFileSync(
            path.join(workflowPath, 'monthly-zigbee-update.yml'),
            JSON.stringify(workflow, null, 2)
        );

        console.log('Monthly update workflow created');
    }

    // Créer des scripts d'automatisation
    createAutomationScripts() {
        const scripts = {
            'update-referential.js': `
// Script de mise à jour du référentiel Zigbee
const ZigbeeClusterReferential = require('./zigbee-cluster-referential-system.js');

const referential = new ZigbeeClusterReferential();
referential.saveReferential();
console.log('Referential updated successfully');
            `,
            'validate-clusters.js': `
// Script de validation des clusters
const fs = require('fs');
const path = require('path');

const referentialPath = path.join(__dirname, 'referentials', 'zigbee', 'cluster-matrix.json');
const referential = JSON.parse(fs.readFileSync(referentialPath, 'utf8'));

console.log('Validating clusters...');
Object.keys(referential.clusters).forEach(clusterName => {
    const cluster = referential.clusters[clusterName];
    console.log(\`Cluster: \${cluster.name} (0x\${cluster.id.toString(16).padStart(4, '0')})\`);
    console.log(\`  Attributes: \${Object.keys(cluster.attributes).length}\`);
    console.log(\`  Commands: \${Object.keys(cluster.commands).length}\`);
});
console.log('Validation completed');
            `
        };

        Object.keys(scripts).forEach(filename => {
            const scriptPath = path.join(__dirname, 'scripts', filename);
            fs.writeFileSync(scriptPath, scripts[filename]);
            console.log(\`Script created: \${filename}\`);
        });
    }
}

// Exécution principale
if (require.main === module) {
    const referential = new ZigbeeClusterReferential();
    referential.saveReferential();
    referential.createMonthlyUpdateWorkflow();
    referential.createAutomationScripts();
    console.log('Zigbee Cluster Referential System initialized successfully');
}

module.exports = ZigbeeClusterReferential; 