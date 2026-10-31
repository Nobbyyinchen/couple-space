// Canonical period model. Copied to the worker and demo client by prepare:notifications.
// Dates are calendar days in Asia/Shanghai, not the runtime's default timezone.
const DAY=86400000;
const day=time=>new Date(time+8*3600000).toISOString().slice(0,10);
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const shift=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);
const distance=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/DAY);
function check(value,code,message){if(!value)throw Object.assign(Error(message),{code});}
function forecast(profile,today){
  const latest=[...(profile.records||[])].sort((a,b)=>b.startDate.localeCompare(a.startDate))[0];
  if(!latest)return null;
  const nextDate=shift(latest.startDate,profile.cycleDays),remaining=distance(today,nextDate),elapsed=distance(latest.startDate,today)+1;
  return {lastStart:latest.startDate,nextDate,remaining,elapsed,unconfirmed:remaining<0,open:!latest.endDate};
}
function createPeriods({repository,notifications,now=Date.now}){
  async function members(tx,space){return Promise.all(space.members.map(async id=>({id,user:await tx.get('users',id)})));}
  async function locate(tx,space){
    const all=await members(tx,space),owners=all.filter(m=>m.user?.spaceId===space.id&&m.user.periodTracker?.spaceId===space.id);
    check(owners.length<=1,'CONFLICT','记录归属需要核对，请联系空间创建者');
    return {all,owner:owners[0]};
  }
  function present(actor,space,all,owner){
    if(!owner){
      const self=all.find(m=>m.id===actor)?.user,incoming=self?.periodSuggestion,outgoing=all.find(m=>m.id!==actor)?.user?.periodSuggestion;
      const suggestion=incoming?.spaceId===space.id?{startDate:incoming.startDate,cycleDays:incoming.cycleDays}:null;
      const waiting=outgoing?.spaceId===space.id&&outgoing.fromId===actor;
      return {available:false,canEnable:!waiting,waiting,suggestion,today:day(now())};
    }
    const own=owner.id===actor,profile=owner.user.periodTracker;
    if(!own&&!profile.shared)return {available:false,canEnable:false,private:true,today:day(now())};
    return {available:true,own,ownerName:space.profiles[owner.id]?.nickname||'TA',partnerName:space.profiles[space.members.find(id=>id!==owner.id)]?.nickname||'TA',today:day(now()),revision:profile.revision,shared:profile.shared,reminderEnabled:profile.reminderEnabled,daysBefore:profile.daysBefore,cycleDays:profile.cycleDays,durationDays:profile.durationDays,records:profile.records,forecast:forecast(profile,day(now()))};
  }
  async function state(actor,space){const {all,owner}=await locate(repository,space);return present(actor,space,all,owner);}
  async function execute(tx,actor,space,payload,action){
    const {all,owner}=await locate(tx,space),self=all.find(m=>m.id===actor)?.user;
    check(space.members.length===2,'UNPAIRED','请先完成双人绑定，再开启这份记录');
    if(action==='suggestPeriodSetup'){
      check(!owner,'CONFLICT','记录已经开启，请刷新查看');
      check(validDate(payload.startDate)&&payload.startDate<=day(now()),'INVALID','请填写实际开始日期，不能是未来日期');
      const partner=all.find(m=>m.id!==actor);
      check(partner?.user?.spaceId===space.id,'FORBIDDEN','情侣关系已变化');
      check(!self.periodSuggestion||self.periodSuggestion.spaceId!==space.id,'CONFLICT','请先确认对方为你准备的记录');
      await tx.set('users',partner.id,{...partner.user,periodSuggestion:{spaceId:space.id,fromId:actor,startDate:payload.startDate,cycleDays:25,createdAt:now()}});
      return {ok:true};
    }
    if(action==='savePeriodSettings'){
      check(!owner||owner.id===actor,'FORBIDDEN','只有记录者本人可以修改');
      if(!owner){
        check(payload.confirmed===true,'INVALID','请先确认这是自己的记录和共享选择');
        check(!all.some(m=>m.id!==actor&&m.user?.periodSuggestion?.spaceId===space.id&&m.user.periodSuggestion.fromId===actor),'FORBIDDEN','请由另一半在自己的账号确认开启');
      }
      const old=self.periodTracker?.spaceId===space.id?self.periodTracker:null;
      check((old?.revision||0)===payload.revision,'CONFLICT','记录已更新，请刷新后再试');
      check(Number.isInteger(payload.cycleDays)&&payload.cycleDays>=15&&payload.cycleDays<=60,'INVALID','周期请填 15–60 天');
      check(Number.isInteger(payload.durationDays)&&payload.durationDays>=1&&payload.durationDays<=15&&payload.durationDays<payload.cycleDays,'INVALID','持续天数请填 1–15 天，且小于周期');
      check(typeof payload.shared==='boolean'&&typeof payload.reminderEnabled==='boolean'&&[0,1,2,3,7].includes(payload.daysBefore),'INVALID','请检查共享及提醒设置');
      if(!old&&payload.startDate)check(validDate(payload.startDate)&&payload.startDate<=day(now()),'INVALID','首次开始日期无效');
      const records=old?.records||(!old&&payload.startDate?[{id:payload.startDate,startDate:payload.startDate,endDate:''}]:[]);
      const profile={spaceId:space.id,cycleDays:payload.cycleDays,durationDays:payload.durationDays,shared:payload.shared,reminderEnabled:payload.reminderEnabled,daysBefore:payload.daysBefore,records,revision:(old?.revision||0)+1,updatedAt:now()};
      await tx.set('users',actor,{...self,periodTracker:profile,periodSuggestion:null});return {ok:true};
    }
    check(owner,'NOT_FOUND','请先由记录者开启');
    const profile=owner.user.periodTracker;
    if(action==='sendPeriodCare'){
      check(owner.id!==actor&&profile.shared,'FORBIDDEN','共享开启后，另一半可以送出关怀');
      const texts={company:'今天辛苦啦，想休息的时候我陪着你。',rest:'今天可以慢一点，想让我帮忙就告诉我。',hug:'给你一个轻轻的拥抱，我一直在。'};
      check(Object.prototype.hasOwnProperty.call(texts,payload.kind),'INVALID','请选择一句关怀');
      const ids=await notifications.emit(tx,{space,recipientId:owner.id,actorId:actor,scene:'periodCare',eventKey:day(now()),title:'TA 送来一份温柔关怀',summary:texts[payload.kind]});
      return {ok:true,_notificationIds:ids};
    }
    check(owner.id===actor,'FORBIDDEN','只有记录者本人可以修改');
    check(payload.revision===profile.revision,'CONFLICT','记录已更新，请刷新后再试');
    let records=[...profile.records];
    if(action==='deletePeriodRecord'){
      check(records.some(r=>r.id===payload.id),'NOT_FOUND','这条记录不存在');records=records.filter(r=>r.id!==payload.id);
    }else{
      check(action==='savePeriodRecord','ACTION','不支持这个操作');
      check(validDate(payload.startDate)&&payload.startDate<=day(now()),'INVALID','开始日期应为实际日期，不能在未来');
      const end=payload.endDate||'';
      check(!end||validDate(end)&&end>=payload.startDate&&end<=day(now())&&distance(payload.startDate,end)<20,'INVALID','结束日期应在开始之后、今天之前，单次最多记录 20 天');
      if(payload.id)check(records.some(r=>r.id===payload.id),'NOT_FOUND','这条记录已变化');
      records=records.filter(r=>r.id!==payload.id);
      check(records.length<60,'LIMIT','最多保留 60 次记录，请先整理旧记录');
      const finish=end||shift(payload.startDate,profile.durationDays-1);
      check(!records.some(r=>payload.startDate<=(r.endDate||shift(r.startDate,profile.durationDays-1))&&finish>=r.startDate),'INVALID','日期与已有记录重叠，请编辑原记录');
      records.push({id:payload.startDate,startDate:payload.startDate,endDate:end});records.sort((a,b)=>b.startDate.localeCompare(a.startDate));
    }
    await tx.set('users',actor,{...self,periodTracker:{...profile,records,revision:profile.revision+1,updatedAt:now()}});return {ok:true};
  }
  async function forSpace(tx,space){
    if(space.members.length!==2)return [];
    const {all,owner}=await locate(tx,space);if(!owner)return [];
    const p=owner.user.periodTracker,f=forecast(p,day(now()));if(!p.reminderEnabled||!f||![0,p.daysBefore].includes(f.remaining))return [];
    const ids=[];
    for(const member of all){
      if(member.user?.spaceId!==space.id||member.id!==owner.id&&!p.shared)continue;
      ids.push(...await notifications.emit(tx,{space,recipientId:member.id,scene:'period',eventKey:JSON.stringify([owner.id,f.lastStart,f.nextDate,day(now())]),title:'一份温柔的小提醒',summary:member.id===owner.id?'今天也记得留一点时间，照顾自己的感受。':'今天记得多一点陪伴，给 TA 一份温柔关怀。'}));
    }
    return ids;
  }
  return {state,execute,forSpace};
}
module.exports={createPeriods,forecast,validDate,day,shift,distance};
