'use strict';
const APP='com.dlnraja.tuya.zigbee';

async function dashboardFallback(ver,log){
  log=log||console.log;
  const em=process.env.HOMEY_EMAIL,pw=process.env.HOMEY_PASSWORD;
  if(!em||!pw){log('  No credentials for dashboard');return false}
  try{
    log('  Athom login...');
    const lr=await fetch('https://accounts.athom.com/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em,password:pw})});
    const lj=await lr.json();
    if(!lj.token){log('  Login failed');return false}
    log('  Token obtained, trying dashboard API...');
    const token=lj.token;
    const endpoints=[
      {m:'PUT',u:'https://apps-sdk-v3.athom.com/api/app/'+APP+'/version/'+ver+'/test'},
      {m:'POST',u:'https://apps-sdk-v3.athom.com/api/app/'+APP+'/version/'+ver+'/publish',b:{channel:'test'}},
      {m:'PATCH',u:'https://apps-sdk-v3.athom.com/api/app/'+APP+'/version/'+ver,b:{status:'test'}},
      {m:'PUT',u:'https://apps-api.developer.athom.com/api/app/'+APP+'/version/'+ver+'/test'},
      {m:'POST',u:'https://apps-api.developer.athom.com/api/app/'+APP+'/version/'+ver+'/publish',b:{channel:'test'}},
    ];
    for(const ep of endpoints){
      const opts={method:ep.m,headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}};
      if(ep.b)opts.body=JSON.stringify(ep.b);
      try{
        const r=await fetch(ep.u,opts);
        if(r.ok){log('  Dashboard OK: '+ep.m+' '+ep.u);return true}
        if(r.status!==404)log('  '+r.status+' '+ep.u);
      }catch(e){log('  Error: '+e.message)}
    }
    log('  Dashboard fallback: all endpoints failed');
    return false;
  }catch(e){log('  Dashboard error: '+e.message);return false}
}

module.exports={dashboardFallback};
