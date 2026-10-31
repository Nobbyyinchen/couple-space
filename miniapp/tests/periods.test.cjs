const test=require('node:test'),assert=require('node:assert/strict');
const {createService}=require('../cloudfunctions/coupleApi/domain');
const {createNotifications}=require('../cloudfunctions/coupleApi/notifications');
const {createReminders}=require('../cloudfunctions/coupleApi/reminders');
const {forecast,day}=require('../cloudfunctions/coupleApi/periods');
const {templates:approvedTemplates}=require('../cloudfunctions/coupleApi/notification-config');
class Repository{
  constructor(){this.data=new Map();this.queue=Promise.resolve();}
  async get(c,id){const v=this.data.get(c+':'+id);return v?structuredClone(v):null;}
  async set(c,id,v){this.data.set(c+':'+id,structuredClone(v));}
  async list(c,where,{orderBy='createdAt',limit=20,before}={}){return [...this.data.entries()].filter(([k])=>k.startsWith(c+':')).map(([,v])=>structuredClone(v)).filter(v=>Object.entries(where).every(([k,x])=>v[k]===x)&&(!Number.isFinite(before)||v[orderBy]<before)).sort((a,b)=>b[orderBy]-a[orderBy]).slice(0,limit);}
  async scan(c,{after='',limit=10,where={}}={}){return [...this.data.entries()].filter(([k])=>k.startsWith(c+':')).map(([k,v])=>({...structuredClone(v),_id:k.slice(c.length+1)})).filter(v=>v._id>after&&Object.entries(where).every(([k,x])=>v[k]===x)).sort((a,b)=>a._id.localeCompare(b._id)).slice(0,limit);}
  async transaction(fn){const run=this.queue.then(async()=>{const before=new Map(this.data);try{return await fn(this);}catch(e){this.data=before;throw e;}});this.queue=run.catch(()=>{});return run;}
}
const A='openid-period-owner',B='openid-period-partner',C='openid-period-third';
const settings=(more={})=>({confirmed:true,revision:0,cycleDays:25,durationDays:5,shared:true,reminderEnabled:true,daysBefore:2,startDate:'2026-10-12',...more});
async function fixture(overrides={}){
  const repository=new Repository();let time=Date.parse('2026-10-28T12:00:00Z'),n=0;
  const opts={repository,now:()=>time,randomId:()=>String(++n).padStart(32,'0'),randomCode:()=>['ABCDEFGH','BCDEFGHJ'][n%2],templates:{period:approvedTemplates.period},...overrides};
  const service=createService(opts),notifications=createNotifications(opts),reminders=createReminders({...opts,notifications});
  const created=await service.execute('createSpace',{nickname:'小宇'},A);await service.execute('joinSpace',{nickname:'小宙',code:created.inviteCode},B);
  return {repository,service,notifications,reminders,spaceId:created.spaceId,setTime:s=>time=Date.parse(s),actor:o=>service.identify(o)};
}
test('建议日期只交给服务端推导的另一半，本人确认前不自动开启或共享',async()=>{
  const f=await fixture();await f.service.execute('suggestPeriodSetup',{startDate:'2026-10-12',recipientId:C},B);
  const a=await f.service.execute('getPeriodState',{},A),b=await f.service.execute('getPeriodState',{},B);
  assert.equal(a.suggestion.startDate,'2026-10-12');assert.equal(a.available,false);assert.equal(b.waiting,true);assert.equal(b.canEnable,false);
  await assert.rejects(f.service.execute('savePeriodSettings',settings(),B),{code:'FORBIDDEN'});
  await assert.rejects(f.service.execute('savePeriodSettings',settings({confirmed:false}),A),{code:'INVALID'});
  await f.service.execute('savePeriodSettings',settings({shared:false}),A);
  assert.equal((await f.service.execute('getPeriodState',{},B)).available,false);
});
test('周期25天预计11月6日；只由本人写入，共享对象从实际情侣关系推导',async()=>{
  const f=await fixture();await f.service.execute('savePeriodSettings',settings(),A);
  const p=await f.service.execute('getPeriodState',{},B);assert.equal(p.forecast.nextDate,'2026-11-06');assert.equal(p.own,false);assert.equal(p.records.length,1);
  for(const action of ['savePeriodSettings','savePeriodRecord','deletePeriodRecord'])await assert.rejects(f.service.execute(action,{...settings(),id:'2026-10-12'},B),{code:'FORBIDDEN'});
  await assert.rejects(f.service.execute('getPeriodState',{ownerId:f.actor(A)},C),{code:'UNPAIRED'});
  await f.service.execute('createSpace',{nickname:'第三人'},C);assert.equal((await f.service.execute('getPeriodState',{spaceId:f.spaceId},C)).available,false);
  const context=await f.service.execute('getContext',{},B);assert.equal(JSON.stringify(context).includes('periodTracker'),false);assert.equal(JSON.stringify(context).includes('2026-10-12'),false);
});
test('更新和删除有版本校验，非法未来/重叠/反向日期不改变原记录',async()=>{
  const f=await fixture();await f.service.execute('savePeriodSettings',settings(),A);
  for(const startDate of ['2026-10-14','2026-02-30','2026-11-01'])await assert.rejects(f.service.execute('savePeriodRecord',{revision:1,startDate},A),{code:'INVALID'});
  await assert.rejects(f.service.execute('savePeriodRecord',{revision:1,id:'2026-10-12',startDate:'2026-10-12',endDate:'2026-10-11'},A),{code:'INVALID'});
  await f.service.execute('savePeriodRecord',{revision:1,id:'2026-10-12',startDate:'2026-10-12',endDate:'2026-10-16'},A);
  await assert.rejects(f.service.execute('deletePeriodRecord',{revision:1,id:'2026-10-12'},A),{code:'CONFLICT'});
  assert.equal((await f.service.execute('getPeriodState',{},A)).records[0].endDate,'2026-10-16');
  await f.service.execute('deletePeriodRecord',{revision:2,id:'2026-10-12'},A);assert.equal((await f.service.execute('getPeriodState',{},A)).forecast,null);
});
test('关闭共享立即停止另一半读取、关怀及新的提醒，不在普通资料里泄露日期',async()=>{
  const f=await fixture();await f.service.execute('savePeriodSettings',settings(),A);
  await f.service.execute('savePeriodSettings',settings({revision:1,shared:false}),A);
  const p=await f.service.execute('getPeriodState',{},B);assert.equal(p.private,true);assert.equal(p.records,undefined);assert.equal(p.forecast,undefined);
  await assert.rejects(f.service.execute('sendPeriodCare',{kind:'hug'},B),{code:'FORBIDDEN'});
  f.setTime('2026-11-04T01:05:00Z');await f.reminders.forSpace(f.spaceId);
  assert.equal((await f.service.execute('getNotifications',{},A)).items.length,1);assert.equal((await f.service.execute('getNotifications',{},B)).items.length,0);
});
test('每日关怀幂等、不能给自己发送，通知失败不影响已送达的站内记录',async()=>{
  const f=await fixture();await f.service.execute('savePeriodSettings',settings(),A);
  await assert.rejects(f.service.execute('sendPeriodCare',{kind:'hug'},A),{code:'FORBIDDEN'});
  await Promise.all(Array.from({length:3},()=>f.service.execute('sendPeriodCare',{kind:'hug',recipientOpenId:C},B)));
  const page=await f.service.execute('getNotifications',{},A);assert.equal(page.items.length,1);assert.equal(page.items[0].scene,'periodCare');assert.equal(page.items[0].date,'');
  assert.equal(JSON.stringify(page).includes('2026-10-12'),false);
  const jobs=await f.repository.list('notificationDeliveries',{recipientId:f.actor(A)});assert.equal(jobs[0].reason,'TEMPLATE_NOT_CONFIGURED');
});
test('现有每日触发器涵盖双方提前和当天提醒，重复触发及修改提前天数不重复',async()=>{
  const f=await fixture();await f.service.execute('savePeriodSettings',settings(),A);f.setTime('2026-11-04T01:05:00Z');
  await f.reminders.forSpace(f.spaceId);await f.reminders.forSpace(f.spaceId);
  assert.equal((await f.service.execute('getNotifications',{},A)).items.length,1);assert.equal((await f.service.execute('getNotifications',{},B)).items.length,1);
  f.setTime('2026-11-05T01:05:00Z');await f.reminders.forSpace(f.spaceId);assert.equal((await f.service.execute('getNotifications',{},A)).items.length,1);
  f.setTime('2026-11-06T01:05:00Z');await f.reminders.forSpace(f.spaceId);await f.reminders.forSpace(f.spaceId);assert.equal((await f.service.execute('getNotifications',{},B)).items.length,2);
  f.setTime('2026-12-01T01:05:00Z');await f.reminders.forSpace(f.spaceId);assert.equal((await f.service.execute('getNotifications',{},B)).items.length,2);
});
test('关闭提醒后双方均不新增日期提醒；实际日期变化会重算预测',async()=>{
  const f=await fixture();await f.service.execute('savePeriodSettings',settings({reminderEnabled:false}),A);
  f.setTime('2026-11-04T01:05:00Z');await f.reminders.forSpace(f.spaceId);assert.equal((await f.service.execute('getNotifications',{},A)).unread,0);
  await f.service.execute('savePeriodRecord',{revision:1,startDate:'2026-11-03'},A);assert.equal((await f.service.execute('getPeriodState',{},B)).forecast.nextDate,'2026-11-28');
});
test('北京时间跨年、闰年和过期预测保持真实，既不多滚一个周期也不自动写记录',()=>{
  const p={cycleDays:25,records:[{startDate:'2026-12-20',endDate:''}]};
  assert.equal(forecast(p,'2027-01-01').nextDate,'2027-01-14');assert.equal(forecast(p,'2027-02-01').unconfirmed,true);
  assert.equal(forecast({cycleDays:25,records:[{startDate:'2028-02-05'}]},'2028-02-28').nextDate,'2028-03-01');
  assert.equal(day(Date.parse('2026-12-31T16:00:00Z')),'2027-01-01');assert.equal(p.records.length,1);
});
test('撤回共享后已排队的外部关怀不会发送',async()=>{
  const f=await fixture();await f.service.execute('savePeriodSettings',settings(),A);
  await f.service.execute('sendPeriodCare',{kind:'company'},B);
  const page=await f.service.execute('getNotifications',{},A),id=page.items[0].id;
  await f.repository.set('notificationDeliveries',id,{...(await f.repository.get('notificationDeliveries',id)),status:'pending'});
  await f.service.execute('savePeriodSettings',settings({revision:1,shared:false}),A);await f.notifications.deliver(id);
  assert.equal((await f.repository.get('notificationDeliveries',id)).reason,'SHARING_DISABLED');
});
test('经期真实字段映射支持双方倒计时及当天0天，不向微信发送具体记录日期',async()=>{
  const sent=[],f=await fixture({sendMessage:async message=>{sent.push(message);return {errCode:0};}});
  await f.service.execute('savePeriodSettings',settings(),A);f.setTime('2026-11-04T01:05:00Z');
  const authorize=async actor=>{const ticket=await f.service.execute('prepareSubscription',{scene:'period'},actor);await f.service.execute('recordSubscription',{ticketId:ticket.ticketId,result:'accept'},actor);};
  await authorize(A);await authorize(B);
  const ids=await f.reminders.forSpace(f.spaceId);
  for(const id of ids)await f.notifications.deliver(id);
  for(const id of ids)await f.notifications.deliver(id);
  assert.equal(sent.length,2);assert.deepEqual(new Set(sent.map(m=>m.touser)),new Set([A,B]));
  for(const message of sent){
    assert.equal(message.data.number2.value,'2');assert.ok(message.data.thing3.value.length<=20);
    assert.equal(message.page,'pages/period/index');assert.equal(/2026-10-12|2026-11-06/.test(JSON.stringify(message)),false);
  }
  f.setTime('2026-11-06T01:05:00Z');await authorize(A);
  for(const id of await f.reminders.forSpace(f.spaceId))await f.notifications.deliver(id);
  assert.equal(sent.length,3);assert.equal(sent[2].data.number2.value,'0');
  assert.equal((await f.service.execute('getNotifications',{},A)).items.every(item=>item.date===''),true);
});
test('经期排队后跨天或修改记录会停止过期微信提醒，不消耗授权次数',async()=>{
  for(const change of ['nextDay','record']){
    const sent=[],f=await fixture({sendMessage:async message=>{sent.push(message);return {errCode:0};}});
    await f.service.execute('savePeriodSettings',settings(),A);f.setTime('2026-11-04T01:05:00Z');
    const ticket=await f.service.execute('prepareSubscription',{scene:'period'},A);
    await f.service.execute('recordSubscription',{ticketId:ticket.ticketId,result:'accept'},A);
    const ids=await f.reminders.forSpace(f.spaceId);
    if(change==='nextDay')f.setTime('2026-11-05T01:05:00Z');
    else await f.service.execute('savePeriodRecord',{revision:1,startDate:'2026-11-03'},A);
    for(const id of ids)await f.notifications.deliver(id);
    assert.equal(sent.length,0);assert.equal((await f.repository.get('notificationSubscriptions',ticket.ticketId)).state,'available');
    assert.equal((await f.repository.get('notificationDeliveries',ids[0])).reason,'REMINDER_OUTDATED');
    assert.equal((await f.service.execute('getNotifications',{},A)).items.length,1);
  }
});
test('真实关怀模板只给记录者发送预设文案，同一天重复关怀不重复消耗授权',async()=>{
  const sent=[],f=await fixture({templates:approvedTemplates,sendMessage:async message=>{sent.push(message);return {errCode:0};}});
  await f.service.execute('savePeriodSettings',settings(),A);
  const ticket=await f.service.execute('prepareSubscription',{scene:'periodCare'},A);
  await f.service.execute('recordSubscription',{ticketId:ticket.ticketId,result:'accept'},A);
  await f.service.execute('sendPeriodCare',{kind:'hug'},B);
  await f.service.execute('sendPeriodCare',{kind:'rest'},B);
  assert.equal(sent.length,1);assert.equal(sent[0].touser,A);
  assert.equal(sent[0].templateId,approvedTemplates.periodCare.templateId);
  assert.deepEqual(sent[0].data,{thing1:{value:'TA 送来一份温柔关怀'},thing4:{value:'给你一个轻轻的拥抱，我一直在。'}});
  assert.equal(sent[0].page,'pages/period/index');assert.equal(JSON.stringify(sent[0]).includes('2026-10-12'),false);
  assert.equal((await f.repository.get('notificationSubscriptions',ticket.ticketId)).state,'consumed');
  assert.equal((await f.service.execute('getNotifications',{},A)).items.length,1);
});
