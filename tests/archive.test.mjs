import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,initStore,loadState,publicState,saveMemory,saveProfile,clearExamples,parseMemory,serializeMemory,validDate,searchMemories,hash,renderMarkdown} from '../scripts/store.mjs';
import {exportBundle} from '../scripts/export.mjs';
import {createServer,detectMedia,answerQuestion} from '../scripts/server.mjs';
const directories=[];
const testBase=path.join(ROOT,'.runtime/tests');fs.mkdirSync(testBase,{recursive:true});
const fixture=()=>{const root=fs.mkdtempSync(path.join(testBase,'our-universe-test-'));directories.push(root);initStore(root);return root;};
test.after(()=>{for(const dir of directories)fs.rmSync(dir,{recursive:true,force:true});});
const memory=(changes={})=>({title:'青岛旅行',date:'2026-04-06',body:'第一次旅行去了青岛，看到了海。',tags:['旅行'],visibility:'shared',publish_online:true,include_in_archive:true,ai_readable:true,status:'confirmed',media_ids:[],...changes});
test('日期严格校验闰日和无效月份',()=>{assert.equal(validDate('2024-02-29'),true);assert.equal(validDate('2025-02-29'),false);assert.equal(validDate('2026-13-01'),false);});
test('Markdown 元数据往返保留中文、换行、特殊符号',()=>{const m={...memory({title:'你说："你好" <3'}),id:'test-1',revision:1};assert.deepEqual(parseMemory(serializeMemory(m)),m);assert.throws(()=>parseMemory('---\n__proto__: {}\n---\nx'));});
test('私有和草稿不进入展示或归档，媒体也独立检查权限',()=>{
  const root=fixture(),state=loadState(root),id=state.media[0].id;
  state.memories=[{...memory(),id:'ok',media_ids:[id]},{...memory({visibility:'private'}),id:'private'},{...memory({status:'draft'}),id:'draft'}];
  state.media[0].include_in_archive=false;
  assert.equal(publicState(state).memories.length,1);assert.equal(publicState(state).media.length,1);
  assert.equal(publicState(state,'offline').media.length,0);assert.deepEqual(publicState(state,'offline').memories[0].media_ids,[]);
});
test('过期版本更新被拒绝，不覆盖已经保存的内容',()=>{
  const root=fixture(),m=saveMemory(memory(),root);
  saveMemory({...m,title:'更新后的旅行'},root);
  assert.throws(()=>saveMemory({...m,title:'过期覆盖'},root),/已经更新/);
  assert.equal(loadState(root).memories.find(x=>x.id===m.id).title,'更新后的旅行');
  assert.throws(()=>saveProfile({...loadState(root).profile,revision:0},root),/已经更新/);
});
test('AI 搜索每次从授权文件读取，排除示例、草稿和私有内容',()=>{
  const root=fixture();clearExamples(root);
  const m=saveMemory(memory(),root);saveMemory(memory({title:'私密青岛',body:'PRIVATE-SECRET',visibility:'private'}),root);
  assert.equal(searchMemories('青岛',loadState(root)).length,1);
  saveMemory({...m,ai_readable:false},root);assert.equal(searchMemories('青岛',loadState(root)).length,0);
});
test('收起示例保留真实记录及其仍引用的素材',()=>{
  const root=fixture(),id=loadState(root).media[0].id;saveMemory(memory({media_ids:[id]}),root);clearExamples(root);
  assert.equal(loadState(root).memories.length,1);assert.equal(loadState(root).media.length,1);
  assert.ok(fs.readdirSync(path.join(root,'backups/history')).length>=3);
});
test('离线导出只含授权内容，脚本安全嵌入，校验值与素材正确',()=>{
  const root=fixture();clearExamples(root);
  saveMemory(memory({title:'测试 $1 $& </script>',body:'正文 <script>alert(1)</script> & 保留'}),root);
  saveMemory(memory({title:'SECRET-PRIVATE',visibility:'private'}),root);
  saveMemory(memory({title:'SECRET-EXCLUDED',include_in_archive:false}),root);
  const result=exportBundle('offline',root),html=fs.readFileSync(path.join(result.directory,'index.html'),'utf8');
  assert.equal(result.memories,1);assert.ok(!html.includes('SECRET-PRIVATE'));assert.ok(!html.includes('SECRET-EXCLUDED'));
  const payload=JSON.parse(html.match(/<script id="universe-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(payload.memories[0].title,'测试 $1 $& </script>');assert.ok(!html.includes('src="/'));assert.ok(!html.includes('href="/'));assert.ok(!html.includes('id="studio-dialog"'));
  for(const line of fs.readFileSync(path.join(result.directory,'checksums.sha256'),'utf8').trim().split('\n')){const digest=line.slice(0,64),file=line.slice(66);assert.equal(hash(fs.readFileSync(path.join(result.directory,file))),digest,file);}
  const bytes=fs.readFileSync(result.zipPath);assert.equal(bytes.readUInt32LE(0),0x04034b50);assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);
});
test('Markdown 展示转义原始 HTML',()=>{assert.ok(!renderMarkdown('<script>bad()</script>').includes('<script>'));});
test('上传检查拒绝伪装为图片的 HTML 和 SVG',()=>{assert.throws(()=>detectMedia(Buffer.from('<html>not an image</html>'),'.jpg'));assert.throws(()=>detectMedia(Buffer.from('<svg/>'),'.svg'));assert.equal(detectMedia(Buffer.from([255,216,255,224]),'.jpg'),'image');});
test('本地 API 防跨站写入、路径越权、私有媒体直链和失效版本',async()=>{
  const root=fixture(),server=createServer({root,port:0});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  try{
    let response=await fetch(url+'/api/profile',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(response.status,403);
    response=await fetch(url+'/api/session',{headers:{origin:'https://untrusted.example'}});assert.equal(response.status,403);
    const {token}=await(await fetch(url+'/api/session')).json();
    response=await fetch(url+'/vault/profile/settings.json');assert.equal(response.status,404);
    response=await fetch(url+'/api/profile',{method:'POST',headers:{'content-type':'application/json','x-universe-token':token},body:JSON.stringify({...loadState(root).profile,revision:0})});assert.equal(response.status,409);
    response=await fetch(url+'/api/memory',{method:'POST',headers:{'content-type':'application/json','x-universe-token':token},body:JSON.stringify(memory({body:'真实 API 写入验证'}))});assert.equal(response.status,201);
    const written=await response.json();assert.ok(fs.existsSync(path.join(root,'vault/memories',written.id+'.md')));
    saveMemory({...written,title:'REVOKE-THIS-RECORD'},root);
    assert.ok((await(await fetch(url+'/')).text()).includes('REVOKE-THIS-RECORD'));
    const latest=loadState(root).memories.find(m=>m.id===written.id);
    saveMemory({...latest,visibility:'private'},root);
    assert.ok(!(await(await fetch(url+'/')).text()).includes('REVOKE-THIS-RECORD'));
    const media=loadState(root).media;media[0].visibility='private';fs.writeFileSync(path.join(root,'manifests/media.json'),JSON.stringify(media));
    response=await fetch(url+'/media/'+media[0].filename);assert.equal(response.status,403);
    response=await fetch(url+'/media/'+media[1].filename,{headers:{range:'bytes=0-9'}});assert.equal(response.status,206);assert.equal((await response.arrayBuffer()).byteLength,10);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('没有真实授权回忆时，AI 不把示例编造成双方经历',async()=>{const answer=await answerQuestion('第一次旅行是哪天',fixture());assert.deepEqual(answer.sources,[]);assert.match(answer.answer,/没有找到/);});
