var assert = require('assert');
var mongo = require('mongodb').MongoClient;

// Wrapper class for MongoDB to store code review history
class ReviewStore
{
  constructor(){
    var self = this;
    this.dbUrl = 'mongodb://localhost:27017/';
    this.dbConn = null;
    this.collection = null;
    this.dbName = 'reviews';
    this.collectionName = 'reviews';

    mongo.connect(this.dbUrl, function(err, db){
      console.log('Connected to MongoDB');
      
      // create db collections 
      var dbo = db.db(self.dbName);
      dbo.createCollection(self.collectionName, function(err, res){
        if (err) throw error;
        console.log("Collection created");
      });
      
      // save handles to database and collections
      self.collection = dbo.collection(self.collectionName);
      self.dbConn = dbo;
    });
  }

  addReview(){
    var self = this;
    this.collection.insert({hello: 'world', stuff: [1, 2, 3]});

    setTimeout(() => {
      self.collection.find({hello: "world"}).toArray((err, items) => {
        console.log(JSON.stringify(items));
      })
    }, 1000)
  }

  getReviewedItems(){

  }

  getUnreviewedItems(){

  }
}

module.exports = ReviewStore;