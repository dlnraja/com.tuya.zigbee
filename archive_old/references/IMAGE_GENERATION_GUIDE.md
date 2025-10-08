# 🎨 Complete Image Generation Guide — Homey SDK3 Compliant

**Generated**: 2025-10-05T19:25:00+02:00  
**Status**: Ready for implementation  
**Automation Level**: Manual (AI-assisted design required)

---

## 📋 Image Specifications (Homey SDK3)

### App-Level Images
**Location**: `assets/images/`

| File | Size | Format | Purpose |
|------|------|--------|---------|
| `small.png` | 250×175 | PNG (transparent) | App store thumbnail |
| `large.png` | 500×350 | PNG (transparent) | App store listing |
| `xlarge.png` | 1000×700 | PNG (transparent) | App store hero image |

### Driver-Level Images
**Location**: `drivers/<driver_id>/assets/`

| File | Size | Format | Purpose |
|------|------|--------|---------|
| `small.png` | 75×75 | PNG (transparent) | Device tile icon |
| `large.png` | 500×500 | PNG (transparent) | Device details page |
| `xlarge.png` | 1000×1000 | PNG (transparent, optional) | High-res display |

**Total Required**: 
- **3 app images** (small, large, xlarge)
- **162 drivers × 2 images** = **324 driver images** (small, large)
- **Grand Total**: **327 images**

---

## 🎨 Design Guidelines (Homey Style)

### Color Palette (By Category)

#### Based on Ultimate Zigbee Hub Branding
- **Primary Brand**: `#1E88E5` (Blue - from `app.json`)
- **Category Colors**:
  - **Motion/Sensor**: `#4CAF50` (Green) — detection/monitoring
  - **Climate**: `#FF9800` (Orange) — temperature/humidity
  - **Light**: `#FFC107` (Amber) — lighting/dimming
  - **Power**: `#F44336` (Red) — energy/plugs
  - **Switch**: `#9C27B0` (Purple) — control/automation
  - **Cover**: `#00BCD4` (Cyan) — curtains/blinds
  - **Security**: `#795548` (Brown) — locks/alarms
  - **Misc**: `#607D8B` (Blue Grey) — gateways/hubs

### Design Principles (Johan Bendz Standard)
1. **Flat Design**: No 3D effects, no shadows
2. **Centered Glyph**: Device silhouette in center
3. **Gradient Background**: Subtle radial gradient from category color
4. **Transparent Edges**: PNG alpha channel for anti-aliasing
5. **Professional**: Clean, minimalist, recognizable at small sizes

### Typography
- **App Name**: Montserrat Bold or similar modern sans-serif
- **Tagline**: Open Sans Regular
- **No text on driver icons** (icon-only)

---

## 🤖 Free AI Image Generation Tools

### Recommended Platforms (with limitations)

#### 1. **Canva Free** (Easiest)
- **URL**: https://www.canva.com
- **Limits**: Watermark on some templates, export quality
- **Process**:
  1. Create custom dimensions (75×75, 500×500, etc.)
  2. Use "Elements" → "Graphics" for device icons
  3. Apply gradient background with color picker
  4. Export as PNG (transparent background)
- **Pros**: User-friendly, extensive icon library
- **Cons**: Manual creation per driver

#### 2. **Adobe Express Free** (Professional)
- **URL**: https://www.adobe.com/express/
- **Limits**: 2GB storage, limited templates
- **Process**:
  1. Start with custom size
  2. Add shapes (circle/square) with gradient fill
  3. Layer device icon (search "smart plug", "sensor", etc.)
  4. Export PNG with transparency
- **Pros**: Professional quality, Adobe integration
- **Cons**: Requires account

#### 3. **Figma Free** (Batch Design)
- **URL**: https://www.figma.com
- **Limits**: 3 projects, unlimited files
- **Process**:
  1. Create components for each size (75×75, 500×500)
  2. Design master icon templates per category
  3. Duplicate & customize for each driver
  4. Batch export with plugin (e.g., "Exporter")
- **Pros**: Component reuse, batch export
- **Cons**: Learning curve

#### 4. **DALL-E 3 via Bing** (AI-Generated)
- **URL**: https://www.bing.com/images/create
- **Limits**: Free with Microsoft account, queue times
- **Prompt Example**:
  ```
  Flat icon design of a smart plug device, 
  centered silhouette on red gradient background, 
  minimalist style, transparent PNG, 500x500px, 
  professional Homey app icon aesthetic
  ```
- **Pros**: AI-assisted, unique designs
- **Cons**: Inconsistent results, post-processing needed

#### 5. **Remove.bg + Manual Design**
- **URL**: https://www.remove.bg
- **Process**:
  1. Find device photos (AliExpress, manufacturer sites)
  2. Remove background with remove.bg
  3. Import to Canva/Figma
  4. Add gradient background
  5. Resize to correct dimensions
- **Pros**: Realistic device silhouettes
- **Cons**: Time-consuming

---

## 📂 Batch Generation Strategy

### Step-by-Step Workflow

#### Phase 1: App Images (3 images)
1. **Design Hero Image** (1000×700):
   - Homey Pro device mockup (center)
   - Zigbee waves/network visualization
   - "Ultimate Zigbee Hub" text overlay
   - Gradient background (#1E88E5 primary)
2. **Scale Down**:
   - Export 500×350 (large)
   - Export 250×175 (small)
3. **Save**: `assets/images/{small,large,xlarge}.png`

#### Phase 2: Driver Icons (162 drivers × 2 sizes)

##### Template Creation (Figma Recommended)
1. **Create 9 Master Templates** (one per category):
   - Motion: Green gradient + motion sensor glyph
   - Climate: Orange gradient + thermometer glyph
   - Light: Amber gradient + bulb glyph
   - Power: Red gradient + plug glyph
   - Switch: Purple gradient + switch glyph
   - Cover: Cyan gradient + curtain glyph
   - Security: Brown gradient + lock glyph
   - Sensor: Teal gradient + sensor glyph
   - Misc: Grey gradient + hub glyph

2. **Component Setup**:
   - Master component: 500×500
   - Nested component: 75×75 (auto-scaled)

3. **Customization**:
   - Duplicate master for each driver
   - Tweak glyph (e.g., "dimmer" gets dimmer icon variant)
   - Adjust gradient intensity per driver

4. **Batch Export**:
   - Use Figma plugin "Export Kit" or "Exporter"
   - Export all 500×500 → `drivers/*/assets/large.png`
   - Export all 75×75 → `drivers/*/assets/small.png`

##### Alternative: Script-Assisted Generation
```bash
# PowerShell script to organize exports
Get-ChildItem -Path "exports/*.png" | ForEach-Object {
    $driverName = $_.Name -replace '_large.png|_small.png', ''
    $size = if ($_.Name -match '_large') { 'large' } else { 'small' }
    $dest = "drivers/$driverName/assets/$size.png"
    Copy-Item $_.FullName -Destination $dest
}
```

---

## 🔍 Current Image Status

### Validation Results
- **162 drivers validated** (`references/assets_verification.json`)
- **All icons**: 75×75 ✅ + 500×500 ✅
- **App images**: 250×175 ✅ + 500×350 ✅ + 1000×700 ✅

### Regeneration Triggers
Only regenerate if:
- ❌ Brand refresh required (new color scheme)
- ❌ Category icons outdated (design trends)
- ❌ New drivers added without icons
- ✅ **Current icons are SDK3-compliant** → No immediate action needed

---

## 🚀 Automation Script (Post-Design)

Once images are designed manually, use this script to validate:

```javascript
// tools/validate_all_images.js
const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size'); // npm install image-size

const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, 'drivers');
const APP_IMAGES = path.join(ROOT, 'assets', 'images');

const requiredSizes = {
  app: { small: [250, 175], large: [500, 350], xlarge: [1000, 700] },
  driver: { small: [75, 75], large: [500, 500] }
};

function validateImages() {
  let errors = 0;
  
  // Validate app images
  for (const [name, [w, h]] of Object.entries(requiredSizes.app)) {
    const imgPath = path.join(APP_IMAGES, `${name}.png`);
    if (!fs.existsSync(imgPath)) {
      console.error(`❌ Missing: ${imgPath}`);
      errors++;
      continue;
    }
    const dims = sizeOf(imgPath);
    if (dims.width !== w || dims.height !== h) {
      console.error(`❌ Wrong size: ${imgPath} (${dims.width}×${dims.height}, expected ${w}×${h})`);
      errors++;
    }
  }
  
  // Validate driver images
  const drivers = fs.readdirSync(DRIVERS).filter(d => 
    fs.statSync(path.join(DRIVERS, d)).isDirectory()
  );
  
  for (const driver of drivers) {
    for (const [name, [w, h]] of Object.entries(requiredSizes.driver)) {
      const imgPath = path.join(DRIVERS, driver, 'assets', `${name}.png`);
      if (!fs.existsSync(imgPath)) {
        console.error(`❌ Missing: ${imgPath}`);
        errors++;
        continue;
      }
      const dims = sizeOf(imgPath);
      if (dims.width !== w || dims.height !== h) {
        console.error(`❌ Wrong size: ${imgPath} (${dims.width}×${dims.height}, expected ${w}×${h})`);
        errors++;
      }
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  if (errors === 0) {
    console.log('✅ All images validated successfully!');
  } else {
    console.log(`❌ Found ${errors} image errors`);
  }
  console.log('='.repeat(60));
}

validateImages();
```

---

## 📝 Implementation Checklist

### Pre-Design
- [ ] Review current icons (`assets/` + `drivers/*/assets/`)
- [ ] Decide if regeneration needed (brand refresh?)
- [ ] Choose design tool (Canva / Figma / Adobe Express)
- [ ] Create color palette reference sheet

### Design Phase
- [ ] Create 9 category master templates (500×500)
- [ ] Design 3 app images (250×175, 500×350, 1000×700)
- [ ] Customize 162 driver icons from templates
- [ ] Export all images with correct naming

### Post-Design
- [ ] Run `node tools/validate_all_images.js` (requires `image-size` package)
- [ ] Run `node tools/verify_driver_assets_v38.js` (existing)
- [ ] Commit: `git add assets/ drivers/*/assets/ && git commit -m "Regenerate all icons with new design"`
- [ ] Push: `git push origin master`
- [ ] Publish: `node tools/ultimate_recursive_orchestrator_n5.js`

---

## ⚠️ Important Notes

### What Cannot Be Automated
1. **Image Design**: Requires human/AI creativity + tools
2. **Color Selection**: Brand decisions (marketing/UX)
3. **Icon Customization**: Per-driver uniqueness
4. **Quality Review**: Visual inspection for professionalism

### What Can Be Automated
1. **Validation**: Dimension/format checking ✅
2. **Organization**: Moving exports to correct folders ✅
3. **Git Operations**: Commit/push after design ✅
4. **SDK3 Compliance**: Homey validation ✅

### Time Estimate
- **Template Design**: 2-4 hours (one-time)
- **Per-Driver Customization**: 2-5 minutes each × 162 = 5-13 hours
- **Total**: **~8-17 hours** for complete regeneration

---

## 🎯 Recommendation

**Current Status**: ✅ **All 327 images are SDK3-compliant**  
**Action**: ⚠️ **Only regenerate if brand refresh is required**

If regeneration is NOT needed:
- Focus on driver enrichment (already ✅ complete)
- Focus on publication (GitHub Actions or local CLI)
- Monitor community feedback for specific icon improvement requests

If regeneration IS needed:
- Use **Figma** for efficiency (component reuse + batch export)
- Allocate **2 days** for design + validation
- Plan for **incremental rollout** (e.g., 20 drivers/day)

---

## 📞 Support Resources

- **Homey Design Guidelines**: https://apps.developer.homey.app/
- **Figma Tutorial**: https://help.figma.com/hc/en-us
- **Canva Guide**: https://www.canva.com/learn/design-101/
- **Icon Libraries**: Flaticon, Icons8, Noun Project (free tiers)

---

**END OF IMAGE GENERATION GUIDE**  
*For immediate next steps, see: `references/N5_EXECUTION_SUMMARY.md`*
