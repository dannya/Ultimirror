// imports
const fs        = require('fs');

const Class     = require('class.extend');
const Promise   = require('promise');

const yaml      = require('js-yaml');


const UltimirrorModule = Class.extend('UltimirrorModule', {
    // start subclass override
    moduleType:     '',
    moduleName:     '',

    update:         false,      // false, or seconds

    defaultConfig: {

    },
    // end subclass override

    moduleId:       'default',
    showLoading:    false,

    configLoaded:   false,
    dataLoaded:     false,

    _config:        {},
    config:         {},

    data:           {},


    init: function (module) {
        this.moduleId = module.moduleId;
        this.data = {};
    },

    loading: function (isLoading) {
        // set instance loading flag
        this.showLoading = isLoading;

        // update frontend
        ipc.emit(
            'updateModule',
            {
                moduleType: this.moduleType,
                moduleId:   this.moduleId,
                attr:       {
                    'showLoading': this.showLoading
                }
            }
        );
    },

    modifyConfig: function (newConfig, save) {
        if (!this.configLoaded) {
            return;
        }

        // change values in config and live stores
        for (var c in newConfig) {
            // change config value
            this._config[c] = newConfig[c];

            // convert string boolean to real boolean
            if (newConfig[c] === 'true') {
                newConfig[c] = true;
            } else if (newConfig[c] === 'false') {
                newConfig[c] = false;
            }

            // change live config value
            this.config[c] = newConfig[c];
        }


        // check for '<system>' values in config, and inject them with the actual value
        var instances = [];

        if (this.moduleType === 'system') {
            // cascade config value changes to all the other modules
            instances = ultimirror.moduleInstances;

        } else {
            // inject values for this instance only
            instances = [
                ultimirror.moduleInstances[this.moduleType + '_' + this.moduleId]
            ];
        }


        // perform the system values injection
        this
            ._injectSystemValues(
                instances
            )
            .then(
                function () {
                    // update frontend datastore
                    ipc.emit(
                        'updateModule',
                        {
                            moduleType: this.moduleType,
                            moduleId:   this.moduleId,
                            config:     this.config
                        }
                    );
                }
            );

        // refresh the data, as it can possibly change based on the new config
        this._getData();

        // save the new values to disk?
        if (save === true) {
            this._saveConfig();
        }
    },

    load: function () {
        var self = this;

        var finish = function (success, error) {
            // get data on load to initialise UI
            self._getData();

            // get fresh data every n seconds?
            if (typeof self.update === 'number') {
                setInterval(
                    self._getData.bind(self),
                    (self.update * 1000)
                );
            }

            // trigger success callback
            success();
        };


        return new Promise(
            function (success, error) {

                // load config?
                if (!self.configLoaded) {
                    self
                        ._loadConfig()
                        .then(
                            function () {
                                // set loaded flag
                                self.configLoaded = true;

                                finish(success, error);
                            }
                        );

                } else {
                    finish(success, error);
                }

            }
        );
    },


    //
    _loadConfig: function () {
        var self = this;

        return new Promise(
            function (success, error) {

                // attempt to load a config file...
                try {
                    // ...config file exists, so it takes precedence
                    self._config = self._processConfig(
                        yaml.safeLoad(
                            fs.readFileSync(
                                ultimirror.path(
                                    [
                                        'modules', self.moduleType, (self.moduleType + '.config')
                                    ],
                                    false
                                ),
                                'utf8'
                            )
                        )
                    );

                    // check if we have instance-specific config data
                    if (self._config[self.moduleId]) {
                        self._config = self._config[self.moduleId];

                    } else {
                        // no specific config matching instance ID, use default config
                        self._config = self._processConfig(
                            self.defaultConfig
                        );
                    }

                } catch (err) {
                    ultimirror.fn.log.error(
                        '- could not load config file for ' + self.moduleType
                    );

                    // ...config file is invalid or does not exist, use default config
                    self._config = self._processConfig(
                        self.defaultConfig
                    );
                }


                // clone config for live modification and use
                self.config = JSON.parse(
                    JSON.stringify(self._config)
                );

                // add module type, name, and module ID to the config and live config
                self._config = self._idConfig(self._config);
                self.config = self._idConfig(self.config);


                // check for '<system>' values in config, and inject them with the actual value
                var moduleKey = self.moduleType + '_' + self.moduleId;

                self
                    ._injectSystemValues(
                        [
                            ultimirror.moduleInstances[moduleKey]
                        ]
                    )
                    .then(
                        function () {
                            // TODO: is this needed?
                            // set default config back into this object for access in scope
                            self.defaultConfig = self.defaultConfig;

                            // update frontend datastore
                            ipc.emit(
                                'updateModule',
                                {
                                    moduleType: self.moduleType,
                                    moduleId:   self.moduleId,
                                    config:     self.config
                                }
                            );

                            // trigger success callback
                            success();
                        }
                    );
            }

        );
    },

    _saveConfig: function () {
        console.log('--save--');

        // load in existing config file, so that we don't wipe out the config of other instances
        var idConfig;

        try {
            // ...config file exists, so it takes precedence
            idConfig = this._processConfig(
                require(
                    ultimirror.path(
                        [
                            'modules', this.moduleType, (this.moduleType + '.json')
                        ],
                        false
                    )
                )
            );

        } catch (err) {
            idConfig = {};
        }


        // link this module instance config to the correct instance ID
        idConfig[this.moduleId] = JSON.parse(
            JSON.stringify(
                this._config
            )
        );


        // remove module type, name, and module ID from the config that we will save
        idConfig[this.moduleId] = this._idConfig(
            idConfig[this.moduleId],
            true
        );


        try {
            // convert to JSON string representation
            var outputConfig = JSON.stringify(
                idConfig,
                function (key, value) {
                    console.log(key + ' - ' + typeof value + ' ' + value);

                    // convert string boolean to real boolean
                    if (value === 'true') {
                        return true;

                    } else if (value === 'false') {
                        return false;

                    } else {
                        return value;
                    }

                },
                4
            );

            var outputPath = ultimirror.path(
                [
                    'modules', this.moduleType, (this.moduleType + '.json')
                ],
                false
            );

            // write to file
            fs.writeFileSync(
                outputPath,
                outputConfig
            );

            console.info(
                'config written to ' + outputPath
            );
            console.info(
                JSON.stringify(
                    idConfig,
                    null,
                    4
                )
            );

        } catch (err) {
            // error
            ultimirror.fn.log.error(
                err
            );
        }
    },

    _idConfig: function (config, remove) {
        if (remove) {
            // remove module type, name, and module ID from the config
            delete config.moduleType;
            delete config.moduleName;
            delete config.moduleId;

        } else {
            // remove module type, name, and module ID to the config
            config.moduleType = this.moduleType;
            config.moduleName = this.moduleName;
            config.moduleId = this.moduleId;
        }

        return config;
    },

    _getData: function () {
        // do not continue if a data function has not been defined
        if (typeof this.getData !== 'function') {
            return false;
        }

        var self = this;

        // get updated data from module
        this
            .getData()
            .then(
                function (data) {
                    // set loaded flag
                    self.dataLoaded = true;

                    // update backend and frontend datastore
                    ultimirror.fn.module.updateData(
                        {
                            moduleType: self.moduleType,
                            moduleId:   self.moduleId
                        },
                        data
                    );
                },

                function (err) {
                    // error
                    ultimirror.fn.log.error('Data load error: ' + self.moduleType + '_' + self.moduleId);
                    ultimirror.fn.log.error(err);
                }
            );
    },

    _processConfig: function (rawConfig) {
        // return a plain data representation of an enhanced module rawConfig
        if (typeof rawConfig.length === 'number') {
            // convert
            var config = {};

            for (var i in rawConfig) {
                config[rawConfig[i].id] = rawConfig[i].initial;
            }

            return config;

        } else {
            // rawConfig is already plain data, return
            return rawConfig;
        }
    },

    _injectSystemValues: function (moduleInstances) {
        var self = this;

        return new Promise(
            function (success, error) {

                for (var m in moduleInstances) {
                    // do not attempt to update 'system' modules
                    if (moduleInstances[m].moduleType === 'system') {
                        continue;
                    }

                    //
                    var hasDependentConfig = false;

                    //
                    for (var c in moduleInstances[m].config) {
                        if (moduleInstances[m]._config[c] === '<system>') {
                            hasDependentConfig = true;

                            if (ultimirror.moduleInstances['system_default'].config[c] !== undefined) {
                                moduleInstances[m].config[c] = ultimirror.moduleInstances['system_default'].config[c];

                            } else {
                                console.warn(c + ' not available in "system_default" config');

                                moduleInstances[m].config[c] = '';
                            }
                        }
                    }

                    // if this instance has any dependent config, refresh the data, as it can possibly change based on
                    // the new parent config
                    if (hasDependentConfig && moduleInstances[m].configLoaded) {
                        moduleInstances[m]._getData();
                    }

                    // update frontend datastore
                    ipc.emit(
                        'updateModule',
                        {
                            moduleType: moduleInstances[m].moduleType,
                            moduleId:   moduleInstances[m].moduleId,
                            config:     moduleInstances[m].config
                        }
                    );
                }

                // trigger success callback
                success();
            }

        );
    }
});


module.exports = UltimirrorModule;