const ipc = io(window.location.origin);


//
var Ultimirror = angular.module('Ultimirror', ['ngSanitize', 'ngAnimate', 'angularMoment', 'oc.lazyLoad']);


// define directives
angular.module('Ultimirror')
    .directive('fadeIn', function () {
        return {
            restrict: 'A',
            link: function ($scope, $element, attr) {
                $element.addClass('ng-hide-remove');
                $element.on('load', function () {
                    $element.addClass('ng-hide-add');
                });
            }
        };
    })
    .directive('onFinishRender', ['$timeout', function ($timeout) {
        return {
            restrict: 'A',
            link: function ($scope, element, attr) {
                if ($scope.$last === true) {
                    $timeout(function () {
                        $scope.$emit(
                            attr.onFinishRender
                        );
                    });
                }
            }
        }
    }])
    .directive('layout', ['$http', '$templateCache', '$compile', '$animate', '$timeout', function ($http, $templateCache, $compile, $animate, $timeout) {
        return {
            restrict: 'E',
            link: function ($scope, element, attr) {
                // watch for changes to layout variable, and load new layout when it changes
                $scope.$watch(
                    'ultimirror.base.layout',
                    function (layout) {
                        if (!layout) {
                            return;
                        }

                        // determine layout file
                        var layoutFile;

                        if (attr.admin) {
                            layoutFile = layout.admin;

                        } else {
                            if ($scope.ultimirror.config.layout) {
                                // layout has been specifically overridden by command line config
                                layoutFile = $scope.ultimirror.config.layout;

                            } else {
                                layoutFile = layout.mirror;
                            }
                        }

                        // don't re-render if the layout hasn't changed
                        if (layoutFile === $scope.currentLayout) {
                            return;
                        }

                        // set flag
                        $scope.currentLayout = layoutFile;

                        // get the template, then insert the compiled contents into the element container
                        $http
                            .get(
                                'layouts/' + (layoutFile + '.html'),
                                {
                                    cache: $templateCache
                                }
                            )
                            .success(
                                function (tplContent) {
                                    // insert content...
                                    var $$existingContent = element.children();

                                    if ($$existingContent.length === 0) {
                                        // set layout name as attribute on element
                                        element.attr('data-layout', layoutFile);

                                        // insert content (first run)
                                        $timeout(
                                            function () {
                                                // animate in new content
                                                $animate
                                                    .enter(
                                                        $compile(tplContent)($scope),
                                                        element
                                                    );
                                            }
                                        );

                                    } else {
                                        // replace existing content
                                        $animate
                                            .leave(
                                                $$existingContent
                                            )
                                            .then(
                                                function () {
                                                    // set layout name as attribute on element
                                                    element.attr('data-layout', layoutFile);

                                                    $timeout(
                                                        function () {
                                                            // animate in new content
                                                            $animate
                                                                .enter(
                                                                    $compile(tplContent)($scope),
                                                                    element
                                                                );
                                                        }
                                                    );
                                                }
                                            );
                                    }
                                }
                            );
                    },
                    true
                );
            },
            scope: true
        }
    }])
    .directive('module', function () {
        return {
            restrict: 'E',
            templateUrl: function (element, attr) {
                return 'modules/' + attr.type + '/' + (attr.type + '.html');
            },
            scope: true,
            compile: function (element, attr) {
                return function ($scope, element, attr) {
                    // get module and instance ID
                    var module = {
                        moduleType: attr.type
                    };

                    if (attr.id) {
                        module['moduleId'] = attr.id;
                    } else {
                        module['moduleId'] = 'default';
                    }

                    // set values into scope
                    $scope.moduleType   = module['moduleType'];
                    $scope.moduleId     = module['moduleId'];
                    $scope.moduleKey    = module['moduleType'] + '_' + module['moduleId'];

                    // initialise the module instance
                    ipc.emit(
                        'initialiseModuleInstance',
                        module
                    );
                };
            }
        }
    });


//
angular.module('Ultimirror')
    .controller('UltimirrorCtrl', ['$rootScope', '$scope', '$timeout', '$parse', function ($rootScope, $scope, $timeout, $parse) {

        // determine context and page
        var context     = 'browser',
            urlQuery    = window.location.search.substring(1).split('&');

        for (var i = 0; i < urlQuery.length; i++) {
            var pair = urlQuery[i].split('=');

            if (decodeURIComponent(pair[0]) === 'context') {
                context = decodeURIComponent(pair[1]);
                break;
            }
        }

        var isAdmin     = document.children[0].classList.contains('admin');


        // add utility object / functions to root scope
        $rootScope.objectKeys = Object.keys;

        $rootScope.isBoolean = function (value) {
            return ((value === true) || (value === false));
        };

        // add UI interaction functions to root scope (to allow access on rest of admin page)
        $rootScope.changeCurrentlyDisplaying = function (layout, isAdmin) {
            ipc.emit(
                'action',
                {
                    fn:         ['fn', 'layout', 'changeCurrentlyDisplaying'],
                    params:     [
                        layout,
                        isAdmin
                    ]
                }
            );
        };


        // kick off ultimirror data retrieval
        ipc.emit(
            'initialise',
            context
        );


        // on setData, set specified ultimirror values into scope
        ipc.on(
            'setData',
            function (payload) {
                $parse(payload.keyPath.join('.'))
                    .assign(
                        $scope,
                        payload.data
                    );

                $scope.$apply();
            }
        );


        // on updateModule, update module data in the scope
        ipc.on(
            'updateModule',
            function (payload) {
                $timeout(
                    function () {
                        if (payload === undefined) {
                            console.log('base no payload');
                            return;
                        }

                        var moduleKey = payload.moduleType + '_' + payload.moduleId;

                        if (!$scope.ultimirror || !$scope.ultimirror.moduleInstances) {
                            console.log('base no instances');
                            return;
                        }
                        if (!$scope.ultimirror.moduleInstances[moduleKey]) {
                            console.log('base no ' + moduleKey);
                            return;
                        }


                        // update data
                        if (payload.data !== undefined) {
                            for (var d in payload.data) {
                                $scope.ultimirror.moduleInstances[moduleKey].data[d] = payload.data[d];
                            }
                        }

                        // update config
                        if (payload.config !== undefined) {
                            if (!$scope.ultimirror.moduleInstances[moduleKey].config) {
                                $scope.ultimirror.moduleInstances[moduleKey].config = {};
                            }

                            for (var c in payload.config) {
                                $scope.ultimirror.moduleInstances[moduleKey].config[c] = payload.config[c];
                            }
                        }

                        // update other attributes?
                        if (payload.attr !== undefined) {
                            for (var a in payload.attr) {
                                $scope.ultimirror.moduleInstances[moduleKey][a] = payload.attr[a];
                            }
                        }

                        $scope.$apply();
                    }
                )
            }
        );


        // when module has been initialised on the backend, set up individual config watchers so we can save the
        // config when it has been changed by the user
        if (isAdmin) {
            var debounceConfigUpdate = {};

            ipc.on(
                'moduleInitialised',
                function (payload) {
                    var moduleKey = payload.moduleType + '_' + payload.moduleId;

                    // watch scope module config changes
                    $scope.$watch(
                        'ultimirror.moduleInstances.' + moduleKey + '._config',
                        function (newValue, oldValue) {
                            if (!newValue || !oldValue) {
                                return;
                            }

                            // if there is an actual change...
                            if (!angular.equals(newValue, oldValue)) {
                                var moduleKey = newValue.moduleType + '_' + newValue.moduleId;

                                // ensure config save function does not get triggered by the change caused by the save process itself!
                                if (debounceConfigUpdate[moduleKey] !== undefined) {
                                    window.clearTimeout(debounceConfigUpdate[moduleKey]);
                                }

                                debounceConfigUpdate[moduleKey] = window.setTimeout(
                                    function () {
                                        // call backend to save the config
                                        ipc.emit(
                                            'action',
                                            {
                                                moduleType: newValue.moduleType,
                                                moduleId:   newValue.moduleId,
                                                fn:         'modifyConfig',
                                                params:     [
                                                    newValue,
                                                    true
                                                ]
                                            }
                                        );
                                    },
                                    250
                                )
                            }
                        },
                        true
                    );
                }
            );
        }

    }]);