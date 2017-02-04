// imports
const moment    = require('moment');
const request   = require('request');

const Promise   = require('promise');

const UltimirrorModule = require(
    ultimirror.path(
        [
            'js', 'ultimirror', 'module.js'
        ]
    )
);


const Photos = UltimirrorModule.extend('Photos', {
    moduleType: 'photos',
    moduleName: 'Photos',

    update:     (60 * 15),

    defaultConfig: [
        {
            "id":       "photoService",
            "name":     "Photo service",
            "initial":  "flickr",
            "values": {
                "flickr":   "Flickr"
            }
        },
        {
            "id":       "apiKey",
            "name":     "Photo service API key",
            "initial":  "",
            "note":     "Go to TODO to get an API key for this service."
        },
        {
            "id":       "user",
            "name":     "Photo service user ID",
            "initial":  ""
        }
    ],


    getData: function () {
        var self = this;

        // show loading spinner
        self.loading(true);

        // initialise request counter
        var getRemoteData = function (success, error) {
            // get and process the remote data
            request.post(
                {
                    url:        'https://api.flickr.com/services/rest/',
                    json:       true,
                    qs: {
                        format:         'json',
                        method:         'flickr.people.getPhotos',
                        api_key:        self.config.apiKey,
                        user_id:        self.config.user,
                        extras:         'description,date_taken,url_l',
                        per_page:       500,
                        nojsoncallback: 1
                    }
                },
                function (err, response, body) {
                    if (!err) {
                        if ((response.statusCode === 200) && body.photos) {
                            // hide loading spinner
                            self.loading(false);

                            // choose a random photo
                            var randomPhoto = Math.floor(
                                Math.random() * body.photos.total
                            );

                            // trigger success callback
                            console.log('success for ' + self.moduleType);

                            success({
                                url: body.photos.photo[randomPhoto].url_l
                            });


                        } else {
                            // - unknown response code

                            // hide loading spinner
                            self.loading(false);

                            // trigger error callback
                            error(err);
                        }

                    } else {
                        // - unknown error

                        // hide loading spinner
                        self.loading(false);

                        // trigger error callback
                        error(err);
                    }
                }
            );
        };


        // return promise object
        return new Promise(
            getRemoteData
        );
    }
});


module.exports = Photos;