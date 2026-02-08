const data = require('../../utils/data');
const DEFAULT_AVATAR_URL = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';

Page({
  data: {
    image: '',
    text: '',
    itemType: 'word',
    itemKey: '',
    openid: '',
    isLiked: false,
    likeCount: 0,
    commentCount: 0,
    showCommentInput: false,
    commentText: '',
    comments: [],
  },
  onLoad(options) {
    const decodedImage = options && options.image ? decodeURIComponent(options.image) : '';
    const decodedText = options && options.text ? decodeURIComponent(options.text) : '';

    // 若未传 image，但传了 text，则尝试依据数据源解析图片路径
    let finalImage = decodedImage;
    if (!finalImage && decodedText) {
      const idx = data.findIndex(d => d.text === decodedText);
      if (idx >= 0) {
        finalImage = data[idx].detail;
      }
    }

    this.setData({ 
      image: finalImage, 
      text: decodedText,
      itemKey: decodedText
    });

    if (decodedText) {
      wx.setNavigationBarTitle({ title: decodedText });
    }

    this.ensureOpenid().then(() => {
      this.loadInteractions();
    });
  },
  
  // 点赞功能
  toggleLike() {
    const { isLiked, itemType, itemKey } = this.data;
    if (!itemKey) {
      return;
    }

    this.ensureOpenid().then((openid) => {
      if (!openid) {
        wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
        return;
      }

      const db = wx.cloud.database();
      const likes = db.collection('likes');

      if (isLiked) {
        likes.where({ type: itemType, key: itemKey, _openid: openid }).get()
          .then((res) => {
            const removeTasks = (res.data || []).map((item) => likes.doc(item._id).remove());
            return Promise.all(removeTasks);
          })
          .then(() => {
            this.setData({ isLiked: false });
            this.refreshLikeCount();
          })
          .catch((err) => {
            console.error('toggleLike remove failed', err);
            wx.showToast({ title: '取消点赞失败', icon: 'none' });
          });
        return;
      }

      likes.add({
        data: {
          type: itemType,
          key: itemKey,
          createdAt: db.serverDate()
        }
      }).then(() => {
        this.setData({ isLiked: true });
        this.refreshLikeCount();
      }).catch((err) => {
        console.error('toggleLike add failed', err);
        wx.showToast({ title: '点赞失败', icon: 'none' });
      });
    });
  },
  
  // 显示评论输入框
  showCommentInput() {
    this.setData({ showCommentInput: true });
  },
  
  // 输入评论
  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },
  
  // 提交评论
  submitComment() {
    const commentText = this.data.commentText.trim();
    if (!commentText) {
      wx.showToast({ title: '评论不能为空', icon: 'none' });
      return;
    }

    const { itemType, itemKey } = this.data;
    if (!itemKey) {
      return;
    }

    this.ensureOpenid().then((openid) => {
      if (!openid) {
        wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
        return;
      }

      this.ensureUserProfile().then((profile) => {
        if (!profile) {
          return;
        }

        const db = wx.cloud.database();
        db.collection('comments').add({
          data: {
            type: itemType,
            key: itemKey,
            text: commentText,
            authorName: profile.nickName || '匿名用户',
            authorAvatar: profile.avatarUrl || DEFAULT_AVATAR_URL,
            createdAt: db.serverDate()
          }
        }).then(() => {
          this.setData({
            commentText: '',
            showCommentInput: false
          });
          this.loadComments();
          wx.showToast({ title: '评论成功', icon: 'success' });
        }).catch((err) => {
          console.error('submitComment failed', err);
          wx.showToast({ title: '评论失败', icon: 'none' });
        });
      });
    });
  },
  
  // 删除评论
  deleteComment(e) {
    const commentId = e.currentTarget.dataset.id;
    const commentOpenid = e.currentTarget.dataset.openid;
    const { openid } = this.data;

    if (!commentId) {
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
        db.collection('comments').doc(commentId).remove().then(() => {
          this.loadComments();
          wx.showToast({ title: '已删除', icon: 'success' });
        }).catch((err) => {
          console.error('deleteComment failed', err);
          wx.showToast({ title: '删除失败', icon: 'none' });
        });
      }
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

  refreshLikeCount() {
    const { itemType, itemKey } = this.data;
    if (!itemKey) {
      return;
    }

    const db = wx.cloud.database();
    db.collection('likes').where({ type: itemType, key: itemKey }).count()
      .then((res) => {
        this.setData({ likeCount: res.total || 0 });
      })
      .catch((err) => {
        console.error('refreshLikeCount failed', err);
      });
  },

  loadComments() {
    const { itemType, itemKey } = this.data;
    if (!itemKey) {
      return;
    }

    const db = wx.cloud.database();
    db.collection('comments')
      .where({ type: itemType, key: itemKey })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()
      .then((res) => {
        const comments = (res.data || []).map((item) => ({
          ...item,
          authorName: item.authorName || '匿名用户',
          authorAvatar: item.authorAvatar || DEFAULT_AVATAR_URL,
          time: formatTime(item.createdAt)
        }));
        this.setData({
          comments,
          commentCount: comments.length
        });
      })
      .catch((err) => {
        console.error('loadComments failed', err);
      });
  },

  loadInteractions() {
    const { itemType, itemKey, openid } = this.data;
    if (!itemKey) {
      return;
    }

    const db = wx.cloud.database();
    const likeCountPromise = db.collection('likes').where({ type: itemType, key: itemKey }).count();
    const commentPromise = db.collection('comments')
      .where({ type: itemType, key: itemKey })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    const likedPromise = openid
      ? db.collection('likes').where({ type: itemType, key: itemKey, _openid: openid }).count()
      : Promise.resolve({ total: 0 });

    Promise.all([likeCountPromise, commentPromise, likedPromise])
      .then(([likeRes, commentRes, likedRes]) => {
        const comments = (commentRes.data || []).map((item) => ({
          ...item,
          authorName: item.authorName || '匿名用户',
          authorAvatar: item.authorAvatar || DEFAULT_AVATAR_URL,
          time: formatTime(item.createdAt)
        }));
        this.setData({
          likeCount: likeRes.total || 0,
          comments,
          commentCount: comments.length,
          isLiked: (likedRes.total || 0) > 0
        });
      })
      .catch((err) => {
        console.error('loadInteractions failed', err);
      });
  },

  onShareAppMessage() {
    const title = this.data.text || '字详情';
    const image = this.data.image || '';
    const path = `/pages/worddetail/worddetail?text=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`;

    return {
      title,
      path,
      imageUrl: image
    };
  },

  onShareTimeline() {
    const title = this.data.text || '字详情';
    const image = this.data.image || '';
    const query = `text=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}`;

    return {
      title,
      query,
      imageUrl: image
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
