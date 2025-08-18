function logUnknownFingerprint(context) {
  const { manufacturerName, modelId, productId } = context || {};
  const msg = `Unknown Zigbee fingerprint mfg=${manufacturerName} model=${modelId} product=${productId}`;
  try { console.warn(msg); } catch {}
}

module.exports = { logUnknownFingerprint };


