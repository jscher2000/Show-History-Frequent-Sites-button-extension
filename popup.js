/* 
  "Show History Frequent Sites Button" Copyright 2020. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.5 - initial concept
  version 0.6 - enabled middle-click; dark theme option; option to show more sites by limiting URLs per site to one
  version 0.7 - New Tab Page Top Sites option, group-by-host option
  version 0.7.1 - Restyle error messages in popup
  version 0.8 - Filter bar to find sites in long lists, highlight unsaved changed options
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
	groupbyhost: false,			// group list by hostname
	groupclosed: true,			// group is initially collapsed
	filterbar: true,			// show filter bar on popup
	caseinsens: true			// filter is case insensitive
}

// Update oPrefs from storage
if (typeof browser != 'undefined'){
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
		if (oPrefs.newtabpage) document.querySelector('h1 > span').textContent = 'Top Sites from New Tab Page';
		// Show/Hide filter bar
		if (oPrefs.filterbar == false) document.getElementById('filterbar').style.display = 'none';
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
				for (i=0; i<hostgroups.length; i++){
					for (j=0; j<hostgroups[i].listindex.length; j++){
						var clone = document.importNode(newLI.content, true);
						// Populate the template
						var li = clone.querySelector('li');
						li.setAttribute('title', arrSites[hostgroups[i].listindex[j]].title + ' - ' + arrSites[hostgroups[i].listindex[j]].url);
						var fav = clone.querySelector('img');
						fav.setAttribute('src', fixPath(arrSites[hostgroups[i].listindex[j]]));
						var spans = clone.querySelectorAll('span');
						spans[0].appendChild(document.createTextNode(arrSites[hostgroups[i].listindex[j]].title));
						var ael = clone.querySelector('a');
						ael.href = arrSites[hostgroups[i].listindex[j]].url;
						ael.textContent = arrSites[hostgroups[i].listindex[j]].url;
						if (oPrefs.opennewtab) ael.setAttribute('target', '_blank');
						if (hostgroups[i].listindex.length > 1 && j == 0){ // first of group
							spans[2].setAttribute('title', hostgroups[i].hostname + ' group');
							li.setAttribute('hostname', hostgroups[i].hostname);
							li.setAttribute('hostclosed', false);
							if (oPrefs.groupclosed) li.setAttribute('hostbutton', 'closed');
							else li.setAttribute('hostbutton', 'open');
							fav.setAttribute('src', fixPath(arrSites[hostgroups[i].listindex[j]]));
						} else if (j > 0){ // additional in group
							li.setAttribute('hostname', hostgroups[i].hostname);
							if (oPrefs.groupclosed) li.setAttribute('hostclosed', true);
							else li.setAttribute('hostclosed', false);
							li.setAttribute('hostbutton', 'additional');
							fav.setAttribute('src', fixPath(''));
						}
						// Add the item to the list
						list.appendChild(clone);
					}
				}
			} else {
				for (var i=0; i<arrSites.length; i++){
					var clone = document.importNode(newLI.content, true);
					// Populate the template
					var li = clone.querySelector('li');
					li.setAttribute('title', arrSites[i].title + ' - ' + arrSites[i].url);
					var fav = clone.querySelector('img');
					fav.setAttribute('src', fixPath(arrSites[i]));
					var spans = clone.querySelectorAll('span');
					spans[0].appendChild(document.createTextNode(arrSites[i].title));
					var ael = clone.querySelector('a');
					ael.href = arrSites[i].url;
					ael.appendChild(document.createTextNode(arrSites[i].url));
					if (oPrefs.opennewtab) ael.setAttribute('target', '_blank');
					// Add the item to the list
					list.appendChild(clone);
				}
			}
		});
	}).catch((err) => {
		document.querySelector('#oops span').textContent = 'Error retrieving "prefs" from storage or building list: ' + err.message;
		document.getElementById('oops').style.display = 'block';
	});
} else {
	document.getElementById('options').style.display = 'none';
	document.getElementById('frecentlist').className = '';
}

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
	var li = tgt.closest('li');
	if (!li){
		document.querySelector('#oops span').textContent = 'Script is confused about what you clicked. Try again?';
		document.getElementById('oops').style.display = 'block';
		return;
	}
	var hb = li.getAttribute('hostbutton') || '';
	// Is this a group control?
	if (tgt.className == 'expander' && ['open', 'closed', 'additional'].includes(hb)){
		// Handle opening/closing group
		var hn = li.getAttribute('hostname');
		switch (hb){
			case 'open':
				// switch the icon
				li.setAttribute('hostbutton', 'closed');
				// close up the additional items
				while (li.nextElementSibling){
					li = li.nextElementSibling;
					if (li.getAttribute('hostname') == hn){
						li.setAttribute('hostclosed', true);
					} else {
						break;
					}
				}
				break;
			case 'closed':
				// switch the icon
				li.setAttribute('hostbutton', 'open');
				// open up the additional items
				while (li.nextElementSibling){
					li = li.nextElementSibling;
					if (li.getAttribute('hostname') == hn){
						li.setAttribute('hostclosed', false);
					} else {
						break;
					}
				}
				break;
			case 'additional':
			default:
				// do nothing
		}
	} else {
		// Get the URL from the second span in the li
		var siteUrl = li.querySelectorAll('span')[1].textContent;
		// Where to open
		var CtrlCommand = (browser.runtime.PlatformOs == 'mac') ? evt.metaKey : evt.ctrlKey;
		if (evt.shiftKey){ // Open new window
			var priv = false;
			if (oPrefs.newwinprivate == true || (evt.altKey && oPrefs.newwinprivate == false)) priv = true;
			if (typeof browser != 'undefined'){
				if (tgt.nodeName == 'A') evt.preventDefault(); // don't navigate the link!
				browser.windows.create({
					incognito: priv,
					url: siteUrl
				}).catch((err) => {
					document.querySelector('#oops span').textContent = 'Error opening new window: ' + err.message;
					document.getElementById('oops').style.display = 'block';
				});
			}
		} else if ((oPrefs.opennewtab === true && !CtrlCommand && evt.button != 1) || 
					(oPrefs.opennewtab === false && (CtrlCommand || evt.button == 1))){ // Open new tab
			if (typeof browser != 'undefined'){
				if (tgt.nodeName == 'A') evt.preventDefault(); // don't navigate the link!
				browser.tabs.create({
					active: oPrefs.newtabactive,
					url: siteUrl
				}).then(() => {
					if (oPrefs.newtabactive == true) self.close(); // Close the popup if we changed tabs
				}).catch((err) => {
					document.querySelector('#oops span').textContent = 'Error opening new tab: ' + err.message;
					document.getElementById('oops').style.display = 'block';
				});
			}
		} else { // Navigate current tab
			if (typeof browser != 'undefined'){
				if (tgt.nodeName == 'A') evt.preventDefault(); // don't navigate the link!
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
}

let lastfilter = '';
function filterUrls(evt){
	var newval = '';
	if (evt.target.id == 'filterclear'){
		document.getElementById('filterbar').value = '';
	} else {
		newval = evt.target.value.trim();
		if (oPrefs.caseinsens) newval = newval.toLowerCase();
	}
	// If no change from last filter, exit
	if (newval == lastfilter) return;
	// Apply the filter
	var listels = document.querySelectorAll('#frecentlist li'), i, j, words, title;
	if (newval.length === 0){ //reset all to visible
		for (i=0; i<listels.length; i++){
			listels[i].removeAttribute('filterfail');
		}
	} else { // filter per user input
		words = newval.replace(/ +/g, ' ').split(' ');
		for (i=0; i<listels.length; i++){
			title = listels[i].getAttribute('title');
			if (oPrefs.caseinsens) title = title.toLowerCase();
			for (j=0; j<words.length; j++){
				if (title.indexOf(words[j]) === -1){
					listels[i].setAttribute('filterfail', 'true');
					break; // stop checking parts, go to next i
				} else {
					listels[i].removeAttribute('filterfail');
					// don't break - this could be overridden if the next part is not found
				}
			}
		}
		// Check groups
		listels = document.querySelectorAll('#frecentlist li[hostname][filterfail="true"]:not([hostbutton="additional"]');
		for (i=0; i<listels.length; i++){
			var el = listels[i], hn = el.getAttribute('hostname'), groupfail = true, addfail = true;
			while (el.nextElementSibling){
				el = el.nextElementSibling;
				// Different host, we're done looping
				if (el.getAttribute('hostname') != hn) break;
				if (!el.hasAttribute('filterfail')){
					groupfail = false;
					if (el.getAttribute('hostbutton') == 'additional') addfail = false;
					break;
				}
			}
			if (groupfail) listels[i].setAttribute('filterfail', 'all');
			else if (addfail) listels[i].setAttribute('filterfail', 'adds');
		}
	}
	// Update lastfilter
	lastfilter = newval;
}


// List event handlers 
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
// Filter bar and Options button event handlers
document.getElementById('filterbar').addEventListener('keyup', filterUrls, false);
document.getElementById('filterclear').addEventListener('click', filterUrls, false);
document.getElementById('options').addEventListener('click', function(evt){
	browser.runtime.openOptionsPage();
	self.close();
}, false);
// Error message event handlers
document.getElementById('btnclose').addEventListener('click', function(evt){
	evt.target.parentNode.style.display = 'none';
}, false);
