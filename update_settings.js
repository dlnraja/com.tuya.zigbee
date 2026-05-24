const fs = require('fs');
let html = fs.readFileSync('settings/index.html', 'utf8');

const target = `<div class="card">
    <h3>Developer Settings</h3>`;

const replaceWith = `<div class="card">
    <h3>Samsung SmartThings OAuth2</h3>
    <p style="font-size:11px;color:#666">To use SmartThings, provide your OAuth2 Client ID and Secret from the Samsung SmartThings Workspace.</p>
    
    <div class="row font-group">
      <div class="fg">
        <label for="st-cid">Client ID</label>
        <input id="st-cid" placeholder="OAuth2 Client ID"/>
      </div>
      <div class="fg">
        <label for="st-sec">Client Secret</label>
        <input id="st-sec" type="password" placeholder="OAuth2 Client Secret"/>
        <div class="ss" id="st-sec-status">No secret saved</div>
      </div>
    </div>

    <button class="btn" id="btn-save-st" disabled onclick="saveSTCreds()">Save SmartThings Credentials</button>
    <button class="btn btn-c" id="btn-clear-st" disabled onclick="clearSTCreds()">Clear</button>
    
    <div class="msg ok" id="ok-msg-st"></div>
    <div class="msg err" id="err-msg-st"></div>
  </div>

  <div class="card">
    <h3>Developer Settings</h3>`;

html = html.replace(target, replaceWith);
fs.writeFileSync('settings/index.html', html);
console.log('Done modifying settings HTML');
