const DAY=86400000;
function invalid(message){throw Object.assign(Error(message),{code:'INVALID'});}
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
function previous(day){return new Date(Date.parse(day+'T00:00:00Z')-DAY).toISOString().slice(0,10);}
// Read whole days so the two members can never be split across pages.
async function history(payload,{today,readDay}){
  const month=payload.month===undefined?today.slice(0,7):payload.month;
  if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month<'1970-01'||month>today.slice(0,7))invalid('请选择有效的历史月份');
  const first=month+'-01';
  const last=month===today.slice(0,7)?today:new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);
  const end=payload.cursor==null?last:payload.cursor;
  if(!validDate(end)||end<first||end>last)invalid('打卡记录分页日期无效，请刷新后重试');
  const days=[];let next=end;
  while(next>=first&&days.length<7){days.push(next);next=previous(next);}
  const groups=await Promise.all(days.map(async date=>({date,records:(await readDay(date)).filter(Boolean)})));
  return {month,today,items:groups.filter(day=>day.records.length),cursor:next>=first?next:null,from:days[days.length-1],to:end};
}
module.exports={history};
