const api=require('../../services/api');
const dates=require('../../utils/dates');
function time(value){return Number.isFinite(value)?new Date(value+8*3600000).toISOString().slice(11,16):'';}
Page({
  data:{month:'',maxMonth:'',monthLabel:'',loading:true,moreBusy:false,items:[],cursor:null,error:'',from:'',to:''},
  async onShow(){const today=dates.today();this.setData({maxMonth:today.slice(0,7)});await this.refresh(this.data.month||today.slice(0,7));},
  async onPullDownRefresh(){try{await this.refresh();}finally{wx.stopPullDownRefresh();}},
  async changeMonth(event){await this.refresh(event.detail.value);},
  async retry(){await this.refresh();},
  decorate(page){
    return page.items.map(day=>{
      const members=page.space.members.map(member=>{
        const record=day.records.find(item=>item.authorId===member.id);
        return {id:member.id,name:member.id===page.actor.id?'我':member.nickname,checked:!!record,mood:record?.mood||'未打卡',message:record?.message||'',firstTime:time(record?.createdAt),updatedTime:time(record?.updatedAt),edited:!!record?.createdAt&&record.updatedAt!==record.createdAt};
      });
      const count=members.filter(member=>member.checked).length;
      return {date:day.date,label:day.date.slice(5).replace('-',' 月 ')+' 日',status:members.length===2&&count===2?'双方已打卡':count+' 人已打卡',members};
    });
  },
  async refresh(month=this.data.month||dates.today().slice(0,7)){
    const request=(this.request||0)+1;this.request=request;
    this.setData({month,monthLabel:month.replace('-',' 年 ')+' 月',loading:true,moreBusy:false,error:'',items:[],cursor:null,from:'',to:''});
    try{
      const page=await api.call('getCheckinHistory',{month});if(request!==this.request)return;
      this.actorId=page.actor.id;this.spaceId=page.space.id;
      this.setData({items:this.decorate(page),cursor:page.cursor,from:page.from,to:page.to,demo:api.isDemo(),loading:false});
    }catch(error){if(request===this.request)this.setData({loading:false,error:this.errorMessage(error)});}
  },
  errorMessage(error){return error.code==='ACTION'?'打卡记录功能尚未部署，请先更新云函数。':error.message;},
  async more(){
    if(this.data.loading||this.data.moreBusy||!this.data.cursor)return;
    const request=this.request,month=this.data.month,cursor=this.data.cursor;this.setData({moreBusy:true,error:''});
    try{
      const page=await api.call('getCheckinHistory',{month,cursor});if(request!==this.request)return;
      if(page.actor.id!==this.actorId||page.space.id!==this.spaceId){await this.refresh();return;}
      const known=new Set(this.data.items.map(day=>day.date));
      this.setData({items:[...this.data.items,...this.decorate(page).filter(day=>!known.has(day.date))],cursor:page.cursor,from:page.from});
    }catch(error){if(request===this.request){const denied=['AUTH','FORBIDDEN','UNPAIRED'].includes(error.code);this.setData({error:this.errorMessage(error),...(denied?{items:[],cursor:null}:{})});}}
    finally{if(request===this.request)this.setData({moreBusy:false});}
  },
  today(){wx.switchTab({url:'/pages/home/index'});}
});
