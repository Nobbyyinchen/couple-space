const api=require('../../services/api');
const dates=require('../../utils/dates');
const ui=require('../../utils/ui');
const labels={comment:'留言提醒',photo:'照片提醒',anniversary:'纪念日提醒',period:'暖心日期提醒',periodCare:'温馨关怀提醒'};
Page({
  data:{loading:true,items:[],unread:0,error:'',cursor:null,moreBusy:false,settings:{anniversaryEnabled:false,daysBefore:0},scenes:[],dayLabels:['当天','提前 1 天','提前 3 天','提前 7 天'],dayIndex:0,saving:false,subscribing:false},
  async onShow(){await this.refresh();},
  async onPullDownRefresh(){try{await this.refresh();}finally{wx.stopPullDownRefresh();}},
  async refresh(){
    try{
      const state=await api.requireContext();if(!state){this.setData({loading:false});return;}
      this.actorId=state.actor.id;
      try{await this.flushAuthorization();}catch{this.setData({subscriptionHint:'上次订阅结果暂未同步，联网后再次打开会重试。'});}
      const [page,options]=await Promise.all([api.call('getNotifications'),api.call('getNotificationSettings')]);
      const scenes=options.scenes.map(s=>({...s,label:labels[s.scene],ready:false}));
      this.setData({loading:false,error:'',demo:state.demo,...page,items:this.decorate(page.items),settings:options.settings,dayIndex:Math.max(0,[0,1,3,7].indexOf(options.settings.daysBefore)),scenes});
      api.refreshNotificationBadge();this.tickets={};
      for(const s of scenes)if(s.configured)await this.prepare(s.scene);
    }catch(error){this.setData({loading:false,error:error.code==='ACTION'?'通知功能尚未部署，请先更新云函数。':error.message});}
  },
  decorate(items){return items.map(item=>({...item,timeLabel:dates.relativeTime(item.createdAt)}));},
  async more(){
    if(!this.data.cursor||this.data.moreBusy)return;this.setData({moreBusy:true});
    try{const page=await api.call('getNotifications',{cursor:this.data.cursor});const ids=new Set(this.data.items.map(n=>n.id));this.setData({items:[...this.data.items,...this.decorate(page.items.filter(n=>!ids.has(n.id)))],cursor:page.cursor,unread:page.unread});}
    catch(error){ui.error(error);}finally{this.setData({moreBusy:false});}
  },
  async open(event){
    if(this.opening)return;this.opening=true;
    try{
      const item=this.data.items.find(n=>n.id===event.currentTarget.dataset.id);if(!item)return;
      await api.call('readNotification',{id:item.id});this.setData({items:this.data.items.map(n=>n.id===item.id?{...n,readAt:Date.now()}:n),unread:Math.max(0,this.data.unread-(item.readAt===null?1:0))});
      api.refreshNotificationBadge();
      if(['photo','comment'].includes(item.scene)&&item.targetId)wx.navigateTo({url:'/pages/detail/index?id='+encodeURIComponent(item.targetId)});
      else if(['period','periodCare'].includes(item.scene))wx.navigateTo({url:'/pages/period/index'});
      else wx.switchTab({url:'/pages/us/index'});
    }catch(error){ui.error(error);}finally{this.opening=false;}
  },
  enabled(event){this.saveSettings({...this.data.settings,anniversaryEnabled:event.detail.value});},
  advance(event){this.saveSettings({...this.data.settings,daysBefore:[0,1,3,7][Number(event.detail.value)]});},
  async saveSettings(value){
    if(this.data.saving)return;this.setData({saving:true});
    try{const saved=await api.call('updateNotificationSettings',value);this.setData({settings:saved,dayIndex:[0,1,3,7].indexOf(saved.daysBefore)});ui.toast('提醒设置已保存');}
    catch(error){ui.error(error);this.setData({settings:{...this.data.settings}});}finally{this.setData({saving:false});}
  },
  async prepare(scene){
    try{const ticket=await api.call('prepareSubscription',{scene});this.tickets[scene]=ticket;this.setData({scenes:this.data.scenes.map(s=>s.scene===scene?{...s,ready:true}:s)});}
    catch(error){this.setData({subscriptionHint:error.message});}
  },
  pendingKey(){return 'our-universe:mini:subscription:'+this.actorId;},
  async flushAuthorization(){
    const stored=wx.getStorageSync(this.pendingKey());if(!stored)return;
    const pending=Array.isArray(stored)?stored:[stored];
    for(const item of pending){
      try{await api.call('recordSubscription',item);}
      catch(error){if(error.code!=='INVALID')throw error;}
      const current=wx.getStorageSync(this.pendingKey()),queue=(Array.isArray(current)?current:current?[current]:[]).filter(record=>record.ticketId!==item.ticketId);
      if(queue.length)wx.setStorageSync(this.pendingKey(),queue);else wx.removeStorageSync(this.pendingKey());
    }
  },
  subscribe(event){
    // Keep the platform request in the direct tap handler, before any await/cloud call.
    if(this.data.subscribing)return;
    const scene=event.currentTarget.dataset.scene,ticket=this.tickets?.[scene];
    if(!ticket||ticket.expiresAt<=Date.now()){ui.toast('订阅申请已过期，请下拉刷新后重试');return;}
    if(typeof wx.requestSubscribeMessage!=='function'){ui.toast('请更新微信后重试');return;}
    this.setData({subscribing:true});
    const complete=async result=>{
      const pending={ticketId:ticket.ticketId,result};
      try{const stored=wx.getStorageSync(this.pendingKey()),queue=Array.isArray(stored)?stored:stored?[stored]:[];wx.setStorageSync(this.pendingKey(),[...queue.filter(item=>item.ticketId!==pending.ticketId),pending]);await this.flushAuthorization();ui.toast(result==='accept'?'已记录本次订阅，发送后需再次订阅':'已记录选择，站内通知仍可查看');}
      catch(error){ui.error(error);}finally{delete this.tickets[scene];this.setData({subscribing:false,scenes:this.data.scenes.map(s=>s.scene===scene?{...s,ready:false}:s)});}
    };
    try{wx.requestSubscribeMessage({tmplIds:[ticket.templateId],success:result=>complete(['accept','reject','ban','filter'].includes(result[ticket.templateId])?result[ticket.templateId]:'fail'),fail:()=>complete('fail')});}
    catch{complete('fail');}
  }
});
