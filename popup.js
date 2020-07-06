/* 
  "Show History Frequent Sites Button" Copyright 2020. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.5 - initial concept
  version 0.6 - enabled middle-click; dark theme option; option to show more sites by limiting URLs per site to one
  version 0.7 - New Tab Page Top Sites option, group-by-host option
  version 0.7.1 - Restyle error messages in popup
  version 0.8 - Filter bar to find sites in long lists, highlight unsaved changed options
  version 0.8.1 - Fix icon bug applying filter to grouped list
  version 0.9 - More list layout options including URL on its own row and switch-to-tab button
  version 1.0 - Font-size control, option to use an HTML link to leverage native keyboard navigation, right-click, etc.
  version 1.1 - Option to show "blocked" URLs dismissed from the new tab page, option for header open/close button
  version 1.2 - Popup resizer, style tweaks
  version 1.3 - Color tweaking options, middle-click bug fix
*/

/*** Initialize Popup Page ***/

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
	lightthemetweaks: {},		// custom colors: {textcolor: "#222426", backcolor: "#fff"}
	darkthemetweaks: {},		// custom colors: {textcolor: "#f8f8f8", backcolor: "#111"}
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
	showResizer: true			// show width/height button in popup
}

var listels; // for Switch-to-Tab

// Update oPrefs from storage and build URLs list
if (typeof browser != 'undefined'){ // live Firefox extension
	browser.storage.local.get("prefs").then((results) => {
		if (results.prefs != undefined){
			if (JSON.stringify(results.prefs) != '{}'){
				var arrSavedPrefs = Object.keys(results.prefs)
				for (var j=0; j<arrSavedPrefs.length; j++){
					oPrefs[arrSavedPrefs[j]] = results.prefs[arrSavedPrefs[j]];
				}
			}
		}
		// Set width and height and populate inputs
		document.body.style.setProperty('--body-width', oPrefs.bodywidth + 'px', 'important');
		document.body.style.setProperty('--body-height', oPrefs.bodyheight + 'px', 'important');
		document.getElementById('popwidth').value = oPrefs.bodywidth;
		document.getElementById('popheight').value = oPrefs.bodyheight;
		// Set dark theme and apply color tweaks
		if (oPrefs.darktheme){
			document.body.className = 'dark';
			if (JSON.stringify(oPrefs.darkthemetweaks) != '{}'){
				if (oPrefs.darkthemetweaks.hasOwnProperty('textcolor')) document.body.style.setProperty('--body-text-color', oPrefs.darkthemetweaks.textcolor, 'important');
				if (oPrefs.darkthemetweaks.hasOwnProperty('backcolor')) document.body.style.setProperty('--body-back-color', oPrefs.darkthemetweaks.backcolor, 'important');
			}
		} else {
			if (JSON.stringify(oPrefs.lightthemetweaks) != '{}'){
				if (oPrefs.lightthemetweaks.hasOwnProperty('textcolor')) document.body.style.setProperty('--body-text-color', oPrefs.lightthemetweaks.textcolor, 'important');
				if (oPrefs.lightthemetweaks.hasOwnProperty('backcolor')) document.body.style.setProperty('--body-back-color', oPrefs.lightthemetweaks.backcolor, 'important');
			}
		}
		// Set font size
		document.body.style.setProperty('--body-size', oPrefs.bodyfontsize + 'px', 'important');
		document.getElementById('fontsize').value = oPrefs.bodyfontsize;
		// Update title for New Tab Page Top Sites
		if (oPrefs.newtabpage) document.getElementById('listtitle').textContent = 'Top Sites from New Tab Page';
		// Hide filter bar, font size, and resizer buttons if preferred
		if (oPrefs.filterbar == false) document.getElementById('filterbar').style.display = 'none';
		if (oPrefs.showfontbutton == false) document.getElementById('showzoom').style.display = 'none';
		if (oPrefs.showResizer == false) document.getElementById('showresize').style.display = 'none';
		// Hide header and controls and enable toggler if preferred
		if (oPrefs.collapseHeader) document.getElementsByTagName('header')[0].setAttribute('collapse', 'true');
		else if (oPrefs.showtoggler) document.getElementsByTagName('header')[0].setAttribute('collapse', 'false');
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
			if (oPrefs.twoline) list.classList.add('twoline');
			if (oPrefs.fullrowlinked) var newLI = document.getElementById('newLIA');
			else newLI = document.getElementById('newLI');
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
						var fav = clone.querySelector('.favicon');
						fav.setAttribute('src', fixPath(arrSites[hostgroups[i].listindex[j]]));
						li.querySelector('.pagetitle').textContent = arrSites[hostgroups[i].listindex[j]].title;
						var ael = clone.querySelector('a');
						ael.href = arrSites[hostgroups[i].listindex[j]].url;
						if (oPrefs.fullrowlinked){
							ael.querySelector('.row2').textContent = arrSites[hostgroups[i].listindex[j]].url;
						} else {
							ael.textContent = arrSites[hostgroups[i].listindex[j]].url;
						}
						if (oPrefs.opennewtab) ael.setAttribute('target', '_blank');
						if (hostgroups[i].listindex.length > 1 && j == 0){ // first of group
							clone.querySelector('.expander').setAttribute('title', hostgroups[i].hostname + ' group');
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
					var fav = clone.querySelector('.favicon');
					fav.setAttribute('src', fixPath(arrSites[i]));
					li.querySelector('.pagetitle').textContent = arrSites[i].title;
					var ael = clone.querySelector('a');
					ael.href = arrSites[i].url;
					if (oPrefs.fullrowlinked){
						ael.querySelector('.row2').textContent = arrSites[i].url;
					} else {
						ael.textContent = arrSites[i].url;
					}
					if (oPrefs.opennewtab) ael.setAttribute('target', '_blank');
					// Add the item to the list
					list.appendChild(clone);
				}
			}
			// Add Switch-to-tab icons
			if (oPrefs.switchtab){
				// check perms just in case
				browser.permissions.contains({
					permissions: [
						"tabs"
					]
				}).then((result) => {
					// look up URLs and flag open ones
					if (result === true){
						// Gather all URLs in the list
						listels = document.getElementById('frecentlist').getElementsByTagName('li');
						var listurls = [];
						for (i=0; i<listels.length; i++){
							listurls.push(listels[i].querySelector('a').href);
						}
						// Use the API to see which URLs are open in a tab
						browser.tabs.query({
							url: listurls,
							discarded: false,
							hidden: false
						}).then((foundtabs) => {
							// Update the list with info on open tabs
							for (i=0; i<foundtabs.length; i++){
								var index = listurls.findIndex(url => url === foundtabs[i].url);
								/* if multiple tabs have this URL, stt probably will end up set to the id
								of the last opened tab, which may not be the one the user interacted with
								most recently, so that's a little TODO to address in some manner? */
								if (index > -1) listels[index].setAttribute('stt', foundtabs[i].id);
							}
						});
					}
				});
			}
		});
	}).catch((err) => {
		document.querySelector('#oops span').textContent = 'Error retrieving "prefs" from storage or building list: ' + err.message;
		document.getElementById('oops').style.display = 'block';
	});
} else { // saved web page?
	document.getElementById('options').style.display = 'none';
	document.getElementById('showzoom').style.display = 'none';
	document.getElementById('frecentlist').classList.remove('popup');
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
	// Is this a group control? Switch-to-tab? Or normal.
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
	} else if (tgt.className == 'stt') {
		if (typeof browser != 'undefined'){
			// Get the current window ID
			browser.windows.getCurrent().then((currWin) => {
				var winId = currWin.id;
				// Make the destination tab active
				browser.tabs.update(
					parseInt(li.getAttribute('stt')), {active: true}
				).then((tab) => {
					// In case the tab is in another window, focus whatever window it is
					browser.windows.update(tab.windowId, {focused: true});
					// Should we close the popup? Only if we switched within the same window
					if (tab.windowId == winId) self.close();
				}).catch((err) => {
					document.querySelector('#oops span').textContent = 'Not able to switch tabs: ' + err.message;
					document.getElementById('oops').style.display = 'block';
				});
			});				
		} else {
			alert('Please disregard this button in the current context.');
		}
	} else {
		// If not in a popup, do nothing special
		if (typeof browser == 'undefined') return;
		// Get the page URL
		var siteUrl = li.querySelector('a').href;
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
			return false;
		} else if ((oPrefs.opennewtab === true && !CtrlCommand && evt.button != 1) || 
					(oPrefs.opennewtab === false && (CtrlCommand || evt.button == 1))){ // Open new tab
			if (typeof browser != 'undefined'){
				if (evt.button == 1 && tgt.nodeName == 'A') return; // use native middle-click handling v1.3
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
			return false;
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
				return false;
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
	listels = document.querySelectorAll('#frecentlist li');
	var i, j, words, title;
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
		listels = document.querySelectorAll('#frecentlist li[hostname]:not([hostbutton="additional"]');
		for (i=0; i<listels.length; i++){
			var el = listels[i], hn = el.getAttribute('hostname'), addshow = 0;
			while (el.nextElementSibling){
				el = el.nextElementSibling;
				// Different host, we're done looping
				if (el.getAttribute('hostname') != hn) break;
				if (!el.hasAttribute('filterfail')){
					if (el.getAttribute('hostbutton') == 'additional') addshow++;
				}
			}
			if (addshow == 0){
				if (listels[i].hasAttribute('filterfail')){
					if (listels[i].getAttribute('filterfail') == 'true') listels[i].setAttribute('filterfail', 'all');
				} else {
					listels[i].setAttribute('filterfail', 'adds');
				}
			}
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

// Font sizer event handlers
document.getElementById('showzoom').addEventListener('click', function(evt){
	// Toggle display of font sizer
	var span = document.getElementById('fontsizer');
	if (span.style.display == 'inline') span.style.display = '';
	else span.style.display = 'inline';
	evt.target.blur();
}, false);
document.getElementById('fontsize').addEventListener('input', function(evt){
	var inpnum = evt.target;
	if ((parseInt(inpnum.value) >= parseInt(inpnum.min)) && (parseInt(inpnum.value) <= parseInt(inpnum.max))){
		oPrefs.bodyfontsize = parseInt(inpnum.value);
		document.body.style.setProperty('--body-size', oPrefs.bodyfontsize + 'px', 'important');
		// Update storage
		browser.storage.local.set(
			{prefs: oPrefs}
		).catch((err) => {
			document.getElementById('oops').textContent = 'Error updating storage: ' + err.message;
			document.getElementById('oops').style.display = 'block';
		});
	}
}, false);

// Header toggler event handler
document.getElementById('toggler').addEventListener('click', function(evt){
	// Toggle display of header and flip the triangle
	var hdr = document.getElementsByTagName('header')[0];
	if (hdr.getAttribute('collapse') == 'true'){
		hdr.setAttribute('collapse', 'false');
		oPrefs.collapseHeader = false;
	} else {
		hdr.setAttribute('collapse', 'true');
		oPrefs.collapseHeader = true;
	}
	// Update storage
	browser.storage.local.set(
		{prefs: oPrefs}
	).catch((err) => {
		document.getElementById('oops').textContent = 'Error updating storage: ' + err.message;
		document.getElementById('oops').style.display = 'block';
	});
	evt.target.blur();
}, false);

// Error message event handlers
document.getElementById('btnclose').addEventListener('click', function(evt){
	evt.target.parentNode.style.display = 'none';
}, false);

// Popup resizer event handlers
document.getElementById('showresize').addEventListener('click', function(evt){
	document.getElementById('currwidth').textContent = document.documentElement.clientWidth;
	document.getElementById('currheight').textContent = document.documentElement.clientHeight;
	document.getElementById('resizer').style.display = 'block';
}, false);
document.getElementById('popwidth').addEventListener('input', function(evt){
	var inpnum = evt.target;
	if (inpnum.validity.valid === true){
		document.body.style.setProperty('--body-width', inpnum.value + 'px', 'important');
	}
}, false);
document.getElementById('popheight').addEventListener('input', function(evt){
	var inpnum = evt.target;
	if (inpnum.validity.valid === true){
		document.body.style.setProperty('--body-height', inpnum.value + 'px', 'important');
	}
}, false);
document.getElementById('btnSave').addEventListener('click', function(evt){
	// Check values are in range
	var w = document.getElementById('popwidth');
	if (w.validity.valid === true) oPrefs.bodywidth = parseInt(w.value);
	else console.log('width is not valid');
	var h = document.getElementById('popheight');
	if (h.validity.valid === true) oPrefs.bodyheight = parseInt(h.value);
	else console.log('height is not valid');
	document.getElementById('resizer').style.display = '';
	oPrefs.showResizer = false;
	// Update storage
	browser.storage.local.set(
		{prefs: oPrefs}
	).catch((err) => {
		document.getElementById('oops').textContent = 'Error updating storage: ' + err.message;
		document.getElementById('oops').style.display = 'block';
	});
}, false);
document.getElementById('btnCancel').addEventListener('click', function(evt){
	document.getElementById('resizer').style.display = '';
}, false);
document.getElementById('btnRemove').addEventListener('click', function(evt){
	document.getElementById('resizer').style.display = '';
	document.getElementById('showresize').style.display = 'none';
	oPrefs.showResizer = false;
	// Update storage
	browser.storage.local.set(
		{prefs: oPrefs}
	).catch((err) => {
		document.getElementById('oops').textContent = 'Error updating storage: ' + err.message;
		document.getElementById('oops').style.display = 'block';
	});
}, false);
