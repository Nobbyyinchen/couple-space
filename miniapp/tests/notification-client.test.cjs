const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const config=require('../miniprogram/config');
const storage=new Map(),events=[];
global.wx={getStorageSync:key=>structuredClone(storage.get(key)||''),setStorageSync:(key,value)=>storage.set(key,structuredClone(value)),removeStorageSync:key=>storage.delete(key),showToast:value=>events.push(['toast',value]),showTabBarRedDot:value=>events.push(['red',value]),hideTabBarRedDot:value=>events.push(['hide',value]),cloud:{callFunction:async()=>{throw Error('offline');}},navigateTo:value=>events.push(['navigate',value]),switchTab:value=>events.push(['tab',value])};
const api=require('../miniprogram/services/api');
function page(){let definition;const file=path.resolve(__dirname,'../miniprogram/pages/notifications/index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:createRequire(file),Page:value=>definition=value,wx:global.wx});return {...definition,data:structuredClone(definition.data),setData(value){Object.assign(this.data,structuredClone(value));}};}
test.beforeEach(()=>{storage.clear();events.length=0;config.demoMode=true;config.cloudEnv='';});
test.after(()=>{delete global.wx;});
test('演示双方通知、未读红点及打开后已读和正确跳转',async()=>{
  await api.getState();await api.call('commentEntry',{id:'demo-memory-1',body:'演示留言',requestId:'same'});await api.call('commentEntry',{id:'demo-memory-1',body:'演示留言',requestId:'same'});
  await api.call('switchActor');await api.getState();await api.refreshNotificationBadge();assert.equal(events.at(-1)[0],'red');
  const screen=page();await screen.refresh();assert.equal(screen.data.items.length,1);assert.equal(screen.data.unread,1);
  await screen.open({currentTarget:{dataset:{id:screen.data.items[0].id}}});
  assert.equal((await api.call('getNotificationSummary')).unread,0);assert.equal(events.find(e=>e[0]==='navigate')[1].url,'/pages/detail/index?id=demo-memory-1');
});
test('订阅仅直接点击调用平台 API，记录失败保留结果并按成员隔离',async t=>{
  const screen=page(),sequence=[];screen.actorId='member-a';screen.tickets={comment:{ticketId:'ticket-one',templateId:'test-only-template',expiresAt:Date.now()+60000}};
  screen.data.scenes=[{scene:'comment',ready:true,configured:true}];
  const original=api.call;t.after(()=>{api.call=original;delete wx.requestSubscribeMessage;});
  api.call=async(action)=>{sequence.push(action);throw Error('network');};
  wx.requestSubscribeMessage=options=>{sequence.push('platform');options.success({'test-only-template':'accept'});};
  assert.equal(sequence.length,0);screen.subscribe({currentTarget:{dataset:{scene:'comment'}}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(sequence,['platform','recordSubscription']);assert.equal(storage.get('our-universe:mini:subscription:member-a')[0].result,'accept');assert.equal(storage.has('our-universe:mini:subscription:member-b'),false);
  api.call=async()=>({ok:true});await screen.flushAuthorization();assert.equal(storage.has('our-universe:mini:subscription:member-a'),false);
});
test('订阅结果同步失败不阻断站内通知显示，过期申请不会唤起授权',async t=>{
  await api.getState();const screen=page();await screen.refresh();
  storage.set(screen.pendingKey(),[{ticketId:'pending',result:'accept'}]);
  const original=api.call;t.after(()=>{api.call=original;delete wx.requestSubscribeMessage;});
  api.call=async(action,...args)=>{if(action==='recordSubscription')throw Error('offline');return original(action,...args);};
  await screen.refresh();assert.equal(screen.data.error,'');assert.match(screen.data.subscriptionHint,/暂未同步/);
  let requested=false;wx.requestSubscribeMessage=()=>{requested=true;};screen.tickets={comment:{expiresAt:0}};
  screen.subscribe({currentTarget:{dataset:{scene:'comment'}}});assert.equal(requested,false);
});
