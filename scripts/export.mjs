import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {ROOT,loadState,publicState,serializeMemory,renderMarkdown,escapeHtml,hash,atomicWrite,embedState} from './store.mjs';
import {walkFiles,makeZip} from './zip.mjs';

export function exportBundle(purpose='offline',root=ROOT){
  if(!['online','offline'].includes(purpose))throw Error('无效的导出类型');
  const id=`${purpose}-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID().slice(0,8)}`;
  const destination=path.join(root,'export',id),state=publicState(loadState(root),purpose);
  fs.mkdirSync(destination,{recursive:true});
  let html=fs.readFileSync(path.join(ROOT,'site/dist/index.html'),'utf8');
  html=embedState(html,state);
  html=html.replace(/<dialog id="studio-dialog"[\s\S]*?<\/dialog>/,'');
  html=html.replace(/(href|src)="\/(?!\/)/g,'$1="./');
  atomicWrite(path.join(destination,'index.html'),html);
  for(const asset of ['universe.css','universe.js','favicon.svg'])fs.copyFileSync(path.join(ROOT,'site/public',asset),path.join(destination,asset));
  fs.mkdirSync(path.join(destination,'media'),{recursive:true});
  for(const m of state.media){
    const filename=decodeURIComponent(m.url.slice(6));
    if(path.basename(filename)!==filename)throw Error('素材路径无效');
    fs.copyFileSync(path.join(root,'media/originals',filename),path.join(destination,'media',filename));
  }
  atomicWrite(path.join(destination,'archive/profile.json'),JSON.stringify(state.profile,null,2));
  for(const m of state.memories){
    atomicWrite(path.join(destination,'archive/memories',`${m.id}.md`),serializeMemory(m));
    const story=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(m.title)}</title><link rel="stylesheet" href="../universe.css"><body><main class="wrap chapter" style="max-width:760px"><a href="../index.html">← 回到我们的宇宙</a><p class="eyebrow" style="margin-top:40px">${m.date}</p><h1 style="margin:20px 0">${escapeHtml(m.title)}</h1><article class="prose">${renderMarkdown(m.body)}</article>${m.media_ids.map(id=>state.media.find(a=>a.id===id)).filter(Boolean).map(a=>a.type==='image'?`<img src="../${escapeHtml(a.url)}" alt="${escapeHtml(a.caption)}" style="margin-top:20px">`:a.type==='video'?`<video controls src="../${escapeHtml(a.url)}" style="width:100%"></video>`:`<audio controls src="../${escapeHtml(a.url)}"></audio>`).join('')}</main></body></html>`;
    atomicWrite(path.join(destination,'stories',`${m.id}.html`),story);
  }
  const index=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>故事目录</title><link rel="stylesheet" href="./universe.css"><body><main class="wrap chapter"><a href="./index.html">← 返回首页</a><h1 style="margin:30px 0">我们的故事目录</h1>${state.memories.map(m=>`<p style="margin:15px 0"><a href="stories/${escapeHtml(m.id)}.html">${m.date} · ${escapeHtml(m.title)}</a></p>`).join('')}</main></body></html>`;
  atomicWrite(path.join(destination,'故事目录.html'),index);
  atomicWrite(path.join(destination,'请先读我.txt'),'我们的宇宙 · 离线回忆馆\r\n\r\n请先完整解压，再双击 index.html。无需安装 Node.js、Python 或 AI 模型。\r\n照片、手记、信件和小游戏可以离线使用；AI 生成需要回到原电脑。\r\n若浏览器禁用了脚本，可打开“故事目录.html”直接阅读。\r\narchive 文件夹保存 Markdown 与 JSON 数据。\r\n此目录包含获准交付的原始媒体，可能保留拍摄元数据；请按双方同意的范围保存。\r\n请至少保存两份独立副本，并定期检查校验值。\r\n');
  fs.mkdirSync(path.join(destination,'licenses'),{recursive:true});fs.copyFileSync(path.join(ROOT,'site/LICENSE'),path.join(destination,'licenses/Love-Page-AGPL-3.0.txt'));
  atomicWrite(path.join(destination,'licenses/NOTICE.txt'),'Based on funnyzak/love-page, commit c966d2cc80d9e091995e7b114e46ed8f0de86233.\nModified as Our Universe local edition. License: AGPL-3.0.\nCorresponding application source accompanies this archive in source/.\nSample SVG illustrations are generated for this project.\n');
  // Include application source; explicitly exclude vault, runtime, credentials and user files.
  for(const base of ['scripts','examples','site/src']){
    for(const file of walkFiles(path.join(ROOT,base))){const target=path.join(destination,'source',base,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(ROOT,base,file),target);}
  }
  for(const file of ['package.json','site/package.json','site/package-lock.json','site/astro.config.mjs','site/tsconfig.json','site/public/universe.css','site/public/universe.js','site/public/favicon.svg']){
    const target=path.join(destination,'source',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(ROOT,file),target);
  }
  atomicWrite(path.join(destination,'manifest.json'),JSON.stringify({version:'0.1.0',purpose,createdAt:new Date().toISOString(),memories:state.memories.length,media:state.media.length,files:walkFiles(destination)},null,2));
  atomicWrite(path.join(destination,'checksums.sha256'),walkFiles(destination).map(file=>`${hash(fs.readFileSync(path.join(destination,file)))}  ${file}`).join('\n')+'\n');
  const zipPath=path.join(root,'export',`${id}.zip`);makeZip(destination,zipPath);
  return {id,name:`我们的回忆-${new Date().toISOString().slice(0,10)}.zip`,zipPath,directory:destination,url:`/download/${id}.zip`,memories:state.memories.length,media:state.media.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(exportBundle(process.argv.includes('--online')?'online':'offline'),null,2));
