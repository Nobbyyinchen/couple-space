const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
function entry({appid='wx-ours',expectedAppId='wx-ours',execute=async()=>({})}={}){
  const source=fs.readFileSync(path.join(__dirname,'../cloudfunctions/coupleApi/index.js'),'utf8'),exports={};
  const sdk={DYNAMIC_CURRENT_ENV:'dynamic',init(){},database(){return {};},getWXContext(){return {APPID:appid,OPENID:'real-platform-openid'};},getTempFileURL:async()=>({fileList:[]})};
  const requireStub=name=>name==='wx-server-sdk'?sdk:name==='./repository'?{createRepository:()=>({})}:name==='./domain'?{createService:()=>({execute})}:null;
  vm.runInNewContext(source,{require:requireStub,exports,process:{env:{EXPECTED_APP_ID:expectedAppId}},console:{error(){}}});return exports.main;
}
test('云函数仅采用微信平台身份，忽略前端伪造 OPENID',async()=>{let received;const main=entry({execute:async(action,payload,openid)=>{received={action,openid};return {ok:true};}});const result=await main({action:'getState',OPENID:'forged',payload:{openid:'forged'}});assert.equal(result.ok,true);assert.equal(received.openid,'real-platform-openid');});
test('云函数拒绝来自其他 AppID 的调用',async()=>{let called=false;const main=entry({appid:'wx-other',execute:async()=>{called=true;}});const result=await main({action:'getState'});assert.equal(result.ok,false);assert.equal(result.error.code,'AUTH');assert.equal(called,false);});
test('SDK 意外错误不向客户端泄露内部请求细节',async()=>{const main=entry({execute:async()=>{throw Object.assign(Error('internal address and request detail'),{code:'ECONNRESET'});}});const result=await main({action:'getState'});assert.equal(result.error.code,'INTERNAL');assert.equal(result.error.message.includes('internal address'),false);});

test('耗时信息只含数值阶段，不包含日记或微信身份',async()=>{
  const main=entry({execute:async(_action,_payload,_openid,measure)=>measure('transaction',async()=>({saved:true}))});
  const a=await main({action:'saveEntry',payload:{body:'不应出现在计时中的正文'}}),b=await main({action:'getState'});
  assert.equal(a.timing.firstInvocation,true);assert.equal(b.timing.firstInvocation,false);assert.ok(Number.isFinite(a.timing.serverMs));assert.ok(Number.isFinite(a.timing.stages.transaction));
  assert.equal(JSON.stringify(a.timing).includes('正文'),false);assert.equal(JSON.stringify(a.timing).includes('real-platform-openid'),false);
});
