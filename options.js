/* 
  "Show History Frequent Sites Button" Copyright 2020. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.5 - initial concept
  version 0.6 - enabled middle-click; dark theme option; option to show more sites by limiting URLs per site to one
  version 0.7 - New Tab Page Top Sites option, group-by-host option
  version 0.7.1 - Restyle error messages in popup
  version 0.8 - Filter bar to find sites in long lists, highlight unsaved changed options
  version 0.8.1 - Fix icon bug applying filter to grouped list
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
	groupbyhost: false,			// group list by hostname
	groupclosed: true,			// group is initially collapsed
	filterbar: true,			// show filter bar on popup
	caseinsens: true			// filter is case insensitive
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
	var listmax = document.querySelector('input[name="listmax"]');
	listmax.value = oPrefs.listmax;
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
	var listmax = document.querySelector('input[name="listmax"]').value;
	if (listmax >= 1 && listmax <= 100){
		oPrefs.listmax = listmax;
	}
	// Update storage
	browser.storage.local.set(
		{prefs: oPrefs}
	).then(() => {
		// Clean up highlighting
		var lbls = document.querySelectorAll('label');
		for (var i=0; i<lbls.length; i++){
			lbls[i].style.backgroundColor = '';
		}
		evt.target.style.backgroundColor = '';
		evt.target.blur();
	}).catch((err) => {
		document.getElementById('oops').textContent = 'Error on browser.storage.local.set(): ' + err.message;
	});
}

var chgCount = 0, numChg = 0;
function lightSaveBtn(evt){
	if (evt.target.nodeName != 'INPUT') return;
	switch (evt.target.type){
		case 'checkbox':
			if (evt.target.checked !== oPrefs[evt.target.name]){
				chgCount++;
				evt.target.labels[0].style.backgroundColor = '#ff0';
			} else {
				chgCount--;
				evt.target.labels[0].style.backgroundColor = '';
			}
			break;
		case 'number':
			if (evt.target.value !== oPrefs[evt.target.name]){
				numChg = 1;
				evt.target.labels[0].style.backgroundColor = '#ff0';
			} else {
				numChg = 0;
				evt.target.labels[0].style.backgroundColor = '';
			}
			break;
		default:
			// none of these 
	}
	if ((chgCount + numChg) > 0) document.getElementById('btnsave').style.backgroundColor = '#ff0';
	else document.getElementById('btnsave').style.backgroundColor = '';
}

// Attach event handlers 
document.getElementById('btnsave').addEventListener('click', updatePrefs, false);
document.forms[0].addEventListener('change', lightSaveBtn, false);
document.getElementById('listmax').addEventListener('keyup', lightSaveBtn, false);
