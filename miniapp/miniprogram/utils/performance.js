// Keep timings in memory only. Never record diary text, photos, invite codes or account IDs.
const samples=[];
function record(label,ms,info={}){
  const sample={at:Date.now(),label:/^[a-zA-Z0-9_.-]{1,64}$/.test(label)?label:'operation',ms:Math.max(0,Math.round(ms)),ok:info.ok===true};
  if(Number.isFinite(info.serverMs))sample.serverMs=info.serverMs;
  if(typeof info.firstInvocation==='boolean')sample.firstInvocation=info.firstInvocation;
  if(Number.isFinite(info.initializationMs))sample.initializationMs=info.initializationMs;
  if(info.stages)sample.stages=Object.fromEntries(Object.entries(info.stages).filter(([key,value])=>/^[a-zA-Z0-9_.-]{1,64}$/.test(key)&&Number.isFinite(value)));
  samples.push(sample);if(samples.length>80)samples.shift();
  try{if(typeof getApp==='function')getApp().globalData.performance=samples.slice();}catch{}
}
module.exports={record,snapshot:()=>samples.map(s=>({...s})),reset:()=>{samples.length=0;}};
