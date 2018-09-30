'use strict';



cs142App.controller('AddCommentDialogController', ['$scope', '$mdDialog', '$resource', 'mentioUtil',
function($scope, $mdDialog, $resource, mentioUtil) {
  $scope.comment = '';
  $scope.allMentions = [];

  $scope.hide = function() {
    $mdDialog.hide();
  };
  $scope.cancel = function() {
    $mdDialog.cancel();
  };
  $scope.submit = function(comment) {
    // problem: user typed two people of same name, but deletes one
    // both will remain because the name is found in the comment

    // loop through all saved names to ensure we're still mentioning them
    var finalMentions = [];
    for(var i = 0; i < $scope.allMentions.length; i++){
      var tempName = $scope.allMentions[i].label;
      if(comment.indexOf("@"+tempName) !== -1){
        // name found in comment, add it
        finalMentions.push($scope.allMentions[i]._id);
      }
    }
    $mdDialog.hide({comment: comment, finalMentions: finalMentions});
  };

  // get list of users for mentio
  $scope.topics = [];
  var resourceObj = $resource('/user/list');
  resourceObj.query("/user/list", function (users) {
    angular.forEach(users, function(user, index){
      console.log("here");
      var full_name = user.first_name + " " + user.last_name;
      $scope.topics.push({label: full_name, _id: user._id});
     });
  });

  // mentio functionality
  $scope.searchTopic = function(topicTerm) {
    console.log("Inside menu");
    var topicList = [];
    angular.forEach($scope.topics, function(item) {
      if (item.label.toUpperCase().indexOf(topicTerm.toUpperCase()) >= 0) {
        topicList.push(item);
      }
    });
    // empty will be called when we start changing the @topic
    $scope.foundTopics = topicList;
  };

  // function called after user selects a mention tag
  // label is full_name
  $scope.getTopicTextRaw = function(topic) {
    $scope.allMentions.push(topic);
    return '@' + topic.label;
  };



}]);

cs142App.controller('UserPhotosController', ['$scope', '$routeParams', '$location', 'sharedProperties', '$resource', '$mdDialog', '$rootScope','mentioUtil', '$anchorScroll', '$window',
  function($scope, $routeParams, $location, sharedProperties, $resource, $mdDialog, $rootScope, mentioUtil, $anchorScroll, $window) {
    /*
     * Since the route is specified as '/photos/:userId' in $routeProvider config the
     * $routeParams  should have the userId property set with the path from the URL.
     */
    var userId = $routeParams.userId;
    $scope.userId = userId;
    $scope.$location = $location;

    /* user */
    var urlStr = "/user/" + userId;
    var getUserResource = $resource(urlStr);
    getUserResource.get({}, function(model){
      var user = model;
      $scope.main.title = 'Photos of ' + user.first_name + " " + user.last_name;
    });

    /* photos of user */
    var urlPhotoStr = "/photosOfUser/" + userId;
    var getPhotosResource = $resource(urlPhotoStr);

    getPhotosResource.query(urlPhotoStr, function(model){
      $scope.photos = model;
      var photoId = Number($routeParams.photoId);

      if(!photoId || photoId < 0){
        $scope.photoIndex = 0;
      } else if (photoId >= $scope.photos.photoId){
        $scope.photoIndex = $scope.photos.length-1;
      } else {
        $scope.photoIndex = photoId;
      }

      if($scope.photoIndex !== undefined){
        var anchor = "anchor"+String($scope.photoIndex);
        $location.hash(anchor);
        $anchorScroll();
      }
    });

    $rootScope.$on('$routeChangeSuccess', function(newRoute, oldRoute) {
      if($location.hash()){

        if($scope.photoIndex !== undefined){
          $anchorScroll();
        }
      }
    });

    /*
     * adding comment
     */
    $scope.addComment = function(evt, photoId){
      $mdDialog.show({
        controller: 'AddCommentDialogController',
        templateUrl: '/components/user-photos/user-commentingTemplate.html',
        parent: angular.element(document.body),
        targetEvent: evt,
        clickOutsideToClose:true,
        fullscreen: false
      })
      .then(function(retObj){
        var resource = $resource('/commentsOfPhoto/' + photoId);
        resource.save({ saveObj: retObj },
          // after saving comment, call this to load the photos again to show the latest comments
          function () {
            var urlPhotoStr = "/photosOfUser/" + userId;
            var getPhotosResource = $resource(urlPhotoStr);

            getPhotosResource.query(urlPhotoStr, function(model){
              $scope.photos = model;
              var photoId = Number($routeParams.photoId);

              if(!photoId || photoId < 0){
                $scope.photoIndex = 0;
              } else if (photoId >= $scope.photos.photoId){
                $scope.photoIndex = $scope.photos.length-1;
              } else {
                $scope.photoIndex = photoId;
              }
              $rootScope.$broadcast('NewComment');
            });
          });
      }, function(){
        // md dialog cancels
      });
    };

    // user clicks button
    // callback gets called
    // need to update the button attached to this photo
      // mark photo's schema as favorited by? post requst
      // update user schema for which photos they like.. post request
    // need to add this photo to user's favorites and upload to server

    // post for click
    // get for color

    // user goes to favorites page
    // it gets user's list of favorite photos
    // it populates a list of favorte photo objects
    // html gets filled

    $scope.userFavPhotos = {};
    var resourceUserFavPhotos = $resource('/getFavPhotosOfUser');
    resourceUserFavPhotos.query({}, function(model){
      $scope.userFavPhotos = model;

      if($scope.photoIndex !== undefined){
        var anchor = "anchor"+String($scope.photoIndex);
        $location.hash(anchor);
        $anchorScroll();
      }
    });


    $scope.favPhotoClick = function(photoID){
      console.log('favorited');
      // find out if we clicked favorite or unfavorite
      // $scope.buttonColor = {"background-color": "yellow" };
      var resource = $resource('/UpdateFavPhotosOfUser/' + photoID);

      resource.save({},
        // after saving, call this to load the photos again to show the latest comments
        function () {
          console.log("favorite saved");
          // var resourceUserFavPhotos = $resource('/getFavPhotosOfUser');
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

    /*
     * LIKING
     */
    // photos: need to see who liked
    // users: need to see which photos he liked
    $scope.userLikePhotos = {};
    var resourceUserLikePhotos = $resource('/getLikePhotosOfUser');
    resourceUserLikePhotos.query({}, function(model){
      $scope.userLikePhotos = model;

      if($scope.photoIndex !== undefined){
        var anchor = "anchor"+String($scope.photoIndex);
        $location.hash(anchor);
        $anchorScroll();
      }
    });

    $scope.likePhotoClick = function(photoID){
      console.log('like clicked');
      // find out if we clicked liked or unliked
      // $scope.buttonColor = {"background-color": "yellow" };
      var resource = $resource('/UpdateLikePhotosOfUser/' + photoID);

      resource.save({},
        // after saving, call this to load the photos again to show the latest comments
        function () {
          console.log("like saved");
          var resourceUserLikePhotos = $resource('/getLikePhotosOfUser');
          resourceUserLikePhotos.query({}, function(model){
            $scope.userLikePhotos = model;
          });

          /* photos of user */
          var urlPhotoStr = "/photosOfUser/" + userId;
          var getPhotosResource = $resource(urlPhotoStr);

          getPhotosResource.query(urlPhotoStr, function(model){
            $scope.photos = model;

          });
        });
    };

    $scope.likeButtonColor = function(photoID){
      for(var i = 0; i < $scope.userLikePhotos.length; i++){
        var likePhoto = $scope.userLikePhotos[i];
        if(String(likePhoto._id) === String(photoID)){
          return {"background-color": "aqua"};
        }
      }
      return {"background-color": "silver"};
    };

    /*
     * Deleting photo
    */
    $scope.deletePhoto = function(photoID){
      var deletePhotoResource = $resource('/deletePhoto');
      var response = deletePhotoResource.save({photoID : photoID}, function () {
        // after saving
        // reload page

        var urlPhotoStr = "/photosOfUser/" + userId;
        var getPhotosResource = $resource(urlPhotoStr);

        getPhotosResource.query(urlPhotoStr, function(model){
          $scope.photos = model;
        });

        $window.alert("Photo deleted!");

      }, function(err){
        if(err.status === 400) {
          console.log("Error: Deleting photo unsuccessful");
        }
      });
    };
    /*
     * Deleting comment
    */
    $scope.deleteComment = function(photoID, commentObj){
      console.log("Starting delete");
      var deleteCommentResource = $resource('/deleteComment');
      var response = deleteCommentResource.save({photoID : photoID, commentObj: commentObj}, function () {
        // after saving
        // reload page
        console.log("SO CLOSE");
        var urlPhotoStr = "/photosOfUser/" + userId;
        var getPhotosResource = $resource(urlPhotoStr);

        getPhotosResource.query(urlPhotoStr, function(model){
          $scope.photos = model;
        });

        $window.alert("Comment deleted!");

      }, function(err){
        if(err.status === 400) {
          console.log("Error: Deleting comment unsuccessful");
        }
      });
    };


}]);
