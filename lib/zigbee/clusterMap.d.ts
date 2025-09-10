#!/usr/bin/env node
export = ClusterManager;
declare class ClusterManager {
    clusters: {
        genBasic: number;
        genPowerCfg: number;
        genOnOff: number;
        genLevelCtrl: number;
        genTime: number;
        genOta: number;
        msTemperatureMeasurement: number;
        msRelativeHumidity: number;
        msPressureMeasurement: number;
        msIlluminanceMeasurement: number;
        tuyaSpecific: number;
        tuyaData: number;
    };
    attributes: {
        onOff: number;
        currentLevel: number;
        measuredValue: number;
        minMeasuredValue: number;
        maxMeasuredValue: number;
        tuyaData: number;
        tuyaCommand: number;
    };
    getClusterId(clusterName: any): any;
    getAttributeId(clusterName: any, attributeName: any): any;
    encodeTuyaData(dp: any, data: any): any;
    decodeTuyaData(buffer: any): {
        dp: any;
        type: any;
        length: any;
        data: any;
    } | null;
}
//# sourceMappingURL=clusterMap.d.ts.map