import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ROOT,initStore,atomicWrite,hash} from './store.mjs';
import {makeZip,walkFiles} from './zip.mjs';
export function backup(root=ROOT){
  initStore(root);
  const name=`backup-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID().slice(0,8)}`;
  const directory=path.join(root,'backups',name);fs.mkdirSync(directory,{recursive:true});
  for(const sub of ['vault','media','manifests','drafts'])fs.cpSync(path.join(root,sub),path.join(directory,sub),{recursive:true,filter:source=>!fs.lstatSync(source).isSymbolicLink()});
  atomicWrite(path.join(directory,'checksums.sha256'),walkFiles(directory).map(file=>`${hash(fs.readFileSync(path.join(directory,file)))}  ${file}`).join('\n')+'\n');
  const zipPath=path.join(root,'backups',name+'.zip');makeZip(directory,zipPath);
  return {name:name+'.zip',directory,zipPath};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(backup(),null,2));
