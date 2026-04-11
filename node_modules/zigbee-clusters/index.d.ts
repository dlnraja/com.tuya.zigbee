import * as EventEmitter from "events";

type EndpointDescriptor = {
  endpointId: number;
  inputClusters: number[];
  outputClusters: number[];
};

type ConstructorOptions = {
  endpointDescriptors: EndpointDescriptor[];
  sendFrame: (endpointId: number, clusterId: number, frame: Buffer) => Promise<void>;
};
interface ZCLNodeCluster extends EventEmitter {
  /**
   * Command which requests the remote cluster to report its generated commands. Generated
   * commands are commands which may be sent by the remote cluster.
   *
   * TODO: handle the case where `lastResponse===false`. It might be possible that there are
   *  more commands to be reported than can be transmitted in one report (in practice very
   *  unlikely though). If `lastResponse===false` invoke `discoverCommandsGenerated` again
   *  starting from the index where the previous invocation stopped (`maxResults`).
   *
   * TODO: The manufacturer-specific sub-field SHALL be set to 0 to discover standard commands
   *  in a ZigBee cluster or 1 to discover manufacturer-specific commands in either a standard or
   *  a manufacturer-specific cluster. A manufacturer ID in this field of 0xffff (wildcard) will
   *  discover any manufacture- specific
   *  commands.
   *
   * @param {object} [opts=]
   * @param {number} [opts.startValue=0]
   * @param {number} [opts.maxResults=250]
   * @returns {Promise<number[]>}
   */
  discoverCommandsGenerated({
    startValue,
    maxResults,
  }?: {
    startValue?: number;
    maxResults?: number;
  }): Promise<number[]>;
  /**
   * Command which requests the remote cluster to report its received commands. Received
   * commands are commands which may be received by the remote cluster.
   *
   * TODO: handle the case where `lastResponse===false`. It might be possible that there are
   *  more commands to be reported than can be transmitted in one report (in practice very
   *  unlikely though). If `lastResponse===false` invoke `discoverCommandsGenerated` again
   *  starting from the index where the previous invocation stopped (`maxResults`).
   *
   * TODO: The manufacturer-specific sub-field SHALL be set to 0 to discover standard commands
   *  in a ZigBee cluster or 1 to discover manufacturer-specific commands in either a standard or
   *  a manufacturer-specific cluster. A manufacturer ID in this field of 0xffff (wildcard) will
   *  discover any manufacture- specific commands.
   *
   * @param {object} [opts=]
   * @param {number} [opts.startValue=0]
   * @param {number} [opts.maxResults=255]
   * @returns {Promise<number[]>}
   */
  discoverCommandsReceived({
    startValue,
    maxResults,
  }?: {
    startValue?: number;
    maxResults?: number;
  }): Promise<number[]>;
  /**
   * Command which reads a given set of attributes from the remote cluster.
   * Note: do not mix regular and manufacturer specific attributes.
   * @param {string[]} attributeNames
   * @param {{timeout: number}} [opts=]
   * @returns {Promise<Object.<string, unknown>>} - Object with values (e.g. `{ onOff: true }`)
   */
  readAttributes(
    attributeNames: string[],
    opts?: {
      timeout: number;
    }
  ): Promise<{
    [x: string]: unknown;
  }>;
  /**
   * Command which writes a given set of attribute key-value pairs to the remote cluster.
   * Note: do not mix regular and manufacturer specific attributes.
   * @param {object} attributes - Object with attribute names as keys and their values (e.g. `{
   * onOff: true, fakeAttributeName: 10 }`.
   * @returns {Promise<*|{attributes: *}>}
   */
  writeAttributes(attributes?: object): Promise<
    | any
    | {
        attributes: any;
      }
  >;
  /**
   * Command which configures attribute reporting for the given `attributes` on the remote cluster.
   * Note: do not mix regular and manufacturer specific attributes.
   * @param {object} attributes - Attribute reporting configuration (e.g. `{ onOff: {
   * minInterval: 0, maxInterval: 300, minChange: 1 } }`)
   * @returns {Promise<void>}
   */
  configureReporting(attributes?: object): Promise<void>;
  /**
   * @typedef {object} ReadReportingConfiguration
   * @property {ZCLDataTypes.enum8Status} status
   * @property {'reported'|'received'} direction
   * @property {number} attributeId
   * @property {ZCLDataType.id} [attributeDataType]
   * @property {number} [minInterval]
   * @property {number} [maxInterval]
   * @property {number} [minChange]
   * @property {number} [timeoutPeriod]
   */
  /**
   * Command which retrieves the reporting configurations for the given `attributes` from the
   * remote cluster. Currently this only takes the 'reported' into account, this represents the
   * reports the remote cluster would sent out, instead of receive (which is likely the most
   * interesting).
   * Note: do not mix regular and manufacturer specific attributes.
   * @param {Array} attributes - Array with number/strings (either attribute id, or attribute name).
   * @returns {Promise<ReadReportingConfiguration[]>} - Returns array with
   * ReadReportingConfiguration objects per attribute.
   */
  readReportingConfiguration(attributes?: any[]): Promise<
    {
      status: any;
      direction: "reported" | "received";
      attributeId: number;
      attributeDataType?: number;
      minInterval?: number;
      maxInterval?: number;
      minChange?: number;
      timeoutPeriod?: number;
    }[]
  >;
  /**
   * Command which discovers the implemented attributes on the remote cluster.
   *
   * TODO: handle the case where `lastResponse===false`. It might be possible that there are
   *  more commands to be reported than can be transmitted in one report (in practice very
   *  unlikely though). If `lastResponse===false` invoke `discoverCommandsGenerated` again
   *  starting from the index where the previous invocation stopped (`maxResults`).
   *
   * TODO: The manufacturer specific sub-field SHALL be set to 0 to discover standard attributes
   *  in a ZigBee cluster or 1 to discover manufacturer specific attributes in either a standard
   *  or a manufacturer specific cluster.
   *
   * @returns {Promise<Array>} - Array with string or number values (depending on if the
   * attribute
   * is implemented in zigbee-clusters or not).
   */
  discoverAttributes(): Promise<any[]>;
  /**
   * Command which discovers the implemented attributes on the remote cluster, the difference with
   * `discoverAttributes` is that this command also reports the access control field of the
   * attribute (whether it is readable/writable/reportable).
   *
   * TODO: handle the case where `lastResponse===false`. It might be possible that there are
   *  more commands to be reported than can be transmitted in one report (in practice very
   *  unlikely though). If `lastResponse===false` invoke `discoverCommandsGenerated` again
   *  starting from the index where the previous invocation stopped (`maxResults`).
   *
   * TODO: The manufacturer-specific sub-field SHALL be set to 0 to discover standard attributes
   *  in a ZigBee cluster or 1 to discover manufacturer-specific attributes in either a standard
   *  or a manufacturer- specific cluster. A manufacturer ID in this field of 0xffff (wildcard)
   *  will discover any manufacture-specific attributes.
   *
   * @returns {Promise<Array>} - Returns an array with objects with attribute names as keys and
   * following object as values: `{name: string, id: number, acl: { readable: boolean, writable:
   * boolean, reportable: boolean } }`. Note that `name` is optional based on whether the
   * attribute is implemented in zigbee-clusters.
   */
  discoverAttributesExtended(): Promise<any[]>;
}

interface BasicCluster extends ZCLNodeCluster {
  factoryReset(): Promise<void>;
}

interface PowerConfigurationCluster extends ZCLNodeCluster {}

interface OnOffCluster extends ZCLNodeCluster {
  setOn(): Promise<void>;
  setOff(): Promise<void>;
  toggle(): Promise<void>;
  offWithEffect({
    effectIdentifier,
    effectVariant,
  }: {
    effectIdentifier: number;
    effectVariant: number;
  }): Promise<void>;
  onWithRecallGlobalScene(): Promise<void>;
  onWithTimedOff({
    onOffControl,
    onTime,
    offWaitTime,
  }: {
    onOffControl: number;
    onTime: number;
    offWaitTime: number;
  }): Promise<void>;
}

interface LevelControlCluster extends ZCLNodeCluster {
  moveToLevel({ level, transitionTime }: { level: number; transitionTime: number }): Promise<void>;
  move({ moveMode, rate }: { moveMode: "up" | "down"; rate: number }): Promise<void>;
  step({
    moveMode,
    stepSize,
    transitionTime,
  }: {
    moveMode: "up" | "down";
    stepSize: number;
    transitionTime: number;
  }): Promise<void>;
  moveToLevelWithOnOff({
    level,
    transitionTime,
  }: {
    level: number;
    transitionTime: number;
  }): Promise<void>;
  moveWithOnOff({ moveMode, rate }: { moveMode: "up" | "down"; rate: number }): Promise<void>;
  stepWithOnOff({
    moveMode,
    stepSize,
    transitionTime,
  }: {
    moveMode: "up" | "down";
    stepSize: number;
    transitionTime: number;
  }): Promise<void>;
  stopWithOnOff(): Promise<void>;
}

interface ColorControlCluster extends ZCLNodeCluster {
  moveToHue({
    hue,
    direction,
    transitionTime,
  }: {
    hue: number;
    direction: "shortestDistance" | "longestDistance" | "up" | "down";
    transitionTime: number;
  }): Promise<void>;
  moveToSaturation({
    saturation,
    transitionTime,
  }: {
    saturation: number;
    transitionTime: number;
  }): Promise<void>;
  moveToHueAndSaturation({
    hue,
    saturation,
    transitionTime,
  }: {
    hue: number;
    saturation: number;
    transitionTime: number;
  }): Promise<void>;
  moveToColor({
    colorX,
    colorY,
    transitionTime,
  }: {
    colorX: number;
    colorY: number;
    transitionTime: number;
  }): Promise<void>;
  moveToColorTemperature({
    colorTemperature,
    transitionTime,
  }: {
    colorTemperature: number;
    transitionTime: number;
  }): Promise<void>;
}

interface MeteringCluster extends ZCLNodeCluster {}

interface ElectricalMeasurementCluster extends ZCLNodeCluster {}

interface PollControlCluster extends ZCLNodeCluster {
  fastPollStop(): Promise<void>;
  setLongPollInterval(opts: { newLongPollInterval: number }): Promise<void>;
  setShortPollInterval(opts: { newShortPollInterval: number }): Promise<void>;
}

type ZCLNodeEndpoint = {
  clusters: {
    onOff?: OnOffCluster;
    levelControl?: LevelControlCluster;
    colorControl?: ColorControlCluster;
    [clusterName: string]: ZCLNodeCluster | undefined;
  };
};

interface ZCLNode {
  endpoints: { [endpointId: number | string]: ZCLNodeEndpoint };
  handleFrame: (
    endpointId: number,
    clusterId: number,
    frame: Buffer,
    meta?: unknown
  ) => Promise<void>;
}

declare module "zigbee-clusters" {
  export var ZCLNode: {
    new (options: ConstructorOptions): ZCLNode;
  };
  export const CLUSTER: {
    [key: string]: { ID: number; NAME: string; ATTRIBUTES: any; COMMANDS: any };
  };
  export var ZCLNodeCluster;
  export var BasicCluster;
  export var OnOffCluster;
  export var LevelControlCluster;
  export var ColorControlCluster;
  export var PowerConfigurationCluster;
}
