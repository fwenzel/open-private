/** "Open Link in Private Browsing Mode" menu item */

self.on('click', function(node) {
    return self.postMessage(node.href);
});
