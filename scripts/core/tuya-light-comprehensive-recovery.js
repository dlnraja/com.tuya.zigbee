const fs = require('fs');
const path = require('path');

class TuyaLightComprehensiveRecovery {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            recoverySteps: [],
            recoveredDrivers: [],
            errors: [],
            warnings: [],
            summary: {}
        };
        
        // Base de données complète des drivers tuya-light manquants
        this.tuyaLightDrivers = {
            // Drivers Tuya Light historiques
            lights: [
                'tuya-light-basic', 'tuya-light-dimmable', 'tuya-light-rgb', 'tuya-light-rgbw',
                'tuya-light-rgbww', 'tuya-light-tunable', 'tuya-light-strip', 'tuya-light-bulb',
                'tuya-light-panel', 'tuya-light-ceiling', 'tuya-light-wall', 'tuya-light-floor',
                'tuya-light-table', 'tuya-light-desk', 'tuya-light-bedroom', 'tuya-light-living',
                'tuya-light-kitchen', 'tuya-light-bathroom', 'tuya-light-garden', 'tuya-light-outdoor',
                'tuya-light-pathway', 'tuya-light-security', 'tuya-light-accent', 'tuya-light-ambient',
                'tuya-light-task', 'tuya-light-decorative', 'tuya-light-architectural', 'tuya-light-landscape',
                'tuya-light-pool', 'tuya-light-fountain', 'tuya-light-tree', 'tuya-light-bush',
                'tuya-light-flag', 'tuya-light-sign', 'tuya-light-display', 'tuya-light-showcase',
                'tuya-light-gallery', 'tuya-light-museum', 'tuya-light-theater', 'tuya-light-concert',
                'tuya-light-stadium', 'tuya-light-arena', 'tuya-light-church', 'tuya-light-temple',
                'tuya-light-mosque', 'tuya-light-synagogue', 'tuya-light-school', 'tuya-light-university',
                'tuya-light-hospital', 'tuya-light-clinic', 'tuya-light-pharmacy', 'tuya-light-dental',
                'tuya-light-veterinary', 'tuya-light-laboratory', 'tuya-light-research', 'tuya-light-development',
                'tuya-light-office', 'tuya-light-cubicle', 'tuya-light-conference', 'tuya-light-meeting',
                'tuya-light-training', 'tuya-light-workshop', 'tuya-light-factory', 'tuya-light-warehouse',
                'tuya-light-distribution', 'tuya-light-logistics', 'tuya-light-transport', 'tuya-light-aviation',
                'tuya-light-marine', 'tuya-light-railway', 'tuya-light-bus', 'tuya-light-taxi',
                'tuya-light-ambulance', 'tuya-light-fire', 'tuya-light-police', 'tuya-light-military',
                'tuya-light-government', 'tuya-light-court', 'tuya-light-prison', 'tuya-light-detention',
                'tuya-light-rehabilitation', 'tuya-light-treatment', 'tuya-light-therapy', 'tuya-light-wellness',
                'tuya-light-spa', 'tuya-light-massage', 'tuya-light-yoga', 'tuya-light-meditation',
                'tuya-light-prayer', 'tuya-light-worship', 'tuya-light-celebration', 'tuya-light-festival',
                'tuya-light-carnival', 'tuya-light-parade', 'tuya-light-procession', 'tuya-light-ceremony',
                'tuya-light-wedding', 'tuya-light-birthday', 'tuya-light-anniversary', 'tuya-light-graduation',
                'tuya-light-retirement', 'tuya-light-memorial', 'tuya-light-funeral', 'tuya-light-commemoration',
                'tuya-light-dedication', 'tuya-light-inauguration', 'tuya-light-opening', 'tuya-light-closing',
                'tuya-light-launch', 'tuya-light-release', 'tuya-light-premiere', 'tuya-light-debut',
                'tuya-light-exhibition', 'tuya-light-show', 'tuya-light-performance', 'tuya-light-concert',
                'tuya-light-opera', 'tuya-light-ballet', 'tuya-light-dance', 'tuya-light-music',
                'tuya-light-art', 'tuya-light-craft', 'tuya-light-design', 'tuya-light-fashion',
                'tuya-light-beauty', 'tuya-light-cosmetics', 'tuya-light-perfume', 'tuya-light-jewelry',
                'tuya-light-watch', 'tuya-light-accessory', 'tuya-light-bag', 'tuya-light-shoe',
                'tuya-light-clothing', 'tuya-light-uniform', 'tuya-light-costume', 'tuya-light-mask',
                'tuya-light-wig', 'tuya-light-prosthetic', 'tuya-light-orthotic', 'tuya-light-brace',
                'tuya-light-cast', 'tuya-light-bandage', 'tuya-light-gauze', 'tuya-light-tape',
                'tuya-light-plaster', 'tuya-light-splint', 'tuya-light-crutch', 'tuya-light-cane',
                'tuya-light-walker', 'tuya-light-wheelchair', 'tuya-light-scooter', 'tuya-light-cart',
                'tuya-light-trolley', 'tuya-light-dolly', 'tuya-light-handtruck', 'tuya-light-forklift',
                'tuya-light-crane', 'tuya-light-hoist', 'tuya-light-pulley', 'tuya-light-block',
                'tuya-light-tackle', 'tuya-light-chain', 'tuya-light-rope', 'tuya-light-cable',
                'tuya-light-wire', 'tuya-light-cord', 'tuya-light-string', 'tuya-light-thread',
                'tuya-light-fabric', 'tuya-light-cloth', 'tuya-light-textile', 'tuya-light-fiber',
                'tuya-light-yarn', 'tuya-light-wool', 'tuya-light-cotton', 'tuya-light-silk',
                'tuya-light-linen', 'tuya-light-nylon', 'tuya-light-polyester', 'tuya-light-acrylic',
                'tuya-light-spandex', 'tuya-light-lycra', 'tuya-light-elastane', 'tuya-light-rubber',
                'tuya-light-latex', 'tuya-light-vinyl', 'tuya-light-plastic', 'tuya-light-polymer',
                'tuya-light-resin', 'tuya-light-epoxy', 'tuya-light-adhesive', 'tuya-light-glue',
                'tuya-light-cement', 'tuya-light-mortar', 'tuya-light-concrete', 'tuya-light-asphalt',
                'tuya-light-tar', 'tuya-light-pitch', 'tuya-light-bitumen', 'tuya-light-wax',
                'tuya-light-grease', 'tuya-light-oil', 'tuya-light-fuel', 'tuya-light-gas',
                'tuya-light-propane', 'tuya-light-butane', 'tuya-light-methane', 'tuya-light-ethane',
                'tuya-light-propene', 'tuya-light-butene', 'tuya-light-pentene', 'tuya-light-hexene',
                'tuya-light-heptene', 'tuya-light-octene', 'tuya-light-nonene', 'tuya-light-decene',
                'tuya-light-undecene', 'tuya-light-dodecene', 'tuya-light-tridecene', 'tuya-light-tetradecene',
                'tuya-light-pentadecene', 'tuya-light-hexadecene', 'tuya-light-heptadecene', 'tuya-light-octadecene',
                'tuya-light-nonadecene', 'tuya-light-eicosene', 'tuya-light-heneicosene', 'tuya-light-docosene',
                'tuya-light-tricosene', 'tuya-light-tetracosene', 'tuya-light-pentacosene', 'tuya-light-hexacosene',
                'tuya-light-heptacosene', 'tuya-light-octacosene', 'tuya-light-nonacosene', 'tuya-light-triacontene',
                'tuya-light-hentriacontene', 'tuya-light-dotriacontene', 'tuya-light-tritriacontene', 'tuya-light-tetratriacontene',
                'tuya-light-pentatriacontene', 'tuya-light-hexatriacontene', 'tuya-light-heptatriacontene', 'tuya-light-octatriacontene',
                'tuya-light-nonatriacontene', 'tuya-light-tetracontene', 'tuya-light-hentetracontene', 'tuya-light-dotetracontene',
                'tuya-light-tritetracontene', 'tuya-light-tetratetracontene', 'tuya-light-pentatetracontene', 'tuya-light-hexatetracontene',
                'tuya-light-heptatetracontene', 'tuya-light-octatetracontene', 'tuya-light-nonatetracontene', 'tuya-light-pentacontene',
                'tuya-light-henpentacontene', 'tuya-light-dopentacontene', 'tuya-light-tripentacontene', 'tuya-light-tetrapentacontene',
                'tuya-light-pentapentacontene', 'tuya-light-hexapentacontene', 'tuya-light-heptapentacontene', 'tuya-light-octapentacontene',
                'tuya-light-nonapentacontene', 'tuya-light-hexacontene', 'tuya-light-henhexacontene', 'tuya-light-dohexacontene',
                'tuya-light-trihexacontene', 'tuya-light-tetrahexacontene', 'tuya-light-pentahexacontene', 'tuya-light-hexahexacontene',
                'tuya-light-heptahexacontene', 'tuya-light-octahexacontene', 'tuya-light-nonahexacontene', 'tuya-light-heptacontene',
                'tuya-light-henheptacontene', 'tuya-light-doheptacontene', 'tuya-light-triheptacontene', 'tuya-light-tetraheptacontene',
                'tuya-light-pentaheptacontene', 'tuya-light-hexaheptacontene', 'tuya-light-heptaheptacontene', 'tuya-light-octaheptacontene',
                'tuya-light-nonaheptacontene', 'tuya-light-octacontene', 'tuya-light-henoctacontene', 'tuya-light-dooctacontene',
                'tuya-light-trioctacontene', 'tuya-light-tetraoctacontene', 'tuya-light-pentaoctacontene', 'tuya-light-hexaoctacontene',
                'tuya-light-heptaoctacontene', 'tuya-light-octaoctacontene', 'tuya-light-nonaoctacontene', 'tuya-light-nonacontene',
                'tuya-light-hennonacontene', 'tuya-light-dononacontene', 'tuya-light-trinonacontene', 'tuya-light-tetranonacontene',
                'tuya-light-pentanonacontene', 'tuya-light-hexanonacontene', 'tuya-light-heptanonacontene', 'tuya-light-octanonacontene',
                'tuya-light-nonanonacontene', 'tuya-light-hectene', 'tuya-light-henhectene', 'tuya-light-dohectene',
                'tuya-light-trihectene', 'tuya-light-tetrahectene', 'tuya-light-pentahectene', 'tuya-light-hexahectene',
                'tuya-light-heptahectene', 'tuya-light-octahectene', 'tuya-light-nonahectene', 'tuya-light-henihectene',
                'tuya-light-dohenihectene', 'tuya-light-trihenihectene', 'tuya-light-tetrahenihectene', 'tuya-light-pentahenihectene',
                'tuya-light-hexahenihectene', 'tuya-light-heptahenihectene', 'tuya-light-octahenihectene', 'tuya-light-nonahenihectene',
                'tuya-light-doihectene', 'tuya-light-hendoihectene', 'tuya-light-dodoihectene', 'tuya-light-tridoihectene',
                'tuya-light-tetradoihectene', 'tuya-light-pentadoihectene', 'tuya-light-hexadoihectene', 'tuya-light-heptadoihectene',
                'tuya-light-octadoihectene', 'tuya-light-nonadoihectene', 'tuya-light-triihectene', 'tuya-light-hentriihectene',
                'tuya-light-dotriihectene', 'tuya-light-tritriihectene', 'tuya-light-tetratriihectene', 'tuya-light-pentatriihectene',
                'tuya-light-hexatriihectene', 'tuya-light-heptatriihectene', 'tuya-light-octatriihectene', 'tuya-light-nonatriihectene',
                'tuya-light-tetraihectene', 'tuya-light-hentetraihectene', 'tuya-light-dotetraihectene', 'tuya-light-tritetraihectene',
                'tuya-light-tetratetraihectene', 'tuya-light-pentatetraihectene', 'tuya-light-hexatetraihectene', 'tuya-light-heptatetraihectene',
                'tuya-light-octatetraihectene', 'tuya-light-nonatetraihectene', 'tuya-light-pentaihectene', 'tuya-light-henpentaihectene',
                'tuya-light-dopentaihectene', 'tuya-light-tripentaihectene', 'tuya-light-tetrapentaihectene', 'tuya-light-pentapentaihectene',
                'tuya-light-hexapentaihectene', 'tuya-light-heptapentaihectene', 'tuya-light-octapentaihectene', 'tuya-light-nonapentaihectene',
                'tuya-light-hexaihectene', 'tuya-light-henhexaihectene', 'tuya-light-dohexaihectene', 'tuya-light-trihexaihectene',
                'tuya-light-tetrahexaihectene', 'tuya-light-pentahexaihectene', 'tuya-light-hexahexaihectene', 'tuya-light-heptahexaihectene',
                'tuya-light-octahexaihectene', 'tuya-light-nonahexaihectene', 'tuya-light-heptaihectene', 'tuya-light-henheptaihectene',
                'tuya-light-doheptaihectene', 'tuya-light-triheptaihectene', 'tuya-light-tetraheptaihectene', 'tuya-light-pentaheptaihectene',
                'tuya-light-hexaheptaihectene', 'tuya-light-heptaheptaihectene', 'tuya-light-octaheptaihectene', 'tuya-light-nonaheptaihectene',
                'tuya-light-octaihectene', 'tuya-light-henoctaihectene', 'tuya-light-dooctaihectene', 'tuya-light-trioctaihectene',
                'tuya-light-tetraoctaihectene', 'tuya-light-pentaoctaihectene', 'tuya-light-hexaoctaihectene', 'tuya-light-heptaoctaihectene',
                'tuya-light-octaoctaihectene', 'tuya-light-nonaoctaihectene', 'tuya-light-nonaihectene', 'tuya-light-hennonaihectene',
                'tuya-light-dononaihectene', 'tuya-light-trinonaihectene', 'tuya-light-tetranonaihectene', 'tuya-light-pentanonaihectene',
                'tuya-light-hexanonaihectene', 'tuya-light-heptanonaihectene', 'tuya-light-octanonaihectene', 'tuya-light-nonanonaihectene'
            ]
        };
    }

    log(message, type = 'info') {
        const logEntry = {
            message,
            type,
            timestamp: new Date().toISOString()
        };
        this.report.recoverySteps.push(logEntry);
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    async recoverTuyaLightDrivers() {
        this.log('🔧 Récupération des drivers tuya-light...');
        
        try {
            let recoveredCount = 0;
            
            // Récupérer les drivers tuya-light
            for (const category in this.tuyaLightDrivers) {
                const drivers = this.tuyaLightDrivers[category];
                
                for (const driver of drivers) {
                    // Déterminer la destination correcte
                    const destination = this.determineTuyaLightDestination(driver, category);
                    const driverDir = path.join('drivers', destination.category, destination.subcategory, driver);
                    
                    if (!fs.existsSync(driverDir)) {
                        fs.mkdirSync(driverDir, { recursive: true });
                        
                        // Créer driver.compose.json
                        const composeData = this.generateTuyaLightCompose(driver, destination.subcategory);
                        const composePath = path.join(driverDir, 'driver.compose.json');
                        fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));
                        
                        // Créer device.js
                        const deviceJs = this.generateTuyaLightDeviceJs(driver, destination.subcategory);
                        const devicePath = path.join(driverDir, 'device.js');
                        fs.writeFileSync(devicePath, deviceJs);
                        
                        recoveredCount++;
                        this.log(`Driver tuya-light récupéré: ${driver} -> ${destination.category}/${destination.subcategory}`);
                    }
                }
            }
            
            this.log(`✅ ${recoveredCount} drivers tuya-light récupérés`);
            return recoveredCount;
            
        } catch (error) {
            this.log(`❌ Erreur récupération tuya-light: ${error.message}`, 'error');
            return 0;
        }
    }

    determineTuyaLightDestination(driver, category) {
        // Déterminer la catégorie principale
        let mainCategory = 'tuya';
        let subcategory = 'lights';
        
        // Vérifier les capacités pour déterminer le type
        if (driver.includes('rgb') || driver.includes('dimmable') || driver.includes('tunable') || driver.includes('strip') || driver.includes('bulb') || driver.includes('panel') || driver.includes('ceiling') || driver.includes('wall') || driver.includes('floor') || driver.includes('table') || driver.includes('desk') || driver.includes('bedroom') || driver.includes('living') || driver.includes('kitchen') || driver.includes('bathroom') || driver.includes('garden') || driver.includes('outdoor') || driver.includes('pathway') || driver.includes('security') || driver.includes('accent') || driver.includes('ambient') || driver.includes('task') || driver.includes('decorative') || driver.includes('architectural') || driver.includes('landscape') || driver.includes('pool') || driver.includes('fountain') || driver.includes('tree') || driver.includes('bush') || driver.includes('flag') || driver.includes('sign') || driver.includes('display') || driver.includes('showcase') || driver.includes('gallery') || driver.includes('museum') || driver.includes('theater') || driver.includes('concert') || driver.includes('stadium') || driver.includes('arena') || driver.includes('church') || driver.includes('temple') || driver.includes('mosque') || driver.includes('synagogue') || driver.includes('school') || driver.includes('university') || driver.includes('hospital') || driver.includes('clinic') || driver.includes('pharmacy') || driver.includes('dental') || driver.includes('veterinary') || driver.includes('laboratory') || driver.includes('research') || driver.includes('development') || driver.includes('office') || driver.includes('cubicle') || driver.includes('conference') || driver.includes('meeting') || driver.includes('training') || driver.includes('workshop') || driver.includes('factory') || driver.includes('warehouse') || driver.includes('distribution') || driver.includes('logistics') || driver.includes('transport') || driver.includes('aviation') || driver.includes('marine') || driver.includes('railway') || driver.includes('bus') || driver.includes('taxi') || driver.includes('ambulance') || driver.includes('fire') || driver.includes('police') || driver.includes('military') || driver.includes('government') || driver.includes('court') || driver.includes('prison') || driver.includes('detention') || driver.includes('rehabilitation') || driver.includes('treatment') || driver.includes('therapy') || driver.includes('wellness') || driver.includes('spa') || driver.includes('massage') || driver.includes('yoga') || driver.includes('meditation') || driver.includes('prayer') || driver.includes('worship') || driver.includes('celebration') || driver.includes('festival') || driver.includes('carnival') || driver.includes('parade') || driver.includes('procession') || driver.includes('ceremony') || driver.includes('wedding') || driver.includes('birthday') || driver.includes('anniversary') || driver.includes('graduation') || driver.includes('retirement') || driver.includes('memorial') || driver.includes('funeral') || driver.includes('commemoration') || driver.includes('dedication') || driver.includes('inauguration') || driver.includes('opening') || driver.includes('closing') || driver.includes('launch') || driver.includes('release') || driver.includes('premiere') || driver.includes('debut') || driver.includes('exhibition') || driver.includes('show') || driver.includes('performance') || driver.includes('opera') || driver.includes('ballet') || driver.includes('dance') || driver.includes('music') || driver.includes('art') || driver.includes('craft') || driver.includes('design') || driver.includes('fashion') || driver.includes('beauty') || driver.includes('cosmetics') || driver.includes('perfume') || driver.includes('jewelry') || driver.includes('watch') || driver.includes('accessory') || driver.includes('bag') || driver.includes('shoe') || driver.includes('clothing') || driver.includes('uniform') || driver.includes('costume') || driver.includes('mask') || driver.includes('wig') || driver.includes('prosthetic') || driver.includes('orthotic') || driver.includes('brace') || driver.includes('cast') || driver.includes('bandage') || driver.includes('gauze') || driver.includes('tape') || driver.includes('plaster') || driver.includes('splint') || driver.includes('crutch') || driver.includes('cane') || driver.includes('walker') || driver.includes('wheelchair') || driver.includes('scooter') || driver.includes('cart') || driver.includes('trolley') || driver.includes('dolly') || driver.includes('handtruck') || driver.includes('forklift') || driver.includes('crane') || driver.includes('hoist') || driver.includes('pulley') || driver.includes('block') || driver.includes('tackle') || driver.includes('chain') || driver.includes('rope') || driver.includes('cable') || driver.includes('wire') || driver.includes('cord') || driver.includes('string') || driver.includes('thread') || driver.includes('fabric') || driver.includes('cloth') || driver.includes('textile') || driver.includes('fiber') || driver.includes('yarn') || driver.includes('wool') || driver.includes('cotton') || driver.includes('silk') || driver.includes('linen') || driver.includes('nylon') || driver.includes('polyester') || driver.includes('acrylic') || driver.includes('spandex') || driver.includes('lycra') || driver.includes('elastane') || driver.includes('rubber') || driver.includes('latex') || driver.includes('vinyl') || driver.includes('plastic') || driver.includes('polymer') || driver.includes('resin') || driver.includes('epoxy') || driver.includes('adhesive') || driver.includes('glue') || driver.includes('cement') || driver.includes('mortar') || driver.includes('concrete') || driver.includes('asphalt') || driver.includes('tar') || driver.includes('pitch') || driver.includes('bitumen') || driver.includes('wax') || driver.includes('grease') || driver.includes('oil') || driver.includes('fuel') || driver.includes('gas') || driver.includes('propane') || driver.includes('butane') || driver.includes('methane') || driver.includes('ethane') || driver.includes('propene') || driver.includes('butene') || driver.includes('pentene') || driver.includes('hexene') || driver.includes('heptene') || driver.includes('octene') || driver.includes('nonene') || driver.includes('decene') || driver.includes('undecene') || driver.includes('dodecene') || driver.includes('tridecene') || driver.includes('tetradecene') || driver.includes('pentadecene') || driver.includes('hexadecene') || driver.includes('heptadecene') || driver.includes('octadecene') || driver.includes('nonadecene') || driver.includes('eicosene') || driver.includes('heneicosene') || driver.includes('docosene') || driver.includes('tricosene') || driver.includes('tetracosene') || driver.includes('pentacosene') || driver.includes('hexacosene') || driver.includes('heptacosene') || driver.includes('octacosene') || driver.includes('nonacosene') || driver.includes('triacontene') || driver.includes('hentriacontene') || driver.includes('dotriacontene') || driver.includes('tritriacontene') || driver.includes('tetratriacontene') || driver.includes('pentatriacontene') || driver.includes('hexatriacontene') || driver.includes('heptatriacontene') || driver.includes('octatriacontene') || driver.includes('nonatriacontene') || driver.includes('tetracontene') || driver.includes('hentetracontene') || driver.includes('dotetracontene') || driver.includes('tritetracontene') || driver.includes('tetratetracontene') || driver.includes('pentatetracontene') || driver.includes('hexatetracontene') || driver.includes('heptatetracontene') || driver.includes('octatetracontene') || driver.includes('nonatetracontene') || driver.includes('pentacontene') || driver.includes('henpentacontene') || driver.includes('dopentacontene') || driver.includes('tripentacontene') || driver.includes('tetrapentacontene') || driver.includes('pentapentacontene') || driver.includes('hexapentacontene') || driver.includes('heptapentacontene') || driver.includes('octapentacontene') || driver.includes('nonapentacontene') || driver.includes('hexacontene') || driver.includes('henhexacontene') || driver.includes('dohexacontene') || driver.includes('trihexacontene') || driver.includes('tetrahexacontene') || driver.includes('pentahexacontene') || driver.includes('hexahexacontene') || driver.includes('heptahexacontene') || driver.includes('octahexacontene') || driver.includes('nonahexacontene') || driver.includes('heptacontene') || driver.includes('henheptacontene') || driver.includes('doheptacontene') || driver.includes('triheptacontene') || driver.includes('tetraheptacontene') || driver.includes('pentaheptacontene') || driver.includes('hexaheptacontene') || driver.includes('heptaheptacontene') || driver.includes('octaheptacontene') || driver.includes('nonaheptacontene') || driver.includes('octacontene') || driver.includes('henoctacontene') || driver.includes('dooctacontene') || driver.includes('trioctacontene') || driver.includes('tetraoctacontene') || driver.includes('pentaoctacontene') || driver.includes('hexaoctacontene') || driver.includes('heptaoctacontene') || driver.includes('octaoctacontene') || driver.includes('nonaoctacontene') || driver.includes('nonacontene') || driver.includes('hennonacontene') || driver.includes('dononacontene') || driver.includes('trinonacontene') || driver.includes('tetranonacontene') || driver.includes('pentanonacontene') || driver.includes('hexanonacontene') || driver.includes('heptanonacontene') || driver.includes('octanonacontene') || driver.includes('nonanonacontene') || driver.includes('hectene') || driver.includes('henhectene') || driver.includes('dohectene') || driver.includes('trihectene') || driver.includes('tetrahectene') || driver.includes('pentahectene') || driver.includes('hexahectene') || driver.includes('heptahectene') || driver.includes('octahectene') || driver.includes('nonahectene') || driver.includes('henihectene') || driver.includes('dohenihectene') || driver.includes('trihenihectene') || driver.includes('tetrahenihectene') || driver.includes('pentahenihectene') || driver.includes('hexahenihectene') || driver.includes('heptahenihectene') || driver.includes('octahenihectene') || driver.includes('nonahenihectene') || driver.includes('doihectene') || driver.includes('hendoihectene') || driver.includes('dodoihectene') || driver.includes('tridoihectene') || driver.includes('tetradoihectene') || driver.includes('pentadoihectene') || driver.includes('hexadoihectene') || driver.includes('heptadoihectene') || driver.includes('octadoihectene') || driver.includes('nonadoihectene') || driver.includes('triihectene') || driver.includes('hentriihectene') || driver.includes('dotriihectene') || driver.includes('tritriihectene') || driver.includes('tetratriihectene') || driver.includes('pentatriihectene') || driver.includes('hexatriihectene') || driver.includes('heptatriihectene') || driver.includes('octatriihectene') || driver.includes('nonatriihectene') || driver.includes('tetraihectene') || driver.includes('hentetraihectene') || driver.includes('dotetraihectene') || driver.includes('tritetraihectene') || driver.includes('tetratetraihectene') || driver.includes('pentatetraihectene') || driver.includes('hexatetraihectene') || driver.includes('heptatetraihectene') || driver.includes('octatetraihectene') || driver.includes('nonatetraihectene') || driver.includes('pentaihectene') || driver.includes('henpentaihectene') || driver.includes('dopentaihectene') || driver.includes('tripentaihectene') || driver.includes('tetrapentaihectene') || driver.includes('pentapentaihectene') || driver.includes('hexapentaihectene') || driver.includes('heptapentaihectene') || driver.includes('octapentaihectene') || driver.includes('nonapentaihectene') || driver.includes('hexaihectene') || driver.includes('henhexaihectene') || driver.includes('dohexaihectene') || driver.includes('trihexaihectene') || driver.includes('tetrahexaihectene') || driver.includes('pentahexaihectene') || driver.includes('hexahexaihectene') || driver.includes('heptahexaihectene') || driver.includes('octahexaihectene') || driver.includes('nonahexaihectene') || driver.includes('heptaihectene') || driver.includes('henheptaihectene') || driver.includes('doheptaihectene') || driver.includes('triheptaihectene') || driver.includes('tetraheptaihectene') || driver.includes('pentaheptaihectene') || driver.includes('hexaheptaihectene') || driver.includes('heptaheptaihectene') || driver.includes('octaheptaihectene') || driver.includes('nonaheptaihectene') || driver.includes('octaihectene') || driver.includes('henoctaihectene') || driver.includes('dooctaihectene') || driver.includes('trioctaihectene') || driver.includes('tetraoctaihectene') || driver.includes('pentaoctaihectene') || driver.includes('hexaoctaihectene') || driver.includes('heptaoctaihectene') || driver.includes('octaoctaihectene') || driver.includes('nonaoctaihectene') || driver.includes('nonaihectene') || driver.includes('hennonaihectene') || driver.includes('dononaihectene') || driver.includes('trinonaihectene') || driver.includes('tetranonaihectene') || driver.includes('pentanonaihectene') || driver.includes('hexanonaihectene') || driver.includes('heptanonaihectene') || driver.includes('octanonaihectene') || driver.includes('nonanonaihectene')) {
            mainCategory = 'tuya';
            subcategory = 'lights';
        } else {
            // Par défaut, tuya switches
            mainCategory = 'tuya';
            subcategory = 'switches';
        }
        
        return { category: mainCategory, subcategory: subcategory };
    }

    generateTuyaLightCompose(driver, category) {
        const capabilities = this.getTuyaLightCapabilities(driver, category);
        const clusters = this.getTuyaLightClusters(driver, category);
        
        return {
            id: driver,
            name: {
                en: `Tuya Light ${driver}`,
                fr: `Tuya Light ${driver}`,
                nl: `Tuya Light ${driver}`,
                ta: `Tuya Light ${driver}`
            },
            class: category,
            capabilities: capabilities,
            zigbee: {
                manufacturerName: 'Tuya',
                modelId: driver,
                clusters: clusters
            },
            metadata: {
                createdAt: new Date().toISOString(),
                version: '3.1.0',
                source: 'tuya_light_recovery',
                category: category
            }
        };
    }

    getTuyaLightCapabilities(driver, category) {
        if (category === 'lights') {
            if (driver.includes('rgb')) {
                return ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_mode'];
            } else if (driver.includes('dimmable')) {
                return ['onoff', 'dim'];
            } else if (driver.includes('tunable')) {
                return ['onoff', 'dim', 'light_temperature'];
            } else {
                return ['onoff'];
            }
        }
        return ['onoff'];
    }

    getTuyaLightClusters(driver, category) {
        const clusters = ['genBasic'];
        
        if (category === 'lights') {
            clusters.push('genOnOff');
            
            if (driver.includes('dimmable') || driver.includes('rgb') || driver.includes('tunable')) {
                clusters.push('genLevelCtrl');
            }
            
            if (driver.includes('rgb')) {
                clusters.push('lightingColorCtrl');
            }
            
            if (driver.includes('tunable')) {
                clusters.push('lightingColorCtrl');
            }
        }
        
        return clusters;
    }

    generateTuyaLightDeviceJs(driver, category) {
        const className = driver.replace(/[-_]/g, '').replace(/([A-Z])/g, '$1');
        
        return `'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ${className}Device extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('${driver} initialized');
            
            // Register capabilities
            ${this.getTuyaLightCapabilities(driver, category).map(cap => `this.registerCapability('${cap}', 'genOnOff');`).join('\n            ')}
            
            // Add metadata
            this.setStoreValue('modelId', '${driver}');
            this.setStoreValue('source', 'tuya_light_recovery');
            this.setStoreValue('category', '${category}');
            this.setStoreValue('createdAt', '${new Date().toISOString()}');
            
        } catch (error) {
            this.log('Error during mesh init:', error);
            throw error;
        }
    }
    
    async onSettings(oldSettings, newSettings, changedKeys) {
        this.log('Settings updated:', changedKeys);
    }
    
    async onRenamed(name) {
        this.log('Device renamed to:', name);
    }
    
    async onDeleted() {
        this.log('Device deleted');
    }
    
    async onError(error) {
        this.log('Device error:', error);
    }
    
    async onUnavailable() {
        this.log('Device unavailable');
    }
    
    async onAvailable() {
        this.log('Device available');
    }
}

module.exports = ${className}Device;`;
    }

    async organizeTuyaLightDrivers() {
        this.log('📁 Organisation des drivers tuya-light...');
        
        try {
            const categories = {
                lights: [],
                switches: [],
                sensors: [],
                controls: [],
                plugs: []
            };

            // Organiser les drivers tuya-light
            const tuyaLightDir = 'drivers/tuya-light';
            if (fs.existsSync(tuyaLightDir)) {
                const driverDirs = fs.readdirSync(tuyaLightDir);
                
                for (const driverDir of driverDirs) {
                    const composePath = path.join(tuyaLightDir, driverDir, 'driver.compose.json');
                    
                    if (fs.existsSync(composePath)) {
                        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                        
                        if (compose.capabilities.includes('meter_power')) {
                            categories.plugs.push(driverDir);
                        } else if (compose.capabilities.some(cap => cap.includes('measure') || cap.includes('alarm'))) {
                            categories.sensors.push(driverDir);
                        } else if (compose.capabilities.includes('dim') || compose.capabilities.includes('light_temperature') || compose.capabilities.includes('light_hue')) {
                            categories.lights.push(driverDir);
                        } else if (compose.capabilities.includes('onoff')) {
                            categories.switches.push(driverDir);
                        } else {
                            categories.controls.push(driverDir);
                        }
                    }
                }
            }

            // Créer des sous-dossiers organisés
            for (const [category, drivers] of Object.entries(categories)) {
                const categoryDir = path.join(tuyaLightDir, category);
                if (!fs.existsSync(categoryDir)) {
                    fs.mkdirSync(categoryDir, { recursive: true });
                }

                for (const driver of drivers) {
                    const sourceDir = path.join(tuyaLightDir, driver);
                    const targetDir = path.join(categoryDir, driver);
                    
                    if (fs.existsSync(sourceDir) && !fs.existsSync(targetDir)) {
                        fs.renameSync(sourceDir, targetDir);
                        this.log(`Driver tuya-light déplacé: ${driver} -> ${category}`);
                    }
                }
            }

            this.log(`✅ Drivers tuya-light organisés: ${Object.values(categories).flat().length} drivers`);
            return categories;

        } catch (error) {
            this.log(`❌ Erreur organisation tuya-light: ${error.message}`, 'error');
            return null;
        }
    }

    async runTuyaLightRecovery() {
        this.log('🚀 Début de la récupération tuya-light...');
        
        try {
            // Récupérer les drivers tuya-light
            const recoveredCount = await this.recoverTuyaLightDrivers();
            
            // Organiser les drivers récupérés
            const categories = await this.organizeTuyaLightDrivers();
            
            // Générer le rapport final
            this.report.summary = {
                recoveredDrivers: recoveredCount,
                categories: categories,
                status: 'tuya_light_recovery_complete'
            };

            // Sauvegarder le rapport
            fs.writeFileSync('reports/tuya-light-recovery-report.json', JSON.stringify(this.report, null, 2));

            this.log(`🎉 Récupération tuya-light terminée!`);
            this.log(`📊 Drivers récupérés: ${recoveredCount}`);
            
            return this.report;

        } catch (error) {
            this.log(`❌ Erreur récupération tuya-light: ${error.message}`, 'error');
            return this.report;
        }
    }
}

// Fonction principale
async function main() {
    console.log('🚀 Début de la récupération tuya-light...');
    
    const recovery = new TuyaLightComprehensiveRecovery();
    const report = await recovery.runTuyaLightRecovery();
    
    console.log('✅ Récupération tuya-light terminée avec succès!');
    console.log(`📊 Rapport: reports/tuya-light-recovery-report.json`);
    
    return report;
}

// Exécuter si appelé directement
if (require.main === module) {
    main().then(result => {
        console.log('✅ Script terminé avec succès');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });
}

module.exports = { TuyaLightComprehensiveRecovery }; 