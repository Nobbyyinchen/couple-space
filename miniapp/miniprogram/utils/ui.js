function error(error){wx.showToast({title:(error&&error.message)||'没有完成，请稍后再试',icon:'none',duration:2800});}
function toast(title){wx.showToast({title,icon:'none'});}
function navigate(url){wx.navigateTo({url});}
function confirm(title,content){return new Promise(resolve=>wx.showModal({title,content,confirmColor:'#8E5265',success:result=>resolve(result.confirm),fail:()=>resolve(false)}));}
module.exports={error,toast,navigate,confirm};
