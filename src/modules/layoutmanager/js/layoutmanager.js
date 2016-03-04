angular.module('Ultimirror')
    .controller('LayoutManagerCtrl', ['$rootScope', '$scope', function ($rootScope, $scope) {

        // re-broadcast events as module events
        $scope.$on('layoutsRendered', function () {

            $rootScope.$broadcast(
                'moduleEvent',
                {
                    source: 'layoutmanager',
                    event:  'layoutsRendered'
                }
            );

        });


        // respond to module event broadcasts
        $scope.$on('moduleEvent', function (e, data) {

            // show message that items can be dragged onto scheduler
            if ((data.source === 'scheduler') && (data.event === 'draggableReady')) {
                $rootScope.canDragLayouts = true;
                $scope.canDragLayouts = true;
            }

        });

    }]);