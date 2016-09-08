var express = require('express');
var router = express.Router();
var mongoClient = require('mongodb').MongoClient;
//setup to accommodate running on Heroku
var mongoUrl = process.env.MONGODB_URI ||
    process.env.MONGOHQ_URL ||
    'mongodb://localhost:27017/electricOrNot';

var db;
var allPhotos;
var photosToShow = [];

//create a db connection and assign it to a var
mongoClient.connect(mongoUrl, function(error, database) {
    db = database;
})

/* GET home page. */
router.get('/', function(req, res, next) {
    var currIP = req.ip;
    db.collection('users').find({ ip: currIP }).toArray(function(error, userResult) {
        var photosVoted = [];
        userResult.forEach(function(val) {
                photosVoted.push(val.image);
            })
            //$nin is a mongodb key word for "not in"
            //get all the cars that the user has not voted on.
            //if voted on every image, send him to the standings page.
        db.collection('cars').find({ imageSrc: { $nin: photosVoted } }).toArray(function(error, result) {
            //console.log(result)
            if (result.length > 0) {
                var rndx = Math.floor(Math.random() * result.length);
                res.render('index', { carImage: result[rndx].imageSrc });
            } else {
                db.collection('cars').find({}).toArray(function(error, result) {
                    result.sort(descendingVotes);
                    res.render('standings', { standings: result });
                })
            }
        })
    });
});

router.get('/standings', function(req, res, next) {

    db.collection('cars').find({}).toArray(function(error, result) {
        result.sort(descendingVotes);
        res.render('standings', { standings: result });
    })

})

router.get('/reset', function(req, res, next) {
    console.log("resetting/reverting all my votes");
    var currIP = req.ip;
    db.collection('users').find({ ip: currIP }).toArray(function(error, userResult) {
        for (var i = 0; i < userResult.length; i++) {
            var photo = userResult[i].image;
            var vote = userResult[i].vote;
            console.log(photo + ' ' + vote);

            db.collection('cars').find({ imageSrc: photo }).toArray(function(error, result) {
                var newTotal = 0;
                console.log(result[0].imageSrc + ' Old totalVotes = ' + result[0].totalVotes);
                if (vote == 'electric') {
                    newTotal = result[0].totalVotes - 1;
                } else if (vote == 'poser') {
                    newTotal = result[0].totalVotes + 1;
                }
                console.log(result[0].imageSrc + ' NEW totalVotes = ' + newTotal);
                
                db.collection('cars').updateOne({ "imageSrc": result[0].imageSrc }, {
                        $set: { "totalVotes": newTotal }
                    },
                    function(error, results) {
                        console.log("===== delete user record for car ");
                        console.log(results);
                     
                        db.collection('users').deleteOne({ ip: currIP, image: result[0].imageSrc }, function(error, delResult) {

                        });
                    }
                );

            })
        }
    });
    res.redirect('/'); //6. send back to home page.
})

/* Set up the post electric page. */
router.post('/electric', function(req, res, next) {
    //res.send("The user chose " + req.body.photo + " as an electric picture");
    /*
    4 update the users collection to include: user ip and photo they voted on
    5 update the images/cars collection by 1
    6 send them back to the main page so they can vote again (or render a page)
    6b if the user has voted on every image in the DB, notify them
    */
    db.collection('users').insertOne({
        ip: req.ip,
        vote: 'electric',
        image: req.body.photo
    })
    db.collection('cars').find({ imageSrc: req.body.photo }).toArray(function(error, result) {
        var newTotal = result[0].totalVotes + 1 || 1;
        console.log(req.body.photo + " = " + newTotal);
        db.collection('cars').updateOne({ "imageSrc": req.body.photo }, {
                $set: { "totalVotes": newTotal }
            },
            function(error, results) {
                //console.log(results);
            }
        );

    })
    res.redirect('/'); //6. send back to home page.
    //optionally res.render a picture of that car with the total votes.
});

router.post('/poser', function(req, res, next) {
    /*
    1 we know they voted poser
    2 we know what they voted on, because we passed it in the req.body var
    3 we know who they are because we know their ip.
    4 update the users collection to include: user ip and photo they voted on
    5 update the images/cars collection by 1
     6 send them back to the main page so they can vote again (or render a page)
        6b if the user has voted on every image in the DB, notify them
    */
    db.collection('users').insertOne({
        ip: req.ip,
        vote: 'poser',
        image: req.body.photo
    })
    db.collection('cars').find({ imageSrc: req.body.photo }).toArray(function(error, result) {
        var newTotal = result[0].totalVotes - 1 || -1;
        console.log(req.body.photo + " = " + newTotal);
        db.collection('cars').updateOne({ "imageSrc": req.body.photo }, {
                $set: { "totalVotes": newTotal }
            },
            function(error, results) {
                //console.log(results);
            }
        );

    })
    res.redirect('/');
});

function descendingVotes(a, b) {
    if (!b.totalVotes) { b.totalVotes = 0 };
    if (!a.totalVotes) { a.totalVotes = 0 };
    return b.totalVotes - a.totalVotes;
}

module.exports = router;
