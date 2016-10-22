const { Cc, Ci } = require("chrome"),
      cm = require("context-menu"),
      data = require("self").data,
      pb = require("private-browsing"),
      tabs = require("tabs"),
      windows = require("windows").browserWindows;

// Determine if the nsIPrivateBrowsingService exists. If so, this is an older
// version of Firefox that has a global private browsing mode. If not, it is
// per window.
// Some code borrowed from the Add-on SDK.
var hasGlobalPB;
try {
    var pbService = Cc["@mozilla.org/privatebrowsing;1"].
                    getService(Ci.nsIPrivateBrowsingService);
    // A dummy service exists for the moment (Fx 20 at least), but will be
    // removed eventually, i.e. the service will exist, but it won't do
    // anything and the global private browing feature is not really active.
    // See Bug 818800 and Bug 826037.
    hasGlobalPB = ('privateBrowsingEnabled' in pbService);
} catch(e) {
    hasGlobalPB = false;
}

// Keep menu items around so we can destroy them on browsing mode change.
var menuitems = [];

// On click, keep target URL, so we can open it after starting private
// browsing mode.
var url_to_open = '';

// Translations
var langs = [
		[
			'open-link'
				=>
					'en' => 'Open Link in Private Browsing Mode',
					'fr' => 'Ouvrir le lien dans le mode Navigation Privée'
		],

		[
			'open'
				 =>
					'en' => 'Open Private Browsing Mode',
					'fr' => 'Ouvrir le mode Navigation Privée'
		],

		[
			'open-link'
				=>
					'en' => 'Open This Page in Private Browsing Mode',
					'fr' => 'Ouvrir cette page en mode Navigation Privée
		],

		[
			'leave'
		 		=>
		 			'en' => 'Leave Private Browsing Mode',
		 			'fr' => 'Quitter le mode Navigation Privée'
		]
	]

// Remove all our menu items.
var remove_items = function() {
    for (var i in menuitems) {
        menuitems[i].destroy();
    }
    menuitems = [];
}

// Add "open in private browsing" context menus when not in private
// browsing mode.
var prepare_open_menu = function() {
    remove_items();

    // "Open Link..." menu already exists in newer versions.
    if (hasGlobalPB && !pb.isPrivate(windows.activeWindow)) {
        var open_link_item = cm.Item({
            label: "Open Link in Private Browsing Mode",
            image: data.url("img/privacy-link16.png"),
            context: cm.SelectorContext("a[href]"),
            contentScriptFile: data.url("js/cm-openlink.js"),
            onMessage: open_url
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
    }

    // Menu item to open current page in private browsing mode.
    var open_private_item = cm.Item({
        label: "Open This Page in Private Browsing Mode",
        image: data.url("img/privacy16.png"),
        contentScriptFile: data.url("js/cm-openpage.js"),
        onMessage: open_url
    });
    menuitems.push(open_private_item);
};

/**
 * Add "close private browsing mode" context menu *when* in private
 * browsing mode.
 */
function prepare_close_menu() {
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

/**
 * Open a URL in private browsing mode.
 */
function open_url(href) {
    if (hasGlobalPB) {  // Old Firefoxes
        // Remember URL, then trigger private browsing mode.
        url_to_open = href;
        // Start the global private browsing mode.
        pb.activate();

    } else {  // New Firefoxes
        // In per-window mode, open a PB window/tab in a private
        // window.
        tabs.open({
            url: href,
            isPrivate: true
        });
    }
}

exports.main = function(options, callbacks) {
    // Open and close only makes sense in the old world.
    if (hasGlobalPB) {
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
    } else {
        // Hook up right-click menu item for links.
        prepare_open_menu();
    }
};
