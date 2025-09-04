#!/usr/bin/env node
declare const _exports: ClusterHelpers;
export = _exports;
declare class ClusterHelpers {
    clusters: {
        BASIC: number;
        POWER_CONFIG: number;
        DEVICE_TEMP: number;
        IDENTIFY: number;
        GROUPS: number;
        SCENES: number;
        ON_OFF: number;
        ON_OFF_SWITCH_CONFIG: number;
        LEVEL_CONTROL: number;
        ALARMS: number;
        TIME: number;
        RSSI_LOCATION: number;
        ANALOG_INPUT: number;
        ANALOG_OUTPUT: number;
        ANALOG_VALUE: number;
        BINARY_INPUT: number;
        BINARY_OUTPUT: number;
        BINARY_VALUE: number;
        MULTISTATE_INPUT: number;
        MULTISTATE_OUTPUT: number;
        MULTISTATE_VALUE: number;
        OTA: number;
        TOUCHLINK: number;
        COLOR_CONTROL: number;
        BALLAST_CONFIG: number;
        ILLUMINANCE_MEASUREMENT: number;
        ILLUMINANCE_LEVEL_SENSING: number;
        TEMPERATURE_MEASUREMENT: number;
        PRESSURE_MEASUREMENT: number;
        FLOW_MEASUREMENT: number;
        HUMIDITY_MEASUREMENT: number;
        CONCENTRATION_MEASUREMENT: number;
        IAS_ZONE: number;
        IAS_ACE: number;
        IAS_WD: number;
        THERMOSTAT: number;
        FAN_CONTROL: number;
        THERMOSTAT_UI_CONFIG: number;
        MANU_TUYA: number;
        TUYA_DP: number;
    };
    attributes: {
        ZCL_VERSION: number;
        APPLICATION_VERSION: number;
        STACK_VERSION: number;
        HARDWARE_VERSION: number;
        MANUFACTURER_NAME: number;
        MODEL_IDENTIFIER: number;
        DATE_CODE: number;
        POWER_SOURCE: number;
        ON_OFF: number;
        CURRENT_LEVEL: number;
        REMAINING_TIME: number;
        ON_OFF_TRANSITION_TIME: number;
        ON_LEVEL: number;
        CURRENT_HUE: number;
        CURRENT_SATURATION: number;
        CURRENT_X: number;
        CURRENT_Y: number;
        COLOR_TEMPERATURE: number;
        MEASURED_VALUE: number;
        MIN_MEASURED_VALUE: number;
        MAX_MEASURED_VALUE: number;
        TOLERANCE: number;
        TUYA_DP_ID: number;
        TUYA_DP_TYPE: number;
        TUYA_DP_VALUE: number;
    };
    /**
     * Get cluster name from ID
     */
    getClusterName(clusterId: any): string;
    /**
     * Get attribute name from ID
     */
    getAttributeName(attributeId: any): string;
    /**
     * Create cluster binding
     */
    createClusterBinding(clusterId: any, endpointId?: number): {
        clusterId: any;
        endpointId: number;
        clusterName: string;
    };
    /**
     * Create attribute binding
     */
    createAttributeBinding(clusterId: any, attributeId: any, endpointId?: number): {
        clusterId: any;
        attributeId: any;
        endpointId: number;
        clusterName: string;
        attributeName: string;
    };
    /**
     * Validate cluster binding
     */
    validateClusterBinding(binding: any): boolean;
    /**
     * Get standard clusters for device type
     */
    getStandardClusters(deviceType: any): any;
    /**
     * Create Tuya DP binding
     */
    createTuyaDPBinding(dpId: any, dpType: any, endpointId?: number): {
        clusterId: number;
        attributeId: number;
        endpointId: number;
        dpId: any;
        dpType: any;
        clusterName: string;
        attributeName: string;
    };
}
//# sourceMappingURL=cluster-helpers.d.ts.map