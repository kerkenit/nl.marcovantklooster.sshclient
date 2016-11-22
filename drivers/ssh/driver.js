/* global Homey, module __ */
(function() {
	'use strict';
}());
// a list of devices, with their 'id' as key
// it is generally advisable to keep a list of
// paired and active devices in your driver's memory.
var devices = {};
var tempServerName = '',
	tempHostName = '',
	tempUsername = '',
	tempPassword = '',
	tempPort = 22;
// the `init` method is called when your driver is loaded for the first time
module.exports.init = function(devices_data, callback) {
	devices_data.forEach(function(device_data) {
		initDevice(device_data);
	});
	callback();
};
// the `added` method is called is when pairing is done and a device has been added
module.exports.added = function(device_data, callback) {
	initDevice(device_data);
	callback(null, true);
};
// the `delete` method is called when a device has been deleted by a user
module.exports.deleted = function(device_data, callback) {
	delete devices[device_data.id];
	callback(null, true);
};
// the `pair` method is called when a user start pairing
module.exports.pair = function(socket) {
	socket.on('get_devices', function(data, callback) {});
	socket.on('list_devices', function(data, callback) {
		var device_data = {
			name: data.name,
			data: {
				id: data.data.id,
				hostname: data.settings.hostname,
				username: data.settings.username,
				password: data.settings.password,
				port: data.settings.port
			},
			capabilities: []
		};

		callback(null, [device_data]);

	});
};
// flow action handlers
Homey.manager('flow').on('action.command', function(callback, args) {
	Homey.log("SSH Client - sending " + args.command + "\n to " + args.device.id);
	module.exports.getSettings(args.device, function(err, settings) {
		var Client = require('ssh2').Client;
		var conn = new Client();
		var Host = {
			host: settings.hostname,
			port: settings.port,
			tryKeyboard: true,
			username: settings.username,
			password: settings.password
		};
		conn.on('ready', function() {
			conn.exec(args.command, function(err, stream) {
				if (err) {
					Homey.log(err);
					callback(null, false);
				}
				stream.on('close', function(code, signal) {
					conn.end();
					callback(null, true);
				}).on('data', function(data) {
					Homey.log('STDOUT: ' + data);
					callback(null, true); // we've fired successfully
				}).stderr.on('data', function(data) {
					Homey.log('STDERR: ' + data);
					callback(null, false);
				});
			});
		}).on('keyboard-interactive', function(name, instr, lang, prompts, cb) {
			cb([Host.password]);
		}).on('error', function(err) {
			Homey.log(err);
		}).connect(Host);
	});
});
// a helper method to get a device from the devices list by it's device_data object
var getDeviceByData = function(device_data) {
		var device = devices[device_data.id];
		if (typeof device === 'undefined') {
			return new Error("invalid_device");
		} else {
			return device;
		}
	};
// a helper method to add a device to the devices list
var initDevice = function(device_data) {
		devices[device_data.id] = {};
		devices[device_data.id].data = device_data;
		module.exports.getSettings(device_data, function(err, settings) {
			devices[device_data.id].settings = settings;
		});
	};