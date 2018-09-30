'use strict';

cs142App.controller('UserListController', ['$scope', '$location', '$resource', '$rootScope',
  function ($scope, $location, $resource, $rootScope) {
    $scope.main.title = 'Users';
    $scope.photosBubble = 'test';
    $scope.commentsBubble = 'test';

    var resourceObj = $resource('/user/list');

    resourceObj.query("/user/list", function (users) {
      $scope.users = users;
    });

    var resourceObjAdvFeat = $resource('/userAdvFeat');
    resourceObjAdvFeat.query("/userAdvFeat", function (userAdvFeat) {
      $scope.usersAdv = userAdvFeat;
    });

    $scope.clickedOnUser = function (id) {
      $location.path('/users/' + id);
    };

    $scope.clickedOnCommentsBubble = function(user) {
      $location.path('/comments/' + user._id + '/' + user.first_name + '/' + user.last_name);
      // $event.stopPropagation();
    };

    $rootScope.$on('NewComment', function(event, next, current){
      var resourceObjAdvFeat = $resource('/userAdvFeat');
      resourceObjAdvFeat.query("/userAdvFeat", function (userAdvFeat) {
        $scope.usersAdv = userAdvFeat;
      });
    });
}]);
