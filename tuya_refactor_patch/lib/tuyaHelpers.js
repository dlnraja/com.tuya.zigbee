#!/usr/bin/env node
'use strict';

// Fonctions d'aide pour la normalisation des appareils Tuya
const tuyaHelpers = {
  normalizeDeviceModel: (model) => {
    return model.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  },
  dpToCapabilityMap: {
    // Mappage des DPs vers les capacités Homey
  }
};

module.exports = tuyaHelpers;
