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

						this.upload.onabort = function (e) {}
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
