import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeZip} from '../../scripts/zip.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),project=path.dirname(root);
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const stage=path.join(project,'.runtime/miniapp-release',stamp,'小宇与小宙小程序');fs.mkdirSync(stage,{recursive:true});
function copy(from,to){for(const entry of fs.readdirSync(from,{withFileTypes:true})){
  if(entry.name==='node_modules'||entry.name==='.git'||entry.name==='.npmrc'||entry.name.startsWith('.env')||/private|credential/i.test(entry.name)||/\.(key|pem|p12|pfx)$/i.test(entry.name))continue;
  const source=path.join(from,entry.name),destination=path.join(to,entry.name);
  if(entry.isSymbolicLink())continue;
  if(entry.isDirectory()){fs.mkdirSync(destination,{recursive:true});copy(source,destination);}else fs.copyFileSync(source,destination);
}}
copy(root,stage);
const zip=path.join(project,'小宇与小宙-微信小程序源码.zip');makeZip(path.dirname(stage),zip);
console.log(JSON.stringify({source:root,archive:zip,bytes:fs.statSync(zip).size,commonCredentialFilesExcluded:true,includesNodeModules:false},null,2));
