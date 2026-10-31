const moduleStarted=Date.now();
const cloud=require('wx-server-sdk');
const {createRepository}=require('./repository');
const {createService}=require('./domain');
cloud.init({env:cloud.DYNAMIC_CURRENT_ENV});
const service=createService({
  repository:createRepository(cloud.database()),
  mediaOrigin:process.env.MEDIA_ORIGIN||'',
  sendMessage:message=>cloud.openapi.subscribeMessage.send(message),
  async mediaUrls(fileIds){
    if(!fileIds.length)return {};
    const urls={};
    for(let offset=0;offset<fileIds.length;offset+=50){
      const result=await cloud.getTempFileURL({fileList:fileIds.slice(offset,offset+50).map(fileID=>({fileID,maxAge:300}))});
      for(const item of result.fileList)if(item.status===0&&item.tempFileURL)urls[item.fileID]=item.tempFileURL;
    }
    return urls;
  }
});
const initializationMs=Date.now()-moduleStarted;
let firstInvocation=true;
exports.main=async event=>{
  const started=Date.now(),stages={};
  const timing={firstInvocation,initializationMs:firstInvocation?initializationMs:0};firstInvocation=false;
  const measure=async(stage,work)=>{const time=Date.now();try{return await work();}finally{stages[stage]=(stages[stage]||0)+Date.now()-time;}};
  const finish=()=>({...timing,serverMs:Date.now()-started,stages});
  try{
    const context=cloud.getWXContext();
    if(process.env.EXPECTED_APP_ID&&context.APPID!==process.env.EXPECTED_APP_ID)throw Object.assign(Error('小程序来源不匹配'),{code:'AUTH'});
    const data=await service.execute(event.action,event.payload||{},context.OPENID,measure);
    return {ok:true,data,timing:finish()};
  }catch(error){
    const publicCodes=new Set(['AUTH','INVALID','UNPAIRED','FORBIDDEN','NOT_FOUND','ALREADY_PAIRED','INVITE','RATE_LIMIT','CONFLICT','SETUP','LIMIT','FULL','BUSY','ACTION']);
    const expected=publicCodes.has(error.code);
    if(!expected)console.error('coupleApi failure',error.errCode||'INTERNAL');
    return {ok:false,error:{code:expected?error.code:'INTERNAL',message:expected?error.message:'暂时没有完成，请稍后再试'},timing:finish()};
  }
};
