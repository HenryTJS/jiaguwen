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
  logout() {
    wx.showModal({
      title: '提示',
      content: '确认退出登录吗？',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        const app = getApp();
        app.globalData.userInfo = null;
        app.globalData.isLoggedIn = false;
        app.globalData.userKey = 'guest';

        try {
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('isLoggedIn');
          wx.removeStorageSync('userKey');
        } catch (e) {}

        wx.reLaunch({
          url: '/pages/index/index',
        });
      },
    });
  },
});
