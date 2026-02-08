App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    userKey: 'guest',
    openid: '',
  },
  onLaunch() {
    // 初始化云环境（使用当前账号的环境 ID）
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-0gqn8jn79cf1d67d',
        traceUser: true,
      });

      wx.cloud.callFunction({
        name: 'login',
      }).then((res) => {
        console.log('login result', res);
        const openid = res && res.result && res.result.openid ? res.result.openid : '';
        this.globalData.openid = openid;
        if (openid) {
          try {
            wx.setStorageSync('openid', openid);
          } catch (e) {}
        }
        if (this.openidReadyCallback) {
          this.openidReadyCallback(openid);
        }
      }).catch((err) => {
        console.error('login failed', err);
        wx.showToast({ title: '登录失败，请检查云函数', icon: 'none' });
        if (this.openidReadyCallback) {
          this.openidReadyCallback('');
        }
      });
    }

    // 恢复本地登录态
    try {
      const storedUserKey = wx.getStorageSync('userKey');
      const storedUserInfo = wx.getStorageSync('userInfo');
      const storedIsLoggedIn = wx.getStorageSync('isLoggedIn');
      const storedOpenid = wx.getStorageSync('openid');

      this.globalData.userKey = storedUserKey || 'guest';
      this.globalData.userInfo = storedUserInfo || null;
      this.globalData.isLoggedIn = !!storedIsLoggedIn;
      this.globalData.openid = storedOpenid || '';
    } catch (e) {}

    wx.login({
      success: (res) => {
        console.log(res.code);
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    });
  },
});
