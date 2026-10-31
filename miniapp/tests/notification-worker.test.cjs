const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function worker(context={}){
  let runs=0;const exports={};
  const modules={
    'wx-server-sdk':{init(){},database(){return {};},getWXContext:()=>context},
    './lib/repository':{createRepository:()=>({get:async()=>null,scan:async()=>[],set:async()=>{}})},
    './lib/notifications':{createNotifications:()=>({deliver:async()=>{}})},
    './lib/reminders':{createReminders:()=>({runDaily:async()=>{runs++;}})}
  };
  vm.runInNewContext(fs.readFileSync(path.join(root,'cloudfunctions/notificationWorker/index.js'),'utf8'),{require:name=>modules[name],exports,Date,Error});
  return {main:exports.main,runs:()=>runs};
}
test('后台任务拒绝伪造定时事件的普通微信调用，保留定时触发器入口',async()=>{
  const event={Type:'Timer',TriggerName:'coupleAnniversaryDaily'};
  for(const context of [{OPENID:'client'},{SOURCE:'wx_client'}])await assert.rejects(worker(context).main(event),/FORBIDDEN/);
  await assert.rejects(worker().main({Type:'Timer',TriggerName:'other'}),/FORBIDDEN/);
  const task=worker();await task.main(event);assert.equal(task.runs(),1);
  const rules=JSON.parse(fs.readFileSync(path.join(root,'cloudbase/functions.rules.json'),'utf8'));assert.equal(rules.notificationWorker.invoke,false);
});
test('后台部署模块与唯一配置来源完全一致，防止部署时遗漏模板或规则更新',()=>{
  for(const name of ['repository.js','notifications.js','notification-config.js','reminders.js','periods.js']){
    assert.equal(fs.readFileSync(path.join(root,'cloudfunctions/notificationWorker/lib',name),'utf8'),fs.readFileSync(path.join(root,'cloudfunctions/coupleApi',name),'utf8'),'先运行 npm run prepare:notifications: '+name);
  }
});
