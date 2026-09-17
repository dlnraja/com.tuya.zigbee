'use strict';

/**
 * SoftDeviceLink (P2565) — unbranded soft remote→light link (IKEA Tradfri/Dirigera binding feel).
 *
 * Homey cannot do Zigbee ZDO bind for third-party remotes the way Dirigera does.
 * This is an app-level link: when a source button/motion capability flips, targets update.
 * MASTER_ONLY. UI: Soft Device Link.
 */

const EventEmitter = require('events');

function clamp01(n) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}

class SoftDeviceLink extends EventEmitter {
  constructor(app, opts = {}) {
    super();
    this.app = app;
    this.homey = app?.homey;
    this._links = new Map(); // linkId → { source, targets, mode, dim, lastAt }
    this._pollMs = Math.max(800, Math.min(10000, Number(opts.pollMs) || 1500));
    this._interval = null;
    this._destroyed = false;
  }

  start() {
    if (this._interval || !this.homey) return;
    this._interval = this.homey.setInterval(() => {
      if (this._destroyed) return;
      this._tick().catch(() => {});
    }, this._pollMs);
  }

  stop() {
    if (this._interval) {
      try { this.homey?.clearInterval?.(this._interval); } catch (_e) { /* */ }
      this._interval = null;
    }
  }

  destroy() {
    this._destroyed = true;
    this.stop();
    this._links.clear();
  }

  /**
   * @param {object} opts
   * @param {object} opts.source button/sensor device
   * @param {object[]} opts.targets lights
   * @param {'toggle'|'on'|'off'|'follow'} [opts.mode]
   * @param {number} [opts.dim]
   */
  enroll(opts = {}) {
    const source = opts.source;
    const targets = (opts.targets || []).filter(Boolean);
    if (!source || !targets.length) return null;
    const id = String(opts.id || `${source.getData?.()?.id || source.getName?.() || 'src'}`).slice(0, 64);
    this._links.set(id, {
      source,
      targets,
      mode: ['toggle', 'on', 'off', 'follow'].includes(opts.mode) ? opts.mode : 'toggle',
      dim: opts.dim != null ? clamp01(opts.dim) : null,
      lastSource: this._readSourceState(source),
      lastAt: 0,
    });
    this.start();
    return { linkId: id, targets: targets.length };
  }

  unenroll(linkId) {
    return this._links.delete(String(linkId || ''));
  }

  _readSourceState(dev) {
    try {
      if (dev.hasCapability?.('alarm_motion')) return !!dev.getCapabilityValue('alarm_motion');
      if (dev.hasCapability?.('onoff')) return !!dev.getCapabilityValue('onoff');
      // scene remotes often pulse button_* or alarm_generic
      for (const cap of ['alarm_generic', 'button', 'alarm_contact']) {
        if (dev.hasCapability?.(cap)) return !!dev.getCapabilityValue(cap);
      }
    } catch (_e) { /* */ }
    return null;
  }

  async _applyTargets(link, wantOn) {
    for (const light of link.targets) {
      try {
        if (typeof this.app._hueSetLight === 'function') {
          await this.app._hueSetLight(light, {
            onoff: wantOn,
            dim: wantOn && link.dim != null ? link.dim : undefined,
          });
        } else {
          const set = light.safeSetCapabilityValue?.bind(light) || light.setCapabilityValue?.bind(light);
          if (wantOn && link.dim != null && light.hasCapability?.('dim')) await set?.('dim', link.dim);
          if (light.hasCapability?.('onoff')) await set?.('onoff', wantOn);
        }
      } catch (_e) { /* soft */ }
    }
  }

  async _tick() {
    for (const [id, link] of this._links) {
      const now = this._readSourceState(link.source);
      if (now === null || now === link.lastSource) continue;
      const prev = link.lastSource;
      link.lastSource = now;
      link.lastAt = Date.now();

      // rising edge (false→true) or follow
      let wantOn = null;
      if (link.mode === 'follow') wantOn = !!now;
      else if (link.mode === 'on' && now === true) wantOn = true;
      else if (link.mode === 'off' && now === true) wantOn = false;
      else if (link.mode === 'toggle' && now === true && prev === false) {
        // toggle first target
        const t0 = link.targets[0];
        const cur = t0?.hasCapability?.('onoff') ? !!t0.getCapabilityValue?.('onoff') : false;
        wantOn = !cur;
      } else if (link.mode === 'toggle' && now === true && prev == null) {
        wantOn = true;
      }

      if (wantOn === null) continue;
      await this._applyTargets(link, wantOn);
      this.emit('link_fired', { linkId: id, onoff: wantOn });
    }
  }

  snapshot() {
    const links = {};
    for (const [id, l] of this._links) {
      links[id] = { targets: l.targets.length, mode: l.mode, lastAt: l.lastAt };
    }
    return { links, pollMs: this._pollMs };
  }
}

module.exports = SoftDeviceLink;
