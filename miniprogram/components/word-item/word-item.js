Component({
  properties: {
    text: String,
    image: String,
    picture: String
  },
  methods: {
    onWordTap() {
      wx.navigateTo({
        url: `/pages/worddetail/worddetail?picture=${encodeURIComponent(this.data.picture)}&text=${encodeURIComponent(this.data.text)}`
      });
    }
  }
});
