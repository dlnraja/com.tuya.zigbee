'use strict';

const { Cluster } = require('zigbee-clusters');

// Implémentation du cluster spécifique Tuya (0xEF00)
class TuyaSpecificCluster extends Cluster {
  
  static get ID() {
    return 0xEF00;
  }
  
  static get NAME() {
    return 'tuya';
  }
  
  // Commandes du cluster
  static get COMMANDS() {
    return {
      dataReport: {
        id: 0x01,
        args: {
          seq: Cluster.DataTypes.UINT8,
          dpId: Cluster.DataTypes.UINT8,
          dataType: Cluster.DataTypes.UINT8,
          data: Cluster.DataTypes.BUFFER,
        },
      },
      setData: {
        id: 0x00,
        args: {
          seq: Cluster.DataTypes.UINT8,
          dpId: Cluster.DataTypes.UINT8,
          dataType: Cluster.DataTypes.UINT8,
          data: Cluster.DataTypes.BUFFER,
        },
      },
    };
  }
  
  // Méthode pour envoyer des données à l'appareil
  async setData(dpId, dataType, data) {
    const seq = this.getNextSeqNumber();
    
    await this.sendCommand('setData', {
      seq,
      dpId,
      dataType,
      data,
    });
    
    return seq;
  }
  
  // Générateur de numéro de séquence
  getNextSeqNumber() {
    this._seq = (this._seq || 0) + 1;
    if (this._seq > 255) this._seq = 0;
    return this._seq;
  }
}

module.exports = TuyaSpecificCluster;
