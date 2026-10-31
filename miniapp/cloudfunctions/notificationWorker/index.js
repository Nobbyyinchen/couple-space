// lib/ is generated from coupleApi by npm run prepare:notifications.
const cloud=require('wx-server-sdk');
const {createRepository}=require('./lib/repository');
const {createNotifications}=require('./lib/notifications');
const {createReminders}=require('./lib/reminders');
cloud.init({env:cloud.DYNAMIC_CURRENT_ENV});
const repository=createRepository(cloud.database());
const notifications=createNotifications({repository,sendMessage:message=>cloud.openapi.subscribeMessage.send(message)});
const reminders=createReminders({repository,notifications});
exports.main=async event=>{
  const context=cloud.getWXContext();
  if(context.OPENID||String(context.SOURCE||'').includes('wx_client')||event.Type!=='Timer'||!['coupleAnniversaryDaily','coupleNotificationRetry'].includes(event.TriggerName))throw Error('FORBIDDEN');
  const deadline=Date.now()+45000;
  await reminders.runDaily({allowStart:event.TriggerName==='coupleAnniversaryDaily',deadline});
  for(const status of ['pending','retry','sending']){
    const cursorId='notification-worker-'+status;let cursor=await repository.get('counts',cursorId)||{after:''};
    while(Date.now()<deadline){
      const jobs=await repository.scan('notificationDeliveries',{after:cursor.after,where:{status},limit:10});
      if(!jobs.length){await repository.set('counts',cursorId,{after:''});break;}
      for(const job of jobs){
        if(Date.now()>=deadline)return {continued:true};
        await notifications.deliver(job.id);cursor={after:job._id||job.id};await repository.set('counts',cursorId,cursor);
      }
    }
  }
  return {ok:true};
};
