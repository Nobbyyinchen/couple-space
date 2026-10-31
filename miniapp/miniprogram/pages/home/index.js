const api=require('../../services/api');
const dates=require('../../utils/dates');
const ui=require('../../utils/ui');
const config=require('../../config');
Page({
  data:{brand:{title:config.siteName,tagline:config.tagline,description:config.description},loading:true,demo:true,state:null,moods:['开心','想你','平静','有点累','需要抱抱'],selectedMood:'想你',message:'',error:''},
  async onShow(){api.refreshNotificationBadge();await this.refresh();},
  async onPullDownRefresh(){api.refreshNotificationBadge();try{await this.refresh();}finally{wx.stopPullDownRefresh();}},
  async refresh(){
    try{const state=await api.getState();if(!state.space){this.setData({loading:false,state:null,demo:state.demo});return;}
      const day=dates.today(),sameDay=this.checkinDay===day&&this.checkinActor===state.actor.id;
      const me=state.checkins.find(c=>c.authorId===state.actor.id&&c.date===dates.today());
      const partner=state.space.members.find(m=>m.id!==state.actor.id),other=partner&&state.checkins.find(c=>c.authorId===partner.id&&c.date===dates.today());
      const next=state.anniversaries.find(a=>a.gap>=0);
      this.setData({state,demo:state.demo,days:Math.abs(state.days),future:state.days<0,loading:false,partner,other,me,selectedMood:me?.mood||(sameDay?this.data.selectedMood:'想你'),message:me?me.message:(sameDay?this.data.message:''),next:next?{...next,month:next.next.slice(5,7),day:next.next.slice(8)}:null,recent:state.entries.slice(0,2),error:''});
      this.checkinDay=day;this.checkinActor=state.actor.id;
    }catch(error){this.setData({loading:false,error:error.message});}
  },
  checkinHistory(){ui.navigate('/pages/checkins/index');},pair(){ui.navigate('/pages/pair/index');},compose(){ui.navigate('/pages/compose/index');},
  memories(){wx.switchTab({url:'/pages/memories/index'});},wishes(){wx.switchTab({url:'/pages/wishes/index'});},us(){wx.switchTab({url:'/pages/us/index'});},
  detail(event){ui.navigate('/pages/detail/index?id='+event.currentTarget.dataset.id);},
  mood(event){this.setData({selectedMood:event.currentTarget.dataset.mood});},
  message(event){this.setData({message:event.detail.value});},
  async checkIn(){if(this.data.saving)return;this.setData({saving:true});try{await api.call('checkIn',{mood:this.data.selectedMood,message:this.data.message});await this.refresh();ui.toast('今天的心情，留给 TA 了');}catch(error){ui.error(error);}finally{this.setData({saving:false});}},
  async like(event){const entry=this.data.recent.find(e=>e.id===event.currentTarget.dataset.id);try{await api.call('likeEntry',{id:entry.id,liked:!entry.liked});await this.refresh();}catch(error){ui.error(error);}},
  preview(event){const entry=this.data.recent.find(e=>e.id===event.currentTarget.dataset.id);const urls=entry.images.map(m=>m.url).filter(Boolean);wx.previewImage({current:event.currentTarget.dataset.url,urls});}
});
