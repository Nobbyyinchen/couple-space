import React from 'react';
import {CanvasImage, staticFile} from 'remotion';
import {mockData} from './mock-data';

const ink = '#433A38';
const berry = '#8E5265';
const muted = '#766962';
const line = '#E9E0D7';
const serif = '"SimSun", "Songti SC", serif';
const surface = '#FFFDF9';
const row: React.CSSProperties = {display:'flex',justifyContent:'space-between',alignItems:'center'};
const base: React.CSSProperties = {boxSizing:'border-box',color:ink,background:'#FAF7F2',overflow:'hidden'};

export const MockMemories: React.FC = () => <div style={{...base,width:604,height:907,padding:'22px 27px'}}>
  <div style={{fontSize:23,color:berry,letterSpacing:2}}>我们的回忆集 / MOMENTS</div>
  <div style={{fontFamily:serif,fontSize:46,lineHeight:1.45,marginTop:21}}>普通的一天，<br/><span style={{color:berry}}>也值得收藏。</span></div>
  <div style={{fontSize:25,color:muted,marginTop:20,paddingBottom:27,borderBottom:`2px solid ${line}`}}>这里慢慢变多的，是我们一起的时光。</div>
  <div style={{...row,fontSize:25,margin:'25px 0'}}><span style={{color:berry}}>全部手记 相片时光</span><span style={{color:muted,fontSize:22}}>共 1 篇</span></div>
  <div style={{fontSize:23,color:berry,margin:'20px 0 12px'}}>● {mockData.memory.date}</div>
  <div style={{background:surface,border:`1px solid ${line}`,padding:24}}>
    <div style={{display:'flex',gap:14,alignItems:'center'}}><div style={{width:54,height:54,borderRadius:30,background:'#F1DEDD',color:berry,display:'grid',placeItems:'center',fontSize:24}}>栗</div><div><div style={{fontSize:27}}>{mockData.memory.author}</div><div style={{fontSize:20,color:muted,marginTop:5}}>{mockData.memory.timeLabel}</div></div></div>
    <div style={{fontFamily:serif,fontSize:33,marginTop:21}}>{mockData.memory.title}</div>
    <div style={{fontSize:25,lineHeight:1.8,whiteSpace:'pre-line',margin:'15px 0 19px'}}>{mockData.memory.body}</div>
    <CanvasImage src={staticFile('assets/sea.png')} style={{width:'100%',height:90,objectFit:'cover'}}/>
    <div style={{...row,fontSize:21,color:berry,marginTop:15}}><span>喜欢 {mockData.memory.likes}</span><span>留言 1</span></div>
    <div style={{fontSize:22,color:muted,marginTop:16,paddingTop:15,borderTop:`1px solid ${line}`}}>{mockData.memory.commentAuthor}：{mockData.memory.comment}</div>
  </div>
</div>;

export const MockWishes: React.FC = () => <div style={{...base,width:604,height:1000,padding:'25px 28px'}}>
  <div style={{fontSize:23,color:berry}}>一起，把期待变成日常</div>
  <div style={{fontFamily:serif,fontSize:45,lineHeight:1.45,margin:'25px 0 32px'}}>和你，还有好多<br/><span style={{color:berry}}>想一起做的事。</span></div>
  <div style={{...row,fontSize:23,color:muted}}><span><strong style={{fontFamily:'Georgia',fontSize:45,color:berry,fontWeight:400}}>1</strong> / 3 个小心愿已实现</span><span>慢慢来，一起走</span></div>
  <div style={{height:5,background:line,margin:'20px 0 35px'}}><div style={{height:5,width:'33.333%',background:'#A9B9A4'}}/></div>
  <div style={{fontSize:26,marginBottom:16}}>再添一个小心愿</div>
  <div style={{...row,border:'1px solid #D9A0AA',padding:16,borderRadius:10,fontSize:24,color:muted,background:surface}}><span>下一件想和 TA 做的事…</span><div style={{background:berry,color:surface,padding:'6px 21px',borderRadius:7,fontSize:37}}>＋</div></div>
  <div style={{...row,fontSize:25,color:berry,padding:'33px 0 24px',borderBottom:`1px solid ${line}`}}><span>全部心愿</span><span style={{color:muted}}>等待实现 已经实现</span></div>
  {mockData.wishes.map(wish=><div key={wish.text} style={{display:'flex',alignItems:'center',gap:22,minHeight:140,borderBottom:`1px solid ${line}`}}><div style={{width:35,height:35,flexShrink:0,border:'1px solid #9C8177',borderRadius:5,color:'#52634C',fontSize:30,textAlign:'center',lineHeight:'35px'}}>{wish.done?'✓':''}</div><div><div style={{fontSize:28,lineHeight:1.6,textDecoration:wish.done?'line-through':'none',color:wish.done?'#52634C':ink}}>{wish.text}</div><div style={{fontSize:22,color:muted,marginTop:8}}>{wish.done?'已实现 · 又多了一段共同回忆':'待实现 · 留给未来的我们'}</div></div></div>)}
  <div style={{textAlign:'center',fontFamily:serif,fontSize:25,color:muted,marginTop:28}}>一件一件，慢慢实现。</div>
</div>;

export const MockTogether: React.FC = () => <div style={{...base,width:687,height:355,background:surface,padding:'8px 22px'}}>
  <div style={{...row,color:berry,fontSize:27}}><span>{mockData.people[0]} 与 {mockData.people[1]}</span><span style={{fontSize:21,letterSpacing:3}}>OUR DAYS</span></div>
  <div style={{fontSize:27,color:muted,marginTop:28}}>我们已经在一起</div>
  <div style={{display:'flex',alignItems:'baseline',gap:14,marginTop:6}}><span style={{fontFamily:'Georgia',fontSize:139,lineHeight:1.1,color:berry}}>{mockData.daysTogether}</span><span style={{fontSize:27,color:muted}}>天</span></div>
  <div style={{position:'absolute',right:50,top:91,rotate:'7deg'}}><CanvasImage src={staticFile('assets/bloom.png')} style={{width:145,height:167,objectFit:'contain'}}/></div>
  <div style={{...row,fontSize:23,color:muted,borderTop:`1px solid ${line}`,paddingTop:21,marginTop:18}}><span>故事始于 {mockData.startDate}</span><span style={{color:berry}}>未完待续</span></div>
</div>;

export const MockAnniversaries: React.FC = () => <div style={{...base,width:745,height:465,padding:'15px 22px',background:surface}}>
  <div style={{...row,paddingBottom:27}}><span style={{fontSize:35,fontFamily:serif}}>值得期待的日子</span><span style={{color:berry,fontSize:26}}>管理 →</span></div>
  {mockData.anniversaries.map(item=><div key={item.title} style={{...row,padding:'33px 0',borderBottom:`1px solid ${line}`}}><div style={{display:'flex',alignItems:'center',gap:23}}><div style={{width:32,height:35,border:'2px solid #D9A0AA',borderTop:'7px solid #D9A0AA',borderRadius:4,color:berry,fontSize:20,textAlign:'center'}}>✦</div><div><div style={{fontSize:30}}>{item.title}</div><div style={{fontSize:24,color:muted,marginTop:15}}>{item.date}</div></div></div><div style={{fontSize:26,color:berry}}>还有 {item.daysUntil} 天</div></div>)}
  <div style={{fontSize:23,color:muted,marginTop:25}}>演示时间：{mockData.asOfDate}</div>
</div>;

