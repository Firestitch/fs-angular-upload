(function () {
    'use strict';

    angular.module('fs-angular-upload',['fs-angular-format','fs-angular-date'])
    .directive('fsUploadStatus', function($location,fsUpload,$timeout) {
        return {
            templateUrl: 'views/directives/uploadstatus.html',
            restrict: 'E',
            controller: function($scope) {

            	$scope.opened = false;
            	$scope.processes = fsUpload.processes;

            	fsUpload.on('uploading',updateMessage);
            	fsUpload.on('completed',updateMessage);

            	$scope.close = function() {
            		$scope.opened = false;
            		angular.forEach($scope.processes,function(process) {
            			if(process.status!='uploading') {
				    		var index = $scope.processes.indexOf(process);
				    		if(index>=0) {
				    			$scope.processes.splice(index);
				    		}
            			}
            		});
            	}

            	$scope.showMessage = function(process) {

            		if(!process.message) {
            			return;
            		}

            		process.preview = !process.preview;
            	}

            	var autoCloseTimeout;
            	function autoClose() {
            		$timeout.cancel(autoCloseTimeout);
            		autoCloseTimeout = $timeout(function() {
            			if($scope.status.uploading) {
            				return autoClose();
            			}
            			$scope.close();
            		},15000);
            	}

            	function updateMessage(status) {

            		if(status.uploading) {
            			$scope.opened = true;
            		}

            		autoClose();
            		if(status.uploading) {
				        $scope.message = 'Uploading ' + status.uploading + (status.uploading===1 ? ' File' : ' Files');
            		} else if(status.completed) {
            			$scope.message = 'Uploaded ' + status.completed + (status.completed===1 ? ' File' : ' Files');
            		}
            	}
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


