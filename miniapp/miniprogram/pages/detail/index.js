const api=require('../../services/api');const dates=require('../../utils/dates');const ui=require('../../utils/ui');
const performance=require('../../utils/performance');
Page({
  data:{loading:true,entry:null,comment:'',error:''},
  onLoad(options){this.entryId=options.id;const saved=api.consumeSavedEntry(this.entryId);if(saved){this.renderView(saved);this.savedFirstShow=true;}},
  async onShow(){if(this.savedFirstShow){this.savedFirstShow=false;return;}await this.refresh();},
  async onPullDownRefresh(){try{await this.refresh();}finally{wx.stopPullDownRefresh();}},
  renderView({state,entry:e}){
    const names=state.names||{},likedBy=e.likedBy||[],comments=e.comments||[];
    this.setData({state,entry:{...e,likedBy,authorName:names[e.authorId]||'我们',initial:(names[e.authorId]||'我')[0],timeLabel:dates.relativeTime(e.createdAt),mine:e.authorId===state.actor.id,liked:likedBy.includes(state.actor.id),comments:comments.map(c=>({...c,authorName:names[c.authorId]||'我们',timeLabel:dates.relativeTime(c.createdAt)}))},loading:false,error:''});
  },
  async refresh(){const started=Date.now();let ok=false;try{this.renderView(await api.getEntryView(this.entryId));ok=true;}catch(error){this.setData({error:error.message,loading:false,entry:null});}finally{performance.record('detail.refresh',Date.now()-started,{ok});}},
  input(event){this.setData({comment:event.detail.value});},
  async comment(){
    if(this.data.sending||!this.data.comment.trim())return;
    const body=this.data.comment;
    if(!this.pendingComment||this.pendingComment.body!==body)this.pendingComment={body,requestId:api.requestId()};
    this.setData({sending:true});
    try{await api.call('commentEntry',{id:this.entryId,...this.pendingComment});this.pendingComment=null;this.setData({comment:''});await this.refresh();ui.toast('悄悄话，已经留下啦');}
    catch(error){ui.error(error);}finally{this.setData({sending:false});}
  },
  async like(){try{await api.call('likeEntry',{id:this.entryId,liked:!this.data.entry.liked});await this.refresh();}catch(error){ui.error(error);}},
  edit(){ui.navigate('/pages/compose/index?id='+this.entryId);},
  preview(event){wx.previewImage({current:event.currentTarget.dataset.url,urls:this.data.entry.images.map(i=>i.url).filter(Boolean)});}
});
