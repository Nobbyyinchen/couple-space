const api=require('../../services/api');
const ui=require('../../utils/ui');
Page({
  data:{loading:true,error:'',view:null,busy:false,cycleDays:'25',durationDays:'5',shared:false,reminderEnabled:true,dayLabels:['当天','提前 1 天和当天','提前 2 天和当天','提前 3 天和当天','提前 7 天和当天'],dayIndex:2,startDate:'',endDate:'',editingId:'',formOpen:false,careLabels:['想休息的时候我陪着你','想让我帮忙就告诉我','给你一个轻轻的拥抱'],careIndex:0},
  async onShow(){await this.refresh();},
  async onPullDownRefresh(){try{await this.refresh();}finally{wx.stopPullDownRefresh();}},
  async refresh(){
    try{
      const context=await api.requireContext();if(!context){this.setData({loading:false});return;}
      const view=await api.call('getPeriodState');
      const form=view.available?{cycleDays:String(view.cycleDays),durationDays:String(view.durationDays),shared:view.shared,reminderEnabled:view.reminderEnabled,dayIndex:[0,1,2,3,7].indexOf(view.daysBefore)}:{};
      this.setData({view,demo:context.demo,actorName:context.actor.nickname,partnerName:context.space.members.find(m=>m.id!==context.actor.id)?.nickname||'TA',loading:false,error:'',...form});
      if(!view.available&&view.suggestion&&!this.data.startDate)this.setData({startDate:view.suggestion.startDate});
    }catch(error){this.setData({loading:false,view:null,error:error.message});}
  },
  input(event){const key=event.currentTarget.dataset.key;if(['cycleDays','durationDays'].includes(key))this.setData({[key]:event.detail.value});},
  toggle(event){const key=event.currentTarget.dataset.key;if(['shared','reminderEnabled'].includes(key))this.setData({[key]:event.detail.value});},
  advance(event){this.setData({dayIndex:Number(event.detail.value)});},
  start(event){this.setData({startDate:event.detail.value});},
  end(event){this.setData({endDate:event.detail.value});},
  clearEnd(){this.setData({endDate:''});},
  careChoice(event){this.setData({careIndex:Number(event.detail.value)});},
  async run(action,payload,message){
    if(this.data.busy)return false;this.setData({busy:true,error:''});
    try{await api.call(action,payload);await this.refresh();api.refreshNotificationBadge();ui.toast(message);return true;}
    catch(error){this.setData({error:error.message});if(error.code==='CONFLICT')await this.refresh();return false;}
    finally{this.setData({busy:false});}
  },
  async settings(){
    const v=this.data.view;
    if(!v.available&&!this.data.startDate){this.setData({error:'请选择最近一次实际开始日期。'});return;}
    if(!v.available&&!await ui.confirm('开启我自己的生理期记录？',this.data.shared?'开始、结束、历史及预计日期将对当前情侣成员可见。以后可以关闭共享；已查看的内容无法收回。':'日期仅自己可见；之后可以主动开启情侣共享。'))return;
    await this.run('savePeriodSettings',{confirmed:true,revision:v.revision||0,cycleDays:Number(this.data.cycleDays),durationDays:Number(this.data.durationDays),shared:this.data.shared,reminderEnabled:this.data.reminderEnabled,daysBefore:[0,1,2,3,7][this.data.dayIndex],...(!v.available?{startDate:this.data.startDate}:{})},'记录设置已保存');
  },
  async invite(){
    if(!this.data.startDate){this.setData({error:'请先选择建议开始日期，由 TA 确认。'});return;}
    await this.run('suggestPeriodSetup',{startDate:this.data.startDate},'已准备，等 TA 确认开启');
  },
  add(){this.setData({formOpen:true,editingId:'',startDate:this.data.view.today,endDate:'',error:''});},
  edit(event){const record=this.data.view.records.find(r=>r.id===event.currentTarget.dataset.id);if(record)this.setData({formOpen:true,editingId:record.id,startDate:record.startDate,endDate:record.endDate,error:''});},
  cancel(){this.setData({formOpen:false,error:''});},
  async save(){if(await this.run('savePeriodRecord',{id:this.data.editingId||undefined,revision:this.data.view.revision,startDate:this.data.startDate,endDate:this.data.endDate},'实际日期已记好'))this.setData({formOpen:false});},
  async remove(event){if(await ui.confirm('删除这一次记录？','预计日期会根据剩余记录重新计算。'))await this.run('deletePeriodRecord',{id:event.currentTarget.dataset.id,revision:this.data.view.revision},'这次记录已删除');},
  async care(){await this.run('sendPeriodCare',{kind:['company','rest','hug'][this.data.careIndex]},'今天的温柔关怀已送达');},
  notifications(){ui.navigate('/pages/notifications/index');}
});
