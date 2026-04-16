const fs = require('fs');

// Enhance scene mode detection with Z2M/ZHA research findings
const doc = `# Scene Mode Enhancement - v6.0

## Research Findings

### Z2M Issue #7158 + ZHA Issue #1372

**Problem**: TS004F has TWO modes that need proper detection:
1. **Dimmer Mode** (default): Buttons send levelCtrl commands (brightness up/down)
2. **Scene Mode**: Buttons send scene commands (single/double/long press)

**Solution**: Write attribute 0x8004 = 1 on onOff cluster to force Scene mode

### Mode Switch Detection

Users can manually toggle modes by **holding buttons 2+3 simultaneously** for 5 seconds.
This sends an \`attribute_updated\` event with \`switch_mode\` attribute changing.

### Additional TS004F Manufacturers Needing Scene Mode

From Z2M/ZHA/Hubitat research:
- _TZ3000_rrjr1dsk
- _TZ3000_vdfwjopk  
- _TZ3000_kjfzuycl
- _TZ3000_ja5osu5g
- _TZ3000_owgcnkrh
- _TZ3000_abrsvsou (already in list)

## Implementation Status

### ✅ Already Implemented

1. **Universal Scene Mode Switch** (\`ButtonDevice.js:217\`)
   - Automatic 0x8004 attribute write on pairing
   - 5 retry attempts with exponential backoff
   - Skips E000 cluster devices (different protocol)

2. **Manufacturer Detection** (\`ManufacturerVariationManager.js:183\`)
   - List of 15 known TS004F scene mode manufacturers
   - Configures proper endpoints and bindings

3. **Scene Flow Cards** (\`PhysicalButtonMixin.js:702-710\`)
   - Triggers \`{driver}_gang{N}_scene\` when sceneMode enabled
   - Tokens: \`{ action: 'on'|'off', gang: 1-4 }\`

### 🔧 Enhancements Needed

1. **Listen for Manual Mode Changes**
   - Detect when user switches modes via physical button hold
   - Update \`sceneMode\` setting accordingly

2. **Expose Mode Setting**
   - Allow users to force Dimmer or Scene mode via settings
   - Currently auto-detected only

3. **Fallback for Failed Mode Switch**
   - If 5 retries fail, notify user with device unavailable message
   - Provide instructions for manual mode switch

## Code Locations

- \`lib/devices/ButtonDevice.js:217-320\` - Universal scene mode switch
- \`lib/mixins/PhysicalButtonMixin.js:702-711\` - Scene flow trigger
- \`lib/managers/ManufacturerVariationManager.js:183-202\` - TS004F config
- \`lib/registry/profiles/buttons.js:80-95\` - Scene mode profile

## Testing Scenarios

1. ✅ TS004F pairs → scene mode activated → single/double/long press work
2. ✅ TS0044 (non-F) → scene mode skipped → works as normal scene switch
3. ✅ E000 cluster device → scene mode skipped → multi-press via E000 cluster
4. ⚠️ Manual mode toggle → app should detect and update settings
5. ⚠️ Scene mode write fails → user should be notified with clear instructions

## Next Steps

1. Add attribute listener for 0x8004 to detect manual mode changes
2. Add device setting for mode override (auto/dimmer/scene)
3. Improve error messaging when scene mode fails
4. Document user-facing mode switch instructions
`;

fs.writeFileSync('docs/SCENE_MODE_RESEARCH.md', doc);
console.log('✅ Created docs/SCENE_MODE_RESEARCH.md');
