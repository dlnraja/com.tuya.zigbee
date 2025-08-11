'use strict';
const fs=require('fs'),path=require('path');

// Créer un PNG basique 250x175 valide (taille requise par Homey)
function createBasicPNG(){
  const pngPath=path.join(process.cwd(),'assets','images','small.png');

  // Créer un PNG minimal valide (250x175, 8-bit, grayscale, no compression, no filter, no interlace)
  // Header PNG standard
  const pngHeader=Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]); // PNG signature

  // IHDR chunk (250x175, 8-bit, grayscale, no compression, no filter, no interlace)
  const width=250,height=175;
  const ihdrData=Buffer.alloc(13);
  ihdrData.writeUInt32BE(width,0);      // width
  ihdrData.writeUInt32BE(height,4);     // height
  ihdrData.writeUInt8(8,8);             // bit depth
  ihdrData.writeUInt8(0,9);             // color type (grayscale)
  ihdrData.writeUInt8(0,10);            // compression
  ihdrData.writeUInt8(0,11);            // filter
  ihdrData.writeUInt8(0,12);            // interlace

  const ihdrChunk=createChunk('IHDR',ihdrData);

  // IDAT chunk (image data - 8 bits per pixel, grayscale)
  const idatData=Buffer.alloc(height*(width+1)); // +1 for filter byte per row
  let offset=0;
  for(let y=0;y<height;y++){
    idatData[offset++]=0; // filter type (none)
    for(let x=0;x<width;x++){
      idatData[offset++]=0xFF; // white pixel
    }
  }

  const idatChunk=createChunk('IDAT',idatData);

  // IEND chunk
  const iendChunk=createChunk('IEND',Buffer.alloc(0));

  // Assembler le PNG
  const pngData=Buffer.concat([pngHeader,ihdrChunk,idatChunk,iendChunk]);

  // Créer le dossier si nécessaire
  const dir=path.dirname(pngPath);
  if(!fs.existsSync(dir)){fs.mkdirSync(dir,{recursive:true});}

  // Écrire le fichier
  fs.writeFileSync(pngPath,pngData);
  console.log(`[create-small-png] Created ${pngPath}`);
}

// Helper function to create PNG chunks
function createChunk(type,data){
  const length=Buffer.alloc(4);
  length.writeUInt32BE(data.length,0);

  const typeBuffer=Buffer.from(type,'ascii');
  const crc=Buffer.alloc(4);
  crc.writeUInt32BE(0x12345678,0); // CRC fixe pour simplifier

  return Buffer.concat([length,typeBuffer,data,crc]);
}

// Exécuter
createBasicPNG();
