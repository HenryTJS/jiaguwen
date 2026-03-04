const today = require('../../utils/today');

const POSTER_FONT_FAMILY = 'JiaguwenPosterFont';
const POSTER_FONT_SOURCE = '';

Page({
  data: {
    showTodayPopup: false,
    currentToday: null,
    poemLines: [],
    explanationLines: [],
    posterImagePath: '',
    posterFontReady: false,
  },

  onLoad() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
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

  getDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getCurrentUserIdentity() {
    const app = getApp();
    const globalData = app && app.globalData ? app.globalData : {};

    const openid = globalData.openid || wx.getStorageSync('openid') || '';

    let userKey = globalData.userKey || '';
    if (!userKey || userKey === 'guest') {
      try {
        userKey = wx.getStorageSync('userKey') || '';
      } catch (e) {
        userKey = '';
      }
    }

    if (userKey === 'guest') {
      userKey = '';
    }

    return {
      openid,
      userKey,
    };
  },

  getStableUserId() {
    const { openid, userKey } = this.getCurrentUserIdentity();
    if (openid) {
      return `openid_${openid}`;
    }
    if (userKey) {
      return `userkey_${userKey}`;
    }
    return '';
  },

  getLegacyUserId() {
    const { userKey } = this.getCurrentUserIdentity();
    if (userKey) {
      return `legacy_${userKey}`;
    }
    return '';
  },

  getTodayStorageKey(userId) {
    return `todayOracle_${userId}_${this.getDateKey()}`;
  },

  getCloudTodayDocId(openid) {
    return `${openid}_${this.getDateKey()}`;
  },

  getCachedTodaySign(userId) {
    if (!userId) {
      return null;
    }
    try {
      const cached = wx.getStorageSync(this.getTodayStorageKey(userId));
      if (cached && cached.id) {
        return cached;
      }
    } catch (e) {}
    return null;
  },

  cacheTodaySignLocally(signData) {
    const stableUserId = this.getStableUserId();
    const legacyUserId = this.getLegacyUserId();
    if (!signData || !signData.id) {
      return;
    }
    try {
      if (stableUserId) {
        wx.setStorageSync(this.getTodayStorageKey(stableUserId), signData);
      }
      if (legacyUserId) {
        wx.setStorageSync(this.getTodayStorageKey(legacyUserId), signData);
      }
    } catch (e) {}
  },

  async getTodaySignFromCloud(openid) {
    if (!openid || !wx.cloud || !wx.cloud.database) {
      return null;
    }

    const db = wx.cloud.database();
    const collection = db.collection('daily_oracle');
    const docId = this.getCloudTodayDocId(openid);

    try {
      const found = await collection.doc(docId).get();
      const signData = found && found.data ? (found.data.sign || null) : null;
      if (signData && signData.id) {
        this.cacheTodaySignLocally(signData);
        return signData;
      }
    } catch (err) {}

    const randomIndex = Math.floor(Math.random() * today.length);
    const selected = today[randomIndex] || null;
    if (!selected) {
      return null;
    }

    try {
      await collection.doc(docId).set({
        data: {
          _id: docId,
          openid,
          dateKey: this.getDateKey(),
          signId: selected.id,
          sign: selected,
          createdAt: db.serverDate(),
        },
      });
      this.cacheTodaySignLocally(selected);
      return selected;
    } catch (err) {
      try {
        const foundAfterSet = await collection.doc(docId).get();
        const signData = foundAfterSet && foundAfterSet.data ? (foundAfterSet.data.sign || null) : null;
        if (signData && signData.id) {
          this.cacheTodaySignLocally(signData);
          return signData;
        }
      } catch (readErr) {}
      return null;
    }
  },

  requireLoginForToday() {
    const app = getApp();
    const isLoggedIn = !!(app && app.globalData && app.globalData.isLoggedIn);
    const stableUserId = this.getStableUserId();
    if (isLoggedIn && stableUserId) {
      return true;
    }

    wx.showModal({
      title: '请先登录',
      content: '游客暂不支持使用“今日卜辞”，请先登录后再抽签。',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/index/index',
          });
        }
      },
    });
    return false;
  },

  async getTodaySignForUser() {
    const stableUserId = this.getStableUserId();
    const legacyUserId = this.getLegacyUserId();
    const { openid } = this.getCurrentUserIdentity();

    const cloudSign = await this.getTodaySignFromCloud(openid);
    if (cloudSign) {
      return cloudSign;
    }

    const stableCached = this.getCachedTodaySign(stableUserId);
    if (stableCached) {
      return stableCached;
    }

    const legacyCached = this.getCachedTodaySign(legacyUserId);
    if (legacyCached) {
      try {
        wx.setStorageSync(this.getTodayStorageKey(stableUserId), legacyCached);
      } catch (e) {}
      return legacyCached;
    }

    const randomIndex = Math.floor(Math.random() * today.length);
    const selected = today[randomIndex] || null;
    if (!selected) {
      wx.showToast({ title: '暂无签文数据', icon: 'none' });
      return null;
    }

    this.cacheTodaySignLocally(selected);
    return selected;
  },

  async openTodayPopup() {
    if (!this.requireLoginForToday()) {
      return;
    }

    wx.showLoading({ title: '抽签中...' });
    const selected = await this.getTodaySignForUser();
    wx.hideLoading();
    if (!selected) {
      wx.showToast({ title: '读取签文失败', icon: 'none' });
      return;
    }

    this.setData({
      showTodayPopup: true,
      currentToday: selected,
      poemLines: this.splitLines(selected.poem),
      explanationLines: this.splitLines(selected.explanation),
      posterImagePath: '',
    });
  },

  closeTodayPopup() {
    this.setData({
      showTodayPopup: false,
    });
  },

  stopMaskClose() {},

  splitLines(content) {
    return String(content || '').split('\n');
  },

  wrapLineByWidth(ctx, text, maxWidth) {
    const chars = String(text || '').split('');
    const lines = [];
    let line = '';

    chars.forEach((char) => {
      const testLine = `${line}${char}`;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = testLine;
      }
    });

    if (line) {
      lines.push(line);
    }
    return lines;
  },

  getPosterFont(size, weight = 'normal') {
    const fallback = '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif';
    const family = this.data.posterFontReady ? `"${POSTER_FONT_FAMILY}", ${fallback}` : fallback;
    return `${weight} ${size}px ${family}`;
  },

  async ensurePosterFontLoaded() {
    if (this.data.posterFontReady) {
      return true;
    }

    if (!POSTER_FONT_SOURCE || !wx.loadFontFace) {
      return false;
    }

    if (this.posterFontLoadingPromise) {
      return this.posterFontLoadingPromise;
    }

    this.posterFontLoadingPromise = new Promise((resolve) => {
      wx.loadFontFace({
        family: POSTER_FONT_FAMILY,
        source: `url("${POSTER_FONT_SOURCE}")`,
        global: true,
        success: () => {
          this.setData({ posterFontReady: true });
          resolve(true);
        },
        fail: () => {
          resolve(false);
        },
        complete: () => {
          this.posterFontLoadingPromise = null;
        },
      });
    });

    return this.posterFontLoadingPromise;
  },

  fillRoundRect(ctx, x, y, width, height, radius, color) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  },

  generateTodayPoster() {
    const { currentToday } = this.data;
    if (!currentToday) {
      return Promise.reject(new Error('empty today data'));
    }

    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#todayPosterCanvas').fields({ node: true, size: true }).exec((res) => {
        const canvasRes = res && res[0];
        if (!canvasRes || !canvasRes.node) {
          reject(new Error('canvas not found'));
          return;
        }

        const canvas = canvasRes.node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;

        const width = 750;
        const height = 1180;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        ctx.textBaseline = 'top';

        ctx.fillStyle = '#efe7d8';
        ctx.fillRect(0, 0, width, height);

        const cardX = 34;
        const cardY = 44;
        const cardWidth = width - cardX * 2;
        const cardHeight = height - cardY * 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;
        this.fillRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, 24, '#fdf8f0');
        ctx.restore();

        ctx.fillStyle = '#5f3a12';
        ctx.textAlign = 'center';
        ctx.font = this.getPosterFont(42, '700');
        ctx.fillText('今日卜辞', width / 2, cardY + 42);
        ctx.textAlign = 'left';

        const sidePadding = 36;
        const contentLeft = cardX + sidePadding;
        const contentWidth = cardWidth - sidePadding * 2;
        const contentBottom = cardY + cardHeight - 42;

        let y = cardY + 130;

        ctx.fillStyle = '#8c5c2d';
        ctx.font = this.getPosterFont(34, '700');
        ctx.fillText('签文', contentLeft, y);
        y += 52;

        ctx.fillStyle = '#333333';
        ctx.font = this.getPosterFont(30, '500');
        this.splitLines(currentToday.poem).forEach((line) => {
          if (y >= contentBottom) {
            return;
          }
          const wrapped = this.wrapLineByWidth(ctx, line, contentWidth);
          const rows = wrapped.length ? wrapped : [''];
          rows.forEach((row) => {
            if (y < contentBottom) {
              ctx.fillText(row, contentLeft, y);
              y += 44;
            }
          });
        });

        y += 18;
        ctx.fillStyle = '#8c5c2d';
        ctx.font = this.getPosterFont(34, '700');
        ctx.fillText('解签', contentLeft, y);
        y += 52;

        ctx.fillStyle = '#333333';
        ctx.font = this.getPosterFont(30, '500');
        let hasOverflow = false;
        this.splitLines(currentToday.explanation).forEach((line) => {
          if (y >= contentBottom) {
            hasOverflow = true;
            return;
          }
          const wrapped = this.wrapLineByWidth(ctx, line, contentWidth);
          const rows = wrapped.length ? wrapped : [''];
          rows.forEach((row) => {
            if (y < contentBottom) {
              ctx.fillText(row, contentLeft, y);
              y += 42;
            } else {
              hasOverflow = true;
            }
          });
        });

        if (hasOverflow && y < contentBottom) {
          ctx.fillText('……', contentLeft, y);
        }

        wx.canvasToTempFilePath({
          canvas,
          width,
          height,
          destWidth: width,
          destHeight: height,
          success: (fileRes) => {
            const path = fileRes.tempFilePath;
            this.setData({ posterImagePath: path });
            resolve(path);
          },
          fail: (err) => {
            reject(err);
          },
        }, this);
      });
    });
  },

  async ensurePosterImage(forceRegenerate = false) {
    await this.ensurePosterFontLoaded();

    if (!forceRegenerate && this.data.posterImagePath) {
      return this.data.posterImagePath;
    }
    wx.showLoading({ title: '生成中...' });
    try {
      const path = await this.generateTodayPoster();
      return path;
    } finally {
      wx.hideLoading();
    }
  },

  async generatePosterImage() {
    try {
      const path = await this.ensurePosterImage(true);
      wx.previewImage({
        current: path,
        urls: [path],
      });
    } catch (err) {
      wx.showToast({ title: '生成图片失败', icon: 'none' });
      console.error('generatePosterImage error', err);
    }
  },

  onShareAppMessage() {
    const { currentToday } = this.data;
    const title = currentToday ? `今日卜辞·第${currentToday.id}签` : '今日卜辞';
    return {
      title,
      path: '/pages/newpage/newpage',
      imageUrl: this.data.posterImagePath || '',
    };
  },

  onShareTimeline() {
    const { currentToday } = this.data;
    const title = currentToday ? `今日卜辞·第${currentToday.id}签` : '今日卜辞';
    return {
      title,
      query: currentToday ? `id=${currentToday.id}` : '',
      imageUrl: this.data.posterImagePath || '',
    };
  },
});
