/*
	These are OUTPUT commands only. They have no return value.
	All the relevant commands that have a return value are called by the server
	on a regular basis. These commands are supposed to be serialized by the client,
	broadcasted by the server (so that other clients can show them in the terminal).

	The server is supposed to deserialize these properties and use their information if
	applicable in HCS_properties.
*/

var CMD_PARAM_CR = 0; // Carriage return in command
var CMD_PARAM_INT = 1; // Integer value parameter (SOUT/RUNM)
var CMD_PARAM_VOLT = 2; // Voltage value parameter
var CMD_PARAM_CURR = 3; // Current value parameter

var DECIMAL_PLACES = 1;

var command_descriptors = {};

function command_add(command, descriptor) {
	command_descriptors[command] = descriptor;
}

function command_set_decplaces(decplaces) {
	DECIMAL_PLACES = decplaces;
}


/*
	Split a serial port command into the actual command and the parameters,
	also convert parameters into their actual values.
	e.g. command_deserialize("CURR123", 1);
		>>> {command: "CURR", parameters: [12.3]}

	command		= The command with parameters
*/
function command_deserialize(command) {
	var hcscommand = command.substring(0, 4);
	var desc = command_descriptors[hcscommand];
	var values = Array();

	if (!desc) return false;
	var iterator = 4;
	desc.forEach(function(d) {
		if (d == CMD_PARAM_CR) {
			iterator++;
		} else if (d == CMD_PARAM_INT) {
			values.push(parseInt(command.substring(iterator, iterator + 1)));
			iterator++;
		} else if (d == CMD_PARAM_VOLT) {
			values.push(parseFloat(command.substring(iterator, iterator + 3)) / 10);
			iterator += 3;
		} else if (d == CMD_PARAM_CURR) {
			values.push(parseFloat(command.substring(iterator, iterator + 3)) /
				Math.pow(10, DECIMAL_PLACES));
			iterator += 3;
		}
	});

	return {
		command: hcscommand,
		parameters: values
	};
}

/*
	Construct a serial port command from the actual command and the parameters,
	also convert the parameters so that they are no longer floats, but fit the protocol.
	e.g. command_serialize("CURR", [12.3], 1)
		>>> "CURR123"

	command		= The command without parameters
	parameters	= The parameters as their actual values (e.g. a float for VOLT, int for RUNM)
*/
function command_serialize(command, parameters) {
	var desc = command_descriptors[command];
	var iterator = 0;

	desc.forEach(function(d) {
		if (d == CMD_PARAM_CR) {
			command += "\r";
		} else if (d == CMD_PARAM_INT) {
			command += parameters[iterator++];
		} else if (d == CMD_PARAM_VOLT) {
			var volt_str = (parameters[iterator++] * 10).toString();
			while (volt_str.length < 3) volt_str = "0" + volt_str;
			command += volt_str;
		} else if (d == CMD_PARAM_CURR) {
			var curr_str = (parameters[iterator++] * Math.pow(10, DECIMAL_PLACES)).toString();
			while (curr_str.length < 3) curr_str = "0" + curr_str;
			command += curr_str;
		}
	});

	return command;
}

/*
	Register all the commands with their descriptors
*/
command_add("RUNM", [CMD_PARAM_INT]);
command_add("SOUT", [CMD_PARAM_INT]);
command_add("VOLT", [CMD_PARAM_VOLT]);
command_add("CURR", [CMD_PARAM_CURR]);
command_add("SOCP", [CMD_PARAM_CURR]);
command_add("SOVP", [CMD_PARAM_VOLT]);

/*
	Export commands - only used when this file is coupled with node.js, not on the client side.
*/
if (typeof(exports) != "undefined") {
	exports.serialize = command_serialize;
	exports.deserialize = command_deserialize;
	exports.set_decplaces = command_set_decplaces
}
