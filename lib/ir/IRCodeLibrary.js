'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

// IRCodeLibrary - Universal IR code database for ir_blaster driver
// Provides brand/device/function lookup with pre-loaded codes from IRDB
// Also includes hardcoded common codes for popular brands (NEC protocol)
const fs = require('fs');
const path = require('path');

const IRDB_PATH = path.join(__dirname, 'irdb-codes.json');
const INDEX_PATH = path.join(__dirname, 'irdb-index.json');

// ... (rest of builtin codes same) ...

// Hardcoded common NEC IR codes for popular brands (fallback when IRDB not fetched)
// Format: {protocol, address, command} -> can be converted to raw timing
const BUILTIN_CODES={
  'Samsung':{
    'TV':{
      'Power':{proto:'Samsung',addr:0x07,cmd:0x02},
      'Volume Up':{proto:'Samsung',addr:0x07,cmd:0x07},
      'Volume Down':{proto:'Samsung',addr:0x07,cmd:0x0B},
      'Mute':{proto:'Samsung',addr:0x07,cmd:0x0F},
      'Channel Up':{proto:'Samsung',addr:0x07,cmd:0x12},
      'Channel Down':{proto:'Samsung',addr:0x07,cmd:0x10},
      'Source':{proto:'Samsung',addr:0x07,cmd:0x01},
      'Menu':{proto:'Samsung',addr:0x07,cmd:0x1A},
      'OK/Enter':{proto:'Samsung',addr:0x07,cmd:0x68},
      'Up':{proto:'Samsung',addr:0x07,cmd:0x60},
      'Down':{proto:'Samsung',addr:0x07,cmd:0x61},
      'Left':{proto:'Samsung',addr:0x07,cmd:0x65},
      'Right':{proto:'Samsung',addr:0x07,cmd:0x62},
      'Back':{proto:'Samsung',addr:0x07,cmd:0x58},
      'Home':{proto:'Samsung',addr:0x07,cmd:0x79},
      '1':{proto:'Samsung',addr:0x07,cmd:0x04},'2':{proto:'Samsung',addr:0x07,cmd:0x05},
      '3':{proto:'Samsung',addr:0x07,cmd:0x06},'4':{proto:'Samsung',addr:0x07,cmd:0x08},
      '5':{proto:'Samsung',addr:0x07,cmd:0x09},'6':{proto:'Samsung',addr:0x07,cmd:0x0A},
      '7':{proto:'Samsung',addr:0x07,cmd:0x0C},'8':{proto:'Samsung',addr:0x07,cmd:0x0D},
      '9':{proto:'Samsung',addr:0x07,cmd:0x0E},'0':{proto:'Samsung',addr:0x07,cmd:0x11}
    }
  },
  'LG':{
    'TV':{
      'Power':{proto:'NEC',addr:0x04,cmd:0x08},
      'Volume Up':{proto:'NEC',addr:0x04,cmd:0x02},
      'Volume Down':{proto:'NEC',addr:0x04,cmd:0x03},
      'Mute':{proto:'NEC',addr:0x04,cmd:0x09},
      'Channel Up':{proto:'NEC',addr:0x04,cmd:0x00},
      'Channel Down':{proto:'NEC',addr:0x04,cmd:0x01},
      'Source':{proto:'NEC',addr:0x04,cmd:0x0B},
      'Menu':{proto:'NEC',addr:0x04,cmd:0xC4},
      'OK/Enter':{proto:'NEC',addr:0x04,cmd:0x44},
      'Up':{proto:'NEC',addr:0x04,cmd:0x40},
      'Down':{proto:'NEC',addr:0x04,cmd:0x41},
      'Left':{proto:'NEC',addr:0x04,cmd:0x07},
      'Right':{proto:'NEC',addr:0x04,cmd:0x06},
      'Back':{proto:'NEC',addr:0x04,cmd:0x28},
      'Home':{proto:'NEC',addr:0x04,cmd:0xC5}
    }
  },
  'Sony':{
    'TV':{
      'Power':{proto:'Sony',addr:0x01,cmd:0x15},
      'Volume Up':{proto:'Sony',addr:0x01,cmd:0x12},
      'Volume Down':{proto:'Sony',addr:0x01,cmd:0x13},
      'Mute':{proto:'Sony',addr:0x01,cmd:0x14},
      'Channel Up':{proto:'Sony',addr:0x01,cmd:0x10},
      'Channel Down':{proto:'Sony',addr:0x01,cmd:0x11},
      'Source':{proto:'Sony',addr:0x01,cmd:0x25},
      'Menu':{proto:'Sony',addr:0x01,cmd:0x60},
      'OK/Enter':{proto:'Sony',addr:0x01,cmd:0x65},
      'Up':{proto:'Sony',addr:0x01,cmd:0x74},
      'Down':{proto:'Sony',addr:0x01,cmd:0x75},
      'Left':{proto:'Sony',addr:0x01,cmd:0x34},
      'Right':{proto:'Sony',addr:0x01,cmd:0x33}
    }
  },
  'Panasonic':{
    'TV':{
      'Power':{proto:'NEC',addr:0x40,cmd:0x3D},
      'Volume Up':{proto:'NEC',addr:0x40,cmd:0x20},
      'Volume Down':{proto:'NEC',addr:0x40,cmd:0x21},
      'Mute':{proto:'NEC',addr:0x40,cmd:0x32},
      'Channel Up':{proto:'NEC',addr:0x40,cmd:0x34},
      'Channel Down':{proto:'NEC',addr:0x40,cmd:0x35},
      'Source':{proto:'NEC',addr:0x40,cmd:0xA4},
      'Menu':{proto:'NEC',addr:0x40,cmd:0x06},
      'OK/Enter':{proto:'NEC',addr:0x40,cmd:0x49},
      'Up':{proto:'NEC',addr:0x40,cmd:0x52},
      'Down':{proto:'NEC',addr:0x40,cmd:0x53},
      'Left':{proto:'NEC',addr:0x40,cmd:0x07},
      'Right':{proto:'NEC',addr:0x40,cmd:0x4A}
    }
  },
  'Daikin':{
    'AC':{
      'Power On':{proto:'Daikin',addr:0x00,cmd:0x01,note:'Use learned code'},
      'Power Off':{proto:'Daikin',addr:0x00,cmd:0x00,note:'Use learned code'},
      'Temp Up':{proto:'Daikin',addr:0x00,cmd:0x02,note:'Use learned code'},
      'Temp Down':{proto:'Daikin',addr:0x00,cmd:0x03,note:'Use learned code'},
      'Mode Cool':{proto:'Daikin',addr:0x00,cmd:0x04,note:'Stateful - use learned'},
      'Mode Heat':{proto:'Daikin',addr:0x00,cmd:0x05,note:'Stateful - use learned'},
      'Fan Speed':{proto:'Daikin',addr:0x00,cmd:0x06,note:'Stateful - use learned'}
    }
  },
  'Philips':{'TV':{'Power':{proto:'NEC',addr:0x04,cmd:0x0C},'Volume Up':{proto:'NEC',addr:0x04,cmd:0x10},'Volume Down':{proto:'NEC',addr:0x04,cmd:0x11},'Mute':{proto:'NEC',addr:0x04,cmd:0x0D}}},
  'Toshiba':{'TV':{'Power':{proto:'NEC',addr:0x40,cmd:0x12},'Volume Up':{proto:'NEC',addr:0x40,cmd:0x1A},'Volume Down':{proto:'NEC',addr:0x40,cmd:0x1E},'Mute':{proto:'NEC',addr:0x40,cmd:0x10}}},
  'Hisense':{'TV':{'Power':{proto:'NEC',addr:0x00,cmd:0x08},'Volume Up':{proto:'NEC',addr:0x00,cmd:0x02},'Volume Down':{proto:'NEC',addr:0x00,cmd:0x03},'Mute':{proto:'NEC',addr:0x00,cmd:0x09}}},
  'TCL':{'TV':{'Power':{proto:'NEC',addr:0x40,cmd:0x08},'Volume Up':{proto:'NEC',addr:0x40,cmd:0x02},'Volume Down':{proto:'NEC',addr:0x40,cmd:0x03},'Mute':{proto:'NEC',addr:0x40,cmd:0x09}}},
  'Vizio':{'TV':{'Power':{proto:'NEC',addr:0x04,cmd:0x08},'Volume Up':{proto:'NEC',addr:0x04,cmd:0x02},'Volume Down':{proto:'NEC',addr:0x04,cmd:0x03},'Mute':{proto:'NEC',addr:0x04,cmd:0x09}}},
  'Sharp':{'TV':{'Power':{proto:'NEC',addr:0x55,cmd:0x08},'Volume Up':{proto:'NEC',addr:0x55,cmd:0x02},'Volume Down':{proto:'NEC',addr:0x55,cmd:0x03},'Mute':{proto:'NEC',addr:0x55,cmd:0x09}}},
  'Denon':{'Audio':{'Power':{proto:'NEC',addr:0x02,cmd:0x1C},'Volume Up':{proto:'NEC',addr:0x02,cmd:0x1A},'Volume Down':{proto:'NEC',addr:0x02,cmd:0x1B},'Mute':{proto:'NEC',addr:0x02,cmd:0x1D}}},
  'Yamaha':{'Audio':{'Power':{proto:'NEC',addr:0x7A,cmd:0x1E},'Volume Up':{proto:'NEC',addr:0x7A,cmd:0x1A},'Volume Down':{proto:'NEC',addr:0x7A,cmd:0x1B},'Mute':{proto:'NEC',addr:0x7A,cmd:0x1C}}}
};

// NEC protocol timing (microseconds)
const NEC_HDR_MARK=9000,NEC_HDR_SPACE=4500,NEC_BIT_MARK=560;
const NEC_ONE_SPACE=1690,NEC_ZERO_SPACE=560;

function necEncode(addr,cmd){
  // Generate NEC raw timing array
  const bits=[];
  // Address + inverse
  for(let i=0;i<8;i++)bits.push((addr>>i)&1);
  for(let i=0;i<8;i++)bits.push(((~addr)>>i)&1);
  // Command + inverse
  for(let i=0;i<8;i++)bits.push((cmd>>i)&1);
  for(let i=0;i<8;i++)bits.push(((~cmd)>>i)&1);

  const raw=[NEC_HDR_MARK,NEC_HDR_SPACE];
  for(const b of bits){
    raw.push(NEC_BIT_MARK);
    raw.push(b?NEC_ONE_SPACE:NEC_ZERO_SPACE);
  }
  raw.push(NEC_BIT_MARK);
  return raw;
}

function samsungEncode(addr,cmd){
  const bits=[];
  for(let i=0;i<8;i++)bits.push((addr>>i)&1);
  for(let i=0;i<8;i++)bits.push((addr>>i)&1);
  for(let i=0;i<8;i++)bits.push((cmd>>i)&1);
  for(let i=0;i<8;i++)bits.push(((~cmd)>>i)&1);
  const raw=[4500,4500];
  for(const b of bits){raw.push(560);raw.push(b?1690:560);}
  raw.push(560);
  return raw;
}

function sonyEncode(addr,cmd){
  const raw=[2400,600];
  for(let i=0;i<7;i++){raw.push((cmd>>i)&1?1200:600);raw.push(600);}
  for(let i=0;i<5;i++){raw.push((addr>>i)&1?1200:600);raw.push(600);}
  return raw;
}

function rawToBase64(raw){
  // Convert raw timing to Zosung-compatible base64 IR code
  // Zosung format: frequency(2B) + length(2B) + pairs of mark/space (2B each, big-endian, in 10us units)
  const freq=38000;
  const pairs=[];
  for (let i = 0; i < raw.length; i += 2) {
    const mark = Math.round(safeDivide((raw[i] || 0, 10)));
    const space = Math.round((raw[i  + 1] || 0, 10));
    pairs.push(mark, space);
  }
  const buf = Buffer.alloc(4 + safeMultiply(pairs.length, 2));
  buf.writeUInt16BE(Math.round(freq, 0);
  buf.writeUInt16BE(pairs.length, 2);
  for (let i = 0; i < pairs.length; i++) buf.writeUInt16BE(pairs[i] & 0xFFFF, 4 + safeMultiply(i, 2));
  return buf.toString('base64');
}

class IRCodeLibrary{
  constructor(){
    this._irdb=null;
    this._index=null;
    this._loaded=false;
  }

  // Load IRDB from disk (if fetched)
  load(){
    if(this._loaded)return;
    try{
      if(fs.existsSync(IRDB_PATH)){
        this._irdb=JSON.parse(fs.readFileSync(IRDB_PATH,'utf8'));
        this._index=JSON.parse(fs.readFileSync(INDEX_PATH,'utf8'));
        console.log('[IR-LIB] Loaded IRDB: '+this._index.brands.length+' brands');
      }
    }catch(e){console.log('[IR-LIB] IRDB not available, using builtin codes');}
    this._loaded=true;
  }

  // Get all available brands
  getBrands(category){
    this.load();
    const brands=new Set(Object.keys(BUILTIN_CODES));
    if(this._index){
      const list=category?this._index.byCategory[category]:this._index.brands;
      if(list)list.forEach(b=>brands.add(b));
    }
    return[...brands].sort();
  }

  // Get categories for a brand
  getCategories(brand){
    this.load();
    const cats=new Set();
    if(BUILTIN_CODES[brand])Object.keys(BUILTIN_CODES[brand]).forEach(c=>cats.add(c));
    if(this._irdb?.brands?.[brand])Object.keys(this._irdb.brands[brand].categories).forEach(c=>cats.add(c));
    return[...cats];
  }

  // Get available functions for brand+category
  getFunctions(brand,category){
    this.load();
    const fns=new Set();
    // Builtin
    const builtin = BUILTIN_CODES[brand]?.[category];if(builtin)Object.keys(builtin).forEach(f=>fns.add(f));
    // IRDB
    const irdb=this._irdb?.brands?.[brand]?.categories?.[category];
    if(irdb){for(const remote of irdb){for(const c of remote.codes)fns.add(c.fn);}}
    return[...fns].sort();
  }

  // Get IR code for brand+category+function (returns base64 for Zosung)
  getCode(brand,category,fn){
    this.load();
    // Check builtin first
    const builtin=BUILTIN_CODES[brand]?.[category]?.[fn];
    if(builtin){
      let raw=null;
      if(builtin.proto==='NEC')raw=necEncode(builtin.addr,builtin.cmd);
      else if(builtin.proto==='Samsung')raw=samsungEncode(builtin.addr,builtin.cmd);
      else if(builtin.proto==='Sony')raw=sonyEncode(builtin.addr,builtin.cmd);
      if(raw)return{source:'builtin',protocol:builtin.proto,code:rawToBase64(raw),raw};
      if(builtin.note)return{source:'builtin',protocol:builtin.proto,code,note:builtin.note};
    }
    // Check IRDB
    const irdb=this._irdb?.brands?.[brand]?.categories?.[category];
    if(irdb){
      for(const remote of irdb){
        const c=remote.codes.find(c=>c.fn===fn);
        if(c){
          const raw=irdbEncode(c.protocol,c.device,c.function);
          if(raw)return{source:'irdb:'+remote.file,protocol:c.protocol,code:rawToBase64(raw),raw};
          return{source:'irdb:'+remote.file,protocol:c.protocol,device:c.device,subdevice:c.subdevice,function:c.function,code:null};
        }
      }
    }
    return null;
  }

  // Get all supported categories
  getAllCategories(){return Object.keys(CATEGORIES);}
}

const CATEGORIES={TV:'TV',AC:'AC/Climate',Fan:'Fan',Audio:'Audio/HiFi',STB:'Set-Top Box',DVD:'DVD/Blu-ray',Projector:'Projector',Light:'Light',Soundbar:'Soundbar'};

// Protocol-aware encode helper for IRDB entries
function irdbEncode(protocol,device,fn){
  const a=parseInt(device)||0,c=parseInt(fn)||0;
  if(protocol==='NEC'||protocol==='NECx2')return necEncode(a,c);
  if(protocol==='Samsung')return samsungEncode(a,c);
  if(protocol==='Sony')return sonyEncode(a,c);
  return null;
}

module.exports=new IRCodeLibrary();


