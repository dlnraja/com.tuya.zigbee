'use strict';

const EventEmitter = require('events');

const Cluster = require('./Cluster');
const BoundCluster = require('./BoundCluster');
const { ZCLStandardHeader, ZCLMfgSpecificHeader } = require('./zclFrames');

let { debug } = require('./util');
const { getLogId } = require('./util');

debug = debug.extend('endpoint');

/**
 * Class representing an endpoint on a node. It contains a reference to its clusters and bindings.
 */
class Endpoint extends EventEmitter {

  /**
   * Creates a new Endpoint instance.
   * @param {ZCLNode} node
   * @param {object} descriptor
   * @param {number} descriptor.endpointId
   * @param {number[]} descriptor.inputClusters
   */
  constructor(node, descriptor) {
    super();
    this.clusters = {};
    this.bindings = {};
    this._node = node;
    this._descriptor = descriptor;
    this._endpointId = descriptor.endpointId;

    // Iterate all the input clusters and instantiate a Cluster for each
    descriptor.inputClusters.forEach(cId => {
      const InputCluster = Cluster.getCluster(cId);
      if (InputCluster) {
        this.clusters[InputCluster.NAME] = new InputCluster(this);
      }
    });
  }

  /**
   * Returns log id string for this endpoint.
   * @param {number} clusterId
   * @returns {string}
   * @private
   */
  getLogId(clusterId) {
    const cluster = Cluster.getCluster(clusterId) || {};
    return getLogId(this._endpointId, cluster.NAME, clusterId);
  }

  /**
   * Bind a {@link BoundCluster} instance to this endpoint. This is needed for handling incoming
   * commands on the Cluster instance.
   * @param {string} clusterName
   * @param {BoundCluster} clusterImpl - New BoundCluster instance.
   */
  bind(clusterName, clusterImpl) {
    const OutputCluster = Cluster.getCluster(clusterName);
    if (!OutputCluster) {
      throw new TypeError(`${clusterName} is not a valid cluster`);
    }

    if (!(clusterImpl instanceof BoundCluster)) {
      throw new TypeError('Binding implementation must be an instance of BoundCluster');
    }

    clusterImpl.endpoint = this._endpointId;
    clusterImpl.cluster = OutputCluster;

    this.bindings[OutputCluster.NAME] = clusterImpl;
  }

  /**
   * Unbind a {@link BoundCluster} instance from this endpoint which was previously bound using
   * {@link bind}.
   * @param {string} clusterName
   */
  unbind(clusterName) {
    const OutputCluster = Cluster.getCluster(clusterName);
    this.bindings[OutputCluster.NAME] = new OutputCluster(this, OutputCluster);
  }

  /**
   * Forward the frame to be sent from the {@link Cluster} to the {@link ZCLNode}.
   * @param {number} clusterId
   * @param {object} data
   * @returns {Promise<*>}
   * @private
   */
  async sendFrame(clusterId, data) {
    return this._node.sendFrame(this._endpointId, clusterId, data);
  }

  /**
   * Handles an incoming frame and passes it from the {@link ZCLNode} to the {@link Cluster}.
   * @param {number} clusterId
   * @param {Buffer} frame
   * @param {object} meta
   * @returns {Promise<void>}
   * @private
   */
  async handleFrame(clusterId, frame, meta) {
    const rawFrame = frame;
    frame = Endpoint.parseFrame(frame);

    let clusterSpecificResponse = null;
    let clusterSpecificError = null;
    try {
      clusterSpecificResponse = await this.handleZCLFrame(clusterId, frame, meta, rawFrame);
    } catch (err) {
      clusterSpecificError = err;
      debug(`${this.getLogId(clusterId)}, error while handling frame`, err.message, { meta, frame });
    }

    // Don't respond to this frame if it is a default response or a group cast (ZCL spec 2.5.12.2)
    if (frame.cmdId === 11 || (meta && typeof meta.groupId === 'number')) return;

    // If cluster specific error, respond with a default response error frame
    if (clusterSpecificError) {
      const defaultResponseErrorFrame = this.makeDefaultResponseFrame(frame, false);
      this.sendFrame(clusterId, defaultResponseErrorFrame.toBuffer()).catch(err => {
        debug(`${this.getLogId(clusterId)}, error while sending default error response`, err, { response: defaultResponseErrorFrame });
      });

      // No further handling for this frame
      return;
    }

    // Create response frame and set status to success
    const responseFrame = this.makeDefaultResponseFrame(frame, true);

    // If a cluster specific response was generated, set the response data
    // and cmdId in the response frame.
    if (clusterSpecificResponse) {
      const [cmdId, data] = clusterSpecificResponse;
      responseFrame.data = data.toBuffer();
      responseFrame.cmdId = cmdId;
    }

    // If there was no cluster specific response and the default response is disabled, don't
    // send a response.
    if (!clusterSpecificResponse && frame.frameControl.disableDefaultResponse) return;

    // Send either cluster specific, or default response frame
    try {
      await this.sendFrame(clusterId, responseFrame.toBuffer());
    } catch (err) {
      debug(`${this.getLogId(clusterId)}, error while sending cluster specific or default success response`, err, { response: responseFrame });
    }
  }

  /**
   * Handles forwarding a ZCL frame to the respective cluster or binding.
   * @param {number} clusterId
   * @param {Buffer} frame
   * @param {object} meta
   * @param {Buffer} rawFrame
   * @returns {Promise}
   * @private
   */
  async handleZCLFrame(clusterId, frame, meta, rawFrame) {
    const ClusterClass = Cluster.getCluster(clusterId);
    const clusterName = ClusterClass ? ClusterClass.NAME : clusterId;

    let response;
    if (!frame.frameControl.directionToClient) {
      if (this.bindings[clusterName]) {
        response = await this.bindings[clusterName].handleFrame(frame, meta, rawFrame);
      } else {
        throw new Error('binding_unavailable');
      }
    } else if (this.clusters[clusterName]) {
      response = await this.clusters[clusterName].handleFrame(frame, meta, rawFrame);
    } else {
      throw new Error('cluster_unavailable');
    }

    return response;
  }

  /**
   * Returns a default response frame with an error status code.
   * @param {*} receivedFrame
   * @param {boolean} success
   * @returns {ZCLStandardHeader|ZCLMfgSpecificHeader}
   */
  makeDefaultResponseFrame(receivedFrame, success) {
    let responseFrame;
    if (receivedFrame instanceof ZCLStandardHeader) {
      responseFrame = new ZCLStandardHeader();
    } else {
      responseFrame = new ZCLMfgSpecificHeader();
      responseFrame.manufacturerId = receivedFrame.manufacturerId;
    }
    // TODO: flip proper bits
    responseFrame.frameControl = receivedFrame.frameControl.copy();

    responseFrame.frameControl.disableDefaultResponse = true;
    responseFrame.frameControl.clusterSpecific = false;
    responseFrame.frameControl.directionToClient = !receivedFrame.frameControl.directionToClient;

    responseFrame.trxSequenceNumber = receivedFrame.trxSequenceNumber;
    responseFrame.cmdId = 0x0B;
    responseFrame.data = Buffer.from([receivedFrame.cmdId, success ? 0 : 1]);
    return responseFrame;
  }

  static parseFrame(frame) {
    if (frame[0] & 0x4) {
      return ZCLMfgSpecificHeader.fromBuffer(frame);
    }
    return ZCLStandardHeader.fromBuffer(frame);
  }

}

module.exports = Endpoint;
