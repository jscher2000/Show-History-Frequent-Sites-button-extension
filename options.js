/* 
  "Show History Frequent Sites Button" Copyright 2021. Jefferson "jscher2000" Scher. License: MPL-2.0.
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
  version 1.4 - Optional page action button, more color tweaking options, "entire row URL" bug fix
*/

/*** Initialize Options Page ***/

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
	// Set optional permission attributes
	//    tab
	browser.permissions.contains({
		permissions: [
			"tabs"
		]
	}).then((result) => {
		if (result === false){
			document.forms[0].elements['switchtab'].setAttribute('perm', 'need-tabs');
			document.getElementById('revoketabs').setAttribute('disabled', 'disabled');
		} else {
			document.forms[0].elements['switchtab'].setAttribute('perm', 'have-tabs');
		}
	});
	// Set the text inputs
	if (JSON.stringify(oPrefs.lightthemetweaks) !== '{}'){
		document.querySelector('input[name="lightcustom"]').value = JSON.stringify(oPrefs.lightthemetweaks);
		document.querySelector('input[name="lightcustom"]').placeholder = JSON.stringify(oPrefs.lightthemetweaks);
	}
	if (JSON.stringify(oPrefs.darkthemetweaks) !== '{}'){
		document.querySelector('input[name="darkcustom"]').value = JSON.stringify(oPrefs.darkthemetweaks);
		document.querySelector('input[name="darkcustom"]').placeholder = JSON.stringify(oPrefs.darkthemetweaks);
	}
}).catch((err) => {
	document.getElementById('oops').textContent = 'Error retrieving "prefs" from storage or setting up form: ' + err.message;
});

/*** Handle User Actions ***/

// Update storage
function updatePrefs(evt){
	// Checkboxes
	var chks = document.querySelectorAll('.chk input[type="checkbox"]');
	for (var i=0; i<chks.length; i++){
		if (chks[i].checked && chks[i].hasAttribute('truesame')){
			// only if this was a user change
			if (oPrefs[chks[i].name] != chks[i].checked){
				oPrefs[chks[i].getAttribute('truesame')] = chks[i].checked;
				document.querySelector('input[name="' + chks[i].getAttribute('truesame') + '"]').checked = chks[i].checked;
			}
		}
		oPrefs[chks[i].name] = chks[i].checked;
	}
	// Update listmax
	var listmax = document.querySelector('input[name="listmax"]').value;
	if (listmax >= 1 && listmax <= 100){
		oPrefs.listmax = listmax;
	} else {
		alert('The number of items must be between 1 and 100. Not saving ' + listmax + '; keeping ' + oPrefs.listmax + '.');
		document.querySelector('input[name="listmax"]').value = oPrefs.listmax;
	}
	// Update theme color tweaks
	var lightval = document.querySelector('input[name="lightcustom"]').value.trim();
	if (lightval.length > 0){
		try {
			var lightjson = JSON.parse(lightval);
			if (JSON.stringify(lightjson) != JSON.stringify(JSON.parse(document.querySelector('input[name="lightcustom"]').getAttribute('placeholder')))){
				oPrefs.lightthemetweaks = lightjson;
			} else if (JSON.stringify(lightjson) == JSON.stringify(JSON.parse(document.querySelector('input[name="lightcustom"]').getAttribute('defaultval')))){
				oPrefs.lightthemetweaks = {};
			}
			document.querySelector('input[name="lightcustom"]').style.borderColor = '';
		} catch(err) { // not valid JSON
			console.log(err);
			document.querySelector('input[name="lightcustom"]').style.borderColor = 'red';
		}
	} else {
		oPrefs.lightthemetweaks = {};
	}
	var darkval = document.querySelector('input[name="darkcustom"]').value.trim();
	if (darkval.length > 0){
		try {
			var darkjson = JSON.parse(darkval);
			if (JSON.stringify(darkjson) != JSON.stringify(JSON.parse(document.querySelector('input[name="darkcustom"]').getAttribute('placeholder')))){
				oPrefs.darkthemetweaks = darkjson;
			} else if (JSON.stringify(darkjson) == JSON.stringify(JSON.parse(document.querySelector('input[name="darkcustom"]').getAttribute('defaultval')))){
				oPrefs.darkthemetweaks = {};
			}
			document.querySelector('input[name="darkcustom"]').style.borderColor = '';
		} catch(err) { // not valid JSON
			console.log(err);
			document.querySelector('input[name="darkcustom"]').style.borderColor = 'red';
		}
	} else {
		oPrefs.darkthemetweaks = {};
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
		// Message the background script (v1.4)
		browser.runtime.sendMessage({
			update: oPrefs
		});
	}).catch((err) => {
		document.getElementById('oops').textContent = 'Error on browser.storage.local.set(): ' + err.message;
	});
}

var chgCount = 0, numChg = 0, lightChg = 0, darkChg = 0;
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
		case 'text':
			if (evt.target.value !== evt.target.getAttribute('placeholder')){
				if (evt.target.name == 'lightcustom') lightChg = 1;
				if (evt.target.name == 'darkcustom') darkChg = 1;
				evt.target.labels[0].style.backgroundColor = '#ff0';
			} else {
				if (evt.target.name == 'lightcustom') lightChg = 0;
				if (evt.target.name == 'darkcustom') darkChg = 0;
				evt.target.labels[0].style.backgroundColor = '';
			}
			break;
		default:
			// none of these 
	}
	if ((chgCount + numChg + lightChg + darkChg) > 0) document.getElementById('btnsave').style.backgroundColor = '#ff0';
	else document.getElementById('btnsave').style.backgroundColor = '';
}

function optionalPerm(evt){
	var toCheck = '';
	switch (evt.target.name){
		case 'switchtab':
			if (evt.target.checked && evt.target.getAttribute('perm') == 'need-tabs'){
				toCheck = 'tabs';
			}
			break;
		default:
			// WTF?
	}
	if (toCheck == '') return;
	// Request permission
	browser.permissions.request({
		permissions: [
			toCheck
		]
	}).then((result) => {
		if (result === false){
			// flip the checkbox back to unchecked
			window.setTimeout(function(){
				evt.target.click();
			}, 100);
		} else {
			evt.target.setAttribute('perm', 'have-tabs');
			document.getElementById('revoketabs').removeAttribute('disabled');
		}
	})
}

function revokePerm(evt){
	var perm = evt.target.getAttribute('perm');
	browser.permissions.remove({
		permissions: [
			perm
		]
	}).then((results) => {
		if (results){
			var arrCtrls = evt.target.getAttribute('chks').split(',');
			for (var i=0; i<arrCtrls.length; i++){
				var chk = document.forms[0].elements[arrCtrls[i]];
				chk.setAttribute('perm', 'need-' + perm);
				if (oPrefs[chk.name] == true){
					oPrefs[chk.name] = false;
					browser.storage.local.set(
						{prefs: oPrefs}
					);
				}
				if (chk.checked){
					// flip the checkbox back to unchecked
					window.setTimeout(function(){
						chk.click();
						console.log(chk);
					}, 100);
				}
			}
			evt.target.setAttribute('disabled', 'disabled');
		} else {
			alert('Permission revocation was not successul for some reason.');
		}
	});
}

// Attach event handlers 
document.getElementById('btnsave').addEventListener('click', updatePrefs, false);
document.forms[0].addEventListener('change', lightSaveBtn, false);
document.getElementById('listmax').addEventListener('keyup', lightSaveBtn, false);
document.forms[0].elements['switchtab'].addEventListener('change', optionalPerm, false);
document.getElementById('revoketabs').addEventListener('click', revokePerm, false);
document.getElementById('resetSize').addEventListener('click', function(evt){
	oPrefs.bodywidth = 750;
	oPrefs.bodyheight = 350;
	updatePrefs(evt);
}, false);
document.getElementById('btnThemeTweaks').addEventListener('click', function(evt){
	if (document.getElementById('themetweaks').style.display == 'inline'){
		document.getElementById('themetweaks').style.display = '';
	} else {
		document.getElementById('themetweaks').style.display = 'inline';
	}
}, false);
document.forms[0].elements['lightcustom'].addEventListener('input', lightSaveBtn, false);
document.forms[0].elements['darkcustom'].addEventListener('input', lightSaveBtn, false);
