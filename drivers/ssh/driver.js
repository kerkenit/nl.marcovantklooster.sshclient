'use strict';

const Homey = require('homey');

let tempServerName = '';
let tempHostName = '';
let tempUsername = '';
let tempPassword = '';
let tempPrivateKey = null;
let tempPassphrase = null;
let tempPort = 22;

module.exports = class sshDriver extends Homey.Driver {

  onPair(socket) {
    // socket is a direct channel to the front-end
    // this method is run when Homey.emit("list_devices") is run on the front-end
    // which happens when you use the template `list_devices`
    socket.on('list_devices', (data, callback) => {
      this.log(`SSH Client - list_devices tempHostName is: ${tempHostName}`);
      const devices = [{
        data: {
          id: tempHostName,
          hostname: tempHostName,
          username: tempUsername,
          password: tempPassword,
          privateKey: tempPrivateKey,
          passphrase: tempPassphrase,
          port: parseInt(tempPort, 10),
        },
        name: tempServerName,
      }];
      callback(null, devices);
    });
    // this is called when the user presses save settings button in start.html
    socket.on('get_devices', function(data, callback) {
      // Set passed pair settings in variables
      tempHostName = data.hostname;
      tempUsername = data.username;
      tempPassword = data.password;
      tempPrivateKey = data.privateKey;
      tempPassphrase = data.passphrase;
      tempPort = data.port;

      const devices = [{
        data: {
          id: tempHostName,
          hostname: tempHostName,
          username: tempUsername,
          password: tempPassword,
          privateKey: tempPrivateKey,
          passphrase: tempPassphrase,
          port: parseInt(tempPort, 10),
        },
        name: tempServerName,
      }];

      if (data.serverName === undefined || data.serverName === null
        || data.serverName.length === 0) {
        tempServerName = tempHostName;
      } else {
        tempServerName = data.serverName;
      }
      this.log('SSH Client - got get_devices from front-end, tempHostName =', tempHostName);
      callback(null, devices);
    });
  }

};
