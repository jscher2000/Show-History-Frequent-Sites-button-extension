/* 
  "Show History Frequent Sites Button" Copyright 2020. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.5 - initial concept
  version 0.6 - enabled middle-click; dark theme option; option to show more sites by limiting URLs per site to one
  version 0.7 - New Tab Page Top Sites option, group-by-host option
  version 0.7.1 - Restyle error messages in popup
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
	darktheme: false,			// light text/dark background
	newtabpage: false,			// switch from frecent sites to new tab page Top Sites
	groupbyhost: false			// group list by hostname
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
	// Update title for New Tab Page Top Sites
	if (oPrefs.newtabpage) document.querySelector('h1 > span').textContent = 'Top Sites from the New Tab Page';
	// Build URLs list
	var gettingTopSites = browser.topSites.get({
		newtab: oPrefs.newtabpage,
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
		if (oPrefs.groupbyhost){
			// read the list into a new object for grouping { hostname: x, listindex: [] }
			var hostgroups = [], currhost, savedhost, i, j;
			for (i=0; i<arrSites.length; i++){
				currhost = new URL(arrSites[i].url).hostname;
				savedhost = hostgroups.findIndex( objhostgroup => objhostgroup.hostname === currhost );
				if (savedhost > -1){ // add URL to index
					hostgroups[savedhost].listindex.push(i);
				} else { // new host
					hostgroups.push({
						hostname: currhost,
						listindex: [i]
					});
				}
			}
			console.log(hostgroups);
			for (i=0; i<hostgroups.length; i++){
				for (j=0; j<hostgroups[i].listindex.length; j++){
					var clone = document.importNode(newLI.content, true);
					// Populate the template
					var elTemp = clone.querySelector('li');
					elTemp.setAttribute('title', arrSites[hostgroups[i].listindex[j]].title + ' - ' + arrSites[hostgroups[i].listindex[j]].url);
					elTemp = clone.querySelector('img');
					elTemp.setAttribute('src', fixPath(arrSites[hostgroups[i].listindex[j]]));
					elTemp = clone.querySelectorAll('span');
					elTemp[0].appendChild(document.createTextNode(arrSites[hostgroups[i].listindex[j]].title));
					elTemp[1].appendChild(document.createTextNode(arrSites[hostgroups[i].listindex[j]].url));
					if (hostgroups[i].listindex.length > 1 && j == 0){ // first of group
						elTemp[2].className = 'closed';
						elTemp[2].setAttribute('title', hostgroups[i].hostname + ' group');
						clone.querySelector('li').setAttribute('hostname', hostgroups[i].hostname);
						clone.querySelector('li').setAttribute('hostclosed', false);
						clone.querySelector('img').setAttribute('src', fixPath(arrSites[hostgroups[i].listindex[j]]));
					} else if (j > 0){ // additional in group
						elTemp[2].className = 'additional';
						clone.querySelector('li').setAttribute('hostname', hostgroups[i].hostname);
						clone.querySelector('li').setAttribute('hostclosed', true);
						clone.querySelector('img').setAttribute('src', fixPath(''));
					}
					// Add the item to the list
					list.appendChild(clone);
				}
			}
		} else {
			for (var i=0; i<arrSites.length; i++){
				var clone = document.importNode(newLI.content, true);
				// Populate the template
				var elTemp = clone.querySelector('li');
				elTemp.setAttribute('title', arrSites[i].title + ' - ' + arrSites[i].url);
				elTemp = clone.querySelector('img');
				elTemp.setAttribute('src', fixPath(arrSites[i]));
				elTemp = clone.querySelectorAll('span');
				elTemp[0].appendChild(document.createTextNode(arrSites[i].title));
				elTemp[1].appendChild(document.createTextNode(arrSites[i].url));
				// Add the item to the list
				list.appendChild(clone);
			}
		}
	});
}).catch((err) => {
	document.querySelector('#oops span').textContent = 'Error retrieving "prefs" from storage or building list: ' + err.message;
	document.getElementById('oops').style.display = 'block';
});

function fixPath(site){
	if (!site || site.length == 0){
		if (oPrefs.darktheme) return 'icons/group-add-dark.png';
		else return 'icons/group-add.png';
	} else if (site.favicon){
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
	var tgt = evt.target;
	// Is this a group control?
	if (['open', 'closed', 'additional'].includes(tgt.className)){
		// Handle opening/closing group
		var li = tgt.closest('li');
		var hn = li.getAttribute('hostname');
		switch (tgt.className){
			case 'open': 
				// close up the additional items
				while (li.nextElementSibling){
					li = li.nextElementSibling;
					if (li.getAttribute('hostname') == hn){
						li.setAttribute('hostclosed', true);
					} else {
						break;
					}
				}
				// switch the icon class
				tgt.className = 'closed';
				break;
			case 'closed':
				// open up the additional items
				while (li.nextElementSibling){
					li = li.nextElementSibling;
					if (li.getAttribute('hostname') == hn){
						li.setAttribute('hostclosed', false);
					} else {
						break;
					}
				}
				// switch the icon class
				tgt.className = 'open';
				break;
			default:
				// WTF
		}
	} else if (['additional'].includes(tgt.className)){
		// do nothing, ignore, peace out
	} else {
		// Get the li the user clicked
		if (tgt.nodeName != "LI"){
			tgt = tgt.closest('li');
			if (!tgt){
				document.querySelector('#oops span').textContent = 'Script is confused about what you clicked. Try again?';
				document.getElementById('oops').style.display = 'block';
				return;
			}
		}
		// Get the URL from the second span in the li
		var siteUrl = tgt.querySelectorAll('span')[1].textContent;
		// Where to open
		var CtrlCommand = (browser.runtime.PlatformOs == 'mac') ? evt.metaKey : evt.ctrlKey;
		if (evt.shiftKey){ // Open new window
			var priv = false;
			if (oPrefs.newwinprivate == true || (evt.altKey && oPrefs.newwinprivate == false)) priv = true;
			browser.windows.create({
				incognito: priv,
				url: siteUrl
			}).catch((err) => {
				document.querySelector('#oops span').textContent = 'Error opening new window: ' + err.message;
				document.getElementById('oops').style.display = 'block';
			});
		} else if ((oPrefs.opennewtab === true && !CtrlCommand && evt.button != 1) || 
					(oPrefs.opennewtab === false && (CtrlCommand || evt.button == 1))){ // Open new tab
			browser.tabs.create({
				active: oPrefs.newtabactive,
				url: siteUrl
			}).then(() => {
				if (oPrefs.newtabactive == true) self.close(); // Close the popup if we changed tabs
			}).catch((err) => {
				document.querySelector('#oops span').textContent = 'Error opening new tab: ' + err.message;
				document.getElementById('oops').style.display = 'block';
			});
		} else { // Navigate current tab
			browser.tabs.update({
				url: siteUrl
			}).then(() => {
				self.close(); // Close the popup
			}).catch((err) => {
				document.querySelector('#oops span').textContent = 'Error opening that URL: ' + err.message;
				document.getElementById('oops').style.display = 'block';
			});
		}
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
document.getElementById('btnclose').addEventListener('click', function(evt){
	evt.target.parentNode.style.display = 'none';
}, false);
