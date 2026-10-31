import React from 'react';
import {AbsoluteFill, CanvasImage, Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {MockAnniversaries, MockMemories, MockTogether, MockWishes} from './MockScreens';
import {mockData} from './mock-data';

export type PromoProps = {brand: string; tagline: string};
const paper = '#FAF7F2';
const ink = '#433A38';
const berry = '#8E5265';
const sage = '#A9B9A4';
const serif = '"SimSun", "Songti SC", serif';
const sans = '"Microsoft YaHei", "PingFang SC", sans-serif';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const smooth = {...clamp, easing: Easing.bezier(0.22, 1, 0.36, 1)};

const Reveal: React.FC<{children: React.ReactNode; delay?: number; style?: React.CSSProperties}> = ({children, delay = 0, style}) => {
  const frame = useCurrentFrame();
  return <div style={{...style, opacity:interpolate(frame,[delay,delay+22],[0,1],clamp),translate:interpolate(frame,[delay,delay+28],['0px 40px','0px 0px'],smooth)}}>{children}</div>;
};

const Scene: React.FC<{children: React.ReactNode; length: number; dark?: boolean}> = ({children,length,dark}) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{backgroundColor:dark?berry:paper,color:dark?paper:ink,fontFamily:sans,overflow:'hidden',opacity:interpolate(frame,[0,10,length-10,length],[0,1,1,0],clamp)}}>
    <div style={{position:'absolute',inset:52,border:`1px solid ${dark?'#BF909D':'#E9E0D7'}`,borderRadius:3}} />
    <div style={{position:'absolute',top:0,bottom:0,left:80,width:1,backgroundColor:dark?'#A76D81':'#E9E0D7'}} />
    {children}
  </AbsoluteFill>;
};

const Label: React.FC<{children: React.ReactNode; dark?: boolean}> = ({children,dark}) => <div style={{fontSize:27,letterSpacing:5,color:dark?'#EFDDE1':berry,fontWeight:500}}>{children}</div>;

const Heading: React.FC<{number:string;title:React.ReactNode;sub:string}> = ({number,title,sub}) => <>
  <Reveal delay={3} style={{position:'absolute',left:105,top:127}}><Label>{number} / 两个人的生活手账</Label></Reveal>
  <Reveal delay={9} style={{position:'absolute',left:105,top:218,fontSize:86,fontFamily:serif,lineHeight:1.35,letterSpacing:-2}}>{title}</Reveal>
  <Reveal delay={17} style={{position:'absolute',left:108,top:460,fontSize:40,color:'#766962',lineHeight:1.6}}>{sub}</Reveal>
</>;

const Phone: React.FC<{children:React.ReactNode;title:string;width?:number;style?:React.CSSProperties}> = ({children,title,width=646,style}) => <div style={{width,backgroundColor:'#FFFDFA',padding:'24px 18px 22px',border:'3px solid #CABAB0',borderRadius:54,boxShadow:'0 28px 80px #5D43351C',overflow:'hidden',...style}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 23px 23px',color:ink,fontSize:29}}><span>{title}</span><span style={{display:'inline-block',fontSize:19,border:'1px solid #D5C9C1',padding:'3px 17px',borderRadius:24,letterSpacing:5}}>••• ○</span></div>
  <div style={{overflow:'hidden',borderRadius:18}}>{children}</div>
  <div style={{width:146,height:6,borderRadius:4,background:'#BEB0A5',margin:'20px auto 0'}} />
</div>;

const Footnote: React.FC<{children?:React.ReactNode;page:string}> = ({children,page}) => <div style={{position:'absolute',left:108,right:108,bottom:115,display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:25,letterSpacing:2,color:'#766962'}}><span>{children || '界面示意 · 全部为虚构演示数据'}</span><span>{page} — 05</span></div>;

const Opening: React.FC<PromoProps> = ({brand}) => {
  const frame = useCurrentFrame();
  return <Scene length={120}>
    <Reveal delay={1} style={{position:'absolute',left:108,top:140}}><Label>FOR THE TWO OF US</Label></Reveal>
    <Reveal delay={6} style={{position:'absolute',top:278,left:105,fontFamily:serif,fontSize:94,lineHeight:1.5,letterSpacing:-2}}>把普通的日子，<br/><span style={{color:berry}}>慢慢写成我们。</span></Reveal>
    <Reveal delay={17} style={{position:'absolute',top:625,left:110,fontSize:42,color:'#766962'}}>有些小事，只想和你分享。</Reveal>
    <Reveal delay={17} style={{position:'absolute',left:130,top:850,rotate:'-7deg'}}>
      <div style={{width:620,padding:'24px 24px 80px',background:'#FFFDF9',boxShadow:'0 25px 70px #433A381A',border:'1px solid #E9E0D7',translate:interpolate(frame,[0,120],['0px 12px','0px -12px'],clamp)}}><CanvasImage src={staticFile('assets/sea.png')} style={{width:572,height:405,objectFit:'cover'}}/><div style={{fontFamily:serif,fontSize:34,position:'absolute',bottom:25,left:30}}>一起，等一场蓝色日落。</div></div>
    </Reveal>
    <Reveal delay={25} style={{position:'absolute',right:103,top:1190,rotate:'9deg'}}><div style={{padding:24,background:'#F0E6D8',border:'2px dashed #BAA891',width:250,height:330}}><CanvasImage src={staticFile('assets/bloom.png')} style={{width:198,height:230,objectFit:'contain'}}/><div style={{fontFamily:serif,fontSize:28,textAlign:'center',color:berry}}>一日，一页。</div></div></Reveal>
    <Reveal delay={30} style={{position:'absolute',left:110,top:1610,fontSize:40,color:berry}}>{mockData.people[0]} × {mockData.people[1]}<span style={{color:'#B6A49A',margin:'0 18px'}}>·</span>{brand}</Reveal>
    <Footnote page="01">虚构人物与故事 · 插画为示意素材</Footnote>
  </Scene>;
};

const Memories: React.FC = () => {
  const frame = useCurrentFrame();
  return <Scene length={180}>
    <Heading number="01" title={<>小事，<br/><span style={{color:berry}}>也值得珍藏。</span></>} sub="一张照片，一句今天的小开心。" />
    <Reveal delay={13} style={{position:'absolute',left:206,top:615,rotate:'-2deg',scale:interpolate(frame,[0,180],[0.97,1.015],clamp)}}>
      <Phone title="我们的回忆"><MockMemories/></Phone>
    </Reveal>
    <Reveal delay={29} style={{position:'absolute',left:626,top:1390,rotate:'9deg'}}><div style={{padding:14,paddingBottom:44,background:'#FFFDF9',boxShadow:'0 14px 30px #433A3820'}}><CanvasImage src={staticFile('assets/sea.png')} style={{width:257,height:181,objectFit:'cover'}}/><div style={{fontFamily:serif,fontSize:23,position:'absolute',bottom:12,left:20}}>把今天，留给以后。</div></div></Reveal>
    <Footnote page="02"/>
  </Scene>;
};

const Wishes: React.FC = () => {
  const frame=useCurrentFrame();
  return <Scene length={180}>
    <Heading number="02" title={<>和你，还有好多<br/><span style={{color:berry}}>想做的事。</span></>} sub="把小期待，写进两个人的清单。" />
    <Reveal delay={13} style={{position:'absolute',left:203,top:590,rotate:'2deg',translate:interpolate(frame,[0,180],['0px 15px','0px -12px'],clamp)}}>
      <Phone title="一起做的事"><MockWishes/></Phone>
    </Reveal>
    <Footnote page="03"/>
  </Scene>;
};

const Dates: React.FC = () => {
  const frame=useCurrentFrame();
  return <Scene length={210}>
    <Heading number="03" title={<>记得每个<br/><span style={{color:berry}}>值得期待的日子。</span></>} sub="相伴的天数，和下一次纪念。" />
    <Reveal delay={13} style={{position:'absolute',left:157,top:620,rotate:'-3deg'}}>
      <div style={{padding:28,background:'#FFFDF9',border:'1px solid #E9E0D7',boxShadow:'0 20px 60px #433A3812',scale:interpolate(frame,[0,210],[0.98,1.02],clamp)}}><MockTogether/></div>
    </Reveal>
    <Reveal delay={26} style={{position:'absolute',left:139,top:1090,rotate:'2deg'}}>
      <div style={{padding:'31px 28px 35px',background:'#FFFDF9',borderTop:`4px solid ${sage}`,boxShadow:'0 20px 60px #433A3812'}}><MockAnniversaries/></div>
    </Reveal>
    <Reveal delay={36} style={{position:'absolute',left:108,top:1685,fontFamily:serif,fontSize:40,color:berry}}>每一次纪念，都有我们。</Reveal>
    <Footnote page="04"/>
  </Scene>;
};

const Closing: React.FC<PromoProps> = ({brand,tagline}) => {
  const frame=useCurrentFrame();
  return <Scene length={210} dark>
    <Reveal delay={2} style={{position:'absolute',top:149,left:108}}><Label dark>OUR LITTLE UNIVERSE</Label></Reveal>
    <Reveal delay={7} style={{position:'absolute',top:365,left:395,rotate:'5deg'}}><div style={{width:290,height:370,background:'#F4EADB',border:'2px dashed #C9B89F',padding:26,translate:interpolate(frame,[0,210],['0px 10px','0px -8px'],clamp)}}><CanvasImage src={staticFile('assets/bloom.png')} style={{width:234,height:268,objectFit:'contain'}}/><div style={{color:berry,fontFamily:serif,fontSize:30,textAlign:'center'}}>一日，一页。</div></div></Reveal>
    <Reveal delay={15} style={{position:'absolute',top:864,left:105,right:105,textAlign:'center',fontFamily:serif,fontSize:106,lineHeight:1.25,letterSpacing:9}}>{brand}</Reveal>
    <Reveal delay={24} style={{position:'absolute',top:1044,left:105,right:105,textAlign:'center',fontSize:47,letterSpacing:5,color:'#F2DDE3'}}>{tagline}</Reveal>
    <Reveal delay={34} style={{position:'absolute',left:180,right:180,top:1195,borderTop:'1px solid #C99DAA'}}><div style={{paddingTop:60,fontSize:44,textAlign:'center',lineHeight:1.9}}>邀请另一半，<br/>一起写下第一页。</div></Reveal>
    <Reveal delay={42} style={{position:'absolute',left:0,right:0,top:1590,textAlign:'center',fontSize:29,letterSpacing:8,color:'#E8CDD6'}}>记录日常  /  共同心愿  /  重要日子</Reveal>
    <div style={{position:'absolute',left:108,right:108,bottom:115,display:'flex',justifyContent:'space-between',fontSize:25,color:'#E8CDD6',letterSpacing:2}}><span>情侣空间 · 微信小程序</span><span>05 — 05</span></div>
  </Scene>;
};

export const Promo: React.FC<PromoProps> = ({brand,tagline}) => {
  const {fps}=useVideoConfig();
  return <AbsoluteFill style={{backgroundColor:paper}}>
    <Audio name="原创轻柔配乐" src={staticFile('music.wav')} volume={0.68}/>
    <Sequence name="开场 · 把日子写成我们" durationInFrames={4*fps}><Opening brand={brand} tagline={tagline}/></Sequence>
    <Sequence name="回忆 · 记录小美好" from={4*fps} durationInFrames={6*fps}><Memories/></Sequence>
    <Sequence name="心愿 · 两个人的期待" from={10*fps} durationInFrames={6*fps}><Wishes/></Sequence>
    <Sequence name="纪念 · 值得期待的日子" from={16*fps} durationInFrames={7*fps}><Dates/></Sequence>
    <Sequence name="结尾 · 邀请另一半" from={23*fps} durationInFrames={7*fps}><Closing brand={brand} tagline={tagline}/></Sequence>
  </AbsoluteFill>;
};
