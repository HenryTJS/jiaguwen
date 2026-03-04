const map = require('../../utils/map.js');

const DEFAULT_AVATAR_URL = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';

Page({
  data: {
    items: [],
    currentItems: [],
    searchQuery: '',
    openid: '',
    interactionMap: {},
    likeSubmitting: {}
  },

  async onLoad() {
    this.setData({
      items: map,
      currentItems: map
    });

    await this.ensureOpenid();
    this.refreshCurrentItemsUI();
    this.loadInteractionsForBatch(this.data.currentItems);
  },

  noop() {},

  getDefaultInteractionState() {
    return {
      isLiked: false,
      likeCount: 0,
      commentCount: 0,
      showCommentInput: false,
      commentText: '',
      comments: []
    };
  },

  getItemKey(item) {
    return item && item.text ? item.text : '';
  },

  getInteractionStateByKey(key) {
    if (!key) {
      return this.getDefaultInteractionState();
    }
    return this.data.interactionMap[key] || this.getDefaultInteractionState();
  },

  setInteractionStateByKey(key, patch) {
    if (!key) {
      return;
    }

    const current = this.getInteractionStateByKey(key);
    const interactionMap = {
      ...this.data.interactionMap,
      [key]: {
        ...current,
        ...patch
      }
    };

    this.setData({ interactionMap });
    this.refreshCurrentItemsUI();
  },

  refreshCurrentItemsUI() {
    const list = this.data.currentItems.map((item) => ({
      ...item,
      _ui: this.getInteractionStateByKey(this.getItemKey(item))
    }));
    this.setData({ currentItems: list });
  },

  onSearchInput(event) {
    this.setData({
      searchQuery: event.detail.value
    });
  },

  onSearchTap() {
    const { searchQuery, items } = this.data;

    if (!searchQuery.trim()) {
      this.setData({
        currentItems: items
      });
      this.refreshCurrentItemsUI();
      this.loadInteractionsForBatch(items);
      return;
    }

    const filteredItems = items.filter(item => item.text.includes(searchQuery));

    if (filteredItems.length === 0) {
      wx.showToast({
        title: '未找到匹配项',
        icon: 'none'
      });
      return;
    }

    this.setData({
      currentItems: filteredItems
    });
    this.refreshCurrentItemsUI();
    this.loadInteractionsForBatch(filteredItems);
  },

  goToDetail(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.currentItems[index];
    wx.navigateTo({
      url: `/pages/mapdetail/mapdetail?text=${encodeURIComponent(item.text)}&picture=${encodeURIComponent(item.picture)}`
    });
  },

  ensureOpenid() {
    const app = getApp();
    if (app.globalData.openid) {
      this.setData({ openid: app.globalData.openid });
      return Promise.resolve(app.globalData.openid);
    }

    return new Promise((resolve) => {
      app.openidReadyCallback = (openid) => {
        this.setData({ openid: openid || '' });
        resolve(openid || '');
      };
    });
  },

  ensureUserProfile() {
    const app = getApp();
    if (app.globalData.userInfo && app.globalData.userInfo.nickName) {
      return Promise.resolve(app.globalData.userInfo);
    }

    if (!wx.canIUse('getUserProfile')) {
      wx.showToast({ title: '当前版本不支持授权', icon: 'none' });
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      wx.getUserProfile({
        desc: '用于展示评论头像和昵称',
        success: (res) => {
          const userInfo = res.userInfo || {};
          app.globalData.userInfo = userInfo;
          app.globalData.isLoggedIn = true;
          try {
            wx.setStorageSync('userInfo', userInfo);
            wx.setStorageSync('isLoggedIn', true);
          } catch (e) {}
          resolve(userInfo);
        },
        fail: () => {
          wx.showToast({ title: '未授权，无法发表评论', icon: 'none' });
          resolve(null);
        }
      });
    });
  },

  getLikeCount(itemKey) {
    if (!itemKey) {
      return Promise.resolve(0);
    }

    const db = wx.cloud.database();
    return db.collection('likes')
      .where({ type: 'map', key: itemKey })
      .count()
      .then((res) => res.total || 0);
  },

  loadCommentsForKey(itemKey) {
    if (!itemKey) {
      return Promise.resolve([]);
    }

    const db = wx.cloud.database();
    return db.collection('comments')
      .where({ type: 'map', key: itemKey })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
      .then((res) => {
        return (res.data || []).map((item) => ({
          ...item,
          key: itemKey,
          authorName: item.authorName || '匿名用户',
          authorAvatar: item.authorAvatar || DEFAULT_AVATAR_URL,
          time: formatTime(item.createdAt)
        }));
      });
  },

  loadInteractionsForBatch(list) {
    const openid = this.data.openid;
    const tasks = (list || []).map((item) => {
      const itemKey = this.getItemKey(item);
      if (!itemKey) {
        return Promise.resolve();
      }

      const db = wx.cloud.database();
      const likeCountPromise = this.getLikeCount(itemKey);
      const commentPromise = this.loadCommentsForKey(itemKey);
      const likedPromise = openid
        ? db.collection('likes').where({ type: 'map', key: itemKey, _openid: openid }).count()
        : Promise.resolve({ total: 0 });

      return Promise.all([likeCountPromise, commentPromise, likedPromise])
        .then(([likeCount, comments, likedRes]) => {
          this.setInteractionStateByKey(itemKey, {
            likeCount: likeCount || 0,
            commentCount: comments.length,
            comments,
            isLiked: (likedRes.total || 0) > 0
          });
        })
        .catch((err) => {
          console.error('loadInteractionsForBatch failed', itemKey, err);
        });
    });

    return Promise.all(tasks);
  },

  toggleLike(e) {
    const itemKey = e.currentTarget.dataset.key;
    if (!itemKey) {
      return;
    }

    const submitting = this.data.likeSubmitting[itemKey];
    if (submitting) {
      return;
    }

    const likeSubmitting = {
      ...this.data.likeSubmitting,
      [itemKey]: true
    };
    this.setData({ likeSubmitting });

    this.ensureOpenid().then((openid) => {
      if (!openid) {
        wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
        return;
      }

      const db = wx.cloud.database();
      const likes = db.collection('likes');
      const current = this.getInteractionStateByKey(itemKey);

      const action = current.isLiked
        ? likes.where({ type: 'map', key: itemKey, _openid: openid }).get().then((res) => {
          const removeTasks = (res.data || []).map((row) => likes.doc(row._id).remove());
          return Promise.all(removeTasks);
        })
        : likes.add({
          data: {
            type: 'map',
            key: itemKey,
            createdAt: db.serverDate()
          }
        });

      return action.then(() => this.getLikeCount(itemKey))
        .then((likeCount) => {
          this.setInteractionStateByKey(itemKey, {
            isLiked: !current.isLiked,
            likeCount: likeCount || 0
          });
        });
    }).catch((err) => {
      console.error('toggleLike failed', err);
      wx.showToast({ title: '收藏失败', icon: 'none' });
    }).finally(() => {
      const nextSubmitting = {
        ...this.data.likeSubmitting,
        [itemKey]: false
      };
      this.setData({ likeSubmitting: nextSubmitting });
    });
  },

  toggleCommentInput(e) {
    const itemKey = e.currentTarget.dataset.key;
    if (!itemKey) {
      return;
    }
    const current = this.getInteractionStateByKey(itemKey);
    this.setInteractionStateByKey(itemKey, {
      showCommentInput: !current.showCommentInput
    });
  },

  onCommentInput(e) {
    const itemKey = e.currentTarget.dataset.key;
    if (!itemKey) {
      return;
    }
    this.setInteractionStateByKey(itemKey, {
      commentText: e.detail.value
    });
  },

  submitComment(e) {
    const itemKey = e.currentTarget.dataset.key;
    if (!itemKey) {
      return;
    }

    const current = this.getInteractionStateByKey(itemKey);
    const commentText = (current.commentText || '').trim();
    if (!commentText) {
      wx.showToast({ title: '评论不能为空', icon: 'none' });
      return;
    }

    this.ensureOpenid().then((openid) => {
      if (!openid) {
        wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
        return null;
      }
      return this.ensureUserProfile();
    }).then((profile) => {
      if (!profile) {
        return;
      }

      const db = wx.cloud.database();
      return db.collection('comments').add({
        data: {
          type: 'map',
          key: itemKey,
          text: commentText,
          authorName: profile.nickName || '匿名用户',
          authorAvatar: profile.avatarUrl || DEFAULT_AVATAR_URL,
          createdAt: db.serverDate()
        }
      }).then(() => this.loadCommentsForKey(itemKey))
        .then((comments) => {
          this.setInteractionStateByKey(itemKey, {
            commentText: '',
            showCommentInput: false,
            comments,
            commentCount: comments.length
          });
          wx.showToast({ title: '评论成功', icon: 'success' });
        });
    }).catch((err) => {
      console.error('submitComment failed', err);
      wx.showToast({ title: '评论失败', icon: 'none' });
    });
  },

  deleteComment(e) {
    const commentId = e.currentTarget.dataset.id;
    const commentOpenid = e.currentTarget.dataset.openid;
    const itemKey = e.currentTarget.dataset.key;
    const { openid } = this.data;

    if (!commentId || !itemKey) {
      return;
    }

    if (!openid || commentOpenid !== openid) {
      wx.showToast({ title: '只能删除自己的评论', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        const db = wx.cloud.database();
        db.collection('comments').doc(commentId).remove()
          .then(() => this.loadCommentsForKey(itemKey))
          .then((comments) => {
            this.setInteractionStateByKey(itemKey, {
              comments,
              commentCount: comments.length
            });
            wx.showToast({ title: '已删除', icon: 'success' });
          })
          .catch((err) => {
            console.error('deleteComment failed', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
      }
    });
  },

  prepareShare() {},

  onShareAppMessage(res) {
    const dataset = res && res.target ? res.target.dataset || {} : {};
    const title = dataset.text || '场景详情';
    const picture = dataset.picture || '';

    return {
      title,
      path: `/pages/mapdetail/mapdetail?text=${encodeURIComponent(title)}&picture=${encodeURIComponent(picture)}`,
      imageUrl: picture
    };
  },

  onShareTimeline() {
    return {
      title: '古今穿越地图',
      query: '',
      imageUrl: ''
    };
  }
});

function formatTime(value) {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  return `${hh}:${mm}`;
}
