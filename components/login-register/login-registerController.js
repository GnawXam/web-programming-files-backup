'use strict';

cs142App.controller('LoginRegisterController', ['$scope', '$routeParams', '$location', 'sharedProperties', '$resource', '$rootScope', '$window',
  function($scope, $routeParams, $location, sharedProperties, $resource, $rootScope, $window) {

    $scope.login = function (login, password) {
      var loginResource = $resource('/admin/login');
      var response = loginResource.save({ 'login_name': login, 'password': password }, function () {
        $scope.main.isLoggedIn = true;
        $scope.main.user_first_name = response.first_name;
        $scope.main.userId = response._id;

        // extra credit
        $window.sessionStorage.setItem('isLoggedIn', true);
        $window.sessionStorage.setItem('user_first_name', response.first_name);
        $window.sessionStorage.setItem('userId', response._id);

        // $rootScope.$broadcast('LoggedInSuccess');
        $location.path('/users/' + response._id);
      }, function (err) {
        if(err.status === 400) {
          $scope.errmsg = "Incorrect combination of username and password, please try again.";
        }
      });
    };

    $scope.reg = {
      first_name: '',
      last_name: '',
      login_name: '',
      password: '',
      location: '',
      occupation: '',
      description: '',
    };

    $scope.usernameTaken = false;
    $scope.checkUniqueLogin = function (username) {
      if(!username) {
        $scope.usernameTaken = false;
        return;
      }
      var resource = $resource('/user/check/' + username);
      var response = resource.get({}, function () {
        $scope.usernameTaken = response.id !== null;
      }, function (err) {
        if(err.status === 400) {
          console.log("Error same login 0");
        }
      });
    };

    $scope.passwordValid = true;
    $scope.check_password = function (password) {
      $scope.registrationForm.confirmPassword.$setValidity('required', password !== '');
      $scope.passwordValid = password === $scope.reg.password;
    };

    $scope.registerAccount = function () {
      var resource = $resource('/user');
      var response = resource.save($scope.reg, function () {
        // $rootScope.$broadcast('NewUser'); // deprecated; used if we want to login a new user automatically

        $location.path('/users');
        $scope.reg = {};
        $scope.confirmPassword = '';
        $scope.registrationForm.$setUntouched();
        $scope.registrationForm.$setPristine();
        console.log($scope.registrationForm);
        $window.alert("Registration successful, please log in");
      }, function (err) {
        if(err.status === 400) {
          console.log("Error: registration invalid");
        }
      });
    };

}]);
