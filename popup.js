/* 
  "Show History Frequent Sites Button" Copyright 2020. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.5 - initial concept
  version 0.6 - enabled middle-click; dark theme option; option to show more sites by limiting URLs per site to one
*/

/*** Lay out the list (later: get stored preferences first) ***/

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
	darktheme: false			// light text/dark background
}

// Update oPrefs from storage
browser.storage.local.get("prefs").then((results) => {
	if (results.prefs != undefined){
		if (JSON.stringify(results.prefs) != '{}'){
			var arrSavedPrefs = Object.keys(results.prefs)
			for (var j=0; j<arrSavedPrefs.length; j++){
				oPrefs[arrSavedPrefs[j]] = results.prefs[arrSavedPrefs[j]];
			}
		}
	}
	// Set dark theme
	if (oPrefs.darktheme) document.body.className = 'dark';
	var gettingTopSites = browser.topSites.get({
		newtab: false, /* do not use "Top Sites" from Firefox new tab */
		onePerDomain: oPrefs.oneperdomain,
		includeFavicon: true,
		limit: parseInt(oPrefs.listmax),
		includeBlocked: oPrefs.showBlocked,
		includePinned: oPrefs.showPinned,
		includeSearchShortcuts: oPrefs.searchShortcuts
	});
	gettingTopSites.then((arrSites) => {
		var list = document.getElementById('frecentlist');
		var newLI = document.getElementById('newLI');
		for (var i=0; i<arrSites.length; i++){
			var clone = document.importNode(newLI.content, true);
			// Populate the template
			var elTemp = clone.querySelector('li');
			elTemp.setAttribute('title', arrSites[i].title + ' - ' + arrSites[i].url);
			elTemp = clone.querySelector('img');
			elTemp.setAttribute('src', fixPath(arrSites[i]));
			elTemp = clone.querySelectorAll('span');
			elTemp[0].appendChild(document.createTextNode(arrSites[i].title));
			elTemp[2].appendChild(document.createTextNode(arrSites[i].url));
			// Add the item to the list
			list.appendChild(clone);
		}
	});
}).catch((err) => {
	document.getElementById('oops').textContent = 'Error retrieving "prefs" from storage or building list: ' + err.message;
});

function fixPath(site){
	if (site.favicon){
		return site.favicon;
	} else {
		if (site.url.indexOf('http://') == 0 || site.url.indexOf('https://') == 0){
			return 'icons/defaultFavicon.svg';
		}
		if (site.url.indexOf('file:///') == 0){
			return 'icons/folder-16.svg';
		}
		return 'icons/square.svg';
	}
}

/*** Handle User Interaction ***/

function openFrecent(evt){
	console.log(evt);
	// Get the li the user clicked
	var tgt = evt.target;
	if (tgt.nodeName != "LI"){
		tgt = tgt.closest('li');
		if (!tgt){
			document.getElementById('oops').textContent = 'Script is confused about what you clicked. Try again?';
			return;
		}
	}
	// Get the URL from the second span in the li
	var siteUrl = tgt.querySelectorAll('span')[2].textContent;
	// Where to open
	var CtrlCommand = (browser.runtime.PlatformOs == 'mac') ? evt.metaKey : evt.ctrlKey;
	if (evt.shiftKey){ // Open new window
		var priv = false;
		if (oPrefs.newwinprivate == true || (evt.altKey && oPrefs.newwinprivate == false)) priv = true;
		browser.windows.create({
			incognito: priv,
			url: siteUrl
		}).catch((err) => {
			document.getElementById('oops').textContent = 'Error opening new window: ' + err.message;
		});
	} else if ((oPrefs.opennewtab === true && !CtrlCommand && evt.button != 1) || 
				(oPrefs.opennewtab === false && (CtrlCommand || evt.button == 1))){ // Open new tab
		browser.tabs.create({
			active: oPrefs.newtabactive,
			url: siteUrl
		}).then(() => {
			if (oPrefs.newtabactive == true) self.close(); // Close the popup if we changed tabs
		}).catch((err) => {
			document.getElementById('oops').textContent = 'Error opening new tab: ' + err.message;
		});
	} else { // Navigate current tab
		browser.tabs.update({
			url: siteUrl
		}).then(() => {
			self.close(); // Close the popup
		}).catch((err) => {
			document.getElementById('oops').textContent = 'Error navigating this tab: ' + err.message;
		});
	}
}

// Attach event handlers 
document.getElementById('frecentlist').addEventListener('click', openFrecent, false);
document.getElementById('frecentlist').addEventListener('mousedown', function(evt){
	if (evt.button == 1){
		// Cancel autoscrolling for middle-click
		evt.preventDefault();
	}
}, false);
document.getElementById('frecentlist').addEventListener('mouseup', function(evt){
	if (evt.button == 1){
		// Open site
		openFrecent(evt);
	}
}, false);
document.getElementById('options').addEventListener('click', function(evt){
	browser.runtime.openOptionsPage();
	self.close();
}, false);
