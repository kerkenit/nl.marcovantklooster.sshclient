'use strict';

const Homey = require('homey');

class SshClient extends Homey.App {

  async onInit() {
    this.log('SSH client is starting');
  }

}

module.exports = SshClient;
