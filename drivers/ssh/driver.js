var tempServerName = '',
	tempHostName = '',
	tempUsername = '',
	tempPassword = '',
	tempPort = 22;
module.exports.pair = function(socket) {
	// socket is a direct channel to the front-end
	// this method is run when Homey.emit('list_devices') is run on the front-end
	// which happens when you use the template `list_devices`
	socket.on('list_devices', function(data, callback) {
		console.log("SSH Client - list_devices tempHostName is", tempHostName);
		var devices = [{
			data: {
				id: tempHostName,
				hostname: tempHostName,
				username: tempUsername,
				password: tempPassword,
				port: parseInt(tempPort, 10)
			},
			name: tempServerName
		}];
		callback(null, devices);
	});
	// this is called when the user presses save settings button in start.html
	socket.on('get_devices', function(data, callback) {
		// Set passed pair settings in variables
		tempHostName = data.hostname;
		tempUsername = data.username;
		tempPassword = data.password;
		tempPort = data.port;

		var devices = [{
			data: {
				id: tempHostName,
				hostname: tempHostName,
				username: tempUsername,
				password: tempPassword,
				port: parseInt(tempPort, 10)
			},
			name: tempServerName
		}];

		if (data.serverName === undefined || data.serverName === null || data.serverName.length === 0) {
			tempServerName = tempHostName;
		} else {
			tempServerName = data.serverName;
		}
		console.log("SSH Client - got get_devices from front-end, tempHostName =", tempHostName);
		callback(null, devices);
	});
};
// flow action handlers
Homey.manager('flow').on('action.command', function(callback, args) {
	console.log("SSH Client - sending " + args.command + "\n to " + args.device.id);
	module.exports.getSettings(args.device, function(err, settings) {
		Homey.log(settings);
		var Client = require('ssh2').Client;
		var conn = new Client();
		conn.on('ready', function() {
			conn.exec(args.command, function(err, stream) {
				if (err) {
					console.log(err);
					callback(null, false);
				};
				stream.on('close', function(code, signal) {
					conn.end();
					callback(null, true);
				}).on('data', function(data) {
					console.log('STDOUT: ' + data);
					callback(null, true);// we've fired successfully
				}).stderr.on('data', function(data) {
					console.log('STDERR: ' + data);
					callback(null, false);
				});
			});
		}).on('keyboard-interactive', function(name, instr, lang, prompts, cb) {
			cb([settings.password]);
		}).connect({
			host: settings.hostname,
			port: settings.port,
			tryKeyboard: true,
			username: settings.username,
			password: settings.password
		});
	});
});