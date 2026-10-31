const config = require('./config');
App({
  globalData: { demo: config.demoMode || !config.cloudEnv },
  onShow(){require('./services/api').refreshNotificationBadge();},
  onLaunch() {
    if (!this.globalData.demo) {
      if (!wx.cloud) { wx.showModal({title:'微信版本较旧',content:'请更新微信后再打开情侣空间。',showCancel:false}); return; }
      wx.cloud.init({env:config.cloudEnv,traceUser:false});
    }
  }
});
