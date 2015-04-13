
chrome.runtime.onConnect.addListener(function(port) {
  var streams = new PostMessageStreams(this);
  streams.open(port);
});
