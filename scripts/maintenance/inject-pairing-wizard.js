const fs = require('fs');
const path = require('path');

const pairHtml = `
<style>
.tab-container{display:flex;border-bottom:1px solid #ccc;margin-bottom:15px;}
.tab{padding:10px 15px;cursor:pointer;background:#f5f5f5;border:1px solid #ccc;border-bottom:none;margin-right:5px;}
.tab.active{background:#fff;font-weight:bold;border-bottom:1px solid #fff;margin-bottom:-1px;}
.pnl{display:none;}
.pnl.active{display:block;}
.box, .box2{padding:10px;background:#e9f7fe;border-left:4px solid #2196F3;margin-bottom:15px;font-size:13px;}
.fg{margin-bottom:12px;}
.fg label{display:block;font-weight:bold;margin-bottom:4px;}
.fg input, .fg select{width:100%;padding:8px;box-sizing:border-box;}
.hint{font-size:11px;color:#666;margin-top:2px;}
.btn{padding:10px 20px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;}
.btn-p{background:#00a870;color:#fff;width:100%;}
.err{color:red;margin-top:10px;display:none;}
.ok{color:green;margin-top:10px;display:none;}
</style>

<div class="tab-container">
<div class="tab active" data-t="ez">Tuya Easy Login</div>
<div class="tab" data-t="sl">SmartLife QR</div>
<div class="tab" data-t="iot">IoT Cloud</div>
<div class="tab" data-t="man">Manual Key</div>
</div>

<div id="p-ez" class="pnl active">
<div class="box"><b>Tuya Easy Login</b> - Scan for devices from your Tuya Smart / Smart Life account.</div>
<div class="row">
<div class="fg"><label>Email</label><input type="text" id="ez_email" placeholder="email@domain.com"/></div>
<div class="fg"><label>Password</label><input type="password" id="ez_pw" placeholder="password"/></div>
<div class="fg"><label>Country Code</label><input type="text" id="ez_cc" value="33" placeholder="33"/><div class="hint">33=FR, 1=US, 44=UK, 49=DE</div></div>
<div class="fg"><label>App</label><select id="ez_schema"><option value="smartlife">Smart Life</option><option value="tuyaSmart">Tuya Smart</option></select></div>
</div>
<button class="btn btn-p" id="btn-ez" onclick="doEasy()">Log in & scan devices</button>
<div class="err" id="ez-err"></div><div class="ok" id="ez-ok"></div>
</div>

<div id="p-sl" class="pnl">
<div class="box">
<b>SmartLife App (QR Code)</b> - Scan a QR code using the SmartLife app to fetch your devices automatically!
</div>
<div class="row">
<div class="fg"><label>Country Code</label><input type="text" id="sl_cc" value="33" placeholder="33"/><div class="hint">33=FR, 1=US, 44=UK, 49=DE</div></div>
<div class="fg"><label>Region</label><select id="sl_reg"><option value="eu">Europe</option><option value="us">Americas</option><option value="cn">China</option><option value="in">India</option></select></div>
<div class="fg"><label>App</label><select id="sl_schema"><option value="smartlife">Smart Life</option><option value="tuyaSmart">Tuya Smart</option></select></div>
</div>
<button class="btn btn-p" id="btn-sl" onclick="doSmartLife()">Log in & scan devices</button>
<div class="err" id="sl-err"></div><div class="ok" id="sl-ok"></div>
</div>

<div id="p-iot" class="pnl">
<div class="box">
<b>IoT Platform direct</b> - Uses your Tuya IoT project credentials to fetch all linked devices + local keys automatically.
</div>
<div class="fg"><label>Access ID</label><input type="text" id="iot_aid" placeholder="from iot.tuya.com"/></div>
<div class="fg"><label>Access Secret</label><input type="password" id="iot_as" placeholder="from iot.tuya.com"/></div>
<div class="fg"><label>Region</label><select id="iot_reg"><option value="eu">Europe</option><option value="us">Americas</option><option value="cn">China</option><option value="in">India</option></select></div>
<button class="btn btn-p" id="btn-iot" onclick="doIoT()">Scan devices</button>
<div class="err" id="iot-err"></div><div class="ok" id="iot-ok"></div>
</div>

<div id="p-man" class="pnl">
<div class="box2">
<b>Manual entry</b> - Enter Device ID and Local Key directly.
</div>
<div class="fg"><label>Device ID *</label><input type="text" id="m_did" placeholder="e.g. bf1234abcdef567890"/></div>
<div class="fg"><label>Local Key *</label><input type="text" id="m_lk" placeholder="16-char AES key"/></div>
<div class="fg"><label>IP Address</label><input type="text" id="m_ip" placeholder="auto-discovered if empty"/></div>
<div class="fg"><label>Device Name</label><input type="text" id="m_name" placeholder="e.g. Radiateur Salon"/></div>
<div class="fg"><label>Protocol</label><select id="m_pv"><option value="3.1">3.1</option><option value="3.3" selected>3.3</option><option value="3.4">3.4</option><option value="3.5">3.5</option></select></div>
<div class="err" id="man-err"></div>
</div>
`;

const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${pairHtml}
<script>
var H,done=false;
document.querySelectorAll('.tab').forEach(function(t){t.addEventListener('click',function(){document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('.pnl').forEach(function(p){p.classList.remove('active')});t.classList.add('active');document.getElementById('p-'+t.dataset.t).classList.add('active')})});
function hide(id){document.getElementById(id).style.display='none'}
function show(id,msg){var e=document.getElementById(id);e.innerHTML=msg;e.style.display='block'}
function spin(id){var b=document.getElementById(id);b.disabled=true;b.dataset.orig=b.innerHTML;b.innerHTML='Scanning...'}
function unspin(id){var b=document.getElementById(id);b.disabled=false;b.innerHTML=b.dataset.orig||'Scan'}

function doEasy(){
  var em=document.getElementById('ez_email').value.trim(),pw=document.getElementById('ez_pw').value.trim();
  var cc=document.getElementById('ez_cc').value.trim(),schema=document.getElementById('ez_schema').value;
  hide('ez-err');hide('ez-ok');
  if(!em||!pw){show('ez-err','Email and password required');return}
  spin('btn-ez');
  H.emit('login',{mode:'simple',email:em,password:pw,countryCode:cc,schema:schema},function(err,r){
    unspin('btn-ez');
    if(err){show('ez-err',err.message||String(err));return}
    done=true;show('ez-ok',r.count+' devices found! Click Next to select.');
  });
}

function doSmartLife(){
  var reg=document.getElementById('sl_reg').value,schema=document.getElementById('sl_schema').value;
  hide('sl-err');hide('sl-ok');
  spin('btn-sl');
  H.emit('login',{mode:'smartlife_qr',region:reg,schema:schema},function(err,r){
    unspin('btn-sl');
    if(err){show('sl-err',err.message||String(err));return}
    var qrUrl = schema + '://qrLogin?token=' + r.qrCode;
    var androidIntent = schema === 'smartlife' ? 
        'intent://qrLogin?token=' + r.qrCode + '#Intent;scheme=smartlife;package=com.tuya.smartlife;end' :
        'intent://qrLogin?token=' + r.qrCode + '#Intent;scheme=tuyaSmart;package=com.tuya.smart;end';

    var msg = '<b>Scan this or click a link below!</b><br>';
    if (r.localQrImage) msg += '<img src="'+r.localQrImage+'" style="margin:10px auto;display:block;" /><br>';
    msg += '<div style="display:flex;gap:6px;margin:5px 0;">';
    msg += '<a href="'+qrUrl+'" target="_blank" style="flex:1;display:inline-block;padding:9px;background:#00a870;color:white;text-decoration:none;border-radius:5px;font-weight:bold;text-align:center;">Launch App</a>';
    msg += '<a href="'+androidIntent+'" target="_blank" style="flex:1;display:inline-block;padding:9px;background:#007aff;color:white;text-decoration:none;border-radius:5px;font-weight:bold;text-align:center;">Android Link</a>';
    msg += '</div><i style="font-size:10px;color:#666;">(Wait here after authorizing)</i>';
    show('sl-ok',msg);
    
    H.emit('poll_qr',{}, function(err2,r2) {
       if(err2){show('sl-err',err2.message||String(err2));return}
       done=true; show('sl-ok',r2.count+' devices found! Click Next.');
    });
  });
}

function doIoT(){
  var aid=document.getElementById('iot_aid').value.trim(),as=document.getElementById('iot_as').value.trim();
  var reg=document.getElementById('iot_reg').value;
  hide('iot-err');hide('iot-ok');
  if(!aid||!as){show('iot-err','Access ID and Secret required');return}
  spin('btn-iot');
  H.emit('login',{mode:'cloud',accessId:aid,accessSecret:as,region:reg},function(err,r){
    unspin('btn-iot');
    if(err){show('iot-err',err.message||String(err));return}
    done=true;show('iot-ok',r.count+' devices found! Click Next to select.');
  });
}

function onHomeyReady(Homey){
  H=Homey;
  Homey.ready();
  Homey.emit('getSavedCredentials',{},function(err,r){
    if(!err&&r&&r.hasSaved){
      document.getElementById('iot_aid').value=r.accessId||'';
      if(r.region){document.getElementById('sl_reg').value=r.region;document.getElementById('iot_reg').value=r.region}
    }
  });
  Homey.on('nextView',function(){
    if(done)return;
    var tab=document.querySelector('.tab.active');
    if(!tab||tab.dataset.t!=='man')return;
    var did=document.getElementById('m_did').value.trim(),lk=document.getElementById('m_lk').value.trim();
    hide('man-err');
    if(!did||!lk){show('man-err','Device ID and Local Key required');return}
    if(lk.length<16){show('man-err','Local Key must be at least 16 characters');return}
    H.emit('configure',{device_id:did,local_key:lk,ip:document.getElementById('m_ip').value.trim(),name:document.getElementById('m_name').value.trim(),protocol_version:document.getElementById('m_pv').value},function(err){if(err){show('man-err',err.message||String(err))}else{done=true}});
  });
}
</script></body></html>`;

const pairBlock = [
  { "id": "configure", "navigation": { "next": "list_devices" } },
  { "id": "list_devices", "template": "list_devices", "navigation": { "prev": "configure" } },
  { "id": "add_devices", "template": "add_devices" }
];

const settingsBlock = [
  { "type": "group", "label": { "en": "Tuya Local Settings" }, "children": [
    { "id": "device_id", "type": "text", "label": { "en": "Device ID" }, "value": "" },
    { "id": "local_key", "type": "text", "label": { "en": "Local Key" }, "value": "" },
    { "id": "ip", "type": "text", "label": { "en": "IP Address" }, "value": "" },
    { "id": "protocol_version", "type": "dropdown", "label": { "en": "Protocol Version" }, "value": "3.3", "values": [
      { "id": "3.1", "label": { "en": "3.1" } }, { "id": "3.3", "label": { "en": "3.3" } },
      { "id": "3.4", "label": { "en": "3.4" } }, { "id": "3.5", "label": { "en": "3.5" } }
    ]}
  ]}
];

const dir = 'drivers';
const drivers = fs.readdirSync(dir);
drivers.forEach(d => {
  if(d.startsWith('wifi_unified_') && fs.statSync(path.join(dir, d)).isDirectory()) {
    const composePath = path.join(dir, d, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      const compose = JSON.parse(fs.readFileSync(composePath));
      compose.pair = pairBlock;
      compose.settings = compose.settings || [];
      
      const hasTuyaSettings = compose.settings.some(s => s.type === 'group' && s.label && s.label.en === 'Tuya Local Settings');
      if (!hasTuyaSettings) {
         compose.settings.push(...settingsBlock);
      }
      
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      console.log('Updated ' + composePath);
      
      const pairDir = path.join(dir, d, 'pair');
      if (!fs.existsSync(pairDir)) fs.mkdirSync(pairDir);
      fs.writeFileSync(path.join(pairDir, 'configure.html'), fullHtml);
      console.log('Created ' + path.join(pairDir, 'configure.html'));
    }
  }
});
console.log('Pairing wizards injection complete!');
