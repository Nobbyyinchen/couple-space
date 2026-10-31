const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const {createRequire}=require('node:module');
const storage=new Map(),events=[];
global.wx={
  getStorageSync:key=>storage.get(key)||'',setStorageSync:(key,value)=>storage.set(key,structuredClone(value)),removeStorageSync:key=>storage.delete(key),getStorageInfoSync:()=>({keys:[...storage.keys()]}),
  showToast:payload=>events.push({type:'toast',...payload}),showLoading:()=>{},hideLoading:()=>{},redirectTo:payload=>events.push({type:'redirect',...payload}),navigateTo:()=>{},
  cloud:{callFunction:async()=>{throw Error('offline');}}
};
const config=require('../miniprogram/config');const api=require('../miniprogram/services/api');
test.beforeEach(()=>{storage.clear();events.length=0;config.demoMode=true;config.cloudEnv='';});
test.after(()=>{delete global.wx;});
function page(name){let definition;const file=path.resolve(__dirname,'../miniprogram/pages/'+name+'/index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:createRequire(file),Page:value=>definition=value,wx:global.wx},{filename:file});return {...definition,data:structuredClone(definition.data),setData(patch){Object.assign(this.data,structuredClone(patch));}};}
function compose(){return page('compose');}

test('今日入口进入独立打卡页；演示记录支持双方查看和当天更新',async()=>{
  await api.getState();const home=page('home');home.checkinHistory();
  await api.call('checkIn',{mood:'开心',message:'今天的一句话'});
  const first=await api.call('getCheckinHistory');
  const mine=first.items[0].records.find(record=>record.authorId===first.actor.id);assert.ok(mine.createdAt);
  await api.call('checkIn',{mood:'平静',message:'更新近况'});
  await api.call('switchActor');
  const other=await api.call('getCheckinHistory');
  assert.equal(other.items[0].records.length,2);
  const updated=other.items[0].records.find(record=>record.authorId===mine.authorId);assert.equal(updated.createdAt,mine.createdAt);assert.equal(updated.message,'更新近况');
});

test('今日页跨天或切换身份会清空未提交的旧留言',async()=>{
  const home=page('home');await home.refresh();home.setData({message:'昨天没提交的话',selectedMood:'有点累'});home.checkinDay='2000-01-01';
  await home.refresh();assert.equal(home.data.message,'');assert.equal(home.data.selectedMood,'想你');
  home.setData({message:'仅我自己的草稿'});home.checkinActor='another-actor';await home.refresh();assert.equal(home.data.message,'');
});

test('待实现心愿等待确认后才保存，连续点击只弹出一次确认',async t=>{
  const original=wx.showModal;t.after(()=>{wx.showModal=original;});
  const modals=[];wx.showModal=options=>modals.push(options);
  const screen=page('wishes');await screen.refresh();
  const wish=screen.data.wishes.find(w=>!w.done),event={currentTarget:{dataset:{id:wish.id}}};
  const pending=screen.toggle(event);await screen.toggle(event);
  assert.equal(modals.length,1);assert.ok(modals[0].content.includes(wish.text));
  assert.equal((await api.getState()).wishes.find(w=>w.id===wish.id).done,false);
  modals[0].success({confirm:true});await pending;
  assert.equal((await api.getState()).wishes.find(w=>w.id===wish.id).done,true);
  assert.equal(screen.data.visible.some(w=>w.id===wish.id),false);
  assert.equal(screen.data.updating,false);
});

test('取消或弹窗失败不完成心愿，之后仍可再次点击',async t=>{
  const original=wx.showModal;t.after(()=>{wx.showModal=original;});
  const screen=page('wishes');await screen.refresh();
  const wish=screen.data.wishes.find(w=>!w.done),event={currentTarget:{dataset:{id:wish.id}}};
  for(const outcome of ['cancel','fail']){
    wx.showModal=options=>outcome==='fail'?options.fail():options.success({confirm:false,cancel:true});
    await screen.toggle(event);
    assert.equal((await api.getState()).wishes.find(w=>w.id===wish.id).done,false);
    assert.equal(screen.data.updating,false);
  }
  assert.equal(events.filter(e=>e.type==='toast').length,0);
});

test('已实现心愿仍可恢复待实现，无效心愿点击不锁住页面',async t=>{
  const original=wx.showModal;t.after(()=>{wx.showModal=original;});
  wx.showModal=()=>assert.fail('恢复待实现不需要实现确认');
  const screen=page('wishes');await screen.refresh();
  const pending=screen.data.wishes.find(w=>!w.done);
  await api.call('saveWish',{id:pending.id,revision:pending.revision,done:true});await screen.refresh();
  const wish=screen.data.wishes.find(w=>w.id===pending.id);
  await screen.toggle({currentTarget:{dataset:{id:wish.id}}});
  assert.equal((await api.getState()).wishes.find(w=>w.id===wish.id).done,false);
  await screen.toggle({currentTarget:{dataset:{id:'missing-wish'}}});
  assert.equal(screen.data.updating,false);
});
test('演示模式的发布、留言和双身份互动不调用云端',async()=>{
  const state=await api.getState();assert.equal(state.demo,true);assert.equal(state.actor.nickname,'小宇');
  const result=await api.call('saveEntry',{body:'演示模式里的新手记',title:'今天',date:'2026-10-26',imageIds:[],demoImages:[],requestId:'demo-request'});
  await api.call('switchActor');await api.getState();await api.call('commentEntry',{id:result.id,body:'另一半的留言'});
  const updated=await api.getState();assert.equal(updated.actor.nickname,'小宙');assert.equal(updated.entries.find(e=>e.id===result.id).comments[0].authorId,'demo-partner-b');
});
test('演示新手记的重复请求只产生一次记录',async()=>{await api.getState();const payload={body:'只应出现一次',date:'2026-10-26',requestId:'same',demoImages:[]};const a=await api.call('saveEntry',payload),b=await api.call('saveEntry',payload);assert.equal(a.id,b.id);assert.equal((await api.getState()).entries.filter(e=>e.body==='只应出现一次').length,1);});
test('云端连接失败时不会返回演示空间冒充已同步',async()=>{await api.getState();config.demoMode=false;config.cloudEnv='real-environment';await assert.rejects(api.getState(),/连不上云端/);});
test('云端离线缓存明确标注 offline，并保持与演示缓存隔离',async()=>{await api.getState();config.demoMode=false;config.cloudEnv='real-environment';storage.set('our-universe:mini:cache:real-environment',{actor:{id:'real-user',nickname:'真实用户'},space:{id:'real-space',startDate:'2025-02-14',members:[{id:'real-user',nickname:'真实用户'}],anniversaries:[]},entries:[],wishes:[],checkins:[]});const state=await api.getState();assert.equal(state.offline,true);assert.equal(state.demo,false);assert.equal(state.space.id,'real-space');});
test('每次新建手记都有新请求 ID，切换演示身份后草稿隔离',async()=>{await api.getState();const a=compose();await a.onLoad({});const b=compose();await b.onLoad({});assert.notEqual(a.data.requestId,b.data.requestId);a.setData({body:'小宇的草稿'});a.saveDraft();await api.call('switchActor');await api.getState();const other=compose();await other.onLoad({});assert.equal(other.data.body,'');});
test('发布成功清空草稿并跳转真实记录，不生成额外网站入口',async()=>{await api.getState();const page=compose();await page.onLoad({});page.setData({body:'手机上发布的一段日常'});page.saveDraft();await page.publish();assert.equal(storage.has(api.draftKey()),false);assert.equal(events.filter(e=>e.type==='redirect').length,1);assert.ok(events.find(e=>e.type==='redirect').url.startsWith('/pages/detail/index?id='));assert.equal((await api.getState()).entries.filter(e=>e.body==='手机上发布的一段日常').length,1);});
test('发布失败保留草稿且不显示成功跳转',async()=>{await api.getState();const page=compose();await page.onLoad({});page.setData({body:'网络失败也不能丢失'});const original=api.call;api.call=async()=>{throw Error('模拟上传失败');};try{await page.publish();assert.equal(storage.get(api.draftKey()).body,'网络失败也不能丢失');assert.equal(events.filter(e=>e.type==='redirect').length,0);}finally{api.call=original;}});

function realFixture(t,handler){
  config.demoMode=false;config.cloudEnv='performance-test';const old=wx.cloud.callFunction;t.after(()=>{wx.cloud.callFunction=old;});
  const context={actor:{id:'actor-a',nickname:'小宙'},space:{id:'space-a',name:'我们',startDate:'2025-02-14',members:[{id:'actor-a',nickname:'小宙'}],anniversaries:[]}};
  const entry={id:'entry-a',authorId:'actor-a',spaceId:'space-a',title:'',body:'已保存内容',date:'2026-10-27',images:[],likedBy:[],comments:[],sequence:1,revision:1,createdAt:Date.now()};
  const actions=[];wx.cloud.callFunction=async({data})=>{actions.push(data.action);return {result:await handler(data,context,entry)};};return {context,entry,actions};
}

test('纯文字发布到首屏只需上下文和一次保存，详情首显不再读取云端',async t=>{
  const fixture=realFixture(t,async(data,context,entry)=>({ok:true,data:data.action==='getContext'?context:{id:entry.id,revision:1,view:{...context,entry}}}));
  const composePage=compose();await composePage.onLoad({});composePage.setData({body:'新手记'});await composePage.publish();
  const detail=page('detail');detail.onLoad({id:fixture.entry.id});await detail.onShow();
  assert.deepEqual(fixture.actions,['getContext','saveEntry']);assert.equal(detail.data.entry.body,'已保存内容');assert.equal(detail.data.entry.mine,true);assert.equal(detail.data.loading,false);
  assert.equal(api.consumeSavedEntry(fixture.entry.id),null);
});

test('普通详情与留言后刷新均一次读取详情，不读取整个空间',async t=>{
  const fixture=realFixture(t,async(data,context,entry)=>({ok:true,data:data.action==='getEntryView'?{...context,entry}:{ok:true}}));
  const detail=page('detail');detail.onLoad({id:fixture.entry.id});await detail.onShow();detail.setData({comment:'留言'});await detail.comment();
  assert.deepEqual(fixture.actions,['getEntryView','commentEntry','getEntryView']);assert.equal(detail.data.entry.authorName,'小宙');
});

test('权限拒绝不会作为离线缓存显示旧回忆，详情会清空',async t=>{
  const fixture=realFixture(t,async()=>({ok:false,error:{code:'FORBIDDEN',message:'没有权限'}}));
  api.rememberSavedEntry({...fixture.context,entry:fixture.entry});api.consumeSavedEntry(fixture.entry.id);
  const detail=page('detail');detail.onLoad({id:fixture.entry.id});await detail.onShow();
  assert.equal(detail.data.entry,null);assert.match(detail.data.error,/没有权限/);assert.equal(api.cached(),null);
});

test('详情断网允许读取明确标记的缓存，切换身份不能消费他人的保存结果',async t=>{
  const fixture=realFixture(t,async()=>{throw Error('network unavailable');});api.rememberSavedEntry({...fixture.context,entry:fixture.entry});
  const result=await api.getEntryView(fixture.entry.id);assert.equal(result.state.offline,true);
  api.rememberContext({actor:{id:'actor-b',nickname:'小宇'},space:{...fixture.context.space,members:[{id:'actor-b',nickname:'小宇'}]}});
  assert.equal(api.consumeSavedEntry(fixture.entry.id),null);assert.equal(api.cached().entries.length,0);
});

test('旧云函数缺少新详情接口时兼容读取，网络错误不触发协议降级',async t=>{
  const fixture=realFixture(t,async(data,context,entry)=>data.action==='getEntryView'?{ok:false,error:{code:'ACTION',message:'旧接口'}}:{ok:true,data:data.action==='getState'?{...context,entries:[entry],wishes:[],checkins:[]}:entry});
  assert.equal((await api.getEntryView(fixture.entry.id)).entry.id,fixture.entry.id);assert.deepEqual(fixture.actions,['getEntryView','getState','getEntry']);
});

test('页面缓存空间不足不阻止服务端已确认的记录展示',async t=>{
  const fixture=realFixture(t,async(_data,context,entry)=>({ok:true,data:{...context,entry}}));
  const original=wx.setStorageSync;wx.setStorageSync=()=>{throw Error('storage quota exceeded');};t.after(()=>{wx.setStorageSync=original;});
  assert.equal((await api.getEntryView(fixture.entry.id)).entry.body,'已保存内容');
});
