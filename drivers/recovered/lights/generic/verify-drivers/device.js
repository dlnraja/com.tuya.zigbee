# Driver Validation Tool

## Overview

The `tools/verify-drivers.js` tool is a comprehensive validation system for Tuya Zigbee device drivers. It ensures all drivers meet the required standards and identifies potential issues.

## Features

### Validation Checks
- **File Structure**: Validates driver file structure
- **Required Fields**: Checks for mandatory fields
- **Zigbee Configuration**: Validates Zigbee cluster configuration
- **Device Capabilities**: Verifies device capability definitions
- **JSON Syntax**: Ensures valid JSON format
- **Path References**: Validates file and asset references

### Reporting
- **Detailed Reports**: Comprehensive validation reports
- **Error Classification**: Categorizes issues by severity
- **Statistics**: Provides validation statistics
- **Export Options**: Multiple export formats (JSON, Markdown, HTML)

## Usage

### Basic Usage
```bash
# Validate all drivers
node tools/verify-drivers.js

# Validate specific driver
node tools/verify-drivers.js --driver switch_1_gang

# Generate report
node tools/verify-drivers.js --report
```

### Advanced Usage
```bash
# Validate with custom rules
node tools/verify-drivers.js --rules custom-rules.json

# Export to specific format
node tools/verify-drivers.js --export markdown

# Verbose output
node tools/verify-drivers.js --verbose
```

## Validation Rules

### Required Fields
- `id`: Unique driver identifier
- `title`: Human-readable driver name
- `icon`: Driver icon path
- `class`: Device class (light, switch, sensor, etc.)
- `capabilities`: Array of device capabilities
- `zigbee`: Zigbee configuration object

### Zigbee Configuration
```json
{
  "zigbee": {
    "manufacturerName": "Tuya",
    "modelId": "TS0001",
    "endpoints": {
      "1": {
        "clusters": {
          "input": ["genBasic", "genOnOff"],
          "output": ["genBasic", "genOnOff"]
        }
      }
    }
  }
}
```

### Device Capabilities
- **Switches**: `onoff`, `dim`
- **Lights**: `onoff`, `dim`, `light_hue`, `light_saturation`, `light_temperature`
- **Sensors**: `measure_temperature`, `measure_humidity`, `alarm_motion`
- **Controllers**: `button`, `remote`

## Error Types

### Critical Errors
- **Missing required fields**: Driver won't function
- **Invalid JSON**: Syntax errors
- **Missing files**: Referenced files don't exist
- **Invalid paths**: Incorrect file references

### Warnings
- **Missing optional fields**: Reduced functionality
- **Deprecated features**: Outdated implementations
- **Performance issues**: Suboptimal configurations
- **Documentation gaps**: Missing documentation

### Information
- **Best practices**: Suggestions for improvement
- **Optimization opportunities**: Performance improvements
- **Feature suggestions**: Additional capabilities
- **Documentation updates**: Documentation improvements

## Output Formats

### Console Output
```
🔍 Validating drivers...
✅ switch_1_gang: Valid
❌ rgb_bulb: Missing zigbee.endpoint
⚠️  temperature_sensor: Missing documentation
📊 Validation complete: 148 drivers checked
```

### JSON Report
```json
{
  "summary": {
    "total": 148,
    "valid": 145,
    "errors": 2,
    "warnings": 1
  },
  "drivers": {
    "switch_1_gang": {
      "status": "valid",
      "issues": []
    },
    "rgb_bulb": {
      "status": "error",
      "issues": ["Missing zigbee.endpoint"]
    }
  }
}
```

### Markdown Report
```markdown
# Driver Validation Report

## Summary
- **Total Drivers**: 148
- **Valid**: 145
- **Errors**: 2
- **Warnings**: 1

## Issues Found
### Critical Errors
- rgb_bulb: Missing zigbee.endpoint
- temperature_sensor: Invalid JSON syntax

### Warnings
- switch_1_gang: Missing documentation
```

## Configuration

### Custom Rules
```json
{
  "rules": {
    "required_fields": ["id", "title", "icon", "class"],
    "zigbee_required": true,
    "capabilities_required": true,
    "documentation_required": false
  }
}
```

### Validation Options
```json
{
  "options": {
    "strict": true,
    "verbose": false,
    "report_format": "markdown",
    "output_file": "validation-report.md"
  }
}
```

## Integration

### GitHub Actions
```yaml
- name: Validate Drivers
  run: node tools/verify-drivers.js --report --export markdown
```

### Pre-commit Hook
```bash
#!/bin/bash
node tools/verify-drivers.js --strict
if [ $? -ne 0 ]; then
  echo "Driver validation failed"
  exit 1
fi
```

### Continuous Integration
```yaml
- name: Driver Validation
  run: |
    node tools/verify-drivers.js --report
    node tools/verify-drivers.js --export json > validation-report.json
```

## Troubleshooting

### Common Issues
- **Missing dependencies**: Install required Node.js packages
- **Permission errors**: Check file permissions
- **Path issues**: Verify file paths are correct
- **Memory issues**: Increase Node.js memory limit

### Debug Mode
```bash
# Enable debug output
DEBUG=* node tools/verify-drivers.js

# Verbose logging
node tools/verify-drivers.js --verbose --debug
```

## Best Practices

### Driver Development
1. **Use the validation tool**: Run validation before committing
2. **Follow standards**: Adhere to driver development standards
3. **Test thoroughly**: Test drivers with actual devices
4. **Document properly**: Include comprehensive documentation
5. **Update regularly**: Keep drivers up to date

### Validation Process
1. **Run validation**: Use the tool regularly
2. **Review reports**: Analyze validation results
3. **Fix issues**: Address critical errors first
4. **Improve quality**: Address warnings and suggestions
5. **Maintain standards**: Keep validation rules updated

## References

- [Homey SDK3 Documentation](https://apps.athom.com/docs/)
- [Zigbee Cluster Library](https://zigbeealliance.org/specifications/)
- [Tuya Developer Documentation](https://developer.tuya.com/)
- [Driver Development Guide](docs/development/driver-development.md) 