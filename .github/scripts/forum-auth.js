'use strict';
const FORUM='https://community.homey.app';
function exCk(r){const c={};const h=typeof r.headers.getSetCookie==='function'?r.headers.getSetCookie():(r.headers.get('set-cookie')||'').split(/,(?=[^ ])/);for(const x of h){const i=x.indexOf('='),s=x.indexOf(';');if(i>0)c[x.substring(0,i).trim()]=x.substring(i+1,s>0?s:undefined).trim();}return c;}
function fmtCk(c){return Object.entries(c).map(([k,v])=>k+'='+v).join('; ');}
async function ssoLogin(em,pw){
  const j=await(await fetch('https://accounts.athom.com/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em,password:pw})})).json();
  if(!j.token)throw new Error('Athom login failed');
  const r1=await fetch(FORUM+'/auth/oauth2_basic',{redirect:'manual'});
  const fc=exCk(r1);let loc=r1.headers.get('location');
  let r=await fetch(loc,{redirect:'manual'});loc=r.headers.get('location');
  r=await fetch(loc,{redirect:'manual',headers:{Authorization:'Bearer '+j.token}});loc=r.headers.get('location');
  if(!loc)throw new Error('SSO failed');
  r=await fetch(loc,{redirect:'manual',headers:{Cookie:fmtCk(fc)}});
  Object.assign(fc,exCk(r));
  if(!fc._t)throw new Error('No session');
  const cr=await fetch(FORUM+'/session/csrf',{headers:{'X-Requested-With':'XMLHttpRequest',Accept:'application/json',Cookie:fmtCk(fc)}});
  return{csrf:(await cr.json()).csrf,cookies:fc};
}
async function getForumAuth(){
  const ak=process.env.DISCOURSE_API_KEY;
  if(ak){console.log('Auth: API key');return{type:'apikey',key:ak};}
  const em=process.env.HOMEY_EMAIL,pw=process.env.HOMEY_PASSWORD;
  if(em&&pw){try{const a=await ssoLogin(em,pw);console.log('Auth: Athom SSO OK');return{type:'session',...a};}catch(e){console.warn('SSO login failed:',e.message);}}
  return null;
}
module.exports={getForumAuth,fmtCk,exCk,FORUM};
