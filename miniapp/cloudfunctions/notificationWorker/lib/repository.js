function isMissing(error){return /document.*(not exist|not found|does not exist)|文档不存在/i.test(error.errMsg||error.message||'')||error.errCode===-502005;}
function createRepository(database){
  function wrapper(client){return {
    async get(collection,id){try{const result=await client.collection(collection).doc(id).get();return result.data?{...result.data}:null;}catch(error){if(isMissing(error))return null;throw error;}},
    async set(collection,id,value){const {_id,...data}=value;await client.collection(collection).doc(id).set({data});},
    async list(collection,where,{orderBy='createdAt',limit=20,before}={}){
      const query={...where};if(Number.isFinite(before))query[orderBy]=database.command.lt(before);
      const result=await client.collection(collection).where(query).orderBy(orderBy,'desc').limit(limit).get();return result.data||[];
    }
  };}
  const repository=wrapper(database);
  repository.scan=async(collection,{after='',limit=25,where={}}={})=>{
    const query={...where};if(after)query._id=database.command.gt(after);
    const result=await database.collection(collection).where(query).orderBy('_id','asc').limit(limit).get();return result.data||[];
  };
  repository.transaction=async callback=>{
    for(let attempt=0;attempt<3;attempt++){
      const transaction=await database.startTransaction();
      try{const result=await callback(wrapper(transaction));await transaction.commit();return result;}catch(error){
        try{await transaction.rollback();}catch{}
        const conflict=/transaction.*conflict|conflict.*transaction|事务.*冲突|WriteConflict|TRANSACTION_CONFLICT/i.test(error.errMsg||error.message||'');
        if(!conflict||attempt===2)throw error;
        await new Promise(resolve=>setTimeout(resolve,30*(attempt+1)));
      }
    }
  };
  return repository;
}
module.exports={createRepository};
