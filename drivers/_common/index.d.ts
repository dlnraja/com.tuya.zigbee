#!/usr/bin/env node
import clusterHelpers = require("./clusters/cluster-helpers");
import capabilityMapper = require("./capabilities/capability-map");
export declare let log: any;
export declare let handleError: any;
export declare let validateRequired: any;
export declare let debounce: any;
export declare let retryWithBackoff: any;
export declare let healthCheck: any;
export declare let createRateLimiter: any;
export declare let getClusterName: (clusterId: any) => string;
export declare let getAttributeName: (attributeId: any) => string;
export declare let createClusterBinding: (clusterId: any, endpointId?: number) => {
    clusterId: any;
    endpointId: number;
    clusterName: string;
};
export declare let createAttributeBinding: (clusterId: any, attributeId: any, endpointId?: number) => {
    clusterId: any;
    attributeId: any;
    endpointId: number;
    clusterName: string;
    attributeName: string;
};
export declare let validateClusterBinding: (binding: any) => boolean;
export declare let getStandardClusters: (deviceType: any) => any;
export declare let createTuyaDPBinding: (dpId: any, dpType: any, endpointId?: number) => {
    clusterId: number;
    attributeId: number;
    endpointId: number;
    dpId: any;
    dpType: any;
    clusterName: string;
    attributeName: string;
};
export declare let getCapability: (capabilityName: any) => any;
export declare let getCapabilitiesForDeviceType: (deviceType: any) => any;
export declare let getClustersForCapabilities: (capabilityNames: any) => any[];
export declare let validateCapabilityValue: (capabilityName: any, value: any) => boolean;
export declare let getTuyaDPMapping: (capabilityName: any) => any;
export declare let VERSION: "3.3.0";
export declare let BUILD_DATE: string;
export { helpers, clusterHelpers, capabilityMapper };
//# sourceMappingURL=index.d.ts.map