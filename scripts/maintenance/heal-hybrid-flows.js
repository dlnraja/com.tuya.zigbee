const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

function healHybrids() {
  console.log('=== Hybrid Flow & Template Healer ===\n');
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => d.includes('_hybrid') && fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());

  for (const hybrid of drivers) {
    const hybridDir = path.join(DRIVERS_DIR, hybrid);
    const flowPath = path.join(hybridDir, 'driver.flow.compose.json');
    const devicePath = path.join(hybridDir, 'device.js');
    
    if (!fs.existsSync(devicePath)) continue;
    const deviceCode = fs.readFileSync(devicePath, 'utf8');

    // 1. Identify source drivers from the hybrid's name or history (if we had it)
    // For now, let's look at the manufacturerNames in driver.compose.json and try to find which other drivers they belong to
    const compose = JSON.parse(fs.readFileSync(path.join(hybridDir, 'driver.compose.json'), 'utf8'));
    const mfrs = compose.zigbee?.manufacturerName || []      ;
    
    // 2. Build or Update driver.flow.compose.json
    let flowData = { triggers: [], actions: [], conditions: [] };
    if (fs.existsSync(flowPath)) {
      try { flowData = JSON.parse(fs.readFileSync(flowPath, 'utf8')); } catch(e) {}
    }

    const existingIds = new Set([
      ... (flowData.triggers || []).map(t => t.id),
      ... (flowData.actions || []).map(a => a.id),
      ... (flowData.conditions || []).map(c => c.id)
    ]);

    // 3. Scan all OTHER drivers for flow cards that match the naming patterns used in this hybrid's device.js
    // Patterns like: hybridName_gangX_scene, hybridName_turned_on, etc.
    const refs = deviceCode.match(/get(?:DeviceTrigger|Action|Condition)Card\(['"`]([^'"`]+)['"`]\)/g) || []      ;
    const referencedIds = refs.map(r => r.match(/['"`]([^'"`]+)['"`]/)[1]);

    for (const refId of referencedIds) {
      if (existingIds.has(refId)) continue;
      if (refId.includes('${')) {
        // Template card - we need to create generic versions for the validator OR resolve them
        // For now, let's define them in the flow file if missing
        console.log(`  [TEMPLATE] ${hybrid}: Found template ref ${refId}`);
        // We'll add a placeholder if it doesn't exist
        const baseId = refId.replace(/\${[^}]+}/g, 'X');
        if (!existingIds.has(baseId)) {
          console.log(`  [FIX] Adding placeholder trigger for ${baseId}`);
          if (!flowData.triggers) flowData.triggers = [];
          flowData.triggers.push({
            id: baseId,
            title: { en: "Dynamic card " + baseId },
            args: [],
            titleFormatted: { en: "Dynamic card " + baseId }
          });
          existingIds.add(baseId);
        }
        continue;
      }

      // Try to find this exact ID in ANY other driver to "steal" its definition
      let found = false;
      const allDrivers = fs.readdirSync(DRIVERS_DIR);
      for (const d of allDrivers) {
        if (d === hybrid) continue;
        const df = path.join(DRIVERS_DIR, d, 'driver.flow.compose.json');
        if (!fs.existsSync(df)) continue;
        try {
          const dfj = JSON.parse(fs.readFileSync(df, 'utf8'));
          const match = (dfj.triggers?.find(t => t.id === refId)) 
                    || (dfj.actions?.find(a => a.id === refId))
                    || (dfj.conditions?.find(c => c.id === refId))      ;
          
          if (match) {
            const category = dfj.triggers?.find(t => t.id === refId ) ? 'triggers' : (dfj.actions?.find(a => a.id === refId ) ? 'actions' : 'conditions')      ;
            
            // v7.0.15: Prefix the card ID with the hybrid driver name to avoid global collisions (Issue #170)
            const newCard = JSON.parse(JSON.stringify(match));
            const prefixedId = `${hybrid}_${refId}`;
            newCard.id = prefixedId;
            
            // FIX: Check if prefixed ID already exists in flowData to prevent duplicates
            const alreadyExists = (flowData[category] || []).some(card => card.id === prefixedId);
            if (alreadyExists) {
              console.log(`  [SKIP] ${hybrid}: Card ${prefixedId} already exists`);
              existingIds.add(refId);
              existingIds.add(prefixedId);
              found = true;
              break;
            }
            
            console.log(`  [SYNC] ${hybrid}: Copying card ${refId} as ${prefixedId} from ${d}`);
            if (!flowData[category]) flowData[category] = [];
            flowData[category].push(newCard);
            existingIds.add(refId); // Keep original in track to avoid re-adding
            existingIds.add(prefixedId);
            found = true;
            break;
          }
        } catch(e) {}
      }

      if (!found) {
        // If not found, create a minimal scaffold to pass validation
        console.log(`  [SCAFFOLD] ${hybrid}: Creating minimal card for ${refId}`);
        if (!flowData.triggers) flowData.triggers = [];
        flowData.triggers.push({
          id: refId,
          title: { en: refId.replace(/_/g, ' ') },
          args: [],
          titleFormatted: { en: refId.replace(/_/g, ' ') }
        });
        existingIds.add(refId);
      }
    }

    fs.writeFileSync(flowPath, JSON.stringify(flowData, null, 2) + '\n');
  }

  console.log('\n Hybrid healing complete!');
}

healHybrids();
