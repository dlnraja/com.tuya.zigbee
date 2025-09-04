#!/usr/bin/env node
declare const _exports: CapabilityMapper;
export = _exports;
declare class CapabilityMapper {
    capabilities: {
        onoff: {
            clusters: number[];
            attributes: number[];
            commands: string[];
            type: string;
        };
        dim: {
            clusters: number[];
            attributes: number[];
            commands: string[];
            type: string;
            range: number[];
        };
        measure_power: {
            clusters: number[];
            attributes: number[];
            type: string;
            unit: string;
        };
        meter_power: {
            clusters: number[];
            attributes: number[];
            type: string;
            unit: string;
        };
        measure_voltage: {
            clusters: number[];
            attributes: number[];
            type: string;
            unit: string;
        };
        measure_current: {
            clusters: number[];
            attributes: number[];
            type: string;
            unit: string;
        };
        measure_temperature: {
            clusters: number[];
            attributes: number[];
            type: string;
            unit: string;
        };
        measure_humidity: {
            clusters: number[];
            attributes: number[];
            type: string;
            unit: string;
        };
        measure_pressure: {
            clusters: number[];
            attributes: number[];
            type: string;
            unit: string;
        };
        measure_illuminance: {
            clusters: number[];
            attributes: number[];
            type: string;
            unit: string;
        };
        alarm_motion: {
            clusters: number[];
            attributes: number[];
            type: string;
        };
        alarm_contact: {
            clusters: number[];
            attributes: number[];
            type: string;
        };
        alarm_smoke: {
            clusters: number[];
            attributes: number[];
            type: string;
        };
        alarm_water: {
            clusters: number[];
            attributes: number[];
            type: string;
        };
        alarm_gas: {
            clusters: number[];
            attributes: number[];
            type: string;
        };
        measure_battery: {
            clusters: number[];
            attributes: number[];
            type: string;
            unit: string;
            range: number[];
        };
        alarm_battery: {
            clusters: number[];
            attributes: number[];
            type: string;
        };
        windowcoverings_state: {
            clusters: number[];
            attributes: number[];
            type: string;
            range: number[];
        };
        windowcoverings_set: {
            clusters: number[];
            commands: string[];
            type: string;
        };
        light_hue: {
            clusters: number[];
            attributes: number[];
            type: string;
            range: number[];
        };
        light_saturation: {
            clusters: number[];
            attributes: number[];
            type: string;
            range: number[];
        };
        light_temperature: {
            clusters: number[];
            attributes: number[];
            type: string;
            range: number[];
        };
        target_temperature: {
            clusters: number[];
            attributes: number[];
            type: string;
            unit: string;
        };
        measure_temperature_thermostat: {
            clusters: number[];
            attributes: number[];
            type: string;
            unit: string;
        };
    };
    /**
     * Get capability info by name
     */
    getCapability(capabilityName: any): any;
    /**
     * Get all capabilities for a device type
     */
    getCapabilitiesForDeviceType(deviceType: any): any;
    /**
     * Get clusters needed for capabilities
     */
    getClustersForCapabilities(capabilityNames: any): any[];
    /**
     * Validate capability value
     */
    validateCapabilityValue(capabilityName: any, value: any): boolean;
    /**
     * Get Tuya DP mapping for capability
     */
    getTuyaDPMapping(capabilityName: any): any;
}
//# sourceMappingURL=capability-map.d.ts.map