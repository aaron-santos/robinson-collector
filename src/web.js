var express = require('express');
var bodyParser = require('body-parser');
var logfmt = require('logfmt');
var mongo = require('mongodb');

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
});

var port = Number(process.env.PORT || 3000);
app.listen(port, function() {
  console.log("Listening on " + port);
});

