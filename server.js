// ########## Configuration ##########
var TCP_PORT = 4444
var SERIAL_PORT = process.argv[2];
var SERIAL_BAUD = 9600;
var DECIMAL_PLACES = 1;
var UPDATE_TIME = 200; // in ms
// ###################################

if (!SERIAL_PORT) {
	console.log("You must specify a serial port. Syntax is");
	console.log("node server.js [PORT]");
	console.log("Use e.g.");
	console.log("     node server.js /dev/ttyUSB0");
	process.exit(1);
}

// Dependencies
var express = require("express");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var path = require("path");
var HCS = require("./hcs.js");
var command = require("./common/commands.js");

// Store number of decimal places in serialization / deserialization modules
command.set_decplaces(DECIMAL_PLACES);

// Client UI state
// The server doesn't care about the contents of this file, it only distributes it to new clients.
var client_ui_state = {};

// Initialize HCS and get some factory-setting properties (max. voltage / current)
var HCS_properties = Object();
HCS.open(SERIAL_PORT, SERIAL_BAUD, function() {
	var noanswer_timeout = setTimeout(function() {
		console.log("HCS didn't answer. Make sure it is powered on.");
		console.log("Also, check if you selected the correct serial port.");
		console.log("Exiting...");
		process.exit(1);
	}, 1000);

	HCS.command("GMAX", function() {
		HCS.command("GMAX", function(answer) {
			clearTimeout(noanswer_timeout);
			HCS_properties.maxvolt = parseInt(answer[0].substring(0, 3)) / 10;
			HCS_properties.maxcurr = parseInt(answer[0].substring(3, 6)) /
				Math.pow(10, DECIMAL_PLACES);

			console.log("------------------------");
			console.log("Maximum voltage: " + HCS_properties.maxvolt.toFixed(2) + " V");
			console.log("Maximum current: " + HCS_properties.maxcurr.toFixed(2) + " A");
			console.log("------------------------");
		});
	});
});

// Update HCS properties regularly
setInterval(function() {
	if (!HCS.ready) return;
	HCS.command("GETD", function(answer) {
		HCS_properties.actual_volt = parseInt(answer[0].substring(0, 4)) / 100;
		HCS_properties.actual_curr = parseInt(answer[0].substring(4, 8)) / 100;
		HCS_properties.cvcc = answer[0].substring(8, 9) == "0" ? "cv" : "cc";
	});

	HCS.command("GETS", function(answer) {
		HCS_properties.volt = parseInt(answer[0].substring(0, 3)) / 10;
		HCS_properties.curr = parseInt(answer[0].substring(3, 6)) / Math.pow(10, DECIMAL_PLACES);
	});

	// "GOUT" command reads state of SOUT, even though it is not documented
	HCS.command("GOUT", function(answer) {
		HCS_properties.enable_out = (answer[0].substring(0, 1) == "0");
	});

	// Inform clients that properties have been updated
	io.emit("propchange");
}, UPDATE_TIME);

// Web-Server component
app.use(express.static(path.join(__dirname, "client")));
app.get("/", function(req, res) {
	res.sendFile(path.join(__dirname, "client", "interface.html"));
});

app.get("/commands.js", function(req, res) {
	res.sendFile(path.join(__dirname, "common", "commands.js"));
});

http.listen(TCP_PORT, function() {
	console.log("listening on *:" + TCP_PORT);
});

// Callback system
var callbacks = Array();

function register_callback(event, callback) {
	callbacks.push({
		event: event,
		func: callback
	});
}

// Socket <--> Manson HCS component
io.on("connection", function(socket) {
	callbacks.forEach(function(cb) {
		socket.on(cb.event, function(msg, fn) {
			cb.func(msg, fn);
		});
	});
});

// Get HCS property callbacks
var prop_callbacks = {};

function register_prop_callback(property, callback) {
	prop_callbacks[property] = callback;
}

register_callback("prop", function(msg, fn) {
	prop_callbacks[msg.type](msg.val, fn);
});

// ##########################################
// ## Server <-> Single Client Interaction ##
// ##########################################
// Get number of decimal place digits for the current value transmitted over the serial port
// Depending on PSU model
register_prop_callback("get_decimal_places", function(val, fn) {
	fn(DECIMAL_PLACES);
});

// Set number of digits for the current value transmitted over the serial port
// Depending on PSU model
register_prop_callback("set_decimal_places", function(val, fn) {
	DECIMAL_PLACES = val;
});

// Get maximum voltage factory setting of the PSU
register_prop_callback("get_max_volt", function(val, fn) {
	fn(HCS_properties.maxvolt);
});

// Get maximum current factory setting of the PSU
register_prop_callback("get_max_curr", function(val, fn) {
	fn(HCS_properties.maxcurr);
});

// Get setting for voltage value
register_prop_callback("get_volt", function(val, fn) {
	fn(HCS_properties.volt);
});

// Get setting for current value
register_prop_callback("get_curr", function(val, fn) {
	fn(HCS_properties.curr);
});

// Get setting for actual output voltage value
register_prop_callback("get_actual_volt", function(val, fn) {
	fn(HCS_properties.actual_volt);
});

// Get setting for actual output current value
register_prop_callback("get_actual_curr", function(val, fn) {
	fn(HCS_properties.actual_curr);
});

// Get wheter constant voltage or constant current mode is active
register_prop_callback("get_cvcc", function(val, fn) {
	fn(HCS_properties.cvcc);
});

// Get wheter the output is enabled (true) or disable (false)
register_prop_callback("get_enable_out", function(val, fn) {
	// Socket.IO seems to have some problems with transmission of booleans.
	// Sometimes, the client receives the wrong value. So use strings instead
	// until the issue has been fixed.
	fn(HCS_properties.enable_out ? "enable" : "disable");
});

// ##############################################
// ## Client <-> (Other) Client(s) Interaction ##
// ##############################################
// Broadcast UI state change message to all clients
register_callback("ui", function(msg, fn) {
	io.emit("ui", msg);
	client_ui_state[msg.type] = msg.val;
});

// ###########################################
// ## HCS <-> Server <-> Client Interaction ##
// ###########################################
register_callback("hcs", function(msg, fn) {
	HCS.command(msg + "\r", function(answer) {
		/********************************************************************************/
		// Interpret command results
		// Only speeds up updating of the GUI, so remove this if you really need to make
		// sure the PSU actually received the command.
		var c = command.deserialize(msg);
		var property_change = true;

		if (c.command == "SOUT")
			HCS_properties.enable_out = (c.parameters[0] == "0");
		else if (c.command == "VOLT")
			HCS_properties.volt = c.parameters[0];
		else if (c.command == "CURR")
			HCS_properties.curr = c.parameters[0];
		else
			property_change = false;

		if (property_change) io.emit("propchange");
		/********************************************************************************/


		// Broadcast command
		io.emit("hcs", msg);
		io.emit("hcs_answer", answer);
	});
});
