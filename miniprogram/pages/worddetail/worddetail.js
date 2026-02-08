const data = require('../../utils/data');

Page({
  data: {
    image: '',
    text: '',
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
      text: decodedText
    });

    if (decodedText) {
      wx.setNavigationBarTitle({ title: decodedText });
    }
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
