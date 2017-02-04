var ultimirror = {
    config: {
        debug: {
            port:           8080,
            config:         false,
            edgePadding:    'medium',
            mute:           false,
            notOnTop:       true,
            windowed:       true,
            windowedWidth:  1280,
            windowedHeight: 800,
            showWindow:     true,
            webInspector:   true,
            zoom:           1,
            updateUrl:      false
        },

        production: {
            port:           80,
            config:         false,
            edgePadding:    'medium',
            mute:           false,
            notOnTop:       false,
            windowed:       false,
            windowedWidth:  768,
            windowedHeight: 1024,
            showWindow:     true,
            webInspector:   false,
            zoom:           1,
            updateUrl:      'https://github.com/dannyakakong/ultimirror/blob/master/package.json'
        }
    },

    layout: {
        admin:      'admin/admin',
        mirror:     'default'
    },

    layouts: {
        'default': {
            id:     'default',
            name:   'Default'
        },
        'bigclock': {
            id:     'bigclock',
            name:   'Big Clock'
        }
    },

    mandatoryModules: [
        'system'
    ]
};


module.exports = ultimirror;