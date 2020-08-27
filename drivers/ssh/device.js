'use strict';

const Homey = require('homey');
const { Device } = require('homey');
const SSH2 = require('node-ssh').NodeSSH;

module.exports = class sshDevice extends Device {

  onInit() {
    // register listener for flowcardtriggers
    const receiveResponseTrigger = new Homey.FlowCardTrigger('receiveResponse');
    receiveResponseTrigger
      .registerRunListener(() => {
        return Promise.resolve();
      })
      .register();

    const receiveErrorTrigger = new Homey.FlowCardTrigger('receiveError');
    receiveErrorTrigger
      .registerRunListener(() => {
        return Promise.resolve();
      })
      .register();

    const sshAction = new Homey.FlowCardAction('command');
    sshAction
      .register()
      .registerRunListener(async args => {
        const settings = this.getSettings();
        this.log(`SSH Client - sending ${args.command}\n to ${settings.hostname}`);
        let completed = false;

        const sshConfig = {
          host: settings.hostname,
          username: settings.username,
          port: settings.port,
          tryKeyboard: true,
          onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
            if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
              this.log('entered password');
              finish([settings.password]);
            }
          },
        };
        if (settings.privateKey) {
          sshConfig.privateKey = settings.privateKey;
          if (settings.passphrase) {
            sshConfig.passphrase = settings.passphrase;
          } else {
            this.log('We did not get a passphrase for this private key!');
          }
        } else {
          sshConfig.password = settings.password;
        }

        const client = new SSH2();

        this.log('starting the connection');
        return client.connect(sshConfig).then(() => {
          client.connection.on('error', err => {
            // Here we catch all errors that are not related to creating a connection or executing
            // the command. In testing that was only about improperly closing a connection.
            // Improperly closed connection errors will be ignored, or more specifically, any error
            // that is received after the command completes is ignored.
            if (completed) {
              return Promise.resolve();
            }
            const tokens = {
              type: 'generic', error: err ? err.toString() : '', command: args.command, deviceName: this.getName(),
            };
            return receiveErrorTrigger.trigger(tokens).catch(receiveErrorTriggerError => {
              this.log('could not start flow', receiveErrorTriggerError);
            }).finally(() => {
              this.log('received error event', tokens);
            });
          });
          this.log('connected');
          client.execCommand(args.command).then(data => {
            // set this command as completed and ignore any errors due to improperly closing the
            // connection as the dispose method does not always work as expected
            completed = true;
            const tokens = {
              command: args.command,
              stdout: data.stdout ? data.stdout : '',
              code: data.code ? data.code : 0,
              stderr: data.stderr ? data.stderr : '',
              signal: data.signal ? data.signal : '',
              deviceName: this.getName(),
            };
            return receiveResponseTrigger.trigger(tokens).catch(
              err => this.log('could not fire the response trigger', err),
            ).finally(() => {
              this.log('received', tokens, data);
              client.dispose();
            });
          }).catch(err => {
            // we can not possibly have completed the command here, as it ended up in the catch
            const tokens = {
              type: 'command', error: err ? err.toString() : '', command: args.command, deviceName: this.getName(),
            };
            return receiveErrorTrigger.trigger(tokens).catch(receiveErrorTriggererror => {
              this.log('could not start flow', receiveErrorTriggererror);
            }).finally(() => {
              this.log('error received on sending command', tokens, err);
              this.setUnavailable(`Error: ${JSON.stringify(err)}`);
              return Promise.resolve();
            });
          });
        }).catch(err => {
          // We failed to connect, so the command could not have completed and we need to fire the
          // receive error trigger.
          const tokens = {
            type: 'connection', error: err ? err.toString() : '', command: args.command, deviceName: this.getName(),
          };
          receiveErrorTrigger.trigger(tokens).catch(receiveErrorTriggerError => {
            this.log('could not fire error trigger', receiveErrorTriggerError);
          }).finally(() => {
            this.setUnavailable(`Error: ${JSON.stringify(err)}`);
            this.log(tokens, err);
          });
        });
      });
  }

};
