Page({
  data: {
    items: [],
    currentItems: [],
    searchQuery: ''
  },
  onLoad() {
    const map = require('../../utils/map.js');
    this.setData({
      items: map,
      currentItems: map
    });
  },
  onSearchInput(event) {
    this.setData({
      searchQuery: event.detail.value
    });
  },
  onSearchTap() {
    const { searchQuery, items } = this.data;
    
    // 如果搜索框为空，显示全部
    if (!searchQuery.trim()) {
      this.setData({
        currentItems: items
      });
      return;
    }

    // 过滤数据
    const filteredItems = items.filter(item => item.text.includes(searchQuery));

    if (filteredItems.length === 0) {
      wx.showToast({
        title: '未找到匹配项',
        icon: 'none'
      });
      return;
    }

    // 更新当前显示的项目为搜索结果
    this.setData({
      currentItems: filteredItems
    });
  },
  goToDetail(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.currentItems[index];
    wx.navigateTo({
      url: `/pages/mapdetail/mapdetail?text=${encodeURIComponent(item.text)}&picture=${encodeURIComponent(item.picture)}&video=${encodeURIComponent(item.video)}`
    });
  }
});
