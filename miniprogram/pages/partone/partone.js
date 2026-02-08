const data = require('../../utils/data');

Page({
  data: {
    allWords: [],
    currentBatch: [],
    currentPage: 1, // 当前页码（从1开始）
    batchSize: 11, // 一次展示全部
    imageCount: 7, // 固定图片数量
    totalBatches: 1, // 总批数
    searchQuery: '', // 搜索框输入内容
    gapPx: 0, // 水平/垂直一致的间隔（像素）
  },

  onLoad() {
    // 计算统一间隔：宽度 30% * 3 = 90%，剩余约 10%；为避免换行，用 4% 间距（两段共 8%）
    const { windowWidth } = wx.getSystemInfoSync();
    const gapPx = windowWidth * 0.04; // 4% 宽度的像素值

    // 处理数据，使用 data 中的 show 图片路径
    const processedData = data.map((item) => ({
      ...item,
      image: item.show // 使用 data 中的 show 字段作为展示图片
    }));

    console.log('处理后的数据:', processedData); // 调试用

    // 计算总批数 - 正确的逻辑
    const totalData = processedData.length;

    // 一次性展示全部
    this.setData({
      allWords: processedData,
      currentBatch: processedData,
      totalBatches: 1,
      gapPx,
    });
  },

  onWordTap(event) {
    const { detail, text } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/worddetail/worddetail?image=${encodeURIComponent(detail)}&text=${encodeURIComponent(text)}`
    });
  },

  // 搜索框输入事件
  onSearchInput(event) {
    this.setData({
      searchQuery: event.detail.value
    });
  },

  // 搜索按钮点击事件
  onSearchTap() {
    const { searchQuery, allWords } = this.data;
    if (!searchQuery.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }

    // 过滤单词
    const filteredWords = allWords.filter(word => word.text.includes(searchQuery));

    if (filteredWords.length === 0) {
      wx.showToast({
        title: '未找到匹配项',
        icon: 'none'
      });
      return;
    }

    // 更新当前批次为搜索结果
    this.setData({
      currentBatch: filteredWords
    });
  },

  // 显示指定页码的数据
  showPage(pageNumber) {
    // 已改为一次展示全部，这里保持数据一致性
    const { allWords } = this.data;
    this.setData({ currentBatch: allWords, currentPage: 1 });
  },

  // 换一批按钮点击事件
  changeBatch() {
    // 已不再分页，保留空实现以防旧绑定报错
    this.showPage(1);
  },

  // 页面显示时确保显示正确页面
  onShow() {
    this.showPage(this.data.currentPage);
  }
});
