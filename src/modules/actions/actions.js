// imports
const exec      = require('child_process').exec;

const UltimirrorModule = require(
    ultimirror.path(
        [
            'js', 'ultimirror', 'module.js'
        ]
    )
);


const Actions = UltimirrorModule.extend('Actions', {
    moduleType: 'actions',
    moduleName: 'Actions',

    update:     false,


    buttonAction: function (action) {
        var self = this;

        if (action === 'update') {
            exec(
                'git pull',
                function (error, stdout, stderr) {
                    var payload = {};

                    if (!error || (error.code === 0)) {
                        if (stdout.indexOf('Already up-to-date') !== -1) {
                            // already up to date
                            payload = {
                                error:      true,
                                message:    'Already on the latest version'
                            };

                        } else {
                            // success
                            payload = {
                                error:      false,
                                message:    ''
                            };
                        }

                    } else {
                        // error
                        payload = {
                            error:      true,
                            message:    'Unable to update'
                        };
                    }

                    // show notification
                    ultimirror.fn.module.updateData(
                        {
                            moduleType: self.moduleType,
                            moduleId:   self.moduleId
                        },
                        payload
                    );
                });

        } else if (action === 'restart') {
            exec(
                'sudo shutdown -r -k',
                function (error, stdout, stderr) {
                    var payload = {};

                    if (error.code === 0) {
                        // success
                        payload = {
                            error:      false,
                            message:    ''
                        };

                    } else {
                        // error
                        payload = {
                            error:      true,
                            message:    'Unable to restart'
                        };
                    }

                    // show notification
                    ultimirror.fn.module.updateData(
                        {
                            moduleType: self.moduleType,
                            moduleId:   self.moduleId
                        },
                        payload
                    );
                });

        } else if (action === 'shutdown') {
            exec(
                'sudo shutdown -k',
                function (error, stdout, stderr) {
                    var payload = {};

                    if (error.code === 0) {
                        // success
                        payload = {
                            error:      false,
                            message:    ''
                        };

                    } else {
                        // error
                        payload = {
                            error:      true,
                            message:    'Unable to shutdown'
                        };
                    }

                    // show notification
                    ultimirror.fn.module.updateData(
                        {
                            moduleType: self.moduleType,
                            moduleId:   self.moduleId
                        },
                        payload
                    );
                });
        }
    }
});


module.exports = Actions;