const test=require('node:test');const assert=require('node:assert/strict');
const {createService,clone}=require('../cloudfunctions/coupleApi/domain');
const {today,validDate,daysBetween,nextDate}=require('../miniprogram/utils/dates');
class Repository{
  constructor(){this.data=new Map();this.queue=Promise.resolve();}
  async get(collection,id){const value=this.data.get(collection+':'+id);return value?clone(value):null;}
  async set(collection,id,value){this.data.set(collection+':'+id,clone(value));}
  async list(collection,where,options={}){return [...this.data.entries()].filter(([key])=>key.startsWith(collection+':')).map(([,value])=>clone(value)).filter(v=>Object.entries(where).every(([key,value])=>v[key]===value)).filter(v=>!Number.isFinite(options.before)||v[options.orderBy]<options.before).sort((a,b)=>b[options.orderBy]-a[options.orderBy]).slice(0,options.limit||100);}
  async transaction(callback){const run=this.queue.then(async()=>{const copy=new Map(this.data);try{return await callback(this);}catch(error){this.data=copy;throw error;}});this.queue=run.catch(()=>{});return run;}
}
const A='openid-user-partner-a',B='openid-user-partner-b',C='openid-unrelated-user';
function setup(){const repository=new Repository();let time=Date.parse('2026-10-26T04:00:00Z'),sequence=0,codeSequence=0;const service=createService({repository,now:()=>time,randomId:()=>String(++sequence).padStart(32,'0'),randomCode:()=>['ABCDEFGH','BCDEFGHJ','CDEFGHJK'][codeSequence++%3],mediaOrigin:'cloud://test-env.bucket',mediaUrls:async ids=>Object.fromEntries(ids.map(id=>[id,'https://example.invalid/'+encodeURIComponent(id)]))});return {repository,service,advance:ms=>time+=ms};}
async function pair(s){const created=await s.execute('createSpace',{nickname:'小宇'},A);await s.execute('joinSpace',{nickname:'小宙',code:created.inviteCode},B);return created;}
const post=(changes={})=>({title:'一起看海',body:'记下一段属于两个人的日常。',date:'2026-10-26',imageIds:[],requestId:'request-one',...changes});
test('北京时间日期、闰日与相恋天数',()=>{assert.equal(today(Date.parse('2026-10-25T16:01:00Z')),'2026-10-26');assert.equal(daysBetween('2025-02-14','2026-10-26'),619);assert.equal(validDate('2025-02-29'),false);assert.equal(nextDate('2000-02-29','2025-02-01'),'2025-02-28');});
test('云端身份必填，不接受空身份',async()=>{const {service}=setup();await assert.rejects(service.execute('getState',{},''),{code:'AUTH'});});
test('创建与加入后，两个人读到同一空间',async()=>{const {service}=setup();await pair(service);const a=await service.execute('getState',{},A),b=await service.execute('getState',{},B);assert.equal(a.space.id,b.space.id);assert.equal(a.space.members.length,2);assert.equal(a.space.paired,true);assert.equal(a.actor.nickname,'小宇');assert.equal(b.actor.nickname,'小宙');assert.equal(a.space.inviteHash,undefined);});
test('邀请码只能使用一次，第三人不可加入',async()=>{const {service}=setup();const created=await pair(service);await assert.rejects(service.execute('joinSpace',{nickname:'第三人',code:created.inviteCode},C),{code:'INVITE'});});
test('并发抢占邀请码也只会加入一个人',async()=>{const {service}=setup();const result=await service.execute('createSpace',{nickname:'小宇'},A);const results=await Promise.allSettled([service.execute('joinSpace',{nickname:'小宙',code:result.inviteCode},B),service.execute('joinSpace',{nickname:'第三人',code:result.inviteCode},C)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await service.execute('getState',{},A)).space.members.length,2);});
test('邀请码过期与旧码撤回',async()=>{const {service,advance}=setup();const result=await service.execute('createSpace',{nickname:'小宇'},A);await service.execute('newInvite',{},A);await assert.rejects(service.execute('joinSpace',{nickname:'小宙',code:result.inviteCode},B),{code:'INVITE'});const newer=await service.execute('newInvite',{},A);advance(86400001);await assert.rejects(service.execute('joinSpace',{nickname:'小宙',code:newer.inviteCode},B),{code:'INVITE'});});
test('失败的邀请码尝试也会消耗限流次数',async()=>{const {service}=setup();for(let i=0;i<10;i++)await assert.rejects(service.execute('joinSpace',{nickname:'第三人',code:'ABCDEFGH'},C));await assert.rejects(service.execute('joinSpace',{nickname:'第三人',code:'ABCDEFGH'},C),{code:'RATE_LIMIT'});});
test('已经绑定的人不能建立或加入第二个空间',async()=>{const {service}=setup();await pair(service);await assert.rejects(service.execute('createSpace',{nickname:'小宙'},B),{code:'ALREADY_PAIRED'});});
test('前端伪造空间和作者字段不会改变授权',async()=>{const {service}=setup();await pair(service);const {id}=await service.execute('saveEntry',post({spaceId:'other',authorId:'forged'}),A);const entry=await service.execute('getEntry',{id},B);assert.equal(entry.authorId,service.identify(A));const state=await service.execute('getState',{},A);assert.equal(entry.spaceId,state.space.id);});
test('未绑定与不同空间不能读写回忆',async()=>{const {service}=setup();await pair(service);const {id}=await service.execute('saveEntry',post(),A);await assert.rejects(service.execute('getEntry',{id},C),{code:'UNPAIRED'});await service.execute('createSpace',{nickname:'第三人'},C);await assert.rejects(service.execute('getEntry',{id},C),{code:'NOT_FOUND'});await assert.rejects(service.execute('likeEntry',{id,liked:true},C),{code:'NOT_FOUND'});});
test('双击发布和重试不会产生两篇回忆',async()=>{const {service}=setup();await pair(service);const a=await service.execute('saveEntry',post(),A),b=await service.execute('saveEntry',post(),A);assert.equal(a.id,b.id);assert.equal((await service.execute('getState',{},A)).entries.length,1);});
test('仅作者可修改，过期版本会拒绝，编辑重试幂等',async()=>{const {service}=setup();await pair(service);const saved=await service.execute('saveEntry',post(),A);await assert.rejects(service.execute('saveEntry',post({...saved,requestId:'b-edit'}),B),{code:'FORBIDDEN'});const next=await service.execute('saveEntry',post({...saved,body:'更新后的内容',requestId:'edit-one'}),A);assert.equal(next.revision,2);assert.deepEqual(await service.execute('saveEntry',post({...saved,requestId:'edit-one'}),A),next);await assert.rejects(service.execute('saveEntry',post({...saved,requestId:'stale-edit'}),A),{code:'CONFLICT'});});
test('修改资料需要当前版本，日期不能被归一化为错误日期',async()=>{const {service}=setup();await pair(service);const state=await service.execute('getState',{},A),payload={revision:state.space.revision,name:'我们的空间',nickname:'小宇',startDate:'2025-02-14',anniversaries:[]};await assert.rejects(service.execute('updateSpace',{...payload,startDate:'2026-02-30'},A),{code:'INVALID'});await service.execute('updateSpace',payload,A);await assert.rejects(service.execute('updateSpace',payload,B),{code:'CONFLICT'});});
test('点赞设定是幂等的，双方都可以留言',async()=>{const {service}=setup();await pair(service);const {id}=await service.execute('saveEntry',post(),A);await service.execute('likeEntry',{id,liked:true},B);await service.execute('likeEntry',{id,liked:true},B);await service.execute('commentEntry',{id,body:'我也很喜欢那一天'},B);const entry=await service.execute('getEntry',{id},A);assert.equal(entry.likedBy.length,1);assert.equal(entry.comments[0].authorId,service.identify(B));});
test('心愿双方可完成，冲突不会覆盖新状态',async()=>{const {service}=setup();await pair(service);const wish=await service.execute('saveWish',{text:'一起去看海'},A);await service.execute('saveWish',{...wish,done:true},B);await assert.rejects(service.execute('saveWish',{...wish,done:false},A),{code:'CONFLICT'});assert.equal((await service.execute('getState',{},A)).wishes[0].done,true);});
test('每天心情覆盖同一天，而不是生成重复打卡',async()=>{const {service}=setup();await pair(service);await service.execute('checkIn',{mood:'开心',message:'早上的心情'},A);await service.execute('checkIn',{mood:'想你',message:'晚上的心情'},A);const state=await service.execute('getState',{},B);assert.equal(state.checkins.length,1);assert.equal(state.checkins[0].mood,'想你');});

test('打卡跨北京时间零点单独留存，当天更新保留首次时间且不能补打或伪造作者',async()=>{
  const {service,advance}=setup();await pair(service);
  await service.execute('checkIn',{mood:'开心',message:'早上'},A);
  const first=(await service.execute('getState',{},A)).checkins[0];advance(1000);
  await service.execute('checkIn',{mood:'想你',message:'晚上'},A);
  let current=(await service.execute('getState',{},A)).checkins[0];
  assert.equal(current.createdAt,first.createdAt);assert.ok(current.updatedAt>first.updatedAt);
  advance(12*3600000);
  await service.execute('checkIn',{mood:'平静',message:'新的一天',date:'2026-10-01',authorId:'forged'},A);
  assert.equal((await service.execute('getState',{},A)).checkins[0].date,'2026-10-27');
  const history=await service.execute('getCheckinHistory',{month:'2026-10'},B);
  assert.deepEqual(history.items.map(day=>day.date),['2026-10-27','2026-10-26']);
  assert.equal(history.items[1].records[0].message,'晚上');assert.equal(history.items[0].records[0].authorId,service.identify(A));
});

test('打卡历史分页不拆开双方、跨页不遗漏，非法日期和跨空间访问受限制',async()=>{
  const {service,advance}=setup();await pair(service);
  for(let i=0;i<8;i++){
    await service.execute('checkIn',{mood:'开心'},A);await service.execute('checkIn',{mood:'想你'},B);
    if(i<7)advance(86400000);
  }
  const october=await service.execute('getCheckinHistory',{month:'2026-10'},A);
  assert.equal(october.items.length,6);assert.ok(october.items.every(day=>day.records.length===2));assert.equal(october.cursor,'2026-10-24');
  const older=await service.execute('getCheckinHistory',{month:'2026-10',cursor:october.cursor},B);assert.equal(older.items.length,0);
  const november=await service.execute('getCheckinHistory',{month:'2026-11'},A);assert.equal(november.items.length,2);assert.equal(november.cursor,null);
  for(const payload of [{month:'2026-13'},{month:'2026-12'},{month:{}},{month:'2026-10',cursor:'2026-11-01'},{month:'2026-10',cursor:'2026-10-99'}])await assert.rejects(service.execute('getCheckinHistory',payload,A),{code:'INVALID'});
  await assert.rejects(service.execute('getCheckinHistory',{},C),{code:'UNPAIRED'});
  await service.execute('createSpace',{nickname:'第三人'},C);
  const foreign=await service.execute('getCheckinHistory',{month:'2026-10',spaceId:october.space.id},C);assert.equal(foreign.items.length,0);
});

test('兼容旧打卡，缺失的首次时间不伪造；历史读取不依赖全表扫描',async()=>{
  const {service,repository}=setup();await pair(service);await service.execute('checkIn',{mood:'开心'},A);
  const state=await service.execute('getState',{},A),record=state.checkins[0];delete record.createdAt;await repository.set('checkins',record.id,record);
  await service.execute('checkIn',{mood:'平静'},A);
  repository.list=()=>assert.fail('历史不应扫描其他集合');
  const page=await service.execute('getCheckinHistory',{month:'2026-10'},B);assert.equal(page.items[0].records[0].createdAt,null);
});
test('照片必须来自本次上传，其他成员的照片不能冒用',async()=>{const {service}=setup();await pair(service);const upload=await service.execute('prepareUpload',{extension:'jpg',size:4000},A);await assert.rejects(service.execute('completeUpload',{id:upload.id,fileId:'cloud://evil.bucket/'+upload.cloudPath},A),{code:'FORBIDDEN'});await assert.rejects(service.execute('completeUpload',{id:upload.id,fileId:'cloud://test-env.bucket/'+upload.cloudPath},B),{code:'FORBIDDEN'});await service.execute('completeUpload',{id:upload.id,fileId:'cloud://test-env.bucket/'+upload.cloudPath},A);await assert.rejects(service.execute('saveEntry',post({imageIds:[upload.id]}),B),{code:'FORBIDDEN'});const {id}=await service.execute('saveEntry',post({imageIds:[upload.id]}),A);const entry=await service.execute('getEntry',{id},B);assert.ok(entry.images[0].url.startsWith('https://'));assert.equal(entry.images[0].fileId,undefined);});
test('照片凭证过期，过大的照片和不支持格式被拒绝',async()=>{const {service,advance}=setup();await pair(service);await assert.rejects(service.execute('prepareUpload',{extension:'svg',size:20},A),{code:'INVALID'});await assert.rejects(service.execute('prepareUpload',{extension:'jpg',size:9*1024*1024},A),{code:'INVALID'});const upload=await service.execute('prepareUpload',{extension:'jpg',size:20},A);advance(3600001);await assert.rejects(service.execute('completeUpload',{id:upload.id,fileId:'cloud://test-env.bucket/'+upload.cloudPath},A),{code:'FORBIDDEN'});});
test('游标分页在相同时间戳的记录中也不会漏掉回忆',async()=>{const {service}=setup();await pair(service);for(let i=0;i<23;i++)await service.execute('saveEntry',post({requestId:'request-'+i}),A);const first=await service.execute('getState',{},A),second=await service.execute('getState',{cursor:first.cursor},B);assert.equal(first.entries.length,20);assert.equal(second.entries.length,3);assert.equal(new Set([...first.entries,...second.entries].map(e=>e.id)).size,23);});
test('对象型记录编号和动态键不会进入数据库 SDK',async()=>{const {service}=setup();await pair(service);await assert.rejects(service.execute('getEntry',{id:{$ne:null}},A),{code:'INVALID'});await assert.rejects(service.execute('saveEntry',post({imageIds:[{__proto__:{polluted:true}}]}),A),{code:'INVALID'});const payload=JSON.parse('{"__proto__":{"polluted":true},"title":"测试","body":"普通文字","date":"2026-10-26","imageIds":[],"requestId":"prototype-test"}');await service.execute('saveEntry',payload,A);assert.equal({}.polluted,undefined);});

test('单篇详情一次返回可信成员信息，不读取回忆列表或心愿',async()=>{
  const {service,repository}=setup();await pair(service);const saved=await service.execute('saveEntry',post(),A);
  repository.list=async()=>{throw Error('详情不应读取空间列表');};
  const view=await service.execute('getEntryView',{id:saved.id,actor:{id:'forged'}},B);
  assert.equal(view.actor.id,service.identify(B));assert.equal(view.entry.id,saved.id);assert.equal(view.space.members.length,2);assert.equal(view.space.inviteHash,undefined);
  await assert.rejects(service.execute('getEntryView',{id:saved.id},C),{code:'UNPAIRED'});
});

test('保存响应包含已提交记录，重复请求不新增且旧响应协议仍有效',async()=>{
  const {service,repository}=setup();await pair(service);repository.list=async()=>{throw Error('保存不应读取列表');};
  const payload=post({includeView:true}),a=await service.execute('saveEntry',payload,A),b=await service.execute('saveEntry',payload,A);
  assert.equal(a.view.entry.id,a.id);assert.equal(a.view.actor.id,service.identify(A));assert.equal(b.id,a.id);
  const stored=[...repository.data.keys()].filter(k=>k.startsWith('entries:'));assert.equal(stored.length,1);
  const legacy=await service.execute('saveEntry',post(),A);assert.deepEqual(Object.keys(legacy).sort(),['id','revision']);
});

test('保存已提交后签名链接失败仍返回成功且不泄露原始照片地址',async()=>{
  const {repository,service}=setup();await pair(service);const ticket=await service.execute('prepareUpload',{extension:'jpg',size:20},A);
  await service.execute('completeUpload',{id:ticket.id,fileId:'cloud://test-env.bucket/'+ticket.cloudPath},A);
  const failing=createService({repository,mediaUrls:async()=>{throw Error('temporary media failure');}});
  const saved=await failing.execute('saveEntry',post({imageIds:[ticket.id],includeView:true}),A);
  assert.equal(saved.view.entry.images[0].url,'');assert.equal(saved.view.entry.images[0].fileId,undefined);assert.equal(saved.view.entry.images[0].unavailable,true);
  assert.ok(await repository.get('entries',saved.id));assert.equal((await failing.execute('saveEntry',post({imageIds:[ticket.id],includeView:true}),A)).id,saved.id);
});

test('总览只读取一次用户，独立查询可并行，未授权前不发起列表查询',async()=>{
  const {service,repository}=setup();await pair(service);let userReads=0;const originalGet=repository.get.bind(repository),originalList=repository.list.bind(repository);
  repository.get=async(collection,id)=>{if(collection==='users')userReads++;return originalGet(collection,id);};
  let release;const wishesStarted=new Promise(resolve=>{release=resolve;});
  repository.list=async(collection,...args)=>{if(collection==='entries')await Promise.race([wishesStarted,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('查询仍为串行')),200);timer.unref();})]);if(collection==='wishes')release();return originalList(collection,...args);};
  await service.execute('getState',{},A);assert.equal(userReads,1);
  const key='spaces:'+(await service.execute('getContext',{},A)).space.id;repository.data.get(key).members=[];
  let queried=false;repository.list=async()=>{queried=true;return [];};await assert.rejects(service.execute('getState',{},A),{code:'FORBIDDEN'});assert.equal(queried,false);
});
