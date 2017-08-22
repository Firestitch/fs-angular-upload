'use strict';


angular.module('app')
  .controller('DemoCtrl', function ($scope, Upload, fsUpload) {


	$scope.status = fsUpload.status;
	$scope.processes = fsUpload.processes;

    $scope.upload = function (files,fail,sleep) {
    	if(!files.length)
    		return;

    	angular.forEach(files,function(file,index) {

	    	var data = { asd: 'asdasdasd', asdss: 'asdasdasd' };

	    	if(fail) {
	    		data.exception = 'Failed exception message';
	    		data.state ='fail';
	    	}

	    	if(sleep) {
	    		data.sleep = sleep;
	    	}

    		data[file + '_' + index] = file;


	        Upload.upload({
	            url: 'http://boilerplate.local.firestitch.com/api/dummy/upload',
	            data: data
	        }).then(function (resp) {
	            //console.log('Success ' + resp.config.data.file.name + 'uploaded. Response: ' + resp.data);
	        }, function (resp) {
	            //console.log('Error status: ' + resp.status);
	        }, function (evt) {
	            //var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
	            //console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
	        });
	    });
	};
});
