'use strict';

cs142App.controller('UserCommentsController', ['$scope', '$routeParams', '$location', 'sharedProperties', '$resource',
  function($scope, $routeParams, $location, sharedProperties, $resource) {
    /*
     * Since the route is specified as '/comments/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
    var userId = $routeParams.userId;
    $scope.user = {};
    $scope.user.first_name = $routeParams.userFirstName;
    $scope.user.last_name = $routeParams.userLastName;
    $scope.userId = userId;
    $scope.$location = $location;
    $scope.commentsList = {};

    /* user */
    var urlStr = "/commentsOfUser/" + userId ;
    var getUserResource = $resource(urlStr);

    getUserResource.query({urlStr}, function(model){
      $scope.commentsList = model;
    });
}]);
