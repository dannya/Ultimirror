// imports
const moment    = require('moment');
const request   = require('request');

const Promise   = require('promise');
const Flickr    = require('flickrapi');


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
            Flickr.authenticate(
                {
                    api_key: self.config.apiKey,
                    secret: self.config.apiSecret,
                    access_token: self.config.accessToken,
                    access_token_secret: self.config.accessTokenSecret,
                    user_id: self.config.user
                },
                function (err, flickr) {
                    if (err) {
                        // trigger error callback
                        error(err);

                    } else {
                        flickr.people.getPhotos({
                            api_key: self.config.apiKey,
                            user_id: self.config.user,
                            authenticated: true,
                            extras:         'description,date_taken,url_l',
                            page: 1,
                            per_page: 500
                        },
                        function (err, result) {
                            // hide loading spinner
                            self.loading(false);

                            if (err) {
                                // trigger error callback
                                error(err);

                            } else {
                                try {
                                    // choose a random photo
                                    var randomPhoto = Math.floor(
                                        Math.random() * parseInt(result.photos.total, 10)
                                    );

                                    // trigger success callback
                                    ultimirror.fn.log.success(
                                        'success for ' + self.moduleType
                                    );

                                    success({
                                        url: result.photos.photo[randomPhoto].url_l
                                    });

                                } catch (err) {
                                    error(err);
                                }
                            }
                        });
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