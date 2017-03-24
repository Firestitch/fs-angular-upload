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


        this.$get = function ($compile,$rootScope,fsFormat,fsDate) {


			var XMLHttpRequestOpenProxy = window.XMLHttpRequest.prototype.open;
			var XMLHttpRequestSendProxy = window.XMLHttpRequest.prototype.send;
			var FormDataProxy = window.FormData.prototype.append;
			var processes = [];
			var status = { uploading: 0, completed: 0, error: 0 };
			var scope = $rootScope.$new();
			var fsUploadStatus = null;
            var service = {
            	init: init,
            	processes: processes,
            	status: status,
            	clear: clear
            };

            function clear() {
            	processes.splice(0);
            	update();
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

            function init() {
				window.XMLHttpRequest.prototype.open = function(method,url) {

					if(method==='POST') {
						var self = this,
							diffTime,
							diffSize,
							perSec;
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

								if(!fsUploadStatus) {
									fsUploadStatus = angular.element('<fs-upload-status>');
									angular.element(document.body).append(fsUploadStatus);
									$compile(fsUploadStatus)(scope);
								}
							}
						}

						this.upload.onloadend = function (e) {
						    if(self.process) {
						    	if(self.process.status!='error') {
						    		self.process.status = 'completed';
						    	}
						    	update();
							}
						}

						this.upload.onerror = function (e) {
						    if(self.process) {
						    	self.process.status = 'error';
						    	update();
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
