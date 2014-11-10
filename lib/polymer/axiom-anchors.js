Polymer('axiom-anchors', {
  created: function () {
    this.anchor = this.anchor.bind(this);
  },
  anchor: function (position) {
    return this.$[position + "-anchor"];
  }
});
