// imports
const moment    = require('moment');

const UltimirrorModule = require(
    ultimirror.path(
        [
            'js', 'ultimirror', 'module.js'
        ]
    )
);


const DateTime = UltimirrorModule.extend('DateTime', {
    moduleType: 'datetime',
    moduleName: 'Date and Time',

    update:     1,

    defaultConfig: [
        {
            "id":       "timeFormat",
            "name":     "Time format",
            "initial":  "<system>",
            "values": {
                "<system>":         "(Use system setting)",
                "12hour":           "12 hour",
                "24hour":           "24 hour"
            }
        },
        {
            "id":       "timeZone",
            "name":     "Time zone",
            "initial":  "<system>",
            "values": {
                "<system>":         "(Use system setting)"
            }
        },

        {
            "id":       "theme",
            "name":     "Theme",
            "initial":  "digital",
            "values": {
                "digital":          "Digital",
                "analog":           "Analog"
            }
        },
        {
            "id":       "showTimeZone",
            "name":     "Show time zone?",
            "initial":  false
        }
    ],


    getData: function () {
        return Promise.resolve(
            {
                datetime: moment()
            }
        );
    }
});


module.exports = DateTime;