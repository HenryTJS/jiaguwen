const DEFAULT_AVATAR_URL = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';

Page({
  data: {
    title: '',
    picture: '',
    video: '',
    itemType: 'map',
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
    if (options.picture && options.video && options.text) {
      const title = decodeURIComponent(options.text);
      this.setData({
        title: title,
        picture: decodeURIComponent(options.picture),
        video: decodeURIComponent(options.video),
        itemKey: title
      });
      wx.setNavigationBarTitle({
        title: title
      });
    }

    this.ensureOpenid().then(() => {
      this.loadInteractions();
    });
  },
  
  longPressVideo() {
    const that = this;
    wx.showActionSheet({
      itemList: ['保存视频'],
      success(res) {
        if (res.tapIndex === 0) {
          that.downloadVideo();
        }
      }
    });
  },
  
  downloadVideo() {
    const videoUrl = this.data.video;
    if (!videoUrl) {
      wx.showToast({ title: '视频地址为空', icon: 'none' });
      return;
    }

    this.ensureAlbumPermission().then((granted) => {
      if (!granted) {
        return;
      }

      const onDownloaded = (tempFilePath) => {
        wx.saveVideoToPhotosAlbum({
          filePath: tempFilePath,
          success() {
            wx.showToast({
              title: '视频保存成功',
              icon: 'success'
            });
          },
          fail() {
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            });
          }
        });
      };

      if (videoUrl.startsWith('cloud://')) {
        if (!wx.cloud || !wx.cloud.downloadFile) {
          wx.showToast({ title: '云能力不可用', icon: 'none' });
          return;
        }
        wx.cloud.downloadFile({
          fileID: videoUrl,
          success: (res) => {
            if (res && res.tempFilePath) {
              onDownloaded(res.tempFilePath);
            } else {
              wx.showToast({ title: '下载失败', icon: 'none' });
            }
          },
          fail: () => {
            wx.showToast({ title: '下载失败', icon: 'none' });
          }
        });
        return;
      }

      wx.downloadFile({
        url: videoUrl,
        success(res) {
          if (res.statusCode === 200 && res.tempFilePath) {
            onDownloaded(res.tempFilePath);
            return;
          }
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        },
        fail() {
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      });
    });
  },

  ensureAlbumPermission() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          const granted = res.authSetting && res.authSetting['scope.writePhotosAlbum'];
          if (granted) {
            resolve(true);
            return;
          }

          if (granted === false) {
            wx.showModal({
              title: '需要授权',
              content: '保存视频到相册需要相册权限',
              confirmText: '去授权',
              cancelText: '取消',
              success: (modalRes) => {
                if (!modalRes.confirm) {
                  resolve(false);
                  return;
                }
                wx.openSetting({
                  success: (settingRes) => {
                    const ok = !!(settingRes.authSetting && settingRes.authSetting['scope.writePhotosAlbum']);
                    resolve(ok);
                  },
                  fail: () => resolve(false)
                });
              }
            });
            return;
          }

          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => resolve(true),
            fail: () => {
              wx.showToast({ title: '未授权，无法保存', icon: 'none' });
              resolve(false);
            }
          });
        },
        fail: () => resolve(false)
      });
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
    const title = this.data.title || '场景详情';
    const picture = this.data.picture || '';
    const video = this.data.video || '';
    const path = `/pages/mapdetail/mapdetail?text=${encodeURIComponent(title)}&picture=${encodeURIComponent(picture)}&video=${encodeURIComponent(video)}`;

    return {
      title,
      path,
      imageUrl: picture
    };
  },

  onShareTimeline() {
    const title = this.data.title || '场景详情';
    const picture = this.data.picture || '';
    const video = this.data.video || '';
    const query = `text=${encodeURIComponent(title)}&picture=${encodeURIComponent(picture)}&video=${encodeURIComponent(video)}`;

    return {
      title,
      query,
      imageUrl: picture
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
