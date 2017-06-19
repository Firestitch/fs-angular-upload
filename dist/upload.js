
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



(function () {
    'use strict';

    angular.module('fs-angular-upload')
    .provider('fsUpload', function () {

    	var provider = this;

    	provider.onloadstart = null


/*        var provider = this;

        this._options = {   url: null,
                            data: {},
                            events: {
                                begin: null
                            }};

        this.options = function(options) {

            if(!arguments.length)
                return this._options;

            this._options = angular.merge({},this._options,options);
        }

        this.option = function(name, value) {

             if(arguments.length==1)
                return this._options[arguments[0]];

            this._options[name] = value;
        }*/


        this.$get = function ($compile,$rootScope,fsFormat,fsDate,$timeout) {

			var XMLHttpRequestOpenProxy = window.XMLHttpRequest.prototype.open,
				XMLHttpRequestSendProxy = window.XMLHttpRequest.prototype.send,
				FormDataProxy = window.FormData.prototype.append,
				processes = [],
				status = { uploading: 0, completed: 0, error: 0 },
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
            	status.error = 0;

            	angular.forEach(processes,function(process) {
            		var files = process.files.length;
            		if(process.status=='uploading')
            			status.uploading += files;
            		else if(process.status=='completed')
            			status.completed += files;
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

						this.onreadystatechange = function (e) {
							if(self.process) {
								if(self.status>=400) {
						    		self.process.status = 'error';
						    		self.process.message = self.statusText;
						    		update();
						    	}
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
						        self.process.speed = fsFormat.bytes(perSec);
						        self.process.estimated = fsDate.duration(Math.round(perSec ? ((e.total - e.loaded)/perSec) : 0),{ abr: false });
						    }
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
						    		self.process.status = 'completed';
						    	}
						    	update();
						    	if(self.process.status=='completed') {
						    		triggerEvent('completed');
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
    "<div class=\"dialog\" ng-show=\"opened\"><div class=\"header\" layout=\"row\" layout-align=\"start center\"><div flex>{{message}}</div><a href ng-click=\"close()\"><md-icon>clear</md-icon></a></div><div class=\"files\"><table><tbody class=\"process\" ng-repeat=\"process in processes\"><tr ng-repeat=\"file in process.files\"><td class=\"file\" ng-class=\"{ error: process.status=='error', 'has-message': !!process.message }\"><span class=\"file-name\">{{file.name}}</span> <span class=\"error-message\">{{process.message}}</span></td><td class=\"status\"><md-icon class=\"completed\" ng-show=\"process.status=='completed'\">check_circle</md-icon><md-icon class=\"error\" ng-show=\"process.status=='error'\">error</md-icon><md-tooltip ng-show=\"process.message && (process.status=='error' || process.status=='uploading')\"><span ng-show=\"process.status=='error'\">{{process.message}}</span> <span ng-show=\"process.status=='uploading'\">{{process.estimated}} remaining</span></md-tooltip><md-progress-circular ng-show=\"process.status=='uploading'\" md-mode=\"determinate\" value=\"{{process.percent}}\" md-diameter=\"24\"></md-progress-circular></td></tr></tbody></table></div></div>"
  );

}]);
