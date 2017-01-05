var express = require('express')
var path = require('path')
var mongo = require('mongodb').MongoClient

var app = express()

app.set('port', (process.env.PORT || 8080))

var url = process.env.MONGOLAB_URI

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'))
})

app.get('/create/*', function (req, res) {
    if (/^(https?:\/\/)([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(req.params[0])) {
        mongo.connect(url, function(err, db) {
            if (err) {
                console.log("Unable to connect to mongoDB server. ERROR: " + err)
            }
            else {
                console.log("Connection successful!")
                
                var collection = db.collection('urls')
                
                collection.aggregate(
                    [
                        {
                            $group:
                            {
                                _id: 'maxid',
                                maxid: { $max: "$id" }
                            }
                        }
                    ]
                ).toArray(function(err, result) {
                    if (err) {
                        console.log(err)
                    }
                    else {
                        if (result.length) {
                            var newId = parseInt(result[0].maxid) + 1
                        }
                        else {
                            var newId = 1
                        }
                        
                        collection.find({"original_url": req.params[0]}).toArray(function(err, rslt) {
                            if (err) {
                                console.log(err)
                                db.close()
                            }
                            else if (rslt.length) {
                                var insertedDoc = {
                                    "original_url": rslt[0].original_url,
                                    "short_url": "https://fierce-mesa-81075.herokuapp.com/" + rslt[0].id
                                }
                                res.send(JSON.stringify(insertedDoc))
                                db.close()
                            }
                            else {
                                var newObj = {
                                    "id": newId,
                                    "original_url": req.params[0]
                                }
                                
                                collection.insert([newObj], function(err, r) {
                                    if (err) {
                                        console.log("Problem with insert")
                                        res.send("Failed to insert new document")
                                    }
                                    else {
                                        console.log("Successfully inserted")
                                        var insertedDoc = {
                                            "original_url": r.ops[0].original_url,
                                            "short_url": "https://fierce-mesa-81075.herokuapp.com/" + r.ops[0].id
                                        }
                                        res.send(JSON.stringify(insertedDoc))
                                    }
                                    
                                    db.close()
                                })
                            }
                        })
                    }
                })
            }
        })
    }
    else {
        res.send(JSON.stringify({"error": "The URL you entered is invalid. Please try again."}))
    }
})

app.get('/:short', function (req, res) {
    if (/^[0-9]+$/.test(req.params.short)) {
        console.log("Looking up URL")
        mongo.connect(url, function(err, db) {
            if (err) {
                console.log("Unable to connect to mongoDB server. ERROR: " + err)
            }
            else {
                console.log("Connection successful!")
                
                var collection = db.collection('urls')
                
                collection.find({'id': parseInt(req.params.short)}).toArray(function(err, docs) {
                    if (err) {
                        console.log(err)
                    }
                    else if (docs.length) {
                        res.redirect(docs[0].original_url)
                    }
                    else {
                        res.send("No associated URL found")
                    }
                    db.close()
                })
            }
        })
    }
    else {
        res.send("Invalid request")
    }
})

app.listen(app.get('port'), function () {
  console.log('Example app listening on port ' + app.get('port') + '!')
})
