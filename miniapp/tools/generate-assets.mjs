import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..');
const require=createRequire(import.meta.url);
let sharp;try{sharp=require('sharp');}catch{sharp=require(path.resolve(root,'../site/node_modules/sharp'));}
const output=path.join(root,'miniprogram/assets');fs.mkdirSync(output,{recursive:true});
const icons={home:'<path d="M12 30 32 12l20 18v23H38V38H26v15H12Z"/>',memories:'<rect x="13" y="11" width="38" height="43" rx="7"/><path d="M21 24h22M21 33h16M21 42h20"/>',wishes:'<path d="m32 10 7 15 17 3-12 12 3 17-15-8-15 8 3-17L8 28l17-3Z"/>',us:'<circle cx="24" cy="23" r="10"/><circle cx="44" cy="27" r="8"/><path d="M8 55v-5c0-19 32-19 32 0v5M41 38c11-1 16 6 15 17"/>'};
for(const [name,body] of Object.entries(icons))for(const active of [false,true]){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="${active?'#F3E7E6':'none'}" stroke="${active?'#8E5265':'#766962'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
 await sharp(Buffer.from(svg)).png().toFile(path.join(output,`${name}${active?'-active':''}.png`));
}
const sea='<svg xmlns="http://www.w3.org/2000/svg" width="960" height="700"><rect width="960" height="700" fill="#DEEAF7"/><circle cx="665" cy="220" r="87" fill="#E8C7AC"/><path d="M0 350Q220 310 460 365T960 340V700H0Z" fill="#96B7D4"/><path d="M0 470Q220 420 480 490T960 460M0 570Q250 515 540 580T960 560" fill="none" stroke="#C8DCEB" stroke-width="8"/><path d="M0 660Q360 555 960 690V700H0Z" fill="#DED7C8"/><path d="M170 200q30-30 60 0q30-30 60 0" fill="none" stroke="#A0B3C6" stroke-width="5"/></svg>';
await sharp(Buffer.from(sea)).png().toFile(path.join(output,'sample-sea.png'));
const heart='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><circle cx="200" cy="200" r="155" fill="#E8F1FF"/><circle cx="235" cy="170" r="115" fill="#DCE9FF"/><path d="M200 280Q73 194 118 139q47-45 82 18q36-63 82-18q45 55-82 141" fill="#90B6F4"/><path d="m75 80 7 17 18 6-18 7-7 18-6-18-18-7 18-6Z" fill="#C0D4F5"/><path d="m320 260 7 17 18 6-18 7-7 18-6-18-18-7 18-6Z" fill="#B3CCF2"/><circle cx="310" cy="95" r="7" fill="#D2DEEF"/></svg>';
await sharp(Buffer.from(heart)).png().toFile(path.join(output,'sample-heart.png'));
const actions={
 pen:'<path d="m17 43-3 9 10-3 27-27-7-7Z M37 22l7 7M14 58h39"/>',
 wish:icons.wishes,
 calendar:'<rect x="10" y="15" width="44" height="40" rx="4"/><path d="M10 28h44M22 10v11M42 10v11M21 38h3M32 38h3M21 46h3"/>',
 memories:icons.memories,
 search:'<circle cx="27" cy="27" r="15"/><path d="m39 39 15 15"/>',
 heart:'<path d="M32 53 13 35C-2 19 20 4 32 21 44 4 66 19 51 35Z"/>',
 settings:'<path d="M11 17h42M11 32h42M11 47h42"/><circle cx="23" cy="17" r="5" fill="#FFFDF9"/><circle cx="42" cy="32" r="5" fill="#FFFDF9"/><circle cx="27" cy="47" r="5" fill="#FFFDF9"/>',
 info:'<circle cx="32" cy="32" r="22"/><path d="M32 29v17M32 19v1"/>',
 refresh:'<path d="M51 24a21 21 0 1 0 1 15M51 10v15H37"/>',
 swap:'<path d="M11 22h40L40 11M53 42H13l11 11"/>',
 cloud:'<path d="M17 48h31a11 11 0 0 0 0-22 17 17 0 0 0-32-4 13 13 0 0 0 1 26Z"/>'
};
for(const [name,body] of Object.entries(actions)){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="none" stroke="#8E5265" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
 await sharp(Buffer.from(svg)).png().toFile(path.join(output,`icon-${name}.png`));
}
await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M32 53 13 35C-2 19 20 4 32 21 44 4 66 19 51 35Z" fill="#8E5265" stroke="#8E5265" stroke-width="2.5"/></svg>')).png().toFile(path.join(output,'icon-heart-active.png'));
const bloom='<svg xmlns="http://www.w3.org/2000/svg" width="300" height="360" viewBox="0 0 300 360"><rect x="20" y="12" width="260" height="334" rx="2" fill="#F5EEE2" stroke="#D7C6B5" stroke-width="2"/><rect x="32" y="24" width="236" height="310" fill="none" stroke="#DDCDBE" stroke-dasharray="3 6"/><path d="M150 291q-24-91 4-166M153 233q-52-6-58-51 51 12 58 51M149 206q48-4 57-48-43 5-57 48" fill="#A9B9A4" stroke="#7D8D72" stroke-width="2.5"/><path d="M154 140c-29-5-45-33-28-51 9-9 23 0 28 16 4-36 30-46 40-28 8 14-7 29-24 34 32-8 47 11 33 26-13 14-34 5-40-6 9 28-10 43-26 32-11-8-3-21 17-23" fill="#D9A0AA" stroke="#B77C89" stroke-width="2"/><circle cx="158" cy="120" r="8" fill="#8E5265"/><path d="m129 286 39-4 4 16-41 7Z" fill="#DDCBB2" opacity=".8"/></svg>';
await sharp(Buffer.from(bloom)).png().toFile(path.join(output,'paper-bloom.png'));
console.log('Generated native PNG tab icons, action icons, demo images and a paper botanical stamp.');
