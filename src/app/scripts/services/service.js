(function () {
	'use strict';

	angular.module('fs-angular-upload', ['fs-angular-dock', 'fs-angular-date', 'fs-angular-format'])
		.provider('fsUpload', function () {

			var provider = this;

			provider.onloadstart = null;

			this.$get = function ($rootScope, fsFormat, fsDate, $timeout, fsDock, $http, $templateCache) {

				var XMLHttpRequestOpenProxy = window.XMLHttpRequest.prototype.open,
					XMLHttpRequestSendProxy = window.XMLHttpRequest.prototype.send,
					processes = [],
					status = { uploading: 0, completed: 0, error: 0, processing: 0 },
					scope = $rootScope.$new(),
					events = {},
					dockShow = false,
					dockTemplate = '',
					service = {
						init: init,
						processes: processes,
						status: status,
						clear: clear,
						on: on
					};

				dockTemplate = $templateCache.get('views/directives/uploadstatus.html');
				if (!dockTemplate) {
					$http.get('views/directives/uploadstatus.html', { cache: $templateCache })
						.then(function (result) {
							dockTemplate = result.data;
						});
				}

				function clear(index = null) {
					if (index === null) {
						processes.splice(0);
					} else {
						processes.splice(index, 1);
					}
					update();
				}

				function on(event, func) {
					if (!events[event]) {
						events[event] = [];
					}
					events[event].push(func);
				}

				function update() {
					status.uploading = 0;
					status.completed = 0;
					status.processing = 0;
					status.error = 0;

					angular.forEach(processes, function (process) {
						var files = process.files.length;
						if (process.status == 'uploading')
							status.uploading += files;

						else if (process.status == 'completed')
							status.completed += files;

						else if (process.status == 'processing')
							status.processing += files;

						else if (process.status == 'error')
							status.error += files;
					});
				}

				function triggerEvent(event) {
					var items = events[event] || [];
					angular.forEach(items, function (func) {
						angular.bind(this, func, service.status)();
					});
				}

				function init() {

					on('uploading', updateMessage);
					on('completed', updateMessage);
					on('error', updateMessage);

					function autoClearProcess(process) {
						$timeout(function () {

							var idx = service.processes.indexOf(process);
							if (idx >= 0) {
								clear(idx);

								if (!service.processes.length) {
									fsDock.hide();
									dockShow = false;
								}
							}
						}, 5000);
					}

					function updateMessage(status) {

						if (status.uploading && !dockShow) {
							dockShow = true;
							// var title = '<span ng-if="status.uploading">Uploading&nbsp;{{status.uploading}}&nbsp;<ng-pluralize count="status.uploading" when="{ \'one\': \'file\', \'other\': \'files\' }"></ng-pluralize><span ng-if="status.processing">,&nbsp;</span></span>\
							// 		<span ng-if="status.processing">Processing&nbsp;{{status.processing}}&nbsp;<ng-pluralize count="status.processing" when="{ \'one\': \'file\', \'other\': \'files\' }"></ng-pluralize></span>\
							// 		<span ng-if="!status.uploading && !status.processing && status.completed">Uploaded&nbsp;{{status.completed}}&nbsp;<ng-pluralize count="status.completed" when="{ \'one\': \'file\', \'other\': \'files\' }"></ng-pluralize><span ng-if="!status.uploading && status.error">,</span></span>\
							// 		<span ng-if="!status.uploading && !status.processing && status.error">{{status.error}}&nbsp;<ng-pluralize count="status.error" when="{ \'one\': \'upload\', \'other\': \'uploads\' }"></ng-pluralize>&nbsp;failed</span>';

							fsDock.show(
								{
									template: dockTemplate,
									title: ' ',
									anchor: 'right',
									class: 'fs-upload',
									controller: ['$scope', 'processes', 'status', function ($scope, processes, status) {
										$scope.processes = processes;
										$scope.status = status;

										$scope.hide = function () {
											fsDock.hide();
											dockShow = false;
											angular.forEach($scope.processes, function (process) {
												if (process.status != 'uploading') {
													var index = $scope.processes.indexOf(process);
													if (index >= 0) {
														$scope.processes.splice(index);
													}
												}
											});
										}
									}],
									resolve: {
										status: function () {
											return status;
										},
										processes: function () {
											return processes;
										}
									}
								});
						}
					}

					window.XMLHttpRequest.prototype.open = function (method, url) {

						if (method === 'POST') {

							var self = this,
								diffTime,
								diffSize,
								perSec;

							this.onreadystatechange = function (e) {

								if (self.process) {
									if (self.status >= 400) {
										self.process.status = 'error';
										self.process.message = self.statusText;
										autoClearProcess(self.process);
									} else {

										if (e.target.status > 400 || !e.target.status) {
											self.process.status = 'error';
											self.process.message = self.statusText;
											autoClearProcess(self.process);
										} else if (e.target.readyState == 4) {
											self.process.status = 'completed';
											self.process.message = '';
											autoClearProcess(self.process);
										}
									}
									update();
								}
							}

							this.upload.onprogress = function (e) {
								if (self.process && e.lengthComputable) {

									diffSize = e.loaded - (self.loaded || 0);
									diffTime = self.lastLoaded ? (Date.now() / 1000) - (self.lastLoaded / 1000) : 0;
									perSec = diffTime ? diffSize / diffTime : 0;

									self.loaded = e.loaded;
									self.lastLoaded = Date.now();
									self.process.percent = Math.round((e.loaded / e.total) * 100);
									self.process.loaded = fsFormat.bytes(e.loaded);
									self.process.total = fsFormat.bytes(e.total);
									self.process.estimated = fsDate.duration(Math.round(perSec ? ((e.total - e.loaded) / perSec) : 0), { abr: false });
								}
							}

							this.upload.onloadstart = function () {
								if (self.process) {
									scope.opened = true;
									self.process.status = 'uploading';
									update();
									triggerEvent('uploading');
								}
							}

							this.upload.onloadend = function (e) {
								if (self.process) {
									if (self.process.status != 'error') {
										self.process.status = 'processing';
									}
									update();
									if (self.process.status == 'processing') {
										triggerEvent('processing');
									}
								}
							}

							this.upload.onerror = function (e) {
								if (self.process) {
									self.process.status = 'error';
									self.process.message = 'Failed to upload';
									update();
									triggerEvent('error');
								}
							}
						}

						return XMLHttpRequestOpenProxy.apply(this, [].slice.call(arguments));
					}

					XMLHttpRequest.prototype.send = function (formData) {

						if (formData instanceof FormData) {

							var fsUpload = true;
							var files = [];
							for (var value of formData.values()) {
								if (value instanceof File) {
									files.push({ name: value.name });
								}
							}

							for (var value of formData.values()) {
								if (name == 'fsUpload' && (!value || value === 'false')) {
									fsUpload = false;
								}
							}

							if (fsUpload && files.length) {
								this.process = { status: 'pending', percent: 0, files: files };
								processes.push(this.process);
							}
						}

						return XMLHttpRequestSendProxy.apply(this, [].slice.call(arguments));
					}
				}

				return service;

			}
		});
})();
