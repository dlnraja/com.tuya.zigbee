const fs = require('fs');
const path = require('path');

// 1. Fix all .homeycompose files (actions, conditions, triggers)
const composeDirs = [
  '.homeycompose/flow/actions',
  '.homeycompose/flow/conditions',
  '.homeycompose/flow/triggers'
];

composeDirs.forEach(d => {
  if (fs.existsSync(d)) {
    fs.readdirSync(d).forEach(f => {
      let p = path.join(d, f);
      if (p.endsWith('.json')) {
        let t = fs.readFileSync(p, 'utf8');
        let original = t;
        t = t.replace(/"type":\s*"enum"/g, '"type": "dropdown"');
        t = t.replace(/"type":\s*"zone"/g, '"type": "autocomplete"');
        t = t.replace(/"label":/g, '"title":'); // some values arrays had 'label' instead of 'title'
        if (t !== original) {
          fs.writeFileSync(p, t);
          console.log('Fixed', p);
        }
      }
    });
  }
});

// 2. Fix app.json directly for any manual entries
let appPath = 'app.json';
if (fs.existsSync(appPath)) {
  let app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
  
  const fixArgs = (args) => {
    if (!args) return;
    args.forEach(arg => {
      if (arg.type === 'enum') arg.type = 'dropdown';
      if (arg.type === 'zone') arg.type = 'autocomplete';
      if (arg.values && Array.isArray(arg.values)) {
        arg.values.forEach(v => {
          if (v.label && !v.title) {
            v.title = v.label;
          }
          delete v.label;
        });
      }
    });
  };

  ['actions', 'conditions', 'triggers'].forEach(flowType => {
    if (app.flow && app.flow[flowType]) {
      app.flow[flowType].forEach(card => {
        fixArgs(card.args);
      });
    }
  });

  fs.writeFileSync(appPath, JSON.stringify(app, null, 2));
  console.log('Fixed app.json');
}
