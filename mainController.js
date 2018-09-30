'use strict';

var cs142App = angular.module('cs142App', ['ngRoute', 'ngMaterial', 'ngResource', 'ngMessages', 'mentio']);

cs142App.config(['$routeProvider', '$locationProvider',
    function ($routeProvider, $locationProvider) {
        $routeProvider.
            when('/users', {
                templateUrl: 'components/user-list/user-listTemplate.html',
                controller: 'UserListController'
            }).
            when('/users/:userId', {
                templateUrl: 'components/user-detail/user-detailTemplate.html',
                controller: 'UserDetailController'
            }).
            // added photoId? for advanced features
            when('/photos/:userId/:photoId?', {
                templateUrl: 'components/user-photos/user-photosTemplate.html',
                controller: 'UserPhotosController'
            }).
            // for showing list of comments
            when('/comments/:userId/:userFirstName/:userLastName', {
                templateUrl: 'components/user-comments/user-commentsTemplate.html',
                controller: 'UserCommentsController'
            }).
            // login page
            when('/login-register', {
                templateUrl: 'components/login-register/login-registerTemplate.html',
                controller: 'LoginRegisterController'
            }).
            // login page
            when('/favorites', {
                templateUrl: 'components/favorites/favoritesTemplate.html',
                controller: 'FavoritesController'
            }).
            otherwise({
                redirectTo: '/users'
            });
    }]);

cs142App.service('sharedProperties', function () {
  var enableAdvancedFeature = false;

  return {
    getProperty: function () {
      return enableAdvancedFeature;
    },
    setProperty: function(value) {
      enableAdvancedFeature = value;
    }
  };
});

cs142App.controller('MainController', ['$scope', '$location', 'sharedProperties', '$resource', '$rootScope', '$mdDialog', '$window',
    function ($scope, $location, sharedProperties, $resource, $rootScope, $mdDialog, $window) {
        $scope.main = {};
        $scope.main.title = '';
        $scope.main.enableAdvancedFeature = sharedProperties.getProperty();
        var testResource = $resource('/test/info');
        testResource.get({}, function(ver){
          $scope.main.version = ver.version;
        });
        var advFeatOn = $location.search().adv;

        /* project 7 */
        if($window.sessionStorage.getItem('isLoggedIn') === 'true'){
          $scope.main.title = 'Users';
          $scope.main.isLoggedIn = true;
          $scope.main.user_first_name = $window.sessionStorage.getItem('user_first_name');
          $scope.main.userId = $window.sessionStorage.getItem('userId');
          // var loginResource = $resource('/admin/login');
          // var response = loginResource.save({ 'login_name': $window.sessionStorage.getItem('login_name'), 'password': $window.sessionStorage.getItem('password') }, function () {});
        } else {
          $scope.main.title = 'Login page';
          $scope.main.isLoggedIn = false;
          $scope.main.user_first_name = '';
          $scope.main.userId = '';
        }

        $rootScope.$on( "$routeChangeStart", function(event, next, current) {
          if (!$scope.main.isLoggedIn) {
            // no logged user, redirect to /login-register unless already there
            if (next.templateUrl !== "components/login-register/login-registerTemplate.html") {
                $location.path("/login-register");
            }
          }
        });

        $scope.main.logout = function () {
          var logoutResource = $resource('/admin/logout');
          logoutResource.save({}, function () {
            $scope.main.isLoggedIn = false;
            $scope.main.title = 'Login page';
            $window.sessionStorage.clear();
            $location.path('/login-register');
          });
        };

        $scope.main.addPhotoDialog = function(evt) {
          $mdDialog.show({
            controller: 'AddPhotoController',
            templateUrl: '/components/add-photo/add-photoDialogTemplate.html',
            parent: angular.element(document.body),
            targetEvent: evt,
            clickOutsideToClose:true,
            fullscreen: false
          });
        };

        $scope.main.goToFavorites = function(evt) {
          $location.path('/favorites');
        };

        $scope.main.deleteAccount = function(evt) {
          $mdDialog.show({
            controller: 'DeleteAccountController',
            templateUrl: '/components/delete-account/delete-accountTemplate.html',
            parent: angular.element(document.body),
            targetEvent: evt,
            clickOutsideToClose:true,
            fullscreen: false
          })
          .then(function(){

            

            // logout routine
            var logoutResource = $resource('/admin/logout');
            logoutResource.save({}, function () {
              $scope.main.isLoggedIn = false;
              $scope.main.title = 'Login page';
              $window.sessionStorage.clear();
              $location.path('/login-register');
            });

          }, function(){
            // md dialog cancels
          });
        };

        // initialize advanced feature to 0 if it was not set
        // if set in url, set checkbox to match
        if(!advFeatOn){
          var pathNow = $location.path();
          $location.path(pathNow).search({adv: 0});
        } else {
          advFeatOn = Number(advFeatOn);
          // feature not turend on but box is checked
          if(advFeatOn === 0 && $scope.main.enableAdvancedFeature){
            $scope.main.enableAdvancedFeature = false;
          }
          if(advFeatOn === 1 && !$scope.main.enableAdvancedFeature){
            $scope.main.enableAdvancedFeature = true;
          }
        }

        // for having correct url when we toggle advanced features checkbox
        $scope.advFeatToggle = function() {
          var advFeatOn = Number($location.search().adv);
          var pathNow = $location.path();
          if($scope.main.enableAdvancedFeature && advFeatOn === 0){
            $location.path(pathNow).search({adv: 1});
          }
          if(!$scope.main.enableAdvancedFeature && advFeatOn === 1){
            $location.path(pathNow).search({adv: 0});
          }
        };




        $scope.FetchModel = function(url, doneCallback) {
          // GET request
          var xhr = new XMLHttpRequest();

          xhr.onreadystatechange = function () {
            // error checking
            if(xhr.readyState !== XMLHttpRequest.DONE || xhr.status !== 200) {
              console.log(xhr.responseText);
              return;
            }

            // no errors, parse response
            var response = JSON.parse(xhr.response);

            // call callback
            doneCallback(response);
          };

          xhr.open("GET", url);
          xhr.send();
        };
    }]);
