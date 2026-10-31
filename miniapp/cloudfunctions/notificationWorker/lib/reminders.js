const {businessDate,settings}=require('./notifications');
const {createPeriods}=require('./periods');
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value;}
function occurrence(anniversary,target){
  if(!validDate(anniversary.date))return false;
  if(!anniversary.recurring)return anniversary.date===target;
  const year=target.slice(0,4),md=anniversary.date.slice(5)==='02-29'&&!validDate(year+'-02-29')?'02-28':anniversary.date.slice(5);
  return year+'-'+md===target;
}
function createReminders({repository,notifications,now=Date.now}){
  const periods=createPeriods({repository,notifications,now});
  async function forSpace(id){
    const snapshot=await repository.get('spaces',id);if(!snapshot||snapshot.members.length!==2)return [];
    const ids=[];
    // At most 31 notifications per recipient transaction, keeping the document set bounded.
    for(const recipientId of snapshot.members){
      ids.push(...await repository.transaction(async tx=>{
        const space=await tx.get('spaces',id);if(!space||space.members.length!==2||!space.members.includes(recipientId))return [];
        const user=await tx.get('users',recipientId),pref=settings(user);
        if(user?.spaceId!==space.id||!pref.anniversaryEnabled)return [];
        const result=[],dates=[{id:'relationship',title:'相恋纪念日',date:space.startDate,recurring:true},...(space.anniversaries||[])];
        const target=new Date(Date.parse(businessDate(now())+'T00:00:00Z')+pref.daysBefore*86400000).toISOString().slice(0,10);
        for(const anniversary of dates){
          if(!occurrence(anniversary,target))continue;
          result.push(...await notifications.emit(tx,{space,recipientId,scene:'anniversary',eventKey:JSON.stringify([anniversary.id,target,pref.daysBefore]),title:anniversary.title,summary:pref.daysBefore?`${pref.daysBefore} 天后，是我们放在心上的日子。`:'今天，是我们放在心上的日子。',date:target}));
        }
        return result;
      }));
    }
    ids.push(...await repository.transaction(async tx=>{const space=await tx.get('spaces',id);return space?periods.forSpace(tx,space):[];}));
    return ids;
  }
  async function runDaily({allowStart=false,deadline=now()+40000}={}){
    const day=businessDate(now()),checkpointId='anniversary-scan-'+day;
    let state=await repository.get('counts',checkpointId);
    if(!state&&!allowStart)return;
    state=state||{after:'',complete:false,failures:0};
    if(state.complete||state.failures>=3)return;
    try{
      await repository.set('counts',checkpointId,state);
      while(now()<deadline){
        const spaces=await repository.scan('spaces',{after:state.after,limit:10});
        if(!spaces.length){await repository.set('counts',checkpointId,{...state,complete:true});return;}
        for(const space of spaces){
          if(now()>=deadline)return;
          const ids=await forSpace(space.id);
          state={...state,after:space._id||space.id};await repository.set('counts',checkpointId,state);
          for(const id of ids){if(now()>=deadline)break;await notifications.deliver(id);}
        }
      }
    }catch(error){
      await repository.set('counts',checkpointId,{...state,failures:state.failures+1,lastError:String(error.code||error.errCode||'DATABASE_FAILURE'),failedAt:now()});
      throw error;
    }
  }
  return {forSpace,runDaily};
}
module.exports={createReminders,occurrence};
