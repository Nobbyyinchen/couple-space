const test=require('node:test');
const assert=require('node:assert/strict');
const {createService,clone}=require('../cloudfunctions/coupleApi/domain');
const {createNotifications,businessDate}=require('../cloudfunctions/coupleApi/notifications');
const {createReminders,occurrence}=require('../cloudfunctions/coupleApi/reminders');
const {configured,templateData,templates:approvedTemplates}=require('../cloudfunctions/coupleApi/notification-config');
class Repository{
  constructor(){this.data=new Map();this.queue=Promise.resolve();}
  async get(c,id){const value=this.data.get(c+':'+id);return value?clone(value):null;}
  async set(c,id,value){this.data.set(c+':'+id,clone(value));}
  async list(c,where,{orderBy='createdAt',limit=20,before}={}){return [...this.data.entries()].filter(([key])=>key.startsWith(c+':')).map(([,v])=>clone(v)).filter(v=>Object.entries(where).every(([key,value])=>v[key]===value)).filter(v=>!Number.isFinite(before)||v[orderBy]<before).sort((a,b)=>b[orderBy]-a[orderBy]).slice(0,limit);}
  async scan(c,{after='',limit=25,where={}}={}){return [...this.data.entries()].filter(([key])=>key.startsWith(c+':')).map(([key,value])=>({...clone(value),_id:key.slice(c.length+1)})).filter(v=>v._id>after&&Object.entries(where).every(([key,value])=>v[key]===value)).sort((a,b)=>a._id.localeCompare(b._id)).slice(0,limit);}
  async transaction(callback){const run=this.queue.then(async()=>{const copy=new Map(this.data);try{return await callback(this);}catch(e){this.data=copy;throw e;}});this.queue=run.catch(()=>{});return run;}
}
const A='openid-member-a',B='openid-member-b',C='openid-member-c';
// These are test fixtures only, not production template IDs or approved field mappings.
const testTemplates=Object.fromEntries(['comment','photo','anniversary'].map(scene=>[scene,{enabled:true,templateId:'test-only-'+scene,fields:[{key:'thing99',source:'summary',maxLength:20}]}]));
async function fixture({enabled=false,templates=enabled?testTemplates:{},send=async()=>({errCode:0})}={}){
  const repository=new Repository();let time=Date.parse('2026-12-31T16:05:00Z'),sequence=0,code=0;const sent=[];
  const options={repository,now:()=>time,randomId:()=>String(++sequence).padStart(32,'0'),randomCode:()=>['ABCDEFGH','BCDEFGHJ','CDEFGHJK'][code++%3],mediaOrigin:'cloud://test.bucket',templates,sendMessage:async message=>{sent.push(message);return send(message);}};
  const service=createService(options),notifications=createNotifications(options),reminders=createReminders({...options,notifications});
  const created=await service.execute('createSpace',{nickname:'甲',startDate:'2026-01-01'},A);await service.execute('joinSpace',{nickname:'乙',code:created.inviteCode},B);
  return {repository,service,notifications,reminders,sent,advance:ms=>time+=ms,setTime:value=>time=Date.parse(value),actor:openid=>service.identify(openid),spaceId:created.spaceId};
}
const post=(more={})=>({body:'我们的回忆',date:'2027-01-01',imageIds:[],requestId:'post-1',...more});
async function entry(f){return f.service.execute('saveEntry',post(),A);}
async function comment(f,id,openid=B,requestId='comment-1'){return f.service.execute('commentEntry',{id,body:'留给另一半',requestId,recipientOpenId:C},openid);}
async function authorize(f,openid,scene='comment',result='accept'){
  const ticket=await f.service.execute('prepareSubscription',{scene,openid:C},openid);
  await f.service.execute('recordSubscription',{ticketId:ticket.ticketId,result},openid);return ticket;
}
const jobs=f=>[...f.repository.data.entries()].filter(([key])=>key.startsWith('notificationDeliveries:')).map(([,value])=>value);

test('双方留言通知只发给另一位成员；重试不重复评论、通知或未读数',async()=>{
  const f=await fixture(),saved=await entry(f);await comment(f,saved.id);await comment(f,saved.id);
  const page=await f.service.execute('getNotifications',{recipientId:f.actor(B)},A);
  assert.equal(page.items.length,1);assert.equal(page.unread,1);assert.equal(page.items[0].recipientId,f.actor(A));
  assert.equal((await f.service.execute('getEntry',{id:saved.id},A)).comments.length,1);
  assert.equal((await f.service.execute('getNotifications',{},B)).items.length,0);
  await comment(f,saved.id,A,'a-reply');assert.equal((await f.service.execute('getNotifications',{},B)).unread,1);
  await f.service.execute('readNotification',{id:page.items[0].id},A);await f.service.execute('readNotification',{id:page.items[0].id},A);
  assert.equal((await f.service.execute('getNotificationSummary',{},A)).unread,0);
  await assert.rejects(f.service.execute('readNotification',{id:page.items[0].id},B),{code:'NOT_FOUND'});
});
test('通知接口拒绝未登录、未绑定和跨空间读取及已读操作',async()=>{
  const f=await fixture(),saved=await entry(f);await comment(f,saved.id);
  const item=(await f.service.execute('getNotifications',{},A)).items[0];
  await assert.rejects(f.service.execute('getNotifications',{},''),{code:'AUTH'});
  await assert.rejects(f.service.execute('getNotifications',{},C),{code:'UNPAIRED'});
  await f.service.execute('createSpace',{nickname:'第三人'},C);
  assert.equal((await f.service.execute('getNotifications',{spaceId:f.spaceId},C)).items.length,0);
  await assert.rejects(f.service.execute('readNotification',{id:item.id},C),{code:'NOT_FOUND'});
  await assert.rejects(f.service.execute('getNotifications',{cursor:{$gt:0}},A),{code:'INVALID'});
});
test('相同时间的通知分页不遗漏，未读数不受分页和重复已读影响',async()=>{
  const f=await fixture(),saved=await entry(f);
  for(let i=0;i<23;i++)await comment(f,saved.id,B,'comment-'+i);
  const first=await f.service.execute('getNotifications',{},A),second=await f.service.execute('getNotifications',{cursor:first.cursor},A);
  assert.equal(first.items.length,20);assert.equal(second.items.length,3);assert.equal(first.unread,23);
  assert.equal(new Set([...first.items,...second.items].map(n=>n.id)).size,23);
});
test('上传登记不产生草稿通知，发布合并照片通知，编辑文字及重放不重复',async()=>{
  const f=await fixture();const image=await f.service.execute('prepareUpload',{extension:'jpg',size:20},A);
  await f.service.execute('completeUpload',{id:image.id,fileId:'cloud://test.bucket/'+image.cloudPath},A);
  assert.equal((await f.service.execute('getNotificationSummary',{},B)).unread,0);
  const saved=await f.service.execute('saveEntry',post({imageIds:[image.id]}),A);
  await f.service.execute('saveEntry',post({imageIds:[image.id]}),A);
  await f.service.execute('saveEntry',post({...saved,requestId:'edit',imageIds:[image.id],body:'改文字'}),A);
  assert.equal((await f.service.execute('getNotifications',{},B)).items.length,1);
  const image2=await f.service.execute('prepareUpload',{extension:'jpg',size:20},A);
  await f.service.execute('completeUpload',{id:image2.id,fileId:'cloud://test.bucket/'+image2.cloudPath},A);
  await f.service.execute('saveEntry',post({id:saved.id,revision:2,requestId:'new-photo',imageIds:[image.id,image2.id]}),A);
  assert.equal((await f.service.execute('getNotifications',{},B)).items.length,2);
});
test('通知写入失败时业务事务完整回滚，重试可以恢复',async()=>{
  const f=await fixture(),saved=await entry(f),set=f.repository.set.bind(f.repository);
  f.repository.set=async(c,...args)=>{if(c==='notifications')throw Error('collection unavailable');return set(c,...args);};
  await assert.rejects(comment(f,saved.id));assert.equal((await f.service.execute('getEntry',{id:saved.id},A)).comments.length,0);
  f.repository.set=set;await comment(f,saved.id);assert.equal((await f.service.execute('getNotifications',{},A)).unread,1);
});
test('模板缺失和未授权仍产生站内通知并记录跳过原因',async()=>{
  const f=await fixture(),saved=await entry(f);await comment(f,saved.id);
  assert.equal(jobs(f)[0].reason,'TEMPLATE_NOT_CONFIGURED');assert.equal(f.sent.length,0);
  await assert.rejects(f.service.execute('prepareSubscription',{scene:'comment'},A),{code:'SETUP'});
  const enabled=await fixture({enabled:true}),other=await entry(enabled);await comment(enabled,other.id);
  assert.equal(jobs(enabled)[0].reason,'OPENID_NOT_REGISTERED');
});
test('授权只采用平台身份，重复上报不增加次数，一次授权仅发送一次',async()=>{
  const f=await fixture({enabled:true}),saved=await entry(f),ticket=await authorize(f,A);
  await f.service.execute('recordSubscription',{ticketId:ticket.ticketId,result:'accept'},A);
  await assert.rejects(f.service.execute('recordSubscription',{ticketId:ticket.ticketId,result:'accept'},B),{code:'INVALID'});
  await comment(f,saved.id);await comment(f,saved.id,B,'comment-2');
  assert.equal(f.sent.length,1);assert.equal(f.sent[0].touser,A);assert.ok(f.sent[0].page.includes(saved.id));
  assert.deepEqual(jobs(f).map(j=>j.status),['sent','skipped']);assert.equal(jobs(f)[1].reason,'NO_SUBSCRIPTION_CREDIT');
  assert.equal(JSON.stringify(await f.service.execute('getState',{},A)).includes('openid-member-'),false);
});
test('拒绝授权不增加机会，次数不足不能冒用其他场景模板',async()=>{
  const f=await fixture({enabled:true}),saved=await entry(f);await authorize(f,A,'comment','reject');await authorize(f,A,'photo');
  await comment(f,saved.id);assert.equal(f.sent.length,0);assert.equal(jobs(f)[0].reason,'NO_SUBSCRIPTION_CREDIT');
});
test('并发投递不会重复使用同一次授权或重复发送同一事件',async()=>{
  const f=await fixture({enabled:true}),saved=await entry(f);await authorize(f,A);
  // Pause delivery to prepare two committed jobs, then contend for the same grant.
  const sendService=createService({repository:f.repository,templates:{}});
  await sendService.execute('commentEntry',{id:saved.id,body:'一',requestId:'one'},B);
  await sendService.execute('commentEntry',{id:saved.id,body:'二',requestId:'two'},B);
  for(const job of jobs(f))await f.repository.set('notificationDeliveries',job.id,{...job,status:'pending'});
  await Promise.all(jobs(f).flatMap(job=>[f.notifications.deliver(job.id),f.notifications.deliver(job.id)]));
  assert.equal(f.sent.length,1);assert.equal(jobs(f).filter(j=>j.status==='sent').length,1);
});
test('确定失败可有限重试，拒收不重试，网络结果不确定不盲目重发',async()=>{
  const f=await fixture({enabled:true,send:async()=>({errCode:-1})}),saved=await entry(f);await authorize(f,A);await comment(f,saved.id);
  for(let i=0;i<4;i++){f.advance(3600000);await f.notifications.deliver(jobs(f)[0].id);}
  assert.equal(f.sent.length,3);assert.equal(jobs(f)[0].status,'failed');assert.equal(jobs(f)[0].history.length,3);
  for(const [send,status] of [[async()=>({errCode:43101}),'failed'],[async()=>{throw Error('transport lost');},'unknown']]){
    const g=await fixture({enabled:true,send}),record=await entry(g);await authorize(g,A);await comment(g,record.id);g.advance(3600000);await g.notifications.deliver(jobs(g)[0].id);
    assert.equal(g.sent.length,1);assert.equal(jobs(g)[0].status,status);assert.equal((await g.service.execute('getNotificationSummary',{},A)).unread,1);
  }
});
test('发送中断仅记为未知，成员关系变更后禁止发送',async()=>{
  const f=await fixture({enabled:true}),saved=await entry(f);await comment(f,saved.id);
  const job=jobs(f)[0];await f.repository.set('notificationDeliveries',job.id,{...job,status:'sending',startedAt:0});await f.notifications.deliver(job.id);
  assert.equal(jobs(f)[0].status,'unknown');
  await f.repository.set('notificationDeliveries',job.id,{...job,status:'pending'});const space=await f.repository.get('spaces',f.spaceId);space.members=[f.actor(B)];await f.repository.set('spaces',space.id,space);
  await f.notifications.deliver(job.id);assert.equal(jobs(f)[0].reason,'MEMBERSHIP_CHANGED');assert.equal(f.sent.length,0);
});
test('北京时间边界、跨年提前提醒与年度闰日规则',async()=>{
  assert.equal(businessDate(Date.parse('2026-12-31T16:00:00Z')),'2027-01-01');
  assert.equal(occurrence({date:'2000-02-29',recurring:true},'2027-02-28'),true);
  assert.equal(occurrence({date:'2000-02-29',recurring:true},'2028-02-29'),true);
  assert.equal(occurrence({date:'2000-02-29',recurring:true},'2028-02-28'),false);
  assert.equal(occurrence({date:'2027-02-29',recurring:true},'2027-03-01'),false);
  assert.equal(occurrence({date:'2026-01-01',recurring:false},'2027-01-01'),false);
  const f=await fixture();f.setTime('2026-12-31T01:05:00Z');
  await f.service.execute('updateNotificationSettings',{anniversaryEnabled:true,daysBefore:1},A);
  await f.reminders.forSpace(f.spaceId);await f.reminders.forSpace(f.spaceId);
  const a=await f.service.execute('getNotifications',{},A);assert.equal(a.items.length,1);assert.equal(a.items[0].date,'2027-01-01');
  assert.equal((await f.service.execute('getNotifications',{},B)).items.length,0);
});
test('定时扫描支持检查点、重复执行、用户关闭及数据库失败上限',async()=>{
  const f=await fixture();await f.service.execute('updateNotificationSettings',{anniversaryEnabled:true,daysBefore:0},A);
  await f.reminders.runDaily({allowStart:true});await f.reminders.runDaily({allowStart:true});
  assert.equal((await f.service.execute('getNotifications',{},A)).items.length,1);
  await f.service.execute('updateNotificationSettings',{anniversaryEnabled:false,daysBefore:0},A);f.advance(365*86400000);await f.reminders.runDaily({allowStart:true});
  assert.equal((await f.service.execute('getNotifications',{},A)).items.length,1);
  const g=await fixture();let attempts=0;g.repository.scan=async()=>{attempts++;throw Object.assign(Error('db'),{code:'DB'});};
  for(let i=0;i<4;i++)try{await g.reminders.runDaily({allowStart:true});}catch{}
  assert.equal(attempts,3);assert.equal((await g.repository.get('counts','anniversary-scan-2027-01-01')).lastError,'DB');
});
test('未取得模板的场景禁用，已启用但字段未配置也不能发送',()=>{
  assert.equal(configured('photo'),false);assert.equal(configured('comment',{comment:{enabled:true,templateId:'id',fields:[]}}),false);
});
test('真实留言模板映射双方昵称与内容；重放不重复发送且正确跳转回忆',async()=>{
  const f=await fixture({templates:approvedTemplates}),saved=await entry(f);
  await authorize(f,A);await authorize(f,B);
  await comment(f,saved.id,B);await comment(f,saved.id,B);await comment(f,saved.id,A,'reply');
  assert.equal(f.sent.length,2);
  assert.deepEqual(f.sent.map(message=>message.data),[
    {thing2:{value:'乙'},thing3:{value:'留给另一半'}},
    {thing2:{value:'甲'},thing3:{value:'留给另一半'}}
  ]);
  for(const message of f.sent){assert.equal(message.templateId,approvedTemplates.comment.templateId);assert.equal(message.page,'pages/detail/index?id='+saved.id);}
});
test('真实纪念日模板映射标题与提醒文案，双方各用自己的授权，重复扫描不重发',async()=>{
  const f=await fixture({templates:approvedTemplates});
  for(const actor of [A,B]){
    await f.service.execute('updateNotificationSettings',{anniversaryEnabled:true,daysBefore:0},actor);
    await authorize(f,actor,'anniversary');
  }
  for(let i=0;i<2;i++)for(const id of await f.reminders.forSpace(f.spaceId))await f.notifications.deliver(id);
  assert.equal(f.sent.length,2);assert.deepEqual(new Set(f.sent.map(message=>message.touser)),new Set([A,B]));
  for(const message of f.sent){
    assert.equal(message.templateId,approvedTemplates.anniversary.templateId);
    assert.deepEqual(message.data,{thing5:{value:'相恋纪念日'},thing2:{value:'今天，是我们放在心上的日子。'}});
    assert.equal(message.page,'pages/notifications/index');
  }
});
test('模板字段按实际支持类型校验，文本去除控制字符，倒计时零值不能变成空值',()=>{
  const text={fields:[{key:'thing3',source:'summary',maxLength:20}]},number={fields:[{key:'number2',source:'periodDaysRemaining',maxLength:2}]};
  assert.deepEqual(templateData(text,{summary:'  今天\n也照顾自己\u0000  '}),{thing3:{value:'今天 也照顾自己'}});
  assert.deepEqual(templateData(number,{periodDaysRemaining:0}),{number2:{value:'0'}});
  for(const value of [undefined,'2',-1,2.5,61])assert.equal(templateData(number,{periodDaysRemaining:value}),null);
  assert.equal(templateData(text,{summary:'\n\u0000'}),null);
  for(const fields of [[null],[{key:'time2',source:'date',maxLength:20}],[{key:'thing3',source:'summary',maxLength:21}],[{key:'number2',source:'summary',maxLength:2}]]){
    assert.equal(configured('period',{period:{enabled:true,templateId:'test-only-format',fields}}),false);
  }
});
