/* 
  "Show History Frequent Sites Button" Copyright 2020. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.5 - initial concept
  version 0.6 - enabled middle-click; dark theme option; option to show more sites by limiting URLs per site to one
  version 0.7 - New Tab Page Top Sites option, group-by-host option
  version 0.7.1 - Restyle error messages in popup
*/

/*** Initialize Page ***/

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

// Update oPrefs from storage and update form values
browser.storage.local.get("prefs").then((results) => {
	if (results.prefs != undefined){
		if (JSON.stringify(results.prefs) != '{}'){
			var arrSavedPrefs = Object.keys(results.prefs)
			for (var j=0; j<arrSavedPrefs.length; j++){
				oPrefs[arrSavedPrefs[j]] = results.prefs[arrSavedPrefs[j]];
			}
		}
	}
	// Populate checkboxes
	var chks = document.querySelectorAll('input[type="checkbox"]');
	for (var i=0; i<chks.length; i++){
		if (oPrefs[chks[i].name] == true) chks[i].checked = true;
		else chks[i].checked = false;
	}
	// Set the numeric input
	var numsites = document.querySelector('input[name="numsites"]');
	numsites.value = oPrefs.listmax;
}).catch((err) => {
	document.getElementById('oops').textContent = 'Error retrieving "prefs" from storage or setting up form: ' + err.message;
});

/*** Handle User Actions ***/

// Update storage
function updatePrefs(evt){
	// Checkboxes
	var chks = document.querySelectorAll('.chk input[type="checkbox"]');
	for (var i=0; i<chks.length; i++){
		oPrefs[chks[i].name] = chks[i].checked;
	}
	// Update listmax
	var numsites = document.querySelector('input[name="numsites"]').value;
	if (numsites >= 1 && numsites <= 100){
		oPrefs.listmax = numsites;
	}
	// Update storage
	browser.storage.local.set(
		{prefs: oPrefs}
	).catch((err) => {
		document.getElementById('oops').textContent = 'Error on browser.storage.local.set(): ' + err.message;
	});
}

// Attach event handlers 
document.getElementById('btnsave').addEventListener('click', updatePrefs, false);
