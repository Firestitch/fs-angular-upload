
(function () {
    'use strict';

    angular.module('fs-angular-upload',['fs-angular-format','fs-angular-date'])
    .directive('fsUploadStatus', function($location,fsUpload,$timeout) {
        return {
            templateUrl: 'views/directives/uploadstatus.html',
            restrict: 'E',
            controller: function($scope) {

            	$scope.opened = false;
            	$scope.status = fsUpload.status;
            	$scope.processes = fsUpload.processes;

            	fsUpload.on('uploading',updateMessage);
            	fsUpload.on('completed',updateMessage);
				fsUpload.on('error',updateMessage);

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
            		},22215 * 1000);
            	}

            	function updateMessage(status) {

            		if(status.uploading) {
            			$scope.opened = true;
            		}

            		autoClose();

            		//$scope.$apply();

        			/*if(status.uploading) {
        				$scope.status.uploading += status.uploading;
        			}

        			if(status.completed) {
        				$scope.status.completed += status.completed;
        				$scope.status.uploading -= status.completed;
        			}

        			if(status.error) {
        				$scope.status.error += status.error;
        				$scope.status.uploading -= status.error;
        			}

        			*/
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



(function () {
    'use strict';

    angular.module('fs-angular-upload')
    .provider('fsUpload', function () {

    	var provider = this;

    	provider.onloadstart = null;

        this.$get = function ($compile,$rootScope,fsFormat,fsDate,$timeout) {

			var XMLHttpRequestOpenProxy = window.XMLHttpRequest.prototype.open,
				XMLHttpRequestSendProxy = window.XMLHttpRequest.prototype.send,
				FormDataProxy = window.FormData.prototype.append,
				processes = [],
				status = { uploading: 0, completed: 0, error: 0, completed: 0 },
				scope = $rootScope.$new(),
				fsUploadStatus = null,
				events = {},
				service = {
	            	init: init,
	            	processes: processes,
	            	status: status,
	            	clear: clear,
	            	on: on
	            };

            function clear() {
            	processes.splice(0);
            	update();
            }

            function on(event,func) {
            	if(!events[event]) {
            		events[event] = [];
            	}
            	events[event].push(func);
            }

            function update() {
            	status.uploading = 0;
            	status.completed = 0;
            	status.processing = 0;
            	status.error = 0;

            	angular.forEach(processes,function(process) {
            		var files = process.files.length;
            		if(process.status=='uploading')
            			status.uploading += files;

            		else if(process.status=='completed')
            			status.completed += files;

            		else if(process.status=='processing')
            			status.processing += files;

            		else if(process.status=='error')
            			status.error += files;
            	});
            }

            function triggerEvent(event) {
            	var items = events[event] || [];
            	angular.forEach(items,function(func) {
            		angular.bind(this,func,status)();
            	});
            }

            function init() {

				if(!fsUploadStatus) {
					fsUploadStatus = angular.element('<fs-upload-status>');
					angular.element(document.body).append(fsUploadStatus);
				}

				window.XMLHttpRequest.prototype.open = function(method,url) {

					if(method==='POST') {

						var self = this,
							diffTime,
							diffSize,
							perSec;

						this.onreadystatechange = function(e) {

							if(self.process) {
								if(self.status>=400) {
						    		self.process.status = 'error';
						    		self.process.message = self.statusText;
						    	} else {
						    		if(e.target.status>400 || !e.target.status) {
						    			self.process.status = 'error';
						    			self.process.message = self.statusText;
						    		} else if(e.target.readyState==4) {
						    			self.process.status = 'completed';
						    			self.process.message = '';
						    		}
						    	}
						    	update();
							}
						}

						this.upload.onprogress = function (e) {
							 if(self.process && e.lengthComputable) {

					    		diffSize = e.loaded - (self.loaded || 0);
					    		diffTime = self.lastLoaded ? (Date.now()/1000) - (self.lastLoaded/1000) : 0;
					    		perSec = diffTime ? diffSize/diffTime : 0;

						    	self.loaded = e.loaded;
						    	self.lastLoaded = Date.now();
						        self.process.percent = Math.round((e.loaded/e.total) * 100);
						        self.process.loaded = fsFormat.bytes(e.loaded);
						        self.process.total = fsFormat.bytes(e.total);
						        self.process.estimated = fsDate.duration(Math.round(perSec ? ((e.total - e.loaded)/perSec) : 0),{ abr: false });
						    }
						}

						this.upload.onload = function(e) {

						}

						this.upload.onloadstart = function() {
							if(self.process) {
								scope.opened = true;
								self.process.status = 'uploading';
								update();
								triggerEvent('uploading');
							}
						}

						this.upload.onloadend = function (e) {
							if(self.process) {
						    	if(self.process.status!='error') {
						    		self.process.status = 'processing';
						    	}
						    	update();
						    	if(self.process.status=='processing') {
						    		triggerEvent('processing');
						    	}
							}
						}

						this.upload.onerror = function (e) {
						    if(self.process) {
						    	self.process.status = 'error';
						    	self.process.message = 'Failed to upload';
						    	update();
						    	triggerEvent('error');
							}
						}

						this.upload.onabort = function (e) {
							debugger;
						}
					}

					return XMLHttpRequestOpenProxy.apply(this, [].slice.call(arguments));
				}

				XMLHttpRequest.prototype.send = function(formData) {

					if(formData && formData.files && formData.files.length) {
						this.process = { status: 'pending', percent: 0, files: formData.files };
						processes.push(this.process);
					}

					return XMLHttpRequestSendProxy.apply(this, [].slice.call(arguments));
				}

				FormData.prototype.append = function(name,file,filename) {
					if(!this.files) {
						this.files = [];
					}

					if(file instanceof File) {
						this.files.push(file);
					}

					return FormDataProxy.apply(this, [].slice.call(arguments));
				}
            }

            return service;

        }
    });
})();

angular.module('fs-angular-upload').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('views/directives/uploadstatus.html',
    "<div class=\"dialog\" ng-show=\"opened\"><div class=\"header\" layout=\"row\" layout-align=\"start center\"><div flex><span ng-if=\"status.uploading\">Uploading&nbsp;{{status.uploading}}&nbsp;<ng-pluralize count=\"status.uploading\" when=\"{ 'one': 'file', 'other': 'files' }\"></ng-pluralize></span> <span ng-if=\"status.processing\">Processing&nbsp;{{status.processing}}&nbsp;<ng-pluralize count=\"status.processing\" when=\"{ 'one': 'file', 'other': 'files' }\"></ng-pluralize></span> <span ng-if=\"!status.uploading && !status.processing && status.completed\">Uploaded&nbsp;{{status.completed}}&nbsp;<ng-pluralize count=\"status.completed\" when=\"{ 'one': 'file', 'other': 'files' }\"></ng-pluralize><span ng-if=\"!status.uploading && status.error\">,</span></span> <span ng-if=\"!status.uploading && !status.processing && status.error\">{{status.error}}&nbsp;<ng-pluralize count=\"status.error\" when=\"{ 'one': 'upload', 'other': 'uploads' }\"></ng-pluralize>&nbsp;failed</span></div><a href ng-click=\"close()\"><md-icon>clear</md-icon></a></div><div class=\"files\"><table><tbody class=\"process\" ng-repeat=\"process in processes\"><tr ng-repeat=\"file in process.files\"><td class=\"file\" ng-class=\"{ error: process.status=='error', 'has-message': !!process.message }\"><div class=\"wrap\"><div class=\"file-name\">{{file.name}}</div><div class=\"error-message\" ng-if=\"process.message\">{{process.message}}</div><div class=\"more\"><div ng-if=\"process.status=='uploading'\">{{process.loaded}}/{{process.total}}, {{process.estimated}} left</div><div ng-if=\"process.status=='processing'\">Processing...</div></div></div></td><td class=\"status\"><md-icon class=\"completed\" ng-if=\"process.status=='completed'\">check_circle</md-icon><md-icon class=\"error\" ng-if=\"process.status=='error'\">error</md-icon><md-tooltip ng-if=\"process.status=='uploading' || process.status=='processing'\"><span ng-if=\"process.status=='processing'\">Processing</span> <span ng-if=\"process.status=='uploading'\">Uploading</span></md-tooltip><md-progress-circular ng-if=\"process.status=='uploading'\" md-mode=\"determinate\" value=\"{{process.percent}}\" md-diameter=\"24\"></md-progress-circular><md-progress-circular ng-if=\"process.status=='processing'\" md-mode=\"indeterminate\" md-diameter=\"24\"></md-progress-circular></td></tr></tbody></table></div></div>"
  );

}]);
