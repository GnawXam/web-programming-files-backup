'use strict';
// ???
cs142App.controller('AddPhotoController', ['$scope', '$mdDialog', '$http', '$rootScope', '$window',
function AddPhotoController($scope, $mdDialog, $http, $rootScope, $window){
  var selectedPhotoFile;   // Holds the last file selected by the user

  // Called on file selection - we simply save a reference to the file in selectedPhotoFile
  $scope.inputFileNameChanged = function (element) {
      selectedPhotoFile = element.files[0];
  };

  // Has the user selected a file?
  $scope.inputFileNameSelected = function () {
      return !!selectedPhotoFile;
  };

  // Upload the photo file selected by the user using a post request to the URL /photos/new
  $scope.uploadPhoto = function () {
      if (!$scope.inputFileNameSelected()) {
          console.error("uploadPhoto called with no selected file");
          return;
      }

      $mdDialog.hide();

      // Create a DOM form and add the file to it under the name uploadedphoto
      var domForm = new FormData();
      domForm.append('uploadedphoto', selectedPhotoFile);

      // Using $http to POST the form
      $http.post('/photos/new', domForm, {
          transformRequest: angular.identity,
          headers: {'Content-Type': undefined}
      }).then(function successCallback(response){
          // The photo was successfully uploaded. XXX - Do whatever you want on success.
          $window.alert("Photo uploaded!");
      }, function errorCallback(response){
          // Couldn't upload the photo. XXX  - Do whatever you want on failure.
          console.error('ERROR uploading photo', response);
      });

  };

  $scope.hide = function() {
    $mdDialog.hide();
  };
  $scope.cancel = function() {
    $mdDialog.cancel();
  };

}]);
