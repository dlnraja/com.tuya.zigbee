'use strict';
const FORUM='https://community.homey.app';
const TIMEOUT=15000;
function fetchTO(url,opts={}){const ac=new AbortController();const t=setTimeout(()=>ac.abort(),TIMEOUT);return fetch(url,{...opts,signal:ac.signal}).finally(()=>clearTimeout(t));}
function exCk(r){const c={};const h=typeof r.headers.getSetCookie==='function'?r.headers.getSetCookie():(r.headers.get('set-cookie')||'').split(/,(?=[^ ])/);for(const x of h){const i=x.indexOf('='),s=x.indexOf(';');if(i>0)c[x.substring(0,i).trim()]=x.substring(i+1,s>0?s:undefined).trim();}return c;}
function fmtCk(c){return Object.entries(c).map(([k,v])=>k+'='+v).join('; ');}

function authHeaders(auth,json){
  if(!auth)return{};
  const h=auth.type==='apikey'
    ?{'Api-Key':auth.apiKey,'Api-Username':auth.apiUser||'dlnraja'}
    :{'X-CSRF-Token':auth.csrf,'X-Requested-With':'XMLHttpRequest',Cookie:fmtCk(auth.cookies)};
  if(json)h['Content-Type']='application/json';
  return h;
}

async function refreshCsrf(auth){
  if(!auth||auth.type==='apikey')return auth;
  try{
    const cr=await fetchTO(FORUM+'/session/csrf',{headers:{'X-Requested-With':'XMLHttpRequest',Accept:'application/json',Cookie:fmtCk(auth.cookies)}});
    if(cr.ok){const d=await cr.json();if(d.csrf){auth.csrf=d.csrf;console.log('CSRF refreshed');}}
    Object.assign(auth.cookies,exCk(cr));
  }catch(e){console.warn('CSRF refresh failed:',e.message);}
  return auth;
}

async function ssoLogin(em,pw){
  const j=await(await fetchTO('https://accounts.athom.com/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em,password:pw})})).json();
  if(!j.token)throw new Error('Athom login failed');
  const r1=await fetchTO(FORUM+'/auth/oauth2_basic',{redirect:'manual'});
  const fc=exCk(r1);let loc=r1.headers.get('location');
  let r=await fetchTO(loc,{redirect:'manual'});
  Object.assign(fc,exCk(r));
  loc=r.headers.get('location');
  r=await fetchTO(loc,{redirect:'manual',headers:{Authorization:'Bearer '+j.token}});
  Object.assign(fc,exCk(r));
  loc=r.headers.get('location');
  if(!loc)throw new Error('SSO failed - no redirect after auth');
  for(let i=0;i<5&&loc;i++){
    r=await fetchTO(loc,{redirect:'manual',headers:{Cookie:fmtCk(fc)}});
    Object.assign(fc,exCk(r));
    loc=r.headers.get('location');
  }
  if(!fc._t)throw new Error('No session cookie (_t)');
  const cr=await fetchTO(FORUM+'/session/csrf',{headers:{'X-Requested-With':'XMLHttpRequest',Accept:'application/json',Cookie:fmtCk(fc)}});
  const cd=await cr.json();
  if(!cd.csrf)throw new Error('No CSRF token received');
  return{csrf:cd.csrf,cookies:fc};
}

async function getForumAuth(){
  // Priority 1: Discourse API Key (most reliable, no CSRF/session needed)
  const apiKey=process.env.DISCOURSE_API_KEY;
  const apiUser=process.env.DISCOURSE_USERNAME||'dlnraja';
  if(apiKey){
    console.log('Auth: Discourse API Key');
    return{type:'apikey',apiKey,apiUser};
  }
  // Priority 2: SSO with HOMEY_EMAIL/PASSWORD (OAuth flow)
  const em=process.env.HOMEY_EMAIL,pw=process.env.HOMEY_PASSWORD;
  if(em&&pw){
    for(let i=0;i<3;i++){
      try{const a=await ssoLogin(em,pw);console.log('Auth: SSO OK');return{type:'session',...a};}
      catch(e){console.warn('SSO try '+(i+1)+':',e.message);if(i<2)await new Promise(r=>setTimeout(r,3000*(i+1)));}
    }
  }
  return null;
}
module.exports={getForumAuth,refreshCsrf,authHeaders,fmtCk,exCk,FORUM};
