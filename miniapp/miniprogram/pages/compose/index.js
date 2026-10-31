const api=require('../../services/api');const dates=require('../../utils/dates');const ui=require('../../utils/ui');
const performance=require('../../utils/performance');
Page({
  data:{title:'',body:'',date:dates.today(),images:[],saving:false,demo:api.isDemo(),id:'',revision:0,requestId:api.requestId(),ready:false},
  async onLoad(options){
    this.setData({requestId:api.requestId()});
    try{
      if(options.id){const {state,entry}=await api.getEntryView(options.id);if(entry.authorId!==state.actor.id)throw Error('只能编辑自己的回忆');this.setData({id:entry.id,title:entry.title,body:entry.body,date:entry.date,images:entry.images,revision:entry.revision});}
      else{const state=await api.requireContext();if(!state)return;const saved=wx.getStorageSync(api.draftKey());if(saved)this.setData(saved);}
      this.setData({ready:true});
    }catch(error){ui.error(error);}
  },
  onUnload(){if(!this.published&&this.data.ready)this.saveDraft();},
  onHide(){if(!this.published&&this.data.ready)this.saveDraft();},
  input(event){this.setData({[event.currentTarget.dataset.field]:event.detail.value});this.saveDraft();},
  date(event){this.setData({date:event.detail.value});this.saveDraft();},
  saveDraft(){const {title,body,date,images,id,revision,requestId}=this.data;wx.setStorageSync(api.draftKey(),{title,body,date,images,id,revision,requestId});},
  async photos(){try{const photos=await api.choosePhotos(9-this.data.images.length);this.setData({images:[...this.data.images,...photos]});this.saveDraft();}catch(error){if(!/cancel/i.test(error.errMsg||''))ui.error(error);}},
  remove(event){this.setData({images:this.data.images.filter((_,i)=>i!==Number(event.currentTarget.dataset.index))});this.saveDraft();},
  preview(event){wx.previewImage({current:event.currentTarget.dataset.url,urls:this.data.images.map(i=>i.url||i.path).filter(Boolean)});},
  async publish(){
    if(this.data.saving||!this.data.ready)return;if(!this.data.body.trim()){ui.toast('先写一句想记住的话吧');return;}
    if(!dates.validDate(this.data.date)){ui.toast('请检查记录日期');return;}
    const started=Date.now();let confirmed=false;
    this.setData({saving:true});wx.showLoading({title:'正在收藏',mask:true});
    try{
      const images=[...this.data.images];
      for(let i=0;i<images.length;i++){if(!images[i].id){images[i]=await api.uploadPhoto(images[i]);this.setData({images:[...images]});this.saveDraft();}}
      const result=await api.call('saveEntry',{id:this.data.id||undefined,revision:this.data.revision||undefined,title:this.data.title,body:this.data.body,date:this.data.date,imageIds:images.map(m=>m.id),demoImages:images,requestId:this.data.requestId,includeView:true});
      confirmed=true;try{if(result.view)api.rememberSavedEntry(result.view);}catch{}
      this.published=true;try{wx.removeStorageSync(api.draftKey());}catch{}ui.toast('这个瞬间，已经收藏好啦');
      wx.redirectTo({url:'/pages/detail/index?id='+result.id});
    }catch(error){this.saveDraft();ui.error(error);}finally{performance.record('publish.confirmed',Date.now()-started,{ok:confirmed});wx.hideLoading();this.setData({saving:false});}
  },
  async clearDraft(){if(await ui.confirm('清空这份草稿？','只清空手机上的这份草稿，不会修改已发布的回忆。')){wx.removeStorageSync(api.draftKey());this.setData({id:'',revision:0,title:'',body:'',date:dates.today(),images:[],requestId:api.requestId()});}}
});
