const api=require('../../services/api');
const ui=require('../../utils/ui');
Page({
  data:{state:null,entries:[],visible:[],filter:'all',loading:true,loadingMore:false,error:'',query:''},
  async onShow(){api.refreshNotificationBadge();await this.refresh();},
  async onPullDownRefresh(){api.refreshNotificationBadge();try{await this.refresh();}finally{wx.stopPullDownRefresh();}},
  async refresh(){try{const state=await api.requireSpace();if(!state){this.setData({loading:false});return;}this.setData({state,entries:state.entries,loading:false,cursor:state.cursor,error:''});this.filterEntries();}catch(error){this.setData({loading:false,error:error.message});}},
  async more(){if(!this.data.cursor||this.data.loadingMore)return;this.setData({loadingMore:true});try{const state=await api.getState({cursor:this.data.cursor});const ids=new Set(this.data.entries.map(e=>e.id));this.setData({entries:[...this.data.entries,...state.entries.filter(e=>!ids.has(e.id))],cursor:state.cursor});this.filterEntries();}catch(error){ui.error(error);}finally{this.setData({loadingMore:false});}},
  filter(event){this.setData({filter:event.currentTarget.dataset.filter});this.filterEntries();},
  search(event){this.setData({query:event.detail.value});this.filterEntries();},
  filterEntries(){const query=this.data.query.trim().toLowerCase();this.setData({visible:this.data.entries.filter(e=>(this.data.filter!=='photos'||e.images.length>0)&&(!query||(e.title+' '+e.body).toLowerCase().includes(query)))});},
  compose(){ui.navigate('/pages/compose/index');},detail(event){ui.navigate('/pages/detail/index?id='+event.currentTarget.dataset.id);},
  preview(event){const entry=this.data.entries.find(e=>e.id===event.currentTarget.dataset.id);wx.previewImage({current:event.currentTarget.dataset.url,urls:entry.images.map(m=>m.url).filter(Boolean)});},
  async like(event){const entry=this.data.entries.find(e=>e.id===event.currentTarget.dataset.id);try{await api.call('likeEntry',{id:entry.id,liked:!entry.liked});const updated={...entry,liked:!entry.liked,likeCount:entry.likeCount+(entry.liked?-1:1)};this.setData({entries:this.data.entries.map(e=>e.id===entry.id?updated:e)});this.filterEntries();}catch(error){ui.error(error);}}
});
