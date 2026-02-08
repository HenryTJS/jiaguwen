Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
    },
  },
  onLoad() {
    // 页面首次加载时的初始化
  },
  onShow() {
    const app = getApp();
    // 检查是否已登录
    if (!app.globalData.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/index/index',
      });
      return;
    }

    this.setData({
      userInfo: app.globalData.userInfo || {
        avatarUrl: '',
        nickName: '未登录用户',
      },
    });
  },
  viewDictionary() {
    wx.showToast({
      title: '功能暂未开通',
      icon: 'none',
    });
  },
  viewMap() {
    wx.showToast({
      title: '功能暂未开通',
      icon: 'none',
    });
  },
  downloadResources() {
    wx.showToast({
      title: '功能暂未开通',
      icon: 'none',
    });
  },
  openStore() {
    wx.showToast({
      title: '功能暂未开通',
      icon: 'none',
    });
  },
});
