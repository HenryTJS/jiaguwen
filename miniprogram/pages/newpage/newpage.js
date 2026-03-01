const oracle = require('../../utils/oracle');
const ORACLE_FONT_FAMILY = 'OracleKaiTi';
const ORACLE_FONT_URL = '';

Page({
  data: {
    oracleDetail: {
      a: '',
      b: '',
      c: '',
      d: '',
    },
  },
  onLoad() {
    console.log('新页面加载完成');
    this.loadOracleFontFace();

    // 计算卜辞编号
    const baseDate = new Date(2025, 11, 21); // 2025年12月21日
    const currentDate = new Date();
    const diffDays = Math.floor((currentDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    const oracleIndex = diffDays % oracle.length;

    // 设置卜辞内容
    this.setData({
      oracleDetail: {
        a: oracle[oracleIndex].a,
        b: oracle[oracleIndex].b,
        c: oracle[oracleIndex].c,
        d: oracle[oracleIndex].d,
      },
    });
  },
  loadOracleFontFace() {
    if (!ORACLE_FONT_URL) {
      return;
    }

    wx.loadFontFace({
      family: ORACLE_FONT_FAMILY,
      source: `url('${ORACLE_FONT_URL}')`,
      success: () => {
        console.log('卜辞字体加载成功');
      },
      fail: (err) => {
        console.warn('卜辞字体加载失败，回退系统字体', err);
      },
    });
  },
  viewDictionary() {
    wx.navigateTo({
      url: '/pages/partone/partone',
    });
  },
  viewMap() {
    wx.navigateTo({
      url: '/pages/newpage/newpage',
    });
  },
  downloadResources() {
    wx.showToast({
      title: '下载功能暂未开通',
      icon: 'none',
    });
  },
  openStore() {
    wx.showToast({
      title: '商城功能暂未开通',
      icon: 'none',
    });
  },
  onImageClick(e) {
    // 判断点击的是哪张图片
    const { src } = e.currentTarget.dataset;
    console.log('点击的图片路径:', src); // 添加调试日志
    if (src === '/images/1.png') {
      wx.navigateTo({
        url: '/pages/partone/partone',
      });
      return;
    }

    if (src === '/images/2.png') {
      wx.navigateTo({
        url: '/pages/parttwo/parttwo',
      });
      return;
    }

    wx.showToast({
      title: '该功能暂未开通',
      icon: 'none',
    });
  },
});
