const DAY=86400000;
function today(now=Date.now()){return new Date(now+8*3600000).toISOString().slice(0,10);}
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;}
function daysBetween(start,end=today()){return validDate(start)&&validDate(end)?Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/DAY):0;}
function nextDate(date,now=today()){
  let year=Number(now.slice(0,4));
  function atYear(y){const md=date.slice(5)==='02-29'&&!validDate(y+'-02-29')?'02-28':date.slice(5);return `${y}-${md}`;}
  let result=atYear(year);if(result<now)result=atYear(++year);return result;
}
function anniversaries(space,now=today()){
  const list=[{id:'relationship',title:'相恋纪念日',date:space.startDate,recurring:true},...(space.anniversaries||[])];
  return list.filter(a=>validDate(a.date)).map(a=>{const next=a.recurring?nextDate(a.date,now):a.date;const gap=daysBetween(now,next);return {...a,next,gap,gapLabel:gap===0?'就是今天':gap>0?`还有 ${gap} 天`:`已过 ${-gap} 天`};}).sort((a,b)=>(a.gap<0?999999:a.gap)-(b.gap<0?999999:b.gap));
}
function relativeTime(timestamp,now=Date.now()) {const seconds=Math.max(0,(now-timestamp)/1000);if(seconds<60)return '刚刚';if(seconds<3600)return Math.floor(seconds/60)+' 分钟前';if(seconds<86400)return Math.floor(seconds/3600)+' 小时前';return new Date(timestamp+8*3600000).toISOString().slice(0,10);}
module.exports={today,validDate,daysBetween,nextDate,anniversaries,relativeTime};
