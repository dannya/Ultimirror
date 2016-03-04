// imports
const UltimirrorModule = require(
    ultimirror.path(
        [
            'js', 'ultimirror', 'module.js'
        ]
    )
);


const LayoutManager = UltimirrorModule.extend('LayoutManager', {
    moduleType: 'layoutmanager',
    moduleName: 'LayoutManager',

    update:     false
});


module.exports = LayoutManager;