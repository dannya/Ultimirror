// imports
const UltimirrorModule = require(
    ultimirror.path(
        [
            'js', 'ultimirror', 'module.js'
        ]
    )
);


const Scheduler = UltimirrorModule.extend('Scheduler', {
    moduleType: 'scheduler',
    moduleName: 'Scheduler',

    update:     false
});


module.exports = Scheduler;