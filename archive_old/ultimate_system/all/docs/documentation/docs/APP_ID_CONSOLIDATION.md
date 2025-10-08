# App ID Consolidation - Internal Documentation

## Critical Change: App ID Unified

**Date**: 2025-09-14  
**Status**: In Progress

### Background
There was confusion between two app IDs:
- `com.dlnraja.tuya.zigbee` (old)
- `com.dlnraja.ultimate.zigbee.hub` (target)

### Required Changes

#### ✅ COMPLETED:
1. **App Configuration**: Changed app ID in `.homeycompose/app.json`
2. **Repository URLs**: Updated to point to `com.ultimate.zigbee.hub`
3. **Support Links**: Updated email and GitHub links

#### 🔄 IN PROGRESS:
1. **GitHub Repository**: Need to create/update `com.ultimate.zigbee.hub` repo
2. **Community Forum**: Update forum posts to reference correct app ID
3. **Asset Images**: Fix broken device images on Homey test page
4. **Documentation**: Update all README and doc references

#### 📋 PENDING:
1. **Homey Developer Platform**: Republish with correct app ID
2. **Community Notification**: Inform users about app ID change
3. **Migration Guide**: Create guide for users switching apps

### Technical Details

**Old App ID**: `com.dlnraja.tuya.zigbee`
- GitHub: `https://github.com/dlnraja/com.tuya.zigbee`
- Homey Store: Published versions 1.0.8 - 1.0.14

**New App ID**: `com.dlnraja.ultimate.zigbee.hub`  
- GitHub: `https://github.com/dlnraja/com.ultimate.zigbee.hub`
- Homey Store: Will be republished with new ID

### Community Forum Issues Identified

1. **Broken Images**: Device icons not displaying properly on test page
2. **Version Confusion**: Users seeing v1.0.8 instead of latest versions
3. **Support Links**: Need to update forum thread references

### Next Steps

1. Fix device image assets
2. Validate app with new ID
3. Republish to Homey developer platform
4. Update community forum posts
5. Create migration documentation

---
**Note**: This change requires careful coordination to avoid user confusion and ensure seamless transition.
