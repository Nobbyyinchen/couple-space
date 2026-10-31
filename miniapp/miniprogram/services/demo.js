const config=require('../config');
const dates=require('../utils/dates');
const {createPeriods}=require('./period-core');
const {history}=require('./checkin-history');
const KEY='our-universe:mini:demo:v1';
const makeId=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
function initial(){const time=Date.now();return {actorId:'demo-partner-a',space:{id:'demo-space',name:config.siteName,startDate:config.startDate,paired:true,revision:1,members:[{id:'demo-partner-a',nickname:config.names[0]},{id:'demo-partner-b',nickname:config.names[1]}],anniversaries:[{id:'demo-date',title:'一起看日落的约定',date:dates.today(time+12*86400000),recurring:false}]},entries:[{id:'demo-memory-1',authorId:'demo-partner-a',title:'一颗小宇，一条小宙',body:config.description+'\n\n这是示例回忆。以后可以在这里发一张照片，写一句今天的小开心，让另一半也看见。',date:dates.today(),images:[{id:'sample-sea',url:'/assets/sample-sea.png'}],createdAt:time-3600000,updatedAt:time-3600000,sequence:2,revision:1,likedBy:['demo-partner-b'],comments:[{id:'demo-comment',authorId:'demo-partner-b',body:'这里会慢慢装满我们的回忆 ♡',createdAt:time-1800000}]},{id:'demo-memory-2',authorId:'demo-partner-b',title:'今天，也有在想你',body:'演示内容，不是自动读取的真实经历。你可以试着发布日记、点亮心愿，或切换演示身份体验留言。',date:dates.today(time-86400000),images:[],createdAt:time-86400000,updatedAt:time-86400000,sequence:1,revision:1,likedBy:[],comments:[]}],wishes:[{id:'demo-wish-1',text:'一起去海边，等一场蓝色日落',done:false,revision:1,createdAt:time},{id:'demo-wish-2',text:'做一顿两个人都喜欢的晚餐',done:false,revision:1,createdAt:time-1},{id:'demo-wish-3',text:'每年在同一个地方拍一张合照',done:false,revision:1,createdAt:time-2}],checkins:[{authorId:'demo-partner-b',date:dates.today(),mood:'想你',message:'这是示例近况，等你的第一条真实分享。',updatedAt:time-1800000}],receipts:{}};}
function load(){const state=wx.getStorageSync(KEY);return state&&state.space?state:initial();}
function persist(state){wx.setStorageSync(KEY,state);}
function snapshot(state){return {...state,actor:{id:state.actorId,nickname:state.space.members.find(m=>m.id===state.actorId).nickname},cursor:null,demo:true};}
async function execute(action,payload={}){
  const state=load(),actor=state.actorId;
  if(action==='getCheckinHistory'){
    const page=await history(payload,{today:dates.today(),readDay:async day=>state.checkins.filter(record=>record.date===day)});
    const view=snapshot(state);return {actor:view.actor,space:view.space,...page};
  }
  state.notifications=state.notifications||[];state.notificationSettings=state.notificationSettings||{};
  const emit=(scene,eventKey,targetId,summary)=>{
    const recipientId=state.space.members.find(m=>m.id!==actor)?.id;
    const id=scene+':'+eventKey+':'+recipientId;if(!recipientId||state.notifications.some(n=>n.id===id))return;
    state.notifications.unshift({id,recipientId,scene,targetId,title:scene==='comment'?'TA 给你留了一句悄悄话':'TA 收藏了新的照片',summary,createdAt:Date.now(),sequence:Math.max(0,...state.notifications.map(n=>n.sequence))+1,readAt:null});
  };
  const mine=()=>state.notifications.filter(n=>n.recipientId===actor);
  if(action==='getNotificationSummary')return {unread:mine().filter(n=>n.readAt===null).length};
  if(action==='getNotifications'){const all=mine().filter(n=>!payload.cursor||n.sequence<payload.cursor),items=all.slice(0,20);return {items,unread:mine().filter(n=>n.readAt===null).length,cursor:all.length>20?items[19].sequence:null};}
  if(action==='getNotificationSettings')return {settings:state.notificationSettings[actor]||{anniversaryEnabled:false,daysBefore:0},scenes:['comment','photo','anniversary','period','periodCare'].map(scene=>({scene,configured:false,templateId:''}))};
  if(['getPeriodState','suggestPeriodSetup','savePeriodSettings','savePeriodRecord','deletePeriodRecord','sendPeriodCare'].includes(action)){
    state.periodUsers=state.periodUsers||Object.fromEntries(state.space.members.map(m=>[m.id,{id:m.id,spaceId:state.space.id}]));
    const space={...state.space,members:state.space.members.map(m=>m.id),profiles:Object.fromEntries(state.space.members.map(m=>[m.id,{nickname:m.nickname}]))};
    const repository={get:async(c,id)=>c==='users'?state.periodUsers[id]:null,set:async(c,id,value)=>{if(c==='users')state.periodUsers[id]=value;}};
    const notifications={emit:async(_tx,item)=>{const id=item.scene+':'+item.eventKey+':'+item.recipientId;if(!state.notifications.some(n=>n.id===id))state.notifications.unshift({...item,id,createdAt:Date.now(),sequence:Math.max(0,...state.notifications.map(n=>n.sequence))+1,readAt:null});return [id];}};
    const periods=createPeriods({repository,notifications});
    if(action==='getPeriodState')return periods.state(actor,space);
    const result=await periods.execute(repository,actor,space,payload,action);persist(state);return {ok:result.ok};
  }
  if(action==='updateNotificationSettings'){state.notificationSettings[actor]={anniversaryEnabled:payload.anniversaryEnabled,daysBefore:payload.daysBefore};persist(state);return state.notificationSettings[actor];}
  if(action==='readNotification'){const item=mine().find(n=>n.id===payload.id);if(!item)throw Error('通知不存在');item.readAt=Date.now();persist(state);return {ok:true};}
  if(action==='getState')return snapshot(state);
  if(action==='getContext'){const {actor,space}=snapshot(state);return {actor,space};}
  if(action==='getEntry'||action==='getEntryView'){const entry=state.entries.find(e=>e.id===payload.id);if(!entry)throw Error('这篇回忆没有找到');const {actor,space}=snapshot(state);return action==='getEntry'?entry:{actor,space,entry};}
  if(action==='switchActor'){state.actorId=state.actorId==='demo-partner-a'?'demo-partner-b':'demo-partner-a';persist(state);return {};}
  if(action==='resetDemo'){persist(initial());return {};}
  if(action==='saveEntry'){
    if(state.receipts[payload.requestId]){const result=state.receipts[payload.requestId],entry=state.entries.find(e=>e.id===result.id),{actor,space}=snapshot(state);return payload.includeView?{...result,view:{actor,space,entry}}:result;}
    const old=state.entries.find(e=>e.id===payload.id);
    if(old&&old.authorId!==actor)throw Error('只能编辑自己发布的手记');
    if(old&&old.revision!==payload.revision)throw Error('手记已更新，请重新打开');
    if(!payload.body?.trim())throw Error('先写一句想记住的话吧');
    const entry={id:old?.id||makeId(),authorId:actor,title:payload.title||'',body:payload.body,date:payload.date,images:payload.demoImages||[],revision:(old?.revision||0)+1,sequence:old?.sequence||Math.max(0,...state.entries.map(e=>e.sequence))+1,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now(),likedBy:old?.likedBy||[],comments:old?.comments||[]};
    if(entry.images.some(image=>!(old?.images||[]).some(previous=>previous.id===image.id)))emit('photo',entry.id+':'+entry.revision,entry.id,'TA 发布了新的照片，去回忆里看看吧。');
    if(old)state.entries=state.entries.map(e=>e.id===old.id?entry:e);else state.entries.unshift(entry);
    state.receipts[payload.requestId]={id:entry.id,revision:entry.revision};persist(state);const result=state.receipts[payload.requestId],view=snapshot(state);return payload.includeView?{...result,view:{actor:view.actor,space:view.space,entry}}:result;
  }
  if(action==='likeEntry'){const entry=state.entries.find(e=>e.id===payload.id);if(!entry)throw Error('回忆不存在');const liked=new Set(entry.likedBy);if(payload.liked)liked.add(actor);else liked.delete(actor);entry.likedBy=[...liked];}
  else if(action==='commentEntry'){const receipt='comment:'+actor+':'+payload.requestId;if(payload.requestId&&state.receipts[receipt])return {ok:true};const entry=state.entries.find(e=>e.id===payload.id);if(!entry)throw Error('回忆不存在');if(!payload.body?.trim())throw Error('先写一句留言吧');const comment={id:makeId(),authorId:actor,body:payload.body.trim(),createdAt:Date.now()};entry.comments.push(comment);emit('comment',comment.id,entry.id,comment.body);if(payload.requestId)state.receipts[receipt]={ok:true};}
  else if(action==='saveWish'){const old=state.wishes.find(w=>w.id===payload.id);if(old){if(old.revision!==payload.revision)throw Error('心愿已更新，请刷新');old.done=payload.done;old.revision++;old.completedAt=payload.done?Date.now():null;}else{if(!payload.text?.trim())throw Error('先写下一个心愿');state.wishes.unshift({id:makeId(),text:payload.text.trim(),done:false,revision:1,createdAt:Date.now()});}}
  else if(action==='checkIn'){const timestamp=Date.now(),day=dates.today(timestamp),old=state.checkins.find(c=>c.authorId===actor&&c.date===day);state.checkins=state.checkins.filter(c=>c.authorId!==actor||c.date!==day);state.checkins.push({authorId:actor,date:day,mood:payload.mood,message:payload.message||'',createdAt:old?(old.createdAt??null):timestamp,updatedAt:timestamp});}
  else if(action==='updateSpace'){if(state.space.revision!==payload.revision)throw Error('资料已经更新');state.space={...state.space,name:payload.name,startDate:payload.startDate,anniversaries:payload.anniversaries,revision:state.space.revision+1};state.space.members=state.space.members.map(m=>m.id===actor?{...m,nickname:payload.nickname}:m);}
  else throw Error('此操作需要配置真实的小程序云开发环境');
  persist(state);if(action==='updateSpace'){const {actor,space}=snapshot(state);return {ok:true,context:{actor,space}};}return {ok:true};
}
module.exports={execute,KEY};
