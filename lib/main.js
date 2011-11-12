const cm = require("context-menu"),
      data = require("self").data,
      pb = require("private-browsing"),
      tabs = require("tabs");

// Keep menuitems around so we can destroy them on browsing mode change
var menuitems = [];

// On click, keep target URL, so we can open it after starting private
// browsing mode.
var url_to_open = '';


// Remove all our menu items.
var remove_items = function() {
    for (var i in menuitems) {
        menuitems[i].destroy();
    }
    menuitems = [];
}

// Add "open in private browsing" context menus when not in private
// browsing mode
var prepare_open_menu = function() {
    remove_items();

    var open_link_item = cm.Item({
        label: "Open Link in Private Browsing Mode",
        image: data.url("img/privacy-link16.png"),
        context: cm.SelectorContext("a[href]"),
        contentScriptFile: data.url("js/cm-openlink.js"),
        onMessage: function(src) {
            // Remember URL, then trigger private browsing mode.
            url_to_open = src;
            pb.activate();
        }
    });
    menuitems.push(open_link_item);

    var open_private_item = cm.Item({
        label: "Open Private Browsing Mode",
        image: data.url("img/privacy16.png"),
        contentScript: 'self.on("click", self.postMessage)',
        onMessage: function() {
            pb.activate();
        }
    });
    menuitems.push(open_private_item);
};

// Add "close private browsing mode" context menu *when* in private
// browsing mode
var prepare_close_menu = function() {
    remove_items();

    var close_item = cm.Item({
        label: "Leave Private Browsing Mode",
        image: data.url("img/privacy16.png"),
        contentScript: 'self.on("click", self.postMessage)',
        onMessage: function() {
            pb.deactivate();
        }
    });
    menuitems.push(close_item);
};


exports.main = function(options, callbacks) {
    // Adjust context menus when entering/leaving private browsing.
    pb.on('start', function() {
        prepare_close_menu(); // Adjust menu items.

        // If set, open the URL we came here to see.
        if (!url_to_open) return;
        tabs.activeTab.url = url_to_open;
        url_to_open = ''; // Clear URL for next time.
    });
    pb.on('stop', prepare_open_menu);

    // Enable for whatever mode we are in on startup.
    if (!pb.isActive) prepare_open_menu(); else prepare_close_menu();
};
