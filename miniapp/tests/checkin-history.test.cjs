const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {history}=require('../cloudfunctions/coupleApi/checkin-history');
test('月内分页覆盖每一天一次，包含闰日和空白日期，双方永不拆页',async()=>{
  for(const [month,today,expected] of [['2024-02','2024-03-01',29],['2026-02','2026-03-01',28],['2026-12','2027-01-01',31]]){
    let cursor=null;const days=[];
    do{const page=await history({month,cursor},{today,readDay:async date=>[{date,authorId:'a'},{date,authorId:'b'}]});assert.ok(page.items.length<=7);assert.ok(page.items.every(day=>day.records.length===2));days.push(...page.items.map(day=>day.date));cursor=page.cursor;}while(cursor);
    assert.equal(days.length,expected);assert.equal(new Set(days).size,expected);assert.equal(days.at(-1),month+'-01');
  }
});
test('演示和云端使用同一历史分页规则',()=>{
  assert.equal(fs.readFileSync(path.resolve(__dirname,'../cloudfunctions/coupleApi/checkin-history.js'),'utf8'),fs.readFileSync(path.resolve(__dirname,'../miniprogram/services/checkin-history.js'),'utf8'));
});
function screen(api){
  let definition;const file=path.resolve(__dirname,'../miniprogram/pages/checkins/index.js');
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{Page:value=>definition=value,require:id=>id.includes('services/api')?api:require('../miniprogram/utils/dates'),wx:{}});
  return {...definition,data:structuredClone(definition.data),setData(value){Object.assign(this.data,structuredClone(value));}};
}
function fixture(month='2026-10',date=month+'-26'){
  return {month,from:month+'-20',to:date,cursor:month+'-19',actor:{id:'a'},space:{id:'space',members:[{id:'a',nickname:'小宇'},{id:'b',nickname:'小宙'}]},items:[{date,records:[{authorId:'a',mood:'开心',message:'一起吃饭',createdAt:Date.parse(date+'T04:00:00Z'),updatedAt:Date.parse(date+'T05:00:00Z')}]}]};
}
test('记录页按天展示双方状态，北京时间、首次和更新时间正确，重复分页不重复显示',async()=>{
  const page=fixture(),view=screen({call:async()=>page,isDemo:()=>true});await view.refresh('2026-10');
  const day=view.data.items[0];assert.equal(day.status,'1 人已打卡');assert.equal(day.members[0].firstTime,'12:00');assert.equal(day.members[0].updatedTime,'13:00');assert.equal(day.members[1].mood,'未打卡');
  await view.more();assert.equal(view.data.items.length,1);
});
test('切换月份时丢弃旧响应，失败可重试且不混入之前月份记录',async()=>{
  let resolve;const first=new Promise(done=>resolve=done);
  const api={call:async(_action,payload)=>payload.month==='2026-10'?first:fixture('2026-09'),isDemo:()=>false},view=screen(api);
  const pending=view.refresh('2026-10');await view.changeMonth({detail:{value:'2026-09'}});resolve(fixture());await pending;
  assert.equal(view.data.month,'2026-09');assert.equal(view.data.items[0].date,'2026-09-26');
  api.call=async()=>{throw Error('网络不可用');};await view.refresh('2026-08');assert.equal(view.data.items.length,0);assert.equal(view.data.error,'网络不可用');
  api.call=async()=>fixture('2026-08');await view.retry();assert.equal(view.data.items[0].date,'2026-08-26');
});
test('加载更多时权限失效清空记录，旧数据不继续展示',async()=>{
  const api={call:async()=>fixture(),isDemo:()=>false},view=screen(api);await view.refresh('2026-10');
  api.call=async()=>{throw Object.assign(Error('无权访问'),{code:'FORBIDDEN'});};await view.more();assert.equal(view.data.items.length,0);assert.equal(view.data.cursor,null);assert.equal(view.data.moreBusy,false);
});
