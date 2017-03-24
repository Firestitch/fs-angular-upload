(function () {
    'use strict';

    angular.module('fs-angular-upload',['fs-angular-format','fs-angular-date'])
    .directive('fsUploadStatus', function($location,fsUpload) {
        return {
            templateUrl: 'views/directives/uploadstatus.html',
            restrict: 'E',
            controller: function($scope) {
            	$scope.opened = true;
            	$scope.processes = fsUpload.processes;
            	$scope.status = fsUpload.status;

            	$scope.close = function() {
            		$scope.opened = false;
            		fsUpload.clear();
            	}

            	var watch = $scope.$watchCollection('status',function(status) {
            		if(status.uploading) {
				        $scope.message = 'Uploading ' + status.uploading + (status.uploading===1 ? ' Item' : ' Items');
            		} else if(status.completed) {
            			$scope.message = 'Uploaded ' + status.completed + (status.completed===1 ? ' Item' : ' Items');
            		}
            	});
            }
        };
    })
    .filter('fsUploadStatusFilter', function($filter) {

        return function(processes, status) {
            var list = [];
            angular.forEach(processes,function(process) {
                if(process.status==status) {
                    list.push(process);
                }
            });

            return list;
        }
    })

})();


