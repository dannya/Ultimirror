// imports
const request   = require('request');

const Promise   = require('promise');

const UltimirrorModule = require(
    ultimirror.path(
        [
            'js', 'ultimirror', 'module.js'
        ]
    )
);


const Quotes = UltimirrorModule.extend('Quotes', {
    moduleType: 'quotes',
    moduleName: 'Quotes',

    update:     (60 * 15),

    defaultConfig: [
        {
            "id":       "firstName",
            "name":     "First name",
            "initial":  "<system>",
            "values": {
                "<system>":         "(Use system setting)"
            }
        },
        {
            "id":       "lastName",
            "name":     "Last name",
            "initial":  "<system>",
            "values": {
                "<system>":         "(Use system setting)"
            }
        },

        {
            "id":       "maxLength",
            "name":     "Max length (chars)",
            "initial":  350
        }
    ],


    _dataSources: [
        {
            url:    'http://quotesondesign.com/wp-json/posts?filter[orderby]=rand&filter[posts_per_page]=1',
            fn:     function (body) {
                try {
                    return {
                        text:   body[0].content,
                        author: body[0].title
                    };

                } catch (err) {
                    return {
                        text: ''
                    };
                }
            }
        },
        {
            url:    'http://quotes.rest/qod.json',
            fn:     function (body) {
                try {
                    return {
                        text: body.contents.quotes[0].quote
                    };

                } catch (err) {
                    return {
                        text: ''
                    };
                }
            }
        },
        {
            url:    'http://api.icndb.com/jokes/random',
            fn:     function (body) {
                try {
                    return {
                        text: body.value.joke
                    };

                } catch (err) {
                    return {
                        text: ''
                    };
                }
            }
        },
        {
            url:    function () {
                return 'http://api.icndb.com/jokes/random?firstName=' + self.config.firstName + '&lastName=' + self.config.lastName;
            },
            fn:     function (body) {
                try {
                    return {
                        text: body.value.joke
                    };

                } catch (err) {
                    return {
                        text: ''
                    };
                }
            }
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

            // get a random datasource
            var dataSource = self._dataSources[Math.floor(Math.random() * 3)];

            // get URL
            var url = dataSource.url;
            if (typeof dataSource.url === 'function') {
                url = dataSource.url();
            }

            // get and process the remote data
            request(
                url,
                function (err, response, body) {
                    if (!err) {
                        if (response.statusCode === 200) {
                            var quoteData = dataSource.fn(
                                JSON.parse(body)
                            );

                            // hide loading spinner
                            self.loading(false);

                            // trigger success callback
                            console.log('success for ' + self.moduleType);

                            success({
                                text: (quoteData.text.length < self.config.maxLength) ? quoteData.text : ''
                            });

                        } else if (response.statusCode === 429) {
                            // too many requests, try again?
                            if (numRequests < 2) {
                                console.log('-- trying ' + self.moduleType + ' again (' + numRequests + ' of 2) in 3 seconds');

                                setTimeout(
                                    function () {
                                        getRemoteData(
                                            success,
                                            error
                                        );
                                    },
                                    3000
                                )

                            } else {
                                // - exceeded request attempts limit
                                console.error('-- too many ' + self.moduleType + ' attempts');

                                // hide loading spinner
                                self.loading(false);

                                // trigger error callback
                                error(err);
                            }

                        } else {
                            // - unknown response code
                            console.error(response.statusCode);
                            console.error(err);

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
                        error(error);
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


module.exports = Quotes;