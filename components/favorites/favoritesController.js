'use strict';


cs142App.controller('EnlargePhotoController', ['$scope', '$mdDialog', '$resource', 'dataToPass',
function($scope, $mdDialog, $resource, dataToPass) {
  $scope.hide = function() {
    $mdDialog.hide();
  };
  $scope.cancel = function() {
    $mdDialog.cancel();
  };

  var passedData = dataToPass;
  $scope.date_time = passedData.date_time;
  $scope.file_name = passedData.file_name;

}]);

cs142App.controller('FavoritesController', ['$scope', '$routeParams', '$location', 'sharedProperties', '$resource', '$rootScope', '$window', '$mdDialog',
  function($scope, $routeParams, $location, sharedProperties, $resource, $rootScope, $window, $mdDialog) {

    $scope.userId = $window.sessionStorage.getItem('userId');
    $scope.userFavPhotos = {};
    /* user */

    var getResource = $resource("/getFavPhotosOfUser");
    getResource.query({}, function(model){
      $scope.userFavPhotos = model;
    });

    $scope.favPhotoClick = function(photoID){
      console.log('clicked');
      // find out if we clicked favorite or unfavorite
      // $scope.buttonColor = {"background-color": "yellow" };
      var resource = $resource('/UpdateFavPhotosOfUser/' + photoID);

      resource.save({},
        // after saving, call this to load the photos again to show the latest comments
        function () {
          var resourceUserFavPhotos = $resource('/getFavPhotosOfUser');
          resourceUserFavPhotos.query({}, function(model){
            $scope.userFavPhotos = model;
          });
        });
      };

    $scope.buttonColor = function(photoID){
      for(var i = 0; i < $scope.userFavPhotos.length; i++){
        var favPhoto = $scope.userFavPhotos[i];
        if(String(favPhoto._id) === String(photoID)){
          return {"background-color": "yellow"};
        }
      }
      return {"background-color": "silver"};
    };

    $scope.enlargePhoto = function(evt, file_name, date_time){
      $mdDialog.show({
        locals:{dataToPass: {file_name, date_time}},
        controller: 'EnlargePhotoController',
        templateUrl: '/components/favorites/favorites-enlargeTemplate.html',
        parent: angular.element(document.body),
        targetEvent: evt,
        clickOutsideToClose:true,
        fullscreen: false
      })
      .then(function(comment){
        // after md dialog successfully finishes
      }, function(){
        // md dialog cancels
      });
    };





}]);
