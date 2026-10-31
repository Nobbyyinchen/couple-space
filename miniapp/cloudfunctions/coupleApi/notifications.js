const crypto=require('node:crypto');
const defaults=require('./notification-config');
const {forecast}=require('./periods');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const scenes=['comment','photo','anniversary','period','periodCare'];
const settings=user=>({anniversaryEnabled:user?.notificationSettings?.anniversaryEnabled===true,daysBefore:[0,1,3,7].includes(user?.notificationSettings?.daysBefore)?user.notificationSettings.daysBefore:0});
function invalid(condition,message='通知参数无效'){if(!condition)throw Object.assign(Error(message),{code:'INVALID'});}
function key(value){invalid(typeof value==='string'&&/^[a-f0-9]{64}$/.test(value));return value;}
function businessDate(timestamp){return new Intl.DateTimeFormat('en-CA',{timeZone:defaults.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(timestamp);}
function createNotifications({repository,now=Date.now,templates=defaults.templates,sendMessage=async()=>{throw Error('sender unavailable');}}){
  async function emit(tx,{space,recipientId,actorId='',scene,eventKey,title,summary='',targetId='',date=''}){
    if(!space.members.includes(recipientId)||recipientId===actorId)return [];
    const id=hash(JSON.stringify([space.id,scene,eventKey,recipientId]));
    if(await tx.get('notifications',id))return [id];
    const counterId='notifications-'+space.id+'-'+recipientId,counter=await tx.get('counts',counterId)||{sequence:0,unread:0};
    counter.sequence++;counter.unread++;
    const item={id,spaceId:space.id,recipientId,actorId,scene,eventKey,title,summary,targetId,date,actorName:space.profiles?.[actorId]?.nickname||'我们',sequence:counter.sequence,createdAt:now(),readAt:null};
    await tx.set('notifications',id,item);
    await tx.set('counts',counterId,counter);
    await tx.set('notificationDeliveries',id,{id,notificationId:id,spaceId:space.id,recipientId,scene,status:'pending',dueAt:now(),attempts:0,history:[],createdAt:now()});
    return [id];
  }
  async function summary(actor,space){const c=await repository.get('counts','notifications-'+space.id+'-'+actor);return {unread:c?.unread||0};}
  async function list(actor,space,payload){
    invalid(payload.cursor===undefined||Number.isSafeInteger(payload.cursor)&&payload.cursor>0);
    const items=await repository.list('notifications',{spaceId:space.id,recipientId:actor},{orderBy:'sequence',limit:20,before:payload.cursor});
    return {items:items.map(({eventKey,...item})=>item),cursor:items.length===20?items[19].sequence:null,...await summary(actor,space)};
  }
  async function markRead(tx,actor,space,id){
    const item=await tx.get('notifications',key(id));
    if(!item||item.recipientId!==actor||item.spaceId!==space.id)throw Object.assign(Error('通知不存在'),{code:'NOT_FOUND'});
    if(item.readAt===null){
      item.readAt=now();await tx.set('notifications',id,item);
      const counterId='notifications-'+space.id+'-'+actor,counter=await tx.get('counts',counterId)||{sequence:0,unread:0};
      counter.unread=Math.max(0,counter.unread-1);await tx.set('counts',counterId,counter);
    }
    return {ok:true};
  }
  async function preferences(tx,actor,user,payload){
    invalid(typeof payload.anniversaryEnabled==='boolean'&&[0,1,3,7].includes(payload.daysBefore));
    const value={anniversaryEnabled:payload.anniversaryEnabled,daysBefore:payload.daysBefore};
    await tx.set('users',actor,{...user,notificationSettings:value});return value;
  }
  function capabilities(){return scenes.map(scene=>({scene,configured:defaults.configured(scene,templates),templateId:defaults.configured(scene,templates)?templates[scene].templateId:''}));}
  async function prepare(tx,actor,user,space,payload,openid){
    invalid(scenes.includes(payload.scene));const t=templates[payload.scene];
    if(!defaults.configured(payload.scene,templates))throw Object.assign(Error('这个场景暂未配置审核通过的微信模板，站内通知正常使用'),{code:'SETUP'});
    const counterId='subscription-prompts-'+actor+'-'+businessDate(now()),counter=await tx.get('counts',counterId)||{count:0};
    if(counter.count>=20)throw Object.assign(Error('今天的订阅申请次数较多，请明天再试'),{code:'RATE_LIMIT'});
    counter.count++;await tx.set('counts',counterId,counter);
    const ticketId=crypto.randomBytes(32).toString('hex');
    await tx.set('requests',ticketId,{kind:'subscription',actorId:actor,spaceId:space.id,scene:payload.scene,templateId:t.templateId,expiresAt:now()+10*60000,recorded:false});
    // Only the OPENID received from the platform is persisted; never return it to clients.
    await tx.set('users',actor,{...user,notificationOpenId:openid});
    return {ticketId,templateId:t.templateId,expiresAt:now()+10*60000};
  }
  async function record(tx,actor,space,payload){
    const ticketId=key(payload.ticketId),ticket=await tx.get('requests',ticketId);
    invalid(ticket&&ticket.kind==='subscription'&&ticket.actorId===actor&&ticket.spaceId===space.id,'订阅申请不属于当前成员');
    if(ticket.recorded)return {ok:true};
    invalid(ticket.expiresAt>=now(),'订阅申请已过期，请重新点击');
    invalid(['accept','reject','ban','filter','fail'].includes(payload.result));
    await tx.set('notificationSubscriptions',ticketId,{id:ticketId,actorId:actor,spaceId:space.id,scene:ticket.scene,templateId:ticket.templateId,result:payload.result,state:payload.result==='accept'?'available':'unavailable',createdAt:now()});
    await tx.set('requests',ticketId,{...ticket,recorded:true});return {ok:true};
  }
  async function deliver(id){
    let claim;
    try{
      const preview=await repository.get('notificationDeliveries',id);
      let candidate;
      if(preview&&['pending','retry'].includes(preview.status)&&defaults.configured(preview.scene,templates)){
        const grants=await repository.list('notificationSubscriptions',{actorId:preview.recipientId,spaceId:preview.spaceId,templateId:templates[preview.scene].templateId,state:'available'},{orderBy:'createdAt',limit:1});
        candidate=grants[0];
      }
      claim=await repository.transaction(async tx=>{
        const job=await tx.get('notificationDeliveries',id);
        if(!job)return null;
        // A process may die after invoking WeChat. Never reclaim an expired sending lease.
        if(job.status==='sending'&&job.startedAt+60000<now()){
          if(job.grantId){const grant=await tx.get('notificationSubscriptions',job.grantId);if(grant?.state==='reserved'&&grant.deliveryId===id)await tx.set('notificationSubscriptions',grant.id,{...grant,state:'unknown'});}
          await tx.set('notificationDeliveries',id,{...job,status:'unknown',reason:'PROCESS_INTERRUPTED',updatedAt:now()});return null;
        }
        if(!['pending','retry'].includes(job.status)||job.dueAt>now())return null;
        const item=await tx.get('notifications',id),space=await tx.get('spaces',job.spaceId),user=await tx.get('users',job.recipientId);
        const stop=async reason=>{await tx.set('notificationDeliveries',id,{...job,status:'skipped',reason,updatedAt:now()});return null;};
        if(!item||!space||!space.members.includes(job.recipientId)||user?.spaceId!==space.id)return stop('MEMBERSHIP_CHANGED');
        if(item.actorId&&(!space.members.includes(item.actorId)||item.actorId===item.recipientId))return stop('MEMBERSHIP_CHANGED');
        if(item.targetId&&['comment','photo'].includes(item.scene)){
          const entry=await tx.get('entries',item.targetId);if(!entry||entry.deleted||entry.spaceId!==space.id)return stop('TARGET_UNAVAILABLE');
        }
        if(item.scene==='anniversary'&&!settings(user).anniversaryEnabled)return stop('REMINDER_DISABLED');
        const messageValues={...item};
        if(['period','periodCare'].includes(item.scene)){
          const members=await Promise.all(space.members.map(id=>tx.get('users',id)));
          const owner=members.find(member=>member?.spaceId===space.id&&member.periodTracker?.spaceId===space.id);
          const profile=owner?.periodTracker;
          if(!profile||item.scene==='periodCare'&&!profile.shared||owner.id!==item.recipientId&&!profile.shared)return stop('SHARING_DISABLED');
          if(item.scene==='period'&&!profile.reminderEnabled)return stop('REMINDER_DISABLED');
          if(item.scene==='period'){
            const today=businessDate(now()),prediction=forecast(profile,today);
            // Recalculate from the owner's current record. Old queued reminders must not
            // send a stale countdown after a date change or on the following day.
            if(!prediction||![0,profile.daysBefore].includes(prediction.remaining)||
              item.eventKey!==JSON.stringify([owner.id,prediction.lastStart,prediction.nextDate,today]))return stop('REMINDER_OUTDATED');
            messageValues.periodDaysRemaining=prediction.remaining;
          }
        }
        if(!defaults.configured(item.scene,templates))return stop('TEMPLATE_NOT_CONFIGURED');
        if(!user.notificationOpenId)return stop('OPENID_NOT_REGISTERED');
        if(job.attempts>=defaults.maxAttempts)return stop('ATTEMPTS_EXHAUSTED');
        const t=templates[item.scene];
        const environment=process.env.NOTIFICATION_MINIPROGRAM_STATE||'trial';
        if(!['developer','trial','formal'].includes(environment))return stop('INVALID_SEND_ENVIRONMENT');
        if(!candidate)return stop('NO_SUBSCRIPTION_CREDIT');
        const grant=await tx.get('notificationSubscriptions',candidate.id);
        if(!grant||grant.state!=='available'||grant.actorId!==job.recipientId||grant.spaceId!==space.id||grant.templateId!==t.templateId)return null; // Another transaction reserved it; leave this job pending.
        const data=defaults.templateData(t,messageValues);
        if(!data)return stop('INVALID_TEMPLATE_DATA');
        const page=['period','periodCare'].includes(item.scene)?'pages/period/index':item.targetId?`pages/detail/index?id=${encodeURIComponent(item.targetId)}`:'pages/notifications/index';
        const message={touser:user.notificationOpenId,templateId:t.templateId,data,page,miniprogramState:environment,lang:'zh_CN'};
        const next={...job,status:'sending',startedAt:now(),attempts:job.attempts+1,grantId:grant.id,templateId:t.templateId};
        await tx.set('notificationSubscriptions',grant.id,{...grant,state:'reserved',deliveryId:id});
        await tx.set('notificationDeliveries',id,next);return {job:next,grant,message};
      });
      if(!claim)return;
      let response,error,timer;
      try{response=await Promise.race([sendMessage(claim.message),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('SEND_TIMEOUT')),3000);})]);}catch(e){error=e;}finally{clearTimeout(timer);}
      const result=response||error||{},rawCode=result.errCode??result.errcode;
      const code=rawCode===undefined?null:Number(rawCode),success=!error&&code===0;
      // Only explicit non-delivery transient responses can be retried. Transport errors are ambiguous.
      const retryable=[-1,45009].includes(code),unknown=!success&&(code===null||!Number.isFinite(code));
      await repository.transaction(async tx=>{
        const job=await tx.get('notificationDeliveries',id);if(job?.status!=='sending'||job.attempts!==claim.job.attempts)return;
        const grant=await tx.get('notificationSubscriptions',claim.grant.id);
        const retry=retryable&&job.attempts<defaults.maxAttempts;
        await tx.set('notificationSubscriptions',grant.id,{...grant,state:success?'consumed':retryable?'available':unknown?'unknown':'unavailable'});
        await tx.set('notificationDeliveries',id,{...job,status:success?'sent':unknown?'unknown':retry?'retry':'failed',reason:success?'':unknown?'SEND_RESULT_UNKNOWN':'WECHAT_'+code,dueAt:now()+Math.min(3600000,60000*2**job.attempts),updatedAt:now(),history:[...job.history,{at:now(),code,success}].slice(-defaults.maxAttempts)});
      });
    }catch(error){console.error('notification delivery persistence failure',error.code||'INTERNAL');}
  }
  return {emit,summary,list,markRead,preferences,capabilities,prepare,record,deliver,settings};
}
module.exports={createNotifications,businessDate,settings};
