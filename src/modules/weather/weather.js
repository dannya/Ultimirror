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


const Weather = UltimirrorModule.extend('Weather', {
    moduleType: 'weather',
    moduleName: 'Weather',

    update:     (60 * 15),

    defaultConfig: [
        {
            "id":       "temperatureUnits",
            "name":     "Temperature units",
            "initial":  "<system>",
            "values": {
                "<system>":         "(Use system setting)",
                "metric":           "Metric",
                "imperial":         "Imperial"
            }
        },

        {
            "id":       "location",
            "name":     "Location",
            "initial":  "Birmingham,uk"
        },
        {
            "id":       "showLocation",
            "name":     "Show location?",
            "initial":  true
        },
        {
            "id":       "apiKey",
            "name":     "OpenWeatherMap API key",
            "initial":  "41a4c2a6b97a096c0502d39a1326e028",
            "note":     "Go to TODO to get an API key for this service."
        },
        {
            "id":       "layout",
            "name":     "Layout",
            "initial":  "current_hybrid",
            "values": {
                "current":          "Current forecast",
                "current_hybrid":   "Current forecast with 4 day (tabular) forecast",
                "5day_table":       "5 day forecast (tabular)"
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

            // get and process the remote data
            request(
                'http://api.openweathermap.org/data/2.5/forecast?q=' + self.config.location + '&units=' + self.config.temperatureUnits + '&appid=' + self.config.apiKey,
                function (err, response, body) {
                    if (!err) {
                        if (response.statusCode === 200) {
                            var weatherData = JSON.parse(body);

                            // process current forecase data
                            var current = self._extractWeather(
                                weatherData.list[0]
                            );

                            // process 5 day forecast data and put into days structure
                            var days = [];
                            for (var i in weatherData.list) {
                                var extracted = self._extractWeather(
                                    weatherData.list[i]
                                );

                                // add the weather data from every day at midday
                                if (extracted.timestamp.hour() === 12) {
                                    days.push(
                                        extracted
                                    );
                                }
                            }

                            // hide loading spinner
                            self.loading(false);

                            // trigger success callback
                            ultimirror.fn.log.success(
                                'success for ' + self.moduleType + ' (' + self.config.location + ')'
                            );

                            success({
                                location:   self.config.location.split(',')[0],
                                current:    current,
                                days:       days
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
                        error(err);
                    }
                }
            );
        };


        // return promise object
        return new Promise(
            getRemoteData
        );
    },


    _extractWeather: function (weatherItem) {
        var timestamp = moment.utc(
            parseInt(weatherItem.dt, 10) * 1000
        );

        var data = {
            timestamp:      timestamp,
            time:           timestamp.toISOString()
        };

        // safely add additional weather data
        if (weatherItem.weather && weatherItem.weather[0]) {
            if (weatherItem.weather[0].icon) {
                data['icon'] = weatherItem.weather[0].icon;
            }
            if (weatherItem.weather[0].main) {
                data['condition'] = weatherItem.weather[0].main;
            }
        }

        if (weatherItem.main) {
            if (weatherItem.main.temp) {
                data['temperature'] = weatherItem.main.temp;
            }
            if (weatherItem.main.temp_min) {
                data['temperatureMin'] = weatherItem.main.temp_min;
            }
            if (weatherItem.main.temp_max) {
                data['temperatureMax'] = weatherItem.main.temp_max;
            }
            if (weatherItem.main.humidity) {
                data['humidity'] = weatherItem.main.humidity;
            }
        }

        if (weatherItem.wind) {
            if (weatherItem.wind.speed) {
                data['windSpeed'] = weatherItem.wind.speed;
            }
        }

        return data;
    }
});


module.exports = Weather;