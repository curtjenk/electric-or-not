var express = require('express');
var router = express.Router();
var mongoClient = require('mongodb').MongoClient;
//setup to accomdate running on Heroku
var mongoUrl = process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL ||
    'mongodb://localhost:27017/electricOrNot';

var db;
var allPhotos;
var photosToShow = [];

mongoClient.connect(mongoUrl, function(error, database) {
        if (error) {
            console.log(error);
        }
        database.collection('cars').find().toArray(function(error, result) {
            allPhotos = result;
            db = database;
            // console.log(allPhotos);
        })

    })
    /* GET home page. */
router.get('/', function(req, res, next) {
    /*
1 Get all pictures from Mongo
2 get the current user from mongo based on IP Addr
3. find out which pictures the current user has not voted on
4 load all the documents into an array
5 pick a random one
6 send the random one to the view (index.ejs)
    */
    var currIP = req.ip;
    var remoteAddress = req.connection.remoteAddress;
    // console.log(currIP + " -----" + remoteAddress);
    db.collection('users').find({ ip: currIP }).toArray(function(error, userResult) {
        // console.log(userResult.length);

        if (userResult.length == 0) {
            photosToShow = allPhotos;
            db.collection('users').insertOne({ ip: currIP });
        } else {
            photosToShow = allPhotos;

        }
        var rndx = Math.floor(Math.random() * allPhotos.length);
        res.render('index', { carImage: allPhotos[rndx].imageSrc });

    })

});

router.get('/standings', function(req, res, next) {
    
    db.collection('cars').find({}).toArray(function(error, result) {
        result.sort(descendingVotes);
        // console.log(result);
        res.render('standings', {standings: result});
    })

})

function descendingVotes(a, b) {
    if (!b.totalVotes) {b.totalVotes = 0};
    if (!a.totalVotes) {a.totalVotes = 0};
    return b.totalVotes - a.totalVotes;
}

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
    1 we know they voted Electric
    2 we know what they voted on, because we passed it in the req.body var
    3 we know who they are because we know their ip.
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


module.exports = router;
