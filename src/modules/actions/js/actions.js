angular.module('Ultimirror')
    .controller('ActionsCtrl', ['$scope', function ($scope) {

        // add UI functions into scope
        $scope.actions_buttonAction = function (value) {
            ipc.emit(
                'action',
                {
                    moduleType: $scope.$parent.moduleType,
                    moduleId:   $scope.$parent.moduleId,
                    fn:         'buttonAction',
                    params:     [
                        value
                    ]
                }
            );
        };
    }]);