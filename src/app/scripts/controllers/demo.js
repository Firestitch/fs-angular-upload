'use strict';


angular.module('app')
  .controller('DemoCtrl', function ($scope,Upload) {

    $scope.upload = function (files) {
    	if(!files)
    		return;

    	var data = {};
    	angular.forEach(files,function(file,index) {
    		data[file + '_' + index] = file;
    	});


        Upload.upload({
            url: 'http://service.local.firestitch.com/api/dummy',
            data: data
        }).then(function (resp) {
            //console.log('Success ' + resp.config.data.file.name + 'uploaded. Response: ' + resp.data);
        }, function (resp) {
            //console.log('Error status: ' + resp.status);
        }, function (evt) {
            //var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
            //console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
        });
    };
});
