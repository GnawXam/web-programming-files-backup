'use strict';

cs142App.controller('UserDetailController', ['$scope', '$routeParams', '$location', '$resource',
  function ($scope, $routeParams, $location, $resource) {
    /*
     * Since the route is specified as '/users/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */

    var userId = $routeParams.userId;
    var urlStr = "/user/" + userId;
    $scope.userMentionsList = [];

    var resourceObj = $resource(urlStr);
    resourceObj.get({}, function(model){
      $scope.user = model;
      $scope.main.title = $scope.user.first_name + " " + $scope.user.last_name;
    });

    $scope.toPhotos = function (id) {
      $location.path('/photos/' + id + '/0/');
    };

    var mentionsResource = $resource("/getUserMentionsList/" + userId);
    mentionsResource.query({}, function(model){
      $scope.userMentionsList = model;
    });

    var mostRecentPhotoResource = $resource("/mostRecentPhoto/" + userId);
    mostRecentPhotoResource.get({}, function(photo){
      $scope.recentPhoto = photo;
      console.log("Recent photo ", photo);
    });

    var mostCommentedPhotoResource = $resource("/mostCommentedPhoto/" + userId);
    mostCommentedPhotoResource.get({}, function(photo){
      $scope.mostCommentedPhoto = photo;
      console.log("mostCommentedPhoto ", photo);

    });

}]);
