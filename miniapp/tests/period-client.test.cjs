const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const storage=new Map(),events=[];
global.wx={getStorageSync:key=>structuredClone(storage.get(key)||''),setStorageSync:(key,value)=>storage.set(key,structuredClone(value)),removeStorageSync:key=>storage.delete(key),navigateTo:value=>events.push(value),showToast(){},showTabBarRedDot(){},hideTabBarRedDot(){},showModal:o=>o.success({confirm:true})};
const config=require('../miniprogram/config'),api=require('../miniprogram/services/api');
function page(){let def;const file=path.resolve(__dirname,'../miniprogram/pages/period/index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:createRequire(file),Page:d=>def=d,wx:global.wx});return {...def,data:structuredClone(def.data),setData(v){Object.assign(this.data,structuredClone(v));}};}
test.beforeEach(()=>{storage.clear();events.length=0;config.demoMode=true;config.cloudEnv='';});
test.after(()=>{delete global.wx;});
test('演示可完整记录、共享、切换另一半只读和关怀；日期只保存在演示空间',async()=>{
  const screen=page();await screen.refresh();assert.equal(screen.data.view.available,false);
  screen.setData({startDate:'2026-10-12',shared:true});await screen.settings();assert.equal(screen.data.view.own,true);assert.equal(screen.data.view.forecast.nextDate,'2026-11-06');
  await api.call('switchActor');await screen.refresh();assert.equal(screen.data.view.own,false);assert.equal(screen.data.view.records.length,1);
  await screen.care();await screen.care();await api.call('switchActor');assert.equal((await api.call('getNotifications')).items.length,1);
  await screen.refresh();screen.setData({shared:false});await screen.settings();await api.call('switchActor');await screen.refresh();assert.equal(screen.data.view.available,false);assert.equal(screen.data.view.records,undefined);
});
test('敏感页读取失败会清空上次日期，不显示离线旧记录',async t=>{
  const screen=page();screen.setData({view:{available:true,records:[{startDate:'2026-10-12'}]}});
  const original=api.call;t.after(()=>api.call=original);api.call=async()=>{throw Object.assign(Error('denied'),{code:'FORBIDDEN'});};
  await screen.refresh();assert.equal(screen.data.view,null);assert.equal(screen.data.error,'denied');
});
test('客户端和后台部署使用同一生理期计算与权限逻辑',()=>{
  assert.equal(fs.readFileSync(path.join(__dirname,'../miniprogram/services/period-core.js'),'utf8'),fs.readFileSync(path.join(__dirname,'../cloudfunctions/coupleApi/periods.js'),'utf8'));
});
