angular.module('Ultimirror')
    .controller('SchedulerCtrl', ['$rootScope', '$scope', function ($rootScope, $scope) {

        // respond to module event broadcasts
        $scope.$on('moduleEvent', function (e, data) {

            // make layouts drag-and-droppable onto the calendar
            if ((data.source === 'layoutmanager') && (data.event === 'layoutsRendered')) {
                var $$layoutItems = $('#layouts td.name');

                if ($$layoutItems.length > 0) {
                    $.each($$layoutItems, function () {
                        // store data so the calendar knows to render an event upon drop
                        $(this).data(
                            'event',
                            {
                                title: $.trim($(this).text()),
                                stick: true
                            }
                        );

                        // make the event draggable using jQuery UI
                        $(this).draggable(
                            {
                                zIndex:         999,
                                revert:         true,
                                revertDuration: 0
                            }
                        );
                    });
                }


                // broadcast that drag-and-drop is ready
                $rootScope.$broadcast(
                    'moduleEvent',
                    {
                        source: 'scheduler',
                        event:  'draggableReady'
                    }
                );
            }
        });


        // initialize the calendar
        $('#module_scheduler_calendar').fullCalendar(
            {
                defaultView:    'agendaWeek',
                firstDay:       1,
                header: {
                    left:       'prev,next today',
                    center:     'title',
                    right:      'agendaWeek,month'
                },
                editable:       true,
                droppable:      true,
                drop: function () {
                    // // is the "remove after drop" checkbox checked?
                    // if ($('#drop-remove').is(':checked')) {
                    //     // if so, remove the element from the "Draggable Events" list
                    //     $(this).remove();
                    // }
                }
            }
        );

    }]);