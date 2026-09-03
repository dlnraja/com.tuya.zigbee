/* Zigbee spider map for Homey App Settings (MASTER_ONLY).
 * Layout inspired by Z2M graphviz + radial/star views (ideas only).
 * Homey Pro 2023 does not expose coordinator neighbor tables to apps.
 */
(function (global) {
  'use strict';

  var HomeyRef = null;
  var snapshot = null;
  var collapsed = {};
  var selectedId = null;
  var view = { x: 0, y: 0, k: 1 };
  var dragging = false;
  var dragStart = null;
  var loadTimer = null;

  var LQI_COLOR = {
    excellent: '#22c55e',
    good: '#84cc16',
    fair: '#f59e0b',
    poor: '#f97316',
    bad: '#ef4444',
    unknown: '#94a3b8'
  };

  function $(id) { return document.getElementById(id); }

  function childrenOf(id) {
    if (!snapshot) return [];
    var out = [];
    for (var i = 0; i < snapshot.edges.length; i++) {
      if (snapshot.edges[i].source === id) out.push(snapshot.edges[i].target);
    }
    return out;
  }

  function nodeById(id) {
    if (!snapshot) return null;
    for (var i = 0; i < snapshot.nodes.length; i++) {
      if (snapshot.nodes[i].id === id) return snapshot.nodes[i];
    }
    return null;
  }

  function visibleSet() {
    var vis = {};
    if (!snapshot) return vis;
    var root = snapshot.coordinatorId || 'homey';
    var q = [root];
    vis[root] = true;
    while (q.length) {
      var id = q.shift();
      if (collapsed[id]) continue;
      var kids = childrenOf(id);
      for (var i = 0; i < kids.length; i++) {
        if (!vis[kids[i]]) {
          vis[kids[i]] = true;
          q.push(kids[i]);
        }
      }
    }
    return vis;
  }

  function depthOf(id, memo, visiting) {
    memo = memo || {};
    visiting = visiting || {};
    if (memo[id] != null) return memo[id];
    if (visiting[id]) return 1;
    var n = nodeById(id);
    if (!n || !n.parentId) {
      memo[id] = 0;
      return 0;
    }
    visiting[id] = true;
    memo[id] = depthOf(n.parentId, memo, visiting) + 1;
    delete visiting[id];
    return memo[id];
  }

  function layoutPositions(vis) {
    var byDepth = {};
    var maxD = 0;
    snapshot.nodes.forEach(function (n) {
      if (!vis[n.id]) return;
      var d = depthOf(n.id);
      if (!byDepth[d]) byDepth[d] = [];
      byDepth[d].push(n);
      if (d > maxD) maxD = d;
    });
    var pos = {};
    var cx = 360;
    var cy = 280;
    pos[snapshot.coordinatorId || 'homey'] = { x: cx, y: cy, d: 0 };
    for (var d = 1; d <= maxD; d++) {
      var ring = byDepth[d] || [];
      var r = 88 + d * 92;
      for (var i = 0; i < ring.length; i++) {
        var ang = (-Math.PI / 2) + (2 * Math.PI * i) / Math.max(ring.length, 1);
        pos[ring[i].id] = {
          x: cx + r * Math.cos(ang),
          y: cy + r * Math.sin(ang),
          d: d
        };
      }
    }
    return { pos: pos, cx: cx, cy: cy, maxD: maxD };
  }

  function fmtAgo(ts) {
    if (!ts) return '—';
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return s + 's';
    if (s < 3600) return Math.round(s / 60) + 'm';
    if (s < 86400) return Math.round(s / 3600) + 'h';
    return Math.round(s / 86400) + 'd';
  }

  function setMsg(text, isErr) {
    var el = $('mesh-msg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'mesh-msg' + (isErr ? ' err' : '');
  }

  function renderStats() {
    var st = (snapshot && snapshot.stats) || {};
    var chips = [
      ['Devices', st.total || 0],
      ['Advertising', st.advertising != null ? st.advertising : '—'],
      ['Routers', st.routers || 0],
      ['End', st.endDevices || 0],
      ['Online', st.online || 0],
      ['Offline', st.offline || 0],
      ['Weak', st.weak || 0],
      ['Avg LQI', st.averageLqi == null ? '—' : st.averageLqi],
      ['Busiest', st.busiestName ? (st.busiestName + ' ' + (st.busiestRx24h || 0) + '/24h') : '—']
    ];
    var html = '';
    for (var i = 0; i < chips.length; i++) {
      html += '<span class="mesh-chip"><b>' + chips[i][1] + '</b> ' + chips[i][0] + '</span>';
    }
    $('mesh-stats').innerHTML = html;
  }

  function renderDetail(n) {
    var box = $('mesh-detail');
    if (!n) {
      box.innerHTML = '<span class="ss">Click a node. Click again on a parent to retract its children (star / spider fold).</span>';
      return;
    }
    var hidden = childrenOf(n.id).length;
    box.innerHTML =
      '<b>' + escapeHtml(n.name) + '</b> · ' + escapeHtml(n.role) +
      (n.online ? ' · online' : ' · offline') +
      (n.advertising ? ' · advertising' : '') + '<br>' +
      (n.zone ? ('Zone: ' + escapeHtml(n.zone) + '<br>') : '') +
      (n.driverId ? ('Driver: ' + escapeHtml(n.driverId) + '<br>') : '') +
      (n.ieee ? ('IEEE: ' + escapeHtml(n.ieee) + '<br>') : '') +
      'LQI: ' + (n.lqi == null ? '—' : n.lqi) + ' (' + (n.band || 'unknown') + ')' +
      (n.rssi != null ? ' · RSSI ' + n.rssi + ' dBm' : '') + '<br>' +
      (n.battery != null ? ('Battery: ' + n.battery + '%<br>') : '') +
      'Last seen: ' + fmtAgo(n.lastSeen) +
      (n.rxLastHour != null ? (' · RX ' + n.rxLastHour + '/1h · ' + (n.rxLast24h || 0) + '/24h') : '') +
      (n.parentKind ? ' · link: ' + n.parentKind : '') +
      (hidden ? '<br>Children: ' + hidden + (collapsed[n.id] ? ' (folded)' : '') : '');
  }

  function renderAvail(av) {
    var tb = document.querySelector('#mesh-avail tbody');
    if (!tb) return;
    if (!av || !av.rows || !av.rows.length) {
      tb.innerHTML = '<tr><td colspan="6">No availability samples yet (open this page after devices have reported).</td></tr>';
      return;
    }
    var html = '';
    for (var i = 0; i < av.rows.length; i++) {
      var r = av.rows[i];
      html += '<tr>' +
        '<td>' + escapeHtml(r.name) + (r.isBattery ? ' · batt' : '') + '</td>' +
        '<td>' + fmtAgo(r.lastSeen) + '</td>' +
        '<td>' + (r.rxLastHour || 0) + '</td>' +
        '<td>' + (r.rxLast24h || 0) + '</td>' +
        '<td>' + (r.rejoins || 0) + '</td>' +
        '<td class="' + (r.unavailable ? 'mesh-off' : '') + '">' + (r.unavailable ? 'offline' : 'ok') + '</td>' +
        '</tr>';
    }
    tb.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function renderSvg() {
    var svg = $('mesh-svg');
    if (!svg || !snapshot) return;
    var vis = visibleSet();
    var lay = layoutPositions(vis);
    var parts = [];
    var maxR = 88 + Math.max(lay.maxD, 1) * 92;
    for (var ring = 1; ring <= Math.max(lay.maxD, 2); ring++) {
      var rr = 88 + ring * 92;
      parts.push('<circle class="mesh-web" cx="' + lay.cx + '" cy="' + lay.cy + '" r="' + rr + '"/>');
    }
    var spokes = Math.max(8, Math.min(16, (snapshot.nodes.length || 8)));
    for (var s = 0; s < spokes; s++) {
      var a = (-Math.PI / 2) + (2 * Math.PI * s) / spokes;
      var x2 = lay.cx + maxR * Math.cos(a);
      var y2 = lay.cy + maxR * Math.sin(a);
      parts.push('<line class="mesh-web" x1="' + lay.cx + '" y1="' + lay.cy + '" x2="' + x2 + '" y2="' + y2 + '"/>');
    }

    snapshot.edges.forEach(function (e) {
      if (!vis[e.source] || !vis[e.target]) return;
      var a = lay.pos[e.source];
      var b = lay.pos[e.target];
      if (!a || !b) return;
      var n = nodeById(e.target);
      var band = (n && n.band) || 'unknown';
      var dashed = e.kind === 'inferred' || e.kind === 'star' || band === 'unknown';
      parts.push(
        '<line class="mesh-edge" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"' +
        ' stroke="' + (LQI_COLOR[band] || LQI_COLOR.unknown) + '"' +
        ' stroke-dasharray="' + (dashed ? '5 4' : '0') + '"' +
        ' stroke-width="' + (e.kind === 'reported' ? 2.4 : 1.4) + '"/>'
      );
    });

    snapshot.nodes.forEach(function (n) {
      if (!vis[n.id]) return;
      var p = lay.pos[n.id];
      if (!p) return;
      var r = n.role === 'coordinator' ? 18 : (n.role === 'router' ? 12 : 9);
      var fill = n.role === 'coordinator' ? '#e11d48' : (n.role === 'router' ? '#2563eb' : '#fde68a');
      if (!n.online && n.role !== 'coordinator') fill = '#cbd5e1';
      var kids = childrenOf(n.id).length;
      var isSel = selectedId === n.id;
      var label = escapeHtml(n.name.length > 18 ? n.name.slice(0, 16) + '…' : n.name);
      parts.push(
        '<g class="mesh-node" data-id="' + escapeHtml(n.id) + '" transform="translate(' + p.x + ',' + p.y + ')">' +
        '<circle r="' + (r + (isSel ? 3 : 0)) + '" fill="' + fill + '" stroke="' + (isSel ? '#0f172a' : '#fff') + '" stroke-width="' + (isSel ? 2.5 : 1.5) + '" opacity="' + (n.online ? 1 : 0.55) + '"/>' +
        (kids ? ('<text class="mesh-badge" y="' + (-r - 6) + '">' + (collapsed[n.id] ? '+' : '−') + kids + '</text>') : '') +
        '<text class="mesh-label" y="' + (r + 12) + '">' + label + '</text>' +
        '</g>'
      );
    });

    svg.innerHTML = '<g id="mesh-world" transform="translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')">' + parts.join('') + '</g>';
    var world = $('mesh-world');
    if (!world) return;
    world.querySelectorAll('.mesh-node').forEach(function (g) {
      g.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = g.getAttribute('data-id');
        onNodeClick(id);
      });
    });
  }

  function onNodeClick(id) {
    var kids = childrenOf(id);
    if (kids.length) {
      collapsed[id] = !collapsed[id];
    }
    selectedId = id;
    renderSvg();
    renderDetail(nodeById(id));
  }

  function expandAll() {
    collapsed = {};
    renderSvg();
  }

  function foldLeaves() {
    if (!snapshot) return;
    collapsed = {};
    snapshot.nodes.forEach(function (n) {
      if (n.role === 'router' && childrenOf(n.id).length) collapsed[n.id] = true;
    });
    renderSvg();
  }

  function foldAll() {
    collapsed = {};
    var root = snapshot && snapshot.coordinatorId;
    if (root) collapsed[root] = true;
    renderSvg();
  }

  function loadMap() {
    if (!HomeyRef) {
      setMsg('App not ready yet', true);
      return;
    }
    setMsg('Loading mesh snapshot…');
    $('btn-mesh-refresh').disabled = true;
    if (loadTimer) clearTimeout(loadTimer);
    var settled = false;
    loadTimer = setTimeout(function () {
      if (settled) return;
      settled = true;
      $('btn-mesh-refresh').disabled = false;
      setMsg('Timeout loading Zigbee map', true);
    }, 12000);

    HomeyRef.api('GET', '/zigbee-map', {}, function (err, data) {
      if (settled) return;
      settled = true;
      clearTimeout(loadTimer);
      $('btn-mesh-refresh').disabled = false;
      if (err) {
        setMsg((err.message || err) + '', true);
        return;
      }
      snapshot = data;
      collapsed = {};
      selectedId = snapshot.coordinatorId || 'homey';
      view = { x: 0, y: 0, k: 1 };
      renderStats();
      renderSvg();
      renderDetail(nodeById(selectedId));
      renderAvail(snapshot.availability);
      setMsg((snapshot.note || '') + (snapshot.inferred ? '  Links may be inferred.' : ''));
    });
  }

  function bindPanZoom() {
    var svg = $('mesh-svg');
    if (!svg) return;
    svg.addEventListener('mousedown', function (e) {
      var t = e.target;
      var hitNode = false;
      while (t && t !== svg) {
        if (t.getAttribute && t.getAttribute('data-id')) { hitNode = true; break; }
        t = t.parentNode;
      }
      if (hitNode) return;
      dragging = true;
      dragStart = { x: e.clientX - view.x, y: e.clientY - view.y };
    });
    svg.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      view.x = e.clientX - dragStart.x;
      view.y = e.clientY - dragStart.y;
      var g = $('mesh-world');
      if (g) g.setAttribute('transform', 'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')');
    });
    svg.addEventListener('mouseup', function () { dragging = false; });
    svg.addEventListener('mouseleave', function () { dragging = false; });
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var next = view.k * (e.deltaY > 0 ? 0.92 : 1.08);
      view.k = Math.max(0.4, Math.min(2.4, next));
      var g = $('mesh-world');
      if (g) g.setAttribute('transform', 'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')');
    }, { passive: false });
  }

  function toggleFs() {
    var card = $('mesh-card');
    if (!card) return;
    card.classList.toggle('mesh-fs');
    $('btn-mesh-fs').textContent = card.classList.contains('mesh-fs') ? 'Exit' : 'Full';
  }

  function init(homey) {
    HomeyRef = homey;
    bindPanZoom();
    $('btn-mesh-refresh').addEventListener('click', loadMap);
    $('btn-mesh-expand').addEventListener('click', expandAll);
    $('btn-mesh-fold').addEventListener('click', foldLeaves);
    $('btn-mesh-retract').addEventListener('click', foldAll);
    $('btn-mesh-fs').addEventListener('click', toggleFs);
    loadMap();
  }

  global.TuyaZigbeeMap = { init: init, load: loadMap };
})(window);
