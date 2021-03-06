var audio = new Audio('alarm.mp3');
var ws;
var extruderTemp = 0;
var extruderTargetTemp = 0;
var connected = false;
var audioEnabled = false;
var tolerance = 10;
var printComplete = false;

function onScreenLog(text) {
	var div = document.getElementById('txtLog');
	div.innerText += "⟫ " + text + "\n";
	var scroller = document.getElementById('scroller');
	scroller.scrollTop = 200;
}

function connect(ip) {
	if (ws) {
		ws.close()
		ws = undefined;
		uiConnectState('Connect');
		return;
	}
	uiConnectState('Connecting');
	onScreenLog("Connecting to: " + ip);
	console.log('ws connecting')
	ws = new WebSocket("ws://" + ip + ":81");
	ws.onmessage = function (event) {
		formatData(event.data);
		console.log('ws msg')
	}
	ws.onopen = function () {
		uiConnectState('Disconnect');
		onScreenLog("Connected to " + ip);
		console.log('ws open')
	}
	ws.onclose = function () {
		uiConnectState('Connect');
		onScreenLog("Disconnected from " + ip);
		console.log('ws close')
	}
	ws.onerror = function(event) {
		// onclose is also called when onerror is fired
		onScreenLog("WebSocket error observed:", event.data);
		console.log('ws error')
	};
}

function uiConnectState(state, btnConnect, commandSend) {
	var btnConnect = document.getElementById('btnConnect');
	var commandSend = document.getElementById('commandSend');
	switch(state){
		case 'Connect':
				btnConnect.disabled = false;
				commandSend.disabled = true;
				btnConnect.innerText = 'Connect To Printer';
				connected = false;
				break;
		case 'Connecting':
				commandSend.disabled = true;
				btnConnect.innerText = 'Disconnect';
				connected = false;
				break;
		case 'Disconnect':
				commandSend.disabled = false;
				btnConnect.innerText = 'Disconnect'
				connected = true;
				break;
	}
}


function enableAudio(event) {
	audioEnabled = true;
	enableAudioButton.hidden = true;
}

function send(cmd) {
	if (ws && ws.readyState==1) {
		ws.send(cmd);
		// onScreenLog("Command Sent: '" + cmd + "'");
	}
	txtCmd.select();
}

function formatData(data) {
	// onScreenLog("> " + data);
	console.log(data);
	var initialSearch;
	var pos;
	var nextDelimiter;
	
	// search for end of print string
	initialSearch = "Done printing file";
	pos = data.indexOf(initialSearch);
	if (pos != -1) {
		printComplete = true;
		onScreenLog("Print Complete!");
		return;
	}
	
	// this is looking for this pattern, which is returned while printing:
	//ok N0 P0 B0 T:200.0 /200.0 B:60.7 /60.0 T0:200.0 /200.0 @:79 B@:52
	initialSearch = "ok N0 P0 B0 T:";
	pos = data.indexOf(initialSearch)
	if (pos != -1) {
		pos += initialSearch.length;
		var remainderOfString = data.substring(pos);
		nextDelimiter = remainderOfString.indexOf(" ");
		extruderTemp = remainderOfString.substring(0, nextDelimiter).trim();
		remainderOfString = remainderOfString.substring(nextDelimiter+2).trim();
		nextDelimiter = remainderOfString.indexOf(" ");
		extruderTargetTemp = remainderOfString.substring(0, nextDelimiter).trim();
		// onScreenLog("Temp: " + extruderTemp);
		// onScreenLog("Target Temp: " + extruderTargetTemp);
		displayStats();
		checkLimits();
	}

	// this seems to come up after printing is complete
	initialSearch = "ok N0 P15 B15 T:";
	pos = data.indexOf(initialSearch);
	if (pos != -1) {
		console.log("Not Printing")
	}

}

function displayStats() {
	document.getElementById("extruderTemp").innerHTML = extruderTemp;
	document.getElementById("extruderTargetTemp").innerHTML = extruderTargetTemp;
	document.getElementById("tolerance").innerHTML = tolerance;
}

function isNumeric(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

function setup() {
	connect('192.168.1.120');
	runTempMonitor();
	displayStats();
}

function onLoad() {
	onScreenLog('3D Printer Audio Warning System Ready')
	setup()
}

function runTempMonitor() {
	if (connected) send("M105");
	setTimeout(runTempMonitor, 2500);
	console.log("loop")
}

function checkLimits() {
	if (!isNumeric(extruderTemp) || !isNumeric(extruderTargetTemp)) {
		onScreenLog("WARNING: NON-NUMERIC VALUES!");
		return;
	}
	var diff = Math.round(Math.abs(extruderTemp - extruderTargetTemp) * 100) / 100;
	// onScreenLog("Diff: "+diff+");
	if (diff > tolerance) {
		var date = new Date();
		onScreenLog("WARNING: Extruder vs Target Temperature out of tolerance.\nDifference: " + diff + " °C\n" + date.toDateString() + " " + date.toLocaleTimeString() + " ");
		playAudio();
	}
	else {
		stopAudio();
	}
}

async function playAudio() {
	if (!audioEnabled) return;
	try {
		await audio.play();
	} catch (err) {
		console.log('audio not enabled, the user has to click a button or something to enable it.')
	}
}

async function stopAudio() {
	if (!audioEnabled) return;
	try {
		await audio.pause();

	} catch (err) {
		console.log('audio not enabled, the user has to click a button or something to enable it.')
	}
}