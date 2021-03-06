'use strict';

// imports
const nomnom            = require('nomnom');
const http              = require('http');
const path              = require('path');
const url               = require('url');
const fs                = require('fs');
const os                = require('os');
const mime              = require('mime');
const yaml              = require('js-yaml');
const io                = require('socket.io');
const ChalkAnimation    = require('chalk-animation');


// keep a global reference of certain objects to stop them getting garbage collected
let win, powersave;


// load package and config
const pkg = require('./package.json');
const ultimirror = {};


// make ultimirror framework available globally
global.ultimirror = ultimirror;


// initialise framework variables
ultimirror.sys = {
    rootDir:    __dirname,
    name:       pkg.name,
    version:    pkg.version
};


// define function to get full file path
ultimirror.path = function (pathItems) {
    pathItems.unshift(
        ultimirror.sys.rootDir, 'app'
    );

    return path.join.apply(this, pathItems);
};


// load utility functions
ultimirror.fn = require(
    ultimirror.path(
        [
            'js', 'ultimirror', 'fn.js'
        ]
    )
);


ultimirror.moduleInstances = {};


// define command line arguments
const staticConfigOptions = {
    configFile: {
        abbr:       'c',
        default:    'default',
        help:       'Load a specified config file'
    },
    layout: {
        abbr:       'l',
        help:       'Show a specified layout'
    },
    settings: {
        abbr:       's',
        flag:       true,
        default:    false,
        help:       'Show settings page instead of mirror UI'
    },
    webInspector: {
        abbr:       'wi',
        flag:       true,
        default:    false,
        help:       'Show web inspector'
    },
    edgePadding: {
        abbr:       'e',
        choices:    [
            'none',
            'small',
            'medium',
            'large'
        ],
        default:    'medium',
        help:       'Amount of padding between mirror UI and edge of screen'
    },
    noAutoChange: {
        abbr:       'na',
        flag:       true,
        default:    false,
        help:       'No auto changing of layouts'
    },
    mute: {
        abbr:       'm',
        flag:       true,
        default:    false,
        help:       'No audio'
    },
    notOnTop: {
        abbr:       'n',
        flag:       true,
        default:    false,
        help:       'Do not force the window to be on top of other windows'
    },
    version: {
        abbr:       'v',
        flag:       true,
        help:       'Print version and exit',
        callback: function () {
            return `${ultimirror.sys.name} ${ultimirror.sys.version}`;
        }
    },
    windowed: {
        abbr:       'w',
        flag:       true,
        default:    false,
        help:       'Open windowed instead of fullscreen'
    },
    showWindow: {
        abbr:       's',
        default:    true,
        help:       'Show the app GUI in a window (if disabled, this will only be accessible via a web browser)'
    },
    zoom: {
        abbr:       'z',
        default:    1,
        help:       'Zoom factor'
    },
    port: {
        abbr:       'p',
        default:    8080,
        help:       'Local port number that interface is served from'
    }
};


// parse command line options
var configCommandLine = nomnom
    .options(
        staticConfigOptions
    )
    .parse(
        process.argv.slice(1)
    );


// load base config
var baseConfigFile = path.join(
    ultimirror.sys.rootDir, 'base.config'
);

try {
    ultimirror.base = yaml.safeLoad(
        fs.readFileSync(
            baseConfigFile,
            'utf8'
        )
    );

} catch (e) {
    ultimirror.fn.log.error(
        `Could not load ${baseConfigFile}`
    );

    process.exit(1);
}


// load specified (or default) config file
var configFile = ultimirror.path(
    [
        'config', `${configCommandLine['configFile']}.config`
    ]
);

try {
    if (configCommandLine['configFile'] !== 'default') {
        ultimirror.fn.log.info(
            `Loading ${configFile}...`
        );
    }

    let configData = yaml.safeLoad(
        fs.readFileSync(
            configFile,
            'utf8'
        )
    );

    ultimirror.config = configData.config;
    ultimirror.moduleConfig = configData.moduleConfig;

} catch (e) {
    ultimirror.fn.log.error(
        `Could not load ${configFile}`
    );

    process.exit(1);
}


// merge static and command line config values
for (var key in configCommandLine) {
    if (['0', '_'].indexOf(key) === -1) {
        if (typeof staticConfigOptions[key] === 'undefined') {
            // command line value doesn't exist in static config, insert it
            ultimirror.config[key] = configCommandLine[key];

        } else if (configCommandLine[key] !== staticConfigOptions[key].default) {
            // overwrite static value
            ultimirror.config[key] = configCommandLine[key];
        }
    }
}


// start serving interface via URL's
var server = http
    .createServer(
        function (request, response) {
            // get the file
            var filepath = decodeURI(
                url.parse(request.url).pathname
            );

            if ((filepath === '/') || filepath.match(/^\/admin/)) {
                filepath = '/admin.html';
            } else if (filepath.match(/^\/mirror/)) {
                filepath = '/mirror.html';
            }

            filepath = `./app${filepath}`;

            var extname     = path.extname(filepath),
                contentType = 'text/html';

            switch (extname) {
                case '.js':
                    contentType = 'text/javascript';

                    break;
                case '.css':
                    contentType = 'text/css';

                    break;

                case '.json':
                    contentType = 'application/json';
                    break;
                case '.svg':
                    contentType = 'image/svg+xml';
                    break;
                case '.png':
                    contentType = 'image/png';
                    break;
                case '.ico':
                    contentType = 'image/x-icon';
                    break;
            }

            fs.readFile(filepath, function (error, content) {
                if (error) {
                    ultimirror.fn.log.error(
                        error
                    );
                }

                if (error) {
                    if (error.code == 'ENOENT') {
                        response.writeHead(404, { 'Content-Type': contentType });
                        response.end('404', 'utf-8');

                    }  else {
                        response.writeHead(500);
                        response.end(`Sorry, check with the site admin for error: ${error.code}\n`);
                        response.end();
                    }

                } else {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                }
            });

        }
    )
    .listen(
        ultimirror.config.port
    );


// make web contents available globally (for IPC)
global.ipc = io(
    server,
    {
        transports: ['websocket', 'polling']
    }
);


// set up IPC connection with the browser...
ipc.on(
    'connection',
    function (socket) {

        // on initialise signal from browser, initialise backend elements
        socket.on(
            'initialise',
            function (context) {

                // tell mandatory modules we are ready
                for (var i in ultimirror.base.mandatoryModules) {
                    var moduleId    = 'default',
                        moduleKey   = `${ultimirror.base.mandatoryModules[i]}_${moduleId}`;

                    ultimirror.moduleInstances[moduleKey]
                        .load()
                        .then(
                            function () {
                                socket.emit(
                                    'moduleInitialised',
                                    {
                                        moduleType: ultimirror.base.mandatoryModules[i],
                                        moduleId:   moduleId
                                    }
                                );
                            }
                        );
                }


                // show intro screen?
                if (!ultimirror.config.layout &&
                        (typeof ultimirror.moduleInstances['system_default'].config.showIntro === 'number') &&
                        (ultimirror.moduleInstances['system_default'].config.showIntro > 0)) {

                    // temporarily store original value, then set to intro layout
                    ultimirror.base.layout._mirror = ultimirror.base.layout.mirror;
                    ultimirror.base.layout.mirror = 'intro';

                    // set layout to change to the initial layout after the specified number of seconds
                    setTimeout(
                        function () {
                            // restore temporary value and clean up storage
                            ultimirror.base.layout.mirror = ultimirror.base.layout._mirror;
                            delete ultimirror.base.layout._mirror;

                            // update value to force layout view to change
                            ultimirror.fn.update(
                                ['layout', 'mirror'],
                                ultimirror.base.layout.mirror
                            );

                            // set up auto layout switching
                            ultimirror.fn.layout.autoChangeDisplay();

                        },
                        (ultimirror.moduleInstances['system_default'].config.showIntro * 1000)
                    );

                } else {
                    // no intro screen, set up auto layout switching immediately
                    ultimirror.fn.layout.autoChangeDisplay();
                }


                // add context ultimirror into object
                ultimirror.context = context;


                // send data to the web page context
                socket.emit(
                    'setData',
                    {
                        keyPath:    ['ultimirror'],
                        data:       ultimirror
                    }
                );
            }
        );


        // on initialiseModuleInstance signal from browser, initialise the module on the backend
        socket.on(
            'initialiseModuleInstance',
            function (module) {
                var moduleKey = `${module.moduleType}_${module.moduleId}`;

                // initialise module instance if not already initialised
                if (ultimirror.moduleInstances[moduleKey] === undefined) {
                    ultimirror.fn.module
                        .load(
                            module
                        )
                        .then(
                            function (moduleInstance) {
                                // set module instance into the backend datastore
                                ultimirror.moduleInstances[moduleKey] = moduleInstance;

                                // send the module instance back to the browser
                                socket.emit(
                                    'setData',
                                    {
                                        keyPath:    ['ultimirror', 'moduleInstances'],
                                        data:       ultimirror.moduleInstances
                                    }
                                );

                                // now load the module data
                                ultimirror.fn.module.moduleReady(socket, moduleKey);
                            }
                        );

                } else {
                    // load the module data
                    ultimirror.fn.module.moduleReady(socket, moduleKey);
                }
            }
        );


        // set up actions forwarder
        socket.on(
            'action',
            function (data) {
                if ((typeof data.fn === 'object') && (data.fn.length > 0)) {
                    // attempt to call function in base environment
                    var fn = ultimirror;

                    for (var f in data.fn) {
                        fn = fn[data.fn[f]];
                    }

                    if (typeof fn === 'function') {
                        fn.apply(
                            ultimirror,
                            data.params
                        );
                    }

                } else if (data.moduleType && data.moduleId) {
                    // attempt to call action on module
                    var moduleKey = `${data.moduleType}_${data.moduleId}`;

                    // call function on module if it exists
                    if (ultimirror.moduleInstances[moduleKey] && (typeof ultimirror.moduleInstances[moduleKey][data.fn] === 'function')) {
                        ultimirror.moduleInstances[moduleKey][data.fn].apply(
                            ultimirror.moduleInstances[moduleKey],
                            data.params
                        );
                    }
                }
            }
        );
    }
);


// show welcome message
ChalkAnimation.rainbow(
    '\n' +
    `${ultimirror.sys.name} (v${ultimirror.sys.version})` +
    (
        ultimirror.config.debug ?
            ' (debug enabled)':
            ''
    ) +
    '\n'
).start();


// warn if no window will be opened
if (!ultimirror.config.showWindow) {
    ultimirror.fn.log.info(
        '!! Note: Ultimirror window is disabled in the config, visit the URL below to operate !!'
    );
}


// initialise mandatory modules
for (var i in ultimirror.base.mandatoryModules) {
    var moduleId    = 'default',
        moduleKey   = `${ultimirror.base.mandatoryModules[i]}_${moduleId}`;

    // initialise module instance if not already initialised
    if (ultimirror.moduleInstances[moduleKey] === undefined) {
        ultimirror.fn.module
            .load(
                {
                    moduleType: ultimirror.base.mandatoryModules[i],
                    moduleId:   moduleId
                }
            )
            .then(
                function (moduleInstance) {
                    // store module instance in backend datastore
                    ultimirror.moduleInstances[moduleKey] = moduleInstance;

                    // tell module to load its data
                    ultimirror.moduleInstances[moduleKey]
                        .load()
                        .then(
                            function () {
                                // TODO: do something here?
                            }
                        );
                }
            );
    }
}


// create and show app window?
if (ultimirror.config.showWindow) {
    const electron = require('electron');

    const app = electron.app;

    if (!app) {
        ultimirror.fn.log.error(
            'Electron environment not found'
        );

        process.exit(1);
    }


    // observe app ready event
    app.on(
        'ready',
        function () {
            var obj = ultimirror.fn.createWindow();

            // set created objects into global scope
            win = obj.win;
            powersave = obj.powersave;
        }
    );


    // observe app all windows closed event
    app.on(
        'window-all-closed',
        function () {
            // on OS X, keep application active until the user quits explicitly with Cmd + Q
            if (process.platform !== 'darwin') {
                app.quit();
            }
        }
    );


    // observe app activate event
    app.on(
        'activate',
        function () {
            // recreate a window in the app when the dock icon is clicked and there are no other windows open
            if (win === null) {
                createWindow();
            }
        }
    );
}