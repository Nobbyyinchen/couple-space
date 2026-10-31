const config=require('../config');
const demo=require('./demo');
const dates=require('../utils/dates');
const performance=require('../utils/performance');
let pendingSavedView=null;
const demoMode=()=>config.demoMode||!config.cloudEnv;
const cacheKey=()=>`our-universe:mini:cache:${demoMode()?'demo':config.cloudEnv}`;
const requestId=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
function decorate(state){
  if(!state.space)return {...state,demo:demoMode()};
  const names=Object.fromEntries(state.space.members.map(m=>[m.id,m.nickname]));
  return {...state,demo:demoMode(),names,days:dates.daysBetween(state.space.startDate),anniversaries:dates.anniversaries(state.space),entries:(state.entries||[]).map(e=>({...e,authorName:names[e.authorId]||'我们',initial:(names[e.authorId]||'我')[0],timeLabel:dates.relativeTime(e.createdAt),liked:(e.likedBy||[]).includes(state.actor.id),likeCount:(e.likedBy||[]).length,commentCount:(e.comments||[]).length})),wishes:state.wishes||[]};
}
async function call(action,payload={}){
  const started=Date.now();let ok=false,timing={};
  try{
    if(demoMode()){const data=await demo.execute(action,payload);ok=true;return data;}
    let response;
    try{response=await wx.cloud.callFunction({name:config.cloudFunction,data:{action,payload}});}
    catch(error){const denied=/permission|unauthorized|access denied|权限/i.test(error.errMsg||error.message||'');throw Object.assign(Error(denied?'当前微信没有访问权限，请重新打开小程序。':'暂时连不上云端，内容仍保留在手机草稿中，请稍后重试'),{code:denied?'AUTH':'NETWORK'});}
    const result=response.result;timing=result?.timing||{};
    if(!result?.ok)throw Object.assign(Error(result?.error?.message||'暂时没有完成'),{code:result?.error?.code});
    ok=true;return result.data;
  }finally{performance.record('api.'+action,Date.now()-started,{...timing,ok});}
}
function invalidateAccess(error){if(['AUTH','FORBIDDEN','UNPAIRED'].includes(error.code)){pendingSavedView=null;try{wx.removeStorageSync(cacheKey());}catch{}}}
function writeCache(state){try{wx.setStorageSync(cacheKey(),state);}catch{}}
async function getState(payload={}){
  try{const result=decorate(await call('getState',payload));if(!payload.cursor)writeCache(result);return result;}
  catch(error){invalidateAccess(error);if(payload.cursor||error.code!=='NETWORK')throw error;const state=cached();if(state)return {...decorate(state),offline:true};throw error;}
}
function cached(){try{return wx.getStorageSync(cacheKey())||null;}catch{return null;}}
function rememberContext(context){
  const previous=cached(),same=previous?.actor?.id===context.actor.id&&previous?.space?.id===context.space?.id;
  const state=decorate({...(same?previous:{entries:[],wishes:[],checkins:[],cursor:null}),actor:context.actor,space:context.space,offline:false});
  writeCache(state);return state;
}
async function getContext(){
  try{return rememberContext(await call('getContext'));}
  catch(error){if(error.code==='ACTION')return getState();invalidateAccess(error);const state=cached();if(error.code==='NETWORK'&&state)return {...decorate(state),offline:true};throw error;}
}
async function requireContext(){const state=await getContext();if(!state.space){wx.navigateTo({url:'/pages/pair/index'});return null;}return state;}
function rememberEntryView(view){
  const state=rememberContext(view),entries=[view.entry,...(state.entries||[]).filter(e=>e.id!==view.entry.id)].sort((a,b)=>b.sequence-a.sequence).slice(0,20);
  const next=decorate({...state,entries,cursor:entries.length===20?entries[19].sequence:null});
  writeCache(next);return {state:next,entry:view.entry};
}
function rememberSavedEntry(view){pendingSavedView={key:cacheKey(),at:Date.now(),view:rememberEntryView(view)};}
function consumeSavedEntry(id){
  const pending=pendingSavedView;pendingSavedView=null;const state=cached();
  if(pending&&pending.key===cacheKey()&&Date.now()-pending.at<60000&&pending.view.entry.id===id&&pending.view.state.actor.id===state?.actor?.id&&pending.view.state.space.id===state?.space?.id)return pending.view;
  return null;
}
async function getEntryView(id){
  try{
    let view;
    try{view=await call('getEntryView',{id});}
    catch(error){if(error.code!=='ACTION')throw error;const state=await getState();view={actor:state.actor,space:state.space,entry:await call('getEntry',{id})};}
    return rememberEntryView(view);
  }catch(error){
    invalidateAccess(error);const state=cached(),entry=state?.entries?.find(e=>e.id===id);
    if(error.code==='NETWORK'&&entry)return {state:{...decorate(state),offline:true},entry};
    throw error;
  }
}
async function requireSpace(){const state=await getState();if(!state.space){wx.navigateTo({url:'/pages/pair/index'});return null;}return state;}
async function choosePhotos(count=9){
  const result=await wx.chooseMedia({count,mediaType:['image'],sizeType:['compressed'],sourceType:['album','camera']});
  const files=[];
  for(const f of result.tempFiles){
    if(f.size>8*1024*1024)throw Error('单张照片最大 8MB，请先在相册中压缩');
    const extension=(f.tempFilePath.match(/\.([a-zA-Z0-9]+)$/)||[])[1]?.toLowerCase()||'jpg';
    if(!['jpg','jpeg','png','webp'].includes(extension))throw Error('照片请转换为 JPG、PNG 或 WebP 后添加');
    const saved=await new Promise((resolve,reject)=>wx.getFileSystemManager().saveFile({tempFilePath:f.tempFilePath,success:resolve,fail:reject}));
    files.push({path:saved.savedFilePath,url:saved.savedFilePath,size:f.size,extension});
  }
  return files;
}
async function uploadPhoto(photo){
  if(demoMode())return {id:requestId(),url:photo.path,path:photo.path};
  const ticket=await call('prepareUpload',{extension:photo.extension,size:photo.size});
  const uploaded=await wx.cloud.uploadFile({cloudPath:ticket.cloudPath,filePath:photo.path});
  await call('completeUpload',{id:ticket.id,fileId:uploaded.fileID});return {id:ticket.id,url:photo.path,path:photo.path};
}
function draftKey(){const state=cached();return `our-universe:mini:draft:${demoMode()?'demo':config.cloudEnv}:${state?.actor?.id||'unpaired'}`;}
async function refreshNotificationBadge(){
  try{const {unread}=await call('getNotificationSummary');if(unread>0)wx.showTabBarRedDot?.({index:3});else wx.hideTabBarRedDot?.({index:3});return unread;}
  catch{wx.hideTabBarRedDot?.({index:3});return null;}
}
module.exports={call,getState,getContext,getEntryView,rememberContext,rememberSavedEntry,consumeSavedEntry,cached,requireSpace,requireContext,decorate,choosePhotos,uploadPhoto,requestId,draftKey,refreshNotificationBadge,isDemo:demoMode};
