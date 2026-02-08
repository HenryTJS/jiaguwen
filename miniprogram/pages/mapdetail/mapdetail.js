Page({
  data: {
    title: '',
    picture: '',
    video: '',
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
        video: decodeURIComponent(options.video)
      });
      wx.setNavigationBarTitle({
        title: title
      });
    }
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
    wx.downloadFile({
      url: this.data.video,
      success(res) {
        if (res.statusCode === 200) {
          wx.saveVideoToPhotosAlbum({
            filePath: res.tempFilePath,
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
        }
      },
      fail() {
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 点赞功能
  toggleLike() {
    const isLiked = this.data.isLiked;
    const likeCount = this.data.likeCount;
    this.setData({
      isLiked: !isLiked,
      likeCount: !isLiked ? likeCount + 1 : Math.max(0, likeCount - 1)
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
    
    const comments = this.data.comments;
    comments.push({
      id: Date.now(),
      text: commentText,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    });
    
    this.setData({
      comments: comments,
      commentCount: comments.length,
      commentText: '',
      showCommentInput: false
    });
    
    wx.showToast({ title: '评论成功', icon: 'success' });
  },
  
  // 删除评论
  deleteComment(e) {
    const commentId = e.currentTarget.dataset.id;
    const comments = this.data.comments.filter(comment => comment.id !== commentId);
    
    this.setData({
      comments: comments,
      commentCount: comments.length
    });
    
    wx.showToast({ title: '已删除', icon: 'success' });
  },
  
  // 转发功能
  showShareMenu() {
    wx.showActionSheet({
      itemList: ['分享到朋友圈', '分享给朋友', '复制链接'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showToast({ title: '已分享到朋友圈', icon: 'success' });
        } else if (res.tapIndex === 1) {
          wx.showToast({ title: '已分享给朋友', icon: 'success' });
        } else if (res.tapIndex === 2) {
          wx.showToast({ title: '已复制链接', icon: 'success' });
        }
      }
    });
  }
});
