const exec      = require('child_process').exec;
const os        = require('os');
const path      = require('path');
const traverse  = require('traverse');
const moment    = require('moment');
const Promise   = require('promise');
const Chalk     = require('chalk');


// set Moment locale
// TODO: set based on system locale
moment.locale('en-gb');


// internal variables
var _autoChangeInterval;


// exported functions
var fn = {
    log: {
        info: function (str) {
            console.info(
                Chalk.white.bgBlue(
                    str
                )
            );
        },
        success: function (str) {
            console.log(
                Chalk.white.bgGreen(
                    `[${moment().format('LTS')}] ${str}`
                )
            );
        },
        warning: function (str) {
            console.warn(
                Chalk.white.bgYellow(
                    str
                )
            );
        },
        error: function (str) {
            console.error(
                Chalk.white.bgRed(
                    str
                )
            );
        },
    },

    network: {
        hasInternet: function (callback) {
            require('dns')
                .lookup(
                    'google.com',
                    function (err) {
                        if (err && (err.code === 'ENOTFOUND')) {
                            callback(false);

                        } else {
                            callback(true);
                        }
                    }
                );
        }
    },

    createWindow: function () {
        const electron  = require('electron');

        // create the browser window
        var win = new electron.BrowserWindow({
            width:              ultimirror.config.windowedWidth,
            height:             ultimirror.config.windowedHeight,
            minWidth:           600,
            minHeight:          600,
            alwaysOnTop:        (ultimirror.config.notOnTop === false) && (ultimirror.config.debug === false),
            darkTheme:          true,
            fullscreen:         (ultimirror.config.windowed === false),
            titleBarStyle:      'hidden',
            backgroundColor:    '#000000',
            transparent:        true,
            webPreferences: {
                zoomFactor:                 (ultimirror.config.zoom ? ultimirror.config.zoom : 1.0),
                plugins:                    true,
                webSecurity:                false,
                webaudio:                   (ultimirror.config.mute === false),
                experimentalFeatures:       true,
                experimentalCanvasFeatures: true
            },
            preload:            ultimirror.path(
                [
                    'js', 'preload.js'
                ]
            ),
            title:              ultimirror.sys.name + ' ' + ultimirror.sys.version
        });

        // load the specified URL, otherwise the local mirror / settings HTML file
        win.loadURL(
            'http://localhost:' + ultimirror.config.port + '/' + (
                (ultimirror.config.settings ?
                    ('admin.html') :
                    ('mirror.html')
                )
            ) + '?context=electron'
        );

        // hide menu bar
        win.setAutoHideMenuBar(true);
        win.setMenuBarVisibility(false);

        // open the devtools?
        if (ultimirror.config.webInspector === true) {
            win.webContents.openDevTools();
        }

        // keep app window title (block page override)
        win.on(
            'page-title-updated',
            function (event) {
                event.preventDefault();
            }
        );

        // observe window close event
        win.on(
            'closed',
            function () {
                win = null;
            }
        );

        // if possible, move mouse to ensure mouse cursor is hidden
        if (os.platform() !== 'win32') {
            exec('xdotool mousemove_relative 10 10');
        }

        // stop display from sleeping
        var powersave = electron.powerSaveBlocker.start('prevent-display-sleep');

        return {
            win:        win,
            powersave:  powersave
        };
    },

    update: function (keyPath, data) {
        // update backend datastore
        traverse(ultimirror).set(keyPath, data);

        // explicitly add 'ultimirror' to keyPath
        keyPath.unshift('ultimirror');

        // update frontend datastore
        ipc.emit(
            'setData',
            {
                keyPath:    keyPath,
                data:       data
            }
        );
    },

    layout: {
        autoChangeDisplay: function () {
            // check if config specifically disallows this
            if (ultimirror.config.noAutoChange) {
                return false;
            }

            // clear any existing interval
            if (_autoChangeInterval) {
                clearInterval(
                    _autoChangeInterval
                );
            }

            // set up interval
            _autoChangeInterval = setInterval(
                function () {
                    // // TODO: make this switch based on config values
                    // ultimirror.fn.update(
                    //     ['layout', 'mirror'],
                    //     (ultimirror.base.layout.mirror === 'bigclock') ? 'default' : 'bigclock'
                    // );

                },
                (10 * 1000)
            );
        },

        changeCurrentlyDisplaying: function (layout, isAdmin) {
            // determine which display to change layout on
            var display = 'mirror';

            if (isAdmin) {
                display = 'admin';
            }

            // send data update
            ultimirror.fn.update(
                ['layout', display],
                layout
            );
        }
    },

    module: {
        load: function (module) {
            return new Promise(
                function (success, error) {

                    try {
                        // load module JS
                        var Module = require(
                            ultimirror.path(
                                [
                                    'modules', module.moduleType, (module.moduleType + '.js')
                                ]
                            )
                        );

                        // trigger success callback
                        success(
                            // initialise module instance
                            new Module(module)
                        );

                    } catch (err) {
                        ultimirror.fn.log.error(
                            err
                        );

                        // trigger error callback
                        error();
                    }

                }
            );
        },

        updateData: function (module, data) {
            // update backend datastore
            var moduleKey = module.moduleType + '_' + module.moduleId;

            for (var d in data) {
                ultimirror.moduleInstances[moduleKey].data[d] = data[d];
            }

            // update frontend datastore
            setTimeout(
                function () {
                    ipc.emit(
                        'updateModule',
                        {
                            moduleType: module.moduleType,
                            moduleId:   module.moduleId,
                            data:       data
                        }
                    );
                },
                0
            )
        },

        moduleReady: function (socket, moduleKey) {
            // tell module to load its data
            ultimirror.moduleInstances[moduleKey]
                .load()
                .then(
                    function () {
                        // tell the frontend that the module has been initialised on the backend
                        socket.emit(
                            'moduleInitialised',
                            {
                                moduleType: module.moduleType,
                                moduleId:   module.moduleId
                            }
                        );
                    }
                );
        }
    }
};


module.exports = fn;