#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const DDIR=path.join(ROOT,'drivers');
const OUT=path.join(ROOT,'.github','pages-build');
const collectDrivers=require('./device-finder-collect');
const generateHTML=require('./device-finder-html');

const app=JSON.parse(fs.readFileSync(path.join(ROOT,'app.json'),'utf8'));
const drivers=collectDrivers(DDIR);
const totalFPs=drivers.reduce((s,d)=>s+d.fpCount,0);
console.log(drivers.length+' drivers, '+totalFPs+' fingerprints');

fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(path.join(OUT,'devices.json'),JSON.stringify(drivers,null,2));
fs.writeFileSync(path.join(OUT,'index.html'),generateHTML(drivers,app));
console.log('Device Finder generated: '+OUT);
