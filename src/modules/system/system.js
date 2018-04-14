// imports
const execSync  = require('child_process').execSync;
const moment    = require('moment');
const os        = require('os');

const Promise   = require('promise');

const UltimirrorModule = require(
    ultimirror.path(
        [
            'js', 'ultimirror', 'module.js'
        ]
    )
);


const System = UltimirrorModule.extend('System', {
    moduleType: 'system',
    moduleName: 'System',

    update:     false,

    defaultConfig: [
        {
            "id":       "firstName",
            "name":     "First name",
            "initial":  ""
        },
        {
            "id":       "lastName",
            "name":     "Last name",
            "initial":  ""
        },

        {
            "id":       "timeFormat",
            "name":     "Time format",
            "initial":  "12hour",
            "values": {
                "12hour":       "12 hour",
                "24hour":       "24 hour"
            }
        },
        {
            // TODO: implement properly: http://momentjs.com/timezone/docs/
            "id":       "timeZone",
            "name":     "Time zone",
            "initial":  "gmt",
            "values": {
                "gmt":          "GMT"
            }
        },

        {
            "id":       "temperatureUnits",
            "name":     "Temperature units",
            "initial":  "metric",
            "values": {
                "metric":       "Metric",
                "imperial":     "Imperial"
            }
        },

        {
            "id":       "showIntro",
            "name":     "Show intro screen on start (seconds)",
            "initial":  false
        }
    ],


    getData: function () {
        var self = this;

        var uptime,
            osName = os.platform();

        return new Promise(
            function (success, error) {

                // get uptime
                var uptime;

                if (osName === 'win32') {
                    var rawUptime   = execSync('wmic os get lastbootuptime').toString('utf8').split('\n')[1].trim(),
                        datetime    = moment(rawUptime.substring(0, 8) + ' ' + rawUptime.substring(8, 14));

                    uptime = datetime.fromNow(true);

                } else {
                    uptime = execSync('uptime').toString('utf8').split(',')[0].split(' up ')[1];
                }


                // get IP address(es)
                var ifaces      = os.networkInterfaces(),
                    addresses   = {};

                Object.keys(ifaces).forEach(
                    function (ifname) {
                        var alias = 0;

                        ifaces[ifname].forEach(
                            function (iface) {
                                if (('IPv4' !== iface.family) || (iface.internal !== false)) {
                                    // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                                    return;
                                }

                                if (alias >= 1) {
                                    // this single interface has multiple ipv4 addresses
                                    addresses[ifname + ':' + alias] = iface.address;

                                } else {
                                    // this interface has only one ipv4 address
                                    addresses[ifname] = iface.address;
                                }

                                ++alias;
                            }
                        );
                    }
                );


                // try and extract the most-likely reachable address for this system
                var ip;

                for (var a in addresses) {
                    if (addresses[a].startsWith('192')) {
                        ip = addresses[a];
                        break;
                    }
                }

                if (!ip) {
                    ip = addresses[Object.keys(addresses)[0]];
                }

                var ip_display = ip + (
                    (ultimirror.config.port !== 80) ?
                        (':' + ultimirror.config.port) :
                        ''
                );


                // show system IP address on the console the first time the app is loaded
                if (!self.dataLoaded) {
                    ultimirror.fn.log.info(
                        '\n' +
                        `Configure this mirror @ http://${ip_display}\n` +
                        `View this mirror @ http://${ip_display}/mirror`
                    );
                }


                // try and get system temperature
                if (osName !== 'win32') {

                }


                // trigger success callback
                success(
                    {
                        uptime:         uptime,
                        addresses:      addresses,
                        ip:             ip,
                        ip_display:     ip_display
                    }
                );
            }
        );
    }
});


module.exports = System;