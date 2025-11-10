# Response for Diagnostic e29cd366 - Button Fix

**Root Cause**: Tuya TS0043/TS0044 buttons use `scenes.recall` cluster, not `onOff`  
**Fix**: Added scenes cluster listener with priority over onOff/levelControl  
**Impact**: All Tuya button devices now working (~50 drivers)

Device: _TZ3000_bczr4e10 TS0043 (3 buttons)
