Polymer('axiom-container', {
  created: function () {
    this.anchorsElement = this.anchorsElement.bind(this);
    this.setAttribute("relative", "");
  },
  attached: function() {
    if (this.parentElement) {
      if (this.parentElement.hasAttribute("DEBUG")) {
        this.setAttribute("DEBUG", "");
      }
    }
  },
  anchorsElement: function () {
    return this.$.anchors;
  },
});