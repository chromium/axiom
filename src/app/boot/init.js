window.__polymerReady__ = new Promise(function(resolve, reject) {
  window.addEventListener('polymer-ready', function() {
    console.log('polymer-ready');
    resolve();
  });
});

console.log('and this works');
