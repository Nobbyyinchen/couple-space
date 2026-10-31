// 唯一模板配置来源；必须按公众平台实际审核结果填写，禁止使用示例字段。
// fields 必须来自“我的模板”详情。当前只支持 thing 文本与经期 number 倒计时。
const templates={
  // 公众平台新留言提醒（8232）：留言用户、留言内容。
  comment:{enabled:true,templateId:'mock-template-0',fields:[
    {key:'thing2',source:'actorName',maxLength:20},
    {key:'thing3',source:'summary',maxLength:20}
  ]},
  photo:{enabled:false,templateId:'',fields:[]},
  // 公众平台日程提醒（571）：日程标题、提醒内容。
  anniversary:{enabled:true,templateId:'mock-template-1',fields:[
    {key:'thing5',source:'title',maxLength:20},
    {key:'thing2',source:'summary',maxLength:20}
  ]},
  // 2026-10-29 公众平台已生效：经期提醒（472），温馨提醒、倒计时天数。
  period:{enabled:true,templateId:'mock-template-2',fields:[
    {key:'thing3',source:'summary',maxLength:20},
    {key:'number2',source:'periodDaysRemaining',maxLength:2}
  ]},
  // 公众平台最关怀提醒（6708）：关怀标题、备注。
  periodCare:{enabled:true,templateId:'mock-template-3',fields:[
    {key:'thing1',source:'title',maxLength:20},
    {key:'thing4',source:'summary',maxLength:20}
  ]}
};
const sources=new Set(['title','summary','actorName','date']);
function validField(f){
  return Boolean(f&&Number.isInteger(f.maxLength)&&f.maxLength>0&&(
    /^thing\d+$/.test(f.key)&&sources.has(f.source)&&f.maxLength<=20||
    /^number\d+$/.test(f.key)&&f.source==='periodDaysRemaining'&&f.maxLength<=32));
}
function configured(scene,config=templates){
  const t=config[scene];
  return Boolean(t&&t.enabled===true&&typeof t.templateId==='string'&&t.templateId.trim()&&
    Array.isArray(t.fields)&&t.fields.length&&new Set(t.fields.map(f=>f?.key)).size===t.fields.length&&
    t.fields.every(validField));
}
function templateData(template,values){
  const data={};
  for(const f of template.fields){
    if(!validField(f))return null;
    const raw=values[f.source];let value;
    if(f.source==='periodDaysRemaining'){
      if(!Number.isInteger(raw)||raw<0||raw>60)return null;
      value=String(raw);if(value.length>f.maxLength)return null;
    }else{
      if(typeof raw!=='string')return null;
      value=Array.from(raw.replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').trim()).slice(0,f.maxLength).join('');
      if(!value)return null;
    }
    data[f.key]={value};
  }
  return data;
}
module.exports={templates,configured,templateData,timeZone:'Asia/Shanghai',maxAttempts:3};
