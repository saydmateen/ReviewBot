var assert = require('assert');
var mongo = require('mongodb').MongoClient;
var config = require('../config');

class ReviewStore
{
  /**
   * Connect to local instance of MongoDB and intialize collections
   */
  constructor(){
    let self = this;
    this.dbUrl = 'mongodb://localhost:27017/';
    this.dbConn = null;
    this.collection = null;
    this.dbName = 'reviews';
    this.collectionName = 'reviews';

    mongo.connect(this.dbUrl, (err, db) => {
      if (err) throw err;
      console.log('Connected to MongoDB');
      
      // create db collections 
      var dbo = db.db(self.dbName);
      dbo.createCollection(self.collectionName, (err, res) => {
        if (err) throw error;
        console.log("Collection created");
      });
      
      // save handles to database and collections
      self.collection = dbo.collection(self.collectionName);
      self.dbConn = dbo;
    });
  }

  /**
   * Save a new review to the database
   * @param {Object} review
   */
  addReview(review){
    let result = this.collection.insert(review);
  }

  /**
   * Group reviews by the ticket ID and compute passed/rejected totals
   * @returns {Promise} containing review items
   */
  aggregateReviews(){
    let self = this;
    return new Promise ((resolve, reject) => {
      self.collection.find().toArray((err, items) => {
        if (err) reject();
        let reviewItems = {};
        
        items.forEach(item => {
          if (!reviewItems.hasOwnProperty(item.ticket)){
            reviewItems[item.ticket] = {
              ticket: item.ticket,
              passed: 0,
              rejected: 0
            };
          }
          if (item.passed){
            reviewItems[item.ticket].passed += 1;
          }
          else {
            reviewItems[item.ticket].rejected += 1;
          }
        })
        resolve(Object.values(reviewItems));
      });
    });
  }

  /**
   * Get a list of all tickets with the number of passed and rejected reviews for each
   * @returns {Promise} containing review items
   */
  getAllItems(){
    let self = this;
    return new Promise((resolve, reject) => {
      self.aggregateReviews().then(reviewItems => {
        resolve(reviewItems);
      }).catch(error => reject(error));
    });
  }

  /**
   * Get a list of all tickets that have the required number of passing reviews
   * @returns {Promise} containing review items
   */
  getReviewedItems(){
    let self = this;
    return new Promise((resolve, reject) => {
      self.aggregateReviews().then(reviewItems => {
        resolve(reviewItems.filter(item => { return item.passed >= config.REQUIRED_REVIEWS; }));
      }).catch(error => reject(error));
    });
  }

  /**
   * Get a list of all tickets that have less than the required number of passing reviews
   * @returns {Promise} containing review items
   */
  getUnreviewedItems(){
    let self = this;
    return new Promise((resolve, reject) => {
      self.aggregateReviews().then(reviewItems => {
        resolve(reviewItems.filter(item => { return item.passed < config.REQUIRED_REVIEWS; }));
      }).catch(error => reject(error));
    });
  }
}

module.exports = ReviewStore;