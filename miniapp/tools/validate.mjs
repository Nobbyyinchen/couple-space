import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const walk=folder=>fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.name==='node_modules'?[]:e.isDirectory()?walk(path.join(folder,e.name)):[path.join(folder,e.name)]);
const files=walk(root),errors=[];let js=0,json=0,wxml=0;
for(const file of files){
  const source=fs.readFileSync(file,'utf8');
  try{if(file.endsWith('.json')){JSON.parse(source);json++;}if(file.endsWith('.js')||file.endsWith('.cjs')){new vm.Script(source,{filename:file});js++;}}
  catch(error){errors.push(path.relative(root,file)+': '+error.message);}
  if(file.endsWith('.wxml')){
    for(const match of source.matchAll(/wx:(if|elif|for)="([^"]*)"/g)){
      if(!/^\{\{[\s\S]*\}\}$/.test(match[2].trim()))errors.push(path.relative(root,file)+': wx:'+match[1]+' 必须使用 {{表达式}}，否则会被当成固定字符串');
    }
    wxml++;for(const match of source.matchAll(/{{([\s\S]*?)}}/g))if(/\.[a-zA-Z_$]\w*\s*\(/.test(match[1]))errors.push(path.relative(root,file)+': WXML 不支持直接调用 JS 方法');
    for(const m of source.matchAll(/(?:bind|catch)(?:tap|input|change|confirm)="([a-zA-Z]\w*)"/g)){
      const page=fs.readFileSync(file.replace(/\.wxml$/,'.js'),'utf8');
      const declared=new RegExp('(?:async\\s+)?'+m[1]+'\\s*\\(');
      if(!declared.test(page))errors.push(path.relative(root,file)+': 找不到事件方法 '+m[1]);
    }
    for(const m of source.matchAll(/src="(\/assets\/[^"{}]+)"/g))if(!fs.existsSync(path.join(root,'miniprogram',m[1])))errors.push('缺少资源 '+m[1]);
  }
}
const app=JSON.parse(fs.readFileSync(path.join(root,'miniprogram/app.json'),'utf8'));
for(const page of app.pages)for(const extension of ['.js','.json','.wxml','.wxss'])if(!fs.existsSync(path.join(root,'miniprogram',page+extension)))errors.push('页面文件缺失：'+page+extension);
for(const tab of app.tabBar.list)for(const key of ['iconPath','selectedIconPath']){
  const image=path.join(root,'miniprogram',tab[key]);if(!fs.existsSync(image))errors.push('缺少 Tab 图标 '+tab[key]);else if(fs.readFileSync(image).readUInt32BE(0)!==0x89504e47)errors.push('Tab 图标不是 PNG');
}
const ps=String.raw`$ErrorActionPreference='Stop'; Get-ChildItem -LiteralPath '${root.replaceAll("'","''")}\miniprogram\pages' -Recurse -Filter '*.wxml' | ForEach-Object { $source=Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8; $source=[regex]::Replace($source,'wx:else(?=[\s>])','wx:else=""'); $source=[regex]::Replace($source,'{{[\s\S]*?}}','BINDING'); $document=New-Object System.Xml.XmlDocument; $document.XmlResolver=$null; $document.LoadXml('<root xmlns:wx="urn:wechat">'+$source+'</root>') }; Write-Output 'WXML tag structure is well-formed; expression syntax is checked by the native compiler.'`;
if(process.platform==='win32'){
  const result=spawnSync('powershell.exe',['-NoProfile','-Command',ps],{encoding:'utf8',windowsHide:true});if(result.status!==0)errors.push(result.stderr);else console.log(result.stdout.trim());
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Checked ${js} JavaScript files, ${json} JSON files, ${wxml} WXML pages, routes, handlers, and assets. No native compiler or cloud deployment was run.`);
