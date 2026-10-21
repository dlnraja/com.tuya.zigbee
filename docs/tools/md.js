'use strict';
// Minimal, dependency-free Markdown -> HTML converter for the docs site.
// Supports headings, paragraphs, lists, fenced code, tables, blockquotes, links,
// inline code, bold and italic. Links are passed through `opts.rewriteLink`.

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slug(s) {
  return String(s).toLowerCase().replace(/<[^>]+>/g, '').replace(/[`*_]/g, '')
    .replace(/[^a-z0-9\u00c0-\u024f]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
}

function inline(text, opts) {
  const codes = [];
  let s = String(text).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => '<img alt="' + alt + '" src="' + esc(rw(url, opts)) + '">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, label, url) => '<a href="' + esc(rw(url.replace(/&amp;/g, '&'), opts)) + '">' + label + '</a>');
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (m, pre, url) => pre + '<a href="' + url + '">' + url + '</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + esc(codes[Number(i)]) + '</code>');
  return s;
}

function rw(url, opts) {
  return opts && typeof opts.rewriteLink === 'function' ? opts.rewriteLink(url) : url;
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(c => c.trim());
}

function render(md, opts = {}) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const toc = [];
  let i = 0;
  const used = new Set();
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>');
      continue;
    }
    if (/^\s*<!--.*-->\s*$/.test(line)) { i++; continue; }
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      const lvl = h[1].length;
      let id = slug(h[2]);
      let n = 2; const base = id;
      while (used.has(id)) { id = base + '-' + n++; }
      used.add(id);
      if (lvl <= 3) toc.push({ level: lvl, id, text: h[2] });
      out.push('<h' + lvl + ' id="' + id + '">' + inline(h[2], opts) + '</h' + lvl + '>');
      i++; continue;
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      out.push('<table><thead><tr>' + head.map(c => '<th>' + inline(c, opts) + '</th>').join('') + '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + r.map(c => '<td>' + inline(c, opts) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push('<blockquote>' + render(buf.join('\n'), opts).html + '</blockquote>');
      continue;
    }
    const li = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      const ordered = /\d/.test(li[2]);
      const items = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]);
        if (m) { items.push(m[1].length >= 2 && items.length ? { text: m[3], sub: true } : { text: m[3] }); i++; continue; }
        if (/^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1].text += ' ' + lines[i].trim(); i++; continue; }
        break;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push('<' + tag + '>' + items.map(it => '<li' + (it.sub ? ' class="sub"' : '') + '>' + inline(it.text, opts) + '</li>').join('') + '</' + tag + '>');
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(#{1,6}\s|```|\||>|([-*+]|\d+[.)])\s)/.test(lines[i])) { buf.push(lines[i].trim()); i++; }
    if (!buf.length) { buf.push(line.trim()); i++; }
    out.push('<p>' + inline(buf.join(' '), opts) + '</p>');
  }
  return { html: out.join('\n'), toc };
}

module.exports = { render, inline, esc, slug };
