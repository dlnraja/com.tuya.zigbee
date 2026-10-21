'use strict';
/**
 * P2952 — Target vs actual position on Wi-Fi curtain motors.
 * Credit: Homey forum topic 154077 posts #487 and #489 by Andi (reports by Mario and Mark),
 * https://community.homey.app/t/154077/487 — many motors write the requested position on
 * DP2 but report the real one on DP3 (also when moved by hand), so a tile fed from DP2
 * sticks on the last requested value.
 * Rule (own wording): once the actual-position DP has reported, it owns the tile and the
 * target DP is ignored for display. Until then the target DP is used as before.
 */
class CoverPositionSource {
  constructor({ targetDp = 2, actualDp = 3 } = {}) {
    this.targetDp = String(targetDp);
    this.actualDp = String(actualDp);
    this.actualSeen = false;
  }

  /** @returns {boolean} whether a report from this dp should update the position tile */
  accept(dp, value) {
    const key = String(dp);
    const valid = Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
    if (key === this.actualDp) {
      if (valid) {this.actualSeen = true;}
      return valid;
    }
    if (key === this.targetDp) {return valid && !this.actualSeen;}
    return false;
  }
}

module.exports = { CoverPositionSource };
