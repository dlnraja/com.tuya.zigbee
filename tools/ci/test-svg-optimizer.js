'use strict';

/**
 * Test SVG optimizer (P58)
 * Run with: node tools/ci/test-svg-optimizer.js
 *
 * 12 tests, no external deps.
 */

const assert = require('assert');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { minifySvg } = require(path.join(ROOT, 'scripts/maintenance/optimize-build-svgs.cjs'));

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n      ${err.message}`);
  }
}

console.log('=== SVG optimizer tests ===');

test('removes XML comments', () => {
  const out = minifySvg('<svg><!-- comment --><rect/></svg>');
  assert.ok(!out.includes('comment'), `got: ${out}`);
});

test('removes XML processing instructions', () => {
  const out = minifySvg('<?xml version="1.0"?><svg><rect/></svg>');
  assert.ok(!out.includes('<?xml'), `got: ${out}`);
});

test('removes DOCTYPE', () => {
  const out = minifySvg('<!DOCTYPE svg><svg><rect/></svg>');
  assert.ok(!out.includes('DOCTYPE'), `got: ${out}`);
});

test('removes metadata/title/desc', () => {
  const out = minifySvg('<svg><metadata>x</metadata><title>t</title><desc>d</desc><rect/></svg>');
  assert.ok(!out.includes('<metadata'), `got: ${out}`);
  assert.ok(!out.includes('<title'), `got: ${out}`);
  assert.ok(!out.includes('<desc'), `got: ${out}`);
});

test('removes Inkscape/sodipodi namespaces and attrs', () => {
  const out = minifySvg('<svg xmlns:sodipodi="http://x" xmlns:inkscape="http://y" sodipodi:namedview="a" inkscape:label="b"><rect/></svg>');
  assert.ok(!out.includes('sodipodi'), `got: ${out}`);
  assert.ok(!out.includes('inkscape'), `got: ${out}`);
});

test('collapses whitespace between tags', () => {
  const out = minifySvg('<svg>  <rect/>  <circle/>  </svg>');
  assert.ok(!out.includes('>  <'), `got: ${out}`);
});

test('collapses runs of whitespace', () => {
  const out = minifySvg('<svg>   hello   world   </svg>');
  assert.ok(!out.includes('   '), `got: ${out}`);
});

test('trims leading/trailing whitespace', () => {
  const out = minifySvg('   <svg><rect/></svg>   ');
  assert.ok(!out.startsWith(' '), `got: ${out}`);
  assert.ok(!out.endsWith(' '), `got: ${out}`);
});

test('preserves actual content', () => {
  const inSvg = '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80"/></svg>';
  const out = minifySvg(inSvg);
  assert.ok(out.includes('viewBox="0 0 100 100"'), `got: ${out}`);
  assert.ok(out.includes('<rect'), `got: ${out}`);
  assert.ok(out.includes('width="80"'), `got: ${out}`);
});

test('handles empty SVG', () => {
  const out = minifySvg('<svg></svg>');
  assert.strictEqual(out, '<svg></svg>');
});

test('handles SVG with style block', () => {
  const inSvg = '<svg><style>.a { fill: red; }</style><rect class="a"/></svg>';
  const out = minifySvg(inSvg);
  assert.ok(out.includes('<style>'), `got: ${out}`);
  assert.ok(out.includes('<rect'), `got: ${out}`);
});

test('real-world: typical driver icon.svg shrinks 30%+', () => {
  // Approximate a real driver icon SVG
  const real = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 100 100">
  <title>Driver Icon</title>
  <desc>Icon for the driver</desc>
  <metadata>
    <rdf:RDF>
      <cc:Work rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/>
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <sodipodi:namedview id="base" pagecolor="#ffffff" bordercolor="#666666" borderopacity="1.0" inkscape:pageopacity="0.0" inkscape:pageshadow="2 2 2 2" inkscape:zoom="1.4" inkscape:cx="50" inkscape:cy="50" inkscape:current-layer="layer1" showgrid="false" inkscape:document-units="px"/>
  <g inkscape:label="Layer 1" inkscape:groupmode="layer">
    <rect x="10" y="10" width="80" height="80" fill="blue"/>
    <circle cx="50" cy="50" r="20" fill="red"/>
  </g>
</svg>`;
  const out = minifySvg(real);
  const ratio = out.length / real.length;
  assert.ok(ratio < 0.7, `shrunk to ${(ratio*100).toFixed(0)}% (expected < 70%)`);
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
