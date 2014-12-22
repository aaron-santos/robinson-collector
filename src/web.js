var express = require('express');
var bodyParser = require('body-parser');
var logfmt = require('logfmt');
var mongo = require('mongodb');
var _ = require('underscore');

var app = express();
app.use(logfmt.requestLogger());
app.use(bodyParser.json({limit: '5mb'}));

var mongoUri = process.env.MONGO_URI || 'mongodb://localhost/robinson-collector';
mongo.connect(mongoUri, {}, function(error, db) {
  console.log('connected to mongodb @ ' + mongoUri);
  db.addListener('error', function(error) {
    console.log(error);
  });
  // Accept new saves
  app.post("/saves/:userid", function(req, res) {
    var userid = req.params.userid;
    req.body['user-id'] = userid;
    req.body['date'] = new Date();
    console.log("Saving data from user " + userid);
    console.log("data:" + JSON.stringify(req.body));
    db.collection('saves').insert(req.body, function(err, records){
      if (err) {
        console.log(err);
      } else {
        console.log("Record added as "+records[0]._id);
      }
    });
    res.send(201, null);
  });
  // Query for timelines
  app.get("/saves/timelines", function (req, res) {
    db.collection('saves').find({}, {"player.stats": true, "user-id": true, "date": true}, function(err, saves) {
      if (err) {
        console.log("Error retrieving /saves/timelines " + err);
      }
      saves.toArray(function(err, savesArray) {
        if (err) {
          console.log("Error creating /saves/timelines array" + err);
        }
        res.send(200, _.map(savesArray, function(save) {
          var timeline = {};
          timeline.events = save.player.stats.timeline;
          timeline.userid = save.userid;
          timeline.date = save.date;
          return timeline;
        }));
      });
    });
  });
});

var port = Number(process.env.PORT || 3000);
app.listen(port, function() {
  console.log("Listening on " + port);
});

