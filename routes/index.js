var express = require('express');
var router = express.Router();

var mongo = require('mongodb');
var mongoClient = mongo.MongoClient;
var mongoUrl = 'mongodb://localhost:27017/electricOrNot';
var db;

mongoClient.connect(mongoUrl, function(error, database) {
   if (error) {
    console.log(error);
   }
   // console.log('connected')
    db = database;
});

/* GET home page. */
router.get('/', function(req, res, next) {
  db.collection('cars').find({}).toArray(function(error, carResult) {
   // console.log(carResult);
    // for (var i=0; i<carResult.length; i++) {
    //   console.log(carResult[i].imageSrc);
    // }
    var ranNdx = Math.floor(Math.random() * carResult.length);
    console.log(carResult);
    res.render('index', { carImage: carResult[ranNdx].imageSrc });
  });
  //console.log(cars);
  // res.render('index', { title: 'Express' });
});

module.exports = router;
