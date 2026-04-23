const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      walk(fullPath, callback);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      callback(fullPath);
    }
  }
}

walk(path.join(ROOT, 'drivers'), (file) => {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    // 1. Overclosed parentheses in async listeners: )); -> );
    if (trimmed.includes('async v') && trimmed.endsWith('));')) {
       lines[i] = line.substring(0, line.lastIndexOf(')')) + ';';
       changed = true;
       continue;
    }

    // 2. Broken ternaries: return x ? y : null; -> return x ? y : null;
    if (trimmed.startsWith('return ') && trimmed.includes('?') && !trimmed.includes(':') && trimmed.endsWith(';')) {
       lines[i] = line.substring(0, line.lastIndexOf(';')).trimEnd() + ' : null;';
       changed = true;
       continue;
    }

    // 3. Unclosed Math.round/setCapabilityValue
    if (trimmed.includes('(')) {
       let open = (line.match(/\(/g) || []).length;
       let close = (line.match(/\)/g) || []).length;
       if (open > close && trimmed.endsWith(';')) {
          lines[i] = line.substring(0, line.lastIndexOf(';')).trimEnd() + ')'.repeat(open - close) + ';';
          changed = true;
       } else if (close > open && (trimmed.endsWith(');') || trimmed.endsWith('));'))) {
          // 4. Overclosed in general
          let newLine = line;
          let tempClose = close;
          while (tempClose > open && (newLine.trim().endsWith(');') || newLine.trim().endsWith('));'))) {
             let lastParen = newLine.lastIndexOf(')');
             newLine = newLine.substring(0, lastParen) + newLine.substring(lastParen + 1);
             tempClose--;
          }
          if (newLine !== line) {
            lines[i] = newLine;
            changed = true;
          }
       }
    }
  }

  if (changed) {
    fs.writeFileSync(file, lines.join('\n'));
    console.log(`FIXED: ${path.relative(ROOT, file)}`);
  }
});
