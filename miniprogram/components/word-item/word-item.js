Component({
  properties: {
    text: String,
    image: String,
    detail: String
  },
  methods: {
    onWordTap() {
      wx.navigateTo({
        url: `/pages/worddetail/worddetail?image=${encodeURIComponent(this.data.detail)}&text=${encodeURIComponent(this.data.text)}`
      });
    }
  }
});
