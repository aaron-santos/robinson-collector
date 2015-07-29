var express = require('express');
var bodyParser = require('body-parser');
var RateLimit = require('express-rate-limit');
var nodemailer = require('nodemailer');
var logfmt = require('logfmt');
var mongo = require('mongodb');
var _ = require('underscore');
require("console-stamp")(console, "yyyy-mm-dd HH:MM:ss.l");

var app = express();
app.use(logfmt.requestLogger());
app.use(bodyParser.json({limit: '5mb'}));
var limiter = RateLimit({
        // window, delay, and max apply per-ip unless global is set to true
        windowMs: 60 * 1000, // miliseconds - how long to keep records of requests in memory
        delayMs: 1000, // milliseconds - base delay applied to the response - multiplied by number of recent hits from user's IP
        max: 5, // max number of recent connections during `window` miliseconds before (temporarily) bocking the user.
        global: false, // if true, IP address is ignored and setting is applied equally to all requests
        message: 'You have been very naughty.. No API response for you!!' // if message is set, the provide message will be shown instead of `Too many requests, please try again later.`
});

// for an API-only web app, you can apply this globally
app.use(limiter);

// Configure mailing
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

if (process.env.EMAIL_SENDER == undefined
    || process.env.EMAIL_RECIPIENT == undefined) {
  console.log("EMAIL_SENDER and EMAIL_RECIPIENT environment variables must be defined.");
  process.exit(1);
}
var mailOptions = {
    from: process.env.EMAIL_SENDER, // sender address
    to: process.env.EMAIL_RECIPIENT, // list of receivers
    subject: '', // Subject line
    text: '', // plaintext body
};

var mongoUri = process.env.MONGO_URI || 'mongodb://localhost/robinson-collector';
mongo.connect(mongoUri, {}, function(error, db) {
  console.log('connected to mongodb @ ' + mongoUri);
  db.addListener('error', function(error) {
    console.log(error);
  });
  // Accept new saves
  app.post("/saves/:userid", function(req, res) {
    var userid = req.params.userid;
    req.body['userid'] = userid;
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
  // Accept reports
  app.post("/reports", function(req, res) {
    var date = req.body['date'];
    var version = req.body['userid'];
    var userid = req.body['userid'];
    console.log("Received report from user-id " + userid + " on " + date + " using version " + version);
    db.collection('reports').insert(req.body, function(err, records){
      if (err) {
        console.log(err);
      } else {
        console.log("Record added as "+records[0]._id);
        var options = _.extend({}, mailOptions, {'subject': "Issue from user " + userid,
                                                 'html': "Issue reported for Robinson<br />"
                                                         + "User-id:" + userid + "<br />"
                                                         + "Version:" + version + "<br />"
                                                         + "Date:" + date + "<br />"
                                                         + "<a href=\"#\">more info</a>"});
        transporter.sendMail(options, function(error, info){
          if(error){
            console.log(error);
          }else{
            console.log('Message sent: ' + info.response);
          }
        });
      }
    });
    res.send(201, null);
  });
  // Query for timelines
  app.get("/saves/timelines", function (req, res) {
    console.log("Retrieving player stats");
    db.collection('saves').find({}, {"player.stats": true, "userid": true, "date": true}, function(err, saves) {
      if (err) {
        console.log("Error retrieving /saves/timelines " + err);
      }
      console.log("Got stats, Serializing to array");
      saves.toArray(function(err, savesArray) {
        if (err) {
          console.log("Error creating /saves/timelines array" + err);
        }
        console.log("Got stats array, returning HTTP response");
        res.send(200, _.map(savesArray, function(save) {
          var timeline = {id:     save._id,
                          events: save.player.stats.timeline,
                          userid: save.userid,
                          date:   save.date}
          return timeline;
        }));
        console.log("Done sending HTTP response");
      });
    });
  });
});

var port = Number(process.env.PORT || 3000);
app.listen(port, function() {
  console.log("Listening on " + port);
});

