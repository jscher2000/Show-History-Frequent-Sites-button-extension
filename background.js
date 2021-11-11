/* 
  "Show History Frequent Sites Button" Copyright 2021. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 1.4 - [background.js added] Optional page action button, more color tweaking options, "entire row URL" bug fix
*/

/*** Initialize Extension Vars ***/

// Default starting values
var oPrefs = {
	opennewtab: false,			// direct site to a new tab by default
	newtabactive: true,			// make the new tab active
	newwinprivate: false,		// whether new windows are private by default
	listmax: 15,				// max sites to show on list
	showBlocked: false,			// include sites blocked on the new tab page?
	showPinned: false,			// include sites pinned on the new tab page?
	searchShortcuts: false,		// include search shortcuts from the new tab page?
	oneperdomain: false,		// only show one URL for each domain
	darktheme: false,			// light text/dark background
	lightthemetweaks: {},		// custom colors: {textcolor: "#222426", backcolor: "#fff", "linkcolor": "#428fdb"}
	darkthemetweaks: {},		// custom colors: {textcolor: "#f8f8f8", backcolor: "#111", "linkcolor": "#45a1ff"}
	newtabpage: false,			// switch from frecent sites to new tab page Top Sites
	groupbyhost: false,			// group list by hostname
	groupclosed: true,			// group is initially collapsed
	filterbar: true,			// show filter bar on popup
	caseinsens: true,			// filter is case insensitive
	twoline: false,				// show URL on a separate row in the drop-down
	switchtab: false,			// show a switch tab button when applicable
	fullrowlinked: false,		// entire row is inside a hyperlink vs only URL
	bodyfontsize: 14,			// numeric font size for popup
	showfontbutton: true,		// show font button on popup
	showtoggler: true,			// show button to open/close header
	collapseHeader: false,		// hide header by default
	bodywidth: 750,				// numeric pixel min-width for popup
	bodyheight: 350,			// numeric pixel min-height for popup
	showResizer: true,			// show width/height button in popup
	pageaction: false			// Button in the address bar
}

// INITIALIZATION: Update oPrefs from storage and set up page action button if desired
browser.storage.local.get("prefs").then((results) => {
	if (results.prefs != undefined){
		if (JSON.stringify(results.prefs) != '{}'){
			var arrSavedPrefs = Object.keys(results.prefs)
			for (var j=0; j<arrSavedPrefs.length; j++){
				oPrefs[arrSavedPrefs[j]] = results.prefs[arrSavedPrefs[j]];
			}
		}
	}
	if (oPrefs.pageaction){
		browser.tabs.onUpdated.addListener(showPageAction);
	}
}).catch((err) => {console.log('Error retrieving "prefs" from storage: '+err.message);});

function showPageAction(tabId){
	browser.pageAction.show(tabId);
	if (oPrefs.darktheme == true){
		browser.pageAction.setIcon({
			tabId: tabId,
			path: {
				128: "icons/show-history-128-dark.png"
			}
		});
	} else {
		browser.pageAction.setIcon({
			tabId: tabId,
			path: {
				128: "icons/show-history-128.png"
			}
		});
	}
}

/**** Handle Message from Options ****/

function handleMessage(request, sender, sendResponse){
	if ("update" in request) {
		// Receive pref updates from Options page
		var oSettings = request["update"];
		// Check for Page Action changes
		if (oSettings.pageaction == true && oPrefs.pageaction == false){
			browser.tabs.onUpdated.addListener(showPageAction);
		} else if (oSettings.pageaction == false && oPrefs.pageaction == true){
			browser.tabs.onUpdated.removeListener(showPageAction);
		}
		// Update oPrefs in this script
		var arrSavedPrefs = Object.keys(oSettings)
		for (var j=0; j<arrSavedPrefs.length; j++){
			oPrefs[arrSavedPrefs[j]] = oSettings[arrSavedPrefs[j]];
		}
	}
}
browser.runtime.onMessage.addListener(handleMessage);
