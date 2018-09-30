"use strict";

/* jshint node: true */

/*
 * This builds on the webServer of previous projects in that it exports the current
 * directory via webserver listing on a hard code (see portno below) port. It also
 * establishes a connection to the MongoDB named 'cs142project6'.
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch any file accessible
 * to the current user in the current directory or any of its children.
 *
 * This webServer exports the following URLs:
 * /              -  Returns a text status message.  Good for testing web server running.
 * /test          - (Same as /test/info)
 * /test/info     -  Returns the SchemaInfo object from the database (JSON format).  Good
 *                   for testing database connectivity.
 * /test/counts   -  Returns the population counts of the cs142 collections in the database.
 *                   Format is a JSON object with properties being the collection name and
 *                   the values being the counts.
 *
 * The following URLs need to be changed to fetch there reply values from the database.
 * /user/list     -  Returns an array containing all the User objects from the database.
 *                   (JSON format)
 * /user/:id      -  Returns the User object with the _id of id. (JSON format).
 * /photosOfUser/:id' - Returns an array with all the photos of the User (id). Each photo
 *                      should have all the Comments on the Photo (JSON format)
 *
 */

var mongoose = require('mongoose');
var async = require('async');
var ObjectId = require('mongoose').Types.ObjectId;

// project 7 additions
var session = require('express-session');
var bodyParser = require('body-parser');
var multer = require('multer');
var processFormBody = multer({storage: multer.memoryStorage()}).single('uploadedphoto');
var fs = require("fs");

// Load the Mongoose schema for User, Photo, and SchemaInfo
var User = require('./schema/user.js');
var Photo = require('./schema/photo.js');
var SchemaInfo = require('./schema/schemaInfo.js');

var express = require('express');
var app = express();


// project 7 additions
app.use(session({secret: 'secretKey', resave: false, saveUninitialized: false}));
app.use(bodyParser.json());
var PasswordFunctions = require('./cs142password.js');

// XXX - Your submission should work without this line
// var cs142models = require('./modelData/photoApp.js').cs142models;

mongoose.connect('mongodb://localhost/cs142project6');

// We have the express static module (http://expressjs.com/en/starter/static-files.html) do all
// the work for us.
app.use(express.static(__dirname));


app.get('/', function (request, response) {
    response.send('Simple web server of files from ' + __dirname);
});



/*
 * Use express to handle argument passing in the URL.  This .get will cause express
 * To accept URLs with /test/<something> and return the something in request.params.p1
 * If implement the get as follows:
 * /test or /test/info - Return the SchemaInfo object of the database in JSON format. This
 *                       is good for testing connectivity with  MongoDB.
 * /test/counts - Return an object with the counts of the different collections in JSON format
 */
app.get('/test/:p1', function (request, response) {
    // Express parses the ":p1" from the URL and returns it in the request.params objects.
    console.log('/test called with param1 = ', request.params.p1);

    var param = request.params.p1 || 'info';

    if (param === 'info') {
        // Fetch the SchemaInfo. There should only one of them. The query of {} will match it.
        SchemaInfo.find({}, function (err, info) {
            if (err) {
                // Query returned an error.  We pass it back to the browser with an Internal Service
                // Error (500) error code.
                console.error('Doing /user/info error:', err);
                response.status(500).send(JSON.stringify(err));
                return;
            }
            if (info.length === 0) {
                // Query didn't return an error but didn't find the SchemaInfo object - This
                // is also an internal error return.
                response.status(500).send('Missing SchemaInfo');
                return;
            }

            // We got the object - return it in JSON format.
            console.log('SchemaInfo', info[0]);
            response.end(JSON.stringify(info[0]));
        });
    } else if (param === 'counts') {
        // In order to return the counts of all the collections we need to do an async
        // call to each collections. That is tricky to do so we use the async package
        // do the work.  We put the collections into array and use async.each to
        // do each .count() query.
        var collections = [
            {name: 'user', collection: User},
            {name: 'photo', collection: Photo},
            {name: 'schemaInfo', collection: SchemaInfo}
        ];
        async.each(collections, function (col, done_callback) {
            col.collection.count({}, function (err, count) {
                col.count = count;
                done_callback(err);
            });
        }, function (err) {
            if (err) {
                response.status(500).send(JSON.stringify(err));
            } else {
                var obj = {};
                for (var i = 0; i < collections.length; i++) {
                    obj[collections[i].name] = collections[i].count;
                }
                response.end(JSON.stringify(obj));

            }
        });
    } else {
        // If we know understand the parameter we return a (Bad Parameter) (400) status.
        response.status(400).send('Bad param ' + param);
    }
});

/* helper functions */
function findStringInArray(searchStr, array){
  for(var i = 0; i < array.length; i++){
    var tempStr = array[i];
    if(String(searchStr) === String(tempStr)){
      return i;
    }
  }
  return -1;
}

function findPhotoIndex(photo, photos){
  var photoIndex = -1;
  for(var i = 0; i < photos.length; i++){
    if(String(photos[i]._id) === String(photo._id)){
      photoIndex = i;
    }
  }

  return photoIndex;
}

/*
 * URL /user/list - Return all the User object.
 */
app.get('/user/list', function (request, response) {
  if(!request.session.user){
    response.status(401).send("You are not logged in.");
    return;
  }
  User.find({}, '_id first_name last_name', function(err, users){
    if (err) {
      // Query returned an error.  We pass it back to the browser with an Internal Service
      // Error (500) error code.
      console.error('Doing /user/list error:', err);
      response.status(400).send(JSON.stringify(err));
      return;
    }

    // console.log("ALL USERS", users);
    users = JSON.parse(JSON.stringify(users));
    if (users.length === 0) {
      // Query didn't return an error but didn't find the SchemaInfo object - This
      // is also an internal error return.
      response.status(400).send('Missing User List');
      return;
    }

    // We got the object - return it in JSON format.
    response.end(JSON.stringify(users));
  });
});

// extra credit
app.get('/userAdvFeat', function (request, response) {
  if(!request.session.user){
    response.status(401).send("You are not logged in.");
    return;
  }

  User.find({}, '_id first_name last_name', function(err, users){
    if (err) {
      // Query returned an error.  We pass it back to the browser with an Internal Service
      // Error (500) error code.
      console.error('Doing /user/list error:', err);
      response.status(400).send(JSON.stringify(err));
      return;
    }
    // We got the object - return it in JSON format.
    users = JSON.parse(JSON.stringify(users));

    // console.log("USERS", users);
    var usersAdv = [];

    for (var i = 0; i < users.length; i++) {
      var thisUser = {};
      thisUser._id = users[i]._id;
      thisUser.first_name = users[i].first_name;
      thisUser.last_name = users[i].last_name;
      thisUser.photosCount = Number(0);
      thisUser.commentsCount = Number(0);
      usersAdv.push(thisUser);
    }

    /* NEW */
    // find photos
    Photo.find({}, '', function(errPhoto, photos){
      if(err){
        response.status(400).send(JSON.stringify(errPhoto));
        return;
      }
      photos = JSON.parse(JSON.stringify(photos));

      // for each photos
      async.each(photos, function(photo, photoDoneCallback_forList){
        // do work here for each photo

        // find the user of the photo, add to count
        var userID = photo.user_id;

        var thisUser = usersAdv.find(function(usr){
          return String(usr._id) === String(userID);
        });

        if(!thisUser){
          photoDoneCallback_forList('user not found');
        }
        thisUser.photosCount++;

        var error = false;
        for(var i = 0; i < photo.comments.length; i++){
          var thisComment = photo.comments[i];
          var tempUser = usersAdv.find(function(usr){
            return String(usr._id) === String(thisComment.user_id);
          });

          if(!tempUser){
            error = true;
            break;
          }

          if(!tempUser.commentsCount){
            tempUser.commentsCount = Number(1);
          } else {
            tempUser.commentsCount++;
          }
        }

        if(error){
          photoDoneCallback_forList('user not found');
        } else {
          photoDoneCallback_forList();
        }

      }, function(photoErr){
        // all photos have been processed
        if(photoErr){
          response.status(400).send(JSON.stringify(photoErr));
        } else {
          // success
          response.status(200).send(usersAdv);
        }

      });
    });
    /* end new */
  });
});

/*
 * URL /user/:id - Return the information for User (id)
 */
app.get('/user/:id', function (request, response) {
  if(!request.session.user){
    response.status(401).send("You are not logged in.");
    return;
  }
    var id = request.params.id;
    //var user = cs142models.userModel(id);
    User.findOne({'_id': id}, '_id first_name last_name location description occupation', function(err, info){
      if (err) {
        // Query returned an error.  We pass it back to the browser with an Internal Service
        // Error (500) error code.
        console.error('Doing /user/:id error:', err);
        response.status(400).send(JSON.stringify(err));
        return;
      }
      if (!info) {
        // Query didn't return an error but didn't find the SchemaInfo object - This
        // is also an internal error return.
        console.log('User with _id:' + id + ' not found.');
        console.log('info: ' + info);
        response.status(400).send('Not found');
        return;
      }
      response.status(200).send(info);
    });
});

/*
 * URL /photosOfUser/:id - Return the Photos for User (id)
 */
app.get('/photosOfUser/:id', function (request, response) {
  if(!request.session.user){
    response.status(401).send("You are not logged in.");
    return;
  }

    var id = request.params.id;

    Photo.find({'user_id': id}, '_id user_id comments file_name date_time likedCount', function(err, photos){
      if (err) {
        // Query returned an error.  We pass it back to the browser with an Internal Service
        // Error (500) error code.
        console.error('Doing /photosOfUser/:id error:', err);
        response.status(400).send(JSON.stringify(err));
        return;
      }

      if (photos.length === 0) {
          console.log('Photos for user with _id:' + id + ' not found.');
          response.status(200).send(photos);
          return;
      }

      // necesary for delete command later
      photos = JSON.parse(JSON.stringify(photos));

      // modifies params in photos before returning
      async.each(photos, function(photo, photoDoneCallback){

        // add this index
        photo.photoIndex = findPhotoIndex(photo, photos);

          // do photo work
          async.each(photo.comments, function(com, commentDoneCallback){
            // do comment work
            var userID = com.user_id;
            // delete the key of user_id inside this comment
            delete com.user_id;
            delete com.__v;

            // finds this one user we need
            User.findOne({'_id': userID}, '_id first_name last_name', function(err, info){
              if(err){
                console.error('Doing /photosOfUser/:id error:', err);
                commentDoneCallback(err);
                return;
              }
              com.user = {};
              com.user._id = info._id;
              com.user.first_name = info.first_name;
              com.user.last_name = info.last_name;

              commentDoneCallback();
            });
          }, function(commentErr){
            // all comments have been processed
            if(commentErr){
              // error
              photoDoneCallback(commentErr);
            } else {
              // success
              photoDoneCallback();
            }
          });

      }, function(photoErr){
        // all photos have been processed
        if(photoErr){
          response.status(400).send(JSON.stringify(photoErr));
        } else {
          // success
          response.status(200).send(photos);
        }
      });
    });
});

// extra credit
app.get('/commentsOfUser/:id', function (request, response) {
  if(!request.session.user){
    response.status(401).send("You are not logged in.");
    return;
  }
  var id = request.params.id;
  var commentsList = [];

  // find all the photos
  Photo.find({}, '', function(errPhoto, photos){
    if(errPhoto){
      response.status(400).send(JSON.stringify(errPhoto));
      return;
    }
    photos = JSON.parse(JSON.stringify(photos));

    // for each photo, find the comments
    async.each(photos, function(photo, photoDoneCallback_forComments){

      // for each comment, check if it's the user I'm looking for
      async.each(photo.comments, function(com, commentDoneCallback_forComments){

        var userID = com.user_id;

        // the one who made this comment is the user I'm looking for
        if(String(id) === String(userID)){

          // find index of this photo
          Photo.find({'user_id': photo.user_id}, '', function(err, info){
            if(err){
              console.error('Doing /user/:id error:', err);
              commentDoneCallback_forComments('error');
              return;
            }

            var index = -1;
            for(var i = 0; i < info.length; i++){
              if(String(info[i]._id) === String(photo._id)){
                index = i;
              }
            }


            // add this comment to the list
            delete photo.comments;
            com.photo = photo;
            com.photoIndex = index;

            commentsList.push(com);
            commentDoneCallback_forComments();
          });
        } else {
          commentDoneCallback_forComments();
        }


      }, function(comErr){
        if(comErr){
          photoDoneCallback_forComments(comErr);
        } else {
          // success
          photoDoneCallback_forComments();
        }
      });

    }, function(photoErr){
      // all photos have been processed
      if(photoErr){
        response.status(400).send(JSON.stringify(photoErr));
      } else {
        // success
        response.status(200).send(commentsList);
      }

    });
  });
});

/* Project 7 */
app.post('/admin/login', function (request, response) {
  var login = request.body.login_name;
  User.findOne({ 'login_name': login }, function(err, user) {
      if(err) {
        response.status(500).send(err);
        return;
      }
      if(!user) {
        response.status(400).send("User " + login + " doesn't exist");
        return;
      }

      if(!PasswordFunctions.doesPasswordMatch(user.password_digest, user.salt, request.body.password)){
        response.status(400).send("Password incorrect");
        return;
      }

      request.session.user = { username: login, _id: user._id,
                           "first_name": user.first_name };
      response.status(200).send(JSON.stringify(request.session.user));
    });
});

app.post('/admin/logout', function (request, response) {
  if(request.session.user) {
    request.session.destroy(function (err) {
      if (err) {
        response.status(500).end("Error logging out: " + err);
        return;
      }
      response.status(200).end("Logout success");
    });
  } else {
    response.status(400).end("You are not logged in.");
  }
});


app.get('/mostRecentPhoto/:userID', function (request, response) {
  if(!request.session.user) {
    response.status(401).send('You are not logged in.');
    return;
  }
  var userID = request.params.userID;

  // get all photos of user
  Photo.find({'user_id': userID}, '_id user_id file_name date_time', function(err, photos){
    if (err) {
      response.status(400).send(JSON.stringify(err));
      return;
    }

    photos = JSON.parse(JSON.stringify(photos));

    if(photos.length === Number(0)){
      response.status(200).send({});
      return;
    }
    var photo = photos[0];
    for(var i = 0; i < photos.length; i++){
      var tempPhoto = photos[i];

      var d1 = Date.parse(String(photo.date_time));
      var d2 = Date.parse(String(tempPhoto.date_time));

      if(d2 > d1){
        // found a more recent photo
        photo = tempPhoto;
      }
    }

    // add this index if it exists
    photo.photoIndex = findPhotoIndex(photo, photos);
    response.status(200).send(photo);
  });
});


app.get('/mostCommentedPhoto/:userID', function (request, response) {
  if(!request.session.user) {
    response.status(401).send('You are not logged in.');
    return;
  }
  var userID = request.params.userID;

  // get all photos of user
  Photo.find({'user_id': userID}, '_id user_id file_name comments', function(err, photos){
    if (err) {
      response.status(400).send(JSON.stringify(err));
      return;
    }

    photos = JSON.parse(JSON.stringify(photos));

    if(photos.length === Number(0)){
      response.status(200).send({});
      return;
    }
    var photo = photos[0];
    for(var i = 0; i < photos.length; i++){
      var tempPhoto = photos[i];

      if(tempPhoto.comments.length > photo.comments.length){
        // found a more recent photo
        photo = tempPhoto;
      }
    }

    // add this index if it exists
    photo.photoIndex = findPhotoIndex(photo, photos);

    response.status(200).send(photo);
  });
});

app.get('/mostCommentedPhoto/:userID', function (request, response) {
  if(!request.session.user) {
    response.status(401).send('You are not logged in.');
    return;
  }


});

// find all photos that mention this user and return the list of photos
app.get('/userMentionsList/:userID', function(request, response){
  if(!request.session.user) {
    response.status(401).send('You are not logged in.');
    return;
  }

  var userMentions = [];
  var userID = request.params.userID;
  // find all photos
  Photo.find({}, '', function(err, photos){
    async.each(photos, function(photo, doneCallback){
      // do work here for each photo

      var thisMentionsList = photo.mentionsList;
      // find the user of the photo, add to count
      for(var i = 0; i < thisMentionsList.length; i++){
        if(String(thisMentionsList[i]) === String(userID)){
          // user found in this photo, add this photo to userMentions
          userMentions.push(photo);
        }
      }
      doneCallback();
    }, function(favErr){
      // all photos have been processed
      if(favErr){
        response.status(400).send(JSON.stringify(favErr));
      } else {
        // success
        response.status(200).send(userMentions);
      }
    });
  });

});

// creates new comments
app.post('/commentsOfPhoto/:photo_id', function (request, response) {
  if(!request.session.user) {
    response.status(401).send('You are not logged in.');
    return;
  }

  var photoId = request.params.photo_id;
  var comment = request.body.saveObj.comment;
  var mentionsList = [];
  var tempMentionsList = request.body.saveObj.finalMentions; // list of user._id

  // remove duplicates from mentionsList
  for(var i = 0; i < tempMentionsList.length; i++){
    var toAdd = tempMentionsList[i];
    var addFlag = true;
    for(var j = 0; j < mentionsList.length; j++){
      var check = mentionsList[j];
      if(String(toAdd) === String(check)){
        // toAdd has been added, skip
        addFlag = false;
        break;
      }
    }
    if(addFlag){
      mentionsList.push(toAdd);
    }
  }

  // find the photo we want
  // attach the comment
  // attach mentionsList
  Photo.findOne({ '_id': photoId }, 'comments mentionsList', function (err, photo) {
      if(err) {
        response.status(500).send(err);
        return;
      }
      if(!photo) {
        response.status(400).send("Photo ID \"" + photoId + "\" does not exist!");
        return;
      }
      if(!comment) {
        response.status(400).send("Empty comment is not allowed");
        return;
      }
      var com = {
        comment: comment,
        date_time: new Date(),
        user_id: new ObjectId(request.session.user._id)
      };

      for(var i = 0; i < mentionsList.length; i++){
        photo.mentionsList.push(mentionsList[i]);
      }

      photo.comments.push(com);
      photo.save();
      response.status(200).send();
    });
});

/* project 8 */
app.get('/getUserMentionsList/:userID', function (request, response) {
  if(!request.session.user){
    response.status(401).send("You are not logged in.");
    return;
  }

  var userID = request.params.userID;
  var retPhotos = [];

  Photo.find({}, '', function(err, photos){
    if(err){
      response.status(400).send(JSON.stringify(err));
      return;
    }
    photos = JSON.parse(JSON.stringify(photos)); // need this to add things to photo

    // find all photos that this user is mentioned and add to retPhotos
    async.each(photos, function(photo, doneCallback){
      var thisMentionsList = photo.mentionsList;

      var tempIndexUsr = findStringInArray(userID, thisMentionsList);
      if(tempIndexUsr !== -1){
        // found user was mentioned in this photo
        delete photo.comments;
        delete photo.favoritedBy;

        // need to find the photo index
        Photo.find({'user_id': photo.user_id}, '_id', function(err, tempPhotos){
          if(err){
            doneCallback('error');
            return;
          }

          // add this index
          photo.photoIndex = findPhotoIndex(photo, tempPhotos);

          // need owner's names
          User.findOne({'_id': photo.user_id}, 'first_name last_name', function(err, user){
            if(err){
              doneCallback(err);
              return;
            }
            photo.owner_name = user.first_name + " " + user.last_name;
            retPhotos.push(photo);
            doneCallback();
          });
        });
      } else {
        doneCallback();
      }
    }, function(mentErr){
      // all photos have been processed
      if(mentErr){
        response.status(400).send(JSON.stringify(mentErr));
      } else {
        // success
        response.status(200).send(retPhotos);
      }
    });
  });
});

app.get('/getFavPhotosOfUser', function (request, response) {
  if(!request.session.user){
    response.status(401).send("You are not logged in.");
    return;
  }

  var favphotosList = [];

  var userID =request.session.user._id;
  User.findOne({'_id': userID}, '_id favphotos', function(err, user){
    if(err){
      response.status(400).send(JSON.stringify(err));
      return;
    }

    var favPhotosIDs = user.favphotos;

    async.each(favPhotosIDs, function(favPhotoID, doneCallback){
      // do work here for each photo

      // find the user of the photo, add to count
      Photo.findOne({'_id': favPhotoID}, '', function(err, photo){
        if(err){
          doneCallback(err);
          return;
        }
        favphotosList.push(photo);
        doneCallback();

      });
    }, function(favErr){
      // all photos have been processed
      if(favErr){
        response.status(400).send(JSON.stringify(favErr));
      } else {
        // success
        response.status(200).send(favphotosList);
      }
    });
  });

});

app.post('/UpdateFavPhotosOfUser/:photoID', function (request, response) {
  if(!request.session.user){
    response.status(401).send("You are not logged in.");
    return;
  }
  var photoID = request.params.photoID;
  var userID =request.session.user._id;

  // finds this one user we need
  User.findOne({'_id': userID}, '_id favphotos', function(err, user){
    if(err){
      response.status(400).send(JSON.stringify(err));
      return;
    }

    var userfavPhotos = user.favphotos;

    // we look through the current userfavPhotos to see if this photoID exists
    // if found, we will try to remove it
    var tempIndexUsr = findStringInArray(photoID, userfavPhotos);

    // not found, add to current list
    if(tempIndexUsr === -1){
      userfavPhotos.push(photoID);
    } else {
      userfavPhotos.splice(tempIndexUsr, 1);
    }

    // save to users
    user.favphotos = userfavPhotos;
    user.save();

    // update the photo schema
    Photo.findOne({ '_id': photoID }, 'favoritedBy', function (err, photo) {
        if(err) {
          response.status(500).send(err);
          return;
        }
        var favoritedByList = photo.favoritedBy;
        var tempIndexPhoto = findStringInArray(user._id, favoritedByList);

        if(tempIndexPhoto === -1){
          favoritedByList.push(user._id);
        } else {
          favoritedByList.splice(tempIndexPhoto, 1);
        }
        photo.favoritedBy = favoritedByList;
        photo.save();

        // Photo.find({}, '', function(err, photos){
        //   if(err){
        //     response.status(500).send(err);
        //     return;
        //   }

          response.status(200).send();
        // });
    });
  });
});

/*
 * For liking likes
 */
 app.get('/getLikePhotosOfUser', function (request, response) {
   if(!request.session.user){
     response.status(401).send("You are not logged in.");
     return;
   }

   var likephotosList = [];

   var userID =request.session.user._id;
   User.findOne({'_id': userID}, '_id likephotos', function(err, user){
     if(err){
       response.status(400).send(JSON.stringify(err));
       return;
     }

     var likePhotosIDs = user.likephotos;

     async.each(likePhotosIDs, function(likePhotoID, doneCallback){
       // do work here for each photo

       // find the user of the photo, add to count
       Photo.findOne({'_id': likePhotoID}, '', function(err, photo){
         if(err){
           doneCallback(err);
           return;
         }
         likephotosList.push(photo);
         doneCallback();

       });
     }, function(likeErr){
       // all photos have been processed
       if(likeErr){
         response.status(400).send(JSON.stringify(likeErr));
       } else {
         // success
         response.status(200).send(likephotosList);
       }
     });
   });

 });

 app.post('/UpdateLikePhotosOfUser/:photoID', function (request, response) {
   if(!request.session.user){
     response.status(401).send("You are not logged in.");
     return;
   }
   var photoID = request.params.photoID;
   var userID = request.session.user._id;

   // finds this one user we need
   User.findOne({'_id': userID}, '_id likephotos', function(err, user){
     if(err){
       response.status(400).send(JSON.stringify(err));
       return;
     }

     var userlikePhotos = user.likephotos;

     // we look through the current userlikePhotos to see if this photoID exists
     // if found, we will try to remove it
     var tempIndexUsr = findStringInArray(photoID, userlikePhotos);

     // not found, add to current list
     if(tempIndexUsr === -1){
       userlikePhotos.push(photoID);
     } else {
       userlikePhotos.splice(tempIndexUsr, 1);
     }

     // save to users
     user.likephotos = userlikePhotos;
     user.save();

     // update the photo schema
     Photo.findOne({ '_id': photoID }, 'likedCount', function (err, photo) {
         if(err) {
           response.status(500).send(err);
           return;
         }
         var likedCount = photo.likedCount;

         if(tempIndexUsr === -1 ){
           // we're adding
           photo.likedCount = likedCount + 1;
         } else {
           // we're subtracting
           photo.likedCount = likedCount - 1;
         }
         photo.save();
         response.status(200).send();
     });
   });
 });

// app.get('/isFavPhoto/:photoID', function(request, response){
//   if(!request.session.user){
//     response.status(401).send("You are not logged in.");
//     return;
//   }
//   var photoID = request.params.photoID;
//
//   Photo.findOne({ '_id': photoID }, 'favoritedBy', function (err, photo) {
//     if(err){
//       response.status(400).send(JSON.stringify(err));
//       return;
//     }
//     var favoritedByList = photo.favoritedBy;
//     var userID = request.session.user._id;
//     var colorStr = "silver";
//
//     for(var i = 0; i < favoritedByList.length; i++){
//       var tempUsr = favoritedByList[i];
//       if(String(tempUsr) === String(userID)){
//         colorStr = "yellow";
//         break;
//       }
//     }
//     response.status(200).send(JSON.stringify(colorStr));
//   });
// });


app.post('/photos/new', function (request, response) {
  if(!request.session.user) {
    response.status(401).send('You are not logged in');
    return;
  }

  processFormBody(request, response, function (err) {
    if (err || !request.file) {
        response.status(400).send("Error: posted file doesn't exist");
        return;
    }
    // request.file has the following properties of interest
    //      fieldname      - Should be 'uploadedphoto' since that is what we sent
    //      originalname:  - The name of the file the user uploaded
    //      mimetype:      - The mimetype of the image (e.g. 'image/jpeg',  'image/png')
    //      buffer:        - A node Buffer containing the contents of the file
    //      size:          - The size of the file in bytes

    // XXX - Do some validation here.
    // We need to create the file in the directory "images" under an unique name. We make
    // the original file name unique by adding a unique prefix with a timestamp.
    var ts = new Date();
    var filename = 'U' +  String(ts.valueOf()) + request.file.originalname;

    fs.writeFile("./images/" + filename, request.file.buffer, function (err) {
      Photo.create({
        file_name: filename,
        date_time: ts,
        user_id: new ObjectId(request.session.user._id),
        comments: [],
        favoritedBy: [],
        mentionsList: [],
        likedCount: Number(0)
      }, function (err, photo) {
        if(err ||!photo) {
          response.status(500).send('Error adding entry to database');
          return;
        }

        photo._id = photo._id.toString();
        photo.save();
        response.status(200).end();
      });
    });
  });
});


app.get('/user/check/:login', function (request, response) {
  var login = request.params.login;
  if(!login) {
    response.status(400).send('Specify a user login');
  }
  User.findOne({ 'login_name': login }, function(err, user) {
    if(user) {
      response.status(200).send(JSON.stringify({
        login: user.login_name,
        _id: user._id,
      }));
    } else {
      response.status(200).send(JSON.stringify({
        login: login,
        id: null,
      }));
    }
  });
});

app.post('/user', function (request, response) {
  User.findOne({ 'login_name': request.body.login_name }, function(err, user) {
    if(user) {
      response.status(400).send('The login name already exists');
      return;
    }

    User.create(request.body, function (err, user) {
      user._id = user._id.toString();
      var passwordObj = PasswordFunctions.makePasswordEntry(request.body.password);
      user.password_digest = passwordObj.hash;
      user.salt = passwordObj.salt;
      user.favphotos = [];
      user.likephotos = [];
      user.save();

      response.status(200).send(JSON.stringify({
        name: user.login_name, id: user._id,
        'full_name': user.first_name + ' ' + user.last_name,
      }));
    });
  });
});


/*
 * Deleting photo
 */
 // function deletePhotoWrapper(photoID, userID, response){
 //   console.log("called delete");
 //   var retCode = deletePhotoFunction(photoID, userID);
 //
 //   if(retCode === Number(-1)){
 //     // error
 //     console.log("error");
 //     response.status(400).send(JSON.stringify("ERROR"));
 //   } else if (retCode === Number(1)){
 //     console.log("no permission");
 //     response.status(400).send(JSON.stringify("You do not have permission to delete this"));
 //   } else {
 //     console.log("delete successful");
 //     response.status(200).send();
 //   }
 // }

 // function deletePhotoFunction(photoID, userID){
 //   // this photo of this user
 //   Photo.findOne({'user_id': userID, '_id': photoID}, '', function(err, photo){
 //     if (err) {
 //       return Number(-1);
 //     }
 //     if(!photo){
 //       return Number(1);
 //     }
 //
 //     console.log("photo is : ", photo);
 //     console.log("photoID", photoID);
 //     console.log("userID", userID);
 //
 //     User.find({}, '', function(usrErr, users){
 //       if(usrErr){
 //         return Number(-1);
 //       }
 //
 //       async.each(users, function(user, doneCallback){
 //         // for each user
 //         // delete from favorite photos; should only appear once
 //         for(var i = 0; i < user.favphotos.length; i++){
 //           if(String(photoID) === String(user.favphotos[i])){
 //             user.favphotos.splice(i, 1);
 //             break;
 //           }
 //         }
 //
 //         // delete from likephotos
 //         for(var i = 0; i < user.likephotos.length; i++){
 //           if(String(photoID) === String(user.likephotos[i])){
 //             user.likephotos.splice(i, 1);
 //             break;
 //           }
 //         }
 //
 //         user.save();
 //
 //         // delete the photo
 //         photo.remove();
 //         console.log("deleting now now now ");
 //
 //         doneCallback();
 //       }, function(delErr){
 //         if(delErr){
 //           return Number(-1);
 //         } else {
 //           // success
 //           return Number(0);
 //         }
 //       });
 //     });
 //   });
 // }

 app.post('/deletePhoto', function (request, response) {
   if(!request.session.user){
     response.status(401).send("You are not logged in.");
     return;
   }
   var photoID = request.body.photoID;
   var userID = request.session.user._id;

   // this photo of this user
   Photo.findOne({'user_id': userID, '_id': photoID}, '', function(err, photo){
     if (err) {
       response.status(400).send(JSON.stringify("ERROR"));
       return;
     }
     if(!photo){
       response.status(400).send(JSON.stringify("You have no permission to delete this photo"));
       return;
     }

     User.find({}, '', function(usrErr, users){
       if(usrErr){
         response.status(400).send(JSON.stringify("ERROR"));
         return;
       }

       async.each(users, function(user, doneCallback){
         // for each user
         // delete from favorite photos; should only appear once
         for(var i_0 = 0; i_0 < user.favphotos.length; i_0++){
           if(String(photoID) === String(user.favphotos[i_0])){
             user.favphotos.splice(i_0, 1);
             break;
           }
         }

         // delete from likephotos
         for(var i_1 = 0; i_1 < user.likephotos.length; i_1++){
           if(String(photoID) === String(user.likephotos[i_1])){
             user.likephotos.splice(i_1, 1);
             break;
           }
         }

         user.save();

         // delete the photo
         photo.remove();

         doneCallback();
       }, function(delErr){
         if(delErr){
           response.status(400).send(JSON.stringify("ERROR"));
         } else {
           // success
           response.status(200).send();
         }
       });
     });
   });
 });

 /*
  * Deleting comment
  */

  function deleteCommentFromPhotoFunction(photoID, commentObj, userID){
    // this photo of this user
    Photo.findOne({'_id': photoID}, '', function(err, photo){
      if (err) {
        return Number(-1);
      }

      var deleteSuccess = false;
      for(var i =0; i< photo.comments.length; i++){
        var thisComment = photo.comments[i];
        if(String(userID)===String(thisComment.user_id) && String(commentObj.comment)===String(thisComment.comment)){
          photo.comments.splice(i,1);
          deleteSuccess = true;
          photo.save();
          break;
        }
      }

      if(!deleteSuccess){
        return Number(1);
      } else {
        return Number(0);
      }
    });
  }

  function deleteCommentFromPhotoWrapper(photoID, commentObj, userID, response){
    var retCode = deleteCommentFromPhotoFunction(photoID, commentObj, userID);

    if(retCode === Number(-1)){
      // error
      response.status(400).send(JSON.stringify("ERROR"));
    } else if (retCode === Number(1)){
      response.status(400).send("You do not have permission to delete this");
    } else {
      response.status(200).send();
    }
  }

  app.post('/deleteComment', function (request, response) {
    if(!request.session.user){
      response.status(401).send("You are not logged in.");
      return;
    }
    var photoID = request.body.photoID;
    var commentObj = request.body.commentObj;
    var userID =request.session.user._id;

    // this photo of this user
    Photo.findOne({'_id': photoID}, '', function(err, photo){
      if (err) {
        response.status(400).send(JSON.stringify("ERROR"));
        return;
      }

      var deleteSuccess = false;
      for(var i =0; i< photo.comments.length; i++){
        var thisComment = photo.comments[i];
        if(String(userID)===String(thisComment.user_id) && String(commentObj.comment)===String(thisComment.comment)){
          // found a comment match

          // check for mentions and delete it
          User.findOne({'_id': userID}, '', function(err, user){
            var full_name = user.first_name + " " + user.last_name;
            if(thisComment.comment.indexOf("@"+full_name) !==-1){
              // mention found
              for(var j = 0; j < photo.mentionsList.length; j++){
                if(String(photo.mentionsList[j])===String(userID)){
                  // remove this mention
                  photo.mentionsList.splice(j, 1);
                }
              }
            }
          });

          // remove the comment
          photo.comments.splice(i,1);

          deleteSuccess = true;
          photo.save();
          break;
        }
      }

      if(!deleteSuccess){
        response.status(400).send("You do not have permission to delete this");
        return;
      } else {
        response.status(200).send();
      }
    });

 });

 /*
  * Deleting account
  */
  /*
  Need to delete:
    all the user's photos
    from each photo, traces of this user:
      comments: [commentSchema], // Array of comment objects representing the comments made on this photo.
      favoritedBy: [String], // array of userIDs that liked this photo
      mentionsList: [String], // array of userIDs that were mentioned
      likedCount: Number
  */

// goes through everything the user likes to see if this photo is one of them
  function userLikesThisPhoto(user_likesphotos, thisPhotoID){
    for(var i = 0; i < user_likesphotos.length; i++){
      if(String(user_likesphotos[i])===String(thisPhotoID)){
        return true;
      }
    }
    return false;
  }

  app.post('/deleteAccount', function (request, response) {
    if(!request.session.user){
      response.status(401).send("You are not logged in.");
      return;
    }

    var userID = request.session.user._id;

    // get all photos of user
    Photo.find({'user_id': userID}, '', function(err, photos){
      if(err){
        response.status(400).send("Error");
        return;
      }

      // for each photo, delete all the associated favphotos and likephotos lists
      async.each(photos, function(photo, phoDoneCallback){
        var photoID = photo._id;
        // find all users
        User.find({}, '', function(usrErr, users){
          if(usrErr){
            phoDoneCallback(usrErr);
            return;
          }

          // for each user, delete everything associated to this photo
          async.each(users, function(user, usrDoneCallback){
            // for each user
            // delete from favorite photos; should only appear once
            for(var i_0 = 0; i_0 < user.favphotos.length; i_0++){
              if(String(photoID) === String(user.favphotos[i_0])){
                user.favphotos.splice(i_0, 1);
                break;
              }
            }

            // delete from likephotos
            for(var i_1 = 0; i_1 < user.likephotos.length; i_1++){
              if(String(photoID) === String(user.likephotos[i_1])){
                user.likephotos.splice(i_1, 1);
                break;
              }
            }

            // save
            user.save();

            usrDoneCallback();
          }, function(delErr){
            if(delErr){
              phoDoneCallback(delErr);
            } else {
              // success

              phoDoneCallback();
            }
          }); // end async users
        }); // end findindg all users

        // delete the photo
        photo.remove();
      }, function(phoErr){
        if(phoErr){
          response.status(400).send(JSON.stringify("ERROR"));
        } else {
          // we finished processing all of this user's photos
          // now we need to go through all the photos and delete association to this user

          // grab our user object
          User.findOne({'_id': userID}, '', function(err, ourUser){
            var ourUserID = ourUser._id;

            // grab all the photos
            Photo.find({}, '', function(err, photos){

              // process each photo
              async.each(photos, function(photo, ppDoneCallback){

                // need to decrement like count

                if(userLikesThisPhoto(ourUser.likephotos, photo._id)){
                  photo.likedCount = photo.likedcou - 1;
                }

                // cleans favoritedBy list
                var tempFavoritedBy = [];
                for(var i_0 = 0; i_0 < photo.favoritedBy.length; i_0++){
                  if(String(photo.favoritedBy[i_0])!==String(ourUserID)){
                    tempFavoritedBy.push(photo.favoritedBy[i_0]);
                  }
                }
                photo.favoritedBy = tempFavoritedBy;

                // cleans mentionsList
                var tempMentionsList = [];
                for(var i_1 = 0; i_1 < photo.mentionsList.length; i_1++){
                  if(String(photo.mentionsList[i_1])!==String(ourUserID)){
                    tempMentionsList.push(photo.mentionsList[i_1]);
                  }
                }
                photo.mentionsList = tempMentionsList;

                // cleans comments list
                var tempCommentsList = [];
                for(var i_2 = 0; i_2 < photo.comments.length; i_2++){
                  var thisCommentUsrID = photo.comments[i_2].user_id;
                  if(String(thisCommentUsrID)!==String(ourUserID)){
                    tempCommentsList.push(photo.comments[i_2]);
                  }
                }
                photo.comments = tempCommentsList;

                // save
                photo.save();
                ppDoneCallback();

              }, function(dcErr){
                // finished with processing each photo
                if(dcErr){
                  // error; need to response error 400
                  response.status(400).send(JSON.stringify("ERROR"));
                } else {
                  // success, now we need to delete this user from the list of users
                  ourUser.remove();
                  response.status(200).send();
                }
              });
            });
          });
        }
      }); // end async photos the first one
    });
 });

var server = app.listen(3000, function () {
    var port = server.address().port;
    console.log('Listening at http://localhost:' + port + ' exporting the directory ' + __dirname);
});
