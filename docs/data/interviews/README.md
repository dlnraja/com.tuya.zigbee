# Device Interviews

Individual device interview files extracted from GitHub Issues/PRs and Homey Forum.

## Naming Convention

Files are named: `{productId}__{manufacturerName}.json`

Example: `TS0044__TZ3000_zgyzgdua.json`

## File Structure

```json
{
  "id": "INT-XXX",
  "deviceName": "Human readable name",
  "manufacturerName": "_TZxxxx_xxxxxxxx",
  "productId": "TSxxxx",
  "source": "GitHub Issue #XXX / Forum Page XX",
  "user": "username",
  "status": "fixed|supported|investigating|new_device_request",
  "driver": "driver_name",
  "inputClusters": [0, 4, 5, 61184],
  "symptoms": ["issue 1", "issue 2"],
  "rootCause": "Description of root cause",
  "fix": {
    "applied": true,
    "version": "5.x.x",
    "description": "What was fixed"
  }
}
```

## Status Values

| Status | Description |
|--------|-------------|
| `supported` | Device works correctly |
| `fixed` | Issue was resolved in a specific version |
| `investigating` | Issue being investigated |
| `new_device_request` | New device to add support for |
| `partial` | Partially working |

## Sources

- Homey Community Forum (pages 1-56)
- GitHub Issues/PRs (JohanBendz & dlnraja repos)
- User Diagnostic Reports
- Zigbee2MQTT Device Database
- ZHA Device Handlers

## Last Updated

2026-02-01 (v5.7.20)
