const crypto=require('node:crypto');
const {createNotifications}=require('./notifications');
const {createPeriods}=require('./periods');
const {history}=require('./checkin-history');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const clone=value=>JSON.parse(JSON.stringify(value));
const DAY=86400000;
function fail(code,message){throw Object.assign(new Error(message),{code});}
function check(condition,code,message){if(!condition)fail(code,message);}
function text(value,max,label){check(typeof value==='string'&&value.trim()&&value.length<=max,'INVALID',`${label}需要填写，最多 ${max} 字`);return value.trim();}
function date(value){check(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value),'INVALID','日期格式无效');const d=new Date(value+'T00:00:00Z');check(!isNaN(d.getTime())&&d.toISOString().slice(0,10)===value,'INVALID','日期不存在');return value;}
function recordId(value){check(typeof value==='string'&&/^[a-f0-9]{32}$/.test(value),'INVALID','记录编号无效');return value;}
const today=now=>new Date(now+8*3600000).toISOString().slice(0,10);
const unmeasured=async(_stage,work)=>work();
function createService({repository,now=Date.now,randomId=()=>crypto.randomUUID().replaceAll('-',''),randomCode=()=>Array.from(crypto.randomBytes(8),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join(''),mediaOrigin='',mediaUrls=async()=>({}),sendMessage,templates}){
  const notifications=createNotifications({repository,now,sendMessage,templates});
  const periods=createPeriods({repository,notifications,now});
  const identify=openid=>{check(typeof openid==='string'&&openid.length>=5,'AUTH','请从已登录的微信小程序进入');return sha(openid).slice(0,24);};
  async function inviteCode(tx){for(let i=0;i<5;i++){const code=randomCode();if(!(await tx.get('invites',sha(code))))return code;}fail('BUSY','邀请码暂时没有生成成功，请稍后重试');}
  async function membership(tx,actor,knownUser){const user=knownUser||await tx.get('users',actor);check(user&&user.spaceId,'UNPAIRED','请先创建或加入你们的空间');const space=await tx.get('spaces',user.spaceId);check(space&&space.members.includes(actor),'FORBIDDEN','你没有这个空间的访问权限');return {user,space};}
  function publicSpace(space){return {id:space.id,name:space.name,startDate:space.startDate,anniversaries:space.anniversaries||[],revision:space.revision,members:space.members.map(id=>({id,...space.profiles[id]})),paired:space.members.length===2};}
  function context(user,space,actor){return {actor:{id:actor,nickname:user.nickname},space:publicSpace(space)};}
  async function presentEntry(entry,measure=unmeasured,tolerateMediaFailure=false){
    let urls={};
    try{urls=await measure('media.urls',()=>mediaUrls((entry.images||[]).map(m=>m.fileId)));}
    catch(error){if(!tolerateMediaFailure)throw error;}
    return {...entry,images:(entry.images||[]).map(m=>({id:m.id,url:urls[m.fileId]||'',unavailable:!urls[m.fileId]}))};
  }
  async function getContext(actor,measure){
    const user=await measure('context.user',()=>repository.get('users',actor));
    if(!user||!user.spaceId)return {actor:{id:actor,nickname:user?.nickname||''},space:null};
    const {space}=await measure('context.space',()=>membership(repository,actor,user));
    return context(user,space,actor);
  }
  async function getState(actor,cursor,measure){
    const user=await measure('state.user',()=>repository.get('users',actor));
    if(!user||!user.spaceId)return {actor:{id:actor,nickname:user?.nickname||''},space:null,entries:[],wishes:[],checkins:[]};
    const {space}=await measure('state.membership',()=>membership(repository,actor,user));
    const day=today(now());
    const entriesTask=measure('state.entries',()=>repository.list('entries',{spaceId:space.id,deleted:false},{orderBy:'sequence',limit:20,before:cursor})).then(async entries=>{
      const urls=await measure('media.urls',()=>mediaUrls([...new Set(entries.flatMap(e=>(e.images||[]).map(m=>m.fileId)))]));
      return {entries:entries.map(e=>({...e,images:(e.images||[]).map(m=>({id:m.id,url:urls[m.fileId]||'',unavailable:!urls[m.fileId]}))})),cursor:entries.length===20?entries[entries.length-1].sequence:null};
    });
    const [page,wishes,checkins]=await Promise.all([entriesTask,measure('state.wishes',()=>repository.list('wishes',{spaceId:space.id,deleted:false},{orderBy:'createdAt',limit:100})),measure('state.checkins',()=>Promise.all(space.members.map(id=>repository.get('checkins',sha(space.id+day+id)))).then(items=>items.filter(Boolean)))]);
    return {...context(user,space,actor),...page,wishes,checkins};
  }
  async function attemptJoin(actor){await repository.transaction(async tx=>{const key=actor+'-'+Math.floor(now()/(15*60000)),attempt=await tx.get('attempts',key)||{count:0};check(attempt.count<10,'RATE_LIMIT','尝试次数较多，请 15 分钟后再试');await tx.set('attempts',key,{count:attempt.count+1,expiresAt:now()+30*60000});});}
  async function execute(action,payload={},openid,measure=unmeasured){
    const actor=identify(openid);
    if(action==='getContext')return getContext(actor,measure);
    if(action==='getState')return getState(actor,payload.cursor,measure);
    if(action==='getCheckinHistory'){
      const {user,space}=await membership(repository,actor);
      const page=await history(payload,{today:today(now()),readDay:day=>Promise.all(space.members.map(id=>repository.get('checkins',sha(space.id+day+id))))});
      return {...context(user,space,actor),...page};
    }
    if(action==='getPeriodState'){const {space}=await membership(repository,actor);return periods.state(actor,space);}
    if(['getNotificationSummary','getNotifications','getNotificationSettings'].includes(action)){
      const {user,space}=await membership(repository,actor);
      if(action==='getNotificationSummary')return notifications.summary(actor,space);
      if(action==='getNotifications')return notifications.list(actor,space,payload);
      return {settings:notifications.settings(user),scenes:notifications.capabilities()};
    }
    if(action==='getEntry'||action==='getEntryView'){
      const id=recordId(payload.id);
      const {user,space}=await measure('entry.membership',()=>membership(repository,actor)),entry=await measure('entry.read',()=>repository.get('entries',id));
      check(entry&&entry.spaceId===space.id&&!entry.deleted,'NOT_FOUND','这篇回忆不存在');
      const safe=await presentEntry(entry,measure);
      return action==='getEntry'?safe:{...context(user,space,actor),entry:safe};
    }
    if(action==='joinSpace')await attemptJoin(actor);
    const result=await measure('transaction',()=>repository.transaction(async tx=>{
      if(action==='createSpace'){
        const existing=await tx.get('users',actor);check(!existing?.spaceId,'ALREADY_PAIRED','你已经有自己的空间');
        const nickname=text(payload.nickname,20,'昵称'),name=text(payload.name||'情侣空间',40,'空间名称'),startDate=date(payload.startDate||'2025-02-14');
        const id=randomId(),code=await inviteCode(tx),inviteHash=sha(code),timestamp=now();
        const space={id,name,startDate,members:[actor],profiles:{[actor]:{nickname,joinedAt:timestamp}},anniversaries:[],revision:1,sequence:0,inviteHash,createdAt:timestamp};
        await tx.set('spaces',id,space);await tx.set('users',actor,{id:actor,nickname,spaceId:id,createdAt:timestamp});
        await tx.set('invites',inviteHash,{spaceId:id,expiresAt:timestamp+DAY,used:false});
        return {spaceId:id,inviteCode:code,expiresAt:timestamp+DAY};
      }
      if(action==='joinSpace'){
        const existing=await tx.get('users',actor);check(!existing?.spaceId,'ALREADY_PAIRED','你已经加入了一个空间');
        const code=String(payload.code||'').trim().toUpperCase();check(/^[A-HJ-NP-Z2-9]{8}$/.test(code),'INVITE','请输入 8 位邀请码');
        const inviteHash=sha(code),invite=await tx.get('invites',inviteHash);
        check(invite&&!invite.used&&invite.expiresAt>now(),'INVITE','邀请码无效或已经过期');
        const space=await tx.get('spaces',invite.spaceId);check(space&&space.inviteHash===inviteHash&&space.members.length===1,'INVITE','这个邀请码已经使用或失效');
        const nickname=text(payload.nickname,20,'昵称');space.members.push(actor);space.profiles[actor]={nickname,joinedAt:now()};space.revision++;space.inviteHash='';
        await tx.set('spaces',space.id,space);await tx.set('users',actor,{id:actor,nickname,spaceId:space.id,createdAt:now()});await tx.set('invites',inviteHash,{...invite,used:true});
        return {spaceId:space.id};
      }
      const {user,space}=await membership(tx,actor);
      if(['suggestPeriodSetup','savePeriodSettings','savePeriodRecord','deletePeriodRecord','sendPeriodCare'].includes(action))return periods.execute(tx,actor,space,payload,action);
      if(action==='readNotification')return notifications.markRead(tx,actor,space,payload.id);
      if(action==='updateNotificationSettings')return notifications.preferences(tx,actor,user,payload);
      if(action==='prepareSubscription')return notifications.prepare(tx,actor,user,space,payload,openid);
      if(action==='recordSubscription')return notifications.record(tx,actor,space,payload);
      if(action==='newInvite'){
        check(space.members.length===1,'FULL','你们已经完成绑定');const code=await inviteCode(tx),inviteHash=sha(code);space.inviteHash=inviteHash;space.revision++;
        await tx.set('spaces',space.id,space);await tx.set('invites',inviteHash,{spaceId:space.id,expiresAt:now()+DAY,used:false});return {inviteCode:code,expiresAt:now()+DAY};
      }
      if(action==='updateSpace'){
        check(payload.revision===space.revision,'CONFLICT','资料刚刚有更新，请刷新后再保存');
        space.name=text(payload.name,40,'空间名称');space.startDate=date(payload.startDate);
        check(Array.isArray(payload.anniversaries)&&payload.anniversaries.length<=30,'INVALID','纪念日最多 30 项');
        const anniversaryIds=new Set(['relationship']);
        space.anniversaries=payload.anniversaries.map(a=>{const id=a.id||randomId();check(typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id)&&!anniversaryIds.has(id),'INVALID','纪念日编号重复或无效');anniversaryIds.add(id);return {id,title:text(a.title,30,'纪念日名称'),date:date(a.date),recurring:a.recurring===true};});
        const nickname=text(payload.nickname,20,'昵称');space.profiles[actor].nickname=nickname;user.nickname=nickname;space.revision++;
        await tx.set('spaces',space.id,space);await tx.set('users',actor,user);return {revision:space.revision,context:context(user,space,actor)};
      }
      if(action==='prepareUpload'){
        check(/^cloud:\/\/[^/]+$/.test(mediaOrigin),'SETUP','请先配置云函数的 MEDIA_ORIGIN 云存储来源');
        check(['jpg','jpeg','png','webp'].includes(payload.extension),'INVALID','照片请使用 JPG、PNG 或 WebP');
        check(Number.isFinite(payload.size)&&payload.size>0&&payload.size<=8*1024*1024,'INVALID','单张照片最大 8MB');
        const id=randomId(),cloudPath=`couples/${space.id}/${actor}/${id}.${payload.extension}`;
        await tx.set('media',id,{id,spaceId:space.id,authorId:actor,cloudPath,state:'pending',expiresAt:now()+3600000});return {id,cloudPath};
      }
      if(action==='completeUpload'){
        const media=await tx.get('media',recordId(payload.id));check(media&&media.spaceId===space.id&&media.authorId===actor&&media.expiresAt>now(),'FORBIDDEN','上传凭证已经失效');
        check(payload.fileId===mediaOrigin+'/'+media.cloudPath,'FORBIDDEN','照片来源不属于本次上传');
        await tx.set('media',media.id,{...media,fileId:payload.fileId,state:'ready'});return {id:media.id};
      }
      if(action==='saveEntry'){
        const requestKey=sha(actor+text(payload.requestId,100,'请求编号'));
        const receipt=await tx.get('requests',requestKey);if(receipt){
          if(payload.includeView!==true)return {...receipt.result,_notificationIds:receipt.notificationIds||[]};
          const entry=await tx.get('entries',receipt.result.id);
          check(entry&&entry.spaceId===space.id&&!entry.deleted,'NOT_FOUND','这篇回忆不存在');
          return {...receipt.result,_notificationIds:receipt.notificationIds||[],view:{...context(user,space,actor),entry}};
        }
        const previous=payload.id?await tx.get('entries',recordId(payload.id)):null;
        if(payload.id){check(previous&&previous.spaceId===space.id&&!previous.deleted,'NOT_FOUND','这篇回忆不存在');check(previous.authorId===actor,'FORBIDDEN','只能修改自己发布的回忆');check(previous.revision===payload.revision,'CONFLICT','回忆已经更新，请刷新再编辑');}
        const title=typeof payload.title==='string'?payload.title.trim():'';check(title.length<=60,'INVALID','标题最多 60 字');
        const body=text(payload.body,5000,'想记住的话'),entryDate=date(payload.date);
        check(Array.isArray(payload.imageIds)&&payload.imageIds.length<=9,'INVALID','每篇最多 9 张照片');
        const images=[];for(const id of [...new Set(payload.imageIds)]){const media=await tx.get('media',recordId(id));check(media&&media.spaceId===space.id&&media.authorId===actor&&media.state==='ready','FORBIDDEN','照片不可用于这篇记录');images.push({id:media.id,fileId:media.fileId});}
        const id=previous?.id||randomId();if(!previous){space.sequence++;await tx.set('spaces',space.id,space);}
        const entry={id,spaceId:space.id,authorId:actor,title,body,date:entryDate,images,revision:(previous?.revision||0)+1,sequence:previous?.sequence||space.sequence,createdAt:previous?.createdAt||now(),updatedAt:now(),likedBy:previous?.likedBy||[],comments:previous?.comments||[],deleted:false};
        await tx.set('entries',id,entry);
        const addedImages=images.filter(image=>!(previous?.images||[]).some(old=>old.id===image.id));
        let notificationIds=[];
        const partner=space.members.find(member=>member!==actor);
        if(partner&&addedImages.length)notificationIds=await notifications.emit(tx,{space,recipientId:partner,actorId:actor,scene:'photo',eventKey:JSON.stringify([id,entry.revision,addedImages.map(m=>m.id).sort()]),title:'TA 收藏了新的照片',summary:`${addedImages.length} 张照片，留在我们的回忆里。`,targetId:id,date:entry.date});
        const result={id,revision:entry.revision};await tx.set('requests',requestKey,{spaceId:space.id,result,notificationIds,createdAt:now()});return {...result,_notificationIds:notificationIds,...(payload.includeView===true?{view:{...context(user,space,actor),entry}}:{})};
      }
      if(action==='likeEntry'||action==='commentEntry'){
        const entry=await tx.get('entries',recordId(payload.id));check(entry&&entry.spaceId===space.id&&!entry.deleted,'NOT_FOUND','回忆不存在');
        if(action==='likeEntry'){check(typeof payload.liked==='boolean','INVALID','喜欢状态无效');const liked=new Set(entry.likedBy||[]);if(payload.liked)liked.add(actor);else liked.delete(actor);entry.likedBy=[...liked];}
        else{
          // Old clients without requestId remain compatible; new clients retain it across retries.
          const requestKey=payload.requestId?sha('comment:'+actor+text(payload.requestId,100,'请求编号')):null;
          const receipt=requestKey&&await tx.get('requests',requestKey);
          if(receipt){check(receipt.entryId===entry.id,'INVALID','留言请求编号已被使用');return {ok:true,_notificationIds:receipt.notificationIds||[]};}
          check((entry.comments||[]).length<50,'LIMIT','这篇回忆的留言已满');
          const comment={id:randomId(),authorId:actor,body:text(payload.body,500,'留言'),createdAt:now()};entry.comments.push(comment);
          const partner=space.members.find(member=>member!==actor);
          const notificationIds=partner?await notifications.emit(tx,{space,recipientId:partner,actorId:actor,scene:'comment',eventKey:comment.id,title:'TA 给你留了一句悄悄话',summary:comment.body.slice(0,80),targetId:entry.id,date:today(now())}):[];
          await tx.set('entries',entry.id,entry);
          if(requestKey)await tx.set('requests',requestKey,{spaceId:space.id,entryId:entry.id,result:{ok:true},notificationIds,createdAt:now()});
          return {ok:true,_notificationIds:notificationIds};
        }
        await tx.set('entries',entry.id,entry);return {ok:true};
      }
      if(action==='saveWish'){
        const old=payload.id?await tx.get('wishes',recordId(payload.id)):null;
        if(payload.id){check(old&&old.spaceId===space.id&&!old.deleted,'NOT_FOUND','心愿不存在');check(old.revision===payload.revision,'CONFLICT','心愿已经更新，请刷新');check(typeof payload.done==='boolean','INVALID','心愿状态无效');}
        else{check((await tx.get('counts','wishes-'+space.id)||{count:0}).count<100,'LIMIT','最多保存 100 个心愿');const count=await tx.get('counts','wishes-'+space.id)||{count:0};await tx.set('counts','wishes-'+space.id,{count:count.count+1});}
        const id=old?.id||randomId(),wish={id,spaceId:space.id,authorId:old?.authorId||actor,text:old?.text||text(payload.text,100,'心愿'),done:old?payload.done:false,revision:(old?.revision||0)+1,createdAt:old?.createdAt||now(),completedAt:old?(payload.done?now():null):null,deleted:false};
        await tx.set('wishes',id,wish);return {id,revision:wish.revision};
      }
      if(action==='checkIn'){
        check(['开心','想你','平静','有点累','需要抱抱'].includes(payload.mood),'INVALID','请选择今天的心情');
        const message=typeof payload.message==='string'?payload.message.trim():'';check(message.length<=200,'INVALID','近况最多 200 字');
        const timestamp=now(),day=today(timestamp),id=sha(space.id+day+actor),old=await tx.get('checkins',id);
        await tx.set('checkins',id,{id,spaceId:space.id,authorId:actor,date:day,mood:payload.mood,message,createdAt:old?(old.createdAt??null):timestamp,updatedAt:timestamp});return {ok:true};
      }
      fail('ACTION','不支持这个操作');
    }));
    // All external delivery happens after commit; failure must never reverse business success.
    const {_notificationIds=[],...publicResult}=result;
    for(const id of _notificationIds)await notifications.deliver(id);
    if(action==='saveEntry'&&payload.includeView===true&&publicResult.view)return {...publicResult,view:{...publicResult.view,entry:await presentEntry(publicResult.view.entry,measure,true)}};
    return publicResult;
  }
  return {execute,identify};
}
module.exports={createService,sha,clone};
