# SSH Client
        
This app will allow you to connect to a remote ssh server.

You can create for every server a device. And give it a logical name.

You can login with you username and password. So you don't have to fill in twice.

In the flow manager you can select the server, and send the command.

# Usefull?

* Trigger a backup script of your server from Homey
* Useful to start a playlist from Spotify https://github.com/dronir/SpotifyControl on your Mac.

#Remarks

* This won't work with certificates. Only username and password is allowed.
* You can't create an connection to the Homey, because SSH access to the Homey is secured by Athom

#Changelog

##v0.1.0

* Rewrite of adding devices. Oldder added devices are unsupported.
* Check on adding if server exist and respond to prevent app hangs and a reboot of Homey
* Removed unnecessary files to save storage on your Homey