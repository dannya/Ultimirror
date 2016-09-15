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

// require('request').debug = true;


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
            "initial":  "145207264@N06"
        }
    ],


    getData: function () {
        var self = this;

        // show loading spinner
        self.loading(true);

        // initialise request counter
        var numRequests = 0;

        var getRemoteData = function (success, error) {
            ++numRequests;

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
                        if (response.statusCode === 200) {
                            // hide loading spinner
                            self.loading(false);

                            // trigger success callback
                            console.log('success for ' + self.moduleType);

                            success({
                                url: body.photos.photo[Math.floor(Math.random() * body.photos.total)].url_l
                            });


                        } else {
                            // - unknown response code
                            console.error('--');
                            console.error(response.statusCode);
                            console.error(err);
                            console.error('--');

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



            // $.getJSON(
            //
            //     "http://api.flickr.com/services/rest/",
            //
            //     {
            //
            //         method: 'flickr.people.getPublicPhotos',
            //
            //         api_key: apiKey,
            //
            //         user_id: the_user_id,
            //
            //         format: 'json',
            //
            //         nojsoncallback: 1,
            //
            //         per_page: 10 // you can increase this to get a bigger array
            //
            //     }
            //
            // function(data){
            //
            //
            //
            //     // if everything went good
            //
            //     if(data.stat == 'ok'){
            //
            //         // get a random id from the array
            //
            //         var photoId = data.photos.photo[ Math.floor( Math.random() * data.photos.photo.length ) ];
            //
            //
            //
            //         // now call the flickr API and get the picture with a nice size
            //
            //         $.getJSON(
            //
            //             "http://api.flickr.com/services/rest/",
            //
            //             {
            //
            //                 method: 'flickr.photos.getSizes'.
            //
            //                     api_key: apiKey,
            //
            //             photo_id: photoId,
            //
            //             format: 'json',
            //
            //             nojsoncallback: 1
            //
            //     }
            //
            //         function(response){
            //
            //             if(response.stat == 'ok'){
            //
            //                 var the_url = response.sizes.size[5].source;
            //
            //                 $("#"+your_div_id).append('<img src="' + the_url + '" />');
            //
            //             }
            //
            //             else{
            //
            //                 console.log(" The request to get the picture was not good :\ ")
            //
            //             }
            //
            //         }
            //
            //     );
            //
            //
            //
            //     }
            //
            //     else{
            //
            //         console.log(" The request to get the array was not good :( ");
            //
            //     }
            //
            // }
            //
            // );
        };


        // return promise object
        return new Promise(
            getRemoteData
        );
    }
});


module.exports = Photos;