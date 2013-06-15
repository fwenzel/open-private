/** "Open This Page in Private Browsing Mode" menu item */

self.on('click', function() {
    return self.postMessage(location.href);
});
