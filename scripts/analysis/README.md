# 🔍 Homey App Version Analysis Tool

## Purpose
Analyze all versions of your Homey app to find when and why data reporting stopped working.

## How It Works

### Step 1: Download All Versions (BrowserMCP)
```bash
# Use the MCP script to auto-download all versions
# Located at: scripts/automation/download_homey_versions.mcp.json
```

**Manual alternative:**
1. Go to https://developer.homey.app/apps/com.dlnraja.tuya.zigbee/versions
2. Click "Download source" for each version
3. ZIPs will download to D:\Download\

### Step 2: Install Dependencies
```powershell
cd "c:\Users\HP\Desktop\homey app\tuya_repair\scripts\analysis"
npm install
```

### Step 3: Run Analysis
```powershell
npm run analyze
```

This will:
- Extract all ZIP files from D:\Download\
- Scan every driver.compose.json and driver.js
- Find missing reporting configuration
- Detect measure_battery on AC devices
- Generate a comprehensive report

### Step 4: Read Report
Open `analysis_report.md` - it will show:
- ✅ Which versions had working reporting
- ❌ Which versions broke reporting
- 🔍 Exact drivers with issues
- 📊 Statistics per version

## What We're Looking For

### Good Signs (v2.x/v3.x that worked):
- ✅ `configureReporting` calls in driver code
- ✅ Attribute listeners registered
- ✅ Cluster bindings configured
- ✅ No measure_battery on AC devices

### Bad Signs (v4.9.x that's broken):
- ❌ No `configureReporting` 
- ❌ Missing reporting setup
- ❌ measure_battery on USB/switches
- ❌ No cluster bindings

## Expected Output

```markdown
# Homey App Analysis Report

## Version: 2.15.130 (WORKING!)
- SDK: 3
- Drivers with Reporting: 186/186 ✅
- Issues: 0

## Version: 4.9.67 (BROKEN!)
- SDK: 3
- Drivers with Reporting: 0/186 ❌
- Issues: 186 (no configureReporting!)
```

## Next Steps

After analysis:
1. Share `analysis_report.md` with me
2. I'll identify exact version where reporting broke
3. We'll port the working code to v4.9.67
4. Test and publish v4.9.68 with fixes!

## Troubleshooting

**No ZIPs found?**
- Check D:\Download\ folder
- Verify ZIP filenames contain "com.dlnraja.tuya.zigbee"

**Script errors?**
- Run `npm install` again
- Check Node.js version: `node --version` (needs v16+)

**Want Cursor-ready version?**
- Ask for PowerShell script that runs entirely in workspace
- No Node.js install needed!
