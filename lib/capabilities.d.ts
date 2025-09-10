export namespace CAPABILITIES {
    namespace onoff {
        let type: string;
        let title: string;
        let getable: boolean;
        let setable: boolean;
    }
    namespace dim {
        let type_1: string;
        export { type_1 as type };
        let title_1: string;
        export { title_1 as title };
        let getable_1: boolean;
        export { getable_1 as getable };
        let setable_1: boolean;
        export { setable_1 as setable };
        export let min: number;
        export let max: number;
        export let step: number;
    }
    namespace light_hue {
        let type_2: string;
        export { type_2 as type };
        let title_2: string;
        export { title_2 as title };
        let getable_2: boolean;
        export { getable_2 as getable };
        let setable_2: boolean;
        export { setable_2 as setable };
        let min_1: number;
        export { min_1 as min };
        let max_1: number;
        export { max_1 as max };
        let step_1: number;
        export { step_1 as step };
    }
    namespace light_saturation {
        let type_3: string;
        export { type_3 as type };
        let title_3: string;
        export { title_3 as title };
        let getable_3: boolean;
        export { getable_3 as getable };
        let setable_3: boolean;
        export { setable_3 as setable };
        let min_2: number;
        export { min_2 as min };
        let max_2: number;
        export { max_2 as max };
        let step_2: number;
        export { step_2 as step };
    }
    namespace light_temperature {
        let type_4: string;
        export { type_4 as type };
        let title_4: string;
        export { title_4 as title };
        let getable_4: boolean;
        export { getable_4 as getable };
        let setable_4: boolean;
        export { setable_4 as setable };
        let min_3: number;
        export { min_3 as min };
        let max_3: number;
        export { max_3 as max };
        let step_3: number;
        export { step_3 as step };
    }
    namespace measure_temperature {
        let type_5: string;
        export { type_5 as type };
        let title_5: string;
        export { title_5 as title };
        let getable_5: boolean;
        export { getable_5 as getable };
        let setable_5: boolean;
        export { setable_5 as setable };
        export let unit: string;
    }
    namespace measure_humidity {
        let type_6: string;
        export { type_6 as type };
        let title_6: string;
        export { title_6 as title };
        let getable_6: boolean;
        export { getable_6 as getable };
        let setable_6: boolean;
        export { setable_6 as setable };
        let unit_1: string;
        export { unit_1 as unit };
    }
    namespace alarm_motion {
        let type_7: string;
        export { type_7 as type };
        let title_7: string;
        export { title_7 as title };
        let getable_7: boolean;
        export { getable_7 as getable };
        let setable_7: boolean;
        export { setable_7 as setable };
    }
    namespace alarm_contact {
        let type_8: string;
        export { type_8 as type };
        let title_8: string;
        export { title_8 as title };
        let getable_8: boolean;
        export { getable_8 as getable };
        let setable_8: boolean;
        export { setable_8 as setable };
    }
    namespace measure_power {
        let type_9: string;
        export { type_9 as type };
        let title_9: string;
        export { title_9 as title };
        let getable_9: boolean;
        export { getable_9 as getable };
        let setable_9: boolean;
        export { setable_9 as setable };
        let unit_2: string;
        export { unit_2 as unit };
    }
    namespace measure_current {
        let type_10: string;
        export { type_10 as type };
        let title_10: string;
        export { title_10 as title };
        let getable_10: boolean;
        export { getable_10 as getable };
        let setable_10: boolean;
        export { setable_10 as setable };
        let unit_3: string;
        export { unit_3 as unit };
    }
    namespace measure_voltage {
        let type_11: string;
        export { type_11 as type };
        let title_11: string;
        export { title_11 as title };
        let getable_11: boolean;
        export { getable_11 as getable };
        let setable_11: boolean;
        export { setable_11 as setable };
        let unit_4: string;
        export { unit_4 as unit };
    }
}
export namespace CLUSTERS {
    namespace genBasic {
        let name: string;
        let clusterId: number;
    }
    namespace genIdentify {
        let name_1: string;
        export { name_1 as name };
        let clusterId_1: number;
        export { clusterId_1 as clusterId };
    }
    namespace genOnOff {
        let name_2: string;
        export { name_2 as name };
        let clusterId_2: number;
        export { clusterId_2 as clusterId };
    }
    namespace genLevelCtrl {
        let name_3: string;
        export { name_3 as name };
        let clusterId_3: number;
        export { clusterId_3 as clusterId };
    }
    namespace lightingColorCtrl {
        let name_4: string;
        export { name_4 as name };
        let clusterId_4: number;
        export { clusterId_4 as clusterId };
    }
    namespace msTemperatureMeasurement {
        let name_5: string;
        export { name_5 as name };
        let clusterId_5: number;
        export { clusterId_5 as clusterId };
    }
    namespace msRelativeHumidity {
        let name_6: string;
        export { name_6 as name };
        let clusterId_6: number;
        export { clusterId_6 as clusterId };
    }
    namespace msOccupancySensing {
        let name_7: string;
        export { name_7 as name };
        let clusterId_7: number;
        export { clusterId_7 as clusterId };
    }
    namespace genPowerCfg {
        let name_8: string;
        export { name_8 as name };
        let clusterId_8: number;
        export { clusterId_8 as clusterId };
    }
}
//# sourceMappingURL=capabilities.d.ts.map