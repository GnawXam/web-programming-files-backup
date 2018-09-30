cs142App.controller('DeleteAccountController', ['$scope', '$mdDialog', '$resource',
function($scope, $mdDialog, $resource) {

  $scope.hide = function() {
    $mdDialog.hide();
  };
  $scope.cancel = function() {
    $mdDialog.cancel();
  };
  $scope.submit = function() {
    // do delete work here
    console.log("deciding to delete");

    // logout routine
    var deleteResource = $resource('/deleteAccount');
    deleteResource.save({}, function () {
      console.log("user deleted");
    });

    $mdDialog.hide();
  };
}]);
